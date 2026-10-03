// ---- Reading, LoRA on one real matrix: SmolLM2-135M layer 14 q_proj, full fine-tuning's real update against the best rank-r one ----
window.PF=(function(){
  // colour helpers shared by the page's canvases and SVGs
  const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const rgb=h=>{h=h.replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');const n=parseInt(h,16);return[(n>>16)&255,(n>>8)&255,n&255]};
  const mix=(a,b,t)=>[0,1,2].map(i=>Math.round(a[i]+(b[i]-a[i])*t));
  const fmt=n=>{const a=Math.abs(n);return a>=1e9?(n/1e9).toFixed(a>=1e10?1:2)+'B':a>=1e6?(n/1e6).toFixed(a>=1e7?1:2)+'M':a>=1e4?(n/1e3).toFixed(1)+'K':Math.round(n).toLocaleString('en-US')};
  const bytes=n=>n>=1e9?(n/1e9).toFixed(2)+' GB':n>=1e6?(n/1e6).toFixed(n>=1e7?1:2)+' MB':n>=1e3?(n/1e3).toFixed(n>=1e4?0:1)+' KB':Math.round(n)+' B';
  const comma=n=>Math.round(n).toLocaleString('en-US');
  return {css,rgb,mix,fmt,bytes,comma};
})();
(function(){
  const $=id=>document.getElementById(id);if(!$('mx'))return;
  const D=PF_DATA.show,C=D.crop,N=D.shape[0],K=D.shape[1],NK=N*K;
  const dec=(b,s)=>{const t=atob(b),a=new Float32Array(t.length);for(let i=0;i<t.length;i++){let v=t.charCodeAt(i);if(v>127)v-=256;a[i]=v/127*s}return a};
  const W0=dec(D.W0,D.amW),dW=dec(D.dW,D.amD),AP={};for(const r in D.approx)AP[r]=dec(D.approx[r],D.amD);
  const E=D.E;const r90=E.findIndex(v=>v>=0.9)+1;
  $('mxSc').textContent=(D.amW/D.amD).toFixed(0);
  let mode='lora',R=16;
  function paint(cv,arr,scale,show){
    const ctx=cv.getContext('2d'),img=ctx.createImageData(C,C);
    const bg=PF.rgb(PF.css('--bg')),p=PF.rgb(PF.css('--c1')),n=PF.rgb(PF.css('--c2'));
    for(let i=0;i<C*C;i++){const v=show&&arr?arr[i]/scale:0;const t=Math.min(1,Math.abs(v)/0.55);const c=PF.mix(bg,v>=0?p:n,t);
      img.data[4*i]=c[0];img.data[4*i+1]=c[1];img.data[4*i+2]=c[2];img.data[4*i+3]=255}
    ctx.putImageData(img,0,0)}
  const sum=(a,b)=>{const o=new Float32Array(a.length);for(let i=0;i<a.length;i++)o[i]=a[i]+b[i];return o};
  function ba(step){
    const el=$('mxBA'),W=RD.width(el),s=Math.max(60,Math.min(110,(W-120)/2.4));
    const f=s/N,bw=Math.max(1.5,R*f),ah=Math.max(1.5,R*f),y0=16;
    const ink='var(--ink)',mu='var(--mute)';
    let h='<svg viewBox="0 0 '+W+' '+(s+34)+'" width="'+W+'" height="'+(s+34)+'" role="img" aria-label="The frozen matrix and the two LoRA matrices, drawn to scale">';
    h+='<rect x="2" y="'+y0+'" width="'+s+'" height="'+s+'" fill="var(--soft)" stroke="var(--line)"/><text x="2" y="12" fill="'+mu+'">W₀  576 × 576, frozen</text>';
    if(mode==='full'){
      h+='<rect x="2" y="'+y0+'" width="'+s+'" height="'+s+'" fill="var(--c2)" opacity="'+(step>=1?.35:0)+'"/>';
      h+='<text x="'+(s+14)+'" y="'+(y0+s/2-6)+'" fill="'+ink+'">every one of the '+PF.comma(NK)+' numbers</text><text x="'+(s+14)+'" y="'+(y0+s/2+10)+'" fill="'+ink+'">'+(step>=1?'is trained: gradient and Adam state for each':'can be trained')+'</text>';
    }else{
      const op=step>=1?(step>=4?.25:1):.15,x1=s+34;
      h+='<text x="'+(s+10)+'" y="'+(y0+s/2+4)+'" fill="'+mu+'">+</text>';
      h+='<text x="'+(x1-4)+'" y="'+(y0+s/2+4)+'" text-anchor="end" fill="'+(step===2?'var(--acc)':mu)+'" font-weight="'+(step===2?600:400)+'">α/r</text>';
      const bx=x1+2;h+='<g opacity="'+op+'"><rect x="'+bx+'" y="'+y0+'" width="'+bw+'" height="'+s+'" fill="'+(step>=3?'var(--c3)':'var(--bg)')+'" stroke="var(--c3)" stroke-width="1"/>';
      const ax=bx+bw+8;h+='<rect x="'+ax+'" y="'+y0+'" width="'+s+'" height="'+ah+'" fill="var(--c4)" stroke="var(--c4)"/>';
      h+='<text x="'+(bx+bw/2)+'" y="'+(y0+s+14)+'" text-anchor="middle" fill="'+mu+'">B</text><text x="'+(ax+s/2)+'" y="'+(y0+ah+14)+'" text-anchor="middle" fill="'+mu+'">A  '+R+' × 576'+(step>=1?(step>=3?', trained':', random'):'')+'</text>';
      h+='<text x="'+(bx+bw+4)+'" y="'+(y0+s-4)+'" fill="'+mu+'">B  576 × '+R+(step>=1?(step>=3?', trained':', all zeros'):'')+'</text></g>';
      if(step>=4)h+='<text x="'+(ax+s/2)+'" y="'+(y0+s/2+20)+'" text-anchor="middle" fill="var(--good)" font-weight="600">folded into W</text>';
    }
    el.innerHTML=h+'</svg>';
  }
  function spec(step){
    const el=$('mxS'),W=RD.width(el),H=150,l=34,r=10,t=10,b=28,pw=W-l-r,ph=H-t-b;
    const X=k=>l+pw*k/K,Y=v=>t+ph*(1-v);
    let h='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Share of the real update held by its best rank-r approximation">';
    [0,.5,.9,1].forEach(v=>{h+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/><text x="'+(l-4)+'" y="'+(Y(v)+4)+'" text-anchor="end" font-size="10.5" fill="var(--mute)">'+Math.round(v*100)+'%</text>'});
    [0,100,200,300,400,500,576].forEach(k=>{h+='<text x="'+X(k)+'" y="'+(H-12)+'" text-anchor="middle" font-size="10.5" fill="var(--mute)">'+k+'</text>'});
    h+='<text x="'+(l+pw/2)+'" y="'+(H-1)+'" text-anchor="middle" font-size="10.5" fill="var(--mute)">rank r of the approximation (576 = the whole update)</text>';
    let p='M'+X(0)+','+Y(0);E.forEach((v,i)=>{p+='L'+X(i+1).toFixed(1)+','+Y(v).toFixed(1)});
    h+='<path d="'+p+'" fill="none" stroke="var(--c2)" stroke-width="2"/>';
    h+='<line x1="'+X(r90)+'" x2="'+X(r90)+'" y1="'+t+'" y2="'+Y(0)+'" stroke="var(--mute)" stroke-dasharray="3 3"/><text x="'+(X(r90)+4)+'" y="'+(Y(.9)+14)+'" font-size="10.5" fill="var(--mute)">90% needs r = '+r90+'</text>';
    const hl=mode==='lora'?step>=3:step>=3;
    h+='<line x1="'+X(R)+'" x2="'+X(R)+'" y1="'+t+'" y2="'+Y(0)+'" stroke="var(--acc)" stroke-width="'+(hl?2:1)+'"/><circle cx="'+X(R)+'" cy="'+Y(E[R-1])+'" r="4" fill="var(--acc)"/>';
    const lx=X(R)+6,anchor=lx>W-120?'end':'start';
    h+='<text x="'+(anchor==='end'?X(R)-6:lx)+'" y="'+(Y(E[R-1])-6)+'" text-anchor="'+anchor+'" font-size="11" fill="var(--acc)" font-weight="600">r = '+R+': '+(E[R-1]*100).toFixed(0)+'%</text>';
    el.innerHTML=h+'</svg><div class="small mute">Share of the real update\'s squared size (sum of squared singular values) held by its best rank-r approximation. The first singular value is '+D.sv[0].toFixed(2)+', against '+D.sv0[0].toFixed(1)+' for W₀ itself.</div>';
  }
  const CAP={
    lora:[
      ['The frozen matrix','The query projection of layer 14, 576 × 576 = '+PF.comma(NK)+' numbers. LoRA never changes it: no gradient, no optimizer state, 2 bytes each in bf16.'],
      ['Add B and A; B starts at zero','A is random and B is all zeros, so ΔW = BA = 0 and W = W₀ exactly: at step 0 the model is the base model. Only R × (576 + 576) numbers are new.'],
      ['Scale by α/r','The product is multiplied by α/r (PEFT default α = 8, r = 8; LoRA Without Regret used α = 32). The scale keeps the best learning rate roughly fixed as r changes; rsLoRA divides by √r instead.'],
      ['Train: ΔW grows in only r directions','After training, ΔW = (α/r)BA has rank at most r. Shown here: the closest rank-R matrix to the update full fine-tuning actually made. It holds SHARE of that update\'s squared size; the rest lies in directions LoRA cannot reach at this rank.'],
      ['Merge for serving','W = W₀ + (α/r)BA is one ordinary 576 × 576 matrix again: no extra work per token. Subtract the product to get the base back, or keep B and A separate to swap tasks.']],
    full:[
      ['The same matrix, all of it trainable','Full fine-tuning trains every one of the '+PF.comma(NK)+' numbers.'],
      ['Every entry gets a gradient and Adam state','Weight, gradient, fp32 master copy and two Adam moments: about 16 bytes per number, 8 times the frozen 2. This is the memory PEFT saves.'],
      ['The real update, after SFT and DPO','ΔW is the Instruct checkpoint minus the base, at its own colour scale: its size is '+(D.rel*100).toFixed(1)+'% of W₀\'s, too small to see in the W panel at W₀\'s scale.'],
      ['It is not low-rank','Its singular values fall off slowly (chart below): 90% of its squared size needs rank '+r90+' of 576. A rank-R LoRA could hold at most SHARE of it. Full fine-tuning had no reason to keep it low-rank; this does not mean the task needs all of it.'],
      ['Ship a whole new matrix','Each task is a full copy: '+PF.bytes(NK*2)+' for this matrix, 269 MB for the whole 135M model in bf16, against kilobytes for an adapter.']]};
  function draw(i){
    const lo=mode==='lora',st=Math.min(i,4);
    const sh=(E[R-1]*100).toFixed(0)+'%';
    const c=CAP[mode][st];$('mxCap').innerHTML='<div class="t">Step '+(st+1)+' of 5: '+c[0]+'</div>'+c[1].replace(/\bR\b/g,R).replace('SHARE',sh);
    const upd=lo?(st>=3?AP[R]:null):(st>=2?dW:null);
    paint($('mxC0'),W0,D.amW,true);
    paint($('mxC1'),upd,D.amD,!!upd);
    paint($('mxC2'),upd?sum(W0,upd):W0,D.amW,true);
    $('mxH1').innerHTML='ΔW<small>'+(lo?(st>=3?'best rank-'+R+' update':'= BA = 0'):(st>=2?'real full fine-tune update':'not trained yet'))+'</small>';
    $('mxH2').innerHTML='W<small>'+(lo&&st>=4?'merged: W₀ + ΔW':'= W₀ + ΔW')+'</small>';
    $('mxC1').style.opacity=upd?1:.5;
    const tr=lo?(st>=1?2*R*N:0):NK;
    const state=lo?NK*2+tr*16:(st>=1?NK*16:NK*2);
    const rank=lo?(st>=3?R:0):(st>=2?K:0);
    const held=lo?(st>=3?sh:'none yet'):(st>=2?'100%':'none yet');
    const ship=lo?2*R*N*2:NK*2;
    const extra=lo?(st>=1&&st<4?2*R*N:0):0;
    $('mxN').innerHTML=RD.stat('Trainable numbers',PF.comma(tr),lo?'2 × '+R+' × 576':'576 × 576')+
      RD.stat('Training state for this matrix',PF.bytes(state),lo?'2 B frozen + 16 B per trained number':'16 B per number')+
      RD.stat('Rank of ΔW',rank,'at most '+(lo?R:K))+
      RD.stat('Share of the real update',held,lo?'best possible at rank '+R:'by definition')+
      RD.stat('To ship per task',PF.bytes(ship),lo?'B and A in bf16':'the whole matrix in bf16')+
      RD.stat('Extra multiply-adds per token',PF.comma(extra),lo?(st>=4?'merged away':'x·A then ·B, unmerged'):'none');
    ba(st);spec(st);
  }
  const A=RD.anim({card:'mx',ctl:'mxCtl',n:5,draw,ms:2600,label:'Step of the matrix animation'});
  $('mxM').addEventListener('click',e=>{const b=e.target.closest('button[data-m]');if(!b)return;mode=b.dataset.m;
    $('mxM').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));A.reset(5);A.play()});
  $('mxR').addEventListener('change',e=>{R=+e.target.value;A.redraw()});
  addEventListener('resize',()=>A.redraw());
  if(window.matchMedia)matchMedia('(prefers-color-scheme: dark)').addEventListener&&matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>A.redraw());
})();
