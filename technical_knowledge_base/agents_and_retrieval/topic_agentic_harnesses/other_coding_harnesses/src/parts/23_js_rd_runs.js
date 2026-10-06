// ---- Reading section 8: every run as a bar (input tokens summed over calls), coloured by outcome; click opens it in the runs tab ----
(function(){
  const D=window.HR_DATA,el=document.getElementById('rd-runbars');if(!D||!el)return;
  const esc=RD.esc,fmt=n=>Number(n).toLocaleString('en-US');
  const mx=Math.max(...D.runs.map(r=>r.totals.in));
  el.innerHTML=D.runs.map(r=>{const ok=r.tests_failed_after===0;const who=/Claude Haiku/.test(r.model)?'Haiku':'local 4B';
    return '<div class="row" data-id="'+esc(r.id)+'" role="button" tabindex="0" style="cursor:pointer"><span class="nm">'+esc(r.harness)+' <span class="ml">'+esc(r.label||'')+', '+who+'</span></span><span class="track"><span class="fill" style="width:'+(100*r.totals.in/mx).toFixed(1)+'%;background:'+(ok?'var(--good)':(r.tests_failed_after===1?'var(--c5)':'var(--bad)'))+'"></span></span><span class="val">'+fmt(r.totals.in)+'<br><span class="small mute">'+r.totals.calls+' calls</span></span></div>'}).join('');
  const go=id=>{const b=document.querySelector('#tabs button[data-t="t-runs"]');if(b)b.click();if(window.HR_SELECT)window.HR_SELECT(id);const h=document.getElementById('hr-h-run');if(h)h.scrollIntoView({block:'start'})};
  el.addEventListener('click',e=>{const row=e.target.closest('.row[data-id]');if(row)go(row.dataset.id)});
  el.addEventListener('keydown',e=>{if(e.key!=='Enter')return;const row=e.target.closest('.row[data-id]');if(row)go(row.dataset.id)});
})();
