// ---- Dedup lab: suffix arrays (live toy, measured thresholds, spans)
(function(){
  const D=window.DD,X=window.DDX,$=X.$;if(!D||!$('t-dedup'))return;
  const docs=['we use cookies to improve your experience. the stove has a glass strip.',
              'we use cookies to improve your experience. our folding table is light.',
              'the folding table is light and strong. we use cookies to improve it.'];
  let L=12;
  // text with unique separators; positions map back to documents
  const parts=[];docs.forEach((d,i)=>{parts.push({t:d,doc:i});parts.push({t:'#'+i,doc:-1})});
  const text=parts.map(p=>p.t).join('');
  const owner=[];parts.forEach(p=>{for(let k=0;k<p.t.length;k++)owner.push(p.doc)});
  const sa=[...Array(text.length).keys()].sort((a,b)=>{const x=text.slice(a),y=text.slice(b);return x<y?-1:x>y?1:0});
  const lcp=sa.map((p,k)=>{if(!k)return 0;const a=text.slice(sa[k-1]),b=text.slice(p);let n=0;while(n<a.length&&n<b.length&&a[n]===b[n]&&a[n]!=='#')n++;return n});
  function marked(){const m=new Uint8Array(text.length);sa.forEach((p,k)=>{if(k&&lcp[k]>=L){for(let q=0;q<L;q++){m[p+q]=1;m[sa[k-1]+q]=1}}});return m}
  const show=s=>s.replace(/ /g,'·');
  const steps=['Every position of the joined text starts a suffix (the text from there to the end). Listed in text order, the first 40.',
    'Sorted alphabetically, identical beginnings land next to each other. The red number is the common prefix with the row above (stopping at a separator).',
    'Rows whose common prefix with the row above is at least L start a repeated span: both suffixes are marked, L characters each.',
    'Back in the documents: every marked character is inside a span that occurs at least twice. The tool removes all of them, every copy included.'];
  function draw(i){
    const list=$('dd-sa-list'),m=marked();
    $('dd-sa-cap').innerHTML='<b>Step '+(i+1)+' of 4.</b> '+steps[i];
    if(i===0)list.innerHTML=[...Array(40).keys()].map(p=>'<div>'+String(p).padStart(3,' ')+'  '+X.esc(show(text.slice(p,p+44)))+'</div>').join('');
    else if(i<3){let h='';sa.forEach((p,k)=>{if(owner[p]<0&&i<3)return;const hit=i===2&&(lcp[k]>=L||(k+1<sa.length&&lcp[k+1]>=L));
      h+='<div'+(hit?' class="m"':'')+'><span class="lcp">'+String(lcp[k]).padStart(2,' ')+'</span> '+String(p).padStart(3,' ')+'  '+X.esc(show(text.slice(p,p+40)))+'</div>'});list.innerHTML=h}
    else{const lens=[];let h='';list.innerHTML='<div class="mute">sorted rows hidden in this step</div>'}
    // corpus view
    let c='';parts.forEach((p,pi)=>{if(p.doc<0){c+='<span class="mute">'+p.t+'</span><br>';return}
      const off=parts.slice(0,pi).reduce((s,x)=>s+x.t.length,0);
      for(let k=0;k<p.t.length;k++){const ch=X.esc(p.t[k]);c+=(i>=2&&m[off+k])?(i===3?'<s>'+ch+'</s>':'<mark>'+ch+'</mark>'):ch}});
    $('dd-sa-corp').innerHTML=c;
    let tot=0;for(let k=0;k<m.length;k++)tot+=m[k];
    if(i>=2)$('dd-sa-cap').innerHTML+=' <span class="mute">'+tot+' of '+(text.length-6)+' characters marked at L = '+L+'.</span>';
  }
  const A=X.anim({card:'dd-sa-card',ctl:'dd-sa-ctl',n:4,draw,ms:3200,label:'Suffix array step'});
  $('dd-sa-l').addEventListener('input',e=>{L=+e.target.value;$('dd-sa-lv').textContent=L;A.redraw()});

  // ---- measured
  const SU=D.suffix;let stg='extracted';
  $('dd-sa-time').textContent=SU.extracted.rough_seconds_make.toFixed(1);
  $('dd-sa-mb').textContent=(SU.extracted.text_bytes/1e6).toFixed(0);
  $('dd-sa-ratio').textContent=[...new Set(['extracted','filtered','final'].map(k=>SU[k].table_ratio))].join(' or ');
  function chart(){const s=SU[stg],el=$('dd-sa-chart'),W=X.width(el),H=Math.min(260,Math.max(200,W*0.4)),Lm=46,R=10,T=12,B=34;
    const xs=s.by_L.map(r=>r.L),lx=v=>Math.log10(v),x=X.lin(lx(40),lx(1200),Lm,W-R);const mx=Math.max(...s.by_L.map(r=>r.frac))*1.15;const y=X.lin(0,mx,H-B,T);let g='';
    for(let k=0;k<=4;k++){const v=mx*k/4;g+='<line x1="'+Lm+'" x2="'+(W-R)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/>'+X.t(Lm-5,y(v)+4,(100*v).toFixed(1)+'%',{a:'end',fill:'var(--mute)'})}
    xs.forEach(v=>{g+=X.t(x(lx(v)),H-B+15,v,{a:'middle',fill:'var(--mute)'})});
    const line=(f,col,lab)=>{let d='';s.by_L.forEach((r,k)=>{d+=(k?'L':'M')+x(lx(r.L)).toFixed(1)+' '+y(f(r)).toFixed(1)});g+='<path d="'+d+'" fill="none" stroke="'+col+'" stroke-width="2"/>';s.by_L.forEach(r=>{g+='<circle cx="'+x(lx(r.L)).toFixed(1)+'" cy="'+y(f(r)).toFixed(1)+'" r="3.5" fill="'+col+'"/>'})};
    line(r=>r.frac,'var(--bad)');line(r=>r.bytes_keep_one/s.text_bytes,'var(--acc)');
    g+=X.t(W-R,T+10,'remove every copy',{a:'end',fill:'var(--bad)',fs:11});g+=X.t(W-R,T+24,'keep one copy',{a:'end',fill:'var(--acc)',fs:11});
    g+=X.t((Lm+W-R)/2,H-3,'minimum span length L, bytes (log scale)',{a:'middle',fill:'var(--mute)',fs:10.5});
    el.innerHTML=X.svg(W,H,g,'Share of bytes in repeated spans against minimum span length');
    $('dd-sa-tab').innerHTML='<thead><tr><th class="num">L</th><th class="num">bytes in repeated spans</th><th class="num">keep one copy</th><th class="num">distinct spans</th><th class="num">docs touched</th><th class="num">docs losing 90%+</th></tr></thead><tbody>'+
      s.by_L.map(r=>'<tr><td class="num">'+r.L+'</td><td class="num">'+X.fmt(r.bytes)+' ('+X.pct(r.frac,2)+')</td><td class="num">'+X.fmt(r.bytes_keep_one)+' ('+X.pct(r.bytes_keep_one/s.text_bytes,2)+')</td><td class="num">'+X.fmt(r.distinct_spans)+'</td><td class="num">'+X.fmt(r.docs_touched)+'</td><td class="num">'+X.fmt(r.docs_90pct_removed)+'</td></tr>').join('')+'</tbody>';}
  X.seg($('dd-sa-stage'),m=>{stg=m;chart()});chart();X.onRender(chart);
  $('dd-sa-spans').innerHTML='<thead><tr><th>span (start)</th><th class="num">bytes</th><th class="num">documents</th></tr></thead><tbody>'+D.spans.map(s=>'<tr><td style="overflow-wrap:anywhere">'+X.esc(s[3].trim().slice(0,150))+'…</td><td class="num">'+X.fmt(s[2])+'</td><td class="num">'+s[0]+'</td></tr>').join('')+'</tbody>';
  const e=SU.extracted.by_L.find(r=>r.L===100);
  $('dd-pr3-a').textContent='About a quarter: '+X.fmt(e.bytes_keep_one)+' of '+X.fmt(e.bytes)+' bytes ('+X.pct(e.bytes_keep_one/e.bytes,0)+').';
})();
