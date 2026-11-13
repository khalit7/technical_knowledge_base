// ---- The paper tab: shared toy data for the scenes, Table 1 bars, toy numbers in the prose, hot-swap reveal ----
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

// Figure 1 is the 3D stage in 31_js_sc_hero.js (2026-11-13).


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
