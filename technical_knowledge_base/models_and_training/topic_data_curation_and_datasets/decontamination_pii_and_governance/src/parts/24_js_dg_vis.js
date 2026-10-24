// ---- Reading tab: the inline SVG figures (hero, n-gram share, rule precision, datatrove switch, similarity bands,
// Min-K% AUC, removal units, PII detectors, robots.txt now). Every figure is drawn at the measured width of its box,
// redrawn on resize and when the Reading tab opens; nothing moves by itself. Data: window.DG (data/dg_data.json);
// the few numbers not in DG are quoted from data/facts.json (named beside each).
(function(){
  if(!window.DG||!document.getElementById('dg-hero'))return;
  const E=RD.esc,$=id=>document.getElementById(id),f=n=>Number(n).toLocaleString('en-GB');
  const T=(x,y,s,o)=>{o=o||{};return '<text x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" font-size="'+(o.fs||11)+'"'+(o.a?' text-anchor="'+o.a+'"':'')+(o.cls?' class="'+o.cls+'"':'')+(o.fill?' style="fill:'+o.fill+'"':'')+(o.w?' font-weight="'+o.w+'"':'')+'>'+s+'</text>'};
  const R=(x,y,w,h,fill,o)=>{o=o||{};return '<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+Math.max(0,w).toFixed(1)+'" height="'+h.toFixed(1)+'" rx="'+(o.rx==null?2:o.rx)+'" style="fill:'+fill+(o.stroke?';stroke:'+o.stroke+';stroke-width:'+(o.sw||1):'')+(o.dash?';stroke-dasharray:'+o.dash:'')+'"/>'};
  const L=(x1,y1,x2,y2,c,o)=>{o=o||{};return '<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" style="stroke:'+c+';stroke-width:'+(o.sw||1)+(o.dash?';stroke-dasharray:'+o.dash:'')+'"/>'};
  const svg=(w,h,body,label)=>'<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img" aria-label="'+E(label)+'">'+body+'</svg>';
  const COPY='var(--bad)',GREY='var(--c5)',FP='var(--dim)',ACC='var(--acc)';
  const FIG=[];const reg=(id,fn)=>FIG.push([id,fn]);
  function drawAll(){FIG.forEach(([id,fn])=>{const el=$(id);if(el&&el.offsetParent!==null)el.innerHTML=fn(Math.floor(RD.width(el)))})}
  const C={};DG.corpora.forEach(c=>C[c.key]=c);

  // ---------- hero: three checks between the cleaned corpus and the training set ----------
  const nItems=Object.values(DG.bench_sizes).reduce((a,b)=>a+b,0),PS=DG.pii.summary,RN=DG.robots_now.counts;
  const goldN=Object.values(DG.pii.gold_types).reduce((a,b)=>a+b,0);
  const gates=[
    {t:'1. Test items out',tool:'n-gram index of '+f(nItems)+' items',hit:'70 MMLU copies in Tulu 3 RLVR',err:'43 of 43 web flags innocent'},
    {t:'2. Personal data out',tool:'regexes, then NER (Presidio)',hit:'Presidio: '+Math.round(100*PS.presidio.recall)+'% of '+goldN+' spans',err:PS.presidio.false_alarms+' false alarms; regex '+Math.round(100*PS.datatrove.recall)+'%'},
    {t:'3. Records kept',tool:'id, URL, crawl, terms, actions',hit:'record id kept to FineWeb-Edu',err:f(RN.blocked_any_ai_trainer)+' of '+f(RN.docs)+' now closed to AI'}];
  reg('dg-hero',w=>{
    let h='',H;
    const box=(x,y,bw,bh,g)=>R(x,y,bw,bh,'var(--soft)',{rx:8,stroke:'var(--line)'})+T(x+10,y+19,g.t,{fs:13,w:600})+T(x+10,y+38,g.tool,{cls:'m'})+
      R(x+10,y+48,8,8,COPY,{rx:1})+T(x+23,y+56,g.hit,{})+R(x+10,y+66,8,8,FP,{rx:1})+T(x+23,y+74,g.err,{cls:'m'});
    const end=(x,y,bw,bh,a,b)=>R(x,y,bw,bh,'var(--acc2)',{rx:8,stroke:ACC})+T(x+bw/2,y+bh/2-3,a,{a:'middle',w:600})+T(x+bw/2,y+bh/2+12,b,{a:'middle',w:600});
    const arrow=(x1,y1,x2,y2)=>L(x1,y1,x2,y2,'var(--mute)',{sw:1.5})+(x2>x1?'<path d="M'+(x2-6)+' '+(y2-4)+' L'+x2+' '+y2+' L'+(x2-6)+' '+(y2+4)+'" style="fill:none;stroke:var(--mute);stroke-width:1.5"/>':'<path d="M'+(x2-4)+' '+(y2-6)+' L'+x2+' '+y2+' L'+(x2+4)+' '+(y2-6)+'" style="fill:none;stroke:var(--mute);stroke-width:1.5"/>');
    if(w>=780){const ew=74,gap=18,bw=(w-2*ew-4*gap)/3,bh=86,y=8;H=bh+16;
      h+=end(0,y,ew,bh,'cleaned','corpus');let x=ew;
      gates.forEach((g,i)=>{h+=arrow(x+2,y+bh/2,x+gap-2,y+bh/2);x+=gap;h+=box(x,y,bw,bh,g);x+=bw});
      h+=arrow(x+2,y+bh/2,x+gap-2,y+bh/2);h+=end(x+gap,y,ew,bh,'training','set');}
    else{const bw=w-2,bh=86,eh=30,gap=16;let y=2;
      h+=R(0,y,bw,eh,'var(--acc2)',{rx:8,stroke:ACC})+T(bw/2,y+19,'cleaned corpus',{a:'middle',w:600});y+=eh;
      gates.forEach(g=>{h+=arrow(bw/2,y+2,bw/2,y+gap-2);y+=gap;h+=box(0,y,bw,bh,g);y+=bh});
      h+=arrow(bw/2,y+2,bw/2,y+gap-2);y+=gap;h+=R(0,y,bw,eh,'var(--acc2)',{rx:8,stroke:ACC})+T(bw/2,y+19,'training set',{a:'middle',w:600});H=y+eh+2}
    return svg(w,H,h,'The three checks: test items out, personal data out, records kept, with what each caught and got wrong here')});

  // ---------- section 2: share of documents sharing an n-gram, by n ----------
  const SHORT={run0_final:'run0 final',run0_extracted:'run0 extracted',fineweb:'FineWeb 50k',fineweb_edu:'FineWeb-Edu 50k',dclm:'DCLM 50k',nemotron:'Nemotron-CC 205k',
    fineweb_file0:'FineWeb file (972k)',fineweb_edu_file0:'FineWeb-Edu file (477k)',tulu3_sft:'Tulu 3 SFT 5k',ultrafeedback:'UltraFeedback 5k',rlvr:'Tulu 3 RLVR 30k',cosmopedia:'Cosmopedia 2k'};
  let NN=8;
  reg('dg-n-view',w=>{
    const lw=Math.min(170,Math.round(w*0.38)),vw=58,x0=lw+6,bw=w-x0-vw,rh=20;let y=18,h='';
    const xs=p=>x0+bw*Math.max(0,(Math.log10(Math.max(p,1e-3))+3)/5);
    [0.001,0.01,0.1,1,10,100].forEach(p=>{const x=xs(p);h+=L(x,14,x,1000,'var(--line)')+T(x,10,(p<0.01?'0.001':p<0.1?'0.01':p<1?'0.1':p)+'%',{a:'middle',cls:'m'})});
    ['web','post'].forEach(g=>{y+=6;h+=T(0,y+10,g==='web'?'Web text':'Post-training',{w:600,cls:'m'});y+=16;
      DG.corpora.filter(c=>c.group===g).forEach(c=>{const p=100*c['any'+NN]/c.docs;
        h+=T(0,y+14,E(SHORT[c.key]||c.key))+R(x0,y+4,(p>0?xs(p)-x0:0),rh-8,g==='web'?ACC:'var(--c4)')+T(p>0?xs(p)+4:x0+4,y+14,p===0?'0':(p>=10?p.toFixed(0):p>=1?p.toFixed(1):p>=0.1?p.toFixed(2):p.toFixed(3))+'%',{});y+=rh})});
    return svg(w,y+4,h.replace(/y2="1000.0"/g,'y2="'+(y)+'"'),'Share of documents sharing at least one '+NN+'-gram with a test item, per corpus')});
  const ns=$('dg-n-seg');if(ns)RD.seg(ns,m=>{NN=+m;const el=$('dg-n-view');el.innerHTML=FIG.find(x=>x[0]==='dg-n-view')[1](Math.floor(RD.width(el)))});

  // ---------- section 3: what each rule's flags are ----------
  reg('dg-prec-view',w=>{
    const rows=[['gpt3_13','GPT-3: any 13-gram'],['tulu_8_50','Tulu 3: 8-gram coverage > 50%'],['longest_50','Longest match >= 50%'],['datatrove','datatrove default']];
    const narrow=w<560,lw=narrow?0:190,x0=lw,bw=w-x0-4,rh=narrow?44:30;let y=4,h='';
    const mx=Math.max(...Object.values(DG.rules).map(r=>r.pairs_label||r.pairs));
    rows.forEach(([k,n])=>['web','post'].forEach(g=>{const r=DG.rules[k+'|'+g];if(!r)return;const c=r.cats,tot=r.pairs_label||r.pairs;
      const cp=c.copy||0,gz=(c.variant||0)+(c.source||0),fp=r.fp_label!=null?r.fp_label:(c.passage||0)+(c.phrase||0)+(c.diagram||0);
      const lab=E(n)+', '+(g==='web'?'web':'post-training');
      let yy=y;if(narrow){h+=T(0,y+11,lab,{w:600});yy=y+15}else if(g==='web')h+=T(0,y+16,E(n),{w:600});
      const sc=bw*0.62/mx;let x=x0;
      h+=R(x,yy+4,cp*sc,12,COPY,{rx:1});x+=cp*sc;h+=R(x,yy+4,gz*sc,12,GREY,{rx:1});x+=gz*sc;h+=R(x,yy+4,fp*sc,12,FP,{rx:1});x+=fp*sc;
      h+=T(x+5,yy+14,(narrow?'':(g==='web'?'web: ':'post: '))+'<tspan style="fill:var(--bad);font-weight:600">'+cp+(cp===1?' copy':' copies')+'</tspan> of '+f(tot)+' pairs',{});
      y+=rh;if(g==='post')y+=6}));
    return svg(w,y,h,'Pairs flagged by each rule on web and post-training data, split into copies, grey zone and false positives')+
      '<p class="leg" style="margin:2px 0 0"><span style="--sw:var(--bad)">copy</span><span style="--sw:var(--c5)">variant or source (grey zone)</span><span style="--sw:var(--dim)">passage, phrase or diagram (false positive)</span></p>'});

  // ---------- section 3: datatrove's switch ----------
  reg('dg-dt-view',w=>{
    const dt=C.rlvr.dt,c1=(DG.rules['datatrove|post'].cats.copy||0),c2=69; // 69: facts.json dt_line ("catches 69 of 71")
    const rows=[['default (answer n-grams)',dt.default.docs,c1],['find_query_ngrams=True',dt.query.docs,c2]];
    const narrow=w<560,lw=narrow?0:180,bw=w-lw-6,sc=bw*0.7/Math.max(dt.default.docs,dt.query.docs);let y=4,h='';
    rows.forEach(([n,rm,cp])=>{let yy=y;if(narrow){h+=T(0,y+11,n,{w:600});yy+=15}else h+=T(0,y+16,n,{w:600});
      const lab=f(rm)+' rows removed, <tspan style="fill:var(--bad);font-weight:600">'+cp+' of 71 copies</tspan>';
      h+=R(lw,yy+4,rm*sc,14,FP,{rx:1})+R(lw,yy+4,cp*sc,14,COPY,{rx:1})+(narrow?T(0,yy+33,lab,{}):T(lw+rm*sc+5,yy+15,lab,{}));y+=narrow?56:30});
    return svg(w,y,h,'datatrove default against question n-grams on Tulu 3 RLVR: rows removed and copies caught')});

  // ---------- section 4: similarity bands and the judge ----------
  reg('dg-sim-view',w=>{
    const top=DG.emb.top,cnt=(fn)=>{const o={};top.filter(fn).forEach(r=>{const k=r.lab||'unlabelled';o[k]=(o[k]||0)+1});return o};
    const hi=cnt(r=>r.s>=0.95&&!r.ng),mid=cnt(r=>r.s<0.95&&!r.ng&&r.lab);
    const J=DG.gpu.judge.table,jg=(labs)=>{let s=0,d=0;labs.forEach(l=>{s+=J[l+'|SAME']||0;d+=J[l+'|DIFFERENT']||0});return [s,d]};
    const COL={copy:COPY,variant:GREY,similar:FP,unlabelled:'var(--line)',SAME:ACC,DIFFERENT:FP};
    const order=['copy','variant','similar','unlabelled'];
    let y=2,h='';const bw=w-2;
    const bar=(title,parts,note)=>{const tot=parts.reduce((a,p)=>a+p[1],0);h+=T(0,y+12,title,{w:600});y+=18;let x=0;
      parts.forEach(([k,n])=>{const ww=bw*n/tot;h+=R(x,y,ww,14,COL[k],{rx:1});if(ww>22)h+=T(x+ww/2,y+11,n,{a:'middle',fill:k==='similar'||k==='unlabelled'||k==='DIFFERENT'?'var(--ink)':'var(--bg)',w:600});x+=ww});y+=28;
      h+=T(0,y-6,parts.map(([k,n])=>n+' '+(k==='SAME'?'said same':k==='DIFFERENT'?'said different':k)).join(', ')+(note||''),{cls:'m'});y+=10};
    bar('Cosine 0.95 or more, missed by n-grams',order.filter(k=>hi[k]).map(k=>[k,hi[k]]));
    bar('Cosine 0.88 to 0.95, labelled sample',order.filter(k=>mid[k]).map(k=>[k,mid[k]]));
    y+=4;h+=L(0,y,w,y,'var(--line)');y+=6;
    const a=jg(['copy']),b=jg(['variant','similar','phrase','diagram']);
    bar('Judge on pairs labelled copy',[['SAME',a[0]],['DIFFERENT',a[1]]]);
    bar('Judge on variants, cousins, false positives',[['SAME',b[0]],['DIFFERENT',b[1]]]);
    return svg(w,y,h,'Labels of nearest-prompt pairs by similarity band, and the LLM judge verdicts by label')});

  // ---------- section 5: Min-K% AUC ----------
  reg('dg-mink-view',w=>{
    const MK=DG.gpu.mink,ms=Object.keys(MK),bs=['gsm8k_test','math500_test','mmlu_test'],BN={gsm8k_test:'GSM8K',math500_test:'MATH-500',mmlu_test:'MMLU HS maths'};
    const mets=[['loss','loss','var(--c1)'],['mink','Min-K%','var(--c2)'],['minkpp','Min-K%++','var(--c3)'],['zlib','zlib','var(--c4)']];
    const lw=Math.min(150,Math.round(w*0.36)),x0=lw+4,bw=w-x0-10,lo=0.4,hi=1.0,X=a=>x0+bw*(a-lo)/(hi-lo),rh=22;
    let y=0,h='';
    // legend on the figure, one row
    let lx=0;const ly=12;mets.forEach(([k,n,c])=>{h+='<circle cx="'+(lx+5)+'" cy="'+(ly-4)+'" r="4.5" style="fill:'+c+'"/>'+T(lx+13,ly,n);lx+=13+n.length*6.6+14});
    y=26;[0.4,0.5,0.6,0.7,0.8,0.9,1.0].forEach(a=>{h+=T(X(a),y,a.toFixed(1),{a:'middle',cls:'m'})});y+=6;const yt=y;
    bs.forEach(b=>ms.forEach((m,mi)=>{const A=MK[m].auc[b];if(!A)return;
      h+=T(0,y+15,(mi?'':'<tspan font-weight="600">'+BN[b]+'</tspan> ')+m.replace('Qwen3-',''),{})+L(x0,y+11,x0+bw,y+11,'var(--line)');
      mets.forEach(([k,,c])=>{h+='<circle cx="'+X(A[k]).toFixed(1)+'" cy="'+(y+11)+'" r="5" style="fill:'+c+';fill-opacity:.85"/>'});y+=rh}));
    h+=L(X(0.5),yt,X(0.5),y,'var(--mute)',{dash:'4 3'})+T(X(0.5)+4,y+12,'chance',{cls:'m'});
    return svg(w,y+16,h,'AUC of four membership scores at telling an original test item from its number-shifted copy')});

  // ---------- section 6: characters removed per unit ----------
  reg('dg-rm-view',w=>{
    // facts.json rm_units_line
    const rows=[['whole documents',925647],['paragraphs',53563],['span + 200 characters',34796],['matched strings',6796]];
    const lw=Math.min(160,Math.round(w*0.38)),x0=lw+4,vw=70,bw=w-x0-vw,X=v=>x0+bw*(Math.log10(v)-3)/3;let y=16,h='';
    [1e3,1e4,1e5,1e6].forEach(v=>{h+=L(X(v),12,X(v),16+rows.length*24,'var(--line)')+T(X(v),9,v>=1e6?'1M':v/1e3+'k',{a:'middle',cls:'m'})});
    rows.forEach(([n,v],i)=>{h+=T(0,y+14,n,{w:i?400:600})+R(x0,y+4,X(v)-x0,13,i?ACC:COPY,{rx:1})+T(X(v)+4,y+14,f(v),{});y+=24});
    return svg(w,y+2,h,'Characters removed under each removal unit, log scale')});

  // ---------- section 7: PII detectors, recall and false alarms ----------
  reg('dg-piisum-view',w=>{
    const S=DG.pii.summary,names=[['datatrove','datatrove PIIFormatter'],['dolma','Dolma pii_regex_v1'],['extra','extra regexes'],['presidio','Presidio, all types'],['presidio_ids','Presidio, identifiers'],['presidio_05','Presidio, ids, score >= 0.5']];
    const narrow=w<560,lw=narrow?0:180,x0=lw,bw=w-x0-4,sc=bw*0.62/100,mfa=Math.max(...names.map(n=>S[n[0]].false_alarms));let y=4,h='';
    names.forEach(([k,n])=>{const s=S[k];let yy=y;if(narrow){h+=T(0,y+11,n,{w:600});yy+=14}else h+=T(0,y+15,n,{w:600});
      const r=Math.round(100*s.recall);h+=R(x0,yy+4,r*sc,11,ACC,{rx:1})+T(x0+r*sc+5,yy+14,r+'% recall',{})+
        R(x0,yy+18,s.false_alarms/mfa*bw*0.62,6,'var(--bad)',{rx:1})+T(x0+s.false_alarms/mfa*bw*0.62+5,yy+25,s.false_alarms+' false alarms',{cls:'m'});y+=narrow?46:34});
    return svg(w,y,h,'Recall and false alarms of each PII detector on the synthetic set')});

  // ---------- section 8: robots.txt now, per AI token ----------
  reg('dg-opt-svg',w=>{
    const b=DG.robots_now.blocked_by_agent,c=DG.robots_now.counts,ag=Object.keys(b).sort((x,y)=>b[y]-b[x]);
    const lw=Math.min(150,Math.round(w*0.38)),x0=lw+4,vw=110,bw=w-x0-vw,mx=c.blocked_any_ai_trainer;let y=4,h='';
    const row=(n,v,col,bold)=>{h+=T(0,y+14,n,{w:bold?600:400})+R(x0,y+4,bw*v/mx,13,col,{rx:1})+T(x0+bw*v/mx+4,y+14,f(v)+' ('+(100*v/c.docs).toFixed(1)+'%)',{});y+=22};
    row('any AI trainer',c.blocked_any_ai_trainer,COPY,true);ag.forEach(a=>row(E(a),b[a],ACC));
    return svg(w,y+2,h,'FineWeb documents from the running example whose site now blocks each AI crawler token')});

  RD.onRender(drawAll);RD.onResize(drawAll);
  document.querySelectorAll('#t-read details.dp').forEach(d=>d.addEventListener('toggle',drawAll));
  drawAll();
})();
