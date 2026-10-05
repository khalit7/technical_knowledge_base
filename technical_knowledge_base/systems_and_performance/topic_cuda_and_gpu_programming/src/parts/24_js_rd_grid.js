// ---- Reading 2: launch explorer (grid, blocks, warps, one thread's coordinates) and one warp through a branch, uniform against divergent ----
(function(){
  // launch explorer
  const fig=document.getElementById('rd-gr-fig');if(!fig||!window.RD)return;
  const nI=document.getElementById('rd-gr-n'),bS=document.getElementById('rd-gr-b'),iI=document.getElementById('rd-gr-i');
  function grid(){
    const n=+nI.value,B=+bS.value;iI.max=Math.max(0,n-1);if(+iI.value>n-1)iI.value=n-1;const i=+iI.value;
    document.getElementById('rd-gr-nv').textContent=n;document.getElementById('rd-gr-iv').textContent=i;
    const G=Math.ceil(n/B),wpb=B/32,idle=G*B-n,bi=Math.floor(i/B),ti=i%B,wi=Math.floor(ti/32),ln=ti%32;
    const W=RD.width(fig);let s='';
    // blocks row
    const maxB=Math.min(G,Math.max(4,Math.floor((W-10)/22))),bw=Math.min(40,(W-10)/maxB-2);
    s+=RD.t(0,12,'Grid: '+G+' block'+(G>1?'s':'')+' of '+B+' threads'+(G>maxB?' (first '+(maxB-1)+' and the last shown)':''),{fs:11.5,w:600});
    for(let k=0;k<maxB;k++){const b=(G>maxB&&k===maxB-1)?G-1:k;const x=k*(bw+2);
      const hasI=b===bi,last=b===G-1;
      s+='<rect x="'+x.toFixed(1)+'" y="20" width="'+bw.toFixed(1)+'" height="22" rx="3" fill="'+(hasI?'var(--acc)':'var(--acc2)')+'" stroke="'+(last&&idle?'var(--bad)':'none')+'" stroke-width="1.5"/>';
      if(bw>18)s+=RD.t(x+bw/2,35,b,{a:'middle',fs:9.5,fill:hasI?'var(--bg)':'var(--ink)'});}
    // the selected block's warps, 32 lanes each
    const y0=62,cell=Math.max(3,Math.min(9,(W-60)/32)),rows=Math.min(wpb,8);
    s+=RD.t(0,y0-6,'Block '+bi+': '+wpb+' warp'+(wpb>1?'s':'')+' of 32 threads'+(wpb>rows?' (first '+rows+' shown)':''),{fs:11.5,w:600});
    for(let w=0;w<rows;w++){s+=RD.t(0,y0+w*(cell+3)+cell-1,'w'+w,{fs:9.5,fill:'var(--mute)'});
      for(let l=0;l<32;l++){const g=bi*B+w*32+l,act=g<n,me=g===i;
        s+='<rect x="'+(26+l*cell).toFixed(1)+'" y="'+(y0+w*(cell+3))+'" width="'+(cell-1).toFixed(1)+'" height="'+(cell).toFixed(1)+'" fill="'+(me?'var(--c2)':act?'var(--c1)':'var(--dim)')+'"/>';}}
    const H=y0+rows*(cell+3)+6;
    fig.innerHTML=RD.svg(W,H,s,'Grid of blocks and the warps of one block');
    document.getElementById('rd-gr-out').innerHTML=RD.stat('Blocks (gridDim.x)',G,'ceil('+n+' / '+B+')')+RD.stat('Warps per block',wpb)+
      RD.stat('Idle threads',idle,idle?'masked by if (i &lt; n), all in the last block':'n is a multiple of the block size')+
      RD.stat('Thread '+i,'block '+bi+', thread '+ti,'warp '+wi+', lane '+ln);
  }
  [nI,bS,iI].forEach(e=>e.addEventListener('input',grid));bS.addEventListener('change',grid);
  RD.onRender(grid);RD.onResize(grid);grid();

  // divergence: rows of issued instructions, lanes active or masked
  const dv=document.getElementById('rd-dv-fig');
  const A=['v = expf(v)','v = v * w','v = v + b','v = sqrtf(v)'],Bp=['v = 0.01f * v','v = v * w','v = v - b','v = fabsf(v)'];
  function seq(m){const r=[{l:'load v, test v > 0',mask:'all'}];
    A.forEach(x=>r.push({l:x,mask:'A'}));if(m==='div')Bp.forEach(x=>r.push({l:x,mask:'B'}));r.push({l:'store y (paths rejoin)',mask:'all'});return r}
  let mode='uni',an;
  const capU=['Every lane loads its input and tests the sign. All 32 are positive.','Path A, step 1. All 32 lanes need it, so all 32 do useful work.','Path A, step 2.','Path A, step 3.','Path A, step 4. Nobody needs path B, so the warp skips it entirely: a branch that a whole warp agrees on costs nothing.','The warp stores its results. 6 instructions issued, every lane busy in every one.'];
  const capD=['Every lane loads and tests. Even lanes are positive, odd lanes negative: the warp disagrees.','Path A, step 1: only the 16 even lanes are active; the odd lanes are masked and do nothing.','Path A, step 2: still half the warp idle.','Path A, step 3.','Path A, step 4.','Now path B, step 1, for the 16 odd lanes; the even lanes wait, masked.','Path B, step 2.','Path B, step 3.','Path B, step 4.','The paths rejoin and all 32 lanes store. 10 instructions issued instead of 6; the 8 branch instructions ran at half width.'];
  function dvdraw(i){
    const S=seq(mode),W=RD.width(dv),narrow=W<520,cell=narrow?Math.min(14,(W-2)/32):Math.min(14,(W-150)/32),rh=cell+4,lw=narrow?0:W-32*cell-6;let s='';
    S.forEach((r,k)=>{if(k>i)return;const y=k*rh;
      for(let l=0;l<32;l++){const pos=mode==='uni'||l%2===0;const on=r.mask==='all'||(r.mask==='A'&&pos)||(r.mask==='B'&&!pos);
        s+='<rect x="'+(l*cell).toFixed(1)+'" y="'+y+'" width="'+(cell-1).toFixed(1)+'" height="'+cell+'" fill="'+(on?(r.mask==='B'?'var(--c2)':r.mask==='A'?'var(--c1)':'var(--c3)'):'var(--dim)')+'"'+(k===i?' stroke="var(--ink)" stroke-width=".6"':'')+'/>';}
      if(lw>60)s+=RD.t(32*cell+6,y+cell-1,r.l,{fs:10,fill:'var(--mute)'});});
    dv.innerHTML=RD.svg(W,S.length*rh+2,s,'Instructions issued by one warp');
    const cap=(mode==='uni'?capU:capD)[i];
    document.getElementById('rd-dv-cap').innerHTML='<div class="t">Step '+(i+1)+' of '+S.length+'</div><p>'+cap+'</p>';
    let issued=0,useful=0;S.forEach((r,k)=>{if(k>i)return;issued++;useful+=r.mask==='all'?32:(mode==='uni'?(r.mask==='A'?32:0):16)});
    document.getElementById('rd-dv-cnt').innerHTML=RD.stat('Instructions issued',issued,'warp cycles, one per row')+RD.stat('Useful lane slots',useful+' of '+issued*32)+
      RD.stat('Lane efficiency',(100*useful/(issued*32)).toFixed(0)+'%','what Nsight calls threads per instruction / 32');
  }
  RD.seg(document.getElementById('rd-dv-mode'),m=>{mode=m;an.reset(seq(m).length);an.play()});
  an=RD.anim({card:'rd-dv-card',ctl:'rd-dv-ctl',n:seq('uni').length,draw:dvdraw,ms:1300,label:'Instruction'});
  RD.onResize(()=>an.redraw());

  // predict, then reveal (every .rd-pr on the Reading tab)
  document.querySelectorAll('#t-read .rd-pr').forEach(p=>{const ans=p.querySelector('.ans');
    p.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
      p.querySelectorAll('.opts button').forEach(x=>{x.classList.remove('right','wrong');if(x.dataset.ok)x.classList.add('right')});
      if(!b.dataset.ok)b.classList.add('wrong');ans.hidden=false;}));});
})();
