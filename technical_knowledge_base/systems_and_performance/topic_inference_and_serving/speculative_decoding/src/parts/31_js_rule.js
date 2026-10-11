// ---- Tab: Acceptance rule lab (t-sdrule) ----
(function(){
  const D=SD.D,tab=document.getElementById('t-sdrule');if(!tab)return;
  const $=id=>document.getElementById(id);
  // regularised upper incomplete gamma Q(a, x), for chi-square p-values (Numerical Recipes series and continued fraction)
  function lgam(x){const c=[76.18009172947146,-86.50532032941677,24.01409824083091,-1.231739572450155,0.1208650973866179e-2,-0.5395239384953e-5];
    let y=x,t=x+5.5;t-=(x+0.5)*Math.log(t);let s=1.000000000190015;for(const v of c)s+=v/++y;return -t+Math.log(2.5066282746310005*s/x)}
  function gq(a,x){if(x<=0)return 1;if(x<a+1){let ap=a,sum=1/a,del=sum;for(let n=0;n<500;n++){ap++;del*=x/ap;sum+=del;if(Math.abs(del)<Math.abs(sum)*1e-12)break}
      return 1-sum*Math.exp(-x+a*Math.log(x)-lgam(a))}
    let b=x+1-a,c=1e300,d=1/b,h=d;for(let i=1;i<500;i++){const an=-i*(i-a);b+=2;d=an*d+b;if(Math.abs(d)<1e-300)d=1e-300;c=b+an/c;if(Math.abs(c)<1e-300)c=1e-300;d=1/d;const del=d*c;h*=del;if(Math.abs(del-1)<1e-12)break}
    return Math.exp(-x+a*Math.log(x)-lgam(a))*h}
  SD.chi2p=(x,df)=>gq(df/2,x/2);
  // ---- 1. hand-made p and q ----
  const TOK=['A','B','C','D','E'];
  const presets={close:[[40,30,15,10,5],[30,35,15,15,5]],far:[[50,25,10,10,5],[5,10,15,20,50]],confident:[[85,8,4,2,1],[60,25,8,5,2]],flat:[[20,20,20,20,20],[50,20,15,10,5]]};
  let P=presets.close[0].slice(),Q=presets.close[1].slice(),rule='lev';
  const norm=a=>{const s=a.reduce((x,y)=>x+y,0)||1;return a.map(x=>x/s)};
  function outDist(p,q,r){const m=p.map((x,i)=>Math.min(x,q[i])),al=m.reduce((a,b)=>a+b,0);
    if(r==='lev'||r==='sac'||r==='greedy')return p.slice();
    if(r==='bug')return p.map((x,i)=>m[i]+(1-al)*x);
    return q.slice()}
  function accRate(p,q,r){if(r==='lev'||r==='bug')return p.reduce((a,x,i)=>a+Math.min(x,q[i]),0);if(r==='sac')return p.reduce((a,x,i)=>a+x*q[i],0);
    if(r==='greedy'){const g=q.indexOf(Math.max(...q));return p[g]}return 1}
  function sl(){$('sdr-sl').innerHTML=TOK.map((t,i)=>'<div class="sdr-row"><span><b>'+t+'</b></span><input type="range" min="0" max="100" value="'+P[i]+'" data-w="p" data-i="'+i+'" aria-label="p of '+t+'"><input type="range" min="0" max="100" value="'+Q[i]+'" data-w="q" data-i="'+i+'" aria-label="q of '+t+'"></div>').join('')}
  function bars(el,rows){el.innerHTML=rows.map(r=>'<div class="row"><span class="nm">'+r[0]+'</span><span class="track">'+r[1].map(b=>'<span class="fill" style="width:'+(100*b.v).toFixed(1)+'%;background:'+b.c+';'+(b.top?'top:'+b.top+'px;bottom:'+b.bot+'px':'')+(b.o?';opacity:'+b.o:'')+'"></span>').join('')+'</span><span class="val">'+r[2]+'</span></div>').join('')}
  function upd(){const p=norm(P),q=norm(Q),o=outDist(p,q,rule);
    const al=accRate(p,q,'lev'),spq=accRate(p,q,'sac'),pg=accRate(p,q,'greedy');
    const tv=0.5*o.reduce((a,x,i)=>a+Math.abs(x-p[i]),0);
    $('sdr-stats').innerHTML=RD.stat('&alpha; = &Sigma; min(p, q)',SD.fmt(al,3),'min(1, p/q) keeps a guess')+RD.stat('&Sigma; p&middot;q',SD.fmt(spq,3),'sample and compare keeps a guess')+RD.stat('p(top of q)',SD.fmt(pg,3),'greedy draft keeps a guess')+RD.stat('Output vs p (total variation)',SD.fmt(tv,3),tv<1e-9?'exact':'distorted');
    bars($('sdr-out'),TOK.map((t,i)=>[t+' output',[{v:p[i],c:'var(--c1)',top:1,bot:8,o:.85},{v:o[i],c:rule==='lev'||rule==='sac'||rule==='greedy'?'var(--good)':'var(--bad)',top:9,bot:1}],SD.fmt(o[i],3)+' / '+SD.fmt(p[i],3)]));
    $('sdr-mc').innerHTML='';}
  sl();
  $('sdr-sl').addEventListener('input',e=>{const t=e.target;if(!t.dataset.w)return;(t.dataset.w==='p'?P:Q)[+t.dataset.i]=+t.value;upd()});
  SD.segs($('sdr-preset'),[['close','Draft close to target'],['far','Draft far from target'],['confident','Both confident'],['flat','Target unsure']],'close',m=>{P=presets[m][0].slice();Q=presets[m][1].slice();sl();upd()});
  SD.segs($('sdr-rule'),[['lev','min(1, p/q)'],['sac','Sample and compare'],['greedy','Greedy draft'],['bug','Bug: resample from p'],['none','No verification']],'lev',m=>{rule=m;upd()});
  $('sdr-go').addEventListener('click',()=>{const p=norm(P),q=norm(Q),n=+$('sdr-n').value,R=SD.rng(7),cnt=[0,0,0,0,0];let acc=0;
    const pick=w=>{const u=R();let c=0;for(let i=0;i<w.length;i++){c+=w[i];if(u<c)return i}return w.length-1};
    const res=norm(p.map((x,i)=>Math.max(0,x-q[i])));const gi=q.indexOf(Math.max(...q));
    for(let j=0;j<n;j++){let out;
      if(rule==='lev'||rule==='bug'){const x=pick(q);if(R()<Math.min(1,p[x]/q[x])){out=x;acc++}else out=rule==='lev'?(res.some(v=>v>0)?pick(res):pick(p)):pick(p)}
      else if(rule==='sac'){const x=pick(q),t=pick(p);out=t;if(t===x)acc++}
      else if(rule==='greedy'){const t=pick(p);out=t;if(t===gi)acc++}
      else{out=pick(q);acc++}
      cnt[out]++}
    let chi=0,df=0;p.forEach((x,i)=>{if(x>0){chi+=Math.pow(cnt[i]-n*x,2)/(n*x);df++}});df=Math.max(1,df-1);
    const pv=SD.chi2p(chi,df);
    $('sdr-mc').innerHTML='<b>'+n.toLocaleString('en-GB')+' draws:</b> kept the draft\'s token '+SD.fmt(100*acc/n,1)+'% of the time; output counts '+cnt.map((c,i)=>TOK[i]+' '+c.toLocaleString('en-GB')).join(', ')+'; chi-square against p = '+SD.fmt(chi,1)+' on '+df+' degrees of freedom, p-value '+(pv<1e-4?'below 0.0001':SD.fmt(pv,3))+(pv<0.01?' (the rule does not reproduce p)':' (consistent with p)')+'.'});
  upd();
  // ---- 2. real positions ----
  const T=D.dists||{};const tn=Object.keys(T);let ct=tn.includes('story')?'story':tn[0],ci=0;
  const tlabel={story:'Story',code_edit:'Code edit',list:'List',summarize:'Summary'};
  function strip(){const rows=T[ct];if(!rows)return;
    $('sdr-strip').innerHTML=rows.map((r,i)=>'<span data-i="'+i+'" class="'+(i===ci?'sel':'')+'" title="alpha '+SD.fmt(r.a,2)+'" style="background:color-mix(in srgb,var(--good) '+Math.round(r.a*70)+'%,transparent)">'+SD.esc(r.tok)+'</span>').join('');pos()}
  function pos(){const r=T[ct][ci];if(!r)return;
    $('sdr-pstats').innerHTML=RD.stat('Token written here',SD.esc(JSON.stringify(r.tok)))+RD.stat('&alpha; = &Sigma; min(p, q)',SD.fmt(r.a,3))+RD.stat('&Sigma; p&middot;q (sample and compare)',SD.fmt(r.spq,3))+RD.stat('p(top of q) (greedy draft)',SD.fmt(r.pg,3));
    const mx=Math.max(...r.top.map(x=>Math.max(x[1],x[2])))||1;
    bars($('sdr-pbars'),r.top.slice(0,10).map(x=>[SD.esc(JSON.stringify(x[0])),[{v:x[1]/mx,c:'var(--c1)',top:1,bot:8,o:.85},{v:x[2]/mx,c:'var(--c2)',top:9,bot:1,o:.85}],SD.fmt(x[1],2)+' / '+SD.fmt(x[2],2)]));
    const m=rows=>rows.reduce((a,x)=>a+x,0)/rows.length;
    $('sdr-pnote').innerHTML='<span class="meas">measured here</span> Blue: target p; orange: draft q (top 50 kept on both, the largest shown). Over this whole text: mean &alpha; '+SD.fmt(m(T[ct].map(x=>x.a)),3)+', mean &Sigma; p&middot;q '+SD.fmt(m(T[ct].map(x=>x.spq)),3)+', mean p(top of q) '+SD.fmt(m(T[ct].map(x=>x.pg)),3)+'.'}
  if(tn.length){SD.segs($('sdr-text'),tn.map(n=>[n,tlabel[n]||n]),ct,m=>{ct=m;ci=0;strip()});
    $('sdr-strip').addEventListener('click',e=>{const s=e.target.closest('span[data-i]');if(!s)return;ci=+s.dataset.i;$('sdr-strip').querySelectorAll('span.sel').forEach(x=>x.classList.remove('sel'));s.classList.add('sel');pos()});strip()}
  // ---- 3. exactness test ----
  const E=D.exact;
  const vlab={target:'Sample the target directly (control)',leviathan:'min(1, p/q) with residual',sample_compare:'Sample and compare',greedy_compare:'Greedy draft, accept if target agrees',bug_resample_p:'Bug: on rejection draw from p'};
  if(E){$('sdr-ex').innerHTML='<thead><tr><th>Rule</th><th class="num">chi-square</th><th class="num">df</th><th class="num">p-value</th><th class="num">guesses kept per step</th><th>verdict</th></tr></thead><tbody>'+
      Object.keys(vlab).filter(v=>E.variants[v]).map(v=>{const x=E.variants[v];return '<tr><td>'+vlab[v]+'</td><td class="num">'+SD.fmt(x.chi2,1)+'</td><td class="num">'+x.df+'</td><td class="num">'+(x.p<1e-6?'&lt; 10<sup>&minus;6</sup>':SD.fmt(x.p,2))+'</td><td class="num">'+(v==='target'?'n/a':SD.fmt(x.acc,2))+'</td><td>'+(x.p<0.01?'<b style="color:var(--bad)">not exact</b>':'consistent with exact')+'</td></tr>'}).join('')+'</tbody>';
    let cv='bug_resample_p';
    const exdraw=()=>{const x=E.variants[cv],el=$('sdr-exsvg'),W=Math.max(280,Math.min(860,SD.width(el))),lab=Math.min(170,W*0.38),bw=W-lab-70,rh=20,H=x.top.length*rh+6;
      const mx=Math.max(...x.top.map(r=>Math.max(r[1],r[2])));let s='';
      x.top.forEach((r,i)=>{const y=i*rh+3;s+='<text x="'+(lab-6)+'" y="'+(y+13)+'" text-anchor="end" font-size="11">'+SD.esc(r[0].slice(0,Math.floor(lab/6.2)))+'</text>'+
        '<rect x="'+lab+'" y="'+(y+2)+'" width="'+(bw*r[2]/mx).toFixed(1)+'" height="7" fill="var(--c1)"/><rect x="'+lab+'" y="'+(y+10)+'" width="'+(bw*r[1]/mx).toFixed(1)+'" height="7" fill="'+(x.p<0.01?'var(--bad)':'var(--good)')+'"/>'+
        '<text x="'+(lab+bw*Math.max(r[1],r[2])/mx+4)+'" y="'+(y+14)+'" font-size="10" fill="var(--mute)">'+r[1]+' / '+SD.fmt(r[2],0)+'</text>'});
      el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="observed against expected openings">'+s+'</svg><div class="sd-leg"><span><i style="background:var(--c1)"></i>expected (target)</span><span><i style="background:var(--good)"></i>observed, exact rule</span><span><i style="background:var(--bad)"></i>observed, failing rule</span></div>'};
    SD.segs($('sdr-exv'),Object.keys(vlab).filter(v=>E.variants[v]).map(v=>[v,vlab[v]]),cv,m=>{cv=m;exdraw()});
    (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-sdrule']=window.TAB_RENDER['t-sdrule']||[]).push(exdraw);
    addEventListener('resize',()=>{if(!tab.hidden)exdraw()});exdraw()}
  SD.pred('sd-pr3');
})();
