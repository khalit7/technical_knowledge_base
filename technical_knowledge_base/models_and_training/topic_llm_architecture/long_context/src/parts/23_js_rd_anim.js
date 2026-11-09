// Reading tab: predict-then-reveal handlers, and the section 9 design stepper (RD.anim, its steps explained in the list sx-dz) 
// (numbers from src/wall/out/examples.json via window.LCF: the Memory wall's own code on Llama 3.1 8B at 131,072 tokens).
(function(){
  document.querySelectorAll('#t-read .pr').forEach(pr=>pr.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
    pr.classList.add('done');pr.querySelectorAll('.opts button').forEach(x=>x.classList.add(x.dataset.ok?'right':'wrong'))})));
  if(!window.LCF||!document.getElementById('lc-dz')||LCF.w_l8_cfg_fit===undefined)return;
  const F=LCF,CAP=80*0.92,W8=16.06;
  // the five designs, in the order of the step list sx-dz (whose items explain each step)
  const S=[['l8_cfg'],['l8_fp8'],['l8_mqa'],['l8_lg'],['l8_lg_fp8']];
  const el=document.getElementById('lc-dz-svg');
  function draw(i){
    const k=S[i][0],fit=F['w_'+k+'_fit'],seq=F['w_'+k+'_seq'],W=RD.width(el),pad=4,bw=W-2*pad,H=86,X=v=>pad+bw*v/80;
    let g='<rect x="'+X(0)+'" y="18" width="'+(X(80)-X(0))+'" height="40" fill="var(--soft)" stroke="var(--line)"/>';
    g+='<rect x="'+X(0)+'" y="18" width="'+(X(W8)-X(0))+'" height="40" fill="var(--c2)" opacity=".85"/>';
    const n=Math.min(fit,32);for(let j=0;j<fit;j++){const x0=W8+j*seq;g+='<rect x="'+X(x0)+'" y="'+(j<32?18:18)+'" width="'+Math.max(1,X(seq)-X(0)-0.6)+'" height="40" fill="'+(j<32?'var(--acc)':'var(--c3)')+'" opacity=".85"/>'}
    g+='<line x1="'+X(CAP)+'" x2="'+X(CAP)+'" y1="12" y2="64" stroke="var(--bad)" stroke-dasharray="4 3" stroke-width="2"/>';
    g+=RD.t(X(0),12,'weights 16.06 GB',{fs:11})+RD.t(X(80),12,'80 GB',{fs:11,a:'end'})+RD.t(X(CAP),78,'92% usable',{fs:11,a:'end',fill:'var(--bad)'});
    el.innerHTML=RD.svg(W,H,g,'GPU memory with 128K requests');
    document.getElementById('lc-dz-cnt').innerHTML=RD.stat('Cache per request',seq+' GB','128K tokens')+RD.stat('Requests that fit',fit+(fit>=32?' (goal met)':' of 32'),'each blue block is one')+RD.stat('Attention share of prefill',F['w_'+k+'_attn']+'%','FLOPs of one 128K prompt');
  }
  const an=RD.anim({card:'lc-dz',ctl:'lc-dz-ctl',n:S.length,draw,list:'sx-dz',label:'Design step'});
  RD.onResize(()=>an.redraw());
})();
