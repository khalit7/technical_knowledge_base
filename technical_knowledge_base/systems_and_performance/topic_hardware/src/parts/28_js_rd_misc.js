// ---- Reading: ridge-point bars (section 5), peak per dollar-hour (section 9), predict-then-reveal questions ----
(function(){
  if(!window.RDH)return;
  const rb=document.getElementById('rd-ridge');
  if(rb){const mx=Math.max(...RDH.ridge.map(r=>r.ridge));
    rb.innerHTML=RDH.ridge.map(r=>'<div class="row"><span class="nm" title="'+r.name+', '+r.fmt+'">'+r.name+' <span class="mute">'+r.fmt+'</span></span><span class="track"><span class="fill" style="width:'+(100*r.ridge/mx).toFixed(1)+'%;background:'+(r.name.indexOf('M1')===0?'var(--c6)':r.fmt==='BF16'||r.fmt.indexOf('BF16')===0?'var(--c1)':'var(--c4)')+'"></span></span><span class="val">'+(r.ridge<100?r.ridge.toFixed(1):Number.isInteger(r.ridge*2)?r.ridge.toLocaleString('en-US'):Math.round(r.ridge).toLocaleString('en-US'))+'</span></div>').join('')}
  const pb=document.getElementById('rd-price-bars');
  function price(m){const k=m==='tf'?'tf_per_usd':'tbs_per_usd',mx=Math.max(...RDH.price.map(r=>r[k]));
    pb.innerHTML=RDH.price.slice().sort((a,b)=>b[k]-a[k]).map(r=>'<div class="row"><span class="nm" title="'+r.name+' ($'+r.usd.toFixed(2)+'/h, '+r.who+')">'+r.name+'</span><span class="track"><span class="fill" style="width:'+(100*r[k]/mx).toFixed(1)+'%;background:'+(r.who==='Lambda'?'var(--c1)':'var(--c3)')+'"></span></span><span class="val">'+(m==='tf'?Math.round(r[k]):r[k].toFixed(2))+'</span></div>').join('')}
  if(pb){RD.seg(document.getElementById('rd-price-mode'),price);price('tf')}
  document.querySelectorAll('#t-read .pr').forEach(pr=>{const ans=pr.querySelector('.ans');
    pr.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
      pr.querySelectorAll('.opts button').forEach(x=>x.classList.remove('right','wrong'));
      b.classList.add(b.dataset.a==='1'?'right':'wrong');pr.querySelectorAll('.opts button[data-a="1"]').forEach(x=>x.classList.add('right'));ans.hidden=false}))});
})();
