// ---- Scene (Fig. 2): the plain RNN unrolled over the running example, then backpropagation through time (renderer v2) ----
// The plain RNN trained on sequences of 5 to 10 symbols (SQ.mem.short_rnn, run by CELL in 22_js_cells.js, checked against PyTorch by
// check_cells.py) on "b w w z y y x w w ?" (CELL.sequence(1, 10, 7)): its real 8-number states, its answer at "?", and the factor the
// gradient is multiplied by on the way back, the Frobenius norm of the Jacobian product d a_10 / d a_k = prod diag(1 - a_j^2) W.
// The step list's numbers are static spans (data-rn) written here from the same run; check_stages.mjs compares them.
(function(){
  const $=id=>document.getElementById(id);if(!$('stg-rnn')||!window.S3||!window.CELL)return;const {at,off,lerp,mix}=S3;
  const C=CELL,H=C.H,T=10,KEY=1,m=C.models.rnn_short,seq=C.sequence(KEY,T,7),run=C.run(m,seq),A=run.tr.map(o=>o.h),PA=run.p[T-1];
  // the gradient factor back from the last state to each step's state
  const G=new Array(T);G[T-1]=1;{let J=null;for(let t=T-1;t>=1;t--){const d=A[t].map(v=>1-v*v),Jt=[];for(let a=0;a<H;a++){Jt.push([]);for(let b=0;b<H;b++)Jt[a].push(d[a]*m.Whh[a*H+b])}
    if(!J)J=Jt;else{const N=[];for(let a=0;a<H;a++){N.push([]);for(let b=0;b<H;b++){let s=0;for(let k=0;k<H;k++)s+=J[a][k]*Jt[k][b];N[a].push(s)}}J=N}
    let s=0;J.forEach(r=>r.forEach(v=>s+=v*v));G[t-1]=Math.sqrt(s)}}
  const gmin=Math.min(...G);
  const F={pkey:PA[KEY].toFixed(3),g3:G[T-1-3].toFixed(2),gmin:gmin.toFixed(3),gkey:G[0].toFixed(3)};
  document.querySelectorAll('[data-rn]').forEach(e=>{if(F[e.dataset.rn]!=null)e.textContent=F[e.dataset.rn]});
  window.SQ_RNN={G,PA,seq,F};
  const XS=1.05,x=t=>(t-(T-1)/2)*XS,ZT=1.6,YS=1.05,ZG=-1.45,YU=.42,YW0=.62,YW1=1.6,WMAX=2.75;
  // a vector as signed bars on a white plinth (positive up, negative hanging below)
  function comb(R,c,vals,col,a,hmax,wd){if(a<=.01)return;const nb=vals.length,bw=wd/nb;
    R.box([c[0],c[1]-.04,c[2]],[wd+.12,.04,.3],{a,shadow:false});
    vals.forEach((v,i)=>{const hg=Math.max(.012,Math.abs(v)*hmax),bx=c[0]-wd/2+bw*(i+.5);R.box([bx,v>=0?c[1]:c[1]-.04-hg,c[2]],[bw*.72,hg,.1],{fill:col,a,shadow:false,lw:.6})})}
  // a label only when its anchor is on the canvas (close-up views would otherwise pile clamped labels on the edge)
  const lab=(R,p,t,o)=>{const q=R.p(p);if(q[0]>2&&q[0]<R.W-2&&q[1]>2&&q[1]<R.H-2)R.label(p,t,o)};
  const gh=g=>Math.max(.04,(Math.log10(g)+2.3)/2.5*1.5);
  function draw(R,k,e){const P=R.P,narrow=R.W<520;R.grid(-6,7,-2.2,2.8,.5);
    const cU=P.c2,cW=P.c1,cV=P.c4,cG=P.c5,cS=mix(P.paper,P.c1,.7);
    // how much of the chain is built: step 3 grows it left to right
    const built=k<1?0:k===1?1:k===2?1+e*(T-1):T;
    const ghost=k===0?.16:0;
    for(let t=0;t<T;t++){const xt=x(t),on=t<built,ap=on?Math.min(1,built-t):0,isKey=t===0,isQ=t===T-1;
      const focus=k===1?(t===0?1:.12):k===3?(t>=T-3?1:.15):k>=4?.35:1;
      // the input token
      R.box([xt,0,ZT],[.5,.3,.5],{fill:isKey?mix(P.paper,cU,.55):isQ?mix(P.paper,cV,.45):P.paper,a:k===0?e*.9+.1:Math.max(.35,focus)});
      lab(R,[xt,.3,ZT],C.sym[seq[t]],{serif:true,fs:14,b:isKey||isQ,dy:-10,c:isKey?cU:isQ?cV:P.ink,a:k===0?Math.max(.3,e):k===3?focus:Math.max(.5,focus)});
      // the cell: U below the state (input in), W on its left (previous state in)
      const ac=Math.max(ghost,ap*focus);
      R.glass([xt-.36,YU,ZT*.0-.32],[.72,0,0],[0,0,.64],{c:cU,a:ac*.9,nu:4,nv:4});
      R.glass([xt-XS/2,YW0,-.32],[0,YW1-YW0,0],[0,0,.64],{c:cW,a:ac*.9,nu:4,nv:4});
      comb(R,[xt,YS,0],A[t],cS,Math.max(ghost,ap*(k>=4?.3:focus)),.5,.84);
      if(ap>0&&k>=1&&k<=3){R.flowArc([xt,.32,ZT],[xt,YS-.45,0],.25,{c:cU,a:ap*focus*.85,r:.06,n:5,speed:1.1});
        if(t>0)R.flow([[x(t-1)+.4,YS+.12,0],[xt-XS/2,YS+.12,0],[xt-.4,YS+.12,0]],{c:cW,a:ap*focus,r:.065,n:4,speed:1.2})}
      // backward: the gradient factor at each copy, as a column behind it (log scale), arriving from the right
      if(k>=4){const back=T-1-t,ag=k===4?Math.max(0,Math.min(1,e*1.25*T-back)):1;
        if(ag>0){const hg=gh(G[t]);R.box([xt,0,ZG],[.42,hg,.42],{fill:cG,a:ag});
          const show=k===4&&(t===T-1||t===T-1-3||G[t]===gmin||t===0);if(show)R.label([xt,hg,ZG],G[t]<.1?G[t].toFixed(3):G[t].toFixed(2),{mono:true,fs:12,dy:-11,b:1,c:cG,a:ag})}
        if(k===4&&t<T-1&&ag>0)R.flow([[x(t+1)-.3,YS+.28,-.1],[xt+.3,YS+.28,-.1]],{c:cG,a:ag*.9,r:.06,n:3,speed:.9})}
    }
    // the readout V and the four keys' probabilities
    const aV=k===3?e:k>=4?.45:k===0?.16:0;
    if(aV>0){const xv=x(T-1)+XS/2+.05;R.glass([xv,YW0,-.32],[0,YW1-YW0,0],[0,0,.64],{c:cV,a:aV,nu:4,nv:4});
      R.label([xv,YW1+.02,0],'V',{serif:true,fs:15,b:1,c:cV,dy:-8,a:aV});
      for(let j=0;j<4;j++){const xa=xv+.55+j*.42,hg=Math.max(.02,PA[j]*1.6);R.box([xa,0,0],[.3,hg*(k===3?e:1),.3],{fill:j===KEY?cV:mix(P.paper,cV,.25),a:aV});
        R.label([xa,0,.15],C.sym[j],{serif:true,fs:13,dy:12,c:j===KEY?cV:P.mute,a:aV})}
      if(k===3){R.flow([[x(T-1)+.4,YS+.12,0],[xv+.55+KEY*.42,1.2,0]],{c:cV,a:e,r:.07,n:5,speed:1.1});R.label([xv+.55+KEY*.42,1.6,0],'P(b) = '+F.pkey,{mono:true,fs:12.5,b:1,dy:-10,c:cV,a:e})}}
    // step 6: every copy's gradient adds into the one shared W
    if(k===5){const wc=[0,WMAX,-.32];R.glass([-1.3,WMAX,-.8],[2.6,0,0],[0,0,1.3],{c:cW,a:e,nu:8,nv:6});
      R.label([0,WMAX+.05,-.8],'one shared W · gradient summed',{mono:true,fs:12.5,b:1,c:cW,dy:-16,a:e});
      for(let t=0;t<T;t++){const w=Math.max(.15,Math.min(1,(Math.log10(G[t])+2.3)/2.5));R.flowArc([x(t)-XS/2,YW1,0],[wc[0]+(t-(T-1)/2)*.16,WMAX,-.1],.35,{c:cG,a:e*w,r:.04+.04*w,n:Math.max(2,Math.round(2+6*w)),speed:1})}}
    // labels: the parts of the cell on the zoomed copy, the rows on the left
    if(k===1){R.label([x(0)+.36,YU,.32],'U · input weights',{al:'left',dx:6,mono:true,fs:12,c:cU,a:e});R.label([x(0)-XS/2,YW1,0],'W · recurrent weights',{al:'right',dx:-4,dy:-8,mono:true,fs:12,c:cW,a:e});
      R.label([x(0)+.45,YS+.3,0],'a₁ · 8 numbers',{al:'left',dx:6,mono:true,fs:12,b:1,c:P.ink,a:e})}
    if(k!==1&&k!==3){const L=x(0)-.75;R.label([L,0,ZT],'x · one symbol a step',{al:'right',dx:-6,mono:true,fs:12,c:P.mute,grp:'row'});
      if(k>=2||k===0)R.label([L,YS,0],k>=2?'a · state, same U and W':'a · state',{al:'right',dx:-6,mono:true,fs:12,c:P.mute,grp:'row'});
      if(k>=4)R.label([L,.4,ZG],'gradient factor · log scale',{al:'right',dx:-6,mono:true,fs:12,c:cG,grp:'row'})}
  }
  const full={cam:[-.2,.7],bounds:[[-5.3,0,-1.7],[6.6,1.7,1.9]]};
  S3.stage({id:'stg-rnn',list:'sx-rnn',fig:'Fig. 2 · a trained plain RNN, unrolled',cam:full.cam,bounds:full.bounds,aspect:.42,dur:1500,hold:4600,draw,
    margin:w=>w<520?[14,8,12,8]:[18,14,12,180],
    view:k=>k===1?{cam:[-.35,.5],bounds:[[x(0)-1.5,0,-.6],[x(0)+1.6,1.6,2.1]]}:k===3?{cam:[-.3,.55],bounds:[[x(T-4)-.4,0,-.8],[6.6,1.9,2.0]]}:k===5?{cam:[-.2,.62],bounds:[[-5.3,0,-1.7],[6.6,2.7,1.9]]}:full});
})();
