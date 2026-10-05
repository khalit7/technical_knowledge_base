// ---- Part 2, Cache simulator tab: AoS vs SoA and rows vs columns, one access per step ----
(function(){
  const X=window.CBX,CB=X.CB,f=X.fmt,$=id=>document.getElementById(id);
  if(!$('cb-cs-grid'))return;
  const LINE=128,SLOT=4,PER=LINE/SLOT,CAP=8;
  const FIELDS=['id','logprob','user','pos','temp','top_p','seq','flags'];
  const COLS=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)','var(--mute)','var(--dim)'];
  const st={task:'field',mode:'aos'};
  // a scenario: list of accesses (byte addresses), and a function giving each slot's label/colour
  function scen(){
    if(st.task==='field'){const N=64;
      if(st.mode==='aos')return {lines:N*32/LINE,acc:[...Array(N)].map((_,i)=>i*32+4),slot:s=>({c:COLS[s%8],t:FIELDS[s%8]}),
        what:'array of 64 Token records, 32 bytes each (8 fields); the loop reads <code>t.logprob</code>, the 2nd field of each',meas:()=>'Measured on 20 M records, integer field: AoS '+f(CB.aos.v.i_aos.runs[0])+' ns against SoA '+f(CB.aos.v.i_soa.runs[0])+' ns per record, '+f(CB.aos.v.i_aos.runs[0]/CB.aos.v.i_soa.runs[0],1)+'x (three runs: '+f(CB.aos.v.i_aos.min/CB.aos.v.i_soa.max,1)+' to '+f(CB.aos.v.i_aos.max/CB.aos.v.i_soa.min,1)+'x).'};
      return {lines:N*4/LINE,extra:7,acc:[...Array(N)].map((_,i)=>i*4),slot:()=>({c:COLS[1],t:'logprob'}),
        what:'struct of arrays: the 64 <code>logprob</code> values are contiguous (the other 7 arrays live elsewhere and are never touched)',meas:()=>'Measured: SoA was '+f(CB.aos.v.i_aos.runs[0]/CB.aos.v.i_soa.runs[0],1)+'x faster for one field, about '+f(CB.aos.v.a_aos.runs[0]/CB.aos.v.a_soa.runs[0],2)+'x when all 8 fields are used.'}}
    const R=16,C=32;
    const acc=[];if(st.mode==='rows'){for(let r=0;r<R;r++)for(let c=0;c<C;c++)acc.push((r*C+c)*4)}else{for(let c=0;c<C;c++)for(let r=0;r<R;r++)acc.push((r*C+c)*4)}
    return {lines:R,acc,slot:s=>({c:'var(--c3)',t:''}),what:'a 16 x 32 matrix of 4-byte integers stored row after row (one row = one line), summed '+(st.mode==='rows'?'row by row':'column by column'),
      meas:()=>'Measured on a 4096 x 4096 matrix: columns '+f(CB.rowcol.v.col.runs[0])+' ns against rows '+f(CB.rowcol.v.row.runs[0])+' ns per element, '+f(CB.rowcol.v.ratio.runs[0],0)+'x (three runs: '+f(CB.rowcol.v.ratio.min,0)+' to '+f(CB.rowcol.v.ratio.max,0)+'x).'};
  }
  let S=scen(),sim=[];
  // simulate the whole sequence once: state after each access
  function simulate(){S=scen();sim=[];let cache=[],fetched=new Set(),used=new Set(),misses=0;
    S.acc.forEach((a,k)=>{const ln=Math.floor(a/LINE);const hit=cache.includes(ln);if(!hit){misses++;cache.push(ln);if(cache.length>CAP)cache.shift()}else{cache=cache.filter(x=>x!==ln);cache.push(ln)}
      fetched.add(ln);used.add(a);sim.push({a,ln,hit,misses,cache:cache.slice(),fetched:new Set(fetched),used:new Set(used)})})}
  function draw(i){const el=$('cb-cs-grid'),W=Math.max(290,Math.min(760,el.clientWidth||600)),cw=Math.floor((W-40)/PER),ch=Math.max(11,Math.min(18,cw));
    const s=sim[i]||sim[0];let h='';const nl=S.lines;
    for(let l=0;l<nl;l++){const y=l*(ch+3),inC=s.cache.includes(l),got=s.fetched.has(l);
      h+=RD.t(28,y+ch-2,'L'+l,{a:'end',fs:9.5,fill:inC?'var(--ink)':'var(--mute)'});
      for(let k=0;k<PER;k++){const addr=l*LINE+k*SLOT,sl=S.slot(addr/SLOT),x=34+k*cw,u=s.used.has(addr),cur=addr===s.a;
        h+='<rect x="'+x+'" y="'+y+'" width="'+(cw-1)+'" height="'+ch+'" rx="1.5" style="fill:'+sl.c+';opacity:'+(got?(inC?.85:.4):.12)+(u?';stroke:var(--ink);stroke-width:1.2':'')+'"/>';
        if(cur)h+='<rect x="'+(x-1.5)+'" y="'+(y-1.5)+'" width="'+(cw+2)+'" height="'+(ch+3)+'" rx="2" style="fill:none;stroke:var(--bad);stroke-width:2.5"/>'}}
    const H=nl*(ch+3)+(S.extra?22:0);if(S.extra)h+=RD.t(34,H-6,'+ 7 more arrays (id, user, pos, ...) elsewhere in memory: never fetched',{fs:10.5,fill:'var(--mute)'});
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Cache lines of the data">'+h+'</svg>';
    const fetchedB=s.misses*LINE,usedB=s.used.size*SLOT,n=S.acc.length;
    $('cb-cs-cap').innerHTML='<b>Access '+(i+1)+' of '+n+'</b>: byte '+s.a+', in line L'+s.ln+': '+(s.hit?'<b style="color:var(--good)">hit</b>, the line is already in the cache.':'<b style="color:var(--bad)">miss</b>, the whole 128-byte line is fetched'+(s.cache.length>=CAP&&st.task==='matrix'?', evicting the least recently used one.':'.'))+'<br><span class="small mute">Data: '+S.what+'.</span>';
    $('cb-cs-stats').innerHTML=RD.stat('Elements summed',f(i+1,0),'of '+n)+RD.stat('Lines fetched',f(s.misses,0),'misses')+RD.stat('Bytes moved',f(fetchedB,0),'from memory')+RD.stat('Bytes used',f(usedB,0),f(100*usedB/fetchedB,0)+'% of bytes moved');
    $('cb-cs-meas').innerHTML=i===n-1?'<b>Measured:</b> '+S.meas():'<span class="mute">At the end: the measured result for the real program.</span>'}
  const opt={card:'cb-cs-card',ctl:'cb-cs-ctl',n:64,ms:420,label:'Access',draw(i){if(!sim.length)simulate();draw(i)}};const A=RD.anim(opt);
  function modes(){const m=$('cb-cs-mode');m.innerHTML=st.task==='field'?'<button data-m="aos" class="on">AoS (before)</button><button data-m="soa">SoA (after)</button>':'<button data-m="rows" class="on">By rows</button><button data-m="cols">By columns</button>';st.mode=st.task==='field'?'aos':'rows'}
  function restart(){simulate();opt.ms=st.task==='field'?420:45;A.reset(S.acc.length);A.play()}
  RD.seg($('cb-cs-task'),v=>{st.task=v;modes();restart()});
  RD.seg($('cb-cs-mode'),v=>{st.mode=v;restart()});
  modes();simulate();A.reset(S.acc.length);
  X.onRender('t-cb-cache',()=>A.redraw());X.onResize('t-cb-cache',()=>A.redraw());
})();
