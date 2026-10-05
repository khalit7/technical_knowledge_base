// ---- Kernel bench (t-bench) ----
(function(){
  const D=window.WKD,M=D.m1,C=D.code,esc=RD.esc;
  const gbs=(bytes)=>c=>(bytes/(c.ms*1e-3)/1e9).toFixed(0)+' GB/s';
  const tfl=c=>c.flops?(c.flops/(c.ms*1e-3)/1e12).toFixed(2)+' TFLOP/s':'';
  const X=[
    {id:'red',nm:'Reductions',g:'reduce',keys:['R1','R2','R3','R4','R5','R6','A1','L'],rate:gbs(4*(1<<25)),code:['R1','R2','R3','R4','R5','R6','A1'],
     note:'Sum of 2<sup>25</sup> float32 values (134 MB): Harris\'s ladder as Metal kernels, then a one-launch atomic version and MLX\'s mx.sum. Rate = bytes read / time. Reading section 1.'},
    {id:'scan',nm:'Scan',g:'scan',keys:['C1','C2','L','copy'],rate:gbs(4*(1<<24)),code:['C1','C2a','C2b','C2c'],
     note:'Inclusive prefix sum of 2<sup>24</sup> float32 values. Rate = input bytes / time (a scan moves at least twice that). Reading section 2.'},
    {id:'ln',nm:'LayerNorm',g:'norm',keys:['LE','LC','LL','L_two','L_naive','L_welford'],rate:gbs(2*8192*4096*4),code:['L_two','L_naive','L_welford'],
     note:'8,192 rows of 4,096 float32, one threadgroup per row, row kept in registers. Rate = one read plus one write / time. The three kernels of ours differ only in how the variance is computed. Reading section 3.'},
    {id:'rms',nm:'Residual + RMSNorm',g:'norm',keys:['RU','RC','RF'],rate:gbs(4*8192*4096*4),code:['RMS_RESID'],
     note:'h = x + r, y = rmsnorm(h) &gamma;, 8,192 &times; 4,096 float32. Rate = the fused kernel\'s 4 passes / time, for every row (the unfused pair moves 5). Reading section 3.'},
    {id:'epi',nm:'Epilogue fusion',g:'fuse',keys:['MM','U','F0','Fp','F','E','EC'],K:1,rate:tfl,code:['EPI'],
     note:'y = GELU(xW + b), 4,096 &times; 4,096 outputs. Rate = matmul FLOPs / time. Reading section 5.'},
    {id:'rmm',nm:'RMSNorm into matmul',g:'fuse',keys:['RE','RS','RF0','RF'],K:1,rate:tfl,code:['RMS_PRO','EPI'],
     note:'rmsnorm(x) W with &gamma; folded into W, the sum of squares accumulated from the A tiles (the prologue shown), the row scale in the epilogue. Reading section 5.'},
    {id:'gemv',nm:'Decode GEMV',g:'gemv',keys:['Q1','D','H_lib','H_ours','Q_lib','Q2','Q3','read_q'],rate:c=>c.bytes?(c.bytes/(c.ms*1e-3)/1e9).toFixed(0)+' GB/s':'',code:['Q2','Q1'],
     note:'y = Wx for one token, W 14,336 &times; 4,096: float16 (117.4 MB) or MLX 4-bit, group 64 (33.0 MB). Rate = bytes the case must read / time (dequantise-then-GEMV counts its float16 copy written and read). Reading section 6.'},
    {id:'grid',nm:'FA-1 vs FA-2 grid',g:'attn',keys:['full_s0@1024','full_s1@1024','full_s0@2048','full_s1@2048','full_s0@4096','full_s1@4096','full_s0@8192','full_s1@8192'],rate:tfl,log:1,code:['FLASH_SWITCH','FLASH'],
     note:'The Kernel lab\'s FlashAttention-style kernel, 4 heads, d = 64, float32, launched with one threadgroup per head (FA-1\'s grid) or one per 64 query rows and head (FA-2\'s). Rate = 4N<sup>2</sup>d &times; heads / time. Reading section 7.'},
    {id:'causal',nm:'Causal: mask or skip',g:'attn',keys:['c_mask@1024','c_skip@1024','c_lib@1024','c_mask@2048','c_skip@2048','c_lib@2048','c_mask@4096','c_skip@4096','c_lib@4096','c_mask@8192','c_skip@8192','c_lib@8192'],rate:()=>'',code:['FLASH_SWITCH','FLASH'],
     note:'Causal attention, 4 heads, d = 64: every tile computed and masked, tiles above the diagonal skipped, and MLX\'s fused attention with a causal mask. Reading section 7.'},
    {id:'dec',nm:'Split-KV decode',g:'decode',keys:['S1@4096','S4@4096','S16@4096','lib@4096','S1@16384','S4@16384','S16@16384','lib@16384','S1@65536','S2@65536','S4@65536','S8@65536','S16@65536','S32@65536','S64@65536','lib@65536'],rate:c=>(c.bytes/(c.ms*1e-3)/1e9).toFixed(0)+' GB/s',code:['DEC','DECC'],
     note:'One query per head, 8 heads, d = 128, float16 K and V, keys split into S chunks (Flash-Decoding). Rate = K and V bytes / time. Reading section 7; the chart there shows every S.'},
    {id:'camp',nm:'Power-of-two spacing',g:'camp',keys:['S4@65536','S8@65536','S16@65536','S4@66048','S8@66048','S16@66048'],rate:c=>(c.bytes/(c.ms*1e-3)/1e9).toFixed(0)+' GB/s',code:['DEC'],
     note:'The same split-KV kernel at 65,536 keys (chunks start a power of two bytes apart) and 66,048 keys (512 more). Run separately, three times, the same evening. Cause not established (a memory-channel conflict is the likely one).'}];
  const host=document.getElementById('bn-exp');
  host.innerHTML=X.map((x,i)=>'<button data-m="'+x.id+'"'+(i?'':' class="on"')+'>'+x.nm+'</button>').join('');
  let cur=X[0],K='1024',codeKey=null;
  const lab=(g,k)=>{const c=M[g][k];if(g==='fuse')return window.WK_nameOf(g,k.replace(/@.*/,'@1024')).replace(' (ours)','')+'';return c.name.replace(/\s*\(N=(\d+)\)/,', N = $1').replace(/\s*\(L=(\d+)\)/,', L = $1')};
  function render(){
    const x=cur,keys=x.K?x.keys.map(k=>k+'@'+K):x.keys;
    document.getElementById('bn-note').innerHTML=x.note+(x.K?' <span class="seg" id="bn-k" style="margin-left:6px"><button data-m="1024"'+(K==='1024'?' class="on"':'')+'>K = 1,024</button><button data-m="256"'+(K==='256'?' class="on"':'')+'>K = 256</button></span>':'');
    if(x.K)RD.seg(document.getElementById('bn-k'),v=>{K=v;render()});
    const el=document.getElementById('bn-bars');el.dataset.wkbars=x.g+':'+keys.join(',');el.dataset.log=x.log?'1':'';
    window.WK_bars(el);
    if(x.g==='attn'||x.g==='decode'||x.g==='camp')el.querySelectorAll('.row .nm').forEach((n,i)=>n.textContent=lab(x.g,keys[i]));
    document.getElementById('bn-tab').innerHTML='<tr><th>Case</th><th class="num">median ms</th><th class="num">fastest&ndash;slowest</th><th class="num">run medians</th><th class="num">rate</th><th class="num">max error</th><th class="num">load</th></tr>'+
      keys.map(k=>{const c=M[x.g][k];return '<tr><td>'+esc(c.name)+'</td><td class="num">'+c.ms.toFixed(3)+'</td><td class="num">'+c.lo.toFixed(2)+'&ndash;'+c.hi.toFixed(2)+'</td><td class="num">'+c.runs.map(v=>v.toFixed(2)).join(', ')+'</td><td class="num">'+x.rate(c)+'</td><td class="num">'+(c.err==null?'n/a':c.err.toExponential(1))+'</td><td class="num">'+c.load.join(', ')+'</td></tr>'}).join('');
    const cs=document.getElementById('bn-codesel');cs.innerHTML=x.code.map((k,i)=>'<button data-c="'+k+'"'+(i?'':' class="on"')+'>'+k+'</button>').join('');
    codeKey=x.code[0];showCode();
  }
  function showCode(){document.getElementById('bn-code').textContent=(C[codeKey]||'').replace(/^\n/,'');
    document.querySelectorAll('#bn-codesel button').forEach(b=>b.classList.toggle('on',b.dataset.c===codeKey))}
  document.getElementById('bn-codesel').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;codeKey=b.dataset.c;showCode()});
  RD.seg(host,id=>{cur=X.find(x=>x.id===id);render()});
  const m=D.meta;
  document.getElementById('bn-meta').textContent='Runs: '+m.runs+' full runs of '+m.trials+' trials each, '+m.date+' to '+m.end+' (spacing experiment '+m.camp_date+'), '+m.device+' ('+m.arch+'), MLX '+m.mlx+', NumPy '+m.numpy+', Python '+m.python+'; 1-minute load average '+m.load_min+' to '+m.load_max+' while timing (other jobs shared the laptop).';
  render();
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-bench']=window.TAB_RENDER['t-bench']||[]).push(render);
})();
