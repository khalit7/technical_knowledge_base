// ---- Reading: comparison tables become labelled cards at phone width (each cell carries its column name) ----
(function(){document.querySelectorAll('#t-read table.map').forEach(t=>{const h=[...t.querySelectorAll('thead th')].map(th=>th.textContent);
  t.querySelectorAll('tbody tr').forEach(tr=>[...tr.children].forEach((td,i)=>td.setAttribute('data-l',h[i]||'')))})})();
