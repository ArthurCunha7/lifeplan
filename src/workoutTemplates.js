// Modelos de treino prontos (tela "Meus Treinos"). Dados + uma função pura que monta o resultado.
// Cada modelo descreve a SEMANA INTEIRA (segunda a domingo), inclusive os dias de descanso.
// Os exercícios vão um por linha, no mesmo formato do formulário de treino do app.

export const DESCANSO = { tipo: 'rest', rotulo: 'Descanso', exercicios: 'Nenhum treino – foco em sono e recuperação' };
const COR = { strength: 'var(--success)', cardio: 'var(--info)', rest: 'var(--muted)' };
const forca = (rotulo, linhas) => ({ tipo: 'strength', rotulo, exercicios: linhas.join('\n') });

export const MODELOS = [
  {
    id: 'abc',
    nome: 'ABC',
    resumo: '3 treinos por semana (segunda, quarta e sexta). Bom para começar ou para pouco tempo.',
    semana: [
      forca('Treino A – Peito e Tríceps', [
        'Supino reto 4×8', 'Supino inclinado com halteres 3×10', 'Crucifixo 3×12',
        'Tríceps corda 3×12', 'Tríceps testa 3×10',
      ]),
      DESCANSO,
      forca('Treino B – Costas e Bíceps', [
        'Puxada frontal 4×10', 'Remada curvada 4×8', 'Remada baixa no cabo 3×10',
        'Rosca direta 3×10', 'Rosca martelo 3×12',
      ]),
      DESCANSO,
      forca('Treino C – Pernas e Ombros', [
        'Agachamento 4×8', 'Leg press 3×10', 'Cadeira extensora 3×12', 'Mesa flexora 3×12',
        'Desenvolvimento com halteres 3×10', 'Elevação lateral 3×12', 'Panturrilha em pé 4×15',
      ]),
      DESCANSO,
      DESCANSO,
    ],
  },
  {
    id: 'full-body-3x',
    nome: 'Full Body 3×',
    resumo: 'Corpo inteiro em cada treino, 3 vezes por semana (segunda, quarta e sexta), com dia de descanso entre eles.',
    semana: [
      forca('Full Body A', ['Agachamento 3×8', 'Supino reto 3×8', 'Remada curvada 3×8', 'Desenvolvimento 3×10', 'Rosca direta 2×10', 'Tríceps corda 2×12']),
      DESCANSO,
      forca('Full Body B', ['Levantamento terra romeno 3×8', 'Supino inclinado com halteres 3×10', 'Puxada frontal 3×10', 'Elevação lateral 3×12', 'Leg press 3×10', 'Prancha 3×30-45s']),
      DESCANSO,
      forca('Full Body C', ['Afundo 3×10 por perna', 'Supino reto com halteres 3×10', 'Remada baixa no cabo 3×10', 'Desenvolvimento com halteres 3×10', 'Rosca alternada 2×10', 'Tríceps testa 2×10']),
      DESCANSO,
      DESCANSO,
    ],
  },
  {
    id: 'hipertrofia-5x',
    nome: 'Hipertrofia: Superior / Inferior / Push / Pull / Legs',
    resumo: '5 treinos por semana (segunda a sexta), cada grupo muscular 2× por semana. Para quem já treina há um tempo. Sábado: cardio opcional.',
    fonte: 'Base científica: Pelland et al. (2025); Schoenfeld et al. (2017); Refalo et al. (2023); Robinson et al. (2024); Singer et al. (2024); Wolf et al. (2023); Schumann et al. (2022).',
    notas: [
      'RIR = repetições em reserva: quantas repetições sobrariam antes da falha. RIR 1 = parou a 1 repetição da falha.',
      'Progressão dupla: suba as repetições dentro da faixa até bater o topo em todas as séries; depois aumente a carga e volte à base da faixa.',
      'Mesociclo de 6 semanas: semanas 1-2 com RIR 3, semanas 3-4 com RIR 2, semana 5 com RIR 1, semana 6 com RIR 0-1 (pico) e semana 7 de deload (corte de 40-50% das séries, RIR 3-4).',
      'A cada mesociclo, troque 1 ou 2 exercícios por uma variação equivalente (por exemplo, supino reto por supino com halteres).',
      'Registre carga, repetições e RIR de cada série: sem registro não há sobrecarga progressiva de verdade.',
      'Proteína: de 1,6 a 2,2 g por kg de peso por dia (Morton et al., 2018). Sono: de 7 a 9 horas por noite.',
      'Os exercícios podem ser trocados por equivalentes, mantendo séries, repetições e RIR.',
    ],
    semana: [
      forca('Superior A – Peito, costas, ombro e braço', [
        'Supino reto com barra 4×6-8 · RIR 1-2 · 2-3 min',
        'Remada curvada com barra 4×8-10 · RIR 1-2 · 2-3 min',
        'Desenvolvimento militar com halteres (sentado) 3×8-10 · RIR 1-2 · 2 min',
        'Puxada frontal 3×10-12 · RIR 1 · 2 min',
        'Elevação lateral no cabo 3×12-15 · RIR 0-1 · 60-90s',
        'Rosca direta com barra 3×8-10 · RIR 1 · 90s',
        'Tríceps corda (polia alta) 3×10-12 · RIR 0-1 · 60-90s',
        'Cardio: opcional, 15-20 min leve (bike ou elíptico)',
      ]),
      forca('Inferior A – Quadríceps', [
        'Agachamento livre com barra 4×6-8 · RIR 1-2 · 3 min',
        'Leg press 45° 3×10-12 · RIR 1 · 2-3 min',
        'Cadeira extensora (fase excêntrica controlada) 3×12-15 · RIR 0-1 · 90s',
        'Mesa flexora ou stiff leve 3×10-12 · RIR 1 · 90s',
        'Panturrilha em pé 4×10-15 · RIR 0-1 · 60-90s',
        'Prancha ou elevação de pernas (opcional) 3×30-45s · 60s',
        'Cardio: evitar. Só caminhada leve, se quiser',
      ]),
      forca('Push – Peito, ombro e tríceps', [
        'Supino inclinado com halteres 4×8-10 · RIR 1-2 · 2-3 min',
        'Desenvolvimento com halteres ou máquina 3×8-10 · RIR 1-2 · 2 min',
        'Crucifixo no cabo ou peck deck (ênfase na fase alongada) 3×12-15 · RIR 0-1 · 90s',
        'Elevação lateral com halteres 3×12-15 · RIR 0-1 · 60-90s',
        'Tríceps testa (barra EZ ou halteres) 3×10-12 · RIR 1 · 90s',
        'Tríceps corda, pegada unilateral 2-3×12-15 · RIR 0 · 60s',
        'Cardio: 20-30 min moderado',
      ]),
      forca('Pull – Costas e bíceps', [
        'Barra fixa (com peso, se precisar) ou puxada supinada 4×6-10 · RIR 1-2 · 2-3 min',
        'Remada cavalinho ou remada baixa no cabo 4×8-10 · RIR 1-2 · 2-3 min',
        'Face pull 3×15-20 · RIR 0-1 · 60-90s',
        'Rosca alternada com halteres 3×10-12 · RIR 1 · 90s',
        'Rosca martelo ou Scott 3×10-12 · RIR 0-1 · 60-90s',
        'Elevação de pernas na barra (opcional) 3×12-15 · 60s',
        'Cardio: opcional, 15-20 min leve',
      ]),
      forca('Inferior B – Posterior e glúteo', [
        'Levantamento terra romeno (RDL) 4×6-8 · RIR 1-2 · 3 min',
        'Afundo búlgaro com halteres 3×8-10 por perna · RIR 1-2 · 2 min',
        'Elevação de quadril (hip thrust) 3×8-12 · RIR 1 · 2 min',
        'Mesa flexora deitada 3×10-12 · RIR 0-1 · 90s',
        'Cadeira extensora (finalização, mais leve) 2-3×15-20 · RIR 0 · 60-90s',
        'Panturrilha sentado 4×12-15 · RIR 0-1 · 60s',
        'Cardio: evitar. Só caminhada leve, se quiser',
      ]),
      { tipo: 'cardio', rotulo: 'Cardio livre (opcional)', exercicios: 'Cardio contínuo moderado de 30-40 min (bike, esteira inclinada ou natação). Dia livre de musculação.' },
      { tipo: 'rest', rotulo: 'Descanso', exercicios: 'Descanso total ou caminhada leve' },
    ],
  },
];

export const modeloPorId = id => MODELOS.find(m => m.id === id) || null;
export const treinosDeForca = modelo => modelo.semana.filter(d => d.tipo === 'strength').length;

// Monta o resultado de aplicar um modelo:
//   plan      → os 7 dias do plano atual, com tipo, nome e exercícios do modelo (mantém o resto de cada dia)
//   profiles  → lista de treinos salvos, com um treino por nome do modelo (atualiza se já existir, senão cria)
//   meta      → treinos de musculação por semana do modelo
// `agora` só serve para gerar ids estáveis nos testes.
export function montarModelo(modelo, planAtual, perfisAtuais, agora = Date.now()) {
  const plan = (planAtual || []).map((d, i) => {
    const m = modelo.semana[i];
    return m ? { ...d, type: m.tipo, typeLabel: m.rotulo, exercises: m.exercicios } : d;
  });
  const perfis = [...(perfisAtuais || [])];
  let n = 0;
  modelo.semana.forEach(m => {
    if (m.tipo === 'rest') return; // descanso não vira "treino salvo"
    const feito = { type: m.tipo, typeLabel: m.rotulo, exercises: m.exercicios, color: COR[m.tipo] };
    const i = perfis.findIndex(p => p.typeLabel === m.rotulo);
    if (i >= 0) perfis[i] = { ...perfis[i], ...feito };
    else perfis.push({ id: 'wp' + agora + '-' + (n++), ...feito });
  });
  return { plan, profiles: perfis, meta: treinosDeForca(modelo) };
}
