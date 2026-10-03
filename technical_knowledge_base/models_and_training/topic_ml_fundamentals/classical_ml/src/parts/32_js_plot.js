// ---- PL: small canvas helpers shared by every visual on this page ----
window.PL=(function(){
  const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim()||'#888';
  function hex(c){c=c.trim();if(c[0]==='#'){if(c.length===4)c='#'+c[1]+c[1]+c[2]+c[2]+c[3]+c[3];return [parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)]}
    const m=c.match(/\d+(\.\d+)?/g);return m?m.slice(0,3).map(Number):[128,128,128]}
  // make (or reuse) a canvas inside el with css width w and height h; returns ctx in css pixels
  function cv(el,w,h){let c=el.querySelector('canvas');if(!c){c=document.createElement('canvas');el.appendChild(c)}
    const r=Math.min(2,window.devicePixelRatio||1);c.width=Math.round(w*r);c.height=Math.round(h*r);c.style.width=w+'px';c.style.height=h+'px';
    const x=c.getContext('2d');x.setTransform(r,0,0,r,0,0);x.clearRect(0,0,w,h);return x}
  // linear frame: data box [x0,x1]x[y0,y1] to pixel box with padding
  function frame(b,w,h,pad){pad=pad||{l:8,r:8,t:8,b:8};const W=w-pad.l-pad.r,H=h-pad.t-pad.b;
    return {X:v=>pad.l+(v-b[0])/(b[1]-b[0])*W,Y:v=>pad.t+(1-(v-b[2])/(b[3]-b[2]))*H,iX:p=>b[0]+(p-pad.l)/W*(b[1]-b[0]),iY:p=>b[2]+(1-(p-pad.t)/H)*(b[3]-b[2]),pad,W,H,b}}
  function bounds(pts,m){let x0=Infinity,x1=-Infinity,y0=Infinity,y1=-Infinity;pts.forEach(p=>{x0=Math.min(x0,p[0]);x1=Math.max(x1,p[0]);y0=Math.min(y0,p[1]);y1=Math.max(y1,p[1])});m=m==null?0.5:m;return [Math.floor(x0-m),Math.ceil(x1+m),Math.floor(y0-m),Math.ceil(y1+m)]}
  // heat map of g(x,y) in [0,1] (probability of class 1) on an n x n grid; colours mix class 0 and class 1
  function heat(ctx,F,g,n,alpha){const c0=hex(css('--c2')),c1=hex(css('--c1')),bg=hex(css('--bg'));const dx=(F.b[1]-F.b[0])/n,dy=(F.b[3]-F.b[2])/n;
    for(let i=0;i<n;i++)for(let j=0;j<n;j++){const x=F.b[0]+(i+0.5)*dx,y=F.b[2]+(j+0.5)*dy,p=g(x,y);const t=Math.abs(p-0.5)*2,a=(alpha||0.55)*Math.min(1,0.25+0.75*t),c=p>=0.5?c1:c0;
      const r=Math.round(bg[0]+(c[0]-bg[0])*a),gg=Math.round(bg[1]+(c[1]-bg[1])*a),b=Math.round(bg[2]+(c[2]-bg[2])*a);
      ctx.fillStyle='rgb('+r+','+gg+','+b+')';const px=F.X(F.b[0]+i*dx),py=F.Y(F.b[2]+(j+1)*dy);ctx.fillRect(Math.floor(px),Math.floor(py),Math.ceil(F.X(F.b[0]+(i+1)*dx)-px)+1,Math.ceil(F.Y(F.b[2]+j*dy)-py)+1)}}
  // contour of g = level by marching squares on an n x n grid of samples
  function contour(ctx,F,g,n,level,style,dash){const dx=(F.b[1]-F.b[0])/n,dy=(F.b[3]-F.b[2])/n,V=[];
    for(let i=0;i<=n;i++){V.push([]);for(let j=0;j<=n;j++)V[i].push(g(F.b[0]+i*dx,F.b[2]+j*dy)-level)}
    ctx.save();ctx.strokeStyle=style;ctx.lineWidth=1.6;if(dash)ctx.setLineDash(dash);ctx.beginPath();
    const P=(i,j)=>[F.X(F.b[0]+i*dx),F.Y(F.b[2]+j*dy)];
    const L=(a,b,va,vb)=>{const t=va/(va-vb);return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]};
    for(let i=0;i<n;i++)for(let j=0;j<n;j++){const v=[V[i][j],V[i+1][j],V[i+1][j+1],V[i][j+1]],p=[P(i,j),P(i+1,j),P(i+1,j+1),P(i,j+1)],e=[];
      for(let k=0;k<4;k++){const a=k,b=(k+1)%4;if((v[a]>0)!==(v[b]>0))e.push(L(p[a],p[b],v[a],v[b]))}
      if(e.length>=2){ctx.moveTo(e[0][0],e[0][1]);ctx.lineTo(e[1][0],e[1][1])}if(e.length===4){ctx.moveTo(e[2][0],e[2][1]);ctx.lineTo(e[3][0],e[3][1])}}
    ctx.stroke();ctx.restore()}
  function dot(ctx,x,y,r,fill,stroke,lw){ctx.beginPath();ctx.arc(x,y,r,0,7);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw||1;ctx.stroke()}}
  function text(ctx,s,x,y,o){o=o||{};ctx.fillStyle=o.c||css('--mute');ctx.font=(o.b?'600 ':'')+(o.s||11)+'px ui-sans-serif,-apple-system,Segoe UI,Helvetica,Arial,sans-serif';ctx.textAlign=o.a||'left';ctx.textBaseline=o.bl||'alphabetic';ctx.fillText(s,x,y)}
  function axes(ctx,F,o){o=o||{};ctx.save();ctx.strokeStyle=css('--line');ctx.lineWidth=1;ctx.strokeRect(F.pad.l,F.pad.t,F.W,F.H);
    (o.xt||[]).forEach(t=>{const x=F.X(t);ctx.beginPath();ctx.moveTo(x,F.pad.t+F.H);ctx.lineTo(x,F.pad.t+F.H+4);ctx.stroke();text(ctx,o.xf?o.xf(t):String(t),x,F.pad.t+F.H+15,{a:'center'})});
    (o.yt||[]).forEach(t=>{const y=F.Y(t);ctx.beginPath();ctx.moveTo(F.pad.l-4,y);ctx.lineTo(F.pad.l,y);ctx.stroke();text(ctx,o.yf?o.yf(t):String(t),F.pad.l-6,y+3,{a:'right'})});
    if(o.xl)text(ctx,o.xl,F.pad.l+F.W/2,F.pad.t+F.H+30,{a:'center'});
    if(o.yl){ctx.translate(11,F.pad.t+F.H/2);ctx.rotate(-Math.PI/2);text(ctx,o.yl,0,0,{a:'center'})}
    ctx.restore()}
  // labelled points: train filled, test hollow; y in {0,1}
  function points(ctx,F,X,y,o){o=o||{};const c=[css('--c2'),css('--c1')],ink=css('--ink');X.forEach((p,i)=>{const r=o.r||3.2;
    if(o.hollow)dot(ctx,F.X(p[0]),F.Y(p[1]),r,css('--bg'),c[y[i]],1.6);else dot(ctx,F.X(p[0]),F.Y(p[1]),r,c[y[i]],ink,0.6)})}
  return {css,hex,cv,frame,bounds,heat,contour,dot,text,axes,points};
})();
