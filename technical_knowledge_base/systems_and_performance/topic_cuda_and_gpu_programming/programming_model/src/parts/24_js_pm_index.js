// ---- Reading s2: which threads of a 2D block form each warp ----
(function(){
  const fig=document.getElementById('pm-ix-fig');if(!fig)return;
  const cnt=document.getElementById('pm-ix-cnt');
  const COL=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)','var(--acc)','var(--closed)'];
  const S={dx:32,dy:8,sel:null};
  const BX=2,BY=1,COLS=4096; // the block shown is blockIdx (2, 1) of a 4,096-column matrix
  // derived: a warp covers 32 consecutive linear ids; rows touched and 32-byte sectors per warp load
  function warpGeom(dx){const per=Math.min(32,dx),rows=Math.ceil(32/per);return {rows,cols:per,sectors:rows*Math.ceil(per*4/32)}}
  window.PM_IX=warpGeom; // used by the page check
  function draw(){
    const W=RD.width(fig),dx=S.dx,dy=S.dy,rowsShown=Math.min(dy,64);
    const cell=Math.max(4,Math.min(18,Math.floor((W-48)/dx),Math.floor(300/rowsShown)));
    const w=Math.max(Math.min(W,48+dx*cell+4),Math.min(W,380)),h=18+rowsShown*cell+(dy>rowsShown?18:4);
    let b='';
    b+=RD.t(46,12,'x = 0 .. '+(dx-1)+' (columns)',{fs:10.5,fill:'var(--mute)'});
    for(let y=0;y<rowsShown;y++){
      if(y%Math.max(1,Math.ceil(8/cell*2))===0||y===rowsShown-1)b+=RD.t(42,18+y*cell+cell*0.8,'y '+y,{a:'end',fs:Math.min(10,cell+3),fill:'var(--mute)'});
      for(let x=0;x<dx;x++){const lin=x+y*dx,wp=lin>>5;
        const on=S.sel&&S.sel.x===x&&S.sel.y===y;
        b+='<rect data-x="'+x+'" data-y="'+y+'" x="'+(46+x*cell)+'" y="'+(18+y*cell)+'" width="'+Math.max(1,cell-1)+'" height="'+Math.max(1,cell-1)+'" style="fill:'+COL[wp%8]+';opacity:'+(wp%2?0.55:0.9)+';cursor:pointer"'+(on?' stroke="var(--ink)" stroke-width="2"':'')+'></rect>'}}
    if(dy>rowsShown)b+=RD.t(46,18+rowsShown*cell+13,'rows '+rowsShown+' to '+(dy-1)+' continue the same way (warps '+(rowsShown*dx/32)+' to 7)',{fs:10.5,fill:'var(--mute)'});
    fig.innerHTML=RD.svg(w,h,b,'Block of '+dx+' by '+dy+' threads coloured by warp');
    const g=warpGeom(dx);
    let st=RD.stat('Warp 0 covers',g.rows+' row'+(g.rows>1?'s':'')+' &times; '+g.cols+' cols','threads 0 to 31 by linear id')+
      RD.stat('Sectors per warp load',g.sectors,'32-byte sectors, '+(g.sectors===4?'every byte used':'only '+Math.round(400/g.sectors)+'% of each used'));
    if(S.sel){const x=S.sel.x,y=S.sel.y,lin=x+y*dx,r=BY*dy+y,c=BX*dx+x;
      st+=RD.stat('threadIdx','('+x+', '+y+')','linear id '+lin+' = x + y&middot;'+dx)+RD.stat('Warp, lane','warp '+(lin>>5)+', lane '+(lin&31),'lane = linear id mod 32')+
        RD.stat('In block (2, 1): element','row '+r+', col '+c,'offset '+(r*COLS+c).toLocaleString('en-US')+' = row &middot; 4,096 + col')}
    else st+=RD.stat('Click a cell','','to see one thread\'s numbers');
    cnt.innerHTML=st}
  fig.addEventListener('click',e=>{const r=e.target.closest('rect[data-x]');if(!r)return;S.sel={x:+r.dataset.x,y:+r.dataset.y};draw()});
  RD.seg(document.getElementById('pm-ix-mode'),m=>{const [a,b]=m.split('x').map(Number);S.dx=a;S.dy=b;S.sel=null;draw()});
  RD.onRender(draw);RD.onResize(draw);draw();
})();
