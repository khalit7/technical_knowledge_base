// ---- Tokenizer comparator tab (recorded data in AVD.tok); crops are a toggle, nothing moves by itself ----
(function(){
  const T=AVD.tok,M=T.m,esc=RD.esc,fmt=n=>n.toLocaleString('en-GB');
  const order=T.order.filter(k=>M[k]);
  function table(){
    let h='<thead><tr><th>Autoencoder</th><th>Kind</th><th>Latent</th><th class="num">Numbers</th><th class="num">Compression</th><th class="num">PSNR</th><th class="num">SSIM</th><th class="num">LPIPS</th><th class="num">Round trip</th><th class="num">Parameters</th><th>dtype</th></tr></thead><tbody>';
    const best={psnr:Math.max(...order.filter(k=>!M[k].nan).map(k=>M[k].mean.psnr)),ssim:Math.max(...order.filter(k=>!M[k].nan).map(k=>M[k].mean.ssim)),lpips:Math.min(...order.filter(k=>!M[k].nan).map(k=>M[k].mean.lpips))};
    order.forEach(k=>{const m=M[k],b=(v,w)=>v===best[w]?'<b>':'' ;
      const num=m.K?fmt(m.numbers)+' tokens of '+Math.round(Math.log2(m.K))+' bits':fmt(m.numbers);
      const cell=(w,d)=>m.nan?'<td class="num bad" data-nanok>NaN</td>':'<td class="num">'+(m.mean[w]===best[w]?'<b>':'')+m.mean[w].toFixed(d)+(m.mean[w]===best[w]?'</b>':'')+'</td>';
      h+='<tr><td>'+esc(m.label)+'</td><td>'+esc(m.kind)+'</td><td class="av-mono">'+m.latent_shape.join(' &times; ')+'</td><td class="num">'+num+'</td><td class="num">'+(786432/m.numbers).toFixed(m.K?0:1)+'&times;</td>'+cell('psnr',2)+cell('ssim',3)+cell('lpips',3)+'<td class="num">'+m.rt.toFixed(2)+' s</td><td class="num">'+(m.params/1e6).toFixed(1)+'M</td><td>'+m.dtype+'</td></tr>'});
    document.getElementById('avtok-tab').innerHTML=h+'</tbody>';
  }
  let metric='psnr';
  function per(){
    let h='<thead><tr><th>Image</th>'+order.filter(k=>!M[k].nan).map(k=>'<th class="num">'+esc(M[k].short)+'</th>').join('')+'</tr></thead><tbody>';
    T.images.forEach((im,i)=>{const vals=order.filter(k=>!M[k].nan).map(k=>M[k].per[i][metric]);const bv=metric==='lpips'?Math.min(...vals):Math.max(...vals);
      h+='<tr><td class="av-mono">'+esc(im)+'</td>'+vals.map(v=>'<td class="num">'+(v===bv?'<b>':'')+v.toFixed(metric==='psnr'?1:3)+(v===bv?'</b>':'')+'</td>').join('')+'</tr>'});
    document.getElementById('avtok-per').innerHTML=h+'</tbody>';
  }
  RD.seg(document.getElementById('avtok-metric'),v=>{metric=v;per()});
  function stat(){
    let h='<thead><tr><th>Autoencoder</th><th>Normalisation (from the config or pipeline)</th><th class="num">Raw std</th><th class="num">Normalised std</th><th class="num">Normalised mean</th></tr></thead><tbody>';
    order.forEach(k=>{const m=M[k];const f=v=>isFinite(v)?v.toFixed(3):'<span data-nanok>NaN</span>';h+='<tr><td>'+esc(m.label)+'</td><td>'+m.norm+'</td><td class="num">'+f(m.raw_std)+'</td><td class="num">'+f(m.lat_std)+'</td><td class="num">'+f(m.lat_mean)+'</td></tr>'});
    document.getElementById('avtok-stat').innerHTML=h+'</tbody>';
  }
  // crops: a toggle between the original and each autoencoder (left tile stays the original)
  let img=T.crop_images[0],cur=1;const seq=['orig'].concat(order.filter(k=>!M[k].nan));
  document.getElementById('avtok-img').innerHTML=T.crop_images.map(c=>'<button data-c="'+c+'" class="'+(c===img?'on':'')+'">'+esc(T.crop_names[c])+'</button>').join('');
  document.getElementById('avtok-model').innerHTML=seq.slice(1).map((k,i)=>'<button data-m="'+(i+1)+'"'+(i===0?' class="on"':'')+'>'+esc(M[k].short)+'</button>').join('');
  function draw(i){
    const k=seq[i],cr=T.crops[img],box=document.getElementById('avtok-crops');
    box.innerHTML='<figure><img src="'+cr.orig+'" alt="original crop"><figcaption>Original</figcaption></figure><figure><img src="'+cr[k]+'" alt="'+esc(M[k].label)+' crop"><figcaption>'+esc(M[k].label)+'</figcaption></figure>';
    document.querySelectorAll('#avtok-model button').forEach(b=>b.classList.toggle('on',+b.dataset.m===i));
    const pi=T.images.indexOf(img);
    document.getElementById('avtok-cap').innerHTML='<div class="t">'+esc(M[k].label)+'</div><p>'+esc(M[k].latent_shape.join(' x '))+' latent; on this image PSNR '+M[k].per[pi].psnr.toFixed(2)+' dB, SSIM '+M[k].per[pi].ssim.toFixed(3)+', LPIPS '+M[k].per[pi].lpips.toFixed(3)+'.</p>';
  }
  document.getElementById('avtok-model').addEventListener('click',e=>{const b=e.target.closest('button');if(b){cur=+b.dataset.m;draw(cur)}});
  document.getElementById('avtok-img').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;img=b.dataset.c;
    document.querySelectorAll('#avtok-img button').forEach(x=>x.classList.toggle('on',x===b));draw(cur)});
  draw(cur);
  (function(){const ti=T.images.indexOf('s03_text');const v=order.filter(k=>!M[k].nan).map(k=>M[k].per[ti].psnr);
    document.getElementById('avtok-text-min').textContent=Math.min(...v).toFixed(1);document.getElementById('avtok-text-max').textContent=Math.max(...v).toFixed(1)})();
  table();per();stat();
})();
