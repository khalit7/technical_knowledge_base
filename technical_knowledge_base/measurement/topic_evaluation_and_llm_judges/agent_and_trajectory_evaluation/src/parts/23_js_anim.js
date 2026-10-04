// Reading, rd-anim: one real tau2-bench trial stepped through, graded three ways at every step.
// Data: window.ATJ.cases (src/inputs/tau2_cases.json). Final verdicts are the recorded ones (message judge, action checks)
// and the database diff computed with tau2's environment; mid-run state verdicts compare the writes made so far with the gold writes.
(function(){
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const clip=(s,n)=>{s=String(s).replace(/\*\*/g,'');return s.length>n?s.slice(0,n)+' ...':s};
const J=o=>JSON.stringify(o);
const D=window.ATJ;if(!D||!$('an'))return;
const ORDER=[['gpt52/29/1','GPT-5.2, task 29, trial 1: "All set", database wrong'],['gpt52/0/3','GPT-5.2, task 0, trial 3: transfers instead of refusing'],['gpt52/12/1','GPT-5.2, task 12, trial 1: right state, a gold step skipped'],['gpt52/31/1','GPT-5.2, task 31, trial 1: happy user, gold says no change'],['opus45/29/2','Claude Opus 4.5, task 29, trial 2: all three agree']];
const NOTES={
 'gpt52/29/1':[['Insurance on the new booking','The simulated user asks for insurance and a gift card. The task instructions mention neither; the gold booking assumes no insurance and one card payment.'],['All set','The final message claims success. A grader that reads only this would pass the trial.']],
 'gpt52/0/3':[['TRANSFERRED','Instead of refusing, the agent hands the customer to a human. No write happens, so the database still matches the gold "no change".']],
 'gpt52/12/1':[['update_reservation_baggages','The one write matches the gold exactly. The gold path also called calculate for the fare; the agent never did, so the strict step check fails one read-only action.']],
 'gpt52/31/1':[['update_reservation_flights','The agent upgrades basic economy to economy and moves the flight in one write. The user wanted exactly this; the gold end state is "no change".'],['exactly what I needed','The user is satisfied. The outcome check still fails: the gold expected the change to be declined.']],
 'opus45/29/2':[['do not','Here the agent proposed no insurance and the card on file, and the user accepted: this is the gold booking.']]};
let key=ORDER[0][0],i=0,lens='all',playing=false,timer=null,onScreen=true;
const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const sel=$('an-case');ORDER.forEach(([k,l])=>{const o=document.createElement('option');o.value=k;o.textContent=l;sel.appendChild(o)});
function C(){return D.cases[key]}
function goldWrites(c){const W=new Set(['book_reservation','cancel_reservation','update_reservation_flights','update_reservation_passengers','update_reservation_baggages','send_certificate']);return c.gold.filter(g=>W.has(g.n))}
function same(a,b){return a.n===b.n&&J(sortObj(a.a))===J(sortObj(b.a))}
function sortObj(x){if(Array.isArray(x))return x.map(sortObj);if(x&&typeof x==='object'){const o={};Object.keys(x).sort().forEach(k=>o[k]=sortObj(x[k]));return o}return x}
function state(c,upto){ // what each grader can say after steps[0..upto]
  const calls=[],msgs=[];c.steps.slice(0,upto+1).forEach(s=>{if(s.k==='call')calls.push(s);else msgs.push(s)});
  const writes=calls.filter(s=>s.w);const gw=goldWrites(c);
  const matchedW=gw.filter(g=>writes.some(w=>same(w,g))).length;const extraW=writes.filter(w=>!gw.some(g=>same(w,g))).length;
  const goldAll=c.gold.map(g=>calls.some(s=>same(s,g))?'ok':(calls.some(s=>s.n===g.n)?'arg':'no'));
  const lastA=[...msgs].reverse().find(m=>m.r==='assistant');
  return {calls:calls.length,writes:writes.length,matchedW,extraW,gw:gw.length,goldAll,lastA,end:upto===c.steps.length-1};
}
function vd(p,t){return p===null?'<span class="vd u">'+(t||'not yet')+'</span>':p?'<span class="vd p">pass</span>':'<span class="vd f">fail</span>'}
function render(){
  const c=C(),n=c.steps.length;i=Math.max(0,Math.min(i,n-1));const S=state(c,i);
  // timeline
  $('an-tl').innerHTML=c.steps.map((s,j)=>{
    let cls='st'+(j<=i?' seen':'')+(j===i?' cur':'');
    if(lens==='msg'&&s.k==='call')cls+=' hid';
    if(lens==='state'&&(s.k==='msg'||!s.w))cls+=' hid';
    if(lens==='steps'&&s.k==='msg')cls+=' hid';
    if(s.k==='msg')return '<div class="'+cls+'" data-j="'+j+'"><div class="ic">'+(s.r==='user'?'U':'A')+'</div><div class="bd"><span class="who">'+(s.r==='user'?'simulated user':'agent')+'</span> '+esc(clip(s.t,lens==='msg'?600:260))+'</div></div>';
    const ic=s.st==='gold'?'<span class="ok">&#10003;</span>':s.st==='name'?'<span class="no">&#8776;</span>':'<span class="na">+</span>';
    return '<div class="'+cls+(s.w?' w':'')+'" data-j="'+j+'"><div class="ic">'+ic+'</div><div class="bd"><span class="who">'+(s.w?'write':'read')+' call</span> <code>'+esc(s.n)+'</code> <code>'+esc(clip(J(s.a),lens==='steps'||s.w?420:140))+'</code></div></div>';
  }).join('');
  const cur=$('an-tl').querySelector('.cur');if(cur&&onScreen){const tl=$('an-tl');tl.scrollTop=Math.max(0,cur.offsetTop-tl.offsetTop-tl.clientHeight/2)}
  // message grader
  const nlAll=c.nl.length?c.nl.every(x=>x.met):null;
  let mh='<h4>Message grader</h4><div class="vrow">Reading only the last agent message'+(S.lastA?':':' <span class="na">(none yet)</span>')+'</div>';
  if(S.lastA)mh+='<div class="why">"'+esc(clip(S.lastA.t,200))+'"</div>';
  mh+='<div class="vrow">τ²-bench transcript judge '+(S.end?vd(nlAll):vd(null,'after the run'))+'</div>';
  if(S.end)mh+='<div class="why">'+c.nl.map(x=>(x.met?'<span class="ok">&#10003;</span> ':'<span class="no">&#10007;</span> ')+esc(x.a)).join('<br>')+'</div>';
  $('an-g-msg').innerHTML=mh;
  // state grader
  let sp=S.end?c.db:(S.matchedW===S.gw&&S.extraW===0);
  let sh='<h4>Final-state grader</h4><div class="vrow">'+(S.end?'Database equals the gold database':'If the run stopped here (writes so far against gold writes)')+' '+vd(sp)+'</div>';
  sh+='<div class="why">Writes so far '+S.writes+' · gold writes matched '+S.matchedW+' of '+S.gw+' · unexpected writes '+S.extraW+'</div>';
  if(S.end&&c.diff.length){sh+='<table class="dtab"><tr><th>field</th><th>gold</th><th>agent</th></tr>'+c.diff.slice(0,8).map(d=>'<tr><td>'+esc(d[0].replace(/^reservations\./,'res. ').replace(/^users\./,'user '))+'</td><td class="g">'+esc(d[2]===null?'(none)':d[2])+'</td><td class="b">'+esc(d[3]===null?'(none)':d[3])+'</td></tr>').join('')+'</table>'+(c.diff.length>8?'<div class="why">and '+(c.diff.length-8)+' more fields</div>':'')}
  if(S.end&&!c.diff.length)sh+='<div class="why">No field differs from the gold database.</div>';
  $('an-g-state').innerHTML=sh;
  // step grader
  const ok=S.goldAll.filter(x=>x==='ok').length;
  let th='<h4>Step grader (gold actions)</h4><div class="vrow">All gold actions done exactly '+vd(c.gold.length?(S.end?ok===c.gold.length:(ok===c.gold.length?true:null)):true,'so far '+ok+' of '+c.gold.length)+'</div>';
  th+='<div class="why">'+(c.gold.length?c.gold.map((g,k)=>({ok:'<span class="ok">&#10003;</span>',arg:'<span class="no">&#8776; arguments differ</span>',no:'<span class="na">&#9675;</span>'})[S.goldAll[k]]+' <code>'+esc(g.n)+'</code>').join('<br>'):'Gold actions: none (the right outcome is no change).')+'</div>';
  if(S.end&&c.ac.length)th+='<div class="why">τ²-bench recorded: '+c.ac.filter(x=>x.ok).length+' of '+c.ac.length+' gold actions matched (not part of the airline reward).</div>';
  $('an-g-steps').innerHTML=th;
  ['msg','state','steps'].forEach(l=>{$('an-g-'+l).style.opacity=(lens==='all'||lens===l)?1:.35});
  // counters
  $('an-cnt').innerHTML='<div><b>'+(i+1)+' / '+n+'</b>step</div><div><b>'+S.calls+'</b>tool calls</div><div><b>'+S.writes+'</b>writes</div><div><b>'+S.extraW+'</b>unexpected writes</div><div><b>$'+(c.cost||0).toFixed(3)+'</b>agent cost, whole trial</div>';
  // caption
  const s=c.steps[i];let cap='';
  const note=(NOTES[key]||[]).find(([f])=>(s.k==='msg'?s.t:s.n+J(s.a)).indexOf(f)>=0);
  if(s.k==='msg')cap=(s.r==='user'?'The simulated user speaks.':'The agent replies. Nothing changes in the world.');
  else cap='The agent calls <code>'+esc(s.n)+'</code>'+(s.w?', a write: the database changes.':', a read.')+(s.st==='gold'?' It matches a gold action exactly.':s.st==='name'?' Same tool as a gold action, different arguments.':' It is not in the gold path.');
  if(note)cap+=' <b>'+esc(note[1])+'</b>';
  if(S.end)cap+=' <b>End of trial.</b> Recorded reward '+c.reward+' (basis: '+c.basis.join(' and ')+').';
  $('an-cap').innerHTML=cap;
  $('an-scrub').max=n-1;$('an-scrub').value=i;
  $('an-src').innerHTML='Task '+esc(c.task)+' instructions to the simulated user: '+esc(clip(c.instr.reason_for_call+' '+(c.instr.task_instructions||''),1200));
  $('an-play').textContent=playing?'Pause':(i>=n-1?'Replay':'Play');
}
function tick(){if(!playing)return;const n=C().steps.length;if(i>=n-1){stop();return}i++;render();timer=setTimeout(tick,+$('an-speed').value)}
function stop(){playing=false;clearTimeout(timer);render()}
$('an-play').onclick=()=>{if(playing){stop();return}if(i>=C().steps.length-1)i=0;playing=true;render();timer=setTimeout(tick,reduce?2500:+$('an-speed').value)};
$('an-fwd').onclick=()=>{stop();i++;render()};$('an-back').onclick=()=>{stop();i--;render()};
$('an-scrub').oninput=e=>{stop();i=+e.target.value;render()};
sel.onchange=()=>{stop();key=sel.value;i=0;render()};
$('an-lens').querySelectorAll('button').forEach(b=>b.onclick=()=>{lens=b.dataset.l;$('an-lens').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));render()});
$('an-tl').addEventListener('click',e=>{const r=e.target.closest('.st');if(r){stop();i=+r.dataset.j;render()}});
if('IntersectionObserver' in window){new IntersectionObserver(es=>{onScreen=es[0].isIntersecting;if(!onScreen&&playing)stop()}).observe($('an'))}
document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing)stop()});
window.ATJ_ANIM={set:(k,j)=>{key=k;i=j;sel.value=k;render()},end:()=>{i=C().steps.length-1;render()}};
render();
})();
