// ---- Reading s7: one real chunk record (data: ING.rec, produced by src/scripts/make_record.py from Docling's output) ----
(function(){const R=window.ING&&ING.rec,el=document.getElementById('ing-rec');if(!R||!el)return;
  const show=Object.assign({},R);show.text=R.text.slice(0,140)+'...';
  el.textContent=JSON.stringify(show,null,1).replace(/\n\s+(?=[\d\-\]])/g,' ');
})();
