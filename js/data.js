// Biblioteca de exercícios, programa, fases do muscle-up e conteúdo do guia

// kind: barbell | dumbbell | machine | weighted_bw (peso extra, pode ser 0) | bodyweight | band
// tier: main | secondary | accessory | skill  (define o descanso por defeito)
export const EX = {
  bench: {
    name: 'Bench press', kind: 'barbell', tier: 'main', group: 'peito',
    cues: [
      'Omoplatas juntas e para baixo antes de tirar a barra.',
      'Pés firmes, com os calcanhares sempre no chão: leva-os para trás só até onde os calcanhares ainda assentam (mais ou menos debaixo dos joelhos).',
      'Leg drive: empurra o chão para trás, como se quisesses deslizar no banco em direção à cabeça. O rabo fica no banco.',
      'Antebraços na vertical em baixo; a barra toca na parte de baixo do peito.',
      'Pulso direito, com a barra na base da palma e não nos dedos. Nas séries pesadas usa as fitas de pulso.',
      'Desce controlado, sobe com intenção. Sem barras de segurança no Supera: nunca até à falha, deixa sempre 1 a 2 reps de reserva.',
    ],
  },
  bench_paused: {
    name: 'Paused bench press', kind: 'barbell', tier: 'main', group: 'peito',
    note: 'pausa de 2 s com a barra parada no peito',
    cues: [
      'A barra fica completamente parada no peito durante 2 segundos.',
      'Mantém a tensão nas costas durante a pausa: não "afundes" no banco.',
      'Constrói força a sair do peito, que é onde o 100 kg costuma falhar.',
    ],
  },
  bench_close: {
    name: 'Close-grip bench press', kind: 'barbell', tier: 'secondary', group: 'tríceps',
    note: 'mãos à largura dos ombros',
    cues: ['Mãos à largura dos ombros, cotovelos mais junto ao corpo.', 'Reforça o tríceps para o bloqueio final do supino.'],
  },
  incline_db: {
    name: 'Incline dumbbell press', kind: 'dumbbell', tier: 'accessory', group: 'peito',
    note: 'peso de cada halter',
    cues: ['Banco a 30°.', 'Desce até sentires alongamento no peito; sobe sem bater os halteres.'],
  },
  ohp_db: {
    name: 'Dumbbell shoulder press', kind: 'dumbbell', tier: 'accessory', group: 'ombros',
    note: 'peso de cada halter',
    cues: ['Sentado ou de pé, abdominais contraídos.', 'Sobe até aos braços quase estendidos, sem arquear a lombar.'],
  },
  weighted_pullup: {
    name: 'Weighted pull-ups', kind: 'weighted_bw', tier: 'secondary', group: 'costas',
    note: 'regista só o peso extra: 0 sem peso; depois cinto de lastro ou mochila com peso',
    cues: ['Começa com os braços estendidos e omoplatas ativas.', 'Queixo acima da barra em todas as reps; nada de meias reps.'],
  },
  pullup_slow: {
    name: 'Slow eccentric pull-ups', kind: 'bodyweight', tier: 'secondary', group: 'costas', alts: ['archer_pull', 'pullup'],
    note: 'só o peso do corpo; 3 segundos a descer',
    cues: ['Mesma forma das pull-ups: braços esticados em baixo, ombros puxados para baixo antes de subir, corpo firme sem balanço. Cotovelos a descer junto ao corpo até ao lado das costelas, não abertos como asas.', 'Sobe normal, queixo acima da barra.', 'Desce devagar, a contar "mil e um, mil e dois, mil e três", até os braços ficarem totalmente esticados.', 'Esforço: RPE 8, contado pela subida. A descida lenta é fácil, por isso não te guies por ela: para quando a subida já estiver lenta e só conseguirias mais 1 ou 2 pull-ups. Se assim só saírem 3 ou 4 reps, está certo.', 'Nunca subas até já não conseguires mais nenhuma: cansa demasiado para o resto do treino e carrega os cotovelos.', 'Quando fizeres 8 reps em todas as séries, passa para archer pull-ups (troca o exercício).', 'Pernas sempre juntas.', 'Olha em frente e leva o peito à barra: não estiques o pescoço nem inclines a cabeça para trás para o queixo passar.'],
  },
  archer_pull: {
    name: 'Archer pull-ups', kind: 'bodyweight', tier: 'secondary', group: 'costas', alts: ['pullup_slow', 'pullup'],
    note: 'reps por cada lado',
    cues: ['Pega larga. Puxa para um lado, com o outro braço quase esticado a ajudar.', 'Alterna os lados; regista as reps de cada lado.', 'Dá força de um braço sem precisares de pesos.', 'Pernas sempre juntas.', 'Olha em frente e leva o peito à barra: não estiques o pescoço nem inclines a cabeça para trás para o queixo passar.'],
  },
  pullup: {
    name: 'Pull-ups', kind: 'bodyweight', tier: 'secondary', group: 'costas',
    cues: [
      'Pegada por cima (palmas para a frente), um pouco mais aberta que os ombros, polegar à volta da barra.',
      'Começa pendurado com os braços totalmente esticados. Antes de puxar, puxa os ombros para baixo e para trás, sem dobrar os braços.',
      'Puxa os cotovelos para baixo, em direção às costelas, até o queixo passar a barra. Peito para a frente, olhar para a barra.',
      'Cotovelos: nas pull-ups normais não precisam de apontar para trás. Descem junto ao corpo, a apontar para o chão e um pouco para fora, e acabam ao lado das costelas. O que não pode acontecer é ficarem abertos para os lados à altura dos ombros, como asas. Cotovelos para trás é nas explosive pull-ups, nas chest-to-bar e no muscle-up (no fim da subida) e nos dips (no fundo).',
      'Pernas juntas e corpo firme, ligeiramente "côncavo" (abdominais apertados): nada de pontapés nem balanço.',
      'Desce controlado até aos braços totalmente esticados. Só conta a rep se o queixo passar a barra e voltares a esticar os braços.',
      'Olha em frente e leva o peito à barra: não estiques o pescoço nem inclines a cabeça para trás para o queixo passar.',
    ],
  },
  c2b: {
    name: 'Chest-to-bar pull-ups', kind: 'bodyweight', tier: 'skill', group: 'costas',
    note: 'o peito toca na barra',
    cues: ['Puxa os cotovelos para baixo e para trás, até junto às costelas.', 'O peito (não o queixo) tem de tocar na barra.', 'Cada rep explosiva e a puxar sem parar até o peito tocar; para quando deixar de tocar.', 'Pernas sempre juntas e um pouco à frente: corpo direito e ligeiramente inclinado para trás, nunca na vertical. A inclinação aumenta ao subir.', 'Olha em frente e leva o peito à barra: não estiques o pescoço nem inclines a cabeça para trás para o queixo passar.'],
  },
  explosive_pull: {
    name: 'Explosive pull-ups', kind: 'bodyweight', tier: 'skill', group: 'costas',
    note: 'o mais alto possível, peito à barra',
    cues: [
      'Começa parado, pendurado com os braços esticados e os ombros já puxados para baixo. Agarra e arranca em 1 a 2 segundos: não fiques pendurado à espera. Sem balanço para "ganhar embalo".',
      'Puxa o mais depressa e com o máximo de força que conseguires, desde baixo: a ideia é a barra chegar ao peito ou mais abaixo.',
      'Puxa os cotovelos para baixo e para trás até ficarem junto às costelas (não abertos para os lados à altura dos ombros) e leva o peito à barra, inclinando ligeiramente o tronco para trás no topo.',
      'Puxa sem parar até ao topo: o arranque sozinho não te leva lá acima. Continua a puxar, com os cotovelos a descer até às costelas, até o peito chegar à barra. O corpo ainda deve ir a subir quando o queixo passa a barra.',
      'Corpo direito e firme, nunca na vertical: pernas juntas e um pouco à frente (corpo ligeiramente "côncavo"), o que já o inclina um pouco para trás. À medida que sobes, a inclinação aumenta, para o peito ir à barra. A inclinação vem de levar os cotovelos para trás, não de dobrar as costas nem de atirar a cabeça para trás.',
      'Desce controlado até aos braços esticados, para um segundo e faz a rep seguinte do zero.',
      'Poucas reps e todas rápidas: se uma rep sair lenta ou mais baixa, a série acabou. Descansa 2 a 3 minutos entre séries.',
      'A forma acerta-se antes: nas pull-ups do aquecimento (normais e controladas) e nas australian pull-ups. Aqui todas as reps são explosivas, desde a primeira: reps normais antes, na mesma série, gastavam a força e as explosivas saíam mais baixas.',
      'Olha em frente e leva o peito à barra: não estiques o pescoço nem inclines a cabeça para trás para o queixo passar.',
    ],
  },
  waist_pull: {
    name: 'High pull-ups (bar to waist)', kind: 'bodyweight', tier: 'skill', group: 'costas',
    note: 'a barra chega à zona do umbigo',
    cues: ['Pequeno balanço controlado (kip) é permitido.', 'Puxa a barra em direção às ancas, inclinando o tronco para trás.', 'É esta altura que cria espaço para passares por cima da barra.', 'Pernas sempre juntas.'],
  },
  sbd: {
    name: 'Straight bar dips', kind: 'bodyweight', tier: 'secondary', group: 'tríceps',
    note: 'fundos em cima da barra reta, só com o peso do corpo',
    cues: [
      'Pegada um pouco mais aberta que a largura dos ombros, com as mãos por cima da barra.',
      'Ombros para baixo e rodados para fora: afasta-os das orelhas e aponta a dobra dos cotovelos para a frente. Mantém-nos assim a série toda, porque é isto que protege o ombro.',
      'Antebraços sempre na vertical (perpendiculares ao chão): ao descer, os cotovelos vão para trás, não para os lados.',
      'Inclina o tronco ligeiramente à frente e desce até o peito tocar na barra.',
      'Sobe até os braços ficarem totalmente esticados, com os cotovelos trancados em cima.',
      'Pernas sempre juntas e corpo firme, sem balançar.',
      'É a parte de cima do muscle-up.',
    ],
  },
  dips: {
    name: 'Parallel bar dips', kind: 'weighted_bw', tier: 'secondary', group: 'tríceps',
    note: 'peso extra se houver',
    cues: ['Desce até os ombros ficarem ao nível dos cotovelos.', 'Sem dor no ombro: se doer, encurta a amplitude.', 'Pernas sempre juntas.'],
  },
  mu_negative: {
    name: 'Muscle-up negatives', kind: 'bodyweight', tier: 'skill', group: 'skill',
    note: 'começa por cima da barra e desce em 4–5 s',
    cues: ['Agarra em pegada falsa (pulso por cima da barra) antes de começares; se o pulso doer, usa a pegada normal ou a meia pegada falsa.', 'Sobe para cima da barra com um salto (ou com um apoio), não a puxar: guarda a força dos braços para as pull-ups.', 'Em cima, estabiliza 1 segundo com os braços esticados e começa logo a descer. Ficar 3 ou 4 segundos lá em cima cansa os tríceps antes da parte que interessa.',
      'Desce devagar, em 4 a 5 segundos no total, a contar "mil e um, mil e dois…": cerca de 2 s até o peito chegar à barra (como num dip), 1 a 2 s na transição e o resto até aos braços esticados. Se a descida for fácil, podes descer mais devagar (até 8 s).',
      'A transição é a parte mais importante, porque é aí que o muscle-up costuma falhar: o peito passa de cima para baixo da barra com os cotovelos dobrados e junto ao corpo e o peito colado à barra. Se não a consegues travar e o corpo cai, usa as pontas dos pés no chão (numa barra baixa) para ajudar. Tira a ajuda aos poucos.',
      'Na transição é normal sentir que se vai cair: é o ponto mais fraco do movimento, porque os músculos do dip (peito e tríceps) deixam de conseguir segurar e os da pull-up (costas e bíceps) ainda não estão em posição de travar. Mantém a barra colada ao corpo e roda o tronco para trás à volta da barra, em vez de cair a direito: quanto mais longe da barra, mais pesado fica.',
      'Cotovelos junto ao corpo: no fundo do dip apontam para trás, não para os lados, e os braços roçam nas costelas, como se segurasses uma folha de papel debaixo de cada braço. Na transição continuam a roçar no corpo enquanto rodam de trás para a frente. Mãos à largura dos ombros: com a pegada mais aberta os cotovelos fogem para os lados.',
      'Para aprender a travar: negativas com 2 pausas, 2 s com o peito na barra por cima (fundo do dip) e 2 s com o peito na barra por baixo (topo da pull-up). Na primeira pausa, confirma que os cotovelos apontam para trás antes de passares para baixo. A transição é o caminho entre as duas, feito devagar e com a ajuda dos pés se for preciso.',
      'A pegada falsa torna a transição mais fácil de controlar, porque o pulso já está por cima da barra e não tem de rodar. Usa-a quando o pulso deixar.',
'No fim, trava até aos braços esticados. Não caias: o esticão faz mal aos cotovelos e aos ombros.', 'Sente onde os pulsos rodam por cima da barra.', 'Faz só as reps marcadas, mesmo que a descida esteja fácil: aqui o limite são os cotovelos e os pulsos, não a força. Se doerem, para.', 'RPE: escreve 10 se não conseguiste travar a descida e o corpo caiu na transição. Só as séries com RPE 9 ou menos contam como controladas para o marco.'],
  },
  mu_band: {
    name: 'Band-assisted muscle-ups', kind: 'band', tier: 'skill', group: 'skill',
    note: 'banda presa na barra, sob os joelhos ou pés',
    cues: ['Pegada falsa: pulso por cima da barra desde o início.', 'Usa a banda mais leve que te deixe fazer reps limpas.', 'Puxa para trás e à volta da barra, não na vertical.', 'Passa os cotovelos por cima depressa.'],
  },
  australian_pull: {
    name: 'Australian pull-ups explosivas', kind: 'bodyweight', tier: 'secondary', group: 'costas',
    note: 'barra baixa, corpo por baixo dela, calcanhares no chão, pegada falsa se o pulso deixar',
    cues: [
      'Numa barra baixa (à altura da cintura ou do peito), põe-te por baixo dela e agarra com as mãos à largura dos ombros. Calcanhares no chão e corpo direito como uma prancha, das orelhas aos calcanhares.',
      'Pegada falsa (pulso por cima da barra), se o pulso não doeu no false grip hang do início do treino. Com os pés no chão a barra só leva parte do peso, por isso é a forma mais fácil de treinar a pegada falsa a mexer. Se o pulso doer, usa a meia pegada falsa (mão rodada por cima da barra, sem dobrar o pulso todo) ou a pegada normal.',
      'Cada série começa com 2 reps normais e controladas, para acertar a forma (corpo direito, cotovelos até às costelas, peito à barra). Logo a seguir, sem parar, 5 reps explosivas.',
      'Nas explosivas, sobe o mais depressa que conseguires: cotovelos para baixo e para trás até às costelas, e o peito (a parte de baixo) toca na barra.',
      'Puxa sem parar até o peito tocar. É o mesmo gesto que falta nas explosive pull-ups, mas com menos peso, para o aprenderes rápido.',
      'Desce controlado, em cerca de 1 s, até aos braços esticados.',
      'A anca não desce nem sobe: corpo sempre direito e pernas juntas.',
      'Se uma rep explosiva sair lenta, se o peito não tocar ou se a pegada falsa escorregar para os dedos, a série acabou. Se as 5 explosivas saírem fáceis, põe os pés mais à frente (corpo mais deitado).',
    ],
  },
  mu_low_bar: {
    name: 'Low bar transitions', kind: 'bodyweight', tier: 'skill', group: 'skill',
    note: 'barra à altura do peito, pés no chão',
    cues: ['Pegada falsa: pulso por cima da barra.', 'Usa as pernas para ajudar e foca-te só na rotação dos pulsos e cotovelos por cima da barra.'],
  },
  false_grip_hang: {
    name: 'False grip hang', kind: 'hold', tier: 'skill', group: 'pegada',
    note: 'pendurado em pegada falsa: pulso por cima da barra',
    cues: [
      'Põe a base da palma (a parte junto ao pulso) em cima da barra, com o pulso dobrado e os nós dos dedos virados para a frente.',
      'Agarra com força e pendura-te com os braços esticados e os ombros puxados um pouco para baixo.',
      'Se a pegada escorregar para os dedos, não é pegada falsa: para e volta a agarrar.',
      'Se ainda não consegues manter a pegada pendurado, começa numa barra baixa com os pés no chão (só parte do peso) ou usa a meia pegada falsa: mão rodada por cima da barra, sem dobrar o pulso todo.',
      'Começa com séries curtas. Se o pulso doer (ou a dor do bench press voltar), para por hoje.',
    ],
  },
  hanging_leg_raise: {
    name: 'Hanging leg raises', kind: 'bodyweight', tier: 'accessory', group: 'abdominais', alts: ['toes_to_bar'],
    note: 'pendurado, pernas esticadas até 90°, a formar um L',
    cues: [
      'Pendura-te com os braços esticados e os ombros "ligados": puxa-os um pouco para baixo, sem dobrar os braços.',
      'Sobe as pernas juntas e esticadas até à altura da anca (90°), pausa 1 s e desce em 2 s.',
      'Sem balançar: se o corpo começar a balançar, para um segundo entre reps.',
      'Deita o ar fora ao subir. Se ainda não chegas aos 90° com as pernas esticadas, dobra os joelhos.',
    ],
  },
  toes_to_bar: {
    name: 'Toes-to-bar', kind: 'bodyweight', tier: 'accessory', group: 'abdominais', alts: ['hanging_leg_raise'],
    note: 'pendurado, levar os pés até à barra',
    cues: [
      'Começa pendurado com os ombros "ligados" e o corpo parado.',
      'Ao subir as pernas, empurra a barra para baixo com os braços esticados: ajuda a chegar lá acima.',
      'Toca na barra com os pés, com as pernas o mais esticadas possível, e desce controlado.',
      'Se ainda não chegas, faz knees-to-elbows (joelhos aos cotovelos) e vai esticando as pernas.',
      'É o mesmo controlo do corpo que segura o balanço do muscle-up.',
    ],
  },
  dead_hang: {
    name: 'Dead hang', kind: 'hold', tier: 'accessory', group: 'pegada',
    note: 'pendurado na barra, braços estendidos',
    cues: ['Pendura-te com os braços totalmente estendidos e os ombros relaxados.', 'Respira devagar e deixa as costas e os ombros alongar.', 'Serve para alongar no fim do treino e para a pegada aguentar mais tempo na barra.'],
  },
  muscle_up: {
    name: 'Muscle-up', kind: 'bodyweight', tier: 'skill', group: 'skill',
    cues: [
      'Pegada falsa ou meia pegada falsa: um pouco mais fechada que nos pull-ups, pulso por cima da barra.',
      'Balanço curto e controlado: corpo arqueado atrás, corpo "côncavo" à frente.',
      'Puxa a barra para as ancas e passa os cotovelos por cima depressa.',
      'Evita passar um braço de cada vez (chicken wing).',
      'Aquece os pulsos antes (rodar os pulsos e apoiar o peso nas palmas). Se o pulso doer, para por hoje.',
    ],
  },
  row: {
    name: 'Seated cable row', kind: 'machine', tier: 'accessory', group: 'costas',
    alts: ['row_db', 'row_chest'],
    cues: ['Peito para fora, puxa os cotovelos para trás.', 'Pausa curta com as omoplatas juntas.'],
  },
  row_db: { name: 'One-arm dumbbell row', kind: 'dumbbell', tier: 'accessory', group: 'costas', alts: ['row', 'row_chest'], cues: ['Apoio num banco, costas direitas.', 'Puxa o cotovelo em direção à anca.'] },
  row_chest: { name: 'Chest-supported row', kind: 'machine', tier: 'accessory', group: 'costas', alts: ['row', 'row_db'], cues: ['Peito encostado ao apoio; não balances.'] },
  pulldown: { name: 'Lat pulldown', kind: 'machine', tier: 'accessory', group: 'costas', alts: ['pullup', 'row'], cues: ['Puxa a barra até ao peito, cotovelos para baixo.', 'Controla a subida.'] },
  face_pull: {
    name: 'Face pulls', kind: 'machine', tier: 'accessory', group: 'ombros', note: 'corda puxada à altura dos olhos', alts: ['rear_delt'],
    cues: [
      'Polia à altura dos olhos ou um pouco acima. Puxa a corda em direção aos olhos.',
      'Agarra a corda com os polegares virados para ti logo desde o início.',
      'Cotovelos altos, à altura dos ombros ou acima.',
      'No fim, os polegares apontam para trás e as mãos ficam ao lado das orelhas (como a pose de mostrar os bíceps). Pausa de 1 segundo.',
      'Se a corda for curta e as mãos não se conseguirem afastar, prende duas cordas no mesmo mosquetão, uma para cada mão.',
      'Na volta, os cotovelos é que se mexem primeiro: junta-os ao centro, à frente da cara, e só depois estica os braços. Volta devagar.',
      'Escolhe o peso que te deixa fazer todas as reps com o tronco parado e a pausa no fim. Se precisas de dar balanço ou inclinar para trás, baixa o peso. A progressão é a de sempre: primeiro mais reps (até 20), depois mais peso.',
    ],
  },
  lateral_raise: {
    name: 'Dumbbell lateral raises', kind: 'dumbbell', tier: 'accessory', group: 'ombros', note: 'peso de cada halter', alts: ['lateral_cable', 'lateral_machine'],
    cues: ['É o exercício que mais alarga os ombros (trabalha a parte lateral do deltoide).', 'Peso leve, sem balançar: sobe até à altura dos ombros, cotovelos ligeiramente fletidos, e desce devagar.', 'Leva as séries quase até à falha (1 a 2 reps de reserva).'],
  },
  lateral_cable: {
    name: 'Cable lateral raises', kind: 'machine', tier: 'accessory', group: 'ombros', note: 'polia baixa, um braço de cada vez', alts: ['lateral_raise', 'lateral_machine'],
    cues: ['Polia em baixo, cabo a passar à frente do corpo.', 'A polia mantém o músculo em tensão em todo o movimento.', 'Faz as séries de um braço e depois do outro.'],
  },
  lateral_machine: {
    name: 'Machine lateral raises', kind: 'machine', tier: 'accessory', group: 'ombros', note: 'há esta máquina no Supera', alts: ['lateral_raise', 'lateral_cable'],
    cues: ['Ajusta o banco para os ombros ficarem alinhados com o eixo da máquina.', 'Sobe até à altura dos ombros, sem encolher os ombros, e desce devagar.', 'É a versão principal no plano: estável e fácil de progredir. Para variar, troca para halteres (o treino C já usa halteres).'],
  },
  rear_delt: { name: 'Rear delt flyes', kind: 'machine', tier: 'accessory', group: 'ombros', alts: ['face_pull'], cues: ['Máquina ou halteres; braços quase estendidos, abre para trás.'] },
  triceps_pushdown: { name: 'Triceps pushdown', kind: 'machine', tier: 'accessory', group: 'tríceps', alts: ['triceps_overhead'], cues: ['Cotovelos colados ao corpo; estende até ao fim.'] },
  triceps_overhead: { name: 'Overhead triceps extension', kind: 'machine', tier: 'accessory', group: 'tríceps', alts: ['triceps_pushdown'], cues: ['Cabo ou halter; alongamento total atrás da cabeça.'] },
  curl: { name: 'Dumbbell curls', kind: 'dumbbell', tier: 'accessory', group: 'bíceps', note: 'peso de cada halter', alts: ['hammer_curl'], cues: ['Sem balançar o tronco; desce até ao fim.'] },
  hammer_curl: { name: 'Hammer curls', kind: 'dumbbell', tier: 'accessory', group: 'bíceps', note: 'peso de cada halter', alts: ['curl'], cues: ['Palmas viradas uma para a outra.'] },
};

export const BAND_LEVELS = ['forte', 'média', 'leve'];

// Programa. mode: top_backoff | double | reps | skill
// place: supera (supino e máquinas) | estadio (barras: muscle-up, elevações, dips)
export const DAYS = {
  A: {
    label: 'Supera A', title: 'Pesado', place: 'supera',
    blurb: 'Série pesada de bench press, costas e ombros.',
    slots: [
      { id: 'A_bench', ex: 'bench', mode: 'top_backoff', topReps: 3, topRPE: 8, backSets: 3, backReps: 5, backRPE: 7 },
      { id: 'A_row', ex: 'row', mode: 'double', sets: 4, min: 6, max: 10 },
      { id: 'A_pulldown', ex: 'pulldown', mode: 'double', sets: 3, min: 8, max: 12 },
      { id: 'A_lat', ex: 'lateral_machine', mode: 'double', sets: 3, min: 12, max: 20 },
      { id: 'A_face', ex: 'face_pull', mode: 'double', sets: 3, min: 12, max: 20 },
      { id: 'A_hang', ex: 'dead_hang', mode: 'hold', sets: 1, seconds: 60 },
    ],
  },
  B: {
    label: 'Supera B', title: 'Volume', place: 'supera',
    blurb: 'Mais reps no bench press para construir músculo.',
    slots: [
      { id: 'B_bench', ex: 'bench', mode: 'double', sets: 4, min: 6, max: 8, startPct: 0.76 },
      { id: 'B_dips', ex: 'dips', mode: 'double', sets: 3, min: 6, max: 12, startAdded: 0 },
      { id: 'B_rowdb', ex: 'row_db', mode: 'double', sets: 3, min: 8, max: 12 },
      { id: 'B_lat', ex: 'lateral_machine', mode: 'double', sets: 4, min: 12, max: 20 },
      { id: 'B_tri', ex: 'triceps_pushdown', mode: 'double', sets: 3, min: 10, max: 15 },
      { id: 'B_hang', ex: 'dead_hang', mode: 'hold', sets: 1, seconds: 60 },
    ],
  },
  C: {
    label: 'Supera C', title: 'Força e técnica', place: 'supera',
    blurb: 'Treino extra: paused bench press para ganhar força a sair do peito.',
    slots: [
      { id: 'C_pause', ex: 'bench_paused', mode: 'double', sets: 4, min: 3, max: 5, startPct: 0.73 },
      { id: 'C_incl', ex: 'incline_db', mode: 'double', sets: 3, min: 8, max: 12 },
      { id: 'C_pulldown', ex: 'pulldown', mode: 'double', sets: 3, min: 8, max: 12 },
      { id: 'C_lat', ex: 'lateral_raise', mode: 'double', sets: 3, min: 12, max: 20 },
      { id: 'C_rear', ex: 'rear_delt', mode: 'double', sets: 3, min: 12, max: 20 },
      { id: 'C_curl', ex: 'curl', mode: 'double', sets: 3, min: 8, max: 12 },
      { id: 'C_hang', ex: 'dead_hang', mode: 'hold', sets: 1, seconds: 60 },
    ],
  },
  E1: {
    label: 'Estádio 1', title: 'Muscle-up e força', place: 'estadio',
    blurb: 'Muscle-up primeiro, depois slow eccentric pull-ups, straight bar dips e hanging leg raises. Sem pesos: vais a pé.',
    slots: [
      { id: 'E1_fg', ex: 'false_grip_hang', mode: 'hold', sets: 2, seconds: 10, progress: { max: 30, step: 5 }, note: 'Faz isto depois de aquecer, antes do muscle-up. Usa a mesma pegada no resto do bloco de muscle-up.' },
      { id: 'E1_aus', ex: 'australian_pull', mode: 'reps', sets: 2, min: 7, max: 7, note: 'Antes das explosive pull-ups, para treinar a explosão com menos peso. Cada série: 2 reps normais para acertar a forma e logo a seguir 5 explosivas, peito à barra (escreve 7). Com pegada falsa, se o pulso deixar. Descansa 1 minuto entre as séries.' },
      { id: 'E1_skill', mode: 'skill', focus: 'main' },
      { id: 'E1_pull', ex: 'pullup_slow', mode: 'reps', sets: 3, min: 5, max: 8 },
      { id: 'E1_sbd', ex: 'sbd', mode: 'reps', sets: 3, min: 6, max: 12 },
      { id: 'E1_legs', ex: 'hanging_leg_raise', mode: 'reps', sets: 3, min: 8, max: 12 },
      { id: 'E1_hang', ex: 'dead_hang', mode: 'hold', sets: 1, seconds: 60 },
    ],
  },
  E2: {
    label: 'Estádio 2', title: 'Muscle-up e volume', place: 'estadio',
    blurb: 'Muscle-up primeiro, depois chest-to-bar pull-ups, straight bar dips e toes-to-bar.',
    slots: [
      { id: 'E2_fg', ex: 'false_grip_hang', mode: 'hold', sets: 2, seconds: 10, progress: { max: 30, step: 5 }, note: 'Faz isto depois de aquecer, antes do muscle-up. Usa a mesma pegada no resto do bloco de muscle-up.' },
      { id: 'E2_aus', ex: 'australian_pull', mode: 'reps', sets: 2, min: 7, max: 7, note: 'Antes das explosive pull-ups, para treinar a explosão com menos peso. Cada série: 2 reps normais para acertar a forma e logo a seguir 5 explosivas, peito à barra (escreve 7). Com pegada falsa, se o pulso deixar. Descansa 1 minuto entre as séries.' },
      { id: 'E2_skill', mode: 'skill', focus: 'main' },
      { id: 'E2_c2b', ex: 'c2b', mode: 'reps', sets: 3, min: 3, max: 6 },
      { id: 'E2_sbd', ex: 'sbd', mode: 'reps', sets: 3, min: 6, max: 12 },
      { id: 'E2_t2b', ex: 'toes_to_bar', mode: 'reps', sets: 3, min: 5, max: 10 },
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

// Horários do Supera segundo o site (centrosupera.pt, nov. 2026). Índice = dia da semana JS (0 = domingo).
export const PLACES = {
  supera: {
    name: 'Supera Telheiras', short: 'Supera',
    hours: { 0: ['9:00', '14:00'], 1: ['6:30', '22:00'], 2: ['6:30', '22:00'], 3: ['6:30', '22:00'], 4: ['6:30', '22:00'], 5: ['6:30', '22:00'], 6: ['9:00', '20:30'] },
    holidaysAsSunday: true, // feriados: horário de domingo (site do Supera)
  },
  estadio: {
    name: 'Estádio Universitário', short: 'Estádio', always: true,
  },
};

export const PLAN_TYPES = [
  { value: 'supera', label: 'Supera' },
  { value: 'estadio', label: 'Estádio' },
  { value: 'livre', label: 'Reposição (obrigatório só se faltaste)' },
  { value: 'repor', label: 'Reposição opcional (só se faltaste; senão descanso)' },
  { value: 'corrida', label: 'Corrida' },
  { value: 'descanso', label: 'Descanso' },
];

export const APP_VERSION = '1.26.1';

export const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

// Fases do muscle-up. Cada fase define os exercícios do bloco de skill.
export const MU_STAGES = [
  {
    n: 1, name: 'Fundação',
    goal: '5 chest-to-bar seguidos, 8 straight bar dips e 3 muscle-up negatives controladas.',
    main: [
      { ex: 'explosive_pull', sets: 5, min: 3, max: 3 },
      { ex: 'mu_negative', sets: 3, min: 2, max: 3 },
    ],
    secondary: [{ ex: 'explosive_pull', sets: 4, min: 3, max: 3 }],
    light: [{ ex: 'mu_low_bar', sets: 3, min: 5, max: 5 }],
  },
  {
    n: 2, name: 'Explosão e transição',
    goal: '3 high pull-ups até à barriga e 3 band-assisted muscle-ups.',
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
  { id: 'pull10', label: '10 pull-ups seguidos', ex: ['pullup', 'pullup_slow', 'weighted_pullup'], reps: 10, baseline: true },
  { id: 'c2b5', label: '5 chest-to-bar seguidos', ex: ['c2b', 'explosive_pull'], reps: 5 },
  { id: 'sbd8', label: '8 straight bar dips', ex: ['sbd'], reps: 8 },
  { id: 'neg3', label: '3 muscle-up negatives controladas', ex: ['mu_negative'], reps: 3, maxRpe: 9 },
  { id: 'waist3', label: '3 high pull-ups até à barriga', ex: ['waist_pull'], reps: 3 },
  { id: 'band3', label: '3 band-assisted muscle-ups', ex: ['mu_band'], reps: 3 },
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

// Refeições do dia (registo da proteína e guia de refeições)
export const MEAL_SLOTS = [
  { id: 'pa', name: 'Pequeno-almoço', short: 'Pequeno-almoço' },
  { id: 'almoco', name: 'Almoço', short: 'Almoço' },
  { id: 'lanche', name: 'Lanche', short: 'Lanche' },
  { id: 'jantar', name: 'Jantar', short: 'Jantar' },
];

export const PURCHASE_CATEGORIES = { comida: 'Comida', suplementos: 'Suplementos', material: 'Material', outro: 'Outro' };

export const ALL_PLATES = [25, 20, 15, 10, 5, 2.5, 2, 1.25, 1, 0.5];

export const DEFAULT_SETTINGS = {
  onboarded: false,
  daysPerWeek: 3,
  weekPlan: { 0: 'repor', 1: 'supera', 2: 'estadio', 3: 'supera', 4: 'estadio', 5: 'descanso', 6: 'livre' },
  bar: 20,
  plates: [25, 20, 15, 10, 5, 2.5, 1.25],
  dbStep: 2,
  machineStep: 2.5,
  rest: { main: 180, secondary: 150, accessory: 90, skill: 120 },
  sound: true,
  vibrate: true,
  lockScreenRest: true,
  hiddenFoods: [], // alimentos escondidos dos botões de registo (continuam nas sugestões e no histórico)
  bands: [ // bandas elásticas que tens (ajuda em kg); juntam-se mais no treino ou em Definições
    { id: 'b10', label: '10 kg', kg: 10 },
    { id: 'b20', label: '20 kg', kg: 20 },
  ],
  deletedFoods: [], // alimentos criados à mão que foram apagados das opções (os registos feitos ficam)
  wakeLock: true,
  theme: 'auto',
  baseline: { date: null, bench: { w: 80, reps: 2, rpe: 10 }, pullups: 10, bw: 64 },
  muStage: null,
  deloadEvery: 6,
  bwGoal: 'gain',
  proteinPerKg: 1.8,
  wheyProtein: 21,
  budgetMonthly: 0,
  creatineNote: '1 medida por dia',
};

// Guia: texto curto e prático
export const GUIDE = [
  {
    id: 'plano',
    title: 'Como funciona o plano',
    body: `
<p>Há dois sítios. No <strong>Supera</strong> fazes o bench press e o resto com máquinas e halteres. No <strong>Estádio Universitário</strong> fazes tudo o que precisa de barra: muscle-up, pull-ups e straight bar dips reta. O plano semanal (que mudas em Mais → Definições) diz-te onde treinas em cada dia.</p>
<p><strong>A semana tem 4 treinos obrigatórios:</strong> Supera à segunda e à quarta, Estádio à terça e à quinta. A sexta é de descanso (há o grupo de jovens). O domingo serve para repor um treino em falta, se ainda faltar algum; senão é descanso. Ao domingo e nos feriados o Supera só abre das 9h às 14h.</p>
<p><strong>O sábado depende da semana.</strong> Se fizeste os 4 treinos, é opcional: treinas se te apetecer, ou descansas. Se faltaste a algum, é obrigatório e a app diz-te onde ir (o sítio que ficou a faltar). Ao sábado o Supera abre das 9h às 20h30.</p>
<p><strong>Se faltares a um treino</strong>, não o perdes: a app segue sempre a ordem e retoma onde ficaste. Regista o motivo quando a app perguntar; fica no histórico. Se faltares a dois na mesma semana, repões um no sábado e outro no domingo: nunca faças dois treinos no mesmo dia para compensar. Depois de uma pausa longa, a app baixa um pouco os pesos do supino.</p>
<p><strong>Ordem dos treinos.</strong> No Supera alternas o A (pesado) e o B (volume). O C (paused bench press) é o treino extra: aparece quando já fizeste o A e o B nessa semana, por exemplo num sábado opcional. No Estádio alternas o 1 e o 2.</p>
<p><strong>Sábado opcional: onde?</strong> Enquanto não tiveres o primeiro muscle-up, a app sugere o Estádio (aprender uma técnica pede repetição frequente). Depois, sugere o Supera.</p>
<p><strong>Dias com pouco tempo:</strong> se só tiveres 20 minutos, vai ao Estádio fazer apenas o bloco de muscle-up. É melhor do que saltar o treino.</p>
<p><strong>Supera A, pesado.</strong> Uma série principal de bench press de 3 reps a RPE 8 e depois 3 séries de 5, mais leves. As séries seguintes ajustam-se ao que fizeste na principal.</p>
<p><strong>Supera B, volume.</strong> 4 séries de 6 a 8 reps. Quando fizeres 8 reps em todas, a app sobe 2,5 kg.</p>
<p><strong>Supera C, força e técnica (extra).</strong> Paused bench press: 2 segundos de pausa no peito, para ganhar força a sair do peito.</p>
<p><strong>Progressão (progressive overload).</strong> Sim, em todos os exercícios. No bench press os pesos vêm da série principal e do RPE (o esforço que marcas). Nos outros exercícios com peso a app usa a progressão dupla: cada exercício tem uma gama de reps, por exemplo 4 séries de 6 a 10. Na primeira vez escolhes um peso com que faças entre 6 e 10 e ainda te sobrem 2. Nos treinos seguintes, com o mesmo peso, tentas mais 1 rep por série (a app já preenche o alvo). Quando fizeres 10 em todas as séries, a app sobe o peso e recomeças perto das 6. Nos exercícios sem peso (Estádio) progrides em reps e, depois, em variantes mais difíceis.</p>
<p>Todos os treinos acabam com 1 minuto de dead hang (pendurado na barra), para alongar e melhorar a pegada.</p>
<p><strong>Estádio 1 e 2.</strong> Só com o peso do corpo: como vais a pé, não levas pesos. A força vem de reps mais difíceis (slow eccentric pull-ups, depois archer pull-ups) e não de peso extra. Começam sempre pelo muscle-up, enquanto estás fresco. Os exercícios mudam sozinhos à medida que cumpres os marcos. Se correres no mesmo dia, corre depois, nunca antes.</p>`,
  },
  {
    id: 'supino',
    title: 'Técnica de supino',
    body: `
<p>A técnica dá quilos sem precisares de ganhar força. Antes de tirar a barra: omoplatas juntas e puxadas para baixo, arco moderado na zona das costas (o rabo fica no banco) e pés bem firmes.</p>
<p>A pegada deve deixar os antebraços na vertical quando a barra está no peito. A barra desce em direção à parte de baixo do peito e sobe ligeiramente para trás, até ficar por cima dos ombros.</p>
<p>O <strong>leg drive</strong> é empurrar o chão com os pés durante a subida, sem levantar o rabo. Transmite força das pernas para o tronco. Calcanhares sempre no chão: os pés vão para trás só até onde os calcanhares ainda assentam, e empurras o chão para trás (em direção à cabeça), não para cima.</p>
<p>Filma-te de lado de vez em quando. O banco do Supera não tem barras de segurança: nunca vás até à falha e deixa sempre 1 a 2 reps de reserva, ou pede a alguém que te ajude nas séries pesadas.</p>`,
  },
  {
    id: 'ombros',
    title: 'Ombros largos',
    body: `
<p>O que faz os ombros parecerem largos é sobretudo a parte <strong>lateral do deltoide</strong> (o músculo redondo do ombro), mais as costas largas e uma cintura que não cresce. A parte da frente do ombro já trabalha muito com o supino e os dips, por isso não precisas de mais press de ombros.</p>
<p><strong>No plano:</strong> machine lateral raises no Supera no A (3 séries) e no B (4 séries), e dumbbell lateral raises no C (3 séries) quando o fizeres. Para variar, troca entre máquina, halteres e polia em "trocar exercício". Os face pulls (A) e os rear delt flyes (C) trabalham a parte de trás do ombro. Os pull-ups no Estádio e o lat pulldown no Supera alargam as costas.</p>
<p><strong>Como fazer as lateral raises:</strong> peso leve, 12 a 20 reps, sem balançar, e quase até à falha. Sobe o peso só quando fizeres 20 reps em todas as séries. A máquina mantém o movimento estável e é mais fácil de progredir; os halteres e a polia servem para variar.</p>
<p><strong>Medir:</strong> uma vez por mês, mede o perímetro dos ombros com a fita: de pé, braços relaxados ao lado do corpo, a fita à volta da parte mais larga dos ombros, sem encher o peito. A app mostra a evolução e a relação entre ombros e cintura (quanto maior, mais em V).</p>
<p><strong>Expectativas:</strong> a largura dos ossos (clavículas) não muda. O músculo cresce devagar: meio centímetro a um centímetro de perímetro por mês já é bom progresso.</p>`,
  },
  {
    id: 'muscleup',
    title: 'Muscle-up na barra',
    body: `
<p>Com cerca de 10 pull-ups seguidos já tens a força de base. O que falta é altura (puxar a barra até à barriga) e a transição (rodar os pulsos e passar os cotovelos por cima da barra).</p>
<p><strong>Pegada falsa (false grip):</strong> em vez de agarrares a barra com os dedos, pões a base da palma (a parte junto ao pulso) em cima da barra, com o pulso dobrado. Assim o pulso já começa por cima da barra e a transição fica muito mais curta: não precisas de rodar a mão a meio do movimento. Custa um pouco de força a puxar (fazes menos pull-ups assim) e cansa os antebraços e os pulsos, por isso treina-se aos poucos.</p>
<p><strong>Como treinar:</strong> no início de cada treino no Estádio, depois de aquecer, 2 séries de false grip hang (começas com 10 s e a app sobe 5 s quando aguentares tudo, até 30 s). Depois usa a mesma pegada nas australian pull-ups (com os pés no chão a barra só leva parte do peso, por isso é a forma mais fácil de treinar a pegada falsa a mexer), nas negatives, nas transições na barra baixa e nos band-assisted muscle-ups. Nas explosive pull-ups podes usar a pegada normal, para puxares mais alto. Na barra, muita gente usa uma meia pegada falsa (a mão rodada por cima da barra, sem o pulso todo dobrado): experimenta as duas.</p>
<p><strong>Pulsos:</strong> aquece-os antes (rodar os pulsos e apoiar o peso nas palmas, no chão). Se doer, faz séries mais curtas ou para por hoje. Magnésio líquido ajuda a pegada a não escorregar.</p>
<p><strong>A pegada falsa ajuda, mas não chega sozinha.</strong> O que mais decide o muscle-up na barra é a altura do puxão (a barra tem de chegar ao peito ou à barriga). Por isso as explosive pull-ups continuam a ser o centro do plano.</p>
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
<dt>Kip</dt><dd>Balanço do corpo para ganhar impulso nos pull-ups e no muscle-up.</dd>
<dt>Face pull</dt><dd>Puxar uma corda na polia em direção à cara; trabalha a parte de trás do ombro.</dd>
<dt>Leg drive</dt><dd>Empurrar o chão com os pés durante o supino.</dd>
<dt>Excedente calórico</dt><dd>Comer mais energia do que gastas, o que é necessário para ganhar peso.</dd>
</dl>`,
  },
];
