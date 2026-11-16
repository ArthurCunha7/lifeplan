// Leitura dos textos de treino para a Ficha de treino (tela Meus Treinos).
// JavaScript puro. Os treinos continuam salvos como texto (um exercício por linha);
// aqui só se "lê" esse texto para mostrar em colunas. Linha que não segue o formato
// aparece como texto normal, então nada que a pessoa digitou se perde.

// "Superior A – Peito, costas, ombro e braço" → { nome: "Superior A", foco: "Peito, costas, ombro e braço" }
export function dividirTitulo(titulo) {
  const t = String(titulo || '').trim();
  const m = t.match(/^(.+?)\s+[–—-]\s+(.+)$/);
  return m ? { nome: m[1].trim(), foco: m[2].trim() } : { nome: t, foco: '' };
}

// Dose = séries × repetições ("4×6-8", "3x12", "3×30-45s", "3×8-10 por perna")
const DOSE = /^(.*?)\s+(\d+(?:-\d+)?\s*[x×]\s*\d+(?:-\d+)?(?:\s*(?:s|seg|min)\b|\s+por perna|\/perna)?)\s*$/i;

// "Supino reto com barra 4×6-8 · RIR 1-2 · 2-3 min"
//   → { tipo:'serie', nome, dose:'4×6-8', rir:'1-2', intervalo:'2-3 min' }
// "Cardio: opcional, 15-20 min leve" → { tipo:'texto', texto }
export function lerLinha(linha) {
  const bruta = String(linha || '').trim();
  if (!bruta) return null;
  const partes = bruta.split(/\s+·\s+/).map(s => s.trim()).filter(Boolean);
  const m = partes[0].match(DOSE);
  if (!m || !m[1].trim()) return { tipo: 'texto', texto: bruta };
  let rir = '', intervalo = '';
  partes.slice(1).forEach(p => {
    const r = p.match(/^RIR\s*(.+)$/i);
    if (r) rir = r[1].trim(); else if (!intervalo) intervalo = p;
  });
  return { tipo: 'serie', nome: m[1].trim(), dose: m[2].replace(/\s*[x×]\s*/, '×').trim(), rir, intervalo };
}

// Treinos antigos do app guardam vários exercícios na mesma linha ("Agachamento 4×8 · Leg Press 4×10").
// Se mais de um pedaço da linha tem séries×repetições, cada pedaço é um exercício.
export function lerExercicios(texto) {
  return String(texto || '').split('\n').flatMap(linha => {
    const partes = linha.split(/\s+·\s+/).map(p => p.trim()).filter(Boolean);
    const comDose = partes.filter(p => DOSE.test(p)).length;
    return comDose >= 2 ? partes.map(lerLinha) : [lerLinha(linha)];
  }).filter(Boolean);
}

// "9 a 15 de novembro"  /  "26 de out. a 1 de nov." (semana de segunda a domingo que contém `hoje`)
export function rotuloSemana(hoje = new Date()) {
  const idx = (hoje.getDay() + 6) % 7;
  const ini = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - idx);
  const fim = new Date(ini.getFullYear(), ini.getMonth(), ini.getDate() + 6);
  const mes = (d, curto) => d.toLocaleDateString('pt-BR', { month: curto ? 'short' : 'long' });
  if (ini.getMonth() === fim.getMonth()) return `${ini.getDate()} a ${fim.getDate()} de ${mes(fim)}`;
  return `${ini.getDate()} de ${mes(ini, true)} a ${fim.getDate()} de ${mes(fim, true)}`;
}

// índice do dia na semana do app: 0 = segunda … 6 = domingo
export const diaDaSemana = (hoje = new Date()) => (hoje.getDay() + 6) % 7;
