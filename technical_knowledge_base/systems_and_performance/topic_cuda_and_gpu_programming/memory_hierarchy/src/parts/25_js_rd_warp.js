// ---- Reading: the predict boxes and the measured bars of sections 1, 4 and 5 (the before/after warp animation became the 3D Fig. 2, 41_js_sc_load.js, on 2026-11-10) ----
(function(){
  const D=window.MHD,f=MC.fmtN;

  // predict-then-reveal boxes
  document.querySelectorAll('#t-read .pr').forEach(pr=>pr.addEventListener('click',e=>{const b=e.target.closest('button[data-a]');if(!b)return;
    pr.querySelectorAll('button[data-a]').forEach(x=>{x.classList.remove('right','wrong');if(x.dataset.right)x.classList.add('right')});
    if(!b.dataset.right)b.classList.add('wrong');pr.querySelector('.ans').hidden=false}));

  // measured bars
  const g=n=>D.m1[n];
  const lab=(r,u,d)=>f(r.rate,d)+' '+u+' ('+f(r.rate_lo,d)+' to '+f(r.rate_hi,d)+')';
  function drawBars(){
    const a=g('aos');
    MC.bars(document.getElementById('rd-aosbars'),a.map((r,i)=>({name:r.name,v:r.ms,label:f(r.ms,2)+' ms ('+f(r.ms_lo,2)+' to '+f(r.ms_hi,2)+')',color:i===1?'var(--c3)':'var(--c2)'})));
    MC.bars(document.getElementById('rd-widthbars'),g('widths').map(r=>({name:r.name+' (copy, 512 MB moved)',v:r.rate,label:f(r.rate,0)+' GB/s',color:'var(--c1)'})));
    const tg=g('tgwide').filter(r=>r.bytes_per_access===16||(r.bytes_per_access===4&&[1,32,33].includes(r.stride)));
    MC.bars(document.getElementById('rd-tgbars'),tg.map(r=>({name:r.bytes_per_access+'-byte elements, lane stride '+r.stride,v:r.rate,label:f(r.rate,0)+' GB/s',color:r.bytes_per_access===16?'var(--c1)':'var(--c5)',hl:r.stride===8&&r.bytes_per_access===16})));
    MC.bars(document.getElementById('rd-localbars'),g('local').map((r,i)=>({name:r.name,v:r.ms,label:f(r.ms,2)+' ms',color:i?'var(--c3)':'var(--c2)'})));
  }
  drawBars();
})();
