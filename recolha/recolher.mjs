#!/usr/bin/env node
/* =========================================================================
   Sentinela — recolha automática.

   Corre no GitHub de hora a hora (ver .github/workflows/recolher.yml).
   Lê todas as fontes directamente, sem repetidores, classifica cada notícia
   com o mesmo classificador da aplicação e acrescenta-a ao arquivo mensal
   em data/arquivo/AAAA-MM.json. Nada é apagado: o arquivo só cresce.

   Também absorve as notícias que puseres na pasta entrada/ (ficheiros
   .json, .csv, .md ou .txt) e marca-as como tuas.

   Uso:  node recolha/recolher.mjs
   Variáveis opcionais (para testes):
     SENTINELA_RAIZ    pasta do repositório (por omissão, a pasta acima desta)
     SENTINELA_FONTES  ficheiro JSON com a lista de fontes a usar em vez da de origem
     SENTINELA_AGORA   data ISO a usar como "agora"
   ========================================================================= */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const C = createRequire(import.meta.url)("../lib/classificador.js");

const RAIZ     = process.env.SENTINELA_RAIZ || path.resolve(AQUI, "..");
const DATA     = path.join(RAIZ, "data");
const ARQUIVO  = path.join(DATA, "arquivo");
const ENTRADA  = path.join(RAIZ, "entrada");
const AGORA    = process.env.SENTINELA_AGORA ? Date.parse(process.env.SENTINELA_AGORA) : Date.now();

const DIAS_PESQUISA  = 7;      // janela pedida ao Google Notícias em cada recolha
const DIAS_RECENTES  = 30;     // data/recentes.json: o que a app descarrega na primeira vez
const MAX_RECENTES   = 4000;
const HORAS_ULTIMAS  = 72;     // data/ultimas.json: o que a app descarrega nas vezes seguintes
const PARALELO       = 4;
const UA = "Mozilla/5.0 (compatible; Sentinela/2.0; radar agroflorestal)";

const sleep = ms => new Promise(r => setTimeout(r, ms));
const mesDe = ts => new Date(ts).toISOString().slice(0, 7);

/* ------------------------------ fontes ------------------------------- */
async function carregarFontes(){
  if(process.env.SENTINELA_FONTES){
    return JSON.parse(await fs.readFile(process.env.SENTINELA_FONTES, "utf-8"));
  }
  let extra = [];
  try{ extra = JSON.parse(await fs.readFile(path.join(AQUI, "fontes-extra.json"), "utf-8")); }
  catch{ /* sem fontes extra */ }
  const ids = new Set(C.DEFAULT_SOURCES.map(s => s.id));
  return C.DEFAULT_SOURCES.concat(extra.filter(s => s && s.id && !ids.has(s.id)));
}

/* Para testes: SENTINELA_GNEWS substitui o endereço do Google Notícias. */
const gnews = q => {
  const u = C.gnewsUrl(q, DIAS_PESQUISA);
  return process.env.SENTINELA_GNEWS ? u.replace("https://news.google.com/rss/search", process.env.SENTINELA_GNEWS) : u;
};
function urlDe(src){
  return src.type === "gnews" && !src.url ? gnews(src.q) : src.url;
}

/* ------------------------------ rede --------------------------------- */
async function obter(url, { tentativas = 3, limite = 25000 } = {}){
  let ultimo;
  for(let n = 1; n <= tentativas; n++){
    try{
      const r = await fetch(url, {
        redirect: "follow",
        signal: AbortSignal.timeout(limite),
        headers: {
          "User-Agent": UA,
          "Accept": "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5",
          "Accept-Language": "pt-PT,pt;q=0.9,en;q=0.6"
        }
      });
      if(r.status === 429 || r.status >= 500){
        ultimo = new Error(`HTTP ${r.status}`);
        await sleep(2500 * n);
        continue;
      }
      if(!r.ok) throw Object.assign(new Error(`HTTP ${r.status}`), { definitivo: true });
      return C.decodeBytes(await r.arrayBuffer(), r.headers.get("content-type"));
    }catch(e){
      if(e.definitivo) throw e;
      ultimo = e.name === "TimeoutError" ? new Error("sem resposta a tempo") : e;
      await sleep(1500 * n);
    }
  }
  throw ultimo || new Error("falhou");
}

/* ------------------------------ leitura de feeds ---------------------- */
const semCdata = s => String(s ?? "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
function etiqueta(bloco, nomes){
  for(const nome of nomes){
    const n = nome.replace(":", "\\:");
    const m = new RegExp(`<${n}\\b[^>]*>([\\s\\S]*?)</${n}>`, "i").exec(bloco);
    if(m && m[1].trim()) return m[1];
  }
  return "";
}
function ligacao(bloco){
  const rss = semCdata(etiqueta(bloco, ["link"])).trim();
  if(rss && !rss.startsWith("<")) return C.decodeEntities(rss);
  const atoms = [...bloco.matchAll(/<link\b([^>]*)\/?>/gi)].map(m => m[1]);
  const pref = atoms.find(a => /rel=["']alternate["']/i.test(a)) || atoms.find(a => !/rel=/i.test(a)) || atoms[0];
  const href = pref && /href=["']([^"']+)["']/i.exec(pref);
  if(href) return C.decodeEntities(href[1]);
  const guid = semCdata(etiqueta(bloco, ["guid", "id"])).trim();
  return /^https?:/.test(guid) ? C.decodeEntities(guid) : "";
}

function lerFeed(texto, src){
  const t = texto.trimStart();
  if(t.startsWith("{")){
    let j; try{ j = JSON.parse(t); }catch{ return []; }
    return (j.items || j.entries || []).map(it => C.cleanEntry({
      title: it.title, link: it.url || it.link,
      date: it.date_published || it.pubDate || it.published || it.updated,
      description: it.summary || it.description || it.content_html || "",
      sourceName: it.author?.name || it.author || "", feedTitle: j.title
    }, src)).filter(Boolean);
  }
  if(!/<(rss|feed|rdf:RDF|channel)\b/i.test(t)) return [];
  const blocos = t.match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) || [];
  const inicio = t.slice(0, t.search(/<(item|entry)\b/i) >>> 0);
  const feedTitle = etiqueta(inicio, ["title"]);
  const out = [];
  for(const b of blocos){
    const cats = [...b.matchAll(/<category\b([^>]*)>([\s\S]*?)<\/category>|<category\b([^>]*)\/>/gi)]
      .map(m => m[2] ? C.stripTags(m[2]) : ((/term=["']([^"']+)["']/i.exec(m[1] || m[3] || "") || [])[1] || ""))
      .filter(Boolean).slice(0, 6).join(" ");
    const e = C.cleanEntry({
      title: etiqueta(b, ["title"]),
      link: ligacao(b),
      date: C.stripTags(etiqueta(b, ["pubDate", "published", "updated", "dc:date"])),
      description: etiqueta(b, ["description", "summary", "content:encoded", "content"]),
      sourceName: etiqueta(b, ["source"]),
      sourceUrl: (/<source\b[^>]*\burl=["']([^"']+)["']/i.exec(b) || [])[1] || "",
      feedTitle, cats
    }, src);
    if(e) out.push(e);
  }
  return out;
}

/* Endereços alternativos, se o feed mudou de sítio. */
function variantes(u){
  try{
    const b = new URL(u).origin;
    return [b + "/feed/", b + "/feed", b + "/rss", b + "/rss.xml", b + "/index.xml", b + "/?feed=rss2"]
      .filter(x => x !== u);
  }catch{ return []; }
}

async function recolherFonte(src){
  const t0 = Date.now();
  try{
    const lidas = lerFeed(await obter(urlDe(src)), src);
    if(lidas.length) return { estado: "ok", lidas, ms: Date.now() - t0 };
    throw new Error("sem entradas");
  }catch(e){
    if(src.type === "rss"){
      for(const alt of variantes(src.url)){
        try{
          const lidas = lerFeed(await obter(alt, { tentativas: 1, limite: 12000 }), src);
          if(lidas.length) return { estado: "ok", lidas, ms: Date.now() - t0, nota: `endereço alternativo: ${alt}` };
        }catch{ /* próxima */ }
      }
      const host = C.hostOf(src.url);
      if(host){
        try{
          const g = { ...src, type: "gnews" };
          const lidas = lerFeed(await obter(gnews(`site:${host}`), { tentativas: 2 }), g);
          if(lidas.length) return { estado: "ok", lidas, ms: Date.now() - t0, nota: `sem feed; via pesquisa site:${host}` };
        }catch{ /* desiste */ }
      }
    }
    return { estado: /sem entradas/.test(e.message) ? "vazia" : "falhou", lidas: [], ms: Date.now() - t0, erro: e.message };
  }
}

/* ------------------------------ arquivo -------------------------------- */
const meses = new Map();          // "AAAA-MM" → { items: [], alterado }
const porChave = new Map();       // chave → item (só dos meses carregados)

async function lerJson(f, padrao){
  try{ return JSON.parse(await fs.readFile(f, "utf-8")); }catch{ return padrao; }
}
async function carregarMes(m){
  if(meses.has(m)) return meses.get(m);
  const d = await lerJson(path.join(ARQUIVO, `${m}.json`), { items: [] });
  const reg = { items: Array.isArray(d.items) ? d.items : [], alterado: false };
  for(const it of reg.items) if(it && it.key && !porChave.has(it.key)) porChave.set(it.key, it);
  meses.set(m, reg);
  return reg;
}

/* Uma linha por notícia: as diferenças no git ficam pequenas e legíveis. */
function serializar(obj, lista){
  const cab = JSON.stringify(obj).slice(0, -1);
  if(!lista.length) return cab + ',"items":[]}\n';
  return cab + ',"items":[\n' + lista.map(x => JSON.stringify(x)).join(",\n") + "\n]}\n";
}

function acrescentar(e, { own = false, nota = "" } = {}){
  const key = C.normTitle(e.title) || e.link;
  if(!key) return null;
  const ja = porChave.get(key);
  if(ja){
    let mudou = false;
    if(e.publisher && e.publisher !== ja.publisher && !ja.also.includes(e.publisher) && ja.also.length < 12){
      ja.also.push(e.publisher); mudou = true;
    }
    if(e.srcId && !ja.srcs.includes(e.srcId)){ ja.srcs.push(e.srcId); mudou = true; }
    if(!ja.dek && e.dek){ ja.dek = e.dek; mudou = true; }
    if(!ja.pubHost && e.pubHost){ ja.pubHost = e.pubHost; mudou = true; }
    if(own && !ja.own){ ja.own = true; mudou = true; }
    if(nota && ja.note !== nota){ ja.note = nota; mudou = true; }
    return mudou ? { item: ja, novo: false, mudou } : { item: ja, novo: false, mudou: false };
  }
  const item = {
    key, title: e.title, link: e.link, ts: e.ts, dek: e.dek || "", publisher: e.publisher || "",
    cats: e.cats || "", srcId: e.srcId, srcs: [e.srcId], also: [], seen: AGORA
  };
  if(e.pubHost) item.pubHost = e.pubHost;
  if(own) item.own = true;
  if(nota) item.note = nota;
  porChave.set(key, item);
  return { item, novo: true, mudou: true };
}

/* ------------------------------ entrada/ --------------------------------
   Ficheiros que tu pões no repositório para acrescentar ao arquivo.       */
const semAcento = s => C.deacc(s).replace(/[^a-z]/g, "");
const CAMPOS = {
  title: ["title", "titulo", "headline", "nome"],
  link:  ["link", "ligacao", "url", "endereco", "href"],
  date:  ["ts", "date", "data", "pubdate", "publicado"],
  note:  ["note", "nota", "notas", "comentario", "observacoes"],
  publisher: ["publisher", "fonte", "publicacao", "jornal", "source"]
};
function campo(obj, nome){
  for(const k of Object.keys(obj)){
    if(CAMPOS[nome].includes(semAcento(k))) return obj[k];
  }
  return "";
}
function linhasCsv(texto){
  const sep = [";", "\t", ","].map(c => [c, (texto.split("\n")[0].match(new RegExp(c === "\t" ? "\t" : `\\${c}`, "g")) || []).length])
    .sort((a, b) => b[1] - a[1])[0][0];
  const linhas = [];
  let cur = [], campoAtual = "", aspas = false;
  for(let i = 0; i < texto.length; i++){
    const ch = texto[i];
    if(aspas){
      if(ch === '"' && texto[i + 1] === '"'){ campoAtual += '"'; i++; }
      else if(ch === '"') aspas = false;
      else campoAtual += ch;
    } else if(ch === '"') aspas = true;
    else if(ch === sep){ cur.push(campoAtual); campoAtual = ""; }
    else if(ch === "\n" || ch === "\r"){
      if(ch === "\r" && texto[i + 1] === "\n") i++;
      cur.push(campoAtual); campoAtual = "";
      if(cur.some(x => x.trim())) linhas.push(cur);
      cur = [];
    } else campoAtual += ch;
  }
  cur.push(campoAtual);
  if(cur.some(x => x.trim())) linhas.push(cur);
  return linhas;
}

async function tituloDaPagina(url){
  try{
    const html = await obter(url, { tentativas: 1, limite: 12000 });
    const og = /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i.exec(html)
            || /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i.exec(html);
    const t = og ? og[1] : (/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html) || [])[1];
    return t ? C.stripTags(t).replace(/\s+[|–—-]\s+[^|–—-]{2,40}$/, "") : "";
  }catch{ return ""; }
}

async function lerEntrada(ficheiro, texto){
  const ext = path.extname(ficheiro).toLowerCase();
  let brutos = [];
  if(ext === ".json"){
    const j = JSON.parse(texto);
    brutos = Array.isArray(j) ? j : (j.noticias || j.items || j.minhas || []);
  } else if(ext === ".csv" || ext === ".tsv"){
    const [cab, ...resto] = linhasCsv(texto.replace(/^﻿/, ""));
    brutos = resto.map(l => Object.fromEntries(cab.map((c, i) => [c, l[i] ?? ""])));
  } else {
    for(const linha of texto.split(/\r?\n/)){
      const md = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/.exec(linha);
      const url = md ? md[2] : (/(https?:\/\/\S+)/.exec(linha) || [])[1];
      if(!url) continue;
      const data = (/(\d{4}-\d{2}-\d{2})/.exec(linha) || [])[1] || "";
      const resto = linha.replace(md ? md[0] : url, "").replace(data, "").replace(/^[\s*\-–•]+|[\s—–-]+$/g, "").trim();
      brutos.push({ title: md ? md[1] : "", link: url.replace(/[).,;]+$/, ""), date: data, note: md ? resto : "" });
    }
  }
  const out = [];
  for(const b of brutos){
    let link = String(campo(b, "link") || "").trim();
    let title = String(campo(b, "title") || "").trim();
    if(!link && !title) continue;
    if(!title && link) title = await tituloDaPagina(link) || link;
    let ts = campo(b, "date");
    ts = typeof ts === "number" ? ts : Date.parse(String(ts || ""));
    const e = C.cleanEntry({ title, link, date: isNaN(ts) || !ts ? new Date(AGORA).toISOString() : new Date(ts).toISOString(),
      description: campo(b, "note") ? "" : (b.dek || ""), sourceName: campo(b, "publisher") || "" },
      { id: "minhas", type: "rss", name: "As minhas notícias" });
    if(e){ e.note = String(campo(b, "note") || "").slice(0, 600); out.push(e); }
  }
  return out;
}

/* As notícias que puseres em entrada/ são tuas: vão para data/minhas.json e
   não para os meses do arquivo, que é partilhado por todos os utilizadores. */
const minhasMap = new Map();
function acrescentarMinha(e){
  const key = C.normTitle(e.title) || e.link;
  if(!key) return false;
  const ja = minhasMap.get(key);
  if(ja){
    if(e.note && e.note !== ja.note) ja.note = e.note;
    return false;
  }
  minhasMap.set(key, { key, title: e.title, link: e.link, ts: e.ts, dek: e.dek || "",
    publisher: e.publisher || "", srcId: "minhas", srcs: ["minhas"], also: [], seen: AGORA,
    own: true, ...(e.note ? { note: e.note } : {}) });
  return true;
}

async function processarEntrada(relatorio){
  let nomes = [];
  try{ nomes = await fs.readdir(ENTRADA); }catch{ return; }
  const validos = nomes.filter(n => /\.(json|csv|tsv|md|txt)$/i.test(n) && !/^leia-me/i.test(n));
  if(!validos.length) return;
  const destino = path.join(ENTRADA, "processados");
  await fs.mkdir(destino, { recursive: true });
  for(const nome of validos){
    const f = path.join(ENTRADA, nome);
    try{
      const lidas = await lerEntrada(nome, await fs.readFile(f, "utf-8"));
      let novas = 0;
      for(const e of lidas) if(acrescentarMinha(e)) novas++;
      relatorio.entrada.push({ ficheiro: nome, lidas: lidas.length, novas });
      const carimbo = new Date(AGORA).toISOString().slice(0, 16).replace(/[:T]/g, "-");
      await fs.rename(f, path.join(destino, `${carimbo}-${nome}`));
    }catch(e){
      relatorio.entrada.push({ ficheiro: nome, erro: e.message });
    }
  }
}

function marcarAlterado(item){
  const m = meses.get(mesDe(item.ts));
  if(m) m.alterado = true;
  else for(const reg of meses.values()) if(reg.items.includes(item)){ reg.alterado = true; break; }
}

/* ------------------------------ principal ------------------------------ */
async function principal(){
  await fs.mkdir(ARQUIVO, { recursive: true });
  const fontes = await carregarFontes();
  const LEX = C.buildLexicon({ sourceGroups: Object.fromEntries(fontes.map(s => [s.id, s.group])) });
  const indiceAntigo = await lerJson(path.join(DATA, "indice.json"), {});

  // os dois últimos meses ficam sempre carregados, para detectar repetidas
  const agoraMes = mesDe(AGORA);
  const anterior = mesDe(Date.parse(agoraMes + "-01T00:00:00Z") - 864e5);
  await carregarMes(agoraMes); await carregarMes(anterior);

  const relatorio = { fontes: {}, entrada: [], novas: 0 };
  for(const x of (await lerJson(path.join(DATA, "minhas.json"), { items: [] })).items || [])
    if(x && x.key) minhasMap.set(x.key, x);
  await processarEntrada(relatorio);

  // recolha em paralelo, com um limite
  const fila = [...fontes];
  const resultados = [];
  await Promise.all(Array.from({ length: PARALELO }, async (_, k) => {
    await sleep(k * 300);
    while(fila.length){
      const src = fila.shift();
      resultados.push([src, await recolherFonte(src)]);
      await sleep(400);
    }
  }));

  for(const [src, r] of resultados){
    let guardadas = 0, novas = 0;
    for(const e of r.lidas){
      const a = C.analyseWith(LEX, e);
      if(a.score < C.KEEP_MIN) continue;
      guardadas++;
      const reg = await carregarMes(mesDe(e.ts));
      const res = acrescentar(e);
      if(res?.novo){ reg.items.push(res.item); novas++; }
      if(res?.mudou) marcarAlterado(res.item);
    }
    relatorio.novas += novas;
    relatorio.fontes[src.id] = {
      nome: src.name, estado: r.estado, lidas: r.lidas.length, relevantes: guardadas, novas,
      ms: r.ms, ...(r.erro ? { erro: r.erro } : {}), ...(r.nota ? { nota: r.nota } : {})
    };
  }

  // gravar os meses alterados
  for(const [m, reg] of meses){
    if(!reg.alterado && !reg.items.some(x => x.seen === AGORA)) continue;
    reg.items.sort((a, b) => b.ts - a.ts || a.key.localeCompare(b.key));
    await fs.writeFile(path.join(ARQUIVO, `${m}.json`), serializar({ mes: m }, reg.items));
  }

  // índice: contagens de todos os meses (os não carregados mantêm a anterior)
  const contagens = Object.fromEntries((indiceAntigo.meses || []).map(x => [x.mes, x.n]));
  for(const [m, reg] of meses) contagens[m] = reg.items.length;
  for(const f of await fs.readdir(ARQUIVO)){
    const m = /^(\d{4}-\d{2})\.json$/.exec(f)?.[1];
    if(m && !(m in contagens)) contagens[m] = (await carregarMes(m)).items.length;
  }
  const lista = Object.entries(contagens).filter(([, n]) => n > 0)
    .sort((a, b) => b[0].localeCompare(a[0])).map(([mes, n]) => ({ mes, n }));

  // recentes: o que a aplicação carrega ao abrir
  const corte = AGORA - DIAS_RECENTES * 864e5;
  const mesesRecentes = new Set([agoraMes, anterior, mesDe(corte)]);
  for(const m of mesesRecentes) await carregarMes(m);
  const recentes = [...mesesRecentes].flatMap(m => meses.get(m).items)
    .filter(x => x.ts >= corte).sort((a, b) => b.ts - a.ts).slice(0, MAX_RECENTES);
  const ultimas = recentes.filter(x => x.ts >= AGORA - HORAS_ULTIMAS * 36e5 || x.seen >= AGORA - HORAS_ULTIMAS * 36e5);

  const ok = Object.values(relatorio.fontes).filter(f => f.estado === "ok").length;
  const execucao = { em: new Date(AGORA).toISOString(), novas: relatorio.novas, fontesOk: ok,
                     fontes: fontes.length, entrada: relatorio.entrada.length };
  const indice = {
    versao: 2,
    atualizado: new Date(AGORA).toISOString(),
    total: lista.reduce((a, x) => a + x.n, 0),
    meses: lista,
    fontes: relatorio.fontes,
    entrada: relatorio.entrada,
    execucoes: [execucao, ...(indiceAntigo.execucoes || [])].slice(0, 48)
  };
  await fs.writeFile(path.join(DATA, "recentes.json"),
    serializar({ atualizado: indice.atualizado, dias: DIAS_RECENTES }, recentes));
  await fs.writeFile(path.join(DATA, "ultimas.json"),
    serializar({ atualizado: indice.atualizado, horas: HORAS_ULTIMAS }, ultimas));
  await fs.writeFile(path.join(DATA, "minhas.json"),
    serializar({ atualizado: indice.atualizado }, [...minhasMap.values()].sort((a, b) => b.ts - a.ts)));
  await fs.writeFile(path.join(DATA, "indice.json"), JSON.stringify(indice, null, 1) + "\n");

  // resumo legível, no terminal e na página da execução no GitHub
  const linhas = [
    `## Recolha de ${new Date(AGORA).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" })}`, "",
    `**${relatorio.novas} notícias novas** · ${ok}/${fontes.length} fontes responderam · ${indice.total} no arquivo`, "",
    "| Fonte | Estado | Lidas | Relevantes | Novas |", "|---|---|---:|---:|---:|",
    ...fontes.map(s => { const f = relatorio.fontes[s.id] || {};
      return `| ${s.name} | ${f.estado}${f.erro ? ` (${f.erro})` : ""}${f.nota ? ` — ${f.nota}` : ""} | ${f.lidas ?? 0} | ${f.relevantes ?? 0} | ${f.novas ?? 0} |`; }),
    ...(relatorio.entrada.length ? ["", "### Pasta entrada/", ...relatorio.entrada.map(e =>
      `- ${e.ficheiro}: ${e.erro ? "erro — " + e.erro : `${e.lidas} lidas, ${e.novas} novas`}`)] : [])
  ];
  console.log(linhas.join("\n"));
  if(process.env.GITHUB_STEP_SUMMARY) await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, linhas.join("\n") + "\n");
  return indice;
}

principal().catch(e => { console.error("Recolha falhou:", e); process.exit(1); });
