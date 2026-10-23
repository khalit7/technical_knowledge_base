// ---- Reading: ZeRO stages against the data-parallel degree (7.5B parameters; ZeRO §3.1 and Table 1), and the page's predict-then-reveal blocks ----
window.DTZ=(function(){
  // bytes per parameter per GPU [weights, gradients, optimiser state] for a stage at n data-parallel GPUs (2 + 2 + 12 recipe)
  function stage(z,n){return [z>=3?2/n:2,z>=2?2/n:2,z>=1?12/n:12]}
  return {stage,P:7.5e9};
})();
(function(){
  const $=id=>document.getElementById(id);
  // predict-then-reveal: any .pr block with buttons data-a="1" for the right answer
  document.querySelectorAll('#t-read .pr').forEach(pr=>{const ans=pr.querySelector('.ans');
    pr.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
      pr.querySelectorAll('.opts button').forEach(x=>{x.classList.toggle('right',x.dataset.a==='1');x.classList.toggle('wrong',x===b&&x.dataset.a!=='1')});
      if(ans)ans.hidden=false}))});
  if(!$('zBars'))return;
  const Z=window.DTZ,GB=1e9,FULL=120,C=['var(--c1)','var(--c5)','var(--c4)'];
  const NAMES=['DP','ZeRO-1','ZeRO-2','ZeRO-3'];
  function draw(){const n=Math.pow(2,+$('zN').value);$('zNv').textContent=n;
    $('zBars').innerHTML=[0,1,2,3].map(z=>{const b=Z.stage(z,n),tot=(b[0]+b[1]+b[2])*Z.P/GB;
      return '<div class="zrow"><span>'+NAMES[z]+'</span><span class="sbar">'+b.map((v,i)=>'<span style="width:'+(100*v*Z.P/GB/FULL).toFixed(2)+'%;background:'+C[i]+'"></span>').join('')+
        '<i class="ln" style="left:'+(100*80/FULL).toFixed(2)+'%"></i></span><span class="v">'+(tot>=10?tot.toFixed(1):tot.toFixed(2))+' GB</span></div>'}).join('')}
  $('zN').addEventListener('input',draw);RD.onRender(draw);draw();
})();
