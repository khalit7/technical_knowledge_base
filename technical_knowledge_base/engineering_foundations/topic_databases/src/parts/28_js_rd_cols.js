// ---- Reading section 5: bytes read for "tokens per model", row store against column store, log scale (2D: a number on a log axis reads best flat) ----
// Every value is window.RDD.M (src/read/inputs/read_measure.json, checked by src/read/recompute.py): aggRowBytes and the Parquet column sizes pq.
(function(){
  const el=document.getElementById('rd-cols-svg');if(!el||!window.RD||!window.RDD)return;
  const M=RDD.M,T=RD.t,READ=['model','tokens'];
  const fmt=b=>b>=1e6?(b/1e6).toFixed(b>=1e8?1:2)+' MB':b>=1e3?(b/1e3).toFixed(1)+' KB':b+' B';
  const cols=Object.keys(M.pq).sort((a,b)=>M.pq[b]-M.pq[a]);
  const duck=READ.reduce((s,c)=>s+M.pq[c],0);
  function draw(){const W=RD.width(el),nar=W<480,lw=nar?96:150,vr=nar?64:78,x0=lw,x1=W-vr,rh=nar?22:24,lo=2,hi=9;
    const X=v=>x0+(Math.log10(Math.max(v,1))-lo)/(hi-lo)*(x1-x0);let s='',y=8;
    const bar=(lab,v,c,b,sub)=>{s+=T(lw-8,y+rh/2+4,lab,{a:'end',fs:12,w:b?600:400,fill:sub?'var(--mute)':'var(--ink)'});
      s+='<rect x="'+x0+'" y="'+(y+3)+'" width="'+Math.max(2,X(v)-x0)+'" height="'+(rh-7)+'" rx="3" fill="'+c+'"/>';
      s+=T(X(v)+5,y+rh/2+4,fmt(v),{fs:12,w:b?600:400});y+=rh};
    const gy=y;
    bar(nar?'Postgres':'Postgres reads',M.aggRowBytes,'var(--bad)',1);
    bar(nar?'DuckDB':'DuckDB reads',duck,'var(--acc)',1);
    y+=8;s+=T(nar?4:x0,y+10,nar?'Parquet columns, compressed':'The Parquet file, column by column (compressed)',{fs:12,fill:'var(--mute)'});y+=16;
    cols.forEach(c=>bar(c,M.pq[c],READ.includes(c)?'var(--acc)':'var(--dim)',READ.includes(c),!READ.includes(c)));
    // gridlines, each 10 times the last
    let g='';for(let p=lo;p<=hi;p++){const x=X(Math.pow(10,p));g+='<line x1="'+x+'" y1="'+gy+'" x2="'+x+'" y2="'+(y+2)+'" stroke="var(--line)"/>';
      if(!nar||p%2===0)g+=T(x,y+16,['100 B','1 KB','10 KB','100 KB','1 MB','10 MB','100 MB','1 GB'][p-lo],{a:'middle',fs:11,fill:'var(--mute)'})}
    el.innerHTML=RD.svg(W,y+22,g+s,'Bytes read: Postgres '+fmt(M.aggRowBytes)+', DuckDB '+fmt(duck)+' from the model and tokens columns; log scale');
  }
  draw();RD.onRender(draw);RD.onResize(draw);
})();
