// ---- Compile lab tab (t-comp), part 2: Dynamo, breaks, recompiles, AOTAutograd, Inductor lists, speed, export, checks ----
(function(){
const C=window.CMP,U=window.CMPU,$=id=>document.getElementById(id);
const {esc,fmt,ms,sec,MiB,MB,onR,W,seg}=U;
const bars=(el,rows,fmtv,col)=>{const mx=Math.max(...rows.map(r=>r[1]));el.innerHTML=rows.map(r=>'<div class="row'+(r[3]?' hl':'')+'"><span class="nm" title="'+esc(r[0])+'">'+esc(r[0])+'</span><span class="track"><span class="fill" style="width:'+(100*r[1]/mx).toFixed(1)+'%;background:'+(r[2]||col||'var(--acc)')+'"></span></span><span class="val">'+fmtv(r[1])+'</span></div>').join('')};
// ---------- 3. Dynamo ----------
$('cmp-dyn-st').innerHTML=RD.stat('Graphs captured',C.dyn.graphs,'for the whole forward, loss included')+RD.stat('Operations in it',C.dyn.ops,'4 unrolled blocks')+RD.stat('Graph breaks',C.dyn.breaks,'torch._dynamo.explain')+RD.stat('Guards',C.guards.total,'checked before every call');
$('cmp-dyn-ops').innerHTML=C.dyn.calls.map(c=>'<span class="c">'+esc(String(c).replace(/^<built-in function (\w+)>$/,'$1'))+'</span>').join('');
bars($('cmp-g-bars'),C.guards.kinds.slice(0,8).map(k=>[k[0],k[1]]),v=>fmt(v));
$('cmp-g-ex').textContent=C.guards.excerpt;
// ---------- 4. graph breaks ----------
const BK=C.brk,base=BK.none.t.med;
function showBk(k){
  const b=BK[k],o=$('cmp-bk-out');
  let strip='';
  if(k==='none')strip='<span class="c">one compiled graph: embeddings, 4 blocks, final LayerNorm, head, loss ('+C.dyn.ops+' ops)</span>';
  else{const A=b.pieces[0].length,Bn=b.pieces[1].length;
    strip='<span class="p">Python: embeddings</span>';
    for(let j=0;j<4;j++)strip+='<span class="c">block '+j+' piece 1 ('+A+')</span><span class="p">Python: the break</span><span class="c">piece 2 ('+Bn+')</span>';
    strip+='<span class="p">Python: final LayerNorm, head, loss</span>'}
  const d=b.t.med-base;
  o.innerHTML=(b.src?'<pre class="cmp-code">'+esc(b.src.trim())+'</pre>':'<p class="small mute">The model as written in src/model/.</p>')+
   '<div class="out">'+RD.stat('Compiled pieces',b.pieces.length,b.pieces.map(p=>p.length+' ops').join(' + '))+RD.stat('Pieces run per forward',b.per_fwd,k==='none'?'the whole forward':'two per block, nothing outside the blocks')+
   RD.stat('Training step, CPU',ms(b.t.med),k==='none'?'eager: '+ms(C.brk_eager.med):(d>=0?'+':'')+ms(d)+' against no break ('+(100*d/base).toFixed(0)+'%)')+'</div>'+
   '<div class="small"><b>One forward pass:</b></div><div class="cmp-strip">'+strip+'</div>'+
   (b.reasons.length?'<div class="co warn"><div class="t">Dynamo\'s reason ('+b.reasons.length+' break'+(b.reasons.length>1?'s':'')+' reported by explain)</div><code>'+esc(b.reasons[0][0])+'</code>'+(b.reasons[0][1]?'<br>'+esc(b.reasons[0][1]):'')+'<br><span class="small mute">at '+esc(b.reasons[0][2])+(b.reasons[1]?'; then: '+esc(b.reasons[1][0])+' at '+esc(b.reasons[1][2]):'')+'</span></div>':'')+
   (b.fg?'<p class="small">With <code>fullgraph=True</code> the same model fails at compile time: <code>'+esc(b.fg)+'</code></p>':'');
}
seg($('cmp-bk-seg'),showBk);showBk('none');
(function(){const b=BK.print;$('cmp-pq2-c').addEventListener('click',e=>{const x=e.target.closest('button');if(!x)return;
  [...$('cmp-pq2-c').children].forEach(y=>y.classList.toggle('on',y===x));const r=$('cmp-pq2-r');r.hidden=false;
  r.innerHTML='<div class="co '+(x.dataset.a==='1'?'key':'warn')+'"><div class="t">'+(x.dataset.a==='1'?'Right, and it surprises most people.':'Not what happened.')+'</div>Dynamo compiled '+b.pieces.length+' pieces, both from inside <code>Block.forward</code> ('+b.pieces[0].length+' and '+b.pieces[1].length+' ops), and ran '+b.per_fwd+' of them per forward. No piece contains the embedding, <code>ln_f</code>, the head or the loss: the break happens inside a call made from the <code>for blk in self.blocks</code> loop, and Dynamo ran <code>GPT.forward</code> itself as plain Python, compiling each <code>Block.forward</code> call as its own frame (the recorded pieces show exactly that). So one stray <code>print</code> cost more than "two graphs".</div>'})})();
const bkMax=Math.max(...['print','item','if','numpy'].map(k=>BK[k].t.med-base)),bkMin=Math.min(...['print','item','if','numpy'].map(k=>BK[k].t.med-base));
U.fill.bk_pf=BK.print.per_fwd+' (two per block)';
U.fill.bk_cost=ms(bkMin)+' to '+ms(bkMax)+' ('+(100*bkMin/base).toFixed(0)+' to '+(100*bkMax/base).toFixed(0)+'%)';
// ---------- 5. recompiles ----------
function showRc(k){
  const rows=C.rec[k],tm=k==='automatic';
  const mx=Math.max(...C.rec_ms.cold);
  $('cmp-rc-tbl').innerHTML='<tr><th>Call</th><th>batch, length</th><th>New compile?</th><th>Failing guard</th>'+(tm?'<th class="num">Time, cold cache</th><th class="num">warm</th>':'')+'</tr>'+
   rows.map((r,j)=>'<tr><td>'+esc(r[0])+'</td><td class="num">'+r[1]+', '+r[2]+'</td><td'+(r[3]?' class="r">yes':'>no')+'</td><td class="small">'+(r[4]?'<code>'+esc(r[4])+'</code>':'')+'</td>'+
    (tm?'<td class="num">'+ms(C.rec_ms.cold[j])+'<div style="height:5px;background:var(--c2);width:'+Math.max(2,100*C.rec_ms.cold[j]/mx).toFixed(0)+'%;margin-left:auto;border-radius:2px"></div></td><td class="num">'+ms(C.rec_ms.warm[j])+'</td>':'')+'</tr>').join('');
  const n=rows.reduce((s,r)=>s+r[3],0);
  $('cmp-rc-note').textContent=n+' compiles for 7 calls. '+(tm?'Times are wall-clock for the whole call (forward and backward; forward only for the eval call) on the CPU, in a process whose Inductor cache directory was empty (cold) or already filled by earlier runs (warm).':'Not timed; the compile pattern is what matters.');
}
seg($('cmp-rc-seg'),showRc);showRc('automatic');
const rcC=C.rec_ms.cold.filter((v,j)=>C.rec.automatic[j][3]&&j>0);
U.fill.rlim=C.dynconf.recompile_limit;
U.fill.rc_cold=(Math.min(...rcC)/1000).toFixed(1)+' to '+sec(Math.max(...rcC));U.fill.rc_cold2=U.fill.rc_cold;
const sc=a=>a.join(', ')+' ('+a.reduce((s,v)=>s+v,0)+' compile'+(a.reduce((s,v)=>s+v,0)>1?'s':'')+')';
U.fill.sc_f=sc(C.scal.float);U.fill.sc_i=sc(C.scal.int);U.fill.sc_t=sc(C.scal.tensor);
// ---------- 6. AOTAutograd ----------
const A=C.aot,act=A.saved.filter(s=>s[0]!=='primals_54'),actB=act.reduce((s,x)=>s+x[2],0),batchB=A.saved.filter(s=>s[0]==='primals_54').reduce((s,x)=>s+x[2],0);
$('cmp-aot-st').innerHTML=RD.stat('Forward graph',fmt(A.fwd_calls)+' calls','ATen ops after decomposition')+RD.stat('Backward graph',fmt(A.bwd_calls)+' calls','')+
 RD.stat('Saved for backward',act.length+' tensors, '+MB(actB),'activations; plus the batch and '+A.n_saved_params+' parameter references (no new memory)')+RD.stat('Eager autograd saved','34.76 MB','34,761,220 B, from the Inside one step tab');
const grp={};act.forEach(s=>{const k='('+s[1].join(', ')+')';grp[k]=grp[k]||[0,0];grp[k][0]++;grp[k][1]+=s[2]});
bars($('cmp-aot-bars'),Object.entries(grp).sort((a,b)=>b[1][1]-a[1][1]).map(([k,v])=>[k+' x '+v[0],v[1]]),b=>b>=1e5?MB(b):fmt(b)+' B','var(--c4)');
$('cmp-aot-p').innerHTML='The partitioner kept what eager autograd keeps, give or take '+MB(Math.abs(actB-34761220))+': for each block the input of every Linear (the LayerNorm outputs, the attention output, the GELU output), the pre-GELU activation, q, k, v and the attention output with its log-sum-exp, and per-row LayerNorm statistics. There was little to gain by recomputing on this model, so the min-cut kept the eager choice. Where it pays (cheap pointwise ops between big saved tensors, such as the RMSNorm on {{The compiler stack|n:3f05c17b0d0d81ddbc00fac9e8a2ff89}}) it recomputes instead. On MPS the compiled backward also called <code>aten::linear_backward</code> '+A.mps_bwd_fallback+' times as a fallback: MPS has its own <code>linear</code> kernels, so the Linear is not decomposed there.';
$('cmp-aot-p').innerHTML=$('cmp-aot-p').innerHTML.replace(/\{\{([^|{}]+)\|n:(\w+)\}\}/g,'<a href="https://app.notion.com/p/$2" target="_blank" rel="noopener noreferrer">$1</a>');
$('cmp-aot-tbl').innerHTML='<tr><th>FX name</th><th>shape</th><th class="num">bytes</th></tr>'+A.saved.filter(s=>s[0]!=='primals_54').map(s=>'<tr><td><code>'+esc(s[0])+'</code></td><td><code>('+s[1].join(', ')+')</code></td><td class="num">'+fmt(s[2])+'</td></tr>').join('');
U.fill.aot_mb=MB(actB)+' (plus the '+fmt(batchB)+'-byte batch)';
// ---------- 7. Inductor lists ----------
let dv='cpu',ph=0;
function showInd(){
  const L=C.ind[dv][ph].L,E=C.eager[dv][ph?'bwd_ops':'fwd_ops'],k=U.kinds(L);
  $('cmp-ind-st').innerHTML=RD.stat('Eager calls',fmt(E.length),'dispatcher calls, '+(ph?'backward':'forward'))+RD.stat('Compiled launches',L.length,k.f+' generated, '+k.e+' matmul, '+k.b+' fallback')+RD.stat('Distinct generated kernels',C.ind[dv][ph].defs,(dv==='cpu'?'C++':'Metal')+' kernels written for this graph')+RD.stat('Generated file',fmt(C.ind[dv][ph].lines)+' lines','kernels plus the Python wrapper');
  $('cmp-ind-l').innerHTML=E.map((o,j)=>'<div class="a">'+(j+1)+'. '+esc(o)+'</div>').join('');
  $('cmp-ind-r').innerHTML=L.map((l,j)=>'<div class="'+(l[1]==='g'?'f':l[1]==='e'?'e':'b')+'" title="'+esc(l[2]||l[0])+'">'+(j+1)+'. '+(l[1]==='g'?'<button data-k="'+esc(l[0])+'">'+esc(l[0])+'</button>':esc(l[0])+(l[2]?' <span class="mute">('+esc(l[2])+')</span>':''))+'</div>').join('');
  $('cmp-ind-k').innerHTML='';
}
$('cmp-ind-r').addEventListener('click',e=>{const b=e.target.closest('button[data-k]');if(!b)return;const nm=b.dataset.k,key=nm+'|'+(ph?'bwd':'fwd');
  const src=dv==='cpu'&&C.ksrc[key];
  $('cmp-ind-k').innerHTML='<div class="small"><b><code>'+esc(nm)+'</code></b>: '+(src?'the generated code, verbatim:':'source not embedded in the page (it is in <code>src/comp/inputs/code_'+dv+'_'+(ph?'bwd':'fwd')+'.py.txt</code>); three CPU kernels are shown in full: the forward GELU, the forward add + LayerNorm of block 0, and the backward GELU.')+'</div>'+(src?'<pre class="cmp-code">'+esc(src)+'</pre>':'')});
seg($('cmp-ind-dev'),v=>{dv=v;showInd()});seg($('cmp-ind-ph'),v=>{ph=+v;showInd()});showInd();
(function(){const c0=C.ind.cpu[0].L,c1=C.ind.cpu[1].L,k0=U.kinds(c0),k1=U.kinds(c1),m0=C.ind.mps[0].L;
  $('cmp-ind-p').innerHTML='On the CPU the forward went from '+C.eager.cpu.fwd+' dispatcher calls to '+c0.length+' launches: '+k0.e+' matmuls and '+k0.b+' attention calls that are the same kernels eager used, and '+k0.f+' launches of '+C.ind.cpu[0].defs+' generated kernels that absorbed everything else (embedding sum, LayerNorms, residual adds, GELU, the loss). Backward: '+C.eager.cpu.bwd+' calls to '+c1.length+' launches. Fewer launches matter most where each launch is expensive, which is a GPU: on MPS the forward went from '+C.eager.mps.fwd+' calls to '+m0.length+' launches. The views (<code>view</code>, <code>transpose</code>, <code>split</code>) vanished entirely: in generated code a view is just a different index expression, <code>reinterpret_tensor</code> in the wrapper.'})();
// ---------- 8. speed ----------
let sd='cpu';
function showSp(){
  const el=$('cmp-sp-svg'),w=W(el),R=C.step[sd],ks=Object.keys(R),mx=Math.max(...ks.map(k=>R[k].max))*1.08;
  const nar=w<560,lw=nar?4:Math.min(220,Math.max(130,w*0.38)),rh=nar?38:26,h=ks.length*rh+24,pw=w-lw-62,dy=nar?14:0;
  let s='';ks.forEach((k,j)=>{const r=R[k],y=6+j*rh,x=v=>lw+pw*v/mx;
    const col=k.indexOf('compiled')>=0?'var(--c3)':'var(--c1)';
    s+=RD.t(4,nar?y+10:y+15,esc(k),{fs:11.5})+'<rect x="'+lw+'" y="'+(y+5+dy)+'" width="'+(x(r.med)-lw)+'" height="13" rx="2" fill="'+col+'"/>'+'<line x1="'+x(r.min)+'" x2="'+x(r.max)+'" y1="'+(y+11.5+dy)+'" y2="'+(y+11.5+dy)+'" stroke="var(--ink)"/>'+RD.t(x(r.max)+4,y+15+dy,ms(r.med),{fs:11})});
  s+='<line x1="'+lw+'" x2="'+lw+'" y1="4" y2="'+(h-18)+'" stroke="var(--line)"/>'+RD.t(lw,h-4,'0',{fs:10,fill:'var(--mute)'})+RD.t(lw+pw,h-4,ms(mx),{fs:10,fill:'var(--mute)',a:'end'});
  el.innerHTML=RD.svg(w,h,s,'Step time by variant');
  const L=C.step.load[sd==='cpu'?0:1];
  $('cmp-sp-note').innerHTML='Full training step (forward, backward, AdamW). Green: compiled. Load average when the run started: '+L.map(v=>v.toFixed(1)).join(', ')+' (1, 5, 15 min). First-call times (compile included, warm cache): '+ks.map(k=>k+' '+ms(R[k].first)).join('; ')+'.';
}
seg($('cmp-sp-dev'),v=>{sd=v;showSp()});onR(showSp);showSp();
let pd='cpu';
function showPh(){
  const P=C.ph[pd],P1=C.ph1[pd],labs=['default (SDPA)','attention written out','attention written out, T=256'];
  const r=(a,b)=>(a/b).toFixed(2)+'x';
  $('cmp-ph-tbl').innerHTML='<tr><th>Model</th><th>Run</th><th class="num">fwd eager</th><th class="num">fwd compiled</th><th class="num">bwd eager</th><th class="num">bwd compiled</th><th class="num">fwd+bwd speed-up</th></tr>'+
   labs.map(l=>[['2',P],['1',P1]].map(([n,Q])=>{const e=Q[l+' | eager'],c=Q[l+' | compiled'];return '<tr><td>'+(n==='2'?esc(l):'')+'</td><td class="num">'+n+'</td><td class="num">'+ms(e[0])+'</td><td class="num">'+ms(c[0])+'</td><td class="num">'+ms(e[1])+'</td><td class="num">'+ms(c[1])+'</td><td class="num"><b>'+r(e[0]+e[1],c[0]+c[1])+'</b></td></tr>'}).join('')).join('')+
   '';
  const sg=Q=>labs.map(l=>{const e=Q[l+' | eager'],c=Q[l+' | compiled'];return e[0]+e[1]>c[0]+c[1]});
  const a=sg(P),b=sg(P1),fl=a.filter((v,j)=>v!==b[j]).length;
  $('cmp-ph-note').textContent='Medians of 5 x 20 iterations, each phase synchronised and timed alone. Run 1 and run 2 are the same script about 20 minutes apart. Speed-up over 1 means compiled is faster. '+(fl?'Which of eager and compiled wins flips between the two runs for '+fl+' of the 3 shapes here, so treat these differences as noise.':'The winner is the same in both runs for all 3 shapes.');
}
seg($('cmp-ph-dev'),v=>{pd=v;showPh()});showPh();
(function(){const pe=C.prof.eager,pc=C.prof.compiled,isMM=n=>/aten::(mm|addmm|_scaled_dot_product)/.test(n);
  const mmE=pe.top.filter(r=>isMM(r[0])).reduce((s,r)=>s+r[2],0),mmC=pc.top.filter(r=>isMM(r[0])).reduce((s,r)=>s+r[2],0),cg=pc.top.filter(r=>/CompiledFxGraph/.test(r[0])).reduce((s,r)=>s+r[2],0);
  U.fill.pr_mm=ms(mmE/1000)+' of '+ms(pe.total/1000);U.fill.pr_rest=ms((pe.total-mmE)/1000);U.fill.pr_mmc=ms(mmC/1000);U.fill.pr_cg=ms(cg/1000);
  U.fill.pr_oth=ms((pc.total-mmC-cg)/1000)+' (total '+ms(pc.total/1000)+')';U.fill.pr_pct=(100*(1-cg/(pe.total-mmE))).toFixed(0)+'%';
  U.prof={mmE,mmC,cg};})();
const st=C.step;
U.fill.mps_mem=MB(st.mps_mem.compiled.after_forward_minus_before)+' compiled against '+MB(st.mps_mem.eager.after_forward_minus_before)+' eager';
U.fill.ma_first=sec(st.cpu['compiled, max-autotune'].first)+' (warm cache for the default graphs)';
U.fill.copt=ms(st.cpu['compiled + compiled optimizer'].med)+' (eager '+ms(st.cpu.eager.med)+')';
U.fill.fused=ms(st.cpu['eager, fused AdamW'].med);
U.fill.mps_best=ms(st.mps['compiled, fused AdamW'].med);U.fill.mps_eager=ms(st.mps.eager.med);
U.fill.ro=ms(st.cpu['compiled, reduce-overhead'].med);U.fill.def=ms(st.cpu.compiled.med);
U.fill.at=C.at.templates+' generated matmul templates; '+C.at.fwd.filter(r=>/extern/.test(r[0])).reduce((s,r)=>s+r[1],0)+' library matmuls in the forward, as in the default mode';
// break-even calculator: log sliders
(function(){
  const lg=(a,b,t)=>Math.exp(Math.log(a)+(Math.log(b)-Math.log(a))*t/100),inv=(a,b,v)=>100*(Math.log(v)-Math.log(a))/(Math.log(b)-Math.log(a));
  const coldMed=C.first.cold.slice().sort((a,b)=>a-b)[1]/1000-st.cpu.compiled.med/1000;
  const save=st.mps.eager.med-st.mps.compiled.med;
  const c=$('cmp-be-c'),s=$('cmp-be-s'),n=$('cmp-be-n');
  c.value=inv(0.5,600,coldMed).toFixed(0);s.value=inv(0.05,50,save).toFixed(0);n.value=inv(100,1e6,10000).toFixed(0);
  function up(){const cv=lg(0.5,600,+c.value),sv=lg(0.05,50,+s.value),nv=Math.round(lg(100,1e6,+n.value));
    $('cmp-be-cv').textContent=cv<10?cv.toFixed(1)+' s':Math.round(cv)+' s';$('cmp-be-sv').textContent=sv<1?sv.toFixed(2)+' ms':sv.toFixed(1)+' ms';$('cmp-be-nv').textContent=fmt(nv);
    const be=cv*1000/sv,net=nv*sv/1000-cv;
    $('cmp-be-st').innerHTML=RD.stat('Break-even',fmt(Math.ceil(be))+' steps','compile time / time saved per step')+RD.stat('Net over the run',(net>=0?'saves ':'loses ')+(Math.abs(net)<120?Math.abs(net).toFixed(1)+' s':(Math.abs(net)/60).toFixed(1)+' min'),'steps x saving minus compile');}
  [c,s,n].forEach(x=>x.addEventListener('input',up));up();
  $('cmp-be-note').innerHTML='Defaults: compile = the median cold first call on the CPU ('+sec(C.first.cold.slice().sort((a,b)=>a-b)[1])+') minus one compiled step; saving = MPS eager minus compiled ('+ms(save)+', measured). Mixing a CPU compile time with an MPS saving is an illustration of the arithmetic, labelled as such; the cold compile on MPS was not measured separately. Every recompile (section 5) adds to the compile side.';
})();
// ---------- 9. export ----------
const X=C.exp;
$('cmp-ex-st').innerHTML=RD.stat('torch.export',X.export_s+' s',fmt(X.calls)+' ops in the graph; '+X.nparams+' parameter inputs (52 tensors: the tied embedding and head weight is listed under both names)')+RD.stat('Core ATen after run_decompositions',fmt(X.core_calls)+' ops','what a back end must implement')+
 RD.stat('AOTInductor compile',X.aoti_s+' s','package '+(X.pkg/1e6).toFixed(1)+' MB')+RD.stat('Package output vs eager','max |diff| '+X.diff.toExponential(1),'batch 8; batch 4 '+X.diff4.toExponential(1)+' (dynamic batch)');
$('cmp-ex-p').innerHTML='<p>The exported graph keeps PyTorch-level ops ('+X.top.slice(0,5).map(t=>'<code>'+esc(t[0].replace('.default','').replace(/^<built-in function (\w+)>$/,'$1'))+'</code> '+t[1]).join(', ')+'); <code>run_decompositions()</code> lowers it to the <b>core ATen</b> opset ('+X.core_top.slice(0,6).map(t=>'<code>'+esc(t[0].replace('.default','').replace(/^<built-in function (\w+)>$/,'$1'))+'</code> '+t[1]).join(', ')+'), the smaller set a new back end has to implement. The batch dimension was declared with <code>Dim("batch", min=1, max=64)</code>; export recorded the range as <code>'+esc(X.range.join(', '))+'</code>. The .pt2 file is a zip; its largest member is the compiled library, which also holds the weights (12.75 MB of float32 parameters; <code>aot_inductor.package_constants_in_so</code> is True by default, torch/_inductor/config.py at 2.14.1) ('+X.files.map(f=>esc(f[0])+' '+(f[1]/1e6).toFixed(2)+' MB').slice(0,3).join(', ')+'). Inference forward, CPU, batch 8: eager under <code>no_grad</code> '+ms(X.t.eager.med)+', <code>torch.compile</code> '+ms(X.t.compiled.med)+', the AOTInductor package '+ms(X.t.aoti.med)+'. Compiled and packaged run the same kind of generated code and land close together, both a little behind eager on this CPU as in section 8; what AOTInductor buys is no Python and no compile at start-up, not speed.</p>';
// ---------- 12. checks ----------
const lc=C.losses.cpu,lm=C.losses.mps,md=(a,b)=>Math.max(...a.map((v,j)=>Math.abs(v-b[j])));
$('cmp-chk').innerHTML=['Three training steps, eager against compiled, CPU: losses '+lc.eager.map(v=>v.toFixed(5)).join(', ')+' and '+lc.compiled.map(v=>v.toFixed(5)).join(', ')+' (largest difference '+md(lc.eager,lc.compiled).toExponential(1)+'); MPS: largest difference '+md(lm.eager,lm.compiled).toExponential(1)+'. Step 0 loss matches the topic\'s reference 3.8014.',
 'Eager dispatcher calls recorded here, '+C.eager.cpu.fwd+' forward and '+C.eager.cpu.bwd+' backward on CPU ('+C.eager.mps.fwd+' and '+C.eager.mps.bwd+' on MPS), equal the counts of the {{Inside one step|#t-step}} tab, recorded by a different script.',
 'Fusion demo outputs, compiled against eager: tanh GELU max |diff| '+C.fus.new_gelu.diff+', add + LayerNorm '+C.fus.add_ln.diff.toExponential(1)+'; each compiled to '+C.fus.new_gelu.nlaunch+' and '+C.fus.add_ln.nlaunch+' launch. Eager bytes for the GELU, '+MiB(U.gelE)+', equal the sum over the 8 ops of 2 MiB per tensor read or written.',
 'Exported and AOTInductor-compiled model against eager: max |diff| '+X.diff.toExponential(1)+' at batch 8 and at batch 4 (one package, dynamic batch).',
 'Compiled parameter count unchanged: '+fmt(C.params)+'.'].map(s=>'<li>'+s.replace(/\{\{([^|{}]+)\|#(t-[\w-]+)\}\}/g,'<a href="#" data-tab="$2">$1</a>')+'</li>').join('');
RD.tabLinks($('cmp-chk'));
// ---------- prose fills ----------
U.fill.ldiff=Math.max(md(lc.eager,lc.compiled),md(lm.eager,lm.compiled)).toExponential(1);U.fill.lndiff=C.fus.add_ln.diff.toExponential(1);U.fill.dyn_ops=C.dyn.ops;U.fill.g_total=C.guards.total;U.fill.g_lat=Math.round(Math.min(...C.guards.lat_us))+' and '+Math.round(Math.max(...C.guards.lat_us));
document.querySelectorAll('#t-comp [data-cmp]').forEach(e=>{const v=U.fill[e.dataset.cmp];e.textContent=v===undefined?'?':String(v)});
})();
