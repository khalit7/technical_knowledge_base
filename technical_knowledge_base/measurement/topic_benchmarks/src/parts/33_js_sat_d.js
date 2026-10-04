// ---- Saturation timeline: durations, trend, replay animation, tables, wiring ----
(function(){
  const U=window.SAT_UI,{ST,C,D,$,fd,fv,esc,SRC,kd,KIND,PER,PC,period,opt,W,lx}=U;
  const BS=D.benchmarks,BA=BS.slice().sort((a,b)=>a.launch.d.localeCompare(b.launch.d));
  const med=a=>{if(!a.length)return null;const s=a.slice().sort((x,y)=>x-y),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2};
  function eras(){const o=opt();return [0,1,2].map(e=>{const bs=BS.filter(b=>period(b)===e),cr=bs.map(b=>[b,C.crossing(b,o)]);
    const r=cr.filter(x=>x[1].status==='reached');return {e,n:bs.length,r,open:cr.filter(x=>x[1].status!=='reached'),med:med(r.map(x=>x[1].days))}})}
  function stats(){const er=eras(),o=opt();
    const tiles=[['Benchmarks',BS.length,BS.reduce((a,b)=>a+b.series.length,0)+' series, '+BS.reduce((a,b)=>a+b.series.reduce((c,s)=>c+s.pts.length,0),0)+' dated records']];
    er.forEach(x=>tiles.push(['Median to threshold, '+PER[x.e],x.med===null?'none yet':C.fmtDays(Math.round(x.med)),x.r.length+' of '+x.n+' reached'+(x.open.length?'; '+x.open.length+' not yet or replaced':'')]));
    $('sa-stats').innerHTML=tiles.map(t=>'<div class="stat"><div class="k">'+t[0]+'</div><div class="v">'+t[1]+'</div><div class="d">'+t[2]+'</div></div>').join('');
    const fast=BS.map(b=>[b,C.crossing(b,o)]).filter(x=>x[1].status==='reached'&&x[1].days<=60);
    const openNew=BS.filter(b=>period(b)===2).map(b=>[b,C.crossing(b,o)]).filter(x=>x[1].status!=='reached');
    const thr=(ST.f*100)+'% of the ceiling';
    $('sa-verdict-b').innerHTML='<p>With the settings below ('+thr+'), the median time from launch to the threshold falls from '+er.map(x=>x.med===null?'(none)':'<b>'+C.fmtDays(Math.round(x.med))+'</b>').join(' to ')+' across the three launch eras ('+PER.join(', ')+'). '+
      (fast.length?'Within two months: '+fast.map(x=>esc(x[0].name)+' ('+(x[1].days===0?'already at launch':C.fmtDays(x[1].days))+')').join(', ')+'. ':'')+
      (openNew.length?'Still short of it: '+openNew.map(x=>esc(x[0].name)+' ('+(x[1].status==='retired'?'replaced after '+C.fmtDays(x[1].days):C.fmtDays(x[1].days)+' so far')+')').join(', ')+'.':'')+'</p>'+
      '<p><b>Reading (at the default 90% of the ceiling):</b> the lifecycle has shortened from years to months, and to weeks or less in two cases: rolling exams such as AIME are born nearly solved, and Terminal-Bench-Science 0.1 gained about 35 points in its first week on one independent harness (checked below). For most benchmarks launched since 2024 the threshold took 5 to 22 months, and the fastest crossings depend on a harness or a re-based version. The weeks-long claim is right about the pace of the first jump, not yet about the whole lifecycle.</p>'}
  // ---------- ranked durations ----------
  function bars(){const o=opt();const rows=BS.map(b=>({b,cr:C.crossing(b,o)}));
    if(ST.sort==='days')rows.sort((x,y)=>(x.cr.status==='reached'?0:1)-(y.cr.status==='reached'?0:1)||x.cr.days-y.cr.days||x.b.launch.d.localeCompare(y.b.launch.d));else rows.sort((x,y)=>x.b.launch.d.localeCompare(y.b.launch.d));
    const T=[[0,'0'],[7,'1w'],[30,'1m'],[182,'6m'],[365,'1y'],[1096,'3y'],[2191,'6y']];
    $('sa-bax').innerHTML=T.map(([d,s])=>'<span style="left:'+(100*lx(d)).toFixed(1)+'%">'+s+'</span>').join('');
    $('sa-bars').innerHTML=rows.map(({b,cr})=>{const col=PC[period(b)],x=100*lx(cr.days);let bar,tx;
      if(cr.status==='reached'){bar=cr.days===0?'<span class="dot" style="left:0;background:'+col+'"></span>':'<span class="fl" style="width:'+x.toFixed(1)+'%;background:'+col+'"></span>';
        const flags=[];if(cr.pt.k==='lab')flags.push('lab-reported');if(cr.ser.diff)flags.push('measured on '+cr.ser.diff);if(/Provider Adapter/.test(cr.ser.label))flags.push('Provider Adapter harness');
        tx='<b>'+(cr.days===0?'at launch':C.fmtDays(cr.days))+'</b> &middot; '+esc(cr.pt.m)+', '+fd(cr.pt.d)+(flags.length?' &middot; '+flags.join(', '):'')}
      else{bar='<span class="fl open" style="width:'+x.toFixed(1)+'%"></span>';const all=C.pts(b,o),bi=all.filter(q=>q.p.k!=='lab'),bl=all.filter(q=>q.p.k==='lab'),mx=a=>Math.max(...a.map(q=>q.p.v));tx='<b>'+(cr.status==='retired'?'replaced':'not yet')+'</b> after '+C.fmtDays(cr.days)+' &middot; best so far '+(bi.length?fv(mx(bi))+'%':'none')+(bl.length&&mx(bl)>(bi.length?mx(bi):-1)?' ('+fv(mx(bl))+'% lab-reported)':'')+(cr.status==='retired'?' ('+esc(b.retired.n)+')':'')}
      return '<div class="sa-br"><div class="nm">'+esc(b.name)+'<small>launched '+fd(b.launch.d)+'</small></div><div class="tr">'+bar+'</div><div class="tx">'+tx+'</div></div>'}).join('')}
  // ---------- trend ----------
  function trend(){const el=$('sa-trend'),w=W(el),h=w<500?250:300,pl=w<500?34:62,pr=12,pt=10,pb=26,iw=w-pl-pr,ih=h-pt-pb,o=opt();
    const x0=Date.UTC(2010,0,1)/864e5,x1=Date.UTC(2027,0,1)/864e5,X=t=>pl+iw*(t-x0)/(x1-x0),Y=d=>pt+ih*(1-lx(d));
    let g='<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img" aria-label="Days from launch to threshold against launch date">';
    [[0,'0'],[7,'1 week'],[30,'1 month'],[182,'6 months'],[365,'1 year'],[1096,'3 years']].forEach(([d,s])=>{g+='<line x1="'+pl+'" x2="'+(w-pr)+'" y1="'+Y(d)+'" y2="'+Y(d)+'" stroke="var(--line)"/><text x="'+(pl-4)+'" y="'+(Y(d)+4)+'" font-size="10" text-anchor="end" fill="var(--mute)">'+(w<500?s.replace(' weeks','w').replace(' week','w').replace(' months','m').replace(' month','m').replace(' years','y').replace(' year','y'):s)+'</text>'});
    for(let y=2010;y<=2026;y+=(w<500?4:2)){const x=X(Date.UTC(y,0,1)/864e5);g+='<text x="'+x+'" y="'+(h-8)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+y+'</text>'}
    const pts=BS.map(b=>({b,cr:C.crossing(b,o),x:X(C.day(b.launch.d))}));pts.forEach(q=>q.y=Y(q.cr.days));
    pts.forEach((q,i)=>{const col=PC[period(q.b)];const a='data-i="'+i+'" tabindex="0" role="button" aria-label="'+esc(q.b.name)+'" style="cursor:pointer"';
      if(q.cr.status==='reached')g+='<circle cx="'+q.x+'" cy="'+q.y+'" r="5" fill="'+col+'" '+a+'/>';
      else g+='<path d="M'+q.x+' '+(q.y-6)+'L'+(q.x+5.5)+' '+(q.y+4)+'L'+(q.x-5.5)+' '+(q.y+4)+'Z" fill="var(--bg)" stroke="'+(q.cr.status==='retired'?'var(--bad)':col)+'" stroke-width="1.6" '+a+'/>'});
    if(w>=640){const placed=[];pts.slice().sort((a,b)=>a.x-b.x).forEach(q=>{let ly=q.y+3.5;const lw=q.b.name.length*5.6;let tries=0;
      while(placed.some(p=>Math.abs(p.y-ly)<11&&q.x+8<p.x+p.w&&q.x+8+lw>p.x)&&tries<6){ly+=(tries%2?-1:1)*11*(tries+1);tries++}
      if(q.x+8+lw>w-pr)return;placed.push({x:q.x+8,y:ly,w:lw});g+='<text x="'+(q.x+8)+'" y="'+ly+'" font-size="10" fill="var(--mute)">'+esc(q.b.name)+'</text>'})}
    el.innerHTML=g+'</svg>';
    el.querySelectorAll('[data-i]').forEach(m=>{const f=()=>{const q=pts[+m.dataset.i];$('sa-tcap').innerHTML='<b>'+esc(q.b.name)+'</b>, launched '+fd(q.b.launch.d)+': '+U.status(q.b)+(q.cr.pt?' ('+esc(q.cr.pt.m)+')':'')+'.'};m.addEventListener('click',f);m.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();f()}})});
    const er=eras();
    $('sa-era').innerHTML='<table class="sa-t"><thead><tr><th>Launched</th><th class="num">Benchmarks</th><th class="num">Reached</th><th class="num">Median of those reached</th><th>Fastest</th><th>Not yet, or replaced</th></tr></thead><tbody>'+er.map(x=>{const f=x.r.slice().sort((a,b)=>a[1].days-b[1].days)[0];
      return '<tr><td><span style="color:'+PC[x.e]+'">&#9679;</span> '+PER[x.e].replace('launched ','')+'</td><td class="num">'+x.n+'</td><td class="num">'+x.r.length+'</td><td class="num">'+(x.med===null?'none':C.fmtDays(Math.round(x.med)))+'</td><td>'+(f?esc(f[0].name)+' ('+(f[1].days===0?'at launch':C.fmtDays(f[1].days))+')':'none')+'</td><td>'+(x.open.length?x.open.map(y=>esc(y[0].name)+' ('+C.fmtDays(y[1].days)+(y[1].status==='retired'?', replaced':'')+')').join(', '):'none')+'</td></tr>'}).join('')+'</tbody></table>'}
  // ---------- replay animation ----------
  const A={mode:'cal',i:0,timer:null,vis:false,frames:[]};
  const RM=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  function frames(){const f=[];if(A.mode==='cal'){for(let m=0;;m++){const t=Date.UTC(2010,9+m,0)/864e5;if(t>C.asOf){f.push(C.asOf);break}f.push(t)}}
    else{[0,7,14,21,28,42,56,70].forEach(d=>f.push(d));for(let m=3;m<=84;m++)f.push(Math.round(m*30.44))}return f}
  function aLabel(t){if(A.mode==='cal')return fd(new Date(t*864e5).toISOString().slice(0,10)).replace(/^\d+ /,'');return t<84?(t===0?'launch day':'week '+Math.round(t/7)):'month '+Math.round(t/30.44)}
  function shareAt(b,t){const o=opt(),L=C.day(b.launch.d);let tt=A.mode==='cal'?t:L+t;const pre=A.mode==='cal'&&tt<L,future=tt>C.asOf;if(future)tt=C.asOf;
    const best=C.bestAt(b,tt,o),c=C.ceil(b,o.mode),z=C.base(b,o.chance);if(!best||pre)return {pre,future,share:null};
    return {pre,future,share:Math.max(0,(best.p.v-z)/(c-z)),best}}
  function animBuild(){$('sa-anim').innerHTML=BA.map((b,i)=>'<div class="sa-ar" id="sa-ar'+i+'"><span class="nm" title="'+esc(b.name)+'">'+esc(b.name)+'</span><span class="tr"><span class="fl" style="background:'+PC[period(b)]+(RM?';transition:none':'')+'"></span><span class="tk" style="left:80%"></span><span class="tk" style="left:90%"></span></span><span class="v"></span></div>').join('')}
  function animDraw(){A.frames=frames();if(A.i>=A.frames.length)A.i=A.frames.length-1;const t=A.frames[A.i],o=opt();const sc=$('sa-scrub');sc.max=A.frames.length-1;sc.value=A.i;
    let launched=0,hit=0;
    BA.forEach((b,i)=>{const r=$('sa-ar'+i);if(!r)return;const s=shareAt(b,t);const fl=r.querySelector('.fl'),v=r.querySelector('.v');
      r.classList.toggle('pre',s.pre||(A.mode==='age'&&s.future&&false));
      if(s.share===null){fl.style.width='0';v.textContent=s.pre?'':'no data'}else{launched++;fl.style.width=Math.min(100,100*s.share).toFixed(1)+'%';v.textContent=Math.round(100*s.share)+'%'+(A.mode==='age'&&s.future?'*':'')}
      const h=s.share!==null&&s.share>=ST.f-1e-9;r.classList.toggle('hit',h);if(h)hit++;
      r.querySelectorAll('.tk').forEach((k,j)=>k.style.left=(j?90:80)+'%')});
    if(A.mode==='cal'){launched=BS.filter(b=>C.day(b.launch.d)<=t).length}
    $('sa-actr').innerHTML='<div class="stat"><div class="k">'+(A.mode==='cal'?'Date':'Time since each launch')+'</div><div class="v">'+aLabel(t)+'</div></div><div class="stat"><div class="k">Launched so far</div><div class="v">'+(A.mode==='cal'?launched:BS.length)+' of '+BS.length+'</div></div><div class="stat"><div class="k">At or past '+(ST.f*100)+'% of ceiling</div><div class="v">'+hit+'</div></div>';
    // caption: crossings and launches since the previous frame
    const prev=A.i?A.frames[A.i-1]:-1e9,ev=[];
    BS.forEach(b=>{const L=C.day(b.launch.d),cr=C.crossing(b,o);
      if(A.mode==='cal'){if(L>prev&&L<=t)ev.push(esc(b.name)+' launches');if(cr.status==='reached'){const ct=Math.max(L,C.day(cr.pt.d));if(ct>prev&&ct<=t)ev.push('<b>'+esc(b.name)+'</b> reaches the threshold ('+esc(cr.pt.m)+')')}}
      else{if(cr.status==='reached'&&cr.days>prev&&cr.days<=t)ev.push('<b>'+esc(b.name)+'</b> '+(cr.days===0?'is born past the threshold':'reaches it')+' ('+esc(cr.pt.m)+')')}});
    $('sa-acap').innerHTML=(ev.length?ev.join('; ')+'.':(A.i===0?(A.mode==='cal'?'September 2010: ILSVRC publishes its first results. Press Play, or drag the slider.':'Every benchmark at its own launch day. Bars already filled are benchmarks born past the threshold or close to it.'):'No crossing this '+(A.mode==='cal'||t>=84?'month':'week')+'.'))+(A.mode==='age'?' <span class="sa-note">* the benchmark is younger than this; its bar stays at today\'s value.</span>':'')}
  function stop(){if(A.timer){clearInterval(A.timer);A.timer=null}$('sa-play').textContent='Play'}
  function play(){if(A.timer){stop();return}if(A.i>=A.frames.length-1)A.i=0;$('sa-play').textContent='Pause';
    A.timer=setInterval(()=>{if(!A.vis||$('t-sat').hidden||document.hidden)return;if(A.i>=A.frames.length-1){stop();return}A.i++;animDraw()},Math.round((A.mode==='cal'?260:450)/(+$('sa-speed').value||1)))}
  // ---------- tables ----------
  function tables(){const t=D.tbs_check;$('sa-tbs-claim').innerHTML='The claim, from the old page: <i>"'+esc(t.claim)+'"</i> Every published reading of the three models involved:';
    $('sa-tbs').innerHTML='<table class="sa-t"><thead><tr>'+t.cols.map((c,i)=>'<th'+(i===2?' class="num"':'')+'>'+c+'</th>').join('')+'</tr></thead><tbody>'+t.rows.map(r=>'<tr><td>'+esc(r[0])+'</td><td>'+fd(r[1])+'</td><td class="num"><b>'+r[2]+'</b></td><td>'+esc(r[3])+'</td><td>'+kd(r[4])+'</td><td>'+SRC(r[5])+'</td><td>'+(/^\d/.test(r[6])?fd(r[6]):esc(r[6]))+'</td></tr>').join('')+'</tbody></table>';
    $('sa-chains').innerHTML='<table class="sa-t"><thead><tr><th>Family</th><th>Version</th><th>Launched</th><th>Frontier at launch, or what changed</th><th class="num">Until the next</th></tr></thead><tbody>'+D.chains.map(c=>c.items.map((it,i)=>{const sep=/separate/.test(it[0]);let nx=c.items.slice(i+1).find(x=>!/separate/.test(x[0]));
      const last=!nx;const dd=sep?'separate line':last?'current':C.fmtDays(C.day(nx[1])-C.day(it[1]));
      return '<tr><td>'+(i?'':'<b>'+esc(c.fam)+'</b>')+'</td><td>'+esc(it[0])+'</td><td>'+fd(it[1])+' ('+SRC(it[2]).replace(/>[^<]*</,'>source<')+')</td><td>'+esc(it[3])+'</td><td class="num">'+dd+'</td></tr>'}).join('')).join('')+'</tbody></table>';
    const used={};BS.forEach(b=>{used[b.launch.s]=1;if(b.human){used[b.human.s]=1;(b.human.alt||[]).forEach(a=>used[a.s]=1)}b.series.forEach(s=>s.pts.forEach(p=>used[p.s]=1))});D.chains.forEach(c=>c.items.forEach(i=>used[i[2]]=1));D.tbs_check.rows.forEach(r=>used[r[5]]=1);
    $('sa-srcs').innerHTML='<b>Sources ('+Object.keys(used).length+'):</b> '+Object.keys(used).map(SRC).join('; ')+'.'}
  // ---------- wiring ----------
  function segs(id,key,conv,after){const el=$(id);el.querySelectorAll('button').forEach(b=>b.onclick=()=>{ST[key]=conv(b.dataset.v);el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));after()})}
  function settings(){U.rule();stats();U.smallMultiples();U.detail();bars();trend();animDraw()}
  let built=false;
  function render(){if(!built){built=true;U.keys();U.chips();animBuild();tables();
      segs('sa-f','f',Number,settings);segs('sa-mode','mode',String,settings);segs('sa-smx','smx',String,U.smallMultiples);segs('sa-sort','sort',String,bars);
      segs('sa-amode','mode_',String,()=>{});$('sa-amode').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{stop();A.mode=b.dataset.v;A.i=0;animDraw()}));
      $('sa-chance').onchange=e=>{ST.chance=e.target.checked;settings()};$('sa-ind').onchange=e=>{ST.indOnly=e.target.checked;settings()};
      $('sa-play').onclick=play;$('sa-back').onclick=()=>{stop();A.i=Math.max(0,A.i-1);animDraw()};$('sa-fwd').onclick=()=>{stop();A.i=Math.min(A.frames.length-1,A.i+1);animDraw()};
      $('sa-scrub').oninput=e=>{stop();A.i=+e.target.value;animDraw()};$('sa-speed').onchange=()=>{if(A.timer){stop();play()}};
      if('IntersectionObserver' in window)new IntersectionObserver(es=>es.forEach(e=>A.vis=e.isIntersecting)).observe($('sa-anim'));else A.vis=true;
      A.frames=frames();}
    settings()}
  let rt=null,lastW=0;
  addEventListener('resize',()=>{if($('t-sat').hidden)return;clearTimeout(rt);rt=setTimeout(()=>{const w=$('sa-sm').clientWidth;if(built&&w!==lastW){lastW=w;U.smallMultiples();U.detail();trend()}},120)});
  window.TAB_RENDER=window.TAB_RENDER||{};(window.TAB_RENDER['t-sat']=window.TAB_RENDER['t-sat']||[]).push(()=>{render();lastW=$('sa-sm').clientWidth});
})();
