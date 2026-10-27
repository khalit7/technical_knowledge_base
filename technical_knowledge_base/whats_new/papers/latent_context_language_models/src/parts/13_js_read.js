// ---- The paper tab: numbers in the prose, the predict widgets, the N/W explorer, the two-pipelines animation, the inline charts ----
(function(){
const PP=window.PAPER,RC=PP.rc,TB=PP.tables;
const CTX=['4k','8k','16k','32k','64k','128k','256k','512k','1M'],CTXN=[4096,8192,16384,32768,65536,131072,262144,524288,1048576];
const ctxLab=i=>['4K','8K','16K','32K','64K','128K','256K','512K','1M'][i];
const KVB=RC.models.kv_bytes_per_token;
const gb=b=>(b/1e9>=100?(b/1e9).toFixed(0):(b/1e9>=10?(b/1e9).toFixed(1):(b/1e9).toFixed(2)))+' GB';
const set=(id,h)=>{const e=$(id);if(e)e.innerHTML=h};
const f=v=>parseFloat(String(v).replace('+',''));
// ---- numbers in the prose ----
set('kvTok',fmt(KVB)+' bytes ('+(KVB/1024).toFixed(0)+' KiB)');
set('kv256',RC.models.kv_256k_GB.toFixed(1)+' GB');
set('adP',fmt(RC.models.adapter_params));
set('tokEnc',RC.tokens.encoder_B.toFixed(2));set('tokDec',RC.tokens.decoder_B.toFixed(2));set('tokTot',RC.tokens.total_B.toFixed(2));
set('m256n',RC.mem256.nocomp.toFixed(0));set('m256a',RC.mem256.lclm4.toFixed(0));set('m256b',RC.mem256.lclm16.toFixed(0));
set('m4k',RC.fig4.mem['LCLM 16x']['4k'].toFixed(1));set('wGB',RC.models.weights_GB_bf16.toFixed(2));
set('seG',RC.se.gsm8k_8105.toFixed(1));set('seL',RC.se.longhealth_675.toFixed(1));
const sp0=RC.speedups[0],sp64=RC.speedups[3];
set('w1a',sp0.lclm_ttft&&(RC.fig4.ttft.KVzipFast['4k']).toFixed(2));set('w1b',RC.fig4.ttft.NoCompression['4k'].toFixed(2));
set('w1c',sp0.lclm_vs_nocomp.toFixed(2));set('w1d',sp64.lclm_vs_nocomp.toFixed(1));
set('t7a',RC.agent.t7_lclm16_niah_avg.toFixed(2));
const AG=RC.agent;
set('ag4',AG['4k context'].base.toFixed(2)+' to '+AG['4k context'].agent.toFixed(2));
set('ag8',AG['8k context'].base.toFixed(2)+' to '+AG['8k context'].agent.toFixed(2));
set('ag16',AG['16k context'].base.toFixed(2)+' to '+AG['16k context'].agent.toFixed(2));
set('agF',AG.full_4k_niah_avg.toFixed(2));

// colour per method, shared with the Tables tab
const MC={'NoCompression':'var(--mute)','LCLM':'var(--good)','SnapKV':'var(--c1)','SnapKV-QA':'var(--c6)','SnapKV-SelfStudy':'var(--dim)','ExpAttn':'var(--c5)','KVzip':'var(--c7)','KVzipFast':'var(--c2)','AM-Fast':'var(--c8)','AM-Slow':'var(--closed)'};
const MN={'NoCompression':'No compression','LCLM':'LCLM','SnapKV':'SnapKV','SnapKV-QA':'SnapKV (query-aware)','SnapKV-SelfStudy':'SnapKV (self-study)','ExpAttn':'Expected Attention','KVzip':'KVzip','KVzipFast':'FastKVzip','AM-Fast':'Attention Matching (fast)','AM-Slow':'Attention Matching'};
const SN={'NoCompression':'none','SnapKV':'SnapKV','SnapKV-QA':'SnapKV-QA','ExpAttn':'Exp. Attn.','KVzip':'KVzip','KVzipFast':'FastKVzip','AM-Fast':'AM fast','AM-Slow':'AM'};
window.LC_MC=MC;window.LC_MN=MN;
const barRows=(rows,max,fmtv)=>rows.map(r=>'<div class="row'+(r.hl?' hl':'')+'"><span class="nm" title="'+r.n+'">'+r.n+'</span><span class="track"><span class="fill" style="width:'+(100*Math.max(0,r.v)/max).toFixed(1)+'%;background:'+r.c+'"></span></span><span class="val">'+fmtv(r.v)+'</span></div>').join('');

// ---- predict 1: TTFT at a context length ----
function q1(){const i=+$('q1R').value;$('q1L').textContent=ctxLab(i);const T=RC.fig4.ttft;
  const rows=[];Object.keys(T).forEach(k=>{const v=T[k][CTX[i]];if(v==null)return;const base=k.split(' ')[0];rows.push({n:(MN[base]||k)+(k.includes(' ')?' '+k.split(' ')[1]:''),v,c:MC[base],hl:base==='NoCompression'||base==='LCLM'})});
  rows.sort((a,b)=>a.v-b.v);const mx=Math.max(...rows.map(r=>r.v));
  $('q1Bars').innerHTML=barRows(rows,mx,v=>(v<1?v.toFixed(3):v<10?v.toFixed(2):v.toFixed(1))+' s')+(i>=7?'<p class="small mute">At '+ctxLab(i)+' only the LCLM runs: every KV method and the uncompressed decoder are out of memory (or, for Attention Matching at 512K, numerically unstable).</p>':'')}
PRED_REVEAL.pq1=()=>{$('q1R').addEventListener('input',q1);q1()};

// ---- the N / W / mask / pooling explorer ----
const KN={N:16,W:'64',M:'causal',P:'mean',sel:1};
function kn(w){const host=$('knSvg');w=w||host.clientWidth;if(!w)return;const T=64,N=KN.N,W=KN.W==='N'?N:+KN.W,M=T/N;
  if(KN.sel>=M)KN.sel=M-1;const pad=4,cw=(w-2*pad)/T,top=26,h=150;let s='';
  // windows
  for(let i=0;i<T/W;i++){const x=pad+i*W*cw;s+=rc(x,top-18,W*cw-2,16,'var(--acc2)',{r:3})+(W*cw>60?tx(x+4,top-6,'window '+(i+1)+' ('+W+')',{fs:11}):'')}
  // which tokens can influence the selected latent
  const k=KN.sel,b0=k*N,b1=b0+N-1,wi=Math.floor(b0/W),w0=wi*W,w1=w0+W-1;
  let lo,hi;if(KN.P==='eos'){lo=w0;hi=w1}else if(KN.M==='causal'){lo=w0;hi=b1}else{lo=w0;hi=w1}
  for(let t=0;t<T;t++){const x=pad+t*cw,inb=t>=b0&&t<=b1,can=t>=lo&&t<=hi;
    s+=rc(x+0.5,top+2,Math.max(1,cw-1),22,inb&&KN.P!=='eos'?'var(--acc)':can?'var(--c3)':'var(--soft)',{r:1.5,s:'var(--line)',sw:.5,op:can||inb?1:.8})}
  s+=tx(pad,top+40,'input tokens',{fs:11,c:'var(--mute)'});
  // latents
  const ly=top+70,lw=Math.min(40,(w-2*pad)/M-4);
  for(let j=0;j<M;j++){const cx=pad+(j*N+N/2)*cw,x=cx-lw/2;const on=j===k;
    s+='<g data-k="'+j+'" style="cursor:pointer">'+rc(x,ly,lw,KN.P==='concat'?34:22,on?'var(--acc)':'var(--bg)',{s:on?'var(--acc)':'var(--mute)',sw:1.2})+tx(cx,ly+15,'z'+(j+1),{fs:11,a:'middle',c:on?'var(--bg)':null})+'</g>';
    if(KN.P!=='eos')s+=ln2(pad+(j*N)*cw+1,top+26,cx,ly-2,'var(--dim)',{sw:1});}
  s+=tx(pad,ly+(KN.P==='concat'?50:40),KN.P==='concat'?'latents ('+N+' × d wide each, before the adapter)':KN.P==='eos'?'latents (hidden states of '+M+' appended pooling tokens)':'latents (mean of each block)',{fs:11,c:'var(--mute)'});
  host.innerHTML=svgW(w,h,s,'Which input tokens each latent can depend on');
  host.querySelectorAll('g[data-k]').forEach(g=>g.addEventListener('click',()=>{KN.sel=+g.dataset.k;kn()}));
  const reach=hi-lo+1;
  $('knOut').innerHTML=stat('Latents for 64 tokens','<b>'+M+'</b>','M = ⌈T/N⌉')+stat('Encoder passes','<b>'+(T/W)+'</b>','I = ⌈T/W⌉, windows of '+W)+stat('Latent z'+(k+1)+' can depend on',reach+' tokens',KN.P==='eos'?'its pooling token reads the whole window':KN.M==='causal'?'window start to the end of its block':'its whole window, both directions')
   +stat('Adapter input width',KN.P==='concat'?N+' × d':'d',KN.P==='concat'?'first adapter layer '+N+'x larger (Eq. 6)':'one vector per latent')}
segBind('knN',m=>{KN.N=+m;kn()});segBind('knW',m=>{KN.W=m;kn()});segBind('knM',m=>{KN.M=m;kn()});segBind('knP',m=>{KN.P=m;kn()});
fit($('knSvg'),kn);

// ---- two pipelines, animated ----
const CP={L:4,N:16};
const STEPS={
 lclm:[{t:'The prompt arrives',c:'T tokens of context. Each cell is T/64 tokens.'},
       {t:'Cut into encoder windows of 1,024',c:'Windows are independent, so the encoder can run them in parallel batches: 128 windows (131,072 tokens) per forward pass of the 0.6B encoder.'},
       {t:'Encode and mean-pool every N tokens',c:'Each block of N tokens becomes one latent; the window gives every token up to 1,024 tokens of context first.'},
       {t:'Adapter: 1,024 to 2,560 dimensions',c:'An MLP maps each latent into the decoder\'s embedding space.'},
       {t:'Decoder prefill over T/N latents',c:'The 4B decoder now prefills only T/N positions. Its KV cache is genuinely T/N entries long, in the standard layout, so paged attention and vLLM can use it.'},
       {t:'First token',c:'Time to first token and peak memory are the paper\'s measurements (Figure 4).'}],
 kv:[{t:'The prompt arrives',c:'The same T tokens. The whole context has to fit in the decoder\'s window (262,144 positions for this decoder).'},
     {t:'Full prefill through the 4B decoder',c:'Every one of the T tokens goes through all 36 layers and writes keys and values: the expensive part happens first, whatever the target ratio.'},
     {t:'Score every cache entry',c:'Heuristics (attention to a query, expected attention, or a reconstruction pass in KVzip) decide what to keep. KVzip\'s scoring pass is two to three times the input length.'},
     {t:'Evict to 1/N, unevenly across heads and layers',c:'Different heads keep different positions, so the sequence dimension cannot shrink: evicted entries are masked, not freed, in a paged engine. Pale cells are masked but still allocated.'},
     {t:'First token',c:'Time is FastKVzip\'s; across all KV methods it is shown as a range. All of them stop at 256K.'}],
 full:[{t:'The prompt arrives',c:'The same T tokens, no compression.'},
       {t:'Full prefill through the 4B decoder',c:'All T tokens through all 36 layers.'},
       {t:'KV cache of T entries',c:'147,456 bytes per token in bf16 for this decoder.'},
       {t:'First token',c:'The yardstick the paper\'s speed-up figures leave out: KV compression is never faster than this.'}]};
function capDraw(mode,k,e,w){const L=CP.L,N=CP.N,T=CTXN[L],cols=64,pad=2,cw=(w-2*pad)/cols,ch=Math.min(16,cw*1.6),gap=12;let s='',y=4;
  const lab=(t)=>{const mx=Math.max(20,Math.floor((w-2*pad)/6.3)),words=t.split(' ');let line='';const out=[];words.forEach(x=>{if((line+' '+x).trim().length>mx&&line){out.push(line);line=x}else line=(line+' '+x).trim()});if(line)out.push(line);
    out.forEach(l=>{s+=tx(pad,y+10,l,{fs:11,c:'var(--mute)'});y+=14})};
  const row=(n,fill,o)=>{o=o||{};for(let i=0;i<n;i++){const x=pad+(o.x0||0)+i*cw*(o.sc||1);s+=rc(x+.5,y,Math.max(1,cw*(o.sc||1)-1),ch,typeof fill==='function'?fill(i):fill,{r:1.5,op:o.op==null?1:o.op})}y+=ch+4};
  const big=L>=7&&mode!=='lclm';
  lab('prompt: '+fmt(T)+' tokens');row(cols,'var(--acc2)');
  if(mode==='lclm'){
    if(k>=1){const nw=Math.max(1,Math.min(64,T/1024));lab('encoder windows of 1,024: '+fmt(Math.ceil(T/1024))+' windows, '+Math.ceil(T/131072)+' batched pass'+(Math.ceil(T/131072)>1?'es':''));
      const per=cols/nw;for(let i=0;i<nw;i++){s+=rc(pad+i*per*cw+.5,y,per*cw-1.5,8,'var(--c4)',{r:2,op:k===1?e:1})}y+=12}
    if(k>=2){lab('latents after pooling: T/'+N+' = '+fmt(T/N));const n=cols/N;const op=k===2?e:1;
      for(let i=0;i<n;i++){s+=rc(pad+i*cw*N/ (N)*1+.5,y,Math.max(1,cw-1),ch,'var(--good)',{r:1.5,op})}y+=ch+4}
    if(k>=3){lab('adapter: 1,024 to 2,560 dimensions');const n=cols/N;for(let i=0;i<n;i++)s+=rc(pad+i*cw+.5,y,Math.max(1,cw-1),ch*1.4,'var(--good)',{r:1.5,op:k===3?e:1});y+=ch*1.4+4}
    if(k>=4){lab('decoder KV cache: '+fmt(T/N)+' positions, '+gb(T/N*KVB));const n=cols/N;for(let i=0;i<n;i++)s+=rc(pad+i*cw+.5,y,Math.max(1,cw-1),ch,'var(--c1)',{r:1.5,op:k===4?e:1});y+=ch+4}
  } else {
    if(big){lab('Does not run at '+ctxLab(L)+': out of memory on the 141 GB H200 (Figure 4). The decoder\'s window is also only 262,144 positions.');y+=6}
    else{
    if(k>=1){lab('decoder prefill: '+fmt(T)+' positions through 36 layers');row(cols,'var(--c1)',{op:k===1?e:1})}
    if(mode==='kv'&&k>=2){lab('scores per entry (one row per head, illustrative)');const r=mulberry32(7);for(let hh=0;hh<3;hh++){for(let i=0;i<cols;i++){const v=r();s+=rc(pad+i*cw+.5,y,Math.max(1,cw-1),6,'var(--c2)',{r:1,op:(k===2?e:1)*(0.15+0.85*v)})}y+=8}y+=4}
    if(mode==='kv'&&k>=3){lab('after eviction to 1/'+N+': kept (solid), masked (pale), still '+gb(T*KVB)+' allocated');const r=mulberry32(11);
      for(let hh=0;hh<3;hh++){for(let i=0;i<cols;i++){const keep=r()<1/N*1.0||i===hh*7%cols;s+=rc(pad+i*cw+.5,y,Math.max(1,cw-1),6,keep?'var(--c1)':'var(--soft)',{r:1,s:keep?null:'var(--line)',sw:.5,op:k===3?Math.max(.3,e):1})}y+=8}y+=4}
    if(mode==='full'&&k>=2){lab('KV cache: '+fmt(T)+' positions, '+gb(T*KVB));row(cols,'var(--c1)',{op:k===2?e:1})}}
  }
  const last=STEPS[mode].length-1;
  if(k===last){y+=6;const tt=RC.fig4.ttft,mem=RC.fig4.mem;const key=mode==='lclm'?'LCLM '+N+'x':mode==='kv'?'KVzipFast':'NoCompression';const v=tt[key]&&tt[key][CTX[L]];
    s+=tx(pad,y+12,v!=null?'first token after '+(v<1?v.toFixed(3):v.toFixed(2))+' s':'no first token: the run did not fit',{fs:13,w:'600',c:v!=null?'var(--good)':'var(--bad)'});y+=20}
  return svgW(w,y+4,s,'The prompt through the '+mode+' pipeline')}
function capCnt(mode,k){const L=CP.L,N=CP.N,T=CTXN[L],tt=RC.fig4.ttft,mem=RC.fig4.mem,last=STEPS[mode].length-1;
  const key=mode==='lclm'?'LCLM '+N+'x':mode==='kv'?'KVzipFast':'NoCompression';
  const runs=mode==='lclm'||L<=6;
  const pre=mode==='lclm'?(k>=4?T/N:0):(k>=1&&runs?T:0);
  const kv=mode==='lclm'?(k>=4?T/N*KVB:0):mode==='kv'?(k>=1&&runs?T*KVB:0):(k>=1&&runs?T*KVB:0);
  const v=tt[key]&&tt[key][CTX[L]],m=mem[key]&&mem[key][CTX[L]];
  let range='';if(mode==='kv'){const vs=['SnapKV','ExpAttn','KVzip','KVzipFast','AM-Fast','AM-Slow'].map(x=>tt[x]&&tt[x][CTX[L]]).filter(x=>x!=null);if(vs.length)range='all KV methods: '+Math.min(...vs).toFixed(2)+' to '+Math.max(...vs).toFixed(2)+' s'}
  return stat('Decoder positions prefilled',runs?fmt(pre):'none','of '+fmt(T)+' tokens')+stat('KV cache allocated',runs?gb(kv):'none',mode==='kv'&&k>=3?'masked entries still allocated':'bf16, from the config')
    +stat('Time to first token',k===last&&v!=null?(v<1?v.toFixed(3):v.toFixed(2))+' s':k===last?'did not run':'…',range||'measured, Figure 4')+stat('Peak GPU memory',k===last&&m!=null?m.toFixed(1)+' GB':k===last?'over 141 GB':'…','measured, Figure 4')}
const anim=makeAnim({id:'cap',modes:STEPS,mode:'lclm',dur:2600,draw:capDraw,counters:capCnt});
const capRe=()=>{$('capLv').textContent=ctxLab(CP.L)+' ('+fmt(CTXN[CP.L])+' tokens)';if(anim)anim.draw()};
$('capL').addEventListener('input',e=>{CP.L=+e.target.value;capRe()});segBind('capN',m=>{CP.N=+m;capRe()});capRe();

// ---- training tokens per stage (Table 1) ----
(function(){const t=TB['S4.T1'],host=$('tokSplit');if(!host)return;const mx=Math.max(...t.total_tokens_B.map(Number));
  host.innerHTML='<div class="small mute" style="margin:6px 0 2px">Tokens per stage in the 16x run, encoder and decoder (<a href="'+t.url+'" target="_blank" rel="noopener noreferrer">Table 1</a>), in billions:</div>'+
  t.stages.map((n,i)=>{const a=+t.enc_tokens_B[i],b=+t.llm_tokens_B[i];return '<div class="pbar"><span>'+n.split(':')[0]+'</span><span class="track"><span class="fill" style="width:'+(100*a/mx).toFixed(1)+'%;background:var(--c4)"></span><span class="fill" style="left:'+(100*a/mx).toFixed(1)+'%;width:'+(100*b/mx).toFixed(1)+'%;background:var(--c1)"></span></span><span>'+a.toFixed(2)+' + '+b.toFixed(2)+'</span></div>'}).join('')+
  '<div class="leg"><span><i style="background:var(--c4)"></i>encoder tokens</span><span><i style="background:var(--c1)"></i>decoder tokens (16x)</span><span>'+t.stages.map(s=>s).join(' · ')+'</span></div>'})();

// ---- predict 2: the from-scratch losses ----
PRED_REVEAL.pq2=()=>{const v=RC.loss.fig3.v,lo=1.16,mx=1.195-lo;$('q2Bars').innerHTML=barRows(v.map(([n,x])=>({n,v:x-lo,c:n.includes('bidir')?'var(--c2)':n.startsWith('EOS')?'var(--c5)':n.startsWith('Concat')?'var(--c4)':'var(--c1)',hl:x===1.169})),mx,x=>(x+lo).toFixed(3))+'<p class="small mute">Bars start at 1.160, not at zero, so the differences are visible at all.</p>'};

// ---- claim table ----
(function(){const tb=$('claimT');if(!tb)return;const G=RC.loss_gaps,AD=RC.adapter_downstream.diff,PO=RC.pool16.diff,MA=RC.mask_downstream.diff,W=RC.window_downstream;
  const sg=a=>a.map(x=>(x>0?'+':'')+x.toFixed(1)).join(', ');
  const rows=[
   ['Mean beats token (EOS) pooling','1.169 against 1.191 at W = 1,024; but 1.183 against 1.182 at W = 16 (a tie)','not re-tested at scale','not re-tested','<span class="no">only with a wide window</span>'],
   ['Wider window: W = N, 256, 1,024','1.183, 1.172, 1.169','0.7438, 0.7321, 0.7276 (the 1,024 run is bidirectional)','W = 16 far worse (RULER 4K 24.85 against 58.37); 1,024 (bidir.) beats 256 (causal) on '+W.w1024_better+' of 7 columns','<span class="ok">W = N bad</span>; 256 against 1,024 unresolved'],
   ['Causal beats bidirectional','1.169 against 1.191','0.6871 against 0.6908','causal ahead on all 7: '+sg(MA),'<span class="ok">yes</span> (one run each)'],
   ['MLP adapter beats attention adapter','1.1906 against 1.2766 (bidir., no overlap)','attention lower: 0.6897 against 0.6912 (both overlap 256)','attention minus MLP: '+sg(AD),'<span class="no">reverses at scale</span>'],
   ['Mean and concat tie; mean better at 16x','1.169 against 1.171','16x: 0.6871 against 0.6876; 4x: concat 0.6667 against 0.6685','16x, concat minus mean: '+sg(PO),'<span class="no">a tie; LongHealth favours concat</span>'],
   ['Overlapping windows do not help','causal: 1.1693 (none) against 1.1723 (256); bidir.: 1.1906 against 1.1889','0.6901 (none) against 0.6912 (256)','overlap 256 (bidir.): RULER about 9 points worse, LongBench about 3 better','<span class="ok">no clear gain</span>'],
   ['Embedding-model encoder beats LLM encoder','not tested','0.7431 against 0.7461 (EOS pooling)','embedding ahead on 6 of 7 columns (Table 32)','<span class="ok">yes</span>']];
  tb.querySelector('tbody').innerHTML=rows.map(r=>'<tr>'+r.map((c,i)=>'<td'+(i===0?' style="font-weight:600"':'')+'>'+c+'</td>').join('')+'</tr>').join('')})();

// ---- speed-up table ----
(function(){const tb=$('spT');if(!tb)return;const PN={fig1_ruler4k:'RULER 4K (Fig. 1)',fig5_ruler8k:'RULER 8K (Fig. 5)',fig5_ruler16k:'RULER 16K (Fig. 5)',fig1_longbench64k:'LongBench 64K (Fig. 1)',fig5_longhealth64k:'LongHealth 64K (Fig. 5)'};
  tb.querySelector('tbody').innerHTML=RC.speedups.map(s=>'<tr><td>'+PN[s.panel]+'</td><td class="num">'+s.printed.toFixed(1)+'x</td><td class="num">'+s.computed.toFixed(2)+'x</td><td class="num">'+s.lclm_acc.toFixed(2)+' against '+s.fast_acc.toFixed(2)+' (<span class="'+(s.acc_gap<0?'no':'ok')+'">'+(s.acc_gap>0?'+':'')+s.acc_gap.toFixed(2)+'</span>)</td><td class="num">'+s.lclm_vs_nocomp.toFixed(2)+'x faster</td></tr>').join('')})();

// ---- Figure 4 rebuilt ----
let F4='ttft';
function f4(w){const host=$('f4Svg');w=w||host.clientWidth;if(!w)return;const H=Math.round(Math.min(330,Math.max(250,w*.55)));
  let D=F4==='ttft'?RC.fig4.ttft:RC.fig4.mem;if(F4==='kv'){D={};D['NoCompression']={};[4,8,16].forEach(n=>D['LCLM '+n+'x']={});CTX.forEach((c,i)=>{D['NoCompression'][c]=CTXN[i]*KVB/1e9;[4,8,16].forEach(n=>D['LCLM '+n+'x'][c]=CTXN[i]/n*KVB/1e9)})}
  const pl=46,pr=w<500?78:110,pt=10,pb=34;
  const lx=i=>pl+(w-pl-pr)*i/8;let s='',ly;
  if(F4==='ttft'){const lg=Math.log10,y0=0.04,y1=500;ly=v=>pt+(H-pt-pb)*(1-(lg(v)-lg(y0))/(lg(y1)-lg(y0)));[0.1,1,10,100].forEach(v=>{s+=ln2(pl,ly(v),w-pr,ly(v),'var(--line)')+tx(pl-5,ly(v)+4,v<1?'0.1 s':v+' s',{fs:11,a:'end',c:'var(--mute)'})})}
  else if(F4==='mem'){ly=v=>pt+(H-pt-pb)*(1-v/130);[0,25,50,75,100,125].forEach(v=>{s+=ln2(pl,ly(v),w-pr,ly(v),'var(--line)')+tx(pl-5,ly(v)+4,v+' GB',{fs:11,a:'end',c:'var(--mute)'})})}
  else{const lg=Math.log10,y0=0.02,y1=300;ly=v=>pt+(H-pt-pb)*(1-(lg(v)-lg(y0))/(lg(y1)-lg(y0)));[0.1,1,10,100].forEach(v=>{s+=ln2(pl,ly(v),w-pr,ly(v),'var(--line)')+tx(pl-5,ly(v)+4,v+' GB',{fs:11,a:'end',c:'var(--mute)'})});s+=ln2(pl,ly(141),w-pr,ly(141),'var(--bad)',{da:'4 3'})+tx(pl+4,ly(141)-4,'141 GB (one H200)',{fs:11,c:'var(--bad)'})}
  CTX.forEach((c,i)=>{if(w>=480||i%2===0)s+=tx(lx(i),H-pb+15,ctxLab(i),{fs:11,a:'middle',c:'var(--mute)'})});
  s+=tx((pl+w-pr)/2,H-4,'context length',{fs:11,a:'middle',c:'var(--mute)'});
  const ends=[];
  Object.keys(D).forEach(k=>{if(k==='SnapKV-SelfStudy')return;const base=k.split(' ')[0],c=MC[base],pts=CTX.map((x,i)=>D[k][x]!=null?[lx(i),ly(D[k][x])]:null).filter(Boolean);
    s+='<polyline points="'+pts.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ')+'" fill="none" stroke="'+c+'" stroke-width="'+(base==='LCLM'||base==='NoCompression'?2.4:1.5)+'"'+(base==='NoCompression'?' stroke-dasharray="5 3"':'')+'/>';
    pts.forEach(p=>s+='<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="2.6" fill="'+c+'"/>');
    const lp=pts[pts.length-1];ends.push({y:lp[1],n:(base==='LCLM'?'LCLM '+k.split(' ')[1]:F4==='kv'&&base==='NoCompression'?'full cache':SN[base]),c,how:MN[base]||k});});
  s+=endLabels(ends,w-pr+6,13);
  host.innerHTML=svgW(w,H,s,F4==='ttft'?'Time to first token against context length':'Peak GPU memory against context length')}
segBind('f4M',m=>{F4=m;f4();const n=$('f4Note');if(n)n.dataset.k=m});fit($('f4Svg'),f4);

// ---- quality against uncompressed (Table 6) ----
(function(){const host=$('qBars');if(!host)return;const R=TB['A7.T6'].rows,full=R[0].v,cols=TB['A7.T6'].cols;
  const get=g=>R.find(r=>r.group===g&&r.label.startsWith('LCLM')&&r.label.includes('Mean')).v;
  const L=[['4x',get('4x compression'),'var(--good)'],['8x',get('8x compression'),'var(--c6)'],['16x',get('16x compression'),'var(--c1)']];
  let h='<div class="tw"><table><thead><tr><th>Benchmark</th><th class="num">Uncompressed</th>'+L.map(l=>'<th class="num">LCLM '+l[0]+'</th>').join('')+'</tr></thead><tbody>';
  cols.forEach((c,i)=>{h+='<tr><td>'+c.replace('LB','LongBench')+'</td><td class="num">'+full[i]+'</td>'+L.map(l=>{const d=f(l[1][i])-f(full[i]);return '<td class="num">'+l[1][i]+' <span class="'+(d>=0?'ok':'no')+'" style="font-weight:400">('+(d>=0?'+':'')+d.toFixed(2)+')</span></td>'}).join('')+'</tr>'});
  host.innerHTML=h+'</tbody></table></div>'})();

// ---- predict 3: Table 33 against the uncompressed decoder (Table 7) ----
PRED_REVEAL.pq3=()=>{const T=TB['A7.T33'],full=TB['A7.T7'].rows[0].v,cols=T.cols.slice(0,8);const base=T.rows[0].v,ag=T.rows[1].v;
  const kept=RC.agent['4k context'].base/RC.agent.full_4k_niah_avg,kept2=RC.agent['4k context'].agent/RC.agent.full_4k_niah_avg;
  let h='<p>'+(100*kept).toFixed(0)+'%: '+RC.agent['4k context'].base.toFixed(2)+' against '+RC.agent.full_4k_niah_avg.toFixed(2)+' averaged over the eight tasks. With skim-then-EXPAND it keeps '+(100*kept2).toFixed(0)+'% ('+RC.agent['4k context'].agent.toFixed(2)+'). Per task, at 4K (<a href="'+T.url+'" target="_blank" rel="noopener noreferrer">Table 33</a> and <a href="'+TB['A7.T7'].url+'" target="_blank" rel="noopener noreferrer">Table 7</a>):</p>';
  h+='<div class="bars wide">'+cols.map((c,i)=>'<div class="row"><span class="nm">'+c+'</span><span class="track"><span class="fill" style="width:'+f(full[i]).toFixed(1)+'%;background:var(--dim)"></span><span class="fill" style="width:'+f(ag[i]).toFixed(1)+'%;background:var(--good);opacity:.85"></span><span class="fill" style="width:'+f(base[i]).toFixed(1)+'%;background:var(--c1)"></span></span><span class="val">'+base[i]+' / '+ag[i]+'</span></div>').join('')+'</div>';
  h+='<div class="leg"><span><i style="background:var(--c1)"></i>16x, latents only</span><span><i style="background:var(--good)"></i>16x with EXPAND</span><span><i style="background:var(--dim)"></i>uncompressed</span></div>';
  $('q3Out').innerHTML=h};
})();
