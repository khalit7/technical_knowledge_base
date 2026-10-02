// ---- The paper's tables, rebuilt ----
(function(){
const T=PAPER.tables,RC=PAPER.rc;
const GR={'PyTorch Attention':['exact','var(--c2)',''],'Megatron':['exact','var(--c5)',''],'Reformer':['approx','var(--c4)',''],'Local Attention':['approx','var(--c4)','6 3'],'Linformer':['approx','var(--c4)','2 2'],'Smyrf':['approx','var(--c4)','8 3 2 3'],'LSformer':['approx','var(--c4)','1 4'],
  'Block Sparse':['sparse','var(--c6)',''],'Longformer':['sparse','var(--c6)','6 3'],'BigBird':['sparse','var(--c6)','2 2'],'FlashAttention':['ours','var(--acc)',''],'Block-Sparse FlashAttention':['ours','var(--c3)','7 4']};
const GN={exact:'Exact',approx:'Approximate',sparse:'Sparse',ours:'FlashAttention'};
const on={exact:1,approx:1,sparse:1,ours:1};let pass='both';
const chips=$('bnChips');Object.keys(GN).forEach(g=>{const b=document.createElement('button');b.textContent=GN[g];b.className='on';b.id='bnG_'+g;b.addEventListener('click',()=>{on[g]=!on[g];b.classList.toggle('on',!!on[g]);bench()});chips.appendChild(b)});
segBind('bnP',m=>{pass=m;bench()});
function pick(){if(pass==='mem')return T.bench['21'];const dr=$('bnDr').checked?1:0,mk=$('bnMk').checked?1:0;return Object.values(T.bench).find(t=>t.pass===pass&&t.dropout===dr&&t.masking===mk)}
function bench(){const t=pick(),Ns=t.N,mem=pass==='mem';$('bnDr').disabled=mem;$('bnMk').disabled=mem;
  const ni=+$('bnN').value;$('bnNv').textContent=fmt(Ns[ni]);
  const names=Object.keys(t.rows).filter(n=>on[GR[n][0]]);
  const host=$('bnSvg');fit(host,W=>{const H0=Math.min(340,Math.max(240,W*.45)),pr=14;const lg=legend(names.map(n=>[n.replace('Block-Sparse FlashAttention','Block-sparse FlashAttention').replace('PyTorch Attention','PyTorch'),GR[n][1],GR[n][2]||null]),50,H0+14,W-60),H=H0+lg.h+8;
    const y=mem?[10,50000]:[0.03,20000];const yt=mem?[[10,'10'],[100,'100'],[1000,'1,000'],[10000,'10,000']]:[[0.1,'0.1'],[1,'1'],[10,'10'],[100,'100'],[1000,'1,000'],[10000,'10,000']];
    const f=logFrame({W,H:H0,pl:50,pr,pt:10,pb:36,x:[128,65536],y,xt:[[128,'128'],[512,'512'],[2048,'2K'],[8192,'8K'],[32768,'32K'],[65536,'64K']],yt,xl:'sequence length N',yl:mem?'memory (MB)':'runtime (ms)'});let s=f.s;
    s+=ln2(f.lx(Ns[ni]),10,f.lx(Ns[ni]),H0-36,'var(--mute)',{da:'2 3'});
    const ends=[];names.forEach(n=>{const v=t.rows[n],g=GR[n];let p='',last=null;v.forEach((x,i)=>{if(x==null)return;p+=(p&&last===i-1?'L':'M')+f.lx(Ns[i]).toFixed(1)+' '+f.ly(Math.max(y[0],x)).toFixed(1);last=i});
      const w=g[0]==='ours'?2.6:1.6;s+='<path d="'+p+'" fill="none" stroke="'+g[1]+'" stroke-width="'+w+'"'+(g[2]?' stroke-dasharray="'+g[2]+'"':'')+'/>';
      v.forEach((x,i)=>{if(x!=null)s+='<circle cx="'+f.lx(Ns[i]).toFixed(1)+'" cy="'+f.ly(Math.max(y[0],x)).toFixed(1)+'" r="'+(g[0]==='ours'?2.6:1.8)+'" fill="'+g[1]+'"/>'});
      const li=v.map((x,i)=>x==null?-1:i).filter(i=>i>=0).pop();ends.push({y:f.ly(v[li]),c:g[1],n:n.replace('Block-Sparse FlashAttention','Block-sparse FA').replace('PyTorch Attention','PyTorch').replace('Local Attention','Local'),how:n+': last printed value '+v[li]+(mem?' MB':' ms')+' at N = '+Ns[li]})});
    s+=lg.s;host.innerHTML=svgW(W,H,s,'Runtime or memory against sequence length')});
  // read-off table at the chosen N
  const fa=t.rows['FlashAttention'][ni];const rows=Object.keys(t.rows).map(n=>[n,t.rows[n][ni]]).filter(r=>r[1]!=null).sort((a,b)=>a[1]-b[1]);
  $('bnT').innerHTML='<tr><th>Method</th><th>Group</th><th class="num">'+(mem?'MB':'ms')+' at N = '+fmt(Ns[ni])+'</th><th class="num">÷ FlashAttention</th></tr>'+rows.map(r=>'<tr'+(GR[r[0]][0]==='ours'?' style="font-weight:600"':'')+'><td>'+r[0]+'</td><td>'+GN[GR[r[0]][0]]+'</td><td class="num">'+fmt(r[1],r[1]<10?2:r[1]<1000?1:0)+'</td><td class="num">'+(fa?(r[1]/fa).toFixed(2)+'×':'')+'</td></tr>').join('')+
    (Object.keys(t.rows).length>rows.length?'<tr><td colspan="4" class="mute">Not run at this length: '+Object.keys(t.rows).filter(n=>t.rows[n][ni]==null).join(', ')+'</td></tr>':'');
  $('bnRep').innerHTML='Showing @T@, '+t.caption.replace(/^Table \d+: /,'').replace(/ Best in bold, second best underlined\./,'').replace(/\.$/,'')+'. '+(t.masking?'Block Sparse, Longformer and BigBird were measured without masking because of a bug in their backward pass (§E.6), so their masking rows flatter them slightly. ':'')+(mem?'Memory is measured once, forward + backward, without dropout or masking; FlashAttention and its block-sparse version coincide, as do PyTorch and Megatron up to 2K. ':'')+'Defaults reproduce the paper\'s claims independently: up to '+Math.max(...RC.bench_sp.pt_over_fa.slice(0,5)).toFixed(2)+'× faster than PyTorch for N = 128 to 2K (Table 11), 20.4× less memory than PyTorch at 4K and 1.96× less than Linformer at 64K (Table 21).';
  $('bnRep').innerHTML=$('bnRep').innerHTML.replace('@T@',A(PAPER.meta.ax+'#'+t.anchor,'Table '+t.anchor.split('.T')[1]))}
['bnDr','bnMk'].forEach(id=>$(id).addEventListener('change',bench));$('bnN').addEventListener('input',bench);

const tbl=(id,hdr,rows,num)=>{$(id).innerHTML='<tr>'+hdr.map((h,i)=>'<th'+(num&&num(i)?' class="num"':'')+'>'+h+'</th>').join('')+'</tr>'+rows.map(r=>'<tr>'+r.map((c,i)=>'<td'+(num&&num(i)?' class="num"':'')+'>'+c+'</td>').join('')+'</tr>').join('')};
function statics(){
  // Figure 2 with the cost model
  const f=RC.fig2;tbl('f2T',['','Standard (printed)','FlashAttention (printed)','Standard (counted)','FlashAttention (counted)'],[
    ['GFLOPs','66.6','75.2',fmt(f.std_matmul_gflops,0)+' (matrix multiplies)',fmt(f.fa_matmul_gflops,0)+' (with recomputation)'],
    ['HBM R/W (GB)','40.3','4.4',f.std_GB.toFixed(1)+' (Alg. 0 + 3); '+f.std_md_GB.toFixed(1)+' with mask, dropout passes',f.fa_GB.toFixed(2)+' (B_c = '+f.Bc+')'],
    ['Runtime (ms)','41.7','7.3','≥ '+f.io_ms_std_printed.toFixed(1)+' (40.3 GB at 1.5 TB/s)','≥ '+f.io_ms_fa_printed.toFixed(1)+' (4.4 GB)']],i=>i>0);
  $('f2Rep').innerHTML='Workload: GPT-2 medium, N = 1,024, d = 64, 16 heads × batch 64, forward + backward, A100. Ratios: '+(40.3/4.4).toFixed(1)+'× less HBM traffic, '+(41.7/7.3).toFixed(1)+'× faster, '+((75.2/66.6-1)*100).toFixed(0)+'% more FLOPs. <b>Does not reproduce:</b> the GFLOPs column (the stated workload\'s matrix multiplies are about 12 times larger) and the standard HBM figure from the algorithms alone; the FlashAttention HBM figure comes within 5% under Algorithm 1\'s block rule with 192 KB of SRAM, a reconstruction since the paper gives neither its block sizes nor its counting method. The attention matrix itself is '+f.attn_matrix_GB.toFixed(2)+' GB per copy here: the old page\'s "40 GB attention matrix" was the total traffic, not the matrix.';
  // Table 1
  const t1=T.t1;tbl('t1T',t1.header.concat(['speed relative to Nvidia']),t1.rows.map((r,i)=>r.concat([i?(20/17.4).toFixed(3)+'× ('+((20/17.4-1)*100).toFixed(1)+'% faster)':'1.000×'])),i=>i>0);
  const c=RC.checks.find(x=>x.claim.startsWith('BERT gap'));$('t1Rep').innerHTML=t1.caption+' Gap: 2.6 minutes, '+c.value+' (√(1.5²/10 + 1.4²/10) = 0.65 minutes). Caveat: '+c.note+'.';
  // Tables 2 and 4
  const days=x=>parseFloat(x);const t2=T.t2;const hf={small:9.5,medium:21.0},mg={small:4.7,medium:11.5};
  tbl('t2T',t2.header.concat(['speedup recomputed','vs Megatron-LM']),t2.rows.map(r=>{const sz=r[0].includes('small')?'small':'medium',d=days(r[2]);return r.concat([(hf[sz]/d).toFixed(2)+'×',(mg[sz]/d).toFixed(2)+'×'])}),i=>i>0);
  const t4=T.t4;tbl('t4T',t4.header.concat(['speedup recomputed','perplexity gain']),t4.rows.map(r=>r.concat([(4.7/days(r[3])).toFixed(2)+'×',(18.2-parseFloat(r[2])).toFixed(1)])),i=>i>1);
  $('t2Rep').innerHTML=t2.caption+' '+t4.caption+' Every printed speedup recomputes from the days. Against Megatron-LM the gain is 1.74× (small) and 1.67× (medium), the caption\'s "up to 1.7×"; the "1.8× over Megatron" in §4\'s summary is not in the table. Medium\'s perplexity is 14.2 for HuggingFace and 14.3 for the other two. Single runs, no error bars.';
  // Table 3, sortable
  let sk=7,sd=-1;const t3=T.t3,av=RC.t3avg;
  function t3draw(){const rows=t3.rows.map((r,i)=>r.concat([av[i].recomputed.toFixed(2)]));const key=r=>{const v=parseFloat(r[sk]);return isNaN(v)?-1:v};
    if(sk>0)rows.sort((a,b)=>sd*(key(a)-key(b)));
    $('t3T').innerHTML='<tr>'+t3.header.concat(['Avg (recomputed)']).map((h,i)=>'<th class="'+(i?'num':'')+'" style="cursor:pointer" data-k="'+i+'">'+h+(i===sk?(sd<0?' ▾':' ▴'):'')+'</th>').join('')+'</tr>'+
      rows.map(r=>'<tr'+(r[0].includes('FlashAttention')?' style="font-weight:600"':'')+'>'+r.map((c,i)=>'<td'+(i?' class="num"':'')+'>'+c+'</td>').join('')+'</tr>').join('');
    $('t3T').querySelectorAll('th').forEach(th=>th.addEventListener('click',()=>{const k=+th.dataset.k;if(k===sk)sd=-sd;else{sk=k;sd=-1}t3draw()}))}
  t3draw();
  $('t3Rep').innerHTML=t3.caption+' Eight of nine averages recompute exactly; the Transformer\'s five scores average 59.24, printed 59.3 (probably computed from unrounded scores). Speedups are geometric means of per-task wall-clock speedups whose task times are not printed (§E.3). Where a baseline could not be reproduced on a task, the better published number was used; Performer and Local Attention ran in FP32.';
  // Tables 5 and 6
  const t5=T.t5;tbl('t5T',t5.header,t5.rows.concat(t5.rows.map(r=>['lift over 512, '+r[0].split(' ')[0]].concat(r.slice(1).map(v=>((+v)-(+r[1])).toFixed(1))))),i=>i>0);
  tbl('t6T',T.t6.header,T.t6.rows,i=>i>0);
  $('t5Rep').innerHTML=t5.caption+' '+T.t6.caption+' The text says "Table 6 shows that sequence length 16K outperforms length 512 by 4.3 points on MIMIC": it means Table 5. Lifts recompute (4.3 and 8.5; mean 6.4), but each is at its dataset\'s best length; MIMIC-III is below its 512 score at 1K and 2K, and ECtHR is lower at 16K than 8K.';
  const host=$('t5Svg');fit(host,W=>{const H=180,Ls=[512,1024,2048,4096,8192,16384];const f=logFrame({W,H,pl:40,pr:84,pt:10,pb:34,x:[512,16384],y:[45,85],xt:Ls.map(l=>[l,l>=1024?(l/1024)+'K':'512']),yt:[[50,'50'],[60,'60'],[70,'70'],[80,'80']],xl:'sequence length (tokens)',yl:'micro F1'});
    // linear y: rebuild ly
    const ly=v=>10+(H-44)*(1-(v-45)/40);let s='';[50,60,70,80].forEach(v=>{s+=ln2(40,ly(v),W-84,ly(v),'var(--line)')+tx(34,ly(v)+4,String(v),{fs:11,a:'end',c:'var(--mute)'})});
    Ls.forEach(l=>{s+=tx(f.lx(l),H-18,l>=1024?(l/1024)+'K':'512',{fs:11,a:'middle',c:'var(--mute)'})});s+=tx((40+W-84)/2,H-4,'sequence length (tokens)',{fs:11,a:'middle',c:'var(--mute)'});
    t5.rows.forEach((r,k)=>{const c=k?'var(--c2)':'var(--acc)';let p='';r.slice(1).forEach((v,i)=>{p+=(i?'L':'M')+f.lx(Ls[i]).toFixed(1)+' '+ly(+v).toFixed(1);s+='<circle cx="'+f.lx(Ls[i]).toFixed(1)+'" cy="'+ly(+v).toFixed(1)+'" r="3" fill="'+c+'"/>'});s+='<path d="'+p+'" fill="none" stroke="'+c+'" stroke-width="2"/>'+tx(W-80,ly(+r[6])+4,r[0].split(' ')[0],{fs:11,c})});
    host.innerHTML=svgW(W,H,s,'Table 5: micro F1 against sequence length')});
  // Table 7
  const t7=T.t7;tbl('t7T',t7.header,t7.rows,i=>i>0);
  const fm=t7.rows[4].slice(1).map(Number),fl=t7.rows[5].slice(1).map(Number);
  $('t7Rep').innerHTML=t7.caption+' Forward + backward, FMHA ÷ FlashAttention: '+fm.map((v,i)=>(v/fl[i]).toFixed(3)).join(', ')+', so FlashAttention is '+fm.map((v,i)=>{const p=(v/fl[i]-1)*100;return (p<0?Math.abs(p).toFixed(1)+'% slower':p.toFixed(1)+'% faster')+' at '+t7.header[i+1]}).join(', ')+', the paper\'s 4%, 8% and 5%. Faster forward (it does not write the attention matrix), slower backward (it recomputes it).';
  // checks
  const V={yes:'<span class="ok">yes</span>',nearly:'nearly',no:'<span class="no">no</span>','cannot check':'<span class="mute">cannot check</span>'};
  $('chkT').innerHTML='<tr><th>Claim</th><th>Where</th><th>Printed</th><th>Recomputed</th><th>Verdict</th></tr>'+RC.checks.map(c=>'<tr><td>'+c.claim+(c.note?'<div class="small mute">'+c.note+'</div>':'')+'</td><td style="white-space:nowrap">'+A(PAPER.meta.ax+'#'+c.at,c.at.replace(/^S4\.T6$/,c.claim.indexOf('Path')>=0?'Table 6':'Table 5').replace(/^S(\d+)\.T(\d+)$/,'Table $2').replace(/^A5\.T(\d+)$/,'Table $1').replace(/^S3\.F2$/,'Figure 2').replace(/^S1\.F1$/,'Figure 1').replace(/^S(\d)\.SS(\d)$/,'§$1.$2').replace(/^S(\d)$/,'§$1'))+'</td><td>'+c.printed+'</td><td>'+c.value+'</td><td>'+V[c.ok]+'</td></tr>').join('')}
let done=0;onTab('t-tables',()=>{bench();if(!done){done=1;statics()}});
})();
