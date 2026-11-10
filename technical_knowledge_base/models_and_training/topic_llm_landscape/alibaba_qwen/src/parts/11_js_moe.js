// ---- MoE: micro-batch against global-batch balancing loss, (the expert grids are the 3D stage, 42_js_sc_moe.js) ----
(function(){
  const box=$('lb');if(!box)return;
  const NE=8,doms=['Code','Maths','Web text','Chinese'],cols=['var(--c1)','var(--c2)','var(--c3)','var(--c4)'];
  function f(dom,s){return Array.from({length:NE},(_,i)=>(1-s)/NE+(Math.floor(i/2)===dom?s/2:0))}
  function draw(){
    const s=+$('lbS').value/100;$('lbSv').textContent=Math.round(s*100)+'%';
    const W=640,rh=26,top=22,lw=96,cw=(W-lw-150)/NE,H=top+rh*5+18;
    let g='';for(let i=0;i<NE;i++)g+='<text x="'+(lw+i*cw+cw/2)+'" y="14" font-size="10.5" text-anchor="middle" fill="var(--mute)">E'+(i+1)+'</text>';
    g+='<text x="'+(W-140)+'" y="14" font-size="10.5" fill="var(--mute)">LBL of this micro-batch</text>';
    let mic=0;const all=Array(NE).fill(0);
    doms.forEach((d,j)=>{const fr=f(j,s),y=top+j*rh;g+='<text x="0" y="'+(y+15)+'" font-size="11.5">'+d+'</text>';
      fr.forEach((v,i)=>{const h=Math.max(1,(rh-6)*v/0.5+ (v>0?0:0));g+='<rect x="'+(lw+i*cw+2)+'" y="'+(y+rh-4-h)+'" width="'+(cw-4)+'" height="'+h.toFixed(1)+'" rx="2" fill="'+cols[j]+'" fill-opacity=".8"><title>'+d+' to expert '+(i+1)+': '+(v*100).toFixed(1)+'% of its tokens</title></rect>';all[i]+=v/4});
      const l=NE*fr.reduce((a,v)=>a+v*v,0);mic+=l/4;g+='<text x="'+(W-140)+'" y="'+(y+15)+'" font-size="11.5">'+l.toFixed(2)+'</text>'});
    const y=top+4*rh+4;g+='<line x1="0" x2="'+W+'" y1="'+(y-2)+'" y2="'+(y-2)+'" stroke="var(--line)"/><text x="0" y="'+(y+15)+'" font-size="11.5" font-weight="600">Global batch</text>';
    all.forEach((v,i)=>{const h=Math.max(1,(rh-6)*v/0.5);g+='<rect x="'+(lw+i*cw+2)+'" y="'+(y+rh-4-h)+'" width="'+(cw-4)+'" height="'+h.toFixed(1)+'" rx="2" fill="var(--mute)"/>'});
    const glob=NE*all.reduce((a,v)=>a+v*v,0);g+='<text x="'+(W-140)+'" y="'+(y+15)+'" font-size="11.5" font-weight="600">'+glob.toFixed(2)+'</text>';
    $('lbGrid').innerHTML='<div class="tw">'+svgEl(W,H,g,'Expert traffic per micro-batch and over the global batch')+'</div>';
    $('lbOut').innerHTML=stat('Micro-batch LBL (averaged)',mic.toFixed(2),'penalises this routing '+(mic).toFixed(1)+'× the minimum')+stat('Global-batch LBL',glob.toFixed(2),'1.00 is perfectly balanced')+stat('What the paper measured','≈0.1 PPL, ≈2 points','better with global-batch balance, under 3% latency');
  }
  $('lbS').addEventListener('input',draw);draw();
})();
