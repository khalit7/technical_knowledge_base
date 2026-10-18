// ---- Compare architectures tab: scatter (animated between conventions), filterable table with strips, diff ----
(function(){
  const G=window.AG;if(!G||!document.getElementById('cm-t'))return;
  const {rows,by,$,fmt,fmtB,esc,A,FAM}=G;const T=131072;
  const R=rows.filter(r=>r.status!=='tiny');
  const yv=(r,m)=>r.kv?(m==='h'?r.kv:r.kvw):(r.status==='galkv'?r.gal:null);
  let fam='all',q='',sort='dt',sel='Gemma 4 31B',mode='h',drawn={},tw=null;
  $('cm-leg').innerHTML=Object.keys(FAM).map(k=>'<span><i style="background:'+FAM[k][1]+'"></i>'+FAM[k][0]+'</span>').join('');
  $('cm-leg2').innerHTML=G.legend();
  const F=[['all','All']].concat(Object.keys(FAM).map(k=>[k,FAM[k][0]])).concat([['nocfg','No config']]);
  const famOf=r=>r.mix?r.fam:'nocfg';
  $('cm-f').innerHTML=F.map(f=>'<button data-f="'+f[0]+'"'+(f[0]==='all'?' class="on"':'')+'>'+f[1]+' ('+(f[0]==='all'?R.length:R.filter(r=>famOf(r)===f[0]).length)+')</button>').join('');
  $('cm-f').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;fam=b.dataset.f;$('cm-f').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));table()});
  $('cm-q').addEventListener('input',e=>{q=e.target.value.toLowerCase();table()});
  $('cm-s').addEventListener('change',e=>{sort=e.target.value;table()});
  G.seg($('cm-y'),m=>{const from=mode;mode=m;move(from,m)});
  const attTxt=r=>!r.mix?'':r.dc&&r.mt!=='Motif'?'MLA: '+r.H+' heads, latent '+r.dc+(r.dr?' + RoPE key '+r.dr:''):(r.H+' query / '+r.Hkv+' KV heads × '+r.dh+(r.W?', window '+fmt(r.W):''));
  const expTxt=r=>r.E?r.E+' routed, '+(r.k||'?')+' active'+(r.sh?', '+r.sh+' shared':''):'dense';
  function list(){let a=R.filter(r=>(fam==='all'||famOf(r)===fam)&&(!q||(r.n+' '+(r.co||'')).toLowerCase().includes(q)));
    const k={dt:r=>r.dt,kv:r=>yv(r,'h')||0,kvw:r=>yv(r,'w')||0,n:r=>r.n.toLowerCase(),L:r=>r.L||0}[sort];
    a.sort((x,y)=>{const u=k(x),v=k(y);return u<v?-1:u>v?1:0});if(sort==='kv'||sort==='kvw'||sort==='L')a.reverse();return a}
  function table(){const a=list();
    let h='<thead><tr><th>Model</th><th class="num">Layers</th><th>Attention</th><th>Mixer · FFN · position</th><th>Experts</th><th class="num">KV / token</th><th class="num">At 131K</th><th class="num">Gallery</th><th></th></tr></thead><tbody>';
    a.forEach(r=>{h+='<tr data-n="'+esc(r.n)+'"'+(sel===r.n?' class="sel"':'')+'><td><b>'+esc(r.n)+'</b><br><span class="mute">'+esc(r.co||'')+' · <span style="white-space:nowrap">'+r.dt+'</span></span></td><td class="num">'+(r.L||'')+((r.passes||1)>1?' ×'+r.passes:'')+'</td><td>'+attTxt(r)+'</td><td class="st">'+G.strips(r)+'</td><td>'+(r.mix?expTxt(r):'')+'</td><td class="num">'+(r.kv?fmtB(r.kv):'')+'</td><td class="num">'+(r.kvw?fmtB(r.kvw):'')+'</td><td class="num">'+esc(r.galtxt||'')+'</td><td>'+G.statusTxt(r)+'</td></tr>'});
    $('cm-t').innerHTML=h+'</tbody>';$('cm-cnt').textContent=a.length+' of '+R.length+' rows shown. "At 131K": average bytes per token held by one 131,072-token request with windows credited.'}
  $('cm-t').addEventListener('click',e=>{const tr=e.target.closest('tr[data-n]');if(tr)pick(tr.dataset.n)});
  function pick(n){sel=n;const a=$('cm-a'),b=$('cm-b');if(a.value!==n){b.value=a.value;a.value=n}diff();table();scatter(1)}
  // scatter
  let geo=null;
  function frame(){const W=Math.max(300,Math.min(880,G.width($('cm-sc')))),H=W<520?260:300,pl=W<520?58:66,pr=10,pt=10,pb=28,x0=2024.45,x1=2026.85;
    const lg=Math.log10,y0=lg(3*1024),yT=lg(2*G.MiB);
    return {W,H,pl,pr,pt,pb,X:v=>pl+(W-pl-pr)*(Math.max(x0,Math.min(x1,v))-x0)/(x1-x0),Y:v=>pt+(H-pt-pb)*(1-(lg(Math.max(3*1024,v))-y0)/(yT-y0))}}
  function scatter(u,from){geo=frame();const {W,H,pl,pr,pt,pb,X,Y}=geo;
    let s='';[[4*1024,'4 KiB'],[16*1024,'16 KiB'],[64*1024,'64 KiB'],[256*1024,'256 KiB'],[1024*1024,'1 MiB']].forEach(([v,l])=>{s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(v).toFixed(1)+'" y2="'+Y(v).toFixed(1)+'" stroke="var(--line)"/><text x="'+(pl-5)+'" y="'+(Y(v)+4).toFixed(1)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+l+'</text>'});
    [2024.5,2025,2025.5,2026,2026.5].forEach(v=>{s+='<text x="'+X(v).toFixed(1)+'" y="'+(H-10)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+(v%1?(W<520?'':'mid '):'')+(v%1&&W<520?'':Math.floor(v))+'</text>'});
    R.forEach(r=>{const a=yv(r,from||mode),b=yv(r,mode);if(a==null||b==null)return;const v=Math.exp(Math.log(a)+(Math.log(b)-Math.log(a))*(u==null?1:u)),on=sel===r.n,c=FAM[r.fam]?FAM[r.fam][1]:'var(--mute)';
      s+='<circle cx="'+X(r.y).toFixed(1)+'" cy="'+Y(v).toFixed(1)+'" r="'+(on?6:4)+'" fill="'+c+'" fill-opacity="'+(on?1:.78)+'" stroke="'+(on?'var(--ink)':'var(--bg)')+'" stroke-width="'+(on?2:1)+'" data-n="'+esc(r.n)+'" style="cursor:pointer"><title>'+esc(r.n)+' ('+r.dt+'): '+fmtB(b)+' per token</title></circle>'});
    s+='<text x="12" y="'+((pt+H-pb)/2)+'" font-size="11" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 12 '+((pt+H-pb)/2)+')">KV per token, bf16 (log)</text>';
    $('cm-sc').innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="KV cache per token against release date">'+s+'</svg>'}
  $('cm-sc').addEventListener('click',e=>{const c=e.target.closest('circle[data-n]');if(c)pick(c.dataset.n)});
  // before/after: the same dots move from the card's figure to the held figure (no tween under reduced motion)
  function move(from,to){if(tw)cancelAnimationFrame(tw);if(G.RM||$('t-cmp').hidden){scatter(1);return}const t0=performance.now(),D=900;
    const step=t=>{const u=Math.min(1,(t-t0)/D),e=u<.5?2*u*u:1-2*(1-u)*(1-u);scatter(e,from);if(u<1)tw=requestAnimationFrame(step);else tw=null};tw=requestAnimationFrame(step)}
  // diff
  const opts=R.filter(r=>r.mix).map(r=>'<option>'+esc(r.n)+'</option>').join('');$('cm-a').innerHTML=opts;$('cm-b').innerHTML=opts;
  $('cm-a').value='Gemma 4 31B';$('cm-b').value='Qwen3.6 27B';
  ['cm-a','cm-b'].forEach(i=>$(i).addEventListener('change',diff));
  const FL=[['Lab','co'],['Released','dt'],['Scale (gallery)','sc'],['Attention (gallery)','att'],['Layer mix (gallery)','mixg'],['Layers','L'],['Hidden size','D'],['Query heads','H'],['KV heads','Hkv'],['Head dim','dh'],['MLA latent + RoPE key',r=>r.dc&&r.mt!=='Motif'?r.dc+' + '+(r.dr||0):''],['Window',r=>r.W?fmt(r.W):''],['Routed experts','E'],['Active per token','k'],['Shared experts','sh'],['RoPE base','theta'],['RoPE scaling','scale'],['Vocabulary',r=>r.V?fmt(r.V):''],['Max positions (config)',r=>r.ctxc?fmt(r.ctxc):''],['Context (gallery)','cx'],['State per linear layer',r=>r.st?fmt(r.st)+' numbers':''],['KV per token',r=>r.kv?fmtB(r.kv):''],['Held at 131K, windows credited',r=>r.kvw?fmtB(r.kvw):''],['KV per token (gallery)','galtxt'],['Licence (gallery)','lic'],['Notes','note']];
  function diff(){const a=by[$('cm-a').value],b=by[$('cm-b').value];if(!a||!b)return;
    const v=(r,f)=>{const x=typeof f[1]==='function'?f[1](r):r[f[1]];return x==null?'':String(typeof x==='number'?fmt(x,x%1?2:0):x)};
    let h='<div class="tw"><table class="cm-d"><thead><tr><th></th><th>'+esc(a.n)+'</th><th>'+esc(b.n)+'</th></tr></thead><tbody>';
    FL.forEach(f=>{const u=v(a,f),w=v(b,f);if(!u&&!w)return;const d=u!==w;h+='<tr><td class="mute">'+f[0]+'</td><td'+(d?' class="d"':'')+'>'+esc(u)+'</td><td'+(d?' class="d"':'')+'>'+esc(w)+'</td></tr>'});
    h+='<tr><td class="mute">Config</td><td>'+A(a.cfg,'config')+(a.tr?' · '+A(a.tr,'report'):'')+'</td><td>'+A(b.cfg,'config')+(b.tr?' · '+A(b.tr,'report'):'')+'</td></tr></tbody></table></div>';
    h+='<div class="cm-ds"><span>'+esc(a.n)+'</span>'+G.strips(a)+'<span>'+esc(b.n)+'</span>'+G.strips(b)+'</div><p class="small mute">Highlighted cells differ. Strips are each model\'s own layer count stretched to the same width.</p>';
    $('cm-diff').innerHTML=h}
  G.onTab('t-cmp',()=>{table();scatter(1);diff()});
  let rw=0;addEventListener('resize',()=>{const w=$('cm-sc').clientWidth;if(!$('t-cmp').hidden&&w&&Math.abs(w-rw)>40){rw=w;scatter(1)}});
})();
