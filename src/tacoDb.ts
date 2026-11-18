// src/tacoDb.ts — Tabela TACO (NEPA/UNICAMP), cálculos de TDEE/macros, gerador de plano e comparador
import type {
  ActivityLevel,
  MealEntry,
  MealFoodItem,
  MealPlanDay,
  NutritionGoal,
  Sex,
  TacoFood,
  TacoSearchResult,
  WorkoutKind,
} from './types';

export const TACO_DB: TacoFood[] = [{"id":1,"n":"Arroz, integral, cozido","c":"Cereais","e":124,"p":2.6,"l":1.0,"cb":25.8},{"id":3,"n":"Arroz, tipo 1, cozido","c":"Cereais","e":128,"p":2.5,"l":0.2,"cb":28.1},{"id":7,"n":"Aveia, flocos, crua","c":"Cereais","e":394,"p":13.9,"l":8.5,"cb":66.6},{"id":52,"n":"Pão, trigo, forma, integral","c":"Cereais","e":253,"p":9.4,"l":3.7,"cb":49.9},{"id":53,"n":"Pão, trigo, francês","c":"Cereais","e":300,"p":8.0,"l":3.1,"cb":58.6},{"id":88,"n":"Batata, doce, cozida","c":"Vegetais","e":77,"p":0.6,"l":0.1,"cb":18.4},{"id":91,"n":"Batata, inglesa, cozida","c":"Vegetais","e":52,"p":1.2,"l":0.0,"cb":11.9},{"id":100,"n":"Brócolis, cozido","c":"Vegetais","e":25,"p":2.1,"l":0.5,"cb":4.4},{"id":109,"n":"Cenoura, cozida","c":"Vegetais","e":30,"p":0.8,"l":0.2,"cb":6.7},{"id":116,"n":"Couve, manteiga, refogada","c":"Vegetais","e":90,"p":1.7,"l":6.6,"cb":8.7},{"id":129,"n":"Mandioca, cozida","c":"Vegetais","e":125,"p":0.6,"l":0.3,"cb":30.1},{"id":157,"n":"Tomate, com semente, cru","c":"Vegetais","e":15,"p":1.1,"l":0.2,"cb":3.1},{"id":179,"n":"Banana, nanica, crua","c":"Frutas","e":92,"p":1.4,"l":0.1,"cb":23.8},{"id":182,"n":"Banana, prata, crua","c":"Frutas","e":98,"p":1.3,"l":0.1,"cb":26.0},{"id":222,"n":"Maçã, Fuji, com casca, crua","c":"Frutas","e":56,"p":0.3,"l":0.0,"cb":15.2},{"id":226,"n":"Mamão, Papaia, cru","c":"Frutas","e":40,"p":0.5,"l":0.1,"cb":10.4},{"id":239,"n":"Morango, cru","c":"Frutas","e":30,"p":0.9,"l":0.3,"cb":6.8},{"id":277,"n":"Atum, conserva em óleo","c":"Pescados","e":166,"p":26.2,"l":6.0,"cb":0},{"id":315,"n":"Salmão, filé, grelhado","c":"Pescados","e":229,"p":23.9,"l":14.0,"cb":0},{"id":318,"n":"Sardinha, assada","c":"Pescados","e":164,"p":32.2,"l":3.0,"cb":0},{"id":326,"n":"Carne, bovina, acém, moído, cozido","c":"Carnes","e":212,"p":26.7,"l":10.9,"cb":0},{"id":381,"n":"Carne, bovina, picanha, grelhada","c":"Carnes","e":289,"p":26.4,"l":19.5,"cb":0},{"id":395,"n":"Frango, coração, grelhado","c":"Carnes","e":207,"p":22.4,"l":12.1,"cb":0.6},{"id":396,"n":"Frango, coxa, com pele, assada","c":"Carnes","e":215,"p":28.5,"l":10.4,"cb":0.1},{"id":408,"n":"Frango, peito, sem pele, cozido","c":"Carnes","e":163,"p":31.5,"l":3.2,"cb":0},{"id":410,"n":"Frango, peito, sem pele, grelhado","c":"Carnes","e":159,"p":32.0,"l":2.5,"cb":0},{"id":413,"n":"Frango, sobrecoxa, sem pele, assada","c":"Carnes","e":233,"p":29.2,"l":12.0,"cb":0},{"id":448,"n":"Iogurte, natural","c":"Laticínios","e":51,"p":4.1,"l":3.0,"cb":1.9},{"id":449,"n":"Iogurte, natural, desnatado","c":"Laticínios","e":41,"p":3.8,"l":0.3,"cb":5.8},{"id":461,"n":"Queijo, minas, frescal","c":"Laticínios","e":264,"p":17.4,"l":20.2,"cb":3.2},{"id":463,"n":"Queijo, mozarela","c":"Laticínios","e":330,"p":22.6,"l":25.2,"cb":3.0},{"id":469,"n":"Queijo, ricota","c":"Laticínios","e":140,"p":12.6,"l":8.1,"cb":3.8},{"id":486,"n":"Ovo, de galinha, clara, cozida","c":"Ovos","e":59,"p":13.4,"l":0.1,"cb":0},{"id":488,"n":"Ovo, de galinha, inteiro, cozido","c":"Ovos","e":146,"p":13.3,"l":9.5,"cb":0.6},{"id":489,"n":"Ovo, de galinha, inteiro, cru","c":"Ovos","e":143,"p":13.0,"l":8.9,"cb":1.6},{"id":557,"n":"Amendoim, grão, cru","c":"Leguminosas","e":544,"p":27.2,"l":43.9,"cb":20.3},{"id":561,"n":"Feijão, carioca, cozido","c":"Leguminosas","e":76,"p":4.8,"l":0.5,"cb":13.6},{"id":567,"n":"Feijão, preto, cozido","c":"Leguminosas","e":77,"p":4.5,"l":0.5,"cb":14.0},{"id":577,"n":"Lentilha, cozida","c":"Leguminosas","e":93,"p":6.3,"l":0.5,"cb":16.3},{"id":584,"n":"Soja, queijo (tofu)","c":"Leguminosas","e":64,"p":6.6,"l":4.0,"cb":2.1},{"id":589,"n":"Castanha-do-Brasil, crua","c":"Nozes","e":643,"p":14.5,"l":63.5,"cb":15.1},{"id":594,"n":"Linhaça, semente","c":"Nozes","e":495,"p":14.1,"l":32.3,"cb":43.3},{"id":507,"n":"Mel, de abelha","c":"Doces","e":309,"p":0,"l":0,"cb":84.0},{"id":1001,"n":"Frango, peito, sem pele, cru","c":"Carnes","e":119,"p":21.5,"l":3.0,"cb":0},{"id":1002,"n":"Frango, peito, com pele, cru","c":"Carnes","e":149,"p":20.8,"l":6.7,"cb":0},{"id":1003,"n":"Frango, coxa, sem pele, crua","c":"Carnes","e":120,"p":17.8,"l":4.9,"cb":0},{"id":1004,"n":"Carne, bovina, picanha, com gordura, crua","c":"Carnes","e":213,"p":18.8,"l":14.7,"cb":0},{"id":1005,"n":"Salmão, sem pele, fresco, cru","c":"Pescados","e":170,"p":19.3,"l":9.7,"cb":0},{"id":1006,"n":"Macarrão, trigo, cozido","c":"Cereais","e":102,"p":3.3,"l":1.3,"cb":19.9},{"id":1007,"n":"Leite, de vaca, integral","c":"Laticínios","e":61,"p":2.9,"l":3.2,"cb":4.3},{"id":1008,"n":"Leite, de vaca, desnatado","c":"Laticínios","e":35,"p":3.4,"l":0.2,"cb":4.9},{"id":1009,"n":"Alface, crua","c":"Vegetais","e":11,"p":1.4,"l":0.2,"cb":1.7},{"id":1010,"n":"Laranja, pêra, crua","c":"Frutas","e":37,"p":1.0,"l":0.1,"cb":8.9},{"id":1011,"n":"Abacate, cru","c":"Frutas","e":96,"p":1.2,"l":8.4,"cb":6.0},{"id":1012,"n":"Uva, rosada, crua","c":"Frutas","e":53,"p":0.7,"l":0.2,"cb":13.3},{"id":1013,"n":"Pepino, cru","c":"Vegetais","e":10,"p":0.9,"l":0.1,"cb":2.0},{"id":1014,"n":"Pimentão, vermelho, cru","c":"Vegetais","e":26,"p":1.1,"l":0.2,"cb":6.0},{"id":1015,"n":"Abobrinha, cozida","c":"Vegetais","e":19,"p":1.2,"l":0.3,"cb":4.1}];

export const TACO_MAP: Record<number, TacoFood> = Object.fromEntries(TACO_DB.map(t => [t.id, t]));

export interface WorkoutTypeCategory {
  type: WorkoutKind;
  label: string;
  icon: string;
  color: string;
  options: Array<{ typeLabel: string; detail: string; exercises: string }>;
}

// ── TIPOS DE TREINO disponíveis para troca ────────────────────────────────────
export const WORKOUT_TYPES: WorkoutTypeCategory[] = [
  { type:'strength', label:'Musculação',  icon:'dumbbell', color:'var(--success)',
    options:[
      { typeLabel:'Treino A – Leg Front',    detail:'Agachamento · Leg Press · Cadeira Extensora',        exercises:'Agachamento 4×8 · Leg Press 4×10 · Cadeira Extensora 4×12 · Panturrilha 5×12' },
      { typeLabel:'Treino B – Upper',        detail:'Supino · Remada · Desenvolvimento',                  exercises:'Supino 4×8 · Pull-up 3×10 · Remada 3×8 · Desenvolvimento 3×8 · Crucifixo 3×12' },
      { typeLabel:'Treino C – Posterior',    detail:'RDL · Mesa Flexora · Hip Thrust',                    exercises:'RDL 4×8 · Mesa Flexora 3×10 · Hip Thrust 4×10 · Bulgarian Split 3×10' },
      { typeLabel:'Treino D – Braços',       detail:'Rosca · Tríceps · Elevação Lateral',                 exercises:'Rosca Direta 4×10 · Rosca Alternada 3×10 · Tríceps Polia 4×10 · Tríceps Francês 3×10 · Elevação Lateral 3×12' },
      { typeLabel:'Full Body',               detail:'Treino completo do corpo',                           exercises:'Agachamento 3×8 · Supino 3×8 · Remada 3×8 · Desenvolvimento 3×8 · Rosca 3×10 · Tríceps 3×10' },
    ]
  },
  { type:'cardio',   label:'Cardio',      icon:'bike', color:'var(--info)',
    options:[
      { typeLabel:'Cardio – Bike',           detail:'Bicicleta ergométrica 40min',                        exercises:'Bicicleta ergométrica 40 min em intensidade moderada' },
      { typeLabel:'Cardio – Corrida',        detail:'Corrida 5-10km',                                     exercises:'Corrida leve a moderada 5–10km' },
      { typeLabel:'Cardio – HIIT',           detail:'Alta intensidade 30min',                             exercises:'HIIT: 8 rounds de 40s esforço / 20s descanso' },
      { typeLabel:'Cardio – Longo',          detail:'Bike + Corrida 1h30',                                exercises:'Bicicleta 50min + Corrida 40min – sessão longa' },
      { typeLabel:'Cardio – Natação',        detail:'Natação 45min',                                      exercises:'Natação contínua 45 min ritmo moderado' },
    ]
  },
  { type:'rest',     label:'Descanso',    icon:'moon', color:'var(--muted)',
    options:[
      { typeLabel:'Descanso',                detail:'Recuperação ativa',                                  exercises:'Nenhum treino – foco em sono e recuperação' },
      { typeLabel:'Mobilidade',              detail:'Alongamento e mobilidade',                           exercises:'Alongamento global 30min + foam roller' },
      { typeLabel:'Caminhada leve',          detail:'Caminhada leve 30min',                               exercises:'Caminhada leve 30 min ao ar livre' },
    ]
  },
];

// ── CÁLCULO DE DIETA ──────────────────────────────────────────────────────────
export const ACTIVITY_FACTORS: Record<ActivityLevel, { label: string; factor: number }> = {
  sedentario:    { label:'Sedentário (sem exercício)',       factor:1.2   },
  leve:          { label:'Leve (1-3x/semana)',               factor:1.375 },
  moderado:      { label:'Moderado (3-5x/semana)',           factor:1.55  },
  intenso:       { label:'Intenso (6-7x/semana)',            factor:1.725 },
  muito_intenso: { label:'Muito intenso (2x/dia ou atleta)', factor:1.9   },
};

export const GOAL_ADJUSTMENTS: Record<NutritionGoal, { label: string; delta: number; pf: number }> = {
  emagrecer_rapido:{ label:'Emagrecer rápido (-500 kcal)',    delta:-500, pf:2.2 },
  emagrecer:       { label:'Emagrecer (-250 kcal)',           delta:-250, pf:2.0 },
  manter:          { label:'Manter peso',                     delta:0,    pf:1.8 },
  ganhar_massa:    { label:'Ganhar massa (+250 kcal)',        delta:+250, pf:2.2 },
  ganhar_rapido:   { label:'Ganhar massa rápido (+500 kcal)', delta:+500, pf:2.4 },
};

export function calcTDEE({ weight, height, age, sex, activity }: { weight: number; height: number; age: number; sex: Sex; activity: ActivityLevel }): number {
  const bmr = sex === 'M' ? 10 * weight + 6.25 * height - 5 * age + 5 : 10 * weight + 6.25 * height - 5 * age - 161;
  return Math.round(bmr * (ACTIVITY_FACTORS[activity]?.factor || 1.55));
}

export function calcTargets({ weight, tdee, goal }: { weight: number; tdee: number; goal: NutritionGoal }): { kcal: number; prot: number; fat: number; carbs: number } {
  const adj = GOAL_ADJUSTMENTS[goal] || GOAL_ADJUSTMENTS.manter;
  const kcal = tdee + adj.delta;
  const prot = Math.round(weight * adj.pf);
  const fat = Math.round((kcal * 0.25) / 9);
  return { kcal, prot, fat, carbs: Math.round((kcal - prot * 4 - fat * 9) / 4) };
}

// ── GERADOR DE PLANO ──────────────────────────────────────────────────────────
export function generatePlan(profile: { weight: number; height: number; age: number; sex: Sex; activity: ActivityLevel; goal: NutritionGoal }): MealPlanDay[] {
  const tdee = calcTDEE(profile);
  const tgt = calcTargets({ weight: +profile.weight, tdee, goal: profile.goal });
  const isLoss = tgt.kcal < tdee;
  const isGain = tgt.kcal > tdee;
  const proteins = isLoss ? [410, 408, 486, 277, 318] : isGain ? [410, 413, 381, 395, 315] : [410, 408, 326, 277, 413];
  const carbSrcs = isLoss ? [88, 1, 91] : [3, 88, 1, 129];
  const veggies = [100, 109, 116, 157];
  const snacks = isLoss ? [448, 469, 222, 239] : [448, 7, 182, 557];
  const fatSrcs = [589, 594, 557];
  const DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  const TYPES: WorkoutKind[] = ['strength', 'strength', 'cardio', 'strength', 'strength', 'cardio', 'rest'];
  const DEFAULT_WORKOUTS = [
    { typeLabel: 'Treino A – Leg Front', detail: 'Agachamento · Leg Press', exercises: 'Agachamento 4×8 · Leg Press 4×10 · Cadeira Extensora 4×12' },
    { typeLabel: 'Treino B – Upper', detail: 'Supino · Remada', exercises: 'Supino 4×8 · Pull-up 3×10 · Remada 3×8 · Desenvolvimento 3×8' },
    { typeLabel: 'Cardio – Bike', detail: 'Bicicleta ergométrica 40min', exercises: 'Bicicleta ergométrica 40 min moderado' },
    { typeLabel: 'Treino C – Posterior', detail: 'RDL · Hip Thrust', exercises: 'RDL 4×8 · Mesa Flexora 3×10 · Hip Thrust 4×10' },
    { typeLabel: 'Treino D – Braços', detail: 'Rosca · Tríceps', exercises: 'Rosca Direta 4×10 · Tríceps Polia 4×10 · Elevação Lateral 3×12' },
    { typeLabel: 'Cardio – Longo', detail: 'Bike + Corrida 1h30', exercises: 'Bicicleta 50min + Corrida 40min' },
    { typeLabel: 'Descanso', detail: 'Recuperação ativa', exercises: 'Nenhum treino – foco em recuperação' },
  ];

  function mkFood(tacoId: number, qty: number): MealFoodItem | null {
    const t = TACO_MAP[tacoId];
    if (!t) return null;
    const f = qty / 100;
    return {
      id: 'g' + Math.random().toString(36).slice(2),
      name: t.n,
      qty,
      tacoId,
      kcal: Math.round(t.e * f),
      p: +((t.p * f).toFixed(1)),
      l: +((t.l * f).toFixed(1)),
      cb: +((t.cb * f).toFixed(1)),
    };
  }

  const notNull = <T,>(x: T | null | false): x is T => Boolean(x);
  const protQty = Math.max(80, Math.round((tgt.prot / 6) / (TACO_MAP[proteins[0]].p / 100)));
  const carbQty = Math.max(80, Math.round((tgt.carbs / 4) / (TACO_MAP[carbSrcs[0]].cb / 100)));

  return DAYS.map((name, i) => {
    const p1 = proteins[i % proteins.length];
    const p2 = proteins[(i + 2) % proteins.length];
    const c1 = carbSrcs[i % carbSrcs.length];
    const c2 = carbSrcs[(i + 1) % carbSrcs.length];
    const v1 = veggies[i % veggies.length];
    const ft = fatSrcs[i % fatSrcs.length];
    const isRest = TYPES[i] === 'rest';
    const burned = TYPES[i] === 'cardio' ? 700 : TYPES[i] === 'strength' ? 400 : 0;
    const wk = DEFAULT_WORKOUTS[i];
    const meals: MealEntry[] = [
      { time: '07:00', name: 'Café da Manhã', icon: 'sun', foods: [mkFood(7, Math.round(tgt.kcal * 0.22 * 0.35 / (TACO_MAP[7].e / 100))), mkFood(488, Math.round(tgt.kcal * 0.22 * 0.30 / (TACO_MAP[488].e / 100))), mkFood(182, 120), mkFood(448, 150)].filter(notNull) },
      { time: '10:00', name: 'Lanche 1', icon: 'droplet', foods: [mkFood(snacks[0], 200), mkFood(snacks[2] || 222, 150), mkFood(ft, 15)].filter(notNull) },
      { time: '13:00', name: 'Almoço', icon: 'utensils', foods: [mkFood(p1, Math.round(protQty * 1.1)), mkFood(c1, Math.round(carbQty * 1.2)), mkFood(561, 100), mkFood(v1, 100)].filter(notNull) },
      !isRest ? { time: '16:30', name: 'Pré-Treino', icon: 'zap', foods: [mkFood(c2, Math.round(carbQty * 0.8)), mkFood(p2, Math.round(protQty * 0.7))].filter(notNull) } : null,
      { time: isRest ? '19:00' : '20:00', name: isRest ? 'Jantar' : 'Pós-Treino / Jantar', icon: 'dumbbell', foods: [mkFood(p2, Math.round(protQty)), mkFood(c1, Math.round(carbQty * 0.9)), mkFood(v1, 80)].filter(notNull) },
      { time: '22:00', name: 'Ceia', icon: 'moon', foods: [mkFood(488, 100), mkFood(469, 60)].filter(notNull) },
    ].filter(notNull);

    return {
      id: i,
      name,
      short: name.slice(0, 3).toUpperCase(),
      fullName: name + (i < 5 ? '-Feira' : ''),
      type: TYPES[i],
      typeLabel: wk.typeLabel,
      detail: wk.detail,
      exercises: wk.exercises,
      calories: meals.reduce((s, m) => s + m.foods.reduce((a, f) => a + f.kcal, 0), 0),
      burned,
      meals,
    };
  });
}

// ── HELPERS DE BUSCA E COMPARAÇÃO ────────────────────────────────────────────
export function searchTACO(query?: string | null, limit = 9): TacoSearchResult[] {
  if (!query || query.length < 2) return [];
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ');
  const terms = norm(query).split(' ').filter(Boolean);
  return TACO_DB.map(t => ({ ...t, score: terms.reduce((s, w) => norm(t.n).includes(w) ? s + 1 : s - 1, 0) }))
    .filter(t => t.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export type FoodNutrientItem = Pick<TacoFood, 'n' | 'e' | 'p' | 'l' | 'cb'>;

export interface FoodSlotInput {
  food: FoodNutrientItem | null;
  qty: number;
  price: number | string;
}

export interface FoodMetrics {
  pricePerKg: number;
  kcalPerReal: number;
  proteinPerReal: number;
  totalKcal: number;
  totalP: number;
  totalCb: number;
  totalL: number;
}

export function computeFoodMetrics(slot: FoodSlotInput): FoodMetrics | null {
  const price = parseFloat(String(slot.price));
  if (!slot.food || !price || price <= 0 || !slot.qty) return null;
  const factor = slot.qty / 100;
  const totalKcal = slot.food.e * factor;
  const totalP = slot.food.p * factor;
  const totalCb = slot.food.cb * factor;
  const totalL = slot.food.l * factor;
  return {
    pricePerKg: price / (slot.qty / 1000),
    kcalPerReal: totalKcal / price,
    proteinPerReal: totalP / price,
    totalKcal,
    totalP,
    totalCb,
    totalL,
  };
}
