// ---- Reading s5: one H100 SM, 256-thread blocks, registers per thread as the one variable (uses PMOCC from 31_js_plan.js) ----
(function(){
  const fig=document.getElementById('pm-oc-fig');if(!fig||!window.PMOCC)return;
  const cnt=document.getElementById('pm-oc-cnt'),sl=document.getElementById('pm-oc-r'),val=document.getElementById('pm-oc-v'),pre=document.getElementById('pm-oc-pre');
  const O=window.PMOCC,P=window.PM,ARCH='sm_90a',B=256,WPB=8,MAXW=64,RF=65536;
  const ru=(x,y)=>Math.ceil(x/y)*y;
  // preset buttons carry the real ptxas register counts of the three heavy kernels on sm_90a
  pre.querySelectorAll('button').forEach(b=>{const k=b.textContent.split(': ')[1],r=P.occ[ARCH][k];if(r){b.dataset.m=String(r.regs);b.textContent=r.regs+': '+k}});
  const BC=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)','var(--acc)','var(--closed)'];
  function draw(){
    const regs=+sl.value;val.textContent=regs;
    pre.querySelectorAll('button').forEach(b=>b.classList.toggle('on',+b.dataset.m===regs));
    const r=O.blocks(ARCH,regs,0,B,0,1024),n=r.n,warps=n*WPB,occ=warps/MAXW;
    const regPerBlock=ru(regs*32,256)*WPB,used=n*regPerBlock;
    const W=RD.width(fig),T=RD.t;let b='';
    // warp slots: 8 rows (one per block) of 8 warps
    const gw=Math.min(W-8,300),cell=Math.floor((gw-60)/8),gx=56,gy=18;
    b+=T(4,12,'64 warp slots of one SM',{fs:11.5,w:600});
    for(let row=0;row<8;row++){const on=row<n;
      b+=T(gx-6,gy+row*cell+cell*0.68,on?'block '+row:'free',{a:'end',fs:11,fill:on?'var(--ink)':'var(--mute)'});
      for(let w=0;w<8;w++)b+='<rect x="'+(gx+w*cell)+'" y="'+(gy+row*cell)+'" width="'+(cell-3)+'" height="'+(cell-3)+'" rx="2" style="fill:'+(on?BC[row]:'var(--soft)')+';stroke:var(--line);opacity:'+(on?0.9:1)+'"></rect>'}
    const gh=gy+8*cell;
    // register file bar, beside the slots when there is room, otherwise below
    const side=W>=560,rx=side?gx+8*cell+40:4,ry=side?gy:gh+26,rw=side?Math.min(W-rx-8,360):W-12,rh=22;
    b+=T(rx,ry-6,'register file: 65,536 per SM',{fs:11.5,w:600});
    b+='<rect x="'+rx+'" y="'+ry+'" width="'+rw+'" height="'+rh+'" rx="3" style="fill:var(--soft);stroke:var(--line)"></rect>';
    for(let k=0;k<n;k++){const x=rx+rw*k*regPerBlock/RF,w=rw*regPerBlock/RF;
      b+='<rect x="'+x.toFixed(1)+'" y="'+ry+'" width="'+Math.max(1,w-1).toFixed(1)+'" height="'+rh+'" style="fill:'+BC[k]+';opacity:.9"></rect>'}
    b+=T(rx,ry+rh+16,'per block: '+regPerBlock.toLocaleString('en-US')+' = 256 × '+regs+' (per-warp units)',{fs:11,fill:'var(--mute)'});
    const left=RF-used;
    b+=T(rx,ry+rh+32,left>=regPerBlock?'room left: '+left.toLocaleString('en-US'):'left: '+left.toLocaleString('en-US')+', too few for a block',{fs:11,fill:'var(--mute)'});
    const H=Math.max(gh+6,ry+rh+40);
    fig.innerHTML=RD.svg(W,H,b,'One H100 SM: resident 256-thread blocks and register use at '+regs+' registers per thread');
    cnt.innerHTML=RD.stat('Blocks per SM',n,'limited by '+r.lim)+RD.stat('Resident warps',warps+' / '+MAXW)+RD.stat('Occupancy',Math.round(occ*1000)/10+'%','<span style="color:var(--acc)">warps / 64</span>')}
  sl.addEventListener('input',draw);
  RD.seg(pre,m=>{sl.value=m;draw()});
  window.PM_OC=r=>O.blocks(ARCH,r,0,B,0,1024).n; // checked by the page test against P.occ
  RD.onRender(draw);RD.onResize(draw);draw();
})();
