// ---- Wide Reading tables become stacked cards at phone width: copy each column header into its cells' data-l ----
document.querySelectorAll('table.stack').forEach(t=>{
  const h=[...t.querySelectorAll('thead th')].map(th=>th.textContent.trim());
  t.querySelectorAll('tbody tr').forEach(tr=>[...tr.children].forEach((td,i)=>{if(i>0&&h[i])td.setAttribute('data-l',h[i])}));
});
