// ---- Reading, the idea: one Llama 3 8B query matrix (4,096 x 4,096), full fine-tuning against LoRA, drawn to scale ----
(function(){
  const $=id=>document.getElementById(id);if(!$('hero'))return;
  const D=4096,NK=D*D;let R=16;
  function draw(){
    const el=$('heroS'),W=RD.width(el),stack=W<600;
    const pw=stack?W:Math.floor(W*0.36),lw=stack?W:W-pw-16;
    const s1=Math.max(90,Math.min(170,pw-20));
    const s2=Math.max(90,Math.min(170,(lw-60)/2.15));
    const bw=Math.max(1.5,R/D*s2),ah=Math.max(1.5,R/D*s2);
    const h1=s1+52,h2=Math.max(s2+30,ah+110),H=stack?h1+h2+10:Math.max(h1,h2);
    const ox2=stack?0:pw+16,oy2=stack?h1+10:0;
    let h='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Full fine-tuning trains the whole matrix; LoRA adds two thin matrices beside the frozen one">';
    // full fine-tuning
    h+='<text x="2" y="13" font-weight="600" fill="var(--ink)">Full fine-tuning</text>';
    h+='<rect x="2" y="22" width="'+s1+'" height="'+s1+'" fill="var(--c2)" fill-opacity=".55" stroke="var(--c2)"/>';
    h+='<text x="'+(2+s1/2)+'" y="'+(22+s1/2-4)+'" text-anchor="middle" fill="var(--ink)">W, 4,096 × 4,096</text><text x="'+(2+s1/2)+'" y="'+(22+s1/2+12)+'" text-anchor="middle" fill="var(--ink)">all trained</text>';
    h+='<text x="2" y="'+(22+s1+16)+'" fill="var(--mute)">16 B per number</text>';
    // LoRA
    const x0=ox2+2,y0=oy2+22;
    h+='<text x="'+x0+'" y="'+(oy2+13)+'" font-weight="600" fill="var(--acc)">LoRA, r = '+R+'</text>';
    h+='<rect x="'+x0+'" y="'+y0+'" width="'+s2+'" height="'+s2+'" fill="var(--soft)" stroke="var(--line)"/>';
    h+='<text x="'+(x0+s2/2)+'" y="'+(y0+s2/2-4)+'" text-anchor="middle" fill="var(--mute)">W₀ frozen</text><text x="'+(x0+s2/2)+'" y="'+(y0+s2/2+12)+'" text-anchor="middle" fill="var(--mute)">2 B per number</text>';
    const px=x0+s2+8;h+='<text x="'+px+'" y="'+(y0+s2/2+4)+'" fill="var(--mute)">+</text>';
    const bx=px+16;h+='<rect x="'+bx+'" y="'+y0+'" width="'+bw+'" height="'+s2+'" fill="var(--acc)"/>';
    const ax=bx+bw+6;h+='<rect x="'+ax+'" y="'+y0+'" width="'+s2+'" height="'+ah+'" fill="var(--acc)"/>';
    const tl=(i,t,c)=>'<text x="'+(ax+4)+'" y="'+(y0+ah+14+16*i)+'" fill="'+(c||'var(--acc)')+'">'+t+'</text>';
    h+=tl(0,'A: '+R+' × 4,096, random')+tl(1,'B: 4,096 × '+R+', starts at 0')+tl(2,'trained, 16 B each')+tl(3,'ΔW = (α/r)·BA','var(--mute)')+tl(4,'rank ≤ '+R,'var(--mute)');
    el.innerHTML=h+'</svg>';
    const tr=2*R*D,st=NK*2+tr*16;
    $('heroN').innerHTML=RD.stat('Trained numbers',PF.comma(tr),(100*tr/NK).toFixed(R<4?3:2)+'% of '+PF.comma(NK))+
      RD.stat('Training state, this matrix',PF.bytes(st),'against '+PF.bytes(NK*16)+' for full fine-tuning')+
      RD.stat('File per task (bf16)',PF.bytes(tr*2),'against '+PF.bytes(NK*2)+' for the matrix');
  }
  $('heroR').addEventListener('click',e=>{const b=e.target.closest('button[data-m]');if(!b)return;R=+b.dataset.m;
    $('heroR').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));draw()});
  RD.onRender(draw);RD.onResize(draw);draw();
})();
