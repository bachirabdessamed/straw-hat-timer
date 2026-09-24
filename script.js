const $ = s => document.querySelector(s);
const timeEl=$('#time'), ring=$('#ring'), mainBtn=$('#mainBtn'),
  modeLabel=$('#modeLabel'), roundEl=$('#round'), quoteEl=$('#quote'),
  voyageCount=$('#voyageCount'), toast=$('#toast');
const CIRC=2*Math.PI*88;
ring.style.strokeDasharray=CIRC;
let durations={focus:25*60,short:5*60,long:15*60};
let mode='focus', remaining=durations.focus, running=false, timerId=null;
let completed=0, cyclePos=0, soundOn=true;
let crew='luffy';
try{crew=localStorage.getItem('op-crew')||'luffy';}catch(e){}
const CREWS={
  luffy:{label:'Luffy',color:'#E5383B',img:'luffy.jpg',quotes:{
    focus:['“Kaizoku-ou ni ore wa naru!” — set sail when ready.','Eyes on the Grand Line. One task at a time.','Gear up. Full focus, no running.'],
    short:['Sunny break. Meat and water, then back.','Shishishi! Rest quick, adventure waits.'],
    long:['Big feast like after Arlong Park. You earned it.','Rest hard, dream big, Pirate King.']}},
  zoro:{label:'Zoro',color:'#2FBF71',img:'zoro.jpg',quotes:{
    focus:['Three swords, one task. Cut the distractions.','Nothing… nothing at all. Keep working.','A scar is proof of focus. Keep going.'],
    short:['One bottle of rest. Then back to training.','Even swords need sheathing sometimes.'],
    long:['Long rest. Meditate like after Thriller Bark.','Sleep now. Get lost later.']}},
  nami:{label:'Nami',color:'#FF9F1C',img:'nami.jpg',quotes:{
    focus:['No focus, no treasure. Chart this task.','Map it out. One island at a time.','100 million berries starts with 25 minutes.'],
    short:['Log the course. Check the Log Pose.','Tangerine break. Count your berries.'],
    long:['Shopping rest on Cocoyasi. You earned it.','Long rest — weather is clear and sunny.']}},
  sanji:{label:'Sanji',color:'#58A6FF',img:'sanji.jpg',quotes:{
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
function finishSession(){
  pause();beep();
  if(mode==='focus'){completed++;try{localStorage.setItem('op-completed',String(completed));}catch(e){}cyclePos++;
    if(cyclePos>=4){cyclePos=0;setMode('long',true);showToast('Four voyages done. Long rest — feast time.');}
    else{setMode('short',true);showToast('Voyage complete. Berry earned. Take a short rest.');}
  }else if(mode==='short'){setMode('focus',true);showToast('Rest over. Back to the Grand Line.');}
  else{setMode('focus',true);showToast('Rested crew is strong crew. Next voyage.');}
  mainBtn.textContent='Set sail';paint();
}
mainBtn.addEventListener('click',()=>running?pause():start());
$('#skipBtn').addEventListener('click',()=>finishSession());
$('#resetBtn').addEventListener('click',()=>{remaining=durations[mode];pause();mainBtn.textContent='Set sail';paint();});
$('#soundBtn').addEventListener('click',e=>{soundOn=!soundOn;e.target.textContent=soundOn?'Sound on':'Sound off';});
document.querySelectorAll('.modes button').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode,true)));
[['#inFocus','focus',1,90],['#inShort','short',1,30],['#inLong','long',5,60]].forEach(([sel,key,lo,hi])=>{
  $(sel).addEventListener('change',e=>{
    let v=Math.max(lo,Math.min(hi,parseInt(e.target.value||'25',10)));
    e.target.value=v;durations[key]=v*60;
    if(mode===key&&!running)remaining=durations[key];
    paint();
  });
});
window.addEventListener('keydown',e=>{
  if(e.code==='Space'&&!/INPUT|TEXTAREA/.test(document.activeElement.tagName)){e.preventDefault();running?pause():start();}
});
let tasks=[];
try{tasks=JSON.parse(localStorage.getItem('op-tasks')||'[]');completed=parseInt(localStorage.getItem('op-completed')||'0',10)||0;}catch(e){}
function saveTasks(){try{localStorage.setItem('op-tasks',JSON.stringify(tasks));}catch(e){}}
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
  crew=next;
  try{localStorage.setItem('op-crew',crew);}catch(e){}
  document.body.dataset.crew=crew;
  document.querySelectorAll('.crew-btn').forEach(b=>b.setAttribute('aria-pressed',b.dataset.crew===crew?'true':'false'));
  $('#crewName').textContent=CREWS[crew].label;
  setScene(CREWS[crew].img);
  const q=CREWS[crew].quotes[mode];
  quoteEl.textContent=q[Math.floor(Math.random()*q.length)];
  if(announce)showToast(`Sailing with ${CREWS[crew].label}.`);
  paint();renderTasks();
}
document.querySelectorAll('.crew-btn').forEach(b=>b.addEventListener('click',()=>applyCrew(b.dataset.crew,true)));
['luffy','zoro','nami','sanji'].forEach(k=>{ try{ const p=new Image(); p.src=CREWS[k].img; }catch(e){} });
renderTasks();applyCrew(crew,false);
