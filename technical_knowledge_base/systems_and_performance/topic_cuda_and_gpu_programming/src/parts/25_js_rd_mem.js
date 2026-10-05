// ---- Reading 3: coalescing (32-byte sectors per warp load, with the M1 measurements) and one matmul tile read directly against staged in shared memory ----
(function(){
  if(!window.RD||!window.RDC)return;
  // coalescing
  const cf=document.getElementById('rd-co-fig'),cs=document.getElementById('rd-co-s');
  function coal(){
    const S=+cs.value,W=RD.width(cf),span=32*S*4,sectors=new Set();
    for(let k=0;k<32;k++)sectors.add(Math.floor(k*S*4/32));
    const ns=sectors.size,moved=ns*32,x0=6,x1=W-6,ax=b=>x0+(x1-x0)*b/span;let s='';
    s+=RD.t(x0,11,'32 threads of one warp',{fs:10.5,fill:'var(--mute)'});
    for(let k=0;k<32;k++){const tx=x0+(x1-x0)*(k+.5)/32,a=ax(k*S*4+2);
      s+='<circle cx="'+tx.toFixed(1)+'" cy="22" r="3" fill="var(--c1)"/><line x1="'+tx.toFixed(1)+'" y1="25" x2="'+a.toFixed(1)+'" y2="58" stroke="var(--c1)" stroke-width=".8" opacity=".7"/>';}
    const nsec=span/32;
    if(nsec<=256)for(let q=0;q<nsec;q++){const xa=ax(q*32),xb=ax((q+1)*32);
      s+='<rect x="'+xa.toFixed(1)+'" y="60" width="'+Math.max(.6,xb-xa-(nsec>64?0:1)).toFixed(1)+'" height="14" fill="'+(sectors.has(q)?'var(--c2)':'var(--soft)')+'" stroke="'+(nsec>64?'none':'var(--line)')+'" stroke-width=".5"/>';}
    s+=RD.t(x0,88,'memory, '+nsec+' sectors of 32 bytes; touched sectors coloured',{fs:10.5,fill:'var(--mute)'});
    // measured bars
    const M=RDC.sim.coal,mx=Math.max(...M.map(m=>m.gbps)),y0=104,bh=15,lw=78;
    s+=RD.t(x0,y0-2,'Measured on the M1 Pro GPU, GB/s of useful data',{fs:10.5,w:600});
    M.forEach((m,j)=>{const y=y0+6+j*(bh+3),w=(x1-x0-lw-44)*m.gbps/mx,on=m.stride===S;
      s+=RD.t(x0,y+11,'stride '+m.stride,{fs:10.5,w:on?600:400})+'<rect x="'+(x0+lw)+'" y="'+y+'" width="'+w.toFixed(1)+'" height="'+bh+'" rx="2" fill="'+(on?'var(--c2)':'var(--acc2)')+'"/>'+RD.t(x0+lw+w+4,y+11,m.gbps.toFixed(0),{fs:10.5});});
    cf.innerHTML=RD.svg(W,y0+8+M.length*(bh+3),s,'Sectors touched by one warp load, and measured bandwidth by stride');
    const meas=M.find(m=>m.stride===S);
    document.getElementById('rd-co-out').innerHTML=RD.stat('Sectors per warp load',ns,'NVIDIA rule, 32 bytes each')+RD.stat('Bytes moved for 128 used',moved,(100*128/moved).toFixed(0)+'% useful')+
      RD.stat('M1 Pro measured',meas.gbps.toFixed(0)+' GB/s',(M[0].gbps/meas.gbps).toFixed(1)+' times slower than stride 1');
  }
  cs.addEventListener('change',coal);RD.onRender(coal);RD.onResize(coal);coal();

  // tile: direct global reads against shared-memory staging
  const tf=document.getElementById('rd-tl-fig'),T=4,K=8,TK=4;let mode='dir',an;
  function steps(m){const r=[];if(m==='dir'){for(let k=0;k<K;k++)r.push({k,kind:'g'});}
    else for(let p=0;p<K/TK;p++){r.push({p,kind:'load'});for(let k=0;k<TK;k++)r.push({p,k:p*TK+k,kind:'s'});}return r}
  function state(i){const S=steps(mode),cA=Array(T*K).fill(0),cB=Array(K*T).fill(0);let g=0,sh=0,acc=0;
    for(let j=0;j<=i;j++){const st=S[j];
      if(st.kind==='g'){for(let r=0;r<T;r++)cA[r*K+st.k]+=T;for(let c=0;c<T;c++)cB[st.k*T+c]+=T;g+=2*T*T;acc++}
      else if(st.kind==='load'){for(let r=0;r<T;r++)for(let k=0;k<TK;k++)cA[r*K+st.p*TK+k]++;for(let k=0;k<TK;k++)for(let c=0;c<T;c++)cB[(st.p*TK+k)*T+c]++;g+=2*T*TK}
      else{sh+=2*T*T;acc++}}
    return {cA,cB,g,sh,acc,st:S[i],n:S.length}}
  function tdraw(i){
    const z=state(i),st=z.st,W=RD.width(tf),stg=mode==='smem';
    const cell=Math.max(11,Math.min(26,(W-12)/(stg?19.5:13.5))),gap=cell*.6;let s='';
    const ax=0,ay=K*cell+gap+14,bx=K*cell+gap,by=14,cx=bx,cy=ay;
    const heat=v=>v===0?'var(--soft)':v===1?'var(--acc2)':v<=T?'var(--c1)':'var(--c2)';
    const txt=(x,y,v,f)=>v?RD.t(x+cell/2,y+cell*.68,v,{a:'middle',fs:Math.min(11,cell*.55),fill:f||'var(--ink)'}):'';
    s+=RD.t(bx,10,'B (K x 4)',{fs:10.5,w:600})+RD.t(ax,ay-4,'A (4 x K)',{fs:10.5,w:600})+RD.t(cx,ay+T*cell+12,'C tile',{fs:10.5,w:600});
    const curK=st.kind==='load'?-1:st.k,ph=st.kind==='load'?st.p:(stg?st.p:-1);
    for(let r=0;r<T;r++)for(let k=0;k<K;k++){const v=z.cA[r*K+k],x=ax+k*cell,y=ay+r*cell,hot=k===curK||(st.kind==='load'&&Math.floor(k/TK)===st.p);
      s+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+(cell-1).toFixed(1)+'" height="'+(cell-1).toFixed(1)+'" fill="'+heat(v)+'"'+(hot?' stroke="var(--ink)" stroke-width="1.4"':'')+'/>'+txt(x,y,v,v>1?'var(--bg)':'')}
    for(let k=0;k<K;k++)for(let c=0;c<T;c++){const v=z.cB[k*T+c],x=bx+c*cell,y=by+k*cell,hot=k===curK||(st.kind==='load'&&Math.floor(k/TK)===st.p);
      s+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+(cell-1).toFixed(1)+'" height="'+(cell-1).toFixed(1)+'" fill="'+heat(v)+'"'+(hot?' stroke="var(--ink)" stroke-width="1.4"':'')+'/>'+txt(x,y,v,v>1?'var(--bg)':'')}
    for(let r=0;r<T;r++)for(let c=0;c<T;c++){const x=cx+c*cell,y=cy+r*cell;
      s+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+(cell-1).toFixed(1)+'" height="'+(cell-1).toFixed(1)+'" fill="var(--c3)" fill-opacity="'+(0.12+0.85*z.acc/K).toFixed(2)+'"/>'}
    if(stg){const sx=bx+T*cell+gap,sy=ay-cell*T-gap;
      s+=RD.t(sx,sy-6,'shared memory',{fs:10.5,w:600})+'<rect x="'+(sx-3)+'" y="'+(sy-2)+'" width="'+(T*cell+5)+'" height="'+(2*T*cell+gap+6)+'" rx="5" fill="none" stroke="var(--c4)" stroke-dasharray="3 2"/>';
      const filled=ph>=0;
      for(let a=0;a<2;a++)for(let r=0;r<T;r++)for(let c=0;c<T;c++){const x=sx+c*cell,y=sy+a*(T*cell+gap)+r*cell;
        const rd=st.kind==='s'&&((a===0&&c===st.k%TK)||(a===1&&r===st.k%TK));
        s+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+(cell-1).toFixed(1)+'" height="'+(cell-1).toFixed(1)+'" fill="'+(filled?'var(--c4)':'var(--soft)')+'" fill-opacity="'+(rd?1:.35)+'"/>';}
      s+=RD.t(sx+T*cell+4,sy+T*cell/2,'As',{fs:10})+RD.t(sx+T*cell+4,sy+T*cell+gap+T*cell/2,'Bs',{fs:10});}
    const H=ay+T*cell+18;
    tf.innerHTML=RD.svg(W,H,s,'Matmul tile: global fetches per element of A and B');
    let cap;
    if(mode==='dir')cap=['k = '+st.k+': all 16 threads read from global memory','Thread (r, c) needs A[r]['+st.k+'] and B['+st.k+'][c]. The four threads in a row all fetch the same A element, and the four in a column the same B element: 32 fetches for 8 distinct values.'];
    else if(st.kind==='load')cap=['Phase '+st.p+': copy one tile of A and one of B into shared memory','Each of the 16 threads fetches one element of A and one of B (32 fetches, each value exactly once), then the block waits at __syncthreads() so nobody reads a half-filled tile.'];
    else cap=['k = '+st.k+': every thread reads the tiles from shared memory','The same 32 operand reads as before, but from on-chip memory, about 16 times lower latency than HBM on Hopper (29 against 479 cycles, measured on an H800). Global memory is not touched.'];
    document.getElementById('rd-tl-cap').innerHTML='<div class="t">Step '+(i+1)+' of '+z.n+': '+cap[0]+'</div><p>'+cap[1]+'</p>';
    document.getElementById('rd-tl-cnt').innerHTML=RD.stat('Global memory fetches',z.g)+RD.stat('Shared memory reads',z.sh)+RD.stat('Multiply-add steps done',z.acc+' of '+K);
  }
  RD.seg(document.getElementById('rd-tl-mode'),m=>{mode=m;an.reset(steps(m).length);an.play()});
  an=RD.anim({card:'rd-tl-card',ctl:'rd-tl-ctl',n:steps('dir').length,draw:tdraw,ms:1500,label:'Tile step'});
  RD.onResize(()=>an.redraw());
  const tt=document.getElementById('rd-tl-t');
  function real(){const t=+tt.value,N=4096,dir=2*N*N*N*4,til=dir/t;
    document.getElementById('rd-tl-real').innerHTML='4,096 cubed float32 matmul: global traffic '+(dir/1e9).toFixed(0)+' GB without tiles, '+(til/1e9).toFixed(1)+' GB with '+t+' x '+t+' tiles ('+t+' times less); '+(t/4).toFixed(t<4?2:0)+' FLOP per global byte <span class="rd-der">derived: 2N&sup3;&times;4 bytes / T</span>'}
  tt.addEventListener('change',real);real();
})();
