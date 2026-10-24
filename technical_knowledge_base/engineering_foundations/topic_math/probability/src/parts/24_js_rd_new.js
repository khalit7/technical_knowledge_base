// ---- Reading visuals added in the 2026-10-24 rebuild: hero (top), density (s1), LLN and CLT (s4), temperature (s6), reparameterisation (s11) ----
// Numbers are checked against src/recompute.py (expected.json) by src/check_page.mjs.
(function(){
  const $=id=>document.getElementById(id);
  const z=[2,1,0],W3=['cat','dog','sat'],COL=['var(--c1)','var(--c3)','var(--c2)'];
  const ez=z.map(Math.exp),S=ez.reduce((a,b)=>a+b),p=ez.map(v=>v/S);
  const T=RD.t,f=PM.f;
  const box=(x,y,w,h,txt,o)=>{o=o||{};return '<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+w.toFixed(1)+'" height="'+h+'" rx="5" fill="'+(o.fill||'var(--soft)')+'" stroke="'+(o.stroke||'var(--line)')+'"/>'+T(x+w/2,y+h/2+4,txt,{a:'middle',fs:o.fs||12,fill:o.ink||'var(--ink)',w:o.w})};

  // ---------- hero: scores -> softmax -> bars; score it (loss) and draw from it (CDF strip) ----------
  function hero(){const el=$('rd-hero');if(!el)return;
    const W=Math.min(RD.width(el),760),L=8,R=W-8;let g='';
    const bw=Math.min(96,(R-L-60)/3),gap=(R-L-60-3*bw)/2;
    g+=T(L,22,'scores z',{fill:'var(--mute)'});
    for(let k=0;k<3;k++){const x=L+60+k*(bw+gap);g+=box(x,6,bw,26,W3[k]+': '+z[k],{})}
    g+=T(L,56,'↓ softmax',{fill:'var(--ink)',w:600})+T(R,56,'reshape here: z / T, or + ln prior',{a:'end',fill:'var(--mute)'});
    const x0=L+40,xm=R-50;
    for(let k=0;k<3;k++){const y=68+k*24,w=(xm-x0)*p[k];
      g+=T(x0-6,y+14,W3[k],{a:'end'});
      g+='<rect x="'+x0+'" y="'+y+'" width="'+w.toFixed(1)+'" height="18" rx="2" fill="'+COL[k]+'"'+(k===2?' stroke="var(--acc)" stroke-width="2"':'')+'/>';
      g+=T(x0+w+6,y+14,f(p[k],3),{w:k===2?600:400})}
    g+=T(L,158,W<480?'score it: truth sat, loss −ln 0.090 = 2.408':'score it: the truth was sat, so the loss is −ln 0.090 = 2.408',{fill:'var(--acc)',w:600});
    // CDF strip
    const sx0=L+40,sx1=R-10,sw=sx1-sx0,cy=196;let c=0;
    g+=T(L,cy+15,'CDF',{fill:'var(--mute)'});
    for(let k=0;k<3;k++){const x=sx0+sw*c,w=sw*p[k];g+='<rect x="'+x.toFixed(1)+'" y="'+cy+'" width="'+w.toFixed(1)+'" height="22" fill="'+COL[k]+'" fill-opacity=".55" stroke="var(--bg)"/>'+T(x+w/2,cy+15,W3[k],{a:'middle',fs:11});c+=p[k]}
    [[0,'0'],[p[0],'0.665'],[p[0]+p[1],'0.910'],[1,W<480?'':'1']].forEach(([v,s],i)=>{const x=sx0+sw*v;g+='<line x1="'+x.toFixed(1)+'" y1="'+(cy+22)+'" x2="'+x.toFixed(1)+'" y2="'+(cy+27)+'" stroke="var(--mute)"/>'+T(x,cy+39,s,{a:i===0?'start':i===3?'end':'middle',fill:'var(--mute)',fs:11})});
    const ux=sx0+sw*0.7;g+='<path d="M'+ux.toFixed(1)+' '+(cy-2)+' l-5 -8 h10 z" fill="var(--ink)"/>'+T(ux-8,cy-6,'draw: u = 0.7 lands on dog',{a:'end',fill:'var(--ink)',w:600});
    el.innerHTML=RD.svg(W,cy+46,g,'Scores become a distribution by softmax; the distribution is scored by the log-probability of the truth and sampled through its CDF');
  }

  // ---------- density is not probability ----------
  function dens(){const el=$('rd-dens');if(!el)return;
    const W=Math.min(RD.width(el),620),H=200,L=40,R=W-10,Tp=14,B=H-30,sd=0.1;
    const X=x=>L+(R-L)*(x+0.4)/0.8,Y=y=>B-(B-Tp)*y/4.4,pdf=x=>Math.exp(-x*x/(2*sd*sd))/Math.sqrt(2*Math.PI*sd*sd);
    let g='<line x1="'+L+'" y1="'+B+'" x2="'+R+'" y2="'+B+'" stroke="var(--mute)"/><line x1="'+L+'" y1="'+Tp+'" x2="'+L+'" y2="'+B+'" stroke="var(--mute)"/>';
    let sh='M'+X(-0.1).toFixed(1)+' '+B;for(let i=0;i<=40;i++){const x=-0.1+0.2*i/40;sh+='L'+X(x).toFixed(1)+' '+Y(pdf(x)).toFixed(1)}sh+='L'+X(0.1).toFixed(1)+' '+B+'Z';
    g+='<path d="'+sh+'" fill="var(--acc2)"/>';
    let cu='';for(let i=0;i<=160;i++){const x=-0.4+0.8*i/160;cu+=(i?'L':'M')+X(x).toFixed(1)+' '+Y(pdf(x)).toFixed(1)}
    g+='<path d="'+cu+'" fill="none" stroke="var(--c1)" stroke-width="2.2"/>';
    g+='<line x1="'+L+'" y1="'+Y(1)+'" x2="'+R+'" y2="'+Y(1)+'" stroke="var(--bad)" stroke-dasharray="4 3"/>'+T(R,Y(1)-4,'density 1',{a:'end',fill:'var(--bad)'});
    [0,1,2,3,4].forEach(v=>{g+=T(L-4,Y(v)+4,v,{a:'end',fill:'var(--mute)'})});
    [-0.3,-0.1,0,0.1,0.3].forEach(v=>{g+=T(X(v),B+14,v,{a:'middle',fill:'var(--mute)'})});
    g+=T(X(0.07),Y(3.95),'peak 3.989',{fill:'var(--c1)',w:600});
    g+=T(X(0),Y(0.6),'area 0.6827',{a:'middle',fill:'var(--ink)',w:600});
    g+=T((L+R)/2,H-2,'x',{a:'middle',fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,g,'Gaussian density with standard deviation 0.1: peak 3.989, area within one standard deviation 0.6827');
  }

  // ---------- LLN and CLT on the tiny model's token loss ----------
  const NS=[1,2,4,10,30,100,1000],REP=2000,cdf=[p[0],p[0]+p[1]],fl=p.map(v=>-Math.log(v));
  const mu=-p.reduce((s,v)=>s+v*Math.log(v),0),sdf=Math.sqrt(p.reduce((s,v,i)=>s+v*(fl[i]-mu)**2,0));
  const pick=u=>u<cdf[0]?0:u<cdf[1]?1:2;
  let CL=null;
  function cltData(){if(CL)return CL;CL=[];
    NS.forEach(n=>{const r=PM.rng(31000+n),ms=new Float64Array(REP),js=new Int32Array(REP);
      for(let i=0;i<REP;i++){let s=0,j=0;for(let d=0;d<n;d++){const k=pick(r());s+=fl[k];j+=k}ms[i]=s/n;js[i]=j}
      let m=0;for(let i=0;i<REP;i++)m+=ms[i];m/=REP;let v=0;for(let i=0;i<REP;i++)v+=(ms[i]-m)**2;const sd=Math.sqrt(v/REP),th=sdf/Math.sqrt(n);
      let ins=0;for(let i=0;i<REP;i++)if(Math.abs(ms[i]-mu)<=1.96*th)ins++;
      CL.push({n,m,sd,th,inside:ins/REP,js})});
    const r=PM.rng(5);let s=0;CL.run=[];for(let i=1;i<=1000;i++){s+=fl[pick(r())];CL.run.push(s/i)}
    return CL}
  function clt(i){const el=$('rd-clt');if(!el)return;const D=cltData(),d=D[i],n=d.n;
    const W=Math.min(RD.width(el),760),L=40,R=W-12;let g='';
    // top: running mean, log x
    const t0=8,t1=118,ylo=0.3,yhi=1.6,lx=v=>L+(R-L)*Math.log10(v)/3,ly=v=>t1-(t1-t0)*(Math.min(yhi,Math.max(ylo,v))-ylo)/(yhi-ylo);
    let band='';const pts=[];for(let k=0;k<=60;k++){const v=Math.pow(10,3*k/60);pts.push(v)}
    band='M'+pts.map(v=>lx(v).toFixed(1)+' '+ly(mu+1.96*sdf/Math.sqrt(v)).toFixed(1)).join('L')+'L'+pts.slice().reverse().map(v=>lx(v).toFixed(1)+' '+ly(mu-1.96*sdf/Math.sqrt(v)).toFixed(1)).join('L')+'Z';
    g+='<path d="'+band+'" fill="var(--acc2)" fill-opacity=".7"/>';
    g+='<line x1="'+L+'" y1="'+ly(mu)+'" x2="'+R+'" y2="'+ly(mu)+'" stroke="var(--ink)" stroke-dasharray="4 3"/>'+T(R,ly(mu)-4,'true mean 0.832',{a:'end',fill:'var(--ink)'});
    let ln='';for(let k=1;k<=n;k++)ln+=(k>1?'L':'M')+lx(k).toFixed(1)+' '+ly(D.run[k-1]).toFixed(1);
    if(n===1)g+='<circle cx="'+lx(1)+'" cy="'+ly(D.run[0])+'" r="3" fill="var(--c2)"/>';else g+='<path d="'+ln+'" fill="none" stroke="var(--c2)" stroke-width="2"/>';
    g+='<line x1="'+L+'" y1="'+t1+'" x2="'+R+'" y2="'+t1+'" stroke="var(--mute)"/>';
    [1,10,100,1000].forEach(v=>{g+=T(lx(v),t1+13,v.toLocaleString('en-US'),{a:v===1?'start':v===1000?'end':'middle',fill:'var(--mute)',fs:11})});
    [0.5,1,1.5].forEach(v=>{g+=T(L-4,ly(v)+4,v,{a:'end',fill:'var(--mute)',fs:11})});
    g+=T(L+4,t0+10,'running mean of one stream, n on a log axis',{fill:'var(--mute)',fs:11});
    // bottom: histogram of 2,000 averages
    const b0=150,b1=300,xa=0.2,xb=2.6,hx=v=>L+(R-L)*(v-xa)/(xb-xa);
    const step=1/n,k=step>=0.05?1:Math.max(1,Math.round(0.05*n)),bw=k*step,cnt={};
    d.js.forEach(j=>{const b=Math.floor(j/k);cnt[b]=(cnt[b]||0)+1});
    const gpdf=x=>Math.exp(-((x-mu)**2)/(2*d.th*d.th))/(Math.sqrt(2*Math.PI)*d.th);
    let ymax=gpdf(mu);Object.values(cnt).forEach(c=>{ymax=Math.max(ymax,c/(REP*bw))});ymax*=1.1;
    const hy=v=>b1-(b1-b0)*v/ymax;
    Object.keys(cnt).forEach(b=>{const lo=fl[0]+(+b*k-0.5)/n,hi=lo+bw,c=cnt[b],wpx=step>=0.05?Math.max(3,Math.min(14,(hx(hi)-hx(lo))*0.5)):Math.max(2,(hx(hi)-hx(lo))*0.92);
      const cx=(hx(lo)+hx(hi))/2;g+='<rect x="'+(cx-wpx/2).toFixed(1)+'" y="'+hy(c/(REP*bw)).toFixed(1)+'" width="'+wpx.toFixed(1)+'" height="'+(b1-hy(c/(REP*bw))).toFixed(1)+'" fill="var(--c2)" fill-opacity=".75"/>'});
    let gc='';for(let q=0;q<=200;q++){const x=xa+(xb-xa)*q/200;gc+=(q?'L':'M')+hx(x).toFixed(1)+' '+hy(gpdf(x)).toFixed(1)}
    g+='<path d="'+gc+'" fill="none" stroke="var(--c1)" stroke-width="2"/>';
    g+='<line x1="'+L+'" y1="'+b1+'" x2="'+R+'" y2="'+b1+'" stroke="var(--mute)"/>';
    [0.408,0.832,1.408,2.408].forEach(v=>{g+='<line x1="'+hx(v).toFixed(1)+'" y1="'+b1+'" x2="'+hx(v).toFixed(1)+'" y2="'+(b1+4)+'" stroke="var(--mute)"/>'});
    [[0.408,'0.408'],[1.408,'1.408'],[2.408,'2.408']].forEach(([v,s])=>{g+=T(hx(v),b1+15,s,{a:'middle',fill:'var(--mute)',fs:11})});
    g+=T(L+4,b0+4,'2,000 averages (bars) against the CLT curve',{fill:'var(--mute)',fs:11});
    el.innerHTML=RD.svg(W,b1+22,g,'Law of large numbers and central limit theorem on the tiny model');
    const caps={1:'<div class="t">n = 1: each "average" is one token loss</div><p>Three spikes at 0.408, 1.408 and 2.408, nothing like a bell. The ±1.96 band catches only '+f(100*d.inside,1)+'% of them, not 95%: the Gaussian rule needs averaging first.</p>',
      2:'<div class="t">n = 2: five possible averages</div><p>The spikes start to fill in towards the middle; the spread is already 1/√2 of one draw\'s.</p>',
      4:'<div class="t">n = 4: the shape is rounding off</div><p>Skewed to the right still (the bet piles mass on the cheap word cat), but the curve is a fair summary.</p>',
      10:'<div class="t">n = 10: close to Gaussian</div><p>Spread '+f(d.sd,3)+' against the CLT\'s 0.651/√10 = '+f(d.th,3)+'; '+f(100*d.inside,1)+'% of averages inside ±1.96 standard errors.</p>',
      30:'<div class="t">n = 30</div><p>Spread '+f(d.sd,3)+' (theory '+f(d.th,3)+'). The running mean of one stream has settled inside its band.</p>',
      100:'<div class="t">n = 100: about ±0.065</div><p>Spread '+f(d.sd,3)+' against 0.651/√100 = '+f(d.th,3)+': a 100-token average pins the mean loss to about ±0.065 per standard error.</p>',
      1000:'<div class="t">n = 1,000: ten times the samples, about a third of the error</div><p>Spread '+f(d.sd,4)+' against '+f(d.th,4)+'; the running mean reads '+f(D.run[999],3)+', inside 0.832 ± '+f(1.96*d.th,3)+'. Error shrinks like 1/√n: the law of large numbers says where it goes, the CLT says how fast and in what shape.</p>'};
    $('rd-clt-cap').innerHTML=caps[n];
    $('rd-clt-cnt').innerHTML=RD.stat('Draws per average',n.toLocaleString('en-US'),'2,000 averages')+RD.stat('Spread of the averages',f(d.sd,4),'standard deviation, measured')+
      RD.stat('CLT prediction',f(d.th,4),'0.651 / √n')+RD.stat('Inside ±1.96 SE',f(100*d.inside,1)+'%','Gaussian rule: 95%')+RD.stat('One stream at n',f(D.run[n-1],4),'running mean');
    el.dataset.n=n;el.dataset.sd=f(d.sd,4);el.dataset.inside=f(d.inside,4);el.dataset.run=f(D.run[n-1],4);el.dataset.mean=f(d.m,4);
  }
  if($('rd-clt')){const an=RD.anim({card:'rd-clt-card',ctl:'rd-clt-ctl',n:NS.length,draw:clt,ms:1600,label:'Draws per average'});RD.onResize(()=>an.redraw())}

  // ---------- temperature ----------
  const TS=[0.1,0.25,0.5,0.75,1,1.5,2,3,5,10];
  function temp(){const el=$('rd-temp');if(!el)return;const Tv=TS[+$('rd-temp-t').value];
    const e=z.map(v=>Math.exp(v/Tv)),s=e.reduce((a,b)=>a+b),q=e.map(v=>v/s),H=-q.reduce((a,v)=>a+(v>0?v*Math.log(v):0),0);
    $('rd-temp-v').textContent=String(Tv);
    const W=Math.min(RD.width(el),640),L=46,R=W-58;let g='';
    for(let k=0;k<3;k++){const y=6+k*34,w=(R-L)*q[k];
      g+=T(L-6,y+17,W3[k],{a:'end'})+'<rect x="'+L+'" y="'+y+'" width="'+(R-L)+'" height="24" fill="var(--soft)"/>';
      g+='<rect x="'+L+'" y="'+y+'" width="'+w.toFixed(1)+'" height="24" fill="'+COL[k]+'"/>';
      const x1=L+(R-L)*p[k];g+='<line x1="'+x1.toFixed(1)+'" y1="'+(y-2)+'" x2="'+x1.toFixed(1)+'" y2="'+(y+26)+'" stroke="var(--ink)" stroke-width="2" stroke-dasharray="3 2"/>';
      g+=T(R+6,y+17,f(q[k],3),{w:600})}
    g+=T(L,6+3*34+12,'dashed ticks: the model\'s own bet at T = 1',{fill:'var(--mute)',fs:11});
    el.innerHTML=RD.svg(W,6+3*34+18,g,'Softmax of the tiny model scores at temperature '+Tv);
    $('rd-temp-out').innerHTML=RD.stat('p at T = '+Tv,'('+q.map(v=>f(v,3)).join(', ')+')','cat, dog, sat')+RD.stat('Entropy',f(H,3)+' nats','ceiling ln 3 = 1.099')+
      RD.stat('p(cat) / p(dog)',f(Math.exp(1/Tv),Tv<0.3?0:3),'e<sup>1/T</sup>: the gap of 1, divided by T')+RD.stat('Top word','cat','at every T > 0');
    el.dataset.p=q.map(v=>f(v,3)).join(',');el.dataset.h=f(H,3);
  }
  if($('rd-temp')){$('rd-temp-t').addEventListener('input',temp);temp();RD.onRender(temp);RD.onResize(temp)}

  // ---------- reparameterisation: two computation paths and their variances ----------
  function rep(){const el=$('rd-rep');if(!el)return;
    const W=Math.min(RD.width(el),720),cw=(W-16)/3,bw=Math.min(150,cw-22),cx=k=>8+cw*k+cw/2;let g='';
    const arrow=(x1,y1,x2,y2,o)=>{o=o||{};return '<line x1="'+x1.toFixed(1)+'" y1="'+y1+'" x2="'+(x2-6).toFixed(1)+'" y2="'+y2+'" stroke="'+(o.c||'var(--mute)')+'" stroke-width="'+(o.sw||1.6)+'"'+(o.dash?' stroke-dasharray="4 3"':'')+'/><path d="M'+x2.toFixed(1)+' '+y2+' l-7 -4 v8 z" fill="'+(o.c||'var(--mute)')+'"/>'};
    // row A: score function
    g+=T(8,14,'Score function: no path through the sample',{fill:'var(--bad)',w:600,fs:12});
    g+=box(cx(0)-bw/2,24,bw,28,'μ',{fs:11})+box(cx(1)-bw/2,24,bw,28,'x ~ N(μ, 1)',{fs:11})+box(cx(2)-bw/2,24,bw,28,'f(x) = x²',{fs:11});
    g+=arrow(cx(0)+bw/2,38,cx(1)-bw/2,38,{dash:true})+T((cx(0)+cx(1))/2,64,'✕ no derivative',{a:'middle',fill:'var(--bad)',fs:11})+arrow(cx(1)+bw/2,38,cx(2)-bw/2,38,{});
    g+=T(8,84,'estimate f(x) · ∂ln p/∂μ: uses only f\'s value',{fill:'var(--mute)',fs:11});
    // row B: pathwise
    const yb=112;
    g+=T(8,yb,'Pathwise: x = μ + ε, the noise is an input',{fill:'var(--good)',w:600,fs:12});
    g+=box(cx(0)-bw/2,yb+12,bw,28,'ε ~ N(0, 1)',{fs:11})+box(cx(0)-bw/2,yb+48,bw,28,'μ',{fs:11})+box(cx(1)-bw/2,yb+30,bw,28,'x = μ + ε',{fill:'var(--acc2)',stroke:'var(--acc)',fs:11})+box(cx(2)-bw/2,yb+30,bw,28,'f(x) = x²',{fs:11});
    g+=arrow(cx(0)+bw/2,yb+26,cx(1)-bw/2,yb+40,{})+arrow(cx(0)+bw/2,yb+62,cx(1)-bw/2,yb+50,{})+arrow(cx(1)+bw/2,yb+44,cx(2)-bw/2,yb+44,{});
    g+=T(8,yb+96,'gradient ∂f/∂x · ∂x/∂μ = 2x: uses f\'s slope',{fill:'var(--acc)',fs:11,w:600});
    // variance bars, to scale
    const y0=yb+118,L=8,Rr=W-40,lab=[['pathwise',4,'var(--good)'],['score function, baseline 2',18,'var(--c4)'],['score function',30,'var(--bad)']];
    g+=T(L,y0,'variance of one-sample estimates (truth: 2)',{fill:'var(--mute)',fs:11});
    lab.forEach(([n,v,c],k)=>{const y=y0+8+k*30;g+=T(L,y+11,n,{fs:11})+'<rect x="'+L+'" y="'+(y+15)+'" width="'+((Rr-L)*v/30).toFixed(1)+'" height="10" rx="2" fill="'+c+'"/>'+T(L+(Rr-L)*v/30+6,y+24,v,{fs:11,w:600})});
    el.innerHTML=RD.svg(W,y0+8+3*30+4,g,'Score-function against reparameterised gradient: computation paths and variances 30, 18 and 4');
  }
  function all(){hero();dens();rep()}
  all();RD.onRender(all);RD.onResize(all);
})();
