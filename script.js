const $ = s => document.querySelector(s);
const timeEl=$('#time'), ring=$('#ring'), mainBtn=$('#mainBtn'),
  modeLabel=$('#modeLabel'), roundEl=$('#round'), quoteEl=$('#quote'),
  voyageCount=$('#voyageCount'), toast=$('#toast');
const CIRC=2*Math.PI*88;
ring.style.strokeDasharray=CIRC;
let durations={focus:25*60,short:5*60,long:15*60};
let mode='focus', remaining=durations.focus, running=false, timerId=null;
let completed=0, cyclePos=0, soundOn=true;
let user=null, profile=null, suppressPick=false;
let crew='luffy';
try{crew=localStorage.getItem('op-crew')||'luffy';}catch(e){}
const CREWS={
  luffy:{label:'Luffy',color:'#E5383B',img:'assets/images/luffy.jpg',quotes:{
    focus:['“Kaizoku-ou ni ore wa naru!” — set sail when ready.','Eyes on the Grand Line. One task at a time.','Gear up. Full focus, no running.'],
    short:['Sunny break. Meat and water, then back.','Shishishi! Rest quick, adventure waits.'],
    long:['Big feast like after Arlong Park. You earned it.','Rest hard, dream big, Pirate King.']}},
  zoro:{label:'Zoro',color:'#2FBF71',img:'assets/images/zoro.jpg',quotes:{
    focus:['Three swords, one task. Cut the distractions.','Nothing… nothing at all. Keep working.','A scar is proof of focus. Keep going.'],
    short:['One bottle of rest. Then back to training.','Even swords need sheathing sometimes.'],
    long:['Long rest. Meditate like after Thriller Bark.','Sleep now. Get lost later.']}},
  nami:{label:'Nami',color:'#FF9F1C',img:'assets/images/nami.jpg',quotes:{
    focus:['No focus, no treasure. Chart this task.','Map it out. One island at a time.','100 million berries starts with 25 minutes.'],
    short:['Log the course. Check the Log Pose.','Tangerine break. Count your berries.'],
    long:['Shopping rest on Cocoyasi. You earned it.','Long rest — weather is clear and sunny.']}},
  sanji:{label:'Sanji',color:'#58A6FF',img:'assets/images/sanji.jpg',quotes:{
    focus:['Focus now, feast later. I will cook after.','Ladies first, distractions never.','Love is the garnish, focus is the dish.'],
    short:['Mellorine! Quick tea break, my dear.','Kick back. Service with a smile.'],
    long:['Full course rest à la Baratie. Enjoy.','Diable rest. Come back blazing.']}}
};
if(!CREWS[crew])crew='luffy';
function setScene(src){
  const holder=document.querySelector('.scene');
  const el=$('#sceneImg');
  if(!el||!holder)return;
  if(el.getAttribute('src')===src)return;
  const swap=()=>{ el.src=src; holder.classList.remove('fading'); };
  const pre=new Image();
  pre.onload=swap;
  pre.onerror=()=>holder.classList.remove('fading');
  if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches){ swap(); return; }
  holder.classList.add('fading');
  clearTimeout(setScene._t);
  setScene._t=setTimeout(()=>{
    pre.src=src;
    setTimeout(()=>{ if(pre.complete&&pre.naturalWidth===0)holder.classList.remove('fading'); },1500);
  },160);
  const elErr=()=>holder.classList.remove('fading');
  el.onerror=elErr;
}
function fmt(s){s=Math.max(0,Math.ceil(s));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');}
function paint(){
  timeEl.textContent=fmt(remaining);
  const total=durations[mode];
  const p=total?(1-remaining/total):0;
  ring.style.strokeDashoffset=CIRC*(1-p);
  const crewColor=(CREWS[crew]||CREWS.luffy).color;
  ring.style.stroke=mode==='focus'?crewColor:(mode==='short'?'#7BDFF2':'#FFD166');
  document.body.dataset.mode=mode;
  document.body.dataset.crew=crew;
  if(modeLabel){ modeLabel.classList.toggle('break',mode!=='focus'); }
  const names={focus:'Time to hunt for focus',short:'Short rest on deck',long:'Long island rest'};
  if(modeLabel){ modeLabel.textContent=running?names[mode]+' · sailing':names[mode]; }
  const next=(mode==='focus')?(cyclePos===3?'long rest':'short rest'):'focus';
  if(roundEl){ roundEl.textContent=mode==='focus'?`Voyage ${cyclePos+1} of 4 · next is ${next}`:`Resting · next is ${next}`; }
  const dial=$('#dial');
  if(dial){ dial.setAttribute('aria-label',`${fmt(remaining)}, ${names[mode]}${mode==='focus'?`, voyage ${cyclePos+1} of 4`:''}`); }
  document.title=`${fmt(remaining)} · ${names[mode]} — Straw Hat Timer`;
  voyageCount.textContent=`${completed} ${completed===1?'berry':'berries'} earned`;
  document.querySelectorAll('.modes button').forEach(b=>b.setAttribute('aria-selected',b.dataset.mode===mode?'true':'false'));
  renderSkulls();
}
function renderSkulls(){
  const box=$('#skulls'); box.innerHTML='';
  for(let i=0;i<4;i++){
    const d=document.createElement('div');
    d.className='skull'+(i<cyclePos?' done':'');
    d.innerHTML=`<svg width="18" height="18" viewBox="0 0 24 24" fill="${i<cyclePos?'currentColor':'none'}" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="10" r="6"/><rect x="8.5" y="14" width="7" height="5" rx="1"/><circle cx="10" cy="10" r="1.2" fill="${i<cyclePos?'var(--crew-deep)':'currentColor'}" stroke="none"/><circle cx="14" cy="10" r="1.2" fill="${i<cyclePos?'var(--crew-deep)':'currentColor'}" stroke="none"/></svg>`;
    d.title=i<cyclePos?'Voyage complete':'Voyage ahead';
    box.appendChild(d);
  }
}
function showToast(msg){toast.textContent=msg;toast.classList.add('show');clearTimeout(showToast._t);showToast._t=setTimeout(()=>toast.classList.remove('show'),3200);}

/* ---- Clip audio (wav files, WebAudio chime as fallback) ---- */
let alarmAudio=null, clickAudio=null;
try{
  alarmAudio=new Audio('./assets/alarm.wav'); alarmAudio.preload='auto';
  clickAudio=new Audio('./assets/click.wav'); clickAudio.preload='auto';
}catch(e){ alarmAudio=null; clickAudio=null; }
async function playAlarm(){
  if(!soundOn) return;
  if(alarmAudio){
    try{ alarmAudio.currentTime=0; await alarmAudio.play(); return; }
    catch(e){ /* blocked autoplay or missing file: fall through to chime */ }
  }
  beep();
}
function playClick(){
  if(!soundOn||!clickAudio) return;
  try{ clickAudio.currentTime=0; const p=clickAudio.play(); if(p&&p.catch) p.catch(()=>{}); }
  catch(e){}
}
function beep(){
  if(!soundOn)return;
  try{
    const ctx=new (window.AudioContext||window.webkitAudioContext)();
    [523,659,784].forEach((f,i)=>{
      const o=ctx.createOscillator(),g=ctx.createGain();
      o.type='triangle';o.frequency.value=f;g.gain.value=0.0001;
      o.connect(g);g.connect(ctx.destination);
      const t=ctx.currentTime+i*0.16;
      g.gain.exponentialRampToValueAtTime(0.25,t+0.03);
      g.gain.exponentialRampToValueAtTime(0.0001,t+0.22);
      o.start(t);o.stop(t+0.25);
    });
  }catch(e){}
}
function setMode(m,keepPaused=true){mode=m;remaining=durations[m];if(keepPaused)pause();const q=CREWS[crew].quotes[m];quoteEl.textContent=q[Math.floor(Math.random()*q.length)];paint();}
function tick(){remaining-=1;if(remaining<=0){remaining=0;paint();finishSession();return;}paint();}
function start(){if(running)return;running=true;mainBtn.textContent='Drop anchor';paint();timerId=setInterval(tick,1000);}
function pause(){running=false;clearInterval(timerId);mainBtn.textContent=remaining<durations[mode]&&remaining>0?'Keep sailing':'Set sail';paint();}
function finishSession(skipped=false){
  pause();playAlarm();
  if(mode==='focus'){
    if(!skipped){completed++;try{localStorage.setItem('op-completed',String(completed));}catch(e){}recordVoyage();cloudSaveBerries();}
    cyclePos++;
    if(cyclePos>=4){cyclePos=0;setMode('long',true);showToast('Four voyages done. Long rest — feast time.');}
    else if(skipped){setMode('short',true);showToast('Skipped ahead — no berry earned. Take a short rest.');}
    else{setMode('short',true);showToast('Voyage complete. Berry earned. Take a short rest.');}
  }else if(mode==='short'){setMode('focus',true);showToast('Rest over. Back to the Grand Line.');}
  else{setMode('focus',true);showToast('Rested crew is strong crew. Next voyage.');}
  mainBtn.textContent='Set sail';paint();renderHeatmap();
}
mainBtn.addEventListener('click',()=>running?pause():start());
$('#skipBtn').addEventListener('click',()=>finishSession(true));
$('#resetBtn').addEventListener('click',()=>{remaining=durations[mode];pause();mainBtn.textContent='Set sail';paint();});
$('#soundBtn').addEventListener('click',e=>{soundOn=!soundOn;e.target.textContent=soundOn?'Sound on':'Sound off';});
document.querySelectorAll('.modes button').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode,true)));
const CLICK_SEL=['#mainBtn','#skipBtn','#resetBtn','#soundBtn','#accountBtn','#authGo','#authRecGo','#authSavePass','#authClose','#authTabIn','#authTabUp','#promoSignup','#promoLater','.modes button','.crew-btn','#addBtn','.check','.name','.del','#authOutBtn'].join(',');
document.addEventListener('click',e=>{
  const t=e.target&&e.target.closest?e.target.closest(CLICK_SEL):null;
  if(t) playClick();
});
[['#inFocus','focus',1,90],['#inShort','short',1,30],['#inLong','long',5,60]].forEach(([sel,key,lo,hi])=>{
  $(sel).addEventListener('change',e=>{
    let v=Math.max(lo,Math.min(hi,parseInt(e.target.value||'25',10)));
    e.target.value=v;durations[key]=v*60;
    if(mode===key&&!running)remaining=durations[key];
    paint();syncFooter();
  });
});
function syncFooter(){
  const f=$('#footFocus'), s=$('#footShort');
  if(!f||!s)return;
  const fv=$('#inFocus'), sv=$('#inShort');
  const parse=(el,lo,hi,fb)=>{const v=parseInt((el&&el.value||'').trim(),10);return Number.isFinite(v)?Math.max(lo,Math.min(hi,v)):fb;};
  f.textContent=parse(fv,1,90,Math.round(durations.focus/60));
  s.textContent=parse(sv,1,30,Math.round(durations.short/60));
}
['#inFocus','#inShort'].forEach(sel=>$(sel).addEventListener('input',syncFooter));
syncFooter();
window.addEventListener('keydown',e=>{
  if(e.code==='Space'&&!/INPUT|TEXTAREA/.test(document.activeElement.tagName)){e.preventDefault();running?pause():start();}
});
let tasks=[];
try{tasks=JSON.parse(localStorage.getItem('op-tasks')||'[]');completed=parseInt(localStorage.getItem('op-completed')||'0',10)||0;}catch(e){}
let history={};
try{history=JSON.parse(localStorage.getItem('op-history')||'{}')||{};}catch(e){history={};}
function dayKey(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function saveHistory(){try{localStorage.setItem('op-history',JSON.stringify(history));}catch(e){}cloudSaveHistory();}
function recordVoyage(){const k=dayKey(new Date());history[k]=(history[k]||0)+1;saveHistory();}
function saveTasks(){try{localStorage.setItem('op-tasks',JSON.stringify(tasks));}catch(e){}cloudSaveTasks();}
function renderTasks(){
  const list=$('#list');list.innerHTML='';
  if(!tasks.length){const d=document.createElement('div');d.className='empty';d.textContent='No bounties posted. Name your first target above and post it to the board.';list.appendChild(d);}
  else tasks.forEach((t,i)=>{
    const li=document.createElement('li');if(t.done)li.classList.add('done');
    const c=document.createElement('button');c.className='check';c.setAttribute('aria-label',t.done?'Mark as not done':'Mark as done');c.textContent=t.done?'✓':'';
    c.addEventListener('click',()=>{tasks[i].done=!tasks[i].done;saveTasks();renderTasks();});
    const n=document.createElement('button');n.className='name';n.textContent=t.text;
    n.addEventListener('click',()=>{tasks[i].done=!tasks[i].done;saveTasks();renderTasks();});
    const b=document.createElement('span');b.className='berry';b.textContent='฿ '+(t.done?'claimed':(3000+i*500).toLocaleString());
    const del=document.createElement('button');del.className='del';del.textContent='×';del.setAttribute('aria-label','Remove bounty');
    del.addEventListener('click',()=>{tasks.splice(i,1);saveTasks();renderTasks();});
    li.append(c,n,b,del);list.appendChild(li);
  });
  const open=tasks.filter(t=>!t.done).length;
  $('#posterSub').textContent=open===0?'All bounties claimed · post new ones':`Today's bounties · ${open} still at large`;
}
const LOG_WEEKS=26;
function levelFor(n){if(n<=0)return 0;if(n<=2)return 1;if(n<=4)return 2;if(n<=6)return 3;return 4;}
function renderHeatmap(){
  const grid=$('#logGrid'), months=$('#logMonths'), count=$('#logCount');
  if(!grid||!months||!count)return;
  grid.innerHTML='';months.innerHTML='';
  const today=new Date();today.setHours(0,0,0,0);
  const start=new Date(today);
  start.setDate(start.getDate()-(LOG_WEEKS-1)*7-today.getDay());
  const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let prevMonth=-1;
  for(let c=0;c<LOG_WEEKS;c++){
    const week=document.createElement('div');week.className='log-week';
    const sunMonth=new Date(start);sunMonth.setDate(sunMonth.getDate()+c*7);
    const lab=document.createElement('span');
    lab.textContent=sunMonth.getMonth()!==prevMonth?MONTHS[sunMonth.getMonth()]:'';
    prevMonth=sunMonth.getMonth();
    months.appendChild(lab);
    for(let r=0;r<7;r++){
      const d=new Date(start);d.setDate(d.getDate()+c*7+r);
      if(d>today){
        const f=document.createElement('span');f.className='day future';f.setAttribute('aria-hidden','true');
        week.appendChild(f);continue;
      }
      const n=history[dayKey(d)]||0;
      const b=document.createElement('button');
      b.className='day';b.type='button';b.dataset.l=levelFor(n);
      const stamp=d.toLocaleDateString(undefined,{month:'short',day:'numeric'});
      const tip=n===0?`No voyages on ${stamp}`:`${n} ${n===1?'voyage':'voyages'} on ${stamp}`;
      b.title=tip;b.setAttribute('aria-label',tip);
      week.appendChild(b);
    }
    grid.appendChild(week);
  }
  let total=0;
  const cutoff=new Date(today);cutoff.setDate(cutoff.getDate()-364);
  for(const k in history){
    const p=k.split('-');if(p.length!==3)continue;
    const d=new Date(+p[0],+p[1]-1,+p[2]);
    if(d>=cutoff&&d<=today)total+=history[k];
  }
  count.textContent=total===0?'No voyages logged in the last year':`${total} ${total===1?'voyage':'voyages'} in the last year`;
}
$('#addBtn').addEventListener('click',addTask);
$('#taskInput').addEventListener('keydown',e=>{if(e.key==='Enter')addTask();});
function addTask(){
  const inp=$('#taskInput');const v=inp.value.trim();
  if(!v){inp.focus();return;}
  tasks.unshift({text:v.slice(0,80),done:false});inp.value='';
  saveTasks();renderTasks();inp.focus();
}
function applyCrew(next,announce=true){
  if(!CREWS[next])return;
  if(user&&profile&&profile.crew&&next!==crew&&lockDays()>0){
    if(announce){const d=lockDays();showToast(`Locked with ${CREWS[crew].label} · switchable in ${d} ${d===1?'day':'days'}.`);}
    paint();return;
  }
  const serverPick=!!(user&&profile&&profile.crew!==next&&!suppressPick);
  crew=next;
  try{localStorage.setItem('op-crew',crew);}catch(e){}
  document.body.dataset.crew=crew;
  document.querySelectorAll('.crew-btn').forEach(b=>b.setAttribute('aria-pressed',b.dataset.crew===crew?'true':'false'));
  $('#crewName').textContent=CREWS[crew].label;
  setScene(CREWS[crew].img);
  const q=CREWS[crew].quotes[mode];
  quoteEl.textContent=q[Math.floor(Math.random()*q.length)];
  if(announce)showToast(`Sailing with ${CREWS[crew].label}.`);
  if(serverPick)persistCrew(next);
  paint();renderTasks();renderLock();
}
document.querySelectorAll('.crew-btn').forEach(b=>b.addEventListener('click',()=>applyCrew(b.dataset.crew,true)));
['luffy','zoro','nami','sanji'].forEach(k=>{ try{ const p=new Image(); p.src=CREWS[k].img; }catch(e){} });
renderTasks();applyCrew(crew,false);renderHeatmap();

/* ---- Cloud sync: direct Supabase REST over fetch (no SDK, no eval) ----
   Guest mode = localStorage only (existing behavior above, untouched).
   Logged in = localStorage stays as cache, Supabase is source of truth. */
const SB_URL='https://gypeuocixgluetppiuxu.supabase.co';
const SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5cGV1b2NpeGdsdWV0cHBpdXh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyODQwMDYsImV4cCI6MjEwNTg2MDAwNn0.5QwdRzJqFEO3iXA9UBzGAOIRvQYCxKvwt2tHPagtRC4';
let sbSession=null, authSubs=[], authRestored=false, recoveryActive=false, initialFlushed=false;
function sbToken(){ return (sbSession&&sbSession.access_token)||SB_KEY; }
async function sbq(p){ const r=await p; if(r.error) throw r.error; return r.data; }
function cloudFail(){ showToast('Cloud unreachable — kept on this device.'); }

/* Minimal PostgREST builder matching the calls used below. */
function from(table){
  const st={cols:'*',params:[],orders:[],method:'GET',body:null,prefer:null,onConflict:null,single:false,maybe:false};
  async function run(){
    let url=SB_REST+'/'+table+'?select='+encodeURIComponent(st.cols);
    for(const [k,v] of st.params) url+='&'+encodeURIComponent(k)+'='+encodeURIComponent(v);
    if(st.orders.length) url+='&order='+st.orders.map(encodeURIComponent).join(',');
    if(st.onConflict) url+='&on_conflict='+encodeURIComponent(st.onConflict);
    const headers={apikey:SB_KEY,Accept:'application/json',Authorization:'Bearer '+sbToken()};
    if(st.body!=null) headers['Content-Type']='application/json';
    if(st.prefer) headers.Prefer=st.prefer;
    let data=null, status=0;
    try{
      const r=await fetch(url,{method:st.method,headers,body:st.body!=null?JSON.stringify(st.body):undefined});
      status=r.status;
      const text=await r.text();
      try{ data=text?JSON.parse(text):null; }catch(e){ data=null; }
      if(!r.ok) return {data:null,error:{message:(data&&(data.message||data.msg))||('Request failed '+status),status,code:data&&data.code}};
    }catch(e){ return {data:null,error:{message:(e&&e.message)||'Network failed',status:0}}; }
    if(st.single) return (Array.isArray(data)&&data.length===1)
      ? {data:data[0],error:null} : {data:null,error:{message:'No row'}};
    if(st.maybe) return (!Array.isArray(data)||data.length<=1)
      ? {data:(Array.isArray(data)?data[0]:data)||null,error:null} : {data:null,error:{message:'Many rows'}};
    return {data,error:null};
  }
  const b={
    select(c){ if(c) st.cols=c; return b; },
    eq(k,v){ st.params.push([k,'eq.'+v]); return b; },
    order(k){ st.orders.push(k); return b; },
    insert(rows){ st.method='POST'; st.body=rows; st.prefer='return=representation'; return b; },
    update(obj){ st.method='PATCH'; st.body=obj; st.prefer='return=representation'; return b; },
    delete(){ st.method='DELETE'; return b; },
    upsert(rows,o){ st.method='POST'; st.body=rows; st.prefer='resolution=merge-duplicates,return=representation'; if(o&&o.onConflict) st.onConflict=o.onConflict; return b; },
    single(){ st.single=true; return run(); },
    maybeSingle(){ st.maybe=true; return run(); },
    then(res,rej){ return run().then(res,rej); }
  };
  return b;
}
const SB_REST=SB_URL+'/rest/v1';
const SB_AUTH=SB_URL+'/auth/v1';

function persistSession(s){
  sbSession={access_token:s.access_token,refresh_token:s.refresh_token,user:s.user};
  try{ localStorage.setItem('op-session',JSON.stringify(sbSession)); }catch(e){}
}
function fireAuth(ev,session){ authSubs.forEach(cb=>{ try{ cb(ev,session); }catch(e){} }); }
function setSession(s){
  persistSession(s);
  fireAuth('SIGNED_IN',{user:s.user});
}
function clearSession(){
  sbSession=null;
  try{ localStorage.removeItem('op-session'); }catch(e){}
  fireAuth('SIGNED_OUT',null);
}
async function restoreSession(){
  let stored=null;
  try{ stored=JSON.parse(localStorage.getItem('op-session')||'null'); }catch(e){}
  if(stored&&stored.access_token){
    sbSession=stored;
    try{
      const r=await fetch(SB_AUTH+'/user',{headers:{apikey:SB_KEY,Authorization:'Bearer '+stored.access_token}});
      if(r.ok){ authRestored=true; return; }
      if(r.status===401&&stored.refresh_token){
        const rr=await fetch(SB_AUTH+'/token?grant_type=refresh_token',{method:'POST',headers:{apikey:SB_KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:stored.refresh_token})});
        const data=await rr.json().catch(()=>null);
        if(rr.ok&&data&&data.access_token){ persistSession(data); authRestored=true; return; }
      }
    }catch(e){}
    sbSession=null;
    try{ localStorage.removeItem('op-session'); }catch(e){}
  }
  authRestored=true;
}
const auth={
  async signUp({email,password}){
    const r=await fetch(SB_AUTH+'/signup',{method:'POST',headers:{apikey:SB_KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
    const data=await r.json().catch(()=>null);
    if(!r.ok) throw new Error((data&&(data.msg||data.message||data.error_description))||('Signup failed '+r.status));
    const session=(data&&(data.session||(data.access_token?data:null)))||null;
    if(session) setSession(session);
    return {data:{user:(session&&session.user)||(data&&data.user)||null,session},error:null};
  },
  async signInWithPassword({email,password}){
    const r=await fetch(SB_AUTH+'/token?grant_type=password',{method:'POST',headers:{apikey:SB_KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
    const data=await r.json().catch(()=>null);
    if(!r.ok) throw new Error((data&&(data.msg||data.message||data.error_description))||('Login failed '+r.status));
    setSession(data);
    return {data:{user:data.user,session:data},error:null};
  },
  async signOut(){
    if(sbSession){
      try{ await fetch(SB_AUTH+'/logout',{method:'POST',headers:{apikey:SB_KEY,Authorization:'Bearer '+sbSession.access_token}}); }catch(e){}
    }
    clearSession();
    return {error:null};
  },
  onAuthStateChange(cb){
    const sub={unsubscribe(){ authSubs=authSubs.filter(f=>f!==cb); }};
    authSubs.push(cb);
    if(authRestored&&initialFlushed) setTimeout(()=>{ if(authSubs.includes(cb)){ try{ cb('INITIAL_SESSION',sbSession?{user:sbSession.user}:null); }catch(e){} } },0);
    return {data:{subscription:sub}};
  }
};
const sb={from,auth};
restoreSession().then(()=>{
  initialFlushed=true;
  fireAuth('INITIAL_SESSION',sbSession?{user:sbSession.user}:null);
});

function lockDays(){
  if(!profile||!profile.crew_locked_until) return 0;
  const ms=new Date(profile.crew_locked_until).getTime()-Date.now();
  return ms>0?Math.ceil(ms/864e5):0;
}
function renderLock(){
  const el=$('#crewLock'); if(!el) return;
  const d=(user&&profile&&profile.crew)?lockDays():0;
  el.textContent=d>0?` · switchable in ${d} ${d===1?'day':'days'}`:'';
}
async function persistCrew(next){
  if(!sb||!user) return;
  const until=new Date(Date.now()+30*864e5).toISOString();
  try{
    await sbq(sb.from('profiles').update({crew:next,crew_locked_until:until}).eq('id',user.id));
    profile.crew=next; profile.crew_locked_until=until; renderLock();
  }catch(e){ cloudFail(); }
}
async function cloudSaveBerries(){
  if(!sb||!user) return;
  try{ await sbq(sb.from('profiles').update({lifetime_berries:completed}).eq('id',user.id)); }
  catch(e){ cloudFail(); }
}
async function cloudSaveHistory(){
  if(!sb||!user) return;
  try{
    const k=dayKey(new Date());
    await sbq(sb.from('history').upsert({user_id:user.id,day:k,count:history[k]||0},{onConflict:'user_id,day'}));
  }catch(e){ cloudFail(); }
}
async function cloudSaveTasks(){
  if(!sb||!user) return;
  try{
    await sbq(sb.from('tasks').delete().eq('user_id',user.id));
    if(tasks.length) await sbq(sb.from('tasks').insert(tasks.map((t,i)=>({user_id:user.id,text:t.text,done:!!t.done,position:i}))));
  }catch(e){ cloudFail(); }
}
async function migrateIfFresh(){
  if(!profile) return;
  const fresh=(Date.now()-new Date(profile.created_at).getTime())<10*60e3;
  let done=false;
  try{ done=!!localStorage.getItem('op-migrated-'+user.id); }catch(e){}
  if(!fresh||done) return;
  const rows=Object.entries(history).filter(([,n])=>n>0).map(([day,count])=>({user_id:user.id,day,count}));
  if(rows.length) await sbq(sb.from('history').upsert(rows,{onConflict:'user_id,day'}));
  if(tasks.length) await sbq(sb.from('tasks').insert(tasks.map((t,i)=>({user_id:user.id,text:t.text,done:!!t.done,position:i}))));
  const berries=parseInt(localStorage.getItem('op-completed')||'0',10)||0;
  if(berries>0) await sbq(sb.from('profiles').update({lifetime_berries:berries}).eq('id',user.id));
  profile.lifetime_berries=berries;
  try{ localStorage.setItem('op-migrated-'+user.id,'1'); }catch(e){}
  if(rows.length||tasks.length||berries>0) showToast('Local voyages moved aboard your account.');
}
async function loadCloud(){
  const prof=await sbq(sb.from('profiles').select('*').eq('id',user.id).maybeSingle());
  if(!prof){
    const fb=(user.email||'').split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g,'').slice(0,20);
    const uname=(pendingUsername&&USER_RE.test(pendingUsername))?pendingUsername:(USER_RE.test(fb)?fb:'sailor');
    try{
      profile=await sbq(sb.from('profiles').insert({id:user.id,username:uname}).select().single());
    }catch(err){
      if(err&&(err.code==='23505'||err.status===409)){
        profile=await sbq(sb.from('profiles').insert({id:user.id,username:null}).select().single());
        showToast('That name was taken — pick yours with the ✎ button.');
      }else throw err;
    }
  }else profile=prof;
  pendingUsername='';
  await migrateIfFresh();
  const hist=await sbq(sb.from('history').select('day,count').eq('user_id',user.id));
  history={}; (hist||[]).forEach(r=>{ history[r.day]=r.count; }); saveHistoryLocal();
  completed=profile.lifetime_berries||0;
  try{ localStorage.setItem('op-completed',String(completed)); }catch(e){}
  const trows=await sbq(sb.from('tasks').select('text,done').eq('user_id',user.id).order('position').order('created_at'));
  tasks=(trows||[]).map(r=>({text:r.text,done:!!r.done})); saveTasksLocal();
  if(profile.crew&&CREWS[profile.crew]){
    crew=profile.crew;
    try{ localStorage.setItem('op-crew',crew); }catch(e){}
  }
  renderTasks(); suppressPick=true; applyCrew(crew,false); suppressPick=false; renderHeatmap(); paint(); setAccountUI();
  if(!profile.crew) showToast('Pick your crewmate — once! Your choice locks for 30 days.');
}
function saveHistoryLocal(){ try{ localStorage.setItem('op-history',JSON.stringify(history)); }catch(e){} }
function saveTasksLocal(){ try{ localStorage.setItem('op-tasks',JSON.stringify(tasks)); }catch(e){} }

function setAccountUI(){
  const btn=$('#accountBtn'); if(!btn) return;
  if(user){
    btn.textContent=accountName();
    const w=$('#authName'); if(w) w.textContent=accountName();
    const er=$('#authEditRow'); if(er) er.hidden=true;
  }else{
    btn.textContent='Log in';
  }
}
const USER_RE=/^[A-Za-z0-9_]{3,20}$/;
let authMode='in', pendingUsername='';
function accountName(){
  if(profile&&profile.username) return profile.username;
  if(user&&user.email) return user.email.split('@')[0];
  return 'sailor';
}
function setAuthMode(m){
  authMode=(m==='up')?'up':'in';
  const ti=$('#authTabIn'), tu=$('#authTabUp'), uf=$('#authUser'), go=$('#authGo');
  if(ti) ti.setAttribute('aria-selected',authMode==='in'?'true':'false');
  if(tu) tu.setAttribute('aria-selected',authMode==='up'?'true':'false');
  if(uf) uf.hidden=authMode!=='up';
  if(go) go.textContent=authMode==='up'?'Sign up':'Log in';
}
const EYE_OPEN='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_SHUT='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
function resetAuthEye(){
  const p=$('#authPass'), b=$('#authEye');
  if(p) p.type='password';
  if(b){ b.innerHTML=EYE_OPEN; b.setAttribute('aria-pressed','false'); b.setAttribute('aria-label','Show password'); b.title='Show password'; }
}
function openAuth(){ const d=$('#authDialog'); if(!d) return; const e=$('#authErr'); if(e) e.textContent=''; resetAuthEye(); setAccountUI(); showAuthView(user?'out':'form'); d.hidden=false; }
function closeAuth(){ const d=$('#authDialog'); if(d) d.hidden=true; }
function stampPromo(){ try{ localStorage.setItem('op-promo-day',dayKey(new Date())); }catch(e){} }
function promoDue(){
  if(user||parseRecoveryLink()) return false;
  let last='';
  try{ last=localStorage.getItem('op-promo-day')||''; }catch(e){}
  return last!==dayKey(new Date());
}
function showPromo(){
  if(!promoDue()) return;
  const m=$('#promoModal'); if(m) m.hidden=false;
}
function hidePromo(){ const m=$('#promoModal'); if(m) m.hidden=true; }
function maybePromo(){
  if(!promoDue()) return;
  setTimeout(()=>{ showPromo(); },2000);
}
function showAuthView(which){
  const form=$('#authForm'), rec=$('#authRecover'), rst=$('#authResetView'), out=$('#authOut');
  if(form) form.hidden=which!=='form';
  if(rec) rec.hidden=which!=='recover';
  if(rst) rst.hidden=which!=='reset';
  if(out) out.hidden=which!=='out';
  if(which==='form') setAuthMode(authMode);
}
async function authGo(){
  const mode=authMode;
  const em=($('#authEmail')||{}).value||'', pw=($('#authPass')||{}).value||'';
  const e=$('#authErr'); const fail=m=>{ if(e) e.textContent=m; };
  if(!em.trim()||!pw){ fail('Enter email and password.'); return; }
  if(mode==='up'){
    const uname=(($('#authUser')||{}).value||'').trim().toLowerCase();
    if(uname&&!USER_RE.test(uname)){ fail('Username: 3-20 letters, numbers, underscores.'); return; }
    pendingUsername=uname;
  }
  if(!sb){ fail('Cloud library failed to load — check connection and reload.'); return; }
  const go=$('#authGo'); if(go){ go.disabled=true; go.textContent='Setting sail…'; }
  try{
    const call=mode==='up'
      ? sb.auth.signUp({email:em.trim(),password:pw})
      : sb.auth.signInWithPassword({email:em.trim(),password:pw});
    const {data,error}=await call;
    if(error) throw error;
    if(mode==='up'&&!data.session){ closeAuth(); showToast('Account created — confirm via email, then log in.'); return; }
  }catch(err){ fail((err&&err.message)||'Login failed.'); }
  finally{ setAuthMode(authMode); }
}
function openNameEdit(){
  const r=$('#authEditRow'), i=$('#authEditInput');
  if(!r||!i) return;
  i.value=(profile&&profile.username)||'';
  r.hidden=false; i.focus();
}
function closeNameEdit(){ const r=$('#authEditRow'); if(r) r.hidden=true; }
async function saveNameEdit(){
  const i=$('#authEditInput');
  const v=((i&&i.value)||'').trim().toLowerCase();
  const e=$('#authErr'); const fail=m=>{ if(e) e.textContent=m; };
  if(!USER_RE.test(v)){ fail('Username: 3-20 letters, numbers, underscores.'); return; }
  if(!sb||!user){ fail('Log in first.'); return; }
  try{
    await sbq(sb.from('profiles').update({username:v}).eq('id',user.id));
    profile.username=v; setAccountUI(); closeNameEdit();
    showToast(`Sailing as ${v}.`);
  }catch(err){
    if(err&&(err.code==='23505'||err.status===409)) fail('Username already taken — try another.');
    else fail((err&&err.message)||'Could not save username.');
  }
}
function clearAuthFields(){
  const em=$('#authEmail'), pw=$('#authPass'), un=$('#authUser'), re=$('#authRecEmail'), np=$('#authNewPass');
  if(em) em.value=''; if(pw) pw.value=''; if(un) un.value=''; if(re) re.value=''; if(np) np.value='';
}
async function requestRecovery(){
  const em=(($('#authRecEmail')||{}).value||'').trim();
  const e=$('#authRecErr'); const fail=m=>{ if(e) e.textContent=m; };
  if(!em){ fail('Enter your email first.'); return; }
  const go=$('#authRecGo'); if(go){ go.disabled=true; go.textContent='Sending…'; }
  try{
    const r=await fetch(SB_AUTH+'/recover?redirect_to='+encodeURIComponent('https://bachirabdessamed.github.io/straw-hat-timer/'),{method:'POST',headers:{apikey:SB_KEY,'Content-Type':'application/json'},body:JSON.stringify({email:em})});
    if(!r.ok){
      const data=await r.json().catch(()=>null);
      if(r.status===429) throw new Error('Too many requests — wait a minute and retry.');
      throw new Error((data&&(data.msg||data.message||data.error_description))||('Request failed '+r.status));
    }
    showToast('Check your email for the reset link.');
    showAuthView('form');
  }catch(err){ fail((err&&err.message)||'Could not send reset link.'); }
  finally{ if(go){ go.disabled=false; go.textContent='Send Reset Link'; } }
}
function parseRecoveryLink(){
  try{
    const h=(location.hash||'').replace(/^#/,'');
    const hp=new URLSearchParams(h);
    if(hp.get('type')==='recovery'&&hp.get('access_token')) return {session:{access_token:hp.get('access_token'),refresh_token:hp.get('refresh_token'),user:null}};
    const q=new URLSearchParams(location.search||'');
    if(q.get('type')==='recovery'&&q.get('token_hash')) return {tokenHash:q.get('token_hash')};
  }catch(e){}
  return null;
}
function cleanRecoveryUrl(){
  try{ history.replaceState(null,'',location.pathname+location.search.replace(/[?&]token_hash=[^&]*(&type=[^&]*)?/,'').replace(/^&/,'?')); }catch(e){}
  try{ if(location.hash) history.replaceState(null,'',location.pathname+location.search); }catch(e){}
}
async function enterRecoverySession(found){
  recoveryActive=true;
  try{
    let session=found.session||null;
    if(!session&&found.tokenHash){
      const r=await fetch(SB_AUTH+'/verify',{method:'POST',headers:{apikey:SB_KEY,'Content-Type':'application/json'},body:JSON.stringify({token_hash:found.tokenHash,type:'recovery'})});
      const data=await r.json().catch(()=>null);
      if(!r.ok||!data||!data.access_token) throw new Error('expired');
      session=data;
    }
    if(!session||!session.access_token) throw new Error('expired');
    if(!session.user){
      const r=await fetch(SB_AUTH+'/user',{headers:{apikey:SB_KEY,Authorization:'Bearer '+session.access_token}});
      const data=await r.json().catch(()=>null);
      if(!r.ok||!data||!data.id) throw new Error('expired');
      session={access_token:session.access_token,refresh_token:session.refresh_token,user:data};
    }
    setSession(session);
    cleanRecoveryUrl();
    openAuthReset();
  }catch(e){
    recoveryActive=false;
    cleanRecoveryUrl();
    openAuth(); showAuthView('form');
    const er=$('#authErr'); if(er) er.textContent='Reset link expired — request a fresh one.';
  }
}
function openAuthReset(){
  const d=$('#authDialog'); if(!d) return;
  setAccountUI(); showAuthView('reset'); d.hidden=false;
  const np=$('#authNewPass'); if(np) np.focus();
}
async function saveNewPassword(){
  const np=$('#authNewPass');
  const v=(np&&np.value||'');
  const e=$('#authResetErr'); const fail=m=>{ if(e) e.textContent=m; };
  if(!v||v.length<6){ fail('Password needs at least 6 characters.'); return; }
  if(!sbSession){ fail('Session expired — request a fresh link.'); return; }
  const go=$('#authSavePass'); if(go){ go.disabled=true; go.textContent='Saving…'; }
  try{
    const r=await fetch(SB_AUTH+'/user',{method:'PUT',headers:{apikey:SB_KEY,'Content-Type':'application/json',Authorization:'Bearer '+sbSession.access_token},body:JSON.stringify({password:v})});
    const data=await r.json().catch(()=>null);
    if(!r.ok) throw new Error((data&&(data.msg||data.message))||('Save failed '+r.status));
    if(np) np.value='';
    recoveryActive=false;
    closeAuth(); showToast('Password updated — you are logged in.');
  }catch(err){ fail((err&&err.message)||'Could not save password.'); }
  finally{ if(go){ go.disabled=false; go.textContent='Save New Password'; } }
}
if(sb){
  const ab=$('#accountBtn'); if(ab) ab.addEventListener('click',openAuth);
  const ac=$('#authClose'); if(ac) ac.addEventListener('click',closeAuth);
  const ti=$('#authTabIn'); if(ti) ti.addEventListener('click',()=>setAuthMode('in'));
  const tu=$('#authTabUp'); if(tu) tu.addEventListener('click',()=>setAuthMode('up'));
  const go=$('#authGo'); if(go) go.addEventListener('click',()=>authGo());
  const eye=$('#authEye');
  if(eye) eye.addEventListener('click',()=>{
    const p=$('#authPass'); if(!p) return;
    const show=p.type==='password';
    p.type=show?'text':'password';
    eye.innerHTML=show?EYE_SHUT:EYE_OPEN;
    eye.setAttribute('aria-pressed',show?'true':'false');
    eye.setAttribute('aria-label',show?'Hide password':'Show password');
    eye.title=show?'Hide password':'Show password';
  });
  const ae=$('#authEdit'); if(ae) ae.addEventListener('click',openNameEdit);
  const asv=$('#authEditSave'); if(asv) asv.addEventListener('click',saveNameEdit);
  const acn=$('#authEditCancel'); if(acn) acn.addEventListener('click',closeNameEdit);
  const ao=$('#authOutBtn');
  if(ao) ao.addEventListener('click',async()=>{ try{ await sb.auth.signOut(); }catch(e){} });
  const af=$('#authForgot'); if(af) af.addEventListener('click',()=>{ const e=$('#authRecErr'); if(e) e.textContent=''; showAuthView('recover'); });
  const abl=$('#authBackLogin'); if(abl) abl.addEventListener('click',()=>showAuthView('form'));
  const arg=$('#authRecGo'); if(arg) arg.addEventListener('click',requestRecovery);
  const asp=$('#authSavePass'); if(asp) asp.addEventListener('click',saveNewPassword);
  const ps=$('#promoSignup');
  if(ps) ps.addEventListener('click',()=>{ stampPromo(); hidePromo(); openAuth(); setAuthMode('up'); });
  const pl=$('#promoLater');
  if(pl) pl.addEventListener('click',()=>{ stampPromo(); hidePromo(); });
  const dlg=$('#authDialog');
  if(dlg) dlg.addEventListener('click',ev=>{ if(ev.target===dlg) closeAuth(); });
  setAccountUI();
  const rec=parseRecoveryLink();
  if(rec) enterRecoverySession(rec);
  maybePromo();
  sb.auth.onAuthStateChange(async(ev,session)=>{
    const prev=user;
    user=(session&&session.user)||null; profile=null;
    if(user){
      closeAuth(); hidePromo(); clearAuthFields(); setAccountUI();
      try{ await loadCloud(); showToast('Welcome aboard, sailor.'); }
      catch(err){ showToast('Cloud unreachable — sailing locally.'); }
    }else{ setAccountUI(); if(!recoveryActive) showAuthView('form'); renderLock(); paint(); if(prev) showToast('Signed out — local copy kept.'); }
  });
}else{
  const ab=$('#accountBtn');
  if(ab) ab.addEventListener('click',()=>showToast('Accounts need a connection — sailing as guest.'));
}
