// ---- Reading section 9: Moshi's per-frame layout, 17 tokens per 80 ms step (static diagram drawn at the measured width) ----
(function(){
  const el=document.getElementById('nm-sp-grid');if(!el)return;
  function draw(){
    const w=RD.width(el),narrow=w<520,lw=narrow?96:150,F=6,top=30,rh=12,gap=1;
    const cw=Math.floor((w-lw-8)/F);
    const rows=[{g:'t',lab:'text'}];
    for(let k=1;k<=8;k++)rows.push({g:'m',k});
    for(let k=1;k<=8;k++)rows.push({g:'u',k});
    const yOf=i=>top+i*(rh+gap)+(i>=1?6:0)+(i>=9?6:0);
    let s='';
    for(let f=0;f<F;f++){const x=lw+f*cw;
      s+=RD.t(x+cw/2,12,narrow?String(f+1):'step '+(f+1),{a:'middle',fs:11})+RD.t(x+cw/2,25,(f*80)+' ms',{a:'middle',fs:11,fill:'var(--mute)'});
      s+='<rect x="'+(x+1)+'" y="'+(top-3)+'" width="'+(cw-2)+'" height="'+(yOf(16)+rh+3-(top-3))+'" fill="none" stroke="var(--line)" rx="3"/>'}
    rows.forEach((r,i)=>{const y=yOf(i);
      for(let f=0;f<F;f++){const x=lw+f*cw+4,ww=cw-8;
        let fill,op=1,dash='';
        if(r.g==='t'){fill='var(--c5)'}
        else if(r.g==='m'){fill='var(--c3)';op=r.k===1?1:.55;if(r.k>1&&f===0){fill='none';dash=' stroke="var(--c3)" stroke-dasharray="3 2"'}}
        else{fill='var(--c1)';op=.45}
        s+='<rect x="'+x+'" y="'+y+'" width="'+ww+'" height="'+rh+'" rx="2" fill="'+fill+'" fill-opacity="'+op+'"'+dash+'></rect>'}
    });
    const lab=(y,t)=>RD.t(lw-6,y,t,{a:'end',fs:11});
    s+=lab(yOf(0)+10,narrow?'text':'text (inner monologue)');
    s+=lab(yOf(1)+10,narrow?'Moshi cb 1':'Moshi, codebook 1')+lab(yOf(5)+4,narrow?'cb 2 to 8':'codebooks 2 to 8')+lab(yOf(5)+17,narrow?'(1 frame late)':'(one frame late)');
    s+=lab(yOf(12)+4,narrow?'user, 8 cb':'user, 8 codebooks')+lab(yOf(12)+17,'(input)');
    const H=yOf(16)+rh+8;
    el.innerHTML=RD.svg(w,H,s,'Moshi writes 17 tokens per 80 ms step: text, its own 8 codebooks, and reads the user\'s 8');
  }
  RD.onRender(draw);RD.onResize(draw);draw();
})();
