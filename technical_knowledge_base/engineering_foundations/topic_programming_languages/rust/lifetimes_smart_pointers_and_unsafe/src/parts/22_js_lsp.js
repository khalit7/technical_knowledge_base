// The two visuals that respond to the reader: the lifetime before/after toggle and the Rc stepper. Nothing moves until clicked.
(function(){
  if(!window.RD||!document.getElementById('t-read'))return;
  const seg=document.getElementById('lsp-lt-seg');
  if(seg)RD.seg(seg,m=>document.querySelectorAll('[data-lsp-lt]').forEach(el=>{el.hidden=el.dataset.lspLt!==m}));
  const svg=document.getElementById('lsp-rc-svg');if(!svg)return;
  // smart.rs lines 31 to 38 and the end of main; counts at steps 3 and 4 are the printed values in out/l_smart.txt
  const S=[
    {h:['shared'],n:1,hits:0,c:'Line 31, <code>Rc::new(Doc {..})</code>: one heap block holds the count and the value; <code>shared</code> is an 8-byte pointer to it. strong_count = 1.'},
    {h:['shared','a'],n:2,hits:0,c:'Line 32, <code>Rc::clone(&amp;shared)</code>: copies the pointer and adds 1. The <code>Doc</code> and its <code>String</code> are not copied. strong_count = 2.'},
    {h:['shared','a','b'],n:3,hits:1,c:'Lines 34 and 35: a third handle <code>b</code>; <code>b.cache_hits.set(..)</code> changes the shared value through <code>Cell</code>. Printed: strong_count inside = 3.'},
    {h:['shared','a'],n:2,hits:1,c:'Line 37, <code>b</code> leaves its block: dropping an <code>Rc</code> subtracts 1; nothing is freed. Printed: strong_count after = 2, hits = 1.'},
    {h:[],n:0,hits:1,c:'End of <code>main</code>: <code>a</code> and <code>shared</code> drop, the count reaches 0, and the <code>Doc</code> is freed at that moment (not printed; it follows from the rule).'}];
  let i=0;const cap=document.getElementById('lsp-rc-cap'),num=document.getElementById('lsp-rc-n');
  function draw(){const s=S[i],X=['shared','a','b'];let g='<defs><marker id="lsp-ar3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="var(--acc)"/></marker></defs><g font-size="12" fill="var(--ink)">';
    g+='<text x="10" y="16" font-size="11" fill="var(--mute)">STACK (handles)</text><text x="330" y="16" font-size="11" fill="var(--mute)">HEAP (one RcBox)</text>';
    X.forEach((n,k)=>{const y=30+k*44,on=s.h.includes(n);
      g+='<rect x="10" y="'+y+'" width="120" height="30" rx="5" fill="'+(on?'var(--soft)':'none')+'" stroke="'+(on?'var(--line)':'var(--dim)')+'" stroke-dasharray="'+(on?'':'4 3')+'"/>';
      g+='<text x="20" y="'+(y+20)+'" font-family="ui-monospace,Menlo,monospace" fill="'+(on?'var(--ink)':'var(--mute)')+'">'+n+(on?': Rc&lt;Doc&gt;':' (gone)')+'</text>';
      if(on)g+='<path d="M130,'+(y+15)+' C230,'+(y+15)+' 240,80 328,80" fill="none" stroke="var(--acc)" marker-end="url(#lsp-ar3)"/>'});
    const live=s.n>0;
    g+='<rect x="330" y="30" width="250" height="120" rx="6" fill="'+(live?'var(--soft)':'none')+'" stroke="'+(live?'var(--acc)':'var(--dim)')+'" stroke-dasharray="'+(live?'':'4 3')+'"/>';
    g+='<text x="342" y="54">strong_count: <tspan font-weight="700" fill="var(--acc)" font-size="15">'+s.n+'</tspan></text>';
    g+='<text x="342" y="76" fill="var(--mute)" font-size="11">weak count (no Weak handles here)</text>';
    g+='<text x="342" y="102" font-family="ui-monospace,Menlo,monospace" font-size="11.5">Doc { name: "system prompt",</text><text x="342" y="118" font-family="ui-monospace,Menlo,monospace" font-size="11.5">      cache_hits: Cell('+s.hits+') }</text>';
    if(!live)g+='<text x="342" y="140" fill="var(--lsp-red)" font-weight="600">freed</text>';
    svg.innerHTML=g+'</g>';cap.innerHTML=s.c;num.textContent='Step '+(i+1)+' of '+S.length;
    document.getElementById('lsp-rc-prev').disabled=i===0;document.getElementById('lsp-rc-next').disabled=i===S.length-1}
  document.getElementById('lsp-rc-prev').addEventListener('click',()=>{if(i>0){i--;draw()}});
  document.getElementById('lsp-rc-next').addEventListener('click',()=>{if(i<S.length-1){i++;draw()}});
  draw();
})();
