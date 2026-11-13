// ---- Scene (Selection): Selective Copying through the two trained toy models, live (renderer v2: the state as a plate, Delta, B and C as signed bars, flows for writes and reads) ----
// One sequence (48 positions, 6 data tokens among noise, then 6 markers) runs through sc_s6 or sc_s4 in plain JS (22_js_model.js, checked against PyTorch).
// Drawn per position, all from layer 1: the token row; Delta_t per channel (64 bars, aligned with the plate's columns); B_t and C_t (16 bars each, along the
// state axis; in the LTI model the constants of the highlighted channel); the state h, 64 channels x 16, as cells on a glass plate (colour: sign, strength: |h|
// against the largest |h| at that position, as the old heat map did). The 54 positions are grouped into 7 explained stretches (the long-replay rule).
(function(){
  if(!document.getElementById('stg-sel'))return;const {at,off,lerp,mix,rgb}=S3;
  const MV=window.MBW.variants,PB=PAPER.rc.probe,L=54,NC=64,NS=16;
  let seed=7,inp=null,mode='s6';const runs={};
  function make(){inp=MB.makeSC(mulberry32(seed));
    ['s6','s4'].forEach(m=>{const v='sc_'+m,M=MB.load(v),o=MB.run(M,inp.x,{want:true}),pred=[];for(let t=48;t<54;t++)pred.push(MB.argmax(o.logits[t]));
      let hm=1e-9,dm=1e-9;o.steps.forEach(s=>{for(const x of s[0].h)hm=Math.max(hm,Math.abs(x));for(const x of s[0].delta)dm=Math.max(dm,x)});
      // the highlighted channel: the column of the state that grows largest in this run
      let cb=0,cv=-1;for(let c=0;c<NC;c++){let mx=0;o.steps.forEach(s=>{for(let n=0;n<NS;n++)mx=Math.max(mx,Math.abs(s[0].h[c*NS+n]))});if(mx>cv){cv=mx;cb=c}}
      const P=M.P,Bc=[],Cc=[];if(m==='s4'){for(let n=0;n<NS;n++){Bc.push(P['blocks.0.Bp'][cb*NS+n]);Cc.push(P['blocks.0.Cp'][cb*NS+n])}}
      let bm=1e-9;o.steps.forEach(s=>{(s[0].B||Bc).forEach(x=>bm=Math.max(bm,Math.abs(x)));(s[0].C||Cc).forEach(x=>bm=Math.max(bm,Math.abs(x)))});
      runs[m]={o,pred,hm,dm,bm,cb,Bc,Cc,ok:pred.filter((p,i)=>p===inp.y[i]).length}});
    document.querySelectorAll('.selOk').forEach(e=>e.textContent=runs[e.dataset.m].ok)}
  make();
  // the stretches: input; data tokens 1, 2, 3; data tokens 4 to 6; the markers; the result
  const stops=()=>[0,inp.pos[0]+1,inp.pos[1]+1,inp.pos[2]+1,48,54,54];
  const upto=(k,e)=>{if(k===0)return 0;const s=stops();return Math.round(lerp(s[k-1],s[k],e))};
  let TC=null,TP=null;
  function tokCols(P){if(TP===P)return TC;const cs=getComputedStyle(document.body),v=n=>rgb(cs.getPropertyValue(n).trim()||'#888');
    TC=[mix(P.paper,P.mute,.18),v('--c1'),v('--c2'),v('--c3'),v('--c4'),v('--c5'),v('--c6'),v('--c7'),v('--c8'),P.ink];TP=P;return TC}
  // layout: tokens on the floor at the front, Delta bars on the floor under the plate's columns, the state plate standing upright behind them
  // (columns: 64 channels; rows: 16 state entries, n = 1 at the top), B_t on a post to its left and C_t on a post to its right (one bar per row)
  const XS=.13,tx=t=>(t-(L-1)/2)*XS,TZ=1.65,CW=.1,cx=c=>(c-(NC-1)/2)*CW,PY0=.8,ry=n=>PY0+(NS-n-.5)*.1,DZ=.45,XB=cx(0)-.75,XC=cx(NC-1)+.75;
  // a vector as signed bars on a white post at x, one bar per state row: positive to the right, negative to the left
  function combY(R,x,vals,m,col,a){if(a<=.01)return;R.box([x,0,0],[.05,PY0+NS*.1+.05,.05],{a,shadow:false});
    vals.forEach((v,n)=>{const w=Math.max(.012,Math.abs(v)/m*.5);R.box([x+(v>=0?w/2+.03:-w/2-.03),ry(n)-.035,0],[w,.07,.07],{fill:col,a,shadow:false,lw:.6})})}
  function draw(R,k,e){const P=R.P,TCo=tokCols(P),Rn=runs[mode],o=Rn.o,u=upto(k,e),t=Math.max(0,u-1),S=o.steps[t][0],sel=mode==='s6';
    R.grid(-4.8,4.8,-1,2.4,.5);
    // 1. the token row: the part already read is solid, the rest faint; the current token lifts
    for(let i=0;i<L;i++){const v=inp.x[i],cur=u>0&&i===t&&k<6,a=k===0?1:(i<u?1:.32);
      R.box([tx(i),0,TZ],[XS*.8,cur?.26:v===0?.05:.13,XS*.8],{fill:TCo[v],a,lw:.5,shadow:false})}
    if(k===0){inp.pos.forEach((p,j)=>R.glow([tx(p),.12,TZ],.18,{c:TCo[inp.x[p]],a:e}));R.label([tx(50.5),.1,TZ],'6 markers',{fs:12,mono:true,c:P.mute,dy:18})}
    const side=k!==5;   // the left-hand labels, except in the close view of the markers
    if(side)R.label([tx(0),0,TZ],'position 1',{fs:12,mono:true,c:P.mute,al:'right',dx:-8,grp:'row'});
    const fa=k===0?.25:1;   // the layer recedes while the input is introduced
    // 2. Delta_t, one bar per channel, on the floor under the plate's columns
    R.box([0,0,DZ],[NC*CW+.1,.02,.12],{a:fa,shadow:false});
    for(let c=0;c<NC;c++){const d=u?S.delta[c]:0,h=Math.max(.01,d/Rn.dm*.6);R.box([cx(c),.02,DZ],[CW*.7,h,.08],{fill:mix(P.paper,P.c4,c===Rn.cb?.95:.6),a:fa,shadow:false,lw:.4})}
    if(side)R.label([cx(0)-.1,.05,DZ],'Δₜ · 64 channels',{fs:12,mono:true,c:P.c4,al:'right',dx:-8,grp:'row',a:fa});
    // 3. the state h of layer 1: cells on an upright glass plate, each scaled to the largest entry at this position (like the old heat map)
    R.glass([cx(0)-CW/2,PY0,0],[NC*CW,0,0],[0,NS*.1,0],{c:P.c1,a:fa*.8,nu:8,nv:2,th:.02});
    if(u){const h=S.h;let mx=1e-9;for(const v of h)mx=Math.max(mx,Math.abs(v));
      for(let c=0;c<NC;c++)for(let n=0;n<NS;n++){const v=h[c*NS+n],sv=Math.pow(Math.abs(v)/mx,.7);if(sv<.08)continue;
        const x0=cx(c)-CW/2,y0=ry(n)-.05;R.quad([[x0,y0,.03],[x0+CW,y0,.03],[x0+CW,y0+.1,.03],[x0,y0+.1,.03]],{fill:v>0?P.c1:P.c2,a:fa*Math.min(1,sv),edge:false})}}
    R.quad([[cx(Rn.cb)-CW/2,PY0,.04],[cx(Rn.cb)+CW/2,PY0,.04],[cx(Rn.cb)+CW/2,PY0+NS*.1,.04],[cx(Rn.cb)-CW/2,PY0+NS*.1,.04]],{ec:P.c4,lw:1.6,ea:1,a:fa});
    R.label([0,PY0+NS*.1,0],'state h, layer 1 · 64 channels × 16',{fs:12,mono:true,c:P.c1,dy:-12,a:fa,wide:1});
    // 4. B_t (left) and C_t (right): selective, or the fixed constants of the outlined channel
    const Bv=sel?(u?S.B:null):Rn.Bc,Cv=sel?(u?S.C:null):Rn.Cc;
    if(Bv)combY(R,XB,Bv,Rn.bm,mix(P.paper,P.c3,.8),fa);if(Cv)combY(R,XC,Cv,Rn.bm,mix(P.paper,P.c5,.85),fa*(k>=5?1:.55));
    if(side)R.label([XB,PY0+NS*.1+.05,0],sel?'Bₜ':'B (fixed)',{fs:13.5,serif:true,b:1,c:P.c3,a:fa,dy:-10});R.label([XC,PY0+NS*.1+.05,0],sel?'Cₜ':'C (fixed)',{fs:13.5,serif:true,b:1,c:P.c5,a:fa,dy:-10});
    // 5. flows: the current token is written into the state through B (scaled by Delta); at the markers the state is read out through C
    if(k>=1&&k<=4&&u){const v=inp.x[t],c=v?TCo[v]:P.mute,src=[tx(t),.2,TZ];R.flowArc(src,[XB,PY0,0],.6,{c:P.c3,a:v?.9:.35,r:.05,n:8,speed:1.6});
      R.flowArc([XB,ry(8),0],[cx(Rn.cb),ry(8),.05],.3,{c:P.c3,a:v?.9:.35,r:.05,n:7,speed:1.4});R.glow(src,.22,{c,a:.8})}
    if(k===5){const m=[tx(Math.min(53,t)),.25,TZ];R.flowArc([XC,PY0,0],m,.5,{c:P.c5,r:.055,n:8,speed:1.5});R.flowArc([cx(Rn.cb),ry(8),.05],[XC,ry(8),0],.3,{c:P.c5,r:.05,n:7,speed:1.4})}
    // 6. the answers above the markers, ringed by right or wrong
    if(k>=5){for(let i=0;i<6;i++){const tt=48+i;if(tt>=u&&k===5)continue;const p=Rn.pred[i],ok=p===inp.y[i];
      R.box([tx(tt),.42,TZ],[XS*.8,.13,XS*.8],{fill:TCo[p],lw:.5,shadow:false});R.glow([tx(tt),.48,TZ],.13,{c:ok?P.good:P.bad,a:.9})}
      if(k===6||u>=54)R.label([tx(51),.6,TZ],Rn.ok+' of 6 right',{fs:12.5,b:1,c:Rn.ok===6?P.good:P.bad,dy:-10})}
  }
  const cnt=document.getElementById('selCnt');
  function counters(k){if(!cnt)return;const Rn=runs[mode],u=upto(k,1);let dd=0,dn=0,nd=0,nn=0;
    for(let i=0;i<Math.min(u,48);i++){const d=Rn.o.steps[i][0].mean;if(inp.x[i]){dd+=d;nd++}else{dn+=d;nn++}}
    cnt.innerHTML=stat('position',fmt(u)+' of 54')+stat('mean Δ, data / noise',nd&&nn?(dd/nd).toFixed(3)+' / '+(dn/nn).toFixed(3):'not yet','layer 1')+stat('answers right',k>=5?Rn.ok+' of 6':'not yet')+stat('state size','2 × 64 × 16','fixed, any length')}
  const full={cam:[.16,.34],bounds:[[-4.1,0,-.1],[4.1,2.45,1.8]]};
  const st=S3.stage({id:'stg-sel',list:'sx-sel-s6',fig:'Selective Copying · trained toy · layer 1',cam:full.cam,bounds:full.bounds,aspect:.5,dur:2800,hold:4400,draw,
    view:k=>k===0?{cam:[.12,.45],bounds:[[-4.3,0,1.2],[4.3,.5,2]]}:k===5?{cam:[.3,.36],bounds:[[-.4,0,-.1],[4.4,2.45,1.8]]}:full,
    margin:w=>w<520?[14,10,14,10]:[12,10,8,120],onStep:k=>{try{counters(k)}catch(e){}}});
  const seg=document.getElementById('selM');
  if(seg)seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.m===mode)return;mode=b.dataset.m;
    seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    ['s6','s4'].forEach(m=>{const l=document.getElementById('sx-sel-'+m);if(l)l.hidden=m!==mode});st.list('sx-sel-'+mode)}));
  const nb=document.getElementById('selNew');if(nb)nb.addEventListener('click',()=>{seed=(seed*7919+13)%100003;make();st.reset()});
  window.__selScene={runs,get inp(){return inp},stops};
})();
