// ---- Hero: the matmul ladder, one rung per step, with the memory traffic each rung asks for ----
// Data: window.WKL (src/ladder.py). Left: what one block and one thread touch in a 256 x 256 corner of A, B and C.
// Right: the whole ladder on one axis (global and shared bytes per FMA, derived; Boehm's GFLOP/s, published).
(function(){
  const host=document.getElementById('wk-hero');if(!host||!window.WKL)return;
  const L=window.WKL,R=L.rungs,N=R.length,cap=document.getElementById('wk-hero-cap'),cnt=document.getElementById('wk-hero-cnt');
  const fmt=(v,d)=>v.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
  const G='var(--c2)',S='var(--c1)',Rg='var(--c3)';
  const sp=(c,t)=>'<span style="color:'+c+';font-weight:600">'+t+'</span>';
  const CAP=[
    '<b>1. Naive.</b> One thread per output of C. The 32 lanes of a warp take 32 <i>rows</i> of C in one column, so at every k they read A from 32 different rows: 32 separate 32-byte sectors to deliver 128 useful bytes. Each multiply-add (FMA) asks for 8 bytes and, sector by sector, '+sp(G,'moves 33')+'.',
    '<b>2. Coalesced.</b> The same code with the two thread indices swapped: a warp now takes 32 <i>columns</i> of one row, reads one A value (all lanes share it) and 32 neighbouring B values, one 128-byte line. Still 8 bytes asked per FMA, '+sp(G,'5 moved')+': 6.6 times fewer by this count, close to the 6.4 times Boehm measured. The compiled instructions are identical; only the addresses differ.',
    '<b>3. Shared-memory tiles.</b> A block loads a 32 &times; 32 tile of A and of B into '+sp(S,'shared memory')+' once, and every thread then reads it 32 times. Global traffic falls to '+sp(G,'0.25 bytes per FMA')+'; but each FMA now reads two values (8 bytes) from shared memory, which becomes the limit. (On the M1 this 32 &times; 32 tile ran slower than a 16 &times; 16 one: the best tile differs per GPU.)',
    '<b>4. 1D thread tile.</b> Each thread computes 8 outputs of one column: one B value, held in a '+sp(Rg,'register')+', feeds 8 FMAs. Shared reads fall to '+sp(S,'4.5 bytes per FMA')+', and the 64 &times; 64 block tile halves global traffic again. Not in the M1 lab.',
    '<b>5. 2D thread tile.</b> Each thread computes an 8 &times; 8 block of C as outer products: 8 A and 8 B values in '+sp(Rg,'registers')+' feed 64 FMAs. Shared reads '+sp(S,'1 byte per FMA')+', global 0.0625 (128 &times; 128 block tile). The price is registers: 158 per thread.',
    '<b>6. Vectorised.</b> The same traffic in fewer instructions: A is transposed as it is stored, so both register fragments load as 16-byte LDS.128, and global memory moves float4. 731 instructions instead of 1,047 and 127 registers instead of 158, so two blocks fit per SM instead of one. (On the M1 the 8 &times; 8 version ran slower than 4 &times; 4.)',
    '<b>7. Beyond: warp tiles, autotuning, tensor cores.</b> Boehm adds a warp-level tile between the block and the thread and autotunes the sizes: 93.7% of cuBLAS. Production matmuls replace the 8 &times; 8 FMA block with tensor-core instructions. On the M1, its 8 &times; 8 matrix instructions (Kernel lab M7) take 5.10 ms against MLX&rsquo;s 4.24 ms.'];
  function mats(x0,y0,m,r,i){
    const u=m/256,g=12,Ax=x0,Ay=y0+m+g,Bx=x0+m+g,By=y0,Cx=Bx,Cy=Ay;
    let s='';
    const box=(x,y,l)=>'<rect x="'+x+'" y="'+y+'" width="'+m+'" height="'+m+'" fill="var(--soft)" stroke="var(--line)"/>'+RD.t(x+m/2,y+m/2+5,l,{a:'middle',fs:15,fill:'var(--mute)',w:600});
    s+=box(Ax,Ay,'A')+box(Bx,By,'B')+box(Cx,Cy,'C');
    const rc=(x,y,w,h,f,o,st)=>'<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+Math.max(2,w).toFixed(1)+'" height="'+Math.max(2,h).toFixed(1)+'" fill="'+f+'" fill-opacity="'+o+'"'+(st?' stroke="'+st+'"':'')+'/>';
    const k=150; // the k position drawn
    if(r.key==='k1'||r.key==='k2'){
      const r0=96,c0=112,col=r.key==='k1';
      // the warp's 32 outputs
      s+=col?rc(Cx+c0*u,Cy+r0*u,3,32*u,Rg,1):rc(Cx+c0*u,Cy+r0*u,32*u,3,Rg,1);
      if(col){ // A: 32 rows, each lane its own row; B: one column, one value shared
        s+=rc(Ax,Ay+r0*u,m,32*u,G,.18)+rc(Ax+k*u,Ay+r0*u,3,32*u,G,1);
        s+=rc(Bx+c0*u,By,3,m,G,.25)+rc(Bx+c0*u-1,By+k*u-1,5,5,G,1);
        s+=RD.t(Ax+2,Ay+r0*u-5,'32 rows: 32 sectors',{fs:11,fill:G});
      }else{
        s+=rc(Ax,Ay+r0*u,m,3,G,.3)+rc(Ax+k*u-1,Ay+r0*u-1,5,5,G,1);
        s+=rc(Bx+c0*u,By,32*u,m,G,.18)+rc(Bx+c0*u,By+k*u,32*u,3,G,1);
        s+=RD.t(Bx+c0*u-4,By+k*u-5,'1 line',{fs:11,fill:G,a:'end'});
      }
      s+=RD.t(Cx+c0*u+(col?8:0),Cy+r0*u+(col?16*u:-6),'one warp',{fs:11,fill:Rg});
    }else{
      const bt=r.block,bk=r.key==='k3'?32:8,r0=Math.round((256-bt)/2/8)*8,c0=r0,k0=Math.floor(k/bk)*bk;
      s+=rc(Cx+c0*u,Cy+r0*u,bt*u,bt*u,S,.15,S);
      s+=rc(Ax,Ay+r0*u,m,bt*u,S,.08)+rc(Ax+k0*u,Ay+r0*u,bk*u,bt*u,S,.55);
      s+=rc(Bx+c0*u,By,bt*u,m,S,.08)+rc(Bx+c0*u,By+k0*u,bt*u,bk*u,S,.55);
      const tw=r.key==='k3'||r.key==='k4'?1:8,th=r.thread;
      s+=rc(Cx+c0*u,Cy+r0*u,tw*u,th*u,Rg,1);
      s+=RD.t(Cx+c0*u+bt*u/2,Cy+r0*u+bt*u+13,'block tile '+bt+' × '+bt,{a:'middle',fs:11,fill:S});
      s+=RD.t(Ax+k0*u+bk*u+3,Ay+r0*u-4,'in shared',{fs:11,fill:S});
      s+=RD.t(Cx+c0*u+tw*u+3,Cy+r0*u+9,th===1?'1 output':th+' × '+tw,{fs:11,fill:Rg});
    }
    s+=RD.t(Ax,Ay+m+14,'a 256 × 256 corner',{fs:11,fill:'var(--mute)'});
    return s;
  }
  function chart(px,py,pw,i){
    const cw=pw/N,x=j=>px+cw*(j+0.5),h1=70,h2=56,h3=70,gap=26;
    const y1=py+16,y2=y1+h1+gap,y3=y2+h2+gap;
    let s='<rect x="'+(px+cw*i).toFixed(1)+'" y="'+(py+2)+'" width="'+cw.toFixed(1)+'" height="'+(y3+h3-py+4)+'" fill="var(--acc2)" opacity=".55" rx="4"/>';
    // row 1: global bytes per FMA, log scale
    const lo=Math.log(0.04),hi=Math.log(50),ya=v=>y1+h1*(1-(Math.log(v)-lo)/(hi-lo));
    s+=RD.t(px,y1-4,'global bytes per FMA (log)',{fs:11,fill:G,w:600});
    [0.1,1,10].forEach(v=>{s+='<line x1="'+px+'" x2="'+(px+pw)+'" y1="'+ya(v).toFixed(1)+'" y2="'+ya(v).toFixed(1)+'" stroke="var(--line)"/>'+RD.t(px+pw,ya(v)-2,v,{a:'end',fs:11,fill:'var(--mute)'})});
    let pts=[];R.forEach((r,j)=>{if(r.moved!=null)pts.push([x(j),ya(r.moved)])});
    s+='<polyline fill="none" stroke="'+G+'" stroke-width="1.5" opacity=".6" points="'+pts.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ')+'"/>';
    R.forEach((r,j)=>{if(r.moved==null)return;s+='<circle cx="'+x(j).toFixed(1)+'" cy="'+ya(r.moved).toFixed(1)+'" r="'+(j===i?5:3)+'" fill="'+G+'"/>'});
    if(R[i].moved!=null)s+=RD.t(x(i)+(i>N/2?-7:7),ya(R[i].moved)+(i<2?12:-7),R[i].moved,{a:i>N/2?'end':'start',fs:11,w:700,fill:G});
    // row 2: shared bytes per FMA, linear
    const yb=v=>y2+h2*(1-v/9);
    s+=RD.t(px,y2-4,'shared-memory bytes per FMA',{fs:11,fill:S,w:600});
    s+='<line x1="'+px+'" x2="'+(px+pw)+'" y1="'+yb(0)+'" y2="'+yb(0)+'" stroke="var(--line)"/>';
    R.forEach((r,j)=>{if(r.shared==null)return;s+='<circle cx="'+x(j).toFixed(1)+'" cy="'+yb(r.shared).toFixed(1)+'" r="'+(j===i?5:3)+'" fill="'+S+'"'+(r.shared===0?' fill-opacity=".35"':'')+'/>'});
    if(R[i].shared!=null)s+=RD.t(x(i)+(i>N/2?-7:7),yb(R[i].shared)-6,R[i].shared===0?'none':R[i].shared,{a:i>N/2?'end':'start',fs:11,w:700,fill:S});
    // row 3: Boehm's GFLOP/s, linear, cuBLAS dashed
    const yc=v=>y3+h3*(1-v/L.cublas);
    s+=RD.t(px,y3-4,'RTX A6000 GFLOP/s, published',{fs:11,w:600});
    s+='<line x1="'+px+'" x2="'+(px+pw)+'" y1="'+y3+'" y2="'+y3+'" stroke="var(--c4)" stroke-dasharray="4 3"/>'+RD.t(px+pw,y3-4,'cuBLAS',{a:'end',fs:11,fill:'var(--c4)'});
    R.forEach((r,j)=>{const g=r.boehm.gflops,bw=Math.min(18,cw*.5);s+='<rect x="'+(x(j)-bw/2).toFixed(1)+'" y="'+yc(g).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+(y3+h3-yc(g)).toFixed(1)+'" fill="'+(j===i?'var(--acc)':'var(--dim)')+'"/>'});
    s+=RD.t(x(i)+(i>N/2?-11:11),Math.min(y3+h3-4,yc(R[i].boehm.gflops)+12),fmt(R[i].boehm.pct,1)+'%',{a:i>N/2?'end':'start',fs:11,w:700});
    R.forEach((r,j)=>{s+=RD.t(x(j).toFixed(1),y3+h3+15,j+1,{a:'middle',fs:11,w:j===i?700:400,fill:j===i?'var(--ink)':'var(--mute)'})});
    s+=RD.t(px+pw/2,y3+h3+30,'rung',{a:'middle',fs:11,fill:'var(--mute)'});
    return {s,h:y3+h3+34-py};
  }
  function draw(i){
    const W=Math.min(760,RD.width(host)),r=R[i],side=W>=600;
    let m,svg,H;
    if(side){m=Math.min(130,(W*0.46-12)/2);const c=chart(2*m+12+34,4,W-(2*m+12+34)-2,i);svg=mats(4,14,m,r,i)+c.s;H=Math.max(2*m+12+34,c.h+8)}
    else{m=Math.min(130,(W-16)/2);const top=2*m+12+30;const c=chart(4,top,W-8,i);svg=mats(4,14,m,r,i)+c.s;H=top+c.h+4}
    host.innerHTML=RD.svg(W,H,svg,'Matmul ladder, rung '+(i+1)+' of '+N+': '+r.title);
    cap.innerHTML='<p>'+CAP[i]+'</p>';
    const m1=r.m1?fmt(r.m1.ms,2)+' ms':'not run';
    cnt.innerHTML=RD.stat('Global bytes per FMA',r.moved==null?'n/a':(r.asked!==r.moved?r.moved+' moved':r.moved),r.asked!=null&&r.asked!==r.moved?r.asked+' asked; derived':'derived')+
      RD.stat('Shared bytes per FMA',r.shared==null?'n/a':r.shared,'derived')+
      RD.stat('Registers per thread',r.regs==null?'n/a':r.regs,'compiled, sm_90a')+
      RD.stat('RTX A6000',fmt(r.boehm.gflops,0)+' GFLOP/s',fmt(r.boehm.pct,1)+'% of cuBLAS; published')+
      RD.stat('M1 Pro, n = 2,048',m1,r.m1?'measured: '+RD.esc(r.m1.name.replace(/(\d)x(\d)/g,'$1 \u00d7 $2'))+' (Kernel lab)':'no matching rung in the lab');
  }
  const A=RD.anim({card:'wk-hero-card',ctl:'wk-hero-ctl',n:N,draw,ms:2600,label:'Rung'});
  RD.onResize(()=>A.redraw());
})();
