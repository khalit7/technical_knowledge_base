// ---- Sample-size calculator tab ----
(function(){
  const S=window.EST,$=id=>document.getElementById(id);if(!$('sz-bin'))return;
  window.ES_CHECK=window.ES_CHECK||{};
  const zq=S.zq;
  // ---- pass/fail, paired ----
  const B={p:$('sz-p'),d:$('sz-d'),q:$('sz-q'),n:$('sz-n'),a:$('sz-a'),pw:$('sz-pw'),s:$('sz-s')};
  function binCore(p,dl,q,n,a,pw,s){
    const al=a/s,za=zq(1-al/2),zb=zq(pw),D=dl/100,pb=p;
    const varP=Math.max(1e-9,q-D*D),nP=Math.ceil((za+zb)**2*varP/(D*D)),nU=Math.ceil((za+zb)**2*2*pb*(1-pb)/(D*D));
    const mdeP=100*(za+zb)*Math.sqrt(q/n),mdeU=100*(za+zb)*Math.sqrt(2*pb*(1-pb)/n);
    const ciP=100*zq(1-al/2)*Math.sqrt(varP/n),ciU=100*zq(1-al/2)*Math.sqrt(2*pb*(1-pb)/n);
    const powN=S.Phi(D/Math.sqrt(varP/n)-za);
    return{nP,nU,mdeP,mdeU,ciP,ciU,powN,al,za,zb}}
  function exactN(q,D,al,target){if(q<=D)return NaN;const p10=(q+D)/2,p01=(q-D)/2;let lo=10,hi=20;
    while(S.mcPower(hi,p10,p01,al).power<target){lo=hi;hi*=2;if(hi>40000)return NaN}
    while(hi-lo>Math.max(2,hi*.004)){const m=Math.round((lo+hi)/2);if(S.mcPower(m,p10,p01,al).power>=target)hi=m;else lo=m}return hi}
  const BP=[
    {k:'root',l:'Parent topic: 200 items',v:{p:.7,d:2,q:.1,n:200,s:1},rep:r=>'The parent topic\'s Reading ("Statistics in brief") quotes a 2-point drop over 200 items as ±9.0 unpaired and ±4.4 paired at 10% disagreement, 8,242 and 1,955 items to detect it, and a minimum detectable effect of about 6 points paired, 13 unpaired. Here: ±'+r.ciU.toFixed(1)+' and ±'+r.ciP.toFixed(1)+', '+r.nU.toLocaleString('en-US')+' and '+r.nP.toLocaleString('en-US')+' items, MDE '+r.mdeP.toFixed(1)+' and '+r.mdeU.toFixed(1)+' points. Residual 0 (same formulas; by construction).',ok:1},
    {k:'old2',l:'Old rule: "2-point drop needs about 3,500"',v:{p:.7,d:2,q:.1,n:3500,s:1},rep:r=>'The old Production page said a 2-point drop near 70% needs "roughly n=3500" unpaired, citing the rule MDE ≈ 2.8·√(2p(1 − p)/n). That rule gives 2.8² × 2 × 0.21 / 0.02² = 8,232; this calculator, with exact quantiles, gives '+r.nU.toLocaleString('en-US')+'. Residual against the old figure: about '+(r.nU-3500).toLocaleString('en-US')+' items. At 3,500 items the unpaired MDE is '+r.mdeU.toFixed(1)+' points, not 2. Corrected on this page.',ok:0},
    {k:'prod',l:'Old worked example: 78% on 300 items, 5-point drop',v:{p:.78,d:5,q:.15,n:300,s:1},rep:(r,x)=>'Old text: unpaired needs "roughly n = 16 × 0.17 / 0.05² = 1100"; here '+r.nU.toLocaleString('en-US')+' (16 rounds 2 × 2.8² = 15.7; residual small). Paired: "a 5-point true regression is detected with high power at n=300" does not hold for the stated 15% disagreement: normal approximation '+(100*r.powN).toFixed(0)+'% power, exact McNemar '+(x?(100*x.power).toFixed(0)+'%':'(computing)')+'. 80% power needs about '+r.nP+' items (normal approximation) or '+(x&&x.n80?x.n80:'(computing)')+' with the exact test. Corrected on this page.',ok:0},
    {k:'card',l:'Card et al. 2020: 500 items, 90% agreement',v:{p:.7,d:2,q:.1,n:500,s:1},rep:(r,x)=>'Card et al., Appendix C: n = 500, the models agree on 90% of items, a 2-point improvement: "power of this test is approximately 0.25" with "a Type-M error factor of 1.9"; at 2,000 items "nearly 80% power, with a Type-M factor of only 1.1". Exact McNemar here: '+(x?(100*x.power).toFixed(1)+'% and Type-M '+x.typeM.toFixed(2):'(computing)')+' at 500 (move n to 2,000 for the second figure). Reproduced independently by exact summation (their figure is a simulation).',ok:1},
  ];
  if(S.race){const g=S.race.g,n=g[0].length;let b=0,c=0;for(let i=0;i<n;i++){if(g[0][i]&&!g[1][i])b++;if(!g[0][i]&&g[1][i])c++}
    const pa=S.mean(g[0]),pb=S.mean(g[1]);
    BP.push({k:'race',l:'RACE-H, measured on this page',v:{p:+pa.toFixed(2),d:+Math.max(.5,Math.round(Math.abs(pb-pa)*200)/2).toFixed(1),q:+((b+c)/n).toFixed(2),n:Math.round(n/10)*10,s:1},rep:r=>'Measured on this page\'s RACE-H run (Interval lab): '+S.race.models[0]+' passes '+(100*pa).toFixed(1)+'%, '+S.race.models[1]+' '+(100*pb).toFixed(1)+'% (greedy answers), and they disagree on '+(100*(b+c)/n).toFixed(1)+'% of the '+n+' questions. Real inputs, rounded to the sliders\' steps; clustering by passage is not in this mode (use the other mode\'s DEFF).',ok:1})}
  let curB=null,timer=0;
  $('sz-bpre').innerHTML=BP.map(p=>'<button data-k="'+p.k+'">'+p.l+'</button>').join('');
  $('sz-bpre').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const P=BP.find(x=>x.k===b.dataset.k);curB=P;
    B.p.value=P.v.p;B.d.value=P.v.d;B.q.value=P.v.q;B.n.value=P.v.n;B.s.value=P.v.s;B.a.value='0.05';B.pw.value='0.8';
    document.querySelectorAll('#sz-bpre button').forEach(x=>x.classList.toggle('on',x===b));drawB(true)});
  Object.values(B).forEach(el=>el.addEventListener('input',()=>{curB=null;document.querySelectorAll('#sz-bpre button').forEach(x=>x.classList.remove('on'));drawB(false)}));
  function drawB(fromPreset){
    const p=+B.p.value,dl=+B.d.value,q=Math.max(+B.q.value,dl/100+.005),n=+B.n.value,a=+B.a.value,pw=+B.pw.value,s=+B.s.value;
    if(+B.q.value<dl/100)B.q.value=q.toFixed(2);
    $('sz-pv').textContent=Math.round(p*100)+'%';$('sz-dv').textContent=dl.toFixed(1);$('sz-qv').textContent=Math.round(q*100)+'%';$('sz-nv').textContent=n.toLocaleString('en-US');$('sz-sv').textContent=s;
    const r=binCore(p,dl,q,n,a,pw,s);
    $('sz-bout').innerHTML=RD.stat('Items needed, paired',r.nP.toLocaleString('en-US'),'normal approximation, '+Math.round(pw*100)+'% power')+RD.stat('Items needed, unpaired',r.nU.toLocaleString('en-US'),'per model, different items')+
      RD.stat('Smallest detectable effect at n = '+n.toLocaleString('en-US'),r.mdeP.toFixed(1)+' pts','paired; unpaired '+r.mdeU.toFixed(1)+' pts')+RD.stat('95% interval half-width at n',(r.ciP).toFixed(1)+' pts','paired; unpaired '+r.ciU.toFixed(1)+(s>1?' (per slice, α/'+s+')':''));
    $('sz-btab').innerHTML='<tr><th>Exact McNemar test at n = '+n.toLocaleString('en-US')+'</th><th class="num">Value</th></tr><tr><td>Power (normal approximation)</td><td class="num">'+(100*r.powN).toFixed(1)+'%</td></tr><tr><td>Power (exact test)</td><td class="num" id="sz-xp">computing</td></tr><tr><td>Type-M factor (exact)</td><td class="num" id="sz-xm">computing</td></tr><tr><td>Items for '+Math.round(pw*100)+'% power (exact test)</td><td class="num" id="sz-xn">computing</td></tr>';
    const rep=$('sz-brep');if(curB){rep.hidden=false;rep.classList.toggle('bad',!curB.ok);rep.innerHTML=curB.rep(r,null)}else rep.hidden=true;
    clearTimeout(timer);timer=setTimeout(()=>{const D=dl/100,x=S.mcPower(n,(q+D)/2,(q-D)/2,r.al);const n80=exactN(q,D,r.al,pw);x.n80=n80;
      $('sz-xp').textContent=(100*x.power).toFixed(1)+'%';$('sz-xm').textContent=isFinite(x.typeM)?x.typeM.toFixed(2)+'×':'n/a';$('sz-xn').textContent=isFinite(n80)?'about '+n80.toLocaleString('en-US'):'over 40,000';
      if(curB)rep.innerHTML=curB.rep(r,x);
      if(curB&&curB.k==='card')window.ES_CHECK.card500=x;if(curB&&curB.k==='prod')window.ES_CHECK.prod={power:x.power,n80:n80,powN:r.powN,nP:r.nP,nU:r.nU};if(curB&&curB.k==='root')window.ES_CHECK.sizeRoot=r},fromPreset?10:180);
  }
  // ---- general (Miller Eq. 9 / 10) ----
  const G={w:$('sz-w'),sa:$('sz-sa'),sb:$('sz-sb'),k:$('sz-k'),d:$('sz-gd'),n:$('sz-gn'),m:$('sz-m'),r:$('sz-r')};
  const GP=[
    {k:'m969',l:'Miller §5: 3 points needs about 969 questions',v:{w:1/9,sa:0,sb:0,k:1,d:3,n:969,m:1,r:0},rep:o=>'Miller: "the eval will need to contain at least n = (z0.025 + z0.20)²(1/9)/(0.03)² ≈ 969 independent questions" (ω² = 1/9 from two uniform scores with correlation 0.5, no within-item noise). Here: '+o.n.toLocaleString('en-US')+'. Residual '+(o.n-969)+'.'},
    {k:'mk1',l:'Miller §5: n = 198, K = 1',v:{w:1/9,sa:1/6,sb:1/6,k:1,d:13.2,n:198,m:1,r:0},rep:o=>'Miller: with σ² = 1/6 for both models and n = 198, "increasing K from 1 to 10 reduces the Minimum Detectable Effect from 13.2% to 7.5%". Here at K = '+o.K+': MDE '+o.mde.toFixed(1)+' points. Residual '+(o.mde-13.2).toFixed(2)+'.'},
    {k:'mk10',l:'Miller §5: n = 198, K = 10',v:{w:1/9,sa:1/6,sb:1/6,k:10,d:7.5,n:198,m:1,r:0},rep:o=>'Same example at K = 10: Miller 7.5%, here '+o.mde.toFixed(1)+' points. Residual '+(o.mde-7.5).toFixed(2)+'.'}
  ];
  $('sz-gpre').innerHTML=GP.map(p=>'<button data-k="'+p.k+'">'+p.l+'</button>').join('');
  let curG=null;
  $('sz-gpre').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const P=GP.find(x=>x.k===b.dataset.k);curG=P;Object.keys(P.v).forEach(k=>G[k].value=P.v[k]);
    document.querySelectorAll('#sz-gpre button').forEach(x=>x.classList.toggle('on',x===b));drawG()});
  Object.values(G).forEach(el=>el.addEventListener('input',()=>{curG=null;document.querySelectorAll('#sz-gpre button').forEach(x=>x.classList.remove('on'));drawG()}));
  function genCore(w,sa,sb,K,dl,n,m,rho){const za=S.Z95,zb=S.Z80,deff=1+(m-1)*rho,v=(w+sa/K+sb/K)*deff,D=dl/100;
    return{n:Math.ceil((za+zb)**2*v/(D*D)),mde:100*(za+zb)*Math.sqrt(v/n),deff,K,v,mdeK1:100*(za+zb)*Math.sqrt((w+sa+sb)*deff/n),nK1:Math.ceil((za+zb)**2*(w+sa+sb)*deff/(D*D))}}
  function drawG(){
    const w=+G.w.value,sa=+G.sa.value,sb=+G.sb.value,K=+G.k.value,dl=+G.d.value,n=+G.n.value,m=+G.m.value,rho=+G.r.value;
    $('sz-wv').textContent=w.toFixed(3);$('sz-sav').textContent=sa.toFixed(3);$('sz-sbv').textContent=sb.toFixed(3);$('sz-kv').textContent=K;$('sz-gdv').textContent=dl.toFixed(1);$('sz-gnv').textContent=n.toLocaleString('en-US');$('sz-mv').textContent=m;$('sz-rv').textContent=rho.toFixed(2);
    const o=genCore(w,sa,sb,K,dl,n,m,rho);
    $('sz-gout').innerHTML=RD.stat('Items needed for '+dl.toFixed(1)+' points',o.n.toLocaleString('en-US'),K>1?'K = 1 would need '+o.nK1.toLocaleString('en-US'):'80% power, α = 0.05')+RD.stat('Smallest detectable effect at n = '+n.toLocaleString('en-US'),o.mde.toFixed(1)+' pts',K>1?'K = 1: '+o.mdeK1.toFixed(1)+' pts':'paired')+
      RD.stat('Design effect',o.deff.toFixed(2)+'×',m>1?'clusters of '+m+', ρ = '+rho.toFixed(2):'independent items')+RD.stat('Variance per item',o.v.toFixed(4),'ω² + σ²/K, times DEFF');
    const rep=$('sz-grep');if(curG){rep.hidden=false;rep.innerHTML=curG.rep(o)}else rep.hidden=true;
    window.ES_CHECK.gen=window.ES_CHECK.gen||{};if(curG)window.ES_CHECK.gen[curG.k]=o;
  }
  $('sz-mode').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;document.querySelectorAll('#sz-mode button').forEach(x=>x.classList.toggle('on',x===b));
    $('sz-bin').hidden=b.dataset.m!=='bin';$('sz-gen').hidden=b.dataset.m!=='gen';if(b.dataset.m==='gen')drawG();else drawB(false)});
  // published checks at load (independent of the tab being opened)
  window.ES_CHECK.sizeRootCore=binCore(.7,2,.1,200,.05,.8,1);
  window.ES_CHECK.genCore={m969:genCore(1/9,0,0,1,3,969,1,0).n,mk1:genCore(1/9,1/6,1/6,1,13.2,198,1,0).mde,mk10:genCore(1/9,1/6,1/6,10,7.5,198,1,0).mde};
  let first=true;onTab('t-size',()=>{if(first){first=false;document.querySelector('#sz-bpre button').click();document.querySelector('#sz-gpre button').click()}});
})();
