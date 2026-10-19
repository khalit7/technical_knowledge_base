// ---- Hybrid attention explainer: one decoded token through GLM-5.3-Flash, GLM-5.3, or full attention ----
(function(){
  const card=$('hya');if(!card)return;
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const DUR=3600,MOVE=0.62,K=2048,IH=32,ID=128;
  // layer patterns straight from config.json: K = KDA, S = sparse with pooled indexer, F = sparse with its own indexer, s = sparse reusing the list, D = dense MLA
  const PAT={flash:'KKKSKKKSKKKSKKKSKKKSKKKSKKKSKKKSKKKSKKKSKKKSK',g53:'FFFsssFsssFsssFsssFsssFsssFsssFsssFsssFsssFsssFsssFsssFsssFsssFsssFsssFsssFsss',full:'D'.repeat(78)};
  const NAME={flash:'GLM-5.3-Flash',g53:'GLM-5.3',full:'Full attention'};
  // per-layer contributions at context L: cache written, entries scored, entries read, multiply-adds (index part, read part, state part)
  function layer(t,L){
    if(t==='K')return {c:0,sc:0,rd:0,wi:0,wr:64*3*128*128};
    if(t==='S')return {c:512+ID/4,ci:ID/4,sc:L/4,rd:K,wi:IH*ID*L/4,wr:64*K*1024};
    if(t==='F')return {c:576+ID,ci:ID,sc:L,rd:K,wi:IH*ID*L,wr:64*K*1088};
    if(t==='s')return {c:576,ci:0,sc:0,rd:K,wi:0,wr:64*K*1088};
    return {c:576,ci:0,sc:0,rd:L,wi:0,wr:64*L*1088};
  }
  // an increment: which layers, and which parts of their work
  const inc=(a,b,parts)=>({a,b,parts});
  const ALL=['i','r','c'];
  const STEPS={
    flash:[
      {t:'A token arrives',ph:'arrive',cur:0,i:null,c:L=>'A new token enters GLM-5.3-Flash\'s 45 layers with '+fmt(L)+' tokens already in the context. Each cell above is one layer, laid out exactly as config.json lists them: three Kimi Delta Attention (KDA) layers, then one sparse-attention layer, repeated, ending on KDA. Only the 11 sparse layers keep a cache that grows with context.'},
      {t:'Layers 1 to 3: KDA updates a fixed-size state',ph:'kda',cur:0,i:inc(0,2,ALL),c:L=>'Each KDA layer keeps, per head, a 128 × 128 matrix that summarises everything seen so far. The new token reads it and writes into it with a gated delta-rule update, so the layer does about 3 × 128 × 128 multiply-adds per head and adds nothing to the cache. The state is 64 × 128 × 128 = 1,048,576 numbers per layer whether the context is 1K or '+fmt(L)+' tokens.'},
      {t:'Layer 4: the indexer scores pooled keys',ph:'index',cur:3,i:inc(3,3,['i']),c:L=>'The first sparse layer runs its lightning indexer: 32 indexer heads of 128 dimensions compare the query with the cached indexer keys. IndexPool has compressed every four keys into one by weighted pooling, so it scores '+fmt(L/4)+' pooled entries instead of '+fmt(L)+': a quarter of the work (the thin band, to scale against the full-height band GLM-5.3 would score).'},
      {t:'Pick the top 2,048',ph:'topk',cur:3,i:null,c:L=>'The highest-scoring positions become this layer\'s reading list: 2,048 entries, '+(100*K/L).toFixed(2)+'% of the context. The indexer is cheap per entry but touches every pooled entry; the main attention will touch only these.'},
      {t:'Main attention reads only the selected entries',ph:'read',cur:3,i:inc(3,3,['r']),c:L=>'64 heads attend over the 2,048 selected cache entries. The layer is MLA without positional encoding (NoPE): each entry is one 512-number latent, scored and read in MLA\'s absorbed decode form. The work is 64 × 2,048 × (512 + 512) multiply-adds and does not grow with context.'},
      {t:'Write 544 numbers to this layer\'s cache',ph:'write',cur:3,i:inc(3,3,['c']),c:L=>'The token leaves its own entry behind for later tokens: a 512-number latent plus its indexer key, which after pooling costs 128 / 4 = 32 numbers per token. 544 numbers per sparse layer, 0 per KDA layer.'},
      {t:'Layers 5 to 45: the pattern repeats',ph:'repeat',cur:44,i:inc(4,44,ALL),c:L=>'Ten more groups of three KDA layers and one sparse layer, and a final KDA layer. Watch the counters: 11 sparse layers × 544 = 5,984 numbers of cache for this token, and indexer work that is a quarter of what full-length keys would need.'},
      {t:'Totals: what the hybrid saves',ph:'total',cur:45,i:null,c:L=>'Per token the whole model caches 5,984 numbers against GLM-5.3\'s 47,616: 8.0 times less, or 4.6 times per layer on Zhipu\'s averaged convention (published: 4.44). Most of it is the layer mix (34 of 45 layers hold no growing cache, 45 / 11 = 4.09 per layer); IndexPool\'s share is about 1.18. Switch to GLM-5.3 to watch the same token there.'}],
    g53:[
      {t:'A token arrives',ph:'arrive',cur:0,i:null,c:L=>'The same token enters GLM-5.3\'s 78 layers, each one MLA with DeepSeek Sparse Attention, with '+fmt(L)+' tokens in the context. Dark cells run their own indexer; light cells reuse a neighbour\'s reading list (IndexShare): 21 indexers in 78 layers, as config.json lists them.'},
      {t:'Layer 1: the indexer scores every key',ph:'index',cur:0,i:inc(0,0,['i']),c:L=>'32 indexer heads of 128 dimensions score all '+fmt(L)+' cached indexer keys: '+sci(IH*ID*L)+' multiply-adds in one layer. This term grows linearly with the context for every token, which is why at a million tokens it becomes the bill.'},
      {t:'Pick the top 2,048',ph:'topk',cur:0,i:null,c:L=>'2,048 positions, '+(100*K/L).toFixed(2)+'% of the context, become the reading list.'},
      {t:'Main attention reads the selected entries',ph:'read',cur:0,i:inc(0,0,['r']),c:L=>'64 heads read 2,048 entries of 576 numbers each (a 512-number latent plus a 64-number rotary key), in MLA\'s absorbed decode form: 64 × 2,048 × (576 + 512) multiply-adds, fixed whatever the context.'},
      {t:'Write 704 numbers to this layer\'s cache',ph:'write',cur:0,i:inc(0,0,['c']),c:L=>'The token\'s entry: the 576-number latent and rotary key, plus its full 128-number indexer key, since this layer runs an indexer.'},
      {t:'Layers 2 and 3 run their own indexers too',ph:'repeat',cur:2,i:inc(1,2,ALL),c:L=>'The released config gives the first three layers their own indexers (index_skip_topk_offset = 3) before the sharing pattern starts.'},
      {t:'Layers 4 to 6 reuse the list (IndexShare)',ph:'reuse',cur:5,i:inc(3,5,ALL),c:L=>'These three layers skip the indexer and reuse layer 3\'s reading list: they still compute their own queries, attention and values over the same 2,048 positions, and cache only the 576-number latent. Neighbouring indexers mostly rediscover the same tokens (70% to 100% overlap in the IndexCache study), which is why this costs little quality.'},
      {t:'Layers 7 to 78: one indexer per four layers',ph:'repeat',cur:77,i:inc(6,77,ALL),c:L=>'The group of one indexing layer and three sharing layers repeats 18 times. Every layer still adds at least 576 numbers to the cache: IndexShare cuts the indexer work by about 4 but, as Zhipu notes, not the cache.'},
      {t:'Totals',ph:'total',cur:78,i:null,c:L=>'47,616 numbers of cache per token, '+fmtBytes(47616*2*L)+' for this request at 16-bit, and indexer work over '+fmt(21*L)+' entries. Compare GLM-5.3-Flash (5,984 numbers per token) and full attention (every layer reads every entry).'}],
    full:[
      {t:'A token arrives',ph:'arrive',cur:0,i:null,c:L=>'For reference, GLM-5.3\'s MLA with no indexer at all: 78 layers that each attend densely over all '+fmt(L)+' cached entries. GLM-5\'s sparse attention was adapted from such a dense base by continued pretraining.'},
      {t:'Layer 1 reads every cached entry',ph:'fullread',cur:0,i:inc(0,0,['r']),c:L=>'64 heads score and read all '+fmt(L)+' entries of 576 numbers: 64 × '+fmt(L)+' × (576 + 512) = '+sci(64*L*1088)+' multiply-adds in this layer alone, growing with every token of context.'},
      {t:'Write 576 numbers',ph:'write',cur:0,i:inc(0,0,['c']),c:L=>'The cache per token is about the same as GLM-5.3\'s (576 against 704 in an indexing layer): sparse attention saves reading, not storing.'},
      {t:'Layers 2 to 78 do the same',ph:'repeat',cur:77,i:inc(1,77,ALL),c:L=>'Every layer repeats the full read. At 1M tokens this is about 56 times GLM-5.3\'s attention work per token and about 425 times GLM-5.3-Flash\'s.'},
      {t:'Totals',ph:'total',cur:78,i:null,c:L=>'44,928 numbers of cache per token and '+sci(78*64*L*1088)+' attention multiply-adds per token at '+fmt(L)+' tokens. DSA cut the reading; the hybrid cut the storing.'}]};
  // totals per mode at L
  function totals(m,L){let o={c:0,sc:0,rd:0,w:0};for(const t of PAT[m]){const y=layer(t,L);o.c+=y.c;o.sc+=y.sc;o.rd+=y.rd;o.w+=y.wi+y.wr}return o}
  function incVal(I,m,L){const o={c:0,sc:0,rd:0,w:0};if(!I)return o;const p=PAT[m];for(let j=I.a;j<=I.b;j++){const y=layer(p[j],L);
      if(I.parts.includes('i')){o.sc+=y.sc;o.w+=y.wi;if(p[j]==='K')o.w+=y.wr}
      if(I.parts.includes('r')){o.rd+=y.rd;if(p[j]!=='K')o.w+=y.wr}
      if(I.parts.includes('c'))o.c+=y.c}
    return o}
  const st={m:'flash',k:0,t:RM?1:0,play:!RM,spd:1,vis:false,raf:0,last:0,lk:-1,lm:'',L:1048576};
  const steps=()=>STEPS[st.m];
  const cl=v=>v<0?0:v>1?1:v,ease=v=>v<.5?2*v*v:1-2*(1-v)*(1-v),lerp=(a,b,u)=>a+(b-a)*u;
  function counters(){const S=steps(),e=RM?1:ease(cl(st.t/MOVE)),o={c:0,sc:0,rd:0,w:0};
    for(let j=0;j<=st.k;j++){const v=incVal(S[j].i,st.m,st.L),f=j<st.k?1:e;for(const q in o)o[q]+=v[q]*f}return o}
  // how far each layer cell has grown (0..1) given the current step
  function grown(j){const S=steps();let g=0;for(let s=0;s<=st.k;s++){const I=S[s].i;if(!I||!I.parts.includes('c')||j<I.a||j>I.b)continue;
      if(s<st.k){g=1;continue}const e=RM?1:ease(cl(st.t/MOVE));const n=I.b-I.a+1;g=cl(e*n-(j-I.a))}return g}
  const T=(x,y,s,o)=>'<text x="'+x+'" y="'+y+'" font-size="'+((o&&o.fs)||11)+'"'+(o&&o.a?' text-anchor="'+o.a+'"':'')+(o&&o.c?' fill="'+o.c+'"':'')+(o&&o.op!=null?' opacity="'+o.op+'"':'')+(o&&o.w?' font-weight="600"':'')+'>'+s+'</text>';
  const R=(x,y,w,h,f,o)=>'<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+Math.max(0,w).toFixed(1)+'" height="'+Math.max(0,h).toFixed(1)+'" fill="'+f+'"'+(o!=null?' opacity="'+o+'"':'')+' rx="1"/>';
  // fixed pseudo-random top-k tick positions
  const rnd=mulberry32(7),TK=[];for(let i=0;i<46;i++)TK.push(Math.pow(rnd(),.55));TK.sort();
  function draw(){
    const W=card.clientWidth<560?360:680,nar=W<500,L=st.L,m=st.m,p=PAT[m],S=steps(),k=st.k,ph=S[k].ph,e=RM?1:ease(cl(st.t/MOVE));
    const cK='var(--c4)',cS='var(--c1)',cI='var(--c5)',cF='var(--c2)',cH='var(--acc)';
    let s='';const x0=nar?8:20,x1=W-(nar?8:20),sw=(x1-x0)/p.length,yb=74,hmax=46;
    s+=T(x0,14,(nar?'':'One cell per layer, ')+p.length+' layers of '+NAME[m]+'; height = cache added per token',{fs:11,c:'var(--mute)'});
    // layer strip
    const cur=S[k].cur;let cx=lerp(x0+sw*(S[Math.max(0,k-1)].cur+.5),x0+sw*(Math.min(p.length-1,cur)+.5),k===0?1:e);
    if(ph==='total')cx=-99;
    for(let j=0;j<p.length;j++){const t=p[j],x=x0+j*sw,w=Math.max(1,sw-(sw>5?1.2:.5)),g=grown(j);
      if(t==='K'){s+=R(x,yb-4,w,4,cK,.85);continue}
      const lat=t==='S'?512:576,ix=t==='S'?32:t==='F'?128:0,col=t==='D'?cF:cS,op=t==='s'?.5:1;
      s+='<rect x="'+x.toFixed(1)+'" y="'+(yb-hmax*(lat+ix)/704).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+(hmax*(lat+ix)/704).toFixed(1)+'" fill="none" stroke="var(--line)" stroke-width=".8"/>';
      const hl=hmax*lat/704*g,hi=hmax*ix/704*g;s+=R(x,yb-hl,w,hl,col,op)+R(x,yb-hl-hi,w,hi,cI)}
    if(cx>0)s+='<path d="M'+cx.toFixed(1)+' '+(yb+3)+'l-5 8h10z" fill="'+cH+'"/>';
    // legend under strip
    const lg=m==='flash'?[[cK,'KDA (no growing cache)'],[cS,'sparse latent'],[cI,'pooled indexer key']]:m==='g53'?[[cS,'latent, own indexer'],['var(--acc2)','latent, shared list'],[cI,'indexer key']]:[[cF,'dense MLA latent']];
    let lx=x0,ly=yb+16;lg.forEach(([c,n])=>{const wd=13+n.length*5.6+12;if(lx+wd>x1+12){lx=x0;ly+=13}s+=R(lx,ly,9,9,c)+T(lx+13,ly+8,n,{fs:10.5,c:'var(--mute)'});lx+=wd});
    // context bar
    const by=150,bh=16,bw=x1-x0;
    const labL=ph==='kda'?'KDA layers never read the '+fmt(L)+'-token cache':'Layer '+(Math.min(p.length-1,cur)+1)+'\'s cache: '+fmt(L)+' earlier tokens';
    if(ph!=='total'&&ph!=='arrive'&&ph!=='repeat'&&ph!=='reuse')s+=T(x0,by-34,labL,{fs:11.5,w:1});
    s+=R(x0,by,bw,bh,'var(--soft)')+'<rect x="'+x0+'" y="'+by+'" width="'+bw+'" height="'+bh+'" fill="none" stroke="var(--line)"/>';
    const scoreBand=(frac,h,op)=>R(x0,by-4-h,bw*frac,h,cI,op);
    if(ph==='index'){const h=m==='flash'?3.5:14;s+=scoreBand(e,h,.9)+(m==='flash'?'<rect x="'+x0+'" y="'+(by-18)+'" width="'+bw+'" height="14" fill="none" stroke="'+cI+'" stroke-dasharray="3 3" opacity=".6"/>':'');
      s+=T(x1,by-38,(m==='flash'?'scores '+fmt(L/4)+' pooled keys':'scores all '+fmt(L)+' keys'),{a:'end',fs:11,c:'var(--mute)'})}
    if(ph==='topk'||ph==='read'){const h=m==='flash'?3.5:14;s+=scoreBand(1,h,.35);
      const n=Math.round(TK.length*(ph==='topk'?e:1));for(let i=0;i<n;i++){const x=x0+bw*TK[i];s+='<line x1="'+x.toFixed(1)+'" x2="'+x.toFixed(1)+'" y1="'+(by-2)+'" y2="'+(by+bh+2)+'" stroke="'+cS+'" stroke-width="1.6"/>'}
      s+=T(x1,by-38,'2,048 selected = '+(100*K/L).toFixed(2)+'% of the cache',{a:'end',fs:11,c:cS})}
    if(ph==='read'){const bx0=W/2-(nar?80:95),bw2=nar?160:190,yy=by+bh+40;let ln='';
      for(let i=0;i<TK.length;i+=3){const x=x0+bw*TK[i];ln+='<line x1="'+x.toFixed(1)+'" y1="'+(by+bh+2)+'" x2="'+(W/2).toFixed(1)+'" y2="'+yy+'" stroke="'+cS+'" stroke-width=".8" opacity="'+(.55*e).toFixed(2)+'"/>'}
      s+=ln+'<g opacity="'+e.toFixed(2)+'">'+bx(bx0,yy,bw2,36,'boxa',['64 heads read 2,048 entries',m==='flash'?'512 numbers each':'576 numbers each'],11)+'</g>'}
    if(ph==='fullread'){s+=R(x0,by,bw*e,bh,cF,.75);const yy=by+bh+40,bx0=W/2-(nar?80:95),bw2=nar?160:190;
      s+='<line x1="'+(x0+bw*e/2).toFixed(1)+'" y1="'+(by+bh+2)+'" x2="'+(W/2)+'" y2="'+yy+'" stroke="'+cF+'"/>'+'<g opacity="'+e.toFixed(2)+'">'+bx(bx0,yy,bw2,36,'box',['64 heads read all '+fmt(L),'entries of 576 numbers'],11)+'</g>'}
    if(ph==='write'){const v=m==='flash'?544:m==='g53'?704:576,xx=x1-6;s+=R(xx,by,6,bh,m==='full'?cF:cS,e)+T(xx-4,by+bh+16,'+'+v+' numbers for this token',{a:'end',fs:11,c:m==='full'?cF:cS,op:e})}
    if(ph==='kda'){const sq=nar?54:62,gx=W/2-sq-24,gy=by-26;let g='';
      for(let h=0;h<3;h++){const ox=gx+h*(sq+24);g+='<rect x="'+ox+'" y="'+gy+'" width="'+sq+'" height="'+sq+'" rx="3" fill="var(--soft)" stroke="'+cK+'"/>';
        for(let r=1;r<8;r++)g+='<line x1="'+ox+'" x2="'+(ox+sq)+'" y1="'+(gy+r*sq/8)+'" y2="'+(gy+r*sq/8)+'" stroke="'+cK+'" stroke-width=".4" opacity=".6"/><line y1="'+gy+'" y2="'+(gy+sq)+'" x1="'+(ox+r*sq/8)+'" x2="'+(ox+r*sq/8)+'" stroke="'+cK+'" stroke-width=".4" opacity=".6"/>';
        const lit=cl(e*3-h);g+=R(ox,gy,sq,sq,cK,(.45*lit).toFixed(2));g+=T(ox+sq/2,gy+sq+13,'layer '+(h+1),{a:'middle',fs:10.5,c:'var(--mute)'})}
      s+='<rect x="'+x0+'" y="'+(by-34)+'" width="'+bw+'" height="'+(sq+52)+'" fill="var(--bg)"/>'+g+T(W/2,gy+sq+28,'128 × 128 state per head, 64 heads: same size at any context',{a:'middle',fs:11,c:cK})}
    if(ph==='repeat'||ph==='reuse'||ph==='arrive'){const msg=ph==='arrive'?'The context holds '+fmt(L)+' earlier tokens':ph==='reuse'?'Reading list reused from layer 3: no indexer work':'Layers '+(S[k].i.a+1)+' to '+(S[k].i.b+1);s+=T(x0,by-12,msg,{fs:11.5,w:1})}
    if(ph==='total'){const tt=totals(m,L);s+=T(x0,by-12,NAME[m]+': '+fmt(tt.c)+' numbers of cache per token',{fs:11.5,w:1})+T(x0,by+bh+18,fmtBytes(tt.c*2*L)+' for one '+fmt(L)+'-token request at 16-bit',{fs:11,c:'var(--mute)'})}
    // to-scale comparison bars
    const g0=262,lw=nar?62:96,bx1=x0+lw,bw3=x1-bx1-(nar?52:70),cur2=counters();
    const rows=['full','g53','flash'],nm={full:'Full',g53:'GLM-5.3',flash:'Flash'},col={full:cF,g53:cS,flash:cK};
    s+=T(x0,g0,nar?'Cache added per token (linear)':'Cache added per token, whole model (linear)',{fs:11,c:'var(--mute)'});
    rows.forEach((r,i)=>{const y=g0+8+i*16,v=r===m?cur2.c:totals(r,L).c,op=r===m?1:.35;
      s+='<g opacity="'+op+'">'+T(x0,y+9,nm[r],{fs:11})+R(bx1,y,bw3,10,'var(--soft)')+R(bx1,y,bw3*v/47616,10,col[r])+T(bx1+bw3*v/47616+5,y+9,fmt(Math.round(v)),{fs:10.5})+'</g>'});
    const g1=g0+64,lo=8,hi=13,lgx=v=>v<=0?0:bw3*cl((Math.log10(v)-lo)/(hi-lo));
    s+=T(x0,g1,nar?'Attention multiply-adds per token (log)':'Attention multiply-adds per token at '+fmt(L)+' tokens (log scale, 10⁸ to 10¹³)',{fs:11,c:'var(--mute)'});
    rows.forEach((r,i)=>{const y=g1+8+i*16,v=r===m?cur2.w:totals(r,L).w,op=r===m?1:.35;
      s+='<g opacity="'+op+'">'+T(x0,y+9,nm[r],{fs:11})+R(bx1,y,bw3,10,'var(--soft)')+R(bx1,y,lgx(v),10,col[r])+T(bx1+lgx(v)+5,y+9,v>0?sci(v,1):'0',{fs:10.5})+'</g>'});
    $('hyaSvg').innerHTML=svgEl(W,g1+60,s,'One decoded token through '+NAME[m]+', step '+(k+1));
    if(st.lk!==k||st.lm!==m+L){const Sx=S[k];$('hyaStep').textContent='Step '+(k+1)+' of '+S.length+': '+Sx.t;$('hyaCap').innerHTML=Sx.c(L);st.lk=k;st.lm=m+L}
    const tt=totals(m,L),fix=m==='flash'?34*64*128*128*2:0;
    $('hyaCnt').innerHTML=stat('Cache added for this token',fmt(Math.round(cur2.c))+' numbers',fmt(Math.round(cur2.c*2))+' bytes at 16-bit')
      +stat('Cache this request holds',fmtBytes(tt.c*2*L+fix),'at '+fmt(L)+' tokens'+(fix?', incl. 68 MiB KDA state':''))
      +stat('Entries scored by indexers',fmt(Math.round(cur2.sc)),m==='full'?'no indexer':'so far, this token')
      +stat('Entries read by attention',fmt(Math.round(cur2.rd)),'so far, this token')
      +stat('Attention multiply-adds',sci(cur2.w,2),'so far, this token');
    const n=S.length,sc=$('hyaScrub');sc.max=n*100;sc.value=Math.round((k+st.t)*100);
    const pb=$('hyaPlay'),end=k===n-1&&st.t>=1;pb.innerHTML=st.play?'❚❚ Pause':end?'↻ Replay':'▶ Play';pb.setAttribute('aria-label',st.play?'Pause':end?'Replay':'Play');
  }
  const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
  function tick(now){st.raf=0;if(!st.play||!live())return;const dt=st.last?Math.min(100,now-st.last):16;st.last=now;
    st.t+=dt*st.spd/DUR;const n=steps().length;if(st.t>=1){if(st.k<n-1){st.k++;st.t=0}else{st.t=1;st.play=false}}
    card.dataset.frames=(+card.dataset.frames||0)+1;draw();if(st.play)st.raf=requestAnimationFrame(tick)}
  function kick(){if(st.play&&live()&&!st.raf){st.last=0;st.raf=requestAnimationFrame(tick)}else if(!live()&&st.raf){cancelAnimationFrame(st.raf);st.raf=0}}
  const pause=()=>{st.play=false;if(st.raf){cancelAnimationFrame(st.raf);st.raf=0}};
  $('hyaPlay').addEventListener('click',()=>{if(st.play){pause()}else{const n=steps().length;if(st.k===n-1&&st.t>=1){st.k=0;st.t=0}else if(st.t>=1&&st.k<n-1){st.k++;st.t=0}st.play=true;kick()}draw()});
  $('hyaFwd').addEventListener('click',()=>{pause();st.k=Math.min(steps().length-1,st.k+1);st.t=1;draw()});
  $('hyaBack').addEventListener('click',()=>{pause();st.k=Math.max(0,st.k-1);st.t=1;draw()});
  $('hyaScrub').addEventListener('input',e=>{pause();const n=steps().length,v=+e.target.value;st.k=Math.min(n-1,Math.floor(v/100));st.t=cl(v/100-st.k);if(st.k===n-1&&v>=n*100)st.t=1;draw()});
  $('hyaSpd').addEventListener('change',e=>{st.spd=+e.target.value});
  $('hyaL').addEventListener('change',e=>{st.L=+e.target.value;st.lk=-1;draw()});
  const seg=$('hyaM');seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    st.m=b.dataset.m;st.k=0;st.t=RM?1:0;if(!RM&&!st.play)st.play=true;st.lk=-1;draw();kick()}));
  if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;kick()},{threshold:.15}).observe(card)}else st.vis=true;
  document.addEventListener('visibilitychange',kick);
  let rw=card.clientWidth<560;addEventListener('resize',()=>{const w=card.clientWidth<560;if(w!==rw){rw=w;draw()}});
  onTab('t-read',()=>{draw();kick()});
  draw();
})();
