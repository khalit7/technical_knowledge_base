// ---- Tool map (t-map): 2023 vs 2026 animation, picker, lineage chart, API changes, import check ----
(function(){
  const {D,$,esc,byId,stTag,show,open,link,RM,onRender,ver}=window.TM;
  const tab=$('t-map');
  // ---------- before/after animation: the same ten jobs, Oct 2023 -> Oct 2026 ----------
  const N=D.ev.length+1,st={i:0,play:false,timer:0,vis:false,started:false};
  function occ(k){const o={},was={};D.slots.forEach(s=>{o[s[0]]={v:s[2],id:s[3]};});
    for(let j=0;j<k;j++){const e=D.ev[j];if(!(e[1] in was))was[e[1]]=D.slots.find(s=>s[0]===e[1])[2];o[e[1]]={v:e[2],id:e[3]};}return {o,was};}
  function draw(){const k=st.i,{o,was}=occ(k),cur=k>0?D.ev[k-1]:null;
    $('tm-as').max=N-1;$('tm-as').value=k;
    $('tm-acap').innerHTML=k===0?'<b>October 2023.</b> What a JAX user reached for, job by job. Press play.':
      '<b>'+esc(cur[0])+'</b> (change '+k+' of '+(N-1)+'): '+esc(cur[4])+(k===N-1?' <b>October 2026: this is the stack today.</b>':'');
    $('tm-aslots').innerHTML=D.slots.map(s=>{const x=o[s[0]],c=cur&&cur[1]===s[0];
      return '<div class="tm-slot'+(c?' chg':'')+(s[0] in was?' done':'')+'" data-tm-tool="'+(x.id||'')+'"><span class="k">'+esc(s[1])+'</span><span class="v">'+esc(x.v)+'</span><span class="was">'+(s[0] in was?esc(was[s[0]]):'')+'</span></div>'}).join('');
    $('tm-aseg').querySelectorAll('button').forEach(b=>b.classList.toggle('on',(b.dataset.m==='0'&&k===0)||(b.dataset.m==='1'&&k===N-1)));}
  const live=()=>st.vis&&!document.hidden&&tab.offsetParent!==null&&!tab.hidden;
  function tick(){st.timer=0;if(!st.play||!live())return;if(st.i>=N-1){setPlay(false);return}st.i++;draw();if(st.i>=N-1){setPlay(false);return}st.timer=setTimeout(tick,1700)}
  function kick(){if(st.play&&live()&&!st.timer)st.timer=setTimeout(tick,1700);else if(!live()&&st.timer){clearTimeout(st.timer);st.timer=0}}
  function setPlay(p){st.play=p;$('tm-ap').innerHTML=p?'&#10073;&#10073; Pause':'&#9654; Play';$('tm-ap').setAttribute('aria-label',p?'Pause':'Play');
    if(!p&&st.timer){clearTimeout(st.timer);st.timer=0}if(p&&st.i>=N-1){st.i=0;draw()}kick()}
  $('tm-ap').addEventListener('click',()=>setPlay(!st.play));
  $('tm-af').addEventListener('click',()=>{setPlay(false);st.i=Math.min(N-1,st.i+1);draw()});
  $('tm-ab').addEventListener('click',()=>{setPlay(false);st.i=Math.max(0,st.i-1);draw()});
  $('tm-as').addEventListener('input',e=>{setPlay(false);st.i=+e.target.value;draw()});
  $('tm-aseg').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;setPlay(false);st.i=b.dataset.m==='1'?N-1:0;draw()});
  $('tm-aslots').addEventListener('click',e=>{const s=e.target.closest('[data-tm-tool]');if(s&&s.dataset.tmTool)open(s.dataset.tmTool)});
  if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;
    if(st.vis&&!st.started&&live()){st.started=true;if(!RM){st.i=0;draw();setPlay(true)}}kick()},{threshold:.3}).observe($('tm-anim'))}else st.vis=true;
  document.addEventListener('visibilitychange',kick);
  draw();

  // ---------- picker ----------
  $('tm-pjob').innerHTML=D.pick.map(p=>'<option value="'+p.id+'">'+esc(p.label)+'</option>').join('');
  $('tm-phw').innerHTML=D.hw.map(h=>'<option value="'+h[0]+'">'+esc(h[1])+'</option>').join('');
  function chip(id,av){const t=byId[id];return '<button class="tm-chip'+(av?' av':'')+'" data-tm-tool="'+id+'">'+esc(t.name)+' '+stTag(t.status)+'<small>'+(av?esc(t.why):(t.m.ver?esc(t.m.ver)+' ('+t.m.verDate+')':esc(t.one.split(':')[0])))+'</small></button>'}
  function pick(){const p=D.pick.find(x=>x.id===$('tm-pjob').value),hw=$('tm-phw').value;
    const warn=p.stack.filter(id=>['deprecated','archived','preview','quiet'].indexOf(byId[id].status)>=0);
    $('tm-pout').innerHTML='<p class="small"><b>Stack, in the order you meet it</b></p><div class="tm-stack">'+p.stack.map(id=>chip(id,false)).join('')+'</div>'+
      '<p>'+esc(p.why)+'</p>'+(p.hw[hw]?'<div class="co"><div class="t">On '+esc(D.hw.find(h=>h[0]===hw)[1])+'</div>'+esc(p.hw[hw])+'</div>':'')+
      (warn.length?'<p class="small mute">Note: '+warn.map(id=>esc(byId[id].name)+' is '+byId[id].status).join('; ')+'; see its entry before relying on it.</p>':'')+
      (p.avoid.length?'<p class="small"><b>Steer away from</b></p><div class="tm-stack">'+p.avoid.map(id=>chip(id,true)).join('')+'</div>':'');}
  $('tm-pjob').addEventListener('change',pick);$('tm-phw').addEventListener('change',pick);
  $('tm-pout').addEventListener('click',e=>{const c=e.target.closest('[data-tm-tool]');if(c)open(c.dataset.tmTool)});
  pick();

  // ---------- lineage chart ----------
  const G=[['Network libraries',['haiku','objax','linen','nnx','penzai','treescope']],['LLM codebases',['t5x','paxml','easylm','maxtext','tunix','levanter','marin']],
    ['Serving on TPU',['jetstream','tpuinf','sglangjax']],['PyTorch on TPU',['torchxla','torchax','torchtpu']],['TPU cluster tools',['xpk','clustertk']]];
  const COL={active:'var(--good)',maintained:'var(--c1)',maintenance:'var(--c5)',quiet:'var(--dim)',deprecated:'var(--bad)',archived:'var(--ink)',moved:'var(--c6)',preview:'var(--c4)',example:'var(--dim)'};
  const LIN={};D.lin.forEach(l=>LIN[l.id]=l);
  const yr=s=>{const y=+s.slice(0,4);return s.length>=7?y+(+s.slice(5,7)-0.5)/12:y+0.5};
  const X0=2018.6,X1=2027.0;
  $('tm-lleg').innerHTML=['active','maintained','maintenance','quiet','moved','deprecated','archived','preview'].map(s=>'<span><svg width="14" height="10" style="display:inline-block;vertical-align:middle"><rect width="14" height="10" rx="2" fill="'+COL[s]+'"'+(s==='archived'?' fill-opacity=".35"':'')+'/></svg> '+s+'</span>').join('')+
    '<span><svg width="26" height="10" style="display:inline-block;vertical-align:middle"><line x1="1" y1="5" x2="25" y2="5" stroke="var(--ink)" stroke-width="1.4"/></svg> documented hand-over</span><span><svg width="26" height="10" style="display:inline-block;vertical-align:middle"><line x1="1" y1="5" x2="25" y2="5" stroke="var(--ink)" stroke-width="1.4" stroke-dasharray="4 3"/></svg> our reading</span>';
  let lsel=null;
  function lineage(){const el=$('tm-lplot');const W=Math.max(300,Math.min(900,el.clientWidth||((document.documentElement.clientWidth||900)-40)));
    const narrow=W<560,LW=narrow?6:128,RH=narrow?30:21,GH=22,PR=10,top=22;
    const sx=v=>LW+(v-X0)/(X1-X0)*(W-LW-PR);
    let y=top,b='',rowY={};const yrs=[];for(let k=2019;k<=2026;k++)yrs.push(k);
    yrs.forEach(k=>{const x=sx(k);b+='<text x="'+x+'" y="12" text-anchor="middle" fill="var(--mute)">'+(narrow&&k%2?'':k)+'</text>'});
    const rows=[];
    G.forEach(g=>{rows.push({g:g[0],y});y+=GH;g[1].forEach(id=>{rowY[id]=y;rows.push({id,y});y+=RH;});});
    const H=y+6;
    yrs.forEach(k=>{const x=sx(k);b+='<line x1="'+x+'" y1="16" x2="'+x+'" y2="'+H+'" stroke="var(--line)"/>'});
    const now=sx(yr(D.asof.slice(0,7)));b+='<line x1="'+now+'" y1="16" x2="'+now+'" y2="'+H+'" stroke="var(--acc)" stroke-dasharray="2 3"/>';
    rows.forEach(r=>{if(r.g){b+='<text x="2" y="'+(r.y+15)+'" font-weight="600" fill="var(--mute)">'+esc(r.g)+'</text>';return}
      const t=byId[r.id],l=LIN[r.id],x1=sx(yr(l.s)),x2=Math.max(x1+4,sx(yr(l.e))),bh=narrow?8:12,by=r.y+(narrow?RH-bh-3:(RH-bh)/2);
      const lab=esc(t.name.replace(/ \(.*\)$/,''));
      b+='<g data-c="'+r.id+'"'+(lsel===r.id?' class="on"':'')+' role="button" tabindex="0" aria-label="'+lab+', '+t.status+'"><rect x="0" y="'+r.y+'" width="'+W+'" height="'+RH+'" fill="transparent"/>'+
        '<rect class="bar" x="'+x1+'" y="'+by+'" width="'+(x2-x1)+'" height="'+bh+'" rx="3" fill="'+COL[t.status]+'"'+(t.status==='archived'?' fill-opacity=".35"':'')+(t.status==='preview'?' fill-opacity=".5" stroke="var(--c4)" stroke-dasharray="3 2"':'')+'/>'+
        (narrow?'<text x="'+Math.min(x1,W-150)+'" y="'+(r.y+11)+'">'+lab+' <tspan fill="var(--mute)">'+t.status+'</tspan></text>':'<text x="'+(LW-6)+'" y="'+(r.y+RH/2+4)+'" text-anchor="end">'+lab+'</text>')+'</g>';});
    D.lineage.forEach(e=>{if(!(e[0] in rowY)||!(e[1] in rowY))return;const x=sx(yr(e[3])),bo=narrow?RH-7:RH/2;
      const y1=rowY[e[0]]+bo,y2=rowY[e[1]]+bo,d=y2>y1?-3:3;
      b+='<line x1="'+x+'" y1="'+y1+'" x2="'+x+'" y2="'+(y2+d*2)+'" stroke="var(--ink)" stroke-width="1.3"'+(e[2]==='practice'?' stroke-dasharray="4 3"':'')+' marker-end="url(#tm-arr)"><title>'+esc(e[4])+' ('+e[3]+')</title></line>'+
        '<circle cx="'+x+'" cy="'+y1+'" r="2.6" fill="var(--ink)"/>';});
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Lineage of JAX tools 2019 to 2026"><defs><marker id="tm-arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L8,4L0,8z" fill="var(--ink)"/></marker></defs>'+b+'</svg>';}
  function ldet(id){lsel=id;lineage();const l=LIN[id],t=byId[id];const ed=D.lineage.filter(e=>e[0]===id||e[1]===id);
    const d=$('tm-ldet');show(d,id);d.insertAdjacentHTML('afterbegin','<p class="small"><b>On the chart:</b> starts '+esc(l.s)+' ('+esc(l.sn)+'), drawn to '+esc(l.e)+'.'+
      (ed.length?' Hand-overs: '+ed.map(e=>esc(byId[e[0]].name)+' to '+esc(byId[e[1]].name)+' ('+e[3]+', '+(e[2]==='doc'?'documented':'our reading')+': '+esc(e[4])+', '+link('source',e[5])+')').join('; ')+'.':'')+'</p>');}
  $('tm-lplot').addEventListener('click',e=>{const g=e.target.closest('g[data-c]');if(g)ldet(g.dataset.c)});
  $('tm-lplot').addEventListener('keydown',e=>{const g=e.target.closest('g[data-c]');if(g&&(e.key==='Enter'||e.key===' ')){e.preventDefault();ldet(g.dataset.c)}});

  // ---------- API changes ----------
  $('tm-atab').innerHTML='<thead><tr><th class="mh">Old</th><th>Use instead</th><th>What happened</th><th>JAX</th><th>Date</th><th>Note</th></tr></thead><tbody>'+
    D.api.map(a=>'<tr><td class="mh"><code>'+esc(a[0])+'</code></td><td><code>'+esc(a[1])+'</code></td><td>'+esc(a[2])+'</td><td class="n">'+esc(a[3])+'</td><td class="n">'+esc(a[4])+'</td><td>'+esc(a[5])+'</td></tr>').join('')+'</tbody>';

  // ---------- import check ----------
  const IM=D.importsMeta;const im=D.tools.filter(t=>t.m.imp);
  if(!IM||!im.length){$('tm-imeta').innerHTML='<span class="mute">Import check pending: the shared environment was not ready when this tab was built.</span>';$('tm-itab').parentNode.hidden=true;}
  else{$('tm-imeta').innerHTML=esc(IM.note);
    $('tm-itab').innerHTML='<thead><tr><th class="mh">Tool</th><th>Module</th><th>Installed</th><th>Latest on PyPI</th><th>Result</th></tr></thead><tbody>'+
      im.map(t=>{const i=t.m.imp;return '<tr data-k="'+t.id+'"><td class="mh">'+esc(t.name)+'</td><td><code>'+esc(i.mod)+'</code></td><td class="n">'+esc(i.ver||'')+'</td><td class="n">'+ver(t.m)+'</td><td>'+(i.ok?'<span style="color:var(--good)">imports</span>'+(i.note?' <span class="mute">'+esc(i.note)+'</span>':''):'<span class="ill">'+esc(i.err||'failed')+'</span>')+'</td></tr>'}).join('')+'</tbody>';
    $('tm-itab').addEventListener('click',e=>{const r=e.target.closest('tr[data-k]');if(r)open(r.dataset.k)});
    if(IM.api){const A=IM.api;const rows=Object.keys(A).filter(k=>k!=='devices'&&k!=='error');
      $('tm-iapi').innerHTML='<p class="small"><b>The API changes above, probed in the installed jax</b> (present means the name still resolves):</p><div class="tm-tw"><table class="tm-t"><thead><tr><th class="mh">Name</th><th>In the installed jax</th></tr></thead><tbody>'+
        rows.map(k=>'<tr><td class="mh"><code>'+esc(k)+'</code></td><td>'+(A[k]===true?'present':A[k]===false?'gone':esc(A[k]))+'</td></tr>').join('')+'</tbody></table></div>';}}

  // ---------- render hooks ----------
  let rt=0;onRender(()=>{lineage();draw();kick()});
  addEventListener('resize',()=>{if(tab.hidden||tab.offsetParent===null)return;clearTimeout(rt);rt=setTimeout(lineage,80)});
  lineage();
})();
