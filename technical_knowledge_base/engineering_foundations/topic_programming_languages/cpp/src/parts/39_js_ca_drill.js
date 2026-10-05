// ---- Part 1: Predict the output tab. A choice is right when it appears (whitespace collapsed) in the recorded output ----
(function(){
  const norm=s=>s.replace(/\s+/g,' ').trim();
  const lines=s=>s.split('\n').map(norm).filter(Boolean);
  // a choice is right when its lines appear as consecutive whole lines of the output
  const has=(out,ch)=>{for(let i=0;i+ch.length<=out.length;i++)if(ch.every((l,j)=>out[i+j]===l))return true;return false};
  const qs=[...document.querySelectorAll('#t-ca-drill .ca-q')],score=document.getElementById('ca-dr-score');
  let right=0,done=0;
  const upd=()=>{score.textContent=right+' of '+done+(done===qs.length?' (all answered)':'')};
  qs.forEach(q=>{const out=lines(q.querySelector('.ca-ans pre.ca-out').textContent);
    q.querySelectorAll('.ca-ch button').forEach(b=>{b.dataset.ok=has(out,lines(b.textContent))?'1':'0';
      b.addEventListener('click',()=>{if(q.classList.contains('done'))return;q.classList.add('done');done++;
        if(b.dataset.ok==='1'){right++;b.classList.add('right')}else{b.classList.add('wrong');q.querySelectorAll('.ca-ch button[data-ok="1"]').forEach(x=>x.classList.add('right'))}upd()})})});
  document.getElementById('ca-dr-reset').addEventListener('click',()=>{right=0;done=0;qs.forEach(q=>{q.classList.remove('done');q.querySelectorAll('.ca-ch button').forEach(b=>b.classList.remove('right','wrong'))});upd()});
  upd();
})();
