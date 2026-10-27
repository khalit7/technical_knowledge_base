// ---- The paper tab: Figure 1 redrawn with the toy's retrieval, Table 1 bars, toy numbers in the prose, hot-swap reveal ----
const RW=window.RAGW,WD=window.WORLD;
const pct=(v,d)=>(100*v).toFixed(d==null?0:d)+'%';
const res=(name,seed)=>RW.results[name+'_s'+(seed||0)];
// the default demo question: "novels by" the first held-out author
const DEMO_A=[...WD.testA].sort((a,b)=>a-b)[0];
const demoQ=(task,ent,tpl)=>WD.questions.find(q=>q.task===task&&(q.ai===ent||q.ci===ent||q.pi===ent)&&q.tpl===(tpl||0));
const IDX18=RAG.makeIndex(WD.index('2018')),IDX16=RAG.makeIndex(WD.index('2016'));
// fill <span class="toy" data-k="...">
(function(){const q=s=>document.querySelectorAll('.toy[data-k="'+s+'"]');
  const set=(k,v)=>q(k).forEach(e=>e.textContent=v);
  ['tok','seq'].forEach(m=>{const r=RW.variants[m].test_q;['president','capital','born','novels','all'].forEach(t=>set(m+'.'+t,pct(r[t].em,1)))});
  const all=[];['tok','seq'].forEach(m=>[0,1,2].forEach(s=>{const r=res(m,s);if(r)all.push([m,r.test.all.em])}));
  const sp=m=>{const v=all.filter(x=>x[0]===m).map(x=>x[1]);return v.length>1?((Math.max(...v)-Math.min(...v))*100).toFixed(1):null};
  const a=sp('tok'),b=sp('seq');set('seedspread',a!=null?('up to '+Math.max(+a,+b).toFixed(1)+' (RAG-Token '+a+', RAG-Sequence '+b+', over '+all.filter(x=>x[0]==='tok').length+' seeds)'):'(seeds still training)');
  set('ndemo',WD.show(WD.A[DEMO_A])+'?');
})();

// Figure 1, redrawn: query encoder, MIPS over the frozen index, top-k documents, generator per document, marginalise
function drawFig1(w){const M=RAG.load('tok'),q=demoQ('novels',DEMO_A),R=RAG.retrieve(M,IDX18,q.x,5);
  const narrow=w<640,docs=R.idx.map((i,j)=>({t:WD.show(IDX18[i].toks),p:Math.exp(R.lpz[j])}));
  let s='',H;const box=(x,y,bw,bh,fill,lines,o)=>{o=o||{};s+=rc(x,y,bw,bh,fill,{s:'var(--line)'});lines.forEach((t,i)=>{s+=tx(x+bw/2,y+bh/2+(i-(lines.length-1)/2)*15+4,t,{a:'middle',fs:o.fs||12,c:i?'var(--mute)':null})})};
  const ar2=(x1,y1,x2,y2)=>{s+=ln2(x1,y1,x2,y2,'var(--mute)',{sw:1.4});const a=Math.atan2(y2-y1,x2-x1),L=7;s+='<path d="M'+x2+','+y2+'L'+(x2-L*Math.cos(a-.4))+','+(y2-L*Math.sin(a-.4))+'L'+(x2-L*Math.cos(a+.4))+','+(y2-L*Math.sin(a+.4))+'z" fill="var(--mute)"/>'};
  if(!narrow){H=300;const cw=(w-40)/5;
    box(4,20,cw-14,56,'var(--soft)',['Question x','"'+WD.show(q.x)+'"'],{fs:11});
    box(cw,20,cw-14,56,'var(--acc2)',['Query encoder','q(x), fine-tuned']);ar2(cw-10,48,cw,48);
    box(cw,200,cw-14,56,'var(--soft)',['Document index','d(z), frozen']);
    box(cw,116,cw-14,44,'var(--bg)',['MIPS: top k','by d(z)·q(x)'],{fs:11});
    ar2(cw*1.5-7,76,cw*1.5-7,116);ar2(cw*1.5-7,200,cw*1.5-7,160);
    const dx=cw*2,dw=cw*1.35;docs.forEach((d,j)=>{const y=24+j*52;s+=rc(dx,y,dw,44,'var(--soft)',{s:'var(--line)'});s+=rc(dx,y+38,dw*d.p,6,'var(--c1)',{r:2});
      s+=tx(dx+6,y+16,d.t.length>34?d.t.slice(0,33)+'…':d.t,{fs:11});s+=tx(dx+6,y+31,'p(z|x) = '+d.p.toFixed(3),{fs:11,c:'var(--mute)'})});
    ar2(cw*2-14,138,dx,138);
    const gx=dx+dw+14,gw=w-gx-4;box(gx,40,gw,70,'var(--acc2)',['Generator pθ','reads z // x,','fine-tuned'],{fs:11});
    box(gx,150,gw,70,'var(--soft)',['Marginalise','Sequence or Token','→ answer y'],{fs:11});ar2(dx+dw,138,gx,90);ar2(gx+gw/2,110,gx+gw/2,150);
  }else{const rows=[['Question x','"'+WD.show(q.x)+'"'],['Query encoder q(x)','fine-tuned'],['MIPS over the index','d(z) frozen, top k by d(z)·q(x)']];let y=4;
    rows.forEach((r,i)=>{box(10,y,w-20,44,i===1?'var(--acc2)':'var(--soft)',r,{fs:11});if(i<2)ar2(w/2,y+44,w/2,y+56);y+=56});
    docs.forEach((d,j)=>{s+=rc(10,y,w-20,40,'var(--soft)',{s:'var(--line)'});s+=rc(10,y+34,(w-20)*d.p,6,'var(--c1)',{r:2});s+=tx(16,y+15,d.t.length>40?d.t.slice(0,39)+'…':d.t,{fs:11});s+=tx(16,y+29,'p(z|x) = '+d.p.toFixed(3),{fs:11,c:'var(--mute)'});y+=46});
    ar2(w/2,y,w/2,y+12);y+=12;box(10,y,w-20,44,'var(--acc2)',['Generator pθ(y | z // x), fine-tuned','one pass per retrieved document'],{fs:11});y+=56;ar2(w/2,y-12,w/2,y);
    box(10,y,w-20,44,'var(--soft)',['Marginalise over z: Sequence or Token','→ answer y'],{fs:11});H=y+48}
  return svgW(w,H,s,'RAG overview: question, query encoder, maximum inner product search over the index, top documents, generator, marginalisation')}
onTab('t-read',()=>fit($('figOne'),w=>{$('figOne').innerHTML=drawFig1(w)}));

// Table 1 as bars: one small chart per dataset, RAG in the accent colour
function drawQA(w){const T=PAPER.tables.t1,cols=T.cols,rows=T.rows;const per=w<560?1:w<820?2:3,cw=(w-(per-1)*12)/per,rh=17,ph=rows.length*rh+30;// rows without a value are left out
  let s='';cols.forEach((c,j)=>{const ox=(j%per)*(cw+12),oy=Math.floor(j/per)*(ph+8),lab=86,bw=cw-lab-40;
    s+=tx(ox,oy+13,c+(c==='TQA-Wiki'?' (T5 split)':''),{fs:12,w:600});
    rows.filter(r=>r.v[j]!=null).forEach((r,i)=>{const v=r.v[j],y=oy+22+i*rh;s+=tx(ox+lab-6,y+11,r.m,{fs:11,a:'end',c:'var(--mute)'});
      s+=rc(ox+lab,y+2,bw*v/70,rh-5,r.g==='RAG'?'var(--c1)':r.g==='Open book'?'var(--c3)':'var(--c2)',{r:2});s+=tx(ox+lab+bw*v/70+4,y+11,v.toFixed(1),{fs:11})})});
  const n=Math.ceil(cols.length/per);return svgW(w,n*(ph+8),s,'Table 1 exact match bars per dataset')}
onTab('t-read',()=>fit($('qaBars'),w=>{$('qaBars').innerHTML=drawQA(w)+'<p class="small mute"><span class="legend-i"><i style="background:var(--c2)"></i>closed book</span> <span class="legend-i"><i style="background:var(--c3)"></i>open book (retrieve and extract)</span> <span class="legend-i"><i style="background:var(--c1)"></i>RAG</span> · exact match, test sets, as printed in %T1%; bars to scale from 0.</p>'.replace('%T1%','<a href="'+PAPER.meta.ax+'#S4.T2" target="_blank" rel="noopener noreferrer">Table 1</a>')}));

// hot-swap reveal: the toy's measured 2 x 2, then one live example
PRED_REVEAL['pr-swap']=function(){const sw=RW.variants.tok.swap_q,el=$('swapToy');
  const cell=(i,l)=>'<td class="num">'+pct(sw['all_index'+i+'_leaders'+l])+'</td>';
  const ci=WD.changed.find(i=>WD.testC.has(i)),x=['who','is','the','president','of',...WD.C[ci],'?'],M=RAG.load('tok');
  const a16=RAG.answer(M,IDX16,x).y,a18=RAG.answer(M,IDX18,x).y;
  el.innerHTML='<div class="tw"><table><thead><tr><th>Toy RAG-Token, '+sw.all_n+' changed presidents</th><th class="num">2016 leaders</th><th class="num">2018 leaders</th></tr></thead><tbody><tr><td>2016 index</td>'+cell('2016','2016')+cell('2016','2018')+'</tr><tr><td>2018 index</td>'+cell('2018','2016')+cell('2018','2018')+'</tr></tbody></table></div>'+
   '<p class="small">Live, a held-out country: "'+WD.show(x)+'" with the 2016 index: <b>'+WD.show(a16)+'</b> (2016 truth '+WD.show(WD.P16[ci])+'); with the 2018 index: <b>'+WD.show(a18)+'</b> (2018 truth '+WD.show(WD.P18[ci])+'). Same weights.</p>'+
   '<p class="small mute">The toy\'s questions all use one template on clean, made-up documents, so its matched-index scores are an upper bound on what reading can do; the paper does not analyse its remaining errors (30% and 32% matched, 12% and 4% mismatched).</p>'};
