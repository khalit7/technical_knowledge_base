// ---- Release history: about the data (licence mix by year, the corrections list) ----
(function(){
  const RH=window.RH,R=RH.ROWS,$=id=>document.getElementById(id),n=f=>R.filter(f).length;
  const K=['perm','cond','own','nc','closed'],Y=['2023','2024','2025','2026'],mx=Math.max(...Y.map(y=>n(r=>r.y===y)));
  let s='';
  Y.forEach(y=>{const tot=n(r=>r.y===y),op=n(r=>r.y===y&&r.o),pm=n(r=>r.y===y&&r.lc==='perm');
    s+='<div class="sizebar" style="grid-template-columns:3.2em minmax(0,1fr) 8.6em"><span>'+y+'</span><div style="display:flex;height:20px;width:'+(100*tot/mx)+'%;border-radius:3px;overflow:hidden">';
    K.forEach(k=>{const c=n(r=>r.y===y&&r.lc===k);if(c)s+='<span role="button" tabindex="0" data-y="'+y+'" data-k="'+k+'" title="'+RH.LIC[k]+', '+y+': '+c+'" style="cursor:pointer;flex:'+c+' 0 0;background:'+RH.LICC[k]+';color:var(--bg);font-size:11.5px;display:flex;align-items:center;justify-content:center;opacity:'+(k==='closed'?0.55:0.9)+'">'+c+'</span>'});
    s+='</div><span class="small">'+pm+' of '+op+' open permissive</span></div>'});
  $('licBars').innerHTML=s;$('licLeg').innerHTML=K.map(k=>'<span><i style="background:'+RH.LICC[k]+'"></i>'+RH.LIC[k]+'</span>').join('');
  $('licBars').querySelectorAll('[data-k]').forEach(e=>{const go=()=>{RH.setF({q:'',lab:'',k:[],year:e.dataset.y,w:e.dataset.k==='closed'?'c':e.dataset.k});RH.go('rh-tb')};
    e.addEventListener('click',go);e.addEventListener('keydown',ev=>{if(ev.key==='Enter')go()})});
  $('fixList').innerHTML=R.filter(r=>r.fix).map(r=>'<li><b>'+RH.esc(r.m)+'</b>: '+RH.esc(r.fix)+' '+RH.A(r.fu,'Source')+'</li>').join('');
})();
