# Sentinela — notas de desenho

A Sentinela é o posto de vigia sobre o pinhal. No modo escuro é noite, com a luz
âmbar do posto acesa; no modo claro é o nevoeiro da manhã. O ícone mostra o
posto no cume da serra, com a janela acesa.

## Princípios

- **O âmbar quer dizer uma coisa só: «isto pede a tua atenção».** Notícia nova,
  dia ou tema escolhido, ação principal, vigia encontrada. Não é decoração.
- **O horizonte é o único elemento ousado.** As notícias dos últimos 14 dias
  desenhadas como a linha de uma serra, com o dia de hoje aceso. Tocar ou
  arrastar escolhe dias. Com filtros, a linha tracejada mostra o total.
- **Comandos sem estados escondidos.** O âmbito e a ordem abrem uma escolha
  explícita, em vez de mudarem a cada toque.
- **Texto em português corrente, com o Acordo Ortográfico.** Sem maiúsculas
  espaçadas, sem legendas em letra de máquina, sem termos técnicos na versão
  de utilizador (há um teste que o confirma).

## Cores

| Papel | Escuro | Claro |
|---|---|---|
| Fundo | `#0F1D19` pinhal à noite | `#EDF1EC` nevoeiro |
| Superfície | `#162821` | `#FFFFFF` |
| Texto | `#EAF0EA` | `#13201B` |
| Texto secundário | `#A6B8AE` | `#46574F` |
| Luz do posto (preenchimento) | `#F0B44C` | `#E9A93A` |
| Luz do posto (texto) | `#F0B44C` | `#8A5200` |
| Fogo (avisos) | `#F07A57` | `#B23A20` |

Todo o texto tem contraste de pelo menos 4,5:1 sobre o fundo em que aparece.
Os dez temas têm uma cor própria em cada modo (variáveis `--th-*`), usada só no
pequeno ponto ao lado do nome.

## Letras

- **Newsreader** (Production Type) nos títulos das notícias, nos números grandes
  e nos títulos das folhas: foi desenhada para ler notícias em ecrã.
- **Schibsted Grotesk** (Schibsted) em tudo o resto: foi desenhada para jornais.
  Os algarismos tabulares só se usam em números alinhados (eixo, contagens),
  porque nesta letra também alargam a pontuação.

As duas vão dentro da aplicação, reduzidas aos caracteres do português
(`src/fontes/`), para funcionar sem rede. Licença SIL Open Font License 1.1
(`licencas/`).

## Tamanhos

Texto de interface 15 px; secundário 13–13,5 px; mínimo 11 px (eixo do
horizonte). Títulos de notícia 18,5 px; título de notícia aberta 27 px. Zonas de
toque com pelo menos 44 px.

## Fotografar a interface

```
node tests/visual/amostra.mjs <pasta-do-site>      # arquivo de exemplo com 40 notícias
python3 -m http.server 8765 --directory <pasta-do-site> &
python3 tests/visual/fotos.py <pasta-saída> index.html dark|light
python3 tests/visual/fotos-extra.py <pasta-saída> dark|light
```
