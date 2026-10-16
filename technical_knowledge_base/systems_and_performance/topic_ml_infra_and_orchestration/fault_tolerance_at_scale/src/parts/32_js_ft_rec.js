// ---- Recovery designs tab (t-rec): time to recover and goodput per design (window.FT.rec, window.FT.fl) ----
(function(){
const D=window.FT.rec, $=id=>document.getElementById(id), E=RD.esc;
if(!D||!$('rc-card'))return;
const COMP=D.components; // [{k,label,col}]
const fmtT=s=>s<1?s.toFixed(2)+' s':s<90?s.toFixed(s<10?1:0)+' s':s<5400?(s/60).toFixed(s<600?1:0)+' min':(s/3600).toFixed(1)+' h';
const pct=x=>(100*x).toFixed(1)+'%';
// the root Failure lab's goodput model: expected useful fraction with exponential failures (Daly 2006), all downtime in R
function goodput(tau,C,R,M){return tau/(M*Math.exp(R/M)*Math.expm1((tau+C)/M))}
function best(C,R,M){let a=Math.log(1e-3),b=Math.log(50*M);const g=(Math.sqrt(5)-1)/2;
  for(let i=0;i<120;i++){const c=b-g*(b-a),d=a+g*(b-a);if(goodput(Math.exp(c),C,R,M)>goodput(Math.exp(d),C,R,M))b=d;else a=c}
  const t=Math.exp((a+b)/2);return {tau:t,g:goodput(t,C,R,M)}}
const RATES=D.rates; // per GPU per second
let RATE=RATES[0].k, N=16384, SEL=['base','mem'];
const rateOf=k=>RATES.find(r=>r.k===k).per_gpu_s;
function evalDesign(d,n){
  const M=1/(n*rateOf(RATE));
  const R=COMP.reduce((a,c)=>a+(d.R[c.k]||0),0);
  const Reff=R*(1-(d.keep||0));
  let tau,g;
  if(d.tau_s){tau=d.tau_s;g=goodput(tau,d.C_s,Reff,M)}else{const b=best(d.C_s,Reff,M);tau=b.tau;g=b.g}
  g*=(1-(d.overhead||0));
  return {M,R,Reff,tau,g,rework:(tau+d.C_s)/2};
}
// ---- chart 1: where the time per failure goes, every design, at N
function drawBars(){
  const el=$('rc-bars'),w=RD.width(el),narrow=w<560,lw=narrow?0:170,rowH=narrow?44:28,top=6;
  const rows=D.designs.map(d=>({d,e:evalDesign(d,N)}));
  const mx=Math.max(...rows.map(r=>r.e.Reff+r.e.rework));
  const sx=(w-lw-70)/Math.log10(mx*1.2/0.5+1);
  const X=v=>lw+Math.log10(v/0.5+1)*sx; // log-like axis that keeps 0
  let s='';
  rows.forEach((r,i)=>{
    const y=top+i*rowH+(narrow?16:0);
    s+=RD.t(narrow?2:lw-6,narrow?y-3:y+14,E(r.d.name),{fs:11.5,a:narrow?'start':'end',w:600});
    let acc=0;
    COMP.forEach(c=>{const v=(r.d.R[c.k]||0)*(1-(r.d.keep||0));if(!v)return;const x1=X(acc),x2=X(acc+v);
      s+='<rect x="'+x1.toFixed(1)+'" y="'+y+'" width="'+Math.max(1,x2-x1).toFixed(1)+'" height="18" fill="'+c.col+'"><title>'+E(c.label)+': '+fmtT(v)+'</title></rect>';acc+=v});
    const x1=X(acc),x2=X(acc+r.e.rework);
    s+='<rect x="'+x1.toFixed(1)+'" y="'+y+'" width="'+Math.max(1,x2-x1).toFixed(1)+'" height="18" fill="var(--bad)" opacity=".55"><title>expected rework: '+fmtT(r.e.rework)+'</title></rect>';
    s+=RD.t(x2+4,y+14,fmtT(acc+r.e.rework),{fs:11,fill:'var(--mute)'});
  });
  const H=top+rows.length*rowH+(narrow?20:24);
  [1,10,60,600,3600].filter(v=>v<mx*1.2).forEach(v=>{const x=X(v);s+='<line x1="'+x+'" x2="'+x+'" y1="'+top+'" y2="'+(H-16)+'" stroke="var(--line)" stroke-dasharray="2 3"/>'+RD.t(x,H-4,fmtT(v),{fs:10.5,a:'middle',fill:'var(--mute)'})});
  el.innerHTML=RD.svg(w,H,s,'Time lost per failure for each recovery design, split by component');
}
// ---- chart 2: goodput against job size, every design
function drawCurves(){
  const el=$('rc-curve'),w=RD.width(el),H=230,l=44,b=26,t=10,r=narrow2(w);
  const ns=[];for(let e=Math.log10(512);e<=Math.log10(131072)+1e-9;e+=0.05)ns.push(Math.pow(10,e));
  const X=n=>l+(Math.log10(n)-Math.log10(512))/(Math.log10(131072)-Math.log10(512))*(w-l-r);
  const ymin=+$('rc-ymin').value/100,Y=g=>t+(H-t-b)*(1-(Math.max(g,ymin)-ymin)/(1-ymin));
  let s='';
  for(let g=Math.ceil(ymin*10)/10;g<=1.0001;g+=0.1){const y=Y(g);s+='<line x1="'+l+'" x2="'+(w-r)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/>'+RD.t(l-4,y+4,Math.round(g*100)+'%',{fs:10.5,a:'end',fill:'var(--mute)'})}
  [1024,4096,16384,65536,131072].forEach(n=>{const x=X(n);s+=RD.t(x,H-8,n>=1024?(n/1024)+'k':n,{fs:10.5,a:n===131072?'end':'middle',fill:'var(--mute)'})});
  D.designs.forEach((d,i)=>{
    const pts=ns.map(n=>[X(n),Y(evalDesign(d,n).g)]);
    const on=SEL.includes(d.id);
    s+='<polyline fill="none" stroke="'+d.col+'" stroke-width="'+(on?2.6:1.2)+'" opacity="'+(on?1:.55)+'" points="'+pts.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ')+'"/>';
  });
  const xn=X(N);s+='<line x1="'+xn+'" x2="'+xn+'" y1="'+t+'" y2="'+(H-b)+'" stroke="var(--ink)" stroke-dasharray="4 3"/>';
  el.innerHTML=RD.svg(w,H,s,'Goodput against the number of GPUs in the job, one line per recovery design');
  $('rc-curve-leg').innerHTML=D.designs.map(d=>'<span><i style="background:'+d.col+'"></i>'+E(d.name)+'</span>').join('');
}
const narrow2=w=>8;
// ---- table at N
function drawTable(){
  let t='<div class="tw"><table class="ft-tbl"><thead><tr><th>Design</th><th>Pause per checkpoint C</th><th>Interval &tau;</th><th>Lost per failure (recovery + rework)</th><th>Goodput</th><th>Evidence</th></tr></thead><tbody>';
  D.designs.forEach(d=>{const e=evalDesign(d,N);
    t+='<tr><td><b>'+E(d.name)+'</b></td><td>'+fmtT(d.C_s)+'</td><td>'+(d.tau_s?fmtT(d.tau_s)+' (fixed)':fmtT(e.tau)+' (optimum)')+'</td><td>'+fmtT(e.Reff)+' + '+fmtT(e.rework)+'</td><td><b>'+pct(e.g)+'</b>'+(d.overhead?' (after '+pct(d.overhead)+' overhead)':'')+'</td><td>'+d.evidence+'</td></tr>'});
  t+='</tbody></table></div>';
  $('rc-tbl').innerHTML=t;
  const M=1/(N*rateOf(RATE));
  $('rc-mtbf').innerHTML='At '+N.toLocaleString('en-US')+' GPUs and the '+E(RATES.find(r=>r.k===RATE).label)+' failure rate, the job fails on average every <b>'+fmtT(M)+'</b> (job MTBF = 1 / (GPUs &times; rate per GPU)).';
}
// ---- animation: one failure, two designs, on one time axis
let A;
function steps(d){const out=[];COMP.forEach(c=>{const v=(d.R[c.k]||0)*(1-(d.keep||0));if(v)out.push({c,v})});return out}
function drawAnim(i){
  const el=$('rc-anim'),w=RD.width(el),l=8,lane=40,top=22;
  const ds=SEL.map(id=>D.designs.find(d=>d.id===id));
  const seqs=ds.map(d=>{const e=evalDesign(d,N);const st=steps(d);st.push({c:{k:'rework',label:'redo the work since the last checkpoint',col:'var(--bad)'},v:e.rework});return st});
  const tot=Math.max(...seqs.map(q=>q.reduce((a,x)=>a+x.v,0)));
  const maxk=Math.max(...seqs.map(q=>q.length));
  const k=Math.min(i,maxk);
  const sx=(w-l-8)/tot;let s='';
  ds.forEach((d,j)=>{const y=top+j*(lane+18);
    s+=RD.t(l,y-5,E(d.name),{fs:12,w:600});
    s+='<rect x="'+l+'" y="'+y+'" width="'+(w-l-8)+'" height="'+lane+'" rx="4" fill="var(--soft)" stroke="var(--line)"/>';
    let x=l,acc=0;
    seqs[j].forEach((p,q)=>{if(q>=k)return;const ww=p.v*sx;
      s+='<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+Math.max(1,ww).toFixed(1)+'" height="'+lane+'" fill="'+p.c.col+'" opacity="'+(p.c.k==='rework'?.55:.9)+'"/>';x+=ww;acc+=p.v});
    s+=RD.t(Math.min(x+4,w-60),y+lane/2+4,k?fmtT(acc):'',{fs:11,fill:'var(--ink)'});
  });
  el.innerHTML=RD.svg(w,top+ds.length*(lane+18),s,'One failure under two recovery designs, drawn to the same time scale');
  if(i===0){$('rc-anim-cap').innerHTML='A GPU fails on a '+N.toLocaleString('en-US')+'-GPU job. Both lanes start at the failure and end when the job is back where it was: each segment is time in which the whole job makes no new progress (for replica groups, the lost share of the job). Drawn to the same scale: '+fmtT(tot)+' across.';return}
  const parts=ds.map((d,j)=>{const p=seqs[j][i-1];return p?'<b>'+E(d.name)+'</b>: '+E(p.c.label)+', '+fmtT(p.v)+(p.c.k!=='rework'&&d.notes&&d.notes[p.c.k]?' ('+E(d.notes[p.c.k])+')':''):'<b>'+E(d.name)+'</b>: back to new work.'});
  $('rc-anim-cap').innerHTML=parts.join('<br>');
}
function fillSel(){
  ['rc-a','rc-b'].forEach((id,j)=>{$(id).innerHTML=D.designs.map(d=>'<option value="'+d.id+'"'+(d.id===SEL[j]?' selected':'')+'>'+E(d.name)+'</option>').join('');
    $(id).addEventListener('change',e=>{SEL[j]=e.target.value;A.reset(nSteps());drawCurves()})});
  $('rc-rate').innerHTML=RATES.map(r=>'<option value="'+r.k+'">'+E(r.label)+'</option>').join('');
  $('rc-rate').addEventListener('change',e=>{RATE=e.target.value;all()});
  $('rc-n').addEventListener('input',e=>{N=Math.round(Math.pow(2,+e.target.value));$('rc-n-v').textContent=N.toLocaleString('en-US')+' GPUs';all()});
  $('rc-ymin').addEventListener('input',drawCurves);
}
const nSteps=()=>1+Math.max(...SEL.map(id=>steps(D.designs.find(d=>d.id===id)).length+1));
function drawStatic(){
  $('rc-bars-leg').innerHTML=COMP.map(c=>'<span><i style="background:'+c.col+'"></i>'+E(c.label)+'</span>').join('')+'<span><i style="background:var(--bad);opacity:.55"></i>expected rework</span>';
  const r1=RATES.find(r=>r.k==='rsc1').per_gpu_s,g=(n,C,R)=>(100*best(C,R,1/(n*r1)).g).toFixed(1)+'%';
  $('rc-repro').innerHTML='<b>Does the model reproduce what Meta reports?</b> <span class="ft-der">calculation</span> Kokolis et al. ({{HPCA 2025|https://arxiv.org/abs/2410.21680}}, Observation 10) say 2,048 to 4,096-GPU runs on RSC-1 average an ETTR "of around 0.9" with optimal intervals and 5-minute restart and checkpoint overheads: the model gives '+g(2048,300,300)+' at 2,048 GPUs and '+g(4096,300,300)+' at 4,096 (RSC-1 rate). They say about 12,000 GPUs need checkpoint writes "on the order of ~10 seconds" to reach 0.9: the model gives '+g(12000,10,300)+' with a 10 s pause and 5 min restart, against '+g(12000,300,300)+' with a 5 min pause. Reproduced independently (the paper uses a first-order formula; this is the exact one). Measured recoveries are checked against the same model in the root\'s Failure lab (within 1.2 to 5.1% on three Slurm runs).';
  let t='<div class="tw"><table class="ft-tbl"><thead><tr><th>Design</th><th>What it does</th><th>Inputs and sources</th></tr></thead><tbody>';
  D.designs.forEach(d=>{t+='<tr><td><b>'+E(d.name)+'</b></td><td>'+E(d.what)+'</td><td><b>pause C</b> '+fmtT(d.C_s)+': '+E(d.C_note)+'<br>'+COMP.filter(c=>d.R[c.k]).map(c=>'<b>'+E(c.label)+'</b> '+fmtT(d.R[c.k])+': '+E(d.notes[c.k])).join('<br>')+(d.keep?'<br><b>kept share</b> '+E(d.keep_note):'')+'</td></tr>'});
  $('rc-src').innerHTML=t+'</tbody></table></div><p class="ft-cap">Rates: '+RATES.map(r=>E(r.label)).join('; ')+'. Source extracts in <code>src/inputs/rec_*.txt</code>; inputs assembled by <code>src/scripts/rec_build.py</code>; every goodput shown is recomputed in <code>src/scripts/recompute.py</code>.</p>';
}
function all(){drawBars();drawCurves();drawTable();if(A)A.reset(nSteps())}
let inited=false;
function render(){if(!inited){inited=true;fillSel();$('rc-n').value=Math.log2(N);$('rc-n-v').textContent=N.toLocaleString('en-US')+' GPUs';A=RD.anim({card:'rc-card',ctl:'rc-ctl',n:nSteps(),draw:drawAnim,ms:1800,label:'Step'});drawStatic();RD.tabLinks($('t-rec'));all()}else{all()}}
(window.TAB_RENDER=window.TAB_RENDER||{})['t-rec']=[render];
addEventListener('resize',()=>{const t=$('t-rec');if(t&&!t.hidden&&inited){drawBars();drawCurves();A.redraw()}});
window.FTREC={evalDesign,goodput,best,setN:n=>{N=n},setRate:k=>{RATE=k}};
})();
