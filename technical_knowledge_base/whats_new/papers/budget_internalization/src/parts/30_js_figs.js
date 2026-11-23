// ---- The paper tab's figures: Fig. 1 (the crossover, model and data buttons), Fig. 2 (mean length at the largest budget),
// Fig. 3 (differences from the base model per task), Fig. 4 (the forcing and cue controls, RD.anim), Fig. 5 (one objective term
// at a time, RD.anim), Fig. 6 (the two fine-tuning arms). Every number comes from window.PAPER.tables (mk_tables.py) or
// PAPER.rc (recompute.py), except Fig. 4's forcing-up and cue values, which the paper prints only in its text (§2.3, Appendix B).
(function(){
if(!window.PAPER||!window.RD)return;
const T=PAPER.tables,RC=PAPER.rc;
const S=(w,h,b,l)=>'<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img" aria-label="'+(l||'')+'" style="max-width:100%;height:auto;display:block">'+b+'</svg>';
const tx=(x,y,t,o)=>{o=o||{};return '<text x="'+(+x).toFixed(1)+'" y="'+(+y).toFixed(1)+'" font-size="'+(o.fs||12)+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' fill="'+(o.c||'var(--ink)')+'"'+(o.w?' font-weight="'+o.w+'"':'')+(o.op!=null?' opacity="'+o.op+'"':'')+(o.cls?' class="'+o.cls+'"':'')+'>'+t+'</text>'};
const rc=(x,y,w,h,f,o)=>{o=o||{};return '<rect x="'+(+x).toFixed(1)+'" y="'+(+y).toFixed(1)+'" width="'+Math.max(0,w).toFixed(1)+'" height="'+Math.max(0,h).toFixed(1)+'" rx="'+(o.r==null?3:o.r)+'" fill="'+f+'"'+(o.op!=null?' opacity="'+o.op+'"':'')+(o.cls?' class="'+o.cls+'"':'')+'/>'};
const ln=(x1,y1,x2,y2,c,o)=>{o=o||{};return '<line x1="'+(+x1).toFixed(1)+'" y1="'+(+y1).toFixed(1)+'" x2="'+(+x2).toFixed(1)+'" y2="'+(+y2).toFixed(1)+'" stroke="'+c+'" stroke-width="'+(o.sw||1.2)+'"'+(o.da?' stroke-dasharray="'+o.da+'"':'')+(o.op!=null?' opacity="'+o.op+'"':'')+'/>'};
const pl=(pts,c,o)=>{o=o||{};return '<polyline points="'+pts.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ')+'" fill="none" stroke="'+c+'" stroke-width="'+(o.sw||2.2)+'"'+(o.da?' stroke-dasharray="'+o.da+'"':'')+(o.op!=null?' opacity="'+o.op+'"':'')+' stroke-linejoin="round"/>'};
const W=el=>{const w=el&&el.clientWidth;return w&&w>60?Math.floor(w):Math.max(280,Math.min(640,(document.documentElement.clientWidth||900)-60))};
// a difference of two two-decimal values, rounded half away from zero to one decimal (as recompute.py does)
const d1=(a,b)=>{const c=Math.round(a*100)-Math.round(b*100);return Math.sign(c)*Math.floor(Math.abs(c)/10+0.5)/10};
const sg=v=>(v>0?'+':v<0?'−':'')+Math.abs(v).toFixed(1);
const kv=b=>b==='512'?0.5:parseFloat(b);
const seg=(id,f)=>{const el=document.getElementById(id);el.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>f(+b.dataset.m)))};
const segOn=(id,i)=>document.getElementById(id).querySelectorAll('button').forEach(b=>{const on=+b.dataset.m===i;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on?'true':'false')});
function fit2(id,f){const el=document.getElementById(id);if(!el)return;let lw=-1;const go=()=>{const w=el.clientWidth;if(w>0&&w!==lw){lw=w;f()}};
  if('ResizeObserver' in window)new ResizeObserver(()=>requestAnimationFrame(go)).observe(el);RD.onRender(()=>{lw=-1;go()});go()}
// end labels on the right, pushed apart
function endLabels(ends,x,gap){ends.sort((a,b)=>a.y-b.y);let last=-99,s='';ends.forEach(e=>{e.ly=Math.max(e.y,last+(gap||15));last=e.ly});
  const over=Math.max(0,(ends.length?ends[ends.length-1].ly:0)-(ends.H||1e9));ends.forEach(e=>{s+=tx(x,e.ly-over+4,e.t,{fs:12,c:e.c,w:600})});return s}
const MOD=['Qwen3.5-4B','Gemma4-E2B','Nemotron-3-Nano-4B'],SH={'Qwen3.5-4B':'Qwen','Gemma4-E2B':'Gemma','Nemotron-3-Nano-4B':'Nemotron'};
const TOP={'Qwen3.5-4B':'64k','Gemma4-E2B':'16k','Nemotron-3-Nano-4B':'16k'};

// ---------- Fig. 1: the crossover ----------
let f1m=0,f1d=0;
function curvesFor(mi,di){const m=MOD[mi];
  if(di===0){const o=T.t8[m],caps=Object.keys(o.rows).filter(k=>k!=='Base');
    return {budgets:o.budgets,base:o.rows.Base.acc,tr:caps.map((c,j)=>{const sd=T.t15.rows[SH[m]+' '+c];
      return {cap:c,acc:o.rows[c].acc,lo:o.budgets.map(b=>Math.min(...sd.map(s=>s.acc[T.t15.budgets.indexOf(b)]))),hi:o.budgets.map(b=>Math.max(...sd.map(s=>s.acc[T.t15.budgets.indexOf(b)]))),c:j?'var(--c4)':'var(--c2)'}})}}
  const o=T.t9[m],k=Object.keys(o).find(x=>x.startsWith('RG'));
  return {budgets:o.budgets,base:o.Base,tr:[{cap:k.split(' ')[1],acc:o[k],c:'var(--c2)',da:'6 4'}]}}
window.BI_FIG1=curvesFor; // read by check_page.mjs
function drawCross(){const host=document.getElementById('biCrossSvg');const w=W(host),nar=w<460;
  const cv=curvesFor(f1m,f1d),xs=cv.budgets.map(kv),L=Math.log2;
  const pL=34,pR=nar?108:122,pT=12,pB=34,h=nar?250:290;
  const X=v=>pL+(w-pL-pR)*(L(v)-L(xs[0]))/(L(xs[xs.length-1])-L(xs[0]));
  const ymax=Math.ceil(Math.max(...cv.base,...cv.tr.map(t=>Math.max(...(t.hi||t.acc))))/10)*10+5,Y=v=>pT+(h-pT-pB)*(1-v/ymax);
  let s='';for(let v=0;v<=ymax;v+=20){s+=ln(pL,Y(v),w-pR,Y(v),'var(--line)')+tx(pL-5,Y(v)+4,v+'%',{fs:11,a:'end',c:'var(--mute)'})}
  cv.budgets.forEach((b,i)=>{if(nar&&b==='512')return;s+=tx(X(xs[i]),h-pB+15,b,{fs:11,a:'middle',c:'var(--mute)'})});
  s+=tx((pL+w-pR)/2,h-4,'evaluation budget (generated tokens)',{fs:11,a:'middle',c:'var(--mute)'});
  cv.tr.forEach(t=>{const x=X(kv(t.cap));s+=ln(x,pT,x,h-pB,t.c,{da:'3 3',op:.8})+tx(x+3,pT+10,t.cap+' cap',{fs:11,c:t.c})});
  cv.tr.forEach(t=>{if(t.lo){const up=xs.map((x,i)=>X(x).toFixed(1)+','+Y(t.hi[i]).toFixed(1)),dn=xs.map((x,i)=>X(x).toFixed(1)+','+Y(t.lo[i]).toFixed(1)).reverse();
    s+='<polygon points="'+up.concat(dn).join(' ')+'" fill="'+t.c+'" opacity=".16"/>'}});
  s+=pl(xs.map((x,i)=>[X(x),Y(cv.base[i])]),'var(--c1)');cv.base.forEach((v,i)=>{s+='<circle cx="'+X(xs[i]).toFixed(1)+'" cy="'+Y(v).toFixed(1)+'" r="3" fill="var(--c1)"/>'});
  cv.tr.forEach(t=>{s+=pl(xs.map((x,i)=>[X(x),Y(t.acc[i])]),t.c,{da:t.da});t.acc.forEach((v,i)=>{s+='<circle cx="'+X(xs[i]).toFixed(1)+'" cy="'+Y(v).toFixed(1)+'" r="3" fill="'+t.c+'"/>'})});
  const n=xs.length-1,ends=[{y:Y(cv.base[n]),t:'base '+cv.base[n].toFixed(2),c:'var(--c1)'}].concat(cv.tr.map(t=>({y:Y(t.acc[n]),t:t.cap+'-trained '+t.acc[n].toFixed(2),c:t.c})));
  ends.H=h-pB;s+=endLabels(ends,w-pR+6,15);
  host.innerHTML=S(w,h,s,'AIME accuracy against the evaluation budget, base and trained, '+MOD[f1m]);
  const top=cv.budgets[n];
  document.getElementById('biCrossSum').innerHTML=cv.tr.map(t=>'<span style="color:'+t.c+';font-weight:600">'+t.cap+'-trained</span>: '+sg(d1(t.acc[cv.budgets.indexOf(t.cap)],cv.base[cv.budgets.indexOf(t.cap)]))+' points at its '+t.cap+' cap, '+sg(d1(t.acc[n],cv.base[n]))+' at '+top).join('; ')+(f1d?' (single run, Reasoning Gym; its own base evaluation).':' (seed means).')}
seg('biCrossM',i=>{f1m=i;segOn('biCrossM',i);drawCross()});seg('biCrossD',i=>{f1d=i;segOn('biCrossD',i);drawCross()});
fit2('biCrossSvg',drawCross);

// ---------- Fig. 2: mean length at the largest budget (Table 1) ----------
function drawLen(){const host=document.getElementById('biLenSvg');const w=W(host),nar=w<460;
  const lab=nar?104:132,pR=nar?44:52,rh=22,gap=12,x0=lab,x1=w-pR,X=v=>x0+(x1-x0)*v/28;
  let y=6,s='';
  T.t1.forEach(r=>{s+=tx(0,y+12,(nar?SH[r.model]:r.model)+', at '+r.at,{fs:12,w:600});y+=18;
    const rows=[['base',r.base,null,'var(--c1)']].concat(Object.entries(r.trained).map(([c,v],j)=>[c+'-trained',v[0],[v[1],v[2]],j?'var(--c4)':'var(--c2)']));
    rows.forEach(([n,v,rg,c])=>{s+=tx(lab-8,y+rh/2+4,n,{fs:12,a:'end',c:'var(--mute)'})+rc(x0,y+3,X(v)-x0,rh-6,c,{op:.85});
      if(rg)s+=ln(X(rg[0]),y+rh/2,X(rg[1]),y+rh/2,'var(--ink)',{sw:1.4})+ln(X(rg[0]),y+5,X(rg[0]),y+rh-5,'var(--ink)')+ln(X(rg[1]),y+5,X(rg[1]),y+rh-5,'var(--ink)');
      s+=tx(X(rg?rg[1]:v)+5,y+rh/2+4,v.toFixed(2)+'k',{fs:12});y+=rh});y+=gap});
  [0,10,20].forEach(v=>{s+=ln(X(v),6,X(v),y-gap,'var(--line)',{op:.7})+tx(X(v),y+4,v+'k',{fs:11,a:'middle',c:'var(--mute)'})});
  host.innerHTML=S(w,y+10,s,'Mean AIME output length at the largest budget, base against trained');
  const q=T.t1[0];document.getElementById('biLenSum').innerHTML='Mean tokens per AIME answer at each model\'s largest budget, base model against trained checkpoints; whiskers span the three seeds ('+'<a href="'+PAPER.meta.ax+'#S2.T1" target="_blank" rel="noopener noreferrer">Table 1</a>). Qwen\'s 4k-trained model writes '+(q.base/q.trained['4k'][0]).toFixed(1)+' times fewer tokens than its base model with the same 64k allowance.'}
fit2('biLenSvg',drawLen);

// ---------- Fig. 3: difference from the base model at the largest budget, per task ----------
(function(){const host=document.getElementById('biHmT');if(!host)return;
  const cell=v=>{if(v==null)return '<td>–</td>';const a=Math.min(1,Math.abs(v)/40),c=v>=0?'var(--c1)':'var(--c2)';return '<td style="background:color-mix(in srgb,'+c+' '+Math.round(10+55*a)+'%,transparent)">'+sg(v)+'</td>'};
  const rows=[],at=(o,b,top)=>o.budgets?o.budgets.indexOf(top):b.indexOf(top);
  MOD.forEach(m=>{const o=T.t8[m],top=TOP[m],b=o.budgets,tt=T.t10[m],tb=tt.budgets,ttop=tb[tb.length-1];
    Object.keys(o.rows).filter(k=>k!=='Base').forEach(c=>rows.push(['math',SH[m]+' '+c,d1(o.rows[c].acc[b.indexOf(c)],o.rows.Base.acc[b.indexOf(c)]),d1(o.rows[c].acc[b.indexOf(top)],o.rows.Base.acc[b.indexOf(top)]),
      d1(tt.GPQA[c][tb.indexOf(ttop)],tt.GPQA.Base[tb.indexOf(ttop)]),d1(tt['LCB-v6'][c][tb.indexOf(ttop)],tt['LCB-v6'].Base[tb.indexOf(ttop)])]))});
  MOD.forEach(m=>{const o=T.t9[m],k=Object.keys(o).find(x=>x.startsWith('RG')),cap=k.split(' ')[1],b=o.budgets,top=TOP[m],tt=T.t10[m],tb=tt.budgets,ttop=tb[tb.length-1],r=Object.entries(T.t11).find(([n])=>n.startsWith(m))[1];
    rows.push(['rg',SH[m]+' '+cap,d1(o[k][b.indexOf(cap)],o.Base[b.indexOf(cap)]),d1(o[k][b.indexOf(top)],o.Base[b.indexOf(top)]),d1(r.GPQA[r.budgets.indexOf(ttop)],tt.GPQA.Base[tb.indexOf(ttop)]),d1(r['LCB-v6'][r.budgets.indexOf(ttop)],tt['LCB-v6'].Base[tb.indexOf(ttop)])])});
  window.BI_FIG3=rows; // read by check_page.mjs
  let h='<table class="bi-hm"><thead><tr><th>Trained on, cap</th><th>AIME at cap</th><th>AIME</th><th>GPQA</th><th>LCB v6</th></tr></thead><tbody>';
  let g='';rows.forEach(r=>{if(r[0]!==g){g=r[0];h+='<tr class="grp"><td colspan="5">'+(g==='math'?'Math (DeepScaleR)':'Reasoning Gym')+'</td></tr>'}h+='<tr><td>'+r[1]+'</td>'+r.slice(2).map(cell).join('')+'</tr>'});
  host.innerHTML=h+'</tbody></table>'})();

// ---------- Fig. 4: the forcing and cue controls (RD.anim) ----------
const TASKS=['AIME','GPQA','LiveCodeBench'];
const t7=T.t7,bf=['AIME','GPQA-Diamond','LCB-v6'].map(k=>d1(t7[k].forced[0],t7[k].base[0]));
const FS=[{n:'base, answer forced (4k)',v:bf,c:'var(--c1)'},
 {n:'trained, forced up, read at 4k',v:[-36.1,-51.0,-5.1],c:'var(--c2)'},  // §2.3 text; no table of levels
 {n:'trained, forced up, read at 64k',v:[0.0,2.7,5.0],c:'var(--c4)'},      // §2.3 text, +2.58k to 2.74k tokens
 {n:'4k cue: base | cue-trained',v:[0.0,null,null],v2:[d1(38.3,52.2),null,null],c:'var(--c3)'}]; // Appendix B: 76.1 to 76.1; 52.2 to 38.3
window.BI_FIG4=FS;
const FCAP=['<b>Base model, answer forced</b> at a matched budget: large gains, so it often has an answer early.','<b>Trained model forced to keep thinking</b>, read at 4k: it runs out of tokens.','<b>Forced up, read at 64k</b>: 2.6k more tokens, almost no accuracy back.','<b>The budget stated in the prompt</b> (AIME only): ignored by the base model, costly for a cue-trained one.'];
function drawForce(i){const host=document.getElementById('biForceSvg');const w=W(host),nar=w<460,h=nar?250:270;
  const pL=34,pR=6,pT=14,pB=28,lo=-55,hi=62,Y=v=>pT+(h-pT-pB)*(hi-v)/(hi-lo),gw=(w-pL-pR)/3,bw=Math.min(26,(gw-16)/5);
  let s='';[-40,-20,0,20,40,60].forEach(v=>{s+=ln(pL,Y(v),w-pR,Y(v),v===0?'var(--mute)':'var(--line)',{sw:v===0?1.4:1})+tx(pL-5,Y(v)+4,(v>0?'+':v<0?'−':'')+Math.abs(v),{fs:11,a:'end',c:'var(--mute)'})});
  TASKS.forEach((t,g)=>{const gx=pL+g*gw;s+=tx(gx+gw/2,h-8,t,{fs:12,a:'middle',w:600});
    let k=0;FS.forEach((f,j)=>{[f.v,f.v2].forEach((vv,q)=>{if(!vv)return;const v=vv[g];const x=gx+(gw-5*bw)/2+k*bw;k++;if(j>i||v==null)return;
      const cur=j===i,y0=Y(Math.max(0,v)),y1=Y(Math.min(0,v));const col=q?'var(--c2)':f.c;
      s+=rc(x+1,y0,bw-2,Math.max(1.5,y1-y0),col,{op:cur?.95:.3,r:2,cls:cur?'rd-new':''});
      if(cur)s+=tx(x+bw/2,v>=0?y0-4:y1+13,sg(v),{fs:11,a:'middle',w:600,cls:'rd-new'})})})});
  host.innerHTML=S(w,h,s,'Change in accuracy under each intervention');document.getElementById('biForceCap').innerHTML=FCAP[i]}
const force=RD.anim({card:'biForce',ctl:'biForceCtl',n:4,list:'sx-force',label:'Step',ms:4600,draw:drawForce});
fit2('biForceSvg',()=>force.redraw());

// ---------- Fig. 5: one objective term at a time (RD.anim) ----------
const FR=RC.frontier,GROUPS=['GRPO','Data','Truncation','Normalization','KL anchoring','RFT'],TERM=['B','D','R','c','K',''];
const SHORT={'DeepScaleR (standard)':'standard GRPO','GSM8K':'GSM8K','Nemotron-RL-Math-v2':'Nemotron-Math-v2','Loss masking':'loss masking','DAPO overlength penalty':'DAPO penalty','Forced answer':'forced answer','Dr.GRPO':'Dr. GRPO','β = 0.001':'β 0.001','β = 0.01':'β 0.01','Short traces (< 4k)':'RFT, natural','Budget-forced traces (4k)':'RFT, truncated'};
const OCAP=['The standard run: a big gain at the 8k cap, a big loss at 64k.','Easier data: less truncation, less gain, less loss.','Scoring truncated rollouts: only forced answers remove the loss, with the gain.','Length normalisation: no change.','KL anchoring: a strong anchor slides toward the base model.','Supervised controls: truncation, not RL, carries the effect.'];
window.BI_FIG5=FR;
function placeLabels(pts,Wd,Hd,x0){x0=x0||0;const boxes=[],dots=pts.map(p=>({x:p.x-6,y:p.y-6,w:12,h:12}));
  const hit=b=>b.x<x0||b.x+b.w>Wd||b.y<0||b.y+b.h>Hd||boxes.concat(dots).some(o=>b.x<o.x+o.w&&o.x<b.x+b.w&&b.y<o.y+o.h&&o.y<b.y+b.h);
  pts.forEach(p=>{const fs=12,w=p.t.length*fs*.6,h=fs+2;
    const C=[[p.x+9,p.y-h/2],[p.x-9-w,p.y-h/2],[p.x-w/2,p.y-10-h],[p.x-w/2,p.y+10],[p.x+9,p.y-h-5],[p.x+9,p.y+5],[p.x-9-w,p.y-h-5],[p.x-9-w,p.y+5],[p.x-w/2,p.y-24-h],[p.x-w/2,p.y+24]];
    const c=C.find(([x,y])=>!hit({x,y,w,h}))||C[0];boxes.push({x:c[0],y:c[1],w,h});p.lx=c[0];p.ly=c[1]+h-3});return pts}
function drawObj(i){const host=document.getElementById('biObjSvg');const w=W(host),nar=w<460,h=nar?250:290;
  document.querySelectorAll('#biEq .tm').forEach(e=>e.classList.toggle('on',e.dataset.t===TERM[i]));
  const pL=36,pR=16,pT=10,pB=32,X=v=>pL+(w-pL-pR)*(v+10)/60,Y=v=>pT+(h-pT-pB)*(10-v)/55;
  let s=rc(X(0),Y(10),X(50)-X(0),Y(0)-Y(10),'var(--c3)',{op:.13,r:0})+tx(X(49),Y(10)+14,'gain at the cap, no loss at 64k',{fs:11,a:'end',c:'var(--c3)'});
  [-40,-30,-20,-10,0,10].forEach(v=>{s+=ln(pL,Y(v),w-pR,Y(v),v===0?'var(--mute)':'var(--line)',{sw:v===0?1.3:1})+tx(pL-5,Y(v)+4,(v>0?'+':v<0?'−':'')+Math.abs(v),{fs:11,a:'end',c:'var(--mute)'})});
  [-10,0,10,20,30,40,50].forEach(v=>{if(nar&&v%20&&v!==-10)return;s+=ln(X(v),Y(10),X(v),Y(-45),v===0?'var(--mute)':'var(--line)',{sw:v===0?1.3:1,op:v===0?1:.5})+tx(X(v),h-pB+14,(v>0?'+':v<0?'−':'')+Math.abs(v),{fs:11,a:'middle',c:'var(--mute)'})});
  s+=tx((pL+w-pR)/2,h-3,'gain over the base model at the 8k cap (points)',{fs:11,a:'middle',c:'var(--mute)'});
  s+=tx(pL+4,Y(-45)-6,'change at 64k (points)',{fs:11,c:'var(--mute)'});
  s+='<circle cx="'+X(0)+'" cy="'+Y(0)+'" r="4.5" fill="var(--c1)"/>';
  const pts=[{x:X(0),y:Y(0),t:'base model',c:'var(--c1)'}];
  FR.forEach(f=>{const g=GROUPS.indexOf(f.group);if(g>i)return;const cur=g===i;const p={x:X(f.gain8k),y:Y(f.delta64k),t:SHORT[f.variant],cur,c:cur?'var(--c2)':'var(--mute)',lab:cur||f.group==='GRPO'};pts.push(p)});
  pts.forEach(p=>{if(p.t!=='base model')s+='<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="'+(p.cur?5.5:4)+'" fill="'+p.c+'"'+(p.cur?' class="rd-new"':' opacity=".55"')+'/>'});
  placeLabels(pts.filter(p=>p.lab||p.t==='base model'),w,h-pB,pL+2).forEach(p=>{s+=tx(p.lx,p.ly,p.t,{fs:12,c:p.cur?'var(--c2)':p.c,w:p.cur?600:400})});
  host.innerHTML=S(w,h,s,'Ablations: gain at the 8k cap against the change at 64k');document.getElementById('biObjCap').innerHTML=OCAP[i]+' <span class="mute">Points from Table 3\'s rounded entries.</span>'}
const obj=RD.anim({card:'biObj',ctl:'biObjCtl',n:6,list:'sx-obj',label:'Step',ms:4800,draw:drawObj});
fit2('biObjSvg',()=>obj.redraw());

// ---------- Fig. 6: the two fine-tuning arms (Table 3) ----------
function drawRft(){const host=document.getElementById('biRftSvg');const w=W(host),nar=w<460,h=nar?230:260;
  const R=T.t3.rows,bud=T.t3.budgets,xs=bud.map(kv),L=Math.log2,pL=34,pR=nar?108:124,pT=10,pB=32;
  const X=v=>pL+(w-pL-pR)*(L(v)-1)/5,Y=v=>pT+(h-pT-pB)*(1-v/90);
  let s='';[0,20,40,60,80].forEach(v=>{s+=ln(pL,Y(v),w-pR,Y(v),'var(--line)')+tx(pL-5,Y(v)+4,v+'%',{fs:11,a:'end',c:'var(--mute)'})});
  bud.forEach((b,i)=>{s+=tx(X(xs[i]),h-pB+15,b,{fs:11,a:'middle',c:'var(--mute)'})});s+=tx((pL+w-pR)/2,h-3,'evaluation budget',{fs:11,a:'middle',c:'var(--mute)'});
  s+=ln(X(4),pT,X(4),h-pB,'var(--mute)',{da:'3 3'})+tx(X(4)+3,pT+10,'4k: trace length limit',{fs:11,c:'var(--mute)'});
  const L4=[[R[0],'base','var(--c1)'],[R[1],'GRPO','var(--mute)','5 4'],[R[10],'RFT, natural','var(--c3)'],[R[11],'RFT, truncated','var(--c2)']];
  const ends=[];L4.forEach(([r,n,c,da])=>{s+=pl(xs.map((x,i)=>[X(x),Y(r.acc[i])]),c,{da,sw:da?1.6:2.4});ends.push({y:Y(r.acc[5]),t:n+' '+r.acc[5].toFixed(1),c})});
  ends.H=h-pB;s+=endLabels(ends,w-pR+6,15);
  host.innerHTML=S(w,h,s,'Fine-tuning on natural against truncated short traces');
  document.getElementById('biRftSum').innerHTML='AIME avg@16 of Qwen3.5-4B after rejection fine-tuning on its own correct answers of at most 4k tokens, naturally finished or cut and forced, with the standard GRPO run for reference; at 64k: natural '+R[10].acc[5].toFixed(1)+'%, truncated '+R[11].acc[5].toFixed(1)+'%, base '+R[0].acc[5].toFixed(1)+'% (<a href="'+PAPER.meta.ax+'#S3.T3" target="_blank" rel="noopener noreferrer">Table 3</a>, one run each).'}
fit2('biRftSvg',drawRft);
})();
