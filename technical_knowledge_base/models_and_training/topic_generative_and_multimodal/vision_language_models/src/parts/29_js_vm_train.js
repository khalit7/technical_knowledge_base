// ---- Reading 6: which part trains in which stage, per published recipe (static diagram; sources in the reference table below it) ----
// t trained, f frozen, l LoRA or DoRA adapters, q not stated in the paper's text, x not part of this stage
(function(){
  const el=document.getElementById('vm-train');if(!el)return;const T=RD.t;
  const R=[
    ['LLaVA-1.5 (2023)',[['stage 1','f','t','f'],['stage 2','f','t','t']]],
    ['BLIP-2 (2023)',[['stage 1','f','t','x'],['stage 2','f','t','f']]],
    ['InternVL 1.5 (2024)',[['stage 1','t','t','f'],['stage 2','t','t','t']]],
    ['Qwen2-VL (2024)',[['stage 1','t','q','f'],['stage 2','t','t','t'],['stage 3','f','q','t']]],
    ['Idefics2 (2024)',[['pretraining','l','t','l'],['instruction','l','t','l']]],
    ['Qwen3-VL (2025)',[['S0','f','t','f'],['S1','t','t','t']]]];
  const ST={t:['var(--acc)','var(--acc)','trained'],f:['var(--soft)','var(--mute)','frozen'],l:['none','var(--c5)','LoRA / DoRA'],q:['none','var(--mute)','not stated'],x:['none','none','not used']};
  function box(x,y,w,h,s,lab){const c=ST[s];let b='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="3" fill="'+c[0]+'" stroke="'+c[1]+'"'+(s==='q'?' stroke-dasharray="3 2"':'')+(s==='l'?' stroke-width="2.5"':'')+'/>';
    const fill=s==='t'?'var(--bg)':'var(--ink)';
    b+=T(x+w/2,y+h/2+4,s==='x'?'':s==='q'?lab+'?':lab,{a:'middle',w:600,fill});return b}
  function draw(){const W=Math.min(RD.width(el),760),wide=W>=600,bw=26,bh=20,cell=3*bw+8+18,nameW=wide?150:0,rowH=wide?44:62;let b='',y=4;
    // legend
    let lx=0;[['t','trained'],['f','frozen'],['l','LoRA / DoRA'],['q','not stated']].forEach(([s,l],i)=>{const w=18+l.length*6.2+14;if(lx+w>W){lx=0;y+=20}b+=box(lx,y,14,14,s,'');b+=T(lx+19,y+11,l);lx+=w});
    y+=26;
    R.forEach(([name,stages])=>{const x0=nameW;
      if(wide)b+=T(0,y+28,name,{w:600});else b+=T(0,y+11,name,{w:600});
      const yy=wide?y:y+18;
      stages.forEach((st,k)=>{const x=x0+k*cell;b+=T(x,yy+10,st[0],{fill:'var(--mute)'});
        ['E','C','L'].forEach((p,j)=>{b+=box(x+j*(bw+4),yy+16,bw,bh,st[j+1],p)})});
      y+=rowH});
    el.innerHTML=RD.svg(W,y+2,b,'Which parts train in each stage of six VLM recipes: E encoder, C connector, L language model')}
  RD.onRender(draw);RD.onResize(draw);draw();
})();
