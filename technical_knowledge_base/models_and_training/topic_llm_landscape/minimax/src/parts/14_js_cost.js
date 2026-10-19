// ---- Cost by context tab: stored, read and computed per decoded token, against context ----
(function(){
  if(!$('ccSvg'))return;
  const T=[4096,8192,16384,32768,65536,131072,262144,524288,1048576,2097152,4194304];
  let M='st';
  const fn={st:stored,rd:readB,cp:compB};
  const unit={st:fmtBytes,rd:fmtBytes,cp:v=>sci(v,2)};
  const ttl={st:'KV memory stored per sequence (all layers)',rd:'Bytes read by one decoded token (all layers)',cp:'Attention multiply-adds per decoded token (all layers)'};
  function draw(){
    const o={all:$('ccAll').checked,idx:$('ccIdx').checked},n=T[+$('ccT').value];$('ccTv').textContent=fmt(n)+' tokens';
    const f=fn[M],keys=['h01','s01','m2','m3'];
    let lo=Infinity,hi=0;keys.forEach(k=>T.forEach(t=>{const v=f(k,t,o);lo=Math.min(lo,v);hi=Math.max(hi,v)}));
    let y0,y1,yt=[];
    if(M==='cp'){y0=Math.pow(10,Math.floor(Math.log10(lo)));y1=Math.pow(10,Math.ceil(Math.log10(hi)));for(let e=Math.log10(y0);e<=Math.log10(y1);e++)yt.push([Math.pow(10,e),'10'+sup(e)])}
    else{const C=[[MiB,'1 MiB'],[10*MiB,'10 MiB'],[100*MiB,'100 MiB'],[GiB,'1 GiB'],[10*GiB,'10 GiB'],[100*GiB,'100 GiB'],[1000*GiB,'1,000 GiB'],[10000*GiB,'10,000 GiB']];
      let a=0,b=C.length-1;while(a<C.length-1&&C[a+1][0]<=lo)a++;while(b>0&&C[b-1][0]>=hi)b--;yt=C.slice(a,b+1);y0=yt[0][0];y1=yt[yt.length-1][0]}
    const W=vw('ccSvg',660,380),H=W<500?300:330,F=logFrame({W,H,pl:62,pr:W<500?100:128,pt:12,pb:38,x:[4096,4194304],y:[y0,y1],yt,xt:[[4096,'4K'],[32768,'32K'],[262144,'256K'],[1048576,'1M'],[4194304,'4M']],xl:'context (tokens, log scale)'});
    let s=F.s;const ends=[];
    keys.forEach(k=>{const md=MODELS[k];let a='',b='';const pts=[];for(let e=12;e<=22;e+=0.1){const t=Math.pow(2,e);pts.push([t,f(k,t,o)])}
      pts.forEach(([t,v],i)=>{const p=F.lx(t).toFixed(1)+','+F.ly(v).toFixed(1);if(t<=md.win*1.0001)a+=(a?'L':'M')+p;else b+=(b?'L':'M')+p});
      const wv=f(k,md.win,o);b='M'+F.lx(md.win).toFixed(1)+','+F.ly(wv).toFixed(1)+b.replace(/^M/,'L');
      s+='<path d="'+a+'" fill="none" stroke="'+md.c+'" stroke-width="2.4"'+(md.hyp?' stroke-dasharray="5 3"':'')+'/><path d="'+b+'" fill="none" stroke="'+md.c+'" stroke-width="1.6" opacity=".35" stroke-dasharray="2 3"/>';
      s+='<circle cx="'+F.lx(md.win)+'" cy="'+F.ly(wv)+'" r="3" fill="'+md.c+'"/>';
      ends.push({y:F.ly(f(k,4194304,o)),n:md.n,c:md.c,how:md.n+': window '+fmt(md.win)+' tokens'})});
    s+='<line x1="'+F.lx(n)+'" x2="'+F.lx(n)+'" y1="12" y2="'+(H-38)+'" stroke="var(--ink)" stroke-dasharray="2 3"/>';
    keys.forEach(k=>{s+='<circle cx="'+F.lx(n)+'" cy="'+F.ly(f(k,n,o))+'" r="4" fill="var(--bg)" stroke="'+MODELS[k].c+'" stroke-width="2"/>'});
    s+=endLabels(ends,W-(W<500?96:122),14);
    $('ccSvg').innerHTML='<div class="small mute">'+ttl[M]+'</div>'+svgEl(W,H,s,ttl[M]);
    const base=f('m2',n,o);
    $('ccTab').innerHTML='<tr><th>At '+fmt(n)+' tokens</th><th class="num">'+(M==='cp'?'Multiply-adds':'Bytes')+'</th><th class="num">Against M2</th><th>Window</th></tr>'+keys.map(k=>{const v=f(k,n,o),md=MODELS[k];return '<tr><td><span style="color:'+md.c+'">■</span> '+md.n+(md.hyp?' (hypothetical)':'')+'</td><td class="num">'+unit[M](v)+'</td><td class="num">'+(k==='m2'?'1':(base/v>=1?(base/v).toFixed(1)+'× less':(v/base).toFixed(1)+'× more'))+'</td><td>'+(n>md.win?'<span class="mute">beyond its '+fmt(md.win)+'</span>':'within')+'</td></tr>'}).join('');
    const r=compB('m2',1048576)/compB('m3',1048576,o);
    $('ccNote').innerHTML=M==='st'?'MiniMax-01 includes its fixed 140 MiB state (BF16 assumed). M3 '+(o.idx?'includes':'excludes')+' its index keys, 256 bytes per token in each of 57 layers. Storage is where MSA saves nothing: M3 is below M2 only because it has 4 KV heads per layer instead of 8.':M==='rd'?'Decode is memory-bound, so bytes read per token is the closest of the three to decode speed. M3 reads all index keys plus 16 blocks per group in its 57 MSA layers, and everything in its first 3 layers'+(o.all?' (here: none, all 60 sparse)':'')+'.':'At 1M, M2 against M3 is '+r.toFixed(1)+'× with these settings; MiniMax quote 1/20 without stating their accounting. Lightning layers cost the same at any context, which is why MiniMax-01 looks flat until its softmax layers dominate.'}
  segBind('ccM',m=>{M=m;draw()});['ccAll','ccIdx'].forEach(id=>$(id).addEventListener('change',draw));$('ccT').addEventListener('input',draw);
  onTab('t-cost',draw);
})();
