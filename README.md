# Sentinela — radar agroflorestal

Notícias de agricultura, floresta, água e política agrícola em Portugal e na
União Europeia, recolhidas de hora a hora e guardadas para sempre.

**Um arquivo, para todos.** Quem mantém este repositório corre a recolha; os
utilizadores só abrem o endereço da aplicação. Não precisam de conta no GitHub
nem de configurar nada — todos lêem o mesmo arquivo, e cada um aplica por cima
os seus filtros, países, vigias e favoritos, que ficam no seu aparelho.

Este repositório é ao mesmo tempo **a aplicação** e **o arquivo**:

- `index.html` é a Sentinela. Publicada pelo GitHub Pages, instala-se no
  telemóvel como aplicação.
- `.github/workflows/recolher.yml` corre a recolha no GitHub de hora a hora,
  directamente nas fontes, sem serviços intermediários.
- `data/arquivo/AAAA-MM.json` é o arquivo. Cada notícia fica no mês da sua data
  e nunca é apagada. O histórico do git guarda ainda cada versão.

```
GitHub (de hora a hora)                      telemóvel / computador
┌──────────────────────────────┐            ┌──────────────────────────┐
│ recolha/recolher.mjs         │            │ index.html (a Sentinela) │
│  · lê ~30 fontes             │  data/     │  · lê data/recentes.json │
│  · classifica e filtra       │ ─────────▶ │  · guarda no aparelho    │
│  · acrescenta ao arquivo     │            │  · Arquivo: meses antigos│
│  · absorve entrada/          │ ◀───────── │  · envia os teus         │
└──────────────────────────────┘  entrada/  └──────────────────────────┘
```

## Montar — cerca de dez minutos

**1. Criar o repositório.** Em github.com → *New repository*, nome `sentinela`,
**público**, sem README. (Público porque a aplicação lê o arquivo sem palavra-passe
e o GitHub Pages gratuito só serve repositórios públicos.)

**2. Enviar os ficheiros.** No computador, dentro desta pasta:

```bash
git init -b main
git add -A
git commit -m "Sentinela"
git remote add origin https://github.com/O-TEU-NOME/sentinela.git
git push -u origin main
```

Pelo browser também dá (*Add file → Upload files*), mas confirma que a pasta
`.github` foi enviada — o Finder e o Explorador escondem pastas começadas por
ponto, e sem ela a recolha não corre.

**3. Primeira recolha.** Separador **Actions** → *Recolher notícias* →
**Run workflow**. Demora um a dois minutos. A partir daí corre sozinha aos 23
minutos de cada hora. O resumo de cada execução mostra o que cada fonte trouxe.

**4. Publicar a aplicação.** **Settings → Pages** → *Deploy from a branch* →
`main`, pasta `/ (root)` → *Save*. Fica em
`https://O-TEU-NOME.github.io/sentinela/`. Abre no Chrome do telemóvel e, em
*Definições → Dados → Instalar*, instala-a.

Já está. A aplicação encontra o arquivo sozinha, porque está no mesmo sítio.
**Esse endereço é o que dás aos utilizadores.**

Para ti, há `tecnica.html` no mesmo endereço
(`https://O-TEU-NOME.github.io/sentinela/tecnica.html`): a mesma aplicação, com o
estado de cada fonte, os erros completos e o envio das tuas notícias.

### Se preferires manter o Netlify

A aplicação pode ficar no Netlify e ler o arquivo do GitHub. No pacote do
Netlify, abre `config.json` e escreve o repositório:

```json
{ "arquivo": "O-TEU-NOME/sentinela" }
```

Todos os utilizadores passam a ler esse arquivo, sem fazerem nada. Como a
aplicação não muda quando chegam notícias, o Netlify não precisa de ser
actualizado de hora a hora.

## As notícias de cada um

**Os utilizadores** guardam favoritos e acrescentam notícias próprias na
aplicação. Ficam no aparelho, sem prazo, e só eles as vêem. *Definições → Dados →
Cópia de segurança* leva-as para outro aparelho.

**Tu**, que manténs o arquivo, tens ainda três maneiras de as guardar no
repositório, para as veres em todos os teus aparelhos:

- **Na versão técnica**, em *Guardados → + Acrescentar*: ligação, título
  (opcional), data e uma nota. Ou *Importar ficheiro*, com uma folha de cálculo
  em CSV ou uma lista de ligações.
- **Na pasta `entrada/`** do repositório: deixa lá um `.csv`, `.json`, `.md` ou
  `.txt` (ver `entrada/LEIA-ME.md`). Na recolha seguinte é absorvido e marcado
  como teu. Uma ligação sem título fica com o título da própria página.
- **Automaticamente.** Com uma *chave de acesso* em *Definições → Dados*, os
  favoritos e as notícias que acrescentas seguem sozinhos para `entrada/`
  segundos depois. Cria a chave em GitHub → *Settings → Developer settings →
  Personal access tokens → Fine-grained tokens*: só este repositório,
  permissão **Contents: Read and write**. A chave fica guardada apenas no
  aparelho onde a escreves.

Vão para `data/minhas.json`, **não** para os meses do arquivo, e só a versão
técnica as mostra. Os utilizadores nunca as vêem na aplicação.

**Atenção:** num repositório público, qualquer pessoa pode abrir
`data/minhas.json` no GitHub. Para notas que queiras manter privadas, guarda-as
só no aparelho, sem chave de acesso.

## Ficheiros

| Caminho | O quê |
|---|---|
| `index.html` | A aplicação |
| `tecnica.html` | A mesma, com moradas, erros e serviços à vista |
| `lib/classificador.js` | As regras que decidem o que é notícia do sector. Partilhado pela aplicação e pela recolha |
| `recolha/recolher.mjs` | A recolha. Corre com Node 22, sem dependências |
| `recolha/fontes-extra.json` | Fontes acrescentadas no servidor (ver abaixo) |
| `config.json` | O repositório do arquivo, para quando a aplicação está noutro sítio |
| `data/recentes.json` | Últimos 30 dias — o que a aplicação descarrega na primeira vez |
| `data/ultimas.json` | Últimas 72 horas — o que descarrega nas vezes seguintes |
| `data/arquivo/AAAA-MM.json` | O arquivo, um mês por ficheiro, uma notícia por linha |
| `data/minhas.json` | As tuas notícias, de todos os meses |
| `data/indice.json` | Meses, contagens, estado de cada fonte e últimas 48 recolhas |
| `entrada/` | Onde deixas ficheiros para entrar no arquivo |

## Acrescentar fontes à recolha

Em `recolha/fontes-extra.json`:

```json
[
  { "id": "jornal-regional", "type": "rss", "group": "Especializada",
    "name": "Jornal Regional", "url": "https://exemplo.pt/feed/" },
  { "id": "g-montado", "type": "gnews", "group": "Pesquisas",
    "name": "Montado", "q": "montado OR sobreiro OR cortiça Alentejo" }
]
```

`group` muda a forma como o classificador pesa a fonte: `Especializada` e
`Europa` são tidas como temáticas; `Oficial` dispensa termos do sector; as
restantes têm de os provar.

## Correr localmente

```bash
node recolha/recolher.mjs        # recolhe para data/
```

## Se a recolha parar

- **Actions → Recolher notícias** mostra cada execução. Uma a vermelho tem o
  erro no registo.
- Se o push falhar por permissões: *Settings → Actions → General → Workflow
  permissions* → **Read and write permissions**.
- O GitHub suspende recolhas agendadas em repositórios sem actividade durante
  60 dias. Como a recolha guarda notícias quase todas as horas, isso não deve
  acontecer; se acontecer, aparece um botão para voltar a activar em Actions.
- A aplicação avisa quando o arquivo tem mais de seis horas.

## Quanto ocupa e quantos aguenta

O arquivo cresce algumas dezenas de megabytes por ano; cabem décadas num
repositório gratuito.

Cada utilizador descarrega os últimos 30 dias na primeira vez e, depois, só as
últimas 72 horas — algumas dezenas de kilobytes comprimidos. O GitHub Pages
serve até cerca de 100 GB por mês, o que chega para milhares de utilizadores a
abrirem a aplicação várias vezes por dia. A recolha é uma só para todos: as
publicações recebem um pedido por hora, por muitos que sejam os utilizadores.

O arquivo guarda o título, a ligação e o pequeno resumo que cada publicação põe
no seu próprio feed — o que fazem os agregadores de notícias. Os artigos ficam
nos sítios de origem.
