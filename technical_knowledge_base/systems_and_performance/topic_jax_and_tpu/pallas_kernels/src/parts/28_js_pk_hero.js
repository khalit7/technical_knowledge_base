// ---- Reading, top: the hero figure. One grid step (i = 2 of 8) of the bias + GELU kernel of section 3, drawn at the
// measured width: whole arrays in HBM, tiles in VMEM (two buffers for x and o, one for the bias), the kernel body on
// the core. Static: no motion. Shapes are the kernel's own (x [4,096 x 512], blocks of 512 rows, grid (8,)).
(function(){
  const el=document.getElementById('pk-hero');if(!el)return;const U=PKU;
  function arr(x1,y1,x2,y2,col,dash){const a=Math.atan2(y2-y1,x2-x1),h=7;
    const p=[[x2,y2],[x2-h*Math.cos(a-0.45),y2-h*Math.sin(a-0.45)],[x2-h*Math.cos(a+0.45),y2-h*Math.sin(a+0.45)]];
    return '<line x1="'+x1+'" y1="'+y1+'" x2="'+(x2-5*Math.cos(a))+'" y2="'+(y2-5*Math.sin(a))+'" stroke="'+col+'" stroke-width="1.8"'+(dash?' stroke-dasharray="4 3"':'')+'/>'+
      '<polygon points="'+p.map(q=>q.map(v=>v.toFixed(1)).join(',')).join(' ')+'" fill="'+col+'"/>'}
  const T=(x,y,s,o)=>{o=o||{};return '<text x="'+x+'" y="'+y+'" font-size="'+(o.fs||11)+'"'+(o.a?' text-anchor="'+o.a+'"':'')+(o.w?' font-weight="'+o.w+'"':'')+' fill="'+(o.fill||'var(--ink)')+'"'+(o.mono?' font-family="ui-monospace,Menlo,Consolas,monospace"':'')+'>'+s+'</text>'};
  const R=(x,y,w,h,fill,stroke,o)=>{o=o||{};return '<rect x="'+x+'" y="'+y+'" width="'+Math.max(1,w)+'" height="'+h+'" rx="'+(o.rx==null?3:o.rx)+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+(o.sw||1)+'"'+(o.dash?' stroke-dasharray="4 3"':'')+'/>'};
  function draw(){
    const W=Math.min(U.width(el),860),nar=W<520,G=nar?44:104,a=W-G-4,i=2,n=8;
    const xs=[G,G+0.44*a],bs=[G+0.47*a,G+0.53*a],os=[G+0.56*a,G+a];
    const bw=(xs[1]-xs[0])/n,yH=22,hH=24,yV=84,hV=34,yC=150,hC=44,H=yC+hC+6;
    let s='';
    // gutter labels
    const gl=(y,a1,a2)=>T(0,y,a1,{w:600})+(nar?'':T(0,y+14,a2,{fill:'var(--mute)'}));
    s+=gl(yH+15,'HBM','whole arrays')+gl(yV+15,'VMEM','tiles, per core')+gl(yC+20,nar?'core':'TensorCore','runs the body');
    // HBM: x and o as 8 bands each, b as one block
    s+=T(xs[0],yH-6,nar?'x [4,096 &#215; 512]':'x [4,096 &#215; 512], 8 blocks',{fill:'var(--mute)'})+T((bs[0]+bs[1])/2,yH-6,'b',{a:'middle',fill:'var(--mute)'})+T(os[0],yH-6,nar?'o [4,096 &#215; 512]':'o [4,096 &#215; 512], 8 blocks',{fill:'var(--mute)'});
    for(let k=0;k<n;k++){
      const xx=xs[0]+k*bw,ox=os[0]+k*bw;
      const xf=k===i?'var(--acc)':k===i+1?'var(--acc2)':'var(--soft)',of=k===i-1?'var(--c2)':'var(--soft)';
      s+=R(xx+1,yH,bw-2,hH,xf,k===i+1?'var(--acc)':'var(--line)',{dash:k===i+1,rx:2})+T(xx+bw/2,yH+16,k,{a:'middle',fill:k===i?'var(--bg)':'var(--mute)'});
      s+=R(ox+1,yH,bw-2,hH,of,'var(--line)',{rx:2})+T(ox+bw/2,yH+16,k,{a:'middle',fill:k===i-1?'var(--bg)':'var(--mute)'});
    }
    s+=R(bs[0]+1,yH,bs[1]-bs[0]-2,hH,'var(--c4)','var(--line)',{rx:2});
    // VMEM: two x buffers, one b buffer, two o buffers
    const sw=(xs[1]-xs[0]-6)/2,ow=(os[1]-os[0]-6)/2;
    const slot=(x,w,l1,l2,fill,stroke,dash,sw2)=>R(x,yV,w,hV,fill,stroke,{dash,sw:sw2||1})+T(x+w/2,yV+14,l1,{a:'middle',w:600})+T(x+w/2,yV+28,l2,{a:'middle',fill:'var(--mute)'});
    s+=slot(xs[0],sw,(nar?'x ':'x block ')+i,'in use','var(--acc2)','var(--acc)',false,2);
    s+=slot(xs[0]+sw+6,sw,(nar?'x ':'x block ')+(i+1),nar?'arriving':'copying in','var(--bg)','var(--acc)',true);
    s+=R(bs[0]+1,yV,bs[1]-bs[0]-2,hV,'var(--c4)','var(--line)',{rx:2})+T((bs[0]+bs[1])/2,yV+hV+13,nar?'1 buf':'1 buffer',{a:'middle',fill:'var(--mute)'});
    s+=slot(os[0],ow,(nar?'o ':'o block ')+i,nar?'writing':'being written','var(--soft)','var(--c2)',false,2);
    s+=slot(os[0]+ow+6,ow,(nar?'o ':'o block ')+(i-1),nar?'to HBM':'writing back','var(--bg)','var(--c2)',true);
    // copies between HBM and VMEM
    s+=arr(xs[0]+(i+0.5)*bw,yH+hH+2,xs[0]+sw/2,yV-2,'var(--acc)');
    s+=arr(xs[0]+(i+1.5)*bw,yH+hH+2,xs[0]+sw+6+sw/2,yV-2,'var(--acc)',true);
    s+=arr((bs[0]+bs[1])/2,yH+hH+2,(bs[0]+bs[1])/2,yV-2,'var(--mute)');
    s+=arr(os[0]+ow+6+ow/2,yV-2,os[0]+(i-0.5)*bw,yH+hH+2,'var(--c2)',true);
    // core: the kernel body
    s+=R(G,yC,a,hC,'var(--soft)','var(--line)',{rx:6});
    s+=T(G+8,yC+17,'step '+i+': kernel(x_ref, b_ref, o_ref)',{mono:true,fill:'var(--mute)'});
    s+=T(G+8,yC+34,'o_ref[...] = gelu(x_ref[...] + b_ref[...])',{mono:true});
    s+=arr(xs[0]+sw/2,yV+hV+2,xs[0]+sw/2,yC-2,'var(--acc)');
    s+=arr((bs[0]+bs[1])/2,yV+hV+16,(bs[0]+bs[1])/2,yC-2,'var(--mute)');
    s+=arr(os[0]+ow/2,yC-2,os[0]+ow/2,yV+hV+2,'var(--c2)');
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="One grid step of a Pallas kernel: blocks copied from HBM into VMEM, the body running on the tiles, the output block written back">'+s+'</svg>'}
  draw();U.onRender('t-read',draw);addEventListener('resize',()=>{if(!document.getElementById('t-read').hidden)draw()});
})();
