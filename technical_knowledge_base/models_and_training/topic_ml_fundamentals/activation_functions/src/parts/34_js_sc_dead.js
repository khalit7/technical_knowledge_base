// ---- Scene (Dead units, Fig. 2): the 384 hidden units of the digits network as columns, epoch by epoch, in three measured runs (renderer v2) ----
// Everything drawn is DATA.toy.frames (src/dead_relu_toy.py via mk_data.py): per epoch the loss, held-out accuracy and, per unit, the share of the
// 1,797 images on which it is on (in tenths) or "x" for dead. Each step plays a stretch of epochs; flows carry the signal from layer to layer,
// as dense as the share of live units in the layer they leave. The step lists' numbers are written here from the same data (check_stages.mjs compares).
(function(){
  const $=id=>document.getElementById(id);if(!$('stg-dr')||!window.S3||!window.DATA)return;const {at,off,lerp,mix}=S3;
  const FR=DATA.toy.frames,LISTS=['sx-dr0','sx-dr1','sx-dr2'];
  // the stretches of epochs each step plays, per run
  const STR=[[[0,0],[1,3],[4,30]],[[0,0],[1,2],[3,5],[6,6],[7,8],[9,30]],[[0,0],[1,4],[5,5],[6,6]]];
  let run=0;
  const perLayer=m=>{const r=[0,0,0];if(!m)return r;for(let i=0;i<384;i++)if(m[i]==='x')r[Math.floor(i/128)]++;return r};
  // the static numbers in the three step lists: data-dr="run.epoch.field"
  const fmt={acc:f=>(f[2]*100).toFixed(1)+'%',loss:f=>f[1]>=1000?Math.round(f[1]).toLocaleString('en-US'):f[1].toFixed(f[1]<.01?4:3),dead:f=>String(perLayer(f[3]).reduce((a,b)=>a+b,0)),
    l1:f=>String(perLayer(f[3])[0]),l2:f=>String(perLayer(f[3])[1]),l3:f=>String(perLayer(f[3])[2])};
  document.querySelectorAll('[data-dr]').forEach(e=>{const [r,ep,fl]=e.dataset.dr.split('.'),f=FR[+r].f[+ep];e.textContent=f&&fmt[fl]?fmt[fl](f):'?'});
  // the network runs from the front (the digits) to the back (the classes): three grids of 16 x 8 units in depth
  const CS=.22,NX=16,NY=8,ZL=[2.2,0,-2.2],ZI=4.1,ZO=-4.1,TOPY=.95,XS=-NX*CS/2-.2;
  const ux=u=>((u%NX)-(NX-1)/2)*CS,uz=(b,u)=>ZL[b]+(Math.floor(u/NX)-(NY-1)/2)*CS;
  function frameAt(k,e){const s=STR[run][Math.min(k,STR[run].length-1)];return Math.min(FR[run].f.length-1,Math.round(lerp(s[0],s[1],e)))}
  function draw(R,k,e){const P=R.P,narrow=R.W<520;R.grid(-4,4,-5,5,.5);
    const close=run===1&&(k===3||k===4),la=b=>close&&b===0?.12:1;
    const fi=frameAt(k,e),f=FR[run].f[fi],m=f[3],nan=f[4],pl=perLayer(m);
    // the input (8 x 8 pixel digits) and the output (10 classes) as glass plates
    R.glass([-.5,.06,ZI],[1,0,0],[0,.8,0],{c:P.c1,nu:8,nv:8,a:close?0:.9});R.label([XS,.3,ZI],'1,797 digits in',{fs:12.5,b:1,al:'right',dx:-6,c:P.ink,a:close?0:1,grp:'side'});
    const dark=!nan&&pl[2]===128;
    R.glass([-.5,.06,ZO],[1,0,0],[0,.8,0],{c:nan?P.mute:dark?P.bad:P.c3,nu:10,nv:1,a:.9});R.label([XS,.3,ZO],dark?'10 classes: one answer for all':'10 classes out',{fs:12.5,b:1,al:'right',dx:-6,c:dark?P.bad:P.ink,grp:'side'});
    // the hidden units: a column per unit, as tall as the share of images it is on for; dead ones flat and red
    for(let b=0;b<3;b++){for(let u=0;u<128;u++){const ch=m?m[b*128+u]:null,c=[ux(u),0,uz(b,u)];
        if(nan)R.box(c,[CS*.8,.03,CS*.8],{fill:mix(P.paper,P.mute,.5),shadow:false,lw:.4,ea:.4,a:la(b)});
        else if(ch==='x')R.box(c,[CS*.84,.035,CS*.84],{fill:P.bad,shadow:false,lw:.4,ea:.5,a:la(b)});
        else{const sh=(+ch+.5)/10;R.box(c,[CS*.7,.05+.55*sh,CS*.7],{fill:mix(P.paper,P.c1,.2+.65*sh),shadow:false,lw:.4,ea:.45,a:la(b)})}}
      R.label([XS,0,ZL[b]],'layer '+(b+1)+' · '+(nan?'NaN':pl[b]+' dead'),{mono:true,fs:12.5,b:pl[b]>0||nan,al:'right',dx:-6,c:nan?P.mute:pl[b]?P.bad:P.mute,a:close&&b===0?0:1,grp:'side'})}
    // the signal through the network: flows from each stage to the next, as dense as the share of live units in the one they leave
    if(!nan){const src=[1,1-pl[0]/128,1-pl[1]/128,1-pl[2]/128],zs=[ZI,ZL[0],ZL[1],ZL[2]],ze=[ZL[0],ZL[1],ZL[2],ZO];
      for(let i=0;i<4;i++){const al=src[i];if(al<=.005||(close&&i<1))continue;
        [-1,1].forEach(sd=>R.flowArc([sd*.9,TOPY,zs[i]-(i?NY*CS/2:0)],[sd*.9,TOPY,ze[i]+(i<3?NY*CS/2:0)],.3,{c:P.c1,a:.3+.7*al,r:.05+.03*al,n:Math.max(2,Math.round(2+6*al)),speed:1.1}))}}
    // the readout: epoch, loss, accuracy
    const rd='epoch '+f[0]+' · '+(nan?'every weight NaN':(f[1]==null?'untrained':'loss '+fmt.loss(f))+' · '+fmt.acc(f)+' right');
    R.label([-.9,1.2,ZO-.5],rd,{mono:true,fs:13,b:1,dy:-10,c:nan||(f[0]>0&&f[2]<.2)?P.bad:P.ink});
  }
  const full={cam:[.32,.68],bounds:[[-2.2,0,-4.6],[2.2,1.3,4.4]]};
  const st=S3.stage({id:'stg-dr',list:LISTS[0],fig:'Fig. 2 · 384 hidden units, measured epoch by epoch',cam:full.cam,bounds:full.bounds,aspect:.85,dur:2600,hold:4600,draw,
    margin:w=>w<520?[14,10,14,10]:[22,14,14,190],
    view:k=>run===1&&(k===3||k===4)?{cam:[.38,.6],bounds:[[-2.2,0,-4.6],[2.2,1.3,1.4]]}:full});
  // the three runs: a mode toggle swaps the step list and replays
  const M=$('drM');if(st&&M)M.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;run=+b.dataset.r;
    M.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));LISTS.forEach((id,i)=>{$(id).hidden=i!==run});st.list(LISTS[run])});
})();
