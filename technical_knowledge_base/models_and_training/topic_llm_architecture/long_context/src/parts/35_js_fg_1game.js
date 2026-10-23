// "Fit the model" game (tab t-game, prefix fg). The rules are the mechanism: one user's cache is KC.seq at the brief's
// context (the calculator's engine), weights are params x bytes, usable memory is 92% of each GPU as in the calculator,
// and every quality price comes from window.EVD (this page's runs) or window.FGQ (quoted, with sources). Nothing moves
// until the reader clicks: the only animation is a short flash when a click makes the board stop fitting.
window.FG=(function(){
  if(!window.KC||!window.FGL||!window.FGQ||!window.EVD)return null;
  const UTIL=0.92,GiB=1073741824;
  const ser=(pol,f)=>EVD.series.find(x=>x.pol===pol&&(f===undefined||Math.abs(x.f-f)<1e-9));
  const FULL=ser('full').pk,NPK=EVD.n_pk;
  const pts=pk=>Math.round((FULL-pk)*1000)/10;            // percentage points of the 30 prompts given up
  const right=pk=>Math.round(pk*NPK);
  const PREC={2:{pol:null},1:{pol:'q_tok8'},0.5625:{pol:'q_tok4'}};
  const precPk=kvb=>PREC[kvb].pol?ser(PREC[kvb].pol).pk:FULL;
  const evPk=(keep,q)=>keep===1?FULL:ser(q==='with'?'snapkv':'snapkv_doc',keep).pk;
  const DES={cfg:'As released',mha:'MHA',gqa8:'GQA-8',mqa:'MQA',mla:'MLA (512 + 64)',swa:'Every layer windowed, 4,096',lg51:'5 local : 1 global, window 1,024'};
  const RELN={mha:'MHA',gqa8:'GQA-8',mla:'MLA'};
  // MMLU points given up moving from the released design r to d; null when no published comparison exists
  function desCost(r,d){
    if(d==='cfg'||d===r)return 0;
    const T8=FGQ.t8,T9=FGQ.t9;
    if(r in T8&&d in T8)return Math.round((T8[r]-T8[d])*10)/10;
    if(r in T9&&d in T9)return Math.round((T9[r]-T9[d])*10)/10;
    return null}
  function memory(L,st){
    const p0=KC.byKey[L.model],p=KC.redesign(p0,st.des),o={kvb:st.kvb,sb:4,keep:st.keep};
    const one=KC.seq(p,L.ctx,o).total,W=p0.params*L.wdt,g=KCD.gpus[L.gpu],cap=g[1]*1e9*st.n*UTIL,need=W+st.users*one;
    return {one,W,cap,need,g,fits:need<=cap,over:need-cap}}
  function quality(L,st){
    const r={mmlu:0,pk:0,unp:[],bad:[],gain:0};
    if(st.des==='swa'||st.des==='lg51'){r.unp.push(DES[st.des]);
      if(L.far&&st.des==='swa'&&L.ctx>4096)r.bad.push('every layer windowed: no layer reads a token older than 4,096 directly')}
    else if(st.des!=='cfg'){const c=desCost(L.rel,st.des);if(c===null)r.unp.push(DES[st.des]+' instead of '+RELN[L.rel]);else if(c>0)r.mmlu+=c;else r.gain=-c}
    r.pk=Math.round((pts(precPk(st.kvb))+pts(evPk(st.keep,L.q)))*10)/10;
    return r}
  function evaluate(L,st){
    const m=memory(L,st),q=quality(L,st);
    const okQ=q.mmlu<=L.mmlu+1e-9&&q.pk<=L.pk+1e-9&&!q.bad.length,okU=st.users>=L.users,okN=st.n<=L.maxN;
    return {m,q,okQ,okU,win:m.fits&&okQ&&okU&&okN,score:Math.round((q.mmlu+q.pk+st.n)*10)/10}}
  const start=L=>({des:'cfg',kvb:2,keep:1,n:L.n,users:L.users});
  const refState=L=>Object.assign(start(L),L.ref);
  return {UTIL,GiB,ser,FULL,NPK,pts,right,precPk,evPk,desCost,memory,quality,evaluate,start,refState,DES,RELN};
})();
(function(){
  const FG=window.FG;if(!FG||!LC.$('fg-board'))return;
  const $=LC.$,E=LC.esc,root=$('t-game'),KEY='lc-fg';
  let best={};try{best=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(e){best={}}
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(best))}catch(e){}};
  let li=0,st=FG.start(FGL[0]),shown=false,lastFit=null;
  const gbs=b=>LC.gb(b),fx=x=>Number.isInteger(x)?String(x):LC.fmt(x,1);
  const kfmt=n=>LC.int(n);
  const ptsTxt=(v,u)=>v===0?'0 '+u:'&minus;'+fx(v)+' '+u;
  const sec=(t,id)=>id==='t-kv'?'<a href="#" data-tab="t-kv">'+t+'</a>':id==='av'?'<a href="https://app.notion.com/p/3fd5c17b0d0d8120859ecc2d0236e846" target="_blank" rel="noopener noreferrer">'+t+'</a>':'<a href="#" data-tab="t-read" data-sec="'+id+'">'+t+'</a>';
  const precName={2:'bf16',1:'FP8',0.5625:'INT4'};
  const keepName=k=>k===1?'keep all':'keep '+(k*100)+'%';
  function gpuCounts(L){return [1,2,4,8,16].filter(n=>n<=L.maxN)}
  function userCounts(L){const U=L.users;return [...new Set([U,Math.round(U*3/4),Math.round(U/2),Math.round(U/4)])].filter(x=>x>0)}
  // levels bar
  function drawLevels(){
    $('fg-lv').innerHTML=FGL.map((L,i)=>'<button data-l="'+i+'"'+(i===li?' class="on" aria-pressed="true"':' aria-pressed="false"')+'>'+(i+1)+'. '+E(L.name)+(best[i]!==undefined?'<span class="s" title="your best score">&#10003; '+fx(best[i])+'</span>':'')+'</button>').join('')}
  function drawBrief(){
    const L=FGL[li],g=KCD.gpus[L.gpu];
    const lim=[];if(L.retrain)lim.push('at most '+L.mmlu+' MMLU points');lim.push('at most '+L.pk+' pass-key points');
    const line=E(L.mlabel)+' &middot; '+L.users+' users &middot; '+kfmt(L.ctx)+' tokens each &middot; '+L.n+' &times; '+E(g[0])+' '+g[1]+' GB (up to '+L.maxN+') &middot; give up '+lim.join(' and ');
    const rules=[L.retrain?'<span>Training a new model: attention may change</span>':'<span class="x">Released weights: no retraining</span>',
      L.q==='with'?'<span>The question arrives with the document</span>':'<span class="x">The question arrives after the document is cached</span>',
      'weights in '+(L.wdt===2?'bf16':'fp8')].map(x=>x[0]==='<'?x:'<span>'+x+'</span>');
    if(L.far)rules.push('<span class="x">Every old token must stay reachable</span>');
    $('fg-brief').innerHTML='<div class="t">Level '+(li+1)+' of '+FGL.length+': '+E(L.name)+'</div><div class="l">'+line+'.</div><div class="fg-rules">'+rules.join('')+'</div><p class="fg-new">'+L.isnew+'</p>'}
  // board: one column per GPU, HBM to scale; weights at the bottom, one brick per user's cache (split evenly over GPUs)
  function drawBoard(ev){
    const L=FGL[li],m=ev.m,el=$('fg-svg'),CW=LC.width(el),n=st.n,HBM=m.g[1];
    const narrow=CW<520,colH=narrow?190:230,top=18,bot=20,left=narrow?52:62,dem=(m.W+st.users*m.one)/1e9/n,reserve=Math.round(Math.min(colH*0.42,Math.max(4,(dem-HBM)/HBM*colH+6)));
    const H=top+reserve+colH+bot,gap=n>8?3:6,avail=CW-left-6,colW=Math.max(12,Math.min(narrow?90:150,(avail-gap*(n-1))/n));
    const x0=left+Math.max(0,(avail-(colW*n+gap*(n-1)))/2),yb=top+reserve+colH,ppg=colH/HBM;
    const usable=HBM*FG.UTIL,yU=yb-usable*ppg,yMax=top+6;
    const wG=m.W/1e9/n,uG=m.one/1e9/n;let s='<defs><pattern id="fg-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="var(--bad)" fill-opacity="0.22"/><line x1="1.5" y1="0" x2="1.5" y2="7" stroke="var(--bad)" stroke-width="3"/></pattern></defs>';
    s+=LC.t(left-6,yb-colH+4,HBM+' GB',{a:'end',fill:'var(--mute)'})+LC.t(left-6,yU+4,'92%',{a:'end',fill:'var(--ink)'})+LC.t(left-6,yb,'0',{a:'end',fill:'var(--mute)'});
    const rect=(x,y,w,h,f,extra)=>h>0?'<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+h.toFixed(1)+'" fill="'+f+'"'+(extra||'')+'/>':'';
    // clip a block [a,b] in GB (per GPU) into a fitting part and an overflowing part, drawn up to yMax
    function block(x,a,b,fill,sep,op){let o='';const ya=yb-a*ppg,yt=Math.max(yMax,yb-b*ppg),ex=op?' fill-opacity="'+op+'"':'';
      if(ya>yU)o+=rect(x,Math.max(yt,yU),colW,ya-Math.max(yt,yU),fill,ex);
      if(yt<yU)o+=rect(x,yt,colW,Math.min(ya,yU)-yt,'url(#fg-hatch)','');
      if(sep&&ya-yt>=3&&yt>yMax)o+='<line x1="'+x.toFixed(1)+'" x2="'+(x+colW).toFixed(1)+'" y1="'+yt.toFixed(1)+'" y2="'+yt.toFixed(1)+'" stroke="var(--bg)" stroke-width="1"/>';
      return o}
    const brickPx=uG*ppg;
    for(let k=0;k<n;k++){const x=x0+k*(colW+gap);
      s+=rect(x,yb-colH,colW,colH,'var(--soft)',' stroke="var(--line)"');
      s+=block(x,0,wG,'var(--c4)',false);
      if(brickPx>=2.5){for(let u=0;u<st.users;u++){const a=wG+u*uG;if(yb-a*ppg<yMax)break;s+=block(x,a,a+uG,'var(--acc)',true,u%2?0:0.62)}}
      else s+=block(x,wG,wG+st.users*uG,'var(--acc)',false);
      if(colW>=44&&wG*ppg>=15)s+=LC.t(x+colW/2,yb-Math.min(wG*ppg,colH)/2+4,'weights',{a:'middle',fill:'var(--bg)',fs:11});
      if(n===1&&colW>=60&&brickPx>=15){for(let u=0;u<Math.min(st.users,40);u++){const yc=yb-(wG+(u+0.5)*uG)*ppg;if(yc<yMax+8)break;s+=LC.t(x+colW/2,yc+4,'user '+(u+1),{a:'middle',fill:yc<yU?'var(--ink)':'var(--bg)',fs:11,w:yc<yU?600:400})}}
      s+=LC.t(x+colW/2,yb+14,n<=4?'GPU '+(k+1):n<=8?String(k+1):(k%2?'':String(k+1)),{a:'middle',fill:'var(--mute)'});
    }
    s+='<line x1="'+(left-2)+'" x2="'+(x0+n*(colW+gap)-gap+2).toFixed(1)+'" y1="'+yU.toFixed(1)+'" y2="'+yU.toFixed(1)+'" stroke="var(--ink)" stroke-dasharray="5 4" stroke-width="1.5"/>';
    const tot=(m.W+st.users*m.one)/1e9/n;
    if(yb-tot*ppg<yMax){s+='<path d="M'+x0+' '+(yMax+3)+'l'+(colW*n+gap*(n-1))/8+' -5'+(' l'+(colW*n+gap*(n-1))/8+' 5 l'+(colW*n+gap*(n-1))/8+' -5').repeat(3)+' l'+(colW*n+gap*(n-1))/8+' 5" fill="none" stroke="var(--bad)" stroke-width="1.5"/>';
      s+=LC.t(x0+(colW*n+gap*(n-1))/2,yMax-8+12-14,'cut off: '+LC.fmt(tot-HBM,1)+' GB per GPU above the top',{a:'middle',fill:'var(--bad)'})}
    el.innerHTML=LC.svg(CW,H,s,'GPU memory per GPU: weights and one brick per user\'s KV cache against the usable line');
    const p0=KC.byKey[L.model];
    $('fg-cap').innerHTML='Per GPU, to scale. Purple: weights, '+gbs(m.W)+' in all. Blue bricks: one per user, each '+gbs(m.one)+' of cache at '+kfmt(L.ctx)+' tokens ('+E(st.des==='cfg'?'as released, '+FG.RELN[L.rel]:FG.DES[st.des])+', '+(st.kvb===2?'bf16':st.kvb===1?'FP8':'INT4')+(st.keep<1?', '+(st.keep*100)+'% kept':'')+')'+(n>1?', split over '+n+' GPUs':'')+(brickPx<2.5?' (too thin to draw one by one here)':'')+'. Red hatching: past the dashed line, 92% of '+HBM+' GB, the calculator\'s usable memory.'+(p0.maxCtx&&L.ctx>p0.maxCtx?' Past the config\'s '+kfmt(p0.maxCtx)+' tokens: arithmetic only.':'')}
  function drawStatus(ev,flash){
    const L=FGL[li],m=ev.m,q=ev.q,b=[];
    b.push(m.fits?'<span class="big ok">Fits</span>':'<span class="big no" id="fg-nf">Does not fit: '+LC.fmt(m.over/1e9,2)+' GB over ('+LC.fmt(m.over/FG.GiB,2)+' GiB)</span>');
    b.push('<span>memory '+LC.fmt(m.need/1e9,1)+' of '+LC.fmt(m.cap/1e9,1)+' GB usable</span>');
    if(L.retrain)b.push('<span class="'+(q.mmlu<=L.mmlu?'':'no')+'">MMLU given up '+fx(q.mmlu)+' of '+L.mmlu+'</span>');
    b.push('<span class="'+(q.pk<=L.pk?'':'no')+'">pass-key given up '+fx(q.pk)+' of '+L.pk+'</span>');
    if(q.bad.length)b.push('<span class="no">fails the brief: '+E(q.bad[0])+'</span>');
    if(!ev.okU)b.push('<span class="no">brief not met: '+st.users+' of '+L.users+' users served</span>');
    b.push('<span>score <b>'+fx(ev.score)+'</b>'+(q.unp.length?' <span style="color:var(--c5)">+ '+q.unp.length+' unpriced</span>':'')+'</span>');
    if(ev.win)b.push('<span class="big ok">Brief met</span>');
    $('fg-st').innerHTML=b.join('');
    if(flash&&!m.fits&&lastFit===true){const x=$('fg-nf');if(x)x.classList.add('fg-flash')}
    lastFit=m.fits}
  // cards
  function opt(c,v,label,price,on,dis){return '<button data-c="'+c+'" data-v="'+v+'"'+(on?' class="on" aria-pressed="true"':' aria-pressed="false"')+(dis?' disabled':'')+'>'+label+'<span class="p">'+price+'</span></button>'}
  function saveTxt(d){return Math.abs(d)<5e6?'no change':(d>0?'saves ':'adds ')+LC.fmt(Math.abs(d)/1e9,1)+' GB'}
  function drawCards(ev){
    const L=FGL[li],need=s2=>FG.memory(L,s2).need,cur=need(st),h=[];
    const W=(k,v)=>Object.assign({},st,{[k]:v});
    L.cards.forEach(c=>{
      if(c==='prec'){const pk=FG.precPk(st.kvb);
        h.push('<div class="fg-card"><div class="h">Cache precision <span class="tag">no retraining</span></div><div class="fg-opts">'+
          [2,1,0.5625].map(v=>opt('kvb',v,{2:'bf16',1:'FP8 (8-bit)',0.5625:'INT4 (4.5 bits)'}[v],saveTxt(need(W('kvb',2))-need(W('kvb',v)))+' &middot; '+ptsTxt(FG.pts(FG.precPk(v)),'pass-key'),st.kvb===v)).join('')+'</div>'+
          '<p class="q">Quality: <b class="'+(FG.pts(pk)>0?'bad':'')+'">'+ptsTxt(FG.pts(pk),'pass-key points')+'</b> ('+FG.right(pk)+' of 30 prompts; '+(st.kvb===2?'the full cache':st.kvb===1?'8-bit integers per token, the closest run to FP8: FP8 itself was not run here':'4-bit per token; KIVI\'s per-channel keys answered 28 of 30 at 0.625 bytes, a layout the calculator does not price')+').</p>'+
          '<p class="fg-sp">Speed: decode reads every cached byte once per token, so 8 bits halve the read and 4.5 bits cut it to 28% ({{section 3|#t-read}}).</p>'+
          '<p class="src">Sources: '+FGQ.src.pk+' '+FGQ.src.q8+'</p></div>')}
      if(c==='evict'){const pk=FG.evPk(st.keep,L.q);
        h.push('<div class="fg-card"><div class="h">Evict to a token budget (SnapKV) <span class="tag">no retraining</span></div><div class="fg-opts">'+
          [1,0.5,0.25,0.125].map(v=>opt('keep',v,keepName(v),saveTxt(need(W('keep',1))-need(W('keep',v)))+' &middot; '+ptsTxt(FG.pts(FG.evPk(v,L.q)),'pass-key'),st.keep===v)).join('')+'</div>'+
          '<p class="q">Quality: <b class="'+(FG.pts(pk)>0?'bad':'')+'">'+ptsTxt(FG.pts(pk),'pass-key points')+'</b> ('+FG.right(pk)+' of 30). '+(L.q==='with'?'The question is in the prompt, so SnapKV keeps what the question attends to.':'The cache is compressed before the question arrives: SnapKV scored from the tokens before the question.')+'</p>'+
          '<p class="fg-sp">'+FGQ.src.blk+'</p><p class="src">Source: '+FGQ.src.pk+'</p></div>')}
      if(c==='des'||c==='win'){
        const isW=c==='win',set=isW?['cfg','swa','lg51']:['cfg','mha','gqa8','mqa','mla'].filter(d=>d==='cfg'||d!==L.rel);
        const lock=!L.retrain,selIn=set.includes(st.des)||st.des==='cfg';
        const lab=d=>d==='cfg'?(isW?'All layers global':'As released ('+FG.RELN[L.rel]+')'):FG.DES[d];
        const qtag=d=>{if(d==='cfg')return '0 MMLU';if(d==='swa'||d==='lg51')return 'no published number';const x=FG.desCost(L.rel,d);return x===null?'no published number':x<0?'+'+fx(-x)+' MMLU (gain)':ptsTxt(x,'MMLU')};
        let ql='';const d=selIn?st.des:'cfg';
        if(d==='cfg')ql='Quality: as released.';
        else if(d==='swa'||d==='lg51')ql='Quality: <b class="unp">no published number</b>. '+(d==='swa'&&L.far?'<b class="bad">Fails this brief:</b> no layer reads a token older than 4,096 directly. ':'');
        else{const x=FG.desCost(L.rel,d);ql='Quality: '+(x===null?'<b class="unp">no published number</b> for '+FG.DES[d]+' against '+FG.RELN[L.rel]+' (DeepSeek-V2 compares MLA with MHA, and GQA with MHA, in different setups; chaining them would invent a number).':x<0?'<b>+'+fx(-x)+' MMLU</b>: '+FG.DES[d]+' scored above '+FG.RELN[L.rel]+'; counted as 0 given up.':'<b class="'+(x>L.mmlu?'bad':'')+'">'+ptsTxt(x,'MMLU points')+'</b> ('+FG.DES[d]+' against '+FG.RELN[L.rel]+').')}
        const srcs=isW?FGQ.src.gem+(L.far?' '+FGQ.src.mix:''):((L.rel==='mla'||d==='mla')?FGQ.src.t9+' ':'')+FGQ.src.t8;
        let sp=isW?(d==='lg51'&&L.model==='llama-3.1-8b'&&L.ctx===131072?'Speed: local layers also cut prefill: attention falls from 70% to 28% of a 128K prompt\'s FLOPs on the 8B ({{section 9|#t-read}}).':'Local layers stop growing at their window; only global layers keep every token.')+' Keeps the released KV heads: the calculator\'s designs go one at a time, so this replaces the attention-design choice.':'Speed: '+FGQ.src.dec;
        if(L.rel==='mla'&&!isW){const p0=KC.byKey[L.model],a=KC.seq(p0,1,{kvb:2}).total,b=KC.seq(KC.redesign(p0,'mha'),1,{kvb:2}).total;sp='MHA at this shape would cache '+LC.bytes(b)+' per token against MLA\'s '+LC.bytes(a)+', '+LC.fmt(b/a,0)+' times more. '+sp}
        h.push('<div class="fg-card'+(lock?' lock':'')+'"><div class="h">'+(isW?'Local layers':'Attention design')+' <span class="tag rt">'+(lock?'locked':'retraining')+'</span></div>'+
          (lock?'<p class="lk">Released weights: switching attention means retraining (the GQA paper uptrains with 5% of the original compute), so this card is locked here.</p>':'<p class="lk">You choose the design of the model you will train; a released model cannot switch without retraining.</p>')+
          '<div class="fg-opts">'+set.map(v=>opt('des',v,lab(v),(lock&&v!=='cfg'?'':saveTxt(cur-need(W('des',v)))+' &middot; ')+qtag(v),selIn&&st.des===v,lock&&v!=='cfg')).join('')+'</div>'+
          '<p class="q">'+ql+'</p><p class="fg-sp">'+sp+'</p><p class="src">Sources: '+srcs+'</p></div>')}
      if(c==='gpu'){const g=KCD.gpus[L.gpu],m=ev.m,bw=g[2]*1e12*st.n;
        h.push('<div class="fg-card"><div class="h">Add a GPU (tensor parallel) <span class="tag">+1 score each</span></div><div class="fg-opts">'+
          gpuCounts(L).map(v=>opt('n',v,v+' &times; '+E(g[0]),(v===L.n?'the brief\'s':(v>L.n?'+':'&minus;')+LC.fmt(Math.abs(v-L.n)*g[1]*FG.UTIL,1)+' GB usable'),st.n===v)).join('')+'</div>'+
          '<p class="q">Quality: none. Weights and every cache split evenly, as in the calculator.</p>'+
          '<p class="fg-sp">Speed: bandwidth adds up. Decode ceiling at batch 1: '+LC.int(bw/(m.W+m.one))+' tokens/s ((weights + one cache) / '+LC.fmt(g[2]*st.n,2)+' TB/s, the calculator\'s formula).</p></div>')}
      if(c==='users'){
        h.push('<div class="fg-card"><div class="h">Serve fewer users <span class="tag">fails the brief</span></div><div class="fg-opts">'+
          userCounts(L).map(v=>opt('users',v,v+' users',v===L.users?'the brief':'frees '+LC.fmt((L.users-v)*ev.m.one/1e9,1)+' GB',st.users===v)).join('')+'</div>'+
          '<p class="q">Each user removed frees one brick, '+gbs(ev.m.one)+'. The client asked for '+L.users+': use this to see how many fit, not to win.</p></div>')}
    });
    $('fg-cards').innerHTML=h.join('').replace(/\{\{([^|{}]+)\|#t-read\}\}/g,'<a href="#" data-tab="t-read">$1</a>')}
  function moves(L,s){const m=[];
    if(s.des!=='cfg')m.push(FG.DES[s.des]+' (retrained)');if(s.kvb!==2)m.push(precName[s.kvb]+' cache');if(s.keep<1)m.push('SnapKV, '+(s.keep*100)+'% kept');
    m.push(s.n+' &times; '+E(KCD.gpus[L.gpu][0]));if(s.users<L.users)m.push(s.users+' users');return m.join('; ')}
  function drawDebrief(ev){
    const L=FGL[li],db=$('fg-db');if(!ev.win){db.hidden=true;return}
    const rs=FG.refState(L),re=FG.evaluate(L,rs);
    const same=['des','kvb','keep','n','users'].every(k=>rs[k]===st[k]);
    const scoreOf=(e,s)=>'score '+fx(e.score)+' ('+(e.q.mmlu?fx(e.q.mmlu)+' MMLU + ':'')+fx(e.q.pk)+' pass-key + '+s.n+' GPU'+(s.n>1?'s':'')+')'+(e.q.unp.length?'; unpriced: '+E(e.q.unp.join(', ')):'');
    db.innerHTML='<h4>'+(shown?'A solution':'Brief met')+': '+scoreOf(ev,st)+'</h4><div class="cmp">'+
      '<div><div class="k">'+(shown?'Shown':'Your solution')+'</div>'+moves(L,st)+'. Uses '+LC.fmt(ev.m.need/1e9,1)+' of '+LC.fmt(ev.m.cap/1e9,1)+' GB.</div>'+
      '<div><div class="k">Reference</div>'+moves(L,rs)+'; '+scoreOf(re,rs)+(same?' (the same)':ev.score<re.score?' (yours scores lower)':'')+'.</div>'+
      '<div><div class="k">What real models chose</div>'+L.real.replace(/\{\{([^|{}]+)\|#t-read\}\}/g,'<a href="#" data-tab="t-read">$1</a>')+'</div></div>'+
      '<p><b>Why.</b> '+L.why+'</p><p>Read: '+L.links.map(([t,id])=>sec(t,id)).join(' &middot; ')+(li<FGL.length-1?'</p><p><button id="fg-next">Next level: '+E(FGL[li+1].name)+'</button>':'</p><p>That was the last brief.')+'</p>';
    db.hidden=false;
    if(!shown&&(best[li]===undefined||ev.score<best[li])){best[li]=ev.score;save();drawLevels()}}
  function update(flash){const ev=FG.evaluate(FGL[li],st);drawStatus(ev,flash);drawBoard(ev);drawCards(ev);drawDebrief(ev);return ev}
  function load(i){li=i;st=FG.start(FGL[i]);shown=false;lastFit=null;drawLevels();drawBrief();update(false)}
  $('fg-lv').addEventListener('click',e=>{const b=e.target.closest('button[data-l]');if(b)load(+b.dataset.l)});
  $('fg-cards').addEventListener('click',e=>{const b=e.target.closest('button[data-c]');if(!b||b.disabled)return;const k=b.dataset.c,v=k==='des'?b.dataset.v:+b.dataset.v;st[k]=v;shown=false;update(true)});
  $('fg-reset').addEventListener('click',()=>load(li));
  $('fg-show').addEventListener('click',()=>{st=FG.refState(FGL[li]);shown=true;update(false);$('fg-db').scrollIntoView({block:'nearest'})});
  root.addEventListener('click',e=>{
    if(e.target.id==='fg-next'){load(li+1);$('fg-brief').scrollIntoView({block:'start'});return}
    const a=e.target.closest('a[data-tab]');if(!a||!root.contains(a)||a.closest('.lead'))return;e.preventDefault();
    const b=document.querySelector('#tabs button[data-t="'+a.dataset.tab+'"]');if(b)b.click();
    const t=a.dataset.sec&&document.getElementById(a.dataset.sec);(t||document.getElementById('tabs')).scrollIntoView({block:'start'})});
  $('fg-srcs').innerHTML='Quality sources: '+[FGQ.src.t8,FGQ.src.t9,FGQ.src.pk,FGQ.src.q8,FGQ.src.gem,FGQ.src.mix].join(' ').replace(/\{\{([^|{}]+)\|#t-read\}\}/g,'<a href="#" data-tab="t-read">$1</a>');
  LC.onTab('t-game',()=>update(false));LC.onResize(root,()=>update(false));
  load(0);
  window.FGU={load,get st(){return st},set st(v){st=v},update,get li(){return li}};
})();
