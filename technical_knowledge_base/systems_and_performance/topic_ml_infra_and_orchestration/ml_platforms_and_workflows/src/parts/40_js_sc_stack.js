// ---- Scene, Fig. 1 (The idea): the platform layers as a stack, each holding one link of the champion's recorded chain (renderer v2) ----
// Storage on the floor, then glass plates for the scheduler and launcher, the workflow engine, the tracker, the registry and the consumer.
// Steps 1 to 5 build the stack upwards (how the champion was made and chosen), step 6 walks it downwards (lineage).
// Every id, hash and size comes from window.MP (src/runs/, recorded 2026-10-16); box heights in storage follow the measured bytes; positions are schematic.
(function(){
  if(!document.getElementById('stg-stack')||!window.MP)return;const {at,lerp,mix}=S3;
  const M=window.MP,V=M.versions.find(v=>v.v===M.champion),run=M.runs.find(r=>r.id===V.run),mf=M.metaflow.find(m=>m.id===V.mf);
  const ri=M.runs.indexOf(run),NR=M.runs.length,NV=M.versions.length;
  const MB=b=>(b/1048576).toFixed(1)+' MB';
  const ST=[['datastore',M.storage.metaflow_datastore,'c3'],['artifacts',M.storage.mlflow_artifacts,'c2'],['mlflow.db',M.storage.mlflow_db,'c4']];
  const maxB=Math.max(...ST.map(s=>s[1]));
  const Y=[0,1.4,2.8,4.2,5.6,7.0],X0=-3,X1=3,Z0=-1.15,Z1=1.15;
  const NAMES=['storage','scheduler, launcher','workflow engine','tracker','registry','consumer'];
  const STEPS=['start','train','evaluate','register','end'],sx=i=>-2.4+i*1.2;
  const vx=i=>-2.5+i, cz=i=>-.9+i*(1.8/(NR-1));
  window.MP_STACK={champion:M.champion,run:run.id,mf:mf.id,code:run.code,data:run.data,ckpt:V.ckpt,val:V.val_loss.toFixed(4),model:V.model,
    ckptBytes:(mf.tasks.find(t=>t.step==='train').arts.find(a=>a[0]==='ckpt')||[])[2],pt2:(M.model_files.find(f=>/model\.pt2$/.test(f[0]))||[])[1],load:M.load_champion.load_secs};
  // which layers each step is about (full strength), and which have appeared so far
  const FOC=[[0,1],[1,2],[2,3],[3,4],[4,5],[0,1,2,3,4,5]];
  function draw(R,k,e){const P=R.P,lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12},o||{}));
    R.grid(-4,4,-2,2,.5);
    const shown=L=>L<=Math.max(1,k+1)||k===5,lit=L=>FOC[k].includes(L);
    const la=L=>{if(!shown(L))return 0;const newL=k>=1&&k<=4&&L===k+1;const base=k===5?.4:lit(L)?1:.22;return newL?base*e:base};
    // layer plates and names
    for(let L=1;L<6;L++){const a=la(L);if(a<=0)continue;const c=[P.c1,P.c3,P.c4,P.c2,P.acc][L-1];
      R.glass([X0,Y[L],Z0],[X1-X0,0,0],[0,0,Z1-Z0],{c,a:a*.8,nu:6,nv:2})}
    FOC[k].forEach(L=>{if(k===5&&L===0)return;lab([X0-.15,Y[L]+(L?0:.3),0],NAMES[L],{al:'right',dx:-4,c:P.mute,grp:'layer',a:k>=1&&k<=4&&L===k+1?e:1})});
    // storage: three stores, height by measured bytes
    const sa=la(0);ST.forEach(([nm,b,c],i)=>{const h=.15+.5*b/maxB,x=-1.8+i*1.8;R.box([x,0,0],[1.2,h,.9],{fill:mix(P.paper,P[c],.35),a:Math.max(sa,k===5&&i===0?1:0)});
      if(k===0)lab([x,h,0],nm+' '+MB(b),{dy:-10,wide:1})});
    // scheduler and launcher: two ranks, gloo between them
    const s1=la(1);[-.9,.9].forEach((x,i)=>{R.box([x,Y[1],0],[1.1,.42,.8],{fill:mix(P.paper,P.c1,.45),a:s1,shadow:false});if(k<=1)lab([x,Y[1]+.42,0],'rank '+i,{dy:-9,a:s1})});
    if(k===0){R.flowArc([-.5,Y[1]+.3,.1],[.5,Y[1]+.3,.1],.25,{c:P.c1,a:e,n:5});R.flowArc([.5,Y[1]+.3,-.1],[-.5,Y[1]+.3,-.1],.25,{c:P.c1,a:e,n:5});
      [-.9,.9].forEach(x=>R.flow([[x,Y[1],0],[x*.6-1.8*.4,.85,0],[-1.8,.7,0]],{c:P.c3,a:e,r:.06,n:4,speed:.9}));
      lab([0,Y[1]+.75,0],'torchrun, 2 ranks over gloo',{b:1,c:P.c1,a:e,dy:-14})}
    // workflow engine: the five steps of the champion's Metaflow run
    const s2=la(2);STEPS.forEach((nm,i)=>{const hot=k===5&&i===0;R.box([sx(i),Y[2],0],[.86,.34,.62],{fill:hot?mix(P.paper,P.acc,.5):mix(P.paper,P.c3,.4),a:hot?1:s2,shadow:false});
      if(k===1)lab([sx(i),Y[2]+.34,0],nm,{dy:-9,wide:1,a:e})});
    if(k===1){R.flow(STEPS.map((_,i)=>[sx(i),Y[2]+.2,0]),{c:P.c3,a:e,n:12,speed:1.2});
      R.flowArc([sx(1),Y[2],0],[-.9,Y[1]+.42,0],.15,{c:P.acc,a:e,r:.07,n:5});
      lab([0,Y[2]+.9,0],'Metaflow run '+mf.id,{b:1,c:P.c3,a:e,dy:-22})}
    // tracker: the seven run records, stacked by start time, the champion's raised
    const s3=la(3);M.runs.forEach((r,i)=>{const ch=i===ri,lift=ch&&k>=2?.12*at(k,e,2):0;R.box([0,Y[3]+lift,cz(i)],[1.9,.07,.2],{fill:ch?mix(P.paper,P.c4,.6):P.paper,a:ch&&k>=2?Math.max(s3,k===5?1:0):s3*.8,shadow:false,lw:.6})});
    if(k===2){STEPS.slice(0,4).forEach((_,i)=>R.flowArc([sx(i),Y[2]+.34,0],[0,Y[3]+.15,cz(ri)],.25,{c:P.c4,a:e,r:.055,n:5,speed:1}));
      lab([1.05,Y[3]+.15,cz(ri)],'MLflow run '+run.id,{al:'left',dx:6,b:1,c:P.c4,a:e});lab([-1.05,Y[3],0],NR+' runs, by start time',{al:'right',dx:-6,c:P.mute,a:e,wide:1})}
    // registry: six versions, the alias on the champion
    const s4=la(4);M.versions.forEach((v,i)=>{const ch=v.v===M.champion;R.box([vx(i),Y[4],0],[.6,.32,.6],{fill:ch?mix(P.paper,P.c2,.55):P.paper,a:ch&&k>=3?Math.max(s4,k===5?1:0):s4*.85,shadow:false});
      if(k===3)lab([vx(i),Y[4],.3],'v'+v.v,{dy:12,wide:1,a:e})});
    if(k>=3){const f=[vx(M.champion-1),Y[4]+.62,0],a=k===3?e:k===5?1:.9;R.glow(f,.16,{c:P.c2,a});R.ball(f,.1,{c:P.c2,a});lab(f,k===3?'@champion \u2192 version '+M.champion+', val_loss '+V.val_loss.toFixed(4):'@champion',{dy:-14,b:1,c:P.c2,a})}
    if(k===3){R.flowArc([0,Y[3]+.2,cz(ri)],[vx(M.champion-1),Y[4],0],.3,{c:P.c2,a:e,r:.07,n:7})}
    // consumer: asks for a name
    const s5=la(5);R.box([0,Y[5],0],[1.7,.4,.8],{fill:mix(P.paper,P.acc,.3),a:Math.max(s5,k===5?1:0),shadow:false});
    if(k===4){R.flowArc([vx(M.champion-1),Y[4]+.62,0],[0,Y[5],0],.3,{c:P.c2,a:e,r:.08,n:7});
      R.flow([[2.9,Y[4]-.6,0],[2.9,Y[4]+.6,0],[.85,Y[5]+.2,0]],{c:P.c2,a:e*.45,r:.05,n:6,speed:1.6});
      lab([0,Y[5]+.4,0],'models:/mi-tiny-gpt@champion',{dy:-12,b:1,c:P.acc,a:e});lab([.95,Y[5]+.15,0],'scored '+M.load_champion.val_loss.toFixed(4)+' in '+M.load_champion.load_secs.toFixed(1)+' s',{al:'left',dx:8,c:P.ink,a:e,wide:1})}
    // step 6: lineage, walked down from the alias to the inputs
    if(k===5){const pts=[[0,Y[5],0],[vx(M.champion-1)*.6,Y[4]+.8,0],[vx(M.champion-1),Y[4]+.32,0],[-.6,Y[3]+.6,cz(ri)],[0,Y[3]+.07,cz(ri)],[-1.6,Y[2]+.8,0],[sx(0),Y[2]+.34,0],[sx(0),Y[1]+.6,.8],[-1.8,.75,0]];
      R.flow(pts,{c:P.acc,a:e,r:.075,n:28,speed:1.3});
      lab([vx(M.champion-1)+.35,Y[4]+.32,0],'version '+M.champion,{al:'left',dx:8,c:P.c2,b:1,a:e});
      lab([1.05,Y[3]+.07,cz(ri)],'run '+run.id,{al:'left',dx:6,c:P.c4,b:1,a:e});
      lab([sx(0)+.5,Y[2]+.34,0],'start: code_sha '+run.code+', data_sha '+run.data,{al:'left',dx:6,dy:-16,c:P.acc,b:1,a:e});
      lab([-1.2,.75,0],'checkpoint ckpt_sha '+V.ckpt,{al:'left',dx:6,c:P.c3,b:1,a:e})}
  }
  const full={cam:[.62,.3],bounds:[[-3.3,0,-1.2],[3.3,7.5,1.2]]};
  const st=S3.stage({id:'stg-stack',list:'sx-stack',fig:'Fig. 1 · the champion’s chain, layer by layer',cam:full.cam,bounds:full.bounds,aspect:.78,dur:1400,hold:5200,draw,
    view:k=>k===5?full:{cam:[.62,.24],bounds:[[-3.3,Math.max(0,Y[k]-.15),-1.2],[3.3,Y[k+1]+.8,1.2]]},
    margin:w=>w<520?[14,10,14,10]:[22,16,16,130]});
  (window.MPSTG=window.MPSTG||{})['stg-stack']=st;
})();
