// ---- PyTorch to JAX page: shared helpers (numbers from window.JC filled into the prose, predict-then-reveal,
// source excerpts, code blocks from recorded data). Every number in a data-k span comes from the recorded runs.
window.PJU=(function(){
  const J=window.PJ, esc=RD.esc;
  // path segments are separated by '.', but keys may contain dots ("jnp.array(1.0)"): match the longest key first
  function get(path){let o=J,rest=path;
    while(rest!==''){if(o==null||typeof o!=='object')return undefined;
      if(Object.prototype.hasOwnProperty.call(o,rest)){o=o[rest];rest='';break}
      const ks=Object.keys(o).sort((a,b)=>b.length-a.length);const k=ks.find(k=>rest.startsWith(k+'.'));
      if(k===undefined)return undefined;o=o[k];rest=rest.slice(k.length+1)}
    return o}
  function sig(v,n){if(typeof v!=='number'||!isFinite(v))return String(v);if(v===0)return '0';const a=Math.abs(v);if(a>=1e4||a<1e-3){const e=v.toExponential(n-1).split('e');return e[0]+'e'+(+e[1])}return (+v.toPrecision(n)).toString()}
  function fmt(v,f){
    if(v===undefined||v===null)return '?';
    if(typeof v==='string'){return f==='raw'||!f?v:v}
    switch(f){
      case 'int':return Math.round(v).toLocaleString('en-US');
      case 'f0':return v.toFixed(0);case 'f1':return v.toFixed(1);case 'f2':return v.toFixed(2);case 'f3':return v.toFixed(3);case 'f4':return v.toFixed(4);
      case 'e1':return v.toExponential(1).replace('e-','e-').replace('e+','e');case 'e2':return v.toExponential(2).replace('e+','e');
      case 's2':return sig(v,2);case 's3':return sig(v,3);
      case 'mb':return (v/1e6).toFixed(1);case 'kb':return (v/1e3).toFixed(1);
      case 'mflop':return (v/1e6).toFixed(2);case 'gflop':return (v/1e9).toFixed(2);
      case 'pct':return (100*v).toFixed(1)+'%';
      default:return String(v);
    }
  }
  function fill(root){(root||document).querySelectorAll('[data-k]').forEach(el=>{el.textContent=fmt(get(el.dataset.k),el.dataset.f)})}
  function codeBlocks(root){(root||document).querySelectorAll('pre[data-code]').forEach(el=>{const v=get(el.dataset.code);el.textContent=v==null?'?':String(v)})}
  function srcBlocks(root){
    const ex={};(J.source.excerpts||[]).forEach(e=>ex[e.id]=e);
    (root||document).querySelectorAll('.pj-srcx[data-id]').forEach(el=>{const e=ex[el.dataset.id];if(!e){el.textContent='?';return}
      el.innerHTML='<details class="pj-src"'+(el.dataset.open?' open':'')+'><summary>'+esc(e.title)+' <span class="f">'+esc(e.file)+':'+e.start+(e.end>e.start?'-'+e.end:'')+'</span></summary>'+
        '<pre class="pj-code">'+esc(e.text)+'</pre><div class="pj-cap">'+esc(e.label)+(J.source.commits[e.repo]&&J.source.commits[e.repo].length===40?' (commit '+J.source.commits[e.repo].slice(0,8)+')':'')+', lines located by pattern in <code>src/runs/read_source.py</code>. <a href="'+e.url+'" target="_blank" rel="noopener noreferrer">Open on GitHub</a></div></details>'})}
  function predicts(root){(root||document).querySelectorAll('.pj-pr').forEach(pr=>{const ans=pr.querySelector('.ans'),right=pr.dataset.ans;
    pr.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{pr.querySelectorAll('.opts button').forEach(x=>{x.classList.remove('right','wrong');if(x.dataset.o===right)x.classList.add('right')});
      if(b.dataset.o!==right)b.classList.add('wrong');ans.hidden=false}))})}
  // a horizontal bar list: rows [{nm, v, txt, c, hl}], max optional
  function bars(el,rows,max){max=max||Math.max(...rows.map(r=>r.v),1e-12);
    el.innerHTML='<div class="bars pjb">'+rows.map(r=>'<div class="row'+(r.hl?' hl':'')+'"><span class="nm" title="'+esc(r.nm)+'">'+esc(r.nm)+'</span><span class="track"><span class="fill" style="width:'+Math.max(.5,100*r.v/max).toFixed(2)+'%;background:'+(r.c||'var(--c1)')+'"></span></span><span class="val">'+esc(r.txt)+'</span></div>').join('')+'</div>'}
  // tab-aware hooks: f runs when the tab is shown (charts measure their width then)
  function onTab(tab,f){(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER[tab]=window.TAB_RENDER[tab]||[]).push(f)}
  function onResize(tab,f){let t=0;addEventListener('resize',()=>{const r=document.getElementById(tab);if(!r||r.hidden)return;clearTimeout(t);t=setTimeout(f,80)})}
  // RD.anim registers its redraw on the Reading tab; for a lab tab, also redraw when that tab opens
  function anim(o,tab){const a=RD.anim(o);if(tab&&tab!=='t-read')onTab(tab,()=>a.redraw());return a}
  return {get,fmt,fill,codeBlocks,srcBlocks,predicts,bars,sig,esc,onTab,onResize,anim};
})();
PJU.fill();PJU.codeBlocks();PJU.srcBlocks();PJU.predicts();
