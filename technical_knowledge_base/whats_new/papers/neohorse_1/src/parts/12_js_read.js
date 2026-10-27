// ---- The paper tab, part 1: the loop animation (Figure 2 redrawn, against curate-once post-training) ----
const RCD=PAPER.rc,TB=PAPER.tables;
(function(){
  // nodes on a 3-column, 4-row grid: [col,row,label lines]
  const N={
    A:[0,0,['Tasks','user requests']],B:[0,1,['Routing harness','router + model pool']],C:[0,2,['Records per turn','trajectory, 3 tiers, outcome']],
    D:[0,3,['Curation','gates, 6 checks, labels']],E:[1,3,['Training mixture','what to learn next']],F:[2,3,['Curriculum SFT','3 routing stages']],
    G:[2,2,['On-policy distill.','teacher on rollouts']],H:[2,1,['NeoHorse-1','new checkpoint']],I:[2,0,['Evaluation','deficiency profile']]};
  const S={  // the curate-once pipeline reuses the slots, with its own labels
    A:['Tasks','user requests'],B:['Harness serves it','traffic not reused'],C:['Records','discarded'],D:['Fixed dataset','curated once'],
    F:['SFT','shuffled'],H:['Checkpoint','shipped'],I:['Benchmarks','reported, then done']};
  const NS={A:['Tasks','requests'],B:['Routing','router + pool'],C:['Records','3 tiers, outcome'],D:['Curation','gates, labels'],E:['Mixture','next data'],F:['Curriculum','SFT, 3 stages'],G:['On-policy','distillation'],H:['NeoHorse-1','checkpoint'],I:['Evaluation','deficiencies']};
  const SS={A:['Tasks','requests'],B:['Harness','traffic unused'],C:['Records','discarded'],D:['Fixed data','curated once'],F:['SFT','shuffled'],H:['Checkpoint','shipped'],I:['Benchmarks','then done']};
  const EL={loop:[['A','B'],['B','C'],['C','D'],['D','E'],['E','F'],['F','G'],['G','H'],['H','I'],['I','E','allocate'],['H','B','next round',1]],
    static:[['D','F'],['F','H'],['H','I'],['H','B','ship'],['A','B']]};
  const steps={loop:[
    {t:'Serve and route',c:'Each user turn reaches the routing harness. The router estimates its capability demand from the request, recent dialogue, earlier routing decisions and execution state, and assigns tier C0 to C3; policy may adjust it; a model from the pool serves it (§3.4).',on:['A','B'],e:[['A','B']]},
    {t:'Record',c:'For every turn the harness keeps the trajectory (requests, reasoning, tool calls, observations, recovery, outcome) and three routing fields: the raw prediction, the policy-adjusted decision and the tier actually served. Joined, that is a prediction, action, outcome record (§3.1, §3.4).',on:['C'],e:[['B','C']]},
    {t:'Curate',c:'Deduplicate and decontaminate; a rule-based structural gate (complete, partially recoverable, quarantined); six semantic verdicts (PASS, WARN, FAIL, NOT_EVALUATED); Scene, Goal and Outcome labels per subscene (§3.2, §3.3).',on:['D'],e:[['C','D']]},
    {t:'Build the mixture',c:'Admitted harness trajectories plus public instruction, reasoning, tool-use, code and preference data form the training mixture, serialised one user turn per example (§3.1, §4.1).',on:['E'],e:[['D','E']]},
    {t:'Curriculum SFT',c:'Re-estimated routing scores order the examples into three stages of about a third each, harder examples coming in later, some easy ones held back; one optimizer and schedule throughout (§4.2).',on:['F'],e:[['E','F']]},
    {t:'On-policy distillation',c:'The student generates from recorded starting contexts, scheduled in the same three stages; a fixed teacher scores each of its tokens; the loss is a reverse KL over the top-K candidates plus a tail bin (§4.3).',on:['G'],e:[['F','G']]},
    {t:'Evaluate',c:'The new checkpoint is evaluated on a stratified suite kept disjoint from training; results by attribute, quality dimension, outcome and tier form a model-deficiency profile (§3.5).',on:['H','I'],e:[['G','H'],['H','I']]},
    {t:'Allocate',c:'The profile shifts the next mixture toward regions where the model underperforms, keeping broad coverage. This changes the data, not the objective (§3.5).',on:['I','E'],e:[['I','E']]},
    {t:'Return to the pool',c:'The checkpoint rejoins the pool behind the router, its traffic produces new trajectories, and the loop can run again. Dashed: the report ran this loop once, so whether gains accumulate is untested (§6).',on:['H','B'],e:[['H','B']]}],
   static:[
    {t:'Curate once',c:'The usual route: a dataset of instruction and agent trajectories is collected or synthesised against a fixed task distribution, then frozen (§1, §2.1).',on:['D'],e:[]},
    {t:'Train',c:'Supervised fine-tuning on the fixed set, in shuffled order; nothing says which examples are hard.',on:['F'],e:[['D','F']]},
    {t:'Evaluate and ship',c:'Benchmarks are reported and the checkpoint is shipped.',on:['H','I'],e:[['F','H'],['H','I']]},
    {t:'Serve',c:'The harness serves the model and routes requests, but its records (which turns were hard, which model had to take them, what failed) never reach the next dataset. The paper\'s point is that this signal is free.',on:['A','B'],e:[['H','B'],['A','B']]}]};
  let W=0;
  const geo=w=>{const cw=Math.min(150,(w-24)/3),gx=(w-3*cw)/2,bw=Math.min(cw-14,138),bh=44,rh=74;
    const xy=k=>{const [c,r]=N[k];return {x:gx+c*cw+(cw-bw)/2,y:10+r*rh,w:bw,h:bh}};return {xy,H:10+3*rh+bh+12}};
  function edge(g,a,b,lbl,dash,act,e){const p=g.xy(a),q=g.xy(b);let x1=p.x+p.w/2,y1=p.y+p.h/2,x2=q.x+q.w/2,y2=q.y+q.h/2;
    // clip to box edges
    const clip=(x,y,dx,dy,bx)=>{const tx=dx?Math.abs((bx.w/2+3)/dx):1e9,ty=dy?Math.abs((bx.h/2+3)/dy):1e9,t=Math.min(tx,ty);return [x+dx*t,y+dy*t]};
    const dx=x2-x1,dy=y2-y1,L=Math.hypot(dx,dy),ux=dx/L,uy=dy/L;[x1,y1]=clip(x1,y1,ux,uy,p);[x2,y2]=clip(x2,y2,-ux,-uy,q);
    const c=act?'var(--acc)':'var(--mute)';let s=ln2(x1,y1,x2,y2,c,{sw:act?2.2:1.2,da:dash?'5 4':null,op:act?1:.55});
    const ah=7,ax=x2-ux*ah,ay=y2-uy*ah;s+='<path d="M'+x2.toFixed(1)+','+y2.toFixed(1)+'L'+(ax-uy*4).toFixed(1)+','+(ay+ux*4).toFixed(1)+'L'+(ax+uy*4).toFixed(1)+','+(ay-ux*4).toFixed(1)+'Z" fill="'+c+'" opacity="'+(act?1:.55)+'"/>';
    if(lbl){const f=lbl==='allocate'?.7:.5,mx=x1+(x2-x1)*f,my=y1+(y2-y1)*f;s+=lbl==='allocate'?tx(mx-6,my+4,lbl,{fs:11,a:'end',c:'var(--mute)'}):tx(mx+(Math.abs(dy)<4?0:6),my+(Math.abs(dy)<4?-5:4),lbl,{fs:11,a:Math.abs(dy)<4?'middle':'start',c:'var(--mute)'})}
    if(act&&e<1){s+='<circle cx="'+(x1+(x2-x1)*e).toFixed(1)+'" cy="'+(y1+(y2-y1)*e).toFixed(1)+'" r="5" fill="var(--acc)"/>'}
    return s}
  const A=makeAnim({id:'lp',mode:'loop',modes:steps,dur:3200,
    draw:(m,k,e,w)=>{const g=geo(w),st=steps[m][k];let s='';
      const act=new Set(st.e.map(x=>x.join('')));
      EL[m].forEach(([a,b,l,d])=>{s+=edge(g,a,b,l,d,act.has(a+b),e)});
      Object.keys(N).forEach(key=>{if(m==='static'&&!S[key])return;const p=g.xy(key),on=st.on.includes(key),nar=p.w<130,lb=m==='static'?(nar?SS:S)[key]:(nar?NS[key]:N[key][2]);
        const off=m==='static'&&key==='C';
        s+='<rect x="'+p.x.toFixed(1)+'" y="'+p.y+'" width="'+p.w.toFixed(1)+'" height="'+p.h+'" rx="7" class="lpn'+(on?' on':'')+(off?' off':'')+'"/>';
        s+=tx(p.x+p.w/2,p.y+18,lb[0],{fs:12,a:'middle',w:600})+tx(p.x+p.w/2,p.y+34,lb[1],{fs:11,a:'middle',c:'var(--mute)'})});
      return svgW(w,g.H,s,'NeoHorse-1 training loop')},
    counters:(m,k)=>{const n=steps[m].length;
      if(m==='loop')return stat('signals kept per served turn','5','trajectory, outcome, predicted, decided and served tier')+stat('routing-ordered stages','3','SFT and OPD alike')+stat('passes of the loop reported',k===n-1?'1':'1','"a single pass" (§6)');
      return stat('signals per served turn reused','0','the harness records are not used')+stat('ordering signal','none','shuffled SFT')+stat('passes','1','by construction')}});
})();

// ---- Figure 4, interactive: which spans of a two-turn interaction get loss ----
(function(){
  const seq=[['u1','USER','Request'],['a1r','ASSISTANT','Reasoning'],['a1c','ASSISTANT','Tool call'],['t1','TOOL','Result'],['a1x','ASSISTANT','Reasoning'],['a1v','ASSISTANT','Response'],
    ['u2','USER','Request'],['a2r','ASSISTANT','Reasoning'],['a2c','ASSISTANT','Tool call'],['t2','TOOL','Result'],['a2x','ASSISTANT','Reasoning'],['a2v','ASSISTANT','Response']];
  let cur='2';
  function draw(w){const turn=id=>id[1]==='1'||id==='u1'||id==='t1'?'1':'2';
    const rows=w<560?2:1,per=Math.ceil(seq.length/rows),bw=(w-8)/per,bh=40;let s='';
    seq.forEach((b,i)=>{const r=Math.floor(i/per),c=i%per,x=4+c*bw,y=26+r*(bh+44),t=turn(b[0]);
      const isCur=t===cur,earlier=+t<+cur,later=+t>+cur,isA=b[1]==='ASSISTANT',reason=b[2]==='Reasoning';
      let st,f,op=1;
      if(later){st='not in this example';f='var(--soft)';op=.3}
      else if(earlier&&isA&&reason){st='omitted';f='var(--soft)';op=.35}
      else if(isCur&&isA){st='m = 1';f='var(--acc)'}
      else {st='m = 0';f='var(--dim)'}
      s+=rc(x+1,y,bw-2,bh,f,{op,r:5})+tx(x+bw/2,y+16,b[1].slice(0,4)==='ASSI'?'ASST':b[1],{fs:11,a:'middle',c:isCur&&isA?'var(--tk)':'var(--ink)',op})+tx(x+bw/2,y+31,b[2].length*6.2>bw-4?b[2].slice(0,Math.floor((bw-4)/6.2)):b[2],{fs:11,a:'middle',c:isCur&&isA?'var(--tk)':'var(--mute)',op});
      s+=tx(x+bw/2,y+bh+14,st==='not in this example'?'':st,{fs:11,a:'middle',c:st==='m = 1'?'var(--acc)':'var(--mute)'});
      if(c===0||b[0]==='u2')s+=tx(x+2,y-8,'User turn '+t+(t===cur?' (current)':earlier?' (history)':''),{fs:11,w:600,c:t===cur?'var(--acc)':'var(--mute)'});
    });
    $('mkSvg').innerHTML=svgW(w,26+rows*(bh+44),s,'Loss mask over a two-turn interaction');
    $('mkCap').innerHTML=cur==='2'?'Training on turn 2: turn 1 is history. Its request, tool call, result and visible response stay as context with no loss; its reasoning is dropped. In turn 2 every assistant span (reasoning, tool call, response) gets loss; the user request and the tool result do not.':'Training on turn 1: nothing comes before it, and turn 2 is simply not in this example. Each user turn becomes its own training example with the history before it, so a 10-turn conversation can yield up to 10 examples.'}
  fit($('mkSvg'),draw);segBind('mkM',m=>{cur=m;refit($('mkSvg'))});
})();
