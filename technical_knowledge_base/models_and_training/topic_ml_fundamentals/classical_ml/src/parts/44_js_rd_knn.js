// ---- Reading 6: distance concentration as dimension grows (card rd-cd), a seeded simulation ----
(function(){
  const DS=[1,2,3,5,10,20,50,100,300,1000];let R=null;
  function sim(){if(R)return R;const r=ML.rng(42),n=500,q=20;R=DS.map(d=>{const P=[...Array(n)].map(()=>Float64Array.from({length:d},r));let rc=0,ratio=0;
    for(let k=0;k<q;k++){const Q=Float64Array.from({length:d},r);let mn=Infinity,mx=0;for(const p of P){let s=0;for(let j=0;j<d;j++){const t=p[j]-Q[j];s+=t*t}s=Math.sqrt(s);if(s<mn)mn=s;if(s>mx)mx=s}rc+=(mx-mn)/mn;ratio+=mn/mx}
    return {d,rc:rc/q,ratio:ratio/q}});return R}
  function draw(){const el=document.getElementById('rd-cdV');if(!el||el.offsetParent===null)return;const S=sim(),w=RD.width(el),h=190,ctx=PL.cv(el,w,h),F=PL.frame([0,3,0,1],w,h,{l:44,r:12,t:10,b:34});
    PL.axes(ctx,F,{xt:[0,1,2,3],xf:v=>String(Math.pow(10,v)),yt:[0,0.25,0.5,0.75,1],yf:v=>v.toFixed(2),xl:'dimensions (log scale)'});
    ctx.strokeStyle=PL.css('--c1');ctx.lineWidth=2.2;ctx.beginPath();S.forEach((s,i)=>{const p=[F.X(Math.log10(s.d)),F.Y(s.ratio)];i?ctx.lineTo(...p):ctx.moveTo(...p)});ctx.stroke();
    S.forEach(s=>PL.dot(ctx,F.X(Math.log10(s.d)),F.Y(s.ratio),3,PL.css('--c1')));
    PL.text(ctx,'nearest distance / farthest distance',F.pad.l+8,F.pad.t+14,{c:PL.css('--c1')});
    const g=k=>S.find(s=>s.d===k);
    document.getElementById('rd-cdN').innerHTML=RD.stat('2 dimensions',g(2).ratio.toFixed(3),'nearest / farthest')+RD.stat('100 dimensions',g(100).ratio.toFixed(2),'')+RD.stat('1,000 dimensions',g(1000).ratio.toFixed(2),'the nearest point is almost as far as the farthest')}
  RD.onRender(draw);let rz=0;addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(draw,200)});
  if('IntersectionObserver' in window)new IntersectionObserver(es=>{if(es[0].isIntersecting)draw()}).observe(document.getElementById('rd-cd'));else draw();
})();
