// ---- Reading: the fast-path build stepper (section 5), the hierarchy explorer and the global map-reduce stepper (section 6); moved from the old Graph build lab ----
(function(){
  const D=window.GR,B=D.build,E=GRL.esc,$=id=>document.getElementById(id);
  if(!$('gb-card'))return;
  let src='nlp',qi=0;
  const Q=()=>(src==='llm'&&B.llm?B.llm.questions:B.questions)[qi];
  $('gb-q').innerHTML=B.questions.map((q,i)=>'<option value="'+i+'">'+(i+1)+'. '+E(q.q.length>60?q.q.slice(0,58)+'...':q.q)+'</option>').join('');
  const llmBtn=$('gb-src').querySelector('[data-m="llm"]');
  if(!B.llm){llmBtn.disabled=true;llmBtn.title='pending: no LLM extraction of the subset yet';llmBtn.textContent='LLM (pending)'}
  else llmBtn.textContent=B.llm.source==='agt'?'LLM (Qwen3-1.7B, root agent runs\' prompt)':'LLM (Qwen3-1.7B, graphrag prompt)';
  const CAP=[
    'The ten paragraphs graphrag sees as ten text units: the question\'s two gold paragraphs (orange edge) and eight distractors that share its words (HotpotQA picked them by bigram TF-IDF).',
    'Extract: every text unit becomes a list of names. With the noun-phrase extractor this costs no model call; with an LLM it is one extraction call plus one gleaning call per unit.',
    'Merge: identical upper-cased names become one node. Highlighted: names found in two or more of these ten paragraphs, the only ones that can connect paragraphs.',
    'Prune (graphrag defaults over the whole 394-paragraph subset): names in fewer than 2 text units, the single highest-degree node and the weakest 40% of edges go. Faded names did not survive.',
    'Link: surviving names that occur in the same text unit get an edge, weighted by PMI. Only edges among this question\'s surviving names are drawn.',
    'Cluster: hierarchical Leiden (max cluster size 10, seed 0xDEADBEEF) assigns every node a level-0 community; colours are communities. Each would get its own report.',
    'Connect: do the two gold paragraphs share a surviving node? If they do, a graph walk from one reaches the other in two steps; if not, the graph cannot help this question.'];
  const ccol=c=>c==null?'var(--dim)':GRL.COL[c%6];
  function draw(i){const q=Q();if(!q){$('gb-paras').innerHTML='';$('gb-graph').innerHTML='';return}
    const shared=new Set(q.nodes.filter(n=>n.in.length>1).map(n=>n.t)),kept=new Set(q.nodes.filter(n=>n.s).map(n=>n.t)),gold=new Set(q.shared);
    $('gb-cap').textContent=CAP[i]+(i===6?(q.shared.length?' Here: yes, through '+q.shared.slice(0,4).join(', ')+'.':' Here: no shared surviving node.'):'');
    $('gb-paras').innerHTML=q.paras.map((p,j)=>'<div class="gb-p'+(q.gold.includes(j)?' gold':'')+'"><div class="tt">'+E(p.title)+'</div><div class="n">'+p.words+' words'+(i>=1?', '+p.phr.length+' names':'')+'</div>'+
      (i>=1?'<div class="ch">'+p.phr.map(x=>{const c=(i>=2&&shared.has(x)?' hot':'')+(i>=3&&!kept.has(x)?' dim':'');return '<span class="gr-chip'+c+'"'+(i>=6&&gold.has(x)?' style="outline:2px solid var(--c2)"':'')+'>'+E(x)+'</span>'}).join('')+'</div>':'')+'</div>').join('');
    const nk=q.nodes.filter(n=>n.s),com=new Set(nk.map(n=>n.c0).filter(c=>c!=null));
    $('gb-ctr').innerHTML='<span>names extracted <b>'+GRL.fmt(i>=1?q.n_phr_total:0)+'</b></span><span>distinct nodes <b>'+(i>=2?GRL.fmt(q.n_distinct):'&ndash;')+'</b></span><span>in 2+ paragraphs here <b>'+(i>=2?shared.size:'&ndash;')+'</b></span><span>surviving pruning <b>'+(i>=3?q.n_keep:'&ndash;')+'</b></span><span>edges <b>'+(i>=4?q.edges.length:'&ndash;')+'</b></span><span>communities <b>'+(i>=5?com.size:'&ndash;')+'</b></span><span>gold pair linked <b>'+(i>=6?(q.shared.length?'yes':'no'):'&ndash;')+'</b></span>';
    const el=$('gb-graph');
    if(i<3||!nk.length){el.innerHTML='';$('gb-leg').innerHTML='';return}
    const W=RD.width(el),H=Math.max(260,Math.min(420,W*0.6)),P=34;
    const xs=nk.map(n=>n.xy?n.xy[0]:0),ys=nk.map(n=>n.xy?n.xy[1]:0),mx=Math.min(...xs),Mx=Math.max(...xs),my=Math.min(...ys),My=Math.max(...ys);
    const X=v=>P+(W-2*P)*(Mx>mx?(v-mx)/(Mx-mx):0.5),Y=v=>P/2+(H-P)*(My>my?(v-my)/(My-my):0.5);
    let s='';
    if(i>=4)q.edges.forEach(([a,b])=>{const u=nk[a],v=nk[b];if(u.xy&&v.xy)s+='<line x1="'+X(u.xy[0]).toFixed(1)+'" y1="'+Y(u.xy[1]).toFixed(1)+'" x2="'+X(v.xy[0]).toFixed(1)+'" y2="'+Y(v.xy[1]).toFixed(1)+'" stroke="var(--line)" stroke-width="1"/>'});
    const deg={};q.edges.forEach(([a,b])=>{deg[a]=(deg[a]||0)+1;deg[b]=(deg[b]||0)+1});
    const lab=new Set(nk.map((n,j)=>j).sort((a,b)=>(deg[b]||0)-(deg[a]||0)).slice(0,W<500?6:12));
    nk.forEach((n,j)=>{if(!n.xy)return;const g=i>=6&&gold.has(n.t),x=X(n.xy[0]),y=Y(n.xy[1]);
      s+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+(g?7:4.5)+'" fill="'+(i>=5?ccol(n.c0):'var(--c1)')+'"'+(g?' stroke="var(--ink)" stroke-width="2"':'')+'><title>'+E(n.t)+(n.c0!=null?', community '+n.c0:'')+', in '+n.in.length+' of these paragraphs</title></circle>';
      if(lab.has(j)||g){const t=n.t.length>18?n.t.slice(0,17)+'.':n.t;s+=RD.t(Math.min(W-4,Math.max(4,x+(x>W/2?-7:7))),y-6,E(t),{a:x>W/2?'end':'start',fs:10.5,fill:'var(--mute)'})}});
    el.innerHTML=RD.svg(W,H,s,'surviving names and their co-occurrence edges');
    $('gb-leg').innerHTML=i>=5?[...com].sort((a,b)=>a-b).map(c=>'<span><i style="background:'+ccol(c)+'"></i>community '+c+'</span>').join(''):'';
  }
  const A=RD.anim({card:'gb-card',ctl:'gb-ctl',n:7,draw,ms:2200,label:'Graph build step'});
  $('gb-q').addEventListener('change',e=>{qi=+e.target.value;A.reset(7)});
  RD.seg($('gb-src'),m=>{if(m==='llm'&&!B.llm)return;src=m;A.reset(7)});
  // hierarchy explorer
  let lvl='0',sel=null;
  function comm(){const H=B.hierarchy,list=(H[lvl]||[]).filter(c=>lvl==='0'||sel==null||c.parent===sel||(lvl==='2'&&(H['1']||[]).some(p=>p.parent===sel&&p.id===c.parent)));
    $('gb-comm').innerHTML=(lvl!=='0'&&sel!=null?'<div class="small mute" style="grid-column:1/-1">Children of level-0 community '+sel+' ('+list.length+'). <a href="#" id="gb-all">show all</a></div>':'')+
      list.sort((a,b)=>b.n-a.n).map(c=>'<div class="gb-c'+(lvl==='0'&&c.id===sel?' sel':'')+'" data-id="'+c.id+'"><div class="h">community '+c.id+' &middot; '+c.n+' nodes &middot; '+c.paras+' paragraphs</div>'+c.top.map(t=>'<span class="gr-chip">'+E(t)+'</span>').join('')+'</div>').join('');
    const a=$('gb-all');if(a)a.addEventListener('click',e=>{e.preventDefault();sel=null;comm()})}
  $('gb-comm').addEventListener('click',e=>{const c=e.target.closest('.gb-c');if(!c||lvl!=='0')return;sel=+c.dataset.id;lvl='1';
    $('gb-lvl').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.m==='1'));comm()});
  RD.seg($('gb-lvl'),m=>{lvl=m;comm()});comm();
  // global search stepper
  (function(){const el=$('gb-glob'),g=D.global_4b||D.global_1_7b,gm=D.global_4b?'Qwen3-4B':'Qwen3-1.7B';
    if(!g){el.innerHTML='<div class="gr-pbox" id="gb-glob-p"></div><p class="small">Until it runs: these '+(B.hierarchy['0']||[]).length+' level-0 communities are what the reports would summarise; a global question is mapped over each report (a list of points scored 0 to 100), the points with a score above 0 are sorted and packed into one reduce call, and the answer is set beside a plain top-10 retrieval.</p>';
      GRL.pend('gb-glob-p','Community reports and global map-reduce with Qwen3-4B on this subset (graphrag 3.3.0 prompts).','s_global.py run 4b','25 min');return}
    el.innerHTML='<div class="card" id="gg-card"><label class="small">Question <select id="gg-q">'+g.answers.map((a,i)=>'<option value="'+i+'">'+E(a.q)+'</option>').join('')+'</select></label><div class="gr-cap" id="gg-cap"></div><div class="gr-ctr" id="gg-ctr"></div><div class="an-ctl" id="gg-ctl"></div><div id="gg-body"></div></div>';
    let gi=0;const n=()=>g.reports.length+2;
    function gd(i){const a=g.answers[gi],R=g.reports;let calls=0,tin=0;
      if(i===0){$('gg-cap').textContent='The question goes to every community report, one map call each (graphrag batches several reports per call; here one report per call).';$('gg-body').innerHTML='<p class="small">'+R.length+' reports, '+gm+'.</p>'}
      else if(i<=R.length){const m=a.map[i-1]||[i-1,0,0,''];const r=R[m[0]];$('gg-cap').textContent='Map, report '+i+' of '+R.length+': "'+(r.title||'community '+r.cid)+'". Best point score '+m[1]+(m[1]?'; '+m[2]+' point(s) kept.':'; nothing kept (score 0).');
        $('gg-body').innerHTML='<div class="small mute">report summary</div><p class="small">'+E(r.summary).slice(0,600)+'</p>'+(m[3]?'<div class="small mute">a kept point</div><p class="small">'+E(m[3])+'</p>':'')}
      else{$('gg-cap').textContent='Reduce: the kept points, highest score first, go into one call that writes the answer. Beside it, one call over the dense top 10 paragraphs.';
        $('gg-body').innerHTML='<div class="gb-ans"><div><b>Global map-reduce</b> ('+a.cost_global.calls+' calls, '+GRL.fmt(a.cost_global.in)+' prompt tokens)\n\n'+E(a.global)+'</div><div><b>Dense top 10</b> (1 call, '+GRL.fmt(a.cost_naive.in)+' prompt tokens)\n\n'+E(a.naive)+'</div></div>'}
      const k=Math.min(i,R.length);$('gg-ctr').innerHTML='<span>map calls <b>'+k+'</b> of '+R.length+'</span><span>points kept so far <b>'+(a.map||[]).slice(0,k).reduce((s,m)=>s+m[2],0)+'</b></span><span>paragraphs behind the kept points <b>'+(i>R.length?a.paragraphs_behind_points:'&ndash;')+'</b></span>'}
    const GA=RD.anim({card:'gg-card',ctl:'gg-ctl',n:n(),draw:gd,ms:1500,label:'Global search step'});
    $('gg-q').addEventListener('change',e=>{gi=+e.target.value;GA.reset(n())});})();
  RD.onRender(()=>A.redraw());RD.onResize(()=>A.redraw());
})();
