// ---- Scene, Fig. 5 (section 9): a registered LayerNorm(scale, bias, eps) flattened into two leaves and a treedef, traced by jit with the treedef in the
// cache key, hit on new values, missed on a new eps, and rebuilt. Data: JC.pt.register (the printed treedef), JC.pt.static (traces after new values: 1,
// after a new eps: 2; run_pytree.py). Leaves are drawn by shape only (float32[128]). Steps are explained by #sx-tree on the left. ----
(function(){
  if(!document.getElementById('stg-tree')||!window.JCS||!window.JC)return;const {at,off,lerp,lerp3,mix}=S3,{lab,tint,slot}=JCS;
  const S=JC.pt.static,TD=(JC.pt.register['LayerNorm (register_dataclass)']||{}).treedef||'';
  const tdShort=TD.replace(/^PyTreeDef\(CustomNode\(/,'').replace(/\)\)$/,'');                 // LayerNorm[(1e-05,)], [*, *]
  const NODE=[-1.6,1.95,-.4],LF=[[-2.3,1.0,-.4],[-.9,1.0,-.4]],LV=[[-1.7,0,1.2],[-.3,0,1.2]],TDP=[-1.2,.5,-1.35],JB=[2.0,0,1.2],KS=[2.0,0,-1.35],SL=[[1.55,.22,-1.35],[2.45,.22,-1.35]];
  const leaf=(R,p,c,a,lbl)=>{R.box(p,[1.05,.16,.16],{fill:c,a,shadow:p[1]<.05});if(lbl)lab(R,[p[0],p[1],p[2]+.1],lbl,{mono:true,fs:12,dy:14,c:R.P.acc,a})};
  // the treedef: a gold glass plate with one hole per leaf (drawn as dashed slots) and the aux data written on it
  function treedef(R,p,a,eps,big){const P=R.P,w=big?1.6:.8,d=big?.7:.5;R.glass([p[0]-w/2,p[1],p[2]-d/2],[w,0,0],[0,0,d],{c:P.c5,a,nu:2,nv:1,th:.05,dz:-3});
    if(big)lab(R,[p[0],p[1]+.05,p[2]-d/2],tdShort.replace('1e-05',eps),{mono:true,fs:12.5,b:1,dy:-12,c:P.c5,a})}
  function draw(R,k,e){const P=R.P;R.grid(-3.8,3.6,-2.4,2.4,.5);
    const eps=k>=4?'1e-06':'1e-05';
    // 1. the object: a node with two children and its static field
    const objA=k===0?1:k===1?off(k,e,1):k===5?Math.max(0,e*1.4-.4):0;
    if(objA>0){R.box([NODE[0],NODE[1],NODE[2]],[1.4,.42,.6],{fill:tint(P,P.ink,.06),a:objA});lab(R,[NODE[0],NODE[1]+.42,NODE[2]],'LayerNorm',{fs:13,b:1,dy:-12,a:objA});
      R.box([NODE[0]+1.05,NODE[1]+.06,NODE[2]],[.6,.3,.42],{fill:tint(P,P.c5,.55),a:objA});lab(R,[NODE[0]+1.35,NODE[1]+.2,NODE[2]],'eps='+(k===5?'1e-06':'1e-05'),{mono:true,fs:12,al:'left',dx:8,c:P.c5,a:objA});
      LF.forEach((p,i)=>R.line([[NODE[0],NODE[1],NODE[2]],[p[0],p[1]+.16,p[2]]],{c:P.mute,w:1.2,a:objA}))}
    // the two leaves: hang under the object, drop to the front row on flatten, rise back on unflatten
    ['scale f32[128]','bias f32[128]'].forEach((n,i)=>{let p,a=1,c=tint(P,P.acc,.55);
      if(k===0)p=LF[i];else if(k===1)p=lerp3(LF[i],LV[i],Math.min(1,e*1.3));else if(k===5)p=lerp3(LV[i],LF[i],Math.min(1,e*1.3));else p=LV[i];
      if(k===3)c=tint(P,P.acc,.85);                                                     // new values, same shape
      leaf(R,p,c,a,k===0||k===1||k===5?n:null);
      if(k>=2&&k<=4)lab(R,[p[0],0,p[2]+.1],n,{mono:true,fs:12,dy:14,c:P.acc,a:k===2?1:.75})});
    // the treedef forms where the object was; the first one goes into the key, later calls' treedefs are compared with it
    if(k===1)treedef(R,TDP,Math.max(0,e*1.6-.6),'1e-05',true);
    if(k===2)treedef(R,lerp3(TDP,SL[0],Math.min(1,e*1.3)),1,'1e-05',e<.5);
    if(k===3)treedef(R,TDP,1,'1e-05',true);
    // jit: a box that traces the leaves; the cache key: a shelf of slots
    const jA=k>=2&&k<=4?1:.3;R.box(JB,[1.2,.55,.8],{fill:tint(P,P.acc,.15),a:jA});lab(R,[JB[0],.55,JB[2]],'jit(apply_ln)',{mono:true,fs:12.5,b:1,dy:-12,c:P.acc,a:Math.max(.5,jA)});
    R.box(KS,[2.0,.16,.9],{fill:mix(P.paper,P.ink,.06),a:jA});lab(R,[KS[0],0,KS[2]+.45],'cache key: treedef + avals',{fs:12.5,b:1,dy:15,a:Math.max(.5,jA)});
    SL.forEach(p=>slot(R,p,.8,.6,jA*.9));
    if(k>=3)treedef(R,SL[0],1,'1e-05',false);
    if(k===4)treedef(R,lerp3(TDP,SL[1],Math.max(0,Math.min(1,e*1.6-.3))),1,'1e-06',e<.5);
    if(k===5){treedef(R,SL[1],1,'1e-06',false);treedef(R,TDP,off(k,e,5),'1e-06',true)}
    // traces so far
    const tr=k<2?0:k===4?(e>.5?S.traces_after_new_eps:S.traces_after_new_values):k>=4?S.traces_after_new_eps:k===3?S.traces_after_new_values:1;
    if(k>=2&&k<=4)lab(R,[JB[0]+.6,.3,JB[2]],'traces: '+tr,{mono:true,fs:13,b:1,al:'left',dx:10,c:k===4?P.bad:P.good});
    // flows: leaves into jit; the treedef into the key; the key check
    if(k>=2&&k<=4)LV.forEach(p=>R.flowArc([p[0]+.5,.16,p[2]],[JB[0]-.6,.4,JB[2]],.3,{c:P.acc,r:.06,a:k===2?e:1,n:5}));
    if(k===3)R.flowArc([TDP[0]+.8,TDP[1],TDP[2]],[SL[0][0],.3,SL[0][2]],.4,{c:P.good,r:.06,a:e,n:6});
    if(k===3)lab(R,[SL[0][0],.2,SL[0][2]],'hit',{fs:12.5,b:1,dy:-16,c:P.good,a:e});
    if(k===4&&e>.6)lab(R,[SL[1][0],.2,SL[1][2]],'miss: new treedef',{fs:12.5,b:1,dy:-16,c:P.bad,a:Math.min(1,(e-.6)*3)});
    if(k===5)LV.forEach((p,i)=>R.flowArc([JB[0]-.6,.4,JB[2]],LF[i],.5,{c:P.acc,r:.06,a:1-e*.6,n:5}));
  }
  const full={cam:[.3,.55],bounds:[[-3.3,0,-1.9],[3.1,2.45,1.8]]};
  const st=S3.stage({id:'stg-tree',list:'sx-tree',fig:'Fig. 5 · a LayerNorm flattened, keyed, rebuilt',cam:full.cam,bounds:full.bounds,aspect:.64,dur:1500,hold:4800,draw,
    margin:w=>w<520?[14,10,14,10]:[22,16,18,16],
    // steps 3 to 5 look at the leaves, jit and the key; the object is gone until it is rebuilt
    view:k=>k>=2&&k<=4?{cam:[.3,.62],bounds:[[-2.5,0,-1.9],[3.1,1.3,1.8]]}:full});
  (window.JCSTG=window.JCSTG||{})['stg-tree']=st;
})();
