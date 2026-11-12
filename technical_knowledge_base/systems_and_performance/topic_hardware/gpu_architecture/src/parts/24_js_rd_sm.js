// ---- Reading s2: the SM per generation as a table (Fig. 2, the 3D stage in 41_js_sc_sm.js, draws the same counts from window.GA_SM) ----
(function(){
  const G=window.GA,$=id=>document.getElementById(id);
  const SM=window.GA_SM={
    a100:{name:'A100 SM (Ampere, 8.0)',lanes:16,l1:192,smem:164,tma:false,tmem:0,warps:64,note:'64 FP32 lanes per SM, 16 per quadrant; 192 KB L1/shared, up to 164 KB as shared memory; asynchronous copy but no TMA.'},
    h100:{name:'H100 SM (Hopper, 9.0)',lanes:32,l1:256,smem:228,tma:true,tmem:0,warps:64,note:'128 FP32 lanes per SM, 32 per quadrant; 256 KB L1/shared, up to 228 KB as shared memory; TMA copy engine.'},
    b300:{name:'B200 / B300 SM (Blackwell, 10.0 / 10.3)',lanes:32,l1:256,smem:228,tma:true,tmem:256,warps:64,note:'128 CUDA cores per SM; 256 KB L1/shared (228 KB shared); plus 256 KB tensor memory for tensor-core accumulators. SM details from Inside Blackwell Ultra; B200 shares the 10.0 limits.'},
    rtx5090:{name:'RTX 5090 SM (Blackwell consumer, 12.0)',lanes:32,l1:128,smem:100,tma:true,tmem:0,warps:48,note:'128 FP32 lanes per SM; 128 KB L1/shared (100 KB shared); TMA compiles for sm_120, but no tensor memory and at most 48 resident warps.'}
  };
  // table
  const rows=[['FP32 lanes per SM (per quadrant)','64 (16)','128 (32)','128 (32)','128 (32)'],['Tensor cores per SM','4','4','4','4'],['Register file','256 KB','256 KB','256 KB','256 KB'],
    ['L1 + shared (max shared)','192 KB (164)','256 KB (228)','256 KB (228)','128 KB (100)'],['Tensor memory','none','none','256 KB','none'],['Resident warps','64','64','64','48'],['Copy engine','async copy','TMA','TMA','TMA']];
  $('ga-smTable').innerHTML='<thead><tr><th>Per SM</th><th class="num">A100</th><th class="num">H100</th><th class="num">B200 / B300</th><th class="num">RTX 5090</th></tr></thead><tbody>'+rows.map(r=>'<tr><td>'+r[0]+'</td>'+r.slice(1).map(v=>'<td class="num">'+v+'</td>').join('')+'</tr>').join('')+'</tbody>';
})();
