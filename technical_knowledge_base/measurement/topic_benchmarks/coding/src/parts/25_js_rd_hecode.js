// ---- Reading: the code of the three Codex-12B samples that Fig. 2 (32_js_sc_he.js) grades, as printed in the Codex paper's Appendix B ----
(function(){
  const el=document.getElementById('rd-he-code');if(!el||!window.CD)return;const H=CD.he,esc=RD.esc;
  el.innerHTML=[['c6','Sample 6','CORRECT'],['c4','Sample 4','CORRECT'],['c1','Sample 1','WRONG']].map(([id,nm,mk])=>
    '<div><div class="small"><b>'+nm+'</b>, marked '+mk+' in the paper</div><pre class="rd-code">def is_prime(n):\n'+esc(H.src[id].split('\n').map(l=>'    '+l).join('\n'))+'</pre></div>').join('');
})();
