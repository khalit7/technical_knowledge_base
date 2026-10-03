// ---- Reading 4: TabArena and BeyondArena leaderboards as of 2 October 2026 (card rd-bm) ----
(function(){
  const T=CD.tab,SUB=[['ta_all','TabArena, all 51'],['ta_small','TabArena, small (36)'],['ta_medium','TabArena, medium (15)'],['ba_tiny','BeyondArena, up to 1,000 rows (52)'],['ba_small','BeyondArena, 1,001 to 10,000 (38)'],['ba_medium','BeyondArena, 10,001 to 100,000 (30)'],['ba_large','BeyondArena, 100,001 to 1,000,000 (22)']];
  const FAM={'Foundation Model':['foundation model','--c4'],'Neural Network':['neural network','--c1'],'Tree-based':['tree-based','--c3'],'Baseline':['baseline','--mute'],'Other':['other','--c5']};
  let sub='ba_large',defOnly=false;
  const sel=document.getElementById('rd-bmS'),chk=document.getElementById('rd-bmD');
  sel.innerHTML=SUB.map(([k,t])=>'<option value="'+k+'"'+(k===sub?' selected':'')+'>'+t+'</option>').join('');
  function draw(){const rows=T[sub].filter(r=>!defOnly||r[2]==='default');
    const top=rows.slice(0,8),pick=new Set(top);
    Object.keys(FAM).forEach(f=>{const b=rows.find(r=>r[1]===f);if(b)pick.add(b)});
    const rf=T[sub].find(r=>r[0]==='RandomForest'&&r[2]==='default');if(rf)pick.add(rf);
    const L=[...pick].sort((a,b)=>b[3]-a[3]);
    const lo=Math.min(...L.map(r=>r[3]-r[5]))-20,hi=Math.max(...L.map(r=>r[3]+r[4]))+20,pc=v=>(100*(v-lo)/(hi-lo)).toFixed(2)+'%';
    const best={};L.forEach(r=>{if(!best[r[1]])best[r[1]]=r});
    document.getElementById('rd-bmB').innerHTML=L.map(r=>{const f=FAM[r[1]]||['other','--c5'],rank=rows.indexOf(r)+1,nc=/non-commercial|NC\b/i.test(r[8]);
      return '<div class="row'+(best[r[1]]===r?' hl':'')+'"><div class="nm" title="'+RD.esc(r[0]+' ('+r[2]+'), '+r[8])+'"><span style="color:var('+f[1]+')">&#9632;</span> '+RD.esc(r[0])+' <span class="mute">('+r[2]+')</span><span class="ml">#'+rank+' &middot; '+f[0]+' &middot; '+r[7]+' &middot; '+(r[6]<10?r[6].toFixed(1):Math.round(r[6]))+' s per 1K rows to train'+(nc?' &middot; non-commercial licence':'')+(r[9]>0?' &middot; '+r[9]+'% imputed':'')+'</span></div>'+
        '<div class="track"><span class="fill" style="left:0;width:'+pc(r[3])+';background:var('+f[1]+');opacity:.75"></span><span style="position:absolute;top:5px;height:2px;left:'+pc(r[3]-r[5])+';width:calc('+pc(r[3]+r[4])+' - '+pc(r[3]-r[5])+');background:var(--ink)"></span></div><div class="val">'+Math.round(r[3])+'</div></div>'}).join('');
    const bt=rows.find(r=>r[1]==='Tree-based'),bf=rows.find(r=>r[1]==='Foundation Model'),bn=rows.find(r=>r[1]==='Neural Network');
    const p=(a,b)=>1/(1+Math.pow(10,(b[3]-a[3])/400));
    document.getElementById('rd-bmN').innerHTML=RD.stat('entries ranked',String(rows.length))+
      (bt?RD.stat('best tree-based',RD.esc(bt[0]),'rank '+(rows.indexOf(bt)+1)+', Elo '+Math.round(bt[3])):'')+
      (bf?RD.stat('best foundation model',RD.esc(bf[0]),'rank '+(rows.indexOf(bf)+1)+', Elo '+Math.round(bf[3])):'')+
      (bt&&rows[0]!==bt?RD.stat('expected win rate, best tree-based against #1',RD.pct(p(bt,rows[0]),0),'1 / (1 + 10<sup>&Delta;Elo/400</sup>)'):'')}
  sel.addEventListener('change',()=>{sub=sel.value;draw()});chk.addEventListener('change',()=>{defOnly=chk.checked;draw()});
  RD.onRender(draw);draw();
})();
