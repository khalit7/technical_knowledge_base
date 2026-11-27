// ---- The cost calculator (section 7): Amdahl's law on the share s of an MXFP8 step that the recipe moves to 4 bits, and the
// article's compute-efficiency definition (same loss needs 1 / (1 - c) as many FLOPs). Same formulas as src/recompute.py calc().
(function(){
  if(!window.RD||!document.getElementById('e4-calc'))return;
  const $=id=>document.getElementById(id), t=RD.t;
  const MODE={pre:{sp:1.08,c:0.02},rl:{sp:1.20,c:0}};
  let mode='pre', r=3, s=0;
  const back=()=>(1-1/MODE[mode].sp)/(1-1/r);       // the share that reproduces the article's speedup (by construction)
  const step=x=>1-x+x/r;                              // recipe step time, MXFP8 step = 1
  window.E4CALC={share:(m,rr)=>{const o=[mode,r];mode=m;r=rr;const v=back();[mode,r]=o;return v},step:(x,rr)=>1-x+x/rr};
  function draw(){
    const el=$('e4-calcsvg'),W=RD.width(el),L=8,R=W-8,bw=R-L,bh=26,c=MODE[mode].c;
    const rec=step(s),loss=rec/(1-c);
    const bars=[['MXFP8 step',[[s,'c2','4-bit share'],[1-s,'dim','the rest']]],['the recipe',[[s/r,'c3',''],[1-s,'dim','']]]];
    if(c>0)bars.push(['to MXFP8\'s loss',[[s/r/(1-c),'c3',''],[(1-s)/(1-c),'dim','']]]);
    let y=6,str='';
    bars.forEach(([lab,parts])=>{str+=t(L,y+12,lab,{fs:12,fill:'var(--mute)'});y+=16;let x=L;
      parts.forEach(([v,col,name])=>{const w=Math.max(0,v*bw/1.0);str+='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+bh+'" rx="3" fill="var(--'+col+')"'+(col==='dim'?'':' fill-opacity=".9"')+'/>';
        if(name&&w>70)str+=t(x+6,y+17,name,{fs:12,fill:col==='dim'?'var(--ink)':'var(--bg)',w:600});x+=w});
      const tot=parts.reduce((a,p)=>a+p[0],0);str+=t(Math.min(R,L+tot*bw)-4,y-3,tot.toFixed(3),{fs:12,a:'end',fill:'var(--ink)',w:600});y+=bh+8});
    str+='<line x1="'+R+'" x2="'+R+'" y1="0" y2="'+y+'" stroke="var(--line)" stroke-dasharray="3 3"/>';
    el.innerHTML=RD.svg(W,y+2,str,'Step time of MXFP8 and of the recipe, to scale');
    $('e4-sv').textContent=(100*s).toFixed(1)+'%';
    const o=[RD.stat('step speedup',(1/rec).toFixed(3)+'×',(100*(1-rec)).toFixed(1)+'% less time per step')];
    if(c>0)o.push(RD.stat('time to the same loss',loss.toFixed(3),(100*(1-loss)).toFixed(1)+'% less, after the 2% CE cost'));
    o.push(RD.stat('share that gives the article\'s '+Math.round(100*(MODE[mode].sp-1))+'%',(100*back()).toFixed(1)+'%','at r = '+(r===3?'3 (compute)':'1.83 (weight bytes)')));
    $('e4-out').innerHTML=o.join('');
  }
  function reset(){s=Math.round(back()*1000)/1000;$('e4-s').value=s;draw()}
  RD.seg($('e4-mode'),m=>{mode=m;if(m==='pre'){r=3;$('e4-r').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.m==='3'))}
    $('e4-rbox').style.display=m==='pre'?'none':'';reset()});
  RD.seg($('e4-r'),m=>{r=m==='3'?3:8.25/4.5;reset()});
  $('e4-s').addEventListener('input',e=>{s=+e.target.value;draw()});
  $('e4-rbox').style.display='none';
  s=Math.round(back()*1000)/1000; $('e4-s').value=s;
  RD.onRender(draw); RD.onResize(draw);
})();
