// ---- Reading, serving many adapters: S-LoRA's Table 3 throughput (the layout is the 3D stage, 28_js_sc_serve.js) ----
(function(){
  const $=id=>document.getElementById(id);if(!$('sl'))return;
  const T=PF_DATA.slora;let set='S1';
  function bars(){
    const rows=T.filter(r=>r.s===set),max=9;
    let h='';
    rows.forEach(r=>{h+='<div style="margin:8px 0 2px;font-size:12.5px;font-weight:600">'+r.n.toLocaleString('en-US')+' adapters</div>';
      [['S-LoRA',r.sl,'var(--c3)'],['vLLM-packed',r.vp,'var(--c2)'],['PEFT',r.pf,'var(--c4)']].forEach(b=>{
        const v=b[1],w=v==null?0:100*v/max,lab=v!=null?v.toFixed(2):(b[0]==='vLLM-packed'?'OOM':'not run');
        h+='<div class="row"><span class="nm">'+b[0]+'</span><span class="track"><span class="fill" style="width:'+w+'%;background:'+b[2]+'"></span></span><span class="val'+(v==null?' mute':'')+'">'+lab+'</span></div>'})});
    $('slB').innerHTML='<div class="bars">'+h+'</div><div class="small mute">requests per second</div>';
    $('slS').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.s===set));
  }
  $('slS').addEventListener('click',e=>{const b=e.target.closest('button[data-s]');if(!b)return;set=b.dataset.s;bars()});
  RD.onRender(bars);bars();
})();
