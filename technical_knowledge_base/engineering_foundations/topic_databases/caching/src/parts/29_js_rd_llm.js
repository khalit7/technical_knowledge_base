// ---- Sections 11 and 12: provider prompt-caching prices and break-even, semantic-cache curves (the KV cache calculator moved out on 2026-10-19: Topic: inference-and-serving owns it) ----
(function(){
  const a=(t,u)=>'<a href="'+u+'" target="_blank" rel="noopener noreferrer">'+t+'</a>';
  const KV=CA.kv,PR=CA.prices;
  // ---------- provider table ----------
  const pt=document.getElementById('rd-pc-tbl');
  if(pt){const f=v=>v==null?'-':'$'+(v<0.1?v.toFixed(3):v.toFixed(2));
    pt.innerHTML='<tr><th>Provider</th><th>Model</th><th class="num">Input</th><th class="num">Cache write</th><th class="num">Cache read</th><th class="num">Read / input</th></tr>'+
      PR.models.map(m=>{const p=PR.providers.find(q=>q.p===m.p);const first=PR.models.find(q=>q.p===m.p)===m;const n=PR.models.filter(q=>q.p===m.p).length;
        return '<tr>'+(first?'<td rowspan="'+n+'"><b>'+a(m.p,p.src)+'</b></td>':'')+
        '<td>'+m.m+'</td><td class="num">'+f(m.in)+'</td><td class="num">'+(m.w===m.in?'no surcharge':f(m.w)+(m.w1h?'<br><span class="small mute">1 h: '+f(m.w1h)+'</span>':''))+(m.store?'<br><span class="small mute">+ '+f(m.store)+' per M tokens per hour stored</span>':'')+'</td><td class="num">'+f(m.r)+'</td><td class="num">'+String(+(m.r/m.in).toFixed(3))+'&times;'+(m.p==='Google Gemini'?'<sup>d</sup>':'')+'</td></tr>'}).join('')+
      '<tr><td colspan="6" class="small mute">Dollars per million tokens, standard tier, read '+PR.date+'. <sup>d</sup> Gemini publishes prices, not a multiplier: the ratio is derived. '+Object.values(PR.notes).join(' ')+'</td></tr>';}
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
    ['rd-be-model','rd-be-tok','rd-be-n'].forEach(id=>document.getElementById(id).addEventListener('input',be));RD.onRender(be);RD.onResize(be);be();
    const det=document.getElementById('rd-pc-det');if(det)det.addEventListener('toggle',()=>{if(det.open)be()});}
  // ---------- hand-written semantic pairs (the threshold curves are drawn by 33_js_sem.js) ----------
  const SM=CA.sem;
  if(SM){
    const ht=document.getElementById('rd-sem-hand');
    if(ht)ht.innerHTML='<tr><th>Stored question</th><th>Incoming question</th><th class="num">Cosine</th><th>Same answer?</th><th>Served at 0.90?</th></tr>'+SM.hand_pairs.map(p=>{const s=p.sim>=0.9;const ok=s===p.same_answer;
      return '<tr><td>'+RD.esc(p.a)+'</td><td>'+RD.esc(p.b)+'</td><td class="num">'+p.sim.toFixed(3)+'</td><td>'+(p.same_answer?'yes':'<b>no</b>')+'</td><td style="color:'+(ok?'var(--good)':'var(--bad)')+'">'+(s?'served':'not served')+(ok?'':(s?': wrong answer':': missed saving'))+'</td></tr>'}).join('');}
})();
