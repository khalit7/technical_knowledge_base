// ---- shared helpers for the deduplication page (prefix dp) ----
window.DPU=(function(){
  const esc=RD.esc;
  const P=(s,b,r)=>1-Math.pow(1-Math.pow(s,r),b);           // LSH candidate probability, b bands of r rows
  const thr=(b,r)=>Math.pow(1/b,1/r);                         // where the S-curve is steepest (approximately)
  function lgam(x){const c=[76.18009172947146,-86.50532032941677,24.01409824083091,-1.231739572450155,0.1208650973866179e-2,-0.5395239384953e-5];
    let y=x,t=x+5.5;t-=(x+0.5)*Math.log(t);let s=1.000000000190015;for(let j=0;j<6;j++)s+=c[j]/++y;return -t+Math.log(2.5066282746310005*s/x)}
  const binom=(n,k,p)=>p<=0?(k===0?1:0):p>=1?(k===n?1:0):Math.exp(lgam(n+1)-lgam(k+1)-lgam(n-k+1)+k*Math.log(p)+(n-k)*Math.log(1-p));
  // numeric integral of f on [a,b] (Simpson, 200 steps): used for datasketch's false positive / negative areas
  function integ(f,a,b){const n=200,h=(b-a)/n;let s=f(a)+f(b);for(let i=1;i<n;i++)s+=(i%2?4:2)*f(a+i*h);return s*h/3}
  // datasketch MinHashLSH._optimal_param (lsh.py:33-48 at v2.0.0): brute force over b, r with b*r <= K
  function optimal(t,K,wfp,wfn,rmin){let best=null;
    for(let b=1;b<=K;b++){const rmax=Math.floor(K/b);for(let r=(rmin||1);r<=rmax;r++){
      const fp=integ(s=>P(s,b,r),0,t),fn=integ(s=>1-P(s,b,r),t,1),e=fp*wfp+fn*wfn;
      if(!best||e<best.e)best={b,r,e,fp,fn}}}
    return best}
  const fmt=(x,d)=>x==null||!isFinite(x)?'n/a':(+x).toLocaleString('en-GB',{maximumFractionDigits:d==null?0:d,minimumFractionDigits:d==null?0:d});
  const pct=(x,d)=>fmt(100*x,d==null?1:d)+'%';
  const big=x=>x>=1e12?fmt(x/1e12,1)+' T':x>=1e9?fmt(x/1e9,1)+' G':x>=1e6?fmt(x/1e6,1)+' M':x>=1e3?fmt(x/1e3,1)+' k':fmt(x);
  const bytes=x=>x>=1e15?fmt(x/1e15,1)+' PB':x>=1e12?fmt(x/1e12,1)+' TB':x>=1e9?fmt(x/1e9,1)+' GB':x>=1e6?fmt(x/1e6,1)+' MB':x>=1e3?fmt(x/1e3,1)+' kB':fmt(x)+' B';
  // base64 -> Uint8Array
  function b64(s){const bin=atob(s),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u}
  const bit=(u,i)=>(u[i>>3]>>(7-(i&7)))&1;   // numpy packbits order (big-endian within a byte)
  // simple chart frame: returns {x,y,svg-parts} for a w x h plot with margins
  function frame(w,h,xd,yd,o){o=o||{};const m={l:o.l||40,r:o.r||10,t:o.t||10,b:o.b||30};
    const X=v=>m.l+(v-xd[0])/(xd[1]-xd[0])*(w-m.l-m.r),Y=v=>h-m.b-(v-yd[0])/(yd[1]-yd[0])*(h-m.t-m.b);
    let g='<rect x="'+m.l+'" y="'+m.t+'" width="'+(w-m.l-m.r)+'" height="'+(h-m.t-m.b)+'" fill="none" stroke="var(--line)"/>';
    (o.xt||[]).forEach(v=>{g+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+(h-m.b)+'" y2="'+(h-m.b+4)+'" stroke="var(--mute)"/>'+RD.t(X(v),h-m.b+15,o.xf?o.xf(v):v,{a:'middle',fill:'var(--mute)',fs:10.5})});
    (o.yt||[]).forEach(v=>{g+='<line x1="'+m.l+'" x2="'+(w-m.r)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)" stroke-dasharray="2 3"/>'+RD.t(m.l-4,Y(v)+3.5,o.yf?o.yf(v):v,{a:'end',fill:'var(--mute)',fs:10.5})});
    if(o.xl)g+=RD.t((m.l+w-m.r)/2,h-2,o.xl,{a:'middle',fill:'var(--mute)',fs:11});
    if(o.yl)g+='<text transform="translate(11,'+((m.t+h-m.b)/2)+') rotate(-90)" text-anchor="middle" font-size="11" fill="var(--mute)">'+o.yl+'</text>';
    return {X,Y,g,m}}
  const path=(pts)=>pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  // register a renderer for a tab (called when the tab is shown and on resize while it is visible)
  function onTab(id,f){(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER[id]=window.TAB_RENDER[id]||[]).push(f);
    let t=0;addEventListener('resize',()=>{const el=document.getElementById(id);if(!el||el.hidden)return;clearTimeout(t);t=setTimeout(f,80)})}
  return {esc,P,thr,binom,integ,optimal,fmt,pct,big,bytes,b64,bit,frame,path,onTab};
})();
