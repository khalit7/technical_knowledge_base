// ---- Interval lab tab ----
(function(){
  const S=window.EST,$=id=>document.getElementById(id);if(!$('lab-card')||!S.race)return;
  window.ES_CHECK=window.ES_CHECK||{};
  const st={ds:'race',rule:'greedy',K:5,seed:11,sub:1,frac:1,a:0,b:0,cat:''};
  $('lab-rn').textContent=S.race.models.join(' and ');$('lab-rq').textContent=S.race.cl.length.toLocaleString('en-US');
  const names=S.mtb.models.map(m=>m.name);
  const opt=names.map((n,i)=>'<option value="'+i+'">'+RD.esc(n)+'</option>').join('');$('lab-a').innerHTML=opt;$('lab-b').innerHTML=opt;
  st.a=Math.max(0,names.indexOf('claude-v1'));st.b=Math.max(0,names.indexOf('claude-instant-v1'));$('lab-a').value=st.a;$('lab-b').value=st.b;
  const CATS=['writing','roleplay','reasoning','math','coding','extraction','stem','humanities'];
  $('lab-cat').innerHTML+=CATS.map(c=>'<option value="'+c+'">'+c+'</option>').join('');
  // build the paired item list for the current settings
  function items(){
    let a,b,cl,bin=false;
    if(st.ds==='race'){const rule=st.rule==='kK'?'k'+st.K:st.rule;const sc=S.raceScores(rule,st.seed);a=sc[0];b=sc[1];cl=S.race.cl;bin=st.rule==='greedy'||st.rule==='k1'}
    else{const A=S.mtb.models[st.a].s,B=S.mtb.models[st.b].s;a=[];b=[];cl=[];for(let t=0;t<A.length;t++){if(A[t]===null||B[t]===null)continue;if(st.cat&&S.mtb.cat[t]!==st.cat)continue;a.push(A[t]);b.push(B[t]);cl.push(S.mtb.cl[t])}}
    if(st.frac<1){const ids=[...new Set(cl)],r=S.rng(1000+st.sub);for(let i=ids.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]]}
      const keep=new Set(ids.slice(0,Math.max(2,Math.round(ids.length*st.frac))));const a2=[],b2=[],c2=[];cl.forEach((c,i)=>{if(keep.has(c)){a2.push(a[i]);b2.push(b[i]);c2.push(c)}});a=a2;b=b2;cl=c2}
    return{a,b,cl,bin}}
  function analyse(){
    const I=items(),f=S.fourSE(I.a,I.b,I.cl),z=S.Z95,d=f.d;
    const bootI=S.boot(d,2000,7),bootC=S.boot(d,2000,8,I.cl);
    const rows=[['Unpaired',f.unpaired],['Unpaired, clustered',f.unpairedClu],['Paired',f.paired],['Paired, clustered',f.clustered]].map(r=>({l:r[0],lo:f.diff-z*r[1],hi:f.diff+z*r[1],se:r[1]}));
    rows.push({l:'Paired bootstrap, items',lo:bootI[0],hi:bootI[1]});rows.push({l:'Paired bootstrap, clusters',lo:bootC[0],hi:bootC[1]});
    const tests=[];
    if(I.bin){let b=0,c=0;I.a.forEach((x,i)=>{if(x&&!I.b[i])b++;if(!x&&I.b[i])c++});tests.push(['McNemar, exact','discordant: A only '+b+', B only '+c,S.mcnemarExact(b,c)]);tests.push(['McNemar, χ² with continuity','same counts',S.mcnemarChi(b,c)]);f.b=b;f.c=c}
    tests.push(['Paired, normal approximation','mean difference / paired SE',S.pz(f.diff,f.paired)]);
    tests.push(['Paired, clustered, normal approximation','mean difference / clustered SE',S.pz(f.diff,f.clustered)]);
    tests.push(['Sign-flip permutation, items','2,000 flips',S.perm(d,2000,9)]);
    tests.push(['Sign-flip permutation, clusters','2,000 flips of cluster sums',S.perm(d,2000,10,I.cl)]);
    tests.push(['Unpaired, normal approximation','as if the items were different',S.pz(f.diff,f.unpaired)]);
    return{I,f,rows,tests}}
  function draw(){
    if(st.ds==='mtb'&&st.a===st.b){$('lab-out').innerHTML='<p class="small">Pick two different models: a model compared with itself has a difference of zero on every item.</p>';$('lab-svg').innerHTML='';$('lab-cap').textContent='';$('lab-tests').innerHTML='';$('lab-miller').innerHTML='';return}
    const R=analyse(),f=R.f,unit=st.ds==='race'&&st.rule!=='p'?100:st.ds==='race'?100:1,u=st.ds==='mtb'?' grade points':' pts',dp=st.ds==='mtb'?2:1;
    const nmA=st.ds==='race'?S.race.models[0]:names[st.a],nmB=st.ds==='race'?S.race.models[1]:names[st.b];
    const mA=S.mean(R.I.a),mB=S.mean(R.I.b);
    $('lab-out').innerHTML=RD.stat('A: '+RD.esc(nmA),(unit*mA).toFixed(dp)+(st.ds==='race'?'%':''),'SE '+(unit*S.seClt(R.I.a)).toFixed(dp)+', clustered '+(unit*S.seClu(R.I.a,R.I.cl)).toFixed(dp))+
      RD.stat('B: '+RD.esc(nmB),(unit*mB).toFixed(dp)+(st.ds==='race'?'%':''),'SE '+(unit*S.seClt(R.I.b)).toFixed(dp)+', clustered '+(unit*S.seClu(R.I.b,R.I.cl)).toFixed(dp))+
      RD.stat('B − A',S.fmt(unit*f.diff,dp)+u,f.n.toLocaleString('en-US')+' items in '+f.C+' clusters')+RD.stat('Correlation of item scores, r',f.r.toFixed(2),'paired SE / unpaired: '+(f.paired/f.unpaired).toFixed(2)+'; clustered / paired: '+(f.clustered/f.paired).toFixed(2));
    // interval chart
    const host=$('lab-svg'),W=Math.min(860,RD.width(host)),lw=W<520?0:170,pad=12,rowH=W<520?44:30,H=24+R.rows.length*rowH+6;
    let lo=Math.min(0,...R.rows.map(r=>r.lo)),hi=Math.max(0,...R.rows.map(r=>r.hi));const sp=(hi-lo)||1;lo-=sp*.06;hi+=sp*.06;
    const X=v=>lw+pad+(v-lo)/(hi-lo)*(W-lw-2*pad);
    let s='';const step=niceStep((hi-lo)*unit/5);
    for(let v=Math.ceil(lo*unit/step)*step;v<=hi*unit+1e-9;v+=step){const x=X(v/unit);s+='<line x1="'+x+'" x2="'+x+'" y1="16" y2="'+(H-4)+'" stroke="var(--line)"/>'+RD.t(x,12,(v>0?'+':'')+(+v.toFixed(3)),{a:'middle',fs:10.5,fill:'var(--mute)'})}
    s+='<line x1="'+X(0)+'" x2="'+X(0)+'" y1="16" y2="'+(H-4)+'" stroke="var(--ink)" stroke-dasharray="3 3"/>';
    R.rows.forEach((r,i)=>{const y=24+i*rowH,yy=W<520?y+22:y+8,col=r.lo>0||r.hi<0?'var(--good)':'var(--acc)';
      const lab=r.l+': '+S.fmt(unit*f.diff,dp)+' ['+S.fmt(unit*r.lo,dp)+', '+S.fmt(unit*r.hi,dp)+']';
      s+=W<520?RD.t(pad,y+8,lab,{fs:11.5}):RD.t(lw,y+12,r.l,{a:'end',fs:11.5});
      s+='<line x1="'+X(r.lo)+'" x2="'+X(r.hi)+'" y1="'+yy+'" y2="'+yy+'" stroke="'+col+'" stroke-width="3"/><line x1="'+X(r.lo)+'" x2="'+X(r.lo)+'" y1="'+(yy-5)+'" y2="'+(yy+5)+'" stroke="'+col+'" stroke-width="2"/><line x1="'+X(r.hi)+'" x2="'+X(r.hi)+'" y1="'+(yy-5)+'" y2="'+(yy+5)+'" stroke="'+col+'" stroke-width="2"/><circle cx="'+X(f.diff)+'" cy="'+yy+'" r="4" fill="var(--bad)"/>'});
    host.innerHTML=RD.svg(W,H,s,'95% intervals on the difference B minus A');
    $('lab-cap').textContent='95% intervals on B − A in '+(st.ds==='mtb'?'grade points (1 to 10 scale)':'percentage points')+'; green when the interval excludes zero. The red dot is the observed difference. '+(W<520?'':'Exact endpoints in the table below.');
    $('lab-tests').innerHTML='<tr><th>Test of "no difference"</th><th>What it uses</th><th class="num">p</th></tr>'+R.tests.map(t=>'<tr><td>'+t[0]+'</td><td>'+t[1]+'</td><td class="num '+(t[2]<.05?'sig':'ns')+'">'+S.pfmt(t[2])+'</td></tr>').join('')+
      '<tr><td colspan="3" class="small mute">'+R.rows.map(r=>r.l+': ['+S.fmt(unit*r.lo,dp)+', '+S.fmt(unit*r.hi,dp)+']').join('; ')+'</td></tr>';
    $('lab-miller').innerHTML='<tr><th colspan="5">Reported the way Miller\'s Table 5 suggests</th></tr><tr><th>Model</th><th>Baseline</th><th class="num">Model − Baseline (SE)</th><th class="num">95% CI</th><th class="num">Correlation</th></tr><tr><td>'+RD.esc(nmB)+'</td><td>'+RD.esc(nmA)+'</td><td class="num">'+S.fmt(unit*f.diff,dp)+' ('+(unit*f.clustered).toFixed(dp)+')</td><td class="num">('+S.fmt(unit*(f.diff-S.Z95*f.clustered),dp)+', '+S.fmt(unit*(f.diff+S.Z95*f.clustered),dp)+')</td><td class="num">'+f.r.toFixed(2)+'</td></tr><tr><td colspan="5" class="small mute">SE is the paired, clustered one ('+f.C+' clusters, '+f.n+' items), as Miller recommends for clustered evals.</td></tr>';
    if(st.ds==='race'&&st.frac===1&&st.rule==='greedy')window.ES_CHECK.labRace=f;
    if(st.ds==='mtb'&&st.frac===1&&!st.cat&&names[st.a]==='claude-v1'&&names[st.b]==='claude-instant-v1')window.ES_CHECK.labMtb=f;
  }
  function niceStep(x){const p=Math.pow(10,Math.floor(Math.log10(x))),m=x/p;return(m<1.5?1:m<3.5?2:m<7.5?5:10)*p}
  RD.seg($('lab-ds'),m=>{st.ds=m;$('lab-race').hidden=m!=='race';$('lab-mtb').hidden=m!=='mtb';draw()});
  $('lab-rule').addEventListener('change',e=>{st.rule=e.target.value;$('lab-kl').hidden=st.rule!=='kK';$('lab-reseed').hidden=!(st.rule==='k1'||st.rule==='kK');draw()});
  $('lab-k').addEventListener('input',e=>{st.K=+e.target.value;$('lab-kv').textContent=st.K;draw()});
  $('lab-reseed').addEventListener('click',()=>{st.seed+=101;draw()});
  $('lab-a').addEventListener('change',e=>{st.a=+e.target.value;draw()});$('lab-b').addEventListener('change',e=>{st.b=+e.target.value;draw()});
  $('lab-cat').addEventListener('change',e=>{st.cat=e.target.value;draw()});
  $('lab-f').addEventListener('input',e=>{st.frac=+e.target.value/100;$('lab-fv').textContent=e.target.value+'%';draw()});
  $('lab-sub').addEventListener('click',()=>{st.sub++;draw()});
  onTab('t-lab',draw);
  addEventListener('resize',()=>{const t=$('t-lab');if(t&&!t.hidden)draw()});
  // default rows for the recompute check, computed at load
  (function(){const g=S.raceScores('greedy');window.ES_CHECK.labRace=S.fourSE(g[0],g[1],S.race.cl);const P=S.mtbPair(st.a,st.b);window.ES_CHECK.labMtb=S.fourSE(P.a,P.b,P.cl);
    const p=S.raceScores('p');window.ES_CHECK.labRaceP=S.fourSE(p[0],p[1],S.race.cl)})();
})();
