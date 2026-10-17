// ---- Diffusion from zero: shared helpers (schedules, PRNG, images, charts). Prefix dz. ----
window.DZC=(function(){
  const T=1000;
  // ---- schedules, as diffusers v0.41.0 scheduling_ddpm.py lines 214 to 229 (float64 here) ----
  function betas(kind,b0,b1){
    const b=new Float64Array(T);
    if(kind==='linear'){for(let i=0;i<T;i++)b[i]=b0+(b1-b0)*i/(T-1)}
    else if(kind==='scaled'){const s0=Math.sqrt(b0),s1=Math.sqrt(b1);for(let i=0;i<T;i++){const v=s0+(s1-s0)*i/(T-1);b[i]=v*v}}
    else{const f=t=>Math.cos((t+0.008)/1.008*Math.PI/2)**2;for(let i=0;i<T;i++)b[i]=Math.min(1-f((i+1)/T)/f(i/T),0.999)}
    return b;
  }
  const abarOf=b=>{const a=new Float64Array(T);let p=1;for(let i=0;i<T;i++){p*=1-b[i];a[i]=p}return a};
  // zero terminal SNR (Lin et al. 2023, Algorithm 1; diffusers scheduling_ddim.py line 103)
  function ztsnr(b){
    const ab=abarOf(b),s=ab.map(Math.sqrt),s0=s[0],sT=s[T-1];
    const r=s.map(v=>(v-sT)*s0/(s0-sT)),a2=r.map(v=>v*v),out=new Float64Array(T);
    out[0]=1-a2[0];for(let i=1;i<T;i++)out[i]=1-a2[i]/a2[i-1];return out;
  }
  const PRESET={linear:{kind:'linear',b0:1e-4,b1:0.02,name:'Linear (DDPM; the tiny model)'},
    cosine:{kind:'cosine',b0:0,b1:0,name:'Cosine (improved DDPM)'},
    scaled:{kind:'scaled',b0:0.00085,b1:0.012,name:'Scaled-linear (Stable Diffusion 1.5)'}};
  function sched(name,opt){opt=opt||{};const p=PRESET[name];let b=betas(p.kind,opt.b0!=null?opt.b0:p.b0,opt.b1!=null?opt.b1:p.b1);
    if(opt.zt)b=ztsnr(b);return abarOf(b)}
  // ---- seeded PRNG (mulberry32) and Gaussian (Box-Muller) ----
  function rng(seed){let a=seed>>>0;const u=()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296};
    let spare=null;const g=()=>{if(spare!==null){const v=spare;spare=null;return v}let x,y,r;do{x=2*u()-1;y=2*u()-1;r=x*x+y*y}while(!r||r>=1);const f=Math.sqrt(-2*Math.log(r)/r);spare=y*f;return x*f};return{u,g}}
  // ---- images: base64 uint8 (n x 784) or a PNG data URI strip ----
  function b64u8(s){const bin=atob(s),a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return a}
  function drawGrey(cv,vals,w,h){cv.width=w;cv.height=h;const c=cv.getContext('2d'),im=c.createImageData(w,h);
    for(let i=0;i<w*h;i++){const v=Math.max(0,Math.min(255,Math.round(vals[i])));im.data[4*i]=im.data[4*i+1]=im.data[4*i+2]=v;im.data[4*i+3]=255}c.putImageData(im,0,0)}
  // ---- formatting ----
  const f=(v,d)=>v==null||!isFinite(v)?'n/a':Number(v).toLocaleString('en-GB',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
  const pct=(v,d)=>v==null?'n/a':(100*v).toFixed(d==null?1:d)+'%';
  // ---- a simple line chart (SVG), sized from the container's measured width ----
  // o: {el, series:[{name,color,pts:[[x,y]],dash,w,mark}], xlog, ylog, xlab, ylab, x0,x1,y0,y1, h, hl (series name), vlines:[{x,label}], hlines:[{y,label}]}
  function chart(o){
    const W=Math.max(260,Math.min(860,RD.width(o.el))),H=o.h||Math.round(Math.min(320,Math.max(220,W*0.5)));
    const L=46,R=10,Tp=10,B=34,pw=W-L-R,ph=H-Tp-B;
    const all=o.series.flatMap(s=>s.pts).filter(p=>isFinite(p[0])&&isFinite(p[1])&&(!o.ylog||p[1]>0)&&(!o.xlog||p[0]>0));
    const tx=v=>o.xlog?Math.log10(v):v,ty=v=>o.ylog?Math.log10(v):v;
    let x0=o.x0!=null?o.x0:Math.min(...all.map(p=>p[0])),x1=o.x1!=null?o.x1:Math.max(...all.map(p=>p[0]));
    let y0=o.y0!=null?o.y0:Math.min(...all.map(p=>p[1])),y1=o.y1!=null?o.y1:Math.max(...all.map(p=>p[1]));
    if(x1===x0)x1=x0+1;if(y1===y0)y1=y0+1;
    const X=v=>L+(tx(v)-tx(x0))/(tx(x1)-tx(x0))*pw,Y=v=>Tp+ph-(ty(Math.max(o.ylog?1e-12:-1e300,Math.min(y1,Math.max(y0,v))))-ty(y0))/(ty(y1)-ty(y0))*ph;
    let s='';
    const ticks=(a,b,log)=>{if(log){const out=[];for(let e=Math.floor(Math.log10(a));e<=Math.ceil(Math.log10(b));e++){[1,2,5].forEach(m=>{const v=m*10**e;if(v>=a*0.999&&v<=b*1.001)out.push(v)})}return out.length>7?out.filter((v,i)=>String(v).startsWith('1')):out}
      const st=Math.pow(10,Math.floor(Math.log10((b-a)/4)));const k=[1,2,5,10].find(m=>(b-a)/(m*st)<=6)*st;const out=[];for(let v=Math.ceil(a/k)*k;v<=b+1e-9;v+=k)out.push(+v.toPrecision(10));return out};
    const lab=v=>Math.abs(v)>=1e4||(Math.abs(v)<1e-3&&v!==0)?v.toExponential(0):String(+v.toPrecision(3)).replace(/^(-?)0\./,'$10.');
    ticks(y0,y1,o.ylog).forEach(v=>{s+='<line x1="'+L+'" x2="'+(L+pw)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(L-4,Y(v)+4,lab(v),{a:'end',fill:'var(--mute)'})});
    ticks(x0,x1,o.xlog).forEach(v=>{s+='<line y1="'+Tp+'" y2="'+(Tp+ph)+'" x1="'+X(v)+'" x2="'+X(v)+'" stroke="var(--line)"/>'+RD.t(X(v),Tp+ph+14,lab(v),{a:X(v)>L+pw-16?'end':X(v)<L+16?'start':'middle',fill:'var(--mute)'})});
    (o.hlines||[]).forEach(h=>{s+='<line x1="'+L+'" x2="'+(L+pw)+'" y1="'+Y(h.y)+'" y2="'+Y(h.y)+'" stroke="var(--mute)" stroke-dasharray="4 3"/>'+RD.t(L+pw-2,Y(h.y)-4,h.label,{a:'end',fill:'var(--mute)',fs:10.5})});
    (o.vlines||[]).forEach(h=>{s+='<line y1="'+Tp+'" y2="'+(Tp+ph)+'" x1="'+X(h.x)+'" x2="'+X(h.x)+'" stroke="var(--mute)" stroke-dasharray="4 3"/>'+RD.t(X(h.x)+3,Tp+11,h.label,{fill:'var(--mute)',fs:10.5})});
    o.series.forEach(se=>{const pts=se.pts.filter(p=>isFinite(p[0])&&isFinite(p[1])&&(!o.ylog||p[1]>0)&&(!o.xlog||p[0]>0)&&p[0]>=x0-1e-9&&p[0]<=x1+1e-9);if(!pts.length)return;
      const dim=o.hl&&o.hl!==se.name,wd=(se.w||2)+(o.hl===se.name?1.5:0);
      s+='<path d="'+pts.map((p,i)=>(i?'L':'M')+X(p[0]).toFixed(1)+' '+Y(p[1]).toFixed(1)).join('')+'" fill="none" stroke="'+se.color+'" stroke-width="'+wd+'"'+(se.dash?' stroke-dasharray="'+se.dash+'"':'')+(dim?' opacity="0.25"':'')+'/>';
      if(se.mark!==false)pts.forEach(p=>{s+='<circle cx="'+X(p[0]).toFixed(1)+'" cy="'+Y(p[1]).toFixed(1)+'" r="'+(o.hl===se.name?3.4:2.4)+'" fill="'+se.color+'"'+(dim?' opacity="0.25"':'')+'><title>'+RD.esc(se.name)+': '+lab(p[0])+', '+lab(p[1])+'</title></circle>'})});
    s+=RD.t(L+pw/2,H-4,o.xlab||'',{a:'middle',fill:'var(--mute)'})+'<text transform="translate(11 '+(Tp+ph/2)+') rotate(-90)" text-anchor="middle" font-size="11" fill="var(--mute)">'+(o.ylab||'')+'</text>';
    o.el.innerHTML=RD.svg(W,H,s,o.label||o.ylab||'chart');
    return {X,Y,W,H,L,pw,ph,Tp};
  }
  const legend=(el,series)=>{el.innerHTML=series.map(s=>'<span><i style="background:'+s.color+'"></i>'+RD.esc(s.name)+'</span>').join('')};
  return {T,betas,abarOf,ztsnr,sched,PRESET,rng,b64u8,drawGrey,f,pct,chart,legend};
})();
