// ---- Scene (section 5): one preference pair through eight losses (renderer v2) ----
// Every height and number is the page's toy (window.AL_PAIR, the JS port of recompute.py, checked by check_pair.mjs): per-token reference
// probabilities (illustrative, as the step text says), the loss's scores and margin, the per-token push, and 400 steps of training on this
// pair alone, read from the recorded run at every step while the step plays. The loss picker replays the stage for the chosen loss.
(function(){
  if(!document.getElementById('stg-pr')||!window.S3||!window.AL_PAIR||!window.AL_PAIR_UI)return;const {at,off,lerp,mix,ease}=S3;
  const X=AL_PAIR,U=AL_PAIR_UI,MET=U.MET,RUN=U.RUN,f=U.f,$=id=>document.getElementById(id);
  const NC=X.CH.length,NR=X.RJ.length,SH=X.SH,DX=.3,X0=-3.7,ZC=1.0,ZR=-1.0,HT=1.15,XS=3.2,B0=.95,BH=.85;
  const xt=i=>X0+i*DX,lsig=t=>t>-30?-Math.log1p(Math.exp(-t)):t;
  let cur='dpo';const met=()=>MET.find(m=>m.k===cur);
  const CK=[0,50,100,200,400];
  // per loss: the largest score over the run, so its two score bars fill the same height whatever the loss's units
  const SCALE={};MET.forEach(m=>{const r=RUN[m.k];SCALE[m.k]=Math.max(1e-9,...CK.map(s=>{const o=X.evaluate(m.k,r.snap[s].thC,r.snap[s].thR,r.snap[s].rm);return Math.max(Math.abs(o.score_c),Math.abs(o.score_r))}))});
  const stepOf=(k,e)=>k<4?0:k===4?Math.round(50*e):Math.round(50+350*e);
  function stateAt(s){const r=RUN[cur],sn=r.snap[s];return {sn,o:X.evaluate(cur,sn.thC,sn.thR,sn.rm),o0:X.evaluate(cur,r.snap[0].thC,r.snap[0].thR,r.snap[0].rm)}}
  function draw(R,k,e){const P=R.P,m=met(),s=stepOf(k,k>=4?ease(e):1),{sn,o,o0}=stateAt(s);R.grid(-4.6,4.6,-2.2,2.2,.5);
    const noRef=m.k==='simpo'||m.k==='orpo',isRM=m.k==='rm',read=k===1?e:k>1?1:0;
    const refA=noRef?1-.8*read:1,tokA=isRM?1-.7*read:1;
    // the push on each token, normalised by the loss's largest push at step 0 (so the shapes compare across losses)
    const scP=Math.max(Math.abs(o0.gc+o0.gr),Math.abs(o0.gc),Math.abs(o0.gr))||1;
    const rows=[[X.CH,X.CH_P,sn.thC,ZC,P.c3,j=>(o.gc+(j<SH?o.gr:0))/scP],[X.RJ,X.RJ_P,sn.thR,ZR,P.bad,j=>(o.gr+(j<SH?o.gc:0))/scP]];
    rows.forEach(([toks,ref,th,z,col,push],ri)=>{toks.forEach((t,j)=>{const x=xt(j),sh=j<SH,c=sh?P.c4:col,p=Math.exp(lsig(th[j]));
        R.box([x,0,z],[.24,ref[j]*HT,.24],{fill:mix(P.paper,c,.12),fa:.28,ea:.5,a:refA*tokA,shadow:false,lw:.6});
        R.box([x,0,z],[.13,Math.max(.01,p*HT),.13],{fill:mix(P.paper,c,.8),a:tokA,shadow:false,lw:.5});
        // the push: a stream into the token's top, up for a positive push, down for a negative one
        if(k>=3&&!isRM){const g=push(j),ag=Math.abs(g);if(ag>.02){const y=p*HT,up=g>0,fa=k===3?Math.min(1,e*1.5):.8;
            R.flow(up?[[x,y+.05,z],[x,y+.55,z]]:[[x,y+.6,z],[x,y+.05,z]],{c:up?P.good:P.bad,a:fa*Math.min(1,.35+ag),r:.035+.035*Math.min(1,ag),n:2+Math.round(3*Math.min(1,ag)),speed:.8})}
          else if(sh&&k===3)R.glow([x,p*HT+.15,z],.18,{c:P.c4,a:.7*e})}});
      const lp=ri?o.Sr:o.Sc,lp0=ri?o0.Sr:o0.Sc;
      R.label([xt(0)-.3,0,z],(ri?'rejected · wrong · ':'chosen · right · ')+(s?'':toks.length+' tokens · ')+'log p '+f(lp)+(s?' (was '+f(lp0)+')':''),{al:'right',dx:-30,fs:12.5,b:1,c:ri?P.bad:P.good,grp:'row',wide:1});
      R.label([xt(toks.length-1)+.2,0,z],(ri?'$24':'$8'),{al:'left',dx:6,mono:true,fs:12.5,b:1,c:ri?P.bad:P.good})});
    R.label([xt(.5),0,ZC+.15],'shared · 12 pens',{fs:12.5,b:1,dy:15,c:P.c4,a:k===0||k===3?1:.7,wide:1});
    // what the loss reads (step 2)
    if(k===1){const t=isRM?'the reward model reads each whole answer':noRef?'no reference: the policy alone':m.k==='lndpo'?'log-ratios averaged per token':m.k==='kto'?'each answer against z₀, unpaired':'summed log-ratio, log π − log π_ref';
      R.label([xt(0),HT+.25,ZR],t,{al:'left',fs:13,b:1,c:P.acc,a:e,wide:1})}
    if(isRM&&k>=1){const a=read;R.glass([XS-1.05,.05,-.1],[0,0,.5],[0,1.0,0],{c:P.c4,a});R.label([XS-1.05,1.1,0],'reward model',{fs:12.5,b:1,dy:-8,c:P.c4,a,wide:1});
      if(k===1)[ZC,ZR].forEach(z=>R.flow([[xt(4),.4,z],[XS-1.05,.5,0]],{c:P.c4,a:e,r:.05,n:6}))}
    // the two scores and the margin (step 3 on)
    if(k>=2&&k!==3||k===3&&e<1){const a=k===2?e:k===3?1-e:1,sc=SCALE[cur];[[o.score_c,ZC,P.good],[o.score_r,ZR,P.bad]].forEach(([v,z,c])=>{const h=Math.max(.012,Math.abs(v)/sc*BH*a);
        R.box([XS,B0-.035,z],[.7,.035,.4],{a,shadow:false});R.box([XS,0,z],[.03,B0-.035,.03],{a:a*.7,shadow:false});
        R.box([XS,v>=0?B0:B0-.035-h,z],[.38,h,.26],{fill:mix(P.paper,c,.75),a,shadow:false});
        R.label([XS+.3,v>=0?B0+h:B0-.035-h,z],f(v,2),{al:'left',dx:6,mono:true,fs:12.5,b:1,c,a})});
      R.label([XS-.3,B0+BH+.05,ZR],(m.k==='kto'?'r_w − r_l ':'margin ')+f(o.margin,3)+' · loss '+f(o.loss,3),{mono:true,fs:12.5,b:1,c:P.ink,a,wide:1})}
    if(k>=4)R.label([xt(0),HT+.25,ZR],'training step '+s+' of 400',{al:'left',mono:true,fs:12.5,b:1,c:P.ink,wide:1});
  }
  function readout(k){const m=met(),s=k<4?0:k===4?50:400,{o}=stateAt(s);
    let t='<b>'+m.n+'</b>, step '+(k+1)+': ';
    if(k===0)t+='both answers start where the reference is. '+m.note;else if(k===1)t+=U.readText(m,o);else if(k===2)t+=U.scoreText(m,o);
    else if(k===3)t+=U.scoreText(m,o)+' '+U.pushText(m,o);else if(k===4)t+='after 50 steps: '+U.scoreText(m,o);else t+=U.endText(m);
    $('prC').innerHTML=t;
    $('prN').innerHTML=RD.stat('Models in memory',m.mem,'forward passes: '+m.fw)+RD.stat(m.k==='kto'?'r<sub>w</sub> − r<sub>l</sub>':'Margin',k>=2?f(o.margin,3):'not yet',m.k==='ipo'?'target 5':(m.k==='cdpo'?'push stops at 2.197':''))+
      RD.stat('Loss',k>=2?f(o.loss,3):'not yet','training step '+s+' of 400')}
  const chips=$('prM');chips.innerHTML=MET.map(m=>'<button data-m="'+m.k+'"'+(m.k===cur?' class="on"':'')+'>'+(m.bef?'Before: ':'')+m.n+'</button>').join('');
  const eq=()=>{$('prEq').innerHTML=met().eq};eq();
  const full={cam:[.06,.6],bounds:[[-4.0,0,-1.3],[4.0,.9,1.4]]};
  const stg=S3.stage({id:'stg-pr',list:'sx-pr',fig:'Fig. 5 · one pair, '+'eight losses (toy, illustrative probabilities)',cam:full.cam,bounds:full.bounds,aspect:.44,dur:1800,hold:5200,draw,
    margin:w=>w<520?[16,10,14,10]:[20,14,14,264],onStep:k=>{try{readout(k)}catch(err){}},
    view:k=>k===3?{cam:[.2,.5],bounds:[[-3.9,0,-1.2],[0.9,1.6,1.3]]}:full});
  chips.addEventListener('click',ev=>{const b=ev.target.closest('button[data-m]');if(!b||b.dataset.m===cur)return;cur=b.dataset.m;
    chips.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));eq();stg.list('sx-pr')});
  window.AL_STG=window.AL_STG||{};AL_STG.pr={stage:stg,set:k=>{cur=k;eq();chips.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x.dataset.m===k))}};
})();
