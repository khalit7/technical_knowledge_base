// Reading tab: predict-then-reveal handlers, and the section 8 before/after animation (numbers from
// src/wall/out/examples.json via window.LCF: the Memory wall's own code on Llama 3.1 8B at 131,072 tokens).
(function(){
  document.querySelectorAll('#t-read .pr').forEach(pr=>pr.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
    pr.classList.add('done');pr.querySelectorAll('.opts button').forEach(x=>x.classList.add(x.dataset.ok?'right':'wrong'))})));
  if(!window.LCF||!document.getElementById('lc-dz')||LCF.w_l8_cfg_fit===undefined)return;
  const F=LCF,CAP=80*0.92,W8=16.06;
  const S=[['l8_cfg','As released','Llama 3.1 8B: 32 layers, 8 KV heads of 128, every layer global, bf16 cache. Each 128K request needs as much memory as the whole model.'],
    ['l8_fp8','fp8 cache','Same model, each cached number in one byte instead of two. Free to switch on in vLLM or SGLang; 8 bits were lossless on SmolLM2 here (section 2).'],
    ['l8_mqa','MQA instead','One KV head shared by all 32 query heads: eight times smaller entries, but the model must be retrained or uptrained.'],
    ['l8_lg','5 local : 1 global','Five of every six layers keep only the last 1,024 tokens (Gemma 3\'s layout). Six times smaller, and prefill attention falls from 70% to 28% of the FLOPs. Trained in, not imposed.'],
    ['l8_lg_fp8','Layout and fp8','Both: 41 requests fit, past the 32 asked for.']];
  const el=document.getElementById('lc-dz-svg');
  function draw(i){
    const k=S[i][0],fit=F['w_'+k+'_fit'],seq=F['w_'+k+'_seq'],W=RD.width(el),pad=4,bw=W-2*pad,H=86,X=v=>pad+bw*v/80;
    let g='<rect x="'+X(0)+'" y="18" width="'+(X(80)-X(0))+'" height="40" fill="var(--soft)" stroke="var(--line)"/>';
    g+='<rect x="'+X(0)+'" y="18" width="'+(X(W8)-X(0))+'" height="40" fill="var(--c2)" opacity=".85"/>';
    const n=Math.min(fit,32);for(let j=0;j<fit;j++){const x0=W8+j*seq;g+='<rect x="'+X(x0)+'" y="'+(j<32?18:18)+'" width="'+Math.max(1,X(seq)-X(0)-0.6)+'" height="40" fill="'+(j<32?'var(--acc)':'var(--c3)')+'" opacity=".85"/>'}
    g+='<line x1="'+X(CAP)+'" x2="'+X(CAP)+'" y1="12" y2="64" stroke="var(--bad)" stroke-dasharray="4 3" stroke-width="2"/>';
    g+=RD.t(X(0),12,'weights 16.06 GB',{fs:11})+RD.t(X(80),12,'80 GB',{fs:11,a:'end'})+RD.t(X(CAP),78,'92% usable',{fs:11,a:'end',fill:'var(--bad)'});
    el.innerHTML=RD.svg(W,H,g,'GPU memory with 128K requests');
    document.getElementById('lc-dz-cap').innerHTML='<div class="t">Step '+(i+1)+' of '+S.length+': '+S[i][1]+'</div><p>'+S[i][2]+'</p>';
    document.getElementById('lc-dz-cnt').innerHTML=RD.stat('Cache per request',seq+' GB','128K tokens')+RD.stat('Requests that fit',fit+(fit>=32?' (goal met)':' of 32'),'each blue block is one')+RD.stat('Attention share of prefill',F['w_'+k+'_attn']+'%','FLOPs of one 128K prompt');
  }
  RD.anim({card:'lc-dz',ctl:'lc-dz-ctl',n:S.length,draw,ms:2200,label:'Design step'});
  RD.onResize(()=>draw(0));
})();
