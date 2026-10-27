// ---- Hero figure (light pass 2026-10-25), static: the 250 answers GPT-5.6-Sol had been marked wrong on (HLE-Physics, PHYBench,
// PRISM-Physics, UGPhysics), one square each, coloured by the label the physicists gave it (Table 2 pooled: 143 benchmark errors,
// 95 grader errors, 12 model errors). Filled column by column so each label is one block, read left to right.
(function(){const el=$('heroSvg');if(!el)return;
  const P=T.t2_pooled,G=[['Q',P.Q,'benchmark errors','wrong key or ill-posed question'],['G',P.G,'grader errors','correct answer rejected'],['M',P.M,'model errors','']];
  const N=G.reduce((a,g)=>a+g[1],0),ROWS=10,COLS=Math.ceil(N/ROWS);
  fit(el,w=>{const nar=w<560,pad=2,cell=Math.min(24,(w-2*pad)/COLS),gap=Math.max(1.5,cell*.14),top=nar?48:44,gw=cell*COLS;let s='',i=0;
    const x0=pad+(w-2*pad-gw)/2;const start={},end={};
    G.forEach(([k,n])=>{start[k]=i;for(let j=0;j<n;j++,i++){const c=Math.floor(i/ROWS),r=i%ROWS;s+=rc(x0+c*cell,top+r*cell,cell-gap,cell-gap,LC[k],{r:2})}end[k]=i});
    const colX=k=>[x0+Math.floor(start[k]/ROWS)*cell,x0+Math.ceil(end[k]/ROWS)*cell-gap];
    // labels: the two big blocks above the grid, the small one below it
    [['Q',0],['G',1]].forEach(([k])=>{const g=G.find(x=>x[0]===k),[a,b]=colX(k),m=(a+b)/2;
      s+=tx(m,top-(nar?24:22),g[1]+' '+g[2],{fs:nar?12:13,a:'middle',w:700,c:LC[k]});
      s+=tx(m,top-(nar?10:8),nar?(k==='Q'?'bad key or question':'right answer rejected'):g[3],{fs:11,a:'middle',c:'var(--mute)'})});
    const [ma,mb]=colX('M'),yb=top+ROWS*cell+16;
    s+=ln2((ma+mb)/2,top+ROWS*cell,(ma+mb)/2,yb-10,LC.M,{sw:1.4});
    s+=tx(mb,yb+2,P.M+' model errors: the only real failures',{fs:nar?12:13,a:'end',w:700,c:LC.M});
    el.innerHTML=svgW(w,yb+8,s,'250 rejected answers by label: 143 benchmark errors, 95 grader errors, 12 model errors')})})();
