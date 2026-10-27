// ---- Tables tab: Tables 3 and 4 explorer, cost against score, Tables 5 to 7, every check ----
(function(){if(!$('tbl'))return;let view='self',met='s',sortK=null,sortD=-1;
  const ROWS=['Seed harness',...CR,'Human reference'];
  const cell=(r,k)=>met==='s'?r[k]:r[k+'_tok'];
  function render(){const hum=rowOf('T3','Human reference');let h='<tr><th>Creator</th>'+BM.map(([k,n])=>'<th class="num" data-k="'+k+'" style="cursor:pointer">'+n+(sortK===k?(sortD<0?' ▾':' ▴'):'')+'</th>').join('')+(met==='s'?'<th class="num" data-k="avg" style="cursor:pointer">Avg.'+(sortK==='avg'?(sortD<0?' ▾':' ▴'):'')+'</th>':'')+'</tr>';
    const val=(name,k)=>{const a=rowOf('T3',name),b=rowOf('T4',name);const kk=k==='avg'?'avg':k;
      if(view==='self')return a?{v:met==='s'?a[kk]:a[kk+'_tok'],p:met==='s'?a[kk+'_p']:a[kk+'_tok_p'],f:a[kk+'_f']||''}:null;
      if(view==='uni'){if(name==='Human reference')return a?{v:met==='s'?a[kk]:a[kk+'_tok'],p:(met==='s'?a[kk+'_p']:a[kk+'_tok_p'])+' (ref.)',f:''}:null;return b?{v:met==='s'?b[kk]:b[kk+'_tok'],p:met==='s'?b[kk+'_p']:b[kk+'_tok_p'],f:b[kk+'_f']||''}:null}
      if(view==='d'){if(!a||!b||name==='Human reference')return null;const x=met==='s'?a[kk]:a[kk+'_tok'],y=met==='s'?b[kk]:b[kk+'_tok'];if(x==null||y==null)return null;const d=y-x;return {v:d,p:(d>0?'+':'')+d.toFixed(1),f:''}}
      if(view==='pct'){if(met!=='s'||!a||a[kk]==null||hum[kk]==null)return null;const d=100*a[kk]/hum[kk];return {v:d,p:d.toFixed(0)+'%',f:''}}};
    let rows=ROWS.slice();if(sortK)rows.sort((x,y)=>{const a=val(x,sortK),b=val(y,sortK);return ((a&&a.v!=null?a.v:-1e9)-(b&&b.v!=null?b.v:-1e9))*sortD*-1});
    rows.forEach(n=>{h+='<tr><td>'+n+'</td>';[...BM.map(b=>b[0]),...(met==='s'?['avg']:[])].forEach(k=>{const c=val(n,k);h+='<td class="num">'+(c&&c.v!=null?c.p+(c.f?'<sup>'+c.f+'</sup>':''):'<span class="mute">n/a</span>')+'</td>'});h+='</tr>'});
    $('tbl').innerHTML=h;$('tbl').querySelectorAll('th[data-k]').forEach(t=>t.addEventListener('click',()=>{if(sortK===t.dataset.k)sortD=-sortD;else{sortK=t.dataset.k;sortD=-1}render()}));
    $('tblNote').innerHTML={self:'Table 3 as printed: avg@3, Avg. is the mean of SWE-Pro, Terminal, EQ-Bench3 and BrowseComp (MLE-bench excluded). * external report, not re-run.',uni:'Table 4 as printed: every harness run by Gemini 3.1 Pro; the Gemini row is the Self-Eval control. ‡ contains one collapsed replica (without it: Opus SWE-Pro 49.1; DeepSeek SWE-Pro 43.8, Terminal 57.3). The reference row repeats Table 3.',d:'Table 4 minus Table 3, the paper\'s Figure 6 labels. Positive: the harness did better with Gemini than with its own creator.',pct:'Self-Eval score as a percentage of the reference, the paper\'s Figure 4. Over 100% means above that external system, "not exceeding human ability".'}[view]+' Click a column to sort.'}
  segBind('tblM',m=>{view=m;if(m==='pct'){met='s';$('tblK').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.m==='s'))}render()});segBind('tblK',m=>{met=m;if(m==='t'&&view==='pct'){view='self';$('tblM').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.m==='self'))}render()});render();

  // cost against score
  let ck='swe';const host=$('costPlot');
  function draw(w){const H=Math.min(380,Math.max(280,w*.6)),pl=44,pr=12,pt=12,pb=42;const P=[];CR.forEach(c=>{const a=rowOf('T3',c),b=rowOf('T4',c);P.push({c,self:1,x:a[ck+'_tok'],y:a[ck]});if(c!=='Gemini 3.1 Pro')P.push({c,self:0,x:b[ck+'_tok'],y:b[ck]})});
    const hum=rowOf('T3','Human reference');if(hum[ck+'_tok'])P.push({c:'Human reference',hum:1,x:hum[ck+'_tok'],y:hum[ck]});
    const xs=P.map(p=>p.x),lo=Math.pow(10,Math.floor(Math.log10(Math.min(...xs)))),hi=Math.pow(10,Math.ceil(Math.log10(Math.max(...xs))));
    const sx=v=>pl+(w-pl-pr)*(Math.log10(v)-Math.log10(lo))/(Math.log10(hi)-Math.log10(lo)),sy=v=>pt+(H-pt-pb)*(1-v/100);let s='';
    [0,20,40,60,80,100].forEach(v=>{s+=ln2(pl,sy(v),w-pr,sy(v),'var(--line)')+tx(pl-5,sy(v)+4,v,{fs:11,a:'end',c:'var(--mute)'})});
    for(let d=lo;d<=hi;d*=10){s+=ln2(sx(d),pt,sx(d),H-pb,'var(--line)')+tx(sx(d),H-pb+14,d>=1000?fmt(d/1000)+'B':fmt(d)+'M',{fs:11,a:'middle',c:'var(--mute)'})}
    s+=tx((pl+w-pr)/2,H-6,'executor tokens per harness (log scale)',{fs:11,a:'middle',c:'var(--mute)'});
    s+=ln2(pl,sy(hum[ck]),w-pr,sy(hum[ck]),'var(--ink)',{da:'4 3'})+tx(w-pr-2,sy(hum[ck])-4,'reference '+hum[ck+'_p'],{fs:11,a:'end'});
    const lab=[];P.forEach(p=>{const col=p.hum?'var(--ink)':LCOL(p.c);s+='<circle cx="'+sx(p.x).toFixed(1)+'" cy="'+sy(p.y).toFixed(1)+'" r="6" fill="'+(p.self||p.hum?col:'var(--bg)')+'" stroke="'+col+'" stroke-width="2"><title>'+p.c+(p.hum?'':p.self?' Self-Eval':' run by Gemini')+': '+p.y+' at '+p.x+'M tokens</title></circle>';if(p.self||p.hum)lab.push({x:sx(p.x),y:sy(p.y),t:p.hum?'reference':shortC(p.c)})});
    placeLabels(lab,w,H-pb).forEach(p=>{s+=tx(p.lx,p.ly,p.t,{fs:11,a:p.la})});host.innerHTML=svgW(w,H,s,'Cost against score')}
  segBind('costM',m=>{ck=m;refit(host)});onTab('t-tables',()=>fit(host,draw));

  // Tables 5 and 7
  let h='<tr><th>Creator</th><th>Files</th><th class="num">Net LOC</th><th class="num">Median</th><th class="num">SWE</th><th class="num">Term.</th></tr>';PT.T5.rows.forEach(r=>{h+='<tr><td>'+r.creator+'</td><td>'+r.files+'</td><td class="num">'+fmt(r.loc)+'</td><td class="num">'+fmt(r.median)+'</td><td class="num">'+r.swe_p+'</td><td class="num">'+r.term_p+'</td></tr>'});$('t5').innerHTML=h;
  h='<tr><th>Lineage</th><th class="num">Switches</th><th class="num">Diff</th><th>Focus</th></tr>';PT.T7.rows.forEach(r=>{h+='<tr><td>'+(r.setting==='Self'?'':'Gemini runs ')+r.creator+'</td><td class="num">'+r.switches+'</td><td class="num">'+r.files+' files, +'+r.add+'/−'+r.del+'</td><td class="small">'+r.focus+'</td></tr>'});$('t7').innerHTML=h;
  // Table 6 printed against decoded
  h='<tr><th>Lineage</th><th class="num">Feedback H0 to declared</th><th class="num">Decoded</th><th class="num">Held-out H0 to declared</th><th class="num">Decoded</th><th class="num">Final gap</th><th class="num">Decoded</th></tr>';
  PT.T6.rows.forEach(r=>{const l=DV.lineages.find(x=>x.setting===r.setting&&x.creator===r.creator);
    h+='<tr><td>'+(r.setting==='Self'?'':'Gemini runs ')+r.creator+'</td><td class="num">'+r.fb0+' to '+r.fbd+' ('+r.fbgain+')</td><td class="num">'+l.pair[0].toFixed(1)+' to '+l.pair[l.declared].toFixed(1)+'</td><td class="num">'+r.ho0.toFixed(2)+' to '+r.hod.toFixed(2)+' ('+r.hogain+')</td><td class="num">'+l.ho[0].toFixed(2)+' to '+l.ho[l.declared].toFixed(2)+'</td><td class="num">'+r.gap.toFixed(2)+'</td><td class="num">'+(Math.max(...l.ho)-l.ho[l.declared]).toFixed(2)+'</td></tr>'});
  $('t6').innerHTML=h;
  // every check
  const C=RC.checks;let cm='all';
  function chk(){const xs=C.filter(c=>cm==='all'||(cm==='ind'?c.how.startsWith('independent'):c.how.startsWith('by construction')));
    $('chkSum').innerHTML='<b>'+C.filter(c=>c.ok).length+' of '+C.length+'</b> checks agree ('+C.filter(c=>c.how.startsWith('independent')).length+' independent, '+C.filter(c=>c.how.startsWith('by construction')).length+' by construction). Showing '+xs.length+'.';
    let t='<tr><th>What</th><th class="num">This page</th><th class="num">Paper</th><th></th></tr>';const f=v=>Array.isArray(v)?v.join(', '):v;
    xs.forEach(c=>{t+='<tr><td class="small">'+c.what+'<br><span class="mute">'+c.how+'</span></td><td class="num">'+f(c.ours)+'</td><td class="num">'+f(c.paper)+'</td><td>'+(c.ok?'<span class="ok">ok</span>':'<span class="no">differs</span>')+'</td></tr>'});$('chk').innerHTML=t}
  segBind('chkM',m=>{cm=m;chk()});chk();$('bothReg').textContent=DV.both_regress_raw;
})();
