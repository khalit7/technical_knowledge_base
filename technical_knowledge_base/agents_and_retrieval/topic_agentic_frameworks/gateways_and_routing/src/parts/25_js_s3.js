// ---- S3 v2: a small 3D renderer on Canvas 2D, and the stage that steps a scene (explainer-page template, from the Attention Is All You Need trial, 2026-11-06;
// v2 the same day: glass plates, flowing dots, a fading floor, contact shadows, softer shading, camera views per step) ----
// Copy into src/parts/ unchanged. Usage and rules: .claude/skills/explainer-page/visuals/three-d.md
// The look of the every-joule explainers (white blocks with ink edges, glows, arcs over a floor grid), drawn without WebGL
// so the page stays self-contained and works wherever a canvas does. Labels are drawn upright in screen space, never in perspective.
// A scene is draw(R,k,e,st): k the current step, e in [0,1] its eased progress. A stage plays itself once it scrolls into view (see auto()).
(function(g){
  const $=id=>document.getElementById(id);
  const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],mul=(a,s)=>[a[0]*s,a[1]*s,a[2]*s];
  const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const nrm=a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return [a[0]/l,a[1]/l,a[2]/l]},lerp=(a,b,t)=>a+(b-a)*t,lerp3=(a,b,t)=>[lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)];
  const cl=(v,a,b)=>Math.max(a,Math.min(b,v)),ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  // colours: CSS variables resolved once per draw; shading needs RGB
  const cv=document.createElement('canvas').getContext('2d');
  function rgb(c){if(Array.isArray(c))return c;cv.fillStyle='#000';cv.fillStyle=c;const s=cv.fillStyle;
    if(s[0]==='#')return [parseInt(s.slice(1,3),16),parseInt(s.slice(3,5),16),parseInt(s.slice(5,7),16)];
    const m=s.match(/[\d.]+/g);return m?[+m[0],+m[1],+m[2]]:[128,128,128]}
  const css=a=>'rgb('+Math.round(a[0])+','+Math.round(a[1])+','+Math.round(a[2])+')';
  const mix=(a,b,t)=>[lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)];
  let PAL=null;
  function pal(){const s=getComputedStyle(document.body),v=n=>rgb(s.getPropertyValue(n).trim()||'#888');
    const bg=v('--bg'),dark=(bg[0]+bg[1]+bg[2])/3<110,card=v('--card');
    const P={dark,bg,card,ink:v('--ink'),mute:v('--mute'),line:v('--line'),soft:v('--soft'),acc:v('--acc'),bad:v('--bad'),good:v('--good')};
    ['c1','c2','c3','c4','c5','c6'].forEach(k=>P[k]=v('--'+k));
    P.paper=dark?mix(card,P.ink,.1):[255,255,255];P.edge=dark?mix(P.ink,card,.35):mix(P.ink,[255,255,255],.12);
    // the three roles used on every scene, matched to the prose colours: query orange, key teal, value purple
    P.q=P.c2;P.k=P.c6;P.v=P.c4;return P}
  // ---- the renderer ----
  const L=nrm([-.45,1,.6]);
  function R3(canvas){this.cv=canvas;this.cx=canvas.getContext('2d');this.q=[];this.top=[];this.under=[];this.lab=[]}
  R3.prototype.size=function(w,h){const d=Math.min(2,window.devicePixelRatio||1);if(this.cv.width!==Math.round(w*d)||this.cv.height!==Math.round(h*d)){this.cv.width=Math.round(w*d);this.cv.height=Math.round(h*d)}
    this.W=w;this.H=h;this.cx.setTransform(d,0,0,d,0,0)};
  // camera orbiting the bounds' centre; the projection is fitted so the bounds fill the canvas at any size
  R3.prototype.camera=function(theta,phi,B,m,dist){const c=mul(add(B[0],B[1]),.5),r=dist||Math.hypot(...sub(B[1],B[0]))*1.6; // dist: keep the camera this far away (a zoomed view keeps the full view's distance, so perspective does not distort)
    this.eye=add(c,[r*Math.cos(phi)*Math.sin(theta),r*Math.sin(phi),r*Math.cos(phi)*Math.cos(theta)]);
    this.fw=nrm(sub(c,this.eye));this.rt=nrm(cross(this.fw,[0,1,0]));this.up=cross(this.rt,this.fw);
    let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(let i=0;i<8;i++){const p=[B[i&1?1:0][0],B[i&2?1:0][1],B[i&4?1:0][2]],v=sub(p,this.eye),z=dot(v,this.fw),x=dot(v,this.rt)/z,y=dot(v,this.up)/z;
      x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y)}
    m=m||[18,18,18,18];const aw=this.W-m[1]-m[3],ah=this.H-m[0]-m[2];const s=Math.min(aw/(x1-x0),ah/(y1-y0));
    this.s=s;this.ox=m[3]+(aw-s*(x1-x0))/2-s*x0;this.oy=m[0]+(ah-s*(y1-y0))/2+s*y1};
  R3.prototype.p=function(p){const v=sub(p,this.eye),z=dot(v,this.fw);return [this.ox+this.s*dot(v,this.rt)/z,this.oy-this.s*dot(v,this.up)/z,z]};
  R3.prototype.px=function(p,r){return this.s*r/dot(sub(p,this.eye),this.fw)}; // world length r at p, in pixels
  R3.prototype.begin=function(P,t){this.P=P;this.t=t||0;this.moving=false;this.q=[];this.top=[];this.under=[];this.lab=[]};
  const col=(P,c)=>Array.isArray(c)?c:(c&&P[c])||rgb(c||'#888');
  // a box: c is the centre of its bottom face, s = [w,h,d]; o.fill (rgb or palette key), o.a alpha, o.edge false to drop the ink
  R3.prototype.box=function(c,s,o){o=o||{};const a=o.a==null?1:o.a;if(a<=.01)return;const P=this.P,x0=c[0]-s[0]/2,x1=c[0]+s[0]/2,y0=c[1],y1=c[1]+s[1],z0=c[2]-s[2]/2,z1=c[2]+s[2]/2;
    const C=[];for(let i=0;i<8;i++)C.push([i&1?x1:x0,i&2?y1:y0,i&4?z1:z0]);
    const F=[[[1,3,7,5],[1,0,0]],[[0,4,6,2],[-1,0,0]],[[2,6,7,3],[0,1,0]],[[0,1,5,4],[0,-1,0]],[[4,5,7,6],[0,0,1]],[[0,2,3,1],[0,0,-1]]];
    const base=col(P,o.fill||P.paper),edge=o.edge===false?null:col(P,o.ec||P.edge),me=this;const faces=[];
    F.forEach(([ix,n])=>{const fc=mul(ix.reduce((s,i)=>add(s,C[i]),[0,0,0]),.25);if(dot(n,sub(me.eye,fc))<=0)return;
      const lam=Math.max(0,dot(n,L)),k=P.dark?.66+.34*lam:.86+.14*lam;faces.push({pts:ix.map(i=>me.p(C[i])),f:css(mix([0,0,0],base,k))})});
    const z=this.p([c[0],c[1]+s[1]/2,c[2]])[2]+(o.dz||0),lw=o.lw||.9,ea=o.ea==null?(P.dark?.7:.78):o.ea,fa=o.fa==null?1:o.fa;
    // a soft contact shadow under anything standing on the floor (o.shadow false to drop it)
    if(o.shadow!==false&&c[1]<.05&&a>.2){const g=.06,ft=[[x0-g,0,z0-g],[x1+g,0,z0-g],[x1+g,0,z1+g],[x0-g,0,z1+g]].map(p=>me.p(p));
      this.under.push(cx=>{cx.save();cx.globalAlpha=a*(P.dark?.5:.32);cx.fillStyle='rgba(20,30,45,.18)';cx.shadowColor='rgba(20,30,45,.35)';cx.shadowBlur=10;cx.beginPath();ft.forEach((p,i)=>i?cx.lineTo(p[0],p[1]):cx.moveTo(p[0],p[1]));cx.closePath();cx.fill();cx.restore()})}
    this.q.push({z,f:cx=>{faces.forEach(fc=>{cx.globalAlpha=a*fa;cx.beginPath();fc.pts.forEach((p,i)=>i?cx.lineTo(p[0],p[1]):cx.moveTo(p[0],p[1]));cx.closePath();cx.fillStyle=fc.f;cx.fill();
      if(edge){cx.globalAlpha=a*ea;cx.strokeStyle=css(edge);cx.lineWidth=lw;cx.lineJoin='round';cx.stroke()}})}})};
  // a glass plate (a weight matrix): corner o0 and edge vectors u and v; tinted, see-through, with a grid of nu x nv cells and a thin rim
  R3.prototype.glass=function(o0,u,v,o){o=o||{};const a=o.a==null?1:o.a;if(a<=.01)return;const P=this.P,c=col(P,o.c||P.c1),me=this;
    const n=nrm(cross(u,v)),th=mul(n,o.th==null?.05:o.th),cr=[o0,add(o0,u),add(add(o0,u),v),add(o0,v)],back=cr.map(p=>add(p,th));
    const pp=cr.map(p=>me.p(p)),pb=back.map(p=>me.p(p)),z=pp.reduce((s,p)=>s+p[2],0)/4+(o.dz||0),nu=o.nu||8,nv=o.nv||8,gl=[];
    for(let i=1;i<nu;i++){gl.push([me.p(add(o0,mul(u,i/nu))),me.p(add(add(o0,mul(u,i/nu)),v))])}for(let j=1;j<nv;j++){gl.push([me.p(add(o0,mul(v,j/nv))),me.p(add(add(o0,mul(v,j/nv)),u))])}
    const poly=(cx,q)=>{cx.beginPath();q.forEach((p,i)=>i?cx.lineTo(p[0],p[1]):cx.moveTo(p[0],p[1]));cx.closePath()};
    this.q.push({z,f:cx=>{cx.globalAlpha=a*(P.dark?.32:.26);cx.fillStyle=css(c);poly(cx,pb);cx.fill();poly(cx,pp);cx.fill();
      cx.globalAlpha=a*.45;cx.strokeStyle=css(c);cx.lineWidth=.8;cx.beginPath();gl.forEach(([p,q])=>{cx.moveTo(p[0],p[1]);cx.lineTo(q[0],q[1])});cx.stroke();
      cx.globalAlpha=a*.9;cx.strokeStyle=css(P.dark?mix(c,[255,255,255],.3):mix(c,[0,0,0],.35));cx.lineWidth=1.1;poly(cx,pp);cx.stroke();cx.globalAlpha=a*.5;poly(cx,pb);cx.stroke();
      cx.beginPath();for(let i=0;i<4;i++){cx.moveTo(pp[i][0],pp[i][1]);cx.lineTo(pb[i][0],pb[i][1])}cx.stroke()}})};
  // a stream of glowing dots moving along a path (data flowing from one thing into another); it keeps moving while the stage is on screen.
  // o.c colour, o.n dots, o.r size (world units), o.speed (world units a second), o.a alpha. Under reduced motion the dots stand still.
  R3.prototype.flow=function(pts,o){o=o||{};const a=o.a==null?1:o.a;if(a<=.01||pts.length<2)return;const seg=[];let L0=0;
    for(let i=1;i<pts.length;i++){const d=Math.hypot(...sub(pts[i],pts[i-1]));seg.push(d);L0+=d}if(L0<=0)return;
    const n=o.n||Math.max(3,Math.round(L0*2.2)),sp=o.speed||1.1,ph=RM?0:(this.t*sp/L0)%1,r=o.r||.07;if(!RM)this.moving=true;
    for(let i=0;i<n;i++){let u=(ph+i/n)%1,d=u*L0,j=0;while(j<seg.length-1&&d>seg[j]){d-=seg[j];j++}const p=lerp3(pts[j],pts[j+1],Math.min(1,d/seg[j]));
      const fade=Math.sin(Math.PI*u);this.glow(p,r*3.2,{c:o.c,a:a*.55*fade,top:o.top});this.ball(p,r*.55,{c:o.c,a:a*.9*fade,top:o.top})}};
  R3.prototype.flowArc=function(a,b,h,o){const pts=[];for(let i=0;i<=24;i++)pts.push(this.arcPt(a,b,h,i/24));this.flow(pts,o)};
  // a flat quad (a plate, a matrix face, a floor patch)
  R3.prototype.quad=function(pts,o){o=o||{};const a=o.a==null?1:o.a;if(a<=.01)return;const P=this.P,pp=pts.map(p=>this.p(p)),z=pp.reduce((s,p)=>s+p[2],0)/pp.length+(o.dz||0);
    const f=o.fill?css(col(P,o.fill)):null,e=o.edge===false?null:css(col(P,o.ec||P.edge));
    this.q.push({z,f:cx=>{cx.globalAlpha=a*(o.fa==null?1:o.fa);cx.beginPath();pp.forEach((p,i)=>i?cx.lineTo(p[0],p[1]):cx.moveTo(p[0],p[1]));cx.closePath();if(f){cx.fillStyle=f;cx.fill()}
      if(e){cx.globalAlpha=a*(o.ea==null?.8:o.ea);cx.strokeStyle=e;cx.lineWidth=o.lw||1;if(o.dash)cx.setLineDash(o.dash);cx.stroke();cx.setLineDash([])}}})};
  // a polyline in 3D; o.w is its width in pixels, o.top draws it above everything sorted
  R3.prototype.line=function(pts,o){o=o||{};const a=o.a==null?1:o.a;if(a<=.01)return;const P=this.P,pp=pts.map(p=>this.p(p)),z=pp.reduce((s,p)=>s+p[2],0)/pp.length+(o.dz||0);
    const d={z,f:cx=>{cx.globalAlpha=a;cx.strokeStyle=css(col(P,o.c||P.ink));cx.lineWidth=o.w||1.4;cx.lineCap='round';cx.lineJoin='round';if(o.dash)cx.setLineDash(o.dash);
      cx.beginPath();pp.forEach((p,i)=>i?cx.lineTo(p[0],p[1]):cx.moveTo(p[0],p[1]));cx.stroke();cx.setLineDash([]);
      if(o.head){const n=pp.length,p1=pp[n-1],p0=pp[n-2],an=Math.atan2(p1[1]-p0[1],p1[0]-p0[0]),hl=o.head;cx.fillStyle=cx.strokeStyle;cx.beginPath();cx.moveTo(p1[0],p1[1]);
        cx.lineTo(p1[0]-hl*Math.cos(an-.45),p1[1]-hl*Math.sin(an-.45));cx.lineTo(p1[0]-hl*Math.cos(an+.45),p1[1]-hl*Math.sin(an+.45));cx.closePath();cx.fill()}}};
    (o.top?this.top:this.q).push(d)};
  // a curve from a to b bowing up by h; t in (0,1] draws only its first part (an arc being drawn)
  R3.prototype.arc=function(a,b,h,o){o=o||{};const n=28,t=o.t==null?1:o.t,pts=[];for(let i=0;i<=n;i++){const u=i/n*t,m=lerp3(a,b,u);pts.push([m[0],m[1]+4*h*u*(1-u),m[2]])}this.line(pts,o)};
  R3.prototype.arcPt=(a,b,h,u)=>{const m=lerp3(a,b,u);return [m[0],m[1]+4*h*u*(1-u),m[2]]};
  // a soft glow (a radial gradient), r in world units
  R3.prototype.glow=function(p,r,o){o=o||{};const a=o.a==null?1:o.a;if(a<=.01)return;const P=this.P,q=this.p(p),rp=Math.max(2,this.px(p,r)),c=col(P,o.c||P.c2);
    (o.top?this.top:this.q).push({z:q[2]-(o.lift||.01),f:cx=>{const gr=cx.createRadialGradient(q[0],q[1],0,q[0],q[1],rp);gr.addColorStop(0,'rgba('+c.map(Math.round).join(',')+','+(.75*a)+')');
      gr.addColorStop(.35,'rgba('+c.map(Math.round).join(',')+','+(.35*a)+')');gr.addColorStop(1,'rgba('+c.map(Math.round).join(',')+',0)');cx.globalAlpha=1;cx.fillStyle=gr;cx.beginPath();cx.arc(q[0],q[1],rp,0,7);cx.fill()}})};
  // a solid ball, r in world units
  R3.prototype.ball=function(p,r,o){o=o||{};const a=o.a==null?1:o.a;if(a<=.01)return;const P=this.P,q=this.p(p),rp=Math.max(2,this.px(p,r)),c=col(P,o.c||P.c2);
    (o.top?this.top:this.q).push({z:q[2],f:cx=>{const gr=cx.createRadialGradient(q[0]-rp*.35,q[1]-rp*.35,rp*.1,q[0],q[1],rp);gr.addColorStop(0,css(mix(c,[255,255,255],.45)));gr.addColorStop(1,css(c));
      cx.globalAlpha=a;cx.fillStyle=gr;cx.beginPath();cx.arc(q[0],q[1],rp,0,7);cx.fill()}})};
  // an upright label at a 3D point; o.al 'center'|'left'|'right', o.dx/o.dy pixels, o.fs size (12 or more), o.mono, o.serif, o.b bold;
  // labels sharing o.grp are pushed apart vertically and get a leader line back to their anchor when moved
  R3.prototype.label=function(p,text,o){o=o||{};const a=o.a==null?1:o.a;if(a<=.01||text==null)return;if((o.grp||o.wide)&&this.W<520)return; // side labels: wide screens only; the step text names the parts on a phone
   const q=this.p(p);
    this.lab.push({x:q[0]+(o.dx||0),y:q[1]+(o.dy||0),ax:q[0],ay:q[1],text,o,a})};
  function drawLabel(cx,P,L){const o=L.o,fs=Math.max(12,o.fs||12.5);cx.font=(o.b?'600 ':'')+fs+'px '+(o.mono?'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace':o.serif?'"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif':'ui-sans-serif,-apple-system,"Segoe UI",Helvetica,Arial,sans-serif');
    cx.textAlign=o.al||'center';cx.textBaseline='middle';cx.globalAlpha=L.a;
    const tw=cx.measureText(L.text).width;L.y=cl(L.y,fs/2+2,(cx.canvas.clientHeight||9999)-fs/2-2);{const lft=o.al==='right'?L.x-tw:o.al==='left'?L.x:L.x-tw/2,W=cx.canvas.clientWidth||9999;if(lft<4){L.x+=4-lft}else if(lft+tw>W-4){L.x-=lft+tw-W+4}}
    // a leader line only when the label was pushed away from its anchor, and only from the anchor to the label's nearest edge (never through the text)
    {const x0=o.al==='right'?L.x-tw:o.al==='left'?L.x:L.x-tw/2,x1=x0+tw,inside=L.ax>=x0-2&&L.ax<=x1+2&&Math.abs(L.ay-L.y)<8;if(inside)L.lead=false;const over=L.ax>=x0-2&&L.ax<=x1+2;
      L.ex=over?cl(L.ax,x0,x1):L.ax<x0?x0-3:x1+3;L.ey=L.y+(over?(L.ay<L.y?-1:1)*(fs/2+2):0)}
    if(L.lead){cx.strokeStyle=css(col(P,o.c||P.mute));cx.globalAlpha=L.a*.6;cx.lineWidth=1;cx.beginPath();cx.moveTo(L.ax,L.ay);cx.lineTo(L.ex,L.ey);cx.stroke();cx.globalAlpha=L.a}
    if(o.halo!==false){cx.lineWidth=4;cx.lineJoin='round';cx.strokeStyle=css(P.card);cx.strokeText(L.text,L.x,L.y)}cx.fillStyle=css(col(P,o.c||P.ink));cx.fillText(L.text,L.x,L.y)}
  function spread(labs){const G={};labs.forEach(L=>{if(L.o.grp)(G[L.o.grp]=G[L.o.grp]||[]).push(L)});
    Object.values(G).forEach(ls=>{ls.sort((a,b)=>a.y-b.y);const gap=Math.max(12,ls[0].o.fs||12.5)+5;
      for(let it=0;it<30;it++){let moved=false;for(let i=1;i<ls.length;i++){const d=ls[i].y-ls[i-1].y;if(d<gap){const m=(gap-d)/2;ls[i].y+=m;ls[i-1].y-=m;moved=true}}if(!moved)break}
      ls.forEach(L=>{if(Math.abs(L.y-(L.ay+(L.o.dy||0)))>2)L.lead=true})})}
  // the floor grid
  // the floor grid, fading out towards its edges so the floor has no hard border
  R3.prototype.grid=function(x0,x1,z0,z1,st,y){y=y||0;const P=this.P,me=this,cxw=(x0+x1)/2,czw=(z0+z1)/2,hx=(x1-x0)/2,hz=(z1-z0)/2,segs=[];
    const fadeAt=(x,z)=>Math.max(0,1-Math.pow(Math.max(Math.abs(x-cxw)/hx,Math.abs(z-czw)/hz),3));
    const add2=(a,b)=>{for(let i=0;i<10;i++){const p=lerp3(a,b,i/10),q=lerp3(a,b,(i+1)/10),m=lerp3(p,q,.5),f=fadeAt(m[0],m[2]);if(f>.02)segs.push([me.p(p),me.p(q),f])}};
    for(let x=x0;x<=x1+1e-6;x+=st)add2([x,y,z0],[x,y,z1]);for(let z=z0;z<=z1+1e-6;z+=st)add2([x0,y,z],[x1,y,z]);
    this.under.push(cx=>{cx.strokeStyle=css(P.dark?mix(P.card,P.ink,.16):mix(P.card,P.ink,.12));cx.lineWidth=1;segs.forEach(([p,q,f])=>{cx.globalAlpha=f;cx.beginPath();cx.moveTo(p[0],p[1]);cx.lineTo(q[0],q[1]);cx.stroke()});cx.globalAlpha=1})};
  R3.prototype.end=function(){const cx=this.cx;cx.clearRect(0,0,this.W,this.H);this.under.forEach(f=>f(cx));this.q.sort((a,b)=>b.z-a.z).forEach(d=>d.f(cx));this.top.forEach(d=>d.f(cx));spread(this.lab);this.lab.forEach(L=>drawLabel(cx,this.P,L));cx.globalAlpha=1};
  // ---- the stage: a sticky card with the canvas and its controls, driven by a step list in the prose ----
  const stages=[];
  function stage(o){const host=$(o.id);if(!host)return null;
    host.classList.add('stg');host.innerHTML='<div class="stg-top"><span>'+(o.fig||'')+'</span><span class="stg-st" aria-live="polite"></span></div><div class="stg-cv"><canvas aria-hidden="true"></canvas><button class="stg-rv" id="'+o.id+'-v" hidden title="Reset the view">Reset view</button><span class="stg-hint">drag to turn</span></div>'+
      '<div class="stg-bar an-ctl"><button class="stg-b" id="'+o.id+'-b" aria-label="Previous step" title="Previous step">&#9664;&#9664;</button><button class="stg-p an-play" id="'+o.id+'-p" aria-label="Play">&#9654; Play</button><button class="stg-f" id="'+o.id+'-f" aria-label="Next step" title="Next step">&#9654;&#9654;</button>'+
      '<input type="range" class="stg-r" id="'+o.id+'-r" min="0" max="1" value="0" step="1" aria-label="Scrub through the steps"><select class="stg-s" id="'+o.id+'-s" aria-label="Speed"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select></div>';
    const q=s=>host.querySelector(s),cvs=q('canvas'),R=new R3(cvs);
    const st={vis:false,k:0,pk:0,e:1,play:false,hold:0,raf:0,last:0,lastFlow:0,flow:false,dth:0,dph:0,moved:false,spd:1,list:null,n:1};
    const ov=$(o.list);
    function bindList(el){st.list=el;const lis=el?[...el.children]:[];st.n=Math.max(1,lis.length);q('.stg-r').max=st.n-1;
      lis.forEach((li,i)=>{li.tabIndex=0;li.setAttribute('role','button');li.onclick=()=>{st.user=true;pause();go(i,false)};li.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();st.user=true;pause();go(i,false)}}})}
    function visible(){return host.offsetParent!==null&&cvs.clientWidth>0}
    // on wide screens the card's height follows the scene's shape (o.aspect = height / width of the drawing area), capped by the window
    function fitH(){if(!o.aspect||innerWidth<1100){host.style.height='';return}const w=host.clientWidth;if(!w)return;host.style.height=Math.round(Math.min(innerHeight-80,660,w*o.aspect+92))+'px'}
    // the camera for a step: o.view(k) -> {cam:[theta,phi], bounds} when the scene moves its camera between steps, else o.cam and o.bounds;
    // between two steps it glides from the last step's view to this one's, plus whatever the reader dragged
    function viewAt(k){const v=o.view?o.view(k):null,B=(v&&v.bounds)||(typeof o.bounds==='function'?o.bounds(st):o.bounds),B0=typeof o.bounds==='function'?o.bounds(st):o.bounds;
      return {cam:(v&&v.cam)||o.cam,B,r:Math.hypot(...sub(B0[1],B0[0]))*1.6}}
    function draw(){if(!visible())return;fitH();const w=cvs.clientWidth,h=cvs.clientHeight;if(!w||!h)return;R.size(w,h);PAL=PAL||pal();R.begin(PAL,performance.now()/1000);host.dataset.draws=(+host.dataset.draws||0)+1;
      const e=RM?1:ease(st.e),a=st.from||viewAt(st.pk),b=viewAt(st.k),t=st.e>=1||!o.view?1:e,mx=(u,v)=>u.map((x,i)=>lerp(x,v[i],t));
      // the view drawn now (so a click mid-glide continues from here instead of jumping)
      st.cur={cam:[lerp(a.cam[0],b.cam[0],t),lerp(a.cam[1],b.cam[1],t)],B:[mx(a.B[0],b.B[0]),mx(a.B[1],b.B[1])],r:lerp(a.r,b.r,t)};
      R.camera(lerp(a.cam[0],b.cam[0],t)+st.dth,cl(lerp(a.cam[1],b.cam[1],t)+st.dph,.08,1.4),[mx(a.B[0],b.B[0]),mx(a.B[1],b.B[1])],typeof o.margin==='function'?o.margin(w,h):o.margin,lerp(a.r,b.r,t));
      try{o.draw(R,st.k,e,st)}catch(err){console.error(err)}R.end();st.flow=R.moving&&!RM}
    function ui(){q('.stg-st').textContent='step '+(st.k+1)+' of '+st.n;q('.stg-r').value=st.k;const p=q('.stg-p');p.innerHTML=st.play?'&#10073;&#10073; Pause':'&#9654; Play';p.setAttribute('aria-label',st.play?'Pause':'Play');
      if(st.list)[...st.list.children].forEach((li,i)=>{li.classList.toggle('on',i===st.k);li.classList.toggle('done',i<st.k);if(i===st.k)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current')});if(o.onStep)o.onStep(st.k,st)}
    function go(k,anim){st.from=st.e<1&&st.cur?st.cur:null;st.pk=st.k;st.k=cl(k,0,st.n-1);st.e=anim&&!RM?0:1;st.hold=0;ui();draw();kick()}
    function tick(now){st.raf=0;if(!visible()||!st.vis){st.last=0;return} // off screen: keep play and the hold, resume on return
     const dt=st.last?Math.min(80,now-st.last):16;st.last=now;
      if(st.e<1){st.e=Math.min(1,st.e+dt*st.spd/(o.dur||1300));host.dataset.frames=(+host.dataset.frames||0)+1;draw()}
      else{if(st.flow&&now-st.lastFlow>30){st.lastFlow=now;draw()} // flowing dots keep moving at about 30 frames a second
        if(st.play){st.hold+=dt*st.spd;if(st.hold>(o.hold||4200)){if(st.k<st.n-1)go(st.k+1,true);else{st.play=false;st.ended=true;ui()}}}}
      kick()}
    function kick(){const on=st.e<1||st.play||st.flow;if(on&&st.vis&&!st.raf){st.raf=requestAnimationFrame(tick)}if(!on)st.last=0}
    function pause(){if(st.play){st.play=false;ui()}}
    q('.stg-p').onclick=()=>{st.user=true;if(st.play){pause();return}st.play=true;if(st.k>=st.n-1)go(0,false);else if(st.e>=1)go(st.k+1,true);ui();kick()};
    q('.stg-f').onclick=()=>{st.user=true;pause();go(st.k+1,true)};q('.stg-b').onclick=()=>{st.user=true;pause();go(st.k-1,false)};
    q('.stg-r').oninput=e=>{const v=+e.target.value;st.user=true;pause();go(v,false)};q('.stg-s').onchange=e=>{st.spd=+e.target.value};
    // drag to turn the model; vertical touch drags still scroll the page (touch-action: pan-y)
    let drag=null;cvs.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,t:st.dth,p:st.dph};cvs.setPointerCapture(e.pointerId);cvs.classList.add('dr')});
    cvs.addEventListener('pointermove',e=>{if(!drag)return;st.dth=drag.t-(e.clientX-drag.x)*.008;if(e.pointerType==='mouse')st.dph=cl(drag.p+(e.clientY-drag.y)*.006,-1.2,1.2);st.moved=true;q('.stg-rv').hidden=false;q('.stg-hint').hidden=true;draw()});
    const up=()=>{drag=null;cvs.classList.remove('dr')};cvs.addEventListener('pointerup',up);cvs.addEventListener('pointercancel',up);
    q('.stg-rv').onclick=()=>{st.dth=0;st.dph=0;st.moved=false;q('.stg-rv').hidden=true;draw()};
    // autoplay (2026-11-06): a stage plays its steps by itself once it is well in view, from where it stands; leaving pauses it, coming back resumes.
    // It stops for good once the reader takes a control (a step, back, forward, the scrubber, play or pause), after it has reached its last step, and never under reduced motion.
    function auto(){if(RM||st.user||st.ended||st.play||!visible())return;st.play=true;if(!st.started)go(0,true);st.started=true;ui();kick()}
    // in view: at least half of it, or half the window's height for a stage taller than the window
    if('IntersectionObserver' in window)new IntersectionObserver(es=>es.forEach(x=>{st.vis=x.isIntersecting&&(x.intersectionRatio>=.5||x.intersectionRect.height>=innerHeight*.5);if(st.vis){draw();auto()}kick()}),{threshold:[0,.25,.5,.75]}).observe(host);else st.vis=true;
    if('ResizeObserver' in window)new ResizeObserver(()=>requestAnimationFrame(()=>draw())).observe(cvs);
    bindList(ov);
    const api={draw,go,pause,st,R,host,
      list(id){pause();bindList($(id));go(0,false);st.ended=false;st.user=false;st.started=false;auto()},
      reset(){pause();go(0,false)}};
    stages.push(api);ui();return api}
  {const mq=matchMedia('(prefers-color-scheme: dark)'),f=()=>{PAL=null;stages.forEach(s=>s.draw())};(mq.addEventListener?mq.addEventListener.bind(mq,'change'):mq.addListener.bind(mq))(f)}
  // redraw when any tab opens (a hidden tab has no width)
  g.TAB_RENDER=g.TAB_RENDER||{};document.querySelectorAll('.tab[id]').forEach(t=>(g.TAB_RENDER[t.id]=g.TAB_RENDER[t.id]||[]).push(()=>{PAL=null;setTimeout(()=>stages.forEach(s=>s.draw()),0)}));
  g.S3={stage,ease,lerp,lerp3,cl,add,sub,mul,rgb,mix,RM,
    // how far a thing that appears at step s has arrived: 0 before, e during, 1 after
    at:(k,e,s)=>k>s?1:k===s?e:0,
    // the same, for something that leaves at step s
    off:(k,e,s)=>k>s?0:k===s?1-e:1};
})(window);
