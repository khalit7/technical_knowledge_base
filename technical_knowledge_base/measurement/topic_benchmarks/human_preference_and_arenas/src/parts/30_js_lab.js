// ---- Tab: Fit the votes (ids lb-) ----
(function(){
  const S=window.HPD.lab,D=HP.decode(S),F=window.HPD.fits.boards.overall.rows;const full={};F.forEach(r=>full[r.m]=r);
  const st={meth:'bt',style:[false,false,false,false],K:4,ord:'time',seed:7,n:D.n,ties:'half',ci:'sand'};
  const $=id=>document.getElementById(id);
  const esc=RD.esc;
  function bootstrap(idx,style,mean){ // resample votes with replacement, refit; 200 rounds, fixed seed
    const r=(function(){let a=12345;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}})();
    const R=[];for(let b=0;b<200;b++){const s=idx.map(()=>idx[Math.floor(r()*idx.length)]);
      const f=HP.fit(HP.rowsFor(D,s,style,st.ties),D.m,style.length,style.length?0.5:0);R.push(HP.points(f.r,mean))}
    return [...Array(D.m).keys()].map(i=>{const v=R.map(x=>x[i]).sort((a,b)=>a-b);return [v[Math.floor(0.025*v.length)],v[Math.ceil(0.975*v.length)-1]]});
  }
  let cache={};
  function run(){
    const idx=[...Array(st.n).keys()];const style=[0,1,2,3].filter(k=>st.style[k]);
    const sc=style.length>0;const mean=S.models.reduce((s,m)=>s+(sc?full[m].sc:full[m].bt),0)/D.m;
    let rating,ci=null,gamma=[];
    if(st.meth==='bt'){
      const f=HP.fit(HP.rowsFor(D,idx,style,st.ties),D.m,style.length,sc?0.5:0);rating=HP.points(f.r,mean);gamma=f.gamma;
      if(st.ci==='sand')ci=rating.map((v,i)=>{const se=400*Math.sqrt(f.V[i][i]);return [v-1.96*se,v+1.96*se]});
      else{const key=[st.n,style.join(''),st.ties].join('|');ci=cache[key]||(cache[key]=bootstrap(idx,style,mean))}
    } else {
      let order=st.ord==='time'?idx:st.ord==='rev'?idx.slice().reverse():HP.shuffled(st.n,st.seed);
      if(st.ties==='drop')order=order.filter(i=>HP.score(D.O[i])!==0.5);
      rating=HP.elo(D,order,st.K).map(v=>v-1000+mean);
    }
    const order=[...Array(D.m).keys()].sort((a,b)=>rating[b]-rating[a]);
    const ref=S.models.map(m=>sc&&st.meth==='bt'?(full[m].osc!=null?full[m].osc:full[m].sc):(full[m].obt!=null?full[m].obt:full[m].bt));
    const sp=ci?HP.spread(ci):null;
    let lo=Math.min(...rating,...ref),hi=Math.max(...rating,...ref);if(ci){lo=Math.min(lo,...ci.map(c=>c[0]));hi=Math.max(hi,...ci.map(c=>c[1]))}
    lo-=5;hi+=5;const pc=v=>((v-lo)/(hi-lo)*100).toFixed(2)+'%';
    $('lb-tab').querySelector('tbody').innerHTML=order.map((i,k)=>'<tr><td class="num">'+(k+1)+'</td><td>'+esc(S.models[i])+'</td><td class="num">'+rating[i].toFixed(1)+'</td><td class="num">'+(ci?ci[i][0].toFixed(0)+' to '+ci[i][1].toFixed(0):'none')+'</td><td><div class="lb-ci">'+(ci?'<i style="left:'+pc(ci[i][0])+';width:calc('+pc(ci[i][1])+' - '+pc(ci[i][0])+')"></i>':'')+'<b style="left:'+pc(rating[i])+'"></b><s style="left:'+pc(ref[i])+'" title="LMArena full-data rating"></s></div></td><td class="num">'+(sp?sp[i][0]+' to '+sp[i][1]:'')+'</td><td class="num">'+ref[i].toFixed(1)+'</td></tr>').join('');
    const rho=HP.spearman(rating,ref);const mad=rating.reduce((s,v,i)=>s+Math.abs(v-ref[i]),0)/D.m;
    const ties=idx.filter(i=>HP.score(D.O[i])===0.5).length;
    $('lb-out').innerHTML=RD.stat('Votes',st.n.toLocaleString('en-US'),ties.toLocaleString('en-US')+' ties or both bad'+(st.ties==='drop'?', dropped':', counted half'))+
      RD.stat('Rank agreement with full data',rho.toFixed(3),'Spearman, ten models')+RD.stat('Mean gap to full data',mad.toFixed(1)+' pts','after centring on the same mean')+
      (st.meth==='bt'&&style.length?RD.stat('Style coefficients',gamma.map((g,j)=>['tok','hdr','list','bold'][style[j]]+' '+g.toFixed(3)).join(', '),'logit per standard deviation'):RD.stat('Method',st.meth==='bt'?'Bradley-Terry':'online Elo, K = '+st.K,st.meth==='bt'?'maximum likelihood, all votes at once':({time:'time order',rev:'reversed',shuf:'shuffled, seed '+st.seed})[st.ord]));
    $('lb-ci-note').textContent=st.meth!=='bt'?'Online Elo has no interval of its own.':st.ci==='sand'?'H⁻¹BH⁻¹, as Arena has used since July 2025.':'Percentiles of 200 refits on resampled votes, as in 2023 and 2024.';
    $('lb-note').innerHTML='Ratings are centred on the mean of LMArena\'s full-data ratings for these ten models ('+(sc&&st.meth==='bt'?'style-controlled':'plain')+'), since a fit on ten models fixes only differences. Full data: LMArena\'s elo_results_20240828 ('+(sc&&st.meth==='bt'?'full_style_control':'full')+'), from 1,762,122 votes over 136 models (board of 27 August 2024). Sample and code: <code>src/inputs/lab_sample.json</code>, <code>src/recompute.py</code>.';
    window.HP_CHECK=window.HP_CHECK||{};window.HP_CHECK.lab={rating:S.models.map((m,i)=>rating[i]),ci,gamma,st:JSON.parse(JSON.stringify(st))};
  }
  RD.seg($('lb-meth'),m=>{st.meth=m;$('lb-bt-opts').classList.toggle('dim',m!=='bt');$('lb-elo-opts').classList.toggle('dim',m!=='elo');document.getElementById('lb-ci').classList.toggle('dim',m!=='bt');run()});
  [0,1,2,3].forEach(k=>$('lb-s'+k).addEventListener('change',e=>{st.style[k]=e.target.checked;run()}));
  $('lb-k').addEventListener('input',e=>{st.K=+e.target.value;$('lb-kv').textContent=st.K;run()});
  RD.seg($('lb-ord'),m=>{st.ord=m;run()});
  $('lb-reshuf').addEventListener('click',()=>{st.seed++;st.ord='shuf';$('lb-ord').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.m==='shuf'));run()});
  $('lb-n').addEventListener('input',e=>{st.n=+e.target.value;$('lb-nv').textContent=st.n.toLocaleString('en-US');run()});
  RD.seg($('lb-ties'),m=>{st.ties=m;run()});
  RD.seg($('lb-ci'),m=>{st.ci=m;run()});
  $('lb-kv').textContent=st.K;$('lb-nv').textContent=st.n.toLocaleString('en-US');
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-lab']=window.TAB_RENDER['t-lab']||[]).push(run);
})();
