// ---- Same model, many numbers: shared helpers and the case explorer ----
(function(){
  const D=window.SM_DATA;if(!D)return;
  const $=id=>document.getElementById(id);
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const url=u=>u.indexOf('n:')===0?'https://app.notion.com/p/'+u.slice(2):u;
  const link=(t,u)=>'<a href="'+esc(url(u))+'" target="_blank" rel="noopener noreferrer">'+esc(t)+'</a>';
  // [[text|url]] inside data strings becomes a link; everything else is escaped
  const md=s=>{let out='',i=0,re=/\[\[([^|\]]+)\|([^\]]+)\]\]/g,m;while((m=re.exec(s))){out+=esc(s.slice(i,m.index))+link(m[1],m[2]);i=re.lastIndex}return out+esc(s.slice(i))};
  const srcs=keys=>(keys||[]).map(k=>{const s=D.sources[k]||k;return link(s[0],s[1])}).join('; ');
  const KC={vendor:'var(--c2)',rival:'var(--c5)',maint:'var(--c3)',indep:'var(--c1)',paper:'var(--c4)'};
  const fmt=v=>(Math.round(v*10)/10).toFixed(Math.abs(v*10-Math.round(v*10))<1e-9&&Math.abs(v-Math.round(v))>1e-9?1:(Math.abs(v-Math.round(v))<1e-9?0:1));
  const pct=v=>{const r=Math.round(v*100)/100;return (Math.abs(r*10-Math.round(r*10))<1e-9?r.toFixed(1):r.toFixed(2))+'%'};
  window.SMU={$,esc,url,link,md,srcs,KC,pct,fmt};

  const st={c:0,sel:-1,cmp:[],tbl:false};
  const chips=$('sm-chips'),host=$('sm-case');
  D.cases.forEach((c,i)=>{const b=document.createElement('button');b.textContent=c.short;b.dataset.i=i;b.addEventListener('click',()=>{st.c=i;st.sel=-1;st.cmp=[];draw()});chips.appendChild(b)});

  function ci(r,c){ // 95% exact interval when the reading is a share of known items
    const n=r.n;if(!n||!window.SMC)return null;
    if(r.ci95)return [r.v-r.ci95,r.v+r.ci95,'printed'];
    const m=(r.metric||c.metric)||'';if(/partial|RHAE|not stated/i.test(m))return null;
    const k=Math.round(r.v/100*n),iv=window.SMC.cp(k,n,0.05);return [iv[0]*100,iv[1]*100,'exact'];
  }
  function row(r,i,c){
    const alt=r.metric&&r.metric!==c.metric;const x=Math.max(0,Math.min(100,r.v));
    const iv=ci(r,c);
    let trk='<div class="sm-trk">';
    if(iv)trk+='<span class="wh" style="left:'+Math.max(0,iv[0]).toFixed(2)+'%;width:'+(Math.min(100,iv[1])-Math.max(0,iv[0])).toFixed(2)+'%"></span>';
    trk+='<span class="dt'+(alt?' ho':'')+'" style="left:'+x.toFixed(2)+'%;background:'+KC[r.who[0]]+';'+(alt?'border-color:'+KC[r.who[0]]:'')+'"></span></div>';
    return '<div class="sm-row'+(st.sel===i?' sel':'')+'" data-i="'+i+'" role="button" tabindex="0" aria-label="'+esc(r.lab)+', '+esc(pct(r.v))+'">'+
      '<input type="checkbox" data-c="'+i+'" aria-label="Compare '+esc(r.lab)+'"'+(st.cmp.includes(i)?' checked':'')+'>'+
      '<div class="nm">'+esc(r.lab)+(r.flag?'<span class="flag">'+esc(r.flag)+'</span>':'')+'<small>'+esc(r.who[1])+(alt?' · '+esc(r.metric):'')+'</small></div>'+trk+
      '<div class="val">'+pct(r.v)+'</div></div>';
  }
  function detail(r,c){
    const f=[['Who ran it',r.who[1]+' ('+D.kinds[r.who[0]].toLowerCase()+')'],['Model',r.model||c.model],['Metric',r.metric||c.metric],['Harness or scaffold',r.harness],['Split',r.split],['Benchmark version',r.version],['Sampling',r.sampling],['Effort',r.effort],['Tools',r.tools],['Date',r.date],['Cost',r.cost],['Items (n)',r.n?r.n.toLocaleString('en-GB'):null]];
    const iv=ci(r,c);
    let s='<div class="sm-det"><h5>'+esc(r.lab)+': '+pct(r.v)+'</h5><dl>';
    f.forEach(([k,v])=>{if(v!=null&&v!=='')s+='<dt>'+esc(k)+'</dt><dd>'+esc(v)+'</dd>'});
    if(iv)s+='<dt>95% interval</dt><dd>'+pct(Math.max(0,iv[0]))+' to '+pct(Math.min(100,iv[1]))+(iv[2]==='printed'?' (printed by the source)':' (exact binomial over '+r.n.toLocaleString('en-GB')+' items, computed here)')+'</dd>';
    s+='</dl>'+(r.note?'<p class="small">'+esc(r.note)+'</p>':'')+'<p class="sm-src">Source: '+srcs(r.src)+'</p></div>';return s;
  }
  const FIELDS=[['who','Who'],['harness','Harness'],['split','Split'],['version','Version'],['sampling','Sampling'],['effort','Effort'],['tools','Tools'],['metric','Metric'],['date','Date']];
  function compare(c){
    if(st.cmp.length<2)return '<p class="small mute">'+(st.cmp.length?'Tick one more row to compare.':'Tick two rows to compare them field by field.')+'</p>';
    const a=c.readings[st.cmp[0]],b=c.readings[st.cmp[1]];
    const val=(r,k)=>k==='who'?r.who[1]:k==='metric'?(r.metric||c.metric):r[k];
    let s='<div class="sm-cmp"><div class="tw"><table><thead><tr><th>Field</th><th>'+esc(a.lab)+'</th><th>'+esc(b.lab)+'</th></tr></thead><tbody>';
    s+='<tr><td>Score</td><td><b>'+pct(a.v)+'</b></td><td><b>'+pct(b.v)+'</b></td></tr>';
    let nd=0;FIELDS.forEach(([k,l])=>{const x=val(a,k)||'',y=val(b,k)||'';const d=x!==y;if(d&&k!=='date')nd++;s+='<tr><td>'+esc(l)+'</td><td'+(d?' class="df"':'')+'>'+esc(x||'(not given)')+'</td><td'+(d?' class="df"':'')+'>'+esc(y||'(not given)')+'</td></tr>'});
    s+='</tbody></table></div>';
    const gap=b.v-a.v;
    s+='<p class="small">Gap: <b>'+(gap>=0?'+':'')+gap.toFixed(1)+' points</b>, with '+nd+' condition'+(nd===1?'':'s')+' different (highlighted). ';
    const sameMetric=(a.metric||c.metric)===(b.metric||c.metric);
    if(a.n&&b.n&&sameMetric&&!/partial|RHAE|not stated/i.test(a.metric||c.metric)){
      s+='<button class="sm-btn" id="sm-test">Is this gap noise? Open it in the calculator</button>';
    }else s+='The calculator needs the same proportion metric and known item counts for both rows'+(sameMetric?'':' (these are different metrics)')+'.';
    return s+'</p></div>';
  }
  function draw(){
    const c=D.cases[st.c];
    [...chips.children].forEach((b,i)=>b.classList.toggle('on',i===st.c));
    const kinds=[...new Set(c.readings.map(r=>r.who[0]))];
    let s='<div class="sm-head"><h4>'+esc(c.model)+' on '+esc(c.bench)+'</h4><div class="sm-sub">Main metric: '+esc(c.metric)+'. '+esc(c.nnote||'')+'</div></div>';
    s+='<p class="sm-take">'+esc(c.takeaway)+'</p>';
    s+='<div class="sm-leg">'+kinds.map(k=>'<span><i style="background:'+KC[k]+'"></i>'+esc(D.kinds[k])+'</span>').join('')+(c.readings.some(r=>r.metric&&r.metric!==c.metric)?'<span><i class="ho"></i>different metric</span>':'')+'<span>whisker: 95% interval</span></div>';
    s+='<div class="sm-plot"><div class="sm-axis" aria-hidden="true"><span></span><span></span><div class="tk"><span style="left:0">0%</span><span class="q" style="left:25%">25</span><span style="left:50%">50</span><span class="q" style="left:75%">75</span><span style="left:100%">100%</span></div><span></span></div>';
    let g=null;c.readings.forEach((r,i)=>{if(r.grp!==g){g=r.grp;s+='<div class="sm-grp">'+esc(g)+'</div>'}s+=row(r,i,c)});
    s+='</div>';
    s+=st.sel>=0?detail(c.readings[st.sel],c):'<p class="small mute">Tap a row for its conditions and source.</p>';
    s+=compare(c);
    if(c.notes&&c.notes.length)s+='<ul class="sm-notes">'+c.notes.map(n=>'<li>'+md(n)+'</li>').join('')+'</ul>';
    (c.corrections||[]).forEach(x=>{s+='<div class="sm-fix"><b>Correction to the old page.</b> '+md(x)+'</div>'});
    s+='<p><button class="sm-btn" id="sm-tt">'+(st.tbl?'Hide':'Show')+' every reading as a table</button></p>';
    if(st.tbl){
      s+='<div class="tw"><table class="sm-tbl"><thead><tr><th>Reading</th><th class="num">Score</th><th>Who</th><th>Harness</th><th>Split</th><th>Version</th><th>Sampling</th><th>Effort</th><th>Tools</th><th>Date</th><th>Source</th></tr></thead><tbody>';
      c.readings.forEach(r=>{s+='<tr><td>'+esc(r.lab)+'</td><td class="num">'+pct(r.v)+'</td><td>'+esc(r.who[1])+'</td><td>'+esc(r.harness)+'</td><td>'+esc(r.split)+'</td><td>'+esc(r.version)+'</td><td>'+esc(r.sampling)+'</td><td>'+esc(r.effort)+'</td><td>'+esc(r.tools)+'</td><td>'+esc(r.date)+'</td><td>'+srcs(r.src)+'</td></tr>'});
      s+='</tbody></table></div>';
    }
    host.innerHTML=s;
    host.querySelectorAll('.sm-row').forEach(el=>{
      const go=e=>{if(e.target.tagName==='INPUT'||e.target.tagName==='A')return;const i=+el.dataset.i;st.sel=st.sel===i?-1:i;draw()};
      el.addEventListener('click',go);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go(e)}});
    });
    host.querySelectorAll('.sm-row input').forEach(el=>el.addEventListener('change',()=>{const i=+el.dataset.c;
      if(el.checked){st.cmp.push(i);if(st.cmp.length>2)st.cmp.shift()}else st.cmp=st.cmp.filter(x=>x!==i);draw()}));
    const tt=$('sm-tt');if(tt)tt.addEventListener('click',()=>{st.tbl=!st.tbl;draw()});
    const te=$('sm-test');if(te)te.addEventListener('click',()=>{const a=c.readings[st.cmp[0]],b=c.readings[st.cmp[1]];
      if(window.SMCALC)window.SMCALC.set({na:a.n,nb:b.n,pa:+a.v.toFixed(2),pb:+b.v.toFixed(2),paired:a.n===b.n&&!!c.paired});
      const h=$('sm-h-calc');if(h&&h.scrollIntoView)h.scrollIntoView({block:'start'})});
  }
  draw();
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-same']=(window.TAB_RENDER['t-same']||[]).concat([draw]);
})();
