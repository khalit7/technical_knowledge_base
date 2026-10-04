// ---- Reading, section 2: one real exchange, clickable lines ----
(function(){
  const D=window.API_DATA,req=document.getElementById('rd-anat-req'),res=document.getElementById('rd-anat-res'),x=document.getElementById('rd-anat-x');
  function show(k){RAW.render(req,D.ex[k].req,x);RAW.render(res,D.ex[k].res,x);x.textContent='Click a line of the request or response.'}
  RD.seg(document.getElementById('rd-anat-seg'),show);show('create');
})();
