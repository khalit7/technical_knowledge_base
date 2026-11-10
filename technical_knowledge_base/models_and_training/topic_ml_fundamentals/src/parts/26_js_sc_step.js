// ---- Fig. 1: one real training step of the toy network, seven moments on one line, then the four threads (renderer v2, 2026-11-10) ----
// Every bar and column is a number RDE computes in the browser (checked against PyTorch in src/read/recompute.py): RDE.step(recipe) for the step,
// RDE.stats(mode) for the per-layer spread and gradient. Each station has its own scale (the labels carry the values); dot counts are schematic.
// The camera shows the whole line on step 1 and step 8, and the station that acts plus the one it receives from on steps 2 to 7.
// window.STEP1 holds the formatted numbers the step lists quote (src/check_stages.mjs compares them).
(function(){
  if(!document.getElementById('stg-step')||!window.RDE)return;const {lerp,mix}=S3;
  let rec='modern';
  const XS=[0,1,2,3,4,5,6].map(i=>-7.8+2.6*i),NM=['data, init','forward','loss','backward','update','regularise','measure'];
  const f2=v=>v.toFixed(2),pc=(v,n)=>(100*v).toFixed(n==null?1:n)+'%';
  const D={};
  function data(r){if(D[r])return D[r];const s=RDE.step(r),R=RDE.RECIPES[r],st=RDE.stats(R.mode),cl=r==='classic';
    const sig=cl?[Math.sqrt(2/64)]:[Math.sqrt(1/64),Math.sqrt(1/176)/4];
    const o={s,st,cl,sig,
      lab:{sig:'σ '+sig.map(v=>v.toFixed(3)).join(', '),spread:'spread '+f2(st.acts[0])+' → '+f2(st.acts[15]),loss:'loss '+f2(s.loss0),
        g:cl?'‖g‖ '+s.gnorm.toFixed(1)+', not clipped':'‖g‖ '+f2(s.gnorm)+' → 1.00',fl:'layer 1: '+f2(s.first)+' · layer 16: '+f2(s.last),
        up:'Δθ = '+pc(s.unorm/s.pnorm)+' of θ',dec:'decay = '+pc(s.wdnorm/s.unorm,cl?2:1)+' of Δθ',
        bat:'batch '+f2(s.loss0)+' → '+f2(s.loss1),ho:'held-out '+f2(s.hl0)+' → '+f2(s.hl1)},
      // strings the step list must contain (checked)
      quotes:cl?[s.nparams.toLocaleString('en-GB'),sig[0].toFixed(3),f2(st.inStd),f2(st.acts[0]),f2(st.acts[15]),f2(s.loss0),s.gnorm.toFixed(1),(s.first/s.last).toFixed(1),f2(s.first),f2(s.last),pc(s.unorm/s.pnorm),pc(s.wdnorm/s.unorm,2),
          f2(s.loss0)+' to '+f2(s.loss1),pc(s.acc0)+' to '+pc(s.acc1),f2(s.hl0)+' to '+f2(s.hl1),pc(s.ha0)+' to '+pc(s.ha1)]
        :[s.nparams.toLocaleString('en-GB'),sig[0].toFixed(3),sig[1].toFixed(3),f2(st.acts[0]),f2(st.acts[15]),f2(s.loss0),f2(s.gnorm),s.scale.toFixed(3),f2(s.first),f2(s.last),pc(s.unorm/s.pnorm),s.wdnorm.toFixed(4),pc(s.wdnorm/s.unorm),
          f2(s.loss0)+' to '+f2(s.loss1),pc(s.acc0)+' to '+pc(s.acc1),f2(s.hl0)+' to '+f2(s.hl1),pc(s.ha0)+' to '+pc(s.ha1)]};
    return D[r]=o}
  window.STEP1={modern:data('modern').quotes,classic:data('classic').quotes,labels:r=>data(r).lab};
  // which stations a step shows, and how strongly: the whole line on steps 1 and 8, the acting station and the one before it otherwise
  const A=(k,i)=>k===0?(i===0?1:.42):k===7?.22:i===k?1:i===k-1?.34:0;
  const mono={mono:true,fs:12};
  // threads: [from station, to station, arc height, colour key, label]
  const TH=[[2,6,1.55,'c5','1 · cross entropy'],[0,1,.75,'c3','2 · constant variance'],[1,3,1.1,'c2','3 · vanishing gradients'],[4,5,.75,'c4','4 · weight decay']];
  const TOP=[.95,1.5,1.62,1.5,1.2,1.25,1.6];
  function draw(R,k,e,st){const P=R.P,ph=R.W<520,T=data(rec),s=T.s;R.grid(-9.6,9.6,-1.6,1.8,.5);
    const pk=st&&st.pk!=null?st.pk:k,al=i=>{const a0=A(pk,i),a1=A(k,i);return a1<a0&&a1===0?lerp(a0,0,Math.min(1,e*2.6)):lerp(a0,a1,e)};
    const la=Math.max(0,(e-.55)/.45),full=k===0||k===7;
    for(let i=0;i<7;i++){const x=XS[i],a=al(i);if(a<=.01)continue;const on=A(k,i)===1;
      // the station's pad and name
      R.quad([[x-1.15,.004,-.8],[x+1.15,.004,-.8],[x+1.15,.004,.85],[x-1.15,.004,.85]],{fill:mix(P.card,on?P.acc:P.mute,P.dark?.18:.09),fa:a,ea:.35*a});
      if(full||A(k,i)>0)R.label([x,0,.85],ph?String(i+1):(i+1)+' '+NM[i],{...mono,b:on,dy:14,c:on?P.ink:P.mute,a:Math.min(1,full?Math.max(a,.6):a+.3)*(full?1:la)});
      const lb=(p,t,o)=>{if(on&&!full)R.label(p,t,Object.assign({...mono,b:1,a:la},o))};
      if(i===0){ // the batch (32 × 64) as a glass plate; the starting weights' scale as white columns
        R.glass([x-1.0,.08,-.15],[1.15,0,0],[0,.82,0],{c:P.c1,a,nu:8,nv:4});
        T.sig.forEach((v,j)=>R.box([x+.5+j*.32,0,.1],[.22,Math.max(.03,v*6),.22],{a}));
        lb([x-.42,.9,-.15],'batch 32 × 64',{dy:-10,c:P.c1,wide:1});lb([x+.5,T.sig[0]*6,.1],T.lab.sig,{dy:-12,al:'left',dx:-10})}
      if(i===1||i===3){ // per-layer bars: the forward spread (blue) or the backward gradient (orange), layer 1 on the left
        const v=i===1?T.st.acts:T.st.grads,sc=i===1?.6:.33,c=i===1?P.c1:P.c2;
        const x0=i===1?x-.92:x-1.0,dl=i===1?.123:.092;v.forEach((y,l)=>R.box([x0+l*dl,0,-.25],[i===1?.085:.068,Math.max(.02,y*sc),.3],{fill:mix(P.paper,c,.75),a,shadow:false,lw:.6}));
        if(i===1){R.box([x-1.06,0,-.25],[.07,T.st.inStd*sc,.3],{fill:P.mute,a,shadow:false,lw:.6});lb([x,Math.max(...v)*sc+.42,-.25],T.lab.spread,{dy:-6,c:P.c1})}
        else{lb([x+.4,Math.max(...v)*sc+.42,-.25],T.lab.fl,{dy:-6,al:'right',c:P.c2,wide:1});
          // the global gradient norm, square-root scale, at the right: before and (2026) after clipping to 1.0
          const gs=g=>.36*Math.sqrt(g);R.box([x+.72,0,.1],[.22,gs(s.gnorm),.22],{fill:P.c2,a});
          if(!T.cl)R.box([x+1.0,0,.1],[.22,gs(1),.22],{fill:mix(P.paper,P.c2,.4),a});
          lb([x+.62,gs(s.gnorm),.1],T.lab.g,{dy:-12,al:'left',c:P.c2})}}
      if(i===2){const h=s.loss0*.3,c=mix(P.paper,P.c1,.5);R.box([x,0,0],[.46,h,.46],{fill:c,a});
        R.glass([x-.75,Math.log(10)*.3,-.6],[1.5,0,0],[0,0,1.2],{c:P.c5,a:a*.85,nu:2,nv:2});
        lb([x,h,0],T.lab.loss,{dy:-12});lb([x+.75,Math.log(10)*.3,.6],'chance: ln 10 = 2.30',{al:'left',dx:6,c:P.c5,wide:1})}
      if(i===4){R.glass([x-1.0,.08,-.15],[.95,0,0],[0,.9,0],{c:P.c4,a,nu:6,nv:6});
        const h=40*s.unorm/s.pnorm;R.box([x+.55,0,.1],[.3,h,.3],{fill:P.c4,a});lb([x+.55,h,.1],T.lab.up,{dy:-12,c:P.c4})}
      if(i===5){const h=1.15,hd=Math.max(.015,h*s.wdnorm/s.unorm);R.box([x-.3,0,0],[.3,h,.3],{fill:mix(P.paper,P.c4,.4),a:a*.7});
        R.box([x+.3,0,0],[.3,hd,.3],{fill:P.c3,a});lb([x-.3,h,0],'update Δθ',{dy:-12,c:P.c4,wide:1});lb([x+.3,hd,0],T.lab.dec,{dy:-12,al:'left',dx:-8,c:P.c3})}
      if(i===6){const sc=.24,cb=mix(P.paper,P.c1,.5),ch=P.c6;
        [[-.78,s.loss0,cb],[-.42,s.loss1,cb],[.42,s.hl0,ch],[.78,s.hl1,ch]].forEach(([dx,v,c],j)=>R.box([x+dx,0,0],[.28,v*sc,.3],{fill:c,a:a*(j%2?1:.6)}));
        lb([x-.25,Math.max(s.loss0,s.loss1)*sc,0],T.lab.bat,{dy:-12,al:'right',c:P.c1});lb([x+.25,Math.max(s.hl0,s.hl1)*sc,0],T.lab.ho,{dy:-12,al:'left',c:P.c6})}
    }
    // what moves at this moment
    const fa=Math.min(1,e*1.5),X=XS,F=(pts,c,n)=>R.flow(pts,{c,a:fa,r:.075,speed:1.2,n}),FA=(p,q,h,c,n)=>R.flowArc(p,q,h,{c,a:fa,r:.075,speed:1.2,n});
    if(k===0)FA([X[0]-.4,.6,-.15],[X[1]-1,.5,-.25],.6,P.c1,8);
    const mf=Math.max(...T.st.acts)*.6+.14,mb=Math.max(...T.st.grads)*.33+.14;
    if(k===1)F([[X[1]-1.05,mf,-.25],[X[1]+1.0,mf,-.25]],P.c1,9);
    if(k===2)FA([X[1]+.9,mf,-.25],[X[2],s.loss0*.3+.05,0],.5,P.c1,9);
    if(k===3){FA([X[2],s.loss0*.3+.05,0],[X[3]+.42,mb,-.25],.5,P.c2,8);F([[X[3]+.42,mb,-.25],[X[3]-1.02,mb,-.25]],P.c2,9)}
    if(k===4)FA([X[3]-1.0,.55,-.25],[X[4]-.55,.55,-.15],.7,P.c2,10);
    if(k===5)FA([X[4]-.5,.6,-.15],[X[5]+.3,.15,0],.6,P.c3,5);
    if(k===6){FA([X[5]-.3,1.2,0],[X[6]-.42,.6,0],.6,P.c4,8);FA([X[6]+1.4,.5,.8],[X[6]+.6,.7,0],.3,P.c6,6)}
    if(k===7)TH.forEach(([a,b,h,c,t],j)=>{const p=[X[a],TOP[a],0],q=[X[b],TOP[b],0],cc=P[c];
      R.arc(p,q,h,{c:cc,w:2.2,t:Math.min(1,e*1.3),top:1});R.flowArc(p,q,h,{c:cc,a:fa,r:.07,speed:1.1,n:7});
      const m=R.arcPt(p,q,h,.5);R.label(m,ph?String(j+1):t,{...mono,b:1,dy:-10,c:cc,a:la})});
  }
  const full={cam:[.12,.68],bounds:[[-9.2,0,-.9],[9.2,1.5,1.1]]},fullT={cam:[.12,.62],bounds:[[-9.2,0,-.9],[9.2,2.5,1.1]]};
  const pair=k=>({cam:[.2,.58],bounds:[[XS[k-1]-1.3,0,-.9],[XS[k]+1.5,1.35,1.1]]});
  const fig='Fig. 1 · one real step of the toy, seven moments, four threads';
  const stg=S3.stage({id:'stg-step',list:'sx-st-modern',fig,cam:full.cam,bounds:full.bounds,aspect:.36,dur:1500,hold:5600,draw,
    margin:w=>w<520?[22,8,14,8]:[26,16,16,16],
    view:k=>{const v=k===0?full:k===7?fullT:pair(k);return innerWidth<520&&(k===0||k===7)?{cam:[.12,.8],bounds:v.bounds}:v}});
  // the recipe toggle swaps the step list and replays
  const seg=document.getElementById('rd-stR');
  if(seg&&stg)seg.addEventListener('click',ev=>{const b=ev.target.closest('button[data-r]');if(!b||b.dataset.r===rec)return;rec=b.dataset.r;
    seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',String(x===b))});
    ['modern','classic'].forEach(r=>{const l=document.getElementById('sx-st-'+r);if(l)l.hidden=r!==rec});stg.list('sx-st-'+rec)});
})();
