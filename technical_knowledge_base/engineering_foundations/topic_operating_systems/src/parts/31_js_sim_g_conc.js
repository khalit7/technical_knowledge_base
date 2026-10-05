// ---- OS simulators, 4: the x86.py race (instruction by instruction), the real race, deadlock with two locks ----
(function(){
const SC=window.SIMCORE,A=window.SIMA,D=window.SIMDATA;if(!document.getElementById('sim-x86-card'))return;
const $=id=>document.getElementById(id);
$('sim-asm').textContent=D.raw.inc_asm.join('\n');
const CRIT={nolock:[0,1,2],tas:[4,5,6],atomic:[0]};
const X={prog:'nolock',loops:3,int:'3',sched:[]};let run=null,lines=[];
function srcLines(){// [{txt, pc or null}]
  const out=[];let pc=0;for(let l of SC.PROGS[X.prog].split('\n')){const t=l.trim();if(!t)continue;
    if(t.startsWith('.var')){out.push({txt:t,pc:null});continue}if(t.startsWith('.')){out.push({txt:t,pc:null});continue}out.push({txt:'  '+t.replace(/\s+/g,' '),pc:pc++})}return out}
function compute(keep){lines=srcLines();const me=X.int==='me';$('sim-x86-me').hidden=!me;
  if(me)run=SC.runX86(SC.PROGS[X.prog],X.loops,1,2,null,100000,X.sched);
  else run=SC.runX86(SC.PROGS[X.prog],X.loops,X.int==='r'?6:+X.int,2,X.int==='r'?1:null);
  an.reset(run.steps+1,me?run.steps:(keep?Math.min(an.i,run.steps):0));sweep()}
function draw(i){if(!run)return;// i = number of instructions executed
  const regs=[{ax:0,bx:X.loops},{ax:0,bx:X.loops}],last=[-1,-1];let count=0,mutex=0;
  for(let k=0;k<i;k++){const [t,pc]=run.trace[k],m=run.mems[k];regs[t]={ax:m.ax,bx:m.bx};last[t]=pc;count=m.count;if(m.mutex!=null)mutex=m.mutex}
  [0,1].forEach(t=>{$('sim-x86-c'+t).innerHTML=lines.map(l=>'<div class="'+(l.pc!=null&&l.pc===last[t]?'pc ':'')+(l.pc!=null&&CRIT[X.prog].indexOf(l.pc)>=0?'crit':'')+'">'+A.esc(l.txt)+'</div>').join('');
    $('sim-x86-r'+t).textContent='ax='+regs[t].ax+' bx='+regs[t].bx});
  let cap;if(i===0)cap='Both threads are ready; count = 0. Press play or step.';
  else{const [t,pc]=run.trace[i-1],ins=run.prog[pc],txt=ins[0]+' '+ins[1].join(', ');
    cap='Instruction '+i+': thread '+t+' runs <code>'+A.esc(txt)+'</code>';
    if(i>1&&run.trace[i-2][0]!==t)cap+=' <b>(switch: thread '+run.trace[i-2][0]+' was interrupted'+(CRIT[X.prog].indexOf(run.trace[i-2][1])>=0&&CRIT[X.prog].indexOf(run.trace[i-2][1])<CRIT[X.prog].length-1?' inside its critical section)':')')+'</b>';
    if(X.prog==='nolock'&&pc===0)cap+='; it loads count = '+run.mems[i-1].ax;
    if(X.prog==='nolock'&&pc===2)cap+='; it stores '+run.mems[i-1].ax+(run.mems[i-1].ax<=(i>=2?run.mems[i-2].count:0)?' over a count that was already '+run.mems[i-2].count+': an increment was lost':'');
    if(X.prog==='tas'&&pc===1)cap+='; xchg got '+run.mems[i-1].ax+(run.mems[i-1].ax?' back: the lock was taken, spin':' back: the lock was free, now held');
    cap+='.'}
  $('sim-x86-cap').innerHTML=cap;
  const fin=i>=run.steps&&run.done.every(x=>x);
  $('sim-x86-stats').innerHTML='<div class="stat"><div class="k">count now</div><div class="v">'+count+'</div><div class="d">expected at the end: '+run.expected+'</div></div>'+
    '<div class="stat"><div class="k">'+(fin?'Final result':'Instructions run')+'</div><div class="v">'+(fin?(run.count===run.expected?'correct':(run.expected-run.count)+' lost'):i+' / '+run.steps)+'</div><div class="d">'+(X.prog==='tas'&&mutex?'lock held':'')+'</div></div>'}
function sweep(){const el=$('sim-x86-sweep'),W=Math.max(290,Math.min(700,A.width(el))),ivs=[1,2,3,4,5,6,7,8,9,10,11,12],L=Math.max(X.loops,10),exp=2*L;
  const r=ivs.map(k=>SC.runX86(SC.PROGS[X.prog],L,k).count),x0=34,pw=W-x0-8,bw=pw/ivs.length,H=146,ph=84,yb=34;let o='';
  o+=A.T(x0,12,'Final count, '+L+' loops per thread, by interrupt interval',{fs:11,fill:'var(--mute)'});
  r.forEach((c,k)=>{const h=c/exp*ph,x=x0+k*bw;o+=A.R(x+2,yb+ph-h,bw-4,h,c===exp?'var(--good)':'var(--bad)')+A.T(x+bw/2,yb+ph-h-3,String(c),{a:'middle',fs:10})+A.T(x+bw/2,yb+ph+14,String(ivs[k]),{a:'middle',fs:10,fill:'var(--mute)'})});
  o+='<line x1="'+x0+'" x2="'+(x0+pw)+'" y1="'+yb+'" y2="'+yb+'" stroke="var(--mute)" stroke-dasharray="3 3"/>'+A.T(x0-4,yb+4,String(exp),{a:'end',fs:10,fill:'var(--mute)'})+A.T(x0+pw/2,H-2,'switch every k instructions',{a:'middle',fs:10,fill:'var(--mute)'});
  el.innerHTML=A.svg(W,H,o,'Final count against interrupt interval')}
const an=A.anim({card:'sim-x86-card',ctl:'sim-x86-ctl',n:2,draw,ms:450,label:'Instruction'});
A.seg($('sim-x86-prog'),m=>{X.prog=m;X.sched=[];compute()});
$('sim-x86-loops').addEventListener('change',e=>{X.loops=+e.target.value;X.sched=[];compute()});
$('sim-x86-int').addEventListener('change',e=>{X.int=e.target.value;X.sched=[];compute()});
[0,1].forEach(t=>$('sim-x86-t'+t).addEventListener('click',()=>{if(run&&run.done.every(x=>x))return;if(X.sched.length>4000)return;X.sched.push(t);compute()}));
$('sim-x86-undo').addEventListener('click',()=>{X.sched.pop();compute()});
$('sim-x86-clr').addEventListener('click',()=>{X.sched=[];compute()});
compute();an.go(run.steps);A.onResize(()=>sweep());
// real race
(function(){const parse=l=>{const m=l.match(/mode (\w+) N (\d+) expected (\d+) got (\d+) lost (\d+) ms ([\d.]+)/);return m?{mode:m[1],exp:+m[3],got:+m[4],lost:+m[5],ms:+m[6]}:null};
  let h='<div class="tw"><table class="sim-t"><tr><th>CPUs</th><th>Version</th><th class="num">Final count (of 20,000,000)</th><th class="num">Lost</th><th class="num">Time</th></tr>';
  [['race_2cpu','2'],['race_1cpu','1']].forEach(([k,c])=>D.raw[k].map(parse).filter(Boolean).forEach(r=>{h+='<tr><td>'+c+'</td><td>'+(r.mode==='none'?'no lock':r.mode)+'</td><td class="num">'+r.got.toLocaleString('en-US')+'</td><td class="num"'+(r.lost?' style="color:var(--bad);font-weight:600"':'')+'>'+r.lost.toLocaleString('en-US')+'</td><td class="num">'+r.ms+' ms</td></tr>'}));
  $('sim-race').innerHTML=h+'</table></div>';$('sim-race-raw').textContent=['# 2 CPUs (cpuset 1,2)'].concat(D.raw.race_2cpu,['# 1 CPU (cpuset 1)'],D.raw.race_1cpu).join('\n')})();
// deadlock
const DL={ord:false,pcs:[0,0],held:{A:null,B:null},log:[]};
const label=s=>s==='W'?'count = count + 1':s[0]==='L'?'lock('+s.slice(2)+')':'unlock('+s.slice(2)+')';
function dlStep(t){const P=SC.lockProgs(DL.ord);if(DL.pcs[t]>=5){DL.log.push('Thread '+(t+1)+' has finished.');return dlDraw()}
  if(!SC.canStep(P,t,DL.pcs,DL.held)){const s=P[t][DL.pcs[t]];DL.log.push('Thread '+(t+1)+' asks for lock '+s.slice(2)+', held by thread '+(DL.held[s.slice(2)]+1)+': it sleeps (on Linux, in futex).');return dlDraw()}
  const s=P[t][DL.pcs[t]];if(s[0]==='L')DL.held[s.slice(2)]=t;else if(s[0]==='U')DL.held[s.slice(2)]=null;DL.pcs[t]++;DL.log.push('Thread '+(t+1)+': '+label(s)+'.');dlDraw()}
function dlDraw(){const P=SC.lockProgs(DL.ord);
  [0,1].forEach(t=>{$('sim-dl-c'+t).innerHTML='<div><b>Thread '+(t+1)+'</b></div>'+P[t].map((s,k)=>'<div class="'+(k===DL.pcs[t]?'pc':'')+'">'+(k<DL.pcs[t]?'&#10003; ':'  ')+label(s)+'</div>').join('')+(DL.pcs[t]>=5?'<div>  (done)</div>':'')});
  const waits=[0,1].map(t=>{if(DL.pcs[t]>=5)return null;const s=P[t][DL.pcs[t]];return s[0]==='L'&&DL.held[s.slice(2)]!=null&&DL.held[s.slice(2)]!==t?s.slice(2):null});
  const dead=waits[0]&&waits[1],done=DL.pcs[0]>=5&&DL.pcs[1]>=5;
  const el=$('sim-dl-svg'),W=Math.min(420,Math.max(260,A.width(el))),H=150,tx=[W*0.18,W*0.82],ly=[30,120];let o='<defs><marker id="sim-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="context-stroke"/></marker></defs>';
  const lx=W/2,lp={A:[lx,ly[0]],B:[lx,ly[1]]},tp=[[tx[0],75],[tx[1],75]];
  ['A','B'].forEach(k=>{const h=DL.held[k];if(h!=null)o+='<line x1="'+lp[k][0]+'" y1="'+lp[k][1]+'" x2="'+(tp[h][0]+(h?-22:22))+'" y2="'+tp[h][1]+'" stroke="var(--good)" stroke-width="2" marker-end="url(#sim-ar)"/>'});
  [0,1].forEach(t=>{if(waits[t])o+='<line x1="'+(tp[t][0]+(t?-22:22))+'" y1="'+(tp[t][1]+(t?6:-6))+'" x2="'+(lp[waits[t]][0]+(t?16:-16))+'" y2="'+lp[waits[t]][1]+'" stroke="'+(dead?'var(--bad)':'var(--c5)')+'" stroke-width="2" stroke-dasharray="5 3" marker-end="url(#sim-ar)"/>'});
  ['A','B'].forEach(k=>{o+=A.R(lp[k][0]-16,lp[k][1]-13,32,26,'var(--soft)',{st:'var(--ink)',rx:4})+A.T(lp[k][0],lp[k][1]+4,'lock '+k,{a:'middle',fs:10})});
  [0,1].forEach(t=>{o+='<circle cx="'+tp[t][0]+'" cy="'+tp[t][1]+'" r="21" fill="var(--soft)" stroke="'+(dead?'var(--bad)':'var(--ink)')+'"/>'+A.T(tp[t][0],tp[t][1]+4,'thread '+(t+1),{a:'middle',fs:10})});
  o+=A.T(4,H-4,'solid: lock held by; dashed: waiting for',{fs:10,fill:'var(--mute)'});
  el.innerHTML=A.svg(W,H,o,'Who holds and who waits for each lock');
  $('sim-dl-cap').innerHTML=(DL.log.slice(-2).join(' ')||'Step the threads in any order you like.')+(dead?' <b style="color:var(--bad)">Deadlock: each thread waits for a lock the other holds; no step can ever run again.</b>':done?' <b style="color:var(--good)">Both finished.</b>':'');
  $('sim-dl-t0').disabled=dead||DL.pcs[0]>=5;$('sim-dl-t1').disabled=dead||DL.pcs[1]>=5;
  const c=SC.deadlockCount(DL.ord);$('sim-dl-count').textContent='Every possible schedule of these two threads, explored: '+(c.complete+c.deadlock)+' schedules, '+c.deadlock+' of them end in deadlock.'+(DL.ord?' With one lock order the cycle cannot form.':' A test that happens to run thread 1 to its second lock first never sees the bug.')}
A.seg($('sim-dl-mode'),m=>{DL.ord=m==='ord';DL.pcs=[0,0];DL.held={A:null,B:null};DL.log=[];dlDraw()});
$('sim-dl-t0').addEventListener('click',()=>dlStep(0));$('sim-dl-t1').addEventListener('click',()=>dlStep(1));
$('sim-dl-reset').addEventListener('click',()=>{DL.pcs=[0,0];DL.held={A:null,B:null};DL.log=[];dlDraw()});
dlDraw();A.onResize(dlDraw);
$('sim-dl-raw').textContent=D.raw.deadlock.join('\n');
})();
