// ---- Reading section 1: one Fashion-MNIST image made three ways (autoregressive tokens, DDIM diffusion steps, Euler flow steps) ----
// Every frame is exact arithmetic on the real image and one seeded noise draw:
//   diffusion: x_t = sqrt(abar_t) x0 + sqrt(1 - abar_t) eps, DDPM linear betas 1e-4..0.02 over T = 1000, DDIM timesteps 980, 960, ..., 0
//   flow:      x_t = (1 - t) x0 + t eps, t = 1, 7/8, ..., 0 (8 Euler steps; with the exact velocity the path is a straight line)
//   autoregressive: 49 tokens of 4 x 4 pixels revealed in raster order
(function(){
  const G=window.RDG;if(!G||!document.getElementById('rd-gen-card'))return;
  const raw=atob(G.img),x0=new Float32Array(784);for(let i=0;i<784;i++)x0[i]=raw.charCodeAt(i)/127.5-1;
  // seeded standard normal noise (mulberry32 + Box-Muller)
  let s=20261017;const rnd=()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
  const eps=new Float32Array(784);for(let i=0;i<784;i+=2){const u=Math.max(rnd(),1e-12),v=rnd(),r=Math.sqrt(-2*Math.log(u));eps[i]=r*Math.cos(2*Math.PI*v);eps[i+1]=r*Math.sin(2*Math.PI*v)}
  // DDPM linear schedule, cumulative product abar
  const T=1000,ab=new Float64Array(T);let p=1;for(let t=0;t<T;t++){const b=1e-4+(0.02-1e-4)*t/(T-1);p*=1-b;ab[t]=p}
  const NS=50,ts=[];for(let k=NS-1;k>=0;k--)ts.push(k*20); // 980 ... 0
  const NF=NS+1,NE=8,NT=49;
  let cfg=0;
  const cv=id=>document.querySelector('#'+id+' canvas'),ct=id=>document.querySelector('#'+id+' .c');
  function paint(c,f){const g=c.getContext('2d'),im=g.createImageData(28,28);
    const dark=matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches;
    for(let i=0;i<784;i++){let v=f(i);v=Math.max(-1,Math.min(1,v));let q=Math.round((v+1)*127.5);if(!dark)q=255-q;im.data[4*i]=im.data[4*i+1]=im.data[4*i+2]=q;im.data[4*i+3]=255}
    g.putImageData(im,0,0)}
  const dcoef=f=>{if(f===0)return [0,1];const t=ts[f-1];return [Math.sqrt(ab[t]),Math.sqrt(1-ab[t])]}; // frame 0 = pure noise
  const fsteps=f=>Math.floor(NE*f/(NF-1)),toks=f=>Math.round(NT*f/(NF-1));
  function path(f){const el=document.getElementById('rd-gen-path');const W=Math.min(168,RD.width(el)),H=W,m=18,X=a=>m+a*(W-2*m),Y=b=>H-m-b*(H-2*m);
    let d='',l='';for(let k=0;k<NF;k++){const c=dcoef(k);d+=(k?'L':'M')+X(c[0]).toFixed(1)+' '+Y(c[1]).toFixed(1)}
    const c=dcoef(f),tf=1-fsteps(f)/NE;
    const body='<line x1="'+m+'" y1="'+(H-m)+'" x2="'+(W-m)+'" y2="'+(H-m)+'" stroke="var(--line)"/><line x1="'+m+'" y1="'+m+'" x2="'+m+'" y2="'+(H-m)+'" stroke="var(--line)"/>'+
      '<path d="'+d+'" fill="none" stroke="var(--c1)" stroke-width="2"/><line x1="'+X(0)+'" y1="'+Y(1)+'" x2="'+X(1)+'" y2="'+Y(0)+'" stroke="var(--c4)" stroke-width="2" stroke-dasharray="4 3"/>'+
      '<circle cx="'+X(c[0])+'" cy="'+Y(c[1])+'" r="4.5" fill="var(--c1)"/><circle cx="'+X(1-tf)+'" cy="'+Y(tf)+'" r="4.5" fill="var(--c4)"/>'+
      RD.t(W/2,H-3,'image share',{a:'middle',fs:10})+'<text x="9" y="'+(H/2)+'" font-size="10" text-anchor="middle" transform="rotate(-90 9 '+(H/2)+')">noise share</text>';
    el.innerHTML=RD.svg(W,H,body,'Coefficient of the image against coefficient of the noise: diffusion on a curve, flow on a straight line')+
      '<div class="leg"><span style="--sw:var(--c1)">diffusion</span><span style="--sw:var(--c4)">flow</span></div>'}
  const cap=document.getElementById('rd-gen-cap');
  function draw(f){
    const k=toks(f);paint(cv('rd-gen-ar'),i=>{const r=i/28|0,c=i%28,tok=(r>>2)*7+(c>>2);return tok<k?x0[i]:0});
    const c=dcoef(f);paint(cv('rd-gen-df'),i=>c[0]*x0[i]+c[1]*eps[i]);
    const tf=1-fsteps(f)/NE;paint(cv('rd-gen-fl'),i=>(1-tf)*x0[i]+tf*eps[i]);
    const m=cfg?2:1;
    ct('rd-gen-ar').textContent='tokens '+k+'/49, calls '+(k*m);
    ct('rd-gen-df').textContent='steps '+f+'/50, calls '+(f*m);
    ct('rd-gen-fl').textContent='steps '+fsteps(f)+'/8, calls '+(fsteps(f)*m);
    path(f);
    let t;
    if(f===0)t=['Start','Autoregressive starts from an empty canvas; diffusion and flow start from the same draw of pure Gaussian noise, one number per pixel.'];
    else if(f<NF-1)t=['Step '+f+' of 50','Autoregressive has committed '+k+' tokens and can never revise them. Diffusion is at timestep '+ts[f-1]+': the frame is '+(100*c[0]*c[0]).toFixed(0)+'% image and '+(100*c[1]*c[1]).toFixed(0)+'% noise by variance. Flow has taken '+fsteps(f)+' of its 8 straight steps.'];
    else t=['Done','Same image, three bills: 49 calls one after another, 50 denoising calls, 8 flow calls'+(cfg?'; guidance doubles each (98, 100, 16), though a step\'s two passes run as one batch.':'. Turn on guidance to see what the usual text-to-image setting costs.')];
    cap.innerHTML='<div class="t">'+t[0]+'</div><p>'+t[1]+'</p>';
  }
  const A=RD.anim({card:'rd-gen-card',ctl:'rd-gen-ctl',n:NF,draw,ms:260,label:'Frame'});
  RD.seg(document.getElementById('rd-gen-cfg'),v=>{cfg=+v;A.redraw()});
  RD.onResize(()=>A.redraw());
})();
