// ---- Scene, Fig. 3 (section 6): block 0's MLP of the running example through reverse mode (VJP = linearize, then transpose) and forward mode (JVP),
// one plate per equation of the recorded programs (JC.tape: the VJP program's 15 forward and 20 backward equations by stage; the JVP program's
// primal and tangent equations), residuals as gold blocks sized by their bytes (JC.ad.mlp.residuals, or PyTorch's saved tensors), gradients drawn
// with their real shapes. Also fills the equation panes and counters under the step list (#jcad-panes, #jcad-cnt), moved from the old 2D tape.
// Steps are explained by #sx-ad (reverse) and #sx-ad-f (forward). ----
(function(){
  if(!document.getElementById('stg-ad')||!window.JCS||!window.JC)return;const {at,off,mix,lerp}=S3,{lab,tint}=JCS;
  const J=window.JC,T=J.tape,A=J.ad.mlp,esc=RD.esc,$=id=>document.getElementById(id);
  const ST=['x @ W1','+ b1','GELU','@ W2','+ b2'],SX=[-3.4,-1.7,0,1.7,3.4],ZF=1.55,ZT=0,ZBK=-1.4,ZG=-2.8,PIT=.12;
  // which residual belongs to which stage, from the recorded descriptions
  const jaxStage=r=>/constant/.test(r.src)?0:/literal/.test(r.src)?2:/argument/.test(r.src)?3:/copy/.test(r.src)?3:2;
  const jaxLabel=r=>{const s=r.src;if(/constant/.test(s))return 'x '+r.aval;if(/literal/.test(s))return 'a literal '+r.aval;if(/argument/.test(s))return 'W2 '+r.aval;const m=s.match(/output of (\w+)/);return (m?m[1]:'value')+' '+r.aval};
  const RES={jax:A.residuals.map(r=>({st:jaxStage(r),lbl:jaxLabel(r),b:r.bytes})),
    torch:A.torch_saved.map(r=>({st:r.from==='input'?0:r.from==='parameter'?3:r.from==='AddBackward0'?2:3,lbl:(r.from==='input'?'x':r.from==='parameter'?'W2':r.from==='AddBackward0'?'GELU input':'GELU output')+' ['+r.shape.join(',')+']',b:r.bytes}))};
  // equations of each program by stage
  const by=(prog,f)=>[0,1,2,3,4].map(s=>prog.eqns.filter((e,k)=>prog.stage[k]===s&&f(e)));
  const FWD=by(T.vjp,e=>!e.d),BWD=by(T.vjp,e=>e.d),JP=by(T.jvp,e=>!e.d),JT=by(T.jvp,e=>e.d);
  // reverse: steps 0 intro, 1 stages 0-1, 2 stage 2, 3 stages 3-4 (forward), 4 stages 4-3, 5 stage 2, 6 stages 1-0 (backward), 7 done
  const RF=[[],[0,1],[2],[3,4],[],[],[],[]],RB=[[],[],[],[],[4,3],[2],[1,0],[]];
  const fdone=k=>k>=3?5:k===2?3:k===1?2:0;                              // forward stages finished after step k
  const bfrom=k=>k>=6?0:k===5?2:k===4?3:5;                               // backward has reached stage bfrom(k)
  const FF=[[],[0,1],[2],[3,4],[]];                                       // forward mode: steps 0 intro, 1 to 3 stages, 4 done
  let mode='rev',who='jax';
  const tile=(R,x,z,i,c,a)=>R.box([x,.03+i*PIT,z],[1.2,.085,.62],{fill:c,a,shadow:i===0,lw:.6});
  // a tower of plates, one per equation; the step's own towers get one label (the primitive, or the count; the panes list them all)
  function tower(R,s,z,eqs,n,c,a,named){for(let i=0;i<n;i++)tile(R,SX[s],z,i,c,a);
    if(named&&n>0)lab(R,[SX[s],.03+n*PIT,z],n===1?eqs[0].prim:n+' equations',{mono:true,fs:12,dy:-10,c:R.P.ink,b:1,a})}
  const side=b=>.15+.52*Math.cbrt(b/262144);
  const kb=b=>b>=1000?(b/1e3).toFixed(b>=1e5?0:1)+' KB':b+' B';
  function resBlocks(R,list,s,a,cur){const rs=list.filter(r=>r.st===s);if(!rs.length)return;const w=rs.reduce((t,r)=>t+side(r.b)+.08,-.08);let x=SX[s]-w/2,top=0;
    rs.forEach(r=>{const d=side(r.b);R.box([x+d/2,0,ZT],[d,d,d],{fill:tint(R.P,R.P.c5,.6),a});x+=d+.08;top=Math.max(top,d)});
    if(cur)lab(R,[SX[s],0,ZT+.35],(rs.length===1?rs[0].lbl:rs.length+' residuals')+' · '+kb(rs.reduce((t,r)=>t+r.b,0)),{mono:true,fs:12,dy:13,c:R.P.c5,b:1,a})}
  // a gradient with its real shape: [128,512] and [512,128] as upright plates, [512] and [128] as bars
  function grads(R,s,a){const P=R.P,c=P.c2;if(s===0)R.glass([SX[0]-.6,.05,ZG],[1.2,0,0],[0,.3,0],{c,a,nu:8,nv:2,th:.04});
    if(s===3)R.glass([SX[3]-.15,.05,ZG],[.3,0,0],[0,1.2,0],{c,a,nu:2,nv:8,th:.04});
    if(s===1)R.box([SX[1],.05,ZG],[1.2,.07,.07],{fill:tint(P,c,.8),a,shadow:false});
    if(s===4)R.box([SX[4],.05,ZG],[.3,.07,.07],{fill:tint(P,c,.8),a,shadow:false})}
  const GL=['W1 grad [128,512]','b1 grad [512]','','W2 grad [512,128]','b2 grad [128]'],GT=[.35,.12,0,1.25,.12];
  function draw(R,k,e){const P=R.P;R.grid(-4.6,4.6,-3.4,2.6,.5);
    ST.forEach((n,s)=>lab(R,[SX[s],0,ZF+.31],n,{mono:true,fs:12.5,b:1,dy:15,c:P.ink}));
    if(mode==='fwd'){const cur=FF[k]||[],done=s=>k===4||(k>=1&&s<=Math.max(...[].concat(...FF.slice(1,k+1)),-1));
      lab(R,[SX[0]-.7,.1,ZF],'primal',{al:'right',dx:-8,mono:true,fs:12.5,b:1,c:P.c3,grp:'row'});lab(R,[SX[0]-.7,.1,ZBK],'tangent',{al:'right',dx:-8,mono:true,fs:12.5,b:1,c:P.acc,grp:'row'});
      for(let s=0;s<5;s++){const on=cur.includes(s),d=done(s)&&!on,g=on?Math.min(1,e*1.3):1,nP=Math.round(JP[s].length*(on?g:d?1:0)),nT=Math.round(JT[s].length*(on?g:d?1:0)),a=on?1:k===4?.85:.5;
        tower(R,s,ZF,JP[s],nP,tint(P,P.c3,.5),a,on);tower(R,s,ZBK,JT[s],nT,tint(P,P.acc,.5),a,on);
        if(!on&&!d){R.box([SX[s],.01,ZF],[1.2,.01,.62],{fill:P.paper,a:.35,fa:.2,shadow:false});R.box([SX[s],.01,ZBK],[1.2,.01,.62],{fill:P.paper,a:.35,fa:.2,shadow:false})}}
      if(k>=1&&k<=3){const ss=FF[k],a=ss[0],b=ss[ss.length-1],x0=a===0?SX[0]-1.2:SX[a-1],x1=SX[b];
        R.flowArc([x0,.3,ZF],[x1,.3+JP[b].length*PIT,ZF],.4,{c:P.c3,r:.07,a:e,n:6});R.flowArc([x0,.3,ZBK],[x1,.3+JT[b].length*PIT,ZBK],.4,{c:P.acc,r:.07,a:e,n:6})}
      if(k===4){lab(R,[SX[4]+.6,.3,ZF],'y',{mono:true,fs:13,b:1,al:'left',dx:10,c:P.c3});lab(R,[SX[4]+.6,.3,ZBK],'y_dot',{mono:true,fs:13,b:1,al:'left',dx:10,c:P.acc});
        lab(R,[0,0,ZT],'no tape: nothing is kept',{fs:12.5,b:1,c:P.mute,a:e})}
      return}
    // reverse mode
    const rows=[[ZF,'forward',P.c3,k<=3||k===7],[ZT,'tape',P.c5,true],[ZBK,'backward',P.c2,k===0||k>=4],[ZG,'gradients',P.c2,k===0||k>=4]];
    rows.forEach(([z,t,c,on])=>{if(on)lab(R,[SX[0]-.7,.1,z],t,{al:'right',dx:-8,mono:true,fs:12.5,b:1,c,grp:'row'})});
    const fd=fdone(k),bf=bfrom(k);
    for(let s=0;s<5;s++){const fon=RF[k].includes(s),bon=RB[k].includes(s);
      // forward tower: grows during its step
      const nF=fon?Math.round(FWD[s].length*Math.min(1,e*1.3)):s<fd?FWD[s].length:0,aF=fon?1:k>=4?.35:.6;
      if(nF)tower(R,s,ZF,FWD[s],nF,tint(P,P.c3,.5),aF,fon);else R.box([SX[s],.01,ZF],[1.2,.01,.62],{fill:P.paper,a:.35,fa:.2,shadow:false});
      // backward tower: one plate per transposed equation
      const nB=bon?Math.round(BWD[s].length*Math.min(1,e*1.3)):s>=bf&&!bon?BWD[s].length:0,aB=bon?1:k===7?.8:.55;
      if(nB)tower(R,s,ZBK,BWD[s],nB,tint(P,P.c2,.5),aB,bon);else R.box([SX[s],.01,ZBK],[1.2,.01,.62],{fill:P.paper,a:.3,fa:.15,shadow:false});
      // residuals: saved when the forward stage runs, released when the backward reaches it
      const saved=fon?Math.min(1,e*1.6):s<fd?1:0,used=bon?off(k,e,k):s>=bf&&!bon&&k>=4?0:1,aR=saved*used;
      if(aR>.01){resBlocks(R,RES[who],s,aR*(fon||bon?1:.75),fon);if(fon)R.flowArc([SX[s],.1+nF*PIT,ZF-.3],[SX[s],.6,ZT],.25,{c:P.c5,r:.06,a:e,n:4})}
      if(bon&&RES[who].some(r=>r.st===s))R.flowArc([SX[s],.6,ZT],[SX[s],.1+nB*PIT,ZBK+.3],.25,{c:P.c5,r:.06,a:1-e,n:4});
      // gradients appear when the backward pass reaches their stage
      const ga=bon?Math.max(0,e*1.6-.5):s>=bf&&k>=4?1:0;if(ga>0&&GL[s]){grads(R,s,ga);lab(R,[SX[s],GT[s]+.05,ZG],GL[s],{mono:true,fs:12,dy:-11,c:P.c2,b:bon,a:ga,wide:!bon})}
      if(bon&&GL[s])R.flowArc([SX[s],.1+nB*PIT,ZBK-.3],[SX[s],GT[s]+.05,ZG],.3,{c:P.c2,r:.07,a:e,n:5})}
    // values flow left to right through the forward stages; the cotangent right to left through the backward ones
    if(RF[k].length){const ss=RF[k],a=ss[0],b=ss[ss.length-1],x0=a===0?SX[0]-1.3:SX[a-1];R.flowArc([x0,.3,ZF],[SX[b],.25+FWD[b].length*PIT,ZF],.45,{c:P.c3,r:.07,a:e,n:6})}
    if(RB[k].length){const ss=RB[k],a=ss[0],b=ss[ss.length-1],x0=a===4?SX[4]+1.3:SX[a+1];R.flowArc([x0,.3,ZBK],[SX[b],.25+BWD[b].length*PIT,ZBK],.45,{c:P.c2,r:.07,a:e,n:6})}
    if(k===3)lab(R,[SX[4]+.6,.3,ZF],'y',{mono:true,fs:13,b:1,al:'left',dx:10,c:P.c3,a:e});
  }
  // the panes and counters beside the step list (text: the real equations)
  const lines=(arr,cls)=>arr.length?arr.map(e=>'<div class="'+(cls||'')+'">'+esc(e.t)+'</div>').join(''):'<div class="dim">(none in this step)</div>';
  function panes(k){const P=$('jcad-panes');if(!P)return;let lh='',rh='',L='',Rr='';
    if(mode==='rev'){
      if(k===0){lh='The VJP program';rh='';L='<div class="dim">'+T.vjp.eqns.length+' equations: '+T.vjp.eqns.filter(e=>!e.d).length+' forward, '+T.vjp.eqns.filter(e=>e.d).length+' backward</div>';Rr='<div class="dim">step on to see each stage\'s equations</div>'}
      else if(k<=3){const ss=RF[k];lh='Forward equations of this step';rh='Kept on the tape';L=lines([].concat(...ss.map(s=>FWD[s])));const sv=RES[who].filter(r=>ss.includes(r.st));
        Rr=sv.length?sv.map(r=>'<div class="on">'+esc(r.lbl)+'  '+r.b.toLocaleString('en-US')+' B</div>').join(''):'<div class="dim">(nothing)</div>'}
      else if(k<=6){const ss=RB[k];lh='Before: the linear (tangent) program';rh='After: transposed (cotangent) program';
        L=lines([].concat(...ss.map(s=>T.linear.eqns.filter((e,i)=>T.linear.stage[i]===s))),'t');Rr=lines([].concat(...ss.map(s=>T.transpose.eqns.filter((e,i)=>T.transpose.stage[i]===s))),'on')}
      else{lh='Program outputs';rh='';L='<div>'+esc(T.vjp.outvars.join(', '))+'</div>';Rr='<div class="dim">gradients of b1, W1, b2, W2 (pytree order)</div>'}}
    else{if(k===0){lh='The JVP program';rh='';L='<div class="dim">'+T.jvp.eqns.length+' equations: '+T.jvp.eqns.filter(e=>!e.d).length+' primal, '+T.jvp.eqns.filter(e=>e.d).length+' tangent</div>';Rr=''}
      else if(k<=3){const ss=FF[k];lh='Primal equations';rh='Tangent equations';L=lines([].concat(...ss.map(s=>JP[s])));Rr=lines([].concat(...ss.map(s=>JT[s])),'t')}
      else{lh='Program outputs';rh='';L='<div>'+esc(T.jvp.outvars.join(', '))+'</div>';Rr='<div class="dim">y, y_dot</div>'}}
    P.innerHTML='<div class="jc-pane"><div class="h">'+lh+'</div><div class="jc-lines">'+L+'</div></div>'+(rh||Rr?'<div class="jc-pane"><div class="h">'+(rh||'&nbsp;')+'</div><div class="jc-lines">'+Rr+'</div></div>':'');
    // counters
    let eqDone=0,tape=0,gr=0;
    if(mode==='rev'){const fd=fdone(k),bf=bfrom(k);eqDone=FWD.slice(0,fd).reduce((t,a)=>t+a.length,0)+(k>=4?BWD.slice(bf).reduce((t,a)=>t+a.length,0):0);
      tape=RES[who].filter(r=>r.st<fd&&!(k>=4&&r.st>=bf)).reduce((t,r)=>t+r.b,0);gr=k>=4?GL.filter((g,s)=>g&&s>=bf).length:0}
    else{const n=k===4?5:k===0?0:Math.max(...[].concat(...FF.slice(1,k+1)))+1;eqDone=JP.slice(0,n).reduce((t,a)=>t+a.length,0)+JT.slice(0,n).reduce((t,a)=>t+a.length,0)}
    $('jcad-cnt').innerHTML=RD.stat('equations run',eqDone,'of '+(mode==='rev'?T.vjp.eqns.length:T.jvp.eqns.length))+
      RD.stat('on the tape now',mode==='rev'?(tape/1e3).toFixed(1)+' KB':'0 KB',mode==='rev'?(who==='jax'?'JAX residuals':'PyTorch saved tensors'):'forward mode keeps nothing')+
      RD.stat('weight gradients',mode==='rev'?gr+' of 4':'n/a',mode==='rev'?'':'a JVP gives one direction')+
      RD.stat('program FLOPs',((mode==='rev'?A.flops['vjp (forward + backward)']:A.flops.jvp)/1e6).toFixed(2)+' M','forward alone '+(A.flops.forward/1e6).toFixed(2)+' M')}
  const full={cam:[.14,.92],bounds:[[-4.3,0,-3.0],[4.3,1.2,2.1]]};
  const st=S3.stage({id:'stg-ad',list:'sx-ad',fig:'Fig. 3 · block 0\'s MLP: one plate per equation',cam:full.cam,bounds:full.bounds,aspect:.52,dur:1500,hold:5200,draw,
    margin:w=>w<520?[14,10,14,10]:[18,16,18,96],onStep:k=>{try{panes(k)}catch(err){console.error(err)}},
    // forward steps look at the forward row and the tape, backward steps at the backward row and the gradients
    view:k=>mode==='fwd'?{cam:[.14,.85],bounds:[[-4.3,0,-1.9],[4.3,1.2,2.2]]}:k>=1&&k<=3?{cam:[.14,.82],bounds:[[-4.3,0,-.6],[4.3,1.2,2.2]]}:k>=4&&k<=6?{cam:[.14,.9],bounds:[[-4.3,0,-3.1],[4.3,1.3,.6]]}:full});
  const M=$('jcad-mode'),W=$('jcad-who');
  if(st&&M)M.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b||b.dataset.m===mode)return;mode=b.dataset.m;M.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    $('sx-ad').hidden=mode!=='rev';$('sx-ad-f').hidden=mode!=='fwd';W.hidden=mode!=='rev';st.list(mode==='rev'?'sx-ad':'sx-ad-f')});
  if(st&&W)W.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b||!b.dataset.m)return;who=b.dataset.m;W.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));st.draw();panes(st.st.k)});
  if(st)panes(0);
  (window.JCSTG=window.JCSTG||{})['stg-ad']=st;
})();
