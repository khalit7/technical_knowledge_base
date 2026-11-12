// ---- Shared helpers for this page (prefix lc): number formats, source-reference links, segmented buttons, predict-then-reveal.
// The Reading animations use the template's RD.anim (2026-11-12: plays once in view, step lists on the left); LCU.anim was removed. ----
window.LCU=(function(){
  const RM=RD.RM, esc=RD.esc;
  const onTab=(tab,f)=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER[tab]=window.TAB_RENDER[tab]||[]).push(f)};
  const MB=b=>b>=1e9?(b/1e9).toFixed(2)+' GB':b>=1e6?(b/1e6).toFixed(1)+' MB':b>=1e3?(b/1e3).toFixed(1)+' KB':Math.round(b)+' B';
  const sci=(x,d)=>{if(x===0)return '0';const e=Math.floor(Math.log10(Math.abs(x)));const m=x/Math.pow(10,e);return m.toFixed(d==null?1:d)+'e'+(e<0?'&minus;'+(-e):e)};
  const num=(x,d)=>Number(x).toLocaleString('en-GB',{maximumFractionDigits:d==null?0:d,minimumFractionDigits:d==null?0:d});
  const GH={maxtext:['https://github.com/AI-Hypercomputer/maxtext/blob/1a95d1e5371021aab8d0574c53d2cca425474318/',''],
            tunix:['https://github.com/google/tunix/blob/ce63a9fd65f02c4c398e74f000f98371c1575eb6/',''],
            levanter:['https://github.com/marin-community/marin/blob/1290cfb5e128214b7225bc7b0e98ac1e0a8044dc/',''],
            levanter_frozen:['https://github.com/marin-community/levanter/blob/982cef7f1d8d1a642b825fcd30ab1b44a912f478/',''],
            root:null};
  // "file:line" for a located source key (runs/lc_source.py), as a link to the pinned commit on GitHub
  function ref(k,short){const r=LC.src[k];if(!r)return '<code>?</code>';const [file,line,repo]=r;
    const shown=(short?file.split('/').pop():file.replace(/^src\/maxtext\//,''))+':'+line;
    if(repo==='root')return '<code>src/data/'+esc(file)+':'+line+'</code>';
    const g=GH[repo];return '<a href="'+g[0]+file+'#L'+line+'" target="_blank" rel="noopener noreferrer"><code>'+esc(shown)+'</code></a>'}
  function fillRefs(root){(root||document).querySelectorAll('code[data-src]').forEach(c=>{const k=c.dataset.src;const span=document.createElement('span');span.innerHTML=ref(k);c.replaceWith(span.firstChild)})}
  function seg(el,f){el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!el.contains(b)||!b.dataset.m)return;el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));f(b.dataset.m)})}
  // predict-then-reveal: el has .opts buttons with data-a and a hidden .ans
  function predict(id,right){const el=document.getElementById(id);if(!el)return;const ans=el.querySelector('.ans');
    el.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{el.querySelectorAll('.opts button').forEach(x=>{x.classList.remove('right','wrong');if(+x.dataset.a===right)x.classList.add('right')});
      if(+b.dataset.a!==right)b.classList.add('wrong');ans.hidden=false}))}
  return {RM,esc,onTab,MB,sci,num,ref,fillRefs,seg,predict,width:RD.width};
})();
