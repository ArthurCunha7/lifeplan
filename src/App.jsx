// src/App.jsx — LifePlan completo
// Novidades: 🛒 Lista de compras | 🔄 Troca de tipo de treino por dia
import { useState, useMemo, useRef, useEffect } from "react";
import { supabase, signUp, signIn, signOut, signInWithGoogle, loadUserPlan, saveUserPlan, SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabaseClient";

// ── TACO DB ───────────────────────────────────────────────────────────────────
const TACO_DB = [{"id":1,"n":"Arroz, integral, cozido","c":"Cereais","e":124,"p":2.6,"l":1.0,"cb":25.8},{"id":3,"n":"Arroz, tipo 1, cozido","c":"Cereais","e":128,"p":2.5,"l":0.2,"cb":28.1},{"id":7,"n":"Aveia, flocos, crua","c":"Cereais","e":394,"p":13.9,"l":8.5,"cb":66.6},{"id":52,"n":"Pão, trigo, forma, integral","c":"Cereais","e":253,"p":9.4,"l":3.7,"cb":49.9},{"id":53,"n":"Pão, trigo, francês","c":"Cereais","e":300,"p":8.0,"l":3.1,"cb":58.6},{"id":88,"n":"Batata, doce, cozida","c":"Vegetais","e":77,"p":0.6,"l":0.1,"cb":18.4},{"id":91,"n":"Batata, inglesa, cozida","c":"Vegetais","e":52,"p":1.2,"l":0.0,"cb":11.9},{"id":100,"n":"Brócolis, cozido","c":"Vegetais","e":25,"p":2.1,"l":0.5,"cb":4.4},{"id":109,"n":"Cenoura, cozida","c":"Vegetais","e":30,"p":0.8,"l":0.2,"cb":6.7},{"id":116,"n":"Couve, manteiga, refogada","c":"Vegetais","e":90,"p":1.7,"l":6.6,"cb":8.7},{"id":129,"n":"Mandioca, cozida","c":"Vegetais","e":125,"p":0.6,"l":0.3,"cb":30.1},{"id":157,"n":"Tomate, com semente, cru","c":"Vegetais","e":15,"p":1.1,"l":0.2,"cb":3.1},{"id":179,"n":"Banana, nanica, crua","c":"Frutas","e":92,"p":1.4,"l":0.1,"cb":23.8},{"id":182,"n":"Banana, prata, crua","c":"Frutas","e":98,"p":1.3,"l":0.1,"cb":26.0},{"id":222,"n":"Maçã, Fuji, com casca, crua","c":"Frutas","e":56,"p":0.3,"l":0.0,"cb":15.2},{"id":226,"n":"Mamão, Papaia, cru","c":"Frutas","e":40,"p":0.5,"l":0.1,"cb":10.4},{"id":239,"n":"Morango, cru","c":"Frutas","e":30,"p":0.9,"l":0.3,"cb":6.8},{"id":277,"n":"Atum, conserva em óleo","c":"Pescados","e":166,"p":26.2,"l":6.0,"cb":0},{"id":315,"n":"Salmão, filé, grelhado","c":"Pescados","e":229,"p":23.9,"l":14.0,"cb":0},{"id":318,"n":"Sardinha, assada","c":"Pescados","e":164,"p":32.2,"l":3.0,"cb":0},{"id":326,"n":"Carne, bovina, acém, moído, cozido","c":"Carnes","e":212,"p":26.7,"l":10.9,"cb":0},{"id":381,"n":"Carne, bovina, picanha, grelhada","c":"Carnes","e":289,"p":26.4,"l":19.5,"cb":0},{"id":395,"n":"Frango, coração, grelhado","c":"Carnes","e":207,"p":22.4,"l":12.1,"cb":0.6},{"id":396,"n":"Frango, coxa, com pele, assada","c":"Carnes","e":215,"p":28.5,"l":10.4,"cb":0.1},{"id":408,"n":"Frango, peito, sem pele, cozido","c":"Carnes","e":163,"p":31.5,"l":3.2,"cb":0},{"id":410,"n":"Frango, peito, sem pele, grelhado","c":"Carnes","e":159,"p":32.0,"l":2.5,"cb":0},{"id":413,"n":"Frango, sobrecoxa, sem pele, assada","c":"Carnes","e":233,"p":29.2,"l":12.0,"cb":0},{"id":448,"n":"Iogurte, natural","c":"Laticínios","e":51,"p":4.1,"l":3.0,"cb":1.9},{"id":449,"n":"Iogurte, natural, desnatado","c":"Laticínios","e":41,"p":3.8,"l":0.3,"cb":5.8},{"id":461,"n":"Queijo, minas, frescal","c":"Laticínios","e":264,"p":17.4,"l":20.2,"cb":3.2},{"id":463,"n":"Queijo, mozarela","c":"Laticínios","e":330,"p":22.6,"l":25.2,"cb":3.0},{"id":469,"n":"Queijo, ricota","c":"Laticínios","e":140,"p":12.6,"l":8.1,"cb":3.8},{"id":486,"n":"Ovo, de galinha, clara, cozida","c":"Ovos","e":59,"p":13.4,"l":0.1,"cb":0},{"id":488,"n":"Ovo, de galinha, inteiro, cozido","c":"Ovos","e":146,"p":13.3,"l":9.5,"cb":0.6},{"id":489,"n":"Ovo, de galinha, inteiro, cru","c":"Ovos","e":143,"p":13.0,"l":8.9,"cb":1.6},{"id":557,"n":"Amendoim, grão, cru","c":"Leguminosas","e":544,"p":27.2,"l":43.9,"cb":20.3},{"id":561,"n":"Feijão, carioca, cozido","c":"Leguminosas","e":76,"p":4.8,"l":0.5,"cb":13.6},{"id":567,"n":"Feijão, preto, cozido","c":"Leguminosas","e":77,"p":4.5,"l":0.5,"cb":14.0},{"id":577,"n":"Lentilha, cozida","c":"Leguminosas","e":93,"p":6.3,"l":0.5,"cb":16.3},{"id":584,"n":"Soja, queijo (tofu)","c":"Leguminosas","e":64,"p":6.6,"l":4.0,"cb":2.1},{"id":589,"n":"Castanha-do-Brasil, crua","c":"Nozes","e":643,"p":14.5,"l":63.5,"cb":15.1},{"id":594,"n":"Linhaça, semente","c":"Nozes","e":495,"p":14.1,"l":32.3,"cb":43.3},{"id":507,"n":"Mel, de abelha","c":"Doces","e":309,"p":0,"l":0,"cb":84.0}];
const TACO_MAP = Object.fromEntries(TACO_DB.map(t => [t.id, t]));

// ── TIPOS DE TREINO disponíveis para troca ────────────────────────────────────
const WORKOUT_TYPES = [
  { type:'strength', label:'Musculação',  icon:'🏋️', color:'#22c55e',
    options:[
      { typeLabel:'Treino A – Leg Front',    detail:'Agachamento · Leg Press · Cadeira Extensora 🦵',        exercises:'Agachamento 4×8 · Leg Press 4×10 · Cadeira Extensora 4×12 · Panturrilha 5×12' },
      { typeLabel:'Treino B – Upper',        detail:'Supino · Remada · Desenvolvimento 🏋️',                  exercises:'Supino 4×8 · Pull-up 3×10 · Remada 3×8 · Desenvolvimento 3×8 · Crucifixo 3×12' },
      { typeLabel:'Treino C – Posterior',    detail:'RDL · Mesa Flexora · Hip Thrust 🍑',                    exercises:'RDL 4×8 · Mesa Flexora 3×10 · Hip Thrust 4×10 · Bulgarian Split 3×10' },
      { typeLabel:'Treino D – Braços',       detail:'Rosca · Tríceps · Elevação Lateral 💪',                 exercises:'Rosca Direta 4×10 · Rosca Alternada 3×10 · Tríceps Polia 4×10 · Tríceps Francês 3×10 · Elevação Lateral 3×12' },
      { typeLabel:'Full Body',               detail:'Treino completo do corpo 🔥',                           exercises:'Agachamento 3×8 · Supino 3×8 · Remada 3×8 · Desenvolvimento 3×8 · Rosca 3×10 · Tríceps 3×10' },
    ]
  },
  { type:'cardio',   label:'Cardio',      icon:'🚴', color:'#3b82f6',
    options:[
      { typeLabel:'Cardio – Bike',           detail:'Bicicleta ergométrica 40min 🚴',                        exercises:'Bicicleta ergométrica 40 min em intensidade moderada' },
      { typeLabel:'Cardio – Corrida',        detail:'Corrida 5-10km 🏃',                                     exercises:'Corrida leve a moderada 5–10km' },
      { typeLabel:'Cardio – HIIT',           detail:'Alta intensidade 30min ⚡',                             exercises:'HIIT: 8 rounds de 40s esforço / 20s descanso' },
      { typeLabel:'Cardio – Longo',          detail:'Bike + Corrida 1h30 🏃🚴',                              exercises:'Bicicleta 50min + Corrida 40min – sessão longa' },
      { typeLabel:'Cardio – Natação',        detail:'Natação 45min 🏊',                                      exercises:'Natação contínua 45 min ritmo moderado' },
    ]
  },
  { type:'rest',     label:'Descanso',    icon:'😴', color:'#8a887d',
    options:[
      { typeLabel:'Descanso',                detail:'Recuperação ativa 😴',                                  exercises:'Nenhum treino – foco em sono e recuperação' },
      { typeLabel:'Mobilidade',              detail:'Alongamento e mobilidade 🧘',                           exercises:'Alongamento global 30min + foam roller' },
      { typeLabel:'Caminhada leve',          detail:'Caminhada leve 30min 🚶',                               exercises:'Caminhada leve 30 min ao ar livre' },
    ]
  },
];

const ALL_WORKOUT_OPTIONS = WORKOUT_TYPES.flatMap(wt =>
  wt.options.map(o => ({ ...o, type: wt.type, color: wt.color, icon: wt.icon }))
);

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
    {typeLabel:'Treino A – Leg Front',detail:'Agachamento · Leg Press 🦵',exercises:'Agachamento 4×8 · Leg Press 4×10 · Cadeira Extensora 4×12'},
    {typeLabel:'Treino B – Upper',detail:'Supino · Remada 🏋️',exercises:'Supino 4×8 · Pull-up 3×10 · Remada 3×8 · Desenvolvimento 3×8'},
    {typeLabel:'Cardio – Bike',detail:'Bicicleta ergométrica 40min 🚴',exercises:'Bicicleta ergométrica 40 min moderado'},
    {typeLabel:'Treino C – Posterior',detail:'RDL · Hip Thrust 🍑',exercises:'RDL 4×8 · Mesa Flexora 3×10 · Hip Thrust 4×10'},
    {typeLabel:'Treino D – Braços',detail:'Rosca · Tríceps 💪',exercises:'Rosca Direta 4×10 · Tríceps Polia 4×10 · Elevação Lateral 3×12'},
    {typeLabel:'Cardio – Longo',detail:'Bike + Corrida 1h30 🏃',exercises:'Bicicleta 50min + Corrida 40min'},
    {typeLabel:'Descanso',detail:'Recuperação ativa 😴',exercises:'Nenhum treino – foco em recuperação'},
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
      {time:'07:00',name:'Café da Manhã',icon:'🌅',foods:[mkFood(7,Math.round(tgt.kcal*0.22*0.35/(TACO_MAP[7].e/100))),mkFood(488,Math.round(tgt.kcal*0.22*0.30/(TACO_MAP[488].e/100))),mkFood(182,120),mkFood(448,150)].filter(Boolean)},
      {time:'10:00',name:'Lanche 1',icon:'🥛',foods:[mkFood(snacks[0],200),mkFood(snacks[2]||222,150),mkFood(ft,15)].filter(Boolean)},
      {time:'13:00',name:'Almoço',icon:'🍽️',foods:[mkFood(p1,Math.round(protQty*1.1)),mkFood(c1,Math.round(carbQty*1.2)),mkFood(561,100),mkFood(v1,100)].filter(Boolean)},
      !isRest&&{time:'16:30',name:'Pré-Treino',icon:'⚡',foods:[mkFood(c2,Math.round(carbQty*0.8)),mkFood(p2,Math.round(protQty*0.7))].filter(Boolean)},
      {time:isRest?'19:00':'20:00',name:isRest?'Jantar':'Pós-Treino / Jantar',icon:'💪',foods:[mkFood(p2,Math.round(protQty)),mkFood(c1,Math.round(carbQty*0.9)),mkFood(v1,80)].filter(Boolean)},
      {time:'22:00',name:'Ceia',icon:'🌙',foods:[mkFood(488,100),mkFood(469,60)].filter(Boolean)},
    ].filter(Boolean);
    return {id:i,name,short:name.slice(0,3).toUpperCase(),fullName:name+(i<5?'-Feira':''),
      type:TYPES[i],typeLabel:wk.typeLabel,detail:wk.detail,exercises:wk.exercises,
      calories:meals.reduce((s,m)=>s+m.foods.reduce((a,f)=>a+f.kcal,0),0),burned,meals};
  });
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function searchTACO(query,limit=9){
  if(!query||query.length<2) return [];
  const norm=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ');
  const terms=norm(query).split(' ').filter(Boolean);
  return TACO_DB.map(t=>({...t,score:terms.reduce((s,w)=>norm(t.n).includes(w)?s+1:s-1,0)}))
    .filter(t=>t.score>0).sort((a,b)=>b.score-a.score).slice(0,limit);
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const S={
  wrap:   {minHeight:'100vh',background:'#efe8dd',color:'#1c1c1a',fontFamily:'system-ui,sans-serif',paddingBottom:80},
  header: {background:'#ffffff',borderBottom:'1px solid #e4ddd0',padding:'16px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:100,boxShadow:'0 1px 6px rgba(0,0,0,0.04)'},
  card:   {background:'#ffffff',border:'1px solid #e4ddd0',borderRadius:16,margin:'0 16px 12px',padding:'16px'},
  input:  {width:'100%',background:'#ffffff',border:'1px solid #e4ddd0',borderRadius:10,color:'#1c1c1a',fontSize:14,padding:'10px 12px',outline:'none',boxSizing:'border-box'},
  select: {width:'100%',background:'#ffffff',border:'1px solid #e4ddd0',borderRadius:10,color:'#1c1c1a',fontSize:14,padding:'10px 12px',outline:'none',boxSizing:'border-box'},
  label:  {fontSize:11,fontWeight:700,color:'#6b6a63',marginBottom:6,display:'block',letterSpacing:.8},
  badge:  c=>({background:c+'22',color:c,padding:'2px 7px',borderRadius:6,fontWeight:700,fontSize:10}),
  btn:    (c='#7f9770')=>({background:c,border:'none',borderRadius:10,color:'#fff',padding:'10px 18px',fontSize:13,fontWeight:700,cursor:'pointer'}),
  // bottom nav
  nav:    {position:'fixed',bottom:0,left:0,right:0,background:'#ffffff',borderTop:'1px solid #e4ddd0',display:'flex',zIndex:100},
  navBtn: active=>({flex:1,background:'none',border:'none',padding:'12px 0 10px',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:3,color:active?'#7f9770':'#8a887d'}),
};

// ── AUTH PAGES ────────────────────────────────────────────────────────────────
function AuthWrap({children}){
  return(
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#efe8dd,#dce6d3)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{width:'100%',maxWidth:400,background:'#ffffff',border:'1px solid #e4ddd0',borderRadius:24,padding:32}}>{children}</div>
    </div>
  );
}
function LoginPage({onSwitch,onLogin}){
  const [email,setEmail]=useState(''),[ password,setPassword]=useState(''),[ err,setErr]=useState(''),[ loading,setLoading]=useState(false);
  async function handle(){
    if(!email||!password){setErr('Preencha todos os campos');return;}
    setLoading(true);
    try{await signIn({email,password});onLogin();}catch(e){setErr(e.message||'Email ou senha incorretos');}finally{setLoading(false);}
  }
  async function handleGoogle(){
    setLoading(true);
    try{await signInWithGoogle();}catch(e){setErr(e.message||'Erro ao entrar com Google');}finally{setLoading(false);}
  }
  return(
    <AuthWrap>
      <div style={{textAlign:'center',marginBottom:28}}><div style={{fontSize:48}}>💪</div><div style={{fontSize:24,fontWeight:900,color:'#1c1c1a'}}>LifePlan</div><div style={{fontSize:12,color:'#8a887d',marginTop:4}}>Tabela TACO · NEPA/UNICAMP</div></div>
      <div style={{fontSize:20,fontWeight:800,color:'#1c1c1a',textAlign:'center',marginBottom:24}}>Bem-vindo de volta</div>
      <button style={{width:'100%',padding:13,marginBottom:16,borderRadius:10,border:'1px solid #ddd4c4',background:'#ffffff',color:'#1c1c1a',fontSize:14,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:10}} onClick={handleGoogle} disabled={loading}>
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" style={{width:20,height:20}}/>
        Entrar com Google
      </button>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
        <div style={{flex:1,height:1,background:'#e4ddd0'}}/>
        <span style={{fontSize:11,color:'#8a887d',fontWeight:600}}>OU</span>
        <div style={{flex:1,height:1,background:'#e4ddd0'}}/>
      </div>
      <label style={S.label}>📧 E-MAIL</label>
      <input style={{...S.input,marginBottom:12}} type="email" placeholder="seu@email.com" value={email} onChange={e=>setEmail(e.target.value)}/>
      <label style={S.label}>🔒 SENHA</label>
      <input style={{...S.input,marginBottom:16}} type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handle()}/>
      {err&&<div style={{color:'#ef4444',fontSize:12,marginBottom:12,textAlign:'center'}}>{err}</div>}
      <button style={{...S.btn('#22c55e'),width:'100%',padding:13,marginBottom:16,opacity:loading?.6:1}} onClick={handle} disabled={loading}>{loading?'⏳ Entrando...':'🚀 Entrar'}</button>
      <div style={{textAlign:'center',fontSize:13,color:'#8a887d'}}>Não tem conta?{' '}<button style={{background:'none',border:'none',color:'#60a5fa',cursor:'pointer',fontWeight:700}} onClick={onSwitch}>Cadastrar →</button></div>
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
        <div style={{fontSize:48,marginBottom:12}}>📬</div>
        <div style={{fontSize:20,fontWeight:800,color:'#1c1c1a',marginBottom:10}}>Confirme seu e-mail</div>
        <div style={{fontSize:13,color:'#6b6a63',lineHeight:1.6,marginBottom:20}}>Enviamos um link de confirmação para <b>{form.email}</b>. Clique nele para ativar sua conta e depois volte para entrar.</div>
        <button style={{...S.btn('#22c55e'),width:'100%',padding:13}} onClick={onSwitch}>Ir para o login</button>
      </div>
    </AuthWrap>
  );
  return(
    <AuthWrap>
      <div style={{textAlign:'center',marginBottom:24}}><div style={{fontSize:48}}>🥗</div><div style={{fontSize:24,fontWeight:900,color:'#1c1c1a'}}>LifePlan</div></div>
      <div style={{fontSize:20,fontWeight:800,color:'#1c1c1a',textAlign:'center',marginBottom:24}}>Criar conta</div>
      <button style={{width:'100%',padding:13,marginBottom:16,borderRadius:10,border:'1px solid #ddd4c4',background:'#ffffff',color:'#1c1c1a',fontSize:14,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:10}} onClick={handleGoogle} disabled={loading}>
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" style={{width:20,height:20}}/>
        Cadastrar com Google
      </button>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
        <div style={{flex:1,height:1,background:'#e4ddd0'}}/>
        <span style={{fontSize:11,color:'#8a887d',fontWeight:600}}>OU</span>
        <div style={{flex:1,height:1,background:'#e4ddd0'}}/>
      </div>
      {[['name','👤','NOME','Seu nome'],['email','📧','E-MAIL','seu@email.com'],['password','🔒','SENHA','Mín. 6 caracteres'],['confirm','🔒','CONFIRMAR','Repita a senha']].map(([k,ic,lb,ph])=>(
        <div key={k} style={{marginBottom:12}}><label style={S.label}>{ic} {lb}</label><input style={S.input} type={k==='password'||k==='confirm'?'password':'text'} placeholder={ph} value={form[k]} onChange={set(k)}/></div>
      ))}
      {err&&<div style={{color:'#ef4444',fontSize:12,margin:'8px 0',textAlign:'center'}}>{err}</div>}
      <button style={{...S.btn('#22c55e'),width:'100%',padding:13,marginTop:8,marginBottom:16,opacity:loading?.6:1}} onClick={handle} disabled={loading}>{loading?'⏳ Criando...':'✅ Criar Conta'}</button>
      <div style={{textAlign:'center',fontSize:13,color:'#8a887d'}}>Já tem conta?{' '}<button style={{background:'none',border:'none',color:'#60a5fa',cursor:'pointer',fontWeight:700}} onClick={onSwitch}>Entrar →</button></div>
    </AuthWrap>
  );
}

// ── PERFIL ────────────────────────────────────────────────────────────────────
function ProfilePage({userId,initialProfile,onSave,onBack}){
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
        <div style={{fontSize:18,fontWeight:800,color:'#1c1c1a'}}>👤 Meu Perfil</div>
        {onBack&&<button style={{background:'none',border:'1px solid #e4ddd0',borderRadius:8,color:'#6b6a63',padding:'6px 12px',fontSize:12,cursor:'pointer'}} onClick={onBack}>← Voltar</button>}
      </div>
      <div style={{padding:'16px 16px 0'}}><div style={{background:'rgba(99,102,241,0.1)',border:'1px solid rgba(99,102,241,0.25)',borderRadius:14,padding:14,marginBottom:4,fontSize:13,color:'#a5b4fc'}}>💡 Preencha seus dados para gerar um plano alimentar personalizado com alimentos da Tabela TACO.</div></div>
      <div style={S.card}>
        <div style={{fontSize:12,fontWeight:700,color:'#6b6a63',marginBottom:14,letterSpacing:.8}}>📏 DADOS FÍSICOS</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
          {[['weight','PESO (kg)','ex: 80'],['height','ALTURA (cm)','ex: 175'],['age','IDADE','ex: 25']].map(([k,lb,ph])=>(
            <div key={k}><label style={S.label}>{lb}</label><input style={S.input} type="number" placeholder={ph} value={form[k]} onChange={set(k)}/></div>
          ))}
          <div><label style={S.label}>SEXO</label><select style={S.select} value={form.sex} onChange={set('sex')}><option value="M">Masculino</option><option value="F">Feminino</option></select></div>
        </div>
        <div style={{marginBottom:12}}><label style={S.label}>🏃 NÍVEL DE ATIVIDADE</label><select style={S.select} value={form.activity} onChange={set('activity')}>{Object.entries(ACTIVITY_FACTORS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></div>
        <div><label style={S.label}>🎯 OBJETIVO</label><select style={S.select} value={form.goal} onChange={set('goal')}>{Object.entries(GOAL_ADJUSTMENTS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></div>
      </div>
      {targets&&(
        <div style={{...S.card,background:'rgba(34,197,94,0.06)',border:'1px solid rgba(34,197,94,0.2)'}}>
          <div style={{fontSize:12,fontWeight:700,color:'#4ade80',marginBottom:12,letterSpacing:.8}}>📊 SEU PLANO CALCULADO</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:10}}>
            {[['🔥','TDEE',tdee+' kcal'],['🍽️','Meta',targets.kcal+' kcal'],['🥩','Proteína',targets.prot+'g'],['🫒','Gordura',targets.fat+'g'],['🍚','Carbs',targets.carbs+'g'],['⚖️','IMC',(+form.weight/(((+form.height)/100)**2)).toFixed(1)]].map(([ic,lb,vl])=>(
              <div key={lb} style={{background:'#ffffff',borderRadius:10,padding:'10px 8px',textAlign:'center'}}>
                <div style={{fontSize:20,marginBottom:4}}>{ic}</div>
                <div style={{fontSize:14,fontWeight:800,color:'#1c1c1a'}}>{vl}</div>
                <div style={{fontSize:9,color:'#8a887d',marginTop:2}}>{lb}</div>
              </div>
            ))}
          </div>
          <div style={{fontSize:11,color:'#8a887d',textAlign:'center'}}>Fórmula Mifflin-St Jeor · 30% proteína · 25% gordura · 45% carboidrato</div>
        </div>
      )}
      {done
        ?<div style={{...S.card,textAlign:'center',background:'rgba(34,197,94,0.1)'}}><div style={{fontSize:40,marginBottom:8}}>🎉</div><div style={{color:'#4ade80',fontWeight:700,fontSize:16}}>Plano gerado com sucesso!</div></div>
        :<div style={{padding:'0 16px 16px'}}><button style={{...S.btn('#22c55e'),width:'100%',padding:14,fontSize:15,opacity:loading?.6:1}} onClick={handle} disabled={loading}>{loading?'⏳ Gerando plano...':'✅ Salvar e Gerar Plano Semanal'}</button></div>
      }
    </div>
  );
}

// ── MODAL TROCA DE TREINO ─────────────────────────────────────────────────────
function WorkoutModal({day,onSelect,onClose,profiles=[]}){
  const [tab,setTab]=useState(day.type);
  const [mode,setMode]=useState('list');
  const [customName,setCustomName]=useState(day.typeLabel||''  );
  const [customDetail,setCustomDetail]=useState(day.detail||''  );
  const [customExercises,setCustomExercises]=useState(day.exercises||''  );
  const group=WORKOUT_TYPES.find(w=>w.type===tab)||WORKOUT_TYPES[0];
  function handleCustomSave(){
    if(!customName.trim()) return;
    onSelect({type:tab,color:group.color,typeLabel:customName,detail:customDetail,exercises:customExercises});
  }
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:300,display:'flex',alignItems:'flex-end'}} onClick={onClose}>
      <div style={{background:'#ffffff',borderRadius:'20px 20px 0 0',width:'100%',padding:20,maxHeight:'90vh',overflow:'hidden',display:'flex',flexDirection:'column'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <div style={{fontSize:16,fontWeight:800,color:'#1c1c1a'}}>🔄 Editar Treino — {day.fullName}</div>
          <button style={S.btn('#ef4444')} onClick={onClose}>✕</button>
        </div>
        {/* Perfis do usuário */}
        {profiles.length>0&&(
          <>
            <div style={{fontSize:11,color:'#8a887d',fontWeight:700,marginBottom:8}}>MEUS TREINOS</div>
            <div style={{overflowY:'auto',flex:1,display:'flex',flexDirection:'column',gap:8}}>
              {profiles.map((p,i)=>{
                const color=WORKOUT_TYPES.find(w=>w.type===p.type)?.color||'#22c55e';
                const isActive=day.typeLabel===p.typeLabel;
                return(
                  <div key={i} onClick={()=>onSelect({type:p.type,color,typeLabel:p.typeLabel,exercises:p.exercises||''})}
                    style={{padding:'12px 14px',borderRadius:12,cursor:'pointer',border:'1px solid',
                      ...(isActive?{background:color+'18',borderColor:color}:{background:'#ffffff',borderColor:'#ffffff'})}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                      <div style={{fontSize:13,fontWeight:700,color:isActive?color:'#1c1c1a'}}>{p.typeLabel}</div>
                      {isActive&&<span style={S.badge(color)}>✓ Ativo</span>}
                    </div>
                    {p.exercises&&<div style={{fontSize:11,color:'#8a887d',lineHeight:1.6,whiteSpace:'pre-line',marginTop:4}}>{p.exercises}</div>}
                  </div>
                );
              })}
              {/* Opção descanso */}
              <div onClick={()=>onSelect({type:'rest',color:'#8a887d',typeLabel:'Descanso',exercises:'Nenhum treino – foco em sono e recuperação'})}
                style={{padding:'12px 14px',borderRadius:12,cursor:'pointer',border:'1px solid',
                  ...(day.type==='rest'?{background:'#8a887d18',borderColor:'#8a887d'}:{background:'#ffffff',borderColor:'#ffffff'})}}>
                <div style={{fontSize:13,fontWeight:700,color:day.type==='rest'?'#6b6a63':'#1c1c1a'}}>😴 Descanso</div>
              </div>
            </div>
          </>
        )}
        {profiles.length===0&&(
          <div style={{textAlign:'center',padding:'32px 0',flex:1}}>
            <div style={{fontSize:40,marginBottom:10}}>💪</div>
            <div style={{color:'#1c1c1a',fontWeight:700,marginBottom:6}}>Nenhum treino criado</div>
            <div style={{color:'#8a887d',fontSize:12,marginBottom:16}}>Crie seus treinos na aba 💪 Treinos para poder selecioná-los aqui.</div>
            <button style={{...S.btn('#22c55e'),padding:'10px 20px'}} onClick={onClose}>Ir para Treinos</button>
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
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',zIndex:200,display:'flex',alignItems:'flex-end'}} onClick={onClose}>
      <div style={{background:'#ffffff',borderRadius:'20px 20px 0 0',width:'100%',padding:20,maxHeight:'80vh',overflow:'hidden',display:'flex',flexDirection:'column'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',gap:10,marginBottom:16}}>
          <input autoFocus style={S.input} placeholder="🔍 Buscar alimento TACO..." value={q} onChange={e=>setQ(e.target.value)}/>
          <button style={S.btn('#ef4444')} onClick={onClose}>✕</button>
        </div>
        <div style={{overflowY:'auto',flex:1}}>
          {q.length<2&&<div style={{color:'#8a887d',textAlign:'center',padding:20,fontSize:13}}>Digite 2+ letras para buscar</div>}
          {results.map(t=>(
            <div key={t.id} style={{padding:'10px 12px',borderRadius:10,cursor:'pointer',marginBottom:6,background:'#ffffff',border:'1px solid #ffffff'}} onClick={()=>onSelect(t)}>
              <div style={{fontSize:13,color:'#1c1c1a',fontWeight:600,marginBottom:4}}>{t.n}</div>
              <div style={{display:'flex',gap:6,fontSize:11}}>
                <span style={S.badge('#f59e0b')}>{t.e} kcal</span>
                <span style={S.badge('#3b82f6')}>P {t.p}g</span>
                <span style={S.badge('#f97316')}>G {t.l}g</span>
                <span style={S.badge('#a78bfa')}>C {t.cb}g</span>
                <span style={{color:'#8a887d'}}>por 100g</span>
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
        <div style={{fontSize:18,fontWeight:800,color:'#1c1c1a'}}>🛒 Lista de Compras</div>
        {done.length>0&&<button style={{...S.btn('#8a887d'),padding:'6px 12px',fontSize:12}} onClick={onClear}>Limpar comprados</button>}
      </div>

      {items.length===0?(
        <div style={{padding:48,textAlign:'center'}}>
          <div style={{fontSize:56,marginBottom:16}}>🛒</div>
          <div style={{fontSize:18,fontWeight:700,color:'#1c1c1a',marginBottom:8}}>Lista vazia</div>
          <div style={{color:'#8a887d',fontSize:14}}>Toque em 🛒 ao lado de qualquer alimento no plano para adicioná-lo aqui.</div>
        </div>
      ):(
        <>
          {pending.length>0&&(
            <div style={{...S.card,marginTop:16}}>
              <div style={{fontSize:11,fontWeight:700,color:'#6b6a63',marginBottom:12,letterSpacing:.8}}>A COMPRAR ({pending.length})</div>
              {pending.map(item=>(
                <div key={item.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:'1px solid #ffffff'}}>
                  <button onClick={()=>onToggle(item.id)} style={{width:22,height:22,borderRadius:6,border:'2px solid #22c55e',background:'transparent',cursor:'pointer',flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,color:'#1c1c1a',fontWeight:600}}>{item.name}</div>
                    <div style={{fontSize:11,color:'#8a887d',marginTop:2}}>{item.qty}g · {item.kcal} kcal</div>
                  </div>
                  <button onClick={()=>onRemove(item.id)} style={{background:'none',border:'none',color:'#8a887d',cursor:'pointer',fontSize:16,padding:'0 4px'}}>✕</button>
                </div>
              ))}
            </div>
          )}
          {done.length>0&&(
            <div style={{...S.card,opacity:.6}}>
              <div style={{fontSize:11,fontWeight:700,color:'#6b6a63',marginBottom:12,letterSpacing:.8}}>COMPRADO ({done.length})</div>
              {done.map(item=>(
                <div key={item.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid #ffffff'}}>
                  <button onClick={()=>onToggle(item.id)} style={{width:22,height:22,borderRadius:6,border:'2px solid #22c55e',background:'#22c55e22',cursor:'pointer',flexShrink:0,fontSize:13}}>✓</button>
                  <div style={{flex:1,textDecoration:'line-through',color:'#8a887d',fontSize:13}}>{item.name}</div>
                  <button onClick={()=>onRemove(item.id)} style={{background:'none',border:'none',color:'#8a887d',cursor:'pointer',fontSize:16,padding:'0 4px'}}>✕</button>
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


// ── WORKOUT PROFILES PAGE ─────────────────────────────────────────────────────
function WorkoutProfilesPage({profiles,plan,onSave,onDelete,onApplyToDay,onBack,tab,setTab,cartCount,onOpenProfile,onLogout,onHome,workoutGoal,setWorkoutGoal}){
  const [editing,setEditing]=useState(null); // null | profile object
  const [showNew,setShowNew]=useState(false);

  function EditForm({initial,onDone}){
    const [form,setForm]=useState(initial||{id:'wp'+Date.now(),type:'strength',typeLabel:'',exercises:''});
    const set=k=>e=>setForm(f=>({...f,[k]:e.target.value}));
    const group=WORKOUT_TYPES.find(w=>w.type===form.type)||WORKOUT_TYPES[0];
    return(
      <div style={{background:'#ffffff',border:'1px solid #e4ddd0',borderRadius:16,padding:16,marginBottom:12}}>
        <div style={{marginBottom:10}}>
          <label style={S.label}>🏷️ TIPO</label>
          <div style={{display:'flex',gap:8}}>
            {WORKOUT_TYPES.map(wt=>(
              <button key={wt.type} onClick={()=>setForm(f=>({...f,type:wt.type}))} style={{flex:1,padding:'8px 0',borderRadius:10,border:'1px solid',cursor:'pointer',fontSize:18,
                ...(form.type===wt.type?{background:wt.color+'22',borderColor:wt.color}:{background:'#ffffff',borderColor:'#e4ddd0'})}}>
                {wt.icon}
              </button>
            ))}
          </div>
        </div>
        <div style={{marginBottom:10}}>
          <label style={S.label}>📝 NOME DO TREINO</label>
          <input style={S.input} value={form.typeLabel} onChange={set('typeLabel')} placeholder="Ex: Treino A – Peito e Tríceps"/>
        </div>
        <div style={{marginBottom:12}}>
          <label style={S.label}>💪 EXERCÍCIOS E SÉRIES</label>
          <textarea style={{...S.input,minHeight:130,resize:'vertical',lineHeight:1.8}} value={form.exercises} onChange={set('exercises')}
            placeholder={"Supino reto 4×8\nSupino inclinado 3×10\nCrucifixo 3×12\nTríceps polia 4×10\nTríceps francês 3×10"}/>
          <div style={{fontSize:11,color:'#8a887d',marginTop:4}}>Um exercício por linha</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button style={{...S.btn('#22c55e'),flex:1,padding:11}} onClick={()=>{if(!form.typeLabel.trim())return;onSave({...form,color:WORKOUT_TYPES.find(w=>w.type===form.type)?.color||'#22c55e'});onDone();}}>✅ Salvar</button>
          <button style={{...S.btn('#8a887d'),padding:11}} onClick={onDone}>Cancelar</button>
        </div>
      </div>
    );
  }

  const DAYS_SHORT=['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];

  return(
    <div style={S.wrap}>
      <div style={S.header}>
        <div style={{fontSize:18,fontWeight:800,color:'#1c1c1a'}}>💪 Meus Treinos</div>
        <button style={{...S.btn('#22c55e'),padding:'7px 14px',fontSize:13}} onClick={()=>setShowNew(true)}>+ Novo</button>
      </div>

      <div style={{padding:'16px 16px 100px'}}>
        <div style={{background:'#eef2e7',border:'1px solid #e4ddd0',borderRadius:14,padding:'12px 14px',marginBottom:16,display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
          <div>
            <div style={{fontSize:13,fontWeight:800,color:'#1c1c1a'}}>🎯 Meta de treinos por semana</div>
            <div style={{fontSize:11,color:'#6b6a63',marginTop:2}}>Usada no marcador de Insights em Hábitos e Performance</div>
          </div>
          <input type="number" min="1" max="14" value={workoutGoal} onChange={e=>setWorkoutGoal(Math.max(1,parseInt(e.target.value,10)||1))}
            style={{width:56,textAlign:'center',border:'1px solid #e4ddd0',borderRadius:8,padding:'6px 4px',fontSize:14,fontWeight:800}}/>
        </div>

        {showNew&&<EditForm initial={null} onDone={()=>setShowNew(false)}/>}

        {profiles.length===0&&!showNew&&(
          <div style={{textAlign:'center',padding:'48px 0'}}>
            <div style={{fontSize:56,marginBottom:12}}>💪</div>
            <div style={{fontSize:16,fontWeight:700,color:'#1c1c1a',marginBottom:8}}>Nenhum perfil criado</div>
            <div style={{color:'#8a887d',fontSize:13,marginBottom:24}}>Crie perfis de treino e aplique a qualquer dia da semana.</div>
            <button style={{...S.btn('#22c55e'),padding:'12px 28px'}} onClick={()=>setShowNew(true)}>+ Criar primeiro treino</button>
          </div>
        )}

        {profiles.map(p=>{
          const color=WORKOUT_TYPES.find(w=>w.type===p.type)?.color||'#22c55e';
          if(editing?.id===p.id) return <EditForm key={p.id} initial={p} onDone={()=>setEditing(null)}/>;
          return(
            <div key={p.id} style={{background:'#ffffff',border:`1px solid ${color}33`,borderRadius:16,padding:16,marginBottom:12}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                <div>
                  <div style={{fontSize:15,fontWeight:800,color:color}}>{p.typeLabel}</div>
                  <div style={{fontSize:11,color:'#8a887d',marginTop:2}}>{WORKOUT_TYPES.find(w=>w.type===p.type)?.label}</div>
                </div>
                <div style={{display:'flex',gap:6}}>
                  <button style={{...S.btn('#7f9770'),padding:'5px 10px',fontSize:12}} onClick={()=>setEditing(p)}>✏️</button>
                  <button style={{...S.btn('#3f1515'),padding:'5px 10px',fontSize:12}} onClick={()=>onDelete(p.id)}>🗑️</button>
                </div>
              </div>
              {p.exercises&&(
                <div style={{fontSize:12,color:'#6b6a63',lineHeight:1.8,whiteSpace:'pre-line',marginBottom:10,padding:'8px 10px',background:'rgba(0,0,0,0.2)',borderRadius:8}}>
                  {p.exercises}
                </div>
              )}

              <div style={{fontSize:10,fontWeight:800,color:'#8a887d',marginBottom:6,textTransform:'uppercase'}}>Aplicar em quais dias?</div>
              <div style={{display:'flex',gap:4}}>
                {DAYS_SHORT.map((d,di)=>{
                  const isUsing=plan[di]?.typeLabel===p.typeLabel;
                  return(
                    <button key={di} onClick={()=>onApplyToDay(p.id,di,isUsing)}
                      style={{flex:1,padding:'6px 0',borderRadius:8,border:`1px solid ${isUsing?color:'#e4ddd0'}`,
                        background:isUsing?color:'#ffffff',color:isUsing?'#ffffff':'#6b6a63',
                        fontSize:11,fontWeight:800,cursor:'pointer'}}>
                      {d}
                    </button>
                  );
                })}
              </div>

            </div>
          );
        })}
      </div>

      <nav style={{...S.nav,justifyContent:'center',alignItems:'center',gap:14,padding:'10px 0',boxShadow:'0 -2px 10px rgba(0,0,0,0.05)'}}>
        <button style={{flex:'0 0 auto',background:'#f2efe4',border:'1px solid #e4ddd0',borderRadius:16,padding:'8px 26px',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:2}} onClick={onHome}>
          <span style={{fontSize:22}}>🏠</span>
          <span style={{fontSize:11,fontWeight:800,color:'#3f6b2f'}}>Início</span>
        </button>
        <button style={{flex:'0 0 auto',background:'#f2efe4',border:'1px solid #e4ddd0',borderRadius:16,padding:'8px 26px',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:2}} onClick={onLogout}>
          <span style={{fontSize:22}}>🚪</span>
          <span style={{fontSize:11,fontWeight:800,color:'#8a887d'}}>Sair</span>
        </button>
      </nav>
    </div>
  );
}

// ── MEAL PLAN APP ─────────────────────────────────────────────────────────────
function MealPlanApp({onLogout,userId,onOpenProfile,onHome,initialTab}){
  const [plan,setPlan]           = useState(null);
  const [tab,setTab]             = useState(initialTab||'plan');   // 'plan' | 'shop' | 'workout'
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
  useEffect(()=>{
    if(!userId) return;
    const unregs=[
      registerPlanDataField('plan',()=>planRef.current),
      registerPlanDataField('shopping',()=>shoppingRef.current),
      registerPlanDataField('workoutProfiles',()=>workoutProfilesRef.current),
      registerPlanDataField('workoutGoalPerWeek',()=>workoutGoalRef.current),
    ];
    return ()=>unregs.forEach(u=>u());
  },[userId]);

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

  // Carrega plano e lista do Supabase
  useEffect(()=>{
    loadUserPlan(userId).then(saved=>{
      if(saved&&saved.length) setPlan(saved); else setPlan([]);
    }).catch(()=>setPlan([]));
    // Carrega lista de compras e perfis de treino
    supabase.from('user_plans').select('plan_data').eq('user_id',userId).maybeSingle()
      .then(({data})=>{
        if(data?.plan_data?.shopping) setShopping(data.plan_data.shopping);
        if(data?.plan_data?.workoutProfiles) setWorkoutProfiles(data.plan_data.workoutProfiles);
        if(data?.plan_data?.workoutGoalPerWeek) setWorkoutGoal(data.plan_data.workoutGoalPerWeek);
      });
  },[userId]);

  // Pede o salvamento a cada mudança do plano (a fila central faz a escrita
  // de verdade, então nunca corre com o salvamento de compras/treinos)
  useEffect(()=>{
    if(!plan||!plan.length||!userId) return;
    clearTimeout(timer.current);
    setSaving(true);
    timer.current=setTimeout(()=>{
      requestPlanDataSave(userId);
      setSaveMsg('✅ Salvo');setSaving(false);setTimeout(()=>setSaveMsg(''),2000);
    },1200);
    return()=>{clearTimeout(timer.current);requestPlanDataSave(userId);};
  },[plan,userId]);

  // Pede o salvamento a cada mudança da lista de compras (mesma fila central)
  useEffect(()=>{
    if(!userId) return;
    const t=setTimeout(()=>requestPlanDataSave(userId),400);
    return()=>{clearTimeout(t);requestPlanDataSave(userId);};
  },[shopping,userId]);

  // Pede o salvamento a cada mudança de perfis de treino / meta semanal
  useEffect(()=>{
    if(!userId) return;
    clearTimeout(timerProfiles.current);
    timerProfiles.current=setTimeout(()=>requestPlanDataSave(userId),400);
    return()=>{clearTimeout(timerProfiles.current);requestPlanDataSave(userId);};
  },[workoutProfiles,workoutGoal,userId]);

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

  // ── redistribuir refeições
  function redistributeMeals(count){
    const TEMPLATES={
      2:[
        {time:'12:00',name:'Almoço',icon:'🍽️'},
        {time:'19:00',name:'Jantar',icon:'🌙'},
      ],
      3:[
        {time:'07:00',name:'Café da Manhã',icon:'🌅'},
        {time:'13:00',name:'Almoço',icon:'🍽️'},
        {time:'19:00',name:'Jantar',icon:'🌙'},
      ],
      4:[
        {time:'07:00',name:'Café da Manhã',icon:'🌅'},
        {time:'12:00',name:'Almoço',icon:'🍽️'},
        {time:'16:00',name:'Lanche',icon:'🥛'},
        {time:'20:00',name:'Jantar',icon:'🌙'},
      ],
      5:[
        {time:'07:00',name:'Café da Manhã',icon:'🌅'},
        {time:'10:00',name:'Lanche 1',icon:'🥛'},
        {time:'13:00',name:'Almoço',icon:'🍽️'},
        {time:'16:30',name:'Pré-Treino',icon:'⚡'},
        {time:'20:00',name:'Pós-Treino / Jantar',icon:'💪'},
      ],
      6:[
        {time:'07:00',name:'Café da Manhã',icon:'🌅'},
        {time:'10:00',name:'Lanche 1',icon:'🥛'},
        {time:'13:00',name:'Almoço',icon:'🍽️'},
        {time:'16:30',name:'Pré-Treino',icon:'⚡'},
        {time:'20:00',name:'Pós-Treino / Jantar',icon:'💪'},
        {time:'22:00',name:'Ceia',icon:'🌙'},
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
    <div style={{minHeight:'100vh',background:'#efe8dd',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center'}}><div style={{fontSize:48,marginBottom:12}}>💪</div><div style={{color:'#8a887d'}}>Carregando...</div></div>
    </div>
  );
  if(!plan.length) return(
    <div style={S.wrap}>
      <div style={S.header}><div style={{fontSize:18,fontWeight:800,color:'#1c1c1a'}}>💪 LifePlan</div><button style={{background:'none',border:'1px solid #e4ddd0',borderRadius:8,color:'#6b6a63',padding:'6px 12px',fontSize:12,cursor:'pointer'}} onClick={onLogout}>Sair</button></div>
      <div style={{padding:32,textAlign:'center'}}><div style={{fontSize:64,marginBottom:16}}>👤</div><div style={{fontSize:20,fontWeight:800,color:'#1c1c1a',marginBottom:8}}>Configure seu perfil</div><div style={{color:'#8a887d',fontSize:14,marginBottom:28}}>Informe seus dados para gerar um plano alimentar personalizado</div><button style={{...S.btn('#22c55e'),padding:'14px 32px',fontSize:15}} onClick={onOpenProfile}>🎯 Configurar Perfil</button></div>
    </div>
  );

  const day=plan[dayIdx];
  const tc={strength:'#22c55e',cardio:'#3b82f6',rest:'#8a887d'}[day?.type]||'#8a887d';

  // ── render aba treinos
  if(tab==='workout') return(
    <WorkoutProfilesPage
      profiles={workoutProfiles}
      plan={plan}
      onSave={saveProfile}
      onDelete={deleteProfile}
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
    <>
      <ShoppingList items={shopping} onToggle={toggleCart} onRemove={removeCart} onClear={clearDone}/>
      <nav style={S.nav}>
        <button style={S.navBtn(false)} onClick={onHome}>
          <span style={{fontSize:20}}>🏠</span>
          <span style={{fontSize:10,fontWeight:700}}>Início</span>
        </button>
        <button style={S.navBtn(tab==='plan')} onClick={()=>setTab('plan')}>
          <span style={{fontSize:20}}>📋</span>
          <span style={{fontSize:10,fontWeight:700}}>Plano</span>
        </button>
        <button style={S.navBtn(false)} onClick={onLogout}>
          <span style={{fontSize:20}}>🚪</span>
          <span style={{fontSize:10,fontWeight:700}}>Sair</span>
        </button>
      </nav>
    </>
  );

  // ── render plano
  return(
    <div style={S.wrap}>
      {/* Header */}
      <div style={S.header}>
        <div style={{fontSize:18,fontWeight:800,color:'#1c1c1a'}}>💪 LifePlan</div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          {saveMsg&&<span style={{fontSize:11,color:saveMsg.startsWith('✅')?'#4ade80':'#ef4444'}}>{saveMsg}</span>}
          {saving&&<span style={{fontSize:11,color:'#6b6a63'}}>💾</span>}
        </div>
      </div>

      {/* Day tabs */}
      <div style={{display:'flex',overflowX:'auto',gap:8,padding:'16px 20px',scrollbarWidth:'none'}}>
        {plan.map((d,i)=>(
          <button key={d.id} onClick={()=>setDayIdx(i)} style={{flexShrink:0,padding:'8px 14px',borderRadius:12,border:'1px solid',cursor:'pointer',fontSize:12,fontWeight:700,
            ...(i===dayIdx?{background:d.type==='rest'?'#8a887d33':d.type==='cardio'?'#dbeafe':'#1a2e1a',borderColor:d.type==='rest'?'#8a887d':d.type==='cardio'?'#3b82f6':'#22c55e',color:d.type==='rest'?'#6b6a63':d.type==='cardio'?'#60a5fa':'#4ade80'}:{background:'#ffffff',borderColor:'#e4ddd0',color:'#8a887d'})
          }}>
            <div>{d.short}</div>
            {(d.type==='rest'||workoutProfiles.some(p=>p.typeLabel===d.typeLabel))&&<div style={{fontSize:9,marginTop:2,opacity:.7}}>{d.typeLabel.split('–')[0].trim()}</div>}
          </button>
        ))}
      </div>

      {/* Day header */}
      <div style={{...S.card,background:`linear-gradient(135deg,${tc}18,${tc}08)`,border:`1px solid ${tc}33`}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
          <div>
            <div style={{fontSize:18,fontWeight:800,color:'#1c1c1a'}}>{day.fullName}</div>
            <div style={{display:'flex',alignItems:'center',gap:8,marginTop:4}}>
              {(day.type==='rest'||workoutProfiles.some(p=>p.typeLabel===day.typeLabel))&&<div style={{fontSize:13,color:tc,fontWeight:700}}>{day.typeLabel}</div>}
              {/* Botão troca treino */}
              <button onClick={()=>setShowWorkout(true)} style={{background:'#ffffff',border:'1px solid #e4ddd0',borderRadius:8,color:'#6b6a63',padding:'2px 8px',fontSize:11,cursor:'pointer',fontWeight:600}}>🔄 Treino</button>
              <button onClick={()=>setShowMealCount(true)} style={{background:'#ffffff',border:'1px solid #e4ddd0',borderRadius:8,color:'#6b6a63',padding:'2px 8px',fontSize:11,cursor:'pointer',fontWeight:600}}>🍽️ Refeições</button>
            </div>
            {day.exercises&&(day.type==='rest'||workoutProfiles.some(p=>p.typeLabel===day.typeLabel))&&<div style={{fontSize:12,color:'#6b6a63',marginTop:6,lineHeight:1.7,whiteSpace:'pre-line'}}>{day.exercises.replace(/·/g,'\n')}</div>}
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:20,fontWeight:900,color:tc}}>{dayTotals.kcal}</div>
            <div style={{fontSize:10,color:'#8a887d',fontWeight:600}}>kcal totais</div>
          </div>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {[['🥩',dayTotals.p+'g','proteína','#3b82f6'],['🫒',dayTotals.l+'g','gordura','#f97316'],['🍚',dayTotals.cb+'g','carbs','#a78bfa'],['🔥',day.burned+'kcal','queimado','#ef4444']].map(([ic,v,l,c])=>(
            <div key={l} style={{background:c+'18',border:`1px solid ${c}33`,borderRadius:10,padding:'8px 12px',flex:1,minWidth:60,textAlign:'center'}}>
              <div style={{fontSize:14}}>{ic}</div>
              <div style={{fontSize:13,fontWeight:800,color:c}}>{v}</div>
              <div style={{fontSize:9,color:'#8a887d',fontWeight:600}}>{l}</div>
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
              <span style={{fontSize:20}}>{meal.icon}</span>
              <div style={{flex:1}}>
                {editMeal?.mi===mi&&editMeal?.field==='name'
                  ?<input autoFocus style={{...S.input,padding:'4px 8px',fontSize:14,fontWeight:700,marginBottom:2}} value={meal.name}
                      onChange={e=>updateMeal(mi,'name',e.target.value)} onBlur={()=>setEditMeal(null)} onKeyDown={e=>e.key==='Enter'&&setEditMeal(null)}/>
                  :<div style={{fontSize:14,fontWeight:700,color:'#1c1c1a',cursor:'pointer'}} onClick={()=>setEditMeal({mi,field:'name'})} title="Clique para editar">{meal.name} <span style={{fontSize:10,color:'#8a887d'}}>✏️</span></div>
                }
                {editMeal?.mi===mi&&editMeal?.field==='time'
                  ?<input autoFocus style={{...S.input,padding:'2px 6px',fontSize:11,width:80,marginTop:2}} type="time" value={meal.time}
                      onChange={e=>updateMeal(mi,'time',e.target.value)} onBlur={()=>setEditMeal(null)}/>
                  :<div style={{fontSize:11,color:'#8a887d',fontWeight:600,cursor:'pointer',marginTop:2}} onClick={()=>setEditMeal({mi,field:'time'})} title="Clique para editar">{meal.time} <span style={{fontSize:9}}>✏️</span></div>
                }
              </div>
              <span style={S.badge('#f59e0b')}>{mt.kcal} kcal</span>
            </div>
            {meal.foods.map(food=>{
              const inCart=shopping.some(i=>i.name===food.name&&!i.checked);
              return(
                <div key={food.id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:'1px solid #ffffff'}}>
                  {editFood===food.id
                    ?<input style={{...S.input,width:70,padding:'4px 8px',fontSize:12}} type="number" value={food.qty} onChange={e=>updateQty(mi,food.id,+e.target.value)} onBlur={()=>setEditFood(null)} autoFocus/>
                    :<span style={{fontSize:11,color:'#3b82f6',fontWeight:700,cursor:'pointer',minWidth:40}} onClick={()=>setEditFood(food.id)}>{food.qty}g</span>
                  }
                  <span style={{flex:1,fontSize:13,color:'#cbd5e1'}}>{food.name}</span>
                  <div style={{display:'flex',gap:4,alignItems:'center'}}>
                    <div style={{display:'flex',gap:3,fontSize:10}}>
                      <span style={S.badge('#f59e0b')}>{food.kcal}</span>
                      <span style={S.badge('#3b82f6')}>P{food.p}</span>
                      <span style={S.badge('#f97316')}>G{food.l}</span>
                      <span style={S.badge('#a78bfa')}>C{food.cb}</span>
                    </div>
                    {/* Botão carrinho */}
                    <button onClick={()=>addToCart(food)} title="Adicionar à lista de compras"
                      style={{background:inCart?'rgba(34,197,94,0.15)':'#ffffff',border:`1px solid ${inCart?'#22c55e':'#e4ddd0'}`,borderRadius:7,color:inCart?'#4ade80':'#8a887d',cursor:'pointer',fontSize:14,padding:'3px 6px',lineHeight:1}}>
                      🛒
                    </button>
                    <button style={{background:'none',border:'none',color:'#8a887d',cursor:'pointer',fontSize:14,padding:'0 2px'}} onClick={()=>removeFood(mi,food.id)}>✕</button>
                  </div>
                </div>
              );
            })}
            <button style={{...S.btn('#a89f8c'),border:'1px dashed rgba(0,0,0,0.15)',width:'100%',marginTop:10,fontSize:12}} onClick={()=>setShowSearch(mi)}>
              + Adicionar alimento TACO
            </button>
          </div>
        );
      })}

      <div style={{height:80}}/>

      {/* Bottom nav */}
      <nav style={{...S.nav,justifyContent:'center',alignItems:'center',gap:14,padding:'10px 0',boxShadow:'0 -2px 10px rgba(0,0,0,0.05)'}}>
        <button style={{flex:'0 0 auto',background:'#f2efe4',border:'1px solid #e4ddd0',borderRadius:16,padding:'8px 26px',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:2}} onClick={onHome}>
          <span style={{fontSize:22}}>🏠</span>
          <span style={{fontSize:11,fontWeight:800,color:'#3f6b2f'}}>Início</span>
        </button>
        <button style={{flex:'0 0 auto',background:'#f2efe4',border:'1px solid #e4ddd0',borderRadius:16,padding:'8px 26px',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:2}} onClick={onLogout}>
          <span style={{fontSize:22}}>🚪</span>
          <span style={{fontSize:11,fontWeight:800,color:'#8a887d'}}>Sair</span>
        </button>
      </nav>

      {showSearch!==null&&<FoodModal onSelect={t=>addFood(showSearch,t)} onClose={()=>setShowSearch(null)}/>}
      {showMealCount&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:300,display:'flex',alignItems:'flex-end'}} onClick={()=>setShowMealCount(false)}>
          <div style={{background:'#ffffff',borderRadius:'20px 20px 0 0',width:'100%',padding:24}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <div style={{fontSize:16,fontWeight:800,color:'#1c1c1a'}}>🍽️ Dividir Refeições — {day.fullName}</div>
              <button style={S.btn('#ef4444')} onClick={()=>setShowMealCount(false)}>✕</button>
            </div>
            <div style={{fontSize:12,color:'#8a887d',marginBottom:16}}>Escolha em quantas refeições distribuir os macros do dia. Os alimentos serão redistribuídos automaticamente.</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10}}>
              {[2,3,4,5,6].map(n=>{
                const active=day.meals.length===n;
                return(
                  <button key={n} onClick={()=>redistributeMeals(n)}
                    style={{padding:'16px 0',borderRadius:12,border:'1px solid',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:6,
                      ...(active?{background:'#22c55e22',borderColor:'#22c55e',color:'#4ade80'}:{background:'#ffffff',borderColor:'#e4ddd0',color:'#6b6a63'})}}>
                    <span style={{fontSize:24,fontWeight:900}}>{n}</span>
                    <span style={{fontSize:10,fontWeight:700}}>{active?'✓ Atual':'refeições'}</span>
                  </button>
                );
              })}
            </div>
            <div style={{marginTop:16,fontSize:11,color:'#8a887d',textAlign:'center'}}>* Apenas o dia atual será alterado</div>
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
  useEffect(()=>{
    if(!userId) return;
    supabase.from('user_plans').select('plan_data').eq('user_id',userId).maybeSingle().then(({data:row})=>{
      const cloud=row?.plan_data?.water;
      if(cloud&&cloud.date===todayKey()) setData(cloud);
      else if(cloud) setData(d=>({...d,goal:cloud.goal||d.goal})); // dia diferente: mantém só a meta
    });
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
  useEffect(()=>{
    if(!userId) return;
    const t=setTimeout(()=>requestPlanDataSave(userId),400);
    return()=>{clearTimeout(t);requestPlanDataSave(userId);};
  },[data,userId]);

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

  useEffect(()=>{
    if(!userId) return;
    supabase.from('user_plans').select('plan_data').eq('user_id',userId).maybeSingle().then(({data:row})=>{
      if(Array.isArray(row?.plan_data?.agendaManual)) setItems(row.plan_data.agendaManual);
    });
  },[userId]);

  // Registra na fila central (sempre lê o valor mais atual via ref)
  const itemsRef=useRef(items);
  itemsRef.current=items;
  useEffect(()=>{
    if(!userId) return;
    return registerPlanDataField('agendaManual',()=>itemsRef.current);
  },[userId]);

  useEffect(()=>{
    if(!userId) return;
    const t=setTimeout(()=>requestPlanDataSave(userId),400);
    return()=>{clearTimeout(t);requestPlanDataSave(userId);};
  },[items,userId]);

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

// Gradiente dinâmico de fundo do balão de clima, de acordo com a condição
// atual (limpo, nublado, chuva, tempestade, neve, névoa) e se é dia ou noite.
// Aceita tanto o "type" da Google Weather API (string, ex: "CLEAR") quanto o
// código WMO do Open-Meteo (número), usado como alternativa sem chave.
const GW_RAIN_TYPES=['WIND_AND_RAIN','LIGHT_RAIN_SHOWERS','CHANCE_OF_SHOWERS','SCATTERED_SHOWERS','RAIN_SHOWERS','HEAVY_RAIN_SHOWERS','LIGHT_TO_MODERATE_RAIN','MODERATE_TO_HEAVY_RAIN','RAIN','LIGHT_RAIN','HEAVY_RAIN','RAIN_PERIODICALLY_HEAVY','RAIN_AND_SNOW'];
const GW_SNOW_TYPES=['LIGHT_SNOW_SHOWERS','CHANCE_OF_SNOW_SHOWERS','SCATTERED_SNOW_SHOWERS','SNOW_SHOWERS','HEAVY_SNOW_SHOWERS','LIGHT_TO_MODERATE_SNOW','MODERATE_TO_HEAVY_SNOW','SNOW','LIGHT_SNOW','HEAVY_SNOW','BLOWING_SNOW'];
const GW_STORM_TYPES=['SNOWSTORM','SNOW_PERIODICALLY_HEAVY','HEAVY_SNOW_STORM','HAIL','HAIL_SHOWERS','THUNDERSTORM','THUNDERSHOWER','LIGHT_THUNDERSTORM_RAIN','SCATTERED_THUNDERSTORMS','HEAVY_THUNDERSTORM'];

function weatherGradient(code,isDay){
  const day=isDay===1||isDay===undefined;
  const clearGrad=day?'linear-gradient(135deg,#4f9de0 0%,#8fd0f0 100%)':'linear-gradient(135deg,#1a2a5e 0%,#3b4d8c 100%)';

  if(typeof code==='string'){
    const t=code;
    if(t==='CLEAR') return clearGrad;
    if(['MOSTLY_CLEAR','PARTLY_CLOUDY'].includes(t)) return day?'linear-gradient(135deg,#5b9bd5 0%,#a7d4ef 100%)':'linear-gradient(135deg,#232e52 0%,#4a5a8a 100%)';
    if(['MOSTLY_CLOUDY','CLOUDY','WINDY'].includes(t)) return 'linear-gradient(135deg,#8a97a3 0%,#c3cdd6 100%)';
    if(GW_RAIN_TYPES.includes(t)) return 'linear-gradient(135deg,#4a6178 0%,#7891a8 100%)';
    if(GW_SNOW_TYPES.includes(t)) return 'linear-gradient(135deg,#a9c6e0 0%,#e4eef7 100%)';
    if(GW_STORM_TYPES.includes(t)) return 'linear-gradient(135deg,#3a3f52 0%,#5f6478 100%)';
    return clearGrad;
  }

  // código WMO (Open-Meteo)
  if(code===0) return clearGrad;
  if([1,2].includes(code)) return day?'linear-gradient(135deg,#5b9bd5 0%,#a7d4ef 100%)':'linear-gradient(135deg,#232e52 0%,#4a5a8a 100%)';
  if(code===3) return 'linear-gradient(135deg,#8a97a3 0%,#c3cdd6 100%)';
  if([45,48].includes(code)) return 'linear-gradient(135deg,#9aa3ab 0%,#c9d1d8 100%)';
  if([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code)) return 'linear-gradient(135deg,#4a6178 0%,#7891a8 100%)';
  if([71,73,75,77,85,86].includes(code)) return 'linear-gradient(135deg,#a9c6e0 0%,#e4eef7 100%)';
  if([95,96,99].includes(code)) return 'linear-gradient(135deg,#3a3f52 0%,#5f6478 100%)';
  return clearGrad;
}

// Ícone de clima: usa o ícone oficial da Google Weather API quando disponível
// (iconUri), ou desenha um ícone "blob" flat como alternativa quando estiver
// usando o Open-Meteo (sem chave configurada).
function WeatherIcon({code,isDay,iconUri,size=56}){
  if(iconUri){
    return <img src={`${iconUri}.svg`} alt="" width={size} height={size} style={{display:'block'}}/>;
  }

  const day=isDay===1||isDay===undefined;
  const sunGrad=<defs><radialGradient id="sunG" cx="35%" cy="30%" r="75%"><stop offset="0%" stopColor="#ffe98a"/><stop offset="100%" stopColor="#ffb703"/></radialGradient>
    <linearGradient id="cloudG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ffffff"/><stop offset="100%" stopColor="#dfe6ee"/></linearGradient>
    <linearGradient id="moonG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#8bb8ff"/><stop offset="100%" stopColor="#3d63c9"/></linearGradient>
    <linearGradient id="darkCloudG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c3ccd6"/><stop offset="100%" stopColor="#9aa5b3"/></linearGradient></defs>;

  const Sun=(<circle cx="38" cy="34" r="20" fill="url(#sunG)"/>);
  const Moon=(<path d="M46 20a18 18 0 1 0 12 30 14 14 0 0 1-12-30z" fill="url(#moonG)"/>);
  const Cloud=(cx=32,cy=44,scale=1,grad='cloudG')=>(
    <g transform={`translate(${cx-32} ${cy-44}) scale(${scale})`}>
      <ellipse cx="30" cy="46" rx="20" ry="14" fill={`url(#${grad})`}/>
      <ellipse cx="46" cy="42" rx="15" ry="12" fill={`url(#${grad})`}/>
      <ellipse cx="18" cy="42" rx="12" ry="10" fill={`url(#${grad})`}/>
    </g>
  );
  const Drops=(<g stroke="#4f8ef7" strokeWidth="3" strokeLinecap="round">
    <line x1="24" y1="60" x2="20" y2="70"/><line x1="38" y1="62" x2="34" y2="74"/><line x1="52" y1="60" x2="48" y2="70"/>
  </g>);
  const Bolt=(<path d="M40 58 L30 72 L38 72 L34 84 L48 66 L40 66 Z" fill="#ffd43b"/>);
  const SnowDots=(<g fill="#eaf4ff"><circle cx="24" cy="66" r="2.5"/><circle cx="38" cy="72" r="2.5"/><circle cx="52" cy="66" r="2.5"/></g>);

  let body;
  if(code===0){ body=day?Sun:Moon; }
  else if([1,2].includes(code)){ body=<>{day?Sun:Moon}{Cloud(38,46,0.9,day?'cloudG':'darkCloudG')}</>; }
  else if(code===3){ body=<>{Cloud(30,42,1.15,'darkCloudG')}</>; }
  else if([45,48].includes(code)){ body=<>{Cloud(30,44,1.1,'darkCloudG')}<g stroke="#b7c1cc" strokeWidth="3" strokeLinecap="round"><line x1="14" y1="66" x2="50" y2="66"/><line x1="18" y1="74" x2="54" y2="74"/></g></>; }
  else if([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code)){ body=<>{Cloud(32,40,1.05,'darkCloudG')}{Drops}</>; }
  else if([71,73,75,77,85,86].includes(code)){ body=<>{Cloud(32,40,1.05,'cloudG')}{SnowDots}</>; }
  else if([95,96,99].includes(code)){ body=<>{Cloud(32,40,1.05,'darkCloudG')}{Bolt}</>; }
  else { body=day?Sun:Moon; }

  return(
    <svg width={size} height={size} viewBox="0 0 84 84">
      {sunGrad}
      {body}
    </svg>
  );
}

function uvInfo(uv){
  if(uv==null) return null;
  if(uv>=11) return {label:'Extremo',color:'#7a1fa2'};
  if(uv>=8) return {label:'Muito alto',color:'#d62828'};
  if(uv>=6) return {label:'Alto',color:'#e85d04'};
  if(uv>=3) return {label:'Moderado',color:'#f9c74f'};
  return {label:'Baixo',color:'#588157'};
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
  useEffect(()=>{
    if(!userId) return;
    supabase.from('user_plans').select('plan_data').eq('user_id',userId).maybeSingle().then(({data:row})=>{
      const cloud=row?.plan_data?.timetable;
      if(cloud&&Array.isArray(cloud.rows)) setData(cloud);
    });
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
    if(!userId) return;
    const t=setTimeout(()=>requestPlanDataSave(userId),400);
    return()=>{clearTimeout(t);requestPlanDataSave(userId);};
  },[data,userId]);

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
function getSaldoPreview(){
  try{
    const state=JSON.parse(localStorage.getItem('cf_state'));
    if(!state?.balancoTables) return null;
    let total=0;
    state.balancoTables.forEach(t=>{
      if(t.includeInSaldo===false) return;
      const sign=t.sign||1;
      const numCols=(t.columns||[]).filter(c=>c.type==='number');
      let sum=0;
      (t.rows||[]).forEach(r=>{numCols.forEach(c=>{sum+=parseFloat(r.values?.[c.id])||0;});});
      total+=sum*sign;
    });
    return total;
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

const STUDY_METHOD_ICONS={pomodoro:'🍅','52-17':'⏳',flowtime:'🌊'};

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

  const cardStyle={margin:'18px 16px 0',background:'#ffffff',border:'1px solid #e4ddd0',borderRadius:20,padding:18,boxShadow:'0 2px 12px rgba(0,0,0,0.05)'};

  if(!method) return(
    <div style={cardStyle}>
      <div style={{fontSize:15,fontWeight:800,color:'#1c1c1a',marginBottom:4}}>⏱️ Timer de Foco</div>
      <div style={{fontSize:12,color:'#6b6a63',marginBottom:14}}>Escolha um dos 3 métodos de estudo com mais respaldo científico:</div>
      {STUDY_METHODS.map(m=>(
        <button key={m.id} onClick={()=>chooseMethod(m)} style={{display:'flex',alignItems:'center',gap:12,width:'100%',textAlign:'left',background:'#faf7f0',border:'1px solid #e4ddd0',borderRadius:14,padding:'12px 14px',marginBottom:10,cursor:'pointer'}}>
          <span style={{fontSize:26,flexShrink:0}}>{STUDY_METHOD_ICONS[m.id]}</span>
          <span>
            <div style={{fontSize:14,fontWeight:800,color:'#3f6b2f'}}>{m.name}</div>
            <div style={{fontSize:12,color:'#6b6a63',marginTop:3,lineHeight:1.5}}>{m.desc}</div>
          </span>
        </button>
      ))}
    </div>
  );

  return(
    <div style={{...cardStyle,textAlign:'center'}}>
      <div style={{fontSize:13,fontWeight:700,color:'#6b6a63',marginBottom:10}}>{STUDY_METHOD_ICONS[method.id]} {method.name} — {phase==='focus'?'🧠 Foco':'☕ Pausa'}{cycles>0?` · ciclo ${cycles+1}`:''}</div>
      <div style={{
        width:170,height:170,margin:'0 auto 16px',borderRadius:'50%',
        background:phase==='focus'?'radial-gradient(circle,#eaf7ea 0%,#dff0dc 100%)':'radial-gradient(circle,#eaf3fb 0%,#dcebf8 100%)',
        border:`3px solid ${phase==='focus'?'#7f9770':'#5b9bd5'}`,
        display:'flex',alignItems:'center',justifyContent:'center'
      }}>
        <div style={{fontSize:38,fontWeight:900,color:phase==='focus'?'#3f6b2f':'#2a5db0',fontVariantNumeric:'tabular-nums'}}>{fmt(seconds)}</div>
      </div>
      <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap'}}>
        <button onClick={()=>setRunning(r=>!r)} style={{...S.btn(running?'#8a887d':'#22c55e'),padding:'10px 22px'}}>{running?'⏸ Pausar':'▶️ Retomar'}</button>
        {method.id==='flowtime'&&phase==='focus'&&<button onClick={endFlowFocus} style={{...S.btn('#38bdf8'),padding:'10px 22px'}}>☕ Ir para pausa</button>}
        <button onClick={reset} style={{...S.btn('#3f1515'),padding:'10px 22px'}}>✕ Encerrar</button>
      </div>
    </div>
  );
}

// ── ABA ESTUDOS ────────────────────────────────────────────────────────────────
function StudyTab({onHome,onOpenProfile,onLogout}){
  return(
    <div style={S.wrap}>
      <div style={S.header}>
        <div style={{fontSize:18,fontWeight:800,color:'#1c1c1a'}}>📚 Estudos</div>
      </div>
      <div style={{paddingBottom:100}}>
        <div style={{padding:'16px 16px 0'}}>
          <div style={{borderRadius:16,overflow:'hidden',border:'1px solid #e4ddd0',height:'65vh',minHeight:460,background:'#ffffff'}}>
            <iframe title="Estudos" src={`/estudos.html?sbUrl=${encodeURIComponent(SUPABASE_URL)}&sbKey=${encodeURIComponent(SUPABASE_ANON_KEY)}`} style={{width:'100%',height:'100%',border:'none'}}/>
          </div>
        </div>
        <FocusTimer/>
      </div>
      <nav style={{...S.nav,justifyContent:'center',alignItems:'center',gap:14,padding:'10px 0',boxShadow:'0 -2px 10px rgba(0,0,0,0.05)'}}>
        <button style={{flex:'0 0 auto',background:'#f2efe4',border:'1px solid #e4ddd0',borderRadius:16,padding:'8px 26px',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:2}} onClick={onHome}><span style={{fontSize:22}}>🏠</span><span style={{fontSize:11,fontWeight:800,color:'#3f6b2f'}}>Início</span></button>
        <button style={{flex:'0 0 auto',background:'#f2efe4',border:'1px solid #e4ddd0',borderRadius:16,padding:'8px 26px',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:2}} onClick={onLogout}><span style={{fontSize:22}}>🚪</span><span style={{fontSize:11,fontWeight:800,color:'#8a887d'}}>Sair</span></button>
      </nav>
    </div>
  );
}

// ── ABA FINANÇAS ────────────────────────────────────────────────────────────────
function FinanceTab({onHome,onOpenProfile,onLogout}){
  return(
    <div style={S.wrap}>
      <div style={{padding:'10px 12px 100px'}}>
        <div style={{borderRadius:16,overflow:'hidden',border:'1px solid #e4ddd0',height:'92vh',minHeight:640,background:'#ffffff'}}>
          <iframe title="Finanças" src={`/controle-financeiro.html?sbUrl=${encodeURIComponent(SUPABASE_URL)}&sbKey=${encodeURIComponent(SUPABASE_ANON_KEY)}`} style={{width:'100%',height:'100%',border:'none'}}/>
        </div>
      </div>
      <nav style={{...S.nav,justifyContent:'center',alignItems:'center',gap:14,padding:'10px 0',boxShadow:'0 -2px 10px rgba(0,0,0,0.05)'}}>
        <button style={{flex:'0 0 auto',background:'#f2efe4',border:'1px solid #e4ddd0',borderRadius:16,padding:'8px 26px',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:2}} onClick={onHome}><span style={{fontSize:22}}>🏠</span><span style={{fontSize:11,fontWeight:800,color:'#3f6b2f'}}>Início</span></button>
        <button style={{flex:'0 0 auto',background:'#f2efe4',border:'1px solid #e4ddd0',borderRadius:16,padding:'8px 26px',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:2}} onClick={onLogout}><span style={{fontSize:22}}>🚪</span><span style={{fontSize:11,fontWeight:800,color:'#8a887d'}}>Sair</span></button>
      </nav>
    </div>
  );
}

// ── ABA HÁBITOS E PERFORMANCE ─────────────────────────────────────────────────
function HabitsTab({onHome,onOpenProfile,onLogout}){
  return(
    <div style={S.wrap}>
      <div style={S.header}>
        <div style={{fontSize:18,fontWeight:800,color:'#1c1c1a'}}>⚡ Hábitos e Performance</div>
      </div>
      <div style={{padding:16,paddingBottom:100}}>
        <div style={{borderRadius:16,overflow:'hidden',border:'1px solid #e4ddd0',height:'82vh',minHeight:600,background:'#ffffff'}}>
          <iframe title="Hábitos e Performance" src={`/my-fit-era.html?sbUrl=${encodeURIComponent(SUPABASE_URL)}&sbKey=${encodeURIComponent(SUPABASE_ANON_KEY)}&hideHeader=1`} style={{width:'100%',height:'100%',border:'none'}}/>
        </div>
      </div>
      <nav style={{...S.nav,justifyContent:'center',alignItems:'center',gap:14,padding:'10px 0',boxShadow:'0 -2px 10px rgba(0,0,0,0.05)'}}>
        <button style={{flex:'0 0 auto',background:'#f2efe4',border:'1px solid #e4ddd0',borderRadius:16,padding:'8px 26px',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:2}} onClick={onHome}><span style={{fontSize:22}}>🏠</span><span style={{fontSize:11,fontWeight:800,color:'#3f6b2f'}}>Início</span></button>
        <button style={{flex:'0 0 auto',background:'#f2efe4',border:'1px solid #e4ddd0',borderRadius:16,padding:'8px 26px',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:2}} onClick={onLogout}><span style={{fontSize:22}}>🚪</span><span style={{fontSize:11,fontWeight:800,color:'#8a887d'}}>Sair</span></button>
      </nav>
    </div>
  );
}

// ── QUADRO DE HORÁRIOS (faculdade) ──────────────────────────────────────────────
function TimetableScreen({onHome,userId}){
  const {data,addRow,removeRow,renameRow,moveRow,setCell}=useTimetable(userId);
  const T=HOME_THEME;

  return(
    <div style={{minHeight:'100vh',background:T.page,padding:'16px 10px 100px'}}>
      <div style={{maxWidth:900,margin:'0 auto',background:T.outerCard,borderRadius:24,padding:18,boxShadow:'0 2px 18px rgba(0,0,0,0.06)'}}>
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
                  <th key={d} style={{padding:'10px 4px',background:T.sage,color:T.ink,borderLeft:'1px solid rgba(255,255,255,0.5)',minWidth:90}}>{FullDayName(d)}</th>
                ))}
                <th style={{background:T.sage,width:90}}></th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r,ri)=>(
                <tr key={r.id} style={{background:ri%2===0?'#eef2e7':'#f5f1e9'}}>
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
                    <button onClick={()=>removeRow(r.id)} style={{background:'none',border:'none',cursor:'pointer',fontSize:14,color:'#c0392b',padding:'0 3px'}} title="Remover linha">✕</button>
                  </td>
                </tr>
              ))}
              {!data.rows.length&&(
                <tr><td colSpan={9} style={{padding:'24px 10px',textAlign:'center',color:T.muted,background:'#f5f1e9'}}>Nenhum horário ainda. Clique em "+ Adicionar linha" para começar a montar sua grade.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <button style={{marginTop:14,background:T.sageDark,border:'none',borderRadius:10,color:'#fff',fontWeight:800,fontSize:13,padding:'10px 18px',cursor:'pointer'}}
          onClick={()=>addRow('')}>
          + Adicionar linha de horário
        </button>

        <div style={{fontSize:11,color:T.muted,marginTop:10,lineHeight:1.6}}>
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
  page:'#efe8dd', card:'#ffffff', outerCard:'#ffffff',
  pillBg:'#efe8dd', sage:'#b9c8ab', sageDark:'#7f9770',
  ink:'#1c1c1a', muted:'#6b6a63', line:'#e4ddd0',
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
    <div style={{flex:1,minWidth:150,background:'#faf7f0',border:`1px solid ${accent}55`,borderRadius:14,padding:12}}>
      <div style={{fontSize:11,fontWeight:800,color:accent,marginBottom:6,textTransform:'uppercase'}}>{label}</div>
      <div style={{position:'relative'}}>
        <input
          value={query}
          onChange={e=>{setQuery(e.target.value);setOpen(true);if(!e.target.value)setSlot(s=>({...s,food:null}));}}
          onFocus={()=>setOpen(true)}
          placeholder="Buscar alimento..."
          style={{width:'100%',border:'1px solid #e4ddd0',borderRadius:8,padding:'7px 10px',fontSize:12,outline:'none',boxSizing:'border-box'}}
        />
        {open&&results.length>0&&(
          <div style={{position:'absolute',top:'100%',left:0,right:0,background:'#ffffff',border:'1px solid #e4ddd0',borderRadius:8,marginTop:2,zIndex:20,maxHeight:180,overflowY:'auto',boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}}>
            {results.map(r=>(
              <div key={r.id} onClick={()=>pick(r)} style={{padding:'8px 10px',fontSize:12,cursor:'pointer',borderBottom:'1px solid #f0ece2'}}>
                {r.n}
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{display:'flex',gap:6,marginTop:8}}>
        <div style={{flex:1}}>
          <div style={{fontSize:9,color:'#8a887d',fontWeight:700,marginBottom:2}}>QUANTIDADE (g)</div>
          <div style={{display:'flex',gap:4}}>
            <input type="number" value={slot.qty} onChange={e=>setSlot(s=>({...s,qty:parseFloat(e.target.value)||0}))}
              style={{width:'100%',border:'1px solid #e4ddd0',borderRadius:8,padding:'6px 8px',fontSize:12,outline:'none',boxSizing:'border-box'}}/>
            <button onClick={()=>setSlot(s=>({...s,qty:1000}))} style={{fontSize:9,fontWeight:800,color:accent,background:'none',border:`1px solid ${accent}55`,borderRadius:8,padding:'0 6px',cursor:'pointer',whiteSpace:'nowrap'}}>1kg</button>
          </div>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:9,color:'#8a887d',fontWeight:700,marginBottom:2}}>PREÇO (R$)</div>
          <input type="number" step="0.01" value={slot.price} onChange={e=>setSlot(s=>({...s,price:e.target.value}))}
            placeholder="0,00" style={{width:'100%',border:'1px solid #e4ddd0',borderRadius:8,padding:'6px 8px',fontSize:12,outline:'none',boxSizing:'border-box'}}/>
        </div>
      </div>
    </div>
  );
}

function computeFoodMetrics(slot){
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
  {id:'protein',label:'🥩 Mais proteína por R$',key:'proteinPerReal',fmt:v=>`${v.toFixed(1)}g/R$`},
  {id:'price',label:'💰 Mais barato por kg',key:'pricePerKg',fmt:v=>`R$${v.toFixed(2)}/kg`,lowerIsBetter:true},
  {id:'kcal',label:'🔥 Mais calorias por R$',key:'kcalPerReal',fmt:v=>`${v.toFixed(0)}kcal/R$`},
];

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
    <div style={{background:'#ffffff',border:'1px solid #e4ddd0',borderRadius:20,padding:16,marginBottom:16,boxShadow:'0 2px 12px rgba(0,0,0,0.05)'}}>
      <div style={{fontSize:15,fontWeight:800,color:'#1c1c1a',marginBottom:2}}>⚖️ Comparador de Alimentos</div>
      <div style={{fontSize:11,color:'#6b6a63',marginBottom:12}}>Qual alimento vale mais a pena levar pra casa?</div>

      <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
        {COMPARATOR_PRIORITIES.map(pr=>(
          <button key={pr.id} onClick={()=>setPriority(pr.id)}
            style={{fontSize:10,fontWeight:800,padding:'6px 10px',borderRadius:20,cursor:'pointer',
              background:priority===pr.id?'#7f9770':'#faf7f0',color:priority===pr.id?'#ffffff':'#6b6a63',
              border:`1px solid ${priority===pr.id?'#7f9770':'#e4ddd0'}`}}>
            {pr.label}
          </button>
        ))}
      </div>

      <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
        <FoodSlot label="Alimento A" slot={slotA} setSlot={setSlotA} accent="#38bdf8"/>
        <FoodSlot label="Alimento B" slot={slotB} setSlot={setSlotB} accent="#f59e0b"/>
      </div>

      {mA&&mB&&(
        <div style={{marginTop:14,background:winner?'#eef2e7':'#faf7f0',border:`1px solid ${winner?'#7f9770':'#e4ddd0'}`,borderRadius:14,padding:'12px 14px'}}>
          {winner?(
            <div style={{fontSize:13,fontWeight:800,color:'#3f6b2f',marginBottom:8}}>
              🏆 {winner==='A'?slotA.food.n:slotB.food.n} vale mais a pena ({p.label.replace(/^\S+\s/,'')})
            </div>
          ):(
            <div style={{fontSize:13,fontWeight:800,color:'#6b6a63',marginBottom:8}}>Empate nesse critério</div>
          )}
          <div style={{display:'flex',gap:10}}>
            {[['A',slotA,mA,'#38bdf8'],['B',slotB,mB,'#f59e0b']].map(([key,slot,m,accent])=>(
              <div key={key} style={{flex:1,fontSize:11,color:'#1c1c1a',lineHeight:1.7,
                border:winner===key?`2px solid ${accent}`:'1px solid transparent',borderRadius:10,padding:'6px 8px'}}>
                <div style={{fontWeight:800,color:accent,marginBottom:2}}>{slot.food.n}</div>
                <div>💪 Proteína: {m.proteinPerReal.toFixed(1)}g / R$</div>
                <div>🔥 Calorias: {m.kcalPerReal.toFixed(0)}kcal / R$</div>
                <div>💰 Preço/kg: R${m.pricePerKg.toFixed(2)}</div>
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
  const [saldoVisible,setSaldoVisible]=useState(false);

  const [workoutLog,setWorkoutLog]=useState({});
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
      }).catch(()=>{});
  },[userId]);

  // Registra na fila central (mesma fila usada por água/agenda/horários/plano
  // — nunca mais uma escrita independente correndo com as outras)
  const workoutLogRef=useRef(workoutLog);
  workoutLogRef.current=workoutLog;
  useEffect(()=>{
    if(!userId) return;
    return registerPlanDataField('workoutLog',()=>workoutLogRef.current);
  },[userId]);

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
  const timeStr=now.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  const agendaItems=gcal.connected?gcal.events:manual.items;
  const T=HOME_THEME;

  // pílula (badge sage) usada no topo dos 4 balões e no cabeçalho da agenda
  const pill=(txt,extra={})=>(
    <div style={{display:'inline-flex',alignItems:'center',gap:6,background:T.sage,color:T.ink,fontWeight:800,fontSize:12,padding:'6px 14px',borderRadius:20,...extra}}>{txt}</div>
  );

  const balloonWrap={background:T.card,border:`1px solid ${T.line}`,borderRadius:18,overflow:'hidden',cursor:'pointer',textAlign:'left',display:'flex',flexDirection:'column',width:'100%',height:'100%',padding:0,margin:0,font:'inherit',boxSizing:'border-box'};

  // ── meta de água personalizável
  const water=useWaterTracker(userId);
  const [editingGoal,setEditingGoal]=useState(false);
  const [goalInput,setGoalInput]=useState('');

  // ── emojis animados ao lado do logo
  const [emojiOrder,setEmojiOrder]=useState(['🧠','💪','📕','💵','⚡']);
  useEffect(()=>{
    const t=setInterval(()=>{
      setEmojiOrder(prev=>{
        const arr=[...prev];
        arr.push(arr.shift());
        return arr;
      });
    },500);
    return ()=>clearInterval(t);
  },[]);

  return(
    <div style={{minHeight:'100vh',background:T.page,fontFamily:'system-ui,sans-serif',padding:'20px 12px 100px'}}>
      <div style={{maxWidth:720,margin:'0 auto',background:T.outerCard,borderRadius:28,padding:'26px 18px',boxShadow:'0 2px 18px rgba(0,0,0,0.06)'}}>

        {/* Logo + emojis animados */}
        <div style={{display:'flex',justifyContent:'center',alignItems:'center',position:'relative',marginBottom:18,gap:10,flexWrap:'wrap'}}>
          <div style={{fontFamily:"'Caveat',cursive",fontWeight:700,fontSize:44,color:T.ink,letterSpacing:1}}>LifePlan</div>
          <div style={{display:'flex',gap:4,fontSize:18}}>
            {emojiOrder.map((e,i)=>(<span key={e} style={{transition:'transform .3s'}}>{e}</span>))}
          </div>
        </div>

        {/* Clima dinâmico — pílula com gradiente que muda conforme a condição do tempo */}
        <div style={{
          background:weather.loading||weather.error?T.pillBg:weatherGradient(weather.code,weather.isDay),
          borderRadius:32,padding:'18px 20px',marginBottom:8,transition:'background 1s ease',
          boxShadow:weather.loading||weather.error?'none':'0 6px 20px rgba(0,0,0,0.15)'
        }}>
          {weather.loading?(
            <div style={{fontSize:13,color:T.muted,textAlign:'center'}}>Buscando clima...</div>
          ):weather.error?(
            <div style={{fontSize:12,color:'#7a2020',textAlign:'center'}}>{weather.error}</div>
          ):(
            <>
              <div style={{display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}>
                <WeatherIcon code={weather.code} isDay={weather.isDay} iconUri={weather.iconUri} size={68}/>
                <div style={{flex:'1 1 120px'}}>
                  <div style={{fontSize:36,fontWeight:900,color:'#ffffff',lineHeight:1,textShadow:'0 2px 6px rgba(0,0,0,0.15)'}}>{weather.temp}°</div>
                  <div style={{fontSize:16,fontWeight:800,color:'rgba(255,255,255,0.95)',display:'flex',alignItems:'center',gap:4,marginTop:2}}>📍 {weather.city}</div>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:4,fontSize:13,fontWeight:700,color:'rgba(255,255,255,0.9)'}}>
                  {weather.sunrise&&<span>🌅 {weather.sunrise}</span>}
                  {weather.sunset&&<span>🌇 {weather.sunset}</span>}
                </div>
              </div>

              <div style={{display:'flex',flexDirection:'column',gap:6,marginTop:12}}>
                {weather.tempTrend&&(
                  <div style={{fontSize:12,fontWeight:700,color:'#1c1c1a',background:'rgba(255,255,255,0.85)',borderRadius:12,padding:'6px 12px'}}>
                    {weather.tempTrend.rising?'📈':'📉'} A temperatura deve {weather.tempTrend.rising?'subir':'cair'} {Math.abs(weather.tempTrend.delta)}° nas próximas 2h
                  </div>
                )}
                {weather.rain&&(
                  <div style={{fontSize:12,fontWeight:700,color:'#1c1c1a',background:'rgba(255,255,255,0.85)',borderRadius:12,padding:'6px 12px'}}>
                    ☔ {weather.rain.active?`Chovendo agora — leve um guarda-chuva! Previsão de parar às ${weather.rain.stops}`:`Vai chover às ${weather.rain.starts} — não esqueça o guarda-chuva! Deve parar por volta das ${weather.rain.stops}`}
                  </div>
                )}
                {uvInfo(weather.uvMax)&&weather.uvMax>=6&&(
                  <div style={{fontSize:12,fontWeight:700,color:'#1c1c1a',background:'rgba(255,255,255,0.85)',borderRadius:12,padding:'6px 12px'}}>
                    🧴 UV {uvInfo(weather.uvMax).label.toLowerCase()} hoje (máx. {weather.uvMax}) — não esqueça o protetor solar!
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Linha: Água+Compras (coluna) · Horário · Compromissos da agenda */}
        <div style={{display:'flex',gap:8,marginBottom:16,alignItems:'stretch',flexWrap:'wrap'}}>

          {/* Coluna esquerda: meta de água personalizável + balão "Lista de Compras" logo abaixo */}
          <div style={{flex:'1 1 150px',display:'flex',flexDirection:'column',gap:8}}>
            <div style={{background:T.sage,borderRadius:14,padding:'8px 10px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                <span style={{fontSize:11,fontWeight:800,color:T.ink}}>💧 Água</span>
                {editingGoal?(
                  <input type="number" value={goalInput} autoFocus
                    onChange={e=>setGoalInput(e.target.value)}
                    onBlur={()=>{const g=parseInt(goalInput,10);water.setGoal(g>0?g:water.data.goal);setEditingGoal(false);}}
                    onKeyDown={e=>{if(e.key==='Enter')e.target.blur();}}
                    style={{width:52,fontSize:10,border:'none',borderRadius:6,padding:'1px 4px',outline:'none'}}/>
                ):(
                  <button onClick={()=>{setGoalInput(String(water.data.goal));setEditingGoal(true);}} style={{background:'none',border:'none',fontSize:13,color:T.ink,cursor:'pointer'}}>✏️</button>
                )}
              </div>
              <div style={{textAlign:'center',fontSize:14,fontWeight:900,color:T.ink,marginBottom:6}}>{water.data.current}/{water.data.goal}ml</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}>
                {[100,200,500,1000].map(v=>(
                  <button key={v} onClick={()=>water.add(v)} style={{background:'#ffffff',border:'none',borderRadius:8,fontSize:10,fontWeight:800,color:T.ink,padding:'4px 0',cursor:'pointer'}}>+{v}</button>
                ))}
              </div>
            </div>
            <button onClick={()=>onNavigate('shopping')} style={{background:T.sage,border:'none',borderRadius:14,padding:'8px 10px',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',width:'100%',boxSizing:'border-box'}}>
              <span style={{fontSize:12,color:T.ink,fontWeight:800}}>🛒 Lista de Compras{shoppingCount!==null?` (${shoppingCount})`:''}</span>
            </button>
          </div>

          {/* Horário */}
          <div style={{flex:'0 0 auto',minWidth:110,background:'linear-gradient(160deg,#eef2e7 0%,#dfe8d4 100%)',border:'1px solid #cddabd',borderRadius:18,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',padding:'16px 20px',boxShadow:'0 3px 10px rgba(127,151,112,0.15)'}}>
            <div style={{fontSize:16,marginBottom:4}}>🕐</div>
            <div style={{fontSize:44,fontWeight:900,color:T.ink,letterSpacing:.5,lineHeight:1,textAlign:'center'}}>{timeStr}</div>
          </div>

          {/* Compromissos da agenda */}
          <div style={{flex:'1 1 220px',background:T.pillBg,borderRadius:16,padding:'12px 16px'}}>
            <div style={{display:'flex',justifyContent:'center',marginBottom:8}}>
              <div style={{background:'linear-gradient(135deg,#8faf7a 0%,#7f9770 100%)',color:'#ffffff',fontSize:11,fontWeight:800,padding:'6px 14px',borderRadius:20,boxShadow:'0 2px 6px rgba(127,151,112,0.35)',display:'flex',alignItems:'center',gap:5}}>
                📅 COMPROMISSOS DA AGENDA
              </div>
            </div>
            {!gcal.connected&&(
              <div style={{textAlign:'center',marginBottom:6}}>
                <button style={{background:T.sage,border:'none',borderRadius:10,color:T.ink,fontSize:11,fontWeight:800,padding:'4px 10px',cursor:'pointer'}} onClick={gcal.connect}>
                  {gcal.status==='no-key'?'Configurar Google':'🔗 Conectar Google'}
                </button>
              </div>
            )}
            {agendaItems.length===0&&<div style={{fontSize:11,color:T.muted,textAlign:'center'}}>Nenhum compromisso nos próximos 7 dias.</div>}
            {agendaItems.slice(0,5).map(it=>(
              <div key={it.id} style={{display:'flex',justifyContent:'space-between',fontSize:12,color:T.ink,padding:'2px 0'}}>
                <span>{it.title}</span><span style={{color:T.muted}}>{it.time}</span>
              </div>
            ))}
            {!gcal.connected&&(
              <div style={{display:'flex',gap:4,marginTop:6}}>
                <input style={{flex:1,border:`1px solid ${T.line}`,borderRadius:8,fontSize:11,padding:'5px 8px',outline:'none'}} placeholder="Novo compromisso" value={newTitle} onChange={e=>setNewTitle(e.target.value)}/>
                <input style={{width:70,border:`1px solid ${T.line}`,borderRadius:8,fontSize:11,padding:'5px 6px',outline:'none'}} type="time" value={newTime} onChange={e=>setNewTime(e.target.value)}/>
                <button style={{background:T.sageDark,border:'none',borderRadius:8,color:'#fff',fontSize:12,fontWeight:800,padding:'4px 10px',cursor:'pointer'}} onClick={()=>{if(!newTitle.trim())return;manual.add(newTitle.trim(),newTime||'--:--');setNewTitle('');setNewTime('');}}>+</button>
              </div>
            )}
          </div>
        </div>

        {/* Balões — lado a lado, mesma largura e altura */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(100px,1fr))',gap:8,marginBottom:20,alignItems:'stretch'}}>
          <button onClick={()=>onNavigate('nutrition')} style={balloonWrap}>
            {pill('🧠 NUTRIÇÃO',{borderRadius:'18px 18px 0 0',justifyContent:'center',width:'100%',fontSize:11,padding:'8px 4px',boxSizing:'border-box'})}
            <div style={{padding:'12px 8px',fontSize:11,fontWeight:800,color:T.ink,textAlign:'center',flex:1,display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1.4}}>
              {planPreview?.nextMeal?`${planPreview.nextMeal.name} · ${planPreview.nextMeal.time}${planPreview.nextMeal.when==='amanhã'?' (amanhã)':''}`:'—'}
            </div>
          </button>
          <button onClick={()=>onNavigate('treinos')} style={balloonWrap}>
            {pill('💪 TREINO',{borderRadius:'18px 18px 0 0',justifyContent:'center',width:'100%',fontSize:11,padding:'8px 4px',boxSizing:'border-box'})}
            <div style={{padding:'10px 8px 8px',fontSize:11,fontWeight:800,color:T.ink,textAlign:'center',flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:6,lineHeight:1.4}}>
              <span>{planPreview?.typeLabel||'—'}</span>
              <span onClick={e=>{e.stopPropagation();toggleWorkoutDone();}}
                style={{fontSize:10,fontWeight:800,padding:'4px 8px',borderRadius:10,cursor:'pointer',
                  background:workoutDoneToday?'#7f9770':'#ffffff',color:workoutDoneToday?'#ffffff':'#6b6a63',
                  border:`1px solid ${workoutDoneToday?'#7f9770':'#e4ddd0'}`}}>
                {workoutDoneToday?'✅ Feito':'☐ Feito'}
              </span>
            </div>
          </button>
          <button onClick={()=>onNavigate('estudos')} style={balloonWrap}>
            {pill('📖 ESTUDOS',{borderRadius:'18px 18px 0 0',justifyContent:'center',width:'100%',fontSize:11,padding:'8px 4px',boxSizing:'border-box'})}
            <div style={{padding:'12px 8px',fontSize:11,fontWeight:800,color:T.ink,textAlign:'center',flex:1,display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1.4}}>
              {nextClass?`${nextClass.subject} ${nextClass.isToday?'hoje':nextClass.day} ${nextClass.time}`:'Sem aula cadastrada'}<br/>
              {nextExam?`Prova: ${nextExam.date}`:'Sem prova próxima'}
            </div>
          </button>
          <button onClick={()=>onNavigate('financas')} style={balloonWrap}>
            {pill('💵 FINANÇAS',{borderRadius:'18px 18px 0 0',justifyContent:'center',width:'100%',fontSize:11,padding:'8px 4px',boxSizing:'border-box'})}
            <div style={{padding:'12px 8px',fontSize:11,fontWeight:800,color:T.ink,textAlign:'center',flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,lineHeight:1.4}}>
              <span>{saldo!==null?(saldoVisible?`R$ ${saldo.toFixed(2)}`:'••••••'):'—'}</span>
              {saldo!==null&&(
                <span onClick={e=>{e.stopPropagation();setSaldoVisible(v=>!v);}} style={{cursor:'pointer',fontSize:13}}>{saldoVisible?'👁️':'🙈'}</span>
              )}
            </div>
          </button>
          <button onClick={()=>onNavigate('habitos')} style={balloonWrap}>
            {pill('⚡ HÁBITOS',{borderRadius:'18px 18px 0 0',justifyContent:'center',width:'100%',fontSize:11,padding:'8px 4px',boxSizing:'border-box'})}
            <div style={{padding:'12px 8px',fontSize:11,fontWeight:800,color:T.ink,textAlign:'center',flex:1,display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1.4}}>
              Corpo · Dashboard · Insights
            </div>
          </button>
        </div>

        <FoodComparator/>

        {/* Grade de horários */}
        <div style={{border:`1px solid ${T.line}`,borderRadius:14,overflow:'hidden'}}>
          <div style={{background:T.sage,padding:'10px 14px',display:'flex',justifyContent:'flex-end',alignItems:'center',position:'relative'}}>
            <div style={{position:'absolute',left:0,right:0,textAlign:'center',fontWeight:900,fontSize:13,color:T.ink,letterSpacing:.5,pointerEvents:'none'}}>GRADE DE HORÁRIOS</div>
            <button style={{background:'rgba(255,255,255,0.5)',border:'none',borderRadius:8,fontSize:11,fontWeight:800,color:T.ink,padding:'4px 10px',cursor:'pointer',position:'relative',zIndex:1}} onClick={onOpenTimetable}>✏️ Editar</button>
          </div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,tableLayout:'fixed'}}>
              <thead>
                <tr>
                  <th style={{width:'16%',padding:'8px 6px',borderBottom:`1px solid ${T.line}`,textAlign:'left',color:T.ink,background:T.card}}></th>
                  {WEEK_DAYS.map(d=>(
                    <th key={d} style={{width:`${84/7}%`,padding:'8px 4px',borderBottom:`1px solid ${T.line}`,borderLeft:`1px solid ${T.line}`,color:T.ink,fontWeight:800,background:T.card,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{FullDayName(d)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timetableData.rows.length===0&&(
                  <tr><td colSpan={8} style={{padding:'18px 10px',textAlign:'center',color:T.muted,background:'#f5f1e9'}}>Nenhum horário cadastrado ainda — clique em "✏️ Editar" para montar sua grade.</td></tr>
                )}
                {timetableData.rows.map((r,ri)=>(
                  <tr key={r.id} style={{background:ri%2===0?'#eef2e7':'#f5f1e9'}}>
                    <td style={{padding:'6px 6px',fontWeight:800,color:T.ink,borderTop:`1px solid ${T.line}`,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{r.label}</td>
                    {WEEK_DAYS.map(d=>(
                      <td key={d} style={{padding:'6px 4px',borderTop:`1px solid ${T.line}`,borderLeft:`1px solid ${T.line}`,color:T.ink,textAlign:'center',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                        {timetableData.cells[`${r.id}-${d}`]||''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Rodapé de navegação (tema claro, só desta tela) */}
      <div style={{position:'fixed',bottom:0,left:0,right:0,background:'#ffffff',borderTop:`1px solid ${T.line}`,display:'flex',zIndex:100}}>
        <button style={{flex:1,background:'none',border:'none',padding:'12px 0 10px',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:3,color:T.sageDark}} onClick={()=>onNavigate('home')}>
          <span style={{fontSize:20}}>🏠</span><span style={{fontSize:10,fontWeight:700}}>Início</span>
        </button>
        <button style={{flex:1,background:'none',border:'none',padding:'12px 0 10px',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:3,color:T.muted}} onClick={onOpenProfile}>
          <span style={{fontSize:20}}>👤</span><span style={{fontSize:10,fontWeight:700}}>Perfil</span>
        </button>
        <button style={{flex:1,background:'none',border:'none',padding:'12px 0 10px',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:3,color:T.muted}} onClick={onLogout}>
          <span style={{fontSize:20}}>🚪</span><span style={{fontSize:10,fontWeight:700}}>Sair</span>
        </button>
      </div>
    </div>
  );
}

// Telas que fazem sentido "retomar" depois de um F5 — nunca restauramos para
// estados transitórios como loading/login/register/profile.
const RESUMABLE_SCREENS=['home','nutrition','shopping','treinos','estudos','financas','habitos','timetable'];

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function App(){
  const [screen,setScreen]=useState('loading');
  const [userId,setUserId]=useState(null);
  const [profile,setProfile]=useState(null);
  const userIdRef=useRef(null);

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
      else setScreen('login');
    });
    // Importante: este listener dispara em qualquer evento do Supabase
    // (ex: renovação automática de token), inclusive os que vêm do
    // my-fit-era.html (mesmo projeto Supabase, embutido em iframe na aba
    // Treinos). Por isso só trocamos de tela em transições reais de
    // login/logout — nunca em cada evento — senão a aba Treinos "voltava
    // sozinha" para a Início.
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_,session)=>{
      if(session?.user){
        const isNewLogin=userIdRef.current!==session.user.id;
        userIdRef.current=session.user.id;
        setUserId(session.user.id);
        if(isNewLogin) setScreen('home');
      }else{
        userIdRef.current=null;
        setUserId(null);
        setScreen('login');
        sessionStorage.removeItem('lifeplan_screen');
      }
    });
    return()=>subscription.unsubscribe();
  },[]);

  if(screen==='loading') return(
    <div style={{minHeight:'100vh',background:'#efe8dd',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center'}}><div style={{fontSize:48,marginBottom:12}}>💪</div><div style={{color:'#8a887d'}}>Carregando...</div></div>
    </div>
  );

  const onLogout=async()=>{await signOut();setScreen('login');};
  const onOpenProfile=()=>setScreen('profile');

  if(screen==='profile') return(
    <ProfilePage userId={userId} initialProfile={profile}
      onSave={(newPlan,newProfile)=>{setProfile(newProfile);setScreen('home');}}
      onBack={()=>setScreen('home')}/>
  );
  if(screen==='home') return(
    <HomeDashboard userId={userId} onNavigate={setScreen} onOpenProfile={onOpenProfile} onLogout={onLogout} onOpenTimetable={()=>setScreen('timetable')}/>
  );
  if(screen==='timetable') return <TimetableScreen onHome={()=>setScreen('home')} userId={userId}/>;
  if(screen==='nutrition') return(
    <MealPlanApp userId={userId} initialTab="plan" onHome={()=>setScreen('home')} onLogout={onLogout} onOpenProfile={onOpenProfile}/>
  );
  if(screen==='shopping') return(
    <MealPlanApp userId={userId} initialTab="shop" onHome={()=>setScreen('home')} onLogout={onLogout} onOpenProfile={onOpenProfile}/>
  );
  if(screen==='treinos') return(
    <MealPlanApp userId={userId} initialTab="workout" onHome={()=>setScreen('home')} onLogout={onLogout} onOpenProfile={onOpenProfile}/>
  );
  if(screen==='estudos') return <StudyTab onHome={()=>setScreen('home')} onLogout={onLogout} onOpenProfile={onOpenProfile}/>;
  if(screen==='financas') return <FinanceTab onHome={()=>setScreen('home')} onLogout={onLogout} onOpenProfile={onOpenProfile}/>;
  if(screen==='habitos') return <HabitsTab onHome={()=>setScreen('home')} onLogout={onLogout} onOpenProfile={onOpenProfile}/>;
  if(screen==='register') return <RegisterPage onSwitch={()=>setScreen('login')} onLogin={()=>setScreen('home')}/>;
  return <LoginPage onSwitch={()=>setScreen('register')} onLogin={()=>setScreen('home')}/>;
}
