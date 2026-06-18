import { useState, useRef } from "react";

const API = "https://api.anthropic.com/v1/messages";
async function callAPI(sys, messages) {
  const r = await fetch(API, { method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({ model:"claude-sonnet-4-6", max_tokens:1000, system:sys, messages }) });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return d.content[0].text.replace(/```json|```/g,"").trim();
}
const callClaude = (sys,usr) => callAPI(sys,[{role:"user",content:usr}]);

const C = {
  bg:"#07070f", card:"#0c0c1a", border:"#1c1c30",
  text:"#e2e8f0", muted:"#4a5568", accent:"#818cf8",
  cal:"#34d399", prot:"#60a5fa", carb:"#fbbf24",
  fat:"#f472b6", fiber:"#6ee7b7", red:"#f87171",
  grad:"linear-gradient(135deg,#6366f1,#8b5cf6)",
};

const toM  = (ft,ins) => ((+ft*12)+(+ins))*0.0254;
const toKg = lbs => +lbs*0.453592;
function calcBMI(lbs,ft,ins){ const h=toM(ft,ins); return +(toKg(lbs)/(h*h)).toFixed(1); }
function bmiInfo(bmi){
  if(bmi<18.5) return{label:"Underweight",color:"#60a5fa",advice:"A slight surplus helps reach a healthy range."};
  if(bmi<25)   return{label:"Normal weight",color:"#34d399",advice:"You're in a healthy range — great starting point!"};
  if(bmi<30)   return{label:"Overweight",color:"#fbbf24",advice:"A moderate deficit moves you toward a healthy range."};
  return         {label:"Obese",color:"#f87171",advice:"A structured deficit + increased activity are recommended."};
}
function calcBMR(lbs,ft,ins,age,sex){
  const hcm=toM(ft,ins)*100, wkg=toKg(lbs), a=+age;
  return sex==="male"?10*wkg+6.25*hcm-5*a+5:10*wkg+6.25*hcm-5*a-161;
}
const ACT_M={sedentary:1.2,light:1.375,moderate:1.55,active:1.725,very:1.9};
function calcTargets(f){
  const bmr=calcBMR(f.weight,f.hFt,f.hIn,f.age,f.sex);
  const tdee=Math.round(bmr*(ACT_M[f.activity]||1.2));
  let cal=f.goal==="lose_weight"?tdee-500:f.goal==="perform"?tdee+300:tdee;
  cal=Math.max(Math.round(cal),1200);
  const[pr,cr,fr]=f.goal==="lose_weight"?[0.40,0.30,0.30]:f.goal==="perform"?[0.25,0.50,0.25]:[0.30,0.40,0.30];
  return{bmr:Math.round(bmr),tdee,calT:cal,protT:Math.round(cal*pr/4),carbT:Math.round(cal*cr/4),fatT:Math.round(cal*fr/9),fibT:28};
}
function idealWeightRange(ft,ins){
  const hm=toM(ft,ins);
  return[Math.round(18.5*hm*hm/0.453592),Math.round(24.9*hm*hm/0.453592)];
}

function Ring({val,max,size=152,sw=11,color=C.cal}){
  const r=(size-sw)/2,circ=2*Math.PI*r,pct=Math.min(Math.max(val/max,0),1);
  return(
    <svg width={size} height={size} style={{transform:"rotate(-90deg)",display:"block"}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1c1c30" strokeWidth={sw}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={`${pct*circ} ${circ}`} strokeLinecap="round"
        style={{filter:`drop-shadow(0 0 8px ${color}80)`,transition:"stroke-dasharray 0.5s"}}/>
    </svg>
  );
}
function Bar({label,val,max,color,unit="g"}){
  const over=val>max;
  return(
    <div style={{marginBottom:11}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
        <span style={{fontSize:13,color:C.muted}}>{label}</span>
        <span style={{fontSize:13,fontWeight:600}}>
          <span style={{color:over?C.red:C.text}}>{Math.round(val)}</span>
          <span style={{color:C.muted}}>/{max}{unit}</span>
        </span>
      </div>
      <div style={{height:5,background:"#1c1c30",borderRadius:3}}>
        <div style={{width:`${Math.min((val/max)*100,100)}%`,height:"100%",background:over?C.red:color,
          borderRadius:3,boxShadow:`0 0 6px ${over?C.red:color}60`,transition:"width 0.5s"}}/>
      </div>
    </div>
  );
}
function BMIGauge({bmi}){
  const pct=Math.min(Math.max((bmi-10)/30,0),1)*100;
  const cat=bmiInfo(bmi);
  return(
    <div>
      <div style={{position:"relative",marginBottom:12}}>
        <div style={{height:16,borderRadius:8,overflow:"hidden",
          background:"linear-gradient(to right,#3b82f6 0%,#3b82f6 28.3%,#34d399 28.3%,#34d399 50%,#fbbf24 50%,#fbbf24 66.7%,#f87171 66.7%)"}}/>
        <div style={{position:"absolute",left:`${pct}%`,top:"50%",transform:"translate(-50%,-50%)",
          width:22,height:22,borderRadius:"50%",background:C.bg,border:`3px solid ${cat.color}`,
          boxShadow:`0 0 12px ${cat.color}90`,transition:"left 0.4s"}}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"28.3% 21.7% 16.7% 33.3%",marginTop:4}}>
        {["Underweight","Normal","Overweight","Obese"].map(l=><div key={l} style={{textAlign:"center",fontSize:9,color:C.muted}}>{l}</div>)}
      </div>
    </div>
  );
}

// ── Persisted auth helpers ───────────────────────────────────────────────────
const STORAGE_KEY = "caloflux_user_v1";
function loadSaved() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch { return null; }
}
function saveToDisk(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}
function clearDisk() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

const INIT_LOGS=[
  {id:1,name:"Greek Yogurt + Berries",meal:"Breakfast",calories:220,protein:18,carbs:28,fat:4,fiber:3,sugar:18,sodium:80,time:"7:30 AM",confidence:92},
  {id:2,name:"Grilled Chicken Salad",meal:"Lunch",calories:420,protein:40,carbs:18,fat:16,fiber:5,sugar:4,sodium:480,time:"12:15 PM",confidence:96},
];

export default function CaloFlux(){
  const saved = loadSaved();

  const [phase,setPhase]=useState(saved ? "app" : "onboard");
  const [step,setStep]=useState(0);
  const [form,setForm]=useState({name:"",email:"",password:"",age:"30",sex:"male",hFt:"5",hIn:"8",weight:"160",goal:"",activity:"",budget:"moderate"});
  const [overrideTargets,setOverrideTargets]=useState(null);
  const [profile,setProfile]=useState(saved?.profile || {name:"",goal:"lose_weight",calT:1800,protT:150,carbT:180,fatT:55,fibT:28,budget:"moderate"});
  const [tab,setTab]=useState("dash");
  const [logs,setLogs]=useState(saved?.logs || INIT_LOGS);
  const [food,setFood]=useState("");
  const [photo,setPhoto]=useState(null);
  const [pending,setPending]=useState(null);
  const [parsing,setParsing]=useState(false);
  const [parseErr,setParseErr]=useState("");
  const [sugs,setSugs]=useState([]);
  const [suggesting,setSuggesting]=useState(false);
  const fileRef=useRef(null);

  const up=(k,v)=>setForm(p=>({...p,[k]:v}));
  const bmi=(+form.weight>0)?calcBMI(form.weight,form.hFt,form.hIn):null;
  const bmiCat=bmi?bmiInfo(bmi):null;
  const computed=(form.goal&&form.activity)?calcTargets(form):null;
  const targets=overrideTargets||computed;
  const valid=[true,
    form.name.trim().length>1&&form.email.includes("@")&&form.email.includes("."),
    +form.age>10&&+form.age<110&&+form.weight>50,!!form.goal,!!form.activity,true,true];

  const tot=logs.reduce((a,l)=>({cal:a.cal+l.calories,prot:a.prot+l.protein,carb:a.carb+l.carbs,fat:a.fat+l.fat,fib:a.fib+l.fiber}),{cal:0,prot:0,carb:0,fat:0,fib:0});
  const rem={cal:profile.calT-tot.cal,prot:profile.protT-tot.prot,carb:profile.carbT-tot.carb,fat:profile.fatT-tot.fat,fib:profile.fibT-tot.fib};
  const mk=(ex={})=>({background:C.card,border:`1px solid ${C.border}`,borderRadius:18,padding:20,...ex});
  const MEAL_ICON={Breakfast:"🌅",Lunch:"☀️",Dinner:"🌙",Snack:"🍎"};
  const RANK_COL=[C.cal,C.accent,C.prot];
  const greet=new Date().getHours()<12?"morning":new Date().getHours()<17?"afternoon":"evening";
  const todayStr=new Date().toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"});

  // persist logs whenever they change
  function updateLogs(newLogs) {
    setLogs(newLogs);
    saveToDisk({ profile, logs: newLogs });
  }

  function handlePhotoChange(e){
    const file=e.target.files[0]; if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>{
      const dataUrl=ev.target.result;
      setPhoto({preview:dataUrl,data:dataUrl.split(",")[1],type:file.type||"image/jpeg",name:file.name});
    };
    reader.readAsDataURL(file);
    e.target.value="";
  }

  async function parseFood(){
    if((!food.trim()&&!photo)||parsing)return;
    setParsing(true);setParseErr("");
    const sys=`Nutrition expert. Return ONLY valid JSON no markdown:
{"name":string,"meal":"Breakfast"|"Lunch"|"Dinner"|"Snack","calories":number,"protein":number,"carbs":number,"fat":number,"fiber":number,"sugar":number,"sodium":number,"confidence":number}
Macros grams, sodium mg, confidence 0-100.`;
    try{
      let messages;
      if(photo){
        messages=[{role:"user",content:[
          {type:"image",source:{type:"base64",media_type:photo.type,data:photo.data}},
          {type:"text",text:food.trim()?`Analyze this food photo. Context: ${food}. Return nutrition JSON.`:"Analyze this food photo and return nutrition JSON."}
        ]}];
      } else { messages=[{role:"user",content:food}]; }
      setPending(JSON.parse(await callAPI(sys,messages)));
    } catch{setParseErr("Couldn't analyze. Try again.");}
    setParsing(false);
  }

  function confirmAdd(){
    const t=new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
    const newLogs=[...logs,{...pending,id:Date.now(),time:t}];
    updateLogs(newLogs);
    setPending(null);setFood("");setPhoto(null);setTab("dash");
  }

  async function getSuggestions(){
    setSugs([]);setSuggesting(true);
    const h=new Date().getHours(),tod=h<10?"morning":h<14?"midday":h<18?"afternoon":"evening";
    const sys=`Nutrition coach. Return ONLY JSON array no markdown:
[{"name":string,"description":string,"calories":number,"protein":number,"carbs":number,"fat":number,"reason":string,"servingNote":string,"prepTime":string}]`;
    const msg=`Remaining: ${rem.cal}kcal, ${rem.prot}g protein, ${rem.carb}g carbs, ${rem.fat}g fat. Time: ${tod}. Goal: ${profile.goal}. Budget: ${profile.budget}.`;
    try{setSugs(JSON.parse(await callClaude(sys,msg)));}catch{setSugs([]);}
    setSuggesting(false);
  }

  function finishOnboarding(){
    const t=overrideTargets||computed;
    const newProfile={name:form.name.split(" ")[0],goal:form.goal,calT:t.calT,protT:t.protT,carbT:t.carbT,fatT:t.fatT,fibT:t.fibT,budget:form.budget};
    setProfile(newProfile);
    saveToDisk({ profile: newProfile, logs: INIT_LOGS });
    setPhase("app");
  }

  function handleSignOut(){
    clearDisk();
    setPhase("onboard");
    setStep(0);
    setLogs(INIT_LOGS);
  }

  // ── Onboarding shared UI ──────────────────────────────────────────────────
  const Logo=()=><div style={{fontSize:20,fontWeight:900,background:"linear-gradient(135deg,#6366f1,#a78bfa)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>CaloFlux</div>;
  const Steps=()=><div style={{display:"flex",gap:5}}>{[1,2,3,4,5].map(i=><div key={i} style={{height:5,borderRadius:3,background:i<=step?C.accent:C.border,width:i===step?22:5,transition:"all 0.3s"}}/>)}</div>;
  const Hdr=({showSteps=true})=><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"18px 24px 0"}}><Logo/>{showSteps&&step>0&&step<6&&<Steps/>}</div>;
  const TitleBlock=({step:s,title,sub})=><div style={{marginBottom:26}}><div style={{fontSize:11,fontWeight:700,color:C.accent,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8}}>Step {s} of 5</div><div style={{fontSize:26,fontWeight:800,marginBottom:5}}>{title}</div>{sub&&<div style={{fontSize:14,color:C.muted,lineHeight:1.5}}>{sub}</div>}</div>;
  const OBtn=({label,onClick,disabled=false,secondary=false})=><button onClick={onClick} disabled={disabled} style={{width:"100%",padding:"16px",border:secondary?`1px solid ${C.border}`:"none",background:disabled?"#1c1c30":secondary?"transparent":C.grad,borderRadius:14,color:disabled?C.muted:secondary?C.muted:"#fff",fontSize:16,fontWeight:700,cursor:disabled?"not-allowed":"pointer",marginTop:secondary?10:22,boxShadow:!disabled&&!secondary?"0 4px 24px rgba(99,102,241,0.3)":"none"}}>{label}</button>;
  const inputSt={width:"100%",background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"13px 16px",color:C.text,fontSize:16,outline:"none",fontFamily:"inherit",boxSizing:"border-box"};

  // ── ONBOARDING ────────────────────────────────────────────────────────────
  if(phase==="onboard"&&step===0) return(
    <div style={{background:C.bg,minHeight:"100vh",color:C.text,fontFamily:"'Inter',system-ui,sans-serif",maxWidth:480,margin:"0 auto",display:"flex",flexDirection:"column",padding:"18px 24px 32px"}}>
      <Logo/>
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",paddingTop:20}}>
        <div style={{fontSize:52,marginBottom:14}}>⚡</div>
        <div style={{fontSize:34,fontWeight:900,background:"linear-gradient(135deg,#6366f1,#a78bfa)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginBottom:10,letterSpacing:"-1px"}}>CaloFlux</div>
        <div style={{fontSize:17,fontWeight:600,marginBottom:8,lineHeight:1.4}}>Log fast. Know what matters.<br/>Get your next best meal.</div>
        <div style={{fontSize:13,color:C.muted,maxWidth:290,lineHeight:1.7,marginBottom:36}}>AI nutrition tracker that tells you what to eat next — not just what you already ate.</div>
        <div style={{display:"flex",flexDirection:"column",gap:10,width:"100%"}}>
          {[["🎯","Personalized targets from your BMI & body stats"],["📷","AI food logging — describe it or snap a photo"],["✦","Next Meal Engine — ranked suggestions in seconds"]].map(([icon,text])=>(
            <div key={text} style={{display:"flex",alignItems:"center",gap:14,background:C.card,border:`1px solid ${C.border}`,borderRadius:13,padding:"13px 16px",textAlign:"left"}}>
              <span style={{fontSize:22,flexShrink:0}}>{icon}</span><span style={{fontSize:13,color:C.muted}}>{text}</span>
            </div>
          ))}
        </div>
      </div>
      <button onClick={()=>setStep(1)} style={{width:"100%",padding:"17px",background:C.grad,border:"none",borderRadius:14,color:"#fff",fontSize:17,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 32px rgba(99,102,241,0.4)"}}>Get Started →</button>
    </div>
  );

  if(phase==="onboard"&&step===1) return(
    <div style={{background:C.bg,minHeight:"100vh",color:C.text,fontFamily:"'Inter',system-ui,sans-serif",maxWidth:480,margin:"0 auto",padding:"0 24px 32px"}}>
      <Hdr/><br/><TitleBlock step={1} title="Create your account" sub="Your personal nutrition space"/>
      <div style={{marginBottom:16}}><label style={{fontSize:13,color:C.muted,display:"block",marginBottom:6,fontWeight:500}}>Full Name</label><input style={inputSt} value={form.name} onChange={e=>up("name",e.target.value)} placeholder="e.g. Alex Johnson"/></div>
      <div style={{marginBottom:16}}><label style={{fontSize:13,color:C.muted,display:"block",marginBottom:6,fontWeight:500}}>Email Address</label><input style={inputSt} type="email" value={form.email} onChange={e=>up("email",e.target.value)} placeholder="you@example.com"/></div>
      <div style={{marginBottom:6}}><label style={{fontSize:13,color:C.muted,display:"block",marginBottom:6,fontWeight:500}}>Password</label><input style={inputSt} type="password" value={form.password||""} onChange={e=>up("password",e.target.value)} placeholder="Create a password"/></div>
      <div style={{fontSize:11,color:C.muted,lineHeight:1.6,marginTop:8}}>By continuing you agree to our Terms of Service and Privacy Policy.</div>
      <OBtn label="Create Account →" onClick={()=>setStep(2)} disabled={!valid[1]}/>
    </div>
  );

  if(phase==="onboard"&&step===2) return(
    <div style={{background:C.bg,minHeight:"100vh",color:C.text,fontFamily:"'Inter',system-ui,sans-serif",maxWidth:480,margin:"0 auto",padding:"0 24px 32px"}}>
      <Hdr/><br/><TitleBlock step={2} title="Your body stats" sub="Used to calculate your BMI and calorie needs. Never shared."/>
      <div style={{marginBottom:16}}><label style={{fontSize:13,color:C.muted,display:"block",marginBottom:6,fontWeight:500}}>Age</label><input style={inputSt} type="number" value={form.age} onChange={e=>up("age",e.target.value)} placeholder="e.g. 28"/></div>
      <div style={{marginBottom:16}}>
        <label style={{fontSize:13,color:C.muted,display:"block",marginBottom:6,fontWeight:500}}>Biological Sex</label>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {[["male","♂  Male"],["female","♀  Female"]].map(([v,l])=>(
            <button key={v} onClick={()=>up("sex",v)} style={{padding:"13px",background:form.sex===v?`${C.accent}20`:"transparent",border:`1px solid ${form.sex===v?C.accent:C.border}`,borderRadius:12,color:form.sex===v?C.accent:C.muted,fontSize:15,fontWeight:form.sex===v?700:400,cursor:"pointer",fontFamily:"inherit"}}>{l}</button>
          ))}
        </div>
      </div>
      <div style={{marginBottom:16}}>
        <label style={{fontSize:13,color:C.muted,display:"block",marginBottom:6,fontWeight:500}}>Height</label>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <select value={form.hFt} onChange={e=>up("hFt",e.target.value)} style={{...inputSt,appearance:"none"}}>{[4,5,6,7].map(f=><option key={f} value={f}>{f} ft</option>)}</select>
          <select value={form.hIn} onChange={e=>up("hIn",e.target.value)} style={{...inputSt,appearance:"none"}}>{[...Array(12)].map((_,i)=><option key={i} value={i}>{i} in</option>)}</select>
        </div>
      </div>
      <div style={{marginBottom:8}}><label style={{fontSize:13,color:C.muted,display:"block",marginBottom:6,fontWeight:500}}>Current Weight (lbs)</label><input style={inputSt} type="number" value={form.weight} onChange={e=>up("weight",e.target.value)} placeholder="e.g. 165"/></div>
      {bmi&&<div style={{fontSize:13,color:C.muted,marginTop:6}}>Preview BMI: <span style={{color:bmiCat.color,fontWeight:700}}>{bmi} — {bmiCat.label}</span></div>}
      <OBtn label="Calculate BMI →" onClick={()=>setStep(3)} disabled={!valid[2]}/>
      <OBtn label="Back" onClick={()=>setStep(1)} secondary/>
    </div>
  );

  if(phase==="onboard"&&step===3){
    const[lo,hi]=bmi?idealWeightRange(form.hFt,form.hIn):[0,0];
    return(
      <div style={{background:C.bg,minHeight:"100vh",color:C.text,fontFamily:"'Inter',system-ui,sans-serif",maxWidth:480,margin:"0 auto",padding:"0 24px 32px",overflowY:"auto"}}>
        <Hdr/><br/><TitleBlock step={3} title="Your BMI result"/>
        {bmi&&bmiCat&&(
          <div style={{...mk(),marginBottom:18}}>
            <div style={{display:"flex",alignItems:"center",gap:20,marginBottom:20}}>
              <div style={{textAlign:"center",flexShrink:0}}><div style={{fontSize:48,fontWeight:900,color:bmiCat.color,lineHeight:1}}>{bmi}</div><div style={{fontSize:11,color:C.muted,marginTop:2}}>BMI</div></div>
              <div><div style={{fontSize:17,fontWeight:700,color:bmiCat.color,marginBottom:4}}>{bmiCat.label}</div><div style={{fontSize:13,color:C.muted,lineHeight:1.5}}>{bmiCat.advice}</div></div>
            </div>
            <BMIGauge bmi={bmi}/>
            <div style={{marginTop:14,padding:"10px 12px",background:`${C.accent}0d`,border:`1px solid ${C.accent}18`,borderRadius:10,fontSize:12,color:C.muted}}>
              💡 Healthy BMI: 18.5–24.9 · Ideal weight: <strong style={{color:C.text}}>{lo}–{hi} lbs</strong>
            </div>
          </div>
        )}
        <div style={{fontSize:15,fontWeight:700,marginBottom:12}}>What's your primary goal?</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:4}}>
          {[["lose_weight","🏃","Lose Weight","Caloric deficit"],["maintain","⚖️","Maintain","Stay at current weight"],["perform","💪","Perform","Strength & endurance"],["diet_quality","🥗","Diet Quality","Eat cleaner, feel better"]].map(([v,icon,lbl,sub])=>(
            <button key={v} onClick={()=>up("goal",v)} style={{padding:"14px 12px",background:form.goal===v?`${C.accent}20`:"transparent",border:`1px solid ${form.goal===v?C.accent:C.border}`,borderRadius:14,textAlign:"left",cursor:"pointer",fontFamily:"inherit"}}>
              <div style={{fontSize:22,marginBottom:6}}>{icon}</div>
              <div style={{fontSize:14,fontWeight:700,color:form.goal===v?C.accent:C.text}}>{lbl}</div>
              <div style={{fontSize:11,color:C.muted,marginTop:2}}>{sub}</div>
            </button>
          ))}
        </div>
        <OBtn label="Next →" onClick={()=>setStep(4)} disabled={!valid[3]}/>
        <OBtn label="Back" onClick={()=>setStep(2)} secondary/>
      </div>
    );
  }

  if(phase==="onboard"&&step===4) return(
    <div style={{background:C.bg,minHeight:"100vh",color:C.text,fontFamily:"'Inter',system-ui,sans-serif",maxWidth:480,margin:"0 auto",padding:"0 24px 32px",overflowY:"auto"}}>
      <Hdr/><br/><TitleBlock step={4} title="Activity level" sub="How active are you on a typical week?"/>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {[["sedentary","🪑","Sedentary","Little to no exercise, desk job"],["light","🚶","Lightly Active","Light exercise 1–3 days/week"],["moderate","🏃","Moderately Active","Exercise 3–5 days/week"],["active","🏋️","Very Active","Hard exercise 6–7 days/week"],["very","⚡","Extremely Active","Physical job + daily training"]].map(([v,icon,lbl,sub])=>(
          <button key={v} onClick={()=>up("activity",v)} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",background:form.activity===v?`${C.accent}15`:C.card,border:`1px solid ${form.activity===v?C.accent:C.border}`,borderRadius:14,cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>
            <div style={{fontSize:26,width:36,textAlign:"center",flexShrink:0}}>{icon}</div>
            <div style={{flex:1}}><div style={{fontSize:15,fontWeight:700,color:form.activity===v?C.accent:C.text}}>{lbl}</div><div style={{fontSize:12,color:C.muted,marginTop:2}}>{sub}</div></div>
            {form.activity===v&&<div style={{color:C.accent,fontSize:18}}>✓</div>}
          </button>
        ))}
      </div>
      <OBtn label="Calculate My Targets →" onClick={()=>setStep(5)} disabled={!valid[4]}/>
      <OBtn label="Back" onClick={()=>setStep(3)} secondary/>
    </div>
  );

  if(phase==="onboard"&&step===5){
    const t=overrideTargets||computed;
    const tSt={background:"#1c1c30",border:`1px solid ${C.border}`,borderRadius:8,padding:"5px 8px",fontWeight:700,fontSize:14,textAlign:"right",outline:"none",fontFamily:"inherit",width:72};
    const goalMsg=form.goal==="lose_weight"?"Target = TDEE − 500 kcal/day (≈0.45 kg/week loss)":form.goal==="perform"?"Target = TDEE + 300 kcal/day (lean gain)":"Target = TDEE (maintenance)";
    return(
      <div style={{background:C.bg,minHeight:"100vh",color:C.text,fontFamily:"'Inter',system-ui,sans-serif",maxWidth:480,margin:"0 auto",padding:"0 24px 32px",overflowY:"auto"}}>
        <Hdr/><br/><TitleBlock step={5} title="Your daily targets" sub="Adjust if needed."/>
        {t&&<>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
            {[["BMR",t.bmr,"kcal",C.prot],["TDEE",t.tdee,"kcal",C.carb]].map(([l,v,u,c])=>(
              <div key={l} style={{...mk(),textAlign:"center"}}><div style={{fontSize:22,fontWeight:800,color:c}}>{v}</div><div style={{fontSize:11,color:C.muted,marginTop:2}}>{l} · {u}/day</div></div>
            ))}
          </div>
          <div style={{...mk(),border:`1px solid ${C.accent}30`,marginBottom:14}}>
            <div style={{fontSize:12,color:C.accent,marginBottom:14,fontWeight:600}}>🎯 {goalMsg}</div>
            {[["Daily Calories","calT",C.cal,"kcal"],["Protein","protT",C.prot,"g"],["Carbohydrates","carbT",C.carb,"g"],["Fat","fatT",C.fat,"g"],["Fiber","fibT",C.fiber,"g"]].map(([lbl,k,col,u],i)=>(
              <div key={k} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderTop:i>0?`1px solid ${C.border}`:"none"}}>
                <span style={{fontSize:14,color:C.muted}}>{lbl}</span>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <input type="number" value={(overrideTargets||t)[k]} onChange={e=>setOverrideTargets(p=>({...(p||t),[k]:parseInt(e.target.value)||0}))} style={{...tSt,color:col}}/>
                  <span style={{fontSize:12,color:C.muted,width:24}}>{u}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{marginBottom:4}}>
            <div style={{fontSize:13,color:C.muted,marginBottom:10,fontWeight:500}}>Meal Budget</div>
            <div style={{display:"flex",gap:8}}>
              {[["frugal","💰 Frugal"],["moderate","💳 Moderate"],["premium","⭐ Premium"]].map(([b,l])=>(
                <button key={b} onClick={()=>up("budget",b)} style={{flex:1,padding:"10px 6px",background:form.budget===b?`${C.accent}20`:"transparent",border:`1px solid ${form.budget===b?C.accent:C.border}`,borderRadius:10,color:form.budget===b?C.accent:C.muted,fontSize:12,fontWeight:form.budget===b?700:400,cursor:"pointer",fontFamily:"inherit"}}>{l}</button>
              ))}
            </div>
          </div>
        </>}
        <OBtn label="Confirm & Start Tracking →" onClick={()=>setStep(6)}/>
        <OBtn label="Back" onClick={()=>setStep(4)} secondary/>
      </div>
    );
  }

  if(phase==="onboard"&&step===6){
    const t=overrideTargets||computed;
    return(
      <div style={{background:C.bg,minHeight:"100vh",color:C.text,fontFamily:"'Inter',system-ui,sans-serif",maxWidth:480,margin:"0 auto",display:"flex",flexDirection:"column",padding:"18px 24px 32px"}}>
        <Hdr showSteps={false}/>
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",paddingTop:32}}>
          <div style={{fontSize:56,marginBottom:16}}>🎉</div>
          <div style={{fontSize:26,fontWeight:800,marginBottom:8}}>You're all set, {form.name.split(" ")[0]}!</div>
          <div style={{fontSize:14,color:C.muted,maxWidth:280,lineHeight:1.6,marginBottom:28}}>Your plan is saved. You'll stay logged in automatically.</div>
          {t&&bmi&&bmiCat&&(
            <div style={{...mk(),width:"100%",textAlign:"left",marginBottom:24}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <div><div style={{fontSize:14,fontWeight:700}}>{form.name}</div><div style={{fontSize:12,color:C.muted,marginTop:2}}>BMI {bmi} · {bmiCat.label}</div></div>
                <div style={{fontSize:10,fontWeight:700,color:bmiCat.color,background:`${bmiCat.color}15`,border:`1px solid ${bmiCat.color}30`,borderRadius:6,padding:"3px 10px"}}>{bmiCat.label.toUpperCase()}</div>
              </div>
              {[["🔥 Calories",t.calT,"kcal",C.cal],["💪 Protein",t.protT,"g",C.prot],["🌾 Carbs",t.carbT,"g",C.carb],["🥑 Fat",t.fatT,"g",C.fat]].map(([l,v,u,c],i)=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderTop:i>0?`1px solid ${C.border}`:"none"}}>
                  <span style={{fontSize:14,color:C.muted}}>{l}</span>
                  <span style={{fontWeight:700,color:c}}>{v}<span style={{color:C.muted,fontWeight:400}}> {u}</span></span>
                </div>
              ))}
            </div>
          )}
        </div>
        <button onClick={finishOnboarding} style={{width:"100%",padding:"17px",background:C.grad,border:"none",borderRadius:14,color:"#fff",fontSize:17,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 32px rgba(99,102,241,0.4)"}}>Start Tracking →</button>
      </div>
    );
  }

  // ── MAIN APP ──────────────────────────────────────────────────────────────
  const NAV=[{id:"dash",label:"Dashboard",icon:"◫"},{id:"log",label:"Log",icon:"+"},{id:"nextmeal",label:"Next Meal",icon:"✦"},{id:"profile",label:"Profile",icon:"◎"}];
  return(
    <div style={{background:C.bg,minHeight:"100vh",color:C.text,fontFamily:"'Inter',system-ui,sans-serif",maxWidth:480,margin:"0 auto",position:"relative"}}>
      <div style={{position:"sticky",top:0,zIndex:50,background:`${C.bg}ee`,backdropFilter:"blur(12px)",borderBottom:`1px solid ${C.border}`,padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:22,fontWeight:900,background:"linear-gradient(135deg,#6366f1,#a78bfa)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:"-0.5px"}}>CaloFlux</div>
        <div style={{fontSize:10,fontWeight:700,color:C.accent,background:`${C.accent}15`,border:`1px solid ${C.accent}30`,borderRadius:20,padding:"4px 12px",letterSpacing:"0.06em"}}>PREMIUM</div>
      </div>
      <div style={{paddingBottom:90}}>
        {tab==="dash"&&(
          <div style={{padding:"16px 16px 0"}}>
            <div style={{marginBottom:18}}><div style={{fontSize:12,color:C.muted}}>{todayStr}</div><div style={{fontSize:20,fontWeight:700,marginTop:3}}>Good {greet}, {profile.name} 👋</div></div>
            <div style={{...mk(),marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",gap:20}}>
                <div style={{position:"relative",flexShrink:0}}>
                  <Ring val={tot.cal} max={profile.calT}/>
                  <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                    <div style={{fontSize:26,fontWeight:800,color:C.cal,lineHeight:1}}>{tot.cal}</div>
                    <div style={{fontSize:10,color:C.muted,marginTop:2}}>kcal</div>
                  </div>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{marginBottom:12}}>
                    <div style={{fontSize:13,color:C.muted}}>Calories consumed</div>
                    <div style={{fontSize:19,fontWeight:800}}>{tot.cal}<span style={{fontSize:13,color:C.muted,fontWeight:400}}> / {profile.calT}</span></div>
                    <div style={{fontSize:13,marginTop:3,color:rem.cal>=0?C.cal:C.red,fontWeight:600}}>{rem.cal>=0?`${rem.cal} remaining`:`${Math.abs(rem.cal)} over budget`}</div>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    {[["P",tot.prot,C.prot],["C",tot.carb,C.carb],["F",tot.fat,C.fat]].map(([l,v,c])=>(
                      <div key={l} style={{flex:1,background:`${c}12`,border:`1px solid ${c}25`,borderRadius:8,padding:"6px 0",textAlign:"center"}}>
                        <div style={{fontSize:13,fontWeight:700,color:c}}>{Math.round(v)}g</div><div style={{fontSize:10,color:C.muted}}>{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div style={{...mk(),marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:700,color:C.muted,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:14}}>Macros & Nutrients</div>
              <Bar label="Protein" val={tot.prot} max={profile.protT} color={C.prot}/>
              <Bar label="Carbohydrates" val={tot.carb} max={profile.carbT} color={C.carb}/>
              <Bar label="Fat" val={tot.fat} max={profile.fatT} color={C.fat}/>
              <Bar label="Fiber" val={tot.fib} max={profile.fibT} color={C.fiber}/>
            </div>
            <div style={{...mk(),marginBottom:16}}>
              <div style={{fontSize:11,fontWeight:700,color:C.muted,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:14}}>Today's Meals</div>
              {logs.length===0?<div style={{textAlign:"center",color:C.muted,padding:"20px 0",fontSize:14}}>No meals logged yet</div>
                :logs.map((l,i)=>(
                  <div key={l.id} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 0",borderTop:i>0?`1px solid ${C.border}`:"none"}}>
                    <div style={{width:36,height:36,borderRadius:10,background:`${C.accent}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{MEAL_ICON[l.meal]||"🍽️"}</div>
                    <div style={{flex:1,minWidth:0}}><div style={{fontWeight:600,fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.name}</div><div style={{fontSize:11,color:C.muted,marginTop:1}}>{l.time} · P:{l.protein}g C:{l.carbs}g F:{l.fat}g</div></div>
                    <div style={{textAlign:"right",flexShrink:0}}><div style={{fontSize:15,fontWeight:700,color:C.cal}}>{l.calories}</div><div style={{fontSize:10,color:C.muted}}>kcal</div></div>
                    <button onClick={()=>updateLogs(logs.filter(x=>x.id!==l.id))} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:18,padding:"0 0 0 4px"}}>×</button>
                  </div>
                ))
              }
            </div>
          </div>
        )}
        {tab==="log"&&(
          <div style={{padding:"16px"}}>
            <div style={{fontSize:20,fontWeight:700,marginBottom:4}}>Log Food</div>
            <div style={{color:C.muted,fontSize:13,marginBottom:16}}>Type a description, upload a photo, or both</div>
            <textarea value={food} onChange={e=>setFood(e.target.value)} placeholder="Optional: describe the food or add context..."
              style={{width:"100%",background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"14px",color:C.text,fontSize:15,resize:"none",height:90,outline:"none",fontFamily:"inherit",boxSizing:"border-box",lineHeight:1.5}}/>
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{display:"none"}}/>
            {!photo?(
              <button onClick={()=>fileRef.current?.click()} style={{width:"100%",marginTop:10,padding:"14px",background:"transparent",border:`1.5px dashed ${C.border}`,borderRadius:13,color:C.muted,fontSize:14,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
                <span style={{fontSize:20}}>📷</span> Upload Food Photo
              </button>
            ):(
              <div style={{marginTop:10,position:"relative",borderRadius:14,overflow:"hidden",border:`1px solid ${C.accent}40`}}>
                <img src={photo.preview} alt="food" style={{width:"100%",maxHeight:200,objectFit:"cover",display:"block"}}/>
                <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(7,7,15,0.7),transparent)",display:"flex",alignItems:"flex-end",padding:"10px 12px"}}>
                  <span style={{fontSize:12,color:"#fff",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>📷 {photo.name}</span>
                  <button onClick={()=>setPhoto(null)} style={{background:"rgba(0,0,0,0.5)",border:"none",color:"#fff",borderRadius:20,padding:"4px 10px",fontSize:12,cursor:"pointer"}}>✕ Remove</button>
                </div>
              </div>
            )}
            {parseErr&&<div style={{color:C.red,fontSize:12,marginTop:8}}>{parseErr}</div>}
            <button onClick={parseFood} disabled={parsing||(!food.trim()&&!photo)} style={{width:"100%",marginTop:10,padding:"15px",background:parsing||(!food.trim()&&!photo)?"#1c1c30":C.grad,border:"none",borderRadius:13,color:parsing||(!food.trim()&&!photo)?C.muted:"#fff",fontSize:15,fontWeight:700,cursor:parsing||(!food.trim()&&!photo)?"not-allowed":"pointer"}}>
              {parsing?`⏳ Analyzing${photo?" photo":""}...`:`✦ Analyze Food${photo?" + Photo":""}`}
            </button>
            {pending&&(
              <div style={{...mk(),marginTop:16,border:`1px solid ${C.accent}40`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                  <div><div style={{fontSize:16,fontWeight:700}}>{pending.name}</div><div style={{fontSize:12,color:C.muted,marginTop:2}}>{pending.meal} · <span style={{color:pending.confidence>=80?C.cal:pending.confidence>=60?C.carb:C.red}}>{pending.confidence}% confidence</span></div></div>
                  <div style={{textAlign:"right"}}><div style={{fontSize:26,fontWeight:800,color:C.cal}}>{pending.calories}</div><div style={{fontSize:10,color:C.muted}}>kcal</div></div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
                  {[["Protein",pending.protein,"g",C.prot],["Carbs",pending.carbs,"g",C.carb],["Fat",pending.fat,"g",C.fat],["Fiber",pending.fiber,"g",C.fiber],["Sugar",pending.sugar,"g",C.carb],["Sodium",pending.sodium,"mg",C.muted]].map(([l,v,u,c])=>(
                    <div key={l} style={{background:`${c}10`,border:`1px solid ${c}20`,borderRadius:10,padding:"10px 8px",textAlign:"center"}}><div style={{fontSize:15,fontWeight:700,color:c}}>{v}{u}</div><div style={{fontSize:10,color:C.muted,marginTop:2}}>{l}</div></div>
                  ))}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <button onClick={()=>{setPending(null);setParseErr("");}} style={{padding:"13px",background:"#1c1c30",border:"none",borderRadius:11,color:C.muted,fontSize:14,fontWeight:600,cursor:"pointer"}}>Cancel</button>
                  <button onClick={confirmAdd} style={{padding:"13px",background:C.grad,border:"none",borderRadius:11,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>Add to Log ✓</button>
                </div>
              </div>
            )}
            {!pending&&(
              <div style={{marginTop:20}}>
                <div style={{fontSize:11,fontWeight:700,color:C.muted,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:10}}>Quick Log</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                  {["Protein shake","Greek yogurt","Banana","Chicken breast 150g","Brown rice 1 cup","Almonds 30g","Oatmeal","Avocado toast"].map(q=>(
                    <button key={q} onClick={()=>setFood(q)} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:20,padding:"7px 14px",color:C.muted,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{q}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {tab==="nextmeal"&&(
          <div style={{padding:"16px"}}>
            <div style={{fontSize:20,fontWeight:700,marginBottom:4}}>Next Meal Engine</div>
            <div style={{color:C.muted,fontSize:13,marginBottom:16}}>AI-ranked suggestions based on your remaining targets</div>
            <div style={{...mk(),marginBottom:14}}>
              <div style={{fontSize:11,fontWeight:700,color:C.muted,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:12}}>Remaining Today</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6}}>
                {[["Cal",rem.cal,C.cal],["Prot",rem.prot,C.prot],["Carb",rem.carb,C.carb],["Fat",rem.fat,C.fat],["Fiber",rem.fib,C.fiber]].map(([l,v,c])=>(
                  <div key={l} style={{textAlign:"center"}}><div style={{fontSize:16,fontWeight:800,color:v>0?c:C.red}}>{Math.max(Math.round(v),0)}</div><div style={{fontSize:9,color:C.muted}}>{l}</div></div>
                ))}
              </div>
            </div>
            <button onClick={getSuggestions} disabled={suggesting} style={{width:"100%",padding:"15px",background:suggesting?"#1c1c30":C.grad,border:"none",borderRadius:13,color:suggesting?C.muted:"#fff",fontSize:15,fontWeight:700,cursor:suggesting?"not-allowed":"pointer",marginBottom:16}}>
              {suggesting?"⏳ Finding your best options...":"✦ Get Next Meal Suggestions"}
            </button>
            {sugs.map((s,i)=>(
              <div key={i} style={{...mk(),marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                      <div style={{fontSize:10,fontWeight:800,color:RANK_COL[i],background:`${RANK_COL[i]}15`,border:`1px solid ${RANK_COL[i]}30`,borderRadius:5,padding:"2px 7px"}}>#{i+1} PICK</div>
                      <div style={{fontSize:11,color:C.muted}}>⏱ {s.prepTime}</div>
                    </div>
                    <div style={{fontSize:16,fontWeight:700}}>{s.name}</div>
                    <div style={{fontSize:12,color:C.muted,marginTop:3,lineHeight:1.5}}>{s.description}</div>
                  </div>
                  <div style={{textAlign:"right",marginLeft:12,flexShrink:0}}><div style={{fontSize:22,fontWeight:800,color:C.cal}}>{s.calories}</div><div style={{fontSize:10,color:C.muted}}>kcal</div></div>
                </div>
                <div style={{display:"flex",gap:6,marginBottom:10}}>
                  {[["P",s.protein,C.prot],["C",s.carbs,C.carb],["F",s.fat,C.fat]].map(([l,v,c])=>(
                    <div key={l} style={{background:`${c}12`,border:`1px solid ${c}25`,borderRadius:7,padding:"4px 10px",fontSize:12,color:c}}>{l} {v}g</div>
                  ))}
                </div>
                <div style={{fontSize:12,color:C.accent,background:`${C.accent}0d`,border:`1px solid ${C.accent}20`,borderRadius:8,padding:"8px 12px"}}>💡 {s.reason}</div>
                {s.servingNote&&<div style={{fontSize:11,color:C.muted,marginTop:8}}>📏 {s.servingNote}</div>}
              </div>
            ))}
            {!sugs.length&&!suggesting&&<div style={{textAlign:"center",color:C.muted,padding:"30px 0",fontSize:14}}>Hit the button above to get personalized meal suggestions</div>}
          </div>
        )}
        {tab==="profile"&&(
          <div style={{padding:"16px"}}>
            <div style={{fontSize:20,fontWeight:700,marginBottom:16}}>Profile & Targets</div>
            <div style={{...mk(),marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:700,color:C.muted,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:14}}>Daily Targets</div>
              {[["Calories","calT",C.cal,"kcal"],["Protein","protT",C.prot,"g"],["Carbs","carbT",C.carb,"g"],["Fat","fatT",C.fat,"g"],["Fiber","fibT",C.fiber,"g"]].map(([lbl,key,col,u],i)=>(
                <div key={key} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderTop:i>0?`1px solid ${C.border}`:"none"}}>
                  <span style={{fontSize:14,color:C.muted}}>{lbl}</span>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <input type="number" value={profile[key]} onChange={e=>{const p={...profile,[key]:parseInt(e.target.value)||0};setProfile(p);saveToDisk({profile:p,logs});}}
                      style={{width:66,background:"#1c1c30",border:`1px solid ${C.border}`,borderRadius:8,padding:"5px 8px",color:col,fontWeight:700,fontSize:14,textAlign:"right",outline:"none",fontFamily:"inherit"}}/>
                    <span style={{fontSize:12,color:C.muted,width:24}}>{u}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{...mk(),marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:700,color:C.muted,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:12}}>Goal</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {[["lose_weight","🏃 Lose Weight"],["maintain","⚖️ Maintain"],["perform","💪 Perform"],["diet_quality","🥗 Diet Quality"]].map(([g,l])=>(
                  <button key={g} onClick={()=>{const p={...profile,goal:g};setProfile(p);saveToDisk({profile:p,logs});}} style={{padding:"12px 8px",background:profile.goal===g?`${C.accent}20`:"transparent",border:`1px solid ${profile.goal===g?C.accent:C.border}`,borderRadius:12,color:profile.goal===g?C.accent:C.muted,fontSize:13,fontWeight:profile.goal===g?700:400,cursor:"pointer",fontFamily:"inherit"}}>{l}</button>
                ))}
              </div>
            </div>
            <button onClick={handleSignOut} style={{width:"100%",padding:"14px",background:"transparent",border:`1px solid ${C.red}40`,borderRadius:12,color:C.red,fontSize:14,cursor:"pointer",fontFamily:"inherit",marginTop:4}}>
              Sign Out
            </button>
          </div>
        )}
      </div>
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:`${C.card}f5`,backdropFilter:"blur(16px)",borderTop:`1px solid ${C.border}`,display:"flex",padding:"10px 0 18px",zIndex:50}}>
        {NAV.map(n=>(
          <button key={n.id} onClick={()=>setTab(n.id)} style={{flex:1,background:"none",border:"none",cursor:"pointer",padding:"4px 0",display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
            {n.id==="log"
              ?<div style={{width:36,height:36,borderRadius:11,background:tab==="log"?C.grad:"#1c1c30",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:24,fontWeight:300,boxShadow:tab==="log"?`0 0 18px ${C.accent}70`:"none"}}>+</div>
              :<div style={{fontSize:20,color:tab===n.id?C.accent:C.muted,filter:tab===n.id?`drop-shadow(0 0 4px ${C.accent}90)`:"none"}}>{n.icon}</div>
            }
            <div style={{fontSize:10,fontWeight:tab===n.id?700:400,color:tab===n.id?C.accent:C.muted}}>{n.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}