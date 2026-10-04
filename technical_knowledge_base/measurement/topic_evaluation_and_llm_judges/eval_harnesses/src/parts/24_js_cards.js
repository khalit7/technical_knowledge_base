// Phone layout for wide tables: label each cell with its column header so rows can stack as cards (CSS in 02_css).
window.HX_CARDS=function(){document.querySelectorAll('table.cards').forEach(t=>{const h=[...t.querySelectorAll('thead th')].map(x=>x.textContent.trim());
  t.querySelectorAll('tbody tr').forEach(r=>[...r.children].forEach((c,i)=>{if(i>0&&h[i])c.setAttribute('data-l',h[i])}))})};
window.HX_CARDS();
