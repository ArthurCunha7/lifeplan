// src/App.jsx — LifePlan completo
// Novidades: 🛒 Lista de compras | 🔄 Troca de tipo de treino por dia
import { useState, useMemo, useRef, useEffect, Component } from "react";
import { Icon, Glyph, BottomNav, NAV_SCREENS } from "./ui";
import { LockScreen, PrivacyCover, LockSettings } from "./LockScreen";
import { getPrivacy, clearLock } from "./privacySettings";
import { NotificationBell, NotificationSettings } from "./Notifications";
import { disablePush } from "./notificationsApi";
import { resumoSemanal } from "./weeklySummary";
import { cruzarSaudeDinheiro } from "./crossInsights";
import { MODELOS, treinosDeForca, montarModelo } from "./workoutTemplates";
import { supabase, signUp, signIn, signInWithGoogle, resetPassword, updatePassword, loadUserPlan, saveUserPlan, SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabaseClient";

// Tema compartilhado (cores + fontes), o mesmo arquivo usado pelas páginas em
// iframe. Se preferir, mova esse <link> para o index.html para evitar um
// piscar de cores no primeiro carregamento.
if(typeof document!=='undefined'&&!document.getElementById('lifeplan-theme')){
  const l=document.createElement('link');
  l.id='lifeplan-theme'; l.rel='stylesheet'; l.href='/lifeplan-theme.css';
  document.head.appendChild(l);
}

// ── TACO DB ───────────────────────────────────────────────────────────────────
const TACO_DB = [{"id":1,"n":"Arroz, integral, cozido","c":"Cereais","e":124,"p":2.6,"l":1.0,"cb":25.8},{"id":3,"n":"Arroz, tipo 1, cozido","c":"Cereais","e":128,"p":2.5,"l":0.2,"cb":28.1},{"id":7,"n":"Aveia, flocos, crua","c":"Cereais","e":394,"p":13.9,"l":8.5,"cb":66.6},{"id":52,"n":"Pão, trigo, forma, integral","c":"Cereais","e":253,"p":9.4,"l":3.7,"cb":49.9},{"id":53,"n":"Pão, trigo, francês","c":"Cereais","e":300,"p":8.0,"l":3.1,"cb":58.6},{"id":88,"n":"Batata, doce, cozida","c":"Vegetais","e":77,"p":0.6,"l":0.1,"cb":18.4},{"id":91,"n":"Batata, inglesa, cozida","c":"Vegetais","e":52,"p":1.2,"l":0.0,"cb":11.9},{"id":100,"n":"Brócolis, cozido","c":"Vegetais","e":25,"p":2.1,"l":0.5,"cb":4.4},{"id":109,"n":"Cenoura, cozida","c":"Vegetais","e":30,"p":0.8,"l":0.2,"cb":6.7},{"id":116,"n":"Couve, manteiga, refogada","c":"Vegetais","e":90,"p":1.7,"l":6.6,"cb":8.7},{"id":129,"n":"Mandioca, cozida","c":"Vegetais","e":125,"p":0.6,"l":0.3,"cb":30.1},{"id":157,"n":"Tomate, com semente, cru","c":"Vegetais","e":15,"p":1.1,"l":0.2,"cb":3.1},{"id":179,"n":"Banana, nanica, crua","c":"Frutas","e":92,"p":1.4,"l":0.1,"cb":23.8},{"id":182,"n":"Banana, prata, crua","c":"Frutas","e":98,"p":1.3,"l":0.1,"cb":26.0},{"id":222,"n":"Maçã, Fuji, com casca, crua","c":"Frutas","e":56,"p":0.3,"l":0.0,"cb":15.2},{"id":226,"n":"Mamão, Papaia, cru","c":"Frutas","e":40,"p":0.5,"l":0.1,"cb":10.4},{"id":239,"n":"Morango, cru","c":"Frutas","e":30,"p":0.9,"l":0.3,"cb":6.8},{"id":277,"n":"Atum, conserva em óleo","c":"Pescados","e":166,"p":26.2,"l":6.0,"cb":0},{"id":315,"n":"Salmão, filé, grelhado","c":"Pescados","e":229,"p":23.9,"l":14.0,"cb":0},{"id":318,"n":"Sardinha, assada","c":"Pescados","e":164,"p":32.2,"l":3.0,"cb":0},{"id":326,"n":"Carne, bovina, acém, moído, cozido","c":"Carnes","e":212,"p":26.7,"l":10.9,"cb":0},{"id":381,"n":"Carne, bovina, picanha, grelhada","c":"Carnes","e":289,"p":26.4,"l":19.5,"cb":0},{"id":395,"n":"Frango, coração, grelhado","c":"Carnes","e":207,"p":22.4,"l":12.1,"cb":0.6},{"id":396,"n":"Frango, coxa, com pele, assada","c":"Carnes","e":215,"p":28.5,"l":10.4,"cb":0.1},{"id":408,"n":"Frango, peito, sem pele, cozido","c":"Carnes","e":163,"p":31.5,"l":3.2,"cb":0},{"id":410,"n":"Frango, peito, sem pele, grelhado","c":"Carnes","e":159,"p":32.0,"l":2.5,"cb":0},{"id":413,"n":"Frango, sobrecoxa, sem pele, assada","c":"Carnes","e":233,"p":29.2,"l":12.0,"cb":0},{"id":448,"n":"Iogurte, natural","c":"Laticínios","e":51,"p":4.1,"l":3.0,"cb":1.9},{"id":449,"n":"Iogurte, natural, desnatado","c":"Laticínios","e":41,"p":3.8,"l":0.3,"cb":5.8},{"id":461,"n":"Queijo, minas, frescal","c":"Laticínios","e":264,"p":17.4,"l":20.2,"cb":3.2},{"id":463,"n":"Queijo, mozarela","c":"Laticínios","e":330,"p":22.6,"l":25.2,"cb":3.0},{"id":469,"n":"Queijo, ricota","c":"Laticínios","e":140,"p":12.6,"l":8.1,"cb":3.8},{"id":486,"n":"Ovo, de galinha, clara, cozida","c":"Ovos","e":59,"p":13.4,"l":0.1,"cb":0},{"id":488,"n":"Ovo, de galinha, inteiro, cozido","c":"Ovos","e":146,"p":13.3,"l":9.5,"cb":0.6},{"id":489,"n":"Ovo, de galinha, inteiro, cru","c":"Ovos","e":143,"p":13.0,"l":8.9,"cb":1.6},{"id":557,"n":"Amendoim, grão, cru","c":"Leguminosas","e":544,"p":27.2,"l":43.9,"cb":20.3},{"id":561,"n":"Feijão, carioca, cozido","c":"Leguminosas","e":76,"p":4.8,"l":0.5,"cb":13.6},{"id":567,"n":"Feijão, preto, cozido","c":"Leguminosas","e":77,"p":4.5,"l":0.5,"cb":14.0},{"id":577,"n":"Lentilha, cozida","c":"Leguminosas","e":93,"p":6.3,"l":0.5,"cb":16.3},{"id":584,"n":"Soja, queijo (tofu)","c":"Leguminosas","e":64,"p":6.6,"l":4.0,"cb":2.1},{"id":589,"n":"Castanha-do-Brasil, crua","c":"Nozes","e":643,"p":14.5,"l":63.5,"cb":15.1},{"id":594,"n":"Linhaça, semente","c":"Nozes","e":495,"p":14.1,"l":32.3,"cb":43.3},{"id":507,"n":"Mel, de abelha","c":"Doces","e":309,"p":0,"l":0,"cb":84.0},{"id":1001,"n":"Frango, peito, sem pele, cru","c":"Carnes","e":119,"p":21.5,"l":3.0,"cb":0},{"id":1002,"n":"Frango, peito, com pele, cru","c":"Carnes","e":149,"p":20.8,"l":6.7,"cb":0},{"id":1003,"n":"Frango, coxa, sem pele, crua","c":"Carnes","e":120,"p":17.8,"l":4.9,"cb":0},{"id":1004,"n":"Carne, bovina, picanha, com gordura, crua","c":"Carnes","e":213,"p":18.8,"l":14.7,"cb":0},{"id":1005,"n":"Salmão, sem pele, fresco, cru","c":"Pescados","e":170,"p":19.3,"l":9.7,"cb":0},{"id":1006,"n":"Macarrão, trigo, cozido","c":"Cereais","e":102,"p":3.3,"l":1.3,"cb":19.9},{"id":1007,"n":"Leite, de vaca, integral","c":"Laticínios","e":61,"p":2.9,"l":3.2,"cb":4.3},{"id":1008,"n":"Leite, de vaca, desnatado","c":"Laticínios","e":35,"p":3.4,"l":0.2,"cb":4.9},{"id":1009,"n":"Alface, crua","c":"Vegetais","e":11,"p":1.4,"l":0.2,"cb":1.7},{"id":1010,"n":"Laranja, pêra, crua","c":"Frutas","e":37,"p":1.0,"l":0.1,"cb":8.9},{"id":1011,"n":"Abacate, cru","c":"Frutas","e":96,"p":1.2,"l":8.4,"cb":6.0},{"id":1012,"n":"Uva, rosada, crua","c":"Frutas","e":53,"p":0.7,"l":0.2,"cb":13.3},{"id":1013,"n":"Pepino, cru","c":"Vegetais","e":10,"p":0.9,"l":0.1,"cb":2.0},{"id":1014,"n":"Pimentão, vermelho, cru","c":"Vegetais","e":26,"p":1.1,"l":0.2,"cb":6.0},{"id":1015,"n":"Abobrinha, cozida","c":"Vegetais","e":19,"p":1.2,"l":0.3,"cb":4.1}];
const TACO_MAP = Object.fromEntries(TACO_DB.map(t => [t.id, t]));

// ── TIPOS DE TREINO disponíveis para troca ────────────────────────────────────
const WORKOUT_TYPES = [
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
      { typeLabel:'Cardio – Longo',          detail:'Bike + Corrida 1h30',                              exercises:'Bicicleta 50min + Corrida 40min – sessão longa' },
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
const ACTIVITY_FACTORS = {
  sedentario:    { label:'Sedentário (sem exercício)',       factor:1.2   },
  leve:          { label:'Leve (1-3x/semana)',               factor:1.375 },
  moderado:      { label:'Moderado (3-5x/semana)',           factor:1.55  },
  intenso:       { label:'Intenso (6-7x/semana)',            factor:1.725 },
  muito_intenso: { label:'Muito intenso (2x/dia ou atleta)', factor:1.9   },
};
const GOAL_ADJUSTMENTS = {
  emagrecer_rapido:{ label:'Emagrecer rápido (-500 kcal)',    delta:-500, pf:2.2 },
  emagrecer:       { label:'Emagrecer (-250 kcal)',           delta:-250, pf:2.0 },
  manter:          { label:'Manter peso',                     delta:0,    pf:1.8 },
  ganhar_massa:    { label:'Ganhar massa (+250 kcal)',        delta:+250,  pf:2.2 },
  ganhar_rapido:   { label:'Ganhar massa rápido (+500 kcal)', delta:+500, pf:2.4 },
};

function calcTDEE({ weight, height, age, sex, activity }) {
  const bmr = sex==='M' ? 10*weight+6.25*height-5*age+5 : 10*weight+6.25*height-5*age-161;
  return Math.round(bmr*(ACTIVITY_FACTORS[activity]?.factor||1.55));
}
function calcTargets({ weight, tdee, goal }) {
  const adj=GOAL_ADJUSTMENTS[goal]||GOAL_ADJUSTMENTS.manter;
  const kcal=tdee+adj.delta, prot=Math.round(weight*adj.pf);
  const fat=Math.round((kcal*0.25)/9);
  return { kcal, prot, fat, carbs:Math.round((kcal-prot*4-fat*9)/4) };
}

// ── GERADOR DE PLANO ──────────────────────────────────────────────────────────
function generatePlan(profile) {
  const tdee=calcTDEE(profile), tgt=calcTargets({weight:+profile.weight,tdee,goal:profile.goal});
  const isLoss=tgt.kcal<tdee, isGain=tgt.kcal>tdee;
  const proteins=isLoss?[410,408,486,277,318]:isGain?[410,413,381,395,315]:[410,408,326,277,413];
  const carbSrcs=isLoss?[88,1,91]:[3,88,1,129];
  const veggies=[100,109,116,157], snacks=isLoss?[448,469,222,239]:[448,7,182,557], fatSrcs=[589,594,557];
  const DAYS=['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];
  const TYPES=['strength','strength','cardio','strength','strength','cardio','rest'];
  const DEFAULT_WORKOUTS=[
    {typeLabel:'Treino A – Leg Front',detail:'Agachamento · Leg Press',exercises:'Agachamento 4×8 · Leg Press 4×10 · Cadeira Extensora 4×12'},
    {typeLabel:'Treino B – Upper',detail:'Supino · Remada',exercises:'Supino 4×8 · Pull-up 3×10 · Remada 3×8 · Desenvolvimento 3×8'},
    {typeLabel:'Cardio – Bike',detail:'Bicicleta ergométrica 40min',exercises:'Bicicleta ergométrica 40 min moderado'},
    {typeLabel:'Treino C – Posterior',detail:'RDL · Hip Thrust',exercises:'RDL 4×8 · Mesa Flexora 3×10 · Hip Thrust 4×10'},
    {typeLabel:'Treino D – Braços',detail:'Rosca · Tríceps',exercises:'Rosca Direta 4×10 · Tríceps Polia 4×10 · Elevação Lateral 3×12'},
    {typeLabel:'Cardio – Longo',detail:'Bike + Corrida 1h30',exercises:'Bicicleta 50min + Corrida 40min'},
    {typeLabel:'Descanso',detail:'Recuperação ativa',exercises:'Nenhum treino – foco em recuperação'},
  ];
  function mkFood(tacoId,qty){
    const t=TACO_MAP[tacoId]; if(!t) return null;
    const f=qty/100;
    return {id:'g'+Math.random().toString(36).slice(2),name:t.n,qty,tacoId,kcal:Math.round(t.e*f),p:+((t.p*f).toFixed(1)),l:+((t.l*f).toFixed(1)),cb:+((t.cb*f).toFixed(1))};
  }
  const protQty=Math.max(80,Math.round((tgt.prot/6)/(TACO_MAP[proteins[0]].p/100)));
  const carbQty=Math.max(80,Math.round((tgt.carbs/4)/(TACO_MAP[carbSrcs[0]].cb/100)));
  return DAYS.map((name,i)=>{
    const p1=proteins[i%proteins.length],p2=proteins[(i+2)%proteins.length];
    const c1=carbSrcs[i%carbSrcs.length],c2=carbSrcs[(i+1)%carbSrcs.length];
    const v1=veggies[i%veggies.length],ft=fatSrcs[i%fatSrcs.length];
    const isRest=TYPES[i]==='rest', burned=TYPES[i]==='cardio'?700:TYPES[i]==='strength'?400:0;
    const wk=DEFAULT_WORKOUTS[i];
    const meals=[
      {time:'07:00',name:'Café da Manhã',icon:'sun',foods:[mkFood(7,Math.round(tgt.kcal*0.22*0.35/(TACO_MAP[7].e/100))),mkFood(488,Math.round(tgt.kcal*0.22*0.30/(TACO_MAP[488].e/100))),mkFood(182,120),mkFood(448,150)].filter(Boolean)},
      {time:'10:00',name:'Lanche 1',icon:'droplet',foods:[mkFood(snacks[0],200),mkFood(snacks[2]||222,150),mkFood(ft,15)].filter(Boolean)},
      {time:'13:00',name:'Almoço',icon:'utensils',foods:[mkFood(p1,Math.round(protQty*1.1)),mkFood(c1,Math.round(carbQty*1.2)),mkFood(561,100),mkFood(v1,100)].filter(Boolean)},
      !isRest&&{time:'16:30',name:'Pré-Treino',icon:'zap',foods:[mkFood(c2,Math.round(carbQty*0.8)),mkFood(p2,Math.round(protQty*0.7))].filter(Boolean)},
      {time:isRest?'19:00':'20:00',name:isRest?'Jantar':'Pós-Treino / Jantar',icon:'dumbbell',foods:[mkFood(p2,Math.round(protQty)),mkFood(c1,Math.round(carbQty*0.9)),mkFood(v1,80)].filter(Boolean)},
      {time:'22:00',name:'Ceia',icon:'moon',foods:[mkFood(488,100),mkFood(469,60)].filter(Boolean)},
    ].filter(Boolean);
    return {id:i,name,short:name.slice(0,3).toUpperCase(),fullName:name+(i<5?'-Feira':''),
      type:TYPES[i],typeLabel:wk.typeLabel,detail:wk.detail,exercises:wk.exercises,
      calories:meals.reduce((s,m)=>s+m.foods.reduce((a,f)=>a+f.kcal,0),0),burned,meals};
  });
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
export function searchTACO(query,limit=9){
  if(!query||query.length<2) return [];
  const norm=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ');
  const terms=norm(query).split(' ').filter(Boolean);
  return TACO_DB.map(t=>({...t,score:terms.reduce((s,w)=>norm(t.n).includes(w)?s+1:s-1,0)}))
    .filter(t=>t.score>0).sort((a,b)=>b.score-a.score).slice(0,limit);
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const S={
  wrap:   {minHeight:'100vh',background:'var(--bg)',color:'var(--text)',fontFamily:'var(--font-body)',paddingBottom:110},
  header: {background:'var(--surface)',borderBottom:'1px solid var(--border)',padding:'16px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:100,boxShadow:'0 1px 6px rgba(0,0,0,0.04)'},
  card:   {background:'var(--surface)',border:'1px solid var(--border)',borderRadius:16,margin:'0 16px 12px',padding:'16px'},
  input:  {width:'100%',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,color:'var(--text)',fontSize:14,padding:'10px 12px',minHeight:44,outline:'none',boxSizing:'border-box'},
  select: {width:'100%',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,color:'var(--text)',fontSize:14,padding:'10px 12px',minHeight:44,outline:'none',boxSizing:'border-box'},
  label:  {fontSize:12,fontWeight:700,color:'var(--muted2)',marginBottom:6,display:'block',letterSpacing:.8},
  badge:  c=>({background:`color-mix(in srgb, ${c} 16%, transparent)`,color:c,padding:'3px 8px',borderRadius:8,fontWeight:700,fontSize:12}),
  btn:    (c='var(--accent)')=>({background:c,border:'none',borderRadius:10,color:'var(--on-accent)',padding:'12px 18px',minHeight:44,fontSize:14,fontWeight:700,cursor:'pointer'}),
  // bottom nav
  nav:    {position:'fixed',bottom:0,left:0,right:0,background:'var(--surface)',borderTop:'1px solid var(--border)',display:'flex',zIndex:100},
  navBtn: active=>({flex:1,background:'none',border:'none',padding:'12px 0 10px',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:3,color:active?'var(--accent)':'var(--muted)'}),
};

// ── AUTH PAGES ────────────────────────────────────────────────────────────────
function AuthWrap({children}){
  return(
    <div className="narrow-tab" style={{minHeight:'100vh',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{width:'100%',maxWidth:400,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:24,padding:32}}>{children}</div>
    </div>
  );
}
function LoginPage({onSwitch,onLogin}){
  const [email,setEmail]=useState(''),[ password,setPassword]=useState(''),[ err,setErr]=useState(''),[ loading,setLoading]=useState(false);
  const [forgotMode,setForgotMode]=useState(false);
  const [forgotEmail,setForgotEmail]=useState('');
  const [forgotSent,setForgotSent]=useState(false);
  async function handle(){
    if(!email||!password){setErr('Preencha todos os campos');return;}
    setLoading(true);
    try{await signIn({email,password});onLogin();}catch(e){setErr(e.message||'Email ou senha incorretos');}finally{setLoading(false);}
  }
  async function handleGoogle(){
    setLoading(true);
    try{await signInWithGoogle();}catch(e){setErr(e.message||'Erro ao entrar com Google');}finally{setLoading(false);}
  }
  async function handleForgot(){
    if(!forgotEmail){setErr('Digite seu e-mail');return;}
    setLoading(true);setErr('');
    try{await resetPassword(forgotEmail);setForgotSent(true);}
    catch(e){setErr(e.message||'Erro ao enviar o link');}
    finally{setLoading(false);}
  }
  if(forgotMode) return(
    <AuthWrap>
      <div style={{textAlign:'center',marginBottom:28}}><div style={{fontSize:20,fontWeight:800,color:'var(--text)'}}>Recuperar senha</div></div>
      {forgotSent?(
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:13,color:'var(--muted2)',lineHeight:1.6,marginBottom:22}}>Se <b>{forgotEmail}</b> tiver uma conta, enviamos um link para você criar uma senha nova. Confira sua caixa de entrada (e o spam).</div>
          <button style={{...S.btn('var(--success)'),width:'100%',padding:13}} onClick={()=>{setForgotMode(false);setForgotSent(false);}}>Voltar para o login</button>
        </div>
      ):(
        <>
          <label style={S.label}>SEU E-MAIL</label>
          <input style={{...S.input,marginBottom:16}} type="email" placeholder="seu@email.com" value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleForgot()}/>
          {err&&<div style={{color:'var(--danger)',fontSize:12,marginBottom:12,textAlign:'center'}}>{err}</div>}
          <button style={{...S.btn('var(--success)'),width:'100%',padding:13,marginBottom:12,opacity:loading?.6:1}} onClick={handleForgot} disabled={loading}>{loading?'Enviando…':'Enviar link de recuperação'}</button>
          <div style={{textAlign:'center'}}><button style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:12}} onClick={()=>{setForgotMode(false);setErr('');}}>← Voltar para o login</button></div>
        </>
      )}
    </AuthWrap>
  );
  return(
    <AuthWrap>
      <div style={{textAlign:'center',marginBottom:28}}><div style={{fontFamily:'var(--font-display)',fontSize:34,fontWeight:600,color:'var(--accent)'}}>LifePlan</div><div style={{fontSize:12,color:'var(--muted)',marginTop:4}}>Tabela TACO · NEPA/UNICAMP</div></div>
      <div style={{fontSize:20,fontWeight:800,color:'var(--text)',textAlign:'center',marginBottom:24}}>Bem-vindo de volta</div>
      <button style={{width:'100%',padding:13,marginBottom:16,borderRadius:10,border:'1px solid var(--border2)',background:'var(--surface)',color:'var(--text)',fontSize:14,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:10}} onClick={handleGoogle} disabled={loading}>
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" style={{width:20,height:20}}/>
        Entrar com Google
      </button>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
        <div style={{flex:1,height:1,background:'var(--border)'}}/>
        <span style={{fontSize:12,color:'var(--muted)',fontWeight:600}}>OU</span>
        <div style={{flex:1,height:1,background:'var(--border)'}}/>
      </div>
      <label style={S.label}>E-MAIL</label>
      <input style={{...S.input,marginBottom:12}} type="email" placeholder="seu@email.com" value={email} onChange={e=>setEmail(e.target.value)}/>
      <label style={S.label}>SENHA</label>
      <input style={{...S.input,marginBottom:8}} type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handle()}/>
      <div style={{textAlign:'right',marginBottom:16}}><button style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:12}} onClick={()=>{setForgotMode(true);setErr('');}}>Esqueci minha senha</button></div>
      {err&&<div style={{color:'var(--danger)',fontSize:12,marginBottom:12,textAlign:'center'}}>{err}</div>}
      <button style={{...S.btn('var(--success)'),width:'100%',padding:13,marginBottom:16,opacity:loading?.6:1}} onClick={handle} disabled={loading}>{loading?'Entrando…':'Entrar'}</button>
      <div style={{textAlign:'center',fontSize:13,color:'var(--muted)'}}>Não tem conta?{' '}<button style={{background:'none',border:'none',color:'var(--accent)',cursor:'pointer',fontWeight:700,textDecoration:'underline',padding:'12px 4px'}} onClick={onSwitch}>Cadastrar →</button></div>
    </AuthWrap>
  );
}
function ResetPasswordPage({onDone}){
  const [pass,setPass]=useState(''),[confirm,setConfirm]=useState(''),[err,setErr]=useState(''),[loading,setLoading]=useState(false),[done,setDone]=useState(false);
  async function handle(){
    if(pass.length<6){setErr('Senha mínima: 6 caracteres');return;}
    if(pass!==confirm){setErr('Senhas não conferem');return;}
    setLoading(true);setErr('');
    try{await updatePassword(pass);setDone(true);setTimeout(onDone,1800);}
    catch(e){setErr(e.message||'Erro ao definir a nova senha');}
    finally{setLoading(false);}
  }
  return(
    <AuthWrap>
      <div style={{textAlign:'center',marginBottom:28}}><div style={{fontSize:20,fontWeight:800,color:'var(--text)'}}>Defina sua nova senha</div></div>
      {done?(
        <div style={{textAlign:'center',fontSize:14,color:'var(--accent-dark)',fontWeight:700}}>Senha alterada! Levando você para o app...</div>
      ):(
        <>
          <label style={S.label}>NOVA SENHA</label>
          <input style={{...S.input,marginBottom:12}} type="password" placeholder="mínimo 6 caracteres" value={pass} onChange={e=>setPass(e.target.value)}/>
          <label style={S.label}>CONFIRME A NOVA SENHA</label>
          <input style={{...S.input,marginBottom:16}} type="password" placeholder="repita a senha" value={confirm} onChange={e=>setConfirm(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handle()}/>
          {err&&<div style={{color:'var(--danger)',fontSize:12,marginBottom:12,textAlign:'center'}}>{err}</div>}
          <button style={{...S.btn('var(--success)'),width:'100%',padding:13,opacity:loading?.6:1}} onClick={handle} disabled={loading}>{loading?'Salvando…':'Salvar nova senha'}</button>
        </>
      )}
    </AuthWrap>
  );
}
function RegisterPage({onSwitch,onLogin}){
  const [form,setForm]=useState({name:'',email:'',password:'',confirm:''}),[err,setErr]=useState(''),[loading,setLoading]=useState(false),[needsConfirm,setNeedsConfirm]=useState(false);
  const set=k=>e=>setForm(f=>({...f,[k]:e.target.value}));
  async function handle(){
    if(!form.name||!form.email||!form.password){setErr('Preencha todos os campos');return;}
    if(form.password.length<6){setErr('Senha mínima: 6 caracteres');return;}
    if(form.password!==form.confirm){setErr('Senhas não conferem');return;}
    setLoading(true);
    try{
      const data=await signUp({email:form.email,password:form.password,name:form.name});
      if(data?.session){onLogin();}
      else{setNeedsConfirm(true);} // projeto exige confirmação de e-mail — ainda não há sessão
    }catch(e){setErr(e.message||'Erro ao criar conta');}finally{setLoading(false);}
  }
  async function handleGoogle(){
    setLoading(true);
    try{await signInWithGoogle();}catch(e){setErr(e.message||'Erro ao entrar com Google');}finally{setLoading(false);}
  }
  if(needsConfirm) return(
    <AuthWrap>
      <div style={{textAlign:'center'}}>
        
        <div style={{fontSize:20,fontWeight:800,color:'var(--text)',marginBottom:10}}>Confirme seu e-mail</div>
        <div style={{fontSize:13,color:'var(--muted2)',lineHeight:1.6,marginBottom:20}}>Enviamos um link de confirmação para <b>{form.email}</b>. Toque nele para ativar sua conta e depois volte para entrar.</div>
        <button style={{...S.btn('var(--success)'),width:'100%',padding:13}} onClick={onSwitch}>Ir para o login</button>
      </div>
    </AuthWrap>
  );
  return(
    <AuthWrap>
      <div style={{textAlign:'center',marginBottom:24}}><div style={{fontFamily:'var(--font-display)',fontSize:34,fontWeight:600,color:'var(--accent)'}}>LifePlan</div></div>
      <div style={{fontSize:20,fontWeight:800,color:'var(--text)',textAlign:'center',marginBottom:24}}>Criar conta</div>
      <button style={{width:'100%',padding:13,marginBottom:16,borderRadius:10,border:'1px solid var(--border2)',background:'var(--surface)',color:'var(--text)',fontSize:14,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:10}} onClick={handleGoogle} disabled={loading}>
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" style={{width:20,height:20}}/>
        Cadastrar com Google
      </button>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
        <div style={{flex:1,height:1,background:'var(--border)'}}/>
        <span style={{fontSize:12,color:'var(--muted)',fontWeight:600}}>OU</span>
        <div style={{flex:1,height:1,background:'var(--border)'}}/>
      </div>
      {[['name','','NOME','Seu nome'],['email','','E-MAIL','seu@email.com'],['password','','SENHA','Mín. 6 caracteres'],['confirm','','CONFIRMAR','Repita a senha']].map(([k,ic,lb,ph])=>(
        <div key={k} style={{marginBottom:12}}><label style={S.label}>{ic} {lb}</label><input style={S.input} type={k==='password'||k==='confirm'?'password':'text'} placeholder={ph} value={form[k]} onChange={set(k)}/></div>
      ))}
      {err&&<div style={{color:'var(--danger)',fontSize:12,margin:'8px 0',textAlign:'center'}}>{err}</div>}
      <button style={{...S.btn('var(--success)'),width:'100%',padding:13,marginTop:8,marginBottom:16,opacity:loading?.6:1}} onClick={handle} disabled={loading}>{loading?'Criando…':'Criar conta'}</button>
      <div style={{textAlign:'center',fontSize:13,color:'var(--muted)'}}>Já tem conta?{' '}<button style={{background:'none',border:'none',color:'var(--accent)',cursor:'pointer',fontWeight:700,textDecoration:'underline',padding:'12px 4px'}} onClick={onSwitch}>Entrar →</button></div>
    </AuthWrap>
  );
}

// ── PERFIL ────────────────────────────────────────────────────────────────────
// ── PRIVACIDADE E DADOS (LGPD): exportar e excluir a conta ───────────────────
const EXPORT_TABLES=[
  {key:'perfil',table:'profiles',col:'id'},
  {key:'plano_semanal',table:'user_plans',col:'user_id'},
  {key:'treino_e_dieta',table:'app_data',col:'user_id'},
  {key:'medidas_corporais',table:'body_metrics',col:'user_id'},
  {key:'estudos',table:'study_data',col:'user_id'},
  {key:'financas',table:'finance_data',col:'user_id'},
];
const PHOTO_BUCKETS=['progress-photos','receipts'];

async function listPhotoFiles(userId){
  const out=[];
  for(const bucket of PHOTO_BUCKETS){
    const {data,error}=await supabase.storage.from(bucket).list(userId,{limit:1000});
    if(error){ if(/not found/i.test(error.message||'')) continue; throw new Error('Fotos ('+bucket+'): '+error.message); }
    (data||[]).filter(f=>f.name&&f.name!=='.emptyFolderPlaceholder').forEach(f=>out.push({bucket,path:userId+'/'+f.name}));
  }
  return out;
}

async function buildExport(userId){
  const result={exportado_em:new Date().toISOString(),aviso:'Estes são os dados da sua conta no LifePlan. Guarde este arquivo em local seguro: ele contém informações pessoais.'};
  try{const {data:{user}}=await supabase.auth.getUser();result.conta={id:userId,email:user?.email||null,criada_em:user?.created_at||null};}catch(e){result.conta={id:userId};}
  for(const t of EXPORT_TABLES){
    const {data,error}=await supabase.from(t.table).select('*').eq(t.col,userId);
    if(error) result[t.key]={erro:error.message};
    else result[t.key]=t.key==='medidas_corporais'?(data||[]):(data&&data[0]||null);
  }
  try{
    const {data:gastos,error:gErr}=await supabase.from('family_charges').select('*').or('member_id.eq.'+userId+',leader_id.eq.'+userId);
    result.gastos_no_cartao_da_familia=gErr?{erro:gErr.message}:(gastos||[]);
  }catch(e){result.gastos_no_cartao_da_familia={erro:String(e.message||e)};}
  try{
    const {data:ms}=await supabase.from('family_members').select('family_id').eq('user_id',userId);
    const ids=(ms||[]).map(m=>m.family_id);
    if(ids.length){
      const {data:fams}=await supabase.from('families').select('id,owner_id').in('id',ids);
      result.modo_familia=(fams||[]).map(f=>({familia:f.id,papel:f.owner_id===userId?'líder':'membro'}));
    } else result.modo_familia=[];
  }catch(e){result.modo_familia={erro:String(e.message||e)};}
  try{
    const files=await listPhotoFiles(userId);
    result.fotos={observacao:'Os arquivos de imagem não vão dentro deste JSON; aqui estão os nomes. Salve as fotos que quiser antes de excluir a conta.',arquivos:files.map(f=>f.bucket+'/'+f.path)};
  }catch(e){result.fotos={erro:String(e.message||e)};}
  return result;
}

function PrivacyCard({userId,onAccountDeleted}){
  const [open,setOpen]=useState(false),[typed,setTyped]=useState(''),[busy,setBusy]=useState(''),[err,setErr]=useState('');
  const [leader,setLeader]=useState(false),[exportMsg,setExportMsg]=useState('');
  const confirmed=typed.trim().toUpperCase()==='EXCLUIR';

  async function doExport(){
    setErr('');setExportMsg('');setBusy('export');
    try{
      const obj=await buildExport(userId);
      const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=url;a.download='lifeplan-meus-dados-'+new Date().toISOString().slice(0,10)+'.json';
      document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),2000);
      setExportMsg('Arquivo gerado. Confira a pasta de downloads.');
    }catch(e){setErr('Não foi possível gerar o arquivo: '+(e.message||e));}
    finally{setBusy('');}
  }

  async function openDelete(){
    setTyped('');setErr('');setExportMsg('');setOpen(true);
    try{
      const {data}=await supabase.from('families').select('id').eq('owner_id',userId);
      setLeader(!!(data&&data.length));
    }catch(e){setLeader(false);}
  }

  async function doDelete(){
    if(!confirmed||busy) return;
    setErr('');setBusy('delete');
    try{
      // 1) fotos (o banco não consegue apagar arquivos do Storage por SQL)
      const files=await listPhotoFiles(userId);
      for(const bucket of PHOTO_BUCKETS){
        const paths=files.filter(f=>f.bucket===bucket).map(f=>f.path);
        for(let i=0;i<paths.length;i+=100){
          const {error}=await supabase.storage.from(bucket).remove(paths.slice(i,i+100));
          if(error) throw new Error('Não foi possível apagar as fotos: '+error.message);
        }
      }
      // 2) dados e login
      const {error}=await supabase.rpc('delete_my_account',{confirmacao:'EXCLUIR'});
      if(error){
        if(/could not find the function|does not exist/i.test(error.message||'')) throw new Error('A exclusão ainda não foi ativada no banco de dados. Avise o administrador do app.');
        throw new Error(error.message);
      }
      alert('Sua conta e todos os seus dados foram excluídos.');
      await onAccountDeleted();
    }catch(e){setErr(e.message||String(e));setBusy('');}
  }

  const btnGhost={...S.btn('var(--surface2)'),color:'var(--text)',border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',gap:8,minHeight:48};
  return(
    <div style={{...S.card,display:'flex',flexDirection:'column',gap:12}}>
      <div style={{fontSize:12,fontWeight:700,color:'var(--muted)',letterSpacing:.8}}>PRIVACIDADE E DADOS</div>
      <div style={{fontSize:14,color:'var(--text-2)',lineHeight:1.5}}>Seus dados são seus. Você pode baixar uma cópia de tudo o que está guardado na sua conta ou excluí-la a qualquer momento.</div>
      <button onClick={doExport} disabled={!!busy} style={{...btnGhost,opacity:busy?.6:1}}><Icon name="download" size={18}/>{busy==='export'?'Gerando arquivo…':'Baixar meus dados'}</button>
      {exportMsg&&<div role="status" style={{fontSize:13,color:'var(--success)'}}>{exportMsg}</div>}
      {!open&&err&&<div role="alert" style={{fontSize:13,color:'var(--warning)'}}>{err}</div>}
      <button onClick={openDelete} disabled={!!busy} style={{...btnGhost,color:'var(--danger)'}}><Icon name="trash" size={18}/>Excluir minha conta</button>
      {open&&(
        <div style={{position:'fixed',inset:0,background:'rgba(16,22,18,0.55)',zIndex:400,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={()=>!busy&&setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="Excluir minha conta" onClick={e=>e.stopPropagation()} style={{background:'var(--surface)',borderRadius:'20px 20px 0 0',width:'100%',maxWidth:520,padding:20,maxHeight:'92vh',overflowY:'auto',boxSizing:'border-box'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
              <span style={{color:'var(--danger)',display:'flex'}}><Icon name="trash" size={22}/></span>
              <div style={{fontFamily:'var(--font-display)',fontSize:22,fontWeight:500,color:'var(--text)'}}>Excluir minha conta</div>
            </div>
            <div style={{fontSize:14,color:'var(--text-2)',lineHeight:1.55,marginBottom:12}}>
              Isto apaga <strong>para sempre</strong> seu login e tudo o que você registrou: perfil, plano e treinos, medidas e fotos de progresso, estudos, finanças e fotos de recibos. Não dá para desfazer.
            </div>
            {leader&&<div style={{background:'var(--warning-soft)',color:'var(--warning)',border:'1px solid var(--warning)',borderRadius:12,padding:'10px 12px',fontSize:13,marginBottom:12,lineHeight:1.5}}>Você é o líder de um modo família. Ao excluir a conta, o modo família é desfeito. Os outros membros continuam com os próprios dados e podem criar ou entrar em outro modo família.</div>}
            <button onClick={doExport} disabled={!!busy} style={{...btnGhost,marginBottom:6,opacity:busy?.6:1}}><Icon name="download" size={18}/>{busy==='export'?'Gerando arquivo…':'Baixar meus dados antes'}</button>
            {exportMsg&&<div role="status" style={{fontSize:13,color:'var(--success)',marginBottom:6}}>{exportMsg}</div>}
            <label htmlFor="del-confirm" style={{...S.label,marginTop:12}}>PARA CONFIRMAR, DIGITE EXCLUIR</label>
            <input id="del-confirm" style={S.input} value={typed} onChange={e=>setTyped(e.target.value)} autoComplete="off" autoCapitalize="characters" placeholder="EXCLUIR" disabled={!!busy}/>
            {err&&<div role="alert" style={{fontSize:13,color:'var(--warning)',marginTop:10,lineHeight:1.5}}>{err}</div>}
            <div style={{display:'flex',gap:10,marginTop:16}}>
              <button onClick={()=>setOpen(false)} disabled={busy==='delete'} style={{...btnGhost,flex:1}}>Cancelar</button>
              <button onClick={doDelete} disabled={!confirmed||!!busy} style={{...S.btn('var(--danger)'),flex:1,minHeight:48,opacity:(!confirmed||busy)?.45:1,cursor:(!confirmed||busy)?'not-allowed':'pointer'}}>{busy==='delete'?'Excluindo…':'Excluir tudo'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfilePage({userId,initialProfile,onSave,onBack,onLogout,onAccountDeleted,onLockNow,onLockWipe}){
  const [form,setForm]=useState(initialProfile||{weight:'',height:'',age:'',sex:'M',activity:'moderado',goal:'manter'});
  const [loading,setLoading]=useState(false),[done,setDone]=useState(false);

  // Se já existe um perfil salvo no Supabase (usuário voltando numa nova
  // sessão) e ainda não temos os dados carregados nesta sessão, busca e
  // preenche o formulário — sem isso, o formulário aparecia em branco mesmo
  // para quem já tinha configurado o perfil antes.
  useEffect(()=>{
    if(initialProfile||!userId) return;
    supabase.from('profiles').select('weight,height,age,sex,activity,goal').eq('id',userId).maybeSingle()
      .then(({data})=>{
        if(data&&data.weight) setForm(f=>({...f,...data}));
      });
  },[userId]);

  const set=k=>e=>setForm(f=>({...f,[k]:e.target.value}));
  const tdee=form.weight&&form.height&&form.age?calcTDEE({weight:+form.weight,height:+form.height,age:+form.age,sex:form.sex,activity:form.activity}):null;
  const targets=tdee?calcTargets({weight:+form.weight,tdee,goal:form.goal}):null;
  async function handle(){
    if(!form.weight||!form.height||!form.age){alert('Preencha peso, altura e idade');return;}
    setLoading(true);
    try{
      await supabase.from('profiles').upsert({id:userId,weight:+form.weight,height:+form.height,age:+form.age,sex:form.sex,activity:form.activity,goal:form.goal});
      const newPlan=generatePlan({weight:+form.weight,height:+form.height,age:+form.age,sex:form.sex,activity:form.activity,goal:form.goal});
      // Preserva os treinos que o usuário já tinha aplicado a cada dia — sem
      // isso, editar o perfil (mesmo só o peso) apagava todos os treinos
      // configurados, porque gerava um plano novo do zero a cada vez.
      let mergedPlan=newPlan;
      try{
        const existingPlan=await loadUserPlan(userId);
        if(existingPlan&&existingPlan.length){
          mergedPlan=newPlan.map((day,i)=>{
            const old=existingPlan[i];
            if(old&&old.typeLabel) return {...day,type:old.type,typeLabel:old.typeLabel,exercises:old.exercises};
            return day;
          });
        }
      }catch{}
      await saveUserPlan(userId,mergedPlan);
      setDone(true);setTimeout(()=>onSave(mergedPlan,form),1200);
    }catch(e){alert('Erro: '+e.message);}finally{setLoading(false);}
  }
  return(
    <div style={S.wrap}>
      <div style={S.header}>
        <div style={{fontSize:18,fontWeight:800,color:'var(--text)'}}>Meu perfil</div>
        {onBack&&<button style={{background:'none',border:'1px solid var(--border)',borderRadius:8,color:'var(--muted2)',padding:'6px 12px',fontSize:12,cursor:'pointer'}} onClick={onBack}>← Voltar</button>}
      </div>
      <div style={{padding:'16px 16px 0'}}><div style={{background:'var(--accent-soft)',border:'1px solid var(--border)',borderRadius:14,padding:14,marginBottom:4,fontSize:14,color:'var(--text-2)'}}>Preencha seus dados para gerar um plano alimentar personalizado com alimentos da Tabela TACO.</div></div>
      <div style={S.card}>
        <div style={{fontSize:12,fontWeight:700,color:'var(--muted2)',marginBottom:14,letterSpacing:.8}}>DADOS FÍSICOS</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
          {[['weight','PESO (kg)','ex: 80'],['height','ALTURA (cm)','ex: 175'],['age','IDADE','ex: 25']].map(([k,lb,ph])=>(
            <div key={k}><label style={S.label}>{lb}</label><input style={S.input} type="number" placeholder={ph} value={form[k]} onChange={set(k)}/></div>
          ))}
          <div><label style={S.label}>SEXO</label><select style={S.select} value={form.sex} onChange={set('sex')}><option value="M">Masculino</option><option value="F">Feminino</option></select></div>
        </div>
        <div style={{marginBottom:12}}><label style={S.label}>NÍVEL DE ATIVIDADE</label><select style={S.select} value={form.activity} onChange={set('activity')}>{Object.entries(ACTIVITY_FACTORS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></div>
        <div><label style={S.label}>OBJETIVO</label><select style={S.select} value={form.goal} onChange={set('goal')}>{Object.entries(GOAL_ADJUSTMENTS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></div>
      </div>
      {targets&&(
        <div style={{...S.card,background:'var(--success-soft)',border:'1px solid var(--border)'}}>
          <div style={{fontSize:12,fontWeight:700,color:'var(--success)',marginBottom:12,letterSpacing:.8}}>SEU PLANO CALCULADO</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:10}}>
            {[['flame','TDEE',tdee+' kcal'],['utensils','Meta',targets.kcal+' kcal'],['dumbbell','Proteína',targets.prot+'g'],['leaf','Gordura',targets.fat+'g'],['activity','Carbs',targets.carbs+'g'],['scale','IMC',(+form.weight/(((+form.height)/100)**2)).toFixed(1)]].map(([ic,lb,vl])=>(
              <div key={lb} style={{background:'var(--surface)',borderRadius:10,padding:'10px 8px',textAlign:'center'}}>
                <div style={{marginBottom:4,color:'var(--accent)',display:'flex',justifyContent:'center'}}><Glyph name={ic} size={20}/></div>
                <div style={{fontSize:14,fontWeight:800,color:'var(--text)'}}>{vl}</div>
                <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>{lb}</div>
              </div>
            ))}
          </div>
          <div style={{fontSize:12,color:'var(--muted)',textAlign:'center'}}>Fórmula Mifflin-St Jeor · 30% proteína · 25% gordura · 45% carboidrato</div>
        </div>
      )}
      {done
        ?<div style={{...S.card,textAlign:'center',background:'var(--success-soft)'}}><div style={{color:'var(--success)',fontWeight:700,fontSize:16}}>Plano gerado com sucesso!</div></div>
        :<div style={{padding:'0 16px 16px'}}><button style={{...S.btn('var(--accent)'),width:'100%',padding:14,fontSize:15,opacity:loading?.6:1}} onClick={handle} disabled={loading}>{loading?'Gerando plano…':'Salvar e gerar plano semanal'}</button></div>
      }
      <div style={{...S.card,display:'flex',flexDirection:'column',gap:12}}>
        <div style={{fontSize:12,fontWeight:700,color:'var(--muted)',letterSpacing:.8}}>APARÊNCIA E CONTA</div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:15,color:'var(--text)'}}>Tema claro ou escuro</span>
          <ThemeToggleButton/>
        </div>
        {onLogout&&(
          <button onClick={onLogout} style={{...S.btn('var(--surface2)'),color:'var(--text)',border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',gap:8,minHeight:48}}>
            <Icon name="logout" size={18}/>Sair da conta
          </button>
        )}
      </div>
      {userId&&<NotificationSettings userId={userId}/>}
      {onLockNow&&<LockSettings userId={userId} onLockNow={onLockNow} onWipe={onLockWipe}/>}
      {onAccountDeleted&&<PrivacyCard userId={userId} onAccountDeleted={onAccountDeleted}/>}
    </div>
  );
}

// ── MODAL TROCA DE TREINO ─────────────────────────────────────────────────────
function WorkoutModal({day,onSelect,onClose,profiles=[]}){
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(16,22,18,0.55)',zIndex:300,display:'flex',alignItems:'flex-end'}} onClick={onClose}>
      <div style={{background:'var(--surface)',borderRadius:'20px 20px 0 0',width:'100%',padding:20,maxHeight:'90vh',overflow:'hidden',display:'flex',flexDirection:'column'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <div style={{fontSize:16,fontWeight:800,color:'var(--text)'}}>Editar Treino — {day.fullName}</div>
          <button style={S.btn('var(--danger)')} onClick={onClose}><Icon name="x" size={18}/></button>
        </div>
        {/* Perfis do usuário */}
        {profiles.length>0&&(
          <>
            <div style={{fontSize:12,color:'var(--muted)',fontWeight:700,marginBottom:8}}>MEUS TREINOS</div>
            <div style={{overflowY:'auto',flex:1,display:'flex',flexDirection:'column',gap:8}}>
              {profiles.map((p,i)=>{
                const color=WORKOUT_TYPES.find(w=>w.type===p.type)?.color||'var(--success)';
                const isActive=day.typeLabel===p.typeLabel;
                return(
                  <div key={i} onClick={()=>onSelect({type:p.type,color,typeLabel:p.typeLabel,exercises:p.exercises||''})}
                    style={{padding:'12px 14px',borderRadius:12,cursor:'pointer',border:'1px solid',
                      ...(isActive?{background:`color-mix(in srgb, ${color} 14%, transparent)`,borderColor:color}:{background:'var(--surface)',borderColor:'var(--surface)'})}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                      <div style={{fontSize:13,fontWeight:700,color:isActive?color:'var(--text)'}}>{p.typeLabel}</div>
                      {isActive&&<span style={S.badge(color)}>✓ Ativo</span>}
                    </div>
                    {p.exercises&&<div style={{fontSize:12,color:'var(--muted)',lineHeight:1.6,whiteSpace:'pre-line',marginTop:4}}>{p.exercises}</div>}
                  </div>
                );
              })}
              {/* Opção descanso */}
              <div onClick={()=>onSelect({type:'rest',color:'var(--muted)',typeLabel:'Descanso',exercises:'Nenhum treino – foco em sono e recuperação'})}
                style={{padding:'12px 14px',borderRadius:12,cursor:'pointer',border:'1px solid',
                  ...(day.type==='rest'?{background:'var(--muted)18',borderColor:'var(--muted)'}:{background:'var(--surface)',borderColor:'var(--surface)'})}}>
                <div style={{fontSize:13,fontWeight:700,color:day.type==='rest'?'var(--muted2)':'var(--text)'}}>Descanso</div>
              </div>
            </div>
          </>
        )}
        {profiles.length===0&&(
          <div style={{textAlign:'center',padding:'32px 0',flex:1}}>
            <div style={{marginBottom:10,color:'var(--muted)',display:'flex',justifyContent:'center'}}><Icon name="dumbbell" size={40} stroke={1.5}/></div>
            <div style={{color:'var(--text)',fontWeight:700,marginBottom:6}}>Nenhum treino criado</div>
            <div style={{color:'var(--muted)',fontSize:12,marginBottom:16}}>Crie seus treinos na aba Treinos para poder selecioná-los aqui.</div>
            <button style={{...S.btn('var(--success)'),padding:'10px 20px'}} onClick={onClose}>Ir para Treinos</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── FOOD SEARCH MODAL ─────────────────────────────────────────────────────────
function FoodModal({onSelect,onClose}){
  const [q,setQ]=useState('');
  const results=useMemo(()=>searchTACO(q),[q]);
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(16,22,18,0.55)',zIndex:200,display:'flex',alignItems:'flex-end'}} onClick={onClose}>
      <div style={{background:'var(--surface)',borderRadius:'20px 20px 0 0',width:'100%',padding:20,maxHeight:'80vh',overflow:'hidden',display:'flex',flexDirection:'column'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',gap:10,marginBottom:16}}>
          <input autoFocus style={S.input} placeholder="Buscar alimento TACO..." value={q} onChange={e=>setQ(e.target.value)}/>
          <button style={S.btn('var(--danger)')} onClick={onClose}><Icon name="x" size={18}/></button>
        </div>
        <div style={{overflowY:'auto',flex:1}}>
          {q.length<2&&<div style={{color:'var(--muted)',textAlign:'center',padding:20,fontSize:13}}>Digite 2+ letras para buscar</div>}
          {results.map(t=>(
            <div key={t.id} style={{padding:'10px 12px',borderRadius:10,cursor:'pointer',marginBottom:6,background:'var(--surface)',border:'1px solid var(--surface)'}} onClick={()=>onSelect(t)}>
              <div style={{fontSize:13,color:'var(--text)',fontWeight:600,marginBottom:4}}>{t.n}</div>
              <div style={{display:'flex',gap:6,fontSize:12}}>
                <span style={S.badge('var(--warning)')}>{t.e} kcal</span>
                <span style={S.badge('var(--info)')}>P {t.p}g</span>
                <span style={S.badge('var(--warning)')}>G {t.l}g</span>
                <span style={S.badge('var(--accent)')}>C {t.cb}g</span>
                <span style={{color:'var(--muted)'}}>por 100g</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── LISTA DE COMPRAS ──────────────────────────────────────────────────────────
function ShoppingList({items,onToggle,onRemove,onClear}){
  const pending=items.filter(i=>!i.checked), done=items.filter(i=>i.checked);
  return(
    <div style={S.wrap}>
      <div style={S.header}>
        <div style={{fontSize:18,fontWeight:800,color:'var(--text)'}}>Lista de Compras</div>
        {done.length>0&&<button style={{...S.btn('var(--muted)'),padding:'6px 12px',fontSize:12}} onClick={onClear}>Limpar comprados</button>}
      </div>

      {items.length===0?(
        <div style={{padding:48,textAlign:'center'}}>
          <div style={{marginBottom:16,color:'var(--muted)',display:'flex',justifyContent:'center'}}><Icon name="cart" size={52} stroke={1.5}/></div>
          <div style={{fontSize:18,fontWeight:700,color:'var(--text)',marginBottom:8}}>Lista vazia</div>
          <div style={{color:'var(--muted)',fontSize:14}}>Toque em ao lado de qualquer alimento no plano para adicioná-lo aqui.</div>
        </div>
      ):(
        <>
          {pending.length>0&&(
            <div style={{...S.card,marginTop:16}}>
              <div style={{fontSize:12,fontWeight:700,color:'var(--muted2)',marginBottom:12,letterSpacing:.8}}>A COMPRAR ({pending.length})</div>
              {pending.map(item=>(
                <div key={item.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:'1px solid var(--surface)'}}>
                  <button onClick={()=>onToggle(item.id)} style={{width:22,height:22,borderRadius:6,border:'2px solid var(--success)',background:'transparent',cursor:'pointer',flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,color:'var(--text)',fontWeight:600}}>{item.name}</div>
                    <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>{item.qty}g · {item.kcal} kcal</div>
                  </div>
                  <button onClick={()=>onRemove(item.id)} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:16,padding:'0 4px'}}><Icon name="x" size={18}/></button>
                </div>
              ))}
            </div>
          )}
          {done.length>0&&(
            <div style={{...S.card,opacity:.6}}>
              <div style={{fontSize:12,fontWeight:700,color:'var(--muted2)',marginBottom:12,letterSpacing:.8}}>COMPRADO ({done.length})</div>
              {done.map(item=>(
                <div key={item.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid var(--surface)'}}>
                  <button onClick={()=>onToggle(item.id)} style={{width:22,height:22,borderRadius:6,border:'2px solid var(--success)',background:'var(--success-soft)',cursor:'pointer',flexShrink:0,fontSize:13}}>✓</button>
                  <div style={{flex:1,textDecoration:'line-through',color:'var(--muted)',fontSize:13}}>{item.name}</div>
                  <button onClick={()=>onRemove(item.id)} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:16,padding:'0 4px'}}><Icon name="x" size={18}/></button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      <div style={{height:80}}/>
    </div>
  );
}


// ── MODELOS DE TREINO ─────────────────────────────────────────────────────────
// Lista de programas prontos; ao tocar em um, mostra a semana inteira antes de aplicar.
function WorkoutTemplates({onApply,onClose}){
  const [sel,setSel]=useState(null);
  const DIAS=['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
  const modelo=MODELOS.find(m=>m.id===sel);
  const cardBase={background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,padding:'14px 16px',marginBottom:10,textAlign:'left',width:'100%',cursor:'pointer',color:'var(--text)',fontFamily:'inherit',display:'block'};
  if(modelo){
    const n=treinosDeForca(modelo);
    return(
      <div data-testid="template-preview" style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:16,padding:16,marginBottom:12,textAlign:'left'}}>
        <div style={{fontSize:16,fontWeight:800,color:'var(--text)'}}>{modelo.nome}</div>
        <div style={{fontSize:13,color:'var(--muted)',margin:'4px 0 12px',lineHeight:1.5}}>{modelo.resumo}</div>
        {modelo.semana.map((d,i)=>(
          <details key={i} style={{borderTop:'1px solid var(--border)',padding:'8px 0'}}>
            <summary style={{cursor:'pointer',fontSize:14,fontWeight:700,color:d.tipo==='rest'?'var(--muted)':'var(--text)',listStyle:'revert'}}>
              <span style={{display:'inline-block',width:36,verticalAlign:'top',color:'var(--muted2)',fontWeight:800}}>{DIAS[i]}</span><span style={{display:'inline-block',verticalAlign:'top',maxWidth:'calc(100% - 48px)'}}>{d.rotulo}</span>
            </summary>
            <div style={{whiteSpace:'pre-line',fontSize:13,lineHeight:1.7,color:'var(--muted2)',padding:'6px 0 2px 36px'}}>{d.exercicios}</div>
          </details>
        ))}
        {modelo.notas&&(
          <details style={{borderTop:'1px solid var(--border)',padding:'8px 0'}}>
            <summary style={{cursor:'pointer',fontSize:14,fontWeight:700,color:'var(--text)'}}>Progressão e dicas</summary>
            <ul style={{margin:'6px 0 0',paddingLeft:20,fontSize:13,lineHeight:1.6,color:'var(--muted2)'}}>
              {modelo.notas.map((t,i)=><li key={i} style={{margin:'4px 0'}}>{t}</li>)}
            </ul>
            {modelo.fonte&&<div style={{fontSize:12,color:'var(--muted)',marginTop:8,lineHeight:1.5}}>{modelo.fonte}</div>}
          </details>
        )}
        <div style={{background:'var(--accent-soft)',borderRadius:12,padding:'10px 12px',margin:'12px 0',fontSize:13,lineHeight:1.5,color:'var(--text)'}}>
          Ao usar este modelo, os 7 dias do seu plano de treino são substituídos e a meta semanal vira {n} {n===1?'treino':'treinos'}. Os treinos que você já salvou continuam na lista.
        </div>
        <div style={{display:'flex',gap:8}}>
          <button style={{...S.btn('var(--success)'),flex:1,padding:11}} onClick={()=>onApply(modelo)}>Usar este modelo</button>
          <button style={{...S.btn('var(--muted)'),padding:11}} onClick={()=>setSel(null)}>Voltar</button>
        </div>
      </div>
    );
  }
  return(
    <div data-testid="template-list" style={{marginBottom:12}}>
      {MODELOS.map(m=>(
        <button key={m.id} style={cardBase} onClick={()=>setSel(m.id)}>
          <div style={{fontSize:15,fontWeight:800}}>{m.nome}</div>
          <div style={{fontSize:13,color:'var(--muted)',marginTop:4,lineHeight:1.5}}>{m.resumo}</div>
        </button>
      ))}
      {onClose&&<button style={{...S.btn('var(--muted)'),padding:'9px 16px',fontSize:13}} onClick={onClose}>Fechar modelos</button>}
    </div>
  );
}

// ── WORKOUT PROFILES PAGE ─────────────────────────────────────────────────────
function WorkoutProfilesPage({profiles,plan,onSave,onDelete,onApplyToDay,onApplyTemplate,onBack,tab,setTab,cartCount,onOpenProfile,onLogout,onHome,workoutGoal,setWorkoutGoal}){
  const [editing,setEditing]=useState(null); // null | profile object
  const [showNew,setShowNew]=useState(false);
  const [showTemplates,setShowTemplates]=useState(false);
  const [applied,setApplied]=useState(null); // texto de confirmação depois de usar um modelo
  function usarModelo(m){
    onApplyTemplate(m); setShowTemplates(false);
    const n=treinosDeForca(m);
    setApplied(`Modelo "${m.nome}" aplicado. Seus 7 dias foram atualizados e a meta virou ${n} ${n===1?'treino':'treinos'} por semana.`);
    try{window.scrollTo({top:0,behavior:'smooth'});}catch{/* sem scroll */}
  }

  function EditForm({initial,onDone}){
    const [form,setForm]=useState(initial||{id:'wp'+Date.now(),type:'strength',typeLabel:'',exercises:''});
    const set=k=>e=>setForm(f=>({...f,[k]:e.target.value}));
    return(
      <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:16,padding:16,marginBottom:12}}>
        <div style={{marginBottom:10}}>
          <label style={S.label}>TIPO</label>
          <div style={{display:'flex',gap:8}}>
            {WORKOUT_TYPES.map(wt=>(
              <button key={wt.type} onClick={()=>setForm(f=>({...f,type:wt.type}))} style={{flex:1,padding:'8px 0',borderRadius:10,border:'1px solid',cursor:'pointer',fontSize:18,
                ...(form.type===wt.type?{background:`color-mix(in srgb, ${wt.color} 14%, transparent)`,borderColor:wt.color}:{background:'var(--surface)',borderColor:'var(--border)'})}}>
                <Glyph name={wt.icon} size={20}/>
              </button>
            ))}
          </div>
        </div>
        <div style={{marginBottom:10}}>
          <label style={S.label}>NOME DO TREINO</label>
          <input style={S.input} value={form.typeLabel} onChange={set('typeLabel')} placeholder="Ex: Treino A – Peito e Tríceps"/>
        </div>
        <div style={{marginBottom:12}}>
          <label style={S.label}>EXERCÍCIOS E SÉRIES</label>
          <textarea style={{...S.input,minHeight:130,resize:'vertical',lineHeight:1.8}} value={form.exercises} onChange={set('exercises')}
            placeholder={"Supino reto 4×8\nSupino inclinado 3×10\nCrucifixo 3×12\nTríceps polia 4×10\nTríceps francês 3×10"}/>
          <div style={{fontSize:12,color:'var(--muted)',marginTop:4}}>Um exercício por linha</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button style={{...S.btn('var(--success)'),flex:1,padding:11}} onClick={()=>{if(!form.typeLabel.trim())return;onSave({...form,color:WORKOUT_TYPES.find(w=>w.type===form.type)?.color||'var(--success)'});onDone();}}>Salvar</button>
          <button style={{...S.btn('var(--muted)'),padding:11}} onClick={onDone}>Cancelar</button>
        </div>
      </div>
    );
  }

  const DAYS_SHORT=['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];

  return(
    <div style={S.wrap}>
      <div style={S.header}>
        <div style={{fontSize:18,fontWeight:800,color:'var(--text)'}}>Meus Treinos</div>
        <div style={{display:'flex',gap:8}}>
          {profiles.length>0&&<button style={{...S.btn('var(--accent)'),padding:'7px 14px',fontSize:13}} onClick={()=>{setShowTemplates(v=>!v);setApplied(null);}} aria-expanded={showTemplates}>Modelos</button>}
          <button style={{...S.btn('var(--success)'),padding:'7px 14px',fontSize:13}} onClick={()=>setShowNew(true)}>+ Novo</button>
        </div>
      </div>

      <div style={{padding:'16px 16px 100px'}}>
        <div style={{background:'var(--accent-soft)',border:'1px solid var(--border)',borderRadius:14,padding:'12px 14px',marginBottom:16,display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
          <div>
            <div style={{fontSize:13,fontWeight:800,color:'var(--text)'}}>Meta de treinos por semana</div>
            <div style={{fontSize:12,color:'var(--muted2)',marginTop:2}}>Usada no marcador de Insights em Hábitos e Performance</div>
          </div>
          <input type="number" min="1" max="14" value={workoutGoal} onChange={e=>setWorkoutGoal(Math.max(1,parseInt(e.target.value,10)||1))}
            style={{width:56,textAlign:'center',border:'1px solid var(--border)',borderRadius:8,padding:'6px 4px',fontSize:14,fontWeight:800}}/>
        </div>

        {applied&&<div role="status" data-testid="template-applied" style={{background:'var(--success-soft)',border:'1px solid var(--border)',borderRadius:12,padding:'10px 14px',marginBottom:12,fontSize:13,lineHeight:1.5,color:'var(--text)'}}>{applied}</div>}

        {showNew&&<EditForm initial={null} onDone={()=>setShowNew(false)}/>}

        {showTemplates&&profiles.length>0&&!showNew&&<WorkoutTemplates onApply={usarModelo} onClose={()=>setShowTemplates(false)}/>}

        {profiles.length===0&&!showNew&&(
          <div data-testid="treino-vazio" style={{textAlign:'center',padding:'32px 0 8px'}}>
            <div style={{marginBottom:12,color:'var(--muted)',display:'flex',justifyContent:'center'}}><Icon name="dumbbell" size={52} stroke={1.5}/></div>
            <div style={{fontSize:16,fontWeight:700,color:'var(--text)',marginBottom:8}}>Nenhum treino criado ainda</div>
            <div style={{color:'var(--muted)',fontSize:13,marginBottom:20,lineHeight:1.5}}>Comece por um modelo pronto: ele monta a semana inteira e você ajusta o que quiser depois.</div>
            <WorkoutTemplates onApply={usarModelo}/>
            <div style={{color:'var(--muted)',fontSize:13,margin:'4px 0 12px'}}>ou</div>
            <button style={{...S.btn('var(--success)'),padding:'12px 28px'}} onClick={()=>setShowNew(true)}>+ Criar do zero</button>
          </div>
        )}

        {profiles.map(p=>{
          const color=WORKOUT_TYPES.find(w=>w.type===p.type)?.color||'var(--success)';
          if(editing?.id===p.id) return <EditForm key={p.id} initial={p} onDone={()=>setEditing(null)}/>;
          return(
            <div key={p.id} style={{background:'var(--surface)',border:`1px solid ${color}33`,borderRadius:16,padding:16,marginBottom:12}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                <div>
                  <div style={{fontSize:15,fontWeight:800,color:color}}>{p.typeLabel}</div>
                  <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>{WORKOUT_TYPES.find(w=>w.type===p.type)?.label}</div>
                </div>
                <div style={{display:'flex',gap:6}}>
                  <button style={{...S.btn('var(--accent)'),padding:'5px 10px',fontSize:12}} onClick={()=>setEditing(p)} aria-label="Editar"><Icon name="pencil" size={16}/></button>
                  <button style={{...S.btn('var(--danger)'),padding:'5px 10px',fontSize:12}} onClick={()=>onDelete(p.id)} aria-label="Remover"><Icon name="trash" size={16}/></button>
                </div>
              </div>
              {p.exercises&&(
                <div style={{fontSize:12,color:'var(--muted2)',lineHeight:1.8,whiteSpace:'pre-line',marginBottom:10,padding:'8px 10px',background:'var(--surface2)',borderRadius:8}}>
                  {p.exercises}
                </div>
              )}

              <div style={{fontSize:12,fontWeight:800,color:'var(--muted)',marginBottom:6,textTransform:'uppercase'}}>Aplicar em quais dias?</div>
              <div style={{display:'flex',gap:4}}>
                {DAYS_SHORT.map((d,di)=>{
                  const isUsing=plan[di]?.typeLabel===p.typeLabel;
                  return(
                    <button key={di} onClick={()=>onApplyToDay(p.id,di,isUsing)}
                      style={{flex:1,padding:'6px 0',borderRadius:8,border:`1px solid ${isUsing?color:'var(--border)'}`,
                        background:isUsing?color:'var(--surface)',color:isUsing?'var(--surface)':'var(--muted2)',
                        fontSize:12,fontWeight:800,cursor:'pointer'}}>
                      {d}
                    </button>
                  );
                })}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}

// ── MEAL PLAN APP ─────────────────────────────────────────────────────────────
function MealPlanApp({onLogout,userId,onOpenProfile,onHome,initialTab}){
  const [plan,setPlan]           = useState(null);
  const [tab,setTab]             = useState(initialTab||'plan');   // 'plan' | 'shop' | 'workout'
  // A barra inferior troca Nutrição/Compras/Treino reaproveitando esta mesma tela
  // (sem remontar), então a aba precisa acompanhar o que foi pedido.
  useEffect(()=>{ if(initialTab) setTab(initialTab); },[initialTab]);
  const [dayIdx,setDayIdx]       = useState(new Date().getDay()===0?6:new Date().getDay()-1);
  const [editFood,setEditFood]   = useState(null);
  const [editMeal,setEditMeal]   = useState(null); // {mi, field} field: 'name'|'time'
  const [showSearch,setShowSearch]   = useState(null);
  const [showWorkout,setShowWorkout] = useState(false);
  const [showMealCount,setShowMealCount] = useState(false);
  const [shopping,setShopping]   = useState([]);        // [{id,name,qty,kcal,checked}]
  const [saving,setSaving]       = useState(false);
  const [saveMsg,setSaveMsg]     = useState('');
  const [workoutProfiles,setWorkoutProfiles] = useState([]);
  const [workoutGoal,setWorkoutGoal] = useState(3); // meta personalizável de treinos/semana
  const timer=useRef(null);
  const timerProfiles=useRef(null);

  // Refs sempre atualizadas (não presas ao closure de quando o efeito foi
  // criado) — usadas dentro dos auto-saves pra nunca escrever um valor
  // desatualizado quando o salvamento dispara por causa de OUTRA mudança
  // (ex: aplicar um treino a um dia disparava o auto-save de "workoutProfiles",
  // que usava um "plan" antigo de antes da aplicação, apagando a mudança).
  const planRef=useRef(plan), shoppingRef=useRef(shopping);
  const workoutProfilesRef=useRef(workoutProfiles), workoutGoalRef=useRef(workoutGoal);
  planRef.current=plan; shoppingRef.current=shopping;
  workoutProfilesRef.current=workoutProfiles; workoutGoalRef.current=workoutGoal;

  // Registra os 4 campos que esta tela mantém na fila central de salvamento
  // (sempre via refs, então a fila nunca escreve um valor desatualizado)

  // Rede de segurança extra: cobre o caso de recarregar a página (F5) ou
  // fechar a aba de repente, que NÃO passa pela limpeza normal do React
  // (o "return" dos useEffect só roda ao trocar de tela dentro do app, não
  // num fechamento/recarregamento abrupto do navegador).
  useEffect(()=>{
    if(!userId) return;
    const flushNow=()=>requestPlanDataSave(userId);
    window.addEventListener('pagehide',flushNow);
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flushNow();});
    return()=>{
      window.removeEventListener('pagehide',flushNow);
    };
  },[userId]);

  const [dataLoaded,setDataLoaded]=useState(false);

  // IMPORTANTE: os campos só entram na fila central DEPOIS que o carregamento
  // terminou. Antes disso os estados ainda estão vazios, e qualquer gravação
  // vinda de outro ponto do app (ou da tela anterior ao sair) gravaria esses
  // vazios por cima dos treinos e compras já salvos.
  useEffect(()=>{
    if(!userId||!dataLoaded) return;
    const unregs=[
      registerPlanDataField('plan',()=>planRef.current),
      registerPlanDataField('shopping',()=>shoppingRef.current),
      registerPlanDataField('workoutProfiles',()=>workoutProfilesRef.current),
      registerPlanDataField('workoutGoalPerWeek',()=>workoutGoalRef.current),
    ];
    return ()=>unregs.forEach(u=>u());
  },[userId,dataLoaded]);

  // Carrega plano e lista do Supabase. Só depois que os DOIS carregamentos
  // terminarem é que os efeitos de auto-save abaixo são liberados — sem
  // isso, se a internet demorasse um pouco, o auto-save de compras/treinos
  // disparava com os valores padrão (vazios) ANTES do carregamento real
  // terminar, sobrescrevendo os treinos/compras já salvos com nada.
  useEffect(()=>{
    setDataLoaded(false);
    let doneA=false,doneB=false;
    const checkDone=()=>{ if(doneA&&doneB) setDataLoaded(true); };
    loadUserPlan(userId).then(saved=>{
      if(saved&&saved.length) setPlan(saved); else setPlan([]);
    }).catch(()=>setPlan([])).finally(()=>{doneA=true;checkDone();});
    // Carrega lista de compras e perfis de treino
    supabase.from('user_plans').select('plan_data').eq('user_id',userId).maybeSingle()
      .then(({data})=>{
        if(data?.plan_data?.shopping) setShopping(data.plan_data.shopping);
        if(data?.plan_data?.workoutProfiles) setWorkoutProfiles(data.plan_data.workoutProfiles);
        if(data?.plan_data?.workoutGoalPerWeek) setWorkoutGoal(data.plan_data.workoutGoalPerWeek);
      }).finally(()=>{doneB=true;checkDone();});
  },[userId]);

  // Pede o salvamento a cada mudança do plano (a fila central faz a escrita
  // de verdade, então nunca corre com o salvamento de compras/treinos)
  useEffect(()=>{
    if(!plan||!plan.length||!userId||!dataLoaded) return;
    clearTimeout(timer.current);
    setSaving(true);
    timer.current=setTimeout(()=>{
      requestPlanDataSave(userId);
      setSaveMsg('Salvo');setSaving(false);setTimeout(()=>setSaveMsg(''),2000);
    },1200);
    return()=>{clearTimeout(timer.current);requestPlanDataSave(userId);};
  },[plan,userId,dataLoaded]);

  // Pede o salvamento a cada mudança da lista de compras (mesma fila central)
  useEffect(()=>{
    if(!userId||!dataLoaded) return;
    const t=setTimeout(()=>requestPlanDataSave(userId),400);
    return()=>{clearTimeout(t);requestPlanDataSave(userId);};
  },[shopping,userId,dataLoaded]);

  // Pede o salvamento a cada mudança de perfis de treino / meta semanal
  useEffect(()=>{
    if(!userId||!dataLoaded) return;
    clearTimeout(timerProfiles.current);
    timerProfiles.current=setTimeout(()=>requestPlanDataSave(userId),400);
    return()=>{clearTimeout(timerProfiles.current);requestPlanDataSave(userId);};
  },[workoutProfiles,workoutGoal,userId,dataLoaded]);

  // ── helpers de plano
  function updateQty(mi,fid,qty){
    setPlan(prev=>prev.map((d,di)=>{
      if(di!==dayIdx) return d;
      return {...d,meals:d.meals.map((m,mii)=>{
        if(mii!==mi) return m;
        return {...m,foods:m.foods.map(f=>{
          if(f.id!==fid) return f;
          const u={...f,qty};
          if(f.tacoId&&TACO_MAP[f.tacoId]){const t=TACO_MAP[f.tacoId],fc=qty/100;u.kcal=Math.round(t.e*fc);u.p=+((t.p*fc).toFixed(1));u.l=+((t.l*fc).toFixed(1));u.cb=+((t.cb*fc).toFixed(1));}
          return u;
        })};
      })};
    }));
  }
  function removeFood(mi,fid){
    setPlan(prev=>prev.map((d,di)=>di!==dayIdx?d:{...d,meals:d.meals.map((m,mii)=>mii!==mi?m:{...m,foods:m.foods.filter(f=>f.id!==fid)})}));
  }
  function addFood(mi,t){
    const nf={id:'a'+Math.random().toString(36).slice(2),name:t.n,qty:100,tacoId:t.id,kcal:Math.round(t.e),p:t.p,l:t.l,cb:t.cb};
    setPlan(prev=>prev.map((d,di)=>di!==dayIdx?d:{...d,meals:d.meals.map((m,mii)=>mii!==mi?m:{...m,foods:[...m.foods,nf]})}));
    setShowSearch(null);
  }

  function updateMeal(mi,field,value){
    setPlan(prev=>prev.map((d,di)=>di!==dayIdx?d:{...d,meals:d.meals.map((m,mii)=>mii!==mi?m:{...m,[field]:value})}));
  }

  // ── helpers carrinho
  function addToCart(food){
    if(shopping.find(i=>i.name===food.name)) return; // evita duplicata
    setShopping(prev=>[...prev,{id:food.id+'c'+Date.now(),name:food.name,qty:food.qty,kcal:food.kcal,checked:false}]);
  }
  function toggleCart(id){ setShopping(prev=>prev.map(i=>i.id===id?{...i,checked:!i.checked}:i)); }
  function removeCart(id){ setShopping(prev=>prev.filter(i=>i.id!==id)); }
  function clearDone(){    setShopping(prev=>prev.filter(i=>!i.checked)); }

  // ── troca treino — propaga para todos os dias com mesmo typeLabel
  function applyWorkout(opt){
    const prevLabel=plan[dayIdx]?.typeLabel;
    setPlan(prev=>prev.map(d=>{
      // Atualiza o dia atual sempre; atualiza outros dias se tinham o mesmo perfil
      if(d.typeLabel===prevLabel||plan.indexOf(d)===dayIdx){
        return {...d,type:opt.type,typeLabel:opt.typeLabel,exercises:opt.exercises||''};
      }
      return d;
    }));
    // Upsert perfil na lista de perfis salvos
    setWorkoutProfiles(prev=>{
      const idx=prev.findIndex(p=>p.typeLabel===opt.typeLabel);
      if(idx>=0){ const next=[...prev]; next[idx]={...opt}; return next; }
      return [...prev,{...opt,id:'wp'+Date.now()}];
    });
    setShowWorkout(false);
  }

  // ── criar/editar perfil de treino
  function saveProfile(profile){
    setWorkoutProfiles(prev=>{
      const idx=prev.findIndex(p=>p.id===profile.id);
      if(idx>=0){ const next=[...prev]; next[idx]=profile; return next; }
      return [...prev,profile];
    });
    // Propaga exercícios para dias que usam esse perfil
    if(profile.typeLabel){
      setPlan(prev=>prev.map(d=>d.typeLabel===profile.typeLabel?{...d,type:profile.type,exercises:profile.exercises||''}:d));
    }
  }

  function deleteProfile(id){
    setWorkoutProfiles(prev=>prev.filter(p=>p.id!==id));
  }

  // ── usar um modelo de treino pronto: monta a semana, salva os treinos e ajusta a meta
  function applyTemplate(modelo){
    const r=montarModelo(modelo,plan,workoutProfiles);
    setPlan(r.plan);
    setWorkoutProfiles(r.profiles);
    setWorkoutGoal(r.meta);
  }

  // ── redistribuir refeições
  function redistributeMeals(count){
    const TEMPLATES={
      2:[
        {time:'12:00',name:'Almoço',icon:'utensils'},
        {time:'19:00',name:'Jantar',icon:'moon'},
      ],
      3:[
        {time:'07:00',name:'Café da Manhã',icon:'sun'},
        {time:'13:00',name:'Almoço',icon:'utensils'},
        {time:'19:00',name:'Jantar',icon:'moon'},
      ],
      4:[
        {time:'07:00',name:'Café da Manhã',icon:'sun'},
        {time:'12:00',name:'Almoço',icon:'utensils'},
        {time:'16:00',name:'Lanche',icon:'droplet'},
        {time:'20:00',name:'Jantar',icon:'moon'},
      ],
      5:[
        {time:'07:00',name:'Café da Manhã',icon:'sun'},
        {time:'10:00',name:'Lanche 1',icon:'droplet'},
        {time:'13:00',name:'Almoço',icon:'utensils'},
        {time:'16:30',name:'Pré-Treino',icon:'zap'},
        {time:'20:00',name:'Pós-Treino / Jantar',icon:'dumbbell'},
      ],
      6:[
        {time:'07:00',name:'Café da Manhã',icon:'sun'},
        {time:'10:00',name:'Lanche 1',icon:'droplet'},
        {time:'13:00',name:'Almoço',icon:'utensils'},
        {time:'16:30',name:'Pré-Treino',icon:'zap'},
        {time:'20:00',name:'Pós-Treino / Jantar',icon:'dumbbell'},
        {time:'22:00',name:'Ceia',icon:'moon'},
      ],
    };
    setPlan(prev=>prev.map((d,di)=>{
      if(di!==dayIdx) return d;
      // Coleta todos os alimentos do dia atual
      const allFoods=d.meals.flatMap(m=>m.foods);
      const tmpl=TEMPLATES[count]||TEMPLATES[5];
      // Distribui alimentos igualmente entre as refeições
      const newMeals=tmpl.map((t,ti)=>({
        ...t,
        foods:allFoods.filter((_,fi)=>fi%tmpl.length===ti),
      }));
      return {...d,meals:newMeals};
    }));
    setShowMealCount(false);
  }

  const dayTotals=useMemo(()=>{
    const day=plan?.[dayIdx];
    if(!day) return {kcal:0,p:0,l:0,cb:0};
    const t={kcal:0,p:0,l:0,cb:0};
    day.meals.forEach(m=>m.foods.forEach(f=>{t.kcal+=f.kcal;t.p+=f.p;t.l+=f.l;t.cb+=f.cb;}));
    return {kcal:t.kcal,p:+t.p.toFixed(1),l:+t.l.toFixed(1),cb:+t.cb.toFixed(1)};
  },[plan,dayIdx]);

  const cartCount=shopping.filter(i=>!i.checked).length;

  // ── early returns (after all hooks)
  if(!plan) return(
    <div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center'}}><div style={{fontFamily:'var(--font-display)',fontSize:32,fontWeight:600,color:'var(--accent)',marginBottom:12}}>LifePlan</div><div style={{color:'var(--muted)'}}>Carregando...</div></div>
    </div>
  );
  if(!plan.length) return(
    <div style={S.wrap}>
      <div style={S.header}><div style={{fontFamily:'var(--font-display)',fontSize:22,fontWeight:600,color:'var(--accent)'}}>LifePlan</div><button style={{background:'none',border:'1px solid var(--border)',borderRadius:8,color:'var(--muted2)',padding:'6px 12px',fontSize:12,cursor:'pointer'}} onClick={onLogout}>Sair</button></div>
      <div style={{padding:32,textAlign:'center'}}><div style={{marginBottom:16,color:'var(--muted)',display:'flex',justifyContent:'center'}}><Icon name="user" size={56} stroke={1.5}/></div><div style={{fontSize:20,fontWeight:800,color:'var(--text)',marginBottom:8}}>Configure seu perfil</div><div style={{color:'var(--muted)',fontSize:14,marginBottom:28}}>Informe seus dados para gerar um plano alimentar personalizado</div><button style={{...S.btn('var(--success)'),padding:'14px 32px',fontSize:15}} onClick={onOpenProfile}>Configurar Perfil</button></div>
    </div>
  );

  const day=plan[dayIdx];
  const tc={strength:'var(--success)',cardio:'var(--info)',rest:'var(--muted)'}[day?.type]||'var(--muted)';

  // ── render aba treinos
  if(tab==='workout') return(
    <WorkoutProfilesPage
      profiles={workoutProfiles}
      plan={plan}
      onSave={saveProfile}
      onDelete={deleteProfile}
      onApplyTemplate={applyTemplate}
      onApplyToDay={(profileId,dayI,isUsing)=>{
        if(isUsing){
          // Desmarcar: volta para descanso
          setPlan(prev=>prev.map((d,di)=>di===dayI?{...d,type:'rest',typeLabel:'Descanso',exercises:'Nenhum treino – foco em sono e recuperação'}:d));
          return;
        }
        const p=workoutProfiles.find(wp=>wp.id===profileId);
        if(!p) return;
        // Aplica apenas ao dia clicado
        setPlan(prev=>prev.map((d,di)=>di===dayI?{...d,type:p.type,typeLabel:p.typeLabel,exercises:p.exercises||''}:d));
      }}
      onBack={()=>setTab('plan')}
      workoutGoal={workoutGoal} setWorkoutGoal={setWorkoutGoal}
      tab={tab} setTab={setTab} cartCount={cartCount} onOpenProfile={onOpenProfile} onLogout={onLogout} onHome={onHome}
    />
  );

  // ── render lista de compras
  if(tab==='shop') return(
    <ShoppingList items={shopping} onToggle={toggleCart} onRemove={removeCart} onClear={clearDone}/>
  );

  // ── render plano
  return(
    <div style={S.wrap}>
      {/* Header */}
      <div style={S.header}>
        <div style={{fontFamily:'var(--font-display)',fontSize:22,fontWeight:600,color:'var(--accent)'}}>LifePlan</div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          {saveMsg&&<span style={{fontSize:12,color:saveMsg.startsWith('Salvo')?'var(--success)':'var(--danger)'}}>{saveMsg}</span>}
          {saving&&<span style={{fontSize:12,color:'var(--muted2)'}}>Salvando…</span>}
        </div>
      </div>

      {/* Day tabs */}
      <div style={{display:'flex',overflowX:'auto',gap:8,padding:'16px 20px',scrollbarWidth:'none'}}>
        {plan.map((d,i)=>(
          <button key={d.id} onClick={()=>setDayIdx(i)} style={{flexShrink:0,minHeight:44,padding:'8px 16px',borderRadius:14,border:'1px solid',cursor:'pointer',fontSize:14,fontWeight:700,
            ...(i===dayIdx?{background:d.type==='rest'?'var(--surface3)':d.type==='cardio'?'var(--info-soft)':'var(--accent-soft)',borderColor:d.type==='rest'?'var(--muted)':d.type==='cardio'?'var(--info)':'var(--accent)',color:d.type==='rest'?'var(--text-2)':d.type==='cardio'?'var(--info)':'var(--accent-dark)'}:{background:'var(--surface)',borderColor:'var(--border)',color:'var(--muted)'})
          }}>
            <div>{d.short}</div>
            {(d.type==='rest'||workoutProfiles.some(p=>p.typeLabel===d.typeLabel))&&<div style={{fontSize:12,marginTop:2}}>{d.typeLabel.split('–')[0].trim()}</div>}
          </button>
        ))}
      </div>

      {/* Day header */}
      <div style={{...S.card,background:`linear-gradient(135deg,${tc}18,${tc}08)`,border:`1px solid ${tc}33`}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
          <div>
            <div style={{fontSize:18,fontWeight:800,color:'var(--text)'}}>{day.fullName}</div>
            <div style={{display:'flex',alignItems:'center',gap:8,marginTop:4}}>
              {(day.type==='rest'||workoutProfiles.some(p=>p.typeLabel===day.typeLabel))&&<div style={{fontSize:13,color:tc,fontWeight:700}}>{day.typeLabel}</div>}
              {/* Botão troca treino */}
              <button onClick={()=>setShowWorkout(true)} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,color:'var(--muted2)',padding:'8px 12px',minHeight:40,fontSize:12,cursor:'pointer',fontWeight:600}}>Treino</button>
              <button onClick={()=>setShowMealCount(true)} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,color:'var(--muted2)',padding:'8px 12px',minHeight:40,fontSize:12,cursor:'pointer',fontWeight:600}}>Refeições</button>
            </div>
            {day.exercises&&(day.type==='rest'||workoutProfiles.some(p=>p.typeLabel===day.typeLabel))&&<div style={{fontSize:12,color:'var(--muted2)',marginTop:6,lineHeight:1.7,whiteSpace:'pre-line'}}>{day.exercises.replace(/·/g,'\n')}</div>}
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:20,fontWeight:900,color:tc}}>{dayTotals.kcal}</div>
            <div style={{fontSize:12,color:'var(--muted)',fontWeight:600}}>kcal totais</div>
          </div>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {[['dumbbell',dayTotals.p+'g','proteína','var(--info)'],['leaf',dayTotals.l+'g','gordura','var(--warning)'],['activity',dayTotals.cb+'g','carbs','var(--accent)'],['flame',day.burned+'kcal','queimado','var(--text-2)']].map(([ic,v,l,c])=>(
            <div key={l} style={{background:`color-mix(in srgb, ${c} 10%, transparent)`,border:`1px solid color-mix(in srgb, ${c} 25%, transparent)`,borderRadius:10,padding:'8px 12px',flex:1,minWidth:60,textAlign:'center'}}>
              <div style={{display:'flex',justifyContent:'center',color:c}}><Glyph name={ic} size={16}/></div>
              <div style={{fontSize:13,fontWeight:800,color:c}}>{v}</div>
              <div style={{fontSize:12,color:'var(--muted)',fontWeight:600}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Meals */}
      {day.meals.map((meal,mi)=>{
        const mt=meal.foods.reduce((t,f)=>({kcal:t.kcal+f.kcal,p:t.p+f.p,l:t.l+f.l,cb:t.cb+f.cb}),{kcal:0,p:0,l:0,cb:0});
        return(
          <div key={mi} style={S.card}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
              <span style={{display:'inline-flex',color:'var(--accent)'}}><Glyph name={meal.icon} size={22}/></span>
              <div style={{flex:1}}>
                {editMeal?.mi===mi&&editMeal?.field==='name'
                  ?<input autoFocus style={{...S.input,padding:'4px 8px',fontSize:14,fontWeight:700,marginBottom:2}} value={meal.name}
                      onChange={e=>updateMeal(mi,'name',e.target.value)} onBlur={()=>setEditMeal(null)} onKeyDown={e=>e.key==='Enter'&&setEditMeal(null)}/>
                  :<div style={{fontSize:14,fontWeight:700,color:'var(--text)',cursor:'pointer'}} onClick={()=>setEditMeal({mi,field:'name'})} title="Toque para editar">{meal.name} <span style={{fontSize:12,color:'var(--muted)'}}></span></div>
                }
                {editMeal?.mi===mi&&editMeal?.field==='time'
                  ?<input autoFocus style={{...S.input,padding:'2px 6px',fontSize:12,width:80,marginTop:2}} type="time" value={meal.time}
                      onChange={e=>updateMeal(mi,'time',e.target.value)} onBlur={()=>setEditMeal(null)}/>
                  :<div style={{fontSize:12,color:'var(--muted)',fontWeight:600,cursor:'pointer',marginTop:2}} onClick={()=>setEditMeal({mi,field:'time'})} title="Toque para editar">{meal.time} <span style={{fontSize:12}}></span></div>
                }
              </div>
              <span style={S.badge('var(--warning)')}>{mt.kcal} kcal</span>
            </div>
            {meal.foods.map(food=>{
              const inCart=shopping.some(i=>i.name===food.name&&!i.checked);
              return(
                <div key={food.id} style={{display:'flex',alignItems:'center',flexWrap:'wrap',gap:8,padding:'10px 0',borderBottom:'1px solid var(--border2)'}}>
                  {editFood===food.id
                    ?<input style={{...S.input,width:70,padding:'4px 8px',fontSize:12}} type="number" value={food.qty} onChange={e=>updateQty(mi,food.id,+e.target.value)} onBlur={()=>setEditFood(null)} autoFocus/>
                    :<span style={{fontSize:12,color:'var(--info)',fontWeight:700,cursor:'pointer',minWidth:40}} onClick={()=>setEditFood(food.id)}>{food.qty}g</span>
                  }
                  <span style={{flex:'1 1 140px',fontSize:14,color:'var(--text)'}}>{food.name}</span>
                  <div style={{display:'flex',gap:4,alignItems:'center'}}>
                    <div style={{display:'flex',gap:3,fontSize:12}}>
                      <span style={S.badge('var(--warning)')}>{food.kcal}</span>
                      <span style={S.badge('var(--info)')}>P{food.p}</span>
                      <span style={S.badge('var(--warning)')}>G{food.l}</span>
                      <span style={S.badge('var(--accent)')}>C{food.cb}</span>
                    </div>
                    {/* Botão carrinho */}
                    <button onClick={()=>addToCart(food)} title="Adicionar à lista de compras"
                      style={{background:inCart?'var(--success-soft)':'var(--surface)',border:`1px solid ${inCart?'var(--success)':'var(--border)'}`,borderRadius:7,color:inCart?'var(--success)':'var(--muted)',cursor:'pointer',fontSize:14,padding:'3px 6px',lineHeight:1}}>
                      <Icon name="cart" size={16}/>
                    </button>
                    <button style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:14,padding:'0 2px'}} onClick={()=>removeFood(mi,food.id)}><Icon name="x" size={18}/></button>
                  </div>
                </div>
              );
            })}
            <button style={{...S.btn('var(--accent-fill)'),border:'1px dashed var(--border)',width:'100%',marginTop:10,fontSize:12}} onClick={()=>setShowSearch(mi)}>
              + Adicionar alimento TACO
            </button>
          </div>
        );
      })}

      <div style={{height:80}}/>


      {showSearch!==null&&<FoodModal onSelect={t=>addFood(showSearch,t)} onClose={()=>setShowSearch(null)}/>}
      {showMealCount&&(
        <div style={{position:'fixed',inset:0,background:'rgba(16,22,18,0.55)',zIndex:300,display:'flex',alignItems:'flex-end'}} onClick={()=>setShowMealCount(false)}>
          <div style={{background:'var(--surface)',borderRadius:'20px 20px 0 0',width:'100%',padding:24}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <div style={{fontSize:16,fontWeight:800,color:'var(--text)'}}>Dividir Refeições — {day.fullName}</div>
              <button style={S.btn('var(--danger)')} onClick={()=>setShowMealCount(false)}><Icon name="x" size={18}/></button>
            </div>
            <div style={{fontSize:12,color:'var(--muted)',marginBottom:16}}>Escolha em quantas refeições distribuir os macros do dia. Os alimentos serão redistribuídos automaticamente.</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10}}>
              {[2,3,4,5,6].map(n=>{
                const active=day.meals.length===n;
                return(
                  <button key={n} onClick={()=>redistributeMeals(n)}
                    style={{padding:'16px 0',borderRadius:12,border:'1px solid',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:6,
                      ...(active?{background:'var(--success-soft)',borderColor:'var(--success)',color:'var(--success)'}:{background:'var(--surface)',borderColor:'var(--border)',color:'var(--muted2)'})}}>
                    <span style={{fontSize:24,fontWeight:900}}>{n}</span>
                    <span style={{fontSize:12,fontWeight:700}}>{active?'✓ Atual':'refeições'}</span>
                  </button>
                );
              })}
            </div>
            <div style={{marginTop:16,fontSize:12,color:'var(--muted)',textAlign:'center'}}>* Apenas o dia atual será alterado</div>
          </div>
        </div>
      )}
      {showWorkout&&<WorkoutModal day={day} onSelect={applyWorkout} onClose={()=>setShowWorkout(false)} profiles={workoutProfiles}/>}
    </div>
  );
}

// ── CONFIGURAÇÃO GOOGLE (login + agenda) ──────────────────────────────────────
// Use o MESMO Client ID OAuth do Google Cloud para as duas coisas:
// 1) Login "Entrar com Google" (configurado no Supabase, não aqui)
// 2) Sincronizar a agenda do Google Calendar na tela Início (usado abaixo)
//
// Passo a passo:
// 1) https://console.cloud.google.com/apis/credentials → crie um
//    OAuth 2.0 Client ID do tipo "Web application"
// 2) Habilite a "Google Calendar API" em APIs & Services → Library
// 3) Em "Authorized JavaScript origins", adicione o domínio do app
//    (ex: http://localhost:5173 e a URL do site publicado)
// 4) Em "Authorized redirect URIs", adicione a URL de callback que o
//    Supabase mostra em Authentication → Providers → Google
// 5) Cole o MESMO Client ID no Supabase (Authentication → Providers → Google)
//    E no arquivo .env do projeto, na variável VITE_GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/calendar.events';
const WEEK_DAYS = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];

function loadGoogleScript(){
  return new Promise((resolve,reject)=>{
    if(window.google?.accounts?.oauth2) return resolve();
    const existing=document.getElementById('gsi-script');
    if(existing){existing.addEventListener('load',resolve);return;}
    const s=document.createElement('script');
    s.id='gsi-script'; s.src='https://accounts.google.com/gsi/client';
    s.async=true; s.defer=true;
    s.onload=()=>resolve(); s.onerror=reject;
    document.head.appendChild(s);
  });
}

function useGoogleCalendar(){
  const [events,setEvents]=useState([]);
  const [connected,setConnected]=useState(false);
  const [status,setStatus]=useState(GOOGLE_CLIENT_ID?'idle':'no-key');
  const tokenClient=useRef(null);
  const isSilentAttempt=useRef(false);

  function saveToken(accessToken,expiresInSec){
    localStorage.setItem('gcal_token',accessToken);
    localStorage.setItem('gcal_token_expiry',String(Date.now()+((expiresInSec||3500)*1000)));
  }
  function clearToken(){
    localStorage.removeItem('gcal_token');
    localStorage.removeItem('gcal_token_expiry');
    setConnected(false);setStatus('idle');
  }

  async function ensureTokenClient(){
    await loadGoogleScript();
    if(!tokenClient.current){
      tokenClient.current=window.google.accounts.oauth2.initTokenClient({
        client_id:GOOGLE_CLIENT_ID,
        scope:GOOGLE_SCOPES,
        callback:(resp)=>{
          if(resp?.access_token){
            setConnected(true);setStatus('connected');
            saveToken(resp.access_token,resp.expires_in);
            fetchUpcomingEvents(resp.access_token);
          }else if(!isSilentAttempt.current){
            // só desconecta de verdade se foi o usuário clicando em "Conectar"
            // — uma tentativa silenciosa em segundo plano que falhou não deve
            // te tirar da conta, só tenta de novo mais tarde.
            clearToken();
          }
        },
        error_callback:()=>{
          if(!isSilentAttempt.current) clearToken();
        },
      });
    }
    return tokenClient.current;
  }

  // Tenta renovar o acesso sem pedir nada ao usuário (aproveitando a sessão
  // já autorizada no navegador). Se isso falhar, NÃO desconecta — apenas
  // continua mostrando os dados já conhecidos e tenta de novo mais tarde.
  // Só clicar em "Conectar Google" de novo é tratado como desconexão real.
  async function trySilentRefresh(){
    if(!GOOGLE_CLIENT_ID) return;
    const client=await ensureTokenClient();
    isSilentAttempt.current=true;
    client.requestAccessToken({prompt:''});
    setTimeout(()=>{isSilentAttempt.current=false;},4000);
  }

  async function fetchUpcomingEvents(accessToken){
    try{
      const now=new Date();
      const start=new Date(now.getFullYear(),now.getMonth(),now.getDate()).toISOString();
      const end=new Date(now.getFullYear(),now.getMonth(),now.getDate()+7).toISOString();
      const url=`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${start}&timeMax=${end}&singleEvents=true&orderBy=startTime&maxResults=15`;
      const res=await fetch(url,{headers:{Authorization:`Bearer ${accessToken}`}});
      if(res.status===401||res.status===403){
        // token expirado/revogado: tenta renovar sozinho antes de desistir
        trySilentRefresh();
        return;
      }
      if(!res.ok) return; // erro passageiro (rede etc.) — não desconecta à toa
      const data=await res.json();
      const todayStr=now.toDateString();
      setEvents((data.items||[]).map(e=>{
        const start=e.start?.dateTime||e.start?.date;
        const d=start?new Date(start):null;
        const isToday=d&&d.toDateString()===todayStr;
        let time;
        if(!e.start?.dateTime) time='Dia todo';
        else time=d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
        const label=isToday?time:d?`${d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})} · ${time}`:time;
        return {id:e.id,title:e.summary||'(sem título)',time:label};
      }));
    }catch{
      // falha de rede/temporária — mantém conectado, só não atualiza agora
    }
  }

  async function connect(){
    if(!GOOGLE_CLIENT_ID){setStatus('no-key');return;}
    isSilentAttempt.current=false;
    const client=await ensureTokenClient();
    client.requestAccessToken();
  }

  useEffect(()=>{
    const t=localStorage.getItem('gcal_token');
    const expiry=parseInt(localStorage.getItem('gcal_token_expiry')||'0',10);
    if(t&&GOOGLE_CLIENT_ID){
      setConnected(true);setStatus('connected');
      if(Date.now()<expiry-60000) fetchUpcomingEvents(t);
      else trySilentRefresh(); // token vencido: renova sozinho, sem pedir nada
    }
  },[]);

  return {events,connected,status,connect};
}

// ── FILA CENTRAL DE SALVAMENTO (user_plans.plan_data) ────────────────────────
// Todas as partes do app que gravam em user_plans (plano, compras, treinos,
// água, agenda manual, quadro de horários, treino-feito) passam por AQUI,
// em vez de cada uma fazer sua própria leitura-mescla-escrita. Isso elimina
// de vez a corrida entre gravações concorrentes: nunca duas escritas ao
// mesmo tempo, e cada escrita sempre usa o valor mais atual de cada campo
// (via "getters" que leem refs sempre atualizadas), nunca uma cópia presa
// de quando foi agendada.
const planDataQueue = { pending:false, dirty:false, userId:null, getters:{} };

function registerPlanDataField(key,getter){
  planDataQueue.getters[key]=getter;
  return ()=>{ if(planDataQueue.getters[key]===getter) delete planDataQueue.getters[key]; };
}

function requestPlanDataSave(userId){
  if(!userId) return;
  planDataQueue.userId=userId;
  planDataQueue.dirty=true;
  if(planDataQueue.pending) return; // já tem uma gravação em andamento — ela pega essa mudança na próxima volta
  runPlanDataQueue();
}

async function runPlanDataQueue(){
  if(!planDataQueue.userId||planDataQueue.pending) return;
  planDataQueue.pending=true;
  try{
    while(planDataQueue.dirty){
      planDataQueue.dirty=false;
      const userId=planDataQueue.userId;
      try{
        const {data:existing}=await supabase.from('user_plans').select('plan_data').eq('user_id',userId).maybeSingle();
        const patch={};
        for(const [key,getter] of Object.entries(planDataQueue.getters)){
          const val=getter();
          if(val===undefined) continue;
          if(key==='plan') Object.assign(patch,val||[]); // plano é array -> vira chaves numéricas 0-6
          else patch[key]=val;
        }
        const plan_data={...(existing?.plan_data||{}),...patch};
        await supabase.from('user_plans').upsert({user_id:userId,plan_data,updated_at:new Date().toISOString()},{onConflict:'user_id'});
      }catch(e){ console.error('Erro ao salvar dados do LifePlan:',e); }
    }
  }finally{
    planDataQueue.pending=false;
  }
}


// Meta de água personalizável (reseta o consumo do dia automaticamente à
// meia-noite). Usa data local (não UTC) para o reset acontecer no horário
// certo no fuso do usuário.
function useWaterTracker(userId){
  const todayKey=()=>{
    const d=new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const [data,setData]=useState(()=>{
    try{
      const raw=JSON.parse(localStorage.getItem('water_v1'));
      if(raw&&raw.date===todayKey()) return raw;
    }catch{}
    return {date:todayKey(),goal:2000,current:0};
  });
  useEffect(()=>{localStorage.setItem('water_v1',JSON.stringify(data));},[data]);

  // Carrega a meta/consumo salvos na nuvem (permite trocar de dispositivo)
  const [waterLoaded,setWaterLoaded]=useState(false);
  useEffect(()=>{
    if(!userId) return;
    supabase.from('user_plans').select('plan_data').eq('user_id',userId).maybeSingle().then(({data:row})=>{
      const cloud=row?.plan_data?.water;
      if(cloud&&cloud.date===todayKey()) setData(cloud);
      else if(cloud) setData(d=>({...d,goal:cloud.goal||d.goal})); // dia diferente: mantém só a meta
    }).finally(()=>setWaterLoaded(true));
  },[userId]);

  // Registra o valor mais atual na fila central (nunca uma cópia presa)
  const dataRef=useRef(data);
  dataRef.current=data;
  useEffect(()=>{
    if(!userId) return;
    return registerPlanDataField('water',()=>dataRef.current);
  },[userId]);

  // Pede o salvamento (com atraso pra não disparar uma chamada a cada clique);
  // a fila central é quem de fato lê/escreve, então nunca corre com outros
  // campos (agenda, quadro de horários etc.) sendo salvos ao mesmo tempo.
  // Só libera depois que o carregamento da nuvem terminar — sem isso, um
  // dispositivo novo (sem cache local) podia salvar o valor padrão (zerado)
  // por cima do que já estava salvo, antes do carregamento real chegar.
  useEffect(()=>{
    if(!userId||!waterLoaded) return;
    const t=setTimeout(()=>requestPlanDataSave(userId),400);
    return()=>{clearTimeout(t);requestPlanDataSave(userId);};
  },[data,userId,waterLoaded]);

  // Confere a cada minuto se o dia virou, mesmo com o app aberto continuamente
  useEffect(()=>{
    const t=setInterval(()=>{
      const key=todayKey();
      setData(d=>d.date===key?d:{date:key,goal:d.goal,current:0});
    },60000);
    return ()=>clearInterval(t);
  },[]);
  function add(ml){setData(d=>({...d,current:Math.max(0,d.current+ml)}));}
  function setGoal(g){setData(d=>({...d,goal:g}));}
  return {data,add,setGoal};
}

function useManualAgenda(userId){
  const [items,setItems]=useState(()=>{
    try{return JSON.parse(localStorage.getItem('agenda_manual'))||[];}catch{return [];}
  });
  useEffect(()=>{localStorage.setItem('agenda_manual',JSON.stringify(items));},[items]);

  const [agendaLoaded,setAgendaLoaded]=useState(false);
  useEffect(()=>{
    if(!userId) return;
    supabase.from('user_plans').select('plan_data').eq('user_id',userId).maybeSingle().then(({data:row})=>{
      if(Array.isArray(row?.plan_data?.agendaManual)) setItems(row.plan_data.agendaManual);
    }).finally(()=>setAgendaLoaded(true));
  },[userId]);

  // Registra na fila central (sempre lê o valor mais atual via ref)
  const itemsRef=useRef(items);
  itemsRef.current=items;
  useEffect(()=>{
    if(!userId) return;
    return registerPlanDataField('agendaManual',()=>itemsRef.current);
  },[userId]);

  useEffect(()=>{
    if(!userId||!agendaLoaded) return;
    const t=setTimeout(()=>requestPlanDataSave(userId),400);
    return()=>{clearTimeout(t);requestPlanDataSave(userId);};
  },[items,userId,agendaLoaded]);

  function add(title,time){setItems(p=>[...p,{id:'m'+Date.now(),title,time}].sort((a,b)=>String(a.time).localeCompare(String(b.time))));}
  function remove(id){setItems(p=>p.filter(i=>i.id!==id));}
  return {items,add,remove};
}


function useClock(){
  const [now,setNow]=useState(new Date());
  useEffect(()=>{const t=setInterval(()=>setNow(new Date()),1000*20);return()=>clearInterval(t);},[]);
  return now;
}

// ── CONFIGURAÇÃO GOOGLE WEATHER API ───────────────────────────────────────────
// Fonte principal do clima. Precisa de uma API Key própria (diferente do
// Client ID OAuth usado pro login/agenda):
// 1) No mesmo projeto do Google Cloud, vá em "APIs & Services > Library" e
//    habilite a "Weather API"
// 2) Em "APIs & Services > Credentials", crie uma "API Key"
// 3) Restrinja essa chave por "HTTP referrers" com o domínio do seu site
//    (recomendado, evita uso indevido da chave)
// 4) Cole a chave no .env como VITE_GOOGLE_WEATHER_API_KEY
// Sem essa chave configurada, o app usa o Open-Meteo automaticamente (não
// precisa de chave nenhuma), então nada quebra enquanto isso não é feito.
const GOOGLE_WEATHER_API_KEY = import.meta.env.VITE_GOOGLE_WEATHER_API_KEY || '';

function useWeatherLocation(){
  const [state,setState]=useState({loading:true,temp:null,city:null,error:null,code:null,iconUri:null,isDay:1,uvMax:null,rain:null,sunrise:null,sunset:null,tempTrend:null});
  useEffect(()=>{
    if(!navigator.geolocation){setState(s=>({...s,loading:false,error:'Geolocalização indisponível'}));return;}
    navigator.geolocation.getCurrentPosition(async(pos)=>{
      const {latitude,longitude}=pos.coords;
      try{
        if(GOOGLE_WEATHER_API_KEY) await fetchFromGoogleWeather(latitude,longitude,setState);
        else await fetchFromOpenMeteo(latitude,longitude,setState);
      }catch{setState(s=>({...s,loading:false,error:'Falha ao buscar o clima'}));}
    },()=>{setState(s=>({...s,loading:false,error:'Permissão de localização negada'}));},{timeout:8000});
  },[]);
  return state;
}

async function fetchFromGoogleWeather(latitude,longitude,setState){
  const key=GOOGLE_WEATHER_API_KEY;
  const base='https://weather.googleapis.com/v1';
  const loc=`location.latitude=${latitude}&location.longitude=${longitude}`;
  const [curRes,daysRes,hoursRes,geoRes]=await Promise.all([
    fetch(`${base}/currentConditions:lookup?key=${key}&${loc}&languageCode=pt-BR`),
    fetch(`${base}/forecast/days:lookup?key=${key}&${loc}&days=1&languageCode=pt-BR`),
    fetch(`${base}/forecast/hours:lookup?key=${key}&${loc}&hours=18&languageCode=pt-BR`),
    fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=pt`),
  ]);
  if(!curRes.ok){
    // chave inválida, API não habilitada, sem billing etc. — cai pro Open-Meteo
    await fetchFromOpenMeteo(latitude,longitude,setState);
    return;
  }
  const cur=await curRes.json();
  const daysData=daysRes.ok?await daysRes.json():null;
  const hoursData=hoursRes.ok?await hoursRes.json():null;
  const geo=await geoRes.json();

  const today=daysData?.forecastDays?.[0];
  const fmtHM=iso=>iso?new Date(iso).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):null;
  const sunrise=fmtHM(today?.sunEvents?.sunriseTime);
  const sunset=fmtHM(today?.sunEvents?.sunsetTime);
  const uvMax=today?.daytimeForecast?.uvIndex??cur.uvIndex??null;

  // janela de chuva prevista, usando probabilidade de precipitação por hora
  let rain=null;
  const hours=hoursData?.forecastHours||[];
  const THRESH=50;
  let startIdx=-1;
  for(let i=0;i<hours.length;i++){
    if((hours[i]?.precipitation?.probability?.percent||0)>=THRESH){startIdx=i;break;}
  }
  if(startIdx>=0){
    let endIdx=startIdx;
    for(let i=startIdx;i<hours.length;i++){
      if((hours[i]?.precipitation?.probability?.percent||0)>=THRESH) endIdx=i; else break;
    }
    const fmtHour=h=>h?.interval?.startTime?fmtHM(h.interval.startTime):'';
    rain={active:startIdx===0,starts:fmtHour(hours[startIdx]),stops:fmtHour(hours[Math.min(endIdx+1,hours.length-1)])};
  }

  // variação de temperatura nas próximas ~2h
  let tempTrend=null;
  if(hours.length>2 && cur.temperature?.degrees!=null && hours[2]?.temperature?.degrees!=null){
    const delta=hours[2].temperature.degrees-cur.temperature.degrees;
    if(Math.abs(delta)>=3) tempTrend={delta:Math.round(delta),rising:delta>0};
  }

  setState({
    loading:false,error:null,
    temp:Math.round(cur.temperature?.degrees),
    city:geo?.city||geo?.locality||geo?.principalSubdivision||'Local desconhecido',
    code:cur.weatherCondition?.type||null,
    iconUri:cur.weatherCondition?.iconBaseUri||null,
    isDay:cur.isDaytime?1:0,
    uvMax,sunrise,sunset,tempTrend,rain,
  });
}

// Alternativa sem chave nenhuma, usada automaticamente se a Google Weather
// API não estiver configurada — assim o clima nunca fica "quebrado".
async function fetchFromOpenMeteo(latitude,longitude,setState){
  const [wRes,gRes]=await Promise.all([
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=precipitation_probability,temperature_2m&daily=uv_index_max,sunrise,sunset&timezone=auto`),
    fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=pt`)
  ]);
  const wData=await wRes.json();
  const gData=await gRes.json();

  let rain=null;
  const times=wData?.hourly?.time||[];
  const probs=wData?.hourly?.precipitation_probability||[];
  const temps=wData?.hourly?.temperature_2m||[];
  const nowMs=Date.now();
  const nowIdx=times.findIndex(t=>new Date(t).getTime()>=nowMs);
  if(nowIdx>=0){
    const THRESH=50;
    let startIdx=-1;
    for(let i=nowIdx;i<Math.min(times.length,nowIdx+18);i++){
      if(probs[i]>=THRESH){startIdx=i;break;}
    }
    if(startIdx>=0){
      let endIdx=startIdx;
      for(let i=startIdx;i<Math.min(times.length,startIdx+18);i++){
        if(probs[i]>=THRESH) endIdx=i; else break;
      }
      const fmt=t=>new Date(t).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
      rain={active:startIdx===nowIdx,starts:fmt(times[startIdx]),stops:fmt(times[Math.min(endIdx+1,times.length-1)])};
    }
  }

  let tempTrend=null;
  if(nowIdx>=0 && temps.length>nowIdx+2){
    const nowTemp=wData?.current_weather?.temperature;
    const futureTemp=temps[nowIdx+2];
    const delta=futureTemp-nowTemp;
    if(Math.abs(delta)>=3) tempTrend={delta:Math.round(delta),rising:delta>0};
  }

  const fmtHM=iso=>iso?new Date(iso).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):null;

  setState({
    loading:false,error:null,
    temp:Math.round(wData?.current_weather?.temperature),
    city:gData?.city||gData?.locality||gData?.principalSubdivision||'Local desconhecido',
    code:wData?.current_weather?.weathercode??0,
    iconUri:null,
    isDay:wData?.current_weather?.is_day??1,
    uvMax:wData?.daily?.uv_index_max?.[0]??null,
    sunrise:fmtHM(wData?.daily?.sunrise?.[0]),
    sunset:fmtHM(wData?.daily?.sunset?.[0]),
    tempTrend,rain,
  });
}


function uvInfo(uv){
  if(uv==null) return null;
  if(uv>=11) return {label:'Extremo',color:'var(--danger)'};
  if(uv>=8) return {label:'Muito alto',color:'var(--danger)'};
  if(uv>=6) return {label:'Alto',color:'var(--warning)'};
  if(uv>=3) return {label:'Moderado',color:'var(--warning)'};
  return {label:'Baixo',color:'var(--success)'};
}

// Quadro de horários totalmente personalizável: linhas livres (rótulo editável,
// ex. "08:00 - 09:40") x colunas dos 7 dias, com cada célula editável.
function useTimetable(userId){
  const [data,setData]=useState(()=>{
    try{
      const raw=JSON.parse(localStorage.getItem('timetable_v2'));
      if(raw&&Array.isArray(raw.rows)) return raw;
    }catch{}
    return {rows:[],cells:{}};
  });
  useEffect(()=>{localStorage.setItem('timetable_v2',JSON.stringify(data));},[data]);

  // Carrega a grade salva na nuvem (permite editar em qualquer dispositivo)
  const [timetableLoaded,setTimetableLoaded]=useState(false);
  useEffect(()=>{
    if(!userId) return;
    supabase.from('user_plans').select('plan_data').eq('user_id',userId).maybeSingle().then(({data:row})=>{
      const cloud=row?.plan_data?.timetable;
      if(cloud&&Array.isArray(cloud.rows)) setData(cloud);
    }).finally(()=>setTimetableLoaded(true));
  },[userId]);

  // Registra na fila central (sempre lê o valor mais atual via ref)
  const dataRef=useRef(data);
  dataRef.current=data;
  useEffect(()=>{
    if(!userId) return;
    return registerPlanDataField('timetable',()=>dataRef.current);
  },[userId]);

  // Pede o salvamento a cada mudança (com atraso pra agrupar digitação rápida)
  useEffect(()=>{
    if(!userId||!timetableLoaded) return;
    const t=setTimeout(()=>requestPlanDataSave(userId),400);
    return()=>{clearTimeout(t);requestPlanDataSave(userId);};
  },[data,userId,timetableLoaded]);

  function addRow(label){
    setData(d=>({...d,rows:[...d.rows,{id:'r'+Date.now()+Math.random().toString(36).slice(2,6),label:label||'Novo horário'}]}));
  }
  function removeRow(id){
    setData(d=>{
      const cells={...d.cells};
      Object.keys(cells).forEach(k=>{if(k.startsWith(id+'-')) delete cells[k];});
      return {rows:d.rows.filter(r=>r.id!==id),cells};
    });
  }
  function renameRow(id,label){
    setData(d=>({...d,rows:d.rows.map(r=>r.id===id?{...r,label}:r)}));
  }
  function moveRow(id,dir){
    setData(d=>{
      const idx=d.rows.findIndex(r=>r.id===id);
      const newIdx=idx+dir;
      if(idx<0||newIdx<0||newIdx>=d.rows.length) return d;
      const rows=[...d.rows];
      [rows[idx],rows[newIdx]]=[rows[newIdx],rows[idx]];
      return {...d,rows};
    });
  }
  function setCell(rowId,day,value){
    setData(d=>({...d,cells:{...d.cells,[`${rowId}-${day}`]:value}}));
  }
  return {data,addRow,removeRow,renameRow,moveRow,setCell};
}

function extractTimeFromLabel(label){
  const m=/(\d{1,2}):(\d{2})/.exec(label||'');
  if(!m) return null;
  return m[1].padStart(2,'0')+':'+m[2];
}

function getNextClass(data){
  if(!data||!data.rows||!data.rows.length) return null;
  const now=new Date();
  const todayIdx=now.getDay()===0?6:now.getDay()-1;
  const hhmm=now.toTimeString().slice(0,5);
  const entries=[];
  data.rows.forEach(r=>{
    const t=extractTimeFromLabel(r.label);
    if(!t) return;
    WEEK_DAYS.forEach(d=>{
      const subj=data.cells[`${r.id}-${d}`];
      if(subj&&subj.trim()) entries.push({day:d,time:t,subject:subj.trim()});
    });
  });
  for(let off=0;off<7;off++){
    const dIdx=(todayIdx+off)%7;
    const dayLabel=WEEK_DAYS[dIdx];
    const todays=entries.filter(e=>e.day===dayLabel).sort((a,b)=>a.time.localeCompare(b.time));
    const valid=off===0?todays.filter(e=>e.time>hhmm):todays;
    if(valid.length) return {...valid[0],isToday:off===0};
  }
  return null;
}

// Data local (não UTC) no formato AAAA-MM-DD — usada para marcar "hoje" de
// forma consistente com o fuso horário do usuário
function localDateKey(d=new Date()){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getNextMeal(day){
  if(!day||!day.meals||!day.meals.length) return null;
  const now=new Date();
  const hhmm=now.toTimeString().slice(0,5);
  const sorted=[...day.meals].sort((a,b)=>String(a.time||'').localeCompare(String(b.time||'')));
  const upcoming=sorted.find(m=>String(m.time||'')>hhmm);
  if(upcoming) return {name:upcoming.name,time:upcoming.time,when:'hoje'};
  return {name:sorted[0].name,time:sorted[0].time,when:'amanhã'};
}

function getNextExam(){
  try{
    const data=JSON.parse(localStorage.getItem('studyApp'));
    if(!data?.events) return null;
    const today=new Date(); today.setHours(0,0,0,0);
    const provas=data.events.filter(e=>e.type==='prova'&&e.date)
      .map(e=>({...e,d:new Date(e.date+'T00:00:00')}))
      .filter(e=>e.d>=today).sort((a,b)=>a.d-b.d);
    if(!provas.length) return null;
    const subj=(data.subjects||[]).find(s=>s.id===provas[0].subjectId);
    return {title:provas[0].title,subject:subj?.name||provas[0].title,date:provas[0].d.toLocaleDateString('pt-BR')};
  }catch{return null;}
}

// Aproximação genérica do saldo do mês, somando as colunas numéricas de cada
// tabela do Balanço que está marcada para entrar no saldo (mesma lógica de
// sinais/inclusão usada no controle-financeiro.html). O valor exato sempre
// pode ser conferido dentro da própria aba Finanças.
// Replica EXATAMENTE a fórmula do "💡 SALDO DO MÊS" (aba Balanço Mensal),
// que é o número de verdade que aparece lá — diferente do "Total Geral" da
// aba Resumo & Perfis (outro cálculo). Fica sincronizado, sem inventar uma
// terceira fórmula aproximada.
// As fórmulas de verdade (cfGetAllRowsByProfile, cfComputeEntradasTotal,
// cfComputeGastoCategoria, cfGetTableTotal) não vivem mais aqui — foram
// extraídas pra public/finance-formulas.js, carregado via <script> antes
// deste app (veja index.html). É a MESMA cópia usada dentro do Finanças de
// verdade, então as duas telas nunca mais podem divergir por acidente.
function getSaldoPreview(){
  try{
    const state=JSON.parse(localStorage.getItem('cf_state'));
    if(!state?.balancoTables) return null;
    if(!window.FinanceFormulas) return null; // script compartilhado ainda não carregou
    let saldoFinal=0;
    state.balancoTables.forEach(t=>{
      if(!t.includeInSaldo||t.sign===0) return;
      // cópia antiga de finance-formulas.js em cache (sem "version"): refaz Faturas sem somar Pix
      const total=(t.type==='faturas_auto'&&!(window.FinanceFormulas.version>=2))
        ?(state.faturas||[]).reduce((s,f)=>s+(f.rows||[]).reduce((s2,r)=>s2+(parseFloat(r.value)||0),0),0)
        :window.FinanceFormulas.cfGetTableTotal(state,t);
      saldoFinal += total*t.sign;
    });
    return saldoFinal;
  }catch{return null;}
}

// Lê a tabela "Planejamento Mensal" salva pelo Finanças, pra mostrar uma
// cópia dinâmica do gráfico de orçamento (expectativa x gasto) na Início.
function getPlanejamentoPreview(){
  try{
    const state=JSON.parse(localStorage.getItem('cf_state'));
    if(!state?.balancoTables) return null;
    if(!window.FinanceFormulas) return null;
    const planTable=state.balancoTables.find(t=>t.type==='planejamento');
    if(!planTable) return null;
    const rows=(planTable.rows||[]).filter(r=>r.categoria&&r.profileIdx!=null).map(r=>({
      categoria:r.categoria,
      profileName:(typeof state.profiles?.[r.profileIdx]==='object'?state.profiles[r.profileIdx]?.name:state.profiles?.[r.profileIdx])||'—',
      valor:parseFloat(r.valor)||0,
      gasto:window.FinanceFormulas.cfComputeGastoCategoria(state,r.profileIdx,r.categoria),
    }));
    return rows.length?rows:null;
  }catch{return null;}
}

// ── TIMER DE FOCO (aba Estudos) ───────────────────────────────────────────────
const STUDY_METHODS=[
  {id:'pomodoro',name:'Pomodoro Clássico',focus:25*60,brk:5*60,
    desc:'25 min de foco + 5 min de pausa. Técnica de Francesco Cirillo, uma das mais estudadas e usadas no mundo para manter concentração.'},
  {id:'52-17',name:'52/17 (DeskTime)',focus:52*60,brk:17*60,
    desc:'52 min de foco + 17 min de pausa. Baseado em estudo da DeskTime com os 10% de usuários mais produtivos, que faziam pausas mais longas e regulares.'},
  {id:'flowtime',name:'Flowtime',focus:null,brk:null,
    desc:'Foco livre até você perceber queda de concentração; a pausa é 1/5 do tempo focado. Respeita o ritmo natural de atenção de cada pessoa, sem forçar um bloco fixo.'}
];

const STUDY_METHOD_ICONS={pomodoro:'timer','52-17':'clock',flowtime:'activity'};

function FocusTimer(){
  const [method,setMethod]=useState(null);
  const [phase,setPhase]=useState('focus');
  const [seconds,setSeconds]=useState(0);
  const [running,setRunning]=useState(false);
  const [cycles,setCycles]=useState(0);
  const intervalRef=useRef(null);

  useEffect(()=>{
    if(!running||!method) return;
    intervalRef.current=setInterval(()=>{
      setSeconds(s=>{
        if(method.id==='flowtime'&&phase==='focus') return s+1;
        if(method.id==='flowtime'&&phase==='break'){
          if(s<=1){setRunning(false);return 0;}
          return s-1;
        }
        if(s<=1){
          if(phase==='focus'){setPhase('break');setCycles(c=>c+1);return method.brk;}
          setPhase('focus');return method.focus;
        }
        return s-1;
      });
    },1000);
    return ()=>clearInterval(intervalRef.current);
  },[running,method,phase]);

  function chooseMethod(m){
    setMethod(m);setPhase('focus');setCycles(0);
    setSeconds(m.id==='flowtime'?0:m.focus);setRunning(true);
  }
  function endFlowFocus(){
    const focused=seconds;
    setPhase('break');
    setSeconds(Math.max(60,Math.round(focused/5)));
  }
  function reset(){setRunning(false);clearInterval(intervalRef.current);setMethod(null);}
  function fmt(s){const m=Math.floor(s/60).toString().padStart(2,'0');const ss=(s%60).toString().padStart(2,'0');return `${m}:${ss}`;}

  const cardStyle={margin:'18px 16px 0',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:20,padding:18,boxShadow:'var(--shadow-sm)'};

  if(!method) return(
    <div style={cardStyle}>
      <div style={{fontSize:15,fontWeight:800,color:'var(--text)',marginBottom:4}}>⏱️ Timer de Foco</div>
      <div style={{fontSize:12,color:'var(--muted2)',marginBottom:14}}>Escolha um dos 3 métodos de estudo com mais respaldo científico:</div>
      {STUDY_METHODS.map(m=>(
        <button key={m.id} onClick={()=>chooseMethod(m)} style={{display:'flex',alignItems:'center',gap:12,width:'100%',textAlign:'left',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,padding:'12px 14px',marginBottom:10,cursor:'pointer'}}>
          <span style={{display:'inline-flex',flexShrink:0,color:'var(--accent)'}}><Glyph name={STUDY_METHOD_ICONS[m.id]} size={26}/></span>
          <span>
            <div style={{fontSize:14,fontWeight:800,color:'var(--accent-dark)'}}>{m.name}</div>
            <div style={{fontSize:12,color:'var(--muted2)',marginTop:3,lineHeight:1.5}}>{m.desc}</div>
          </span>
        </button>
      ))}
    </div>
  );

  return(
    <div style={{...cardStyle,textAlign:'center'}}>
      <div style={{fontSize:13,fontWeight:700,color:'var(--muted2)',marginBottom:10}}><span style={{display:'inline-flex',verticalAlign:'-0.2em',marginRight:6}}><Glyph name={STUDY_METHOD_ICONS[method.id]} size={16}/></span>{method.name} — {phase==='focus'?'Foco':'Pausa'}{cycles>0?` · ciclo ${cycles+1}`:''}</div>
      <div style={{
        width:170,height:170,margin:'0 auto 16px',borderRadius:'50%',
        background:phase==='focus'?'var(--accent-soft)':'var(--info-soft)',
        border:`3px solid ${phase==='focus'?'var(--accent)':'var(--info)'}`,
        display:'flex',alignItems:'center',justifyContent:'center'
      }}>
        <div style={{fontSize:38,fontWeight:900,color:phase==='focus'?'var(--accent-dark)':'var(--info)',fontVariantNumeric:'tabular-nums'}}>{fmt(seconds)}</div>
      </div>
      <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap'}}>
        <button onClick={()=>setRunning(r=>!r)} style={{...S.btn(running?'var(--muted)':'var(--success)'),padding:'10px 22px'}}>{running?'⏸ Pausar':'▶️ Retomar'}</button>
        {method.id==='flowtime'&&phase==='focus'&&<button onClick={endFlowFocus} style={{...S.btn('var(--info)'),padding:'10px 22px'}}>Ir para pausa</button>}
        <button onClick={reset} style={{...S.btn('var(--danger)'),padding:'10px 22px'}}>✕ Encerrar</button>
      </div>
    </div>
  );
}

// ── ABA ESTUDOS ────────────────────────────────────────────────────────────────
function StudyTab({onHome,onOpenProfile,onLogout}){
  return(
    <div style={S.wrap}>
      <div style={S.header}>
        <div style={{fontSize:18,fontWeight:800,color:'var(--text)'}}>Estudos</div>
      </div>
      <div style={{paddingBottom:100}}>
        <div style={{padding:'16px 16px 0'}}>
          <div style={{borderRadius:16,overflow:'hidden',border:'1px solid var(--border)',height:'65vh',minHeight:460,background:'var(--surface)'}}>
            <iframe title="Estudos" src={`/estudos.html?sbUrl=${encodeURIComponent(SUPABASE_URL)}&sbKey=${encodeURIComponent(SUPABASE_ANON_KEY)}`} style={{width:'100%',height:'100%',border:'none'}}/>
          </div>
        </div>
        <FocusTimer/>
      </div>
    </div>
  );
}

// ── ABA FINANÇAS ────────────────────────────────────────────────────────────────
function FinanceTab({onHome,onOpenProfile,onLogout}){
  return(
    <div style={S.wrap}>
      <div style={{maxWidth:900,margin:'0 auto'}}>
        <div style={{height:'calc(100dvh - 84px)',minHeight:560,background:'var(--bg)'}}>
          <iframe title="Finanças" src={`/controle-financeiro.html?sbUrl=${encodeURIComponent(SUPABASE_URL)}&sbKey=${encodeURIComponent(SUPABASE_ANON_KEY)}`} style={{width:'100%',height:'100%',border:'none'}}/>
        </div>
      </div>
    </div>
  );
}

// ── ABA HÁBITOS E PERFORMANCE ─────────────────────────────────────────────────
function HabitsTab({onHome,onOpenProfile,onLogout}){
  return(
    <div style={S.wrap}>
      <div style={S.header}>
        <div style={{fontSize:18,fontWeight:800,color:'var(--text)'}}>Hábitos e performance</div>
      </div>
      <div style={{padding:16,paddingBottom:100}}>
        <div style={{borderRadius:16,overflow:'hidden',border:'1px solid var(--border)',height:'82vh',minHeight:600,background:'var(--surface)'}}>
          <iframe title="Hábitos e Performance" src={`/my-fit-era.html?sbUrl=${encodeURIComponent(SUPABASE_URL)}&sbKey=${encodeURIComponent(SUPABASE_ANON_KEY)}&hideHeader=1`} style={{width:'100%',height:'100%',border:'none'}}/>
        </div>
      </div>
    </div>
  );
}

// ── QUADRO DE HORÁRIOS (faculdade) ──────────────────────────────────────────────
function TimetableScreen({onHome,userId}){
  const {data,addRow,removeRow,renameRow,moveRow,setCell}=useTimetable(userId);
  const T=HOME_THEME;

  return(
    <div style={{minHeight:'100vh',background:T.page,padding:'16px 10px 100px'}}>
      <div style={{maxWidth:900,margin:'0 auto',background:T.outerCard,borderRadius:24,padding:18,boxShadow:'var(--shadow-sm)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
          <button style={{background:'none',border:'none',fontSize:20,cursor:'pointer',color:T.ink}} onClick={onHome}>←</button>
          <div style={{fontFamily:"'Caveat',cursive",fontSize:30,fontWeight:700,color:T.ink}}>Grade de Horários</div>
        </div>

        <div style={{overflowX:'auto',borderRadius:12,border:`1px solid ${T.line}`}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth:760,tableLayout:'fixed'}}>
            <thead>
              <tr>
                <th style={{padding:'10px 8px',background:T.sage,color:T.ink,textAlign:'left',minWidth:140}}>Horário</th>
                {WEEK_DAYS.map(d=>(
                  <th key={d} style={{padding:'10px 4px',background:T.sage,color:T.ink,borderLeft:'1px solid var(--border)',minWidth:90}}>{FullDayName(d)}</th>
                ))}
                <th style={{background:T.sage,width:90}}></th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r,ri)=>(
                <tr key={r.id} style={{background:ri%2===0?'var(--accent-soft)':'var(--surface)'}}>
                  <td style={{padding:2,borderTop:`1px solid ${T.line}`}}>
                    <input value={r.label} onChange={e=>renameRow(r.id,e.target.value)}
                      style={{width:'100%',border:'none',background:'transparent',fontWeight:800,color:T.ink,fontSize:12,padding:'8px 6px',outline:'none',boxSizing:'border-box'}}
                      placeholder="ex: 08:00 - 09:40"/>
                  </td>
                  {WEEK_DAYS.map(d=>(
                    <td key={d} style={{padding:2,borderTop:`1px solid ${T.line}`,borderLeft:`1px solid ${T.line}`}}>
                      <input value={data.cells[`${r.id}-${d}`]||''} onChange={e=>setCell(r.id,d,e.target.value)}
                        style={{width:'100%',border:'none',background:'transparent',color:T.ink,fontSize:12,padding:'8px 6px',textAlign:'center',outline:'none',boxSizing:'border-box'}}
                        placeholder="—"/>
                    </td>
                  ))}
                  <td style={{padding:2,borderTop:`1px solid ${T.line}`,whiteSpace:'nowrap',textAlign:'center'}}>
                    <button onClick={()=>moveRow(r.id,-1)} style={{background:'none',border:'none',cursor:'pointer',fontSize:13,padding:'0 3px'}} title="Mover para cima">↑</button>
                    <button onClick={()=>moveRow(r.id,1)} style={{background:'none',border:'none',cursor:'pointer',fontSize:13,padding:'0 3px'}} title="Mover para baixo">↓</button>
                    <button onClick={()=>removeRow(r.id)} style={{background:'none',border:'none',cursor:'pointer',fontSize:14,color:'var(--danger)',padding:'0 3px'}} title="Remover linha"><Icon name="x" size={18}/></button>
                  </td>
                </tr>
              ))}
              {!data.rows.length&&(
                <tr><td colSpan={9} style={{padding:'24px 10px',textAlign:'center',color:T.muted,background:'var(--surface)'}}>Nenhum horário ainda. Toque em "+ Adicionar linha" para começar a montar sua grade.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <button style={{marginTop:14,background:T.sageDark,border:'none',borderRadius:10,color:'var(--on-accent)',fontWeight:800,fontSize:14,padding:'12px 18px',cursor:'pointer'}}
          onClick={()=>addRow('')}>
          + Adicionar linha de horário
        </button>

        <div style={{fontSize:12,color:T.muted,marginTop:10,lineHeight:1.6}}>
          Cada linha e cada célula são livres — escreva o rótulo do horário do jeito que quiser (ex: "08:00 - 09:40", "Manhã", "Bloco 1")
          e o nome da disciplina em cada dia. Use os botões ↑ ↓ para reordenar e ✕ para remover uma linha.<br/>
          Dica: se o rótulo começar com um horário no formato <b>HH:MM</b>, o balão de Estudos na tela inicial usa isso para calcular a próxima aula automaticamente.
        </div>
      </div>
    </div>
  );
}

// ── TEMA VISUAL DA TELA INICIAL (paleta creme/verde-sálvia, conforme mockup) ──
const HOME_THEME={
  page:'var(--bg)', card:'var(--surface)', outerCard:'var(--surface)',
  pillBg:'var(--surface2)', sage:'var(--accent-soft)', sageDark:'var(--accent-fill)',
  ink:'var(--text)', muted:'var(--muted)', line:'var(--border)',
};

function FullDayName(short){
  return ({Seg:'SEGUNDA',Ter:'TERÇA',Qua:'QUARTA',Qui:'QUINTA',Sex:'SEXTA',Sáb:'SÁBADO',Dom:'DOMINGO'})[short]||short;
}

// ── COMPARADOR DE ALIMENTOS ──────────────────────────────────────────────────
// Compara dois alimentos da tabela TACO por preço, dizendo qual vale mais a
// pena (mais proteína por real, mais barato por kg, ou mais calorias por real).
function FoodSlot({label,slot,setSlot,accent}){
  const [query,setQuery]=useState(slot.food?slot.food.n:'');
  const [open,setOpen]=useState(false);
  const results=useMemo(()=>searchTACO(query,8),[query]);

  function pick(food){
    setSlot(s=>({...s,food}));
    setQuery(food.n);
    setOpen(false);
  }

  return(
    <div style={{flex:'1 1 220px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:16,padding:14}}>
      <div style={{fontSize:12,fontWeight:700,color:accent,marginBottom:8,letterSpacing:'.06em',textTransform:'uppercase'}}>{label}</div>
      <div style={{position:'relative'}}>
        <input
          value={query}
          onChange={e=>{setQuery(e.target.value);setOpen(true);if(!e.target.value)setSlot(s=>({...s,food:null}));}}
          onFocus={()=>setOpen(true)}
          placeholder="Buscar alimento..."
          style={{width:'100%',border:'1px solid var(--border)',borderRadius:12,padding:'0 12px',height:44,fontSize:14,outline:'none',boxSizing:'border-box',background:'var(--surface2)',color:'var(--text)'}}
        />
        {open&&results.length>0&&(
          <div style={{position:'absolute',top:'100%',left:0,right:0,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,marginTop:2,zIndex:20,maxHeight:180,overflowY:'auto',boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}}>
            {results.map(r=>(
              <div key={r.id} onClick={()=>pick(r)} style={{padding:'12px 12px',fontSize:14,cursor:'pointer',borderBottom:'1px solid var(--border)'}}>
                {r.n}
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{display:'flex',gap:8,marginTop:10}}>
        <div style={{flex:1}}>
          <div style={{fontSize:12,color:'var(--muted)',fontWeight:600,marginBottom:4}}>Quantidade (g) (g)</div>
          <div style={{display:'flex',gap:4}}>
            <input type="number" value={slot.qty} onChange={e=>setSlot(s=>({...s,qty:parseFloat(e.target.value)||0}))}
              style={{width:'100%',border:'1px solid var(--border)',borderRadius:12,padding:'0 10px',height:44,fontSize:14,outline:'none',boxSizing:'border-box',background:'var(--surface2)',color:'var(--text)'}}/>
            <button onClick={()=>setSlot(s=>({...s,qty:1000}))} style={{fontSize:13,fontWeight:700,color:accent,background:'none',border:'1px solid var(--border)',borderRadius:12,padding:'0 10px',minWidth:44,cursor:'pointer',whiteSpace:'nowrap'}}>1kg</button>
          </div>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:12,color:'var(--muted)',fontWeight:600,marginBottom:4}}>Preço (R$) (R$)</div>
          <input type="number" step="0.01" value={slot.price} onChange={e=>setSlot(s=>({...s,price:e.target.value}))}
            placeholder="0,00" style={{width:'100%',border:'1px solid var(--border)',borderRadius:12,padding:'0 10px',height:44,fontSize:14,outline:'none',boxSizing:'border-box',background:'var(--surface2)',color:'var(--text)'}}/>
        </div>
      </div>
    </div>
  );
}

export function computeFoodMetrics(slot){
  const price=parseFloat(slot.price);
  if(!slot.food||!price||price<=0||!slot.qty) return null;
  const factor=slot.qty/100;
  const totalKcal=slot.food.e*factor, totalP=slot.food.p*factor, totalCb=slot.food.cb*factor, totalL=slot.food.l*factor;
  return {
    pricePerKg: price/(slot.qty/1000),
    kcalPerReal: totalKcal/price,
    proteinPerReal: totalP/price,
    totalKcal,totalP,totalCb,totalL,
  };
}

const COMPARATOR_PRIORITIES=[
  {id:'protein',label:'Mais proteína por R$',key:'proteinPerReal',fmt:v=>`${v.toFixed(1)}g/R$`},
  {id:'price',label:'Mais barato por kg',key:'pricePerKg',fmt:v=>`R$${v.toFixed(2)}/kg`,lowerIsBetter:true},
  {id:'kcal',label:'Mais calorias por R$',key:'kcalPerReal',fmt:v=>`${v.toFixed(0)}kcal/R$`},
];

// Cópia dinâmica do gráfico de orçamento (Planejamento Mensal, dentro de
// Finanças) mostrada na Início — mesmos dados, sempre atualizada.
function BudgetChartPreview(){
  const rows=getPlanejamentoPreview();
  if(!rows) return null;
  const T=HOME_THEME;
  const maxVal=Math.max(1,...rows.map(r=>Math.max(r.valor,r.gasto)));
  const chartH=110;
  return(
    <div style={{border:`1px solid ${T.line}`,borderRadius:20,overflow:'hidden',background:T.card}}>
      <div style={{padding:'16px 16px 0'}}>
        <h2 style={{margin:0,fontFamily:'var(--font-display)',fontWeight:500,fontSize:20,lineHeight:'26px',color:T.ink}}>Orçamento do mês</h2>
      </div>
      <div style={{padding:'16px 12px',background:T.card,overflowX:'auto'}}>
        <div style={{display:'flex',gap:18,alignItems:'flex-end',minWidth:'min-content'}}>
          {rows.map((r,i)=>{
            const expH=Math.round(r.valor/maxVal*chartH);
            const gasH=Math.round(r.gasto/maxVal*chartH);
            const over=r.gasto>r.valor;
            return(
              <div key={i} style={{display:'flex',flexDirection:'column',alignItems:'center',minWidth:64}}>
                <div style={{display:'flex',gap:5,alignItems:'flex-end',height:chartH}}>
                  <div title={`Expectativa: R$ ${r.valor.toFixed(2)}`} style={{width:18,height:Math.max(2,expH),background:T.sageDark,opacity:.5,borderRadius:'4px 4px 0 0'}}/>
                  <div title={`Gasto: R$ ${r.gasto.toFixed(2)}`} style={{width:18,height:Math.max(2,gasH),background:over?'var(--warning)':T.sageDark,borderRadius:'4px 4px 0 0'}}/>
                </div>
                <div style={{fontSize:12,fontWeight:600,color:T.ink,textAlign:'center',marginTop:6,maxWidth:70,overflowWrap:'break-word'}}>{r.categoria}</div>
                <div style={{fontSize:12,color:T.muted,textAlign:'center'}}>{r.profileName}</div>
              </div>
            );
          })}
        </div>
        <div style={{display:'flex',gap:14,fontSize:12,color:T.muted,marginTop:14,flexWrap:'wrap'}}>
          <span><span style={{display:'inline-block',width:9,height:9,background:T.sageDark,opacity:.5,borderRadius:2,marginRight:4,verticalAlign:'middle'}}/>Expectativa</span>
          <span><span style={{display:'inline-block',width:9,height:9,background:T.sageDark,borderRadius:2,marginRight:4,verticalAlign:'middle'}}/>Gasto</span>
          <span><span style={{display:'inline-block',width:9,height:9,background:'var(--warning)',borderRadius:2,marginRight:4,verticalAlign:'middle'}}/>Estourou</span>
        </div>
      </div>
    </div>
  );
}

function FoodComparator(){
  const [priority,setPriority]=useState('protein');
  const [slotA,setSlotA]=useState({food:null,qty:1000,price:''});
  const [slotB,setSlotB]=useState({food:null,qty:1000,price:''});

  const mA=useMemo(()=>computeFoodMetrics(slotA),[slotA]);
  const mB=useMemo(()=>computeFoodMetrics(slotB),[slotB]);
  const p=COMPARATOR_PRIORITIES.find(x=>x.id===priority);

  let winner=null;
  if(mA&&mB){
    const vA=mA[p.key], vB=mB[p.key];
    if(vA!==vB) winner = p.lowerIsBetter ? (vA<vB?'A':'B') : (vA>vB?'A':'B');
  }

  return(
    <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:20,padding:16,marginBottom:16,boxShadow:'none'}}>
      <div style={{fontFamily:'var(--font-display)',fontWeight:500,fontSize:20,lineHeight:'26px',color:'var(--text)',marginBottom:2}}>Comparador de alimentos</div>
      <div style={{fontSize:13,color:'var(--muted)',marginBottom:12}}>Qual alimento vale mais a pena levar pra casa?</div>

      <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
        {COMPARATOR_PRIORITIES.map(pr=>(
          <button key={pr.id} onClick={()=>setPriority(pr.id)}
            style={{fontSize:13,fontWeight:700,padding:'10px 14px',minHeight:44,borderRadius:22,cursor:'pointer',
              background:priority===pr.id?'var(--accent)':'var(--surface)',color:priority===pr.id?'var(--on-accent)':'var(--muted)',
              border:`1px solid ${priority===pr.id?'var(--accent)':'var(--border)'}`}}>
            {pr.label}
          </button>
        ))}
      </div>

      <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
        <FoodSlot label="Alimento A" slot={slotA} setSlot={setSlotA} accent="var(--info)"/>
        <FoodSlot label="Alimento B" slot={slotB} setSlot={setSlotB} accent="var(--warning)"/>
      </div>

      {mA&&mB&&(
        <div style={{marginTop:14,background:winner?'var(--accent-soft)':'var(--surface)',border:`1px solid ${winner?'var(--accent)':'var(--border)'}`,borderRadius:14,padding:'12px 14px'}}>
          {winner?(
            <div style={{fontSize:13,fontWeight:800,color:'var(--accent-dark)',marginBottom:8}}>
              {winner==='A'?slotA.food.n:slotB.food.n} vale mais a pena ({p.label})
            </div>
          ):(
            <div style={{fontSize:13,fontWeight:800,color:'var(--muted2)',marginBottom:8}}>Empate nesse critério</div>
          )}
          <div style={{display:'flex',gap:10}}>
            {[['A',slotA,mA,'var(--info)'],['B',slotB,mB,'var(--warning)']].map(([key,slot,m,accent])=>(
              <div key={key} style={{flex:1,fontSize:13,color:'var(--text)',lineHeight:1.7,
                border:winner===key?`2px solid ${accent}`:'1px solid transparent',borderRadius:10,padding:'6px 8px'}}>
                <div style={{fontWeight:800,color:accent,marginBottom:2}}>{slot.food.n}</div>
                <div>Proteína: {m.proteinPerReal.toFixed(1)}g / R$</div>
                <div>Calorias: {m.kcalPerReal.toFixed(0)}kcal / R$</div>
                <div>Preço/kg: R${m.pricePerKg.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HomeDashboard({userId,onNavigate,onOpenProfile,onLogout,onOpenTimetable}){
  const now=useClock();
  const weather=useWeatherLocation();
  const gcal=useGoogleCalendar();
  const manual=useManualAgenda(userId);
  const {data:timetableData}=useTimetable(userId);
  const [newTitle,setNewTitle]=useState('');
  const [newTime,setNewTime]=useState('');
  const [planPreview,setPlanPreview]=useState(null);
  const [shoppingCount,setShoppingCount]=useState(null);
  const [saldoVisible,setSaldoVisible]=useState(()=>!getPrivacy().hideValues);
  useEffect(()=>{const h=()=>setSaldoVisible(false);window.addEventListener('lifeplan:lock',h);return()=>window.removeEventListener('lifeplan:lock',h);},[]);

  const [workoutLog,setWorkoutLog]=useState({});
  const [workoutLogLoaded,setWorkoutLogLoaded]=useState(false);
  const [weeklyGoal,setWeeklyGoal]=useState(null);
  const workoutDoneToday=!!workoutLog[localDateKey()];

  useEffect(()=>{
    loadUserPlan(userId).then(plan=>{
      if(!plan||!plan.length) return;
      const dIdx=new Date().getDay()===0?6:new Date().getDay()-1;
      const day=plan[dIdx];
      setPlanPreview({typeLabel:day?.typeLabel||'Descanso',nextMeal:getNextMeal(day)});
    }).catch(()=>{});
    supabase.from('user_plans').select('plan_data').eq('user_id',userId).maybeSingle()
      .then(({data})=>{
        const shopping=data?.plan_data?.shopping;
        setShoppingCount(Array.isArray(shopping)?shopping.filter(i=>!i.checked).length:null);
        setWorkoutLog(data?.plan_data?.workoutLog||{});
        setWeeklyGoal(data?.plan_data?.workoutGoalPerWeek||null);
      }).catch(()=>{}).finally(()=>setWorkoutLogLoaded(true));
  },[userId]);

  // Registra na fila central (mesma fila usada por água/agenda/horários/plano
  // — nunca mais uma escrita independente correndo com as outras). Só depois
  // de carregar de verdade — sem isso, se ÁGUA ou AGENDA disparassem um
  // salvamento antes do treino-feito carregar, ele entraria na gravação
  // como "{}" (vazio) e apagaria o histórico de treinos feitos.
  const workoutLogRef=useRef(workoutLog);
  workoutLogRef.current=workoutLog;
  useEffect(()=>{
    if(!userId||!workoutLogLoaded) return;
    return registerPlanDataField('workoutLog',()=>workoutLogRef.current);
  },[userId,workoutLogLoaded]);

  function toggleWorkoutDone(){
    const key=localDateKey();
    setWorkoutLog(prev=>{
      const next={...prev};
      if(next[key]) delete next[key]; else next[key]=true;
      return next;
    });
    // dá um instante pro estado assentar e então pede o salvamento
    setTimeout(()=>requestPlanDataSave(userId),50);
  }

  const nextExam=getNextExam();
  const nextClass=getNextClass(timetableData);
  const saldo=getSaldoPreview();
  // Resumo da semana: junta treinos (nuvem) com hábitos/dieta, estudos e faturas lidos do aparelho
  const dayKeyNow=localDateKey(now);
  const weekly=useMemo(()=>{
    if(!workoutLogLoaded) return null;
    const read=k=>{try{return JSON.parse(localStorage.getItem(k));}catch{return null;}};
    return resumoSemanal({
      hoje:new Date(),workoutLog,workoutGoal:weeklyGoal,
      habitsDb:read('habitsAppV4'),studyData:read('studyApp'),faturas:read('cf_state')?.faturas||[]
    });
  },[workoutLogLoaded,workoutLog,weeklyGoal,dayKeyNow]);
  // Saúde e dinheiro: dieta por semana contra o gasto de cada categoria (só aparece se houver dados)
  const cross=useMemo(()=>{
    const read=k=>{try{return JSON.parse(localStorage.getItem(k));}catch{return null;}};
    try{return cruzarSaudeDinheiro({hoje:new Date(),habitsDb:read('habitsAppV4'),state:read('cf_state')});}
    catch{return {status:'sem-dados'};}
  },[dayKeyNow]);
  const timeStr=now.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  const agendaItems=gcal.connected?gcal.events:manual.items;
  const T=HOME_THEME;
  const water=useWaterTracker(userId);
  const [editingGoal,setEditingGoal]=useState(false);
  const [goalInput,setGoalInput]=useState('');
  const [firstName,setFirstName]=useState('');
  useEffect(()=>{
    supabase.auth.getUser().then(({data})=>{
      const m=data?.user?.user_metadata||{};
      const full=m.name||m.full_name||m.display_name||'';
      setFirstName(String(full).trim().split(/\s+/)[0]||'');
    }).catch(()=>{});
  },[userId]);

  const hour=now.getHours();
  const greet=hour<5?'Boa madrugada':hour<12?'Bom dia':hour<18?'Boa tarde':'Boa noite';
  const dateLabel=(()=>{const s=now.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'});return s.charAt(0).toUpperCase()+s.slice(1);})();
  const brl=v=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});

  // quantos "cuidados" ainda esperam hoje: treino, água e a próxima refeição
  const nextMeal=planPreview?.nextMeal;
  const restDay=!planPreview||/descanso/i.test(planPreview.typeLabel||'');
  const pending=(!workoutDoneToday&&!restDay?1:0)+(water.data.current<water.data.goal?1:0)+(nextMeal&&nextMeal.when==='hoje'?1:0);
  const pendingWords=['Nenhum','Um','Dois','Três'];
  const pendingText=pending===0?'Tudo em dia por hoje.':`${pendingWords[pending]} ${pending===1?'cuidado espera':'cuidados esperam'} por você hoje.`;
  const waterPct=Math.min(100,Math.round((water.data.current/Math.max(1,water.data.goal))*100));

  // clima: uma linha principal e, só se houver, avisos curtos
  const wxOk=!weather.loading&&!weather.error;
  const wxLines=[];
  if(wxOk){
    if(weather.rain) wxLines.push(weather.rain.active?`Chovendo agora, leve o guarda-chuva. Deve parar às ${weather.rain.stops}.`:`Chuva às ${weather.rain.starts}, leve o guarda-chuva.`);
    if(uvInfo(weather.uvMax)&&weather.uvMax>=6) wxLines.push(`UV ${uvInfo(weather.uvMax).label.toLowerCase()} hoje, use protetor solar.`);
    if(weather.tempTrend) wxLines.push(`A temperatura deve ${weather.tempTrend.rising?'subir':'cair'} ${Math.abs(weather.tempTrend.delta)}° nas próximas 2h.`);
  }
  const wxIcon=weather.rain?.active?'cloudRain':(weather.isDay===false?'moon':'sun');

  const card={background:'var(--surface)',border:'1px solid var(--border)',borderRadius:20};
  const bubble={width:44,height:44,borderRadius:14,background:'var(--accent-soft)',color:'var(--accent)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0};
  const rowBtn={display:'flex',alignItems:'center',gap:14,flex:1,minWidth:0,minHeight:68,background:'none',border:'none',padding:0,cursor:'pointer',textAlign:'left',font:'inherit',color:'inherit'};
  const rowTitle={fontSize:16,lineHeight:'20px',fontWeight:600,color:'var(--text)'};
  const rowMeta={fontSize:14,lineHeight:'18px',color:'var(--muted)'};
  const eyebrow={margin:'0 0 8px 4px',fontSize:12,lineHeight:'16px',fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',color:'var(--accent)'};
  const sectionTitle={margin:0,fontFamily:'var(--font-display)',fontWeight:500,fontSize:20,lineHeight:'26px',color:'var(--text)'};
  const smallBtn={height:44,padding:'0 14px',borderRadius:12,border:'none',background:'var(--accent-soft)',color:'var(--accent)',fontFamily:'inherit',fontSize:14,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:6,flexShrink:0};
  const careRow=(key,{icon,title,metas,onClick,action,last})=>(
    <div key={key} style={{display:'flex',alignItems:'center',gap:12,borderBottom:last?'none':'1px solid var(--border2)'}}>
      <button onClick={onClick} style={rowBtn}>
        <span style={bubble}><Icon name={icon}/></span>
        <span style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',gap:2}}>
          <span style={rowTitle}>{title}</span>
          {metas.map((m,i)=><span key={i} style={rowMeta}>{m}</span>)}
        </span>
        {!action&&<Icon name="chevron" size={20} style={{color:'var(--muted)'}}/>}
      </button>
      {action}
    </div>
  );

  return(
    <div style={{minHeight:'100vh',background:'var(--bg)',color:'var(--text)',fontFamily:'var(--font-body)',paddingBottom:110}}>
      <div style={{maxWidth:640,margin:'0 auto',padding:'0 20px',display:'flex',flexDirection:'column',gap:16}}>

        <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',paddingTop:20,minHeight:44}}>
          <span style={{fontFamily:'var(--font-display)',fontSize:22,fontWeight:600,letterSpacing:'-0.01em',color:'var(--accent)',paddingLeft:4}}>LifePlan</span>
          <div style={{display:'flex',gap:8}}>
            <NotificationBell userId={userId} onNavigate={onNavigate}/>
            <ThemeToggleButton/>
            <button onClick={onOpenProfile} aria-label="Perfil e configurações" style={{width:44,height:44,borderRadius:22,border:'none',background:'var(--accent-soft)',color:'var(--accent)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',padding:0}}>
              <Icon name="user"/>
            </button>
          </div>
        </header>

        <section style={{display:'flex',flexDirection:'column',gap:6,padding:'0 4px'}}>
          <p style={{margin:0,fontSize:14,lineHeight:'20px',color:'var(--muted)'}}>{dateLabel} · <span className="lp-num">{timeStr}</span></p>
          <h1 style={{margin:0,fontFamily:'var(--font-display)',fontWeight:500,fontSize:36,lineHeight:'42px',letterSpacing:'-0.015em'}}>{greet}{firstName?`, ${firstName}`:''}.</h1>
          <p style={{margin:'2px 0 0',fontSize:16,lineHeight:'22px',color:'var(--text-2)'}}>{pendingText}</p>
        </section>

        {(weather.loading||weather.error||wxOk)&&(
          <div style={{display:'flex',flexDirection:'column',gap:4,alignSelf:'flex-start',maxWidth:'100%',padding:'10px 14px',border:'1px solid var(--border)',borderRadius:18,color:'var(--text-2)',fontSize:13.5,lineHeight:'18px'}}>
            {weather.loading?<span>Buscando o clima…</span>:weather.error?<span>{weather.error}</span>:(
              <>
                <span style={{display:'flex',alignItems:'center',gap:8,fontWeight:600,color:'var(--text)'}}>
                  <Icon name={wxIcon} size={18}/>{weather.city}, <span className="lp-num">{weather.temp}°</span>
                </span>
                {wxLines.map((l,i)=><span key={i}>{l}</span>)}
              </>
            )}
          </div>
        )}

        <section>
          <h2 style={eyebrow}>Sua consulta de hoje</h2>
          <div style={{...card,padding:'4px 12px'}}>
            {careRow('treino',{
              icon:'dumbbell',title:'Treino',metas:[planPreview?`${planPreview.typeLabel}, hoje`:'Sem treino definido'],
              onClick:()=>onNavigate('treinos'),
              action:(
                <button onClick={toggleWorkoutDone} aria-pressed={workoutDoneToday}
                  style={{height:44,padding:'0 14px',borderRadius:12,cursor:'pointer',fontFamily:'inherit',fontSize:14,fontWeight:600,display:'flex',alignItems:'center',gap:6,flexShrink:0,
                    background:workoutDoneToday?'var(--accent)':'transparent',color:workoutDoneToday?'var(--on-accent)':'var(--accent)',border:'1.5px solid var(--accent)'}}>
                  {workoutDoneToday&&<Icon name="check" size={16} stroke={2.25}/>}{workoutDoneToday?'Feito':'Marcar feito'}
                </button>
              )})}
            {careRow('refeicao',{
              icon:'leaf',title:'Próxima refeição',
              metas:[nextMeal?`${nextMeal.name}, ${nextMeal.time}${nextMeal.when==='amanhã'?' (amanhã)':''}`:'Sem plano alimentar'],
              onClick:()=>onNavigate('nutrition')})}
            {careRow('estudos',{
              icon:'book',title:'Estudos',
              metas:[nextClass?`${nextClass.subject}, ${nextClass.isToday?'hoje':nextClass.day} às ${nextClass.time}`:'Sem aula cadastrada',nextExam?`Prova: ${nextExam.date}`:'Sem prova próxima'],
              onClick:()=>onNavigate('estudos')})}
            {careRow('habitos',{
              icon:'activity',title:'Hábitos e performance',metas:['Corpo, dashboard e insights'],
              onClick:()=>onNavigate('habitos'),last:true})}
          </div>
        </section>

        {weekly&&(
          <section aria-label="Resumo da semana" data-testid="weekly-summary">
            <h2 style={eyebrow}>Resumo da semana · <span className="lp-num">{weekly.periodo}</span></h2>
            <div style={{...card,padding:16,display:'flex',flexDirection:'column',gap:14}}>
              {[['Você cumpriu',weekly.cumpriu,'Nada registrado ainda.',true],['Ficou pendente',weekly.pendente,'Nada pendente.',false]].map(([title,items,empty,done])=>(
                <div key={title}>
                  <h3 style={{margin:'0 0 6px',fontSize:13,lineHeight:'16px',fontWeight:700,color:'var(--muted)'}}>{title}</h3>
                  {items.length?(
                    <ul style={{margin:0,padding:0,listStyle:'none',display:'flex',flexDirection:'column',gap:6}}>
                      {items.map((t,i)=>(
                        <li key={i} style={{display:'flex',alignItems:'flex-start',gap:8,fontSize:15,lineHeight:'21px',color:'var(--text)'}}>
                          <span aria-hidden="true" style={{flexShrink:0,marginTop:2,width:18,height:18,display:'flex',alignItems:'center',justifyContent:'center',color:done?'var(--accent)':'var(--muted)'}}>
                            {done?<Icon name="check" size={16} stroke={2.25}/>:<span style={{width:6,height:6,borderRadius:3,background:'currentColor'}}/>}
                          </span>
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  ):<p style={{margin:0,fontSize:14,lineHeight:'20px',color:'var(--muted)'}}>{empty}</p>}
                </div>
              ))}
              <div style={{background:'var(--accent-soft)',borderRadius:14,padding:'12px 14px'}}>
                <h3 style={{margin:'0 0 4px',fontSize:13,lineHeight:'16px',fontWeight:700,color:'var(--accent)'}}>Recomendação</h3>
                <p style={{margin:0,fontSize:15,lineHeight:'21px',color:'var(--text)'}}>{weekly.recomendacao}</p>
              </div>
            </div>
          </section>
        )}

        {cross&&cross.status!=='sem-dados'&&(
          <section aria-label="Saúde e dinheiro" data-testid="cross-insight">
            <h2 style={eyebrow}>Saúde e dinheiro</h2>
            <div style={{...card,padding:16,display:'flex',flexDirection:'column',gap:12}}>
              {cross.status==='achado'&&(<>
                <p style={{margin:0,fontSize:16,lineHeight:'23px',fontWeight:600,color:'var(--text)'}}>{cross.frase}</p>
                {[['Semanas de gasto alto',cross.dietaAlta,'var(--warning)'],['Semanas de gasto baixo',cross.dietaBaixa,'var(--accent)']].map(([label,pct,color])=>(
                  <div key={label}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:13,lineHeight:'18px',color:'var(--muted)',marginBottom:4}}>
                      <span>{label} em {cross.categoria}</span><span className="lp-num" style={{color:'var(--text)',fontWeight:600}}>Dieta {pct}%</span>
                    </div>
                    <div role="img" aria-label={`${label}: dieta em ${pct}%`} style={{height:8,borderRadius:4,background:'var(--accent-soft)',overflow:'hidden'}}>
                      <div style={{width:pct+'%',height:'100%',borderRadius:4,background:color}}/>
                    </div>
                  </div>
                ))}
                <p style={{margin:0,fontSize:13,lineHeight:'18px',color:'var(--muted)'}}>Baseado em {cross.semanas} semanas. Isso mostra que os dois andam juntos, não que um causou o outro.</p>
              </>)}
              {cross.status==='sem-relacao'&&(
                <p style={{margin:0,fontSize:15,lineHeight:'21px',color:'var(--text)'}}>Nas últimas {cross.semanas} semanas, nenhuma categoria de gasto apareceu junto com queda na dieta.</p>
              )}
              {cross.status==='faltam-dados'&&(
                <p style={{margin:0,fontSize:15,lineHeight:'21px',color:'var(--text)'}}>Para cruzar saúde e dinheiro, o app precisa de pelo menos {cross.minimo} semanas completas com a dieta registrada. Você tem {cross.semanasComDieta}. Registre também a categoria dos gastos em Finanças.</p>
              )}
            </div>
          </section>
        )}

        <section style={{...card,padding:16,display:'flex',flexDirection:'column',gap:12}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',minHeight:24}}>
            <div style={{display:'flex',alignItems:'center',gap:8,color:'var(--accent)'}}>
              <Icon name="droplet" size={20}/>
              <span style={{fontSize:16,lineHeight:'20px',fontWeight:600,color:'var(--text)'}}>Água</span>
            </div>
            {editingGoal?(
              <input type="number" aria-label="Meta de água em ml" value={goalInput} autoFocus
                onChange={e=>setGoalInput(e.target.value)}
                onBlur={()=>{const g=parseInt(goalInput,10);water.setGoal(g>0?g:water.data.goal);setEditingGoal(false);}}
                onKeyDown={e=>{if(e.key==='Enter')e.target.blur();}}
                style={{width:96,height:40,fontSize:14,border:'1px solid var(--border)',borderRadius:10,padding:'0 10px',outline:'none',background:'var(--surface2)',color:'var(--text)'}}/>
            ):(
              <div style={{display:'flex',alignItems:'center',gap:2}}>
                <span className="lp-num" style={{fontSize:14,lineHeight:'18px',color:'var(--muted)'}}>{water.data.current} de {water.data.goal} ml</span>
                <button onClick={()=>{setGoalInput(String(water.data.goal));setEditingGoal(true);}} aria-label="Editar meta de água"
                  style={{width:44,height:44,margin:'-10px -10px -10px 0',background:'none',border:'none',color:'var(--muted)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',padding:0}}>
                  <Icon name="pencil" size={18}/>
                </button>
              </div>
            )}
          </div>
          <div role="progressbar" aria-label="Progresso da água" aria-valuemin={0} aria-valuemax={100} aria-valuenow={waterPct} style={{height:8,borderRadius:4,background:'var(--track)'}}>
            <div style={{width:`${waterPct}%`,height:8,borderRadius:4,background:'var(--accent-fill)',transition:'width .4s'}}/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:8}}>
            {[100,200,500,1000].map(v=>(
              <button key={v} onClick={()=>water.add(v)} aria-label={`Adicionar ${v} ml de água`}
                style={{height:44,border:'none',borderRadius:12,background:'var(--accent-soft)',color:'var(--accent-dark)',fontFamily:'inherit',fontSize:14,fontWeight:600,cursor:'pointer'}}>
                {v===1000?'+1 L':`+${v}`}
              </button>
            ))}
          </div>
        </section>

        <section style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:12}}>
          <div style={{...card,position:'relative'}}>
            <button onClick={()=>onNavigate('financas')} style={{display:'flex',flexDirection:'column',gap:6,width:'100%',minHeight:96,boxSizing:'border-box',padding:'14px 14px 12px',background:'none',border:'none',textAlign:'left',cursor:'pointer',font:'inherit',color:'inherit'}}>
              <span style={{display:'flex',alignItems:'center',gap:6,color:'var(--accent)'}}>
                <Icon name="wallet" size={18}/><span style={{fontSize:14,lineHeight:'18px',fontWeight:600,color:'var(--text)'}}>Finanças</span>
              </span>
              <span className="lp-num" style={{fontSize:22,lineHeight:'28px',fontWeight:600,marginTop:4,color:saldoVisible&&saldo!==null&&saldo<0?'var(--warning)':'var(--text)',letterSpacing:saldoVisible?0:'.04em'}}>
                {saldo!==null?(saldoVisible?brl(saldo):'R$ ••••'):'—'}
              </span>
              <span style={{fontSize:13,lineHeight:'17px',color:'var(--muted)'}}>Saldo do mês</span>
            </button>
            {saldo!==null&&(
              <button onClick={()=>setSaldoVisible(v=>!v)} aria-label={saldoVisible?'Ocultar valores':'Mostrar valores'} aria-pressed={saldoVisible}
                style={{position:'absolute',top:2,right:2,width:44,height:44,background:'none',border:'none',color:'var(--muted)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',padding:0}}>
                <Icon name={saldoVisible?'eyeOff':'eye'} size={20}/>
              </button>
            )}
          </div>
          <button onClick={()=>onNavigate('shopping')} style={{...card,display:'flex',flexDirection:'column',gap:6,width:'100%',minHeight:96,boxSizing:'border-box',padding:'14px 14px 12px',textAlign:'left',cursor:'pointer',font:'inherit',color:'inherit'}}>
            <span style={{display:'flex',alignItems:'center',gap:6,color:'var(--accent)'}}>
              <Icon name="cart" size={18}/><span style={{fontSize:14,lineHeight:'18px',fontWeight:600,color:'var(--text)'}}>Lista de compras</span>
            </span>
            <span className="lp-num" style={{fontSize:22,lineHeight:'28px',fontWeight:600,marginTop:4}}>{shoppingCount!==null?shoppingCount:'—'}</span>
            <span style={{fontSize:13,lineHeight:'17px',color:'var(--muted)'}}>{shoppingCount===1?'item pendente':'itens pendentes'}</span>
          </button>
        </section>

        <section style={{...card,padding:16,display:'flex',flexDirection:'column',gap:10}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
            <div style={{display:'flex',alignItems:'center',gap:8,color:'var(--accent)'}}>
              <Icon name="calendar" size={20}/>
              <span style={{fontSize:16,lineHeight:'20px',fontWeight:600,color:'var(--text)'}}>Agenda</span>
            </div>
            {!gcal.connected&&(
              <button onClick={gcal.connect} style={smallBtn}>{gcal.status==='no-key'?'Configurar Google':'Conectar Google'}</button>
            )}
          </div>
          {agendaItems.length===0?(
            <div style={{display:'flex',flexDirection:'column',gap:2}}>
              <span style={{fontSize:16,lineHeight:'22px',fontWeight:500}}>Dias livres</span>
              <span style={{fontSize:13,lineHeight:'17px',color:'var(--muted)'}}>Nada marcado nos próximos 7 dias</span>
            </div>
          ):(
            <div style={{display:'flex',flexDirection:'column'}}>
              {agendaItems.slice(0,5).map(it=>(
                <div key={it.id} style={{display:'flex',justifyContent:'space-between',gap:12,fontSize:15,lineHeight:'20px',padding:'8px 0',borderTop:'1px solid var(--border2)'}}>
                  <span>{it.title}</span><span className="lp-num" style={{color:'var(--muted)'}}>{it.time}</span>
                </div>
              ))}
            </div>
          )}
          {!gcal.connected&&(
            <div style={{display:'flex',gap:8,marginTop:2}}>
              <input aria-label="Novo compromisso" placeholder="Novo compromisso" value={newTitle} onChange={e=>setNewTitle(e.target.value)}
                style={{flex:1,minWidth:0,height:44,border:'1px solid var(--border)',borderRadius:12,fontSize:14,padding:'0 12px',outline:'none',background:'var(--surface2)',color:'var(--text)'}}/>
              <input aria-label="Horário" type="time" value={newTime} onChange={e=>setNewTime(e.target.value)}
                style={{width:96,height:44,border:'1px solid var(--border)',borderRadius:12,fontSize:14,padding:'0 8px',outline:'none',background:'var(--surface2)',color:'var(--text)'}}/>
              <button aria-label="Adicionar compromisso" onClick={()=>{if(!newTitle.trim())return;manual.add(newTitle.trim(),newTime||'--:--');setNewTitle('');setNewTime('');}}
                style={{width:44,height:44,borderRadius:12,border:'none',background:'var(--accent)',color:'var(--on-accent)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',padding:0,flexShrink:0}}>
                <Icon name="plus" size={20} stroke={2}/>
              </button>
            </div>
          )}
        </section>

        <BudgetChartPreview/>

        <FoodComparator/>

        <section style={{display:'flex',flexDirection:'column',gap:10}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,padding:'0 4px'}}>
            <h2 style={sectionTitle}>Grade de horários</h2>
            <button onClick={onOpenTimetable} style={smallBtn}><Icon name="pencil" size={16}/>Editar</button>
          </div>
          <div style={{...card,overflow:'hidden'}}>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',minWidth:560,borderCollapse:'collapse',fontSize:12,tableLayout:'fixed'}}>
                <thead>
                  <tr>
                    <th style={{width:'16%',padding:'10px 6px',borderBottom:`1px solid ${T.line}`,textAlign:'left',background:'var(--surface2)'}}></th>
                    {WEEK_DAYS.map(d=>(
                      <th key={d} style={{width:`${84/7}%`,padding:'10px 4px',borderBottom:`1px solid ${T.line}`,borderLeft:`1px solid ${T.line}`,color:'var(--text)',fontWeight:700,background:'var(--surface2)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{FullDayName(d)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timetableData.rows.length===0&&(
                    <tr><td colSpan={8} style={{padding:'18px 10px',textAlign:'center',color:'var(--muted)',whiteSpace:'normal'}}>Nenhum horário cadastrado ainda. Toque em "Editar" para montar sua grade.</td></tr>
                  )}
                  {timetableData.rows.map((r,ri)=>(
                    <tr key={r.id} style={{background:ri%2===0?'var(--accent-soft)':'var(--surface)'}}>
                      <td className="lp-num" style={{padding:'8px 6px',fontWeight:700,color:'var(--text)',borderTop:`1px solid ${T.line}`,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{r.label}</td>
                      {WEEK_DAYS.map(d=>(
                        <td key={d} style={{padding:'8px 4px',borderTop:`1px solid ${T.line}`,borderLeft:`1px solid ${T.line}`,color:'var(--text)',textAlign:'center',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                          {timetableData.cells[`${r.id}-${d}`]||''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

// Telas que fazem sentido "retomar" depois de um F5 — nunca restauramos para
// estados transitórios como loading/login/register/profile.
const RESUMABLE_SCREENS=['home','nutrition','shopping','treinos','estudos','financas','habitos','timetable'];

// ── MODO ESCURO ────────────────────────────────────────────────────────────
// Único botão do app inteiro — a mesma chave de localStorage é usada pelos
// apps de Finanças, Estudos e Hábitos (todos do mesmo site, então o
// navegador já compartilha isso sozinho). Além de mudar a tela do React na
// hora, avisa qualquer iframe ABERTO no momento via postMessage, pra não
// precisar recarregar pra ele acompanhar.
function isDarkMode(){
  try{ return document.documentElement.getAttribute('data-theme')==='dark'; }catch{ return false; }
}
function setDarkMode(dark){
  try{
    if(dark){ document.documentElement.setAttribute('data-theme','dark'); localStorage.setItem('lifeplan_theme','dark'); }
    else{ document.documentElement.removeAttribute('data-theme'); localStorage.setItem('lifeplan_theme','light'); }
  }catch{}
  // Avisa qualquer iframe do LifePlan (Finanças/Estudos/Hábitos) que esteja
  // aberto agora, pra ele mudar de tema instantaneamente também.
  document.querySelectorAll('iframe').forEach(f=>{
    try{ f.contentWindow.postMessage({lifeplanTheme:dark?'dark':'light'},window.location.origin); }catch{}
  });
}
function ThemeToggleButton({style}){
  const [dark,setDark]=useState(isDarkMode);
  return(
    <button
      onClick={()=>{const next=!dark;setDarkMode(next);setDark(next);}}
      aria-label={dark?'Mudar para o tema claro':'Mudar para o tema escuro'}
      title={dark?'Tema claro':'Tema escuro'}
      style={{width:44,height:44,borderRadius:22,border:'none',background:'var(--accent-soft)',color:'var(--accent)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',padding:0,...style}}
    >
      <Icon name={dark?'sun':'moon'} size={22}/>
    </button>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
function AppInner(){
  const [screen,setScreen]=useState('loading');
  const [userId,setUserId]=useState(null);
  const [profile,setProfile]=useState(null);
  const userIdRef=useRef(null);
  const screenRef=useRef(screen);
  screenRef.current=screen;

  // ── Bloqueio do app (PIN / biometria) ───────────────────────────────────────
  // Ao abrir o app já nasce bloqueado (se o bloqueio estiver ligado). Ao voltar de
  // segundo plano, bloqueia se passou o tempo escolhido. Enquanto o app está em
  // segundo plano, uma capa esconde o conteúdo da visão de apps recentes.
  const [locked,setLocked]=useState(()=>getPrivacy().lockEnabled);
  const [covered,setCovered]=useState(false);
  const hiddenAtRef=useRef(0);
  const lockNow=()=>{
    setLocked(true);
    window.dispatchEvent(new Event('lifeplan:lock'));
    document.querySelectorAll('iframe').forEach(f=>{try{f.contentWindow.postMessage({lifeplanLock:true},window.location.origin);}catch{}});
  };
  const lockNowRef=useRef(lockNow);
  lockNowRef.current=lockNow;
  const wipeLock=()=>{
    // errou o PIN demais, ou esqueceu: sai desta conta neste aparelho e pede a senha
    clearLock();setLocked(false);setCovered(false);
    supabase.auth.signOut({scope:'local'}).catch(()=>{});
    try{localStorage.removeItem('cf_state');localStorage.removeItem('cf_state_uid');sessionStorage.removeItem('cf_cloud_synced');}catch{}
    setScreen('login');
  };
  useEffect(()=>{
    const onVis=()=>{
      const pv=getPrivacy();
      if(!pv.lockEnabled||!userIdRef.current) return;
      if(document.visibilityState==='hidden'){
        hiddenAtRef.current=Date.now();
        setCovered(true);
        if(pv.lockAfter===0) lockNowRef.current();
      }else{
        const away=hiddenAtRef.current?Date.now()-hiddenAtRef.current:0;
        if(hiddenAtRef.current&&away>=pv.lockAfter*1000) lockNowRef.current();
        hiddenAtRef.current=0;
        setCovered(false);
      }
    };
    document.addEventListener('visibilitychange',onVis);
    return()=>document.removeEventListener('visibilitychange',onVis);
  },[]);

  // Sempre que a tela muda para uma das "retomáveis", lembra qual é —
  // assim um F5 dentro de qualquer aba continua na mesma aba, em vez de
  // voltar pra Início.
  useEffect(()=>{
    if(RESUMABLE_SCREENS.includes(screen)) sessionStorage.setItem('lifeplan_screen',screen);
  },[screen]);

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      if(session?.user){
        userIdRef.current=session.user.id;setUserId(session.user.id);
        const saved=sessionStorage.getItem('lifeplan_screen');
        setScreen(saved&&RESUMABLE_SCREENS.includes(saved)?saved:'home');
      }
      else{setLocked(false);setScreen('login');}
    }).catch(()=>{
      // Se a checagem falhar (rede instável, etc.), não deixa a tela de
      // carregamento travada pra sempre — manda pro login, que tenta de
      // novo sozinho ao reconectar.
      setScreen('login');
    });
    // Importante: este listener dispara em qualquer evento do Supabase
    // (ex: renovação automática de token), inclusive os que vêm do
    // my-fit-era.html (mesmo projeto Supabase, embutido em iframe na aba
    // Treinos). Por isso só trocamos de tela em transições reais de
    // login/logout — nunca em cada evento — senão a aba Treinos "voltava
    // sozinha" para a Início.
    const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
      if(event==='PASSWORD_RECOVERY'){
        setScreen('reset-password');
        return;
      }
      if(session?.user){
        const isNewLogin=userIdRef.current!==session.user.id;
        userIdRef.current=session.user.id;
        setUserId(session.user.id);
        if(isNewLogin && screenRef.current!=='reset-password') setScreen('home');
      }else{
        userIdRef.current=null;
        setUserId(null);
        setLocked(false);
        setScreen('login');
        sessionStorage.removeItem('lifeplan_screen');
      }
    });
    return()=>subscription.unsubscribe();
  },[]);

  let screenContent;
  if(screen==='loading') screenContent=(
    <div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center'}}><div style={{fontFamily:'var(--font-display)',fontSize:32,fontWeight:600,color:'var(--accent)',marginBottom:12}}>LifePlan</div><div style={{color:'var(--muted)'}}>Carregando...</div></div>
    </div>
  );
  else{
    const onLogout=async()=>{
      // Antes de sair, tira ESTE aparelho da lista de push: senão os avisos desta conta continuariam chegando aqui.
      await disablePush();
      // scope 'local': sai só neste aparelho. O padrão do Supabase (global) deslogaria a conta em TODOS os dispositivos.
      try{await supabase.auth.signOut({scope:'local'});}catch(e){console.error(e);}
      clearLock();setLocked(false); // o PIN é de quem estava logado: sair apaga o PIN deste aparelho
      // As finanças ficam em cache neste aparelho: apaga ao sair para a próxima pessoa não ver.
      try{localStorage.removeItem('cf_state');localStorage.removeItem('cf_state_uid');sessionStorage.removeItem('cf_cloud_synced');}catch(e){}
      setScreen('login');
    };
    const onAccountDeleted=async()=>{
      // O login já não existe mais: só encerra a sessão local e apaga tudo o que ficou neste aparelho.
      await disablePush();
      try{await supabase.auth.signOut({scope:'local'});}catch(e){}
      try{const th=localStorage.getItem('lifeplan_theme');localStorage.clear();sessionStorage.clear();if(th)localStorage.setItem('lifeplan_theme',th);}catch(e){}
      setLocked(false);
      setScreen('login');
    };
    const onOpenProfile=()=>setScreen('profile');

    if(screen==='profile') screenContent=(
      <ProfilePage userId={userId} initialProfile={profile}
        onSave={(newPlan,newProfile)=>{setProfile(newProfile);setScreen('home');}}
        onBack={()=>setScreen('home')} onLogout={onLogout} onAccountDeleted={onAccountDeleted} onLockNow={lockNow} onLockWipe={wipeLock}/>
    );
    else if(screen==='home') screenContent=(
      <HomeDashboard userId={userId} onNavigate={setScreen} onOpenProfile={onOpenProfile} onLogout={onLogout} onOpenTimetable={()=>setScreen('timetable')}/>
    );
    else if(screen==='timetable') screenContent=<TimetableScreen onHome={()=>setScreen('home')} userId={userId}/>;
    else if(screen==='nutrition') screenContent=(
      <MealPlanApp userId={userId} initialTab="plan" onHome={()=>setScreen('home')} onLogout={onLogout} onOpenProfile={onOpenProfile}/>
    );
    else if(screen==='shopping') screenContent=(
      <MealPlanApp userId={userId} initialTab="shop" onHome={()=>setScreen('home')} onLogout={onLogout} onOpenProfile={onOpenProfile}/>
    );
    else if(screen==='treinos') screenContent=(
      <MealPlanApp userId={userId} initialTab="workout" onHome={()=>setScreen('home')} onLogout={onLogout} onOpenProfile={onOpenProfile}/>
    );
    else if(screen==='estudos') screenContent=<StudyTab onHome={()=>setScreen('home')} onLogout={onLogout} onOpenProfile={onOpenProfile}/>;
    else if(screen==='financas') screenContent=<FinanceTab onHome={()=>setScreen('home')} onLogout={onLogout} onOpenProfile={onOpenProfile}/>;
    else if(screen==='habitos') screenContent=<HabitsTab onHome={()=>setScreen('home')} onLogout={onLogout} onOpenProfile={onOpenProfile}/>;
    else if(screen==='reset-password') screenContent=<ResetPasswordPage onDone={()=>setScreen('home')}/>;
    else if(screen==='register') screenContent=<RegisterPage onSwitch={()=>setScreen('login')} onLogin={()=>setScreen('home')}/>;
    else screenContent=<LoginPage onSwitch={()=>setScreen('register')} onLogin={()=>setScreen('home')}/>;
  }

  const showLock=!!userId&&(locked||covered);
  // Barra de navegação única (Início, Nutrição, Treino, Estudos, Finanças)
  // em todas as telas principais. O botão de tema fica no topo do Início e
  // em Perfil; ele avisa os iframes via postMessage (setDarkMode).
  return(
    <>
      <div style={{display:'contents'}} inert={showLock?'':undefined}>
        {screenContent}
        {userId&&NAV_SCREENS.includes(screen)&&<BottomNav screen={screen} onNavigate={setScreen}/>}
      </div>
      {showLock&&(locked
        ?<LockScreen onUnlock={()=>{setLocked(false);setCovered(false);}} onForgot={wipeLock} onWipe={()=>{wipeLock();setTimeout(()=>alert('Muitos erros de PIN. Por segurança você foi desconectado deste aparelho. Entre de novo com a sua senha.'),50);}}/>
        :<PrivacyCover/>)}
    </>
  );
}

// ── ERROR BOUNDARY ────────────────────────────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props){ super(props); this.state={hasError:false}; }
  static getDerivedStateFromError(){ return {hasError:true}; }
  componentDidCatch(error,info){ console.error('Erro capturado pelo LifePlan:',error,info); }
  handleReload=()=>{ window.location.reload(); };
  handleGoHome=()=>{ try{ sessionStorage.removeItem('lifeplan_screen'); }catch{} window.location.reload(); };
  render(){
    if(this.state.hasError){
      return(
        <div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center',padding:24,fontFamily:'system-ui,sans-serif'}}>
          <div style={{maxWidth:380,textAlign:'center',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:20,padding:'32px 24px',boxShadow:'var(--shadow-md)'}}>
            
            <div style={{fontSize:18,fontWeight:800,color:'var(--text)',marginBottom:8}}>Algo deu errado</div>
            <div style={{fontSize:13,color:'var(--muted2)',lineHeight:1.6,marginBottom:22}}>Essa tela travou de forma inesperada. Seus dados já salvos na nuvem não foram afetados — geralmente um recarregamento resolve.</div>
            <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap'}}>
              <button onClick={this.handleReload} style={{background:'var(--accent)',color:'var(--on-accent)',border:'none',borderRadius:12,padding:'12px 20px',fontWeight:800,fontSize:14,cursor:'pointer'}}>Recarregar</button>
              <button onClick={this.handleGoHome} style={{background:'var(--surface2)',color:'var(--accent-dark)',border:'1px solid var(--border)',borderRadius:12,padding:'10px 20px',fontWeight:800,fontSize:13,cursor:'pointer'}}>Voltar para o Início</button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App(){
  return(<ErrorBoundary><AppInner/></ErrorBoundary>);
}
