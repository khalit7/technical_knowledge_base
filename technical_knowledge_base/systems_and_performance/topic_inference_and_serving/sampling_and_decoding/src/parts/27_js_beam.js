// ---- Reading section 1: the three 80-token runs under Fig. 2 (greedy, beam search with 4 beams, top-p 0.95), GPT-2 small, real outputs ----
// (the greedy against beam search figure is the 3D scene 41_js_sc_beam.js)
(function(){
  const B=SD.BEAM,esc=RD.esc;
  const v=s=>esc(s).replace(/\n/g,' ↵ ');
  document.getElementById('rd-bmG').innerHTML=v(B.long.greedy);
  document.getElementById('rd-bmB').innerHTML=v(B.long.beam4);
  document.getElementById('rd-bmS').innerHTML=v(B.long.p95);
})();
