// ---- Shared: background sampling jobs, canvas scatter, line charts ----
const RC=window.PAPER.rc,TOY=RC.toy;
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim()||'#888';
const pct=(v,d)=>(100*v).toFixed(d==null?1:d)+'%';
// SAMP: Algorithm 2 runs in the background, a few milliseconds at a time, keeping snapshots every `every` steps
const SAMP=(function(){const jobs={},q=[];let busy=false;
  function key(k,n,s,g){return k+'|'+n+'|'+s+'|'+g}
  function get(kind,n,seed,sig,every){const id=key(kind,n,seed,sig);if(jobs[id])return jobs[id];
    const S=DM.sampler(kind,n,seed,sig),J={id,S,every:every||10,snaps:{},xh:{},cbs:[],stop:false};J.snaps[DM.T]=S.x.slice();jobs[id]=J;return J}
  function pump(){const J=q[q.length-1];if(!J){busy=false;return}if(J.S.t<1||J.stop){q.pop();if(J.S.t<1)J.cbs.forEach(f=>f(J));pump();return}
    const t0=performance.now();while(J.S.t>=1&&performance.now()-t0<18){J.S.run(1);const t=J.S.t;if(t%J.every===0||t===0){J.snaps[t]=J.S.x.slice();J.xh[t+1]=J.S.xh.slice()}}
    J.cbs.forEach(f=>f(J));if(J.S.t<1){const i=q.indexOf(J);if(i>=0)q.splice(i,1)}
    if(q.length)setTimeout(pump,0);else busy=false}
  function run(J,cb){if(cb&&J.cbs.indexOf(cb)<0)J.cbs.push(cb);J.stop=false;const i=q.indexOf(J);if(i>=0)q.splice(i,1);if(J.S.t>=1)q.push(J);if(!busy){busy=true;setTimeout(pump,0)}else if(J.S.t<1&&cb)cb(J)}
  return {get,run,jobs}})();
// near(J,t): the latest snapshot at or above time t (sampling runs from T down)
function snapAt(J,t){for(let s=t;s<=DM.T;s++)if(J.snaps[s])return {t:s,x:J.snaps[s]};return {t:DM.T,x:J.snaps[DM.T]}}
// scatter on a canvas at the host's measured width; range r = half-height in data units; pts as flat [x,y,...]
function scatter(host,pts,o){o=o||{};const c=host.querySelector('canvas'),w=host.clientWidth;if(!w)return;const h=o.h||Math.min(320,Math.round(w*(o.ar||0.8))),dpr=window.devicePixelRatio||1;
  c.width=Math.round(w*dpr);c.height=Math.round(h*dpr);c.style.height=h+'px';const g=c.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,w,h);
  const r=o.r||1.15,s=h/(2*r),X=v=>w/2+v*s,Y=v=>h/2-v*s;
  g.strokeStyle=css('--line');g.lineWidth=1;g.beginPath();g.moveTo(0,Y(0));g.lineTo(w,Y(0));g.moveTo(X(0),0);g.lineTo(X(0),h);g.stroke();
  if(o.curve!==false){const C=DM.CURVE;g.strokeStyle=css('--dim');g.lineWidth=5;g.beginPath();for(let i=0;i<C.length/2;i++){const x=X(C[2*i]),y=Y(C[2*i+1]);i?g.lineTo(x,y):g.moveTo(x,y)}g.stroke()}
  if(o.unit){g.lineWidth=1;g.strokeStyle=css('--mute');g.setLineDash([3,3]);g.strokeRect(X(-1),Y(1),2*s,2*s);g.setLineDash([])}
  g.fillStyle=o.c||css('--acc');const rad=o.rad||2.2;for(let i=0;i<pts.length/2;i++){const x=X(pts[2*i]),y=Y(pts[2*i+1]);if(x<-5||x>w+5||y<-5||y>h+5)continue;g.beginPath();g.arc(x,y,rad,0,6.283);g.fill()}
  if(o.arrows){g.strokeStyle=o.ac||css('--c2');g.lineWidth=1.2;o.arrows.forEach(a=>{const x=X(a[0]),y=Y(a[1]),x2=X(a[0]+a[2]),y2=Y(a[1]+a[3]);g.beginPath();g.moveTo(x,y);g.lineTo(x2,y2);g.stroke();const an=Math.atan2(y2-y,x2-x);g.beginPath();g.moveTo(x2,y2);g.lineTo(x2-4*Math.cos(an-.5),y2-4*Math.sin(an-.5));g.moveTo(x2,y2);g.lineTo(x2-4*Math.cos(an+.5),y2-4*Math.sin(an+.5));g.stroke()})}
  return {X,Y,s}}
// a line chart in SVG at width w. o: {x:[a,b], y:[a,b], logy, xt:[[v,l]], yt:[[v,l]], xl, yl, series:[{pts,c,n,da,dots,sw}], h, mark:{x,label}}
function lineChart(w,o){const H=o.h||220,pl=o.pl||52,pr=o.pr||12,pt=12,pb=36,lg=Math.log10;
  const X=v=>pl+(w-pl-pr)*(v-o.x[0])/(o.x[1]-o.x[0]);const Y=o.logy?(v=>pt+(H-pt-pb)*(1-(lg(v)-lg(o.y[0]))/(lg(o.y[1])-lg(o.y[0])))):(v=>pt+(H-pt-pb)*(1-(v-o.y[0])/(o.y[1]-o.y[0])));
  let s='';(o.yt||[]).forEach(([v,l])=>{s+=ln2(pl,Y(v),w-pr,Y(v),'var(--line)')+tx(pl-6,Y(v)+4,l,{fs:11,a:'end',c:'var(--mute)'})});
  (o.xt||[]).forEach(([v,l])=>{s+=ln2(X(v),H-pb,X(v),H-pb+4,'var(--mute)')+tx(X(v),H-pb+16,l,{fs:11,a:'middle',c:'var(--mute)'})});
  s+=ln2(pl,H-pb,w-pr,H-pb,'var(--mute)');
  if(o.xl)s+=tx((pl+w-pr)/2,H-4,o.xl,{fs:11,a:'middle',c:'var(--mute)'});
  if(o.yl)s+='<text x="12" y="'+((pt+H-pb)/2)+'" font-size="11" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 12 '+((pt+H-pb)/2)+')">'+o.yl+'</text>';
  if(o.mark)s+=ln2(X(o.mark.x),pt,X(o.mark.x),H-pb,'var(--acc)',{da:'3 3'});
  o.series.forEach(S=>{const P=S.pts.filter(p=>isFinite(p[1])&&(!o.logy||p[1]>0));if(!P.length)return;s+='<polyline fill="none" stroke="'+S.c+'" stroke-width="'+(S.sw||2)+'"'+(S.da?' stroke-dasharray="'+S.da+'"':'')+' points="'+P.map(p=>X(p[0]).toFixed(1)+','+Y(Math.max(o.y[0],Math.min(o.y[1],p[1]))).toFixed(1)).join(' ')+'"/>';
    if(S.dots)P.forEach(p=>{s+='<circle cx="'+X(p[0]).toFixed(1)+'" cy="'+Y(p[1]).toFixed(1)+'" r="3.2" fill="'+S.c+'"><title>'+(S.tip?S.tip(p):p[0]+': '+p[1])+'</title></circle>'})});
  const L=legend(o.series.filter(S=>S.n).map(S=>[S.n,S.c,S.da]),pl,H+14,w-pl-pr);
  return svgW(w,H+L.h+4,s+L.s,o.label||'chart')}
const setT=(id,v)=>{const e=$(id);if(e)e.innerHTML=v};

// ---- Numbers quoted in the text, from recompute.py ----
(function(){const V=TOY.variants,es=V.eps_simple,et=V.eps_true;
  setT('revBt','bound '+es.test_bpd.toFixed(2)+' against '+es.test_bpd_btilde.toFixed(2)+' bits per dimension, '+pct(es.beta.on_roll)+' against '+pct(es.btilde.on_roll)+' of samples on the roll');
  setT('costH',RC.cost.cifar_hours.toFixed(2));setT('costMs',RC.cost.cifar_ms_per_image.toFixed(0));
  const d=RC.cost.lsun_days;setT('costD',Object.keys(d).map(k=>k+' '+d[k].toFixed(1)).join(', '));
  setT('rdShare',pct(RC.rd.distortion_share));setT('rdBy900',pct(RC.rd.rate_share_by_tau900));
  setT('blvRatio',RC.margins.fid_ratio_T2.toFixed(1));setT('blvM',RC.margins.fid_vs_stylegan2ada_v1.toFixed(2));
  setT('blvToy',pct(es.beta.on_roll)+' (L<sub>simple</sub>) and '+pct(et.beta.on_roll)+' (true bound)');
  setT('blvBd',et.test_bpd.toFixed(3)+' against '+es.test_bpd.toFixed(3));
  setT('fqAT',sci(RC.schedule.abar_T,2));setT('fqLT',sci(RC.schedule['LT_bits_per_dim_x0_pm1'],1));setT('fqLT2',sci(RC.schedule['LT_bits_per_dim_x2_0.25'],1));setT('fqLTt',sci(es.LT_bpd,1));
  setT('fqA500',Math.sqrt(DM.abar[500]).toFixed(2));setT('dfxReal',pct(TOY.real.on_roll));
  setT('abM',pct(es.beta.on_roll)+' for ε + L<sub>simple</sub> and '+pct(V.mu_mse.beta.on_roll)+' for μ̃ + MSE');setT('abMt',pct(V.mu_true.beta.on_roll));
  setT('rdToyV','rate '+es.rd.rate[es.rd.rate.length-1].toFixed(2)+' bits per dimension, distortion RMSE '+es.rd.dist[es.rd.dist.length-1].toFixed(2)+' (and '+es.dist_bpd.toFixed(2)+' bits per dimension of '+es.test_bpd.toFixed(2)+', a share of '+pct(es.dist_bpd/es.test_bpd,0)+', under half: the toy data is not images)');
})();

// ---- The forward process: schedule chart and q(x_t | x_0) ----
(function(){const n=600,X0=DM.roll(n,5),E=DM.gauss(77),EP=new Float64Array(2*n);for(let i=0;i<2*n;i++)EP[i]=E();
  const sl=$('fqT');
  function draw(){const t=+sl.value;$('fqTv').textContent=t;const ab=t?DM.abar[t]:1;
    const pts=new Float64Array(2*n),a=Math.sqrt(ab),b=Math.sqrt(1-ab);for(let i=0;i<2*n;i++)pts[i]=a*X0[i]+b*EP[i];
    scatter($('fqB'),pts,{r:2.6,unit:true,rad:1.8,ar:0.8});
    $('fqO').innerHTML=stat('ᾱ<sub>t</sub>',t?ab.toPrecision(3):'1','signal kept: √ᾱ = '+a.toFixed(3))+stat('noise sd',b.toFixed(3),'√(1 − ᾱ<sub>t</sub>)')+stat('β<sub>t</sub>',t?DM.beta[t].toPrecision(3):'none','this step\'s added variance')+stat('signal-to-noise',t?(ab/(1-ab)).toPrecision(3):'∞','ᾱ / (1 − ᾱ)');
    refit($('fqA'))}
  fit($('fqA'),w=>{const t=+sl.value,P1=[],P2=[];for(let s=0;s<=1000;s+=5){const ab=s?DM.abar[s]:1;P1.push([s,Math.sqrt(ab)]);P2.push([s,Math.sqrt(1-ab)])}
    $('fqA').innerHTML=lineChart(w,{x:[0,1000],y:[0,1],h:200,xt:[[0,'0'],[250,'250'],[500,'500'],[750,'750'],[1000,'1000']],yt:[[0,'0'],[.5,'0.5'],[1,'1']],xl:'timestep t',mark:{x:t},
      series:[{pts:P1,c:'var(--c1)',n:'signal √ᾱ_t'},{pts:P2,c:'var(--c2)',n:'noise √(1 − ᾱ_t)'}],label:'Signal and noise against t'})});
  sl.addEventListener('input',draw);onTab('t-read',draw);fit($('fqB'),()=>draw());
})();

// view half-height in data units: follows the cloud's spread, so the roll is legible at small t and the noise fits at large t
const zoomR=t=>1.1+1.7*Math.sqrt(1-(t>0?DM.abar[Math.round(t)]:1));
// ---- The animation: forward chain against two reverse chains, same 300 points ----
(function(){const n=300,seed=42,X0=DM.roll(n,5),E=DM.gauss(77),EP=new Float64Array(2*n);for(let i=0;i<2*n;i++)EP[i]=E();
  const kinds={eps:'eps_simple',mu:'mu_mse'},jobs={},ROLL={};
  const fwdT=[0,50,100,200,300,500,700,1000],revT=[1000,700,500,300,200,100,50,10,0];
  const fc=['The data: 300 points of the Swiss roll, each coordinate an 8-bit integer scaled to [−1, 1] as §3.3 does for pixels.',
    'After 50 steps the roll is blurred but intact: ᾱ is still 0.97, noise sd 0.17. Each step multiplies the signal by √(1 − β) and adds variance β.',
    'β is still small (it rises linearly from 0.0001 to 0.02), but the noise adds up: sd 0.32, close to the 0.4 gap between the roll\'s arms. The closed form jumps straight here.',
    'The arms have merged (noise sd 0.58).',
    'Structure is gone: ᾱ = 0.40, signal 0.63 of its size against noise sd 0.78.','Halfway, signal 0.28 of its size, noise sd 0.96: only a smudge of the data\'s mean remains.',
    'Practically pure noise; ᾱ = 0.007.','t = T = 1,000: x_T is 𝒩(0, I) to within L_T ≈ 6 × 10⁻⁶ bits per dimension. Generating means running this backwards.'];
  const RCAP={eps:['Start: 300 draws from 𝒩(0, I), the same for both reverse chains.','The first 300 steps: the network pulls the cloud inwards towards the data\'s scale; little structure yet.',
    'Coarse structure first: the cloud takes the roll\'s outline (§4.3, "large scale image features appear first").','The arms separate.','The spiral is clear; from here the steps refine detail.',
    'Fine detail: noise sd added per step is now under 0.05.','Almost there; each step moves points by tiny amounts.','The last steps are the 8-bit level detail, where most of the bound\'s bits go.','x_0: the samples sit on the roll.'],
    mu:['Start: the same 300 draws from 𝒩(0, I) as the ε chain.','The μ̃ model, trained on plain MSE, also pulls the cloud in…','…but compare the ε chain at the same t: no spiral is forming here.','Its network has to output almost exactly its own input plus a correction about β in size; errors in that correction add up over the steps (our explanation, not the paper\'s).','Points stay spread across the gaps between the arms.','Late steps refine detail, but cannot repair the coarse structure.','','','x_0: few samples on the roll. Table 2 left this row blank: "unstable to train and generated poor samples".']};
  const steps=(ts,c)=>ts.map((t,i)=>({t:'t = '+t,c:c[i]||'Each step: x<sub>t−1</sub> = μ<sub>θ</sub>(x<sub>t</sub>, t) + σ<sub>t</sub>z.'}));
  const job=m=>{if(!jobs[m]){jobs[m]=SAMP.get(kinds[m],n,seed,'beta',10)}return jobs[m]};
  let A=null,lastD=0;const prog=$('dfxProg');
  function fwdPts(t){const ab=t?DM.abar[t]:1,a=Math.sqrt(ab),b=Math.sqrt(1-ab),o=new Float64Array(2*n);for(let i=0;i<2*n;i++)o[i]=a*X0[i]+b*EP[i];return o}
  function ptsFor(m,t){if(m==='fwd')return {x:fwdPts(t),ok:true};const J=job(m);if(J.snaps[t])return {x:J.snaps[t],ok:true};const s=snapAt(J,t);return {x:s.x,ok:false,have:s.t}}
  function ensure(m){if(m==='fwd')return;const J=job(m);if(J.S.t>=1){prog.hidden=false;SAMP.run(J,jj=>{if(!A||kinds[A.st.m]!==jj.S.kind)return;prog.firstChild.style.width=pct(1-jj.S.t/DM.T);if(jj.S.t<1)prog.hidden=true;const now=performance.now();if(!A.st.play&&(jj.S.t<1||now-lastD>300)){lastD=now;A.draw()}})}else prog.hidden=true}
  const onr=(m,t,x)=>{const k=m+t;if(ROLL[k]==null)ROLL[k]=DM.onRoll(x).share;return ROLL[k]};
  function draw(m,k,e,w){const ts=m==='fwd'?fwdT:revT,t1=ts[k],t0=ts[Math.max(0,k-1)];ensure(m);
    const B=ptsFor(m,t1),Aa=ptsFor(m,t0),h=Math.min(340,Math.round(w*0.72)),tm=t0+(t1-t0)*(B.ok?e:1),r=zoomR(tm),s=h/(2*r),X=v=>w/2+v*s,Y=v=>h/2-v*s;
    let svg=rc0(w,h);const C=DM.CURVE;let d='';for(let i=0;i<C.length/2;i+=6)d+=(i?'L':'M')+X(C[2*i]).toFixed(1)+' '+Y(C[2*i+1]).toFixed(1);
    svg+='<path d="'+d+'" fill="none" stroke="var(--dim)" stroke-width="5"/>'+'<rect x="'+X(-1)+'" y="'+Y(1)+'" width="'+(2*s)+'" height="'+(2*s)+'" fill="none" stroke="var(--mute)" stroke-dasharray="3 3"/>';
    const col=m==='mu'?'var(--c2)':m==='eps'?'var(--c3)':'var(--c1)',ee=B.ok?e:1;let cs='';
    for(let i=0;i<n;i++){const x=Aa.x[2*i]+(B.x[2*i]-Aa.x[2*i])*ee,y=Aa.x[2*i+1]+(B.x[2*i+1]-Aa.x[2*i+1])*ee;const px=X(x),py=Y(y);if(px<-3||px>w+3||py<-3||py>h+3)continue;cs+='<circle cx="'+px.toFixed(1)+'" cy="'+py.toFixed(1)+'" r="2.1"/>'}
    svg+='<g fill="'+col+'" opacity=".85">'+cs+'</g>';
    if(!B.ok)svg+=tx(10,h-8,'computing t = '+t1+' … (now at t = '+B.have+')',{fs:12,c:'var(--mute)'});
    svg+=tx(w-8,16,'dashed square: [−1, 1]²; the view zooms with the noise',{fs:11,a:'end',c:'var(--mute)'});
    return svgW(w,h,svg,'Points of the Swiss roll under the forward or reverse chain')}
  function rc0(w,h){return rc(0,0,w,h,'var(--soft)',{r:8})}
  function counters(m,k){const ts=m==='fwd'?fwdT:revT,t=ts[k],ab=t?DM.abar[t]:1,B=ptsFor(m,t);
    const nfe=m==='fwd'?'0 (closed form)':fmt(n*(DM.T-t));
    return stat('timestep t',t,m==='fwd'?'forward':'reverse, from 1,000')+stat('signal √ᾱ<sub>t</sub>',Math.sqrt(ab).toFixed(3),'noise sd '+Math.sqrt(1-ab).toFixed(3))+stat('network evaluations',nfe,m==='fwd'?'Eq. 4 jumps to any t':'300 points × steps so far')+stat('on the roll',B.ok?pct(onr(m,t,B.x),0):'…','within 0.04 of the curve')}
  A=makeAnim({id:'dfx',mode:'fwd',dur:2200,modes:{fwd:steps(fwdT,fc),eps:steps(revT,RCAP.eps),mu:steps(revT,RCAP.mu)},draw,counters});
  // start computing the reverse chains as soon as the card is near the screen
  if('IntersectionObserver' in window)new IntersectionObserver(es=>{if(es[0].isIntersecting){ensure('eps');}},{rootMargin:'400px'}).observe($('dfx'));
  window.DFX_JOB=job;
})();

// ---- Predict 1: the weights of the bound against L_simple ----
function wDraw(){fit($('wch'),w=>{const sig=$('wSig').value,W=[];let tot=0;for(let t=2;t<=DM.T;t++){const s2=sig==='beta'?DM.beta[t]:DM.btil[t],v=DM.beta[t]**2/(2*s2*DM.alpha[t]*(1-DM.abar[t]));W.push([t,v]);tot+=v}
  const P=W.map(p=>[p[0],p[1]/tot]);const r=W[0][1]/W[498][1];setT('wRatio',r.toFixed(0));
  $('wch').innerHTML=lineChart(w,{x:[0,1000],y:[1e-5,0.1],logy:true,h:230,pl:58,xt:[[2,'2'],[250,'250'],[500,'500'],[750,'750'],[1000,'1000']],yt:[[1e-5,'0.001%'],[1e-4,'0.01%'],[1e-3,'0.1%'],[1e-2,'1%'],[0.1,'10%']],xl:'timestep t',yl:'share of the objective',
    series:[{pts:P,c:'var(--c2)',n:'true bound (Eq. 12 weights)'},{pts:[[2,1/DM.T],[1000,1/DM.T]],c:'var(--c3)',n:'L_simple (uniform)',da:'6 4'}],label:'Share of each objective by timestep'})})}
PRED_REVEAL['pr-w']=wDraw;$('wSig').addEventListener('change',()=>refit($('wch')));
{const W2=[];let tt=0;for(let t=2;t<=DM.T;t++){const v=DM.beta[t]/(2*DM.alpha[t]*(1-DM.abar[t]));W2.push(v)}setT('wRatio',(W2[0]/W2[498]).toFixed(0))}

// ---- Predict 2: epsilon against mu-tilde with plain MSE, same noise ----
PRED_REVEAL['pr-mu']=function(){const pairs=[['abA','eps'],['abB','mu']];pairs.forEach(([id,m])=>{const J=window.DFX_JOB(m);
  const show=jj=>{const fin=jj.S.t<1,x=fin?jj.snaps[0]:jj.S.x;scatter($(id),x,{r:1.15,rad:2,c:css(m==='mu'?'--c2':'--c3')});$(id+'o').innerHTML=fin?'on the roll here: '+pct(DM.onRoll(x).share,0)+' of 300 (seed 42)':'computing: t = '+jj.S.t};
  fit($(id),()=>show(J));SAMP.run(J,show)})};

// ---- Predict 3: Figure 5 rebuilt from Table 4, with the toy's curve ----
function rdDraw(){fit($('rdA'),w=>{const mode=$('rdX').value,toy=$('rdToy').checked,T4=RC.rd.rows.slice().reverse(),es=TOY.variants.eps_simple.rd,tau=TOY.tau;
  const fin=T4[T4.length-1][1],tf=es.rate[es.rate.length-1],sc=fin/tf;
  if(mode==='rd'){const S=[{pts:T4.map(r=>[r[1],r[2]]),c:'var(--c1)',n:'CIFAR10, Table 4',dots:true,tip:p=>'rate '+p[0]+' bits/dim, RMSE '+p[1]}];
    if(toy)S.push({pts:tau.map((t,i)=>[es.rate[i]*sc,es.dist[i]]),c:'var(--c3)',n:'toy (rate × '+sc.toFixed(2)+')',da:'5 3'});
    $('rdA').innerHTML=lineChart(w,{x:[0,1.8],y:[0,80],h:240,xt:[[0,'0'],[.5,'0.5'],[1,'1'],[1.5,'1.5']],yt:[[0,'0'],[20,'20'],[40,'40'],[60,'60'],[80,'80']],xl:'rate (bits per dimension received)',yl:'distortion (RMSE, 0 to 255)',series:S,label:'Distortion against rate'})}
  else{const S=[{pts:T4.map(r=>[r[0],r[2]]),c:'var(--c1)',n:'CIFAR10 distortion (RMSE)',dots:true},{pts:T4.map(r=>[r[0],r[1]/fin*80]),c:'var(--c2)',n:'CIFAR10 rate, % of final (right scale)',dots:true,tip:p=>'reverse step '+p[0]+': '+(p[1]/80*100).toFixed(1)+'% of the bits'}];
    if(toy){S.push({pts:tau.map((t,i)=>[t,es.dist[i]]),c:'var(--c3)',n:'toy distortion',da:'5 3'});S.push({pts:tau.map((t,i)=>[t,es.rate[i]/tf*80]),c:'var(--c4)',n:'toy rate, % of final',da:'5 3'})}
    let svg=lineChart(w,{x:[0,1000],y:[0,80],h:240,pr:44,xt:[[0,'0'],[250,'250'],[500,'500'],[750,'750'],[1000,'1000']],yt:[[0,'0'],[20,'20'],[40,'40'],[60,'60'],[80,'80']],xl:'reverse steps taken (T − t + 1)',yl:'distortion (RMSE, 0 to 255)',series:S,label:'Rate and distortion against reverse steps'});
    const yy=v=>12+(240-12-36)*(1-v/80);let ax='';[[0,'0%'],[40,'50%'],[80,'100%']].forEach(([v,l])=>{ax+=tx(w-40,yy(v)+4,l,{fs:11,c:'var(--c2)'})});
    $('rdA').innerHTML=svg.replace('</svg>',ax+'</svg>')}})}
PRED_REVEAL['pr-rd']=rdDraw;$('rdX').addEventListener('change',()=>refit($('rdA')));$('rdToy').addEventListener('change',()=>refit($('rdA')));
