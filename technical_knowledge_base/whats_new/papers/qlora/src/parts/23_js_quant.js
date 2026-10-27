// ---- Quantise real weights tab: the in-browser quantiser, whole-matrix results, perplexity and toy finetuning ----
(function(){
const QD=window.QD,QE=window.QE,TYPES=QD.types;
const TN={int4:'Int4',fp4_e2m1:'FP4 (E2M1)',fp4_e3m0:'FP4 (E3M0)',nf4:'NF4',af4:'AF4',nf4_dq:'NF4 + DQ',fp32:'16-bit'};
const TC={int4:'var(--c2)',fp4_e2m1:'var(--c4)',fp4_e3m0:'var(--c5)',nf4:'var(--c1)',af4:'var(--c3)',nf4_dq:'var(--c6)',fp32:'var(--mute)'};
const short=n=>n.replace('model.layers.','layer ').replace('.self_attn.',' ').replace('.mlp.',' ').replace('.weight','');
const BS=[16,32,64,128,256,512,1024,2048];
// tensors: the four LLaMA samples, plus two synthetic references
const rnd=mulberry32(20230523),gauss=()=>{let u=0,v=0;while(!u)u=rnd();v=rnd();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)};
const T=QD.w.map(t=>({n:'LLaMA 7B '+short(t.name),w:Array.from(QE.decF16(t.w)),key:t.name}));
T.push({n:'synthetic: Gaussian N(0, 1)',w:Array.from({length:2048},gauss)});
T.push({n:'synthetic: Student t, 3 degrees of freedom',w:Array.from({length:2048},()=>{const z=gauss(),c=gauss()**2+gauss()**2+gauss()**2;return z/Math.sqrt(c/3)})});
const sel=$('qzT');T.forEach((t,i)=>{const o=document.createElement('option');o.value=i;o.textContent=t.n;if(i===1)o.selected=true;sel.appendChild(o)});
function run(x,code,B,dqOn){const r=QE.quantise(x,code,B);if(dqOn){const d=QE.dq(Array.from(r.am),QD.dyn8,256);for(let i=0;i<x.length;i++){const b=Math.floor(i/B);r.q[i]=code[r.idx[i]]*d.q[b]}}return {r,st:QE.stats(x,r,code)}}
function draw(){const t=T[+sel.value],d=$('qzD').value,B=BS[+$('qzB').value],dqOn=$('qzQ').checked,code=TYPES[d];$('qzBv').textContent=fmt(B,0);
  const {r,st}=run(t.w,code,B,dqOn);
  fit($('qzSvg'),W=>{const pl=12,pr=12,H=250,ax=v=>pl+(W-pl-pr)*(v+1)/2,nb=Math.max(30,Math.min(100,Math.floor((W-pl-pr)/5)));const hist=new Array(nb).fill(0);
    t.w.forEach((v,i)=>{const xn=v/r.am[Math.floor(i/B)];hist[Math.min(nb-1,Math.floor((xn+1)/2*nb))]++});const hm=Math.max(...hist);let s='';
    hist.forEach((c,i)=>{const h=90*c/hm;s+=rc(pl+(W-pl-pr)*i/nb,110-h,Math.max(0.5,(W-pl-pr)/nb-0.6),h,'var(--dim)',{r:0})});
    code.forEach(v=>{s+=ln2(ax(v),14,ax(v),112,TC[d],{sw:1.3,op:.8})});
    s+=ln2(pl,110,W-pr,110,'var(--mute)');[-1,-0.5,0,0.5,1].forEach(v=>{s+=tx(ax(v),124,String(v),{fs:11,a:'middle',c:'var(--mute)'})});
    s+=tx(pl,10,W<560?'weights ÷ block absmax, and '+TN[d]+'\'s values':'weights ÷ their block\'s absmax (grey histogram) and the '+code.length+' values of '+TN[d],{fs:11,c:'var(--mute)'});
    // occupancy
    const n=t.w.length,mx=Math.max(0.2,...st.cnt.map(c=>c/n)),bw=(W-pl-pr)/code.length;
    st.cnt.forEach((c,i)=>{const h=80*(c/n)/mx;s+=rc(pl+i*bw+1,230-h,Math.max(1,bw-2),h,TC[d],{r:1})});
    s+=ln2(pl,230-80*(1/code.length)/mx,W-pr,230-80*(1/code.length)/mx,'var(--mute)',{da:'4 3'})+tx(W-pr,230-80*(1/code.length)/mx-4,'1/'+code.length,{fs:11,a:'end',c:'var(--mute)'});
    s+=tx(pl,144,'share of weights on each value, lowest to highest',{fs:11,c:'var(--mute)'})+ln2(pl,230,W-pr,230,'var(--mute)');
    $('qzSvg').innerHTML=svgW(W,H,s,'Quantiser')});
  const cb=QE.constBits(B,32,dqOn,8,256);
  $('qzOut').innerHTML=stat('relative squared error',(100*st.relmse).toFixed(3)+'%','Σ(q − w)² / Σw²')+stat('entropy of the codes',st.H.toFixed(2)+' bits','of '+Math.log2(code.length).toFixed(2)+' possible')+stat('values used',st.used+' of '+code.length,fmt(t.w.length,0)+' weights')+stat('storage',(4+cb).toFixed(3)+' bits per weight','4 + '+cb.toFixed(3)+' for the constants');
  const rows=['nf4','af4','int4','fp4_e2m1','fp4_e3m0'].map(k=>{const q=run(t.w,TYPES[k],B,dqOn).st;return [k,q]});const ref=rows[0][1].relmse;
  $('qzTab').innerHTML='<thead><tr><th>data type</th><th class="num">rel. squared error</th><th class="num">× NF4\'s</th><th class="num">entropy (bits)</th><th class="num">values used</th></tr></thead><tbody>'+rows.map(([k,q])=>'<tr'+(k===d?' class="hl"':'')+'><td>'+TN[k]+'</td><td class="num">'+(100*q.relmse).toFixed(3)+'%</td><td class="num">'+(q.relmse/ref).toFixed(2)+'</td><td class="num">'+q.H.toFixed(2)+'</td><td class="num">'+q.used+'</td></tr>').join('')+'</tbody>';
  $('qzNote').innerHTML='Block size '+fmt(B,0)+' over '+fmt(t.w.length,0)+' weights, so '+fmt(Math.ceil(t.w.length/B),0)+' blocks. '+(dqOn?'Double quantisation here rebuilds this sample\'s block constants from the 8-bit dynamic code with their mean subtracted (one second-level block). ':'')+'Codes: NF4 Appendix E; FP4 E2M1 as the bitsandbytes kernel dequantises it; E3M0 from bitsandbytes\' create_fp8_map(3, 0); Int4 the 15 symmetric levels of bitsandbytes\' int4 table; AF4 the block-64 code of Yoshida 2023 as shipped in bitsandbytes. All values are exact; nothing is fitted.'}
['qzT','qzD','qzQ'].forEach(id=>$(id).addEventListener('change',draw));$('qzB').addEventListener('input',draw);

function whole(){const ws=QD.ws,ts=['nf4','af4','int4','fp4_e2m1','fp4_e3m0'];
  let h='<thead><tr><th>matrix</th><th class="num">std</th><th class="num">excess kurtosis</th><th class="num">rows non-normal</th><th class="num">cols non-normal</th>'+ts.map(t=>'<th class="num">'+TN[t]+'</th>').join('')+'<th class="num">NF4 + DQ (dynamic 8-bit)</th><th class="num">NF4 + DQ (FP8 E4M3)</th><th class="num">constant error, dynamic / FP8</th><th class="num">NF4 entropy</th></tr></thead><tbody>';
  for(const k in ws){const s=ws[k],sh=s.shapiro;h+='<tr><td>'+short(k)+'</td><td class="num">'+s.std.toFixed(4)+'</td><td class="num">'+s.kurt.toFixed(2)+'</td><td class="num">'+(100*sh.rows_rejected/sh.rows).toFixed(1)+'%</td><td class="num">'+(100*sh.cols_rejected/sh.cols).toFixed(1)+'%</td>'+ts.map(t=>'<td class="num">'+(100*s.q[t].rel_mse).toFixed(3)+'%</td>').join('')+'<td class="num">'+(100*s.q.nf4_dq_dynamic8.rel_mse).toFixed(3)+'%</td><td class="num">'+(100*s.q.nf4_dq_fp8_e4m3.rel_mse).toFixed(3)+'%</td><td class="num">'+s.q.nf4.entropy_bits.toFixed(2)+'</td></tr>'}
  $('qzWhole').innerHTML=h+'</tbody>'}

function ppl(){const P=QD.ppl,models=window.pplModels(),ts=['fp32','int4','fp4_e2m1','fp4_e3m0','nf4','nf4_dq','af4'],g=(m,t)=>{const r=P.find(x=>x.model===m&&x.type===t);return r?r.ppl:null};
  const mode=$('ppM').value;
  fit($('ppSvg'),W=>{const tq=ts.filter(t=>mode==='ppl'||t!=='fp32'),lw=110,rowH=tq.length*13+16,H=models.length*rowH+10;let s='';
    const val=(m,t)=>mode==='ppl'?g(m,t):100*(g(m,t)/g(m,'fp32')-1);let mx=0;models.forEach(m=>tq.forEach(t=>{const v=val(m,t);if(v!=null)mx=Math.max(mx,v)}));mx*=1.12;
    const bw=W-lw-60;models.forEach((m,i)=>{const y=6+i*rowH;s+=tx(4,y+12,m.split('/')[1],{fs:12,w:600});tq.forEach((t,j)=>{const v=val(m,t);if(v==null)return;const yy=y+16+j*13;s+=tx(lw-6,yy+9,TN[t],{fs:11,a:'end',c:'var(--mute)'})+rc(lw,yy,bw*v/mx,10,TC[t],{r:1})+tx(lw+bw*v/mx+4,yy+9,mode==='ppl'?v.toFixed(2):'+'+v.toFixed(1)+'%',{fs:11})})});
    $('ppSvg').innerHTML=svgW(W,H,s,'Perplexity by data type')});
  $('ppTab').innerHTML='<thead><tr><th>model</th>'+ts.map(t=>'<th class="num">'+TN[t]+'</th>').join('')+'</tr></thead><tbody>'+models.map(m=>'<tr><td>'+m+'</td>'+ts.map(t=>{const v=g(m,t);const best=ts.slice(1).reduce((b,x)=>g(m,x)!=null&&(b==null||g(m,x)<g(m,b))?x:b,null);return '<td class="num'+(t===best?' b':'')+'">'+(v==null?'':v.toFixed(2))+'</td>'}).join('')+'</tr>').join('')+'</tbody>';
  const nf=models.filter(m=>['int4','fp4_e2m1','fp4_e3m0'].every(t=>g(m,'nf4')<g(m,t))).length;
  $('ppNote').innerHTML='quant_ppl.py, '+fmt(P[0].tokens,0)+' WikiText-2 test tokens per model, one run each (quantisation is deterministic). Bold: the best 4-bit type per model. NF4 beats Int4 and both FP4s on '+nf+' of '+models.length+' models: <b>Table 2\'s conclusion reproduces independently</b>; its finer ordering (Int4 worst) does not, since Int4 beats FP4 E2M1 on '+models.filter(m=>g(m,'int4')<g(m,'fp4_e2m1')).length+' of '+models.length+' here. AF4, built for block 64 by Yoshida, is '+(models.filter(m=>g(m,'af4')<g(m,'nf4')).length)+' of '+models.length+' better than NF4.'}
$('ppM').addEventListener('change',ppl);

function train(){const R=QD.trn||[];if(!R.length){$('trNote').innerHTML='The toy finetuning (train_qlora.py) has not been run yet.';return}
  const cols=['var(--mute)','var(--c1)','var(--c4)','var(--c2)','var(--c5)','var(--c3)','var(--dim)','var(--c6)'];
  fit($('trSvg'),W=>{const H=220,pl=40,pb=30,pt=10,all=R.flatMap(r=>r.curve.map(c=>c[1])),lo=Math.min(...all),hi=Math.min(Math.max(...all),lo+2.2),xs=s=>pl+(W-pl-8)*s/(R[0].steps-1),ys=v=>pt+(H-pt-pb)*(1-(Math.min(v,hi)-lo)/(hi-lo));let s='';
    for(let v=Math.ceil(lo*2)/2;v<=hi;v+=0.5)s+=ln2(pl,ys(v),W-8,ys(v),'var(--line)')+tx(pl-5,ys(v)+4,v.toFixed(1),{fs:11,a:'end',c:'var(--mute)'});
    R.forEach((r,i)=>{if(/seed 1/.test(r.name))return;let p='';r.curve.forEach((c,j)=>{p+=(j?'L':'M')+xs(c[0]).toFixed(1)+','+ys(c[1]).toFixed(1)});s+='<path d="'+p+'" fill="none" stroke="'+cols[i%cols.length]+'" stroke-width="1.6" opacity=".9"/>'});
    s+=tx(pl,H-6,W<620?'training loss, every 10th step (log)':'training loss per step (every 10th step, from the log; batches are identical across runs)',{fs:11,c:'var(--mute)'});
    const lg=legend(R.filter(r=>!/seed 1/.test(r.name)).map((r,i)=>[r.name,cols[R.indexOf(r)%cols.length]]),pl,H+12,W-pl);s+=lg.s;
    $('trSvg').innerHTML=svgW(W,H+lg.h+6,s,'Toy QLoRA training curves')});
  const b=n=>R.find(r=>r.name===n);const f32=b('fp32 + LoRA all');
  $('trTab').innerHTML='<thead><tr><th>run</th><th class="num">trainable</th><th class="num">perplexity before</th><th class="num">after 200 steps</th><th class="num">after, minus 16-bit LoRA</th><th class="num">lr</th></tr></thead><tbody>'+R.map(r=>'<tr><td>'+r.name+'</td><td class="num">'+fmt(r.trainable,0)+'</td><td class="num">'+r.ppl_before.toFixed(2)+'</td><td class="num">'+r.ppl_after.toFixed(2)+'</td><td class="num">'+(f32?(r.ppl_after-f32.ppl_after>=0?'+':'')+(r.ppl_after-f32.ppl_after).toFixed(2):'')+'</td><td class="num">'+r.lr+'</td></tr>').join('')+'</tbody>';
  const n=b('NF4 + DQ + LoRA all'),s1=b('fp32 + LoRA all (seed 1)'),n1=b('NF4 + DQ + LoRA all (seed 1)');
  let note='train_qlora.py; WikiText-2 test, first 20,480 tokens. ';
  if(f32&&n)note+='Before finetuning NF4 + DQ costs '+(n.ppl_before-f32.ppl_before).toFixed(2)+' perplexity points; after 200 steps of LoRA the gap to the 16-bit base with the same adapters is '+(n.ppl_after-f32.ppl_after).toFixed(2)+'. ';
  if(s1&&n1)note+='A second seed (adapter initialisation and dropout; same batches) gives '+s1.ppl_after.toFixed(2)+' and '+n1.ppl_after.toFixed(2)+', so seed noise is about '+Math.max(Math.abs(s1.ppl_after-f32.ppl_after),Math.abs(n1.ppl_after-n.ppl_after)).toFixed(2)+'. ';
  note+='A toy: 160M parameters, 200 steps, language modelling rather than instructions; it tests the direction of Table 3\'s claim, not its size. The LoRA learning rate was set once (1e-3) and not tuned. A 16-bit full-finetuning row was dropped: at 8 to 16 seconds a step on a shared CPU it would have taken about 40 minutes for this one row.';
  $('trNote').innerHTML=note}
onTab('t-quant',()=>{draw();whole();ppl();train()});
})();
