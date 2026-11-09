// ---- this page's additions to the template 21_js_rd_common.js (kept from its earlier controller; the template stays unchanged): onRender and onResize may name a tab,
// tab links written by scripts work anywhere, and number formatters used by its visuals ----
RD.onRender=(f,tab)=>{tab=tab||'t-read';(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER[tab]=window.TAB_RENDER[tab]||[]).push(f)};
RD.onResize=(f,tab)=>{let t=0;addEventListener('resize',()=>{const r=document.getElementById(tab||'t-read');if(!r||r.hidden||r.offsetParent===null)return;clearTimeout(t);t=setTimeout(f,60)})};
document.addEventListener('click',e=>{const a=e.target.closest('a[data-tab]');if(!a||e.defaultPrevented)return;const b=document.querySelector('#tabs button[data-t="'+a.dataset.tab+'"]');if(b){e.preventDefault();b.click();document.getElementById('tabs').scrollIntoView({block:'start'})}});
RD.pct=(v,n)=>(100*v).toFixed(n==null?1:n)+'%';
RD.n=(v,d)=>{const s=(+v).toFixed(d==null?2:d);return /^-0?\.?0*$/.test(s)?s.slice(1):s.replace('-','−')};
