import { describe, it, expect } from 'vitest';
import {
  parseDiaVencimento,
  proximoVencimento,
  vencimentosProximos,
  textoVencimento,
} from '../lembretes.js';

describe('lembretes (fonte única reexportada de supabase/functions/_shared/vencimentos.js)', () => {
  it('extrai o dia do vencimento de textos livres válidos', () => {
    expect(parseDiaVencimento('17')).toBe(17);
    expect(parseDiaVencimento('dia 5 de cada mês')).toBe(5);
    expect(parseDiaVencimento('')).toBeNull();
    expect(parseDiaVencimento('dia 35')).toBeNull();
  });

  it('ajusta dia 31 para o último dia em meses mais curtos e avança para o próximo mês se já passou', () => {
    expect(proximoVencimento(31, '2026-02-10')).toBe('2026-02-28');
    expect(proximoVencimento(10, '2026-11-17')).toBe('2026-12-10');
    expect(proximoVencimento(17, '2026-11-17')).toBe('2026-11-17');
  });

  it('filtra apenas faturas próprias dentro da janela e ignora faturas do modo família', () => {
    const faturas = [
      { id: 'f1', name: 'Nubank', vencimento: 'dia 19' },
      { id: 'f2', name: 'Cartão Família', vencimento: 'dia 18', family: true },
      { id: 'f3', name: 'Itaú', vencimento: 'dia 28' },
    ];
    const res = vencimentosProximos(faturas, '2026-11-17', 3);
    expect(res).toHaveLength(1);
    expect(res[0]).toMatchObject({ id: 'f1', name: 'Nubank', dias: 2, due: '2026-11-19' });
    expect(textoVencimento(res[0]).dedupe_key).toBe('venc:f1:2026-11-19');
  });
});
