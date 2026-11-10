// ---- Scene (the hero, Fig. 1): the signal through 20 ReLU layers as a tube of glass plates, one initialisation per step (renderer v2) ----
// Everything drawn is NID.hero (src/recompute.py and src/signal_prop.py via gen_data.py): the mean square of the activations after each of
// 20 layers of width 512, 1,024 inputs, PyTorch. Each layer is a glass plate whose side is the root mean square (linear, 1 = the input's);
// dashed squares are the size the signal should keep. Flows carry the signal from layer to layer. The step list's numbers are written
// into static spans (data-hr) from the same data; check_stages.mjs compares them.
(function(){
  const $=id=>document.getElementById(id);if(!$('stg-hr')||!window.S3||!window.NID||!NID.hero)return;const {at,off,lerp,mix}=S3;
  const H=NID.hero,L=20;
  // [key, label, colour key, factor written per layer]
  const SER=[null,['default','PyTorch default','c4'],['xavier','Xavier','c1'],['he','He','c3'],['he2','twice He','c2'],['default_ln','default + LayerNorm','hl']];
  const per=k=>NID.heroF[k]; // the recorded per-layer factor, (mean square after layer 20 / after layer 1)^(1/19)
  const sup=e=>String(e).replace('-','⁻').split('').map(c=>'⁰¹²³⁴⁵⁶⁷⁸⁹'['0123456789'.indexOf(c)]||c).join('');
  const fe=v=>v>=0.1&&v<1000?v.toFixed(v<10?2:1):v.toExponential(1).replace(/e\+?(-?)(\d+)/,(m,s,d)=>' × 10'+sup(s+d));
  // the static numbers of the step list: data-hr="key.f" (factor per layer) or "key.end" (mean square after layer 20)
  document.querySelectorAll('[data-hr]').forEach(e=>{const [k,f]=e.dataset.hr.split('.');if(!H[k])return;e.textContent=f==='f'?per(k).toFixed(3):fe(H[k][L])});
  const X=i=>-5+i*.5,S0=1.3,YC=1.55,CAP=3.1,RCAP=CAP/S0;
  const side=(k,i)=>Math.min(CAP,S0*Math.sqrt(H[k][i]));
  function hl(P){const c=getComputedStyle(document.body).getPropertyValue('--hlc').trim();return c?S3.rgb(c):P.acc}
  function series(R,k,rev,a,P){if(!k||a<=.01)return;const s=SER[k],c=s[2]==='hl'?hl(P):P[s[2]];const ln=s[0]==='default_ln';
    const top=[];
    for(let i=0;i<=rev;i++){const v=side(s[0],i),x=X(i),cap=Math.sqrt(H[s[0]][i])>RCAP;
      if(i&&ln)R.glass([x-.17,YC-S0/2,-S0/2],[0,0,S0],[0,S0,0],{c:P.c6,a:a*.5,nu:2,nv:2,th:.02});
      if(v<.03){R.glow([x,YC,0],.12,{c,a:a*.8});continue}
      R.glass([x,YC-v/2,-v/2],[0,0,v],[0,v,0],{c,a:a*(i?.95:.9),nu:4,nv:4});
      top.push([x,YC+v/2,0])}
    // the signal moving through the layers: dots along the top and bottom edges and the centre line of the tube
    if(rev>0){const path=(sy,sz)=>{const p=[];for(let i=0;i<=rev;i++){const v=side(s[0],i);p.push([X(i),YC+sy*v/2,sz*v/2])}return p};
      R.flow(path(0,0),{c,a:a*.9,r:.06,speed:1.6,n:Math.max(4,rev)});
      [[1,1],[-1,-1],[1,-1],[-1,1]].forEach(([sy,sz])=>R.flow(path(sy,sz),{c,a:a*.55,r:.045,speed:1.6,n:Math.max(3,Math.round(rev*.7))}))}
    // labels: the factor per layer over the middle of the tube, the value reached at the last plate shown
    const j=Math.min(rev,L),v=side(s[0],j);
    // the factor per layer, above the input end of the tube (the near plates are the small ones when the signal grows)
    R.label([X(0),YC+CAP/2+.2,0],ln?s[1]+' · reset at every layer':s[1]+' · ×'+per(s[0]).toFixed(3)+' per layer',{fs:13,b:1,c,a,al:'left',dx:-20,wide:1});
    if(rev>=1)R.label([X(j),YC+v/2+.05,0],(j===L?'layer 20 · ':'layer '+j+' · ')+fe(H[s[0]][j]),{mono:true,fs:12.5,b:1,dy:-14,al:j>14?'right':'center',dx:j>14?10:0,c,a})}
  function draw(R,k,e){const P=R.P;R.grid(-5.6,5.6,-1.6,1.6,.5);
    // the size the signal should keep: dashed squares of side 1 at every layer
    const h0=S0/2;for(let i=1;i<=L;i++){const x=X(i);R.quad([[x,YC-h0,-h0],[x,YC-h0,h0],[x,YC+h0,h0],[x,YC+h0,-h0]],{edge:true,ec:P.mute,dash:[3,3],ea:k===0?.7:.3,lw:1})}
    // the input: 1,024 vectors of 512 numbers, mean square 1
    if(k===0){R.glass([X(0),YC-S0/2,-S0/2],[0,0,S0],[0,S0,0],{c:P.ink,a:.5,nu:4,nv:4});
      const pts=[];for(let i=0;i<=L;i++)pts.push([X(i),YC,0]);R.flow(pts,{c:P.mute,a:.6*e,r:.05,speed:1.6,n:14})}
    R.label([X(0),0,1.95],'input · mean square 1.00',{mono:true,fs:12,c:P.mute,al:'left',dx:-30});
    [5,10,15,20].forEach(i=>R.label([X(i),0,1.95],'layer '+i,{mono:true,fs:12,c:P.mute,dy:12}));
    if(k===0)R.label([X(10),YC+S0/2+.35,0],'20 layers of width 512, ReLU, no bias',{fs:13,b:1,c:P.ink,a:e});
    // the previous initialisation fades out before the next one runs through the layers
    if(k>=1){const fa=Math.max(0,1-e/.2);if(k>=2&&fa>0)series(R,k-1,L,fa,P);
      const rev=Math.max(0,Math.min(L,Math.floor((e-.15)/.85*(L+1))));if(e>.15)series(R,k,rev,1,P)}
  }
  S3.stage({id:'stg-hr',list:'sx-hr',fig:'Fig. 1 · one batch through 20 layers, measured',cam:[-.62,.36],bounds:[[-5.3,0,-1.6],[5.3,YC+CAP/2+.3,2.1]],aspect:.5,
    // the exploding step needs the full height; the others fit the plates of side 1.3 and their labels
    // on a phone the camera looks further down the tube, so it recedes into depth instead of running across a narrow card
    view:k=>{const ph=innerWidth<520,c=ph?[-1.05,.36]:null;return k===4?(c?{cam:c}:null):{cam:c||undefined,bounds:[[-5.3,0,-1.2],[5.3,YC+S0/2+.9,2.1]]}},dur:2600,hold:4600,draw,
    margin:w=>w<520?[16,10,12,10]:[22,16,12,16]});
})();
