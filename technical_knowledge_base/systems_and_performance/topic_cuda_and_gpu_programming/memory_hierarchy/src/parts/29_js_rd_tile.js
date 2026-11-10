// ---- Reading section 3: the tiling saving at real size (the 4 x 4 animation, moved on 2026-10-23 from the parent root, became the 3D Fig. 3 on 2026-11-10: 42_js_sc_tile.js) ----
(function(){
  if(!document.getElementById('rd-tl-t'))return;
  const tt=document.getElementById('rd-tl-t');
  function real(){const t=+tt.value,N=4096,dir=2*N*N*N*4,til=dir/t;
    document.getElementById('rd-tl-real').innerHTML='4,096 cubed float32 matmul: global traffic '+(dir/1e9).toFixed(0)+' GB without tiles, '+(til/1e9).toFixed(1)+' GB with '+t+' x '+t+' tiles ('+t+' times less); '+(t/4).toFixed(t<4?2:0)+' FLOP per global byte <span class="der">derived: 2N&sup3;&times;4 bytes / T</span>'}
  tt.addEventListener('change',real);real();
})();
