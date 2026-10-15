// ---- Reading tab, section 5: training-state memory per device, data parallel against FSDP, against each TPU's HBM ----
(function(){
  const sel=document.getElementById('rd-sh-model');if(!sel)return;
  const D=window.RDJ,ms=D.models.filter(m=>m.p!=null);
  sel.innerHTML=ms.map((m,i)=>'<option value="'+i+'"'+(m.n==='LLaMA 3-70B'?' selected':'')+'>'+RD.esc(m.n)+'</option>').join('');
  const rng=document.getElementById('rd-sh-n'),nv=document.getElementById('rd-sh-nv'),bars=document.getElementById('rd-sh-bars'),cap=document.getElementById('rd-sh-cap');
  let mode='dp';
  const fmt=gb=>gb>=1000?(gb/1000).toFixed(gb>=10000?0:1)+' TB':gb>=10?Math.round(gb)+' GB':gb>=1?gb.toFixed(1)+' GB':(gb*1000).toFixed(gb*1000>=10?0:1)+' MB';
  function draw(){
    const m=ms[+sel.value],n=D.devices[+rng.value];nv.textContent=n.toLocaleString('en-US');
    const tot=D.bytesPerParam*m.p/1e9,per=mode==='dp'?tot:tot/n;
    const rows=[{n:'State per device',v:per,hl:1}].concat(D.tpu.map(t=>({n:t.n+' HBM',v:t.hbm})));
    const mx=Math.max(...rows.map(r=>r.v));
    bars.innerHTML=rows.map(r=>'<div class="'+(r.hl?'hl':'')+'"><span class="nm">'+r.n+'</span><span class="tr"><span style="width:'+Math.max(0.5,100*r.v/mx).toFixed(1)+'%;background:'+(r.hl?'var(--c2)':'var(--c1)')+'"></span></span><span class="v">'+fmt(r.v)+'</span></div>').join('');
    const fits=D.tpu.filter(t=>t.hbm>per).map(t=>t.n);
    const minChips=D.tpu.map(t=>t.n+' '+Math.ceil(tot/t.hbm).toLocaleString('en-US')).join(', ');
    cap.innerHTML='<div class="t">'+RD.esc(m.n)+': '+fmt(tot)+' of training state in all</div><p>'+(mode==='dp'?
      'Data parallel keeps a full copy on every device, so adding devices never lowers it: '+fmt(per)+' each. '+(fits.length?'It fits in the HBM of '+fits.join(', ')+' (before any activations).':'No TPU holds it, however many you buy.'):
      'FSDP splits it over all '+n.toLocaleString('en-US')+' devices: '+fmt(per)+' each. '+(fits.length===D.tpu.length?'That fits every chip, leaving room for activations.':fits.length?'That fits '+fits.join(', ')+'.':'Still too big for any chip: add devices.'))+
      ' Fewest chips to hold the state alone: '+minChips+' <span class="der">derived</span>.</p>';
  }
  sel.addEventListener('change',draw);rng.addEventListener('input',draw);
  RD.seg(document.getElementById('rd-sh-mode'),m=>{mode=m;draw()});
  draw();RD.onRender(draw);
})();
