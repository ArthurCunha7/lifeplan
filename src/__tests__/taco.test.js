import { describe, it, expect } from 'vitest';
import { searchTACO, computeFoodMetrics } from '../App.jsx';

describe('searchTACO', () => {
  it('retorna vazio para busca muito curta (menos de 2 letras)', () => {
    expect(searchTACO('a')).toEqual([]);
    expect(searchTACO('')).toEqual([]);
  });

  it('encontra alimentos ignorando acentos e maiúsculas/minúsculas', () => {
    const results = searchTACO('arroz');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.n.toLowerCase().includes('arroz'))).toBe(true);
  });

  it('respeita o limite de resultados', () => {
    const results = searchTACO('a', 3); // "a" sozinho é curto, mas o limite é o 2º argumento
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it('não quebra com uma busca sem nenhum resultado', () => {
    expect(searchTACO('xyzxyzxyz123')).toEqual([]);
  });
});

describe('computeFoodMetrics', () => {
  const food = { n: 'Alimento teste', e: 200, p: 20, l: 10, cb: 5 }; // por 100g

  it('calcula preço por kg, kcal e proteína por real corretamente', () => {
    // 500g por R$10 => R$20/kg
    const result = computeFoodMetrics({ food, qty: 500, price: 10 });
    expect(result).not.toBeNull();
    expect(result.pricePerKg).toBeCloseTo(20, 5);
    // 500g = fator 5 -> 1000kcal totais, 100g proteína
    expect(result.totalKcal).toBeCloseTo(1000, 5);
    expect(result.totalP).toBeCloseTo(100, 5);
    expect(result.kcalPerReal).toBeCloseTo(100, 5); // 1000kcal / R$10
    expect(result.proteinPerReal).toBeCloseTo(10, 5); // 100g / R$10
  });

  it('retorna null quando falta alimento, preço ou quantidade', () => {
    expect(computeFoodMetrics({ food: null, qty: 100, price: 10 })).toBeNull();
    expect(computeFoodMetrics({ food, qty: 100, price: 0 })).toBeNull();
    expect(computeFoodMetrics({ food, qty: 0, price: 10 })).toBeNull();
    expect(computeFoodMetrics({ food, qty: 100, price: -5 })).toBeNull();
  });
});
