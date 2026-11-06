// ---- Scene: Fig. 2, the same 450 XSTest conversations through classifier rails outside the model, or a guardrail system prompt inside it (renderer v2).
// Every box is one conversation (safe prompts in the front block, unsafe at the back), coloured by what the user received; a conversation a rail
// blocked rises to that rail's glass plate (input rail blue, output rail purple). Driven by GR.outcome on the released human labels and this
// page's Qwen3Guard-Gen-0.6B runs (23_js_core.js), the counts checked by src/recompute.py. Two modes, each with its own step list. ----
(function(){
  if(!document.getElementById('stg-pa'))return;const {mix,lerp}=S3;
  const X=GR.X,safe=X.filter(x=>!x.unsafe),uns=X.filter(x=>x.unsafe),COLS=25,CS=.2,BW=.15;
  const MODES={out:{list:'sx-pa-out',steps:[{},{inp:'loose'},{inp:'loose',out:'loose'},{inp:'strict',out:'strict'}]},
               sys:{list:'sx-pa-sys',steps:[{},{sys:true},{sys:true,cmp:true}]}};
  let mode='out';
  // positions: safe prompts in the front block (10 rows), unsafe at the back (8 rows), 25 columns each
  const POS=[];safe.forEach((x,i)=>POS.push([x,(i%COLS-(COLS-1)/2)*CS,.45+Math.floor(i/COLS)*CS]));
  uns.forEach((x,i)=>POS.push([x,(i%COLS-(COLS-1)/2)*CS,-2.05+Math.floor(i/COLS)*CS]));
  const Y={in:1.0,out:1.85};
  function state(x,cfg){const o=GR.outcome(x,cfg);if(o.st==='in'||o.st==='inpi')return 'in';if(o.st==='out')return 'out';
    if(o.res==='answer')return x.unsafe?'harm':'answer';return o.res==='partial'?'partial':'refused'}
  const cfgAt=(m,k)=>{const s=MODES[m].steps;return s[Math.max(0,Math.min(s.length-1,k))]};
  let from=null; // the states the boxes come from (the previous step's), set when the step changes
  function cols(P){return {answer:P.good,harm:P.bad,partial:P.c5,refused:mix(P.paper,P.mute,.55),in:P.c1,out:P.c4}}
  function draw(R,k,e,st){const P=R.P,C=cols(P),cfg=cfgAt(mode,k),S1=POS.map(([x])=>state(x,cfg)),S0=from&&from.length===POS.length?from:S1;
    R.grid(-3.2,3.2,-2.6,2.9,.5);
    const hasIn=!!cfg.inp,hasOut=!!cfg.out,ghost=cfg.cmp;
    // the rails as horizontal glass plates over the field
    const pl=(y,c,a)=>R.glass([-2.65,y-.02,-2.25],[5.3,0,0],[0,0,4.6],{c,a,nu:6,nv:5,th:.02});
    if(hasIn||ghost)pl(Y.in,P.c1,ghost?.2:.42);if(hasOut||ghost)pl(Y.out,P.c4,ghost?.2:.42);
    if(hasIn||ghost)R.label([-2.65,Y.in,-2.25],'input rail',{al:'right',dx:-6,mono:true,fs:12,c:P.c1,grp:'lv',a:ghost?.6:1});
    if(hasOut||ghost)R.label([-2.65,Y.out,-2.25],'output rail',{al:'right',dx:-6,mono:true,fs:12,c:P.c4,grp:'lv',a:ghost?.6:1});
    R.label([-2.6,0,1.35],'250 safe prompts',{al:'right',dx:-6,mono:true,fs:12,grp:'lv'});R.label([-2.6,0,-1.35],'200 unsafe prompts',{al:'right',dx:-6,mono:true,fs:12,grp:'lv'});
    // the boxes: a blocked conversation rises to its rail; colour eases from the previous step's
    const lift=s=>s==='in'?Y.in:s==='out'?Y.out:0;
    POS.forEach(([x,px,pz],i)=>{const s0=S0[i],s1=S1[i],y=lerp(lift(s0),lift(s1),e),c=s0===s1?C[s1]:mix(C[s0],C[s1],e);
      R.box([px,y,pz],[BW,.08,BW],{fill:c,shadow:false,lw:.5,ea:.35})});
    // comparison: where the two loose classifier rails would put the conversations, as ghosts on their plates
    if(ghost){const g={inp:'loose',out:'loose'};POS.forEach(([x,px,pz])=>{const s=state(x,g);if(s==='in'||s==='out')R.box([px,lift(s),pz],[BW,.08,BW],{fill:C[s],shadow:false,a:.35*e,edge:false})})}
    // conversations moving up to a rail just added
    if(e<1&&k>0&&mode==='out'){const a=1-e;if(k===1)R.flow([[0,.1,0],[0,Y.in,0]],{c:P.c1,r:.07,n:5,a});if(k===2)R.flow([[.8,.1,.8],[.8,Y.out,.8]],{c:P.c4,r:.07,n:5,a})}
  }
  function stats(k){const cfg=cfgAt(mode,k),c=GR.tally(cfg),calls=(cfg.inp?450:0)+(cfg.out?450-c.blockIn:0);
    let h=RD.stat('Harmful answers delivered',c.harm+' of 200','plus '+c.part+' partial')+
      RD.stat('Safe prompts blocked by a rail',c.okBlocked+' of 250',(100*c.okBlocked/250).toFixed(1)+'%')+
      RD.stat('Safe prompts refused by the model',(c.okRefused+c.okPartial)+' of 250',c.okRefused+' fully, '+c.okPartial+' partly')+
      RD.stat('Guard-model calls',calls,cfg.inp||cfg.out?'one per prompt, one per answer not already blocked':'none');
    if(cfg.cmp){const o=GR.tally({inp:'loose',out:'loose'});h+=RD.stat('Classifier rails, loose (for comparison)',o.harm+' harmful, '+o.okBlocked+' safe blocked','plus '+(o.okRefused+o.okPartial)+' safe refused by the model')}
    document.getElementById('rd-pa-cnt').innerHTML=h}
  let lastK=0;
  const stg=S3.stage({id:'stg-pa',list:'sx-pa-out',fig:'Fig. 2 · 450 conversations, each lifted to the rail that stopped it',cam:[.32,.6],bounds:[[-2.9,0,-2.3],[2.9,2.0,2.5]],aspect:.62,
    dur:1500,hold:5200,draw,margin:w=>w<520?[14,10,14,10]:[18,16,14,150],
    onStep:k=>{if(k!==lastK){const c=cfgAt(mode,lastK);from=POS.map(([x])=>state(x,c));lastK=k}try{stats(k)}catch(err){}}});
  const seg=document.getElementById('rd-pa-mode');
  seg.innerHTML='<button data-m="out" class="on">Outside the model: classifier rails</button><button data-m="sys">Inside the model: guardrail system prompt</button>';
  seg.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b||b.dataset.m===mode)return;
    seg.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    const old=mode;mode=b.dataset.m;from=POS.map(([x])=>state(x,cfgAt(old,lastK)));lastK=0;
    Object.values(MODES).forEach(m=>{document.getElementById(m.list).hidden=m.list!==MODES[mode].list});stg.list(MODES[mode].list)});
  const COLN={answer:'var(--good)',harm:'var(--bad)',partial:'var(--c5)',refused:'var(--dim)',in:'var(--c1)',out:'var(--c4)'};
  document.getElementById('rd-pa-leg').innerHTML=[['answer','answered (safe prompt)'],['harm','harmful answer'],['partial','partial refusal'],['refused','refused by the model'],['in','blocked before the call (raised to the input rail)'],['out','blocked after the call (raised to the output rail)']].map(([k,n])=>'<span><i style="background:'+COLN[k]+'"></i>'+n+'</span>').join('');
  stats(0);
})();
