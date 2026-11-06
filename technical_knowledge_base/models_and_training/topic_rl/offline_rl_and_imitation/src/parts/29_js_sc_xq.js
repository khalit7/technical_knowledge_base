// ---- Scene (sections 6 to 9, Fig. 3): one dataset, four offline learners (renderer v2: few large objects per step, flows, glass, camera per step).
// Action across, Q as height; the current iteration's Q is a filled ribbon at the front and earlier iterations recede behind it as thin lines (depth = age, square-root
// spacing); the true value r(a)/(1 − γ) dashed; the 30 data actions as white pillars, the data's range (mean ± 2 s.d.) as a glass strip; the policy as bars on the floor.
// Every number is OF.runX (21_js_of_engine.js), equal to src/recompute.py. A 41-frame replay grouped into explained stretches (2026-11-06 rule). ----
(function(){
  const E=window.OF,$=id=>document.getElementById(id);if(!E||!$('stg-xq'))return;const {at,off,lerp,mix}=S3;
  const MODES=['naive','bcq','cql','iql'],G=E.GRID,K=E.KIT,g=E.GAMMA;
  const NAME={naive:'naive Q',bcq:'BCQ-style',cql:'CQL',iql:'IQL'};
  let mode='naive',runs={},api=null;
  const opts=()=>({beta:+$('xq-b').value,alpha:+$('xq-a').value,tau:+$('xq-t').value}),seed=()=>+$('xq-s').value;
  function compute(){const o=opts(),s=seed();MODES.forEach(m=>runs[m]=E.runX(m,s,o));
    window.OF3=Object.assign(window.OF3||{},{xq:Object.fromEntries(MODES.map(m=>[m,[0,1,5,40].map(k=>({k,bel:runs[m].hist[k].bel,tru:runs[m].hist[k].true,mode:runs[m].hist[k].mode}))]))});
    window.OF3.xq.beh=runs.naive.beh;window.OF3.xq.bestSup=runs.naive.bestSup;fill()}
  // the step lists' numbers for the current settings (the static text holds the defaults: seed 1, α 0.1, τ 0.9, β 3)
  function fill(){document.querySelectorAll('[data-xq]').forEach(sp=>{const [m,k,f]=sp.dataset.xq.split('.'),r=runs[m];if(!r)return;
    const v=k==='beh'?r.beh:k==='sup'?r.bestSup:r.hist[+k][f==='true'?'true':f];sp.textContent=RD.n(v,2)})}
  const XS=2.8,X=a=>a*XS,SY=.065,YB=1.15,Y=q=>YB+q*SY,ZF=1.6,DEP=3.8,ZB=ZF-DEP;
  const frame=(k,e)=>k===0?0:k===1?(e<.5?0:1):k===2?Math.round(lerp(1,5,e)):k===3?Math.round(lerp(5,K,e)):K;
  const COL=P=>({naive:P.bad,bcq:P.c3,cql:P.c1,iql:P.c4})[mode];
  const sub=q=>G.map((a,i)=>[a,q[i]]).filter((_,i)=>i%4===0);
  function draw(R,k,e){const P=R.P,r=runs[mode],nv=runs.naive,f=frame(k,e),h=r.hist[f],c=COL(P),zc=ZF,z=j=>ZF-DEP*Math.sqrt((f-j)/K),nar=R.W<520;
    R.grid(-3.4,3.4,-2.8,2.8,.4);
    // the data's range as a glass strip on the floor, strong for the BCQ-style learner, whose policy is held inside it
    const lo=Math.max(-1,r.mu-2*r.sd),hi=Math.min(1,r.mu+2*r.sd);
    R.glass([X(lo),.005,ZB-.1],[X(hi)-X(lo),0,0],[0,0,DEP+.7],{c:P.acc,a:mode==='bcq'?.9:.35,nu:1,nv:6,th:.01});
    // earlier iterations: thin lines receding into the back
    for(let j=0;j<f;j++){const q=sub(r.hist[j].qg);R.line(q.map(([a,v])=>[X(a),Y(v),z(j)]),{c,w:1,a:.18+.2*(j/Math.max(1,f))})}
    // the current iteration: a filled ribbon, the true value dashed on the same slice, the naive learner faint for comparison
    const q=sub(h.qg);for(let i=1;i<q.length;i++){const [a0,v0]=q[i-1],[a1,v1]=q[i];R.quad([[X(a0),0,zc],[X(a1),0,zc],[X(a1),Y(v1),zc],[X(a0),Y(v0),zc]],{fill:c,fa:.13,edge:false})}
    R.line(q.map(([a,v])=>[X(a),Y(v),zc+.01]),{c,w:3});
    R.line(sub(G.map(a=>E.rtrue(a)/(1-g))).map(([a,v])=>[X(a),Y(v),zc+.02]),{c:P.ink,w:1.5,dash:[6,4],a:.9});
    if(mode!=='naive')R.line(sub(nv.hist[f].qg).map(([a,v])=>[X(a),Y(v),zc-.02]),{c:P.mute,w:1.6,a:.55});
    [0,10,20].forEach(v=>R.label([X(-1),Y(v),zc],String(v),{al:'right',dx:-8,mono:true,fs:12,c:P.mute,grp:'ax'}));
    R.line([[X(-1),Y(0),zc],[X(1),Y(0),zc]],{c:P.mute,w:.8,dash:[2,4],a:.6});
    // the 30 data actions: white pillars at the current slice
    r.A.forEach(a=>R.box([X(a),0,zc+.12],[.05,.16,.05],{shadow:false,lw:.6}));
    // the policy: bars on the floor in front of the slice (on the data's own actions for IQL)
    let pm=0;for(const i in h.pol)pm=Math.max(pm,h.pol[i]);
    if(mode==='iql')for(const i in h.pol)R.box([X(r.A[i]),0,zc+.32],[.045,.4*h.pol[i]/pm,.08],{fill:c,shadow:false,lw:.5});
    else for(const i in h.pol){if(+i%4)continue;const p=h.pol[i]/pm;if(p<.01)continue;R.box([X(G[i]),0,zc+.32],[.07,.4*p,.08],{fill:c,shadow:false,lw:.5})}
    R.label([X(1),0,zc+.32],'policy',{al:'left',dx:8,mono:true,fs:12,c,wide:1});
    // bootstrapping: the believed value of the next state streams back into every data target (steps 2 to 4)
    if(k>=1&&k<=3&&f>0){R.flowArc([X(h.mode),Y(h.bel),zc+.03],[X(r.mu),.2,zc+.12],.5,{c,a:.85,r:.06,speed:1.3})}
    // believed against true at the policy's most likely action
    if(f>0){const b=[X(h.mode),Y(h.bel),zc+.04],t=[X(h.mode),Y(h.true),zc+.04];R.line([b,t],{c:P.ink,w:1.2,dash:[3,3],a:.8});
      R.glow(b,.35,{c,a:.8});R.ball(b,.09,{c});R.ball(t,.07,{c:P.ink});
      // at the right edge both labels sit to the left; elsewhere believed goes right and true goes left, so close values never collide
      const edge=h.mode>.5,up=h.bel>=h.true;
      R.label(b,'believes '+RD.n(h.bel,2),{al:edge?'right':'left',dx:edge?-12:12,dy:edge?-6:up?-8:8,mono:true,fs:12.5,b:1,c});
      R.label(t,'really '+RD.n(h.true,2),{al:'right',dx:-12,dy:edge?8:up?8:-8,mono:true,fs:12.5,b:1,c:P.ink})}
    R.label([X(-.15),Y(9.5),zc],nar?'true':'true value (dashed), best 10',{al:'right',dx:-6,dy:-12,fs:12,c:P.ink,a:k===0?1:.8,wide:k===0?0:1});
    R.label([X(r.mu),0,zc+.12],'30 data actions',{dy:16,fs:12,c:P.mute,a:k===0?1:0});
    R.label([X(-1),0,zc+.3],'iteration '+f+' of '+K,{al:'right',dx:-8,dy:10,mono:true,fs:12.5,b:1,c:P.mute});
    readout(f)}
  function readout(f){const o=$('xq-out');if(!o)return;const r=runs[mode],h=r.hist[f];
    o.textContent=NAME[mode]+' · iteration '+f+' of '+K+' · believed '+RD.n(h.bel,2)+' · true '+RD.n(h.true,2)+' · behaviour policy '+RD.n(r.beh,2)+' · best in the band '+RD.n(r.bestSup,2)}
  compute();
  const full={cam:[-.55,.42],bounds:[[-3.3,0,ZB],[3.3,3.1,ZF+.5]]};
  api=S3.stage({id:'stg-xq',list:'sx-xq-naive',fig:'Fig. 3 · one dataset, four learners',cam:full.cam,bounds:full.bounds,aspect:.7,hold:4800,draw,
    get dur(){return api&&(api.st.k===2||api.st.k===3)?3600:1400},
    margin:w=>w<520?[14,8,12,8]:[16,14,14,40],
    // the last step moves in close on the newest slice, where believed and true values sit
    view:k=>k===4?{cam:[-.22,.3],bounds:[[-3.1,0,ZF-.4],[3.1,3.1,ZF+.5]]}:full});
  // a learner is chosen by its chip, or by a click on its step list (each list sits in its own section)
  function setMode(m,step){mode=m;$('xq-M').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.m===m));
    MODES.forEach(x=>{const L=$('sx-xq-'+x);if(L)L.classList.toggle('xq-off',x!==m)});
    api.list('sx-xq-'+m);if(step!=null){api.st.user=true;api.pause();api.go(step,false)}}
  $('xq-M').addEventListener('click',e=>{const b=e.target.closest('button');if(b)setMode(b.dataset.m)});
  MODES.forEach(m=>{const L=$('sx-xq-'+m);if(!L)return;if(m!==mode)L.classList.add('xq-off');
    L.addEventListener('click',e=>{if(m===mode)return;const li=e.target.closest('li');if(!li)return;e.stopImmediatePropagation();setMode(m,[...L.children].indexOf(li))},true)});
  document.querySelectorAll('a[data-xq-go]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();setMode(a.dataset.xqGo)}));
  ['xq-a','xq-t','xq-b','xq-s'].forEach(id=>$(id).addEventListener('change',()=>{compute();api.draw()}));
})();
