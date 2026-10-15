// ---- Mixing lab: the five domains and the mixture calculator (temperature, UniMax, manual; epochs; Muennighoff value)
(function(){
  const X=window.MXX,D=window.MXD,$=X.$;if(!$('t-mix'))return;
  const DOM=D.domains,K=DOM.map(d=>d.key),U=DOM.map(d=>d.gpt2*1e9);
  const UNIT={'gpt-neox':'GPT-NeoX tokens (paper)',dataset_bytes:'bytes (dataset size, all columns)',comma:'Comma v0.1 tokens',finemath_token_count_field:'tokens (rows\' token_count field)',ws_words:'whitespace words'};
  // ---------- the domain table and size bars
  const SHORT={web:'GPT-2 per NeoX token',wiki:'(bytes minus url and title) / 4.46 bytes per GPT-2 token',code:'GPT-2 per Comma token',math:'GPT-2 per card token',papers:'GPT-2 tokens per word'};
  const nat=X.temperature(U,1);
  (function(){
    let h='<tr><th>Domain</th><th class="n">As published</th><th>To GPT-2 tokens</th><th class="n">GPT-2 tokens</th><th class="n">Natural share</th></tr>';
    DOM.forEach((d,i)=>{const pub=d.unit==='dataset_bytes'?(d.published/1e9).toFixed(1)+' GB':X.tok(d.published);
      h+='<tr><td><span class="mx-sw" style="background:'+X.COL[d.key]+'"></span>'+X.esc(d.name)+'<div class="mx-src">'+X.esc(d.repo)+' @ '+d.rev+'</div></td><td class="n">'+pub+'<div class="mx-src">'+UNIT[d.unit]+'</div></td><td class="small" title="'+X.esc(d.how)+'">'+(d.ratio!=null?'&times; '+d.ratio.toFixed(3)+' <span class="mute">'+SHORT[d.key]+'</span>':'<span class="mute">'+SHORT[d.key]+'</span>')+'</td><td class="n"><b>'+X.tok(U[i])+'</b></td><td class="n">'+X.pct(nat[i],nat[i]<.01?2:1)+'</td></tr>'});
    $('mx-dom-t').innerHTML=h;
    $('mx-dom-cap').innerHTML='<span class="lbl pub">published</span> sizes quoted from each dataset card at the pinned revision; <span class="lbl me">measured</span> conversion ratios on the topic\'s samples (2,000 documents each, 1,000 for peS2o; first documents of one file, not a random sample); <span class="lbl der">derived</span> GPT-2 tokens and shares. Web is '+X.pct(nat[0])+' of the total, so a "natural" mix is almost all web. Log scale. Conversions: '+DOM.map(d=>X.NAME[d.key]+', '+X.esc(d.how)).join('; ')+'.';
  })();
  function drawDom(){const el=$('mx-dom');const w=X.width(el),lw=Math.min(118,w*.3),rw=58,bw=w-lw-rw-8,rh=22,h=DOM.length*rh+18;
    const lo=Math.log10(1e9),hi=Math.log10(1e13),x=v=>lw+bw*(Math.log10(v)-lo)/(hi-lo);let b='';
    [1e9,1e10,1e11,1e12,1e13].forEach(v=>{b+='<line x1="'+x(v)+'" x2="'+x(v)+'" y1="0" y2="'+(h-14)+'" stroke="var(--line)"/>'+X.t(x(v),h-2,X.tok(v),{a:'middle',fs:10,fill:'var(--mute)'})});
    DOM.forEach((d,i)=>{const y=i*rh+3;b+=X.t(lw-6,y+13,X.NAME[d.key],{a:'end'})+X.rect(lw,y+2,x(U[i])-lw,rh-8,X.COL[d.key])+X.t(x(U[i])+4,y+13,X.tok(U[i]),{fs:10.5})});
    el.innerHTML=X.svg(w,h,b,'Domain sizes in GPT-2 tokens, log scale')}
  X.onRender(drawDom);drawDom();

  // ---------- calculator state
  const TS=[1,1.43,2,3.33,5,10,Infinity],TL=['1 (natural)','1.43 (mBERT)','2 (XLM)','3.33 (XLM-R, mT5)','5','10','&infin; (uniform)'];
  const S={B:4e12,mode:'temp',T:1,N:4,man:nat.slice(),shown:nat.slice()};
  const bFrom=v=>{const b=1e11*Math.pow(200,v/100);const p=Math.pow(10,Math.floor(Math.log10(b))-1);return Math.round(b/p)*p};
  const bTo=b=>Math.round(100*Math.log(b/1e11)/Math.log(200));
  function weights(){if(S.mode==='temp')return X.temperature(U,S.T);if(S.mode==='unimax')return X.unimax(U,S.B,S.N);const z=S.man.reduce((a,b)=>a+b,0)||1;return S.man.map(v=>v/z)}
  // manual sliders
  $('mx-ctl-manual').innerHTML=K.map((k,i)=>'<label><span class="mx-sw" style="background:'+X.COL[k]+'"></span>'+X.NAME[k]+' <input type="range" id="mx-m-'+k+'" min="0" max="1000" step="1" aria-label="'+X.NAME[k]+' weight"> <output id="mx-m-'+k+'-o"></output></label>').join('');
  function syncManual(){const z=S.man.reduce((a,b)=>a+b,0)||1;K.forEach((k,i)=>{$('mx-m-'+k).value=Math.round(1000*S.man[i]/z);$('mx-m-'+k+'-o').textContent=X.pct(S.man[i]/z,1)})}
  K.forEach((k,i)=>$('mx-m-'+k).addEventListener('input',e=>{S.man[i]=Math.max(0,+e.target.value);syncManual();update()}));
  // value of a repeated token on the curve
  const val=e=>e<=1?1:(1+RSv*(1-Math.exp(-(e-1)/RSv)))/e;const RSv=D.R_star;
  let stopTw=()=>{};
  function drawBars(w2){const el=$('mx-calc-bars');const w=X.width(el),lw=Math.min(84,w*.22),bw=w-lw-4,h=64;let b='';
    [[nat,'Natural',6],[w2,S.mode==='temp'?'T = '+(isFinite(S.T)?S.T:'&infin;'):S.mode==='unimax'?'UniMax N = '+S.N:'Manual',36]].forEach(([ws,lab,y])=>{
      b+=X.t(lw-6,y+15,lab,{a:'end',fs:11.5});let x0=lw;ws.forEach((v,i)=>{const ww=bw*v;b+=X.rect(x0,y,ww,22,X.COL[K[i]],' stroke="var(--bg)" stroke-width="1"');
        if(ww>46)b+=X.t(x0+ww/2,y+15,X.pct(v,v<.1?1:0),{a:'middle',fs:10.5,fill:'#fff',w:600});x0+=ww})});
    el.innerHTML=X.svg(w,h,b,'Mixture weights: natural against the current setting')}
  function drawCurve(rows){const el=$('mx-curve');const w=X.width(el),pl=40,pr=12,pt=14,pb=30,h=190,W=w-pl-pr,Hh=h-pt-pb;
    const lo=0,hi=3,x=e=>pl+W*(Math.log10(Math.max(1,Math.min(1000,e)))-lo)/(hi-lo),y=v=>pt+Hh*(1-v);let b='';
    [0,.25,.5,.75,1].forEach(v=>{b+='<line x1="'+pl+'" x2="'+(w-pr)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/>'+X.t(pl-4,y(v)+4,(v*100)+'%',{a:'end',fs:10,fill:'var(--mute)'})});
    (w<520?[1,4,16,64,250,1000]:[1,2,4,8,16,32,64,128,250,500,1000]).forEach(e=>{b+='<line x1="'+x(e)+'" x2="'+x(e)+'" y1="'+pt+'" y2="'+(h-pb)+'" stroke="var(--line)"/>'+X.t(x(e),h-pb+13,e,{a:'middle',fs:10,fill:'var(--mute)'})});
    b+=X.t(pl+W/2,h-3,'epochs of the domain (log)',{a:'middle',fs:10.5,fill:'var(--mute)'});
    b+='<rect x="'+x(4)+'" y="'+pt+'" width="'+(x(16)-x(4))+'" height="'+Hh+'" fill="var(--hl)" opacity=".45"/>';
    let p='';for(let i=0;i<=120;i++){const e=Math.pow(10,hi*i/120);p+=(i?'L':'M')+x(e).toFixed(1)+','+y(val(e)).toFixed(1)}
    b+='<path d="'+p+'" fill="none" stroke="var(--mute)" stroke-width="1.6"/>';
    rows.forEach((r,i)=>{const e=Math.max(1,r.ep);b+='<circle cx="'+x(e)+'" cy="'+y(val(r.ep))+'" r="5.5" fill="'+X.COL[r.k]+'" stroke="var(--bg)" stroke-width="1.5"><title>'+X.NAME[r.k]+': '+r.ep.toFixed(2)+' epochs, each token worth '+X.pct(val(r.ep),0)+' of a fresh one</title></circle>'});
    b+=X.t(x(4)+3,pt+11,'4 to 16 epochs',{fs:10,fill:'var(--mute)'});
    el.innerHTML=X.svg(w,h,b,'Value of a repeated token against epochs, Muennighoff et al.')}
  function update(){
    const w=weights();const rows=K.map((k,i)=>{const d=w[i]*S.B;return {k,w:w[i],d,ep:d/U[i],e:X.eff(U[i],d)}});
    $('mx-b-o').textContent=X.tok(S.B)+' tokens';$('mx-t-o').innerHTML=TL[TS.indexOf(S.T)];$('mx-n-o').textContent=S.N;
    let h='<tr><th>Domain</th><th class="n">Pool</th><th class="n">Weight</th><th class="n">Tokens drawn</th><th class="n">Epochs</th><th class="n">Fresh-token equivalent</th></tr>';
    rows.forEach((r,i)=>{const cls=r.ep>16?'hot':r.ep>4?'warn':'';h+='<tr class="'+cls+'"><td><span class="mx-sw" style="background:'+X.COL[r.k]+'"></span>'+X.NAME[r.k]+'</td><td class="n">'+X.tok(U[i])+'</td><td class="n">'+X.pct(r.w,r.w<.01?2:1)+'</td><td class="n">'+X.tok(r.d)+'</td><td class="n ep">'+(r.ep<10?r.ep.toFixed(2):r.ep.toFixed(1))+'</td><td class="n">'+X.tok(r.e)+(r.ep>1?' <span class="mute">('+X.pct(r.e/r.d,0)+')</span>':'')+'</td></tr>'});
    $('mx-calc-t').innerHTML=h;
    const te=rows.reduce((a,r)=>a+r.e,0),mx=rows.reduce((a,r)=>r.ep>a.ep?r:a,rows[0]);
    const unseen=rows.filter(r=>r.ep<1).map(r=>X.NAME[r.k]+' '+X.pct(1-r.ep,0)).join(', ');
    const over=S.mode==='unimax'&&S.N*U.reduce((a,b)=>a+b,0)<S.B;
    $('mx-calc-stats').innerHTML=X.stat('Fresh-token equivalent',X.tok(te),X.pct(te/S.B,0)+' of the '+X.tok(S.B)+' budget')+
      X.stat('Most repeated',X.NAME[mx.k]+', '+(mx.ep<10?mx.ep.toFixed(1):Math.round(mx.ep))+' epochs','each pass worth '+X.pct(val(mx.ep),0)+' of fresh data on average')+
      X.stat('Never seen',unseen||'none','share of a pool left unused at under 1 epoch')+
      (over?X.stat('Note','budget &gt; '+S.N+' epochs of all','UniMax cannot respect the cap: every domain is scaled up'):'');
    const leg=$('mx-calc-leg');leg.innerHTML=K.map(k=>'<span><span class="mx-sw" style="background:'+X.COL[k]+'"></span>'+X.NAME[k]+'</span>').join('');
    stopTw();const from=S.shown.slice();stopTw=X.tween(0,1,550,f=>{S.shown=from.map((v,i)=>v+(w[i]-v)*f);drawBars(S.shown)});
    drawCurve(rows);
  }
  $('mx-b').addEventListener('input',e=>{S.B=bFrom(+e.target.value);update()});
  X.seg($('mx-bp'),m=>{S.B=+m*1e12;$('mx-b').value=bTo(S.B);update()});
  $('mx-t').addEventListener('input',e=>{S.T=TS[+e.target.value];update()});
  $('mx-n').addEventListener('input',e=>{S.N=+e.target.value;update()});
  X.seg($('mx-mode'),m=>{if(m==='manual'&&S.mode!=='manual'){S.man=weights().slice();syncManual()}S.mode=m;['temp','unimax','manual'].forEach(x=>$('mx-ctl-'+x).hidden=x!==m);update()});
  $('mx-b').value=bTo(S.B);syncManual();
  X.onRender(()=>{drawBars(S.shown);update()});update();
  const wn=$('mx-webnat');if(wn)wn.textContent='about '+X.pct(nat[0],0);
  // predict 1: Wikipedia epochs at 4T, T = 3.33 (from the build's examples)
  const ex=D.examples['T333_4T'].rows.find(r=>r.key==='wiki'),exw=D.examples['T333_15T'].rows.find(r=>r.key==='wiki');
  $('mx-pr1-a').innerHTML='About '+Math.round(ex.epochs)+' epochs: <i>T</i> = 3.33 gives Wikipedia '+X.pct(ex.w,1)+' of the 4T budget, '+ex.drawn.toFixed(0)+'B tokens from a '+X.tok(U[1])+'-token pool, worth '+X.pct(ex.eff/ex.drawn,0)+' of fresh data. Set it in the calculator above, then switch to UniMax with <i>N</i> = 4 and watch the excess move to the web.';
  X.predict('mx-pr1');
  const mw=$('mx-mis-wiki');if(mw)mw.textContent=Math.round(exw.epochs);
  const code=DOM.find(d=>d.key==='code');const mc=$('mx-mis-code');if(mc)mc.textContent=code.ratio.toFixed(2);
})();
