// ---- The paper tab: the stateless-vs-bank animation, the method explorer, the metric widget and the results charts ----
(function(){
const PP=window.PAPER,RC=PP.rc,TB=PP.tables,GAM=0.95;
const C={1:'var(--c1)',2:'var(--c2)',3:'var(--c3)',4:'var(--c4)',5:'var(--c5)',6:'var(--c6)'};
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
// wrap a label into lines of at most n characters
const wrap=(s,n)=>{const w=s.split(' '),L=[];let c='';w.forEach(x=>{if((c+' '+x).trim().length>n&&c){L.push(c);c=x}else c=(c+' '+x).trim()});if(c)L.push(c);return L};
const box=(x,y,w,h,lines,o)=>{o=o||{};let s=rc(x,y,w,h,o.f||'var(--soft)',{s:o.s||'var(--line)',sw:o.sw||1,r:6,op:o.op});const lh=14,n=lines.length;
  lines.forEach((t,i)=>{s+=tx(x+w/2,y+h/2+(i-(n-1)/2)*lh+4,t,{fs:o.fs||12,a:'middle',c:i&&o.sub?'var(--mute)':o.c,w:i===0&&o.b?'600':null})});return s};
const arr=(x1,y1,x2,y2,c,op)=>{const a=Math.atan2(y2-y1,x2-x1),h=6;return ln2(x1,y1,x2,y2,c||'var(--mute)',{sw:1.4,op})+'<path d="M'+x2.toFixed(1)+','+y2.toFixed(1)+'L'+(x2-h*Math.cos(a-0.45)).toFixed(1)+','+(y2-h*Math.sin(a-0.45)).toFixed(1)+'L'+(x2-h*Math.cos(a+0.45)).toFixed(1)+','+(y2-h*Math.sin(a+0.45)).toFixed(1)+'z" fill="'+(c||'var(--mute)')+'"'+(op!=null?' opacity="'+op+'"':'')+'/>'};

// ---------- 1. Stateless baseline against a bank, on the paper's own example ----------
const LAG=[0,0,20,40,256];
const IN=['"I like reading." (session 1)','"I like reading." (session 1)','20 more turns of small talk','"What do I like?" (session 3, 40 turns on)','Same question, 256 turns on'];
const OUT={mem:['"Nice!"','"Nice!"','(replies)','"Reading."','(guess)'],base:['"Nice!"','"Nice!"','(replies)','"I don\'t know."','"I don\'t know."']};
const ST={mem:[
 {t:'Encode the turn',c:'The frozen encoder turns "I like reading" into a latent <i>Z<sub>t</sub></i>, exactly as the stateless model does (Eq. 1).'},
 {t:'Write it into the bank',c:'The write rule folds <i>Z<sub>t</sub></i> into the persistent bank <i>P</i>: <i>P<sub>t</sub></i> = <i>γP</i><sub><i>t</i>−1</sub> + <i>A</i><sup>⊤</sup><i>V</i>. No gradients: this is the inference-time "conversational learning" of Eq. 32.'},
 {t:'Twenty turns later',c:'Every turn multiplies what is already in the bank by <i>γ</i> = 0.95 before adding the new turn, so after 20 turns the fact keeps 0.95<sup>20</sup> = 36% of its weight.'},
 {t:'Session 3: the question',c:'The decoder reads the current question <i>and</i> the bank (Read(<i>Z<sub>t</sub></i>, <i>P</i><sub><i>t</i>−1</sub>), Eq. 2). After 40 turns the fact keeps 0.95<sup>40</sup> = 13%, so a trained read path can still find it. This is the case the paper motivates.'},
 {t:'At LoCoMo\'s typical lag',c:'62% of the test questions are 256 or more turns after their evidence. By then the fact keeps 0.95<sup>256</sup> ≈ 2 × 10<sup>−6</sup> of its weight: the bank has written over it. The answer is a guess, as in the stateless model.'}],
base:[
 {t:'Encode the turn',c:'The frozen encoder turns "I like reading" into a latent <i>Z<sub>t</sub></i> (Eq. 1).'},
 {t:'Discard it',c:'The decoder answers and <i>Z<sub>t</sub></i> is thrown away: nothing survives the forward pass (Figure 1).'},
 {t:'Twenty turns later',c:'Each turn is encoded, answered and discarded. There is no state to carry the fact.'},
 {t:'Session 3: the question',c:'The model sees only "What do I like?" and has no way to know. This is the inter-session memory problem the paper targets (§1).'},
 {t:'At LoCoMo\'s typical lag',c:'Same answer at any lag: the stateless curve is flat, and the paper\'s metric scores it zero by construction.'}]};
function drawTL(m,k,e,w){
  const H=250,pad=4,bw=Math.min(118,(w-2*pad-4*18)/5),gap=(w-2*pad-5*bw)/4,y0=26,bh=48;let s='';
  const xs=[0,1,2,3,4].map(i=>pad+i*(bw+gap));
  const lab=[wrap(IN[k],Math.max(10,Math.floor(bw/6.6))),['E frozen','encoder'],['Z','latent'],['D frozen','decoder'],[OUT[m][k]]];
  lab.forEach((L,i)=>{s+=box(xs[i],y0,bw,bh+(i===0&&L.length>2?14:0),L.slice(0,3),{sub:i>0&&i<4,b:i>0&&i<4,f:i===1||i===3?'var(--acc2)':'var(--soft)'})});
  for(let i=0;i<4;i++)s+=arr(xs[i]+bw+2,y0+bh/2,xs[i+1]-3,y0+bh/2);
  s+=tx(pad,16,'One turn of the frozen model',{fs:11,c:'var(--mute)'});
  const by=150,bh2=40,cells=20,cw=(w-2*pad)/cells;
  const lagNow=LAG[k],lagPrev=LAG[Math.max(0,k-1)],lag=lagPrev+(lagNow-lagPrev)*e;
  if(m==='mem'){
    s+=tx(pad,by-12,w<560?'Bank P: last 20 turns, newest right; darker = more left':'Persistent bank P (the last 20 turns, newest on the right; darker = more weight left)',{fs:11,c:'var(--mute)'});
    for(let i=0;i<cells;i++){const age=cells-1-i,wgt=Math.pow(GAM,age);s+=rc(pad+i*cw+1,by,cw-2,bh2,'var(--acc)',{op:(0.08+0.8*wgt).toFixed(3),r:3})}
    if(k>=1){const shown=lag<cells,fx=shown?pad+(cells-1-lag)*cw:pad;const wf=Math.pow(GAM,lag);
      if(shown)s+=rc(fx+1,by,cw-2,bh2,'none',{s:'var(--c2)',sw:2.5,r:3});
      s+=tx(Math.min(w-pad,Math.max(pad,fx+(shown?cw/2:0))),by+bh2+16,(shown?'':'◀ ')+'"I like reading": '+(wf>=0.01?(wf*100).toFixed(0)+'%':wf.toExponential(0).replace('e-',' × 10^-'))+' left',{fs:12,a:shown?'middle':'start',c:'var(--c2)',w:'600'})}
    const wy=k===1?e:k>=3?1:0;
    if(k===1)s+=arr(xs[2]+bw/2,y0+bh+4,xs[2]+bw/2,y0+bh+4+(by-y0-bh-24)*e,'var(--c2)');
    if(k>=3)s+=arr(xs[3]+bw/2,by-24,xs[3]+bw/2,y0+bh+6,'var(--c1)',wy);
  }else{
    s+=tx(pad,by-12,'No persistent state',{fs:11,c:'var(--mute)'});
    s+=rc(pad,by,w-2*pad,bh2,'none',{s:'var(--line)',da:'4 4',r:6})+tx(w/2,by+bh2/2+4,'Z is discarded after every turn',{fs:12,a:'middle',c:'var(--mute)'});
    if(k===1)s+=tx(xs[2]+bw/2,y0+bh+24,'✕ discarded',{fs:12,a:'middle',c:'var(--bad)',op:e.toFixed(2)});
  }
  return svgW(w,H,s,'Animation: the stateless model against a model with a persistent memory bank')}
makeAnim({id:'tl',mode:'mem',modes:ST,dur:3200,draw:drawTL,counters:(m,k)=>{const l=LAG[k];
  return '<div class="small">'+(m==='mem'?'Turns since the fact: <b>'+(k?l:0)+'</b> · weight left: <b>'+(k?(Math.pow(GAM,l)>=0.01?(Math.pow(GAM,l)*100).toFixed(0)+'%':sci(Math.pow(GAM,l),1)):'not written yet')+'</b> · gradients at inference: <b>none</b>'
   :'Turns since the fact: <b>'+(k?l:0)+'</b> · state carried between turns: <b>none</b>')+'</div>'}});

// ---------- 2. Method explorer (Tables 1 and 2, parameter counts recounted in recompute.py) ----------
const PR=RC.params||{};
const MX={
 1:{n:'Encoder-input prefix',at:'enc',w:'Attention-coupled: P ← γP + AᵀV, V from Z',r:'P is projected to m soft tokens S = U<sub>P</sub>PW<sub>P</sub> and prepended to the input; the encoder mixes them in (delegated read)',tr:'W<sub>P</sub>',eq:'S4.SS1',src:'prefix tuning'},
 2:{n:'Parallel decoder cross-attention',at:'dec',w:'Attention-coupled (same as M.1)',r:'a second cross-attention over P in each decoder block, added with a zero-initialised β (explicit read); as implemented, computed once with Z as a stand-in and passed as extra encoder positions',tr:'W<sub>Q</sub>, W<sub>K</sub>, W<sub>V</sub>, O shared across layers, plus one β per layer',eq:'S4.SS2',src:'Flamingo'},
 3:{n:'Decoder KV extension',at:'kv',w:'Attention-coupled (same as M.1)',r:'H = PW<sub>Mem</sub> is appended to Z, so every decoder layer\'s frozen cross-attention sees n + n<sub>P</sub> keys and values (delegated read)',tr:'W<sub>Mem</sub> (zero-initialised)',eq:'S4.SS3',src:'Memorizing Transformers'},
 4:{n:'Hebbian / associative',at:'kv',w:'Hebbian: M ← γM + (1/n)(ZW<sub>K,H</sub>)ᵀ(ZW<sub>V,H</sub>), rescaled to Frobenius norm at most 1',r:'R = (ZW<sub>Q,H</sub>)M, projected by W<sub>Mem</sub> and appended to Z as extra keys and values (explicit read)',tr:'W<sub>Q,H</sub>, W<sub>Mem</sub>',eq:'S4.SS4',src:'fast weight programmers'},
 5:{n:'Context-gated decoder branch',at:'dec',w:'Attention-coupled (same as M.1)',r:'a memory cross-attention whose output is multiplied by a learned gate g = σ(W<sub>g</sub>[s; c] + b<sub>g</sub>), with b<sub>g</sub> &lt; 0 so it starts nearly closed; implemented like M.2, as extra encoder positions',tr:'W<sub>Q</sub>, W<sub>K</sub>, W<sub>V</sub>, W<sub>g</sub>, b<sub>g</sub>',eq:'S4.SS5',src:'Flamingo\'s tanh gate'},
 6:{n:'Slot-based sparse write',at:'kv',w:'Sparse slots: score the S slots against the mean-pooled turn, move only the top k towards u = z̄W<sub>u</sub>: P[s] ← γP[s] + (1 − γ)u',r:'all slots projected by W<sub>Mem</sub> and appended to Z as extra keys and values (delegated read)',tr:'W<sub>Mem</sub>',eq:'S4.SS6',src:'Neural Turing Machines'}};
const T2={};(TB.t2.rows||[]).forEach((r,i)=>T2[i+1]=r);
function drawMX(w){const m=+($('mxM').querySelector('.on').dataset.m),o=MX[m];const H=200,pad=4;let s='';
  const nb=w<520?5:5,bw=Math.min(112,(w-2*pad-4*16)/5),gap=(w-2*pad-5*bw)/4,y0=24,bh=46;const xs=[0,1,2,3,4].map(i=>pad+i*(bw+gap));
  const L=[['x t','this turn'],['E frozen','encoder'],['Z t','latent'],['D frozen','decoder'],['ŷ t','answer']];
  L.forEach((l,i)=>{s+=box(xs[i],y0,bw,bh,l,{sub:1,b:1,f:i===1||i===3?'var(--acc2)':'var(--soft)'})});
  for(let i=0;i<4;i++)s+=arr(xs[i]+bw+2,y0+bh/2,xs[i+1]-3,y0+bh/2);
  const py=136,pw=Math.min(150,bw*1.4),cx={enc:(xs[0]+xs[1]+bw)/2,kv:(xs[2]+xs[3]+bw)/2,dec:xs[3]+bw/2}[o.at],px=Math.max(pad,Math.min(w-pad-pw,cx-pw/2));
  s+=box(px,py,pw,40,[m===4?'M (Hebbian matrix)':m===6?'P (slots)':'P (bank)'],{f:'none',s:C[m],sw:2,b:1});
  s+=arr(cx,py-2,cx,y0+bh+4,C[m]);
  s+=tx(cx+6,py-14,o.at==='enc'?'read: prefix tokens':o.at==='kv'?'read: extra keys and values':'read: branch in decoder',{fs:11,c:C[m],a:cx>w-160?'end':'start'});
  const zx=xs[2]+bw/2;s+=ln2(zx,y0+bh,zx,py+20,'var(--c2)',{da:'4 3',sw:1.3});s+=arr(zx,py+20,(zx<px?px:px+pw)+(zx<px?-2:2),py+20,'var(--c2)');
  s+=tx(zx+(zx<px?-4:4),py+38,'write (no gradient)',{fs:11,c:'var(--c2)',a:zx<px?'end':'start'});
  $('mxSvg').innerHTML=svgW(w,H,s,'Where method M.'+m+' enters the frozen model');
  const p=PR['M.'+m]||{},t2=T2[m]||{};
  $('mxTxt').innerHTML='<div class="small" style="margin:6px 0"><div><b>M.'+m+' '+o.n+'</b> <span class="small mute">(after '+o.src+'; AXLINK)</span></div>'
   .replace('AXLINK','<a href="'+PP.meta.ax+'#'+o.eq+'" target="_blank" rel="noopener noreferrer">§'+o.eq.replace(/S(\d+)\.SS(\d+)/,'$1.$2')+'</a>')
   +'<div><b>Write:</b> '+o.w+'</div><div><b>Read:</b> '+o.r+'</div><div><b>Trained:</b> '+o.tr+'. <b>Parameters:</b> '+(t2.params||'')+' in Table 2; recounted '+(p.count?fmt(p.count):'')+' ('+(p.pct_of_backbone!=null?p.pct_of_backbone.toFixed(2):'')+'% of 2.85B)'+(m===4?'; 3.3M at 10x, where d<sub>h</sub> = 810':'')+'.</div></div>'}
segBind('mxM',()=>refit($('mxSvg')));fit($('mxSvg'),drawMX);

// ---------- 3. The metric: clipping per question makes noise look like memory ----------
function rhoRun(){let h=+$('rhoH').value,l=+$('rhoL').value;if(h+l>100){l=100-h;$('rhoL').value=l}
  $('rhoHv').textContent=h;$('rhoLv').textContent=l;
  const r=SIM.rng(11),N=200;let dF=0,rho=0;
  for(let q=0;q<N;q++){const f0=0.06*2*r(),u=r(),d=0.3*r();let fm=f0;if(u<h/100)fm=Math.min(1,f0+d);else if(u<(h+l)/100)fm=Math.max(0,f0-d);
    dF+=fm-f0;rho+=Math.max(0,fm-f0)/Math.max(1-f0,1e-6)}
  dF=dF/N*100;rho=rho/N*100;
  fit($('rhoSvg'),w=>{const H=136,x0=Math.round(w*0.4),sc=(w-x0-56)/20;let s='';
    const bar=(y,v,lab,c)=>{s+=tx(8,y-6,lab,{fs:12});const len=Math.min(Math.abs(v)*sc,v<0?x0-50:w-x0-56),bx0=v<0?x0-len:x0;s+=rc(bx0,y,len,22,c);
      s+=tx(v<0?bx0-4:bx0+len+4,y+15,(v>=0?'+':'')+v.toFixed(1),{fs:12,a:v<0?'end':'start',w:'600'})};
    s+=ln2(x0,22,x0,H-8,'var(--mute)');bar(30,dF,'Net F1 change (points)',dF<0?'var(--bad)':'var(--good)');bar(94,rho,'Mean recall rate ρ (%)','var(--acc)');
    $('rhoSvg').innerHTML=svgW(w,H,s,'Net F1 change against the clipped recall rate')});
  $('rhoO').innerHTML='Memory '+(dF<-0.05?'<b>hurts</b> on balance':dF>0.05?'helps on balance':'changes nothing on balance')+' ('+(dF>=0?'+':'')+dF.toFixed(1)+' F1 points), yet the clipped recall rate is <b>'+rho.toFixed(1)+'%</b>'+(rho>0?', above the baseline\'s 0%.':'.')}
['rhoH','rhoL'].forEach(id=>$(id).addEventListener('input',rhoRun));
PRED_REVEAL['pr-zero']=rhoRun;

// ---------- 4. Forgetting curves (Table 3), with the per-bucket standard-error bound from recompute.py ----------
const BK=TB.t3.buckets,NQ=TB.t3.n;
const mnum=s=>+(s.match(/M\.(\d)/)||[0,0])[1];
function lineChart(host,rows,o){fit(host,w=>{const H=o.H||260,L=40,R=w<560?92:120,T=14,B=58,pw=w-L-R,ph=H-T-B,ym=o.ymax;let s='';
  const X=i=>L+pw*(i+0.5)/rows[0].v.length,Y=v=>T+ph*(1-Math.min(v,ym)/ym);
  for(let g=0;g<=ym;g+=o.step){s+=ln2(L,Y(g),L+pw,Y(g),'var(--line)')+tx(L-6,Y(g)+4,g+(o.unit||''),{fs:11,a:'end',c:'var(--mute)'})}
  o.xl.forEach((t,i)=>{s+=tx(X(i),H-B+16,t,{fs:11,a:'middle',c:'var(--mute)'});if(o.xs)s+=tx(X(i),H-B+30,o.xs[i],{fs:11,a:'middle',c:'var(--mute)'})});
  s+=tx(L,H-4,o.xt,{fs:11,c:'var(--mute)'});
  const ends=[];rows.forEach(r=>{const c=r.c;if(o.err&&r.e)r.v.forEach((v,i)=>{s+=ln2(X(i),Y(Math.max(0,v-r.e[i])),X(i),Y(v+r.e[i]),c,{sw:1,op:.5})});
    s+='<polyline fill="none" stroke="'+c+'" stroke-width="2.2"'+(r.da?' stroke-dasharray="'+r.da+'"':'')+' points="'+r.v.map((v,i)=>X(i).toFixed(1)+','+Y(v).toFixed(1)).join(' ')+'"/>';
    r.v.forEach((v,i)=>{s+='<circle cx="'+X(i).toFixed(1)+'" cy="'+Y(v).toFixed(1)+'" r="3" fill="'+c+'"><title>'+esc(r.n)+', '+o.xl[i]+': '+v.toFixed(2)+'</title></circle>'});
    ends.push({y:Y(r.v[r.v.length-1]),t:r.n,c})});
  ends.sort((a,b)=>a.y-b.y);for(let i=1;i<ends.length;i++)if(ends[i].y-ends[i-1].y<13)ends[i].y=ends[i-1].y+13;
  const over=ends.length?ends[ends.length-1].y-(T+ph+4):0;if(over>0)ends.forEach(e=>e.y-=over);
  ends.forEach(e=>{s+=tx(L+pw+6,e.y+4,e.t,{fs:11,c:e.c})});
  host.innerHTML=svgW(w,H,s,o.label||'chart')})}
function drawFC(){const sc=$('fcM').querySelector('.on').dataset.m,err=$('fcE').checked,rows=TB.t3[sc],rc3=RC.t3[sc];
  const R=rows.map((r,i)=>{const m=mnum(r.m);return {n:r.m.replace('M.0 ',''),v:r.v.slice(0,5),c:m?C[m]:'var(--mute)',da:m?null:'4 3',e:rc3[i].se_upper}});
  lineChart($('fcSvg'),R,{ymax:err?26:20,step:5,unit:'%',xl:BK,xs:NQ.map(n=>'n = '+n),xt:'Evidence lag (turns); n = questions per bucket',err,label:'Forgetting curves, Table 3'});
  const b=RC.best[sc];$('fcNote').innerHTML='Table 3, '+(sc==='x1'?'1x (n<sub>P</sub> = 64, d<sub>h</sub> = 256)':'10x (n<sub>P</sub> = 640, d<sub>h</sub> = 810)')+', isotonic-smoothed as printed. Best printed mean (an unweighted average of the five buckets): <b>'+b.printed_mean+'</b>; best question-weighted mean: <b>'+b.weighted_mean+'</b>; best at 0 to 31: <b>'+b.short_lag+'</b>; best at 256+: <b>'+b.long_lag+'</b>.'+(err?' Error bars: ± the largest possible standard error for a 0-to-1 score with that many questions, √(p(1 − p)/n); the isotonic pooling and the single seed add more.':'')}
segBind('fcM',drawFC);$('fcE').addEventListener('change',drawFC);onTab('t-read',drawFC);drawFC();

// ---------- 5. Adapter tax and net benefit (Table 5) as F1 levels ----------
function drawNB(){const sc=$('nbM').querySelector('.on').dataset.m,B=TB.t5.base_f1,ix=sc==='x1'?0:2;
  const rows=TB.t5.rows.map(r=>({n:r.m,z:B-r.v[ix],m:B+r.v[ix+1]}));
  fit($('nbSvg'),w=>{const L=88,R=44,rh=40,T=30,H=T+rows.length*rh+30,xm=16,X=v=>L+(w-L-R)*v/xm;let s='';
    for(let g=0;g<=xm;g+=4)s+=ln2(X(g),T-6,X(g),H-26,'var(--line)')+tx(X(g),H-12,g,{fs:11,a:'middle',c:'var(--mute)'});
    s+=tx(L,H-0,'F1 (points)',{fs:11,c:'var(--mute)'});
    s+=ln2(X(B),T-12,X(B),H-26,'var(--ink)',{da:'4 3',sw:1.4})+tx(X(B)+4,T-14,'no adapter: '+B.toFixed(2),{fs:11});
    rows.forEach((r,i)=>{const y=T+i*rh;s+=tx(L-8,y+20,r.n,{fs:12,a:'end'});
      s+=rc(L,y+4,X(r.z)-L,12,'var(--mute)',{op:.55})+tx(X(r.z)+4,y+14,r.z.toFixed(2),{fs:11,c:'var(--mute)'});
      s+=rc(L,y+19,Math.max(1,X(r.m)-L),12,r.m<B?'var(--bad)':'var(--good)')+tx(Math.max(X(r.m),L+1)+4,y+29,r.m.toFixed(2),{fs:11,w:'600'})});
    const lg=legend([['bank zeroed','var(--mute)'],['with the bank','var(--good)']],8,14,w-16);s+=lg.s;
    $('nbSvg').innerHTML=svgW(w,H+4,s,'F1 with the bank zeroed and with the bank, Table 5')})}
segBind('nbM',drawNB);PRED_REVEAL['pr-tax']=drawNB;

// ---------- 6. How long a turn survives each write rule (shared with the simulation tab) ----------
// res: output of SIM.simulate; draws the share of the final bank held by the turn written l turns ago, on a log scale,
// with the share of LoCoMo's 639 test questions in each lag bucket underneath.
const FLOOR=1e-12;
window.decayChart=function(host,res,label){fit(host,w=>{const T=res.T,sh=res.share,L=46,R=12,PT=10,ph=170,B=PT+ph,H=B+124,X=l=>L+(w-L-R)*l/T,Y=v=>PT+ph*(1-(Math.log10(Math.max(v,FLOOR))-Math.log10(FLOOR))/(0-Math.log10(FLOOR)));let s='';
  [0,-3,-6,-9,-12].forEach(e=>{s+=ln2(L,Y(10**e),w-R,Y(10**e),'var(--line)')+'<text x="'+(L-6)+'" y="'+(Y(10**e)+4).toFixed(1)+'" font-size="11" text-anchor="end" fill="var(--mute)">'+(e===0?'1':exp10(e))+'</text>'});
  const b8=sh[1]*2**-8;s+=ln2(L,Y(b8),w-R,Y(b8),'var(--c5)',{da:'3 3'})+tx(w-R,Y(b8)-4,'newest turn × 2⁻⁸ (bfloat16 step)',{fs:11,a:'end',c:'var(--c5)'});
  let pts=[];for(let l=1;l<=T;l++)pts.push(X(l).toFixed(1)+','+Y(sh[l]).toFixed(1));
  s+='<polyline fill="none" stroke="var(--acc)" stroke-width="2.2" points="'+pts.join(' ')+'"/>';
  [0,100,200,300,400,500,600].filter(v=>v<=T).forEach(v=>{s+=tx(X(v),B+14,v,{fs:11,a:'middle',c:'var(--mute)'})});
  s+=tx(L,B+30,'Lag: turns since the turn was written. Floor at 10⁻¹².',{fs:11,c:'var(--mute)'});
  const n=TB.t3.n,N=n.reduce((a,b)=>a+b,0),bk=SIM.BUCKETS,by=B+58,bh=40;
  s+=tx(L,by-4,'Share of LoCoMo test questions at that lag',{fs:11,c:'var(--mute)'});
  bk.forEach(([a,b],i)=>{const x0=X(a-1),x1=X(Math.min(b+1,T)),f=n[i]/N,hh=Math.max(2,bh*f/0.62);s+=rc(x0+0.5,by+4+bh-hh,x1-x0-1,hh,'var(--c3)',{op:.6,r:2});
    if(x1-x0>26||i===4)s+=tx((x0+x1)/2,by+bh+20,(f*100).toFixed(0)+'%',{fs:11,a:'middle',w:'600'})});
  host.innerHTML=svgW(w,H,s,label||'Share of the bank held by a turn, by lag')})};
// lag at which the turn's share first falls below the newest turn's times 2^-8
window.pctS=v=>v*100>=0.01?(v*100).toPrecision(2)+'%':sci(v*100,1)+'%';
window.lagBelow=function(sh){const lim=sh[1]*2**-8;for(let l=1;l<sh.length;l++)if(sh[l]<lim)return l;return null};
const DKC={};
function drawDK(){const rule=$('dkM').querySelector('.on').dataset.m,g=+$('dkG').querySelector('.on').dataset.m,key=rule+g;
  const r=DKC[key]||(DKC[key]=SIM.simulate({rule,scale:1,gamma:g,init:'zero',T:600}));
  decayChart($('dkSvg'),r,'Share of the bank held by a turn, '+rule+', gamma '+g);
  const lb=lagBelow(r.share),n=TB.t3.n,N=n.reduce((a,b)=>a+b,0),bm=SIM.bucketMeans(r.share);
  let past=0;if(lb!=null)SIM.BUCKETS.forEach(([a,b],i)=>{if(a>=lb)past+=n[i];else if(b>=lb)past+=n[i]*(b-lb+1)/(b-a+1)});
  $('dkO').innerHTML='A turn falls below the newest turn\'s share × 2⁻⁸ after <b>'+(lb==null?'more than 600':lb)+'</b> turns'+(lb!=null?'; about <b>'+(past/N*100).toFixed(0)+'%</b> of the test questions are older than that':'')+'. Mean share at lag 256+ against lag 0 to 31: <b>'+(bm[4]/bm[0]).toExponential(1).replace('e','×10^')+'</b>.'+
   (rule==='hebb'?' The Hebbian matrix is rescaled to norm 1 on <b>'+r.clipped+'</b> of 600 turns here, which shrinks old content far faster than γ alone.':rule==='slot'?' Slots that are not among the top 8 are left untouched, so old content survives in them: this rule forgets far less.':'')+
   ' Random latents, d = 32, 8 tokens per turn; the counts and γ are the paper\'s. Illustrative, not a rerun.'}
segBind('dkM',drawDK);segBind('dkG',drawDK);PRED_REVEAL['pr-decay']=drawDK;
})();
