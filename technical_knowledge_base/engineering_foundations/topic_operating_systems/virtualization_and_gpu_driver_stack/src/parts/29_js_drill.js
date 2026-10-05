// ---- Predict-then-reveal drills: click a choice; the right one is marked and the explanation shown ----
document.querySelectorAll('#t-read .drill').forEach(d=>{
  const bs=[...d.querySelectorAll('.ch button')],ans=d.querySelector('.ans');
  bs.forEach(b=>b.addEventListener('click',()=>{
    bs.forEach(x=>{x.classList.remove('right','wrong');if(x.dataset.ok)x.classList.add('right')});
    if(!b.dataset.ok)b.classList.add('wrong');
    ans.hidden=false;ans.innerHTML=ans.innerHTML.replace(/^(<b>[^<]*<\/b> )?/,'<b>'+(b.dataset.ok?'Right.':'Not quite.')+'</b> ');
  }));
});
