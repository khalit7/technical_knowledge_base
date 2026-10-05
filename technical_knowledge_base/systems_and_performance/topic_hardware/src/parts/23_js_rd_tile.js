// ---- Reading 1: one 64x64x64 matmul tile on a CPU core, a GPU core, an H100 SM's CUDA cores and its tensor cores ----
(function(){
  const box=document.getElementById('rd-tile-svg');if(!box||!window.RDH)return;
  const T=RDH.tile,U={};T.units.forEach(u=>U[u.id]=u);
  const short={cpu:['CPU core (M1 Pro)','16 FMA/cycle, 3.2 GHz'],m1g:['GPU core (M1 Pro)','128 FMA/cycle, 1.296 GHz'],
    h100c:['H100 SM, CUDA cores','128 FMA/cycle, 1.83 GHz'],h100t:['H100 SM, tensor cores','2,048 FMA/cycle, 1.83 GHz']};
  const col={cpu:'var(--c2)',m1g:'var(--c1)',h100c:'var(--c4)',h100t:'var(--c3)'};
  const modes={all:['cpu','m1g','h100c','h100t'],cpu:['cpu','m1g'],sm:['h100c','h100t']};
  let mode='all',steps=[];
  const fmt=n=>Math.round(n).toLocaleString('en-US');
  function mkSteps(){const ids=modes[mode];const fin=ids.map(i=>U[i].ns).sort((a,b)=>a-b);const mx=fin[fin.length-1];
    let s=[0].concat(fin,[.25*mx,.5*mx,.75*mx]);if(fin[0]<mx/8)s.push(fin[0]/2);
    s=[...new Set(s.map(x=>+x.toFixed(6)))].sort((a,b)=>a-b);steps=s}
  function draw(i){
    const t=steps[i],ids=modes[mode],w=RD.width(box);
    const cols=w>=640?ids.length:2,gap=12,pw=(w-(cols-1)*gap)/cols,g=Math.min(pw-4,ids.length>2&&cols>2?150:170),cell=g/16;
    const rows=Math.ceil(ids.length/cols),ph=g+40,H=rows*(ph+10);
    let b='';
    ids.forEach((id,k)=>{const u=U[id],x0=(k%cols)*(pw+gap),y0=Math.floor(k/cols)*(ph+10);
      const f=Math.min(1,t/u.ns),done=f*256,full=Math.floor(done);
      b+=RD.t(x0,y0+12,short[id][0],{fs:12,w:600})+RD.t(x0,y0+26,short[id][1],{fs:10.5,fill:'var(--mute)'});
      for(let r=0;r<16;r++)for(let c=0;c<16;c++){const j=r*16+c;const op=j<full?1:(j===full?done-full:0);
        b+='<rect x="'+(x0+c*cell).toFixed(1)+'" y="'+(y0+32+r*cell).toFixed(1)+'" width="'+(cell-1).toFixed(1)+'" height="'+(cell-1).toFixed(1)+'" fill="'+(op>0?col[id]:'var(--soft)')+'"'+(op>0&&op<1?' fill-opacity="'+(.25+.6*op).toFixed(2)+'"':'')+' stroke="var(--line)" stroke-width=".5"/>'}
      if(f>=0.9999)b+=RD.t(x0+g/2,y0+32+g/2+4,'done',{a:'middle',fs:13,w:600,fill:'var(--bg)'});
    });
    box.innerHTML=RD.svg(w,H,b,'Progress of one 64 by 64 by 64 matrix multiply tile on each engine at the same moment');
    // caption
    const fin=ids.filter(id=>Math.abs(U[id].ns-t)<1e-6);
    let cap='<div class="t">t = '+fmt(t)+' ns</div>';
    if(i===0)cap+='<p>Every engine starts the same tile: 4,096 outputs, each a dot product of length 64, so 262,144 FMAs. Press play; time runs at the same rate for all of them.</p>';
    else if(fin.length){cap+='<p>'+fin.map(id=>'<b>'+short[id][0]+'</b> finishes: '+fmt(U[id].cycles)+' cycles at '+U[id].ghz+' GHz = '+fmt(U[id].ns)+' ns.').join(' ')+'</p>';
      const id=fin[0];
      if(id==='h100t')cap+='<p>Tensor cores do a small matrix multiply per instruction, so one SM finishes 2,048 FMAs per cycle. This is where the 989.5 TFLOPS of an H100 come from; its ordinary lanes alone give 67 TFLOPS of FP32.</p>';
      else if(id==='h100c')cap+='<p>Same SM, ordinary lanes: 128 FMAs per cycle, 16 times fewer than its tensor cores. A matmul that does not use tensor cores (fp32 without TF32, an odd shape, a hand-written loop) leaves most of the chip idle.</p>';
      else if(id==='m1g')cap+='<p>The M1 Pro GPU core: 128 lanes, 8 times the CPU core per cycle; at less than half the clock it still finishes about 3 times sooner. Measured: 313 GFLOP/s per core against 97.5 for the CPU core.</p>';
      else if(id==='cpu')cap+='<p>The CPU core: 16 FMAs per cycle (4 units &times; 4 lanes). Its transistors went to running one thread fast, not to arithmetic width. Measured 97.5 GFLOP/s, 95% of its 102.4 peak.</p>'}
    else cap+='<p>'+ids.map(id=>short[id][0]+': '+Math.round(100*Math.min(1,t/U[id].ns))+'%').join(' &middot; ')+'</p>';
    document.getElementById('rd-tile-cap').innerHTML=cap;
    document.getElementById('rd-tile-cnt').innerHTML=ids.map(id=>{const u=U[id];const cyc=Math.min(u.cycles,t*u.ghz);
      return RD.stat(short[id][0],fmt(Math.min(1,t/u.ns)*T.fma)+' FMAs',fmt(cyc)+' of '+fmt(u.cycles)+' cycles')}).join('');
  }
  mkSteps();
  const A=RD.anim({card:'rd-tile-card',ctl:'rd-tile-ctl',n:steps.length,draw,ms:1500,label:'Time step'});
  RD.seg(document.getElementById('rd-tile-mode'),m=>{mode=m;mkSteps();A.reset(steps.length)});
  RD.onResize(()=>A.redraw());
})();
