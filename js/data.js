// Biblioteca de exercícios, programa, fases do muscle-up e conteúdo do guia

// kind: barbell | dumbbell | machine | weighted_bw (peso extra, pode ser 0) | bodyweight | band
// tier: main | secondary | accessory | skill  (define o descanso por defeito)
export const EX = {
  bench: {
    name: 'Supino', kind: 'barbell', tier: 'main', group: 'peito',
    cues: [
      'Omoplatas juntas e para baixo antes de tirar a barra.',
      'Pés firmes no chão e empurra o chão com as pernas (leg drive).',
      'Antebraços na vertical em baixo; a barra toca na parte de baixo do peito.',
      'Pulso direito, com a barra na base da palma e não nos dedos. Nas séries pesadas usa as fitas de pulso.',
      'Desce controlado, sobe com intenção. Barras de segurança sempre montadas.',
    ],
  },
  bench_paused: {
    name: 'Supino com pausa', kind: 'barbell', tier: 'main', group: 'peito',
    note: 'pausa de 2 s com a barra parada no peito',
    cues: [
      'A barra fica completamente parada no peito durante 2 segundos.',
      'Mantém a tensão nas costas durante a pausa: não "afundes" no banco.',
      'Constrói força a sair do peito, que é onde o 100 kg costuma falhar.',
    ],
  },
  bench_close: {
    name: 'Supino pegada fechada', kind: 'barbell', tier: 'secondary', group: 'tríceps',
    note: 'mãos à largura dos ombros',
    cues: ['Mãos à largura dos ombros, cotovelos mais junto ao corpo.', 'Reforça o tríceps para o bloqueio final do supino.'],
  },
  incline_db: {
    name: 'Supino inclinado com halteres', kind: 'dumbbell', tier: 'accessory', group: 'peito',
    note: 'peso de cada halter',
    cues: ['Banco a 30°.', 'Desce até sentires alongamento no peito; sobe sem bater os halteres.'],
  },
  ohp_db: {
    name: 'Press de ombros com halteres', kind: 'dumbbell', tier: 'accessory', group: 'ombros',
    note: 'peso de cada halter',
    cues: ['Sentado ou de pé, abdominais contraídos.', 'Sobe até aos braços quase estendidos, sem arquear a lombar.'],
  },
  weighted_pullup: {
    name: 'Elevações com peso', kind: 'weighted_bw', tier: 'secondary', group: 'costas',
    note: 'regista só o peso extra: 0 sem peso; depois cinto de lastro ou mochila com peso',
    cues: ['Começa com os braços estendidos e omoplatas ativas.', 'Queixo acima da barra em todas as reps; nada de meias reps.'],
  },
  pullup_slow: {
    name: 'Elevações com descida lenta', kind: 'bodyweight', tier: 'secondary', group: 'costas', alts: ['archer_pull', 'pullup'],
    note: 'só o peso do corpo; 3 segundos a descer',
    cues: ['Sobe normal, queixo acima da barra.', 'Desce em 3 segundos, contados, até aos braços estendidos.', 'Quando fizeres 8 reps em todas as séries, passa para elevações arqueiro (troca o exercício).'],
  },
  archer_pull: {
    name: 'Elevações arqueiro', kind: 'bodyweight', tier: 'secondary', group: 'costas', alts: ['pullup_slow', 'pullup'],
    note: 'reps por cada lado',
    cues: ['Pega larga. Puxa para um lado, com o outro braço quase esticado a ajudar.', 'Alterna os lados; regista as reps de cada lado.', 'Dá força de um braço sem precisares de pesos.'],
  },
  pullup: {
    name: 'Elevações', kind: 'bodyweight', tier: 'secondary', group: 'costas',
    cues: ['Braços totalmente estendidos em baixo.', 'Queixo acima da barra.'],
  },
  c2b: {
    name: 'Elevações chest-to-bar', kind: 'bodyweight', tier: 'skill', group: 'costas',
    note: 'o peito toca na barra',
    cues: ['Puxa os cotovelos para baixo e para trás.', 'O peito (não o queixo) tem de tocar na barra.', 'Cada rep explosiva; para quando deixar de tocar.'],
  },
  explosive_pull: {
    name: 'Elevações explosivas', kind: 'bodyweight', tier: 'skill', group: 'costas',
    note: 'o mais alto possível, peito à barra',
    cues: ['Rep explosiva desde baixo: tenta que a barra chegue ao peito ou mais abaixo.', 'Poucas reps, todas rápidas. Descansa bem entre séries.'],
  },
  waist_pull: {
    name: 'Elevações até à barriga', kind: 'bodyweight', tier: 'skill', group: 'costas',
    note: 'a barra chega à zona do umbigo',
    cues: ['Pequeno balanço controlado (kip) é permitido.', 'Puxa a barra em direção às ancas, inclinando o tronco para trás.', 'É esta altura que cria espaço para passares por cima da barra.'],
  },
  sbd: {
    name: 'Straight bar dips', kind: 'bodyweight', tier: 'secondary', group: 'tríceps',
    note: 'fundos em cima da barra reta, só com o peso do corpo',
    cues: ['Em cima da barra, desce até ela tocar perto do umbigo/peito.', 'Inclina o tronco à frente e empurra até aos braços estendidos.', 'É a parte de cima do muscle-up.'],
  },
  dips: {
    name: 'Fundos nas paralelas', kind: 'weighted_bw', tier: 'secondary', group: 'tríceps',
    note: 'peso extra se houver',
    cues: ['Desce até os ombros ficarem ao nível dos cotovelos.', 'Sem dor no ombro: se doer, encurta a amplitude.'],
  },
  mu_negative: {
    name: 'Negativas de muscle-up', kind: 'bodyweight', tier: 'skill', group: 'skill',
    note: 'começa por cima da barra e desce em 3–5 s',
    cues: ['Sobe para cima da barra (salto ou caixa).', 'Desce devagar, passando pela transição até aos braços estendidos.', 'Sente onde os pulsos rodam por cima da barra.'],
  },
  mu_band: {
    name: 'Muscle-up com banda', kind: 'band', tier: 'skill', group: 'skill',
    note: 'banda presa na barra, sob os joelhos ou pés',
    cues: ['Usa a banda mais leve que te deixe fazer reps limpas.', 'Puxa para trás e à volta da barra, não na vertical.', 'Passa os cotovelos por cima depressa.'],
  },
  mu_low_bar: {
    name: 'Transição em barra baixa', kind: 'bodyweight', tier: 'skill', group: 'skill',
    note: 'barra à altura do peito, pés no chão',
    cues: ['Usa as pernas para ajudar e foca-te só na rotação dos pulsos e cotovelos por cima da barra.'],
  },
  dead_hang: {
    name: 'Dead hang', kind: 'hold', tier: 'accessory', group: 'pegada',
    note: 'pendurado na barra, braços estendidos',
    cues: ['Pendura-te com os braços totalmente estendidos e os ombros relaxados.', 'Respira devagar e deixa as costas e os ombros alongar.', 'Serve para alongar no fim do treino e para a pegada aguentar mais tempo na barra.'],
  },
  muscle_up: {
    name: 'Muscle-up', kind: 'bodyweight', tier: 'skill', group: 'skill',
    cues: [
      'Pegada um pouco mais fechada que nas elevações, pulso por cima da barra.',
      'Balanço curto e controlado: corpo arqueado atrás, corpo "côncavo" à frente.',
      'Puxa a barra para as ancas e passa os cotovelos por cima depressa.',
      'Evita passar um braço de cada vez (chicken wing).',
      'Aquece os pulsos antes (rodar os pulsos e apoiar o peso nas palmas). Se o pulso doer, para por hoje.',
    ],
  },
  row: {
    name: 'Remada sentada no cabo', kind: 'machine', tier: 'accessory', group: 'costas',
    alts: ['row_db', 'row_chest'],
    cues: ['Peito para fora, puxa os cotovelos para trás.', 'Pausa curta com as omoplatas juntas.'],
  },
  row_db: { name: 'Remada com halter', kind: 'dumbbell', tier: 'accessory', group: 'costas', alts: ['row', 'row_chest'], cues: ['Apoio num banco, costas direitas.', 'Puxa o cotovelo em direção à anca.'] },
  row_chest: { name: 'Remada com apoio no peito', kind: 'machine', tier: 'accessory', group: 'costas', alts: ['row', 'row_db'], cues: ['Peito encostado ao apoio; não balances.'] },
  pulldown: { name: 'Puxada na polia', kind: 'machine', tier: 'accessory', group: 'costas', alts: ['pullup', 'row'], cues: ['Puxa a barra até ao peito, cotovelos para baixo.', 'Controla a subida.'] },
  face_pull: { name: 'Face pulls', kind: 'machine', tier: 'accessory', group: 'ombros', note: 'corda na polia alta, puxar para a cara', alts: ['rear_delt'], cues: ['Corda à altura da cara; puxa separando as mãos.', 'Protege os ombros de tanto empurrar.'] },
  lateral_raise: { name: 'Elevações laterais', kind: 'dumbbell', tier: 'accessory', group: 'ombros', note: 'peso de cada halter', cues: ['Sobe até à altura dos ombros, sem balançar.'] },
  rear_delt: { name: 'Aberturas inversas', kind: 'machine', tier: 'accessory', group: 'ombros', alts: ['face_pull'], cues: ['Máquina ou halteres; braços quase estendidos, abre para trás.'] },
  triceps_pushdown: { name: 'Extensão de tríceps na polia', kind: 'machine', tier: 'accessory', group: 'tríceps', alts: ['triceps_overhead'], cues: ['Cotovelos colados ao corpo; estende até ao fim.'] },
  triceps_overhead: { name: 'Extensão de tríceps acima da cabeça', kind: 'machine', tier: 'accessory', group: 'tríceps', alts: ['triceps_pushdown'], cues: ['Cabo ou halter; alongamento total atrás da cabeça.'] },
  curl: { name: 'Curl de bíceps', kind: 'dumbbell', tier: 'accessory', group: 'bíceps', note: 'peso de cada halter', alts: ['hammer_curl'], cues: ['Sem balançar o tronco; desce até ao fim.'] },
  hammer_curl: { name: 'Curl martelo', kind: 'dumbbell', tier: 'accessory', group: 'bíceps', note: 'peso de cada halter', alts: ['curl'], cues: ['Palmas viradas uma para a outra.'] },
};

export const BAND_LEVELS = ['forte', 'média', 'leve'];

// Programa. mode: top_backoff | double | reps | skill
// place: supera (supino e máquinas) | estadio (barras: muscle-up, elevações, dips)
export const DAYS = {
  A: {
    label: 'Supera A', title: 'Pesado', place: 'supera',
    blurb: 'Série pesada de supino e costas nas máquinas.',
    slots: [
      { id: 'A_bench', ex: 'bench', mode: 'top_backoff', topReps: 3, topRPE: 8, backSets: 3, backReps: 5, backRPE: 7 },
      { id: 'A_row', ex: 'row', mode: 'double', sets: 4, min: 6, max: 10 },
      { id: 'A_pulldown', ex: 'pulldown', mode: 'double', sets: 3, min: 8, max: 12 },
      { id: 'A_face', ex: 'face_pull', mode: 'double', sets: 3, min: 12, max: 20 },
      { id: 'A_hang', ex: 'dead_hang', mode: 'hold', sets: 1, seconds: 60 },
    ],
  },
  B: {
    label: 'Supera B', title: 'Volume', place: 'supera',
    blurb: 'Mais reps no supino para construir músculo.',
    slots: [
      { id: 'B_bench', ex: 'bench', mode: 'double', sets: 4, min: 6, max: 8, startPct: 0.76 },
      { id: 'B_dips', ex: 'dips', mode: 'double', sets: 3, min: 6, max: 12, startAdded: 0 },
      { id: 'B_rowdb', ex: 'row_db', mode: 'double', sets: 3, min: 8, max: 12 },
      { id: 'B_lat', ex: 'lateral_raise', mode: 'double', sets: 3, min: 12, max: 20 },
      { id: 'B_tri', ex: 'triceps_pushdown', mode: 'double', sets: 3, min: 10, max: 15 },
      { id: 'B_hang', ex: 'dead_hang', mode: 'hold', sets: 1, seconds: 60 },
    ],
  },
  C: {
    label: 'Supera C', title: 'Força e técnica', place: 'supera',
    blurb: 'Treino extra: supino com pausa para ganhar força a sair do peito.',
    slots: [
      { id: 'C_pause', ex: 'bench_paused', mode: 'double', sets: 4, min: 3, max: 5, startPct: 0.73 },
      { id: 'C_incl', ex: 'incline_db', mode: 'double', sets: 3, min: 8, max: 12 },
      { id: 'C_pulldown', ex: 'pulldown', mode: 'double', sets: 3, min: 8, max: 12 },
      { id: 'C_curl', ex: 'curl', mode: 'double', sets: 3, min: 8, max: 12 },
      { id: 'C_rear', ex: 'rear_delt', mode: 'double', sets: 2, min: 12, max: 20 },
      { id: 'C_hang', ex: 'dead_hang', mode: 'hold', sets: 1, seconds: 60 },
    ],
  },
  E1: {
    label: 'Estádio 1', title: 'Muscle-up e força', place: 'estadio',
    blurb: 'Muscle-up primeiro, depois elevações com descida lenta e dips na barra. Sem pesos: vais a pé.',
    slots: [
      { id: 'E1_skill', mode: 'skill', focus: 'main' },
      { id: 'E1_pull', ex: 'pullup_slow', mode: 'reps', sets: 4, min: 5, max: 8 },
      { id: 'E1_sbd', ex: 'sbd', mode: 'reps', sets: 3, min: 6, max: 12 },
      { id: 'E1_hang', ex: 'dead_hang', mode: 'hold', sets: 1, seconds: 60 },
    ],
  },
  E2: {
    label: 'Estádio 2', title: 'Muscle-up e volume', place: 'estadio',
    blurb: 'Muscle-up primeiro, depois chest-to-bar e dips na barra.',
    slots: [
      { id: 'E2_skill', mode: 'skill', focus: 'main' },
      { id: 'E2_c2b', ex: 'c2b', mode: 'reps', sets: 3, min: 3, max: 6 },
      { id: 'E2_sbd', ex: 'sbd', mode: 'reps', sets: 3, min: 6, max: 12 },
      { id: 'E2_hang', ex: 'dead_hang', mode: 'hold', sets: 1, seconds: 60 },
    ],
  },
};

export const PLACE_DAYS = { supera: ['A', 'B', 'C'], estadio: ['E1', 'E2'] };
// Treinos base de cada sítio (alternam semana a semana). O C só entra como treino extra,
// quando o A e o B dessa semana já estão feitos.
export const CORE_DAYS = { supera: ['A', 'B'], estadio: ['E1', 'E2'] };
export const EXTRA_DAYS = ['C'];

// Motivos para um treino falhado (ficam guardados no histórico)
export const MISS_REASONS = [
  { value: 'trabalho', label: 'Trabalho' },
  { value: 'cansaco', label: 'Cansaço ou sono' },
  { value: 'doente', label: 'Doente' },
  { value: 'dor', label: 'Dor ou lesão' },
  { value: 'compromisso', label: 'Compromisso' },
  { value: 'tempo', label: 'Chuva ou frio' },
  { value: 'vontade', label: 'Sem vontade' },
  { value: 'outro', label: 'Outro' },
];

export const PAIN_SPOTS = [
  { value: 'pulso', label: 'Pulso' },
  { value: 'cotovelo', label: 'Cotovelo' },
  { value: 'ombro', label: 'Ombro' },
  { value: 'costas', label: 'Costas' },
  { value: 'outro', label: 'Outro' },
];

export const CONDITIONS = [
  { value: 'seco', label: 'Seco' },
  { value: 'molhado', label: 'Barra molhada' },
  { value: 'frio', label: 'Frio' },
  { value: 'calor', label: 'Calor' },
  { value: 'escuro', label: 'Pouca luz' },
  { value: 'cheio', label: 'Cheio de gente' },
];

// Horários segundo o Google (nov. 2026). Índice = dia da semana JS (0 = domingo).
export const PLACES = {
  supera: {
    name: 'Supera Telheiras', short: 'Supera',
    hours: { 0: ['9:00', '14:00'], 1: ['6:30', '22:00'], 2: ['6:30', '22:00'], 3: ['6:30', '22:00'], 4: ['6:30', '22:00'], 5: ['6:30', '22:00'], 6: ['9:00', '20:30'] },
  },
  estadio: {
    name: 'Estádio Universitário', short: 'Estádio', always: true,
  },
};

export const PLAN_TYPES = [
  { value: 'supera', label: 'Supera' },
  { value: 'estadio', label: 'Estádio' },
  { value: 'livre', label: 'Reposição (obrigatório só se faltaste)' },
  { value: 'corrida', label: 'Corrida' },
  { value: 'descanso', label: 'Descanso' },
];

export const APP_VERSION = '1.6.1';

export const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

// Fases do muscle-up. Cada fase define os exercícios do bloco de skill.
export const MU_STAGES = [
  {
    n: 1, name: 'Fundação',
    goal: '5 chest-to-bar seguidas, 8 straight bar dips e 3 negativas controladas.',
    main: [
      { ex: 'explosive_pull', sets: 5, min: 3, max: 3 },
      { ex: 'mu_negative', sets: 3, min: 2, max: 3 },
    ],
    secondary: [{ ex: 'explosive_pull', sets: 4, min: 3, max: 3 }],
    light: [{ ex: 'mu_low_bar', sets: 3, min: 5, max: 5 }],
  },
  {
    n: 2, name: 'Explosão e transição',
    goal: '3 elevações até à barriga e 3 muscle-ups com banda.',
    main: [
      { ex: 'waist_pull', sets: 5, min: 2, max: 3 },
      { ex: 'mu_band', sets: 4, min: 2, max: 3 },
    ],
    secondary: [{ ex: 'waist_pull', sets: 4, min: 2, max: 3 }],
    light: [{ ex: 'mu_negative', sets: 3, min: 2, max: 2 }],
  },
  {
    n: 3, name: 'Primeiras reps',
    goal: 'O primeiro muscle-up.',
    main: [
      { ex: 'muscle_up', sets: 6, min: 1, max: 1 },
      { ex: 'mu_band', sets: 2, min: 2, max: 3 },
    ],
    secondary: [
      { ex: 'waist_pull', sets: 3, min: 3, max: 3 },
      { ex: 'mu_negative', sets: 2, min: 2, max: 2 },
    ],
    light: [{ ex: 'mu_band', sets: 3, min: 2, max: 3 }],
  },
  {
    n: 4, name: 'Consolidar',
    goal: '3 e depois 5 muscle-ups seguidos.',
    main: [{ ex: 'muscle_up', sets: 5, min: 1, max: 3 }],
    secondary: [{ ex: 'muscle_up', sets: 3, min: 1, max: 2 }],
    light: [{ ex: 'muscle_up', sets: 3, min: 1, max: 1 }],
  },
];

// Marcos do muscle-up. Detetados automaticamente a partir dos registos.
export const MILESTONES = [
  { id: 'pull10', label: '10 elevações seguidas', ex: ['pullup', 'pullup_slow', 'weighted_pullup'], reps: 10, baseline: true },
  { id: 'c2b5', label: '5 chest-to-bar seguidas', ex: ['c2b', 'explosive_pull'], reps: 5 },
  { id: 'sbd8', label: '8 straight bar dips', ex: ['sbd'], reps: 8 },
  { id: 'neg3', label: '3 negativas controladas', ex: ['mu_negative'], reps: 3 },
  { id: 'waist3', label: '3 elevações até à barriga', ex: ['waist_pull'], reps: 3 },
  { id: 'band3', label: '3 muscle-ups com banda', ex: ['mu_band'], reps: 3 },
  { id: 'mu1', label: 'Primeiro muscle-up', ex: ['muscle_up'], reps: 1, goal: true },
  { id: 'mu3', label: '3 muscle-ups seguidos', ex: ['muscle_up'], reps: 3, bonus: true },
  { id: 'mu5', label: '5 muscle-ups seguidos', ex: ['muscle_up'], reps: 5, bonus: true },
];

// Discos olímpicos (cores IWF) — para a calculadora e para o desenho da barra
export const PLATE_STYLE = {
  25: { color: '#D7263D', h: 1.0, w: 13 },
  20: { color: '#2F6BD8', h: 1.0, w: 11 },
  15: { color: '#E9B10A', h: 0.9, w: 10 },
  10: { color: '#2E9C57', h: 0.8, w: 9 },
  5: { color: '#E9E9E9', h: 0.6, w: 7 },
  2.5: { color: '#C2333F', h: 0.46, w: 6 },
  2: { color: '#2F6BD8', h: 0.42, w: 6 },
  1.25: { color: '#9AA3AD', h: 0.38, w: 5 },
  1: { color: '#2E9C57', h: 0.34, w: 5 },
  0.5: { color: '#E9E9E9', h: 0.3, w: 4 },
};

// Stock de suplementos e comida: dose em gramas e doses por dia (para estimar quando acaba)
export const STOCK_KINDS = {
  whey: { label: 'Whey', servingG: 30, perDay: 1 },
  creatine: { label: 'Creatina', servingG: 3.67, perDay: 1 },
  oats: { label: 'Aveia instantânea', servingG: 45, perDay: 1 },
  pb: { label: 'Manteiga de amendoim', servingG: 15, perDay: 1 },
  other: { label: 'Outro', servingG: 0, perDay: 0 },
};

export const PURCHASE_CATEGORIES = { suplementos: 'Suplementos', comida: 'Comida', material: 'Material' };

export const ALL_PLATES = [25, 20, 15, 10, 5, 2.5, 2, 1.25, 1, 0.5];

export const DEFAULT_SETTINGS = {
  onboarded: false,
  daysPerWeek: 3,
  weekPlan: { 0: 'descanso', 1: 'supera', 2: 'estadio', 3: 'supera', 4: 'estadio', 5: 'descanso', 6: 'livre' },
  bar: 20,
  plates: [25, 20, 15, 10, 5, 2.5, 1.25],
  dbStep: 2,
  machineStep: 2.5,
  rest: { main: 180, secondary: 150, accessory: 90, skill: 120 },
  sound: true,
  vibrate: true,
  wakeLock: true,
  theme: 'auto',
  baseline: { date: null, bench: { w: 80, reps: 2, rpe: 10 }, pullups: 10, bw: 64 },
  muStage: null,
  deloadEvery: 6,
  bwGoal: 'gain',
  proteinPerKg: 1.8,
  wheyProtein: 21,
  budgetMonthly: 50,
  creatineNote: '1 medida por dia',
};

// Guia: texto curto e prático
export const GUIDE = [
  {
    id: 'plano',
    title: 'Como funciona o plano',
    body: `
<p>Há dois sítios. No <strong>Supera</strong> fazes o supino e o resto com máquinas e halteres. No <strong>Estádio Universitário</strong> fazes tudo o que precisa de barra: muscle-up, elevações e dips na barra reta. O plano semanal (que mudas em Mais → Definições) diz-te onde treinas em cada dia.</p>
<p><strong>A semana tem 4 treinos obrigatórios:</strong> Supera à segunda e à quarta, Estádio à terça e à quinta. Sexta e domingo são de descanso (à sexta há o grupo de jovens).</p>
<p><strong>O sábado depende da semana.</strong> Se fizeste os 4 treinos, é opcional: treinas se te apetecer, ou descansas. Se faltaste a algum, é obrigatório e a app diz-te onde ir (o sítio que ficou a faltar). Ao sábado o Supera abre das 9h às 20h30.</p>
<p><strong>Se faltares a um treino</strong>, não o perdes: a app segue sempre a ordem e retoma onde ficaste. Regista o motivo quando a app perguntar; fica no histórico. Se faltares a dois na mesma semana, o sábado repõe só um: nunca faças dois treinos no mesmo dia para compensar. Depois de uma pausa longa, a app baixa um pouco os pesos do supino.</p>
<p><strong>Ordem dos treinos.</strong> No Supera alternas o A (pesado) e o B (volume). O C (supino com pausa) é o treino extra: aparece quando já fizeste o A e o B nessa semana, por exemplo num sábado opcional. No Estádio alternas o 1 e o 2.</p>
<p><strong>Sábado opcional: onde?</strong> Enquanto não tiveres o primeiro muscle-up, a app sugere o Estádio (aprender uma técnica pede repetição frequente). Depois, sugere o Supera.</p>
<p><strong>Dias com pouco tempo:</strong> se só tiveres 20 minutos, vai ao Estádio fazer apenas o bloco de muscle-up. É melhor do que saltar o treino.</p>
<p><strong>Supera A, pesado.</strong> Uma série principal de supino de 3 reps a RPE 8 e depois 3 séries de 5, mais leves. As séries seguintes ajustam-se ao que fizeste na principal.</p>
<p><strong>Supera B, volume.</strong> 4 séries de 6 a 8 reps. Quando fizeres 8 reps em todas, a app sobe 2,5 kg.</p>
<p><strong>Supera C, força e técnica (extra).</strong> Supino com 2 segundos de pausa no peito, para ganhar força a sair do peito.</p>
<p>Todos os treinos acabam com 1 minuto de dead hang (pendurado na barra), para alongar e melhorar a pegada.</p>
<p><strong>Estádio 1 e 2.</strong> Só com o peso do corpo: como vais a pé, não levas pesos. A força vem de reps mais difíceis (descida lenta, depois elevações arqueiro) e não de peso extra. Começam sempre pelo muscle-up, enquanto estás fresco. Os exercícios mudam sozinhos à medida que cumpres os marcos. Se correres no mesmo dia, corre depois, nunca antes.</p>`,
  },
  {
    id: 'supino',
    title: 'Técnica de supino',
    body: `
<p>A técnica dá quilos sem precisares de ganhar força. Antes de tirar a barra: omoplatas juntas e puxadas para baixo, arco moderado na zona das costas (o rabo fica no banco) e pés bem firmes.</p>
<p>A pegada deve deixar os antebraços na vertical quando a barra está no peito. A barra desce em direção à parte de baixo do peito e sobe ligeiramente para trás, até ficar por cima dos ombros.</p>
<p>O <strong>leg drive</strong> é empurrar o chão com os pés durante a subida, sem levantar o rabo. Transmite força das pernas para o tronco.</p>
<p>Filma-te de lado de vez em quando. E monta sempre as barras de segurança ou pede a alguém que te ajude nas séries pesadas.</p>`,
  },
  {
    id: 'muscleup',
    title: 'Muscle-up na barra',
    body: `
<p>Com 10 elevações já tens força suficiente. O que falta é altura (puxar a barra até à barriga) e a transição (rodar os pulsos e passar os cotovelos por cima da barra).</p>
<p><strong>Pegada:</strong> um pouco mais fechada que nas elevações, com o pulso por cima da barra. Tirar o polegar de volta da barra ajuda alguns.</p>
<p><strong>Balanço:</strong> um balanço curto e controlado (kip) é legítimo para aprender. Corpo arqueado atrás, corpo "côncavo" à frente e puxa nesse momento.</p>
<p><strong>Direção:</strong> puxa a barra para as ancas, para trás e à volta, não em linha reta para cima. Quando a barra passar o peito, inclina o tronco à frente e passa os cotovelos por cima depressa.</p>
<p>Evita passar um braço de cada vez (chicken wing): carrega o ombro e o cotovelo de forma desigual. Se o cotovelo ou o ombro doerem, para e reduz o volume.</p>`,
  },
  {
    id: 'comida',
    title: 'Alimentação sem contar calorias',
    body: `
<p>O objetivo é comer um pouco mais do que gastas. Em vez de contar calorias, usas a balança como contador.</p>
<p><strong>Pesa-te 3 a 4 manhãs por semana</strong>, depois da casa de banho e antes de comer, e regista aqui. A app calcula a média de 7 dias, que é o número que interessa. O alvo é subir 0,1 a 0,25 kg por semana.</p>
<p>Se a média não subir durante duas semanas, acrescenta algo fixo ao teu dia: um copo de leite com uma banana, ou mais uma mão cheia de arroz ou massa ao almoço e ao jantar. Se subir muito depressa e a barriga crescer, tira um pouco.</p>
<p><strong>Proteína:</strong> cerca de 1,6 a 2,2 g por kg de peso. Na prática, 4 refeições com uma porção do tamanho da palma da mão (frango, peru, carne, peixe, atum, 3–4 ovos, skyr, queijo fresco), mais um batido de whey se faltar.</p>
<p><strong>Para ganhar peso sem liquidificadora:</strong> no shaker, 300 ml de leite, 1 medida de whey e 40 a 50 g de aveia instantânea (a aveia em pó dissolve-se no shaker). Com uma banana e uma colher de manteiga de amendoim à parte, dá cerca de 650 kcal.</p>
<p><strong>Treinar às 19h:</strong> entre o almoço e o fim do treino passam muitas horas. Come um lanche por volta das 17h, antes de saíres do trabalho: por exemplo uma sandes com fiambre ou queijo e um iogurte, ou uma banana com skyr. Depois do treino janta com uma boa porção de proteína; se o jantar for muito tarde, bebe o batido de whey logo a seguir ao treino.</p>
<p><strong>Se ficas sonolento depois de comer:</strong> em vez de duas refeições enormes, come mais vezes e em porções médias. Um almoço com menos arroz ou massa de uma vez, mais um lanche a meio da tarde, dá as mesmas calorias com menos sono. As calorias líquidas (o batido) pesam menos. Uma volta de 10 minutos a pé depois do almoço também ajuda.</p>
<p><strong>Um dia-tipo, sem contar calorias:</strong> pequeno-almoço sempre (aveia com leite e whey, ou skyr com fruta e pão com pasta de amendoim); almoço normal com uma palma de proteína; lanche às 17h (sandes e iogurte); jantar depois do treino com proteína e hidratos. Se quiseres, um iogurte ou um copo de leite antes de dormir.</p>
<p><strong>Dias de corrida:</strong> correr gasta muito. Conta com cerca de 1 kcal por kg de peso por km, ou seja, uns 640 kcal em 10 km. Nesses dias come claramente mais.</p>`,
  },
  {
    id: 'suplementos',
    title: 'Suplementos',
    body: `
<p><strong>Whey</strong> (proteína de soro de leite): conveniência, conta como comida. 1 a 2 doses por dia conforme o que já comes. Se o leite te cair mal, escolhe whey isolada.</p>
<p><strong>Creatina monohidratada</strong>: o suplemento com mais evidência para a força. 3 a 5 g por dia, todos os dias (também nos de descanso), a qualquer hora. Não precisas de fase de carga. Pode subir 1 a 2 kg na balança nas primeiras semanas: é água dentro do músculo, não gordura.</p>
<p><strong>Cafeína</strong> antes do treino: opcional.</p>
<p>Dispensáveis: BCAA, glutamina, "boosters" de testosterona e ganhadores de peso comerciais.</p>`,
  },
  {
    id: 'recuperar',
    title: 'Recuperação e deload',
    body: `
<p>Dormir 7 a 9 horas pesa tanto como o treino. É a dormir que recuperas e ficas mais forte.</p>
<p>Um <strong>deload</strong> é uma semana mais leve: menos séries e cerca de 10% menos peso, com a mesma técnica. A app sugere um a cada 6 semanas, ou mais cedo se o teu supino estagnar. Depois do deload costumas voltar mais forte.</p>
<p>Corrida: compatível com o plano, mas evita correr forte na véspera do dia A e, se a balança não subir, reduz primeiro a corrida.</p>`,
  },
  {
    id: 'glossario',
    title: 'Glossário',
    body: `
<dl class="gloss">
<dt>1RM</dt><dd>O máximo que levantas numa única repetição.</dd>
<dt>1RM estimado</dt><dd>O teu 1RM calculado a partir de uma série com mais reps, sem teres de o testar. Por exemplo, 80 kg × 2 a esforço máximo dá cerca de 84 kg.</dd>
<dt>RPE</dt><dd>Escala de esforço de 1 a 10. RPE 10 é falha total; RPE 8 quer dizer que ainda conseguias fazer mais 2 reps; RPE 7, mais 3.</dd>
<dt>RIR</dt><dd>Reps in reserve: quantas reps ficavam por fazer. RIR 2 é o mesmo que RPE 8.</dd>
<dt>Série principal</dt><dd>A série mais pesada do dia (em inglês, top set).</dd>
<dt>Back-off</dt><dd>Séries mais leves feitas depois da série principal.</dd>
<dt>Progressão dupla</dt><dd>Primeiro aumentas as reps dentro de uma gama; quando chegas ao topo em todas as séries, sobes o peso e voltas ao fundo da gama.</dd>
<dt>Deload</dt><dd>Semana mais leve para recuperar.</dd>
<dt>Chest-to-bar</dt><dd>Elevação em que o peito toca na barra.</dd>
<dt>Straight bar dips</dt><dd>Fundos feitos em cima de uma barra reta; é a parte de cima do muscle-up.</dd>
<dt>Negativa</dt><dd>Fazer só a descida de um exercício, devagar.</dd>
<dt>Kip</dt><dd>Balanço do corpo para ganhar impulso nas elevações e no muscle-up.</dd>
<dt>Face pull</dt><dd>Puxar uma corda na polia em direção à cara; trabalha a parte de trás do ombro.</dd>
<dt>Leg drive</dt><dd>Empurrar o chão com os pés durante o supino.</dd>
<dt>Excedente calórico</dt><dd>Comer mais energia do que gastas, o que é necessário para ganhar peso.</dd>
</dl>`,
  },
];
