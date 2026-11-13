// ---- Scene: what each layer can see, ViT against the ResNet, on the same toy image (renderer v2; two modes, two step lists) ----
// The image lies on the floor and the layers stack above it. ViT: each layer is a 7 x 7 glass plate with the class token's real attention to
// every patch as bars (heads averaged, shipped 64,000-image model), and its reach drawn down to the image: the whole image from layer 1.
// ResNet (BiT-style, not shipped): each stage's feature map as a glass plate, one output position lit, and its theoretical receptive field
// (from kernel sizes and strides) drawn down to the image as a frustum that widens stage by stage. Multiply-adds are counted by formula.
(function(){
  if(!document.getElementById('stg-vx')||!window.VS)return;const {at,lerp,cl}=S3;
  let M='vit';
  const H=1.4,W=2*H,px=v=>-H+v*W/28,cell=(r,c,n,y)=>[-H+(c+.5)*W/n,y,-H+(r+.5)*W/n];
  const VY=l=>.7+l*.6,CNN=[{n:'stem · 3 × 3, stride 2',fm:14,y:.6,r:[0,3]},{n:'block 1',fm:14,y:1.2,r:[7,11]},{n:'block 2 · stride 2',fm:7,y:1.8,r:[15,23]},{n:'block 3',fm:7,y:2.4,r:[31,39]}];
  const MAC_VIT=[25088,799488,1573888,2348288,3122688,3122848],MAC_CNN=[0,28224,931392,1633856,3402560,3402800];
  function floorImg(R,T,a){const g=.08;R.quad([[-H-g,.01,-H-g],[H+g,.01,-H-g],[H+g,.01,H+g],[-H-g,.01,H+g]],{fill:R.P.paper,dz:12});VS.picGrid(R,T.img,[-H,.025,-H],[W,0,0],[0,0,W],a,6)}
  function plate(R,y,n,c,a){R.glass([-H,y,-H],[W,0,0],[0,0,W],{c,a,nu:n,nv:n,th:.02,dz:3})}
  function drawVit(R,k,e,T){const P=R.P;floorImg(R,T,k===0?1:.8);
    if(k===0){const a=e;for(let i=1;i<7;i++){R.line([[px(i*4),.03,-H],[px(i*4),.03,H]],{c:P.acc,w:1.2,a});R.line([[-H,.03,px(i*4)],[H,.03,px(i*4)]],{c:P.acc,w:1.2,a})}
      R.label([0,.03,H],'49 patches → 49 tokens + 1 class token',{mono:true,fs:12,dy:18,c:P.mute,a})}
    const cur=k>=1&&k<=4?k-1:k===5?3:-1;
    T.att.forEach((A,l)=>{if(l>cur)return;const y=VY(l),now=l===cur&&k<=4,a=now?(l===k-1?Math.min(1,e*1.5):1):.2;
      plate(R,y,7,P.c4,now?1:.3);
      A.v.forEach((w,p)=>{const h=Math.max(.01,w/T.mA*.55),c=cell(Math.floor(p/7),p%7,7,y);R.box(c,[.3,h,.3],{fill:P.c2,a,shadow:false,lw:.5})});
      R.label([-H-.1,y,0],'layer '+(l+1),{al:'right',dx:-6,mono:true,fs:12,c:now?P.ink:P.mute,a:Math.max(.5,a),grp:'pl'})});
    if(k>=1&&k<=4){const l=k-1,y=VY(l),A=T.att[l],cb=[H+.55,y+.2,0],a=Math.min(1,e*1.5);
      R.ball(cb,.12,{c:P.c4,a});R.label(cb,'class token',{al:'left',dx:12,mono:true,fs:12,c:P.c4,a,b:1});
      A.v.map((w,p)=>[w,p]).sort((a2,b)=>b[0]-a2[0]).slice(0,5).forEach(([w,p])=>{const c=cell(Math.floor(p/7),p%7,7,y);c[1]+=w/T.mA*.55+.02;R.flowArc(c,cb,.35,{c:P.c2,a:a*(.3+.7*w/T.mA),r:.04+.03*w/T.mA,n:Math.max(3,Math.round(3+8*w/T.mA)),speed:1.8})});
      // reach: what can influence the class token by this layer (the whole image, from layer 1)
      [[-H,-H],[H,-H],[H,H],[-H,H]].forEach(([x,z])=>R.line([cb,[x,.03,z]],{c:P.c4,w:1.3,a:a*.7,dash:[5,4]}));
      R.quad([[-H,.03,-H],[H,.03,-H],[H,.03,H],[-H,.03,H]],{fill:P.c4,fa:.22,a,ec:P.c4,ea:.9,lw:1.6,dz:4});
      R.label([0,.03,H],'reach: the whole image',{mono:true,fs:12,dy:18,c:P.c4,a,b:1})}
    if(k===5){const cb=[H+.55,VY(3)+.2,0];R.ball(cb,.12,{c:P.c4});
      T.probs.forEach((p,j)=>{const z=.6,x=H+.75+j*.55,h=Math.max(.02,p*1.8),best=j===T.pred;R.box([x,0,z],[.32,h,.32],{fill:best?P.c1:P.paper,a:e});
        if(best||R.W>=520)R.label([x,0,z+.2],VS.KIND[j],{mono:true,fs:12,dy:14,b:best,c:best?P.c1:P.ink,a:e});R.label([x,h,z],VS.pct(p),{mono:true,fs:12,dy:-10,b:best,c:best?P.c1:P.mute,a:e});
        if(p>.01)R.flow([cb,[x,h+.05,z]],{c:P.c1,a:e*(.25+.75*p),r:.04+.04*p,n:Math.max(2,Math.round(2+8*p))})})}}
  function drawCnn(R,k,e,T){const P=R.P,o=T.L[0],cx=o.x+(o.s-1)/2,cy=o.y+(o.s-1)/2;floorImg(R,T,k===0?1:.8);
    if(k===0){R.ball([px(cx+.5),.05,px(cy+.5)],.07,{c:P.c2,a:e});R.label([0,.03,H],'one output position will be followed up',{mono:true,fs:12,dy:18,c:P.mute,a:e,wide:1});return}
    const cur=Math.min(k-1,3);
    CNN.forEach((L,i)=>{if(i>cur)return;const now=i===cur&&k<=4;plate(R,L.y,L.fm,P.c6,now?1:.25);
      R.label([-H-.1,L.y,0],L.n+' · '+L.fm+' × '+L.fm,{al:'right',dx:-6,mono:true,fs:12,c:now?P.ink:P.mute,a:now?1:.6,grp:'pl'});
      const ci=Math.min(L.fm-1,Math.floor(cx*L.fm/28)),cj=Math.min(L.fm-1,Math.floor(cy*L.fm/28)),c=cell(cj,ci,L.fm,L.y);R.box(c,[W/L.fm*.9,.1,W/L.fm*.9],{fill:P.c2,a:now?1:.4,shadow:false})});
    let top,r;if(k<=4){const L=CNN[k-1],ci=Math.min(L.fm-1,Math.floor(cx*L.fm/28)),cj=Math.min(L.fm-1,Math.floor(cy*L.fm/28));top=cell(cj,ci,L.fm,L.y+.1);r=lerp(L.r[0],L.r[1],e)}
    else{top=[0,3.0,0];r=28;R.box([0,2.95,0],[.36,.12,.36],{fill:P.c2});R.label([-.3,3.0,0],'global average pool → linear',{al:'right',dx:-8,mono:true,fs:12,c:P.ink,grp:'pl'})}
    const x0=Math.max(0,cx-r/2),x1=Math.min(28,cx+r/2+1),y0=Math.max(0,cy-r/2),y1=Math.min(28,cy+r/2+1),F=k===5?[[-H,-H],[H,-H],[H,H],[-H,H]]:[[px(x0),px(y0)],[px(x1),px(y0)],[px(x1),px(y1)],[px(x0),px(y1)]];
    R.quad(F.map(([x,z])=>[x,.035,z]),{fill:P.c1,fa:.3,a:1,ec:P.c1,ea:.9,lw:1.6,dz:4});
    F.forEach(([x,z])=>R.line([top,[x,.035,z]],{c:P.c1,w:1.1,a:.6}));
    F.forEach(([x,z])=>R.flow([[x,.04,z],top],{c:P.c1,r:.05,n:4,speed:1.2,a:.8}));
    const rr=Math.round(r),lab=k===5?'receptive field: the whole image':'receptive field '+rr+' × '+rr+' px';
    R.label([(F[0][0]+F[1][0])/2,.035,F[2][1]],lab,{mono:true,fs:12,dy:16,c:P.c1,b:1})}
  function draw(R,k,e){const T=VS.data();R.grid(-4,5,-3,3,.5);if(M==='vit')drawVit(R,k,e,T);else drawCnn(R,k,e,T)}
  function counters(k){if(M==='vit'){const reach=k>=1?'the whole image (28 px)':'one patch (4 px)';
      return stat('Tokens',50,'')+stat('Layer',k>=1&&k<=4?k+' of 4':k===5?'head':'embedding','')+stat('Reach of the class token','<span style="font-size:14px;font-weight:500">'+reach+'</span>','')+stat('Multiply-adds so far',fmt(MAC_VIT[k]),'of 3,122,848')}
    const rf=[0,3,11,23,39,28][k];
    return stat('Layer',k===0?'n/a':k<=4?CNN[k-1].n.split(' · ')[0]:'pool','')+stat('Receptive field',k===0?'n/a':k===5?'whole image':rf+' × '+rf+' px',k>=1&&k<=4?pct(Math.min(1,rf*rf/784),0)+' of the image area, at most':'')+stat('Multiply-adds so far',fmt(MAC_CNN[k]),'of 3,402,800')}
  const full={cam:[.42,.62],bounds:[[-2.0,0,-1.6],[4.2,3.1,1.6]]};
  const st=S3.stage({id:'stg-vx',list:'sx-vxv',fig:'Fig. 1b · what each layer can see',cam:full.cam,bounds:full.bounds,aspect:.68,dur:1500,hold:4800,draw,
    margin:w=>w<520?[14,10,14,10]:[16,14,22,150],
    view:k=>k===0?{cam:[.42,.85],bounds:[[-1.8,0,-1.6],[2.2,.4,1.8]]}:M==='vit'&&k===5?full:{cam:[.42,.62],bounds:[[-1.9,0,-1.6],[2.5,k===5?3.1:M==='vit'?VY(k-1)+.6:CNN[k-1].y+.3,1.6]]},
    onStep:k=>{try{document.getElementById('vxCnt').innerHTML=counters(k)}catch(e){}}});
  const seg=document.getElementById('vxM');
  if(seg&&st)segBind('vxM',m=>{M=m;seg.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));
    document.getElementById('sx-vxv').hidden=m!=='vit';document.getElementById('sx-vxc').hidden=m!=='cnn';st.list(m==='vit'?'sx-vxv':'sx-vxc')});
})();
