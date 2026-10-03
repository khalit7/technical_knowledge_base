// ---- Reading, serving many adapters: S-LoRA's layout and its Table 3 throughput ----
(function(){
  const $=id=>document.getElementById(id);if(!$('sl'))return;
  const T=PF_DATA.slora;let set='S1';
  function diagram(){
    const el=$('slD'),W=Math.min(420,RD.width(el)),H=230,cols=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)'];
    let h='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="One shared base matrix serving a batch of requests that each use a different adapter">';
    const rx=4,rw=Math.min(78,W*.2),bx=rw+28,bw=W-bx-6;
    h+='<text x="'+rx+'" y="14" font-size="11.5" fill="var(--mute)">one batch</text>';
    for(let i=0;i<5;i++){const y=22+i*30;h+='<rect x="'+rx+'" y="'+y+'" width="'+rw+'" height="22" rx="4" fill="var(--bg)" stroke="'+cols[i]+'" stroke-width="2"/><text x="'+(rx+rw/2)+'" y="'+(y+15)+'" text-anchor="middle" font-size="11">req '+(i+1)+': ad. '+'ABCDE'[i]+'</text>';
      h+='<line x1="'+(rx+rw)+'" y1="'+(y+11)+'" x2="'+bx+'" y2="'+(46+i*9)+'" stroke="var(--dim)"/>';}
    h+='<rect x="'+bx+'" y="24" width="'+bw+'" height="70" rx="6" fill="var(--soft)" stroke="var(--line)"/><text x="'+(bx+bw/2)+'" y="52" text-anchor="middle" font-size="12" font-weight="600">x · W₀</text><text x="'+(bx+bw/2)+'" y="70" text-anchor="middle" font-size="11" fill="var(--mute)">one copy of the base,</text><text x="'+(bx+bw/2)+'" y="84" text-anchor="middle" font-size="11" fill="var(--mute)">one batched matmul</text>';
    const aw=(bw-16)/5;
    for(let i=0;i<5;i++){const x=bx+4+i*(aw+1.5);h+='<rect x="'+x+'" y="104" width="'+(aw-2)+'" height="30" rx="3" fill="'+cols[i]+'" opacity=".85"/><text x="'+(x+aw/2-1)+'" y="123" text-anchor="middle" font-size="10.5" fill="var(--bg)">x·A'+'ABCDE'[i].toLowerCase()+'·B'+'</text>'}
    h+='<text x="'+(bx+bw/2)+'" y="150" text-anchor="middle" font-size="11" fill="var(--mute)">plus each request\'s own small product</text>';
    h+='<rect x="'+bx+'" y="164" width="'+bw+'" height="56" rx="6" fill="none" stroke="var(--line)" stroke-dasharray="4 3"/><text x="'+(bx+bw/2)+'" y="184" text-anchor="middle" font-size="11">adapter pool: thousands in host memory,</text><text x="'+(bx+bw/2)+'" y="200" text-anchor="middle" font-size="11">the running ones paged onto the GPU</text><text x="'+(bx+bw/2)+'" y="214" text-anchor="middle" font-size="10.5" fill="var(--mute)">beside the KV cache, one pool</text>';
    h+='<line x1="'+(bx+bw/2)+'" y1="164" x2="'+(bx+bw/2)+'" y2="136" stroke="var(--mute)" marker-end="url(#slAr)"/><defs><marker id="slAr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10Z" fill="var(--mute)"/></marker></defs>';
    el.innerHTML=h+'</svg>';
  }
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
  RD.onRender(()=>{diagram();bars()});addEventListener('resize',diagram);
  diagram();bars();
})();
