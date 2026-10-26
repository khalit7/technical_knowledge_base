// ---- Run the harness tab: one graph stepped round by round, then the sweep over many graphs ----
(function(){if(!$('rn')||!window.GR)return;
  const st={fam:'local',N:10,k:2,seed:13,round:0,g:null,b:null,r:null};
  function rebuild(){st.g=GR.graph(st.N,st.fam,st.seed);st.b=GR.bfs(st.g);st.r=GR.reader(st.g,st.k);st.round=0;draw()}
  function draw(){const host=$('rnSvg'),w=host.clientWidth;if(!w)return;const {g,b,r}=st,R=b.rounds.length,done=st.round>=R;
    host.innerHTML=drawGraph(w,g,{round:st.round,bfs:b,seen:r.seen},'rn');
    $('rnNv').textContent=st.N;$('rnKv').textContent=st.k;$('rnHv').textContent=r.horizon;$('rnSv').textContent=st.seed;
    $('rnStepT').textContent='round '+st.round+' of '+R;
    const rd=st.round>0?b.rounds[st.round-1]:null;
    $('rnCap').innerHTML=st.round===0?'Start: the frontier is {<i>s</i>}. Press "Next round": the harness queries every (frontier vertex, unvisited vertex) pair.':
      'Round '+st.round+': '+rd.queries+' lookups from frontier {'+rd.frontier.join(', ')+'}; '+(rd.found.length?'new vertices {'+rd.found.join(', ')+'} (blue number = round reached); highlighted arrows are the edges that answered "yes".':'nothing new, so the frontier is empty and the harness stops.')+(done?' <b>Finished.</b>':'');
    const used=st.round>0?b.rounds[st.round-1].calls:0,vis=st.round>0?b.rounds[st.round-1].visited.reduce((a,x)=>a+x,0):1;
    $('rnCnt').innerHTML=stat('harness rounds so far',st.round,'its serial depth')+stat('lookups so far',fmt(used),'bound N² = '+st.N*st.N)+stat('visited',vis+' of '+st.N,'state kept outside: 3N = '+3*st.N+' bits')+
      stat('reader layers',st.k,'gates about k·N³ = '+fmt(r.gates))+stat('distance s to t',b.reach?b.dist+' hops':'unreachable','the truth');
    const tr=b.reach,ry=r.yes;
    $('rnVerd').innerHTML='<span class="ct">Harness</span>: '+(done?(tr?'<span class="yes">reachable</span> (right)':'<span class="yes">not reachable</span> (right)'):'still searching')+
      ' · <span class="cs">Reader with '+st.k+' layers</span> ('+r.horizon+' hops): says '+(ry?'"reachable"':'"not reachable"')+', '+(ry===tr?'<span class="yes">right</span>':'<span class="no">wrong</span>')+(!ry&&tr?': <i>t</i> is '+b.dist+' hops away, beyond its horizon; it would need '+Math.ceil(Math.log2(b.dist))+' layers.':'.');
  }
  segBind('rnFam',m=>{st.fam=m;rebuild()});$('rnFam').querySelectorAll('button').forEach(x=>x.addEventListener('click',()=>$('rnFam').querySelectorAll('button').forEach(y=>y.setAttribute('aria-pressed',y.classList.contains('on')?'true':'false'))));
  $('rnN').addEventListener('input',e=>{st.N=+e.target.value;rebuild()});
  $('rnK').addEventListener('input',e=>{st.k=+e.target.value;st.r=GR.reader(st.g,st.k);draw()});
  $('rnNew').addEventListener('click',()=>{st.seed++;rebuild()});
  $('rnStep').addEventListener('click',()=>{st.round=Math.min(st.b.rounds.length,st.round+1);draw()});
  $('rnBack').addEventListener('click',()=>{st.round=Math.max(0,st.round-1);draw()});
  $('rnEnd').addEventListener('click',()=>{st.round=st.b.rounds.length;draw()});
  $('rnReset').addEventListener('click',()=>{st.round=0;draw()});
  rebuild();onTab('t-run',()=>{fit($('rnSvg'),draw);fit($('swSvg'),drawSweep);fit($('swCost'),drawCost)});

  // ---- the sweep, computed live; window.SWEEP holds the node run for the check ----
  const SW=window.SWEEP,Ns=SW.Ns,Ks=SW.Ks,live={};let fam='local';
  const get=f=>live[f]||(live[f]=GR.sweep(f,Ns,Ks,SW.G));
  window.RUN_SWEEP=get;
  const KC=['var(--c2)','var(--c5)','var(--c3)','var(--c6)','var(--c1)','var(--c4)','var(--mute)','var(--ink)'];
  function drawSweep(w){const d=get(fam),W=w,H=250,pl=40,pr=14,pt=10,pb=34;
    const f=linFrame({W,H,pl,pr,pt,pb,x:[0,Ns.length-1],y:[0.4,1],xt:Ns.map((_,i)=>i),fx:i=>String(Ns[i]),yt:[0.4,0.5,0.6,0.7,0.8,0.9,1],fy:v=>Math.round(v*100)+'%',xl:'vertices N',yl:'reader right'});
    let s=f.s;const ends=[];
    Ks.forEach((k,ki)=>{const pts=d.acc[k].map((v,i)=>[i,v]);s+=lineS(pts,f.X,f.Y,KC[ki],{sw:2});pts.forEach(p=>{s+=dotS(f.X(p[0]),f.Y(p[1]),2.6,KC[ki],{t:'k = '+k+', N = '+Ns[p[0]]+': '+(p[1]*100).toFixed(1)+'%'})});
      ends.push({y:f.Y(d.acc[k][Ns.length-1]),n:'k='+k,c:KC[ki],how:'reader with '+k+' layers ('+2**k+' hops)'})});
    s+=ln2(pl,f.Y(1),W-pr,f.Y(1),'var(--c1)',{sw:1.2,da:'5 3'});
    const lg=legendW(Ks.map((k,ki)=>['k='+k+' ('+2**k+' hops)',KC[ki],'l']).concat([['harness','var(--c1)','da']]),pl,H+12,W-pl);
    $('swSvg').innerHTML=svgW(W,H+lg.h+8,s+lg.s,'reader accuracy against N for each depth k');
    $('swTtl').innerHTML=fam==='local'?'Long paths: every fixed <i>k</i> collapses to "always no" (about 50%) once <i>N</i> outgrows 2<sup><i>k</i></sup>':'Random graphs: paths stay short, so 5 layers answer every graph up to <i>N</i> = 256';
    $('swCap').innerHTML='Share of 200 graphs answered right by a reader with <i>k</i> layers (one line per <i>k</i>; hover a point). The harness is right on all of them (dashed line at 100%). '+
      (fam==='local'?'Smallest <i>k</i> that gets every graph right: '+Ns.map((N,i)=>{const k=Ks.find(k=>d.acc[k][i]===1);return 'N = '+N+': '+(k||'more than '+Ks[Ks.length-1])}).join(', ')+'. One more layer per doubling of <i>N</i>: depth grows like log₂ <i>N</i>.':
       'Mean distance of reachable targets: '+d.dist.map((v,i)=>'N = '+Ns[i]+': '+v.toFixed(1)).join(', ')+' hops. The worst case, not the typical case, is what defeats a fixed depth.')}
  function drawCost(w){const d=get(fam),rows=Ns.map((N,i)=>({n:'N = '+N,v:d.rounds[i]}));
    const cats=Ns.map(N=>'N = '+N);
    $('swCost').innerHTML=groupH(w,cats,[{n:'mean rounds (serial depth)',c:'var(--c1)',v:d.rounds},{n:'mean lookups ÷ 100',c:'var(--c6)',v:d.calls.map(v=>v/100)}],{max:Math.max(...d.rounds,...d.calls.map(v=>v/100))*1.1,fmt:v=>v.toFixed(1),label:'harness rounds and lookups'})+
      '<p class="small mute">Lookups per graph average '+d.calls.map((v,i)=>fmt(Math.round(v))+' at N = '+Ns[i]).join(', ')+', always under N²; rounds track the distance to the farthest reachable vertex.</p>'}
  segBind('swFam',m=>{fam=m;$('swFam').querySelectorAll('button').forEach(y=>y.setAttribute('aria-pressed',y.classList.contains('on')?'true':'false'));refit($('swSvg'));refit($('swCost'))});
})();
