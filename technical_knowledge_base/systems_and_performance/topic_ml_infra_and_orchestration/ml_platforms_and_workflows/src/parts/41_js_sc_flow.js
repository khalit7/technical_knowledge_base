// ---- Scene, Fig. 2 (section 2): the flow's five steps on a glass plate, the content-addressed datastore on the floor in front, the MLflow server beside (renderer v2) ----
// Two modes from the recorded runs (window.MP.metaflow): "run" replays the champion's run, step by step, with the SHA-1 prefixes Metaflow stored each
// artifact under; "res" replays the failed run 1792142900051724 and its resume 1792142936774695 (cloned steps, the same hashes, the lineage trap).
// Durations and hashes are recorded; positions are schematic; block heights for the checkpoint follow its bytes against the small artifacts.
(function(){
  if(!document.getElementById('stg-flow')||!window.MP)return;const {at,off,lerp,mix}=S3;
  const M=window.MP,V=M.versions.find(v=>v.v===M.champion),RUN=M.metaflow.find(m=>m.id===V.mf);
  const FAIL=M.metaflow.find(m=>!m.ok&&m.tasks.length===4),RES=M.metaflow.find(m=>m.origin===FAIL.id);
  const V1=M.versions.find(v=>v.mf===RES.id),codes=[];M.runs.forEach(r=>{if(r.code&&!codes.includes(r.code))codes.push(r.code)});
  const STEPS=['start','train','evaluate','register','end'],sx=i=>-4+i*2,YS=1.25,ZS=-.6,ZD=1.9;
  const task=(m,s)=>m.tasks.find(t=>t.step===s),art=(m,s,n)=>{const t=task(m,s);const a=t&&t.arts.find(x=>x[0]===n);return a?{sha:a[1].slice(0,8),bytes:a[2]}:null};
  const SMALL=['data_sha','train_sha','val_sha','code_sha','env'];
  window.MP_FLOW={run:RUN.id,fail:FAIL.id,res:RES.id,dur:{run:STEPS.map(s=>(task(RUN,s)||{}).dur),fail:STEPS.map(s=>(task(FAIL,s)||{}).dur),res:STEPS.map(s=>(task(RES,s)||{}).dur)},
    ckptRun:art(RUN,'train','ckpt'),ckptFail:art(FAIL,'train','ckpt'),val:V.val_loss.toFixed(4),v1:V1.v,v1code:V1.code,fixed:codes[codes.length-1],
    cloned:RES.tasks.filter(t=>t.cloned).map(t=>t.step)};
  let mode='run';
  const pos={small:i=>[-5+i*.55,0,ZD],ckpt:[-1.2,0,ZD],val:[1.4,0,ZD],ver:[3.4,0,ZD],ml:[6,0,-.2]};
  function datastore(R,P,m,show,a){ // the floor slab and the artifacts present so far
    R.box([0,0,ZD],[12.2,.06,1.6],{fill:mix(P.paper,P.c5,.18),a:a*.9,shadow:false,lw:.6});
    if(show.small)SMALL.forEach((n,i)=>R.box(pos.small(i).map((v,j)=>j===1?.06:v),[.4,.22,.4],{fill:mix(P.paper,P.c1,.5),a:show.small*a,shadow:false}));
    if(show.ckpt)R.box([pos.ckpt[0],.06,ZD],[1.3,.75*show.ckpt,1],{fill:mix(P.paper,P.c3,.55),a,shadow:false});
    if(show.val)R.box([pos.val[0],.06,ZD],[.45,.22,.45],{fill:mix(P.paper,P.c4,.55),a:show.val*a,shadow:false});
    if(show.ver)R.box([pos.ver[0],.06,ZD],[.45,.22,.45],{fill:mix(P.paper,P.c2,.55),a:show.ver*a,shadow:false})}
  function stepBox(R,P,i,o){R.box([sx(i),YS,ZS],[1.25,.42,.85],Object.assign({shadow:false},o))}
  // a label is drawn only when its anchor is inside this step's view (the renderer clamps labels to the card, so an off-view one would sit on the edge)
  function draw(R,k,e){const B=(VIEWS[mode][k]||full).bounds,lab=(p,t,o)=>{if(p[0]<B[0][0]-.3||p[0]>B[1][0]+.3)return;R.label(p,t,Object.assign({mono:true,fs:12},o||{}))},P=R.P;
    R.grid(-6.5,7,-2.2,3,.5);
    R.glass([-5.3,YS,-1.25],[10.6,0,0],[0,0,1.3],{c:P.c3,a:.55,nu:10,nv:2});
    // the MLflow server
    const mla=mode==='run'?(k>=4?1:.35):(k>=2?1:.35);
    R.box(pos.ml,[1.5,1.1,1.1],{fill:mix(P.paper,P.c2,.3),a:mla});lab([pos.ml[0],1.1,pos.ml[2]],'MLflow server',{dy:-10,c:P.c2,a:mla,wide:1});
    const ar=(i,a)=>R.line([[sx(i)+.66,YS+.21,ZS],[sx(i+1)-.66,YS+.21,ZS]],{c:P.mute,w:1.6,head:7,a});
    if(mode==='run'){
      const lit=i=>k===0?1:i===k-1||(k===4&&i===4)?1:i<k-1?.55:.25;
      STEPS.forEach((n,i)=>{stepBox(R,P,i,{fill:i===k-1||(k===4&&i>=3)?mix(P.paper,P.acc,.45):mix(P.paper,P.c3,.35),a:k===0?e:lit(i)});
        lab([sx(i),YS+.42,ZS],n,{dy:-10,b:i===k-1,a:k===0?e:Math.max(.5,lit(i))});if(i<4)ar(i,k===0?e:.8)});
      datastore(R,P,'run',{small:k>=1?(k===1?e:1):0,ckpt:k>=2?(k===2?e:1):0,val:k>=3?(k===3?Math.max(0,e*2-1):1):0,ver:0},k===0?e*.8:1);
      lab([4.9,0,ZD+.8],'datastore: each artifact under the SHA-1 of its bytes',{al:'right',dy:14,c:P.mute,a:k===0?e:0,wide:1});
      if(k===1){SMALL.forEach((_,i)=>R.flowArc([sx(0),YS,ZS+.3],[pos.small(i)[0],.3,ZD],.25,{c:P.c1,a:e,r:.05,n:4}));
        lab([pos.small(2)[0],.3,ZD],SMALL.join(', '),{dy:-16,b:1,c:P.c1,a:e});lab([sx(0)+.7,YS+.2,ZS],MP_FLOW.dur.run[0].toFixed(2)+' s',{al:'left',dx:6,a:e})}
      if(k===2){R.flowArc([sx(1),YS,ZS+.3],[pos.ckpt[0],.85,ZD],.3,{c:P.c3,a:e,r:.09,n:10});
        lab([pos.ckpt[0]+.7,.6,ZD],'ckpt '+MP_FLOW.ckptRun.sha+', '+MP_FLOW.ckptRun.bytes.toLocaleString('en-US')+' bytes',{al:'left',dx:8,b:1,c:P.c3,a:e});
        lab([sx(1),YS+.42,ZS],'torchrun, 2 ranks: '+MP_FLOW.dur.run[1].toFixed(2)+' s',{dy:-28,c:P.acc,b:1,a:e})}
      if(k===3){R.flowArc([pos.ckpt[0],.85,ZD],[sx(2),YS,ZS+.3],.35,{c:P.c3,a:e,r:.08,n:9});R.flowArc([sx(2)+.3,YS,ZS+.3],[pos.val[0],.3,ZD],.2,{c:P.c4,a:Math.max(0,e*2-1),r:.06,n:4});
        lab([pos.val[0]+.3,.25,ZD],'val_loss '+MP_FLOW.val,{al:'left',dx:8,b:1,c:P.c4,a:e});lab([pos.ckpt[0]-.7,.7,ZD],'read by hash '+MP_FLOW.ckptRun.sha,{al:'right',dx:-8,c:P.c3,a:e,wide:1})}
      if(k===4){R.flowArc([pos.ckpt[0],.85,ZD],[sx(3),YS,ZS+.3],.4,{c:P.c3,a:e,r:.08,n:9});R.flowArc([sx(3)+.5,YS+.2,ZS],[pos.ml[0]-.6,.9,pos.ml[2]],.4,{c:P.c2,a:e,r:.08,n:8});
        lab([pos.ml[0],1.1,pos.ml[2]],'version '+M.champion+' → @champion',{dy:-28,b:1,c:P.c2,a:e})}
    }else{
      const fixedReg=k>=2,ghost=k>=1;
      STEPS.forEach((n,i)=>{if(i===4&&k<2)return;const cl=ghost&&i<3,bad=i===3&&!fixedReg,trap=k===3&&i===0;
        stepBox(R,P,i,{fill:bad?mix(P.paper,P.bad,.55):trap?mix(P.paper,P.bad,.35):cl?P.paper:i>=3&&fixedReg?mix(P.paper,P.good,.45):mix(P.paper,P.c3,.35),fa:cl?.35:1,a:cl&&k===1?lerp(1,.85,e):i===4?(k===2?e:1):1});
        lab([sx(i),YS+.42,ZS],n,{dy:-10,a:1,b:bad||trap,c:bad||trap?P.bad:P.ink});if(i<3||(i===3&&k>=2))ar(i,.8)});
      if(!fixedReg)lab([sx(3),YS,ZS+.45],'raised after '+MP_FLOW.dur.fail[3].toFixed(1)+' s',{dy:16,b:1,c:P.bad,a:k===0?e:1});
      datastore(R,P,'res',{small:1,ckpt:1,val:1,ver:k>=2?(k===2?e:1):0},1);
      lab([pos.ckpt[0]+.7,.6,ZD],'ckpt '+MP_FLOW.ckptFail.sha,{al:'left',dx:8,b:k!==3,c:P.c3,a:1,wide:k===3?1:0});
      if(k===1){[0,1,2].forEach(i=>R.flow([[i===1?pos.ckpt[0]:i===0?pos.small(2)[0]:pos.val[0],.4,ZD],[sx(i),YS+.1,ZS+.4]],{c:P.mute,a:e,r:.05,n:6,speed:1.6}));
        lab([sx(1),YS,ZS+.45],'cloned: '+MP_FLOW.dur.res[0].toFixed(2)+' s each, same hashes',{dy:16,b:1,c:P.c5,a:e})}
      if(k===2){R.flowArc([pos.ckpt[0],.85,ZD],[sx(3),YS,ZS+.3],.4,{c:P.c3,a:e,r:.08,n:9});R.flowArc([sx(3)+.5,YS+.2,ZS],[pos.ml[0]-.6,.9,pos.ml[2]],.4,{c:P.c2,a:e,r:.08,n:8});
        lab([sx(3),YS,ZS+.45],'register: '+MP_FLOW.dur.res[3].toFixed(2)+' s, fixed code',{dy:16,b:1,c:P.good,a:e});lab([pos.ml[0],1.1,pos.ml[2]],'version '+MP_FLOW.v1,{dy:-28,b:1,c:P.c2,a:e})}
      if(k===3){R.flowArc([sx(0),YS+.42,ZS],[pos.ml[0]-.4,1.1,pos.ml[2]],1.2,{c:P.bad,a:e,r:.07,n:16,speed:1.4});
        lab([sx(0),YS,ZS+.45],'code_sha '+MP_FLOW.v1code+' (before the fix)',{dy:16,b:1,c:P.bad,a:e});
        lab([sx(3),YS,ZS+.45],'ran '+MP_FLOW.fixed,{dy:16,b:1,c:P.good,a:e});lab([pos.ml[0],1.1,pos.ml[2]],'version '+MP_FLOW.v1+' tagged '+MP_FLOW.v1code,{dy:-44,b:1,c:P.bad,a:e,al:'right',dx:40})}
    }
  }
  const full={cam:[.22,.6],bounds:[[-5.6,0,-1.6],[7.2,2.1,2.8]]};
  const VIEWS={run:[full,{cam:[.3,.55],bounds:[[-5.6,0,-1.3],[-1.4,2.1,2.8]]},{cam:[.25,.55],bounds:[[-3.6,0,-1.3],[1.2,2.3,2.8]]},{cam:[.2,.55],bounds:[[-2.6,0,-1.3],[2.4,2.1,2.8]]},{cam:[.12,.55],bounds:[[-.2,0,-1.6],[6.8,2.3,2.8]]}],
    res:[full,full,{cam:[.12,.55],bounds:[[-1.8,0,-1.6],[6.8,2.3,2.8]]},full]};
  const st=S3.stage({id:'stg-flow',list:'sx-flow-run',fig:'Fig. 2 · a workflow run on its datastore',cam:full.cam,bounds:full.bounds,aspect:.52,dur:1400,hold:5200,draw,
    view:k=>(VIEWS[mode][k]||full),margin:w=>w<520?[14,10,14,10]:[22,16,16,16]});
  (window.MPSTG=window.MPSTG||{})['stg-flow']=st;
  const chips=document.getElementById('mp-flow-mode');
  if(chips)chips.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.m;chips.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    ['run','res'].forEach(m=>document.getElementById('sx-flow-'+m).hidden=m!==mode);st.list('sx-flow-'+mode)}));
})();
