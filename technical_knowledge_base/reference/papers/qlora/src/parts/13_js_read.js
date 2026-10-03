// ---- The paper tab: memory bars, one block quantised (animation), NF4 builder, occupancy, DQ calculator,
// paged optimizers (animation), Figures 2 and 4, Tables 2 to 4, the toy results, Elo intervals ----
(function(){
const QD=window.QD,QE=window.QE,RC=(window.PAPER||{}).rc||{};
const TYPES=QD.types,TN={int4:'Int4',fp4_e2m1:'FP4 (E2M1)',fp4_e3m0:'FP4 (E3M0)',nf4:'NF4',af4:'AF4',nf4_dq:'NF4 + DQ'};
const TC={int4:'var(--c2)',fp4_e2m1:'var(--c4)',fp4_e3m0:'var(--c5)',nf4:'var(--c1)',af4:'var(--c3)',nf4_dq:'var(--c1)',fp32:'var(--mute)'};
const W8=QD.w.map(t=>({name:t.name,w:QE.decF16(t.w),am:QE.decF32(t.absmax)}));
const short=n=>n.replace('model.layers.','layer ').replace('.self_attn.',' ').replace('.mlp.',' ').replace('.weight','');
const f1=v=>v==null?'?':fmt(v,1),f0=v=>v==null?'?':fmt(v,0);
const PPT=['fp32','int4','fp4_e2m1','fp4_e3m0','nf4','nf4_dq','af4'],pplModels=()=>[...new Set(QD.ppl.map(r=>r.model))].filter(m=>PPT.every(t=>QD.ppl.some(r=>r.model===m&&r.type===t)));
const fillText=(id,h)=>{const e=$(id);if(e)e.innerHTML=h};
const tabA=(t,tab,to)=>'<a href="#" data-tab="'+tab+'"'+(to?' data-to="'+to+'"':'')+'>'+t+'</a>';

// ---------- 1. memory bars (Problem, behind the predict question) ----------
const LL=RC.llama||{};
function memParts(m,meth){const c=LL[m];if(!c)return [];const P=c.total,lin=c.linear,oth=c.other,lo=c.lora_r64_all;
  if(meth==='full')return [['weights (BF16)',P*2,'var(--c1)'],['gradients (BF16)',P*2,'var(--c2)'],['Adam moments (FP32)',P*8,'var(--c3)']];
  if(meth==='lora')return [['weights (BF16)',P*2,'var(--c1)'],['adapters + gradients',lo*4,'var(--c2)'],['Adam (adapters)',lo*8,'var(--c3)']];
  return [['weights (NF4 + DQ)',lin*(4+0.127)/8+oth*2,'var(--c1)'],['adapters + gradients',lo*4,'var(--c2)'],['Adam (adapters)',lo*8,'var(--c3)']]}
function drawMem(){const host=$('mcSvg');if(!host)return;fit(host,W=>{const m=$('mcM').value,g=+$('mcG').value*1e9;
  const rows=[['16-bit full finetuning','full'],['16-bit LoRA (r = 64, all layers)','lora'],['QLoRA (NF4 + DQ, r = 64)','q']];
  const tot=rows.map(r=>memParts(m,r[1]).reduce((a,p)=>a+p[1],0)),mx=Math.max(...tot,g)*1.04;
  const lw=Math.min(190,W*0.38),bw=W-lw-12,H=rows.length*46+40,xs=v=>lw+bw*v/mx;let s='';
  rows.forEach((r,i)=>{const y=12+i*46;let x=0;s+=tx(lw-8,y+15,r[0],{fs:12,a:'end'});
    memParts(m,r[1]).forEach(p=>{s+=rc(xs(x),y,Math.max(0.5,xs(x+p[1])-xs(x)),20,p[2],{r:0});x+=p[1]});
    s+=tx(Math.min(W-4,xs(x)+4),y+34,f1(x/1e9)+' GB'+(x>g?', does not fit':', fits'),{fs:11,a:xs(x)+120>W?'end':'start',c:x>g?'var(--bad)':'var(--good)'})});
  s+=ln2(xs(g),4,xs(g),H-26,'var(--bad)',{sw:1.6,da:'5 3'})+tx(xs(g)+(xs(g)>W-90?-4:4),H-14,'one '+(g/1e9)+' GB GPU',{fs:11,c:'var(--bad)',a:xs(g)>W-90?'end':'start'});
  const lg=legend([['weights','var(--c1)'],['gradients or adapters','var(--c2)'],['optimizer','var(--c3)']],lw,H+2,bw);s+=lg.s;
  host.innerHTML=svgW(W,H+lg.h,s,'Finetuning memory before activations');
  $('mcNote').innerHTML='LLaMA '+m+': '+fmt(LL[m].total,0)+' parameters recounted from its configuration; LoRA r = 64 on all seven linear layers adds '+fmt(LL[m].lora_r64_all,0)+'. Bytes per parameter: BF16 2, FP32 Adam moments 8 (paged_adamw_32bit). Activations are left out (Figure 6 puts them at well under 1 GB at batch 1 and 512 tokens with gradient checkpointing). Defaults reproduce §1\'s "more than 780 GB" for 65B by this accounting (783 GB) and stay under §1\'s 48 GB for QLoRA independently.'})}
PRED_REVEAL['pr-mem']=()=>{drawMem();['mcM','mcG'].forEach(id=>$(id).addEventListener('change',()=>refit($('mcSvg'))))};

// ---------- 2. one block quantised, three data types (animation) ----------
const qbT=$('qbT');W8.forEach((t,i)=>{const o=document.createElement('option');o.value=i;o.textContent=short(t.name);if(i===1)o.selected=true;qbT.appendChild(o)});
let QB=null;
function qbBlock(){const t=W8[+qbT.value];return Array.from(t.w.slice(64*5,64*6))}
function qbData(m){const x=qbBlock(),code=TYPES[m],r=QE.quantise(x,code,64),st=QE.stats(x,r,code);return {x,code,r,st,am:r.am[0]}}
const qbSteps=m=>[
 {t:'64 weights, as stored in FP16',c:'One block of 64 consecutive weights from '+short(W8[+qbT.value].name)+' of LLaMA 7B. They are small numbers, typically a few hundredths, and roughly bell-shaped around zero.'},
 {t:'find the block\'s absolute maximum',c:'The largest magnitude in the block (highlighted) becomes the block constant <i>c</i>. Every block of 64 gets its own, so one outlier only affects its own block (§2).'},
 {t:'divide by it: the block now spans [−1, 1]',c:'Dividing by absmax maps the largest weight to exactly ±1 and everything else inside. The picture does not move: only the axis is relabelled.'},
 {t:'the 16 values '+TN[m]+' can store',c:m==='nf4'?'NF4\'s values are normal quantiles: dense near zero, where most weights are, sparse in the tails. One is exactly 0 and the type is asymmetric (8 positive, 7 negative).':m==='int4'?'Int4 spaces its 15 values evenly (−7 to 7, divided by 7): the same resolution in the tails, where few weights are, as near zero, where most are.':'FP4 (E2M1) as bitsandbytes implements it: ±{0, 0.0052, 1/6, 1/4, 1/3, 1/2, 2/3, 1}. Its exponent spends resolution on tiny values and leaves wide gaps around ±0.1.'},
 {t:'round each weight to the nearest value',c:'Each weight snaps to its nearest code value and is stored as a 4-bit index. The orange line behind each dot is its rounding error.'},
 {t:'store 4 bits each, plus the constant',c:'64 × 4 = 256 bits of codes plus one 32-bit constant: 4.5 bits per weight (4.127 with double quantisation). To use the weight, multiply the code value by <i>c</i> and compute in BF16 (Eq. 5). Compare the counters across the three types.'}];
function drawQb(m,k,e,W){const d=qbData(m),H=210,pl=14,pr=14,ax=v=>pl+(W-pl-pr)*(v+1)/2,y0=150;
  let s='';const lab=k>=2;
  s+=ln2(pl,y0,W-pr,y0,'var(--mute)');
  [-1,-0.5,0,0.5,1].forEach(v=>{s+=ln2(ax(v),y0,ax(v),y0+5,'var(--mute)')+tx(ax(v),y0+18,lab?String(v):(v*d.am).toFixed(3),{fs:11,a:'middle',c:'var(--mute)'})});
  s+=tx(W/2,y0+34,lab?'value ÷ absmax':'weight value (absmax of this block = '+d.am.toFixed(4)+')',{fs:11,a:'middle',c:'var(--mute)'});
  if(k>=3){const op=k===3?e:1;d.code.forEach(v=>{s+=ln2(ax(v),26,ax(v),y0,TC[m],{sw:1.2,op:0.55*op})})}
  const imax=d.x.reduce((bi,v,i)=>Math.abs(v)>Math.abs(d.x[bi])?i:bi,0);
  d.x.forEach((v,i)=>{const xn=v/d.am,yy=40+((i*37)%64)/64*96;const qv=d.code[d.r.idx[i]];
    const t=k<4?0:k===4?e:1,xp=ax(xn+(qv-xn)*t);
    if(k>=4&&Math.abs(qv-xn)>1e-9)s+=ln2(ax(xn),yy,xp,yy,'var(--bad)',{sw:1.4,op:.8});
    const hl=k>=1&&i===imax;s+='<circle cx="'+xp.toFixed(1)+'" cy="'+yy.toFixed(1)+'" r="'+(hl?5:3.2)+'" fill="'+(hl?'var(--bad)':'var(--ink)')+'" opacity="'+(k>=4?0.85:0.75)+'"/>'});
  if(k>=1)s+=tx(Math.min(W-pr,Math.max(pl,ax(d.x[imax]/d.am))),22,'absmax',{fs:11,a:d.x[imax]>0?'end':'start',c:'var(--bad)'});
  return svgW(W,H,s,'A block of 64 weights quantised with '+TN[m])}
function cntQb(m,k){const d=qbData(m);const parts=[stat('absmax <i>c</i>',d.am.toFixed(4),'FP32, one per block')];
  if(k>=3)parts.push(stat('values available',d.code.length,TN[m]));
  if(k>=4){parts.push(stat('values used',d.st.used+' of '+d.code.length,'in this block'));parts.push(stat('relative squared error',(100*d.st.relmse).toFixed(2)+'%','Σ(q − w)² / Σw², this block'))}
  if(k>=5)parts.push(stat('bits per weight','4.5','4 + 32/64 (4.127 with DQ)'));return parts.join('')}
const qbModes={int4:null,fp4_e2m1:null,nf4:null};Object.keys(qbModes).forEach(m=>{qbModes[m]=qbSteps(m)});
QB=makeAnim({id:'qb',mode:'nf4',modes:qbModes,draw:(m,k,e,W)=>drawQb(m,k,e,W),counters:(m,k)=>cntQb(m,k),dur:2600});
qbT.addEventListener('change',()=>{Object.keys(qbModes).forEach(m=>{const n=qbSteps(m);qbModes[m].forEach((S,i)=>{S.c=n[i].c})});if(QB){QB.st.lk=-1;QB.draw()}});

// ---------- 3. NF4 builder: offset slider, Appendix E, Eq. 4 ----------
function drawNf(){const host=$('nfSvg');fit(host,W=>{const off=+$('nfO').value,v=QE.nf4(off),E=QD.appE,eq=$('nfE').checked;
  const H=eq?150:118,pl=14,pr=14,ax=x=>pl+(W-pl-pr)*(x+1)/2;let s='';
  // standard normal density, scaled to the code range at this offset
  const z=QE.qnorm(off);let p='';for(let i=0;i<=120;i++){const x=-1+2*i/120,zz=x*z,y=Math.exp(-zz*zz/2);p+=(i?'L':'M')+ax(x).toFixed(1)+','+(78-56*y).toFixed(1)}
  s+='<path d="'+p+'" fill="none" stroke="var(--dim)" stroke-width="2"/>';
  s+=ln2(pl,80,W-pr,80,'var(--mute)');[-1,-0.5,0,0.5,1].forEach(x=>{s+=tx(ax(x),96,String(x),{fs:11,a:'middle',c:'var(--mute)'})});
  E.forEach(x=>{s+=ln2(ax(x),62,ax(x),80,'var(--c2)',{sw:3,op:.45})});
  v.forEach(x=>{s+=ln2(ax(x),66,ax(x),80,'var(--c1)',{sw:1.6})});
  s+=tx(pl,14,W<520?'blue NF4 · orange Appendix E · grey N(0, 1)':'blue: NF4 at this offset · orange: Appendix E · grey: N(0, 1) density on the same scale',{fs:11,c:'var(--mute)'});
  if(eq){const q=QE.eq4(4).filter(isFinite),m=Math.max(...q.map(Math.abs));s+=tx(pl,116,'Eq. 4 literally (finite values, scaled to the largest):',{fs:11,c:'var(--mute)'});q.forEach(x=>{s+=ln2(ax(x/m),122,ax(x/m),140,'var(--c4)',{sw:1.6})})}
  host.innerHTML=svgW(W,H,s,'NF4 values');
  const md=Math.max(...v.map((x,i)=>Math.abs(x-E[i])));$('nfOv').textContent=off.toFixed(7);
  $('nfNote').innerHTML='Largest difference from Appendix E: '+(md<1e-6?md.toExponential(1)+' (reproduced)':md.toFixed(4))+'. The outermost bin edge sits at '+z.toFixed(3)+' standard deviations. '+(eq?'Eq. 4 gives 16 values of which the first and last are infinite (Q(0) and Q(1)); the 14 finite ones, rescaled, are not Appendix E\'s.':'')})}
['nfO','nfE'].forEach(id=>$(id).addEventListener(id==='nfO'?'input':'change',()=>refit($('nfSvg'))));
$('nfO').value=0.9677083;drawNf();

// ---------- 4. occupancy (behind the predict question) ----------
function drawOcc(){const host=$('occSvg'),k='model.layers.15.self_attn.v_proj.weight',ws=QD.ws[k];fit(host,W=>{
  const ts=['nf4','fp4_e2m1','int4'],H=ts.length*64+18;let s='',mx=0.2;
  ts.forEach((t,j)=>{const oc=ws.occ[t],n=oc.length,y=8+j*64,bw=(W-110)/16;s+=tx(4,y+30,TN[t],{fs:12})+tx(4,y+46,ws.q[t].entropy_bits.toFixed(2)+' bits',{fs:11,c:'var(--mute)'});
    oc.forEach((p,i)=>{const h=48*Math.min(p,mx)/mx;s+=rc(104+i*bw,y+50-h,Math.max(1,bw-2),h,TC[t],{r:1})});
    s+=ln2(104,y+50-48*(1/16)/mx,104+16*bw,y+50-48*(1/16)/mx,'var(--mute)',{da:'4 3'})});
  host.innerHTML=svgW(W,H,s,'Share of weights per code value');fillText('occH',ws.q.nf4.entropy_bits.toFixed(2))})}
PRED_REVEAL['pr-occ']=drawOcc;

// ---------- 5. DQ calculator ----------
const B1s=[16,32,64,128,256,1024,4096],B2s=[64,128,256,512,1024];
function drawDq(){const B1=B1s[+$('dqB').value],B2=B2s[+$('dq2').value],m=$('dqM').value,P=LL[m].total;
  $('dqBv').textContent=B1;$('dq2v').textContent=B2;
  const a=QE.constBits(B1,32,false),b=QE.constBits(B1,32,true,8,B2),gb=x=>fmt(x*P/8/1e9,2)+' GB';
  $('dqOut').innerHTML=stat('constants without DQ',a.toFixed(3)+' bits','32 / '+B1+' per parameter, '+gb(a))+stat('with DQ',b.toFixed(3)+' bits','8 / '+B1+' + 32 / ('+B1+' × '+B2+'), '+gb(b))+stat('saved',(a-b).toFixed(3)+' bits',gb(a-b)+' on LLaMA '+m)+stat('NF4 weights in total',(4+b).toFixed(3)+' bits',fmt((4+b)*LL[m].linear/8/1e9,1)+' GB of linear weights');
  const host=$('dqSvg');fit(host,W=>{const t=W8[+qbT.value],am=t.am,d1=QE.dq(am,QD.dyn8,B2),d2=QE.dq(am,QD.fp8,B2);
    let e1=0,e2=0;am.forEach((v,i)=>{e1+=Math.abs(d1.q[i]-v)/v;e2+=Math.abs(d2.q[i]-v)/v});e1/=am.length;e2/=am.length;
    const H=58,bw=W-170,mx=Math.max(e1,e2)*1.15;let s='';[['8-bit dynamic (released code)',e1,'var(--c1)'],['FP8 E4M3 (paper text)',e2,'var(--c2)']].forEach(([n,v,c],i)=>{const y=6+i*24;s+=tx(162,y+13,n,{fs:11,a:'end'})+rc(168,y+2,bw*v/mx,14,c,{r:2})+tx(Math.min(W-4,170+bw*v/mx+4),y+13,(100*v).toFixed(2)+'%',{fs:11,a:170+bw*v/mx+50>W?'end':'start'})});
    host.innerHTML=svgW(W,H,s,'Error of double-quantised constants');})}
['dqB','dq2'].forEach(id=>$(id).addEventListener('input',drawDq));$('dqM').addEventListener('change',drawDq);qbT.addEventListener('change',()=>refit($('dqSvg')));drawDq();

// ---------- 6. paged optimizers (animation) ----------
// Static memory: Figure 6 labels (MB), weight gradients drawn equal to adapters. Activations: an illustrative formula.
const F6=QD.fig.figure6,SHAPE={'65B':[8192,80,64],'33B':[6656,60,52]};let PGC={};
function pgSet(m){const g=m==='65B'?48000:24000,[h,L,nh]=SHAPE[m];PGC={m,model:F6.model_MB[m],ad:F6.adapters_MB[m],opt:F6.optimizer_MB[m],budget:g,h,L,nh};PGC.wg=PGC.ad;PGC.static=PGC.model+PGC.ad+PGC.wg+PGC.opt}
const act=T=>(2*PGC.h*PGC.L*T+6*PGC.nh*T*T)/1e6;
const LENS=[512,384,1024,512,2048,640,3072,512];
function pgSim(m){const out=[];let dead=false,traffic=0;LENS.forEach((T,i)=>{const a=act(T),peak=PGC.static+a,st={L:T,a,peak};
  if(dead){st.dead=true;out.push(st);return}
  if(m==='off'){if(peak>PGC.budget){st.oom=true;dead=true}}
  else{const need=Math.max(0,peak-PGC.budget);st.evict=Math.min(PGC.opt,need);if(need>PGC.opt){st.oom=true;dead=true}traffic+=2*st.evict}
  st.traffic=traffic;out.push(st)});return out}
const pgCap=(m,k)=>{const s=pgSim(m)[k];if(s.dead)return 'The run already died on an earlier mini-batch: with a regular optimizer one long mini-batch is enough to end a single-GPU run.';
  let c='Static memory '+fmt(PGC.static,0)+' MB (model, adapters, their gradients, Adam states) plus about '+fmt(s.a,0)+' MB of activations at the peak of the backward pass: '+fmt(s.peak,0)+' MB against '+fmt(PGC.budget,0)+'. ';
  if(m==='off')c+=s.oom?'<b>Out of memory.</b> Nothing can move, so the run stops.':'It fits.';
  else c+=s.oom?'<b>Out of memory</b> even after paging every optimizer page out.':s.evict>0?'Unified memory evicts '+fmt(s.evict,0)+' MB of optimizer pages to CPU RAM; after the backward pass the activations are freed and the pages come back for the update step.':'It fits; nothing moves.';
  return c};
const pgModes={off:LENS.map(()=>({t:'',c:''})),on:LENS.map(()=>({t:'',c:''}))};
function pgCaps(){['off','on'].forEach(m=>pgModes[m].forEach((S,k)=>{S.t='mini-batch '+(k+1)+' of '+LENS.length+', '+fmt(LENS[k],0)+' tokens';S.c=pgCap(m,k)}))}
pgSet('65B');pgCaps();
function drawPg(m,k,e,W){const sim=pgSim(m),mx=Math.max(PGC.budget*1.12,...sim.map(s=>s.peak))*1.02,H=230,top=12,bot=190,ys=v=>bot-(bot-top)*v/mx;
  const lw=Math.min(W<480?W*0.56:W*0.5,300),gx=lw+24,colw=Math.max(34,Math.min(70,(W-gx-36)/2));let s='';
  const bw=lw/LENS.length;sim.forEach((st,i)=>{if(i>k)return;const v=st.dead?0:Math.min(st.peak,mx),c=st.dead?'var(--dim)':st.oom?'var(--bad)':st.evict>0?'var(--c5)':'var(--c3)';s+=rc(i*bw+2,ys(v),bw-4,bot-ys(v),c,{r:2,op:i===k?1:.6})});
  const nk=bw<32;LENS.forEach((T,i)=>{s+=tx(i*bw+bw/2,bot+14,(T/1024).toFixed(T%1024?1:0)+(nk?'':'k'),{fs:11,a:'middle',c:'var(--mute)'})});
  s+=ln2(0,ys(PGC.budget),lw,ys(PGC.budget),'var(--bad)',{da:'5 3',sw:1.5})+tx(2,ys(PGC.budget)-4,(PGC.budget/1000)+' GB GPU',{fs:11,c:'var(--bad)'})+tx(lw/2,H-8,nk?'peak per batch (k tokens)':'peak per mini-batch, by length',{fs:11,a:'middle',c:'var(--mute)'});
  const st=sim[k],ev=(st.evict||0)*Math.min(1,e*1.5);const parts=[[PGC.model,'var(--c1)'],[PGC.ad+PGC.wg,'var(--c2)'],[PGC.opt-ev,'var(--c3)'],[st.dead?0:st.a*Math.min(1,e*1.2),'var(--c4)']];
  let acc=0;s+=tx(gx+colw/2,top-2,'GPU',{fs:11,a:'middle',w:600});parts.forEach(p=>{if(p[0]<=0)return;const y1=ys(acc+p[0]),y0=ys(acc);s+=rc(gx,y1,colw,Math.max(0.5,y0-y1),p[1],{r:0,op:st.dead?.3:1});acc+=p[0]});
  s+=ln2(gx-4,ys(PGC.budget),gx+colw+4,ys(PGC.budget),'var(--bad)',{sw:1.5});
  if(st.oom&&!st.dead)s+=tx(gx+colw/2,ys(Math.min(acc,mx))-6,'OOM',{fs:12,a:'middle',c:'var(--bad)',w:700,op:e});
  const cx=gx+colw+14;s+=tx(cx+colw/2,top-2,'CPU RAM',{fs:11,a:'middle',w:600})+rc(cx,top+6,colw,bot-top-6,'none',{s:'var(--line)',r:3});
  if(ev>0){const y1=bot-(bot-top)*ev/mx;s+=rc(cx,y1,colw,bot-y1,'var(--c3)',{r:0,op:.8})+tx(cx+colw/2,Math.max(top+20,y1-4),fmt(ev,0),{fs:11,a:'middle'})}
  const lg=legend([['model','var(--c1)'],['adapters, grads','var(--c2)'],['Adam','var(--c3)'],['activations','var(--c4)']],0,H+10,W);s+=lg.s;
  return svgW(W,H+lg.h+6,s,'Paged optimizer memory')}
function cntPg(m,k){const st=pgSim(m)[k];return stat('peak this batch',st.dead?'(stopped)':fmt(st.peak,0)+' MB','budget '+fmt(PGC.budget,0)+' MB')+stat('paged to CPU',m==='on'?fmt(st.evict||0,0)+' MB':'not possible','optimizer pages only')+stat('page traffic so far',m==='on'?fmt(st.traffic||0,0)+' MB':'0 MB','out and back')+stat('status',st.dead||st.oom?'out of memory':'training','')}
const PG=makeAnim({id:'pg',mode:'on',modes:pgModes,draw:drawPg,counters:cntPg,dur:2200});
$('pgS').addEventListener('change',()=>{pgSet($('pgS').value);pgCaps();if(PG){PG.st.k=0;PG.st.t=1;PG.st.lk=-1;PG.draw()}});

// ---------- 7. Figures 2 and 4 (behind the predict question) ----------
function drawF2(){const host=$('f2Svg'),F=QD.fig.figure2.points,F4=QD.fig.figure4.points;fit(host,W=>{const cats=Object.keys(F),y0=59.4,y1=64.8,H=230,pl=40,pb=58,pt=10;
  const one=W<560,w1=one?W:W*0.58,ys=v=>pt+(H-pt-pb)*(1-(v-y0)/(y1-y0));let s='';
  for(let v=60;v<=64;v++)s+=ln2(pl,ys(v),w1-6,ys(v),'var(--line)')+tx(pl-6,ys(v)+4,String(v),{fs:11,a:'end',c:'var(--mute)'});
  const cw=(w1-pl-6)/cats.length,short2=['QLoRA all','QLoRA FFN','QLoRA attention','16-bit full FT (tuned)','16-bit full FT (Stanford)'];
  cats.forEach((c,i)=>{const x=pl+cw*(i+.5),col=i<3?'var(--c1)':'var(--c2)';F[c].forEach((v,j)=>{s+='<circle cx="'+(x+(j-(F[c].length-1)/2)*7).toFixed(1)+'" cy="'+ys(v).toFixed(1)+'" r="4" fill="'+col+'"><title>'+c+': '+v.toFixed(2)+'</title></circle>'});
    const m=F[c].reduce((a,b)=>a+b,0)/F[c].length;s+=tx(x,ys(Math.max(...F[c]))-9,m.toFixed(2),{fs:11,a:'middle'});
    const lab=cw<90?[['QLoRA','all'],['QLoRA','FFN'],['QLoRA','attn.'],['full FT','tuned'],['full FT','Stanf.']][i]:(()=>{const words=short2[i].split(' ');let l1=[],l2=[];words.forEach(wd=>{(l1.join(' ').length<12?l1:l2).push(wd)});return [l1.join(' '),l2.join(' ')]})();
    s+=tx(x,H-pb+16,lab[0],{fs:11,a:'middle',c:'var(--mute)'})+tx(x,H-pb+30,lab[1],{fs:11,a:'middle',c:'var(--mute)'})});
  s+=tx(pl,H-6,W<560?'Figure 2: RougeL, one dot per seed':'Figure 2: RougeL, LLaMA 7B on Alpaca, one dot per seed (blue 4-bit, orange 16-bit)',{fs:11,c:'var(--mute)'});
  let s2='';const ox=one?0:w1+10,oy=one?H+10:0,w2=one?W:W-w1-10,H2=H,z0=63.9,z1=65.1,zs=v=>oy+pt+(H2-pt-pb)*(1-(v-z0)/(z1-z0));
  for(let v=64;v<=65.01;v+=0.2)s2+=ln2(ox+34,zs(v),ox+w2-4,zs(v),'var(--line)')+tx(ox+30,zs(v)+4,v.toFixed(1),{fs:11,a:'end',c:'var(--mute)'});
  const rs=Object.keys(F4),cw2=(w2-40)/rs.length;rs.forEach((r,i)=>{const x=ox+36+cw2*(i+.5);F4[r].forEach((v,j)=>{s2+='<circle cx="'+(x+((j%4)-1.5)*5).toFixed(1)+'" cy="'+zs(v).toFixed(1)+'" r="3" fill="var(--c1)" opacity=".75"/>'});
    const m=F4[r].reduce((a,b)=>a+b,0)/F4[r].length;s2+=ln2(x-14,zs(m),x+14,zs(m),'var(--ink)',{sw:2})+tx(x,oy+H2-pb+16,'r = '+r,{fs:11,a:'middle',c:'var(--mute)'})});
  s2+=tx(ox+4,oy+H2-6,w2<330?'Figure 4: RougeL by r; bar = mean':'Figure 4: RougeL against r (all layers); bar = mean',{fs:11,c:'var(--mute)'});
  host.innerHTML=svgW(W,one?2*H+10:H,s+s2,'Figures 2 and 4');
  const m=c=>F[c].reduce((a,b)=>a+b,0)/F[c].length;$('f2Note').innerHTML='Means: all layers '+m(cats[0]).toFixed(2)+', FFN '+m(cats[1]).toFixed(2)+', attention only '+m(cats[2]).toFixed(2)+', tuned 16-bit full finetuning '+m(cats[3]).toFixed(2)+' (2 seeds), Stanford Alpaca\'s defaults '+m(cats[4]).toFixed(2)+'. All-layer 4-bit QLoRA is '+(m(cats[0])-m(cats[3])).toFixed(2)+' RougeL above the tuned 16-bit baseline and '+(m(cats[0])-m(cats[2])).toFixed(2)+' above attention-only; the seed spread is about 0.1. Figure 4\'s means by r: '+rs.map(r=>r+': '+(F4[r].reduce((a,b)=>a+b,0)/F4[r].length).toFixed(2)).join(', ')+' ('+rs.map(r=>F4[r].length).join(', ')+' points; the caption says each r ran 3 seeds per hyperparameter combination). Positions read from the arXiv source PDFs by extract_figs.py; precision about 0.002.'})}
PRED_REVEAL['pr-lay']=drawF2;

// ---------- 8. Table 2 and our small-model reproduction ----------
function drawT2(){const host=$('t2Svg');fit(host,W=>{const T=PAPER.tables.t2.rows,ppl=QD.ppl,models=pplModels();
  const ts=['int4','fp4_e2m1','fp4_e3m0','nf4','nf4_dq'],keyT={int4:'Int4','fp4_e2m1':'Float4 (E2M1)','fp4_e3m0':'Float4 (E3M0)',nf4_dq:'NFloat4 + DQ'};
  const H=24+ts.length*22,lw=118,bw=(W-lw-10)/2-10;let s=tx(lw,12,W<600?'Table 2 PPL':'paper, mean PPL (Table 2)',{fs:11,c:'var(--mute)'})+tx(lw+bw+20,12,W<600?'ours: +% PPL':'ours: perplexity increase over 16-bit, mean of '+models.length+' models',{fs:11,c:'var(--mute)'});
  const pmx=36,inc=t=>{const v=models.map(m=>{const a=ppl.find(r=>r.model===m&&r.type===t),b=ppl.find(r=>r.model===m&&r.type==='fp32');return a&&b?100*(a.ppl/b.ppl-1):null}).filter(x=>x!=null);return v.length?v.reduce((x,y)=>x+y,0)/v.length:null};
  const imx=Math.max(...ts.map(inc).filter(x=>x!=null))*1.1;
  ts.forEach((t,i)=>{const y=20+i*22,row=T.find(r=>r[0]===keyT[t]);s+=tx(lw-6,y+12,TN[t],{fs:12,a:'end'});
    if(row){s+=rc(lw,y+2,bw*row[1]/pmx,14,TC[t],{r:2})+tx(lw+bw*row[1]/pmx+4,y+13,row[1].toFixed(2),{fs:11})}else s+=tx(lw,y+13,'not in Table 2',{fs:11,c:'var(--mute)'});
    const v=inc(t);if(v!=null)s+=rc(lw+bw+20,y+2,bw*v/imx,14,TC[t],{r:2,op:.8})+tx(lw+bw+20+bw*v/imx+4,y+13,'+'+v.toFixed(1)+'%',{fs:11})});
  host.innerHTML=svgW(W,H,s,'Table 2 and our reproduction');
  const order=ts.filter(t=>inc(t)!=null).sort((a,b)=>inc(a)-inc(b)).map(t=>TN[t]);
  $('t2Note').innerHTML='Left: Table 2 as printed (Pile Common Crawl, OPT, BLOOM, LLaMA and Pythia 125M to 13B; no per-model values given). Right: measured for this page by quant_ppl.py on '+models.map(m=>m.split('/')[1]).join(', ')+' (WikiText-2 test, '+fmt(ppl[0].tokens,0)+' tokens each, every linear layer round-to-nearest in blocks of 64). Our order, best first: '+order.join(', ')+'. Per model on the '+tabA('quantiser tab','t-quant','qz-ppl')+'.';
  wireTabLinks($('t2Note'))})}
function wireTabLinks(el){el.querySelectorAll('a[data-tab]').forEach(a=>{if(a.__w)return;a.__w=1;a.addEventListener('click',e=>{e.preventDefault();const b=document.querySelector('#tabs button[data-t="'+a.dataset.tab+'"]');if(b)b.click();const to=a.dataset.to&&document.getElementById(a.dataset.to);if(to)to.scrollIntoView({block:'start'})})})}
window.wireTabLinks=wireTabLinks;
drawT2();

// ---------- 9. Tables 3 and 4 ----------
function drawRs(){const host=$('rsSvg');fit(host,W=>{const id=$('rsT').value,T=PAPER.tables[id],cols=T.cols.slice(1,id==='t4'?9:7),rows=T.rows;
  const cl=['var(--mute)','var(--c5)','var(--c3)','var(--c2)','var(--c4)','var(--c1)'];const H=210,pl=34,pb=54,pt=8;
  const lo=Math.min(...rows.flatMap(r=>r.slice(1,cols.length+1)).filter(v=>v!=null)),hi=Math.max(...rows.flatMap(r=>r.slice(1,cols.length+1)).filter(v=>v!=null));
  const cw=(W-pl-6)/cols.length;let s='';
  // per column: dots relative to the first row (the 16-bit reference)
  const ref=id==='t4'?0:0,dmax=id==='t4'?2.2:3;const ys=d=>pt+(H-pt-pb)*(1-(d+dmax)/(2*dmax));
  [-2,-1,0,1,2].filter(d=>Math.abs(d)<=dmax).forEach(d=>{s+=ln2(pl,ys(d),W-6,ys(d),d===0?'var(--mute)':'var(--line)')+tx(pl-5,ys(d)+4,(d>0?'+':'')+d,{fs:11,a:'end',c:'var(--mute)'})});
  cols.forEach((c,j)=>{const x=pl+cw*(j+.5),r0=rows[ref][j+1];rows.forEach((r,i)=>{if(i===ref||r[j+1]==null||r0==null)return;const d=r[j+1]-r0,xx=x+(i-(rows.length)/2)*Math.min(7,cw/rows.length);s+='<circle cx="'+xx.toFixed(1)+'" cy="'+ys(Math.max(-dmax,Math.min(dmax,d))).toFixed(1)+'" r="4" fill="'+cl[i%cl.length]+'"><title>'+r[0]+', '+c+': '+r[j+1]+' ('+(d>=0?'+':'')+d.toFixed(1)+')</title></circle>'});
    const lab=c.split(' ');s+=tx(x,H-pb+15,lab[0],{fs:11,a:'middle',c:'var(--mute)'})+(lab[1]?tx(x,H-pb+29,lab.slice(1).join(' '),{fs:11,a:'middle',c:'var(--mute)'}):'')});
  const lg=legend(rows.slice(1).map((r,i)=>[r[0],cl[(i+1)%cl.length]]),pl,H-4,W-pl);s+=lg.s;
  host.innerHTML=svgW(W,H+lg.h,s,T.title);
  $('rsNote').innerHTML=(id==='t4'?'Points are each data type minus BFloat16 16-bit LoRA, in MMLU points. ':'Points are each method minus 16-bit full finetuning (BF16), in accuracy (RoBERTa) or RougeL (T5) points; a missing point is a dash in the table. ')+'Cells from '+A(PAPER.meta.ax+'#'+T.at,T.title.split(':')[0])+'; the means of Table 4 recomputed: BFloat16 '+RC.t4_means['BFloat16'].toFixed(2)+', Float4 '+RC.t4_means['Float4'].toFixed(2)+', NFloat4 + DQ '+RC.t4_means['NFloat4 + DQ'].toFixed(2)+'.';
  })}
$('rsT').addEventListener('change',()=>refit($('rsSvg')));drawRs();

// ---------- 10. the toy results summary ----------
function toySummary(){const ppl=QD.ppl,models=pplModels(),g=(m,t)=>{const r=ppl.find(x=>x.model===m&&x.type===t);return r?r.ppl:null};
  let h='<p>Two things the paper measured at scale, redone on small open models on a CPU (scripts in this page\'s source; details on the '+tabA('quantiser tab','t-quant','qz-ppl')+').</p><p><b>Storage type</b> (Table 2\'s question): every linear layer quantised round-to-nearest in blocks of 64, WikiText-2 test perplexity. ';
  h+=models.map(m=>m.split('/')[1]+': 16-bit '+f1(g(m,'fp32'))+', NF4 '+f1(g(m,'nf4'))+', Int4 '+f1(g(m,'int4'))+', FP4 '+f1(g(m,'fp4_e2m1'))).join('; ')+'. ';
  const nfBest=models.filter(m=>['int4','fp4_e2m1','fp4_e3m0'].every(t=>g(m,'nf4')<g(m,t))).length;
  h+='NF4 beats Int4 and both FP4 variants on '+nfBest+' of '+models.length+' models, reproducing Table 2\'s conclusion independently; unlike Table 2, Int4 is <i>not</i> the worst here (it beats FP4 E2M1 on '+models.filter(m=>g(m,'int4')<g(m,'fp4_e2m1')).length+' of '+models.length+'), and DQ costs at most '+Math.max(...models.map(m=>100*(g(m,'nf4_dq')/g(m,'nf4')-1))).toFixed(1)+'% perplexity.</p>';
  const T=QD.trn;if(T&&T.length){const f=n=>T.find(r=>r.name===n);const a=f('fp32 + LoRA all'),b=f('NF4 + DQ + LoRA all'),c=f('FP4 + LoRA all'),d=f('Int4 + LoRA all'),e=f('NF4 + DQ + LoRA attention only'),ff=f('fp32 full finetuning');
    h+='<p><b>Recovery by finetuning</b> (Table 3\'s question): Pythia-160M, 200 steps of LoRA on WikiText-2 train with the same batches. ';
    const row=(r,n)=>r?n+' '+f1(r.ppl_before)+' → '+f1(r.ppl_after):'';h+=[row(a,'16-bit base'),row(b,'NF4 + DQ base'),row(c,'FP4 base'),row(d,'Int4 base'),row(e,'NF4 + DQ, attention-only adapters'),row(ff,'16-bit full finetuning')].filter(Boolean).join('; ')+'. ';
    if(a&&b)h+='The NF4 gap to the 16-bit base shrinks from '+f1(b.ppl_before-a.ppl_before)+' to '+f1(b.ppl_after-a.ppl_after)+' perplexity points: finetuning recovers '+(100*(1-(b.ppl_after-a.ppl_after)/(b.ppl_before-a.ppl_before))).toFixed(0)+'% of what NF4 lost, at this toy scale and budget, in one seed per setting (a second seed for the two main rows is on the quantiser tab).</p>'}
  else h+='<p class="mute">(The toy finetuning run has not finished; its results will appear here.)</p>';
  const el=$('toyTxt');el.innerHTML=h;wireTabLinks(el)}
toySummary();

// ---------- 11. Elo intervals (behind the predict question) ----------
const SN={'gpt4':'GPT-4','guanaco-65b':'Guanaco 65B','guanaco-33b':'Guanaco 33B','vicuna-13b':'Vicuna 13B','gpt35':'ChatGPT','guanaco-13b':'Guanaco 13B','bard':'Bard','guanaco-7b':'Guanaco 7B'};
window.SN=SN;window.pplModels=pplModels;
const T1={'gpt4':1348,'guanaco-65b':1022,'guanaco-33b':992,'vicuna-13b':974,'gpt35':966,'guanaco-13b':916,'bard':902,'guanaco-7b':879};
function drawEl(){const host=$('elSvg'),E=QD.ev.elo.elo_gpt4_vicuna;fit(host,W=>{const ss=Object.keys(T1),H=ss.length*26+34,lw=96,lo=820,hi=1440,xs=v=>lw+(W-lw-12)*(v-lo)/(hi-lo);let s='';
  [850,950,1050,1150,1250,1350].forEach(v=>{s+=ln2(xs(v),8,xs(v),H-22,'var(--line)')+tx(xs(v),H-8,String(v),{fs:11,a:'middle',c:'var(--mute)'})});
  ss.forEach((k,i)=>{const y=14+i*26;s+=tx(lw-6,y+5,SN[k],{fs:12,a:'end'});
    s+=rc(xs(E.lo[k]),y-4,xs(E.hi[k])-xs(E.lo[k]),8,'var(--acc2)',{r:3})+ln2(xs(E.mean[k]),y-7,xs(E.mean[k]),y+7,'var(--acc)',{sw:2.5});
    s+='<path d="M'+xs(T1[k]).toFixed(1)+','+(y-5)+'l5,5l-5,5l-5,-5z" fill="var(--c2)"><title>Table 1: '+T1[k]+' ± 1</title></path>'});
  host.innerHTML=svgW(W,H,s,'Elo with prompt-resampling intervals');
  $('elNote').innerHTML='Orange diamonds: Table 1 (± 1). Blue line: our replay of the released GPT-4 verdicts on Vicuna (K = 32, mean over 10,000 orderings, unparsed verdicts dropped). Shaded: 95% interval over 200 resamples of the 80 prompts (10 orderings each), recompute_eval.py. Guanaco 65B: '+fmt(E.lo['guanaco-65b'],0)+' to '+fmt(E.hi['guanaco-65b'],0)+'. The replay differs from Table 1 by at most '+fmt(Math.max(...Object.keys(T1).filter(k=>k!=='gpt4').map(k=>Math.abs(E.mean[k]-T1[k]))),0)+' points except for GPT-4 itself ('+fmt(E.mean.gpt4,0)+' against 1,348). '+tabA('Replay it yourself','t-eval')+'.';wireTabLinks($('elNote'))})}
PRED_REVEAL['pr-elo']=drawEl;

// ---------- 12. numbers in the prose from the data ----------
const oe=QD.ev.order_effect;fillText('ordFirst',fmt(oe.first,0));fillText('ordSecond',fmt(oe.second,0));fillText('ordFlip',Math.round(100*oe.flipped_decided_pairs/(oe.flipped_decided_pairs+oe.consistent_decided_pairs))+'%');
const hc=QD.ev.relative['huggingchat-33b'];if(hc)fillText('hcS',hc.chatgpt_first.toFixed(1)+'% and '+hc.system_first.toFixed(1)+'%');
onTab('t-read',()=>{['mcSvg','nfSvg','occSvg','dqSvg','f2Svg','t2Svg','rsSvg','elSvg'].forEach(id=>refit($(id)))});
})();
