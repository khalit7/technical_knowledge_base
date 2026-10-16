// ---- Failure lab: goodput calculator (exact expected goodput, Young and Daly marked, seeded simulation check) ----
(function(){
  const H=window.FL_H,D=window.FL_DATA;if(!H||!D||!D.calc)return;const $=H.$,esc=H.esc;
  const NS=[8,64,512,1024,4096,16384,65536,100000,131072];
  const RATE={l3:D.calc.rates.l3_per_gpu_day,opt:D.calc.rates.opt_per_gpu_day};
  const S={};D.scen.forEach(s=>S[s.id]=s);
  const PRE=[['torchrun restart in the job',S['s-maxr2'].resume_s],['JobSet restart',S['k-crash2'].resume_s],['Ray Train restart',S['r-crash2'].resume_s],
    ['Slurm requeue after node loss',S['s-node'].resume_s],['silent Kubernetes node, with a person',S['k-node'].resume_s],['10 minutes (illustrative, at scale)',600]];
  const st={n:5,rate:'l3',C:60,R:600,tau:null};
  const logmap=(v,a,b)=>a*Math.pow(b/a,v/100),inv=(x,a,b)=>100*Math.log(x/a)/Math.log(b/a);
  const C_MIN=1,C_MAX=1800,R_MIN=1,R_MAX=7200;
  const M=()=>86400/(NS[st.n]*RATE[st.rate]);
  const gp=(tau,C,R,m)=>tau/(m*Math.exp(R/m)*Math.expm1((tau+C)/m));
  const tauRange=()=>{const m=M();return [Math.max(5,st.C/4),Math.min(30*86400,Math.max(4*m,3600))]};
  function best(){const m=M();let a=Math.log(1e-2),b=Math.log(50*m);const g=(Math.sqrt(5)-1)/2;
    for(let k=0;k<200;k++){const c=b-g*(b-a),d=a+g*(b-a);if(gp(Math.exp(c),st.C,st.R,m)>gp(Math.exp(d),st.C,st.R,m))b=d;else a=c}return Math.exp((a+b)/2)}
  const young=()=>Math.sqrt(2*st.C*M()),daly=()=>Math.sqrt(2*st.C*(M()+st.R))+st.C;
  const dur=s=>s<90?s.toFixed(s<10?1:0)+' s':s<5400?(s/60).toFixed(s<600?1:0)+' min':s<172800?(s/3600).toFixed(1)+' h':(s/86400).toFixed(1)+' days';
  let mc=null;
  function sim(){// seeded renewal simulation of the same model
    let x=12345;const rnd=()=>{x|=0;x=x+0x6D2B79F5|0;let t=Math.imul(x^x>>>15,1|x);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
    const m=M(),tau=st.tau,C=st.C,R=st.R;let time=0,work=0,fails=0;const ex=()=>-m*Math.log(1-rnd());
    let guard=0;while(fails<3000&&guard<5e6){guard++;let f=ex();
      if(f>=tau+C){time+=tau+C;work+=tau;continue}
      time+=f;fails++;// failure during the segment: lose it, then recover (recovery itself can be hit)
      for(;;){const g=ex();if(g>=R){time+=R;break}time+=g;fails++}}
    return {g:work/time,fails,tau};
  }
  function draw(){
    const el=$('fl-gp-svg');if(!el)return;if(st.tau==null)st.tau=best();
    const m=M(),[t0,t1]=tauRange();st.tau=Math.min(t1,Math.max(t0,st.tau));
    $('fl-gp-nv').textContent=NS[st.n].toLocaleString('en-US');$('fl-gp-cv').textContent=dur(st.C);$('fl-gp-rv').textContent=dur(st.R);$('fl-gp-tv').textContent=dur(st.tau);
    $('fl-gp-c').value=Math.round(inv(st.C,C_MIN,C_MAX));$('fl-gp-r').value=Math.round(inv(st.R,R_MIN,R_MAX));$('fl-gp-t').value=Math.round(inv(st.tau,t0,t1));
    const W=H.width(el),h=220,L=40,R=12,T=12,B=30;const lx=t=>L+(W-L-R)*Math.log(t/t0)/Math.log(t1/t0),Y=g=>T+(h-T-B)*(1-g);
    let b='';[0,0.25,0.5,0.75,1].forEach(g=>{b+=H.line(L,Y(g),W-R,Y(g),'var(--line)');b+=H.t(L-6,Y(g)+4,Math.round(g*100)+'%',{a:'end',fs:10,fill:'var(--mute)'})});
    const ticks=[10,60,600,3600,6*3600,86400,7*86400].filter(t=>t>=t0&&t<=t1);let last=-99;
    ticks.forEach(t=>{const x=lx(t);if(x-last<40)return;last=x;b+=H.line(x,h-B,x,h-B+4,'var(--mute)');b+=H.t(x,h-12,dur(t),{a:'middle',fs:10,fill:'var(--mute)'})});
    let pts=[];for(let k=0;k<=160;k++){const t=t0*Math.pow(t1/t0,k/160);pts.push([lx(t),Y(Math.max(0,gp(t,st.C,st.R,m)))])}
    b+='<polyline fill="none" stroke="var(--acc)" stroke-width="2.5" points="'+pts.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ')+'"/>';
    const bt=best(),mark=(t,lab,col,dy)=>{if(t<t0||t>t1)return;const x=lx(t);b+=H.line(x,T,x,h-B,col,{dash:'3 3'});const anc=x>W*0.75?'end':'start';b+=H.t(x+(anc==='end'?-3:3),T+10+dy,lab,{a:anc,fs:10,w:600,fill:col})};
    mark(young(),'Young','var(--c4)',0);mark(daly(),'Daly','var(--c5)',13);mark(bt,'optimum','var(--good)',26);
    const g=gp(st.tau,st.C,st.R,m);b+='<circle cx="'+lx(st.tau).toFixed(1)+'" cy="'+Y(g).toFixed(1)+'" r="6" fill="var(--acc)" stroke="var(--bg)" stroke-width="2"/>';
    if(mc&&Math.abs(mc.tau-st.tau)<1e-9)b+='<rect x="'+(lx(mc.tau)-5).toFixed(1)+'" y="'+(Y(mc.g)-5).toFixed(1)+'" width="10" height="10" fill="none" stroke="var(--bad)" stroke-width="2"/>';
    el.innerHTML=H.svg(W,h,b,'Goodput against checkpoint interval');
    const gb=gp(bt,st.C,st.R,m);
    $('fl-gp-out').innerHTML=[['Job MTBF M',dur(m)],['Young &radic;(2CM)',dur(young())],['Daly &radic;(2C(M+R))+C',dur(daly())],['Optimum',dur(bt)+', '+(100*gb).toFixed(1)+'%'],['Goodput at your &tau;',(100*g).toFixed(1)+'%'],['Failures per day',(86400/m).toFixed(m<86400?1:2)]]
      .map(([k,v])=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div></div>').join('');
    $('fl-gp-mcv').textContent=mc&&Math.abs(mc.tau-st.tau)<1e-9?'simulated '+(100*mc.g).toFixed(1)+'% over '+mc.fails.toLocaleString('en-US')+' failures, formula '+(100*g).toFixed(1)+'% (red square)':'';
    document.querySelectorAll('#fl-gp-rp button').forEach(bn=>bn.classList.toggle('on',Math.abs(+bn.dataset.r-st.R)<1e-6));
  }
  $('fl-gp-rp').innerHTML=PRE.map(([l,r])=>'<button data-r="'+r+'">'+esc(l)+': '+dur(r)+'</button>').join('');
  $('fl-gp-rp').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;st.R=+b.dataset.r;mc=null;draw()});
  $('fl-gp-n').addEventListener('input',e=>{st.n=+e.target.value;mc=null;draw()});
  $('fl-gp-c').addEventListener('input',e=>{st.C=logmap(+e.target.value,C_MIN,C_MAX);mc=null;draw()});
  $('fl-gp-r').addEventListener('input',e=>{st.R=logmap(+e.target.value,R_MIN,R_MAX);mc=null;draw()});
  $('fl-gp-t').addEventListener('input',e=>{const [a,b]=tauRange();st.tau=logmap(+e.target.value,a,b);mc=null;draw()});
  $('fl-gp-opt').addEventListener('click',()=>{st.tau=best();mc=null;draw()});
  $('fl-gp-mc').addEventListener('click',()=>{mc=sim();draw()});
  H.seg($('fl-gp-rate'),v=>{st.rate=v;st.tau=null;mc=null;draw()});
  H.onRender(draw);draw();
  // replay table
  const rp=$('fl-rp-tbl');if(rp&&D.replay){let h='<thead><tr><th>Run</th><th class="num">Steps redone</th><th class="num">Recovery</th><th class="num">Predicted</th><th class="num">Measured</th><th class="num">Error</th></tr></thead><tbody>';
    h+='<tr><td>uninterrupted (step '+D.replay.step_ms.toFixed(1)+' ms)</td><td class="num">0</td><td class="num">0</td><td class="num">'+D.replay.base_s.toFixed(1)+' s</td><td class="num">'+D.replay.base_s.toFixed(1)+' s</td><td class="num"></td></tr>';
    D.replay.rows.forEach(r=>{h+='<tr><td>'+esc(r.label)+'</td><td class="num">'+r.redone+'</td><td class="num">'+r.R_s.toFixed(1)+' s</td><td class="num">'+r.predicted_s.toFixed(1)+' s</td><td class="num">'+r.measured_s.toFixed(1)+' s</td><td class="num">'+(r.err_pct>0?'+':'')+r.err_pct.toFixed(1)+'%</td></tr>'});
    rp.innerHTML=h+'</tbody>'}
})();
