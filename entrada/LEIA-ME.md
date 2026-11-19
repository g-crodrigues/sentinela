# Pasta de entrada

Põe aqui notícias tuas para entrarem no teu arquivo pessoal (`data/minhas.json`).
Não entram nos meses do arquivo partilhado, por isso não aparecem aos outros
utilizadores da Sentinela. Na recolha
seguinte (no máximo uma hora, ou logo a seguir se enviares o ficheiro)
são absorvidas, marcadas como tuas e o ficheiro passa para `processados/`.

Formatos aceites:

- **.json** — o ficheiro que a Sentinela exporta em *Definições → Dados →
  Exportar as minhas notícias*, ou uma lista `[{"title": …, "link": …, "date": …, "note": …}]`.
- **.csv** — com cabeçalho; colunas reconhecidas: `título`, `ligação` (ou `url`),
  `data`, `nota`, `fonte`. Separador `,` `;` ou tabulação.
- **.md** ou **.txt** — uma notícia por linha: `- [título](https://…)` ou só o
  endereço. Se só houver o endereço, o título é lido da própria página.

Atenção: num repositório público, qualquer pessoa pode abrir `data/minhas.json`
no GitHub, mesmo que a aplicação não o mostre.
