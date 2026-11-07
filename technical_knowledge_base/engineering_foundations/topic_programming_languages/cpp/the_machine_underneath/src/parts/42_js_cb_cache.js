// ---- Cache model, section 2: a 16 x 32 matrix of 4-byte integers summed by rows, then by columns, with an 8-line LRU cache (illustrative).
// Seven explained stretches (step list sx-rc), each showing the state after a given access; the measured ratio comes from window.CB.rowcol ----
(function(){
  const X=window.CBX,CB=X.CB,f=X.fmt,$=id=>document.getElementById('cb-cm-'+id);
  if(!$('grid')||!CB.rowcol)return;
  const LINE=128,SLOT=4,PER=LINE/SLOT,CAP=8,ROWS=16,COLS=32;
  // the stretches: [order, index of the access the step ends on]
  const STR=[['rows',0],['rows',31],['rows',511],['cols',7],['cols',15],['cols',31],['cols',511]];
  function simulate(mode){const acc=[];
    if(mode==='rows'){for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)acc.push((r*COLS+c)*4)}else{for(let c=0;c<COLS;c++)for(let r=0;r<ROWS;r++)acc.push((r*COLS+c)*4)}
    let cache=[],used=new Set(),misses=0;const out=[];
    acc.forEach(a=>{const ln=Math.floor(a/LINE),hit=cache.includes(ln);if(!hit){misses++;cache.push(ln);if(cache.length>CAP)cache.shift()}else{cache=cache.filter(x=>x!==ln);cache.push(ln)}
      used.add(a);out.push({a,ln,hit,misses,cache:cache.slice(),fetched:null,used:new Set(used)})});
    const seen=new Set();out.forEach(s=>{seen.add(s.ln);s.fetched=new Set(seen)});return out}
  const SIM={rows:simulate('rows'),cols:simulate('cols')};
  window.CB_RC={STR,SIM};   // read by src/check_stages.mjs: the step list's numbers are this model's output
  function draw(i){const [mode,j]=STR[i],s=SIM[mode][j],el=$('grid'),W=Math.max(280,Math.min(760,el.clientWidth||600)),cw=Math.floor((W-40)/PER),ch=Math.max(10,Math.min(16,cw));
    let h=RD.t(34,11,mode==='rows'?'summing row by row':'summing column by column',{fs:11.5,w:600,fill:mode==='rows'?'var(--good)':'var(--bad)'});const y0=18;
    for(let l=0;l<ROWS;l++){const y=y0+l*(ch+3),inC=s.cache.includes(l),got=s.fetched.has(l);
      h+=RD.t(28,y+ch-2,'L'+l,{a:'end',fs:9.5,fill:inC?'var(--ink)':'var(--mute)'});
      for(let k=0;k<PER;k++){const addr=l*LINE+k*SLOT,x=34+k*cw,u=s.used.has(addr),cur=addr===s.a;
        h+='<rect x="'+x+'" y="'+y+'" width="'+(cw-1)+'" height="'+ch+'" rx="1.5" style="fill:var(--c3);opacity:'+(got?(inC?.85:.35):.1)+(u?';stroke:var(--ink);stroke-width:1.1':'')+'"/>';
        if(cur)h+='<rect x="'+(x-1.5)+'" y="'+(y-1.5)+'" width="'+(cw+2)+'" height="'+(ch+3)+'" rx="2" style="fill:none;stroke:var(--bad);stroke-width:2.5"/>'}}
    const H=y0+ROWS*(ch+3);
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Cache lines of the matrix">'+h+'</svg>';
    const fetchedB=s.misses*LINE,usedB=s.used.size*SLOT;
    $('stats').innerHTML='<p class="small"><b>'+f(j+1,0)+'</b> of 512 elements summed by '+(mode==='rows'?'rows':'columns')+' · <b>'+f(s.misses,0)+'</b> lines fetched · <b>'+f(fetchedB,0)+'</b> bytes moved · <b>'+f(usedB,0)+'</b> used ('+f(100*usedB/fetchedB,0)+'%)</p>';
    const V=CB.rowcol.v;
    $('meas').innerHTML=i===STR.length-1?'<b>Measured</b> on a 4096 x 4096 matrix: columns '+f(V.col.runs[0])+' ns against rows '+f(V.row.runs[0])+' ns per element, '+f(V.ratio.runs[0],0)+'x (three runs: '+f(V.ratio.min,0)+' to '+f(V.ratio.max,0)+'x).':'<span class="mute">At the last step: the measured result for the real program.</span>'}
  const A=RD.anim({card:'cb-cm-card',ctl:'cb-cm-ctl',n:STR.length,ms:4800,label:'Cache step',list:'sx-rc',draw});
  X.onRender('t-read',()=>A.redraw());X.onResize('t-read',()=>A.redraw());
})();
