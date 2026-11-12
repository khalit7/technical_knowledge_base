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
  // the steps are the start and each engine finishing, so each has its fixed item in the step list on the left (sx-tile-<mode>)
  function mkSteps(){steps=[0].concat(modes[mode].map(i=>U[i].ns).sort((a,b)=>a-b))}
  function draw(i){
    const t=steps[i],ids=modes[mode],w=RD.width(box);
    const cols=w>=640?ids.length:2,gap=12,pw=(w-(cols-1)*gap)/cols,g=Math.min(pw-4,ids.length>2&&cols>2?150:170),cell=g/16;
    const rows=Math.ceil(ids.length/cols),ph=g+40,H=rows*(ph+10);
    let b='';
    ids.forEach((id,k)=>{const u=U[id],x0=(k%cols)*(pw+gap),y0=Math.floor(k/cols)*(ph+10);
      const f=Math.min(1,t/u.ns),done=f*256,full=Math.floor(done);
      b+=RD.t(x0,y0+12,short[id][0],{fs:12,w:600})+RD.t(x0,y0+26,short[id][1],{fs:11,fill:'var(--mute)'});
      for(let r=0;r<16;r++)for(let c=0;c<16;c++){const j=r*16+c;const op=j<full?1:(j===full?done-full:0);
        b+='<rect x="'+(x0+c*cell).toFixed(1)+'" y="'+(y0+32+r*cell).toFixed(1)+'" width="'+(cell-1).toFixed(1)+'" height="'+(cell-1).toFixed(1)+'" fill="'+(op>0?col[id]:'var(--soft)')+'"'+(op>0&&op<1?' fill-opacity="'+(.25+.6*op).toFixed(2)+'"':'')+' stroke="var(--line)" stroke-width=".5"/>'}
      if(f>=0.9999)b+=RD.t(x0+g/2,y0+32+g/2+4,'done',{a:'middle',fs:13,w:600,fill:'var(--bg)'});
    });
    box.innerHTML=RD.svg(w,H,b,'Progress of one 64 by 64 by 64 matrix multiply tile on each engine at the same moment');
    document.getElementById('rd-tile-cnt').innerHTML=RD.stat('Time','t = '+fmt(t)+' ns','the same for every engine')+ids.map(id=>{const u=U[id];const cyc=Math.min(u.cycles,t*u.ghz);
      return RD.stat(short[id][0],fmt(Math.min(1,t/u.ns)*T.fma)+' FMAs',fmt(cyc)+' of '+fmt(u.cycles)+' cycles')}).join('');
  }
  mkSteps();
  const A=RD.anim({card:'rd-tile-card',ctl:'rd-tile-ctl',n:steps.length,draw,ms:4200,label:'Time step',list:'sx-tile-all'});
  RD.seg(document.getElementById('rd-tile-mode'),m=>{mode=m;mkSteps();['all','cpu','sm'].forEach(k=>{document.getElementById('sx-tile-'+k).hidden=k!==m});A.reset(steps.length,'sx-tile-'+m)});
  RD.onResize(()=>A.redraw());
})();
