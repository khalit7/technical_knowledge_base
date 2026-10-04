// ---- Reading, Pairing: one real comparison, unpaired then paired then clustered, on the same items (before/after animation) ----
(function(){
  const S=window.EST;if(!S||!S.race||!document.getElementById('rd-an-card'))return;
  const $=id=>document.getElementById(id);
  const DS={};
  (function(){const g=S.raceScores('greedy');DS.race={a:g[0],b:g[1],cl:S.race.cl,bin:true,u:100,dp:1,unit:'points',nA:S.race.models[0],nB:S.race.models[1],
    src:'RACE-H test, '+S.race.nc+' passages, every question; '+S.race.models.join(' and ')+' run locally on 4 October 2026, answer = most likely letter. Clusters are passages.'};
    const i=S.mtb.models.findIndex(m=>m.name==='claude-v1'),j=S.mtb.models.findIndex(m=>m.name==='claude-instant-v1'),P=S.mtbPair(i,j);
    DS.mtb={a:P.a,b:P.b,cl:P.cl,bin:false,u:1,dp:2,unit:'grade points',nA:'claude-v1',nB:'claude-instant-v1',src:'LMSYS\'s released GPT-4 grades (1 to 10), 159 turns both models have a grade for; clusters are the 80 questions (two turns each). The pair is the cost-down swap on Production eval engineering.'}})();
  Object.values(DS).forEach(D=>{D.f=S.fourSE(D.a,D.b,D.cl)});
  let ds='race';
  const STEPS=[
    {t:'The items',c:D=>D.f.n.toLocaleString('en-US')+' items, one square each, in the order they were drawn. Colour shows '+(D.bin?'whether '+D.nA+' (model A) got each one right.':'model A\'s ('+D.nA+') grade.'),show:0},
    {t:'Model B on the same items',c:D=>D.bin?'Now both models: green where both pass, grey where both fail, orange where only A passes, blue where only B passes. B − A = '+S.fmt(D.u*D.f.diff,D.dp)+' '+D.unit+'.':'Colour now shows B − A per item: blue where '+D.nB+' got the higher grade, orange where '+D.nA+' did, pale where they tie. Mean B − A = '+S.fmt(D.u*D.f.diff,D.dp)+' '+D.unit+'.',show:0},
    {t:'Before: two independent scores',c:D=>'Treat the two scores as if they came from different items: SE = √(SE_A² + SE_B²) = '+(D.u*D.f.unpaired).toFixed(D.dp+1)+'. Every item\'s difficulty counts as noise twice, once per model.',show:1},
    {t:'After: pair the items',c:D=>(D.bin?'Only the coloured squares, where the models disagree, say anything about the difference; the green and grey ones cancel. ':'Subtract item by item: an item that is hard for both cancels. ')+'The item scores correlate at r = '+D.f.r.toFixed(2)+', so the paired SE is '+(D.u*D.f.paired).toFixed(D.dp+1)+', '+(100*D.f.paired/D.f.unpaired).toFixed(0)+'% of the unpaired one.',show:2},
    {t:'Then count the clusters',c:D=>'Items that share a '+(D.bin?'passage':'question')+' are grouped: '+D.f.C+' clusters. Their paired differences move together '+(D.f.clustered>D.f.paired?'a little, so the interval widens back':'hardly at all, so the interval barely moves')+': clustered SE '+(D.u*D.f.clustered).toFixed(D.dp+1)+', '+(D.f.clustered/D.f.paired).toFixed(2)+' times the paired one.',show:3},
    {t:'Verdict',c:D=>{const z=S.Z95,ex=se=>Math.abs(D.f.diff)>z*se;return 'Unpaired: '+(ex(D.f.unpaired)?'excludes':'includes')+' zero. Paired: '+(ex(D.f.paired)?'excludes':'includes')+' zero. Paired and clustered, the one to report: '+(ex(D.f.clustered)?'excludes':'includes')+' zero. Same items, same models; only the analysis changed.'},show:3}
  ];
  const leg=()=>DS[ds].bin?'<span style="color:var(--good)">&#9632;</span> both pass &nbsp; <span style="color:var(--dim)">&#9632;</span> both fail &nbsp; <span style="color:var(--c2)">&#9632;</span> only A &nbsp; <span style="color:var(--c1)">&#9632;</span> only B':'<span style="color:var(--c1)">&#9632;</span> B higher &nbsp; <span style="color:var(--c2)">&#9632;</span> A higher &nbsp; <span style="color:var(--dim)">&#9632;</span> tie';
  function colour(D,i,step){
    const a=D.a[i],b=D.b[i];
    if(D.bin){if(step===0)return a?'var(--good)':'var(--dim)';
      if(a&&b)return step>=3?'var(--good);opacity:.22':'var(--good)';if(!a&&!b)return step>=3?'var(--dim);opacity:.35':'var(--dim)';return a?'var(--c2)':'var(--c1)'}
    if(step===0){const t=(a-1)/9;return 'var(--c4);opacity:'+(0.15+0.85*t).toFixed(2)}
    const d=b-a;if(d===0)return 'var(--dim)'+(step>=3?';opacity:.35':'');const o=Math.min(1,0.3+Math.abs(d)/5);return (d>0?'var(--c1)':'var(--c2)')+';opacity:'+o.toFixed(2)}
  function drawSq(step){
    const D=DS[ds],host=$('rd-an-sq'),W=Math.min(860,RD.width(host)),n=D.a.length,grp=step>=4;
    const sz=D.bin?(W<520?5:6):(W<520?10:13),gap=1,cg=grp?(D.bin?4:6):0;let x=0,y=0,s='';const step1=sz+gap;
    for(let i=0;i<n;i++){if(grp&&i>0&&D.cl[i]!==D.cl[i-1]){x+=cg}if(x+sz>W){x=0;y+=step1}
      const col=colour(D,i,step),parts=col.split(';opacity:');s+='<rect x="'+x+'" y="'+y+'" width="'+sz+'" height="'+sz+'" fill="'+parts[0]+'"'+(parts[1]?' fill-opacity="'+parts[1]+'"':'')+'/>';x+=step1}
    host.innerHTML=RD.svg(W,y+sz+2,s,'One square per item');$('rd-an-leg').innerHTML=leg();
  }
  function drawCi(step){
    const D=DS[ds],host=$('rd-an-ci'),W=Math.min(860,RD.width(host)),z=S.Z95,f=D.f;
    const rows=[['Unpaired',f.unpaired,2],['Paired',f.paired,3],['Paired, clustered',f.clustered,4]];
    const show=STEPS[step].show;
    let lo=Math.min(0,f.diff-z*f.unpaired),hi=Math.max(0,f.diff+z*f.unpaired);const sp=hi-lo;lo-=sp*.05;hi+=sp*.05;
    const pad=10,X=v=>pad+(v-lo)/(hi-lo)*(W-2*pad),H=26+rows.length*40;
    let s='';const tick=D.bin?(sp*D.u>12?4:2)/D.u:(sp>1.5?0.5:0.25);
    for(let v=Math.ceil(lo/tick)*tick;v<=hi;v+=tick){const x=X(v);s+='<line x1="'+x+'" x2="'+x+'" y1="16" y2="'+(H-4)+'" stroke="var(--line)"/>'+RD.t(x,12,(v>1e-9?'+':'')+(+(v*D.u).toFixed(2)),{a:'middle',fs:10.5,fill:'var(--mute)'})}
    s+='<line x1="'+X(0)+'" x2="'+X(0)+'" y1="16" y2="'+(H-4)+'" stroke="var(--ink)" stroke-dasharray="3 3"/>';
    rows.forEach((r,i)=>{if(i>=show)return;const y=30+i*40,a=X(f.diff-z*r[1]),b=X(f.diff+z*r[1]),ex=Math.abs(f.diff)>z*r[1],col=ex?'var(--good)':'var(--acc)',cur=i===show-1;
      s+=RD.t(pad,y,r[0]+': '+S.fmt(D.u*f.diff,D.dp)+' ± '+(D.u*z*r[1]).toFixed(D.dp)+' '+D.unit,{fs:12,fill:cur?'var(--ink)':'var(--mute)',w:cur?600:400});
      s+='<g opacity="'+(cur?1:.55)+'"><line x1="'+a+'" x2="'+b+'" y1="'+(y+12)+'" y2="'+(y+12)+'" stroke="'+col+'" stroke-width="3"/><line x1="'+a+'" x2="'+a+'" y1="'+(y+6)+'" y2="'+(y+18)+'" stroke="'+col+'" stroke-width="2"/><line x1="'+b+'" x2="'+b+'" y1="'+(y+6)+'" y2="'+(y+18)+'" stroke="'+col+'" stroke-width="2"/><circle cx="'+X(f.diff)+'" cy="'+(y+12)+'" r="4" fill="var(--bad)"/></g>'});
    if(show===0)s+=RD.t(W/2,H/2+4,'Intervals appear from step 3',{a:'middle',fs:12,fill:'var(--mute)'});
    host.innerHTML=RD.svg(W,H,s,'95% intervals on the difference B minus A');
  }
  function draw(i){const D=DS[ds],st=STEPS[i];drawSq(i);drawCi(i);
    $('rd-an-cap').innerHTML='<div class="t">Step '+(i+1)+' of '+STEPS.length+': '+st.t+'</div><p>'+st.c(D)+'</p>';
    const f=D.f;$('rd-an-cnt').innerHTML=RD.stat('Items / clusters',f.n.toLocaleString('en-US')+' / '+f.C,'')+RD.stat('Correlation r',f.r.toFixed(2),'A and B item scores')+
      RD.stat('SE unpaired',(D.u*f.unpaired).toFixed(D.dp+1),D.unit)+RD.stat('SE paired',i>=3?(D.u*f.paired).toFixed(D.dp+1):'…',i>=3?'× '+(f.paired/f.unpaired).toFixed(2)+' of unpaired':'')+RD.stat('SE paired, clustered',i>=4?(D.u*f.clustered).toFixed(D.dp+1):'…',i>=4?'× '+(f.clustered/f.paired).toFixed(2)+' of paired':'');
    $('rd-an-src').textContent=D.src+' 95% intervals are ±1.96 SE. Computed in the page from the per-item results; src/recompute.py checks them.'}
  const A=RD.anim({card:'rd-an-card',ctl:'rd-an-ctl',n:STEPS.length,draw,ms:2600,label:'Animation step'});
  RD.seg($('rd-an-ds'),m=>{ds=m;A.go(0)});
  RD.onResize(()=>A.redraw());
  window.ES_CHECK=window.ES_CHECK||{};window.ES_CHECK.anim={race:DS.race.f.clustered,mtb:DS.mtb.f.clustered};
})();
