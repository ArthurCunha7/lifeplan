import { describe, it, expect } from 'vitest';
import { friendlyAuthError } from '../AuthPages';
import { confirmDialog, alertDialog } from '../dialog';

describe('friendlyAuthError', () => {
  it('traduz mensagens comuns do Supabase', () => {
    expect(friendlyAuthError(new Error('Invalid login credentials'), 'x')).toMatch(/incorretos/);
    expect(friendlyAuthError(new Error('Email not confirmed'), 'x')).toMatch(/Confirme/);
    expect(friendlyAuthError(new Error('User already registered'), 'x')).toMatch(/já tem conta/);
    expect(friendlyAuthError(new Error('Failed to fetch'), 'x')).toMatch(/conexão/);
  });
  it('nunca expõe texto em inglês desconhecido', () => {
    expect(friendlyAuthError(new Error('Something weird happened'), 'Tente de novo')).toBe('Tente de novo');
    expect(friendlyAuthError(null, 'Tente de novo')).toBe('Tente de novo');
  });
});

describe('dialog sem host montado', () => {
  it('confirm nega por segurança e alert não trava', async () => {
    expect(await confirmDialog('Excluir?')).toBe(false);
    await expect(alertDialog('Oi')).resolves.toBeUndefined();
  });
});
