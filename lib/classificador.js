/* =========================================================================
   Sentinela — classificador partilhado.
   O mesmo ficheiro corre no browser (dentro da aplicação) e no servidor
   (na recolha automática do repositório), para que as duas decidam da
   mesma maneira o que é notícia do sector.
   ========================================================================= */
(function(root, factory){
  const api = factory();
  if(typeof module === "object" && module.exports) module.exports = api;
  else Object.assign(root, api);
})(typeof globalThis !== "undefined" ? globalThis : this, function(){
"use strict";

/* ------------------------------ temas -------------------------------- */
const THEMES = [
  { id:"politica", label:"Política e PAC",      color:"#2E6B4F",
    terms:["pac","política agrícola comum","bruxelas","comissão europeia","parlamento europeu","conselho de ministros","ministra da agricultura","ministro da agricultura","ministério da agricultura","regulamento","legislação","quadro financeiro","orçamento","estratégia","plano estratégico","dgadr","gpp","subsídio","apoios","candidaturas","pagamentos","ifap","ecoregime","condicionalidade","reforma","cap reform","common agricultural policy","european commission","regulation","subsidies","mff","multiannual financial framework"] },
  { id:"floresta", label:"Floresta",            color:"#4C7A38",
    terms:["floresta","florestal","silvicultura","icnf","eucalipto","pinheiro","pinhal","sobreiro","montado","cortiça","resina","biomassa","madeira","celulose","desbaste","arborização","rearborização","reflorestação","zif","desflorestação","eudr","gestão de combustível","aglomerado","serração","forest","forestry","deforestation","timber","cork oak","logging"] },
  { id:"fogo", label:"Incêndios",               color:"#B33F2B",
    terms:["incêndio","incêndios","fogo","fogos","fogo controlado","queimada","agif","proteção civil","bombeiros","área ardida","ignição","risco de incêndio","dfci","faixa de gestão","wildfire","forest fire"] },
  { id:"agua", label:"Água e regadio",          color:"#2A5A78",
    terms:["água","hídrico","hídricos","regadio","rega","irrigação","albufeira","barragem","aproveitamento hidroagrícola","edia","alqueva","seca","escassez","dotação","apa","captação","aquífero","reutilização","dessalinização","tejo","guadiana","convenção de albufeira","irrigation","drought","water scarcity"] },
  { id:"clima", label:"Clima e ambiente",       color:"#6C7F3F",
    terms:["clima","climática","climáticas","alterações climáticas","emissões","carbono","biodiversidade","solo","desertificação","sustentabilidade","ambiente","natura 2000","restauro da natureza","pesticidas","fitofármacos","nitratos","poluição","climate","emissions","biodiversity","pesticides","soil health","nature restoration"] },
  { id:"mercados", label:"Mercados e preços",   color:"#9A6B12",
    terms:["preços","preço","mercado","mercados","exportação","exportações","importação","cotação","cotações","tarifas","mercosul","comércio","margem","inflação","custos de produção","fertilizantes","adubos","gasóleo","volume de negócios","facturação","faturação","colheita","produção","prices","market","trade","tariffs","exports","farm income"] },
  { id:"producao", label:"Produção e culturas",  color:"#7A5C8E",
    terms:["vinha","vinho","vinícola","viticultura","olival","azeite","oliveira","amendoal","amêndoa","cereais","trigo","milho","arroz","tomate","hortícolas","fruticultura","pera","maçã","citrinos","pequenos frutos","mirtilo","estufa","agricultura biológica","biológico","regenerativa","colmeia","apicultura","mel","wine","olive oil","cereals","organic farming","harvest"] },
  { id:"pecuaria", label:"Pecuária e sanidade",  color:"#8E5A3C",
    terms:["pecuária","bovinos","suínos","ovinos","caprinos","leite","laticínios","carne","matadouro","aves","avícola","dermatose","língua azul","peste suína","gripe aviária","sanidade animal","bem-estar animal","dgav","forragem","pastagem","efeitos zoossanitários","vacinação","livestock","dairy","bluetongue","avian influenza","animal health"] },
  { id:"inovacao", label:"Inovação e ciência",  color:"#3F7C7C",
    terms:["investigação","inovação","tecnologia","digital","agricultura de precisão","satélite","sensor","drone","inteligência artificial","projeto","universidade","instituto superior de agronomia","horizonte europa","prr","start-up","startup","piloto","estudo","relatório","research","innovation","precision farming","horizon europe"] },
  { id:"rural", label:"Mundo rural",            color:"#6E6A58",
    terms:["mundo rural","desenvolvimento rural","interior","despovoamento","jovens agricultores","agricultor","agricultores","cooperativa","confederação","confederação dos agricultores","confagri","associação de agricultores","protesto","manifestação","tratores","emprego agrícola","sucessão","cadastro","emparcelamento","baldios","rural areas","farmers protest","young farmers"] }
];
const THEME_BY_ID = Object.fromEntries(THEMES.map(t=>[t.id,t]));

/* -------------------------- léxico de relevância ----------------------
   Os termos são procurados como palavras inteiras, com plural opcional:
   "agroalimentar" apanha "agroalimentares", mas "var" não apanha
   "variedades" nem "nfl" apanha "inflação".                             */
const CORE = ["agricultura","agrícola","agricultor","agroalimentar","agroindústria","agropecuária",
  "agronegócio","agroflorestal","agroflorestais","agronomia","agrónomo","floresta","florestal","florestais",
  "silvicultura","pac","política agrícola comum","regadio","rega","regante","associação de regantes",
  "hidroagrícola","pecuária","pecuário","viticultura","viticultor","vinha","olival","olivicultor","amendoal",
  "montado","cortiça","sobreiro","eucalipto","pinheiro","pinhal","incêndio florestal","incêndios florestais",
  "área ardida","icnf","ifap","dgadr","dgav","agif","iniav","gpp","pepac","ministério da agricultura",
  "ministra da agricultura","ministro da agricultura","secretário de estado da agricultura",
  "secretária de estado da agricultura","confagri","cap","fogo controlado","colheita","campanha agrícola",
  "seca agrícola","mundo rural","desenvolvimento rural","alqueva","edia","apicultura","apicultor","colmeia",
  "varroa","aquicultura","pescas","arborização","rearborização","reflorestação","desbaste",
  "gestão de combustível","zona de intervenção florestal","baldio","emparcelamento","fitossanitário",
  "fitossanitária","sanidade vegetal","fitofármaco","denominação de origem","indicação geográfica",
  "vitivinícola","olivicultura","horticultura","hortícola","fruticultura","fruticultor","cinegético",
  "exploração agrícola","explorações agrícolas","produção agrícola","regime florestal","gripe aviária",
  "peste suína","língua azul","dermatose nodular","sanidade animal","bem-estar animal","avícola",
  "suinicultura","bovino","ovino","caprino","suíno","explorações avícolas","pastagem","pastagens","forragem","forragens","silagem",
  "produtores de leite","produtor agrícola","produtores agrícolas","produtores florestais","ovinicultura",
  "bovinicultura","adega","lagar","azeite","azeitona","vindima","enologia","viveiro florestal","hortofrutícola",
  "fileira agroalimentar","cooperativa agrícola","cooperativas agrícolas","exploração pecuária","fertilizante",
  "adubo","semente","cereal","cereais","trigo","milho","arroz","tomate","amêndoa","mirtilo","pequenos frutos",
  "frutos secos","instituto superior de agronomia","agriculture","farming","forestry","farmer","agri-food"];

const SECOND = ["rural","solo","água","hídricos","seca","clima","climática","biodiversidade","alimentar",
  "alimento","exportação","preço","mercado","pesticida","cooperativa","bruxelas","comissão europeia",
  "união europeia","subsídio","apoio","fundos","prr","biomassa","madeira","celulose","leite","carne","vinho",
  "fruta","trator","alentejo","ribatejo","douro","beira","trás-os-montes","algarve","açores","madeira","oeste",
  "lezíria","médio tejo"];

/* Marcas e patrocínios que contêm vocabulário agrícola mas não são notícia do
   sector. São apagados do texto antes da pontuação.                          */
const NEUTRAL = ["credito agricola","caixa de credito agricola","caixa agricola","banco agricola",
  "credito agricola mutuo","cooperativa de credito agricola","seguros credito agricola",
  "credito agricola seguros","benfica do ribatejo","porto de leixoes"];

/* Publicações de desporto e espectáculo. */
const PUB_NOISE = ["record","a bola","abola","o jogo","ojogo","maisfutebol","mais futebol",
  "zerozero","zero zero","jogada","desporto","desportivo","futebol","bancada","tribuna expresso",
  "sport tv","sportv","eurosport","flashscore","transfermarkt","goal.com","betano","placard",
  "bola na rede","sapo desporto","tsf desporto","renascenca desporto","liga portugal"];

/* A secção de onde vem o artigo está no seu endereço. */
const PATH_NOISE = ["/desporto","/desportos","/futebol","/modalidades","/motores",
  "/automobilismo","/ciclismo","/atletismo","/andebol","/basquetebol","/formula-1",
  "/celebridades","/famosos","/vidas","/lifestyle","/musica","/televisao","/series",
  "/cinema","/moda","/horoscopo","/jogos","/gaming","/casino","/apostas"];
const PATH_GOOD = ["/agricultura","/agro","/floresta","/rural","/ambiente"];

/* Sinais de desporto e espectáculo. Um sozinho não decide nada; dois em
   simultâneo excluem a notícia. Ficaram de fora palavras que também são
   correntes no sector ("médio", "estádio" fenológico, "jornadas" técnicas,
   "titulares" de explorações, "contratação", "plantel", "classificação") e
   nomes de clubes que são também terras ("Arouca", "Tondela", "Leixões",
   "Rio Ave", "Santa Clara", "Marítimo").                                     */
const SPORT = [
  "sl benfica","sporting cp","sporting clube de portugal","fc porto","futebol clube do porto",
  "sc braga","sp braga","vitoria sc","vitoria de guimaraes","moreirense","estoril praia","avs futebol",
  "uniao de leiria","boavista fc","benfica","sporting",
  "primeira liga","liga portugal","liga betclic","taca de portugal","taca da liga","supertaca",
  "liga dos campeoes","liga europa","liga conferencia","champions league","mundial de clubes",
  "seleccao nacional","selecao nacional","euro 2028","mundial 2030",
  "futebol","futsal","andebol","basquetebol","voleibol","hoquei em patins","rugby","atletismo",
  "natacao","ciclismo","ciclista","pelotao","camisola amarela","volta a portugal","contra-relogio",
  "formula 1","motogp","motociclismo","rali de portugal","nba","ufc","boxe","judo","tenis","padel",
  "golo","penalti","penalty","fora de jogo","livre direto","livre directo","grande penalidade",
  "guarda-redes","defesa central","ponta de lanca","onze inicial","hat-trick","arbitro","treinador",
  "seleccionador","selecionador","balneario","claque","derbi","jornada da liga","lesao muscular",
  "mercado de transferencias","pre-epoca","estadio da luz","estadio do dragao","estadio de alvalade",
  "estadio municipal","estadio nacional","relvado",
  "eurovisao","festival da cancao","big brother","casa dos segredos","reality show",
  "passadeira vermelha","serie da netflix","estreia no cinema","telenovela","horoscopo",
  "euromilhoes","totobola","totoloto","lotaria"
];

/* Ruído que pesa por si: cada um tira 5 pontos. Só termos sem ambiguidade. */
const NOISE = ["sl benfica","sporting cp","fc porto","sc braga","liga betclic","primeira liga",
  "liga dos campeões","taça de portugal","taça da liga","selecção nacional","seleção nacional",
  "golo","penálti","hat-trick","onze inicial","guarda-redes","dérbi","mercado de transferências",
  "camisola amarela","volta a portugal","ciclismo","futebol","futsal","andebol","motogp","fórmula 1",
  "nba","atletismo","natação","voleibol","motociclismo","treinador","árbitro","balneário","claque",
  "big brother","reality show","casa dos segredos","telenovela","horóscopo","euromilhões","totoloto",
  "lotaria","eurovisão","passadeira vermelha","série da netflix","estreia no cinema",
  "festival de música","criptomoeda","bitcoin"];

/* ========================== âmbitos geográficos ==========================
   Termos terminados em "*" valem como prefixo; os outros como palavra.     */
const ZONES = [
  { id:"pt", short:"PT", label:"Portugal", group:"base", fixed:true, terms:[
    "portugal","portugues","portuguesa","alentejo","ribatejo","algarve","douro","minho",
    "beira","tras-os-montes","acores","madeira","lisboa","porto","coimbra","evora","beja",
    "santarem","setubal","viseu","braganca","castelo branco","vila real","guarda","faro",
    "governo portugues","assembleia da republica","icnf","ifap","dgadr","dgav","agif",
    "ministerio da agricultura","confagri","edia","alqueva","apa","ipma"] },

  { id:"eu", short:"UE", label:"Europa e instituições da UE", group:"base", terms:[
    "uniao europeia","comissao europeia","parlamento europeu","conselho europeu","bruxelas",
    "politica agricola comum","estados-membros","eurodeputad*","dg agri","eudr",
    "quadro financeiro","estrasburgo","espanha","espanhol","franca","frances","italia",
    "italiano","alemanha","alemao","paises baixos","holanda","belgica","polonia","irlanda",
    "dinamarca","suecia","finlandia","austria","grecia","romenia","bulgaria","hungria",
    "chequia","eslovaquia","eslovenia","croacia","estonia","letonia","lituania","luxemburgo",
    "malta","chipre","reino unido","suica","noruega","galiza","andaluzia","extremadura"] },

  { id:"br", short:"BR", label:"Brasil", group:"ag", terms:[
    "brasil","brasileir*","sao paulo","minas gerais","mato grosso","parana","goias",
    "rio grande do sul","bahia","embrapa","cerrado"] },
  { id:"us", short:"EUA", label:"Estados Unidos", group:"ag", terms:[
    "estados unidos","eua","usda","california","texas","iowa","kansas","nebraska",
    "midwest","washington","casa branca"] },
  { id:"cn", short:"CN", label:"China", group:"ag", terms:["china","chines","pequim","xangai"] },
  { id:"in", short:"IN", label:"Índia", group:"ag", terms:["india","indiano","nova delhi","punjab"] },
  { id:"ar", short:"AR", label:"Argentina", group:"ag", terms:["argentina","argentino","pampa","rosario"] },
  { id:"ca", short:"CA", label:"Canadá", group:"ag", terms:["canada","canadiano","saskatchewan","alberta","manitoba"] },
  { id:"ru", short:"RU", label:"Rússia", group:"ag", terms:["russia","russo","moscovo","kremlin"] },
  { id:"ua", short:"UA", label:"Ucrânia", group:"ag", terms:["ucrania","ucraniano","kiev","odessa"] },
  { id:"oc", short:"OC", label:"Austrália e Nova Zelândia", group:"ag", terms:[
    "australia","australiano","nova zelandia","queensland","tasmania"] },
  { id:"mx", short:"MX", label:"México", group:"ag", terms:["mexico","mexicano"] },
  { id:"tr", short:"TR", label:"Turquia", group:"ag", terms:["turquia"] },
  { id:"za", short:"ZA", label:"África do Sul", group:"ag", terms:[
    "africa do sul","sul-africano","cidade do cabo","joanesburgo"] },
  { id:"pl", short:"PALOP", label:"Angola, Moçambique e PALOP", group:"ag", terms:[
    "angola","angolano","mocambique","mocambicano","cabo verde","guine-bissau","sao tome"] },
  { id:"mg", short:"MAG", label:"Magrebe e Egito", group:"ag", terms:[
    "marrocos","marroquino","argelia","tunisia","egito","egipcio"] },
  { id:"se", short:"ASE", label:"Sudeste asiático", group:"ag", terms:[
    "indonesia","malasia","vietname","tailandia","filipinas","oleo de palma"] },
  { id:"la", short:"LAT", label:"Chile, Peru, Uruguai e Paraguai", group:"ag", terms:[
    "chile","chileno","peruano","peruana","lima peru","uruguai","uruguaio","paraguai"] },

  { id:"other", short:"—", label:"Resto do mundo", group:"other", terms:[
    "japao","japones","coreia","israel","irao","iraniano","arabia saudita","emirados",
    "quenia","nigeria","etiopia","gana","senegal","tanzania","uganda","zimbabue",
    "paquistao","bangladesh","cazaquistao","uzbequistao","colombia","venezuela","equador",
    "bolivia","cuba","costa rica","guatemala","honduras","panama","republica dominicana",
    "servia","bosnia","albania","macedonia","montenegro","moldavia","bielorrussia","georgia",
    "armenia","azerbaijao","nepal","sri lanka","mianmar","cambodja","laos","mongolia"] }
];
const ZONE_BY_ID = Object.fromEntries(ZONES.map(z=>[z.id, z]));
const DEFAULT_ZONES = Object.fromEntries(ZONES.map(z=>[z.id, z.group === "base"]));

/* ---------------------------- fontes padrão --------------------------- */
/* type:"gnews" → pesquisa no Google Notícias; type:"rss" → feed do sítio.
   A recolha no servidor lê todas; a aplicação só pede as que estão ligadas. */
const DEFAULT_SOURCES = [
  {id:"g-agri", type:"gnews", group:"Pesquisas", name:"Agricultura e agricultores",
   q:'agricultura OR agrícola OR agricultores OR agroalimentar Portugal'},
  {id:"g-pol", type:"gnews", group:"Pesquisas", name:"Política agrícola e apoios",
   q:'"política agrícola comum" OR PAC OR IFAP OR PEPAC OR "Ministério da Agricultura" OR "apoios agrícolas"'},
  {id:"g-flor", type:"gnews", group:"Pesquisas", name:"Floresta e incêndios",
   q:'floresta OR florestal OR ICNF OR eucalipto OR sobreiro OR cortiça OR "incêndios florestais" Portugal'},
  {id:"g-agua", type:"gnews", group:"Pesquisas", name:"Água, regadio e seca",
   q:'regadio OR rega OR "recursos hídricos" OR seca OR Alqueva agricultura Portugal'},
  {id:"g-merc", type:"gnews", group:"Pesquisas", name:"Mercados, culturas e pecuária",
   q:'"preços agrícolas" OR vinha OR olival OR cereais OR hortícolas OR pecuária OR bovinos Portugal'},
  {id:"g-ue", type:"gnews", group:"Pesquisas", name:"União Europeia — agricultura e floresta",
   q:'"Comissão Europeia" agricultura OR "política agrícola comum" OR EUDR OR Mercosul agricultura'},

  {id:"g-cult", type:"gnews", group:"Pesquisas", name:"Culturas e fileiras (detalhe)", enabled:false,
   q:'viticultura OR amendoal OR fruticultura OR "pequenos frutos" OR arroz OR tomate indústria Portugal'},
  {id:"g-pec", type:"gnews", group:"Pesquisas", name:"Sanidade animal (detalhe)", enabled:false,
   q:'"sanidade animal" OR "gripe aviária" OR "língua azul" OR "peste suína" Portugal'},
  {id:"g-rural", type:"gnews", group:"Pesquisas", name:"Mundo rural e organizações", enabled:false,
   q:'"jovens agricultores" OR CONFAGRI OR "confederação dos agricultores" OR cooperativa agrícola Portugal'},
  {id:"g-ue3", type:"gnews", group:"Pesquisas", name:"UE — orçamento e comércio", enabled:false,
   q:'"quadro financeiro plurianual" agricultura OR Mercosul acordo agricultura UE'},

  {id:"publico-rss",    type:"rss", group:"Referência", name:"Público",      url:"https://feeds.feedburner.com/PublicoRSS"},
  {id:"rtp-rss",        type:"rss", group:"Referência", name:"RTP Notícias", url:"https://www.rtp.pt/noticias/rss"},
  {id:"observador-rss", type:"rss", group:"Referência", name:"Observador",   url:"https://observador.pt/feed/"},
  {id:"expresso-rss",   type:"rss", group:"Referência", name:"Expresso",     url:"https://expresso.pt/rss", enabled:false},
  {id:"eco",            type:"rss", group:"Referência", name:"ECO",          url:"https://eco.sapo.pt/feed/", enabled:false},
  {id:"g-publico",  type:"gnews", group:"Referência", name:"Público — só agroflorestal", enabled:false,
   q:'site:publico.pt agricultura OR floresta OR florestal OR regadio OR agricultores'},
  {id:"g-expresso", type:"gnews", group:"Referência", name:"Expresso — só agroflorestal", enabled:false,
   q:'site:expresso.pt agricultura OR floresta OR florestal OR regadio OR agricultores'},
  {id:"g-observador", type:"gnews", group:"Referência", name:"Observador — só agroflorestal", enabled:false,
   q:'site:observador.pt agricultura OR floresta OR florestal OR regadio OR agricultores'},

  {id:"agroportal", type:"rss", group:"Especializada", name:"Agroportal",        url:"https://www.agroportal.pt/feed/"},
  {id:"agrimar",    type:"rss", group:"Especializada", name:"Agricultura e Mar", url:"https://agriculturaemar.com/feed"},
  {id:"vidarural",  type:"rss", group:"Especializada", name:"Vida Rural",        url:"https://www.vidarural.pt/feed/"},
  {id:"vozdocampo", type:"rss", group:"Especializada", name:"Voz do Campo",      url:"https://vozdocampo.pt/feed/", enabled:false},
  {id:"flf",        type:"rss", group:"Especializada", name:"Frutas, Legumes e Flores", url:"https://www.frutaslegumeseflores.com/feed/", enabled:false},
  {id:"ambiente",   type:"gnews", group:"Especializada", name:"Ambiente e território", enabled:false,
   q:'ambiente OR biodiversidade OR "uso do solo" agricultura OR floresta Portugal'},

  {id:"ec-agri", type:"rss", group:"Oficial", name:"Comissão Europeia — agricultura",
   url:"https://ec.europa.eu/commission/presscorner/api/rss?language=en&policyarea=18&pagesize=30"},
  {id:"dre1", type:"rss", group:"Oficial", name:"Diário da República — 1.ª série",
   url:"https://files.diariodarepublica.pt/rss/serie1-html.xml", enabled:false},
  {id:"dre2", type:"rss", group:"Oficial", name:"DR — 2.ª série, anúncios de procedimento",
   url:"https://files.diariodarepublica.pt/rss/serie2&parte=l-html.xml", enabled:false},
  {id:"g-gov", type:"gnews", group:"Oficial", name:"Governo e institucional", enabled:false,
   q:'site:portugal.gov.pt agricultura OR florestas OR alimentação'},

  {id:"arc2020",  type:"rss", group:"Europa", name:"ARC2020 (PAC)", url:"https://www.arc2020.eu/feed/"},
  {id:"euractiv", type:"gnews", group:"Europa", name:"Euractiv — Agrifood", enabled:false,
   q:'site:euractiv.com agriculture OR farming OR forestry OR CAP'},
  {id:"efsa",     type:"rss", group:"Europa", name:"EFSA", url:"https://www.efsa.europa.eu/en/all/rss", enabled:false}
];

/* Abaixo disto uma notícia nem fica guardada. O limiar de cada pessoa
   aplica-se depois, ao mostrar, por isso mudá-lo não apaga nada.           */
const KEEP_MIN = 1;

/* ------------------------------ utilidades ---------------------------- */
const deacc = s => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function hostOf(u){ try{ return new URL(u).hostname.replace(/^www\./, ""); }catch{ return ""; } }

const ENT = { amp:"&", lt:"<", gt:">", quot:'"', apos:"'", nbsp:" ", laquo:"«", raquo:"»",
  ldquo:"“", rdquo:"”", lsquo:"‘", rsquo:"’", hellip:"…", ndash:"–", mdash:"—", euro:"€",
  ordm:"º", ordf:"ª", deg:"°", middot:"·",
  aacute:"á", agrave:"à", acirc:"â", atilde:"ã", eacute:"é", ecirc:"ê", iacute:"í", oacute:"ó",
  ocirc:"ô", otilde:"õ", uacute:"ú", ccedil:"ç", Aacute:"Á", Agrave:"À", Acirc:"Â", Atilde:"Ã",
  Eacute:"É", Ecirc:"Ê", Iacute:"Í", Oacute:"Ó", Ocirc:"Ô", Otilde:"Õ", Uacute:"Ú", Ccedil:"Ç",
  uuml:"ü", ntilde:"ñ" };
function decodeEntities(s){
  return String(s ?? "")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&([a-z]+);/gi, (m, n) => ENT[n] ?? m);
}
/* Texto sem marcação. As entidades são decodificadas duas vezes porque há
   feeds que codificam o HTML e depois o codificam de novo.                   */
function stripTags(s){
  let t = String(s ?? "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  t = decodeEntities(t).replace(/<[^>]*>/g, " ");
  t = decodeEntities(t).replace(/<[^>]*>/g, " ");
  return t.replace(/\s+/g, " ").trim();
}

function normTitle(t){
  return deacc(t).replace(/\s+[-–—]\s+[^-–—]{2,40}$/, "")
                 .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim().slice(0, 90);
}

const rxCache = new Map();
function wordRx(term){
  if(rxCache.has(term)) return rxCache.get(term);
  let raw = deacc(term).trim(), prefix = false;
  if(raw.endsWith("*")){ prefix = true; raw = raw.slice(0, -1); }
  const body = raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  // plural regular: vogal + s (milho → milhos, não milhões); r/z + es (agricultor → agricultores)
  const plural = /[aeiou]$/.test(raw) ? "(?:s)?" : /[rz]$/.test(raw) ? "(?:es)?" : "";
  const tail = prefix ? "" : plural + "([^a-z0-9]|$)";
  const r = new RegExp("(^|[^a-z0-9])" + body + tail);
  rxCache.set(term, r);
  return r;
}

/* Texto de um feed a partir dos bytes. fetch().text() assume sempre UTF-8,
   e há feeds portugueses em ISO-8859-1: sem isto, os acentos saem trocados. */
function decodeBytes(buf, contentType){
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let cs = (/charset=([\w-]+)/i.exec(contentType || "") || [])[1];
  if(!cs){
    const head = new TextDecoder("latin1").decode(bytes.slice(0, 300));
    cs = (/encoding=["']([\w-]+)["']/i.exec(head) || [])[1];
  }
  cs = (cs || "utf-8").toLowerCase();
  if(cs === "iso-8859-1" || cs === "latin1") cs = "windows-1252";
  try{ return new TextDecoder(cs).decode(bytes); }
  catch{ return new TextDecoder("utf-8").decode(bytes); }
}

function gnewsUrl(q, days){
  return "https://news.google.com/rss/search?q=" + encodeURIComponent(`${q} when:${days}d`) +
         "&hl=pt-PT&gl=PT&ceid=PT:pt-150";
}

/* Converte uma entrada lida de um feed — no browser ou no servidor — numa
   notícia com a mesma forma nos dois lados.                                  */
function cleanEntry(raw, src){
  let title = stripTags(raw.title);
  if(!title) return null;
  const link = String(raw.link || "").trim();
  let ts = Date.parse(raw.date || "");
  if(!ts || isNaN(ts)) ts = Date.now();
  if(ts > Date.now() + 864e5) ts = Date.now();          // datas no futuro são erro do feed
  let dek = stripTags(raw.description);
  let publisher = stripTags(raw.sourceName);
  if(src.type === "gnews"){
    const m = title.match(/^(.*)\s[-–]\s([^-–]{2,45})$/);
    if(m){ title = m[1].trim(); if(!publisher) publisher = m[2].trim(); }
    if(dek.length < 25 || dek.startsWith(title.slice(0, 20))) dek = "";
  }
  if(!publisher) publisher = hostOf(link) || stripTags(raw.feedTitle) || src.name;
  if(dek.length > 320) dek = dek.slice(0, 317).replace(/\s+\S*$/, "") + "…";
  return { title, link, ts, dek, publisher, cats: String(raw.cats || "").slice(0, 160),
           srcId: src.id, srcName: src.name };
}

/* ------------------------------ classificação -------------------------- */
function buildLexicon(opts = {}){
  const extraCore  = (opts.extraCore  || []).filter(Boolean);
  const extraNoise = (opts.extraNoise || []).filter(Boolean);
  return {
    core:  CORE.concat(extraCore).map(t => ({t, r:wordRx(t)})),
    sec:   SECOND.map(t => ({t, r:wordRx(t)})),
    noise: NOISE.concat(extraNoise).map(t => ({t, r:wordRx(t)})),
    sport: SPORT.map(t => wordRx(t)),
    themes: THEMES.map(th => ({id:th.id, rx: th.terms.map(wordRx)})),
    zones: ZONES.map(z => ({id:z.id, rx: z.terms.map(wordRx)})),
    srcMap: opts.sourceGroups ||
            Object.fromEntries(DEFAULT_SOURCES.map(s => [s.id, s.group]))
  };
}

function analyseWith(LEX, it){
  let hay = " " + deacc(`${it.title} ${it.dek || ""} ${it.publisher || ""} ${it.cats || ""}`) + " ";
  for(const nb of NEUTRAL) if(hay.includes(nb)) hay = hay.split(nb).join(" ");
  const g = LEX.srcMap[it.srcId] || (it.own ? "Minhas" : "");
  let score = 0;
  const hits = [];

  for(const {t, r} of LEX.core)  if(r.test(hay)){ score += 3; hits.push(t); }
  for(const {r} of LEX.sec)      if(r.test(hay))  score += 1;
  for(const {r} of LEX.noise)    if(r.test(hay))  score -= 5;

  if(g === "Especializada") score += 4;
  else if(g === "Europa")   score += 3;

  const pub = deacc(it.publisher);
  const pubMau = PUB_NOISE.some(x => pub.includes(deacc(x)));
  if(pubMau) score -= 8;

  let sinais = 0;
  for(const r of LEX.sport){ if(r.test(hay) && ++sinais >= 2) break; }
  if(sinais >= 2 || (sinais >= 1 && pubMau)) score = -99;

  if(!hits.length && g !== "Especializada" && g !== "Oficial" && g !== "Minhas") score -= 3;

  const path = deacc(it.link || "");
  if(score > -99){
    if(PATH_NOISE.some(x => path.includes(x))) score -= 12;
    else if(PATH_GOOD.some(x => path.includes(x))) score += 3;
    if(/desporto|futebol|modalidades|celebridades|entretenimento|televisao/.test(deacc(it.cats || "")))
      score -= 10;
  }
  if(it.own) score = Math.max(score, 50);                // as tuas notícias passam sempre

  const themes = [];
  for(const th of LEX.themes){
    let c = 0;
    for(const r of th.rx) if(r.test(hay)) c++;
    if(c) themes.push({id:th.id, c});
  }
  themes.sort((a,b) => b.c - a.c);

  const zones = [];
  for(const z of LEX.zones) if(z.rx.some(r => r.test(hay))) zones.push(z.id);
  if(!zones.length) zones.push("pt");                    // imprensa portuguesa sem marcador: é nacional

  const pt = zones.includes("pt"), ue = zones.includes("eu");
  const geo = pt && ue ? "UE·PT" : pt ? "PT" : ue ? "UE" : (ZONE_BY_ID[zones[0]]?.short || "—");

  return { score, themes: themes.slice(0,3).map(t => t.id), geo, zones, hits: [...new Set(hits)].slice(0,4) };
}

return { THEMES, THEME_BY_ID, CORE, SECOND, NEUTRAL, PUB_NOISE, PATH_NOISE, PATH_GOOD, SPORT, NOISE,
         ZONES, ZONE_BY_ID, DEFAULT_ZONES, DEFAULT_SOURCES, KEEP_MIN,
         deacc, hostOf, decodeEntities, stripTags, normTitle, wordRx, gnewsUrl, cleanEntry, decodeBytes,
         buildLexicon, analyseWith };
});
