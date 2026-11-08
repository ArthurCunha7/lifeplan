// src/Notifications.jsx — sino de avisos (tela Início) e configuração de push (Perfil).
import { useState, useEffect, useRef, useCallback } from "react";
import { Icon } from "./ui";
import { getPrivacy } from "./privacySettings";
import {
  KIND_ICON, fetchNotifications, markRead, markAllRead, cleanupOld, subscribeNotifications, syncVencimentos,
  sendTestNotification, timeAgo, brl, noticeAmount, getPushStatus, enablePush, disablePush,
  ensureServiceWorker,
} from "./notificationsApi";

const card = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, margin: "0 16px 12px", padding: 16 };
const labelStyle = { fontSize: 12, fontWeight: 700, color: "var(--muted)", letterSpacing: 0.8 };
const ghostBtn = { background: "var(--surface2)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 10, minHeight: 44, padding: "10px 14px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" };
const mainBtn = { ...ghostBtn, background: "var(--accent)", color: "var(--on-accent)", border: "none" };

// Aparecem para quem toca em "Ativar push": traduz o motivo da falha
function pushErrorText(e) {
  const m = e && e.message;
  if (m === "permissao-negada") return "Você não permitiu as notificações. Libere nas configurações do navegador para o site.";
  if (m === "push-indisponivel") return "Push não está disponível neste navegador.";
  return "Não foi possível ativar o push agora. Tente de novo em instantes.";
}

export function NotificationBell({ userId, onNavigate }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [showValues, setShowValues] = useState(() => !getPrivacy().hideValues);
  const [pushStatus, setPushStatus] = useState(null);
  const [pushErr, setPushErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadErr, setLoadErr] = useState(false);
  const btnRef = useRef(null);
  const closeRef = useRef(null);

  const load = useCallback(async () => {
    try { setItems(await fetchNotifications()); setLoadErr(false); } catch (e) { console.error("Avisos:", e); setLoadErr(true); }
  }, []);

  useEffect(() => {
    if (!userId) return undefined;
    ensureServiceWorker();
    load().then(() => syncVencimentos(userId).then((n) => { if (n) load(); }));
    cleanupOld(userId);
    const off = subscribeNotifications(userId, (n) => setItems((prev) => [n, ...prev.filter((x) => x.id !== n.id)]));
    const onVis = () => { if (document.visibilityState === "visible") { load(); syncVencimentos(userId).then((n) => { if (n) load(); }); } };
    document.addEventListener("visibilitychange", onVis);
    const t = setInterval(load, 120000);
    const onSw = (e) => {
      if (e.data && e.data.lifeplanPush) load();
      if (e.data && e.data.lifeplanOpenNotifications) { load(); setOpen(true); }
    };
    if ("serviceWorker" in navigator) navigator.serviceWorker.addEventListener("message", onSw);
    return () => {
      off(); clearInterval(t); document.removeEventListener("visibilitychange", onVis);
      if ("serviceWorker" in navigator) navigator.serviceWorker.removeEventListener("message", onSw);
    };
  }, [userId, load]);

  useEffect(() => {
    if (!open) return undefined;
    setShowValues(!getPrivacy().hideValues);
    getPushStatus().then(setPushStatus);
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    setTimeout(() => closeRef.current && closeRef.current.focus(), 0);
    return () => { document.removeEventListener("keydown", onKey); if (btnRef.current) btnRef.current.focus(); };
  }, [open]);

  const unread = items.filter((n) => !n.read_at).length;

  async function openItem(n) {
    if (!n.read_at) {
      const now = new Date().toISOString();
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: now } : x)));
      markRead([n.id]);
    }
    setOpen(false);
    if (onNavigate) onNavigate("financas");
  }
  async function readAll() {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((x) => (x.read_at ? x : { ...x, read_at: now })));
    markAllRead(userId);
  }
  async function turnOnPush() {
    setBusy(true); setPushErr("");
    try { await enablePush(userId); } catch (e) { setPushErr(pushErrorText(e)); }
    setPushStatus(await getPushStatus()); setBusy(false);
  }

  return (
    <>
      <button ref={btnRef} onClick={() => setOpen(true)} aria-label={unread ? "Avisos, " + unread + (unread === 1 ? " não lido" : " não lidos") : "Avisos"}
        aria-haspopup="dialog" id="notif-bell"
        style={{ position: "relative", width: 44, height: 44, borderRadius: 22, border: "none", background: "var(--accent-soft)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}>
        <Icon name="bell" />
        {unread > 0 && (
          <span id="notif-badge" aria-hidden="true" style={{ position: "absolute", top: 2, right: 2, minWidth: 18, height: 18, padding: "0 5px", borderRadius: 9, background: "var(--danger, #b3261e)", color: "#fff", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box", border: "2px solid var(--bg)" }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          style={{ position: "fixed", inset: 0, background: "rgba(16,22,18,0.55)", zIndex: 2400, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "12px" }}>
          <div role="dialog" aria-modal="true" aria-label="Avisos" id="notif-panel"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, width: "100%", maxWidth: 480, maxHeight: "calc(100vh - 24px)", display: "flex", flexDirection: "column", boxShadow: "var(--shadow-md)", fontFamily: "var(--font-body)", color: "var(--text)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 12px 12px 18px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ flex: 1, fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 500 }}>Avisos</div>
              <button onClick={() => setShowValues((v) => !v)} aria-label={showValues ? "Ocultar valores" : "Mostrar valores"} aria-pressed={showValues}
                style={{ width: 44, height: 44, border: "none", background: "none", color: "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name={showValues ? "eyeOff" : "eye"} size={20} />
              </button>
              <button ref={closeRef} onClick={() => setOpen(false)} aria-label="Fechar"
                style={{ width: 44, height: 44, border: "none", background: "none", color: "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="x" size={20} />
              </button>
            </div>

            <div style={{ overflowY: "auto", flex: 1 }}>
              {loadErr && <div style={{ padding: "12px 18px", fontSize: 13, color: "var(--danger, #b3261e)" }}>Não consegui carregar os avisos agora. Se o problema continuar, falta rodar o SQL das notificações no Supabase.</div>}
              {!items.length && !loadErr && <div style={{ padding: "36px 18px", textAlign: "center", color: "var(--muted)", fontSize: 14 }}>Nenhum aviso por enquanto.</div>}
              {items.map((n) => {
                const amt = noticeAmount(n);
                return (
                  <button key={n.id} onClick={() => openItem(n)} data-unread={n.read_at ? "0" : "1"}
                    style={{ width: "100%", display: "flex", gap: 12, alignItems: "flex-start", textAlign: "left", background: n.read_at ? "none" : "var(--accent-soft)", border: "none", borderBottom: "1px solid var(--border2, var(--border))", padding: "14px 18px", cursor: "pointer", fontFamily: "inherit", color: "inherit", minHeight: 64 }}>
                    <span style={{ width: 36, height: 36, borderRadius: 18, background: "var(--surface2)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon name={KIND_ICON[n.kind] || "bell"} size={18} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 15, fontWeight: n.read_at ? 500 : 800, overflowWrap: "anywhere" }}>{n.title}</span>
                      {n.body && <span style={{ display: "block", fontSize: 13, color: "var(--muted)", marginTop: 2, overflowWrap: "anywhere" }}>{n.body}</span>}
                      {amt != null && <span className="notif-amount" style={{ display: "block", fontSize: 13, fontWeight: 700, marginTop: 4 }}>{showValues ? brl(amt) : "R$ ••••"}</span>}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--muted)", flexShrink: 0, whiteSpace: "nowrap" }}>{timeAgo(n.created_at)}</span>
                  </button>
                );
              })}
            </div>

            <div style={{ padding: 12, borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 8 }}>
              {pushStatus === "desligado" && (
                <div>
                  <button onClick={turnOnPush} disabled={busy} style={{ ...mainBtn, width: "100%", opacity: busy ? 0.6 : 1 }}>Receber avisos no celular</button>
                  {pushErr && <div style={{ fontSize: 13, color: "var(--danger, #b3261e)", marginTop: 6 }}>{pushErr}</div>}
                </div>
              )}
              <button onClick={readAll} disabled={!unread} style={{ ...ghostBtn, width: "100%", opacity: unread ? 1 : 0.5 }}>Marcar todos como lidos</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Cartão do Perfil: liga/desliga o push NESTE aparelho e envia um aviso de teste
export function NotificationSettings({ userId }) {
  const [status, setStatus] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(() => getPushStatus().then(setStatus), []);
  useEffect(() => { refresh(); }, [refresh]);

  async function on() {
    setBusy(true); setErr(""); setMsg("");
    try { await enablePush(userId); setMsg("Push ativado neste aparelho."); } catch (e) { setErr(pushErrorText(e)); }
    await refresh(); setBusy(false);
  }
  async function off() { setBusy(true); setErr(""); setMsg(""); await disablePush(); setMsg("Push desligado neste aparelho."); await refresh(); setBusy(false); }
  async function test() {
    setErr(""); setMsg("");
    try { await sendTestNotification(userId); setMsg("Aviso de teste enviado. Ele aparece no sino" + (status === "ligado" ? " e no celular (se o app estiver em segundo plano)." : ".")); }
    catch { setErr("Não consegui enviar o teste. Falta rodar o SQL das notificações no Supabase?"); }
  }

  const hint = { fontSize: 13, color: "var(--muted)", lineHeight: 1.45 };
  const texts = {
    "nao-configurado": "O push ainda não foi configurado neste app (falta a chave VAPID). Os avisos dentro do app, no sino do Início, já funcionam.",
    "bloqueado": "As notificações estão bloqueadas para este site. Libere nas permissões do navegador para ativar o push.",
    "ios-instalar": "No iPhone, o push só funciona com o app instalado: toque em Compartilhar → Adicionar à Tela de Início e abra o LifePlan por lá.",
    "sem-suporte": "Este navegador não suporta push. Os avisos continuam aparecendo no sino do Início.",
  };
  return (
    <div style={{ ...card, display: "flex", flexDirection: "column", gap: 10 }} id="notif-settings">
      <div style={labelStyle}>NOTIFICAÇÕES</div>
      <div style={hint}>Você é avisado quando alguém faz um lançamento para você, faz um fechamento ou marca um fechamento como pago, entra na sua família ou quando uma fatura está perto de vencer. Os avisos nunca mostram valores no texto.</div>
      {texts[status] && <div style={hint}>{texts[status]}</div>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {status === "desligado" && <button onClick={on} disabled={busy} style={mainBtn}>Ativar push neste aparelho</button>}
        {status === "ligado" && <button onClick={off} disabled={busy} style={ghostBtn}>Desligar push neste aparelho</button>}
        <button onClick={test} style={ghostBtn}>Enviar aviso de teste</button>
      </div>
      {status === "ligado" && <div style={{ ...hint, color: "var(--success, var(--accent))", fontWeight: 700 }}>Push ativo neste aparelho.</div>}
      {msg && <div role="status" style={{ fontSize: 13, color: "var(--success, var(--accent))" }}>{msg}</div>}
      {err && <div role="alert" style={{ fontSize: 13, color: "var(--danger, #b3261e)" }}>{err}</div>}
    </div>
  );
}
