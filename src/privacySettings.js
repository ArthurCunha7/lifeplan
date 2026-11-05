// src/privacy.js — configurações de privacidade deste aparelho: valores escondidos, PIN e biometria.
// Tudo fica no localStorage DESTE aparelho (chave lifeplan_privacy). É uma trava de tela para quem
// pegar seu celular desbloqueado; não é criptografia dos dados.

const KEY = 'lifeplan_privacy';
export const PIN_LEN = 6;
export const MAX_FAILS = 10;      // ao errar 10 vezes seguidas, desconecta a conta deste aparelho
const DELAY_AT = 5;               // na 5ª tentativa errada, espera 30 s
const DELAY_MS = 30000;
const PBKDF2_ITER = 150000;

export const LOCK_AFTER_OPTIONS = [
  [0, 'Ao sair do app'],
  [60, 'Após 1 minuto'],
  [300, 'Após 5 minutos'],
  [900, 'Após 15 minutos'],
];

const DEFAULTS = { hideValues: true, lockEnabled: false, lockAfter: 60, pinSalt: null, pinHash: null, bioCredId: null, fails: 0, lockedUntil: 0 };

export function getPrivacy() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
  catch { return { ...DEFAULTS }; }
}
export function setPrivacy(patch) {
  const next = { ...getPrivacy(), ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* armazenamento bloqueado */ }
  return next;
}
// Remove PIN e biometria (mantém a preferência de esconder valores).
export function clearLock() {
  setPrivacy({ lockEnabled: false, pinSalt: null, pinHash: null, bioCredId: null, fails: 0, lockedUntil: 0 });
}

// ── PIN ──────────────────────────────────────────────────────────────────────
const enc = new TextEncoder();
const toB64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

async function derive(pin, salt) {
  if (!(window.crypto && crypto.subtle)) throw new Error('Este navegador não consegue proteger o PIN. Abra o app por https.');
  const key = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITER }, key, 256);
  return toB64(bits);
}
function sameText(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export async function savePin(pin) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(pin, salt);
  setPrivacy({ pinSalt: toB64(salt), pinHash: hash, lockEnabled: true, fails: 0, lockedUntil: 0 });
}

// Resultado: {ok:true} | {ok:false, reason:'wrong', left, waitMs} | {ok:false, reason:'wait', waitMs} | {ok:false, reason:'wipe'}
export async function verifyPin(pin) {
  const p = getPrivacy();
  if (!p.pinHash || !p.pinSalt) return { ok: false, reason: 'wipe' };
  const now = Date.now();
  if (p.lockedUntil > now) return { ok: false, reason: 'wait', waitMs: p.lockedUntil - now };
  const hash = await derive(pin, fromB64(p.pinSalt));
  if (sameText(hash, p.pinHash)) { setPrivacy({ fails: 0, lockedUntil: 0 }); return { ok: true }; }
  const fails = p.fails + 1;
  if (fails >= MAX_FAILS) { clearLock(); return { ok: false, reason: 'wipe' }; }
  const wait = fails === DELAY_AT;
  setPrivacy({ fails, lockedUntil: wait ? now + DELAY_MS : 0 });
  const left = fails < DELAY_AT ? DELAY_AT - fails : MAX_FAILS - fails;
  return { ok: false, reason: 'wrong', left, waitMs: wait ? DELAY_MS : 0 };
}

// ── Biometria (WebAuthn: Face ID, impressão digital, Windows Hello) ──────────
// O próprio aparelho confirma a pessoa; o LifePlan só libera a tela se a confirmação der certo.
const rand = n => crypto.getRandomValues(new Uint8Array(n));

export async function bioAvailable() {
  try { return !!(window.PublicKeyCredential && await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()); }
  catch { return false; }
}
export async function bioEnroll(userId, email) {
  const cred = await navigator.credentials.create({ publicKey: {
    challenge: rand(32),
    rp: { name: 'LifePlan' },
    user: { id: enc.encode(String(userId)).slice(0, 64), name: email || 'lifeplan', displayName: email || 'LifePlan' },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
    authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
    timeout: 60000, attestation: 'none',
  } });
  if (!cred) throw new Error('Cadastro cancelado.');
  setPrivacy({ bioCredId: toB64(cred.rawId) });
}
export async function bioUnlock() {
  const p = getPrivacy();
  if (!p.bioCredId) return false;
  const a = await navigator.credentials.get({ publicKey: {
    challenge: rand(32),
    allowCredentials: [{ type: 'public-key', id: fromB64(p.bioCredId), transports: ['internal'] }],
    userVerification: 'required', timeout: 60000,
  } });
  return !!a;
}
