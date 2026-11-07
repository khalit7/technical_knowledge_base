// ---- Section 1: the promise chain of i2_promises.mjs as a static diagram (2026-11-07). Values and printed lines are read from the
// recorded output embedded on the page (pre[data-el-src="i2_promises.txt"]), never typed in here.
(function(){
  const el=document.getElementById('el-pr'),pre=document.querySelector('pre[data-el-src="i2_promises.txt"]');if(!el||!pre)return;
  const out=pre.textContent,m=(rx,i)=>{const r=rx.exec(out);return r?r[i||1]:'?'};
  const v0=m(/p is now Promise \{ (\S+) \}/),v1=m(/then got (\S+)/),err=m(/catch got (\S+)/),pend=/pending now: Promise \{ <pending> \}/.test(out);
  const R=[
    {c:'p = new Promise(executor)',s:'fulfilled: '+v0,k:'ok',pr:'printed at once: "the executor runs immediately"',pn:pend?'then "pending now", before anything awaited p':''},
    {c:'.then(v => v + 1)',s:'fulfilled: '+v1,k:'ok',pr:'a new promise, from the callback\'s return value'},
    {c:'.then(v => { log; throw })',s:'rejected: Error "'+err+'"',k:'bad',pr:'printed "then got '+v1+'", then threw'},
    {c:'.catch(e => log(e.message))',s:'fulfilled',k:'ok',pr:'printed "catch got '+err+'": the error skipped to here'},
    {c:'.finally(() => log)',s:'fulfilled',k:'ok',pr:'printed "finally"'}];
  function draw(){
    const W=Math.min(640,RD.width(el)),nar=W<470,fs=12,gap=26,bh=30,cw=nar?W-8:Math.min(250,W*.46);let y=6,s='';
    s+='<defs><marker id="el-pr-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--mute)"/></marker></defs>';
    R.forEach((r,i)=>{const col=r.k==='bad'?'var(--bad)':'var(--good)';
      s+='<rect x="4" y="'+y+'" width="'+cw+'" height="'+bh+'" rx="7" fill="var(--soft)" stroke="var(--line)"/>';
      s+='<text x="12" y="'+(y+19)+'" font-size="'+fs+'" font-family="ui-monospace,Menlo,Consolas,monospace" fill="var(--ink)">'+RD.esc(r.c)+'</text>';
      const px=nar?12:cw+16,py=nar?y+bh+6:y+4,pw=Math.min(W-px-4,r.s.length*6.9+20);
      s+='<rect x="'+px+'" y="'+py+'" width="'+pw+'" height="22" rx="11" fill="none" stroke="'+col+'" stroke-width="1.6"/>';
      s+=RD.t(px+10,py+15,RD.esc(r.s),{fs,fill:col,w:600});
      let ty=nar?py+38:y+bh+15;
      [r.pr,r.pn].filter(Boolean).forEach(t=>{s+=RD.t(nar?12:px,ty,RD.esc(t),{fs:11.5,fill:'var(--mute)'});ty+=15});
      const bottom=Math.max(y+bh,ty-10);
      if(i<R.length-1){const ny=bottom+gap;s+='<line x1="'+(4+Math.min(cw,170)/2)+'" y1="'+(y+bh+1)+'" x2="'+(4+Math.min(cw,170)/2)+'" y2="'+(ny-2)+'" stroke="var(--mute)" stroke-width="1.5" marker-end="url(#el-pr-ah)"/>';y=ny}
      else y=bottom+8});
    el.innerHTML=RD.svg(W,y,s,'The promise chain of i2_promises.mjs: each .then returns a new promise; the thrown error rejects one and skips to .catch');
  }
  draw();RD.onRender(draw);RD.onResize(draw);
})();
