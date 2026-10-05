// ---- Kernel lab: fusing softmax into the matmul (O = softmax(S) V) ----
(function(){
  const X=window.LABX,D=X.D,$=X.$,C=X.calc,f=X.fmt;
  const d=64;
  const MODES={U:'Unfused: softmax, then matmul',F2:'Fused, two passes over S',F1:'Fused, one pass (online)'};
  const STEPS={
    U:[['rS','Kernel 1 (softmax) reads S.'],['wP','Kernel 1 writes P, the same size as S, to device memory.'],['rPV','Kernel 2 (matmul) reads P back, and V.'],['wO','Kernel 2 writes O.']],
    F2:[['rS','Pass 1 reads S to find each row\'s maximum m and sum l (kept on chip).'],['rSV1','Pass 2 reads S again, a tile at a time, with V; p = e<sup>s &minus; m</sup> / l is formed on chip and multiplied into O.'],['rSV2','...to the last tile. P never exists in device memory, but S was read twice.'],['wO','Write O.']],
    F1:[['rSV1','One pass: each 32-column tile of S is read once with the matching rows of V; the running max and sum are updated and the partial O rows rescaled.'],['rSV2','Tile after tile, still one read of S.'],['rSV3','The last tile.'],['wO','Divide by the sum l and write O. S read once, P never stored.']]};
  let N=4096,mode='U';
  const bytesAt=(m,i)=>{const s=4*N*N,v=4*N*d,o=4*N*d;let b=0;
    STEPS[m].slice(0,i+1).forEach(([k])=>{b+=k==='rS'?s:k==='wP'?s:k==='rPV'?s+v:k==='wO'?o:0});
    if(m==='F2'){const r=STEPS[m].slice(0,i+1).map(x=>x[0]);if(r.includes('rSV1'))b+=s/2+v;if(r.includes('rSV2'))b+=s/2}
    if(m==='F1'){const r=STEPS[m].slice(0,i+1).map(x=>x[0]);if(r.includes('rSV1'))b+=s/3+v;if(r.includes('rSV2'))b+=s/3;if(r.includes('rSV3'))b+=s/3}
    return b};
  function draw(i){
    const el=$('lab-fu-svg'),W=X.width(el),H=190,st=STEPS[mode],k=st[i][0];
    const sq=Math.min(78,(W-60)/4.2),th=Math.max(12,sq*0.22);
    const x0=10,xs=[x0,x0+sq+16,x0+2*sq+32,x0+2*sq+32+th+24];
    const done=st.slice(0,i+1).map(x=>x[0]);
    const hasP=mode==='U'&&done.includes('wP'),hasO=done.includes('wO');
    const frac=mode==='F1'?(done.includes('rSV3')?1:done.includes('rSV2')?2/3:done.includes('rSV1')?1/3:0):mode==='F2'?(done.includes('rSV2')?1:done.includes('rSV1')?0.5:0):0;
    let s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Matrices in device memory and the chip">'+
      '<rect x="2" y="4" width="'+(W-4)+'" height="'+(sq+30)+'" rx="6" fill="none" stroke="var(--lab-dram)"></rect><text x="'+(W-8)+'" y="16" text-anchor="end" font-size="10.5" fill="var(--lab-dram)">device memory</text>'+
      '<rect x="2" y="'+(H-40)+'" width="'+(W-4)+'" height="36" rx="6" fill="none" stroke="var(--lab-chip)"></rect><text x="8" y="'+(H-10)+'" font-size="10.5" fill="var(--lab-chip)">on chip: tiles of S or P, O rows, running m and l</text>';
    const box=(x,w,h,lab,on,dash,fill)=>'<rect x="'+x+'" y="22" width="'+w+'" height="'+h+'" fill="'+(fill||'none')+'" stroke="var(--ink)" stroke-dasharray="'+(dash?'3 3':'')+'" opacity="'+(on?1:0.35)+'"></rect><text x="'+(x+w/2)+'" y="'+(22+h/2+4)+'" text-anchor="middle" font-weight="600">'+lab+'</text>';
    s+=box(xs[0],sq,sq,'S',true,false,(k==='rS'||k.startsWith('rSV'))?'var(--hl)':'');
    if(frac>0)s+='<rect x="'+xs[0]+'" y="22" width="'+(sq*frac)+'" height="'+sq+'" fill="var(--lab-dram)" opacity=".25"></rect>';
    s+=box(xs[1],sq,sq,mode==='U'?'P':'P',hasP,!hasP,k==='wP'||k==='rPV'?'var(--hl)':'');
    if(mode!=='U')s+='<text x="'+(xs[1]+sq/2)+'" y="'+(22+sq+12)+'" text-anchor="middle" font-size="10.5" fill="var(--good)">never stored</text>';
    s+=box(xs[2],th,sq,'V',true,false,(k==='rPV'||k.startsWith('rSV'))?'var(--hl)':'');
    s+=box(xs[3],th,sq,'O',hasO,!hasO,k==='wO'?'var(--hl)':'');
    const up=k.startsWith('w'),ax=k==='wP'?xs[1]+sq/2:k==='wO'?xs[3]+th/2:k==='rPV'?xs[1]+sq/2:xs[0]+sq/2;
    s+='<line x1="'+ax+'" x2="'+ax+'" y1="'+(up?H-42:sq+26)+'" y2="'+(up?sq+28:H-44)+'" stroke="var(--ink)" stroke-width="2" marker-end="url(#lab-ah2)"></line>';
    s+='<defs><marker id="lab-ah2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="var(--ink)"></path></marker></defs></svg>';
    el.innerHTML=s;
    const c=X.find('fused',mode==='U'?'U_lib':mode,N);
    $('lab-fu-cap').innerHTML='<b>Step '+(i+1)+' of '+st.length+'.</b> '+st[i][1];
    $('lab-fu-stats').innerHTML=X.stat('Bytes moved so far',X.fbytes(bytesAt(mode,i)),'minimum by design <span class="lab-tag d">derived</span>')+
      X.stat('Whole design',X.fbytes(C.fusedBytes(mode,N,d)),mode==='U'?'3 x 4N<sup>2</sup> + V + O':mode==='F2'?'2 x 4N<sup>2</sup> + V + O':'4N<sup>2</sup> + V + O')+
      X.stat('Measured time',X.fms(c.ms)+' ms',(mode==='U'?'MLX softmax then @':'our fused kernel')+' <span class="lab-tag m">measured</span>')+
      X.stat('Peak memory',f(c.peak_mib,0)+' MiB','MLX allocator, inputs included <span class="lab-tag m">measured</span>');
  }
  X.seg($('lab-fu-n'),[2048,4096,8192].map(n=>[String(n),'N = '+f(n)]),String(N),v=>{N=+v;an.show();plot()});
  X.seg($('lab-fu-mode'),Object.keys(MODES).map(k=>[k,MODES[k]]),mode,v=>{mode=v;an.reset(STEPS[mode].length)});
  const an=X.anim({card:'lab-fu-card',ctl:'lab-fu-ctl',n:STEPS[mode].length,draw,ms:1500,label:'Step'});
  const DES=[['U_lib','unfused, MLX','var(--c2)'],['U_ours','unfused, ours (S6 + M7)','var(--c5)'],['F2','fused, 2 passes','var(--c1)'],['F1','fused, online','var(--c3)']];
  function plot(){
    const rows=[];[2048,4096,8192].forEach(n=>DES.forEach(([k,l,col])=>{const c=X.find('fused',k,n);rows.push({label:'N='+n+' '+l,v:c.ms,vt:X.fms(c.ms)+' ms',col,on:n===N})}));
    X.hbars($('lab-fu-plot'),rows,{lw:200,rh:19,aria:'Time of each design at three sizes'});
  }
  const g=(k,n)=>X.find('fused',k,n);
  $('lab-fu-note').innerHTML='Measured time per design, median of 3 runs, fp32, V and O have 64 columns. <span class="lab-tag m">measured</span> At N = 8,192 the online fused kernel takes <b>'+X.fms(g('F1',8192).ms)+' ms</b> against <b>'+X.fms(g('U_lib',8192).ms)+' ms</b> for MLX\'s two library calls ('+f(g('U_lib',8192).ms/g('F1',8192).ms,1)+' times) and peaks at '+f(g('F1',8192).peak_mib,0)+' MiB instead of '+f(g('U_lib',8192).peak_mib,0)+': P\'s 256 MiB is never allocated. The two-pass fused kernel ('+X.fms(g('F2',8192).ms)+' ms) is no faster than the unfused library at that size: reading S twice gives back most of what fusion saved. That is the whole case for the online softmax.';
  $('lab-fu-metal').textContent=D.metal.FUSED;$('lab-fu-triton').textContent=D.tsrc.softmax_matmul;
  draw(0);plot();
  X.onRender(()=>{an.show();plot()});X.onResize(()=>{an.show();plot()});
})();
