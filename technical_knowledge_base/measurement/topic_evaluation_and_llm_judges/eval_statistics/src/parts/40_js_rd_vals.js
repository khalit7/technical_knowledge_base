// ---- Reading: numbers computed from the real data and the formulas, filled into the text (spans .esv[data-k]) and small tables ----
(function(){
  const S=window.EST;if(!S||!S.race)return;
  const C=window.ES_CHECK=window.ES_CHECK||{};const V={};const pct=x=>(100*x).toFixed(1)+'%';
  const g=S.raceScores('greedy'),p=S.raceScores('p'),cl=S.race.cl,n=cl.length,NM=S.race.models;
  const fr=S.fourSE(g[0],g[1],cl);
  const ci=S.mtb.models.findIndex(m=>m.name==='claude-v1'),cj=S.mtb.models.findIndex(m=>m.name==='claude-instant-v1');
  const P=S.mtbPair(ci,cj),fm=S.fourSE(P.a,P.b,P.cl);
  V.race_n=n.toLocaleString('en-US')+' questions on '+S.race.nc+' passages';
  V.fac_race=((fr.unpaired/fr.paired)**2).toFixed(2)+' times fewer items (r = '+fr.r.toFixed(2)+')';
  V.fac_mtb=((fm.unpaired/fm.paired)**2).toFixed(2)+' times (r = '+fm.r.toFixed(2)+')';
  // all MT-Bench pairs
  const rp=[],rc=[];const M=S.mtb.models;
  for(let i=0;i<M.length;i++)for(let j=i+1;j<M.length;j++){const Q=S.mtbPair(i,j),f=S.fourSE(Q.a,Q.b,Q.cl);rp.push(f.paired/f.unpaired);rc.push(f.clustered/f.paired)}
  const med=a=>{const b=a.slice().sort((x,y)=>x-y),m=b.length>>1;return b.length%2?b[m]:(b[m-1]+b[m])/2};
  V.mtb_pu_med=med(rp).toFixed(2)+' (range '+Math.min(...rp).toFixed(2)+' to '+Math.max(...rp).toFixed(2)+')';
  C.mtbAll={pairs:rp.length,pu_med:med(rp),pu_min:Math.min(...rp),pu_max:Math.max(...rp),cp_med:med(rc),cp_min:Math.min(...rc),cp_max:Math.max(...rc)};
  let b=0,c=0;for(let i=0;i<n;i++){if(g[0][i]&&!g[1][i])b++;if(!g[0][i]&&g[1][i])c++}
  V.race_disc=pct((b+c)/n);
  const pr=S.mcPower(300,.10,.05),c5=S.mcPower(500,.06,.04),c20=S.mcPower(2000,.06,.04);
  let n80=300;while(S.mcPower(n80,.10,.05).power<.8)n80+=5;
  V.prod_exact=(100*pr.power).toFixed(0)+'% power';V.prod_n80='about '+n80;
  V.card='power '+(100*c5.power).toFixed(1)+'% and Type-M '+c5.typeM.toFixed(2)+' at 500 items; '+(100*c20.power).toFixed(1)+'% and '+c20.typeM.toFixed(2)+' at 2,000';
  C.prodExact={power:pr.power,n80};C.card={p500:c5.power,m500:c5.typeM,p2000:c20.power,m2000:c20.typeM};
  V.mist_pair=(fr.paired/fr.unpaired).toFixed(2)+' (RACE-H) and '+(fm.paired/fm.unpaired).toFixed(2)+' (MT-Bench pair)';
  const accG=S.mean(g[0]),accP=S.mean(p[0]);V.mist_temp=(100*(accG-accP)).toFixed(1)+' points ('+NM[0]+': '+pct(accG)+' greedy, '+pct(accP)+' expected from one sample)';
  C.race={n,C:S.race.nc,accG:[S.mean(g[0]),S.mean(g[1])],accP:[S.mean(p[0]),S.mean(p[1])],b,c,four:fr,fourP:S.fourSE(p[0],p[1],cl)};C.mtbClaude=fm;
  document.querySelectorAll('.esv').forEach(el=>{const k=el.dataset.k;el.textContent=k in V?V[k]:'MISSING'});
  // reporting table (Miller Tables 2 and 3 format)
  const rows=[0,1].map(j=>{const a=g[j],q=p[j];return'<tr><td>'+NM[j]+'</td><td class="num">'+n.toLocaleString('en-US')+'</td><td class="num">'+S.race.nc+'</td><td class="num">'+pct(S.mean(a))+' ('+(100*S.seClt(a)).toFixed(1)+'%)</td><td class="num">('+(100*S.seClu(a,cl)).toFixed(1)+'%)</td><td class="num">'+pct(S.mean(q))+' ('+(100*S.seClt(q)).toFixed(1)+'%)</td></tr>'});
  document.getElementById('rd-rep-tab').innerHTML='<tr><th>RACE-H, '+S.race.nc+' passages</th><th class="num"># Questions</th><th class="num"># Clusters</th><th class="num">Greedy accuracy (SE)</th><th class="num">(clustered SE)</th><th class="num">Mean P(correct) (SE)</th></tr>'+rows.join('');
  // Madaan Table 1 rows
  const MAD=[['COPA',100,78.80,2.15,8.30],['HumanEval',164,11.89,1.11,3.98],['ARC-C',1165,39.71,0.80,2.74],['GSM8k',1319,4.10,0.41,0.87],['PIQA',1838,76.93,0.41,1.99],['SIQA',1954,46.69,0.55,2.21],['Hellaswag',10042,70.08,0.21,0.93],['MMLU',14042,25.86,0.57,0.72]];
  C.madaan={};
  document.getElementById('rd-mad').innerHTML='<tr><th>Benchmark</th><th class="num">Items</th><th class="num">Seed mean</th><th class="num">Seed SD</th><th class="num">Published 95% CI</th><th class="num">CI at seed mean</th></tr>'+
    MAD.map(r=>{const h=196*Math.sqrt(r[2]/100*(1-r[2]/100)/r[1]);C.madaan[r[0]]=h;return'<tr><td>'+r[0]+'</td><td class="num">'+r[1].toLocaleString('en-US')+'</td><td class="num">'+r[2].toFixed(2)+'</td><td class="num">'+r[3].toFixed(2)+'</td><td class="num">'+r[4].toFixed(2)+'</td><td class="num">'+h.toFixed(2)+'</td></tr>'}).join('');
  // clustered table: Miller Table 4 beside this page's measurements
  const clu=[];
  clu.push(['DROP','9,622 / 588','Anthropic models (Miller Table 4)','1.34 / 0.44','3.05']);
  clu.push(['RACE-H','3,498 / 1,045','Anthropic models (Miller Table 4)','0.51% / 0.46%','1.10']);
  clu.push(['MGSM','2,500 / 250','Anthropic models (Miller Table 4)','1.62% / 0.86%','1.88']);
  C.cluRace=[];
  [0,1].forEach(j=>{const a=g[j],r=S.seClu(a,cl)/S.seClt(a);C.cluRace.push(r);clu.push(['RACE-H, this page',n.toLocaleString('en-US')+' / '+S.race.nc,NM[j]+', greedy',(100*S.seClu(a,cl)).toFixed(2)+'% / '+(100*S.seClt(a)).toFixed(2)+'%',r.toFixed(2)])});
  const rd=fr.clustered/fr.paired;clu.push(['RACE-H, this page',n.toLocaleString('en-US')+' / '+S.race.nc,'paired difference, B − A',(100*fr.clustered).toFixed(2)+' / '+(100*fr.paired).toFixed(2),rd.toFixed(2)]);
  clu.push(['MT-Bench turns',fm.n+' / '+fm.C,'claude-instant-v1 − claude-v1, paired',fm.clustered.toFixed(3)+' / '+fm.paired.toFixed(3),(fm.clustered/fm.paired).toFixed(2)]);
  clu.push(['MT-Bench turns','about 159 / 80','all 561 model pairs, paired','',med(rc).toFixed(2)+' median ('+Math.min(...rc).toFixed(2)+' to '+Math.max(...rc).toFixed(2)+')']);
  document.getElementById('rd-clu-tab').innerHTML='<tr><th>Eval</th><th class="num">Items / clusters</th><th>Scores</th><th class="num">SE clustered / naive</th><th class="num">Ratio</th></tr>'+clu.map(r=>'<tr><td>'+r[0]+'</td><td class="num">'+r[1]+'</td><td>'+r[2]+'</td><td class="num">'+r[3]+'</td><td class="num">'+r[4]+'</td></tr>').join('');
  document.getElementById('rd-clu-cap').innerHTML='Miller\'s rows are published (the RACE-H ratio prints as 1.10; 0.51/0.46 = 1.11). This page\'s rows are <i class="nl r">real data</i>: the same RACE-H test split ('+S.race.nc+' of its 1,045 passages) on two small open models lands at '+C.cluRace.map(x=>x.toFixed(2)).join(' and ')+', against Miller\'s 1.10 on Anthropic models: for these small models the questions on one passage hardly move together, and after pairing the clustered SE is '+rd.toFixed(2)+' times the paired one. On MT-Bench pairing leaves some clustering: the clustered SE is a median '+med(rc).toFixed(2)+' times the paired one across all 561 model pairs. How much clustering matters is a property of the eval and the models; it has to be computed, not assumed away.';
  // tests table on the two default comparisons
  function tests(a,bb,cl,bin){const d=a.map((x,i)=>bb[i]-x),f=S.fourSE(a,bb,cl),o={};
    if(bin){let B=0,Cc=0;a.forEach((x,i)=>{if(x&&!bb[i])B++;if(!x&&bb[i])Cc++});o.mcx=S.mcnemarExact(B,Cc);o.mcc=S.mcnemarChi(B,Cc);o.bc=B+' / '+Cc}
    o.pz=S.pz(f.diff,f.paired);o.pzc=S.pz(f.diff,f.clustered);o.pu=S.pz(f.diff,f.unpaired);o.perm=S.perm(d,2000,9);o.permc=S.perm(d,2000,10,cl);o.boot=S.boot(d,2000,7);o.bootc=S.boot(d,2000,8,cl);o.f=f;return o}
  const T1=tests(g[0],g[1],cl,true),T2=tests(P.a,P.b,P.cl,false);C.testsRace=T1;C.testsMtb=T2;
  const pc=(x,s)=>'<td class="num '+(x<.05?'sig':'ns')+'">'+S.pfmt(x)+'</td>';
  const ci2=(I,u,dp)=>'<td class="num">['+S.fmt(u*I[0],dp)+', '+S.fmt(u*I[1],dp)+']</td>';
  document.getElementById('rd-test-tab').innerHTML='<tr><th></th><th class="num">RACE-H, '+NM[1]+' − '+NM[0]+' (greedy)</th><th class="num">MT-Bench, claude-instant-v1 − claude-v1</th></tr>'+
    '<tr><td>Difference</td><td class="num">'+S.fmt(100*T1.f.diff)+' pts</td><td class="num">'+S.fmt(T2.f.diff,2)+' grade pts</td></tr>'+
    '<tr><td>McNemar exact, p (A only / B only)</td><td class="num '+(T1.mcx<.05?'sig':'ns')+'">'+S.pfmt(T1.mcx)+' ('+T1.bc+')</td><td class="num">n/a (grades)</td></tr>'+
    '<tr><td>McNemar χ², p</td>'+pc(T1.mcc)+'<td class="num">n/a</td></tr>'+
    '<tr><td>Paired z, p</td>'+pc(T1.pz)+pc(T2.pz)+'</tr><tr><td>Paired z, clustered SE, p</td>'+pc(T1.pzc)+pc(T2.pzc)+'</tr>'+
    '<tr><td>Sign-flip permutation, items, p</td>'+pc(T1.perm)+pc(T2.perm)+'</tr><tr><td>Sign-flip permutation, clusters, p</td>'+pc(T1.permc)+pc(T2.permc)+'</tr>'+
    '<tr><td>Paired bootstrap 95%, items</td>'+ci2(T1.boot,100,1)+ci2(T2.boot,1,2)+'</tr><tr><td>Paired bootstrap 95%, clusters</td>'+ci2(T1.bootc,100,1)+ci2(T2.bootc,1,2)+'</tr>'+
    '<tr><td>Unpaired z, p (wrong here)</td>'+pc(T1.pu)+pc(T2.pu)+'</tr>';
  document.getElementById('rd-test-cap').textContent='RACE-H sits on the threshold: McNemar exact p = '+S.pfmt(T1.mcx)+', paired z p = '+S.pfmt(T1.pz)+', clustered p = '+S.pfmt(T1.pzc)+', unpaired p = '+S.pfmt(T1.pu)+'. A reader who wanted a verdict at 5% would get a different one depending on the test, which is the argument for fixing the test, the clustering and the threshold before looking. On the MT-Bench pair every test agrees there is no detectable difference overall (the production page shows the writing slice losing about a point inside that zero).';
})();
