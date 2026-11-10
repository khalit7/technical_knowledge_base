// ---- Reading: WaveNet's configuration, blocks of dilations 1, 2, ..., 512 (a small calculator beside the paper's quote) ----
// The dilated stack itself is the 3D Fig. 5 (37_js_sc_wave.js).
(function(){
  const $=id=>document.getElementById(id);
  if(!$('wv-b'))return;
  function cfg(){const b=+$('wv-b').value;$('wv-bv').textContent=b;const R=1+b*1023;$('wv-cfg').innerHTML=RD.stat('Receptive field',R.toLocaleString('en-GB')+' samples','1 + '+b+' × 1,023')+RD.stat('At 16 kHz',(R/16).toFixed(1)+' ms','')+RD.stat('Layers',String(10*b),b+' block'+(b>1?'s':'')+' of 10')}
  $('wv-b').addEventListener('input',cfg);cfg();
})();
