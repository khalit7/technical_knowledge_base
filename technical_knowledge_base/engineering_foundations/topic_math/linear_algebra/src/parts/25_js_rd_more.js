// ---- Reading: static figures added on 2026-10-24 (hero SVD, broadcasting, rank 1, least squares, power iteration, PD ellipse, conditioning, Newton-Schulz) ----
// Every number is computed here from the same inputs as src/recompute.py (A, W, the least-squares points, B, the Newton-Schulz map).
(function(){
  const $=id=>document.getElementById(id);if(!$('rd-hero'))return;
  const arrow=RDF.arrow,T=RD.t,F=(v,d)=>(Math.abs(v)<5e-13?0:v).toFixed(d);
  const ln=(x1,y1,x2,y2,col,o)=>{o=o||{};return '<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" stroke="'+col+'" stroke-width="'+(o.w||1)+'"'+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+(o.op?' stroke-opacity="'+o.op+'"':'')+'/>'};
  const dot=(x,y,col,r)=>'<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+(r||4)+'" fill="'+col+'"/>';
  const mv=(M,p)=>[M[0][0]*p[0]+M[0][1]*p[1],M[1][0]*p[0]+M[1][1]*p[1]];
  const curve=(f,X,Y,n)=>{let d='';for(let i=0;i<=n;i++){const p=f(i/n*2*Math.PI);d+=(i?'L':'M')+X(p[0]).toFixed(1)+' '+Y(p[1]).toFixed(1)}return d};
  // panel helper: a square-ish box with equal x and y scale centred on (cx0, cy0) data coordinates
  function panel(ox,oy,pw,ph,R,c){const sc=Math.min(pw,ph-20)/(2*R),cx=ox+pw/2-(c?c[0]*sc:0),cy=oy+20+(ph-20)/2+(c?c[1]*sc:0);return {sc,X:v=>cx+v*sc,Y:v=>cy-v*sc}}
  // ---------- hero: A = U Sigma V^T in four panels ----------
  function hero(){const el=$('rd-hero'),W=Math.min(RD.width(el),900),four=W>=640,pw=four?W/4:W/2,ph=Math.round(Math.min(pw*1.02,240)),H=four?ph:2*ph;
    const A=[[3,0],[4,5]],r2=Math.SQRT1_2,v1=[r2,r2],v2=[-r2,r2],s=[Math.sqrt(45),Math.sqrt(5)];
    const Vt=[[v1[0],v1[1]],[v2[0],v2[1]]],SVt=[[s[0]*Vt[0][0],s[0]*Vt[0][1]],[s[1]*Vt[1][0],s[1]*Vt[1][1]]];
    const stages=[[[1,0],[0,1]],Vt,SVt,A],R=[1.45,1.45,7.4,8.6];
    const titles=[['1. Input','circle, v₁ ⟂ v₂'],['2. Vᵀ: rotate −45°','v₁, v₂ onto the axes'],['3. Σ: stretch','by σ₁ = 6.708, σ₂ = 2.236'],['4. U: rotate 71.57°','= A: rank 2, κ = 3']];
    let b='';
    stages.forEach((M,k)=>{const ox=four?k*pw:(k%2)*pw,oy=four?0:Math.floor(k/2)*ph,P=panel(ox,oy+14,pw,ph-14,R[k]),X=P.X,Y=P.Y;
      b+='<rect x="'+(ox+3)+'" y="'+(oy+3)+'" width="'+(pw-6)+'" height="'+(ph-6)+'" rx="8" fill="none" stroke="var(--line)"/>';
      b+=T(ox+pw/2,oy+17,titles[k][0],{a:'middle',fs:12,w:600})+T(ox+pw/2,oy+31,titles[k][1],{a:'middle',fs:11,fill:'var(--mute)'});
      b+=ln(X(-R[k]*0.95),Y(0),X(R[k]*0.95),Y(0),'var(--line)')+ln(X(0),Y(-R[k]*0.9),X(0),Y(R[k]*0.9),'var(--line)');
      if(k>=2)b+='<circle cx="'+X(0)+'" cy="'+Y(0)+'" r="'+P.sc+'" fill="none" stroke="var(--mute)" stroke-dasharray="3 3"/>';
      b+='<path d="'+curve(t=>mv(M,[Math.cos(t),Math.sin(t)]),X,Y,96)+'" fill="var(--c6)" fill-opacity=".12" stroke="var(--c6)" stroke-width="2"/>';
      const a=mv(M,v1),c=mv(M,v2);b+=arrow(X(0),Y(0),X(a[0]),Y(a[1]),'var(--c1)',2.4)+arrow(X(0),Y(0),X(c[0]),Y(c[1]),'var(--c2)',2.4);
      const la=k<2?['v₁','v₂']:k===2?['σ₁ = 6.708','σ₂ = 2.236']:['σ₁u₁','σ₂u₂'];
      const off=(p,q)=>{const n=Math.hypot(p[0],p[1])||1;return [p[0]/n*q,p[1]/n*q]};
      const pa=off(a,10),pc=off(c,10);
      if(k===2)b+=T(X(a[0])-2,Y(a[1])+17,la[0],{fs:11.5,w:600,fill:'var(--c1)',a:'end'});else b+=T(X(a[0])+pa[0],Y(a[1])-pa[1]+4,la[0],{fs:11.5,w:600,fill:'var(--c1)',a:a[0]>=0?'start':'end'});
      b+=T(X(c[0])+pc[0],Y(c[1])-pc[1]+4,la[1],{fs:11.5,w:600,fill:'var(--c2)',a:c[0]>0.05?'start':(c[0]<-0.05?'end':'middle')});
      if(k===2)b+=T(ox+pw/2,oy+ph-12,'dashed: unit circle, to scale',{a:'middle',fs:11,fill:'var(--mute)'});
      if(four&&k<3)b+=T(ox+pw-1,oy+ph/2+4,'→',{a:'middle',fs:14,fill:'var(--mute)'})});
    el.innerHTML=RD.svg(W,H,b,'A as rotate, stretch, rotate')}
  // ---------- broadcasting: (3,1) - (3,) ----------
  function bcast(){const el=$('rd-bc-svg'),W=Math.min(RD.width(el),560),c=Math.max(24,Math.min(36,W/13.5)),gap=c*0.75,H=Math.round(5*c+46);
    const p=[1,2,3],t=[1,2,3];let b='',x=4;const y0=10;
    const cell=(x,y,v,fill,stroke)=>'<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+(c-2)+'" height="'+(c-2)+'" rx="3" fill="'+fill+'" stroke="'+(stroke||'var(--line)')+'"/>'+T(x+c/2-1,y+c/2+4,v,{a:'middle',fs:13});
    // pred column
    p.forEach((v,i)=>{b+=cell(x,y0+(i+1)*c,String(v),'var(--soft)')});const xp=x+c/2;x+=c+gap*0.4;
    b+=T(x+gap*0.3,y0+2.6*c,'−',{a:'middle',fs:18});x+=gap;
    t.forEach((v,j)=>{b+=cell(x+j*c,y0+2*c,String(v),'var(--soft)')});const xt=x+1.5*c;x+=3*c+gap*0.4;
    b+=T(x+gap*0.3,y0+2.6*c,'=',{a:'middle',fs:18});x+=gap;
    for(let i=0;i<3;i++)for(let j=0;j<3;j++){const v=p[i]-t[j];b+=cell(x+j*c,y0+(i+1)*c,String(v),i===j?'color-mix(in srgb,var(--c3) 30%,transparent)':'color-mix(in srgb,var(--c2) 22%,transparent)')}
    const xr=x+1.5*c,yl=y0+4*c+16;
    b+=T(xp,yl,'pred',{a:'middle',fs:11.5,w:600})+T(xp,yl+14,'(3, 1)',{a:'middle',fs:11,fill:'var(--mute)'});
    b+=T(xt,yl,'target (3,)',{a:'middle',fs:11.5,w:600})+T(xt,yl+14,'read as (1, 3)',{a:'middle',fs:11,fill:'var(--mute)'});
    b+=T(xr,yl,'result (3, 3)',{a:'middle',fs:11.5,w:600})+T(xr,yl+14,'diagonal: intended',{a:'middle',fs:11,fill:'var(--mute)'});
    el.innerHTML=RD.svg(Math.ceil(Math.max(x+3*c+6,xr+62)),H,b,'Broadcasting a column against a row')}
  // ---------- rank 1: [[1,2],[2,4]] ----------
  function rank1(){const el=$('rd-rank-svg'),W=Math.min(RD.width(el),660),two=W>=520,pw=two?W/2:W,ph=Math.round(Math.min(pw*0.85,270)),H=two?ph:2*ph+8;let b='';
    // input panel
    {const P=panel(0,0,pw,ph,3.6,[1,0.4]),X=P.X,Y=P.Y,L=5;
      b+='<rect x="3" y="3" width="'+(pw-6)+'" height="'+(ph-6)+'" rx="8" fill="var(--c1)" fill-opacity=".05" stroke="var(--line)"/>'+T(10,18,'Input plane',{fs:12,w:600});
      b+=ln(X(-2.6),Y(0),X(4.6),Y(0),'var(--line)')+ln(X(0),Y(-2.4),X(0),Y(3.2),'var(--line)');
      const n=[2,-1],r=[1,2],nn=Math.hypot(...n),rn=Math.hypot(...r);
      b+=ln(X(-1.2*n[0]),Y(-1.2*n[1]),X(1.25*n[0]),Y(1.25*n[1]),'var(--c2)',{w:2.4});
      b+=ln(X(-0.9*r[0]),Y(-0.9*r[1]),X(1.45*r[0]),Y(1.45*r[1]),'var(--c1)',{w:2});
      [[2,1],[1,2.5]].forEach(q=>{b+=ln(X(q[0]-1.2*n[0]),Y(q[1]-1.2*n[1]),X(q[0]+1.2*n[0]),Y(q[1]+1.2*n[1]),'var(--c2)',{dash:'4 3',op:.6})});
      b+=dot(X(2),Y(1),'var(--ink)')+T(X(2)+6,Y(1)-6,'x = (2, 1)',{fs:11});
      b+=dot(X(4),Y(0),'var(--ink)')+T(X(4)-2,Y(0)+16,'(4, 0)',{fs:11,a:'middle'});
      b+=T(X(2.5),Y(-1.25)+14,'null space (2, −1)',{fs:11,fill:'var(--c2)',a:'middle'});
      b+=T(X(1.45)-4,Y(2.9)-4,'row space (1, 2)',{fs:11,fill:'var(--c1)',a:'end'})}
    // output panel
    {const ox=two?pw:0,oy=two?0:ph+8,P=panel(ox,oy,pw,ph,5.6,[2,3.6]),X=P.X,Y=P.Y;
      b+='<rect x="'+(ox+3)+'" y="'+(oy+3)+'" width="'+(pw-6)+'" height="'+(ph-6)+'" rx="8" fill="var(--c3)" fill-opacity=".05" stroke="var(--line)"/>'+T(ox+10,oy+18,'Output plane',{fs:12,w:600});
      b+=ln(X(-2),Y(0),X(6.5),Y(0),'var(--line)')+ln(X(0),Y(-1.2),X(0),Y(9.4),'var(--line)');
      b+=ln(X(-0.5),Y(-1),X(4.6),Y(9.2),'var(--c3)',{w:2.4});
      b+=arrow(X(0),Y(0),X(4),Y(8),'var(--ink)',2)+T(X(4)+7,Y(8)+4,'(4, 8)',{fs:11});
      b+=T(X(2.9),Y(4.2),'column space',{fs:11,fill:'var(--c3)',a:'start'})+T(X(2.9),Y(4.2)+14,'(1, 2): rank 1',{fs:11,fill:'var(--c3)',a:'start'});
      b+=T(ox+pw-10,oy+ph-12,'both inputs land here',{fs:11,fill:'var(--mute)',a:'end'})}
    el.innerHTML=RD.svg(W,H,b,'A rank-1 map')}
  // ---------- least squares ----------
  function lsq(){const el=$('rd-ls-svg'),W=Math.min(RD.width(el),660),two=W>=520,pw=two?W/2:W,ph=Math.round(Math.min(pw*0.78,250)),H=two?ph:2*ph+8;let b='';
    const pts=[[0,1],[1,2],[2,2]],w0=7/6,w1=0.5;
    {const l=40,r=pw-14,t=28,bt=ph-32,X=v=>l+(v+0.25)/2.5*(r-l),Y=v=>bt-(v-0.4)/2.2*(bt-t);
      b+=T(6,16,'Data space: three points, one line',{fs:12,w:600});
      [0.5,1,1.5,2,2.5].forEach(v=>{b+=ln(l,Y(v),r,Y(v),'var(--line)')+T(l-4,Y(v)+4,v.toFixed(1),{fs:10.5,a:'end',fill:'var(--mute)'})});
      [0,1,2].forEach(v=>{b+=T(X(v),bt+15,'t = '+v,{fs:10.5,a:'middle',fill:'var(--mute)'})});
      b+=ln(X(-0.2),Y(w0-0.1),X(2.2),Y(w0+1.1),'var(--c1)',{w:2.2});
      pts.forEach(p=>{const yh=w0+w1*p[0],rr=p[1]-yh;b+=ln(X(p[0]),Y(p[1]),X(p[0]),Y(yh),'var(--c2)',{w:2,dash:'3 2'})+dot(X(p[0]),Y(p[1]),'var(--ink)')+dot(X(p[0]),Y(yh),'var(--c1)',3);
        b+=T(X(p[0])+6,(Y(p[1])+Y(yh))/2+4,(rr>0?'+':'')+rr.toFixed(3),{fs:11,fill:'var(--c2)'})});
      b+=T(X(2.2),Y(w0+1.1)-6,'ŷ = 1.167 + 0.5 t',{fs:11,fill:'var(--c1)',a:'end'})}
    {const ox=two?pw:0,oy=two?0:ph+8;b+=T(ox+6,oy+16,'In ℝ³: a projection (schematic)',{fs:12,w:600});
      const cx=ox+pw*0.5,cy=oy+ph*0.68,u=Math.min(pw,ph*1.3)/7;
      const P=(a,c)=>[cx+(a*1.6-c*1.1)*u,cy+(a*0.35+c*0.55)*u];
      const cs=[[-1.3,-1.1],[1.6,-1.1],[1.6,1.3],[-1.3,1.3]].map(q=>P(q[0],q[1]));
      b+='<polygon points="'+cs.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ')+'" fill="var(--c3)" fill-opacity=".16" stroke="var(--c3)"/>';
      const o=P(-0.9,-0.6),f=P(0.7,0.25),top=[f[0],f[1]-2.4*u];
      b+=arrow(o[0],o[1],f[0],f[1],'var(--c1)',2.2)+arrow(o[0],o[1],top[0],top[1],'var(--ink)',2.2);
      b+=ln(top[0],top[1],f[0],f[1],'var(--c2)',{w:2,dash:'4 3'});
      b+='<polyline points="'+(f[0]+9)+','+(f[1]+2)+' '+(f[0]+9)+','+(f[1]-8)+' '+f[0]+','+(f[1]-10)+'" fill="none" stroke="var(--mute)"/>';
      b+=T(top[0]+6,top[1]+4,'y',{fs:12,w:600})+T(f[0]+6,f[1]+16,'ŷ = Xw',{fs:11.5,fill:'var(--c1)',w:600});
      b+=T(top[0]+7,(top[1]+f[1])/2+4,'y − ŷ ⟂ plane',{fs:11.5,fill:'var(--c2)',a:'start',w:600});
      b+=T(cs[3][0]+4,cs[3][1]-6,'column space of X',{fs:11,fill:'var(--c3)'})}
    el.innerHTML=RD.svg(W,H,b,'Least squares as a projection')}
  // ---------- power iteration: the first iterates on the plane, then the angle per step ----------
  function power(){const el=$('rd-pow-svg'),W=Math.min(RD.width(el),760),two=W>=560,pw=two?W*0.46:W,ph=Math.round(two?260:Math.min(W*0.8,300)),H=two?ph:2*ph+8,A=[[3,0],[4,5]];let b='';
    let x=[Math.SQRT1_2,Math.SQRT1_2];const xs=[],ang=[];
    for(let k=0;k<=8;k++){xs.push(x);ang.push(Math.atan2(Math.abs(x[0]),x[1])*180/Math.PI);const y=mv(A,x),n=Math.hypot(y[0],y[1]);x=[y[0]/n,y[1]/n]}
    {const P=panel(0,0,pw,ph,1.3,[0.15,0.05]),X=P.X,Y=P.Y;
      b+=T(6,16,'On the plane: x₀, x₁, x₂',{fs:12,w:600});
      b+=ln(X(-0.9),Y(0),X(1.2),Y(0),'var(--line)')+'<circle cx="'+X(0)+'" cy="'+Y(0)+'" r="'+P.sc+'" fill="none" stroke="var(--line)"/>';
      const e2=[1/Math.sqrt(5),-2/Math.sqrt(5)];
      b+=ln(X(0),Y(-1.15),X(0),Y(1.2),'var(--c3)',{w:1.6,dash:'5 3'})+T(X(0)-5,Y(1.12),'(0, 1), λ = 5',{fs:11,fill:'var(--c3)',a:'end'});
      b+=ln(X(-0.45*e2[0]),Y(-0.45*e2[1]),X(1.1*e2[0]),Y(1.1*e2[1]),'var(--c4)',{w:1.6,dash:'5 3'})+T(X(1.1*e2[0])+5,Y(1.1*e2[1])+4,'(1, −2), λ = 3',{fs:11,fill:'var(--c4)'});
      [0,1,2].forEach(k=>{const v=xs[k];b+=arrow(X(0),Y(0),X(v[0]),Y(v[1]),'var(--c1)',2.2-k*0.3);b+=T(X(v[0])+6,Y(v[1])+(k===2?12:4),'x'+['₀','₁','₂'][k],{fs:11.5,w:600,fill:'var(--c1)'})})}
    {const ox=two?pw+16:0,oy=two?0:ph+8,w=two?W-pw-16:W,l=ox+36,r=ox+w-8,t=oy+30,bt=oy+ph-28,n=9,bw=(r-l)/n,Y=v=>bt-v/50*(bt-t);
      b+=T(ox+6,oy+16,'Angle to (0, 1) after each step',{fs:12,w:600});
      [0,15,30,45].forEach(v=>{b+=ln(l,Y(v),r,Y(v),'var(--line)')+T(l-5,Y(v)+4,v+'°',{fs:10.5,a:'end',fill:'var(--mute)'})});
      ang.forEach((a,k)=>{b+='<rect x="'+(l+k*bw+2).toFixed(1)+'" y="'+Y(a).toFixed(1)+'" width="'+(bw-4).toFixed(1)+'" height="'+(bt-Y(a)).toFixed(1)+'" fill="var(--c1)" fill-opacity="'+(k?0.75:0.35)+'"/>';
        b+=T(l+k*bw+bw/2,bt+14,String(k),{fs:10.5,a:'middle',fill:'var(--mute)'});
        if(k>=1&&k<=(W<420?5:8))b+=T(l+k*bw+bw/2,Y(a)-4,a.toFixed(1),{fs:10.5,a:'middle',fill:'var(--ink)'})});
      b+=T(l+bw/2,Y(ang[0])-4,'45',{fs:10.5,a:'middle',fill:'var(--mute)'})}
    el.innerHTML=RD.svg(W,H,b,'Power iteration converging to the dominant eigenvector');el.dataset.angles=ang.slice(1).map(a=>a.toFixed(2)).join(',')}
  // ---------- PD ellipse for S = W^T W ----------
  function pd(){const el=$('rd-pd-svg'),W=Math.min(RD.width(el),460),H=Math.round(W*0.86),P=panel(0,-14,W,H+14,1.3),X=P.X,Y=P.Y;let b='';
    const q1=[1/Math.sqrt(5),-2/Math.sqrt(5)],q2=[2/Math.sqrt(5),1/Math.sqrt(5)],a1=1/Math.sqrt(6),a2=1;
    b+=ln(X(-1.25),Y(0),X(1.25),Y(0),'var(--line)')+ln(X(0),Y(-1.2),X(0),Y(1.2),'var(--line)');
    const ell=(s)=>curve(t=>[s*(a1*Math.cos(t)*q1[0]+a2*Math.sin(t)*q2[0]),s*(a1*Math.cos(t)*q1[1]+a2*Math.sin(t)*q2[1])],X,Y,96);
    b+='<path d="'+ell(1)+'" fill="var(--c6)" fill-opacity=".12" stroke="var(--c6)" stroke-width="2.2"/>';
    b+=arrow(X(0),Y(0),X(a1*q1[0]),Y(a1*q1[1]),'var(--c2)',2.4)+arrow(X(0),Y(0),X(a2*q2[0]),Y(a2*q2[1]),'var(--c1)',2.4);
    b+=T(X(a1*q1[0])+6,Y(a1*q1[1])+10,'1/√6 = 0.408 (λ = 6)',{fs:11,fill:'var(--c2)'});
    b+=T(X(a2*q2[0])+2,Y(a2*q2[1])-8,'1 (λ = 1), along x',{fs:11,fill:'var(--c1)',a:'end'});
    el.innerHTML=RD.svg(W,H,b,'Level set of the quadratic form')}
  // ---------- conditioning: nearly parallel lines ----------
  function cond(){const el=$('rd-cond-svg'),W=Math.min(RD.width(el),660),two=W>=520,pw=two?W/2:W,ph=Math.round(Math.min(pw*0.8,250)),H=two?ph:2*ph+8;let b='';
    const L=[{a:1,b:1,c:2,col:'var(--ink)',n:'x + y = 2'},{a:1,b:1.001,c:2.001,col:'var(--c1)',n:'b₂ = 2.001'},{a:1,b:1.001,c:2.002,col:'var(--c2)',n:'b₂ = 2.002'}];
    {const l=36,r=pw-12,t=30,bt=ph-30,X=v=>l+(v+0.4)/2.8*(r-l),Y=v=>bt-(v+0.3)/2.8*(bt-t);
      b+=T(6,16,'True scale: the three lines overlap',{fs:12,w:600});
      [0,1,2].forEach(v=>{b+=ln(X(v),t,X(v),bt,'var(--line)')+ln(l,Y(v),r,Y(v),'var(--line)')+T(X(v),bt+14,String(v),{fs:10.5,a:'middle',fill:'var(--mute)'})+T(l-5,Y(v)+4,String(v),{fs:10.5,a:'end',fill:'var(--mute)'})});
      L.forEach((q,i)=>{const y=x=>(q.c-q.a*x)/q.b;b+=ln(X(-0.3),Y(y(-0.3)),X(2.3),Y(y(2.3)),q.col,{w:i?1.6:3,op:i?1:.35})});
      b+=dot(X(1),Y(1),'var(--c1)',5)+T(X(1)+8,Y(1)-6,'x = (1, 1)',{fs:11,fill:'var(--c1)'});
      b+=dot(X(0),Y(2),'var(--c2)',5)+T(X(0)+8,Y(2)-6,'x = (0, 2)',{fs:11,fill:'var(--c2)'})}
    {const ox=two?pw:0,oy=two?0:ph+8,l=ox+44,r=ox+pw-12,t=oy+30,bt=oy+ph-30,X=v=>l+(v+0.4)/2.8*(r-l),Y=v=>bt-(v+1.3)/3.6*(bt-t);
      b+=T(ox+6,oy+16,'Gap to x + y = 2, magnified 1,000 times',{fs:12,w:600});
      [-1,0,1,2].forEach(v=>{b+=ln(l,Y(v),r,Y(v),'var(--line)')+T(l-5,Y(v)+4,(v/1000).toString(),{fs:10.5,a:'end',fill:'var(--mute)'})});
      [0,1,2].forEach(v=>{b+=T(X(v),bt+14,'x₁ = '+v,{fs:10.5,a:'middle',fill:'var(--mute)'})});
      L.forEach((q,i)=>{const g=x=>1000*((q.c-q.a*x)/q.b-(2-x));b+=ln(X(-0.3),Y(g(-0.3)),X(2.3),Y(g(2.3)),q.col,{w:i?2:2.4,op:i?1:.5})});
      b+=dot(X(1),Y(0),'var(--c1)',5)+T(X(1)+6,Y(0)+16,'cross at x₁ = 1',{fs:11,fill:'var(--c1)'});
      b+=dot(X(0),Y(0),'var(--c2)',5)+T(X(0)-4,Y(0)-8,'cross at x₁ = 0',{fs:11,fill:'var(--c2)',a:'start'});
      b+=T(r,Y(1000*((2.002-2.3)/1.001-(2-2.3)))-6,'b₂ = 2.002',{fs:11,fill:'var(--c2)',a:'end'});
      b+=T(r,Y(1000*((2.001-2.3)/1.001-(2-2.3)))+14,'b₂ = 2.001',{fs:11,fill:'var(--c1)',a:'end'})}
    el.innerHTML=RD.svg(W,H,b,'An ill-conditioned 2 by 2 system')}
  // ---------- Newton-Schulz on A / ||A||_F ----------
  function ns(){const el=$('rd-ns-svg'),W=Math.min(RD.width(el),560),H=220,l=40,r=W-14,t=30,bt=H-30;let s=[3/Math.sqrt(10),1/Math.sqrt(10)];const hist=[s.slice()];
    for(let k=0;k<6;k++){s=s.map(v=>1.5*v-0.5*v*v*v);hist.push(s.slice())}
    const X=k=>l+k/6*(r-l),Y=v=>bt-v/1.05*(bt-t);let b='';
    [0,0.25,0.5,0.75,1].forEach(v=>{b+=ln(l,Y(v),r,Y(v),'var(--line)')+T(l-5,Y(v)+4,v.toFixed(2),{fs:10.5,a:'end',fill:'var(--mute)'})});
    hist.forEach((h,k)=>{b+=T(X(k),bt+15,k?'step '+k:'start',{fs:10.5,a:'middle',fill:'var(--mute)'})});
    [0,1].forEach(j=>{b+='<polyline points="'+hist.map((h,k)=>X(k).toFixed(1)+','+Y(h[j]).toFixed(1)).join(' ')+'" fill="none" stroke="var(--c'+(j?2:1)+')" stroke-width="2.2"/>';
      hist.forEach((h,k)=>{b+=dot(X(k),Y(h[j]),'var(--c'+(j?2:1)+')',3.5)})});
    hist.forEach((h,k)=>{if(k<6||W>420)b+=T(X(k)+(k===0?4:0),Y(h[1])+16,h[1].toFixed(3),{fs:10.5,a:k===0?'start':'middle',fill:'var(--c2)'})});
    b+=T(X(0),14,'σ₁: 0.949, then 1.000 from step 2',{fs:11,fill:'var(--c1)'})+T(X(6),bt-8,'σ₂ (orange)',{fs:11,fill:'var(--c2)',a:'end'});
    el.innerHTML=RD.svg(W,H,b,'Singular values under Newton-Schulz');el.dataset.sv=hist.map(h=>h.map(v=>v.toFixed(4)).join('/')).join(',')}
  function all(){hero();bcast();rank1();lsq();power();pd();cond();ns()}
  RD.onRender(all);RD.onResize(all);all();
})();
