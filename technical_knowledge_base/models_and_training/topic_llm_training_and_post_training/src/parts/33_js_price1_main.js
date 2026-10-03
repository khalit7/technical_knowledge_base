// ---- Price list (t-price): chart, cards, table. Data: window.PRICE from 33_js_price0_data.js ----
(function(){
  const P=window.PRICE;if(!P)return;
  const $=id=>document.getElementById(id);
  const ST={};P.stages.forEach(s=>ST[s[0]]={name:s[1],col:'var('+s[2]+')'});
  const INC=P.inc_items,SRC=P.sources;
  const UNIT={usd:{lab:'Dollars, log scale',short:'$'},gpuh:{lab:'GPU-hours, log scale',short:'GPU-hours'},flop:{lab:'Training compute in FLOPs, log scale',short:'FLOPs'}};
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  function sig(v,n){return +v.toPrecision(n)}
  function fUSD(v){if(v>=1e9)return '$'+sig(v/1e9,3)+'B';if(v>=1e6)return '$'+sig(v/1e6,v<1e7?4:3)+'M';if(v>=1e4)return '$'+sig(v/1e3,3)+'K';return '$'+sig(v,3).toLocaleString('en-US')}
  function fH(v){if(v>=1e6)return sig(v/1e6,3)+'M';if(v>=1e4)return sig(v/1e3,3)+'K';if(v>=10)return Math.round(v).toLocaleString('en-US');if(v>=1)return sig(v,2)+'';return sig(v,2)+''}
  function fF(v){const e=Math.floor(Math.log10(v)),m=v/10**e;return (Math.abs(m-1)<1e-9?'':sig(m,3)+'&times;')+'10<sup>'+e+'</sup>'}
  const fmt=(u,v)=>u==='usd'?fUSD(v):u==='gpuh'?fH(v)+' GPU-h':fF(v)+' FLOPs';
  const tickf=(u,e)=>u==='usd'?fUSD(10**e):u==='gpuh'?(e<0?(10**e).toFixed(-e):fH(10**e)):'10<sup>'+e+'</sup>';
  const KN={pub:'published',rep:'reported',est:'estimate',der:'derived'};
  const mk=(f,stage,on,pre,attrs)=>'<i class="pl-mk k-'+f.kind+(on?' on':'')+'"'+(attrs||'')+' style="'+(pre||'')+'border-color:'+ST[stage].col+';background:'+ST[stage].col+'"></i>';

  // ---- rows for the current unit ----
  let U='usd',VIEW='chart',INCF='any',EST=true,SPLIT=false,openId=null,openFig=null,SORT={k:'v',d:-1};
  const stageOn={};P.stages.forEach(s=>stageOn[s[0]]=true);
  function incPass(f){const i=f.inc;if(INCF==='any')return true;
    if(INCF==='runonly')return INC.every(([k])=>k==='run'||i[k]!=='y');
    if(INCF==='unclear')return INC.some(([k])=>i[k]==='u');
    return i[INCF]==='y'}
  function rows(){const out=[];
    P.runs.forEach(r=>{
      if(SPLIT&&r.parts&&(U==='usd'||U==='gpuh')){const base=r.figs.find(f=>f.unit===U);
        r.parts.forEach((p,j)=>{const f=Object.assign({},base,{v:U==='usd'?p.usd:p.gpuh,what:p.name.replace(r.name.replace(/ \(.*\)/,''),'').trim()||base.what,calc:(U==='usd'?'this stage\'s share of ':'')+base.calc,
            inc:Object.assign({},base.inc,{prior:'n'})});
          out.push({id:r.id+'#'+j,run:r,name:p.name,stage:p.stage,figs:[f],part:true})});return}
      const fs=r.figs.filter(f=>f.unit===U&&(EST||f.kind!=='est'));
      if(fs.length)out.push({id:r.id,run:r,name:r.name,stage:r.stage,figs:fs})});
    return out.filter(x=>stageOn[x.stage]&&x.figs.some(incPass))}

  // ---- legend and stage chips ----
  function chips(){$('pl-stages').innerHTML=P.stages.map(s=>'<button data-s="'+s[0]+'" class="'+(stageOn[s[0]]?'':'off')+'" aria-pressed="'+stageOn[s[0]]+'"><i style="background:var('+s[2]+')"></i>'+s[1]+'</button>').join('');
    $('pl-stages').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{stageOn[b.dataset.s]=!stageOn[b.dataset.s];chips();draw()}))}
  function legend(){const s='var(--mute)';
    $('pl-leg').innerHTML=['pub','rep','est','der'].map(k=>'<span><i class="pl-mk k-'+k+'" style="border-color:'+s+';background:'+s+'"></i>'+P.kind[k]+'</span>').join('')+'<span><i class="pl-span" style="position:static;display:inline-block;width:18px;margin:0"></i>one run, two accountings</span>'}

  // ---- the chart: one row per run, marks on a shared log axis ----
  function axis(lo,hi,narrow){let s='';const step=narrow&&(hi-lo)>6?2:1;
    for(let e=lo;e<=hi;e+=step){const x=(e-lo)/(hi-lo)*100;s+='<span class="'+(e===lo?'l0':e+step>hi?'l1':'')+'" style="left:'+x+'%">'+tickf(U,e)+'</span>'}
    return '<div class="pl-axr"><div class="pl-axcap">'+UNIT[U].lab+'</div><div class="pl-ax">'+s+'</div></div>'}
  function draw(){const host=$('pl-chart');if(!host)return;const R=rows();
    $('pl-count').textContent=R.length+' run'+(R.length===1?'':'s')+' shown with a figure in '+(U==='usd'?'dollars':U==='gpuh'?'GPU-hours':'FLOPs')+'. Click a row for what the figure includes.';
    if(VIEW==='table'){host.hidden=true;$('pl-table').hidden=false;table(R);return}
    host.hidden=false;$('pl-table').hidden=true;
    if(!R.length){host.innerHTML='<p class="mute">No run matches these filters.</p>';return}
    const vs=[];R.forEach(x=>x.figs.forEach(f=>{vs.push(f.v);if(f.lo)vs.push(f.lo);if(f.hi)vs.push(f.hi)}));
    let lo=Math.floor(Math.log10(Math.min(...vs))),hi=Math.ceil(Math.log10(Math.max(...vs)));if(hi===lo)hi++;
    const X=v=>(Math.log10(v)-lo)/(hi-lo)*100;
    const narrow=(host.clientWidth||900)<560;
    const key=x=>Math.max(...x.figs.map(f=>f.v));
    R.sort((a,b)=>key(b)-key(a));
    let s=axis(lo,hi,narrow)+'<div class="pl-grid">';
    const ticks=[];for(let e=lo;e<=hi;e++)ticks.push('<i class="pl-tick" style="left:'+X(10**e)+'%"></i>');
    const tk=ticks.join('');
    R.forEach(x=>{const fs=x.figs,open=openId===x.id;
      let t=tk;
      if(fs.length>1){const a=Math.min(...fs.map(f=>f.v)),b=Math.max(...fs.map(f=>f.v));t+='<i class="pl-span" style="left:'+X(a)+'%;width:'+(X(b)-X(a))+'%"></i>'}
      fs.forEach((f,j)=>{if(f.lo)t+='<i class="pl-ci" style="left:'+X(f.lo)+'%;width:'+(X(f.hi)-X(f.lo))+'%"></i>';
        t+=mk(f,x.stage,open&&openFig===j,'left:'+X(f.v)+'%;',' data-f="'+j+'" title="'+esc(fmt(U,f.v).replace(/<[^>]+>/g,''))+', '+esc(f.what)+'"')});
      const vals=fs.map(f=>fmt(U,f.v)).join(' / ');
      s+='<button class="pl-row'+(open?' sel':'')+'" data-id="'+x.id+'" aria-expanded="'+open+'"><span class="pl-nm">'+esc(x.name)+'<small>'+vals+'</small></span><span class="pl-trk">'+t+'</span></button>';
      if(open)s+=card(x)});
    s+='</div>'+axis(lo,hi,narrow);
    host.innerHTML=s;
    host.querySelectorAll('.pl-row').forEach(b=>b.addEventListener('click',e=>{const id=b.dataset.id,m=e.target.closest('.pl-mk');
      if(m){openFig=+m.dataset.f;openId=id}else{openFig=null;openId=openId===id?null:id}draw();
      const c=host.querySelector('.pl-card');if(c&&c.scrollIntoView&&c.getBoundingClientRect().bottom>innerHeight)c.scrollIntoView({block:'nearest'})}))}

  // ---- the card ----
  function incGrid(i){return '<div class="pl-inc">'+INC.map(([k,n])=>{const v=i[k];
    return '<span><span class="pl-'+v+'">'+(v==='y'?'&#10003;':v==='n'?'&#10007;':'?')+'</span> '+n+(v==='u'?' <span class="mute">(unstated)</span>':'')+'</span>'}).join('')+'</div>'}
  function covers(i){const y=INC.filter(([k])=>k!=='run'&&i[k]==='y').map(([,n])=>n.toLowerCase().replace(/ \(.*\)/,'')),u=INC.filter(([k])=>i[k]==='u').map(([,n])=>n.toLowerCase().replace(/ \(.*\)/,''));
    return (y.length?'final run, '+y.join(', '):'final run only')+(u.length?'; unstated: '+u.join(', '):'')}
  function figHTML(f,stage,on){return '<div class="pl-fig'+(on?' on':'')+'"><span class="v">'+fmt(f.unit,f.v)+'</span> '+mk(f,stage,false,'position:static;margin:0 2px;vertical-align:-1px;')+' <span class="pl-tag">'+KN[f.kind]+'</span>'+(f.gpu?'<span class="pl-tag">'+f.gpu+'</span>':'')+
    '<p><b>'+esc(f.what)+'.</b> '+esc(f.calc)+'.</p>'+(f.cost?'<p class="small">Costed as: '+P.cost[f.cost]+'.</p>':'')+incGrid(f.inc)+(f.excl?'<p class="small">'+esc(f.excl)+'</p>':'')+'</div>'}
  function card(x){const r=x.run;let s='<div class="pl-card" role="region" aria-label="'+esc(x.name)+'"><h4>'+esc(x.name)+'</h4><div><span class="pl-tag" style="border-color:'+ST[x.stage].col+'">'+ST[x.stage].name+'</span><span class="pl-tag">'+esc(r.org)+'</span><span class="pl-tag">'+esc(r.date)+'</span></div>';
    s+='<p><b>What it bought:</b> '+esc(r.bought)+'</p>';
    if(x.part)s+='<p class="small mute">One stage of '+esc(r.name)+'; untick "split into stages" for the whole run.</p>';
    const shown=x.figs;shown.forEach((f,j)=>s+=figHTML(f,x.stage,openFig===j));
    if(!x.part){const other=r.figs.filter(f=>!shown.includes(f));if(other.length)s+='<p class="small mute" style="margin-top:8px">Also on the other axes:</p>'+other.map(f=>figHTML(f,x.stage,false)).join('')}
    if(r.notes&&r.notes.length)s+='<p class="small" style="margin-top:8px"><b>Notes.</b> '+r.notes.map(esc).join(' ')+'</p>';
    s+='<p class="small pl-src"><b>Sources:</b> '+r.src.map(k=>'<a href="'+SRC[k].u+'" target="_blank" rel="noopener noreferrer">'+esc(SRC[k].t)+'</a> ('+SRC[k].d+')').join('; ')+
      (r.page?'; this knowledge base\'s <a href="https://app.notion.com/p/'+r.page+'" target="_blank" rel="noopener noreferrer">paper page</a>':'')+'.</p></div>';
    return s}

  // ---- the table ----
  function table(R){const L=[];let cardH='';R.forEach(x=>x.figs.forEach((f,j)=>L.push({x,f,j})));
    const k=SORT.k,d=SORT.d,so=P.stages.map(s=>s[0]);
    L.sort((a,b)=>{let A,B;if(k==='v'){A=a.f.v;B=b.f.v}else if(k==='name'){A=a.x.name;B=b.x.name}else if(k==='stage'){A=so.indexOf(a.x.stage);B=so.indexOf(b.x.stage)}else if(k==='date'){A=a.x.run.date;B=b.x.run.date}else{A=a.f.kind;B=b.f.kind}
      return (A<B?-1:A>B?1:0)*d||b.f.v-a.f.v});
    const th=(key,lab,cls)=>'<th'+(cls?' class="'+cls+'"':'')+'><button data-k="'+key+'" class="'+(SORT.k===key?'on':'')+'">'+lab+(SORT.k===key?(SORT.d>0?' &uarr;':' &darr;'):'')+'</button></th>';
    let s='<div class="tw pl-tbl"><table><thead><tr>'+th('name','Run')+th('stage','Stage')+th('v','Figure','num')+th('kind','Kind')+'<th>Covers</th><th>Costed as</th>'+th('date','Date')+'<th>Source</th></tr></thead><tbody>';
    L.forEach(({x,f,j})=>{const r=x.run;s+='<tr class="r" data-id="'+x.id+'" data-f="'+j+'"><td><b>'+esc(x.name)+'</b><br><span class="mute">'+esc(f.what)+'</span></td><td><span style="color:'+ST[x.stage].col+'">&#9679;</span> '+ST[x.stage].name+'</td><td class="num">'+fmt(f.unit,f.v)+(f.gpu?'<br><span class="mute">'+f.gpu+'</span>':'')+'</td><td>'+KN[f.kind]+'</td><td>'+covers(f.inc)+'</td><td>'+(f.cost?P.cost[f.cost]:'<span class="mute">n/a</span>')+'</td><td>'+esc(r.date)+'</td><td>'+r.src.slice(0,2).map(k=>'<a href="'+SRC[k].u+'" target="_blank" rel="noopener noreferrer">'+esc(SRC[k].t.split(',')[0])+'</a>').join(', ')+'</td></tr>';
      if(openId===x.id&&openFig===j)cardH=card(x)});
    s+='</tbody></table></div>'+(cardH||'<p class="small mute">Click a row for its card.</p>');$('pl-table').innerHTML=s;
    $('pl-table').querySelectorAll('th button').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.k;SORT=SORT.k===k?{k,d:-SORT.d}:{k,d:k==='v'||k==='date'?-1:1};draw()}));
    $('pl-table').querySelectorAll('tr.r').forEach(tr=>tr.addEventListener('click',e=>{if(e.target.closest('a'))return;const id=tr.dataset.id,j=+tr.dataset.f;if(openId===id&&openFig===j){openId=null;openFig=null}else{openId=id;openFig=j}draw();const c=$('pl-table').querySelector('.pl-card');if(c&&c.getBoundingClientRect().top>innerHeight)c.scrollIntoView({block:'nearest'})}))}

  // ---- controls ----
  function seg(id,attr,set){document.querySelectorAll('#'+id+' button').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('#'+id+' button').forEach(y=>y.classList.toggle('on',y===b));set(b.dataset[attr]);openId=null;openFig=null;draw()}))}
  seg('pl-unit','u',v=>U=v);seg('pl-view','v',v=>VIEW=v);
  $('pl-inc').addEventListener('change',e=>{INCF=e.target.value;draw()});
  $('pl-est').addEventListener('change',e=>{EST=e.target.checked;draw()});
  $('pl-split').addEventListener('change',e=>{SPLIT=e.target.checked;openId=null;draw()});
  chips();legend();

  // ---- unpriced runs, the Magic multiple, the checks ----
  $('pl-unpriced').innerHTML='<ul class="tight">'+P.unpriced.map(u=>'<li><b>'+esc(u.name)+'</b> ('+u.d+'). '+esc(u.txt)+' <a href="'+SRC[u.src].u+'" target="_blank" rel="noopener noreferrer">'+esc(SRC[u.src].t)+'</a></li>').join('')+'</ul>';
  const DS4M=[48,45,127,120,48,21,29],MED=[...DS4M].sort((a,b)=>a-b)[3];
  const mg=P.runs.find(r=>r.id==='magic23').figs[0].v,mg4=P.runs.find(r=>r.id==='magic24').figs[0].v,ds4=P.runs.find(r=>r.id==='dsv4pro').figs[0].v;
  $('pl-magic').innerHTML='<b>Magic\'s "&gt;10x more compute-efficient" (8 September 2026): which two numbers divide?</b>'+
    '<p class="small">Magic publishes no price for its runs beyond its own conversions (~$0.5M and ~$4M on GB200, rate not given). Its efficiency claims are ratios, and each divides a different pair:</p><div class="pl-times">'+
    '<div class="stat"><div class="k">"~50x fewer FLOPs" than DeepSeek V4 Pro Base</div><div class="v">'+fF(ds4)+' / '+fF(mg)+' = '+Math.round(ds4/mg)+'x</div><div class="d">derived: the two 6ND totals in Magic\'s footnote. At matched loss Magic\'s per-domain fits give 21x to 127x against V4 Pro, so "~50x" is their median reading, close to but not the same as this division.</div></div>'+
    '<div class="stat"><div class="k">"&gt;10x" against leading open base models</div><div class="v">smallest of 28: 12x</div><div class="d">transcribed: Magic\'s Figures 1 and 2 label an effective-compute multiplier for 7 held-out domains against 4 rival base models; all 28 are 12x or more (the smallest is DeepSeek V4 Flash in one domain; the largest 127x). Against V4 Pro alone the median is '+MED+'x, which is where "~50x" comes from.</div></div>'+
    '<div class="stat"><div class="k">The e24 run against the e23 run</div><div class="v">'+(mg4/mg).toFixed(1)+'x FLOPs, 8x dollars</div><div class="d">derived: Magic says "scaling 10x (~$4M)" from ~$0.5M. Without a rate the two cannot be reconciled.</div></div></div>'+
    '<p class="small">Vendor-reported and not reproduced: the FLOP counts are 6ND on active parameters without embeddings, and the efficiency is measured as held-out bits per byte, not downstream scores. <a href="'+SRC.magic.u+'" target="_blank" rel="noopener noreferrer">Magic</a>.</p>';
  $('pl-checks').innerHTML='<ul class="tight">'+[
    '<b>Postgres query planner:</b> "hundreds of dollars" is $1,200 in the write-up ($800 of rented H100 time and $400 of API fees for the teacher\'s trajectories); SFT used 400 trajectories, not 420.',
    '<b>Thomson Reuters:</b> the $40M is talent and compute over about two years (company statements at launch), not a three-month mid-training run; the final training run cost $450,000 (CTO Joel Hron). The Batch\'s "three months" is the outlier.',
    '<b>MiMo-V2.6 against Thomson Reuters:</b> the earlier page divided $40M by $2.62M (15x) and called them the same order of magnitude. 15x is more than one order of magnitude, and the two figures cover different things. Final run against final stage, it is $2.62M against $450K: MiMo\'s stage cost 5.8 times more.',
    '<b>MiMo-V2.6\'s environments:</b> "the 7,000 environments are the expensive part rather than the GPU time" is not in Xiaomi\'s post, which gives no breakdown; unconfirmed. The stage was 30 steps.',
    '<b>Mercor and Thomson Reuters</b> do not "share a parameter count by coincidence": both start from Qwen3.5-397B-A17B. Mercor discloses no cost.',
    '<b>Periodic Neon</b> "three orders of magnitude up in budget": Periodic publishes no training cost or duration, only 1,300 H200s for the final run; unconfirmed.',
    '<b>Magic</b> "&gt;10x": the multiple is real arithmetic on Magic\'s own scaling fits; see the box above for what it divides. Vendor-reported.',
    '<b>s1 "~$50":</b> the paper gives 26 minutes on 16 H100s; the dollar figure is TechCrunch\'s, and a co-author put it at about $20.'
  ].map(t=>'<li>'+t+'</li>').join('')+'</ul>';

  (window.TAB_RENDER=window.TAB_RENDER||{})['t-price']=(window.TAB_RENDER['t-price']||[]).concat([draw]);
  let rt,lw=0;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{const w=$('pl-chart').clientWidth;if(w!==lw){lw=w;draw()}},150)});
  draw();
})();
