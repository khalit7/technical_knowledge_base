// ---- Checkpoint simulator tab: one day, same failures, two intervals; useful time against the interval ----
(function(){
  const P=window.PW,E=window.PWE,F=window.PWF,$=id=>document.getElementById(id),D0=P.sim_defaults;
  const st={g:D0.gpus,r:D0.rate,C:D0.C,D:D0.D,R:D0.R,T:D0.bad,seed:D0.seed,H:D0.horizon};
  const N=97; // steps: every 15 minutes of the day
  let sim=null;
  const lnT=()=>[Math.log(Math.max(st.C*1.05,1/120)),Math.log(24)];
  function tFromSlider(v){const [a,b]=lnT();return Math.exp(a+(b-a)*v/1000)}
  function sliderFromT(T){const [a,b]=lnT();return Math.round(Math.max(0,Math.min(1000,(Math.log(T)-a)/(b-a)*1000)))}
  function compute(){const mu=E.mtbfH(st.g,st.r);const fails=E.arrivals(st.seed,mu,st.H);
    const Ty=E.tYoung(mu,st.C);if(st.T<=st.C)st.T=st.C*1.05;
    sim={mu,fails,Ty,To:E.tOpt(mu,st.C,st.D,st.R),Td:E.tDaly(mu,st.C,st.D,st.R),
      lanes:[{name:'Your interval',T:st.T,res:E.simulate(fails,st.T,st.C,st.D,st.R,st.H,true)},{name:"Young's interval",T:Ty,res:E.simulate(fails,Ty,st.C,st.D,st.R,st.H,true)}]}}
  function stats(){const s=sim,ex=T=>E.effExact(T,s.mu,st.C,st.D,st.R);
    $('ck-stats').innerHTML=RD.stat('Job MTBF',F.dur(s.mu),F.n(st.g)+' GPUs, '+(+st.r).toFixed(2)+' per 1,000 server-days')+
      RD.stat("Young's interval",F.dur(s.Ty),'√(2 μ C) + C; useful '+F.pct(ex(s.Ty)))+
      RD.stat('Exact optimum',F.dur(s.To),'useful '+F.pct(ex(s.To))+"; Daly's "+F.dur(s.Td))+
      RD.stat('Your interval',F.dur(st.T),'useful '+F.pct(ex(st.T))+' in the long run')}
  // timeline
  const colOf={work:'var(--c3)',ck:'var(--c1)',down:'var(--dim)',rec:'var(--dim)'};
  function lanePieces(res,tc){// work saved by tc drawn solid, pending faded, lost (by tc) red
    const out=[],fl=[];
    res.segs.forEach(s=>{if(s[0]==='fail'){if(s[1]<=tc)fl.push(s[1]);return}
      if(s[0]==='lostmark'||s[1]>=tc)return;const a=s[1],b=Math.min(s[2],tc);
      if(s[0]==='work'){const done=s[4]!=null&&s[4]<=tc+1e-9;out.push([a,b,done&&s[3]==='lost'?'var(--bad)':'var(--c3)',done?1:.45])}
      else out.push([a,b,colOf[s[0]],1])});
    return {out,fl}}
  function partial(res,tc){// totals up to time tc
    let saved=0,lost=0,ck=0,down=0,pend=0,fails=0;
    res.segs.forEach(s=>{if(s[0]==='fail'){if(s[1]<=tc)fails++;return}if(s[0]==='lostmark'||s[1]>=tc)return;const a=s[1],b=Math.min(s[2],tc);
      if(s[0]==='ck')ck+=b-a;else if(s[0]==='down'||s[0]==='rec')down+=b-a;
      else if(s[0]==='work'){const done=s[4]!=null&&s[4]<=tc+1e-9;if(done&&s[3]==='lost')lost+=b-a;else if(done)saved+=b-a;else pend+=b-a}});
    return {saved,lost,ck,down,pend,fails}}
  function drawDay(i){const el=$('ck-svg');const W=RD.width(el),l=8,r=8,lh=26,top=16,H=top+2*(lh+22)+18,pw=W-l-r;const tc=st.H*i/(N-1);
    const x=h=>l+pw*h/st.H;let s='';
    sim.lanes.forEach((L,k)=>{const y0=top+k*(lh+22);s+=RD.t(l,y0-4,L.name+': every '+F.dur(L.T),{fs:11.5,w:600});
      s+='<rect x="'+l+'" y="'+y0+'" width="'+pw+'" height="'+lh+'" fill="var(--soft)" stroke="var(--line)"/>';
      const pc=lanePieces(L.res,tc);pc.out.forEach(p=>{s+='<rect x="'+x(p[0]).toFixed(1)+'" y="'+y0+'" width="'+Math.max(0.6,x(p[1])-x(p[0])).toFixed(1)+'" height="'+lh+'" fill="'+p[2]+'" opacity="'+p[3]+'"/>'});
      pc.fl.forEach(f=>{s+='<line x1="'+x(f).toFixed(1)+'" x2="'+x(f).toFixed(1)+'" y1="'+(y0-3)+'" y2="'+(y0+lh+3)+'" stroke="var(--ink)" stroke-width="2"/>'})});
    s+='<line x1="'+x(tc)+'" x2="'+x(tc)+'" y1="'+(top-2)+'" y2="'+(H-16)+'" stroke="var(--acc)" stroke-dasharray="3 3"/>';
    [0,6,12,18,24].forEach(h=>{s+=RD.t(Math.min(W-r-14,Math.max(l+6,x(h))),H-4,h+' h',{a:'middle',fs:10,fill:'var(--mute)'})});
    el.innerHTML=RD.svg(W,H,s,'One day of the same job under two checkpoint intervals');
    // caption: the newest failure in this step's window
    const prev=st.H*Math.max(0,i-1)/(N-1);const nf=sim.fails.filter(f=>f>prev&&f<=tc);
    let cap;
    if(i===0)cap='Hour 0. Both copies start together. Failures will arrive at the same moments in both lanes (the job MTBF is '+F.dur(sim.mu)+'); only the checkpoint interval differs.';
    else if(nf.length){const f=nf[nf.length-1];const lz=sim.lanes.map(L=>{const m=L.res.segs.find(s=>s[0]==='lostmark'&&Math.abs(s[2]-f)<1e-9);return m?m[2]-m[1]:0});
      cap='Failure at '+f.toFixed(1)+' h. The whole job stops. "Your interval" throws away '+F.dur(lz[0])+' of training done since its last checkpoint; Young\'s throws away '+F.dur(lz[1])+'. Both are then down for D + R = '+F.dur(st.D+st.R)+'.'}
    else if(i===N-1){const a=sim.lanes.map(L=>L.res.committed/st.H);cap='End of the day. Saved training: '+F.pct(a[0])+' of the day against '+F.pct(a[1])+' with Young\'s interval, from the same '+sim.fails.length+' failures.'}
    else cap='Hour '+tc.toFixed(1)+'. Training continues; each blue tick is a checkpoint pause of '+F.dur(st.C)+'. Faded green is work not yet saved: it is what the next failure would throw away.';
    $('ck-cap').textContent=cap;
    $('ck-out').innerHTML=sim.lanes.map(L=>{const q=partial(L.res,tc);return RD.stat(L.name,F.n(q.saved,1)+' h saved',F.n(q.lost,1)+' h thrown away, '+F.n(q.ck,1)+' h checkpointing, '+F.n(q.down,1)+' h down, '+q.fails+' failures')}).join('')}
  let A=null;
  // curve
  function drawCurve(){const el=$('ck-curve');const W=RD.width(el),H=240,l=44,r=10,t=10,b=30,pw=W-l-r,ph=H-t-b;const s0=sim;
    const [a,bb]=lnT();const x=T=>l+pw*(Math.log(T)-a)/(bb-a),y=v=>t+ph*(1-Math.max(0,Math.min(1,v)));
    let s='';[0,.25,.5,.75,1].forEach(v=>{s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/>'+RD.t(l-4,y(v)+4,Math.round(v*100)+'%',{a:'end',fs:10,fill:'var(--mute)'})});
    [1/60,5/60,0.25,1,3,12].forEach(T=>{if(Math.log(T)>=a&&Math.log(T)<=bb)s+=RD.t(x(T),H-12,F.dur(T),{a:'middle',fs:10,fill:'var(--mute)'})});
    s+=RD.t(l+pw/2,H-1,'checkpoint interval (log scale)',{a:'middle',fs:10,fill:'var(--mute)'});
    let pe='',pf='',first=true,started=false;
    for(let k=0;k<=160;k++){const T=Math.exp(a+(bb-a)*k/160);const e=E.effExact(T,s0.mu,st.C,st.D,st.R),f=E.effFirst(T,s0.mu,st.C,st.D,st.R);
      pe+=(k?'L':'M')+x(T).toFixed(1)+' '+y(e).toFixed(1);if(f>=0){pf+=(started?'L':'M')+x(T).toFixed(1)+' '+y(f).toFixed(1);started=true}else started=false}
    s+='<path d="'+pf+'" fill="none" stroke="var(--c2)" stroke-width="1.6" stroke-dasharray="5 3"/><path d="'+pe+'" fill="none" stroke="var(--c1)" stroke-width="2"/>';
    // Monte Carlo: 6 runs of 400 MTBFs at 9 intervals
    for(let k=0;k<9;k++){const T=Math.exp(a+(bb-a)*(k+0.5)/9);const v=[];
      for(let sd=0;sd<6;sd++){const Hh=Math.min(400*s0.mu,3e4*T);const f=E.arrivals(5000+sd,s0.mu,Hh);v.push(E.simulate(f,T,st.C,st.D,st.R,Hh).committed/Hh)}
      const lo=Math.min(...v),hi=Math.max(...v),m=v.reduce((p,q)=>p+q,0)/v.length;
      s+='<line x1="'+x(T)+'" x2="'+x(T)+'" y1="'+y(lo)+'" y2="'+y(hi)+'" stroke="var(--c4)" stroke-width="2"/><circle cx="'+x(T)+'" cy="'+y(m)+'" r="3.2" fill="var(--c4)"/>'}
    const mk=(T,c,lab,dy)=>{if(Math.log(T)<a||Math.log(T)>bb)return;s+='<line x1="'+x(T)+'" x2="'+x(T)+'" y1="'+t+'" y2="'+(t+ph)+'" stroke="'+c+'" stroke-width="1.5"/>'+RD.t(Math.min(W-r-2,x(T)+3),t+10+dy,lab,{fs:10,fill:c,a:x(T)>W-90?'end':null})};
    mk(s0.Ty,'var(--good)','Young',0);mk(st.T,'var(--bad)','yours',12);
    el.innerHTML=RD.svg(W,H,s,'Useful fraction of time against checkpoint interval')}
  function syncLabels(){$('ck-gv').textContent='';$('ck-rv').textContent='';$('ck-cv').textContent=F.dur(st.C);$('ck-drv').textContent=F.dur(st.D)+' + '+F.dur(st.R);
    $('ck-tv').textContent=F.dur(st.T);$('ck-sv').textContent='seed '+st.seed}
  function all(keepStep){compute();stats();syncLabels();$('ck-t').value=sliderFromT(st.T);
    if(A){if(keepStep)A.redraw();else A.go(N-1)}drawCurve()}
  // controls
  const num=(id,key,scale)=>$(id).addEventListener('change',e=>{const v=+e.target.value;if(!(v>0)&&!(v===0&&(key==='D'||key==='R')))return;st[key]=v*(scale||1);clearChips(id);all()});
  const chipsFor={'ck-g':'ck-gp','ck-r':'ck-rp','ck-c':'ck-cp'};
  function clearChips(id){const c=chipsFor[id];if(c)$(c).querySelectorAll('button').forEach(b=>b.classList.remove('on'))}
  num('ck-g','g');num('ck-r','r');num('ck-c','C',1/60);num('ck-d','D',1/60);num('ck-rr','R',1/60);
  const chip=(cid,key,inp,scale)=>$(cid).addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;$(cid).querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    st[key]=+b.dataset.v*(scale||1);$(inp).value=b.dataset.v;all()});
  chip('ck-gp','g','ck-g');chip('ck-rp','r','ck-r');chip('ck-cp','C','ck-c',1/60);
  $('ck-t').addEventListener('input',e=>{st.T=tFromSlider(+e.target.value);compute();stats();syncLabels();A.redraw();drawCurve()});
  $('ck-seed').addEventListener('click',()=>{st.seed=(st.seed*7919+13)%100000;all()});
  $('ck-seed0').addEventListener('click',()=>{st.seed=D0.seed;all()});
  $('ck-aupy').textContent='0.12%';
  compute();
  A=RD.anim({card:'ck-card',ctl:'ck-ctl',n:N,draw:drawDay,ms:260,label:'Hour of the day',tab:'t-ckpt'});
  all(true);
  RD.onRender(()=>{drawCurve()},'t-ckpt');
  RD.onResize(()=>{A.redraw();drawCurve()},'t-ckpt');
  // exposed for the page check
  window.PW_CK={st,get sim(){return sim},partial};
})();
