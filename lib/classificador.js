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
/* Cada tema tem termos fortes (valem 2) e fracos (valem 1). Um tema só é
   atribuído com 2 pontos: um termo forte, ou dois fracos. Assim "estratégia"
   ou "reforma", sozinhos, já não fazem de uma notícia "Política e PAC".     */
const THEMES = [
  { id:"politica", label:"Política e PAC", color:"#2E6B4F",
    strong:["pac","política agrícola comum","pepac","plano estratégico da pac","ifap","gpp","dgadr",
      "ministério da agricultura","ministra da agricultura","ministro da agricultura",
      "secretário de estado da agricultura","secretária de estado da agricultura","ecoregime",
      "condicionalidade","pagamentos diretos","pagamentos directos","apoios agrícolas","ajudas agrícolas",
      "subsídios agrícolas","quadro financeiro plurianual","conselho agricultura e pescas",
      "comissário da agricultura","comissário europeu da agricultura","dg agri","medidas agroambientais",
      "common agricultural policy","cap reform","cap post-2027"],
    weak:["bruxelas","comissão europeia","parlamento europeu","regulamento","legislação","orçamento",
      "estratégia","reforma","candidaturas","subsídio","apoio","european commission","regulation","subsidies"] },
  { id:"floresta", label:"Floresta", color:"#4C7A38",
    strong:["floresta","florestal","florestais","silvicultura","icnf","eucalipto","eucaliptal","pinhal","pinheiro bravo",
      "pinheiro manso","sobreiro","montado","cortiça","resina","desbaste","arborização","rearborização",
      "reflorestação","zif","zona de intervenção florestal","desflorestação","eudr","gestão de combustível",
      "serração","forest","forestry","deforestation","timber","logging"],
    weak:["biomassa","madeira","celulose","aglomerado","pinheiro","árvore"] },
  { id:"fogo", label:"Incêndios", color:"#B33F2B",
    strong:["incêndio florestal","incêndios florestais","incêndio rural","incêndios rurais","fogo florestal",
      "área ardida","fogo controlado","queimada","agif","dfci","faixa de gestão","risco de incêndio",
      "época de incêndios","wildfire","forest fire"],
    weak:["incêndio","fogo","bombeiros","proteção civil","protecção civil","ignição","chamas"] },
  { id:"agua", label:"Água e regadio", color:"#2A5A78",
    strong:["regadio","rega","irrigação","regante","associação de regantes","aproveitamento hidroagrícola",
      "hidroagrícola","perímetro de rega","edia","alqueva","dotação de rega","albufeira","convenção de albufeira",
      "seca","escassez hídrica","recursos hídricos","eficiência hídrica","aquífero","reutilização de água",
      "dessalinização","irrigation","drought","water scarcity"],
    weak:["água","barragem","captação","hídrico","tejo","guadiana","chuva","precipitação"] },
  { id:"clima", label:"Clima e ambiente", color:"#6C7F3F",
    strong:["alterações climáticas","mudanças climáticas","neutralidade carbónica","sequestro de carbono",
      "biodiversidade","desertificação","restauro da natureza","natura 2000","nitratos","fitofármaco",
      "pesticida","saúde do solo","climate change","biodiversity","nature restoration","soil health"],
    weak:["clima","climática","emissões","carbono","solo","ambiente","sustentabilidade","poluição",
      "climate","emissions"] },
  { id:"mercados", label:"Mercados e preços", color:"#9A6B12",
    strong:["preços agrícolas","preço ao produtor","preços ao produtor","custos de produção","cotação",
      "exportações agroalimentares","exportações agrícolas","balança agroalimentar","rendimento agrícola",
      "mercosul","fertilizante","adubo","gasóleo agrícola","farm income","commodity","commodities"],
    weak:["preço","mercado","exportação","exportações","importação","importações","tarifa","comércio",
      "inflação","margem","volume de negócios","faturação","facturação","prices","market","trade","exports"] },
  { id:"producao", label:"Produção e culturas", color:"#7A5C8E",
    strong:["vinha","vinícola","vitivinícola","viticultura","vindima","olival","azeite","olivicultura","amendoal",
      "amêndoa","cereal","cereais","trigo","milho","arroz","tomate","hortícola","horticultura","fruticultura",
      "pomar","pequenos frutos","mirtilo","citrino","estufa","agricultura biológica","agricultura regenerativa",
      "apicultura","colmeia","castanha","castanheiro","frutos secos","colheita","sementeira",
      "olive oil","cereals","organic farming","harvest"],
    weak:["vinho","oliveira","pera","maçã","biológico","fruta","mel","produção"] },
  { id:"pecuaria", label:"Pecuária e sanidade", color:"#8E5A3C",
    strong:["pecuária","pecuário","bovino","suíno","ovino","caprino","avícola","suinicultura","bovinicultura",
      "ovinicultura","laticínio","matadouro","dermatose nodular","língua azul","peste suína","gripe aviária",
      "sanidade animal","bem-estar animal","dgav","forragem","pastagem","pastagens","produtores de leite",
      "exploração pecuária","explorações pecuárias","livestock","dairy","bluetongue","avian influenza","animal health"],
    weak:["leite","carne","aves","vacinação","gado","rebanho"] },
  { id:"inovacao", label:"Inovação e ciência", color:"#3F7C7C",
    strong:["agricultura de precisão","agricultura digital","inovação agrícola","investigação agrícola","iniav",
      "instituto superior de agronomia","horizonte europa","agtech","precision farming","digital farming"],
    weak:["investigação","inovação","tecnologia","digital","satélite","sensor","drone","inteligência artificial",
      "universidade","projeto","projecto","startup","start-up","piloto","estudo","relatório","research","innovation"] },
  { id:"rural", label:"Mundo rural", color:"#6E6A58",
    strong:["mundo rural","desenvolvimento rural","despovoamento","jovens agricultores","confagri","cap",
      "confederação dos agricultores","associação de agricultores","cooperativa agrícola","cooperativas agrícolas",
      "emparcelamento","baldio","territórios de baixa densidade","rural areas","young farmers","farmers protest"],
    weak:["agricultor","cooperativa","protesto","manifestação","trator","interior","sucessão","cadastro","rural"] }
];
for(const t of THEMES) t.terms = t.strong.concat(t.weak);

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
  "varroa","aquicultura","pescas","castanheiro","castanicultura","produtores de castanha","souto","feira nacional de agricultura","ovibeja","agroglobal","vinho do porto","vinho verde","vinhos do douro","ivdp","instituto da vinha e do vinho",
  "setor do vinho","sector do vinho","setor vitivinícola","sector vitivinícola","pera rocha","maçã de alcobaça","fruticultor","horticultor","hortofrutícola",
  "fruticultura","horticultura","humidade do solo","agrometeorologia","agronómico","agronómica",
  "instituto superior de agronomia","escola superior agrária","produtores de fruta","produtores de vinho",
  "produtores de azeite","produtores de leite","produtores de cereais","arborização","rearborização","reflorestação","desbaste",
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
    "portugal","portugues","portugueses","portuguesa","portuguesas","alentejo","alentejano*","ribatejo","algarve",
    "algarvio*","douro","minho","tras-os-montes","acores","acoriano*","beira interior","beira baixa","beira alta",
    "beira litoral","beiras","ilha da madeira","regiao autonoma da madeira","madeirense*","funchal","ponta delgada",
    "lisboa","cidade do porto","distrito do porto","area metropolitana do porto","leixoes","coimbra","evora","beja",
    "santarem","setubal","viseu","braganca","castelo branco","vila real","viana do castelo","faro","leiria",
    "aveiro","portalegre","leziria","governo portugues","assembleia da republica","icnf","ifap","dgadr","dgav","agif",
    "ministerio da agricultura e pescas","ministerio da agricultura e mar","agencia portuguesa do ambiente",
    "confagri","edia","alqueva","ipma","pepac","cap","pera rocha","maca de alcobaca","vinho do porto",
    "vinho verde","vinhos do douro","ivdp","instituto da vinha e do vinho","queijo da serra","cereja do fundao",
    "ananas dos acores","banana da madeira","cortica portuguesa","feira nacional de agricultura","ovibeja",
    "agroglobal","agrosemana","corticeira amorim","amorim","the navigator company","altri","sovena","lactogal",
    "sogrape","symington","esporao","mondego","baixo alentejo","alto alentejo","regiao oeste","regiao do oeste",
    "serra da estrela","lezirias"] },

  { id:"eu", short:"UE", label:"Europa e instituições da UE", group:"base", terms:[
    "uniao europeia","ue","comissao europeia","parlamento europeu","conselho europeu","bruxelas",
    "politica agricola comum","estados-membros","eurodeputad*","dg agri","eudr","quadro financeiro plurianual",
    "estrasburgo","copa-cogeca","copa cogeca","eurostat","efsa","agrifish","european union","european commission",
    "espanha","espanho*","franca","frances","francesa","franceses","italia","italian*","alemanha","alema*",
    "paises baixos","holanda","holandes*","neerlandes*","belgica","belga","polonia","polaco*","polones*",
    "irlanda","irlandes*","dinamarca","dinamarques*","suecia","sueco","sueca","finlandia","finlandes*",
    "austria","austriac*","grecia","grego","grega","romenia","romeno","romena","bulgaria","bulgar*","hungria",
    "hungar*","chequia","republica checa","checo","checa","eslovaquia","eslovac*","eslovenia","esloven*",
    "croacia","croata","estonia","letonia","lituania","luxemburgo","malta","chipre","cipriota","reino unido",
    "inglaterra","escocia","pais de gales","irlanda do norte","britanic*","suica","suico","suicos","noruega",
    "norueg*","islandia","madrid","madri","paris","roma","berlim","londres","haia","amesterdao","varsovia",
    "viena","atenas","budapeste","bucareste","copenhaga","estocolmo","helsinquia","dublin","galiza",
    "andaluzia","extremadura","catalunha","castela","murcia","aragao","navarra","pais basco","huelva",
    "sevilha","badajoz","caceres","salamanca","bretanha","normandia","provenca","bordeus","borgonha",
    "occitania","toscana","sicilia","lombardia","piemonte","veneto","puglia","baviera","flandres","valonia"] },

  { id:"br", short:"BR", label:"Brasil", group:"ag", terms:[
    "brasil","brasileir*","sao paulo","minas gerais","mato grosso","mato grosso do sul","parana","goias","bahia",
    "rio grande do sul","rio grande do norte","santa catarina","pernambuco","ceara","maranhao","piaui","amazonas",
    "tocantins","rondonia","roraima","amapa","sergipe","alagoas","paraiba","espirito santo","distrito federal",
    "brasilia","rio de janeiro","belo horizonte","curitiba","porto alegre","recife","manaus","goiania","campinas",
    "ribeirao preto","uberlandia","londrina","chapeco","cuiaba","florianopolis","sao luis","teresina",
    "joao pessoa","maceio","aracaju","porto velho","embrapa","conab","ibama","incra","funai","plano safra",
    "lula","bolsonaro","haddad","alckmin","governo federal","itamaraty","aprosoja","bndes","banco do brasil",
    "petrobras","cerrado","matopiba"] },
  { id:"us", short:"EUA", label:"Estados Unidos", group:"ag", terms:[
    "estados unidos","eua","norte-american*","estadunidense*","usda","casa branca","trump","washington",
    "california","texas","iowa","kansas","nebraska","illinois","minnesota","dakota do norte","dakota do sul",
    "missouri","arkansas","wisconsin","ohio","midwest","corn belt","nova iorque","nova york","chicago",
    "farm bill","agricultores americanos","produtores americanos","governo americano","administracao americana",
    "mercado americano"] },
  { id:"cn", short:"CN", label:"China", group:"ag", terms:[
    "china","chines*","pequim","beijing","xangai","shanghai","xi jinping","li qiang","hong kong","macau",
    "cantao","guangdong","guangzhou","shenzhen","sichuan","yunnan","shandong","henan","hebei","hunan","hubei",
    "jiangsu","zhejiang","fujian","guangxi","heilongjiang","jilin","liaoning","xinjiang","tibete",
    "mongolia interior","yuan","yuans","renminbi","partido comunista chines","partido comunista da china"] },
  { id:"in", short:"IN", label:"Índia", group:"ag", terms:[
    "india","indian*","nova delhi","nova deli","mumbai","bombaim","punjab","uttar pradesh","maharashtra",
    "gujarat","bengala","modi","rupia*"] },
  { id:"ar", short:"AR", label:"Argentina", group:"ag", terms:[
    "argentin*","buenos aires","pampa*","milei","mendoza","pesos argentinos"] },
  { id:"ca", short:"CA", label:"Canadá", group:"ag", terms:[
    "canada","canadian*","canadense*","saskatchewan","alberta","manitoba","ontario","quebeque","quebec",
    "otava","ottawa","toronto","vancouver","montreal","dolares canadianos","dolares canadenses"] },
  { id:"ru", short:"RU", label:"Rússia", group:"ag", terms:[
    "russia","russo","russa","moscovo","moscou","kremlin","putin","rublo","siberia","sao petersburgo",
    "krasnodar","rostov","volgogrado"] },
  { id:"ua", short:"UA", label:"Ucrânia", group:"ag", terms:[
    "ucrania","ucranian*","kiev","kyiv","odessa","odesa","kharkiv","mykolaiv","dnipro","zelensky","zelenski"] },
  { id:"oc", short:"OC", label:"Austrália e Nova Zelândia", group:"ag", terms:[
    "australia","australian*","nova zelandia","neozelandes*","queensland","tasmania","nova gales do sul",
    "camberra","canberra","sydney","melbourne","auckland","dolares australianos"] },
  { id:"mx", short:"MX", label:"México", group:"ag", terms:[
    "mexico","mexican*","jalisco","sinaloa","sonora","chihuahua","michoacan","veracruz","sheinbaum",
    "pesos mexicanos"] },
  { id:"tr", short:"TR", label:"Turquia", group:"ag", terms:[
    "turquia","turco","turca","ancara","istambul","erdogan","anatolia","lira turca"] },
  { id:"za", short:"ZA", label:"África do Sul", group:"ag", terms:[
    "africa do sul","sul-african*","cidade do cabo","joanesburgo","pretoria","durban","ramaphosa","rand"] },
  { id:"pl", short:"PALOP", label:"PALOP e Timor-Leste", group:"ag", terms:[
    "angola","angolan*","luanda","benguela","huambo","huila","lubango","malanje","cabinda","kwanza*","cuanza*",
    "joao lourenco","mpla","unita","mocambique","mocambican*","maputo","nampula","zambezia","sofala",
    "cabo delgado","inhambane","niassa","metical","meticais","frelimo","renamo","daniel chapo","cabo verde",
    "cabo-verdian*","caboverdian*","guine-bissau","guine bissau","guineense*","bissau","sao tome",
    "sao-tomense*","santomense*","timor","timor-leste","timorense*","dili"] },
  { id:"mg", short:"MAG", label:"Magrebe e Egito", group:"ag", terms:[
    "marrocos","marroquin*","rabat","casablanca","argelia","argelin*","tunisia","tunisin*","egito","egipto",
    "egipci*","cairo","libia","mauritania","magrebe","sahara ocidental"] },
  { id:"se", short:"ASE", label:"Sudeste asiático", group:"ag", terms:[
    "indonesi*","jacarta","sumatra","borneu","kalimantan","malasia","malaisia","kuala lumpur","sarawak",
    "singapura","tailand*","banguecoque","bangkok","filipin*","manila","camboja","cambodja","cambojan*",
    "phnom penh","laos","vientiane","mianmar","myanmar","birmania","oleo de palma","ringgit","baht",
    "vietna","vietnam*","hanoi","ho chi minh","saigao","mekong","nguyen","pham minh chinh","comite popular",
    "vnd","dongs","da nang","can tho","dak lak","dak nong","lam dong","dong thap","an giang","ca mau",
    "kien giang","soc trang","ben tre","tien giang","hau giang","bac lieu","vinh long","tra vinh","long an",
    "tay ninh","binh duong","dong nai","binh phuoc","gia lai","kon tum","quang nam","quang ngai","quang ninh",
    "quang tri","quang binh","thua thien hue","nghe an","ha tinh","thanh hoa","ninh binh","nam dinh",
    "thai binh","hai phong","hai duong","hung yen","bac ninh","bac giang","thai nguyen","lang son","cao bang",
    "ha giang","lao cai","yen bai","son la","dien bien","lai chau","hoa binh","phu tho","tuyen quang",
    "khanh hoa","ninh thuan","binh thuan","phu yen","binh dinh"] },
  { id:"la", short:"LAT", label:"Chile, Peru, Uruguai e Paraguai", group:"ag", terms:[
    "chile","chilen*","santiago do chile","peruan*","uruguai*","paraguai*","montevideu"] },

  { id:"other", short:"—", label:"Resto do mundo", group:"other", terms:[
    "japao","japones*","toquio","quioto","osaka","hokkaido","iene","ienes","coreia","corean*","seul","wons",
    "taiwan","taiwanes*","israel","israelit*","irao","iranian*","teerao","arabia saudita","saudit*","emirados",
    "dubai","catar","qatar","kuwait","iraque","iraquian*","siria","libano","libanes*","jordania","iemen",
    "quenia","quenian*","nairobi","nigeria","nigerian*","naira","etiopia","etiope*","adis abeba","gana",
    "ganes*","senegal","senegales*","dacar","tanzania","uganda","zimbabue","zambia","malawi","malaui","ruanda",
    "burundi","camaroes","costa do marfim","marfinense*","burkina faso","niger","sudao","somalia","madagascar",
    "congo","paquistao","paquistanes*","bangladesh","nepal","sri lanka","afeganistao","cazaquistao",
    "uzbequistao","quirguistao","tajiquistao","turquemenistao","mongolia","colombia","colombian*","bogota",
    "venezuela","venezuelan*","caracas","equatorian*","quito","bolivia","bolivian*","cuba","cuban*","havana",
    "costa rica","guatemala","honduras","panama","nicaragua","el salvador","republica dominicana","haiti",
    "jamaica","belgrado","bosnia","albania","macedonia do norte","kosovo","montenegro","moldavia",
    "bielorrussia","georgia","armenia","azerbaijao"] }
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
   q:'"política agrícola comum" OR "reforma da PAC" OR "pagamentos da PAC" OR IFAP OR PEPAC OR "Ministério da Agricultura" OR "apoios agrícolas" -"Agricultura e Pecuária"'},
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

/* ============================ origem da notícia ==========================
   Onde foi publicada pesa mais do que os nomes de lugar que menciona: uma
   notícia de um jornal brasileiro, ou de uma agência vietnamita traduzida
   para português, sem nenhum nome de país, continua a ser estrangeira.
   Sinais, por esta ordem de força: o domínio da publicação, o nome da
   publicação, a edição traduzida (pt.site.com) e marcas no próprio texto
   (português do Brasil, letras vietnamitas, moedas).                      */
const PUB_POR_ZONA = {
  pt: ["publico","expresso","observador","rtp","rtp noticias","sic noticias","sic","tvi","cnn portugal",
    "jornal de noticias","jn","diario de noticias","dn","correio da manha","cm","sapo","eco","jornal de negocios",
    "dinheiro vivo","visao","sabado","lusa","renascenca","tsf","agroportal","vida rural","voz do campo",
    "agricultura e mar","frutas legumes e flores","jornal economico","o jornal economico","executive digest",
    "noticias ao minuto","nascer do sol","sol","jornal i","jornal do centro","diario do minho","correio do minho",
    "diario as beiras","o mirante","diario do alentejo","sul informacao","diario de leiria","reconquista",
    "jornal do fundao","noticias de coimbra","postal do algarve","acoriano oriental","diario de noticias da madeira",
    "jm madeira","agricultura e floresta","revista agrotec","agronegocios","green savers","ambiente magazine",
    "exame informatica","sapo noticias","jornal de leiria","regiao de leiria","o interior","terras da beira"],
  br: ["globo","o globo","globo rural","folha","folha de s.paulo","folha de sao paulo","uol noticias","estadao",
    "estadao conteudo","cnn brasil","valor economico","correio braziliense","agencia brasil","poder360",
    "metropoles","infomoney","canal rural","noticias agricolas","agrolink","revista oeste","gazeta do povo",
    "jovem pan","brasil de fato","carta capital","cartacapital","istoe dinheiro","gzh","zero hora",
    "diario de pernambuco","jornal do commercio","estado de minas","correio do povo","diario do nordeste",
    "forbes brasil","bbc news brasil","dw brasil","sputnik brasil","money times","seu dinheiro","nsc total",
    "o liberal","jornal opcao","broadcast agro","portal do agronegocio","portal dbo","compre rural",
    "giro do boi","beefpoint","milkpoint","agencia senado","agencia camara","sbt news","terra brasil",
    "revista exame","epoca negocios","o povo","a tarde","o tempo","mais goias","canal do produtor",
    "revista cultivar","agro estadao","portal do governo","gov.br"],
  pl: ["jornal de angola","novo jornal","angop","angola press","expansao","o pais","carta de mocambique",
    "club of mozambique","noticias de mocambique","radio mocambique","inforpress","expresso das ilhas",
    "a nacao","tela non","stp-press","tatoli","timor agora"],
  se: ["vietnam.vn","vietnamplus","vietnam plus","vietnam+","nhan dan","bao nhan dan","vov","voz do vietname",
    "vnexpress","tuoi tre","thanh nien","vietnam news","agencia vietnamita de noticias","baotintuc","dan tri",
    "hanoi times","the star","bernama","antara"],
  cn: ["xinhua","agencia xinhua","cgtn","cctv","china daily","global times","diario do povo","people's daily",
    "radio internacional da china","china radio international","cri online","macau hub","macauhub",
    "plataforma","plataforma media","hoje macau","ponto final","tribuna de macau","jornal tribuna de macau",
    "tdm","teledifusao de macau","macau business","o clarim","south china morning post","scmp"],
  ru: ["sputnik","tass","ria novosti","rt","pravda"],
  tr: ["trt","trt portugues","anadolu","agencia anadolu","daily sabah"],
  in: ["times of india","the hindu","hindustan times","india today","ndtv"],
  eu: ["euronews","rfi","dw","deutsche welle","france 24","swissinfo","swi swissinfo","bbc","bbc news",
    "euractiv","politico europe","agence france-presse","afp","efe","agencia efe","reuters"],
  other: ["al jazeera","press tv","hispantv","mehr","irna","prensa latina","telesur","granma","nhk","kyodo",
    "yonhap","kbs","arirang","ipsnews","ips"]
};
/* Nomes curtos que só valem como nome completo da publicação ("Exame" é
   brasileira, "Exame Informática" é portuguesa). */
const PUB_EXATO = { br: ["exame","terra","veja","band","r7","uol","g1","istoe","epoca"] };
const HOSTS_POR_ZONA = {
  cn: ["xinhuanet.com","news.cn","cgtn.com","chinadaily.com.cn","people.cn","plataformamedia.com","macaubusiness.com",
       "scmp.com","globaltimes.cn"],
  ru: ["rt.com","sputniknews.com","sputnikglobe.com","tass.com"],
  tr: ["trt.net.tr","aa.com.tr","dailysabah.com","trtportugues.com"],
  eu: ["euronews.com","dw.com","france24.com","bbc.com","swissinfo.ch","euractiv.com","politico.eu","reuters.com"],
  other: ["aljazeera.com","aljazeera.net","telesurtv.net","ipsnews.net","nhk.or.jp"],
  br: ["br.sputniknews.com","noticias.uol.com.br"]
};
const CC_POR_ZONA = {
  pt: ["pt"], br: ["br"], us: ["us","gov","edu","mil"], cn: ["cn","hk","mo"], in: ["in"], ar: ["ar"], ca: ["ca"],
  ru: ["ru","su"], ua: ["ua"], oc: ["au","nz"], mx: ["mx"], tr: ["tr"], za: ["za"],
  pl: ["ao","mz","cv","st","gw","tl"], mg: ["ma","dz","tn","eg","ly","mr"],
  se: ["vn","id","my","th","ph","sg","kh","la","mm"], la: ["cl","pe","uy","py"],
  eu: ["es","fr","it","de","nl","be","ie","at","pl","gr","ro","bg","hu","cz","sk","si","hr","ee","lv","lt","lu",
       "mt","cy","dk","se","fi","eu","uk","ch","no","is","gal","cat","eus"]
};
/* domínios de país usados como genéricos (.co, .io, .tv…): não dizem nada */
const CC_GENERICOS = new Set(["co","io","tv","me","fm","ai","cc","ws","to","gg","sh","so","am","nu","tk","ly","fyi","ag"]);

const lw = s => new RegExp("(?:^|[^\\p{L}\\p{N}])(?:" + s + ")(?=$|[^\\p{L}\\p{N}])", "iu");
/* Português do Brasil no texto: fortes valem 2, fracos valem 1. */
const BR_FORTE = ["r\\$\\s?\\d", "governo federal", "pal[aá]cio do planalto", "lula", "bolsonaro", "haddad",
  "conab", "embrapa", "ibama", "incra", "plano safra", "prefeitura", "prefeit[oa]", "estadual", "estaduais",
  "deputad[oa]s? federa(?:l|is)", "senado federal", "c[aâ]mara dos deputados", "stf", "mst", "novo pac",
  "acelera[cç][aã]o do crescimento", "minist[eé]rio da agricultura e pecu[aá]ria", "minist[eé]rio da fazenda",
  "(?:bilh|milh)(?:[oõ]es|[aã]o) de reais", "agrot[oó]xic[oa]s?", "safrinha", "boi gordo", "pecuaristas?",
  "fazendeir[oa]s?", "colheitadeiras?", "caminhoneir[oa]s?", "rodovias?", "br-\\d{3}"];
const BR_FRACO = ["econ[ô]mic\\w*", "agron[ô]mic\\w*", "fen[ô]men\\w*", "quil[ô]metr\\w*", "ant[ô]nio", "[ô]nibus",
  "g[ê]nero", "beb[ê]", "equipe", "registro", "celular", "usu[aá]ri[oa]s?", "planejamento", "fato", "contato",
  "safras?", "soja", "reais", "arroba", "sacas?", "lavouras?", "plantio", "produtor(?:es)? rura(?:l|is)",
  "agroneg[oó]cio", "usinas?", "etanol", "cana-de-a[cç][uú]car", "fazendas?", "frigor[ií]fic[oa]s?",
  "(?:est[aá]|est[aã]o|estava|estavam|vem|v[eê]m|segue|seguem|continua|continuam) \\p{L}+ndo"];
const PT_FORTE = ["portugal", "governo portugu[eê]s", "assembleia da rep[uú]blica", "icnf", "ifap", "dgadr", "dgav",
  "agif", "confagri", "edia", "alqueva", "alentej\\w*", "algarv\\w*", "ribatejo", "tr[aá]s-os-montes", "a[cç]ores",
  "lisboa", "[eé]vora", "beja", "santar[eé]m", "viseu", "bragan[cç]a", "leiria", "coimbra", "set[uú]bal", "aveiro",
  "portalegre", "castelo branco", "vila real", "viana do castelo", "funchal", "agricultores portugueses",
  "produtores portugueses", "exporta[cç][oõ]es portuguesas", "portugu[eê]s(?:a|es|as)?", "pera rocha",
  "vinho do porto", "vinho verde"];
/* Letras que só existem em vietnamita (nomes de lugar e de pessoas mantidos na tradução) */
const LETRAS_VN = /[đĐơƠưƯạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/;
/* Outros alfabetos: a notícia veio de fora */
const OUTRA_ESCRITA = /[Ѐ-ӿ؀-ۿ฀-๿぀-ヿ一-鿿가-힯]/;

let RX_ = null;      // construído na primeira utilização: wordRx só existe mais abaixo
const lwg = l => new RegExp("(?:^|[^\\p{L}\\p{N}])(" + l.join("|") + ")(?=$|[^\\p{L}\\p{N}])", "giu");
const RX = () => RX_ || (RX_ = {
  br: lwg(BR_FORTE), brw: lwg(BR_FRACO), pt: [lw(PT_FORTE.join("|"))],
  pub: Object.entries(PUB_POR_ZONA).map(([z, l]) => [z, [anyRx(l)]]),
  cc: new Map(Object.entries(CC_POR_ZONA).flatMap(([z, l]) => l.map(c => [c, z]))),
  gaz: ZONES.map(z => [z.id, [anyRx(z.terms)]])
});

const distintosU = (rx, txt) => { const v = new Set(); for(const m of txt.matchAll(rx)) v.add(m[1].toLowerCase()); return v.size; };
function hostDe(it){
  if(it.pubHost) return String(it.pubHost).toLowerCase().replace(/^www\./, "");
  const h = hostOf(it.link || "");
  return /(^|\.)news\.google\./.test(h) ? "" : h;
}
function zonaDoDominio(h){
  if(!h) return "";
  for(const [z, l] of Object.entries(HOSTS_POR_ZONA)) if(l.some(d => h === d || h.endsWith("." + d))) return z;
  const tld = h.split(".").pop();
  if(RX().cc.has(tld)) return RX().cc.get(tld);
  return tld.length === 2 && !CC_GENERICOS.has(tld) ? "other" : "";
}
/* Devolve { pais, br } — a zona de onde a notícia vem ("" se não se sabe)
   e a pontuação de português do Brasil no texto. */
function origem(it){
  const bruto = `${it.title || ""} ${it.dek || ""}`;
  const texto = " " + bruto.toLowerCase() + " ";
  const br = 2 * distintosU(RX().br, texto) + distintosU(RX().brw, texto);
  const pts = {};
  const soma = (z, n) => { if(z) pts[z] = (pts[z] || 0) + n; };
  const h = hostDe(it);
  const zd = zonaDoDominio(h);
  soma(zd, 4);
  // edição traduzida de um sítio estrangeiro: pt.vietnamplus.vn, portuguese.xinhuanet.com…
  if(/^br\./.test(h)) soma("br", 4);
  else if(/^(pt|pt-br|portuguese|portugues|lusofono)\./.test(h) && zd !== "pt") soma(zd && zd !== "eu" ? zd : "other", 3);
  const pub = " " + deacc(it.publisher || "").trim() + " ";
  for(const [z, l] of RX().pub) if(l.some(r => r.test(pub))) soma(z, 4);
  for(const [z, l] of Object.entries(PUB_EXATO)) if(l.includes(pub.trim())) soma(z, 4);
  for(const [z, l] of RX().gaz) if(l.some(r => r.test(pub))) soma(z, 3);   // "Jornal de Angola", "Vietnam.vn"
  if(LETRAS_VN.test(bruto)) soma("se", 4);
  else if(OUTRA_ESCRITA.test(bruto)) soma("other", 3);
  if(br >= 3) soma("br", br);
  let pais = "", melhor = 2;
  for(const z of ["pt", ...Object.keys(pts).filter(k => k !== "pt")])
    if((pts[z] || 0) > melhor){ pais = z; melhor = pts[z]; }                // empate: fica Portugal
  return { pais, br };
}

/* Palavras que também são apelidos ou nomes de lugar. Com maiúscula a meio da
   frase, são um nome próprio e não contam ("Rui Oliveira", "António Pinheiro"). */
const PROPRIOS = ["Oliveira","Pinheiro","Pereira","Trigo","Carvalho","Madeira","Mel","Vinha","Silva","Rocha","Leite","Cardoso"];
const RX_PROPRIO = new RegExp("([^.!?:;—–\\-«\"“\\s])(\\s+)(" + PROPRIOS.join("|") + ")(?=$|[^\\p{L}])", "gu");
function semProprios(t){ return String(t || "").replace(RX_PROPRIO, "$1$2§"); }

/* "PAC" e "CAP" só contam com contexto agrícola. No Brasil, PAC é o Programa
   de Aceleração do Crescimento; em inglês, "cap" é um tecto.               */
const CONTEXTO_AGRO = /agricult|agricola|agropecuar|pepac|politica agricola|ifap|ecoregime|pagamentos dire|desenvolvimento rural|confederacao dos agricultores|bruxelas|comissao europeia|uniao europeia|parlamento europeu|eurodeputad|(^|[^a-z])ue([^a-z]|$)/;
const PAC_BR = /novo pac|aceleracao do crescimento|governo federal|prefeitura/;

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

/* Uma só expressão para uma lista inteira de termos, com as mesmas regras de
   wordRx (fronteira de palavra, plural, prefixo com *). Com "g", m[1] é o
   termo encontrado — serve para contar termos diferentes.                 */
function parteDe(term){
  let raw = deacc(term).trim(), prefix = false;
  if(raw.endsWith("*")){ prefix = true; raw = raw.slice(0, -1); }
  const body = raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  if(prefix) return body + "[a-z0-9]*";
  return body + (/[aeiou]$/.test(raw) ? "s?" : /[rz]$/.test(raw) ? "(?:es)?" : "");
}
function anyRx(terms, flags = ""){
  const partes = [...new Set(terms.filter(Boolean).map(parteDe))].sort((a, b) => b.length - a.length);
  if(!partes.length) return /(?!)/;
  return new RegExp("(?:^|[^a-z0-9])(" + partes.join("|") + ")(?=[^a-z0-9]|$)", flags);
}
const distintos = (rx, txt) => { const v = new Set(); for(const m of txt.matchAll(rx)) v.add(m[1]); return v.size; };

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

/* Termos que só aparecem em notícias brasileiras: o Google Notícias deixa-as
   de fora logo à partida, antes de chegarem ao classificador. */
const GNEWS_EXCLUIR = '-"governo federal" -prefeitura -"Plano Safra" -"Novo PAC" -"Aceleração do Crescimento" -safrinha -site:vietnam.vn -site:vietnamplus.vn';
function gnewsUrl(q, days){
  const excl = /(^|\s)-"governo federal"/.test(q) ? "" : " " + GNEWS_EXCLUIR;
  return "https://news.google.com/rss/search?q=" + encodeURIComponent(`${q}${excl} when:${days}d`) +
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
  const pubHost = hostOf(String(raw.sourceUrl || "").trim());
  const e = { title, link, ts, dek, publisher, cats: String(raw.cats || "").slice(0, 160),
              srcId: src.id, srcName: src.name };
  if(pubHost && !/(^|\.)news\.google\./.test(pubHost)) e.pubHost = pubHost;
  return e;
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
    themes: THEMES.map(th => ({id:th.id, forte: anyRx(th.strong, "g"), fraco: anyRx(th.weak, "g")})),
    zones: ZONES.map(z => ({id:z.id, rx: [anyRx(z.terms)]})),
    srcMap: opts.sourceGroups ||
            Object.fromEntries(DEFAULT_SOURCES.map(s => [s.id, s.group]))
  };
}

function analyseWith(LEX, it){
  const g = LEX.srcMap[it.srcId] || (it.own ? "Minhas" : "");
  const orig = origem(it);
  const estrangeira = !!orig.pais && orig.pais !== "pt" && orig.pais !== "eu";

  // texto para relevância e temas: sem nomes próprios ambíguos nem marcas
  let hay = " " + deacc(`${semProprios(it.title)} ${semProprios(it.dek)} ${it.publisher || ""} ${it.cats || ""}`) + " ";
  for(const nb of NEUTRAL) if(hay.includes(nb)) hay = hay.split(nb).join(" ");
  const pacFora = !CONTEXTO_AGRO.test(hay) || PAC_BR.test(hay) || (estrangeira && !/politica agricola comum/.test(hay));
  if(pacFora) hay = hay.replace(/(^|[^a-z0-9])pac(?=[^a-z0-9]|$)/g, "$1 ");
  if(!/agricult|agricola|confederacao/.test(hay)) hay = hay.replace(/(^|[^a-z0-9])cap(?=[^a-z0-9]|$)/g, "$1 ");

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
  if(it.own) score = Math.max(score, 50);

  // temas: um termo forte, ou dois fracos
  const themes = [];
  // "incêndio florestal" é um incêndio: não conta outra vez como floresta
  const hayFlor = hay.replace(/(?:incendios?|fogos?) (?:florest|rura)\w*/g, " ");
  for(const th of LEX.themes){
    const h = th.id === "floresta" ? hayFlor : hay;
    const c = 2 * distintos(th.forte, h) + distintos(th.fraco, h);
    if(c >= 2) themes.push({id:th.id, c});
  }
  themes.sort((a,b) => b.c - a.c);

  // âmbito: de uma publicação estrangeira, Portugal e a UE só contam se estiverem
  // no título — uma referência de passagem na entrada não chega
  const institucional = g === "Europa" || g === "Oficial";
  const titulo = " " + deacc(it.title || "") + " ";
  const textoZ = " " + deacc(`${it.title || ""} ${it.dek || ""}`) + " ";
  const zonas = new Set();
  let estrangeiroNoTitulo = false;
  for(const z of LEX.zones){
    const local = z.id === "pt" || z.id === "eu";
    const onde = estrangeira && local ? titulo : textoZ;
    if(z.rx.some(r => r.test(onde))) zonas.add(z.id);
    if(!local && z.rx.some(r => r.test(titulo))) estrangeiroNoTitulo = true;
  }
  const brutoT = " " + `${it.title || ""}`.toLowerCase() + " ";
  const ptNoTitulo = RX().pt.some(r => r.test(brutoT));
  if(estrangeira){
    zonas.add(orig.pais);
    if(zonas.has("pt") && !ptNoTitulo) zonas.delete("pt");
    // "Vietname exporta arroz para a UE": é uma notícia do Vietname
    if(zonas.has("eu") && estrangeiroNoTitulo) zonas.delete("eu");
  } else if(orig.br >= 3 && !RX().pt.some(r => r.test(" " + textoZ + " "))){
    zonas.add("br");                                    // escrita brasileira, sem nada de Portugal
    zonas.delete("pt");
  }
  // fonte institucional (Comissão, Diário da República): é sempre do âmbito dela
  if(institucional && (orig.pais === "eu" || orig.pais === "pt")) zonas.add(orig.pais);
  // jornal português a falar de exportações, do governo ou de produtores nacionais: é também de Portugal
  if(orig.pais === "pt" && /exportac|importac|produtores nacionais|producao nacional|mercado nacional|portugues|ministr[oa] d[ao]s? agricultura|secretari[oa] de estado|governo|homolog/.test(textoZ))
    zonas.add("pt");
  if(!zonas.size) zonas.add(orig.pais || "pt");
  const zones = [...zonas];

  const pt = zonas.has("pt"), ue = zonas.has("eu");
  const geo = pt && ue ? "UE·PT" : pt ? "PT" : ue ? "UE" : (ZONE_BY_ID[zones[0]]?.short || "—");

  return { score, themes: themes.slice(0,3).map(t => t.id), geo, zones, origem: orig.pais,
           hits: [...new Set(hits)].slice(0,4) };
}

return { THEMES, THEME_BY_ID, CORE, SECOND, NEUTRAL, PUB_NOISE, PATH_NOISE, PATH_GOOD, SPORT, NOISE,
         ZONES, ZONE_BY_ID, DEFAULT_ZONES, DEFAULT_SOURCES, KEEP_MIN,
         deacc, hostOf, decodeEntities, stripTags, normTitle, wordRx, gnewsUrl, cleanEntry, decodeBytes,
         buildLexicon, analyseWith, origem };
});
