// ---- Reading tab: small interactive figures (secant, directional derivative, Taylor, Hessian gallery, rate, chord, Lagrange, XGBoost, noise, SGD) ----
(function(){
  const T=CO.T,$=id=>document.getElementById(id);
  const reg=f=>{RD.onRender(f);RD.onResize(f);try{f()}catch(e){window.__jsErr&&__jsErr(e.message)}};
  const arrow=(x1,y1,x2,y2,col,w)=>{const a=Math.atan2(y2-y1,x2-x1),L=Math.hypot(x2-x1,y2-y1),h=Math.min(8,L*0.4);
    return '<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" style="stroke:'+col+';stroke-width:'+(w||2)+'"/>'+
      '<path d="M'+x2.toFixed(1)+' '+y2.toFixed(1)+'L'+(x2-h*Math.cos(a-0.4)).toFixed(1)+' '+(y2-h*Math.sin(a-0.4)).toFixed(1)+'L'+(x2-h*Math.cos(a+0.4)).toFixed(1)+' '+(y2-h*Math.sin(a+0.4)).toFixed(1)+'Z" style="fill:'+col+'"/>'};
  const stat=(k,v,d)=>RD.stat(k,v,d);
  const M=CO.minus;

  // 1. secant to tangent on x^2 at 3
  const H=[1,0.1,0.01,0.001];
  function sec(){const el=$('rd-sec-svg');if(!el)return;const h=H[+$('rd-sec-h').value];$('rd-sec-hv').textContent=h;
    const W=Math.min(560,RD.width(el)),Hh=230;
    const c=CO.chart({id:'sec',w:W,h:Hh,x:[1,5],y:[0,25],xt:[1,2,3,4,5],yt:[0,5,10,15,20,25],xl:'x',
      series:[{pts:[...Array(81)].map((_,i)=>{const x=1+i*0.05;return[x,x*x]}),col:'var(--mute)'},
        {pts:[[1,9-12],[5,9+12]],col:'var(--c1)',w:1.6},
        {pts:[[1,9+(6+h)*(-2)],[5,9+(6+h)*2]],col:'var(--c2)',dash:'5 3',w:1.6}],
      extra:(sx,sy)=>'<circle cx="'+sx(3)+'" cy="'+sy(9)+'" r="4" style="fill:var(--ink)"/><circle cx="'+sx(3+h)+'" cy="'+sy((3+h)*(3+h))+'" r="3.5" style="fill:var(--c2)"/>'});
    el.innerHTML=c.svg;
    $('rd-sec-out').innerHTML=stat('secant slope','<span id="rd-sec-slope">'+CO.fmt(6+h,4)+'</span>','(f(3+h) − 9)/h = 6 + h')+stat('tangent slope','6','the derivative f′(3) = 2·3')+stat('line error at 3 + h','<span id="rd-sec-err">'+CO.fmt(h*h,6)+'</span>','(3+h)² − (9 + 6h) = h²')}
  $('rd-sec-h').addEventListener('input',sec);reg(sec);

  // 2. directional derivative on x^2 + 3y^2 at (1,1)
  function dir(){const el=$('rd-dir-svg');if(!el)return;const deg=+$('rd-dir-a').value;$('rd-dir-av').textContent=deg+'°';
    const W=Math.min(420,RD.width(el)),Hh=W;const r=W/2.4;const cx=W/2,cy=Hh/2;
    const map=(x,y)=>[cx+(x-1)*r,cy-(y-1)*r];
    const f=(x,y)=>x*x+3*y*y;
    const lv=[0.5,1,2,4,6,8,11,14];
    let s=CO.contours(f,-0.3,2.3,-0.3,2.3,70,70,lv,map).map((d,i)=>'<path d="'+d+'" style="fill:none;stroke:'+(lv[i]===4?'var(--ink)':'var(--dim)')+';stroke-width:'+(lv[i]===4?1.4:1)+'"/>').join('');
    const g=[2,6],gn=Math.hypot(2,6),ug=[g[0]/gn,g[1]/gn];const a=deg*Math.PI/180,u=[Math.cos(a),Math.sin(a)];
    s+=arrow(cx,cy,cx+ug[0]*r*0.9,cy-ug[1]*r*0.9,'var(--c1)',2.4)+arrow(cx,cy,cx+u[0]*r*0.75,cy-u[1]*r*0.75,'var(--c2)',2.4);
    s+='<circle cx="'+cx+'" cy="'+cy+'" r="4" style="fill:var(--ink)"/>'+T(cx+ug[0]*r*0.9+4,cy-ug[1]*r*0.9,'∇f','start',12,'var(--c1)',600)+T(cx+u[0]*r*0.78+4,cy-u[1]*r*0.78+12,'u','start',12,'var(--c2)',600)+T(8,16,'contour f = 4 passes through (1, 1)','start',10.5,'var(--mute)');
    el.innerHTML=RD.svg(W,Hh,s,'contours and directions');
    const d=g[0]*u[0]+g[1]*u[1];const phi=Math.acos(Math.max(-1,Math.min(1,d/gn)))*180/Math.PI;
    $('rd-dir-out').innerHTML=stat('slope along u','<span id="rd-dir-d">'+M(CO.fx(d,3))+'</span>','∇f · u, with ∇f = (2, 6)')+stat('angle to the gradient',phi.toFixed(0)+'°','cos φ = '+M(CO.fx(Math.cos(phi*Math.PI/180),3)))+stat('steepest possible','6.325','‖∇f‖ = √40')}
  $('rd-dir-a').addEventListener('input',dir);reg(dir);

  // 4. Taylor models of e^x
  function tay(){const el=$('rd-tay-svg');if(!el)return;const a=+$('rd-tay-a').value;$('rd-tay-av').textContent=M(a.toFixed(1));
    const W=Math.min(560,RD.width(el)),ea=Math.exp(a);
    const xs=[...Array(121)].map((_,i)=>-2+i*0.035);
    const c=CO.chart({id:'tay',w:W,h:230,x:[-2,2.2],y:[-1,8],xt:[-2,-1,0,1,2],yt:[0,2,4,6,8],xl:'x',
      series:[{pts:xs.map(x=>[x,Math.exp(x)]),col:'var(--mute)',w:2.4},{pts:xs.map(x=>[x,ea*(1+(x-a))]),col:'var(--c2)',w:1.6,dash:'5 3'},{pts:xs.map(x=>[x,ea*(1+(x-a)+(x-a)*(x-a)/2)]),col:'var(--c1)',w:1.6}],
      extra:(sx,sy)=>'<circle cx="'+sx(a)+'" cy="'+sy(ea)+'" r="4" style="fill:var(--ink)"/><line x1="'+sx(a+0.5)+'" x2="'+sx(a+0.5)+'" y1="'+sy(-1)+'" y2="'+sy(8)+'" style="stroke:var(--dim);stroke-dasharray:3 3"/>'});
    el.innerHTML=c.svg;const tr=Math.exp(a+0.5),o1=ea*1.5,o2=ea*1.625;
    $('rd-tay-out').innerHTML=stat('true f(a + 0.5)','<span id="rd-tay-true">'+tr.toFixed(4)+'</span>','')+stat('order 1','<span id="rd-tay-o1">'+o1.toFixed(4)+'</span>','error '+(tr-o1).toFixed(4))+stat('order 2','<span id="rd-tay-o2">'+o2.toFixed(4)+'</span>','error '+(tr-o2).toFixed(4))}
  $('rd-tay-a').addEventListener('input',tay);reg(tay);

  // 6. Hessian gallery
  function hg(){const el=$('rd-hg-svg');if(!el)return;const W=RD.width(el);const per=W<520?2:4;const cw=Math.floor(W/per)-6,ch=cw+26;
    const fs=[['x² + y², minimum',(x,y)=>x*x+y*y,[2,2]],['−x² − y², maximum',(x,y)=>-x*x-y*y,[-2,-2]],['x² − y², saddle',(x,y)=>x*x-y*y,[2,-2]],['x² + y⁴, flat floor',(x,y)=>x*x+y*y*y*y,[2,0]]];
    let s='';fs.forEach((F,k)=>{const ox=(k%per)*(cw+6),oy=Math.floor(k/per)*(ch+6);const r=cw/2.4,cx=ox+cw/2,cy=oy+ch/2+8;
      const map=(x,y)=>[cx+x*r,cy-y*r];const lv=[-2,-1.5,-1,-0.5,-0.2,0.2,0.5,1,1.5,2];
      s+='<rect x="'+ox+'" y="'+oy+'" width="'+cw+'" height="'+ch+'" rx="6" style="fill:none;stroke:var(--line)"/>'+T(ox+cw/2,oy+15,F[0],'middle',11.5,'var(--ink)',600);
      s+=CO.contours(F[1],-1.15,1.15,-1.15,1.15,40,40,lv,map).map((d,i)=>'<path d="'+d+'" style="fill:none;stroke:'+(lv[i]>0?'var(--c1)':'var(--c2)')+';stroke-opacity:.45"/>').join('');
      F[2].forEach((ev,i)=>{const col=ev>0?'var(--c1)':ev<0?'var(--c2)':'var(--mute)';const L=ev===0?0.35*r:Math.abs(ev)/2*0.85*r;const dx=i===0?L:0,dy=i===1?L:0;s+=arrow(cx,cy,cx+dx,cy-dy,col,2.2)});
      s+=T(ox+cw/2,oy+ch-6,'eigenvalues '+F[2].map(v=>M(String(v))).join(' and '),'middle',10.5,'var(--mute)');
      s+='<circle cx="'+cx+'" cy="'+cy+'" r="3" style="fill:var(--ink)"/>'});
    const rows=Math.ceil(fs.length/per);el.innerHTML=RD.svg(per*(cw+6),rows*(ch+6),s,'four critical points')}
  reg(hg);

  // 8. rate against step for a quadratic with lambda_min = 1, lambda_max = kappa
  function rate(){const el=$('rd-rate-svg');if(!el)return;const k=+$('rd-rate-k').value;$('rd-rate-kv').textContent=k;
    const lim=2/k,fr=+$("rd-rate-e").value/1000,eta=fr*lim;$('rd-rate-ev').textContent=CO.fmt(eta,4);
    const W=Math.min(620,RD.width(el));const N=200,pts=[[],[],[]];
    for(let i=0;i<=N;i++){const e=i/N*1.1*lim;const a=Math.abs(1-e),b=Math.abs(1-e*k);pts[0].push([i/N*1.1,a]);pts[1].push([i/N*1.1,b]);pts[2].push([i/N*1.1,Math.max(a,b)])}
    const best=2/(k+1),bf=best/lim;
    const c=CO.chart({id:'rate',w:W,h:230,x:[0,1.1],y:[0,1.6],xt:[0,0.25,0.5,0.75,1],xtf:v=>v===1?'2/λmax':v,yt:[0,0.5,1,1.5],xl:'step η as a fraction of the limit 2/λmax',
      series:[{pts:pts[0],col:'var(--c2)'},{pts:pts[1],col:'var(--c1)'},{pts:pts[2],col:'var(--ink)',w:2.6,dash:'1 0'}],
      extra:(sx,sy)=>'<line x1="'+sx(0)+'" x2="'+sx(1.1)+'" y1="'+sy(1)+'" y2="'+sy(1)+'" style="stroke:var(--bad);stroke-dasharray:4 3"/>'+T(sx(1.08),sy(1)-4,'diverges above 1','end',10,'var(--bad)')+
        '<circle cx="'+sx(bf)+'" cy="'+sy((k-1)/(k+1))+'" r="4" style="fill:var(--good)"/><line x1="'+sx(fr)+'" x2="'+sx(fr)+'" y1="'+sy(0)+'" y2="'+sy(1.6)+'" style="stroke:var(--mute);stroke-dasharray:3 3"/>'});
    el.innerHTML=c.svg;const r=Math.max(Math.abs(1-eta),Math.abs(1-eta*k));const steps=r<1?Math.log(1000)/-Math.log(r):Infinity;
    $('rd-rate-out').innerHTML=stat('rate at this step','<span id="rd-rate-r">'+CO.fx(r,4)+'</span>',r<1?'error × this per step':'diverges')+stat('steps for 1000x',isFinite(steps)?'<span id="rd-rate-n">'+Math.ceil(steps)+'</span>':'never','ln 1000 / ln(1/rate)')+stat('best step η*','<span id="rd-rate-b">'+CO.fx(best,4)+'</span>','2/(κ + 1); rate (κ−1)/(κ+1) = <span id="rd-rate-br">'+CO.fx((k-1)/(k+1),4)+'</span>')}
  $('rd-rate-k').addEventListener('input',()=>{const k=+$('rd-rate-k').value;$('rd-rate-e').value=Math.round(1000*k/(k+1));rate()});$('rd-rate-e').addEventListener('input',rate);reg(rate);

  // 13. chord and Jensen
  const CF={sq:x=>x*x,abs:x=>Math.abs(x),lse:x=>CO.softplus(x),sin:x=>x*x/4+Math.sin(2*x)};let cf='sq';
  function chord(){const el=$('rd-chord-svg');if(!el)return;const t=+$('rd-chord-t').value;$('rd-chord-tv').textContent=t.toFixed(2);
    const f=CF[cf],a=-1,b=3,xm=t*a+(1-t)*b,fm=f(xm),cm=t*f(a)+(1-t)*f(b);
    const xs=[...Array(101)].map((_,i)=>-1.5+i*0.05);const ys=xs.map(f);const y0=Math.min(...ys)-0.5,y1=Math.max(...ys)+0.5;
    const W=Math.min(560,RD.width(el));
    const c=CO.chart({id:'chord',w:W,h:220,x:[-1.5,3.5],y:[y0,y1],xt:[-1,0,1,2,3],yt:[],xl:'x',
      series:[{pts:xs.map((x,i)=>[x,ys[i]]),col:'var(--mute)',w:2.4},{pts:[[a,f(a)],[b,f(b)]],col:'var(--c2)',w:1.6}],
      extra:(sx,sy)=>'<circle cx="'+sx(xm)+'" cy="'+sy(fm)+'" r="4.5" style="fill:var(--good)"/><circle cx="'+sx(xm)+'" cy="'+sy(cm)+'" r="4.5" style="fill:var(--c2)"/>'});
    el.innerHTML=c.svg;const ok=fm<=cm+1e-12;
    $('rd-chord-out').innerHTML=stat('function at the mix','<span id="rd-chord-fv">'+CO.fx(fm,3)+'</span>','f(t·(−1) + (1−t)·3)')+stat('chord at the mix','<span id="rd-chord-c">'+CO.fx(cm,3)+'</span>','t f(−1) + (1−t) f(3)')+stat('chord above?',ok?'yes':'<b style="color:var(--bad)">no: not convex</b>','')}
  RD.seg($('rd-chord-f'),m=>{cf=m;chord()});$('rd-chord-t').addEventListener('input',chord);reg(chord);

  // 14. Lagrange on the circle
  function lag(){const el=$('rd-lag-svg');if(!el)return;const deg=+$('rd-lag-a').value;$('rd-lag-av').textContent=deg+'°';
    const W=Math.min(380,RD.width(el)),Hh=W,r=W/3.2,cx=W/2,cy=Hh/2;const map=(x,y)=>[cx+x*r,cy-y*r];
    let s=CO.contours((x,y)=>x+y,-1.6,1.6,-1.6,1.6,30,30,[-2,-1.5,-1,-0.5,0,0.5,1,1.414,2],map).map(d=>'<path d="'+d+'" style="fill:none;stroke:var(--dim)"/>').join('');
    s+='<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" style="fill:none;stroke:var(--ink);stroke-width:1.6"/>';
    const a=deg*Math.PI/180,x=Math.cos(a),y=Math.sin(a);const [px,py]=map(x,y);
    s+=arrow(px,py,px+0.5*r,py-0.5*r,'var(--c1)',2.2)+arrow(px,py,px+2*x*0.35*r,py-2*y*0.35*r,'var(--c2)',2.2)+'<circle cx="'+px+'" cy="'+py+'" r="4.5" style="fill:var(--ink)"/>';
    const lab=(X,Y,t,col)=>{const a=X>W-22?'end':'start';return T(Math.max(4,Math.min(W-4,X)),Math.max(12,Math.min(W-4,Y)),t,a,12,col,600)};
    s+=lab(px+0.5*r+3,py-0.5*r-3,'∇f','var(--c1)')+lab(px+0.7*x*r+3,py-0.7*y*r+12,'∇g','var(--c2)');
    el.innerHTML=RD.svg(W,Hh,s,'Lagrange picture');
    const lamx=1/(2*x),lamy=1/(2*y),cos=(x+y)/Math.SQRT2;
    $('rd-lag-out').innerHTML=stat('f = x + y here','<span id="rd-lag-f">'+M(CO.fx(x+y,3))+'</span>','maximum √2 = 1.414')+stat('angle between ∇f and ∇g',(Math.acos(Math.max(-1,Math.min(1,cos)))*180/Math.PI).toFixed(0)+'°','0° only at the optimum')+stat('λ needed per coordinate',M(CO.fx(lamx,3))+' and '+M(CO.fx(lamy,3)),'1/(2x), 1/(2y): equal (0.707) only at 45°')}
  $('rd-lag-a').addEventListener('input',lag);reg(lag);

  // 12. XGBoost leaf: four examples
  const xg={y:[1,1,1,0],split:3};
  function xgb(){const ui=$('rd-xgb-ui');if(!ui)return;const lam=1,g=xg.y.map(v=>0.5-v),h=[0.25,0.25,0.25,0.25];
    let s='<div class="chips" style="align-items:center">';xg.y.forEach((v,i)=>{s+='<button data-i="'+i+'" class="xl'+(v?' on':'')+'" aria-label="label of example '+(i+1)+'">example '+(i+1)+': y = '+v+'</button>';if(i<3)s+='<button data-s="'+(i+1)+'" class="xs'+(xg.split===i+1?' on':'')+'" title="split here">|</button>'});
    s+='</div>';ui.innerHTML=s;
    const sum=a=>a.reduce((p,q)=>p+q,0);const G=sum(g),Hs=sum(h),GL=sum(g.slice(0,xg.split)),HL=sum(h.slice(0,xg.split)),GR=G-GL,HR=Hs-HL;
    const gain=0.5*(GL*GL/(HL+lam)+GR*GR/(HR+lam)-G*G/(Hs+lam));
    $('rd-xgb-out').innerHTML=stat('one leaf: w* = −G/(H + λ)','<span id="rd-xgb-w">'+M(CO.fx(-G/(Hs+lam),3))+'</span>','G = '+M(CO.fx(G,2))+', H = '+CO.fx(Hs,2))+stat('split gain (before γ)','<span id="rd-xgb-gain">'+CO.fx(gain,3)+'</span>','left '+xg.split+', right '+(4-xg.split))+stat('children','<span id="rd-xgb-wl">'+M(CO.fx(-GL/(HL+lam),3))+'</span> and <span id="rd-xgb-wr">'+M(CO.fx(-GR/(HR+lam),3))+'</span>','w_L, w_R')}
  $('rd-xgb-ui').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.i!=null)xg.y[+b.dataset.i]^=1;else xg.split=+b.dataset.s;xgb()});reg(xgb);

  // 16. minibatch noise against batch size, and SGD floors
  function noise(){const el=$('rd-noise-svg');if(!el)return;const W=Math.min(560,RD.width(el));const N=CO.D.noise;const Bs=Object.keys(N).map(Number).sort((a,b)=>a-b);
    const c=CO.chart({id:'noise',w:W,h:230,logx:true,logy:true,x:[0.8,700],y:[5e-4,10],xt:[1,4,16,64,256],yt:[1e-3,1e-2,1e-1,1,10],ytf:CO.pow10,xl:'batch size B (log scale)',ml:46,
      series:[{pts:Bs.map(B=>[B,N[B][1]]),col:'var(--c1)'},{pts:Bs.map(B=>[B,N[B][0]]),col:'var(--c2)',dots:true,dotsOnly:true,r:3.5}]});
    el.innerHTML=c.svg}
  reg(noise);
  const SG=[['const_2','constant 2','var(--c2)'],['const_0.5','constant 0.5','var(--c5)'],['const_0.1','constant 0.1','var(--c3)'],['decay_2','2/(1 + k/500)','var(--c1)']];
  function sgd(){const el=$('rd-sgdfig-svg');if(!el)return;const W=Math.min(620,RD.width(el));const S=CO.D.sgd;
    const c=CO.chart({id:'sgd',w:W,h:240,logy:true,x:[0,150],y:[1e-5,1],xt:[0,50,100,150],yt:[1e-5,1e-4,1e-3,1e-2,1e-1,1],ytf:CO.pow10,xl:'epoch',ml:46,
      series:SG.map(q=>({pts:S[q[0]].map((v,i)=>[i,v]),col:q[2]}))});
    el.innerHTML=c.svg;$('rd-sgdfig-leg').innerHTML=SG.map(q=>'<span style="--sw:'+q[2]+'">'+q[1]+'</span>').join('')}
  reg(sgd);
})();
