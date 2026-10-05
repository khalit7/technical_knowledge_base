// ---- Layout lab tab (t-layout): CuTe algebra with presets checked against CuTe's own output ----
(function(){
  const L=window.LT,C=window.CUTE,esc=RD.esc,$=id=>document.getElementById(id);
  const dark=()=>window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches;
  // presets: [label, op, A, B/tiler, M, CuTe case name whose printed result we compare]
  const P=[
    ['Column-major 4 x 8','eval','(4,8):(1,4)','','', 'colmajor_4x8'],
    ['Row-major 4 x 8','eval','(4,8):(8,1)','','', 'rowmajor_4x8'],
    ['Padded columns (bank-conflict trick)','eval','(4,8):(1,5)','','', 'padded_4x8'],
    ['Nested modes: a tile of tiles','eval','((2,2),(2,4)):((1,8),(2,16))','','', 'nested_2x2x2x4'],
    ['coalesce: merge contiguous modes','coalesce','(2,(1,6)):(1,(6,2))','','', 'coalesce_out'],
    ['composition (CuTe docs example)','compose','(6,2):(8,2)','(4,3):(3,1)','', 'compose_AB'],
    ['complement up to 24','complement','(2,2):(1,6)','','24', 'complement_24'],
    ['logical_divide, 1-D (CuTe docs)','divide','(4,2,3):(2,1,8)','4:2','', 'divide_1d'],
    ['logical_divide 8 x 8 by 2 x 4 tiles','divide','(8,8):(1,8)','2:1 ; 4:1','', 'divide_8x8_by_2x4'],
    ['zipped_divide 8 x 8 by 2 x 4 tiles','zipped','(8,8):(1,8)','2:1 ; 4:1','', 'zipped_8x8_by_2x4'],
    ['logical_divide, 2-D (CuTe docs)','divide','(9,(4,8)):(59,(13,1))','3:3 ; (2,4):(1,8)','', 'doc2d_divide'],
    ['blocked_product 2 x 2 by 3 x 4','blocked','(2,2):(1,2)','(3,4):(1,3)','', 'blocked_2x2_by_3x4'],
    ['raked_product 2 x 2 by 3 x 4','raked','(2,2):(1,2)','(3,4):(1,3)','', 'raked_2x2_by_3x4'],
    ['128-byte swizzle of 8 x 64 halves','swizzle','(8,64):(64,1)','','3,3,3', 'smem_8x64_sw128'],
    ['64-byte swizzle of 8 x 32 halves','swizzle','(8,32):(32,1)','','2,3,3', 'smem_8x32_sw64'],
  ];
  const pre=$('ll-pre');pre.innerHTML='<option value="-1">(your own)</option>'+P.map((p,i)=>'<option value="'+i+'">'+esc(p[0])+'</option>').join('');
  // CuTe's own mapping for each preset, from layouts.txt via recompute.py (printed form only; values were checked offline)
  const cuteTxt=n=>L.cute[n]?L.cute[n].txt:null;
  function tiler(t){const parts=t.split(';').map(x=>x.trim()).filter(Boolean);if(!parts.length)throw new Error('give a tiler');
    return parts.length===1?C.parse(parts[0]):parts.map(C.parse)}
  function run(){
    const op=$('ll-op').value,a=$('ll-a').value,b=$('ll-b').value,m=$('ll-m').value;
    $('ll-bl').style.display=['compose','divide','zipped','blocked','raked'].includes(op)?'':'none';
    $('ll-ml').style.display=['complement','swizzle'].includes(op)?'':'none';
    let R,txt,vals,fn=null,colorTile=false;
    try{
      const A=C.parse(a);
      if(op==='eval')R=A;else if(op==='coalesce')R=C.coalesce(A);else if(op==='compose')R=C.compose(A,C.parse(b));
      else if(op==='complement'){const M=parseInt(m,10);if(!(M>0))throw new Error('M must be a positive integer');R=C.complement(A,M)}
      else if(op==='divide'){R=C.divide(A,tiler(b));colorTile=true}else if(op==='zipped'){R=C.zipped(A,tiler(b));colorTile=true}
      else if(op==='blocked')R=C.blocked(A,C.parse(b));else if(op==='raked')R=C.raked(A,C.parse(b));
      else if(op==='swizzle'){const q=m.split(',').map(x=>parseInt(x,10));if(q.length!==3||q.some(isNaN))throw new Error('write B,M,S');fn=C.swz(q[0],q[1],q[2]);R=A}
      if(C.size(R.s)>4096)throw new Error('more than 4,096 elements: too big to draw');
      txt=(fn?'Sw<'+m.replace(/\s/g,'')+'> o ':'')+C.lstr(R);
      const i=+pre.value;let badge='';
      if(i>=0&&P[i][1]===op&&P[i][2]===a&&(P[i][3]===b||!['compose','divide','zipped','blocked','raked'].includes(op))&&(P[i][4]===m||!['complement','swizzle'].includes(op))){
        const ct=cuteTxt(P[i][5]);if(ct){const ours=fn?C.lstr(R):C.lstr(R);const same=fn?ct.endsWith(ours):ct===ours;
          badge=' <span class="'+(same?'ll-ok':'ll-bad')+'">'+(same?'matches CuTe':'differs from CuTe')+'</span> <span class="mute">CuTe printed: '+esc(ct)+'</span>'}}
      $('ll-res').innerHTML='result: '+esc(txt)+'<br><span class="mute">size '+C.size(R.s)+', cosize '+(fn?Math.max(...C.map(R).map(fn))+1:C.cosize(R))+'</span>'+badge;
      draw(R,fn,colorTile);
      $('ll-note').textContent=colorTile?'Colours: which tile (the second mode) an element belongs to; numbers: offsets into A.':(fn?'Numbers: offsets after the swizzle; colours: the 16-byte chunk within a 128-byte row the element lands in.':'Numbers: the offset of each coordinate; colours follow the offset.');
    }catch(e){$('ll-res').innerHTML='<span class="ll-bad">'+esc(e.message)+'</span>';$('ll-grid').innerHTML=''}
  }
  function draw(R,fn,colorTile){
    const el=$('ll-grid');const g=C.grid(R).map(r=>r.map(v=>fn?fn(v):v));const rows=g.length,cols=g[0].length;
    const w=RD.width(el);const cs=Math.max(12,Math.min(36,Math.floor((w-6)/cols)));const fs=cs<18?8:cs<26?9.5:11;
    const s0=Array.isArray(R.s)?C.size(R.s[0]):C.size(R.s);const t0=Array.isArray(R.s)&&Array.isArray(R.s[1])?C.size(R.s[1][0]):1;
    let b='';const mx=Math.max(1,...g.flat());
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const v=g[r][c];let hue;
      if(colorTile){const tile=Math.floor(c/Math.max(1,t0));hue='hsl('+((tile*67)%360)+',55%,'+(dark()?'32%':'82%')+')'}
      else if(fn){hue='hsl('+(((v>>3)&7)*45)+',55%,'+(dark()?'32%':'82%')+')'}
      else hue='hsl('+(200+140*v/mx)+',50%,'+(dark()?'30%':'84%')+')';
      b+='<rect x="'+(c*cs+1)+'" y="'+(r*cs+1)+'" width="'+(cs-2)+'" height="'+(cs-2)+'" rx="2" fill="'+hue+'"><title>('+r+','+c+') -> '+v+'</title></rect>';
      if(cs>=14)b+=RD.t(c*cs+cs/2,r*cs+cs/2+fs/3,v,{a:'middle',fs})}
    el.innerHTML=RD.svg(cols*cs+2,rows*cs+2,b,'layout grid')}
  pre.addEventListener('change',()=>{const i=+pre.value;if(i<0)return;const p=P[i];$('ll-op').value=p[1];$('ll-a').value=p[2];$('ll-b').value=p[3]||'';$('ll-m').value=p[4]||'';run()});
  ['ll-a','ll-b','ll-m'].forEach(id=>$(id).addEventListener('input',run));
  $('ll-op').addEventListener('change',run);
  // --- banks ---
  let sw=0;
  function bank(){const el=$('ll-bank');const f=sw?C.swz(sw,3,3):(x=>x);const w=RD.width(el);
    const cs=Math.max(22,Math.min(48,Math.floor((w-70)/8))),rows=8,cols=8;let b='';const groups=[];
    for(let r=0;r<rows;r++){for(let c=0;c<cols;c++){const off=f(r*64+c*8);const chunk=(off>>3)&7;if(c===0)groups.push(chunk);
      b+='<rect x="'+(60+c*cs)+'" y="'+(r*24+2)+'" width="'+(cs-2)+'" height="22" rx="3" fill="hsl('+(chunk*45)+',55%,'+(dark()?'34%':'80%')+')"'+(c===0?' stroke="var(--ink)" stroke-width="1.5"':'')+'><title>row '+r+', chunk '+c+': banks '+(chunk*4)+' to '+(chunk*4+3)+'</title></rect>'+RD.t(60+c*cs+cs/2-1,r*24+17,'b'+chunk*4,{a:'middle',fs:10})}
      b+=RD.t(52,r*24+17,'row '+r,{a:'end',fs:10.5})}
    el.innerHTML=RD.svg(60+cols*cs+4,rows*24+6,b,'bank groups');
    const distinct=new Set(groups).size;$('ll-bankx').innerHTML='Column 0 down the 8 rows (outlined) touches <b>'+distinct+'</b> distinct bank groups: '+(distinct===8?'conflict-free':'an '+(8/distinct)+'-way conflict')+'. Each 128-byte row covers all 32 banks once, so without a swizzle every row starts at bank 0.'}
  RD.seg($('ll-swsel'),m=>{sw=+m;bank()});
  // --- TV layouts ---
  const TVD={sm80_m16n8k16_C:[16,8],sm80_m16n8k16_A:[16,16],sm80_m16n8k8_tf32_A:[16,8],sm90_m64n64k16_C:[64,64]};let tvs='sm80_m16n8k16_C',sel=0;
  function tv(){const d=TVD[tvs],l=C.parse(L.cute[tvs].txt),T=C.size(l.s[0]),V=C.size(l.s[1]);const R=d[0],Q=d[1];const own=new Array(R*Q).fill(null);
    for(let t=0;t<T;t++)for(let v=0;v<V;v++){const idx=C.at(l,t+T*v);own[(idx%R)*Q+Math.floor(idx/R)]={t,v}}
    const el=$('ll-tv');const w=RD.width(el);const cs=Math.max(6,Math.min(30,Math.floor((w-4)/Q)));let b='';
    own.forEach((o,i)=>{const r=Math.floor(i/Q),c=i%Q;b+='<rect x="'+(c*cs)+'" y="'+(r*cs)+'" width="'+(cs-1)+'" height="'+(cs-1)+'" data-t="'+o.t+'" fill="hsl('+(o.t*360/T)+',55%,'+(dark()?'40%':'75%')+')"'+(o.t===sel?' stroke="var(--ink)" stroke-width="2"':'')+'><title>('+r+','+c+'): thread '+o.t+', value '+o.v+'</title></rect>';
      if(cs>=18)b+=RD.t(c*cs+cs/2,r*cs+cs/2+3,o.t,{a:'middle',fs:9})});
    el.innerHTML=RD.svg(Q*cs,R*cs,b,'thread-value layout');
    $('ll-tvx').innerHTML='<b>'+esc(tvs)+'</b>: '+esc(L.cute[tvs].txt)+' maps (thread, value) to the column-major index of a '+R+' x '+Q+' tile; '+T+' threads x '+V+' values. Thread '+sel+' (outlined) holds '+own.filter(o=>o.t===sel).length+' of them.'}
  $('ll-tv').addEventListener('click',e=>{const r=e.target.closest('rect[data-t]');if(r){sel=+r.getAttribute('data-t');tv()}});
  RD.seg($('ll-tvsel'),m=>{tvs=m;sel=0;tv()});
  $('ll-tiled').textContent='ThrLayoutVMNK '+L.cute_tiled;
  pre.value='8';{const p=P[8];$('ll-op').value=p[1];$('ll-a').value=p[2];$('ll-b').value=p[3];$('ll-m').value=p[4]}
  const render=()=>{run();bank();tv()};
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-layout']=[render];
  addEventListener('resize',()=>{const t=$('t-layout');if(t&&!t.hidden)render()});
  render();
})();
