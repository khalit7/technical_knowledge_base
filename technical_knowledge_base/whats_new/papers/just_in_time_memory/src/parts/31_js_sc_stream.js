// ---- Scene: the paper's test-time memory stream on the 140 real ALFWorld goals, one trajectory followed through write time and read time (renderer v2) ----
// Driven by this page's own replay engine (20_js_stream.js, the same algorithm as src/stream_sim.py): seed 7, success a coin at 77.4%, batches of 10,
// BM25 top 3 over the goal text, the bank empty at the start. Batches are columns left to right, the ten tasks of a batch a row in depth, coloured by type;
// a stored (successful) trajectory rises. The followed trajectory is task 32 of this ordering; the last step is the paper's own Qwen3-8B decomposition
// (Tables 1 and 9, recompute.py). window.JITSTREAM exposes what the scene draws, for check_stages.mjs.
(function(){
  if(!document.getElementById('stg-stream'))return;const {at,off,lerp,mix,cl}=S3;
  const SEED=7,PR=.774,B=10,HL=31,goals=PAPER.alf.map(x=>x[1]),types=PAPER.alf.map(x=>x[0]);
  const R0=JS_STREAM.run(goals,SEED,PR,B,3),S=JS_STREAM.stats(types,R0,B),n=goals.length,NB=Math.ceil(n/B);
  const typ=pos=>types[R0.order[pos]],uses=(S.uses[HL]||[]).slice().sort((a,b)=>a-b);
  const stored=b=>R0.ok.slice(b*B,b*B+B).filter(Boolean).length,bankAfter=b=>R0.ok.slice(0,(b+1)*B).filter(Boolean).length;
  // stored before the last batch and never retrieved
  const never=new Set();for(let q=0;q<n-B;q++)if(R0.ok[q]&&!S.uses[q])never.add(q);
  const D=PAPER.rc.decomp,DA=D['Qwen3-8B alf'],DW=D['Qwen3-8B ws'];
  window.JITSTREAM={seed:SEED,p:PR,batches:NB,batch1:stored(0),bank4:bankAfter(3),hl:{task:HL+1,goal:goals[R0.order[HL]],type:typ(HL),batch:Math.floor(HL/B)+1,
    stored:!!R0.ok[HL],uses:uses.map(q=>q+1),delays:uses.map(q=>q-HL),types:[...new Set(uses.map(typ))],first:uses.length?uses[0]+1:null,firstGoal:uses.length?goals[R0.order[uses[0]]]:''},
    stored:S.stored,never:never.size,neverShare:S.never_used,firstMean:S.first_delay_mean,firstMedian:S.first_delay_median,alf:DA,ws:DW,steps:8};
  const TY={pick_and_place_simple:'c1',pick_clean_then_place_in_recep:'c3',pick_heat_then_place_in_recep:'c2',pick_cool_then_place_in_recep:'c6',pick_two_obj_and_place:'c5',look_at_obj_in_light:'c4'};
  const TN={pick_and_place_simple:'place',pick_clean_then_place_in_recep:'clean',pick_heat_then_place_in_recep:'heat',pick_cool_then_place_in_recep:'cool',pick_two_obj_and_place:'two objects',look_at_obj_in_light:'look'};
  const X=b=>(b-6.5)*.95,Z=j=>(j-4.5)*.5,P3=(pos,y)=>[X(Math.floor(pos/B)),y||0,Z(pos%B)],TH=.05,SH=.36,HH=.7;
  // how many batches have run by step k at progress e (fractional while a stretch plays)
  const done=(k,e)=>k===0?e:k===1?1+3*e:k===2?4:k===3?4+e:k===4?5+9*e:NB;
  function draw(R,k,e){const P=R.P,col=pos=>P[TY[typ(pos)]],dF=done(k,e),cb=Math.min(NB-1,Math.floor(dF)),fb=k===1?Math.min(3,cb):k===3?4:-1;
    const bars=k===7,fade=bars?1-e:1,hlOn=k>=2&&k<=5;
    R.grid(-7,7,-3,bars?4.8:3,.5);
    // ---- the stream: one tile per task, a raised block per stored trajectory ----
    for(let pos=0;pos<n;pos++){const b=Math.floor(pos/B),c=P3(pos),ap=cl((dF-b)*2,0,1),lift=R0.ok[pos]?cl((dF-b-.5)*2,0,1):0,isH=pos===HL,isU=uses.includes(pos);
      let a=fade*(hlOn&&!isH&&!isU?.3:1);
      if(ap<=.01){if(fade>.01)R.box(c,[.74,.02,.4],{fill:P.paper,a:.22*fade,shadow:false});continue}
      if(a<=.01)continue;
      if(isH&&hlOn)continue;
      const nv=k===6&&never.has(pos),base=R0.ok[pos]?mix(P.paper,col(pos),.72):P.paper;
      if(!R0.ok[pos]){R.box(c,[.74,TH,.4],{fill:base,a:a*ap*.55,shadow:false});continue}
      const h=TH+(SH-TH)*lift;R.box(c,[.74,h,.4],{fill:nv?mix(base,P.ink,.45*e):base,a:a*ap,shadow:false});
      if(nv)R.glass([c[0]-.37,h+.01,c[2]-.2],[.74,0,0],[0,0,.4],{c:P.ink,a:e*fade,nu:1,nv:1})}
    // the batch now running: its tasks pull their top 3 from the bank (blue: same task type; red: another type)
    // (step 2: the batch playing, then batch 4's retrievals stay while the step is read; step 4: batch 5's, the followed trajectory's first use strongest)
    if(fb>=0){const lo=fb*B;for(let q=lo;q<Math.min(n,lo+B);q++)R0.ret[q].forEach(t=>{const same=typ(t)===typ(q),strong=k===3&&t===HL;if(strong)return;
      R.flowArc(P3(q,.1),P3(t,SH),.45,{c:same?P.acc:P.mute,a:k===3?.35:.85,r:.05,n:4,speed:1.3})})}
    if(!bars){R.label([X(0),SH,Z(0)-.3],k===0?'batch 1 · no memory':'batch 1',{mono:true,fs:12,dy:-12,c:P.mute,a:fade,grp:'ax'});
      R.label([X(NB-1),SH,Z(0)-.3],'batch 14',{mono:true,fs:12,dy:-12,c:P.mute,a:fade,grp:'ax'});
      if(k<2){const bk=cb===0&&dF<1?0:bankAfter(Math.max(0,Math.min(NB-1,Math.ceil(dF)-1)));R.label([X(0)-.5,SH,Z(0)],'bank: '+bk+' stored',{al:'right',dx:-6,mono:true,fs:12.5,b:1,c:P.ink,wide:1})}}
    // ---- the followed trajectory: task 32 ----
    if(hlOn){const c=P3(HL),hc=col(HL);
      // write time (steps 3 to 5): a thin grey slab, the raw trace dropped; read time (step 6): the raw block again
      const slab=k===2?e:k===3||k===4?1:k===5?1-e:0,h=lerp(HH,.12,slab);
      R.box(c,[.8,h,.44],{fill:mix(mix(P.paper,hc,.7),mix(P.paper,P.mute,.35),slab),a:1});
      if(slab>.05)R.glass([c[0]-.4,h+.01,c[2]-.22],[.8,0,0],[0,0,.44],{c:P.mute,a:slab,nu:3,nv:1});
      R.glow([c[0],h+.12,c[2]],.32,{c:slab>.5?P.mute:hc,a:.5});
      R.label([c[0],h,c[2]],'task 32 · '+(slab>.5?'distilled now':'heat some egg'),{mono:true,fs:12.5,b:1,dy:-12,c:slab>.5?P.ink:hc});
      // its consumers: the first at step 4, all four at step 5 and 6
      const shown=k===3?uses.slice(0,1):k>=4?uses:[];
      shown.forEach((q,i)=>{const qc=col(q),qa=k===3?cl(e*1.6-.4,0,1):k===4?cl((dF-Math.floor(q/B))*2,0,1):1;if(qa<=0)return;const cq=P3(q);
        R.box(cq,[.74,TH,.4],{fill:mix(P.paper,qc,.55),a:qa});
        if(k===3||k===4){R.flowArc(P3(q,.1),[c[0],h,c[2]],.7,{c:hc,a:qa,r:.065,n:8,speed:1.2});
          if(k===4)R.glass([cq[0]-.36,.34,cq[2]-.2],[.72,0,0],[0,0,.4],{c:P.mute,a:qa*.9,nu:3,nv:1});
          R.label(cq,(q-HL)+' tasks later',{mono:true,fs:12,dy:14,c:hc,a:qa,grp:'use'})}
        if(k===5){R.flowArc([c[0],h,c[2]],P3(q,.5),.8,{c:qc,a:e,r:.06,n:7,speed:1.2});
          R.box([cq[0],TH,cq[2]],[.5,.32*e+.01,.3],{fill:mix(P.paper,qc,.8),a:e});R.glow([cq[0],.5,cq[2]],.3,{c:P.good,a:.6*e});
          R.label([cq[0],.4,cq[2]],TN[typ(q)]+' · graded now',{mono:true,fs:12,dy:-12,c:qc,a:e,grp:'use'})}});
      if(k===3)R.label(P3(uses[0]),'task 50 · a cool egg',{mono:true,fs:12,dy:30,c:hc,a:cl(e*1.6-.4,0,1),wide:1})}
    if(k===6)R.label([X(NB-1)+.5,SH,Z(0)],never.size+' never used',{al:'left',dx:6,mono:true,fs:12.5,b:1,c:P.ink,a:e});
    // ---- the headline gain, split: no memory, untrained read-time curator, RL training; RL SkillOS as a glass sheet ----
    if(bars){const sc=.034,cols=[[-1.7,DA,'ALFWorld SR'],[1.7,DW,'WebShop SR']],Z0=3.7;
      cols.forEach(([x,d,nm])=>{R.box([x,0,Z0],[1.25,.06,1.0],{a:e});
        const segs=[[d.no_memory,mix(P.paper,P.mute,.35),'no memory '+d.no_memory.toFixed(1)],[d.read_time_untrained,mix(P.paper,P.c6,.55),'+'+d.read_time_untrained.toFixed(1)+' untrained'],[d.rl,P.acc,'+'+d.rl.toFixed(1)+' RL training']];
        let y=.06;segs.forEach(([v,c,l],i)=>{const hh=Math.max(.01,v*sc*e);R.box([x,y,Z0],[.8,hh,.7],{fill:c,a:e,shadow:false});R.label([x+.42,y+hh/2,Z0],l,{al:'left',dx:6,mono:true,fs:12,b:i===2?1:0,c:i===2?P.acc:P.ink,a:e,grp:'bar'});y+=hh});
        const gy=.06+d.skillos*sc*e;R.glass([x-.6,gy,Z0-.5],[1.2,0,0],[0,0,1.0],{c:P.bad,a:e*.9,nu:2,nv:2});R.label([x-.62,gy,Z0],'SkillOS '+d.skillos.toFixed(1),{al:'right',dx:-6,mono:true,fs:12,c:P.bad,a:e});
        R.label([x,0,Z0+.55],nm+' · '+d.full.toFixed(1),{mono:true,fs:12.5,b:1,dy:14,c:P.ink,a:e})})}
  }
  // on a phone the camera looks further down, so the 14 by 10 grid fills the card's height instead of a thin band
  const nar=()=>innerWidth<520,full=()=>({cam:[.18,nar()?1.12:.95],bounds:[[-6.6,0,-2.5],[6.6,.9,2.6]]});
  S3.stage({id:'stg-stream',list:'sx-stream',fig:'3D · the test stream, 140 ALFWorld goals · seed 7',cam:full().cam,bounds:full().bounds,aspect:.52,dur:2600,hold:4600,draw,
    margin:w=>w<520?[16,8,20,8]:[22,16,34,120],
    // step 2 moves in on the first batches while they play; steps 3 and 4 move in close on task 32 and its first use; the last step moves to the bars in front of the stream
    view:k=>k===1?{cam:[.2,nar()?1.05:.75],bounds:[[-6.7,0,-2.5],[-1.9,.9,2.6]]}:k===2||k===3?{cam:[.25,nar()?1.0:.7],bounds:[[-4.4,0,-2.3],[-1.6,1.0,2.6]]}:k===7?{cam:[.12,.42],bounds:[[-3.2,0,3.0],[3.6,2.9,4.4]]}:full()});
})();
