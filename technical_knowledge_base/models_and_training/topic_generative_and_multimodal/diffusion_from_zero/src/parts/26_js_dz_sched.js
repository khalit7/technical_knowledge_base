// ---- Section 2: the schedule designer (moved from its own tab into the Reading flow on 2026-10-24; all computed in the browser) ----
(function(){
  const D=window.DZ;if(!D||!document.getElementById('dz-sd-chart'))return;
  const $=id=>document.getElementById(id);
  const DEF={linear:[1e-4,0.02],scaled:[0.00085,0.012],cosine:[null,null]};
  const st={kind:'scaled',b0:0.00085,b1:0.012,zt:false,off:0,side:64,shift:0,t:999};
  const SIDES=[16,32,64,128,256];   // slider index 0..4 maps to 16..256 for the shift; image side 2^4..2^8
  const test=DZC.b64u8(D.test);   // 10 images x 784 uint8
  const R=DZC.rng(11),EPS=[],XI=[];for(let i=0;i<10;i++){const e=new Float64Array(784);for(let j=0;j<784;j++)e[j]=R.g();EPS.push(e);XI.push(R.g())}
  function abar(){
    let b=DZC.betas(st.kind,st.b0,st.b1);if(st.zt)b=DZC.ztsnr(b);let a=DZC.abarOf(b);
    if(st.shift){const tr=SIDES[st.shift],f=(tr/st.side)**2;a=a.map(v=>{const s=v/(1-v)*f;return s/(1+s)})} // SNR x (train side / use side)^2
    return a}
  const lsnr=a=>a.map(v=>Math.log(v/(1-v)));
  function counters(a){
    const T=a.length,snr=a.map(v=>v/(1-v)),cross=snr.findIndex(v=>v<1),n=st.side*st.side,last=a[T-1];
    const ms=last/((1-last)*(1/n+st.off*st.off));
    $('dz-sd-cnt').innerHTML=RD.stat('&radic;&#257; at the last step',last<=0?'0 (exact)':DZC.f(Math.sqrt(last),4),'signal amplitude left')+
      RD.stat('SNR below 1 from',cross<0?'never':'t = '+cross,DZC.pct(cross<0?0:1-cross/T,0)+' of steps noise-dominated')+
      RD.stat('Brightness SNR at the last step',ms<=0?'0':ms<0.01?ms.toExponential(1):DZC.f(ms,ms<10?2:1),'per-channel mean of '+DZC.f(n)+' values'+(st.off?', offset '+st.off:''))+
      RD.stat('ln SNR range',DZC.f(Math.log(snr[0]),1)+' to '+(last<=0?'&minus;&infin;':DZC.f(Math.log(snr[T-1]),1)),'first to last step')}
  function chart(a){
    const L=lsnr(a),pts=[];for(let t=0;t<L.length;t+=5)pts.push([t,L[t]]);pts.push([999,L[999]]);
    const ref=k=>{const r=lsnr(DZC.sched(k)),p=[];for(let t=0;t<1000;t+=10)p.push([t,r[t]]);p.push([999,r[999]]);return p};
    const ser=[{name:'linear',color:'#c2703a',pts:ref('linear'),dash:'4 3',w:1.2,mark:false},{name:'cosine',color:'#3f7f56',pts:ref('cosine'),dash:'4 3',w:1.2,mark:false},
      {name:'scaled-linear (SD 1.5)',color:'#8a5cb8',pts:ref('scaled'),dash:'4 3',w:1.2,mark:false},{name:'your schedule',color:'#2f6fb5',pts:pts.filter(p=>isFinite(p[1])),w:2.6,mark:false}];
    DZC.chart({el:$('dz-sd-chart'),series:ser,xlab:'timestep t',ylab:'ln SNR',x0:0,x1:999,y0:-22,y1:12,hlines:[{y:0,label:'SNR = 1'}],vlines:[{x:st.t,label:'t'}]});
    DZC.legend($('dz-sd-leg'),ser)}
  function images(a){
    const ab=a[st.t],sa=Math.sqrt(ab),sn=Math.sqrt(1-ab),W=280,H=28,v1=new Float64Array(W*H),v2=new Float64Array(W*H);
    for(let i=0;i<10;i++){let m=0;const px=new Float64Array(784);
      for(let j=0;j<784;j++){const x0=test[i*784+j]/127.5-1,e=EPS[i][j]+st.off*XI[i];px[j]=sa*x0+sn*e;m+=px[j]}m/=784;
      const est=ab>1e-12?Math.max(-1,Math.min(1,m/sa)):0;
      for(let y=0;y<28;y++)for(let x=0;x<28;x++){const k=y*W+i*28+x;v1[k]=(px[y*28+x]+1)*127.5;v2[k]=(est+1)*127.5}}
    DZC.drawGrey($('dz-sd-cv1'),v1,W,H);DZC.drawGrey($('dz-sd-cv2'),v2,W,H)}
  function sync(){
    const cos=st.kind==='cosine';$('dz-sd-b0').disabled=$('dz-sd-b1').disabled=cos;
    $('dz-sd-b0').value=cos?-4:Math.log10(st.b0);$('dz-sd-b1').value=cos?-1.7:Math.log10(st.b1);
    $('dz-sd-b0o').textContent=cos?'n/a':st.b0.toPrecision(2);$('dz-sd-b1o').textContent=cos?'n/a':st.b1.toPrecision(2);
    $('dz-sd-offo').textContent=st.off.toFixed(2);$('dz-sd-reso').textContent=st.side+' px';
    $('dz-sd-shifto').textContent=st.shift?SIDES[st.shift]+' px':'off';$('dz-sd-to').textContent=st.t}
  function render(){sync();const a=abar();counters(a);chart(a);images(a)}
  RD.seg($('dz-sd-kind'),m=>{st.kind=m;if(DEF[m][0]!=null){st.b0=DEF[m][0];st.b1=DEF[m][1]}render()});
  $('dz-sd-b0').addEventListener('input',e=>{st.b0=10**+e.target.value;render()});
  $('dz-sd-b1').addEventListener('input',e=>{st.b1=10**+e.target.value;render()});
  $('dz-sd-zt').addEventListener('change',e=>{st.zt=e.target.checked;render()});
  $('dz-sd-off').addEventListener('input',e=>{st.off=+e.target.value;render()});
  $('dz-sd-res').addEventListener('input',e=>{st.side=2**+e.target.value;render()});
  $('dz-sd-shift').addEventListener('input',e=>{st.shift=+e.target.value;render()});
  $('dz-sd-t').addEventListener('input',e=>{st.t=+e.target.value;render()});
  RD.onRender(render);RD.onResize(()=>chart(abar()));
})();
