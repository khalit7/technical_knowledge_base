// ---- Sections 10 to 12: KV cache calculator, provider prompt-caching table and break-even, semantic-cache curves ----
(function(){
  const a=(t,u)=>'<a href="'+u+'" target="_blank" rel="noopener noreferrer">'+t+'</a>';
  const KV=CA.kv,PR=CA.prices;
  // ---------- KV cache ----------
  const CTX=[1024,4096,8192,32768,65536,131072,262144,1048576];
  const ms=document.getElementById('rd-kv-model');
  if(ms){ms.innerHTML=KV.models.map((m,i)=>'<option value="'+i+'">'+m.m+'</option>').join('');
    const bytesFor=(m,ctx)=>{const per=m.per_token_override||2*m.layers*m.kvh*m.hd*m.bytes;let t=per*ctx;if(m.window_layers)t+=m.window_layers*2*m.kvh*m.hd*m.bytes*Math.min(ctx,m.window);return {per,t}};
    const fmtB=b=>b>=1073741824?(b/1073741824).toFixed(b>=1e11?0:1)+' GiB':b>=1048576?(b/1048576).toFixed(1)+' MiB':(b/1024).toFixed(1)+' KiB';
    function kv(){const m=KV.models[+ms.value],ctx=CTX[+document.getElementById('rd-kv-ctx').value],n=+document.getElementById('rd-kv-n').value;
      document.getElementById('rd-kv-ctxv').textContent=ctx.toLocaleString('en-US');document.getElementById('rd-kv-nv').textContent=n;
      const r=bytesFor(m,ctx),tot=r.t*n,h100=80e9;
      document.getElementById('rd-kv-out').innerHTML=RD.stat('Per token',m.per_token_override?r.per.toLocaleString('en-US')+' B':'2 × '+m.layers+' × '+m.kvh+' × '+m.hd+' × '+m.bytes+' = '+r.per.toLocaleString('en-US')+' B',fmtB(r.per)+(m.window_layers?' (full-attention layers only)':''))+
        RD.stat('One conversation',fmtB(r.t),ctx.toLocaleString('en-US')+' tokens')+RD.stat(n+' at once',fmtB(tot),(tot/h100*100).toFixed(tot/h100<0.1?1:0)+'% of one 80 GB H100');
      document.getElementById('rd-kv-src').innerHTML='Config: '+a('config.json',m.src)+' ('+m.kind+'). '+KV.note.split(';')[0]+'.'+(m.per_token_override?' MLA: 576 numbers × 61 layers × 2 bytes, as on the DeepSeek page.':'');}
    ['rd-kv-model','rd-kv-ctx','rd-kv-n'].forEach(id=>document.getElementById(id).addEventListener('input',kv));kv();}
  // ---------- provider table ----------
  const pt=document.getElementById('rd-pc-tbl');
  if(pt){const f=v=>v==null?'-':'$'+(v<0.1?v.toFixed(3):v.toFixed(2));
    pt.innerHTML='<tr><th>Provider</th><th>How you turn it on</th><th>Lifetime</th><th>Model</th><th class="num">Input</th><th class="num">Cache write</th><th class="num">Cache read</th><th class="num">Read / input</th><th class="num">Minimum</th></tr>'+
      PR.models.map(m=>{const p=PR.providers.find(q=>q.p===m.p);const first=PR.models.find(q=>q.p===m.p)===m;const n=PR.models.filter(q=>q.p===m.p).length;
        return '<tr>'+(first?'<td rowspan="'+n+'"><b>'+a(m.p,p.src)+'</b></td><td rowspan="'+n+'" class="small">'+p.how+'</td><td rowspan="'+n+'" class="small">'+p.ttl+'</td>':'')+
        '<td>'+m.m+'</td><td class="num">'+f(m.in)+'</td><td class="num">'+(m.w===m.in?'no surcharge':f(m.w)+(m.w1h?'<br><span class="small mute">1 h: '+f(m.w1h)+'</span>':''))+(m.store?'<br><span class="small mute">+ '+f(m.store)+' per M tokens per hour stored</span>':'')+'</td><td class="num">'+f(m.r)+'</td><td class="num">'+String(+(m.r/m.in).toFixed(3))+'&times;'+(m.p==='Google Gemini'?'<sup>d</sup>':'')+'</td><td class="num">'+(m.min?m.min.toLocaleString('en-US'):'varies')+'</td></tr>'}).join('')+
      '<tr><td colspan="9" class="small mute">Dollars per million tokens, standard tier, read '+PR.date+'. <sup>d</sup> Gemini publishes prices, not a multiplier: the ratio is derived. '+Object.values(PR.notes).join(' ')+'</td></tr>';}
  // ---------- break-even calculator ----------
  const TOK=[1024,2048,4096,10000,20000,50000,100000];
  const bm=document.getElementById('rd-be-model');
  if(bm){bm.innerHTML=PR.models.map((m,i)=>'<option value="'+i+'"'+(m.id==='sonnet55'?' selected':'')+'>'+m.p+': '+m.m+'</option>').join('');
    const box=document.getElementById('rd-be-svg');
    function be(){const m=PR.models[+bm.value],tok=TOK[+document.getElementById('rd-be-tok').value],n=+document.getElementById('rd-be-n').value;
      document.getElementById('rd-be-tokv').textContent=tok.toLocaleString('en-US');document.getElementById('rd-be-nv').textContent=n;
      const M=tok/1e6,below=m.min&&tok<m.min;
      const cost=k=>below?k*M*m.in:(M*m.w+(k-1)*M*m.r+(m.store?M*m.store:0));const plain=k=>k*M*m.in;
      const w=m.w/m.in,r=m.r/m.in,nb=1+(w-1)/(1-r)+(m.store?m.store/(m.in*(1-r)):0);
      document.getElementById('rd-be-out').innerHTML=RD.stat('Without caching','$'+plain(n).toFixed(4),n+' × '+tok.toLocaleString('en-US')+' tokens at $'+m.in)+
        RD.stat('With caching',below?'not cached':'$'+cost(n).toFixed(4),below?'below the '+m.min.toLocaleString('en-US')+'-token minimum':'1 write + '+(n-1)+(n===2?' read':' reads')+(m.store?' + 1 h storage':''))+
        (()=>{const sv=below?0:(1-cost(n)/plain(n))*100;return sv>=0?RD.stat('Saved',sv.toFixed(1)+'%','of this prefix\'s input cost'):RD.stat('Saved','none','caching costs '+(-sv).toFixed(1)+'% more at this reuse')})()+RD.stat('Break-even',nb.toFixed(2)+' uses','1 + (w − 1)/(1 − r)'+(m.store?' + storage/(input − read)':''));
      // chart: cost against number of uses
      const W=Math.min(RD.width(box),760),H=200,L=56,R=12,T=10,B=30,ww=W-L-R,hh=H-T-B,K=Math.max(n,5),ymax=plain(K)*1.05;
      const xs=k=>L+(k-1)/(K-1)*ww,ys=v=>T+hh-v/ymax*hh;let g='';
      for(let i=0;i<=4;i++){const v=ymax*i/4,y=ys(v);g+='<line x1="'+L+'" x2="'+(L+ww)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/>'+RD.t(L-4,y+4,'$'+v.toFixed(v<0.01?4:3),{a:'end',fs:10,fill:'var(--mute)'})}
      const step=Math.max(1,Math.round(K/8));for(let k=1;k<=K;k+=step)g+=RD.t(xs(k),H-12,String(k),{a:'middle',fs:10,fill:'var(--mute)'});
      g+=RD.t(L+ww/2,H-1,'uses of the same prefix',{a:'middle',fs:10,fill:'var(--mute)'});
      let d1='',d2='';for(let k=1;k<=K;k++){d1+=(d1?' L':'M')+xs(k).toFixed(1)+','+ys(plain(k)).toFixed(1);d2+=(d2?' L':'M')+xs(k).toFixed(1)+','+ys(cost(k)).toFixed(1)}
      g+='<path d="'+d1+'" fill="none" stroke="var(--bad)" stroke-width="2"/><path d="'+d2+'" fill="none" stroke="var(--good)" stroke-width="2.4"/>';
      g+=RD.t(xs(K)-4,ys(plain(K))+14,'no cache',{a:'end',fs:11,fill:'var(--bad)'})+RD.t(xs(K)-4,ys(cost(K))-6,below?'not cacheable':'with cache',{a:'end',fs:11,fill:'var(--good)'});
      box.innerHTML=RD.svg(W,H,g,'Input cost of a prefix against number of uses');}
    ['rd-be-model','rd-be-tok','rd-be-n'].forEach(id=>document.getElementById(id).addEventListener('input',be));RD.onRender(be);RD.onResize(be);be();}
  // ---------- semantic cache curves ----------
  const SM=CA.sem,sb=document.getElementById('rd-sem-svg');
  if(sb&&SM){let model='mini',data='qqp';
    function draw(){const m=SM[model][data],T=SM.thresholds;const W=Math.min(RD.width(sb),760),H=Math.round(Math.min(280,Math.max(210,W*0.42))),L=44,R=12,Tp=10,B=34,w=W-L-R,h=H-Tp-B;
      const xs=t=>L+(t-0.5)/0.5*w,ys=v=>Tp+h-v*h;let g='';
      for(let i=0;i<=4;i++){const y=ys(i/4);g+='<line x1="'+L+'" x2="'+(L+w)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/>'+RD.t(L-5,y+4,(i*25)+'%',{a:'end',fs:10,fill:'var(--mute)'})}
      for(let t=0.5;t<=1.0001;t+=0.1){const x=xs(t);g+='<line x1="'+x+'" x2="'+x+'" y1="'+Tp+'" y2="'+(Tp+h)+'" stroke="var(--line)"/>'+RD.t(x,Tp+h+14,t.toFixed(1),{a:'middle',fs:10,fill:'var(--mute)'})}
      g+=RD.t(L+w/2,H-3,'similarity threshold',{a:'middle',fs:11,fill:'var(--mute)'});
      [['tpr','var(--good)'],['fpr','var(--bad)']].forEach(([k,c])=>{let d='';T.forEach((t,i)=>{d+=(d?' L':'M')+xs(t).toFixed(1)+','+ys(m[k][i]).toFixed(1)});g+='<path d="'+d+'" fill="none" stroke="'+c+'" stroke-width="2.4"/>'});
      [0.9,0.95].forEach(t=>{const i=T.indexOf(t),x=xs(t);g+='<line x1="'+x+'" x2="'+x+'" y1="'+Tp+'" y2="'+(Tp+h)+'" stroke="var(--mute)" stroke-dasharray="3 3"/>'+
        RD.t(x+3,ys(m.tpr[i])-4,(m.tpr[i]*100).toFixed(0)+'%',{fs:10,fill:'var(--good)'})+RD.t(x+3,ys(m.fpr[i])-4,(m.fpr[i]*100).toFixed(0)+'%',{fs:10,fill:'var(--bad)'})});
      sb.innerHTML=RD.svg(W,H,g,'Share of duplicates and non-duplicates served from cache by threshold');}
    RD.seg(document.getElementById('rd-sem-model'),v=>{model=v;draw()});RD.seg(document.getElementById('rd-sem-data'),v=>{data=v;draw()});RD.onRender(draw);RD.onResize(draw);draw();
    const ht=document.getElementById('rd-sem-hand');
    if(ht)ht.innerHTML='<tr><th>Stored question</th><th>Incoming question</th><th class="num">Cosine</th><th>Same answer?</th><th>Served at 0.90?</th></tr>'+SM.hand_pairs.map(p=>{const s=p.sim>=0.9;const ok=s===p.same_answer;
      return '<tr><td>'+RD.esc(p.a)+'</td><td>'+RD.esc(p.b)+'</td><td class="num">'+p.sim.toFixed(3)+'</td><td>'+(p.same_answer?'yes':'<b>no</b>')+'</td><td style="color:'+(ok?'var(--good)':'var(--bad)')+'">'+(s?'served':'not served')+(ok?'':(s?': wrong answer':': missed saving'))+'</td></tr>'}).join('');}
})();
