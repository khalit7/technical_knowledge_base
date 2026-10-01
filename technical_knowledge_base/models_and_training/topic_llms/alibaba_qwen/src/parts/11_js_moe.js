// ---- MoE: micro-batch against global-batch balancing loss, and the expert grids ----
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
(function(){
  const box=$('eg');if(!box)return;
  const M={q3:{name:'Qwen3-235B-A22B',E:128,k:8,sh:0,L:94,d:4096,dff:1536,cols:16,tot:235,act:22,src:'config.json: 94 layers, 128 experts, 8 per token, d_model 4,096, expert width 1,536'},
           q38:{name:'Qwen3.8-2.4T-A95B',E:512,k:10,sh:1,L:92,d:8192,dff:2048,cols:32,tot:2400,act:95,src:'config.json: 92 layers, 512 experts plus 1 shared, 10 per token, d_model 8,192, expert width 2,048'}};
  let m='q3',seed=3;
  function draw(){
    const c=M[m],r=mulberry32(seed+(m==='q3'?0:100)),on=new Set();while(on.size<c.k)on.add(Math.floor(r()*c.E));
    // to scale: cell area proportional to one expert's parameters (3 d dff)
    const pe=3*c.d*c.dff,ref=3*8192*2048,side=Math.sqrt(pe/ref)*13,P=side+1.5,W=Math.min(640,32*14.5+40);
    const rows=Math.ceil(c.E/c.cols);let g='';
    for(let i=0;i<c.E;i++){const x=(i%c.cols)*P,y=Math.floor(i/c.cols)*P;g+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+side.toFixed(1)+'" height="'+side.toFixed(1)+'" rx="1" fill="'+(on.has(i)?'var(--acc)':'var(--soft)')+'" stroke="'+(on.has(i)?'var(--acc)':'var(--line)')+'"/>'}
    let H=rows*P;if(c.sh){const x=c.cols*P+10;g+='<rect x="'+x+'" y="0" width="'+side.toFixed(1)+'" height="'+side.toFixed(1)+'" rx="1" fill="var(--good)"/><text x="'+(x+side+5)+'" y="'+(side-1)+'" font-size="11" fill="var(--good)">shared</text>'}
    const Wd=32*(13+1.5)+80; // same viewBox for both layouts, so the two grids share one scale
    $('egGrid').innerHTML='<div style="max-width:'+Math.ceil(Wd*1.2)+'px">'+svgEl(Math.ceil(Wd),Math.ceil(H+2),g,c.name+' experts in one layer, routed ones lit')+'</div>';
    const stored=c.L*(c.E+c.sh)*pe,act=c.L*(c.k+c.sh)*pe;
    $('egOut').innerHTML=stat('Experts this token uses',(c.k+c.sh)+' of '+(c.E+c.sh),((c.k+c.sh)/(c.E+c.sh)*100).toFixed(2)+'% of the layer'+(c.sh?' (routed alone: '+(c.k/c.E*100).toFixed(2)+'%)':''))+
      stat('Parameters per expert','3 × '+fmt(c.d)+' × '+fmt(c.dff),fmt(pe))+
      stat('Expert parameters stored',(stored>=1e12?(stored/1e12).toFixed(3)+'T':(stored/1e9).toFixed(1)+'B'),'L × E × P = '+(stored/(c.tot*1e9)*100).toFixed(0)+'% of the '+(c.tot>=1000?(c.tot/1000)+'T':c.tot+'B')+' headline')+
      stat('Expert parameters active',(act/1e9).toFixed(1)+'B','L × k × P, of the '+c.act+'B active');
  }
  segBind('egM',v=>{m=v;draw()});$('egM').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>$('egM').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b?'true':'false'))));
  $('egR').addEventListener('click',()=>{seed++;draw()});draw();
})();
