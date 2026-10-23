// ---- Reading section 4: which K tiles a causal attention program visits (static diagram, n_b = 8, illustrative) ----
(function(){
  const box=document.getElementById('rd-causal-svg');if(!box)return;
  const NB=8,t=RD.t;
  function draw(){
    const W=Math.min(640,RD.width(box)),wide=W>=480,L=22,Tp=26,cs=Math.floor(Math.min(30,((wide?W*0.55:W)-L-4)/NB)),gw=cs*NB;
    let g=t(L,12,'K and V tiles →',{fs:11,fill:'var(--mute)'});
    g+='<text x="12" y="'+(Tp+gw/2)+'" font-size="11" fill="var(--mute)" text-anchor="middle" transform="rotate(-90 12 '+(Tp+gw/2)+')">query tiles (one program each)</text>';
    let n=[0,0,0];
    for(let i=0;i<NB;i++)for(let j=0;j<NB;j++){const x=L+j*cs,y=Tp+i*cs,k=j<i?0:(j===i?1:2);n[k]++;
      g+='<rect x="'+(x+1)+'" y="'+(y+1)+'" width="'+(cs-2)+'" height="'+(cs-2)+'" rx="2" '+(k===0?'fill="var(--c1)" fill-opacity="0.75"':k===1?'fill="var(--acc)" fill-opacity="0.85"':'fill="none" stroke="var(--line)" stroke-dasharray="3 2"')+'/>'}
    const lx=wide?L+gw+18:L,ly=wide?Tp+8:Tp+gw+14,sw=(c,dash)=>'<rect width="12" height="12" rx="2" '+(dash?'fill="none" stroke="var(--line)" stroke-dasharray="3 2"':'fill="'+c+'"')+'/>';
    const items=[[sw('var(--c1)'),'visited, no mask: '+n[0]],[sw('var(--acc)'),'diagonal, tl.where mask: '+n[1]],[sw('',1),'skipped by the loop bound: '+n[2]]];
    items.forEach((it,k)=>{const y=ly+k*20;g+='<g transform="translate('+lx+','+y+')">'+it[0]+'</g>'+t(lx+18,y+10,it[1],{fs:11})});
    const ty=ly+3*20+8;g+=t(lx,ty,'visited: '+(n[0]+n[1])+' of '+NB*NB,{fs:11.5,w:600});
    const H=Math.max(Tp+gw+4,ty+6);
    box.innerHTML=RD.svg(W,H,g,'Causal attention tile grid: tiles below the diagonal visited, diagonal masked, above skipped');
  }
  draw();RD.onRender(draw);RD.onResize(draw);
})();
