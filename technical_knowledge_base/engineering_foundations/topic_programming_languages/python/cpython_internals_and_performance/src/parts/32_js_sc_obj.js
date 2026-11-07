// ---- Scene, Fig. 4 (section 2): Python objects in memory, to scale (renderer v2, 2026-11-07) ----
// One row per object, 0.11 world units per byte, sizes from sys.getsizeof on 3.14.8 (PA.sizes, i3_sizes.txt): a C int64 (8 bytes, by definition),
// a float (header of refcount and type pointer, then the double), ints of growing size (header, size field, 4-byte digits of 30 bits).
// The type pointer streams to the shared type object. Digits per int = (bytes - 24) / 4, from the measured sizes.
(function(){
  if(!document.getElementById('stg-obj')||!window.S3||!window.PA||!PA.sizes)return;const {at,off,lerp,mix,cl}=S3;
  const sz=r=>PA.sizes.rows.find(x=>x[0]===r)[2],U=.11,X0=-2.6;
  const ROWS=[['C int64',8,'c',-2.1],['float 1.5',sz('1.5'),'f',-1.05],['int 1',sz('1'),'i',0],['int 2**30',sz('1073741824'),'i',.85],['int 2**60',sz('1152921504606846976'),'i',1.7],['int 2**100',sz('1267650600228229401496703205376'),'i',2.55]];
  const TYP={f:[3.7,0,-1.05],i:[3.7,0,1.3]};
  // the fields of a row: [name, bytes, colour key]
  const fields=r=>r[2]==='c'?[['value',8,'c1']]:r[2]==='f'?[['refcount',8,'h'],['type',8,'h2'],['double',8,'c2']]:[['refcount',8,'h'],['type',8,'h2'],['size',8,'c5']].concat(Array.from({length:(r[1]-24)/4},()=>['digit',4,'c2']));
  const rowOf=k=>k===0?[0]:k===1?[1]:k===2?[2]:[3,4,5];
  function draw(R,k,e){const P=R.P;R.grid(-4.4,5,-2.8,3.6,.5);
    const col=c=>c==='h'?mix(P.paper,P.ink,.12):c==='h2'?mix(P.paper,P.ink,.06):mix(P.paper,P[c],.62);
    const hot=rowOf(k);
    ROWS.forEach((r,i)=>{const now=hot.includes(i),past=hot[0]>i,a=now?(k===3&&i>3?cl(e*3-(i-3)*.8,0,1):k>0&&i===hot[0]?Math.max(.3,e):1):past?.4:0,ghost=!now&&!past;
      let x=X0;const F=fields(r),z=r[3];
      if(ghost){R.box([X0+r[1]*U/2,0,z],[r[1]*U-.015,.32,.42],{a:.14,shadow:false});return}
      F.forEach((f,j)=>{const w=f[1]*U;R.box([x+w/2,0,z],[w-.015,.32,.42],{fill:col(f[2]),a,shadow:j===0});
        if(now&&(f[0]!=='digit'||j===3))R.label([f[0]==='digit'?x+(r[1]-24)*U/2:x+w/2,.32,z],f[0]==='digit'?((r[1]-24)/4)+(r[1]===28?' digit':' digits'):f[0],{fs:12,dy:-11,a:a*(i===hot[hot.length-1]||hot.length===1?1:0),c:f[2]==='c2'||f[2]==='c1'?P[f[2]]:P.ink,b:f[2]==='c2',wide:1});
        if(f[0]==='type'&&now&&a>.3){const t=TYP[r[2]];R.flowArc([x+w/2,.32,z],[t[0]-.5,.3,t[2]],.45,{c:P.c6,a:a*.85,r:.055,n:8,speed:1.2})}
        x+=w});
      R.label([X0,.16,z],r[0],{al:'right',dx:-8,mono:true,fs:12.5,b:now,c:now?P.ink:P.mute,a:Math.max(a,.0),grp:'row'});
      R.label([x,.16,z],r[1]+' B',{al:'left',dx:8,mono:true,fs:12.5,b:1,a,c:now?P.ink:P.mute})});
    // the shared type objects the type pointers lead to
    [['f','float',1],['i','int',2]].forEach(([t,n,s])=>{const a=k>=s?(k===s?e:1)*(k>=3&&t==='f'?.4:1):0,c=TYP[t];
      R.box(c,[1.0,.5,.7],{fill:mix(P.paper,P.c6,.3),a});R.label([c[0],.5,c[2]],'type '+n,{mono:true,fs:12.5,b:1,dy:-11,c:P.c6,a})});
    // a byte ruler along the front, so lengths read as bytes
    const zr=3.15;R.line([[X0,0,zr],[X0+40*U,0,zr]],{c:P.mute,w:1});
    for(let b=0;b<=40;b+=8){R.line([[X0+b*U,0,zr-.08],[X0+b*U,0,zr+.08]],{c:P.mute,w:1});R.label([X0+b*U,0,zr+.1],b+(b===40?' bytes':''),{mono:true,fs:12,dy:11,c:P.mute})}
    if(R.W<520)R.label([0,.9,-2.1],['8 bytes','24 bytes','28 bytes','32 · 36 · 40 bytes'][k],{mono:true,fs:13,b:1,dy:-14});
  }
  const full={cam:[-.18,.72],bounds:[[-2.7,0,-2.4],[4.3,.6,3.4]]};
  S3.stage({id:'stg-obj',list:'sx-obj',fig:'Fig. 4 · objects to scale',cam:full.cam,bounds:full.bounds,aspect:.56,dur:1500,hold:4600,draw,
    margin:w=>w<520?[30,10,16,10]:[18,14,18,120],
    view:k=>({cam:[-.24+.03*k,.72],bounds:full.bounds})});
})();
