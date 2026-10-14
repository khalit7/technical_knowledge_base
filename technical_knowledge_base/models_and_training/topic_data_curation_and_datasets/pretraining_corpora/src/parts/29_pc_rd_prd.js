// ---- predict-then-reveal boxes (.pc-prd): pick an option, see whether it was right and the answer ----
document.querySelectorAll('.pc-prd').forEach(box=>{
  const ans=box.querySelector('.ans');
  box.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
    box.querySelectorAll('.opts button').forEach(x=>{x.classList.remove('right','wrong');if(x.dataset.ok==='1')x.classList.add('right')});
    if(b.dataset.ok!=='1')b.classList.add('wrong');
    ans.hidden=false;
    let v=ans.querySelector('.verdict');if(!v){v=document.createElement('span');v.className='verdict';ans.prepend(v)}
    v.textContent=b.dataset.ok==='1'?'Right.':'Not quite.';
  }));
});
