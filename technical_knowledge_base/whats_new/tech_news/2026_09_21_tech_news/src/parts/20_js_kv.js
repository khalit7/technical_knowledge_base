// ---- DeepSeek KV cache per session: bytes per token x context, for five generations (the steps from V4-Flash to V4.1-Flash are the 3D stage, 31_js_sc_kv.js) ----
(function(){
  const fb=$('kvFam');if(!fb)return;
  const LS=[[8192,'8K'],[32768,'32K'],[131072,'128K'],[1048576,'1M'],[4194304,'4M']];
  const FAM=[['DeepSeek-V1 67B (2023)','V1 67B',389120],['DeepSeek-V3 MLA, BF16 (derived)','V3 (derived)',70272],['DeepSeek-V3.2 (2025)','V3.2',48068],['DeepSeek-V4-Flash (Apr 2026)','V4-Flash',3514.25],['DeepSeek-V4.1-Flash (Sep 2026)','V4.1-Flash',890]];
  function fam(){
    const W=Math.max(300,fb.clientWidth||340),narrow=W<560,L=LS[+$('kvL').value];$('kvLv').textContent=L[1]+' tokens';
    const lw=narrow?82:220,pr=70,a=Math.log10(500),b=Math.log10(400000),X=v=>lw+(W-lw-pr)*(Math.log10(v)-a)/(b-a);
    let s='<text x="8" y="12" font-size="12" font-weight="600">'+(narrow?'One '+L[1]+'-token session (bytes/token, log)':'Bytes per token (log scale) and one '+L[1]+'-token session')+'</text>',y=24;
    FAM.forEach(([n0,n1,v],i)=>{const n=narrow?n1:n0;s+='<text x="'+(lw-6)+'" y="'+(y+11)+'" font-size="11" text-anchor="end">'+n+'</text><rect x="'+lw+'" y="'+(y+2)+'" width="'+(X(v)-lw)+'" height="12" rx="2" fill="'+(i===4?'var(--c3)':'var(--dim)')+'"/>';
      const gb=v*L[0]/1e9;s+='<text x="'+(X(v)+5)+'" y="'+(y+12)+'" font-size="11">'+(gb>=100?fmt(gb,0):gb>=10?gb.toFixed(1):gb.toFixed(2))+' GB</text>';y+=20});
    fb.innerHTML=svgEl(W,y+6,s,'KV cache per session')+'<p class="small mute">V1 needs '+(389120/890).toFixed(0)+'x the cache of V4.1-Flash (the card\'s 437x); V3 needs '+(70272/890).toFixed(0)+'x. GB = bytes per token x tokens / 10⁹, one sequence, one copy.</p>';
  }
  $('kvL').addEventListener('input',fam);
  let rw=0;addEventListener('resize',()=>{const w=fb.clientWidth;if(w&&w!==rw){rw=w;fam()}});
  onTab(fb.closest('.tab').id,fam);
})();
