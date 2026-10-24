// ---- Reading figures added in the 2026-10-24 rebuild: hero, estimators, log-likelihood, n - 1, null distribution, power,
// permutation, many tests, conjugate posterior, regression and ridge, cross-validation folds.
// Every number either comes from SD (sims.py, recompute.py) or is computed here from a closed form that recompute.py also computes.
(function(){
  const T=RD.t,F=(v,d)=>(+v).toFixed(d);
  const ln=(x1,y1,x2,y2,st)=>'<line x1="'+(+x1).toFixed(1)+'" y1="'+(+y1).toFixed(1)+'" x2="'+(+x2).toFixed(1)+'" y2="'+(+y2).toFixed(1)+'" style="'+st+'"/>';
  const rc=(x,y,w,h,st)=>'<rect x="'+(+x).toFixed(1)+'" y="'+(+y).toFixed(1)+'" width="'+Math.max(0,w).toFixed(1)+'" height="'+Math.max(0,h).toFixed(1)+'" style="'+st+'"/>';
  const path=(pts,st)=>'<path d="'+pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join('')+'" style="'+st+'"/>';
  // standard normal CDF (Abramowitz and Stegun 7.1.26 on erf, error below 2e-7)
  const Phi=x=>{const z=Math.abs(x)/Math.SQRT2,t=1/(1+0.3275911*z),e=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-z*z);return x>=0?0.5*(1+e):0.5*(1-e)};
  const npdf=x=>Math.exp(-0.5*x*x)/Math.sqrt(2*Math.PI);
  const lgam=x=>{const g=[76.18009172947146,-86.50532032941677,24.01409824083091,-1.231739572450155,0.1208650973866179e-2,-0.5395239384953e-5];let y=x,t=x+5.5;t-=(x+0.5)*Math.log(t);let s=1.000000000190015;for(let j=0;j<6;j++)s+=g[j]/++y;return -t+Math.log(2.5066282746310005*s/x)};
  const bpdf=(q,a,b)=>q<=0||q>=1?0:Math.exp((a-1)*Math.log(q)+(b-1)*Math.log(1-q)+lgam(a+b)-lgam(a)-lgam(b));
  const E=SD.E,X8=SD.ex.x8;
  // text with a halo in the panel colour, so a reference line behind it does not cut through it
  const TH=(x,y,t,o)=>RD.t(x,y,t,o).replace('<text ','<text style="paint-order:stroke;stroke:var(--soft);stroke-width:4px;stroke-linejoin:round" ');
  const reg=(id,f)=>{const el=document.getElementById(id);if(!el)return null;const go=()=>f(el);RD.onRender(go);RD.onResize(go);go();return go};

  // ---- hero: population, sampling distribution of the mean (n = 30), one sample's interval ----
  reg('rd-hero-svg',el=>{
    const W=RD.width(el),wide=W>=640,gap=wide?18:16,pw=wide?(W-2*gap)/3:W,ph=wide?178:150,H=wide?ph:3*ph+2*gap;
    const c=SD.clt.dists.tiny,h=c.by_n['30'],tn=SD.tiny,b=SD.boot.tiny30,mu=tn.mu,se=tn.sd/Math.sqrt(30);
    let s='';const org=i=>wide?[i*(pw+gap),0]:[0,i*(ph+gap)];
    const frame=(i,title,lo,hi,ticks)=>{const [ox,oy]=org(i),L=ox+8,R=ox+pw-8,top=oy+34,bot=oy+ph-22,X=v=>L+(v-lo)/(hi-lo)*(R-L);
      s+=rc(ox,oy,pw,ph,'fill:var(--soft);stroke:var(--line)')+T(ox+8,oy+16,title,{fs:12,w:600})+ln(L,bot,R,bot,'stroke:var(--mute)');
      ticks.forEach(t=>{s+=T(X(t),bot+14,String(t),{fs:10.5,a:'middle',fill:'var(--mute)'})});return {X,top,bot,L,R,ox,oy}};
    // 1 population
    let f=frame(0,'1. Population: one word’s loss',0,2.8,[0,1,2]);
    tn.L.forEach((l,j)=>{const y=f.bot-(f.bot-f.top-14)*tn.p[j]/0.7;s+=rc(f.X(l)-7,y,14,f.bot-y,'fill:var(--c1);opacity:.85')+T(f.X(l),y-4,['cat','dog','sat'][j]+' '+F(tn.p[j],3),{fs:11,a:j===2?'end':'middle'})});
    s+=ln(f.X(mu),f.top,f.X(mu),f.bot,'stroke:var(--good);stroke-width:1.5;stroke-dasharray:4 3')+T(f.X(mu)+4,f.top+8,'μ = '+F(mu,3),{fs:11,fill:'var(--good)'});
    // 2 sampling distribution, bins merged in pairs (means of 30 discrete losses sit on a lattice)
    const lo=0.45,hi=1.2;f=frame(1,'2. Averages of 30, over 20,000 samples',lo,hi,[0.5,0.75,1]);
    const k=h.cnt.length,bw=(h.hi-h.lo)/k,m=[];for(let j=0;j<k;j+=2)m.push([h.lo+j*bw,h.lo+(j+2)*bw,h.cnt[j]+(h.cnt[j+1]||0)]);
    const mx=Math.max(...m.map(v=>v[2]));m.forEach(v=>{const y=f.bot-(f.bot-f.top-22)*v[2]/mx;s+=rc(f.X(v[0])+0.5,y,f.X(v[1])-f.X(v[0])-1,f.bot-y,'fill:var(--c1);opacity:.6')});
    s+=ln(f.X(mu),f.top,f.X(mu),f.bot,'stroke:var(--good);stroke-width:1.5;stroke-dasharray:4 3');
    const yb=f.top+6;s+=ln(f.X(mu-se),yb,f.X(mu+se),yb,'stroke:var(--acc);stroke-width:2.4')+ln(f.X(mu-se),yb-4,f.X(mu-se),yb+4,'stroke:var(--acc);stroke-width:2')+ln(f.X(mu+se),yb-4,f.X(mu+se),yb+4,'stroke:var(--acc);stroke-width:2');
    s+=T(f.X(mu+se)+5,yb+4,'±1 SE = '+F(se,3),{fs:11,fill:'var(--acc)',w:600});
    // 3 one sample
    f=frame(2,'3. Your one sample of 30',lo,hi,[0.5,0.75,1]);
    const ci=b.ci.t,yc=(f.top+f.bot)/2+6;
    s+=ln(f.X(mu),f.top,f.X(mu),f.bot,'stroke:var(--good);stroke-width:1.5;stroke-dasharray:4 3')+T(f.X(mu)+4,f.top+8,'truth '+F(mu,3),{fs:11,fill:'var(--good)'});
    s+=ln(f.X(ci[0]),yc,f.X(ci[1]),yc,'stroke:var(--ink);stroke-width:2.4')+'<circle cx="'+f.X(b.mean).toFixed(1)+'" cy="'+yc+'" r="4" style="fill:var(--acc)"/>';
    s+=TH(f.X(b.mean)+3,yc-10,'mean '+F(b.mean,3),{fs:11,a:'end',fill:'var(--acc)',w:600})+TH((f.L+f.R)/2,yc+20,'95% interval ('+F(ci[0],3)+', '+F(ci[1],3)+')',{fs:11,a:'middle'});
    if(wide){[0,1].forEach(i=>{const x=(i+1)*(pw+gap)-gap/2,y=ph/2;s+='<path d="M'+(x-5)+' '+(y-6)+'L'+(x+3)+' '+y+'L'+(x-5)+' '+(y+6)+'" style="fill:none;stroke:var(--mute);stroke-width:2"/>'})}
    el.innerHTML=RD.svg(W,H,s,'Population, sampling distribution of the mean, and one sample with its 95% interval');
  });

  // ---- section 1: bias squared plus variance for three entropy estimators, exact ----
  reg('rd-est-svg',el=>{
    const W=RD.width(el),cols=W>=600?4:2,ns=['5','10','30','100'],gap=12,pw=(W-(cols-1)*gap)/cols,ph=170,rows=Math.ceil(ns.length/cols),H=rows*ph+(rows-1)*gap;
    const K=[['mc','Monte Carlo'],['plugin','plug-in'],['mm','Miller-Madow']];let s='';
    ns.forEach((n,i)=>{const ox=(i%cols)*(pw+gap),oy=Math.floor(i/cols)*(ph+gap),r=SD.entropy.by_n[n],mx=Math.max(...K.map(k=>r[k[0]].mse))*1.22;
      const top=oy+30,bot=oy+ph-30,bw=Math.min(40,(pw-24)/3-10),best=K.slice(1).reduce((a,k)=>r[k[0]].mse<r[a[0]].mse?k:a,K[1]);
      s+=rc(ox,oy,pw,ph,'fill:var(--soft);stroke:var(--line)')+T(ox+8,oy+16,'n = '+n,{fs:12,w:600})+ln(ox+8,bot,ox+pw-8,bot,'stroke:var(--mute)');
      K.forEach((k,j)=>{const v=r[k[0]],cx=ox+12+(j+0.5)*(pw-24)/3,Y=u=>bot-(bot-top)*u/mx,b2=v.bias*v.bias;
        s+=rc(cx-bw/2,Y(b2),bw,bot-Y(b2),'fill:var(--c3)')+rc(cx-bw/2,Y(b2+v.var),bw,Y(b2)-Y(b2+v.var),'fill:var(--c2);opacity:.85');
        s+=T(cx,Y(v.mse)-4,v.mse<0.01?(+v.mse).toPrecision(3):F(v.mse,4),{fs:10.5,a:'middle',w:k===best?700:400});
        s+=T(cx,bot+13,pw<200?['MC','plug-in','M-M'][j]:k[1].replace('Miller-Madow','M-Madow'),{fs:10.5,a:'middle',fill:'var(--mute)'})});
      if(n==='5')s+=T(ox+pw-8,oy+16,'plug-in wins',{fs:11,a:'end',fill:'var(--c2)',w:600});
    });
    el.innerHTML=RD.svg(W,H,s,'Mean squared error split into bias squared and variance for three entropy estimators at four sample sizes');
  });

  // ---- section 2: log-likelihood of the coin and its normal approximation ----
  (function(){const el=document.getElementById('rd-ll-svg');if(!el)return;let n=10;
    function draw(){const W=RD.width(el),H=230,L=40,R=12,Tp=12,B=32,pw=W-L-R,ph=H-Tp-B,k=0.9*n,qh=0.9,se=Math.sqrt(qh*(1-qh)/n),lo=0.5,hi=1.1,ymin=-6;
      const X=q=>L+(q-lo)/(hi-lo)*pw,Y=v=>Tp+(0-Math.max(ymin,v))/(0-ymin)*ph;let s='';
      s+=rc(X(1),Tp,X(hi)-X(1),ph,'fill:var(--soft)')+T(X(1.05),Tp+14,'q > 1',{fs:11,a:'middle',fill:'var(--mute)'})+T(X(1.05),Tp+28,'impossible',{fs:11,a:'middle',fill:'var(--mute)'});
      [0,-2,-4,-6].forEach(v=>{s+=ln(L,Y(v),W-R,Y(v),'stroke:var(--line)')+T(L-4,Y(v)+4,String(v),{fs:10.5,a:'end',fill:'var(--mute)'})});
      [0.5,0.6,0.7,0.8,0.9,1].forEach(q=>{s+=T(X(q),H-B+14,String(q),{fs:10.5,a:'middle',fill:'var(--mute)'})});
      s+=T(L+pw/2,H-3,'heads probability q; y: log-likelihood minus its maximum',{fs:10.5,a:'middle',fill:'var(--mute)'});
      const cur=[],par=[];for(let j=0;j<=400;j++){const q=lo+(hi-lo)*j/400;if(q<0.9995&&q>0)cur.push([X(q),Y(k*Math.log(q/qh)+(n-k)*Math.log((1-q)/(1-qh)))]);par.push([X(q),Y(-(q-qh)*(q-qh)/(2*se*se))])}
      s+=path(par,'fill:none;stroke:var(--c2);stroke-width:1.6;stroke-dasharray:5 3')+path(cur,'fill:none;stroke:var(--acc);stroke-width:2.2');
      const cut=-1.96*1.96/2,a=qh-1.96*se,b=qh+1.96*se;
      s+=ln(X(a),Y(cut),X(b),Y(cut),'stroke:var(--ink);stroke-width:2')+ln(X(a),Y(cut)-5,X(a),Y(cut)+5,'stroke:var(--ink);stroke-width:2')+ln(X(b),Y(cut)-5,X(b),Y(cut)+5,'stroke:var(--ink);stroke-width:2');
      s+=T(X(a)-4,Y(cut)+4,'('+F(a,3)+', '+F(b,3)+')',{fs:11,a:'end'});
      s+=T(X(0.62),Y(-4.6),'solid: log-likelihood',{fs:11,fill:'var(--acc)'})+T(X(0.62),Y(-5.3),'dashed: normal approximation',{fs:11,fill:'var(--c2)'});
      el.innerHTML=RD.svg(W,H,s,'Log-likelihood of the heads probability and its quadratic approximation');
      document.getElementById('rd-ll-cnt').innerHTML=RD.stat('MLE',F(qh,1),k+' heads of '+n)+RD.stat('curvature at the MLE',F(n/(qh*(1-qh)),1),'n / (q(1 - q))')+RD.stat('standard error',F(se,4),'1 / √curvature')+RD.stat('Wald 95% interval','('+F(a,3)+', '+F(b,3)+')',b>1?'runs past 1':'inside (0, 1)');
    }
    RD.seg(document.getElementById('rd-ll-seg'),m=>{n=+m;draw()});RD.onRender(draw);RD.onResize(draw);draw();})();

  // ---- section 3: the sum of squared deviations from a centre c ----
  reg('rd-ss-svg',el=>{
    const W=RD.width(el),H=200,L=40,R=12,Tp=12,B=46,pw=W-L-R,ph=H-Tp-B,lo=1.5,hi=9.5,ss=c=>X8.reduce((a,x)=>a+(x-c)*(x-c),0),ymax=Math.max(ss(lo),ss(hi))*1.04;
    const X=c=>L+(c-lo)/(hi-lo)*pw,Y=v=>Tp+ph-v/ymax*ph;let s='';
    [0,50,100,150].forEach(v=>{if(v>ymax)return;s+=ln(L,Y(v),W-R,Y(v),'stroke:var(--line)')+T(L-4,Y(v)+4,String(v),{fs:10.5,a:'end',fill:'var(--mute)'})});
    const pts=[];for(let j=0;j<=200;j++){const c=lo+(hi-lo)*j/200;pts.push([X(c),Y(ss(c))])}
    s+=path(pts,'fill:none;stroke:var(--acc);stroke-width:2.2');
    s+='<circle cx="'+X(5).toFixed(1)+'" cy="'+Y(32).toFixed(1)+'" r="4" style="fill:var(--acc)"/>'+T(X(5),Y(32)-9,'c = x̄ = 5: 32, the minimum',{fs:11,a:'middle',w:600,fill:'var(--acc)'});
    s+='<circle cx="'+X(7).toFixed(1)+'" cy="'+Y(ss(7)).toFixed(1)+'" r="3.5" style="fill:var(--c2)"/>'+T(X(7)+7,Y(ss(7))+4,'c = 7: '+ss(7),{fs:11,fill:'var(--c2)'});
    const cnt={};X8.forEach(x=>{cnt[x]=(cnt[x]||0)+1;s+='<circle cx="'+X(x).toFixed(1)+'" cy="'+(Tp+ph+8+(cnt[x]-1)*7)+'" r="3" style="fill:var(--ink)"/>'});
    [2,3,4,5,6,7,8,9].forEach(c=>{s+=T(X(c),H-4,String(c),{fs:10.5,a:'middle',fill:'var(--mute)'})});
    s+=T(L+6,Tp+12,'sum of (xᵢ − c)² against the centre c',{fs:11,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,s,'Sum of squared deviations against the centre, with the eight data points below');
  });

  // ---- section 7: the null distribution of heads in 10 fair flips ----
  reg('rd-null-svg',el=>{
    const W=RD.width(el),nar=W<480,H=nar?206:190,L=12,R=12,Tp=nar?40:22,B=34,pw=W-L-R,ph=H-Tp-B,C=[1,10,45,120,210,252,210,120,45,10,1],bw=pw/11;
    const Y=v=>Tp+ph-v/252*ph;let s='';
    C.forEach((c,k)=>{const tail=k>=9||k<=1,x=L+k*bw;s+=rc(x+2,Y(c),bw-4,Tp+ph-Y(c),'fill:'+(tail?'var(--c2)':'var(--dim)'));
      if(W>=480||tail||k===5)s+=T(x+bw/2,Y(c)-4,c+(W>=480?'':''),{fs:10.5,a:'middle',fill:tail?'var(--c2)':'var(--mute)'});
      s+=T(x+bw/2,Tp+ph+14,String(k),{fs:10.5,a:'middle',fill:'var(--mute)',w:k===9?700:400})});
    s+=T(L+9.5*bw,Tp+ph+28,'observed: 9',{fs:11,a:'middle',fill:'var(--c2)',w:600});
    s+=T(L+2,nar?12:Tp-8,'ways out of 1,024',{fs:11,fill:'var(--mute)'})+T(nar?L+2:W-R,nar?27:Tp-8,'orange: as extreme as 9, total 22',{fs:11,a:nar?'start':'end',fill:'var(--c2)'});
    el.innerHTML=RD.svg(W,H,s,'Binomial distribution of heads in ten fair flips with both tails shaded');
  });

  // ---- section 7: power of a two-sided z-test for a half-standard-deviation shift ----
  (function(){const el=document.getElementById('rd-pow-svg'),sl=document.getElementById('rd-pow-n');if(!el||!sl)return;
    function draw(){const n=+sl.value,d=0.5,sh=d*Math.sqrt(n),z=1.959964,pow=Phi(sh-z)+Phi(-sh-z);document.getElementById('rd-pow-nv').textContent=n;
      const W=RD.width(el),H=200,L=12,R=12,Tp=14,B=30,pw=W-L-R,ph=H-Tp-B,lo=-4,hi=9,X=v=>L+(v-lo)/(hi-lo)*pw,Y=v=>Tp+ph-v/0.42*ph;let s='';
      const area=(f,a,b,st)=>{const p=[[X(a),Y(0)]];for(let j=0;j<=80;j++){const v=a+(b-a)*j/80;p.push([X(v),Y(f(v))])}p.push([X(b),Y(0)]);return path(p,st)};
      const f0=v=>npdf(v),f1=v=>npdf(v-sh);
      s+=area(f1,z,hi,'fill:var(--c1);opacity:.35;stroke:none')+area(f1,lo,-z,'fill:var(--c1);opacity:.35;stroke:none')+area(f0,z,hi,'fill:var(--c2);opacity:.6;stroke:none')+area(f0,lo,-z,'fill:var(--c2);opacity:.6;stroke:none');
      const cv=(f,st)=>{const p=[];for(let j=0;j<=260;j++){const v=lo+(hi-lo)*j/260;p.push([X(v),Y(f(v))])}return path(p,st)};
      s+=cv(f0,'fill:none;stroke:var(--mute);stroke-width:1.8')+cv(f1,'fill:none;stroke:var(--c1);stroke-width:2.2');
      [-z,z].forEach(v=>{s+=ln(X(v),Tp,X(v),Tp+ph,'stroke:var(--ink);stroke-dasharray:3 3')});
      s+=ln(L,Y(0),W-R,Y(0),'stroke:var(--mute)');[-4,-2,0,2,4,6,8].forEach(v=>{s+=T(X(v),H-B+14,String(v),{fs:10.5,a:'middle',fill:'var(--mute)'})});
      s+=T(X(0),Y(0.4)-2,'no effect',{fs:11,a:'middle',fill:'var(--mute)'})+T(Math.min(X(sh),W-R-30),Y(0.4)-2,'shift 0.5σ × √n = '+F(sh,2),{fs:11,a:X(sh)>W*0.6?'end':'middle',fill:'var(--c1)'});
      if(W>=520)s+=T(X(-z)-4,Tp+12,'reject beyond ±1.96',{fs:11,a:'end'});
      s+=T(L+pw/2,H-2,'test statistic z',{fs:10.5,a:'middle',fill:'var(--mute)'});
      el.innerHTML=RD.svg(W,H,s,'Null and alternative distributions of the z statistic with the rejection regions shaded');
      document.getElementById('rd-pow-cnt').innerHTML=RD.stat('n',n,'observations')+RD.stat('power',F(100*pow,1)+'%','blue area beyond the lines')+RD.stat('false-positive rate','5.0%','orange area, set by α')+RD.stat('80% power needs','n = 32','31.4 rounded up');
    }
    sl.addEventListener('input',draw);RD.onRender(draw);RD.onResize(draw);draw();})();

  // ---- section 8: the sign-flip permutation distribution of eight differences ----
  reg('rd-perm-svg',el=>{
    const d=SD.ex.perm,obs=d.reduce((a,b)=>a+b,0)/d.length,ms=[];
    for(let m=0;m<256;m++){let t=0;for(let i=0;i<8;i++)t+=((m>>i)&1?-1:1)*d[i];ms.push(t/8)}
    const W=RD.width(el),bwid=0.02,bins={};ms.forEach(v=>{const b=Math.round(v/bwid);(bins[b]=bins[b]||[]).push(v)});
    const mxc=Math.max(...Object.values(bins).map(a=>a.length)),r=W<480?2.2:2.8,H=Math.max(150,mxc*(2*r+1)+60),L=12,R=12,Tp=20,B=30,pw=W-L-R,ph=H-Tp-B,lo=-0.24,hi=0.24;
    const X=v=>L+(v-lo)/(hi-lo)*pw;let s='',ext=0;
    Object.keys(bins).forEach(b=>{bins[b].sort((p,q)=>Math.abs(p)-Math.abs(q)).forEach((v,j)=>{const e=Math.abs(v)>=Math.abs(obs)-1e-12;if(e)ext++;s+='<circle cx="'+X(b*bwid).toFixed(1)+'" cy="'+(Tp+ph-r-j*(2*r+1)).toFixed(1)+'" r="'+r+'" style="fill:'+(e?'var(--c2)':'var(--dim)')+'"/>'})});
    [-obs,obs].forEach(v=>{s+=ln(X(v),Tp,X(v),Tp+ph,'stroke:var(--c2);stroke-dasharray:3 3')});
    s+=T(X(obs)+4,Tp-6,'observed '+F(obs,4),{fs:11,fill:'var(--c2)',a:X(obs)>W*0.7?'end':'start'})+T(L,Tp-6,ext+' of 256 as extreme',{fs:11,w:600});
    s+=ln(L,Tp+ph,W-R,Tp+ph,'stroke:var(--mute)');[-0.2,-0.1,0,0.1,0.2].forEach(v=>{s+=T(X(v),H-B+14,String(v),{fs:10.5,a:'middle',fill:'var(--mute)'})});
    s+=T(L+pw/2,H-2,'mean difference under one sign pattern',{fs:10.5,a:'middle',fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,s,'Dot plot of the 256 sign-flip means with the observed mean marked');
  });

  // ---- section 9: ten sorted p-values against Bonferroni, Holm and Benjamini-Hochberg thresholds ----
  reg('rd-bh-svg',el=>{
    const pv=SD.ex.pv.slice().sort((a,b)=>a-b),m=pv.length,a=0.05,W=RD.width(el),H=230,L=46,R=14,Tp=12,B=34,pw=W-L-R,ph=H-Tp-B,lo=Math.log10(0.0005),hi=0;
    const X=k=>L+(k-0.5)/m*pw,Y=v=>Tp+(hi-Math.log10(v))/(hi-lo)*ph;let s='';
    [0.001,0.01,0.1,1].forEach(v=>{s+=ln(L,Y(v),W-R,Y(v),'stroke:var(--line)')+T(L-4,Y(v)+4,String(v),{fs:10.5,a:'end',fill:'var(--mute)'})});
    let bh=0;pv.forEach((p,i)=>{if(p<=(i+1)*a/m)bh=i+1});
    const thr=(f,st)=>{const p=[];for(let k=1;k<=m;k++){p.push([X(k)-pw/m/2,Y(f(k))]);p.push([X(k)+pw/m/2,Y(f(k))])}return path(p,st)};
    s+=thr(()=>a,'fill:none;stroke:var(--mute);stroke-width:1.5')+thr(()=>a/m,'fill:none;stroke:var(--c4);stroke-width:1.5')+thr(k=>a/(m-k+1),'fill:none;stroke:var(--c3);stroke-width:1.8;stroke-dasharray:5 3')+thr(k=>k*a/m,'fill:none;stroke:var(--c1);stroke-width:2');
    pv.forEach((p,i)=>{s+='<circle cx="'+X(i+1).toFixed(1)+'" cy="'+Y(p).toFixed(1)+'" r="4.5" style="fill:'+(i<bh?'var(--c1)':'var(--bg)')+';stroke:var(--ink);stroke-width:1.3"/>';s+=T(X(i+1),H-B+14,String(i+1),{fs:10.5,a:'middle',fill:'var(--mute)'})});
    s+=T(X(m)+pw/m/2,Y(a)-5,'uncorrected 0.05',{fs:11,a:'end',fill:'var(--mute)'})+T(X(m)+pw/m/2,Y(a/m)+14,'Bonferroni 0.005',{fs:11,a:'end',fill:'var(--c4)'});
    s+=T(X(1.6),Y(0.026),'BH k×0.005',{fs:11,fill:'var(--c1)',w:600})+T(X(7),Y(a/(m-7+1))+15,'Holm 0.05/(11−k)',{fs:11,fill:'var(--c3)'});
    s+=T(L+pw/2,H-2,W<520?'rank k; filled: rejected by BH':'rank k of the sorted p-value; filled: rejected by Benjamini-Hochberg',{fs:10.5,a:'middle',fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,s,'Sorted p-values against the uncorrected, Bonferroni, Holm and Benjamini-Hochberg thresholds');
  });

  // ---- section 10: conjugate Beta prior and posterior for 9 heads in 10 ----
  (function(){const el=document.getElementById('rd-post-svg');if(!el)return;let pr='unif';const AB={unif:[1,1],scep:[5,5],jeff:[0.5,0.5]};
    function draw(){const [a,b]=AB[pr],A=a+9,Bb=b+1,lo=E['conj_'+pr+'_lo'],hi=E['conj_'+pr+'_hi'],W=RD.width(el),H=210,L=12,R=12,Tp=16,B=30,pw=W-L-R,ph=H-Tp-B;
      const qs=[];for(let j=1;j<400;j++)qs.push(j/400);const post=qs.map(q=>bpdf(q,A,Bb)),prior=qs.map(q=>bpdf(q,a,b)),ym=Math.max(...post)*1.12;
      const X=q=>L+q*pw,Y=v=>Tp+ph-Math.min(v,ym)/ym*ph;let s='';
      const sh=[[X(lo),Y(0)]];qs.forEach((q,j)=>{if(q>=lo&&q<=hi)sh.push([X(q),Y(post[j])])});sh.push([X(hi),Y(0)]);s+=path(sh,'fill:var(--acc2);stroke:none');
      s+=path(qs.map((q,j)=>[X(q),Y(prior[j])]),'fill:none;stroke:var(--mute);stroke-width:1.6;stroke-dasharray:5 3')+path(qs.map((q,j)=>[X(q),Y(post[j])]),'fill:none;stroke:var(--acc);stroke-width:2.2');
      s+=ln(X(0.5),Tp,X(0.5),Tp+ph,'stroke:var(--line);stroke-dasharray:2 3')+ln(L,Y(0),W-R,Y(0),'stroke:var(--mute)');
      [0,0.25,0.5,0.75,1].forEach(q=>{s+=T(X(q),H-B+14,String(q),{fs:10.5,a:q===0?'start':q===1?'end':'middle',fill:'var(--mute)'})});
      s+=T(X(lo)-4,Tp+ph-8,F(lo,3),{fs:11,a:'end',fill:'var(--acc)'})+T(Math.min(X(hi)+4,W-R-34),Tp+ph-8,F(hi,3),{fs:11,fill:'var(--acc)'});
      s+=T(L+4,Tp+2,'prior Beta('+a+', '+b+'), dashed',{fs:11,fill:'var(--mute)'})+T(L+4,Tp+17,'posterior Beta('+A+', '+Bb+'), solid',{fs:11,fill:'var(--acc)',w:600});
      s+=T(L+pw/2,H-2,'heads probability q',{fs:10.5,a:'middle',fill:'var(--mute)'});
      el.innerHTML=RD.svg(W,H,s,'Prior and posterior Beta densities with the 95% credible interval shaded');
      document.getElementById('rd-post-cnt').innerHTML=RD.stat('posterior mean',F(E['conj_'+pr+'_mean'],3),'('+a+' + 9) / ('+(a+b)+' + 10)')+RD.stat('95% credible interval','('+F(lo,3)+', '+F(hi,3)+')','equal-tailed')+RD.stat('P(q > 0.5 | data)',F(E['conj_'+pr+'_pgt'],3),'');
    }
    RD.seg(document.getElementById('rd-post-seg'),m=>{pr=m;draw()});RD.onRender(draw);RD.onResize(draw);draw();})();

  // ---- section 11: least squares and ridge on the eight points ----
  (function(){const el=document.getElementById('rd-reg-svg'),sl=document.getElementById('rd-reg-l');if(!el||!sl)return;
    const xs=X8.map((_,i)=>i+1),xb=4.5,yb=5,Sxx=E.reg_Sxx,Sxy=E.reg_Sxy,s0=E.reg_s;
    function draw(){const lam=+sl.value,b1=Sxy/(Sxx+lam),b0=yb-b1*xb,o1=Sxy/Sxx,o0=yb-o1*xb;document.getElementById('rd-reg-lv').textContent=lam;
      const W=RD.width(el),H=210,L=30,R=12,Tp=12,B=28,pw=W-L-R,ph=H-Tp-B,X=x=>L+(x-0.5)/8*pw,Y=y=>Tp+ph-(y-0)/10*ph;let s='';
      [0,5,10].forEach(v=>{s+=ln(L,Y(v),W-R,Y(v),'stroke:var(--line)')+T(L-4,Y(v)+4,String(v),{fs:10.5,a:'end',fill:'var(--mute)'})});
      xs.forEach(x=>{s+=T(X(x),H-B+14,String(x),{fs:10.5,a:'middle',fill:'var(--mute)'})});
      s+=ln(X(0.5),Y(o0+o1*0.5),X(8.5),Y(o0+o1*8.5),'stroke:var(--mute);stroke-width:1.6;stroke-dasharray:5 3')+ln(X(0.5),Y(b0+b1*0.5),X(8.5),Y(b0+b1*8.5),'stroke:var(--acc);stroke-width:2.4');
      xs.forEach((x,i)=>{s+='<circle cx="'+X(x).toFixed(1)+'" cy="'+Y(X8[i]).toFixed(1)+'" r="4" style="fill:var(--ink)"/>'});
      s+=T(X(8.5),Y(b0+b1*8.5)+(lam>5?-8:16),'ridge slope '+F(b1,4),{fs:11,a:'end',fill:'var(--acc)',w:600});
      s+=T(L+4,Tp+12,'least squares slope '+F(o1,4)+' (dashed)',{fs:11,fill:'var(--mute)'});
      el.innerHTML=RD.svg(W,H,s,'Eight points with the least-squares line and the ridge line');
      document.getElementById('rd-reg-cnt').innerHTML=RD.stat('λ',lam,'σ² / τ²')+RD.stat('slope',F(b1,4),'Sₓᵧ / (Sₓₓ + λ)')+RD.stat('prior sd τ',lam?F(s0/Math.sqrt(lam),3):'none','s / √λ')+RD.stat('shrinkage',F(100*(1-b1/o1),1)+'%','of the least-squares slope');
    }
    sl.addEventListener('input',draw);RD.onRender(draw);RD.onResize(draw);draw();})();

  // ---- section 14: the ten models of 10-fold cross-validation ----
  reg('rd-fold-svg',el=>{
    const W=RD.width(el),K=10,L=W<480?26:66,R=8,Tp=20,cw=(W-L-R)/K,chh=Math.min(18,cw*0.7),H=Tp+K*(chh+3)+4;let s='';
    for(let j=0;j<K;j++)s+=T(L+(j+0.5)*cw,Tp-6,W<480?String(j+1):'fold '+(j+1),{fs:10.5,a:'middle',fill:'var(--mute)'});
    for(let i=0;i<K;i++){const y=Tp+i*(chh+3);s+=T(L-6,y+chh-4,W<480?String(i+1):'model '+(i+1),{fs:10.5,a:'end',fill:'var(--mute)'});
      for(let j=0;j<K;j++)s+=rc(L+j*cw+1,y,cw-2,chh,i===j?'fill:var(--c2)':'fill:var(--c1);opacity:'+(i<2?0.55:0.25))}
    el.innerHTML=RD.svg(W,H,s,'Ten-fold cross-validation: each model holds out one fold and trains on the other nine');
  });
})();
