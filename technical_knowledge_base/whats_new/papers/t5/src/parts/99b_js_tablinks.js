// ---- This page's two additions to the template tab wiring (99_js_tabs.js stays the template, unchanged) ----
// 1. A link to an element in another tab (data-to) also opens the closed block right after that element (the recount and the checks sit in closed blocks).
// 2. The old "Corrupt a sentence" tab (#t-run) now lives in the Reading tab: such links open Reading at the span-corruption stage.
(function(){
  document.querySelectorAll('a[data-tab][data-to]').forEach(a=>a.addEventListener('click',()=>{const to=document.getElementById(a.dataset.to);if(!to)return;
    let n=to.nextElementSibling;for(let i=0;i<3&&n;i++,n=n.nextElementSibling)if(n.tagName==='DETAILS'){n.open=true;break}}));
  let h='';try{h=decodeURIComponent(location.hash.slice(1))}catch(e){}
  if(h==='t-run'){const b=document.querySelector('#tabs button[data-t="t-read"]');if(b)b.click();const el=document.getElementById('spx-h');if(el)el.scrollIntoView({block:'start'})}
})();
