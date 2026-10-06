// ---- Reading section 3: Graphiti's pipeline table and the edge timeline (session by session, two writers) ----
(function(){
  const F=FM.F,esc=FM.esc;if(!document.getElementById('fmem-grcard'))return;
  const DESC={'extract_nodes.extract_message':'Find the entities the episode mentions (people, tools, places).',
    'dedupe_nodes.nodes':'Match the new entities against existing ones: is this "Sam" the node already in the graph?',
    'extract_edges.edge':'Write the episode\'s facts as relations between those entities, one sentence each.',
    'extract_edges.extract_timestamps':'Date a fact: valid_at and invalid_at from the text, relative to the episode\'s reference time.',
    'dedupe_edges.resolve_edge':'For one new fact: which existing facts it duplicates, and which it contradicts (those get closed).',
    'extract_nodes.extract_summaries_batch':'Rewrite the summaries of the entities this episode touched.'};
  const g=F.GR.haiku,tb=document.getElementById('fmem-grsteps');
  if(g&&tb){const order=['extract_nodes.extract_message','dedupe_nodes.nodes','extract_edges.edge','extract_edges.extract_timestamps','dedupe_edges.resolve_edge','extract_nodes.extract_summaries_batch'];
    const m=Object.fromEntries(g.prompts);const rest=g.prompts.map(p=>p[0]).filter(p=>!order.includes(p));
    tb.innerHTML='<tr><th>Prompt</th><th>What it asks the model</th><th class="num">Calls for 12 episodes (Haiku)</th></tr>'+order.concat(rest).filter(p=>m[p]).map(p=>'<tr><td><code>'+esc(p)+'</code></td><td>'+(DESC[p]||'')+'</td><td class="num">'+m[p]+'</td></tr>').join('')+
      '<tr><td><b>Total</b></td><td>Two calls is the minimum per episode (entities, then facts); every new fact that resembles an old one costs another call.</td><td class="num"><b>'+g.prompts.reduce((a,p)=>a+p[1],0)+'</b></td></tr>'}
  const el=document.getElementById('fmem-grplot'),cap=document.getElementById('fmem-grcap');
  let w='haiku';
  const T0=Date.parse('2026-08-29'),T1=Date.parse('2026-10-17'),NOW=Date.parse('2026-10-06');
  const day=s=>Date.parse(s);
  function draw(i){const G=F.GR[w];if(G&&G.stopped&&i>=G.stopped){i=G.stopped-1}if(!G){el.innerHTML='<p class="mute small">The local-model run did not finish; see the notes below.</p>';cap.textContent='';return}
    const W=RD.width(el),pl=6,pr=8,rh=24,top=26;
    const vis=G.e.map((e,j)=>Object.assign({j},e)).filter(e=>e.s0<=i).sort((a,b)=>a.s0-b.s0||((a.va||'z')<(b.va||'z')?-1:1));
    const H=top+rh*Math.max(1,vis.length)+8,x=t=>pl+(t-T0)/(T1-T0)*(W-pl-pr);
    let s='';
    ['2026-09-01','2026-09-15','2026-10-01','2026-10-15'].forEach(d=>{s+='<line x1="'+x(day(d))+'" x2="'+x(day(d))+'" y1="14" y2="'+(H-4)+'" stroke="var(--line)"/>'+RD.t(x(day(d)),10,d.slice(5),{a:'middle',fs:10,fill:'var(--mute)'})});
    const sd=day(F.S[i].d);s+='<line x1="'+x(sd)+'" x2="'+x(sd)+'" y1="14" y2="'+(H-4)+'" stroke="var(--acc)" stroke-dasharray="3 3"/>';
    const maxc=Math.max(18,Math.floor((W-12)/6.1));
    vis.forEach((e,r)=>{const y=top+r*rh,closed=e.sc!==null&&e.sc<=i,nw=e.s0===i;
      const a=e.va?day(e.va):day(F.S[e.s0].d),b=closed?day(e.ia):NOW,x1=x(a),x2=Math.max(x1+3,x(Math.max(a,b)));
      const col=closed?(e.v==='wrong'?'var(--bad)':'var(--mute)'):(nw?'var(--good)':'var(--acc)');
      const lab=(e.v==='wrong'&&closed?'✖ ':'')+(e.v==='missed'?'(never closed) ':'')+e.f;
      s+='<g data-j="'+e.j+'" style="cursor:pointer"><rect x="0" y="'+(y-2)+'" width="'+W+'" height="'+rh+'" fill="transparent"/>'+
        RD.t(pl,y+8,esc(lab.length>maxc?lab.slice(0,maxc-1)+'…':lab),{fs:10.5,fill:closed?'var(--mute)':null})+
        '<rect x="'+x1+'" y="'+(y+12)+'" width="'+(x2-x1)+'" height="6" rx="2" fill="'+col+'"'+(e.va?'':' fill-opacity=".45"')+'/>'+(closed?'<line x1="'+x2+'" x2="'+x2+'" y1="'+(y+9)+'" y2="'+(y+21)+'" stroke="'+col+'" stroke-width="2"/>':'')+'</g>'});
    el.innerHTML=RD.svg(W,H,s,'Graphiti edges for Sam as validity bars, after session '+(i+1));
    const nw=vis.filter(e=>e.s0===i).length,cl=G.e.filter(e=>e.sc===i);
    cap.innerHTML='<div class="t">After session '+(i+1)+' ('+F.S[i].d+'): '+vis.length+' edges</div><p>'+nw+' new (green)'+(cl.length?'; closed now: '+cl.map(e=>'"'+esc(e.f.slice(0,70))+'"'+(e.v==='wrong'?' (wrongly)':'')).join('; '):'; nothing closed')+(G.err[i]?'. <b>This episode failed</b>: '+esc(G.err[i].slice(0,160)):'')+'. Faded bars have no valid_at (the model could not date the fact); the dashed line is the session date.</p>';
  }
  el.addEventListener('click',e=>{const gg=e.target.closest('g[data-j]');if(!gg)return;const x=F.GR[w].e[+gg.dataset.j];
    cap.innerHTML='<div class="t">'+esc(x.f)+'</div><p>valid_at '+(x.va||'none')+', invalid_at '+(x.ia||'none')+'; first stored after session '+(x.s0+1)+(x.sc!==null?', closed by session '+(x.sc+1):'')+'. '+(x.v==='wrong'?'<b>Judged wrongly closed</b>: nothing Sam said makes this stop being true then.':x.v==='right'?'Closing judged correct.':x.v==='missed'?'<b>Should have been closed</b> (it changed later) but never was.':'')+'</p>'});
  const A=RD.anim({card:'fmem-grcard',ctl:'fmem-grctl',n:F.S.length,ms:1700,draw,label:'Session',start:F.S.length-1});
  RD.seg(document.getElementById('fmem-grw'),m=>{w=m;A.reset(F.S.length);A.go(F.S.length-1)});
  RD.onResize(()=>A.redraw());
  const f=document.getElementById('fmem-grfind'),V=F.V;
  f.innerHTML='<div class="co key"><div class="t">What the graph did with Sam\'s twelve sessions</div><p>With Haiku writing: '+V['gr.haiku.edges']+' edges from '+V['gr.haiku.calls']+' model calls, '+V['gr.haiku.closed']+' closed, of which this page judges '+V['gr.haiku.wrong']+' wrongly closed (a past measurement "contradicted" by a later one; a fallback "ended" because a new fact mentioned it), and '+V['gr.haiku.nodated']+' edges without a valid_at, which the closing rule can never close. Several facts never became edges at all: the $200 budget and the $143 spent, the four engineers, the original test command, the Friday CSV report, the outline. None of those reached an entity summary either; only the raw episode text keeps them, and edge search does not return episodes. The NFC fix did reach two entity summaries, which edge search also does not return.'+
    (F.GR.local?' With the local 4B model writing, the run was stopped after '+V['gr.local.tried']+' episodes: '+V['gr.local.edges']+' edges from '+V['gr.local.calls']+' calls, and '+V['gr.local.lost']+' of the '+V['gr.local.tried']+' episodes lost (section 6 shows why every later one would fail too); the timeline for that writer ends there.':'')+'</p></div>';
})();
