// ---- Extraction and filtering: shared helpers (prefix ef) ----
window.EFH=(function(){
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const n=x=>(x==null||isNaN(x))?'n/a':Number(x).toLocaleString('en-US');
  const p=(a,b,d)=>b?(100*a/b).toFixed(d==null?1:d)+'%':'n/a';
  const f=(x,d)=>(x==null||isNaN(x))?'n/a':Number(x).toFixed(d==null?2:d);
  const $=id=>document.getElementById(id);
  const XN={traf111:'trafilatura 1.11 (FineWeb settings)',traf231:'trafilatura 2.3.1',res:'resiliparse (Dolma settings)',justext:'jusText (English stop words)',readability:'readability-lxml',wet:'Common Crawl WET',all:'All visible text (resiliparse, main content off)'};
  const XC={traf111:'var(--c1)',traf231:'var(--c6)',res:'var(--c3)',justext:'var(--c5)',readability:'var(--c4)',wet:'var(--c2)',all:'var(--c2)'};
  // horizontal bars: rows [{name, v, max?, color, ci:[lo,hi], hl, txt}]
  function bars(el,rows,o){o=o||{};const mx=o.max||Math.max(1e-9,...rows.map(r=>r.v||0));
    el.innerHTML=rows.map(r=>{const w=Math.max(0,Math.min(100,100*(r.v||0)/mx));
      const ci=r.ci?'<span class="ci" style="left:'+(100*r.ci[0]/mx)+'%;width:'+Math.max(0.5,100*(r.ci[1]-r.ci[0])/mx)+'%"></span>':'';
      return '<div class="ef-bar'+(r.hl?' hl':'')+'"><div class="nm">'+r.name+'</div><div class="tr"><span class="fl" style="width:'+w+'%;background:'+(r.color||'var(--acc)')+'"></span>'+ci+'</div><div class="v">'+(r.txt!=null?r.txt:n(r.v))+'</div></div>'}).join('')}
  // segmented chips: el contains buttons with data-m; f(value)
  function chips(el,f){if(!el)return;el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!el.contains(b))return;el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));f(b.dataset.m)})}
  // predict-then-reveal: answers keyed by box id
  function pred(id,answer){const box=$(id);if(!box)return;const ans=box.querySelector('.ans');
    box.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
      box.querySelectorAll('.opts button').forEach(x=>{x.classList.remove('right','wrong');if(x.dataset.right)x.classList.add('right')});
      if(!b.dataset.right)b.classList.add('wrong');ans.hidden=false;ans.innerHTML=(b.dataset.right?'<b>Right.</b> ':'<b>Not quite.</b> ')+answer}))}
  const stat=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+(d||'')+'</div></div>';
  const onTab=(id,fn)=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER[id]=window.TAB_RENDER[id]||[]).push(fn)};
  const store={get(k,d){try{const v=localStorage.getItem('ef-'+k);return v==null?d:v}catch(e){return d}},set(k,v){try{localStorage.setItem('ef-'+k,v)}catch(e){}}};
  return {esc,n,p,f,$,XN,XC,bars,chips,pred,stat,onTab,store};
})();
