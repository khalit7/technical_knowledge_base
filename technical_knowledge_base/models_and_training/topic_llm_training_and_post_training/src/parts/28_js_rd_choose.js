// ---- Reading, "Choosing a path": chips show one path at a time; the text is static in #rd-chsrc (so search and the ledger see it) ----
(function(){
  const $=id=>document.getElementById(id);
  if(!$('rd-chF')||!$('rd-chsrc'))return;
  const P=[...$('rd-chsrc').querySelectorAll('[data-ch]')];
  $('rd-chF').innerHTML=P.map((d,i)=>'<button data-c="'+i+'"'+(i?'':' class="on"')+'>'+d.querySelector('h4').textContent.split(':')[0]+'</button>').join('');
  function draw(i){$('rd-chF').querySelectorAll('button').forEach(b=>b.classList.toggle('on',+b.dataset.c===i));const d=P[i],h=d.querySelector('h4').textContent;
    $('rd-chD').innerHTML='<h3>'+h.slice(h.indexOf(':')+2).replace(/^./,c=>c.toUpperCase())+'</h3>'+d.querySelector('dl').outerHTML}
  $('rd-chF').addEventListener('click',e=>{const b=e.target.closest('button[data-c]');if(b)draw(+b.dataset.c)});
  draw(0);
  RD.tabLinks($('rd-chD'));
})();
