// ---- Reading tab: static and stepped figures added in the 2026-10-24 rebuild (prefix gr) ----
// Every number drawn here is either read from window.GR (the page's recorded data) or a published constant
// written next to its source in the caption; toys are labelled illustrative on the page.
(function(){
  const D=window.GR,$=id=>document.getElementById(id),E=RD.esc,F=GRL.fmt;
  const T=(x,y,s,o)=>{o=o||{};return '<text x="'+(+x).toFixed(1)+'" y="'+(+y).toFixed(1)+'" font-size="'+(o.fs||11.5)+'" fill="'+(o.fill||'var(--ink)')+'"'+(o.a?' text-anchor="'+o.a+'"':'')+(o.w?' font-weight="'+o.w+'"':'')+'>'+s+'</text>'};
  const R=(x,y,w,h,o)=>{o=o||{};return '<rect x="'+(+x).toFixed(1)+'" y="'+(+y).toFixed(1)+'" width="'+Math.max(0,w).toFixed(1)+'" height="'+h+'" rx="'+(o.rx==null?3:o.rx)+'" fill="'+(o.fill||'var(--soft)')+'" stroke="'+(o.stroke||'none')+'"'+(o.sw?' stroke-width="'+o.sw+'"':'')+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+(o.op!=null?' fill-opacity="'+o.op+'"':'')+'/>'};
  const L=(x1,y1,x2,y2,o)=>{o=o||{};return '<line x1="'+(+x1).toFixed(1)+'" y1="'+(+y1).toFixed(1)+'" x2="'+(+x2).toFixed(1)+'" y2="'+(+y2).toFixed(1)+'" stroke="'+(o.stroke||'var(--mute)')+'" stroke-width="'+(o.sw||1.3)+'"'+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+(o.m?' marker-end="url(#gr-ar)"':'')+'/>'};
  // word wrap for SVG labels (approximate glyph width)
  const wrap=(s,maxw,fs)=>{const cw=(fs||11.5)*0.56,n=Math.max(4,Math.floor(maxw/cw)),out=[];let cur='';
    s.split(' ').forEach(w=>{if((cur+' '+w).trim().length>n&&cur){out.push(cur);cur=w}else cur=(cur+' '+w).trim()});if(cur)out.push(cur);return out};
  const draws=[];const reg=f=>{draws.push(f)};

  // ---- hero: four questions, four structures ----
  (function(){const el=$('gr-hero');if(!el)return;
    const G={chunks:'<svg width="120" height="80" viewBox="0 0 120 80" role="img" aria-label="a ranked list of chunks">'+[0,1,2,3].map(i=>R(20,8+i*17,80-i*12,12,{fill:i<2?'var(--mute)':'var(--soft)',stroke:'var(--line)'})).join('')+'</svg>',
      graph:'<svg width="120" height="80" viewBox="0 0 120 80" role="img" aria-label="paragraph A, a shared entity node and paragraph B">'+L(30,40,58,40,{stroke:'var(--acc)',sw:2})+L(62,40,90,40,{stroke:'var(--acc)',sw:2})+R(6,28,26,24,{fill:'var(--soft)',stroke:'var(--line)'})+T(19,44,'A',{a:'middle',fs:12})+'<circle cx="60" cy="40" r="9" fill="var(--acc)"/>'+R(88,28,26,24,{fill:'var(--soft)',stroke:'var(--line)'})+T(101,44,'B',{a:'middle',fs:12})+T(60,70,'shared entity',{a:'middle',fs:11,fill:'var(--mute)'})+'</svg>',
      comm:'<svg width="120" height="80" viewBox="0 0 120 80" role="img" aria-label="three clusters of nodes, each summarised">'+[[28,30,'var(--c1)'],[78,24,'var(--c3)'],[58,58,'var(--c5)']].map(([x,y,c])=>[[0,0],[9,5],[-8,6],[3,-9],[-5,-6]].map(([dx,dy])=>'<circle cx="'+(x+dx)+'" cy="'+(y+dy)+'" r="3.6" fill="'+c+'"/>').join('')+'<circle cx="'+x+'" cy="'+y+'" r="15" fill="none" stroke="'+c+'" stroke-dasharray="3 2"/>').join('')+'</svg>',
      table:'<svg width="120" height="80" viewBox="0 0 120 80" role="img" aria-label="a table where every row is counted">'+[0,1,2,3,4].map(i=>R(18,6+i*13,84,11,{fill:i?'var(--acc)':'var(--soft)',op:i?0.35:1,stroke:'var(--line)',rx:1})).join('')+T(60,77,'COUNT(*) over every row',{a:'middle',fs:10.5,fill:'var(--mute)'})+'</svg>'};
    const C=[['Local','"What year was Goldfinger released?"','chunks','top-k chunks','one passage resembles the question','index: embeddings','query: 1 search, 1 call',0],
      ['Multi-hop','"What post did the actress who played Corliss Archer hold?"','graph','an entity graph','walk from A through a shared entity to B','index: 2 LLM calls per chunk, plus entity resolution','query: a walk or PageRank, no LLM',1],
      ['Global','"What are the main themes of this corpus?"','comm','community summaries','map the question over every report, then reduce','index: + 1 LLM call per community','query: 1 call per community',1],
      ['Aggregate','"How many singers are from France?"','table','SQL over every row','retrieve the schema, write the query','index: none, the data is already tables','query: 1 call, then the database counts',1]];
    el.innerHTML='<div class="h4g">'+C.map(c=>'<div'+(c[7]?' class="on"':'')+'><div class="k">'+c[0]+'</div><div class="q">'+E(c[1])+'</div><div class="ar">&darr;</div>'+G[c[2]]+'<div class="s">'+c[3]+'</div><div>'+c[4]+'</div><div class="c">'+c[5]+'</div><div class="c">'+c[6]+'</div></div>').join('')+'</div>'})();

  // ---- extraction cost per text token as the chunk size moves ----
  (function(){const el=$('gr-xc');if(!el)return;const P=D.prompts.graphrag_extract_graph.o200k,CT=D.prompts.graphrag_continue.o200k,O1=400;
    const sl=$('gr-xc-c');
    function draw(){const c=+sl.value;$('gr-xc-v').textContent=F(c);const W=RD.width(el),narrow=W<520,Lb=narrow?62:96,Rt=10,H=112;
      const max=P+2400+O1+CT,sc=(W-Lb-Rt)/max;let s='';
      const row=(y,lab,parts)=>{s+=T(Lb-6,y+15,lab,{a:'end',fs:11.5});let x=Lb;parts.forEach(([v,fill,st,txt])=>{s+=R(x,y,v*sc,22,{fill,stroke:st||'none',rx:2});if(txt&&v*sc>(narrow?30:44))s+=T(x+v*sc/2,y+15,txt,{a:'middle',fs:11,fill:'var(--ink)'});x+=v*sc});s+=T(Math.min(W-4,x+4),y+15,'',{})};
      row(10,'call 1',[[P,'var(--soft)','var(--line)','P '+F(P)],[c,'var(--acc)',null,'c']]);
      row(44,narrow?'call 2':'call 2 (glean)',[[P,'var(--soft)','var(--line)','P'],[c,'var(--acc)',null,'c'],[O1,'var(--c5)',null,'o₁'],[CT,'var(--c4)',null,'']]);
      s+=T(Lb,90,'call 1: '+F(P+c)+' prompt tokens for '+F(c)+' of text',{fs:11.5,fill:'var(--mute)'});
      s+=T(Lb,106,'call 2: '+F(P+c+O1+CT)+' (o₁ ≈ '+O1+', assumption)',{fs:11.5,fill:'var(--mute)'});
      el.innerHTML=RD.svg(W,H,s,'prompt tokens of the extraction and gleaning calls for one chunk');
      const r1=(P+c)/c,r2=(2*(P+c)+O1+CT)/c;
      $('gr-xc-cap').innerHTML='At c = '+F(c)+': the first call costs <b>'+r1.toFixed(1)+'</b> prompt tokens per text token, both calls together about <b>'+r2.toFixed(1)+'</b>. '+(c<=150?'This is the subset\'s regime (125-token paragraphs): measured over the real paragraphs, the first call was @@ex_ratio@@ times the text.':c>=1150&&c<=1250?'graphrag\'s default: (1,717 + 1,200) / 1,200 = 2.4 in the first call.':'Bigger chunks dilute the instructions, at a price in recall (the GraphRAG paper: half the entity references at 2,400 tokens as at 600).')}
    sl.addEventListener('input',draw);reg(draw);})();

  // ---- entity resolution: links gained against merges right ----
  (function(){const el=$('gr-er');if(!el)return;
    const rules=[['exact','exact'],['norm','normalised'],['subset','token subset'],['embed','embedding ≥ 0.85']],full=D.ent.full;
    function draw(){const W=RD.width(el),narrow=W<560,lab=narrow?92:112,gap=18;const pw=narrow?W-lab-40:(W-lab-gap-40*2)/2;
      const rowH=26,top=20;let s='';const H=narrow?top+rules.length*rowH*2+40:top+rules.length*rowH+14;
      const p1x=lab,p2x=narrow?lab:lab+pw+40+gap;
      s+=T(p1x,13,'bridge pairs joined, of '+full.exact.bridge_q,{fs:11.5,fill:'var(--mute)'});
      const y2o=narrow?top+rules.length*rowH+18:0;
      s+=T(p2x,13+y2o,'extra merges right, of 30',{fs:11.5,fill:'var(--mute)'});
      rules.forEach(([k,n],i)=>{const y=top+i*rowH,v=full[k].bridge_link;
        s+=T(lab-6,y+14,narrow?n.replace(' \u2265 0.85',''):n,{a:'end',fs:11.5});
        s+=R(p1x,y+2,pw,16,{fill:'var(--soft)'})+R(p1x,y+2,pw*v/full.exact.bridge_q,16,{fill:'var(--acc)'})+T(p1x+pw*v/full.exact.bridge_q+4,y+14,String(v),{fs:11.5});
        const yy=y+y2o;if(narrow)s+=T(lab-6,yy+14,n.replace(' \u2265 0.85',''),{a:'end',fs:11.5});
        if(k==='exact'){s+=T(p2x,yy+14,'baseline',{fs:11.5,fill:'var(--mute)'});return}
        const L=D.labels[k],ok=L.filter(x=>x[2]).length;
        s+=R(p2x,yy+2,pw,16,{fill:'var(--soft)'})+R(p2x,yy+2,pw*ok/L.length,16,{fill:ok/L.length>0.7?'var(--good)':'var(--c5)'})+T(p2x+pw*ok/L.length+4,yy+14,ok+' of '+L.length,{fs:11.5})});
      el.innerHTML=RD.svg(W,H,s,'bridge pairs joined and hand-checked merge precision per resolution rule')}
    reg(draw)})();

  // ---- Louvain against Leiden on a toy graph ----
  (function(){const el=$('gr-lv');if(!el)return;let mode='lou';
    // two triangles {1,2,5} and {4,9,10} joined only through node 3, which has three of its five edges in B = {6,7,8}
    const N={1:[.04,.12],2:[.24,.06],5:[.16,.36],4:[.16,.64],9:[.26,.94],10:[.03,.90],3:[.42,.50],6:[.66,.22],7:[.66,.78],8:[.92,.50]};
    const Ed=[[1,2],[2,5],[1,5],[4,9],[9,10],[4,10],[3,5],[3,4],[3,6],[3,7],[3,8],[6,7],[6,8],[7,8]];
    function draw(){const W=RD.width(el),H=220,P=24;const X=v=>P+(W-2*P)*v,Y=v=>16+(H-32)*v;
      const comm=mode==='lou'?{1:'A',2:'A',5:'A',4:'A',9:'A',10:'A',3:'B',6:'B',7:'B',8:'B'}:{1:'A1',2:'A1',5:'A1',4:'A2',9:'A2',10:'A2',3:'B',6:'B',7:'B',8:'B'};
      const col={A:'var(--c1)',A1:'var(--c1)',A2:'var(--c5)',B:'var(--c3)'};let s='';
      Ed.forEach(([a,b])=>{const same=comm[a]===comm[b];s+=L(X(N[a][0]),Y(N[a][1]),X(N[b][0]),Y(N[b][1]),{stroke:same?col[comm[a]]:'var(--line)',sw:same?2.4:1.2,dash:same?'':'4 3'})});
      Object.keys(N).forEach(k=>{s+='<circle cx="'+X(N[k][0]).toFixed(1)+'" cy="'+Y(N[k][1]).toFixed(1)+'" r="12" fill="'+col[comm[k]]+'" stroke="var(--bg)" stroke-width="2"/>'+T(X(N[k][0]),Y(N[k][1])+4,k,{a:'middle',fs:11.5,fill:'var(--bg)',w:700})});
      const lx=X(.34);s+=T(lx,Y(.06),mode==='lou'?'A':'A1',{fs:13,w:700,fill:col[mode==='lou'?'A':'A1']})+T(lx,Y(.97),mode==='lou'?'A':'A2',{fs:13,w:700,fill:col[mode==='lou'?'A':'A2']})+T(X(.80),Y(.08),'B',{fs:13,w:700,fill:col.B});
      el.innerHTML=RD.svg(W,H,s,'toy graph with communities under Louvain and Leiden');
      $('gr-lv-cap').textContent=mode==='lou'?'Louvain: node 3 was the only link between the two triangles of A. A local move put 3 in B, where three of its five edges go; every other node of A still has most of its edges in A, so none moves. A = {1, 2, 5, 4, 9, 10} is now two pieces with no edge between them inside A, and a GraphRAG report for A would summarise two unrelated groups.':'Leiden: after the moves, each community is re-split from singletons and nodes may join only well-connected sub-clusters, so A becomes A1 = {1, 2, 5} and A2 = {4, 9, 10}, each connected. Then the network is collapsed and the next round starts.'}
    RD.seg($('gr-lv-seg'),m=>{mode=m;draw()});reg(draw)})();

  // ---- local search context budget ----
  (function(){const el=$('gr-loc');if(!el)return;
    const parts=[['text units',0.5,'var(--c1)'],['community reports',0.15,'var(--c3)'],['entity and relationship tables',0.35,'var(--c5)']];
    function draw(){const W=RD.width(el),narrow=W<560,H=narrow?96:64;let s='',x=8;const w=W-16;
      parts.forEach(([n,f,c],i)=>{const bw=w*f;s+=R(x,8,bw-2,24,{fill:c,rx:3})+T(x+bw/2,25,F(12000*f),{a:'middle',fs:11.5,fill:'var(--bg)',w:600});
        if(narrow)s+=R(8,44+i*17,10,10,{fill:c})+T(24,53+i*17,n+' ('+Math.round(f*100)+'%)',{fs:11.5});
        else s+=T(x+2,50,n+' ('+Math.round(f*100)+'%)',{fs:11.5});x+=bw});
      el.innerHTML=RD.svg(W,H,s,'12,000-token local search context split 50, 15 and 35 percent')}
    reg(draw)})();

  // ---- DRIFT flow ----
  (function(){const el=$('gr-drift');if(!el)return;
    const B=[['Primer','write a hypothetical community report for the question (HyDE)'],['Retrieve','the 20 most similar real reports, split into 5 folds'],['Fold answers','each fold: an intermediate answer, a 0 to 100 score, follow-up questions'],['Local rounds','up to 3: local search answers the follow-ups, each answer proposes more'],['Reduce','one call merges every intermediate answer']];
    function draw(){const W=RD.width(el),bx=8,bw=W-16,nar=W<560,lab=nar?10:120,off=nar?17:0;let y=6,s='';
      B.forEach(([k,t],i)=>{const lines=wrap(t,bw-lab-16,11.5),h=Math.max(30,12+off+lines.length*15);
        s+=R(bx,y,bw,h,{fill:i===3?'var(--soft)':'var(--bg)',stroke:i===3?'var(--acc)':'var(--line)',rx:7})+T(bx+10,y+19,(i+1)+'. '+k,{fs:12,w:600});
        lines.forEach((l,j)=>{s+=T(bx+lab,y+19+off+j*15,E(l),{fs:11.5})});y+=h;
        if(i<B.length-1){s+=L(W/2,y+1,W/2,y+13,{m:1});y+=16}});
      el.innerHTML=RD.svg(W,y+4,s,'DRIFT search in five stages')}
    reg(draw)})();

  // ---- personalised PageRank on a toy phrase graph ----
  (function(){const el=$('gr-ppr');if(!el)return;
    const NODES={'Kiss and Tell':[.24,.30],'Corliss Archer':[.52,.10],'Shirley Temple':[.52,.55],'Chief of Protocol':[.80,.80],'diplomat':[.84,.45],'1945':[.06,.10],'Broadway':[.05,.55],'F. Hugh Herbert':[.20,.88],'radio':[.86,.10]};
    const Ed=[['Kiss and Tell','Shirley Temple'],['Shirley Temple','Corliss Archer'],['Kiss and Tell','1945'],['Shirley Temple','Chief of Protocol'],['Shirley Temple','diplomat'],['Kiss and Tell','F. Hugh Herbert'],['Kiss and Tell','Broadway'],['Corliss Archer','radio'],['Kiss and Tell','Corliss Archer']];
    const PAS=[['A','Kiss and Tell (1945 film)',['Kiss and Tell','Corliss Archer','Shirley Temple','1945']],['B','Shirley Temple',['Shirley Temple','Chief of Protocol','diplomat']],['C','Kiss and Tell (play)',['Kiss and Tell','Broadway','F. Hugh Herbert']],['D','Meet Corliss Archer (radio)',['Corliss Archer','radio']]];
    const Q=['Kiss and Tell','Corliss Archer'],d=0.5,names=Object.keys(NODES),adj={};names.forEach(n=>adj[n]=[]);Ed.forEach(([a,b])=>{adj[a].push(b);adj[b].push(a)});
    const spec=n=>1/PAS.filter(p=>p[2].includes(n)).length;const r={};names.forEach(n=>r[n]=0);Q.forEach(n=>r[n]=spec(n));const rs=Q.reduce((s,n)=>s+r[n],0);names.forEach(n=>r[n]/=rs);
    const IT=[0,1,2,3,30],hist=[];let p=Object.assign({},r);for(let it=0;it<=30;it++){if(it){const nw={};names.forEach(n=>nw[n]=(1-d)*r[n]);names.forEach(n=>adj[n].forEach(m=>{nw[m]+=d*p[n]/adj[n].length}));p=nw}if(IT.includes(it))hist.push(Object.assign({},p))}
    const score=(pp,P)=>P[2].reduce((s,n)=>s+pp[n],0);
    const CAP=i=>{const pp=hist[i],sc=PAS.map(P=>score(pp,P));const b=sc[1].toFixed(3);
      return ['Reset: all mass on the question\'s two entities, weighted by specificity (Kiss and Tell is in '+(1/spec('Kiss and Tell'))+' passages, Corliss Archer in '+(1/spec('Corliss Archer'))+', so '+r['Kiss and Tell'].toFixed(2)+' and '+r['Corliss Archer'].toFixed(2)+'). B scores '+b+': it shares no word with the question.',
        'One step: half the mass stays on the reset nodes, half follows an edge. Shirley Temple, linked to both question entities, picks some up, and B scores '+b+' for the first time.',
        'Two steps: mass reaches Chief of Protocol and diplomat, B\'s own phrases; B scores '+b+'.',
        'Three steps: each step moves less; B scores '+b+'.',
        'Converged (30 iterations): B scores '+b+' against 0 at the start, still below C ('+sc[2].toFixed(3)+') and D ('+sc[3].toFixed(3)+'), which repeat the question\'s names. In a real index thousands of passages score 0, so B now enters the top 5: that is the hop. It does not reach the top 2.'][i]};
    function draw(i){const pp=hist[i],W=RD.width(el),narrow=W<520,GH=narrow?230:250,P=narrow?40:56;const X=v=>P+(W-2*P)*v,Y=v=>20+(GH-40)*v;let s='';
      Ed.forEach(([a,b])=>{s+=L(X(NODES[a][0]),Y(NODES[a][1]),X(NODES[b][0]),Y(NODES[b][1]),{stroke:'var(--line)',sw:1.4})});
      names.forEach(n=>{const [x,y]=NODES[n],rad=4+Math.sqrt(pp[n])*(narrow?34:42),q=Q.includes(n);
        s+='<circle cx="'+X(x).toFixed(1)+'" cy="'+Y(y).toFixed(1)+'" r="'+rad.toFixed(1)+'" fill="'+(q?'var(--acc)':'var(--c3)')+'" fill-opacity="'+(q?0.75:0.6)+'" stroke="var(--line)"/>';
        s+=T(X(x),Y(y)+rad+12,E(n),{a:'middle',fs:11,fill:'var(--ink)'})});
      const by=GH+8,lab=narrow?120:200,bw=W-lab-56;const sc=PAS.map(Pp=>score(pp,Pp)),mx=Math.max(...hist.map(h=>Math.max(...PAS.map(Pp=>score(h,Pp)))));
      PAS.forEach((Pp,j)=>{const y=by+j*22;s+=T(lab-6,y+13,E(Pp[0]+' '+(narrow?Pp[1].replace(/ \(.*\)/,''):Pp[1])),{a:'end',fs:11.5,w:Pp[0]==='B'?700:400});
        s+=R(lab,y+2,bw,14,{fill:'var(--soft)'})+R(lab,y+2,bw*sc[j]/mx,14,{fill:Pp[0]==='B'?'var(--acc)':'var(--mute)'})+T(lab+bw*sc[j]/mx+4,y+13,sc[j].toFixed(3),{fs:11.5})});
      el.innerHTML=RD.svg(W,by+4*22+6,s,'personalised PageRank mass on a toy phrase graph and passage scores');
      $('gr-ppr-cap').textContent='Iteration '+IT[i]+'. '+CAP(i)}
    const A=RD.anim({card:'gr-ppr-card',ctl:'gr-ppr-ctl',n:IT.length,draw,ms:1600,label:'PageRank iteration'});
    reg(()=>A.redraw())})();

  // ---- published indexing bill ----
  (function(){const el=$('gr-bill');if(!el)return;
    const S=[['GraphRAG',115.5,36.1,277],['LightRAG',68.5,18.3,235],['HippoRAG 2',9.2,3.0,99.5]];
    function draw(){const W=RD.width(el),lab=W<520?78:96,bw=W-lab-70,H=S.length*46+22;let s='';
      S.forEach(([n,i,o,m],j)=>{const y=6+j*46;s+=T(lab-6,y+14,n,{a:'end',fs:12,w:600})+T(lab-6,y+30,m+' min',{a:'end',fs:11,fill:'var(--mute)'});
        s+=R(lab,y+3,bw*i/115.5,15,{fill:'var(--acc)'})+T(lab+bw*i/115.5+4,y+15,i+' M in',{fs:11.5});
        s+=R(lab,y+21,bw*o/115.5,13,{fill:'var(--c5)'})+T(lab+bw*o/115.5+4,y+32,o.toFixed(1)+' M out',{fs:11.5})});
      s+=T(lab,H-4,'bars to one scale: millions of tokens',{fs:11,fill:'var(--mute)'});
      el.innerHTML=RD.svg(W,H,s,'indexing tokens and minutes for GraphRAG, LightRAG and HippoRAG 2 on MuSiQue')}
    reg(draw)})();

  // ---- text-to-SQL benchmark drop (published) ----
  (function(){const el=$('gr-bench');if(!el)return;
    const S=[['Spider 1.0','200 small, clean databases',86.6],['BIRD','95 databases, 33.4 GB, dirty values',57.4],['Spider 2.0-lite','enterprise schemas, dialects',5.68]];
    function draw(){const W=RD.width(el),narrow=W<560,lab=narrow?96:118,bw=W-lab-56,rh=narrow?40:30,H=S.length*rh+8;let s='';
      S.forEach(([n,d,v],j)=>{const y=4+j*rh;s+=T(lab-6,y+14,n,{a:'end',fs:12,w:600});if(narrow)s+=T(lab,y+33,d,{fs:11,fill:'var(--mute)'});
        s+=R(lab,y+3,bw,15,{fill:'var(--soft)'})+R(lab,y+3,bw*v/100,15,{fill:'var(--acc)'})+T(lab+bw*v/100+4,y+15,v+'%',{fs:11.5});
        if(!narrow)s+=T(lab+bw*v/100+(v>50?-6:44),y+15,d,{fs:11,fill:v>50?'var(--bg)':'var(--mute)',a:v>50?'end':'start'})});
      el.innerHTML=RD.svg(W,H,s,'DAIL-SQL with GPT-4o execution accuracy on three benchmarks')}
    reg(draw)})();

  // ---- text-to-SQL end to end (measured) ----
  (function(){const el=$('gr-sqlres');if(!el||!D.sql_runs)return;
    const C=[['none','question only'],['all20','all 20 databases'],['retrieved','5 retrieved tables'],['oracle','own database']],M=[['1.7b','Qwen3-1.7B','var(--c1)'],['4b','Qwen3-4B','var(--c2)']];
    function draw(){const W=RD.width(el),lab=W<520?104:130,bw=W-lab-40,rh=36,H=C.length*rh+26;let s='';
      C.forEach(([k,n],j)=>{const y=4+j*rh;s+=T(lab-6,y+17,n,{a:'end',fs:11.5,w:k==='retrieved'?700:400});
        M.forEach(([m,mn,c],q)=>{const r=D.sql_runs[m]&&D.sql_runs[m][k];if(!r)return;const yy=y+2+q*14;s+=R(lab,yy,bw*r.ex/100,12,{fill:c})+T(lab+bw*r.ex/100+4,yy+10,String(r.ex),{fs:11})})});
      s+=R(lab,H-14,10,10,{fill:'var(--c1)'})+T(lab+14,H-5,'Qwen3-1.7B',{fs:11})+R(lab+100,H-14,10,10,{fill:'var(--c2)'})+T(lab+114,H-5,'Qwen3-4B',{fs:11});
      el.innerHTML=RD.svg(W,H,s,'correct SQL of 100 under four prompts for two models')}
    reg(draw)})();

  // ---- concert_singer as tables and as a property graph ----
  (function(){const el=$('gr-kz');if(!el)return;const K=D.kuzu.counts;
    function draw(){const W=RD.width(el),narrow=W<560,H=narrow?172:150,bw=Math.min(150,(W-30)/4.4),fs=narrow?10.5:11.5;let s='';
      const tx=[0.10,0.37,0.63,0.90].map(f=>8+(W-16)*f),ty=32;
      const tabs=[['singer'],['singer_in_','concert'],['concert'],['stadium']];
      s+=T(8,14,'relational: four tables, joins by key',{fs:11,fill:'var(--mute)'});
      tabs.forEach((t,i)=>{const h=t.length>1?34:24;s+=R(tx[i]-bw/2,ty-4,bw,h,{fill:i===1?'var(--soft)':'var(--bg)',stroke:i===1?'var(--acc)':'var(--line)',rx:4});t.forEach((l,j)=>{s+=T(tx[i],ty+11+j*13,l,{a:'middle',fs:fs,w:i===1?600:400})})});
      for(let i=0;i<3;i++)s+=L(tx[i]+bw/2,ty+8,tx[i+1]-bw/2,ty+8,{stroke:'var(--line)'});
      const gy=narrow?130:118;s+=T(8,gy-28,'graph: the join table becomes an edge',{fs:11,fill:'var(--mute)'});
      const gx=[tx[0]+ (narrow?10:0),(tx[1]+tx[2])/2,tx[3]-(narrow?10:0)],gl=[['Singer',K.Singer],['Concert',K.Concert],['Stadium',K.Stadium]];
      gl.forEach(([n,c],i)=>{s+='<ellipse cx="'+gx[i].toFixed(1)+'" cy="'+gy+'" rx="'+Math.min(56,bw/2+6).toFixed(1)+'" ry="17" fill="var(--soft)" stroke="var(--c3)"/>'+T(gx[i],gy+4,n+' ('+c+')',{a:'middle',fs:fs})});
      const rx=Math.min(56,bw/2+6);
      s+=L(gx[0]+rx,gy,gx[1]-rx,gy,{stroke:'var(--acc)',sw:2,m:1})+T((gx[0]+gx[1])/2,gy+(narrow?32:-6),'PERFORMED_IN ('+K.PERFORMED_IN+')',{a:'middle',fs:fs-0.5,fill:'var(--acc)',w:600});
      s+=L(gx[1]+rx,gy,gx[2]-rx,gy,{stroke:'var(--mute)',sw:1.5,m:1})+T((gx[1]+gx[2])/2,gy+(narrow?32:-6),'HELD_AT ('+K.HELD_AT+')',{a:'middle',fs:fs-0.5,fill:'var(--mute)'});
      s+=L(tx[1],ty+32,(gx[0]+gx[1])/2,gy-(narrow?2:20),{stroke:'var(--acc)',dash:'3 3'});
      el.innerHTML=RD.svg(W,H,s,'concert_singer as four relational tables and as a property graph in Kuzu')}
    reg(draw)})();

  const all=()=>draws.forEach(f=>{try{f()}catch(e){setTimeout(()=>{throw e})}});
  RD.onRender(all);RD.onResize(all);all();
})();
