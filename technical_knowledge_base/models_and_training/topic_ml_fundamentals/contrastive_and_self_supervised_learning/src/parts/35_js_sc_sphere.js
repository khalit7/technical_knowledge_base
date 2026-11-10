// ---- Scene (alignment and uniformity, Fig. 4): 200 held-out digits on the unit sphere through training, two runs side by side (renderer v2) ----
// Everything drawn is CSD.sp (src/train_toy.py sphere3 via mk_data.py): an MLP 64-256-256-3 trained on two augmented views of real digits,
// its l2-normalised output a point on the sphere; 24 snapshots of the 200 test points (x, y, z as bytes) and their measured alignment,
// uniformity and 5-NN accuracy. Left: InfoNCE (tau 0.5, or 0.2 with the toggle); right: positives only. Colour is the digit, never used in
// training. The 24 snapshots are grouped into four explained stretches (the long-replay rule); each step plays its stretch.
// The step list's numbers are static spans (data-sp) written here from the same data; check_stages.mjs compares them.
(function(){
  const $=id=>document.getElementById(id);if(!$('stg-sp')||!window.S3||!window.CSD||!CSD.sp)return;const {at,off,lerp,mix}=S3;
  const T=CSD.sp,S=T.snap_steps,LAB=T.labels,NS=S.length;
  const dec=b=>{const s=atob(b),a=new Float32Array(s.length);for(let i=0;i<s.length;i++)a[i]=(s.charCodeAt(i)-128)/127;return a};
  const XYZ={};for(const k in T.runs)XYZ[k]=T.runs[k].xyz.map(dec);
  const iOf=st=>S.indexOf(st);
  // the four stretches, as snapshot indices: [from, to]
  const STR=[[0,0],[0,iOf(29)],[iOf(29),iOf(293)],[iOf(293),NS-1]];
  let run='infonce_t05';
  const met=(k,f)=>{const a=T.runs[k].snaps,i=Math.floor(f),j=Math.min(NS-1,i+1),t=f-i,m={};['align','unif','knn','std'].forEach(q=>m[q]=lerp(a[i][q],a[j][q],t));m.step=Math.round(lerp(a[i].step,a[j].step,t));return m};
  const pts=(k,f)=>{const A=XYZ[k],i=Math.floor(f),j=Math.min(NS-1,i+1),t=f-i,a=A[i],b=A[j],o=[];
    for(let q=0;q<LAB.length;q++){let x=lerp(a[3*q],b[3*q],t),y=lerp(a[3*q+1],b[3*q+1],t),z=lerp(a[3*q+2],b[3*q+2],t);const l=Math.hypot(x,y,z)||1;o.push([x/l,y/l,z/l])}return o};
  // the static numbers in the step list: data-sp="run.snapshot.field" (snapshot index, or 'end')
  const fmt={align:v=>v.toFixed(2).replace(/^-0\.00$/,'0.00'),unif:v=>v.toFixed(2).replace(/^-0\.00$/,'0.00'),knn:v=>(100*v).toFixed(1)+'%',std:v=>v.toFixed(3),step:v=>v.toLocaleString('en-US')};
  function spans(){document.querySelectorAll('[data-sp]').forEach(e=>{const [r,i,f]=e.dataset.sp.split('.'),k=r==='L'?run:r,ix=i==='end'?NS-1:+i,s=T.runs[k]&&T.runs[k].snaps[ix];e.textContent=s&&fmt[f]?fmt[f](s[f]):'?'})}
  spans();
  // the uniformity of a perfectly even sphere, t = 2: log E exp(-2|u-v|^2) = log((1 - e^-8) / 8)
  const U_IDEAL=Math.log((1-Math.exp(-8))/8);
  window.CS_SP={unif:(k,i)=>T.runs[k].snaps[i].unif,ideal:U_IDEAL,str:STR};
  const TAB=['#4e79a7','#f28e2b','#59a14f','#b07aa1','#d4a72c','#76b7b2','#e15759','#9c755f','#2f4b7c','#8cd17d'];
  const RAD=1.55,CY=1.85,CX=[-2.15,2.15];
  function sphere(R,c,a){const P=R.P,ring=(f)=>{const p=[];for(let i=0;i<=48;i++){const t=i/48*2*Math.PI;p.push(f(t))}return p};
    [-.5,0,.5].forEach(h=>{const r=RAD*Math.sqrt(1-h*h);R.line(ring(t=>[c[0]+r*Math.cos(t),c[1]+h*RAD,c[2]+r*Math.sin(t)]),{c:P.line,w:h?0.8:1.1,a:a*(h?.55:.8)})});
    [0,Math.PI/3,2*Math.PI/3].forEach(ph=>R.line(ring(t=>[c[0]+RAD*Math.cos(t)*Math.cos(ph),c[1]+RAD*Math.sin(t),c[2]+RAD*Math.cos(t)*Math.sin(ph)]),{c:P.line,w:.8,a:a*.5}));
    R.box([c[0],0,c[2]],[.5,.04,.5],{a:a*.6,shadow:true});R.box([c[0],0,c[2]],[.04,c[1]-RAD,.04],{a:a*.5,shadow:false})}
  function draw(R,k,e){const P=R.P,narrow=R.W<520;R.grid(-4.6,4.6,-2.6,2.6,.5);
    const s=STR[Math.min(k,STR.length-1)],f=lerp(s[0],s[1],k===0?1:e);
    const eye=R.eye;
    [[run,0],['pos_only',1]].forEach(([nm,side])=>{const c=[CX[side],CY,0];sphere(R,c,1);
      const X=pts(nm,f),m=met(nm,f),v=[eye[0]-c[0],eye[1]-c[1],eye[2]-c[2]];
      X.forEach((p,q)=>{const w=[c[0]+p[0]*RAD,c[1]+p[1]*RAD,c[2]+p[2]*RAD],front=p[0]*v[0]+p[1]*v[1]+p[2]*v[2]>0;
        R.ball(w,.06,{c:TAB[LAB[q]],a:front?.95:.35})});
      // on the last step, each digit's label where its points gather (only when they do gather)
      if(k===3&&side===0){const a=at(k,e,3)*(e>.85?1:0);for(let d=0;d<10;d++){let sx=0,sy=0,sz=0,n=0;X.forEach((p,q)=>{if(LAB[q]===d){sx+=p[0];sy+=p[1];sz+=p[2];n++}});
          const L=Math.hypot(sx,sy,sz)/n;if(L<.75)continue;const u=[sx/n/L,sy/n/L,sz/n/L];if(u[0]*v[0]+u[1]*v[1]+u[2]*v[2]<0)continue;
          R.label([c[0]+u[0]*RAD*1.13,c[1]+u[1]*RAD*1.13,c[2]+u[2]*RAD*1.13],String(d),{fs:13,b:1,c:TAB[d],a:1})}}
      const ttl=narrow?(side?'positives only':'InfoNCE, τ = '+T.runs[nm].cfg.tau):side?'positives only · no push apart':'InfoNCE, τ = '+T.runs[nm].cfg.tau+' · negatives push apart';
      R.label([c[0],c[1]+RAD,0],ttl,{fs:12.5,b:1,dy:-16,c:side?P.c2:P.acc});
      const f2=v=>v.toFixed(2).replace(/^-0\.00$/,'0.00');
      R.label([c[0],0,1.1],narrow?'uniform '+f2(m.unif):'align '+f2(m.align)+' · uniform '+f2(m.unif)+' · 5-NN '+Math.round(100*m.knn)+'%',{mono:true,fs:12,c:P.ink,dy:6})});
    R.label([0,0,1.9],'training step '+met(run,f).step.toLocaleString('en-US')+' of '+T.steps.toLocaleString('en-US')+(narrow?'':' · even sphere: uniform '+U_IDEAL.toFixed(2)),{mono:true,fs:12,c:P.mute,dy:8});
  }
  const st=S3.stage({id:'stg-sp',list:'sx-sp',fig:'Fig. 4 · 200 held-out digits on the unit sphere',cam:[0,.3],bounds:[[-3.9,0,-1.7],[3.9,3.5,2.1]],aspect:.6,dur:3600,hold:3600,draw,
    margin:w=>w<520?[22,8,12,8]:[26,14,12,14]});
  const M=$('spM');if(st&&M)M.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;run=b.dataset.k;
    M.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b)});spans();st.list('sx-sp')});
})();
