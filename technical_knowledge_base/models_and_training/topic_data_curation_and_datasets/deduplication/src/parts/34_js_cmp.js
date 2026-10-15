// ---- Method comparer (tab t-cmp) ----
(function(){
  const C=DP.cmp,U=DPU,$=id=>document.getElementById(id);
  const n=C.n,BY=C.bytes,TOT=BY.reduce((a,b)=>a+b,0);
  const kb=x=>U.fmt(x/1000)+" kB";
  const st={ex:'on',fz:'minhash',se:'off',sa:'keep'};let an=null;
  const LBL={off:'off',minhash:'MinHash 14 &times; 8',minhash_check:'MinHash + 0.8 check',simhash:'SimHash Hamming &le; 3'};
  function result(o){const c=C.combos[o.ex+'|'+o.fz+'|'+o.se];
    const sa=o.sa==='off'?[]:(o.sa==='all'?c.sa_all:c.sa_keep);
    return {c,sa,steps:[o.ex==='on'?c.exact:[],o.fz!=='off'?c.fuzzy:[],o.se!=='off'?c.semantic:[],sa]}}
  function stats(r,upto){let docs=n,bytes=TOT;const per=[];
    for(let s=0;s<4;s++){let d=0,b=0;if(s<=upto){if(s<3){d=r.steps[s].length;b=r.steps[s].reduce((a,x)=>a+BY[x],0)}else{b=r.steps[3].reduce((a,x)=>a+x[1],0);d=0}}
      docs-=d;bytes-=b;per.push({d,b})}
    return {docs,bytes,per}}
  const STEPN=['all 2,692 documents','after exact hashing','after the fuzzy step','after semantic dedup','after the suffix array'];
  function draw(i){const r=result(st),el=$('dp-cmp-grid'),w=Math.min(760,RD.width(el));
    const cols=Math.max(30,Math.floor(w/9)),cs=Math.floor(w/cols),rows=Math.ceil(n/cols),h=rows*cs+2;
    const fate=new Array(n).fill(-1);for(let s=0;s<3;s++)if(s<i)r.steps[s].forEach(x=>fate[x]=s);
    const cut=new Map();if(i>=4)r.steps[3].forEach(x=>cut.set(x[0],x[1]/BY[x[0]]));
    const col=['var(--c5)','var(--bad)','var(--c4)'];let g='';
    for(let k=0;k<n;k++){const x=(k%cols)*cs,y=Math.floor(k/cols)*cs,f=fate[k];
      if(f>=0){g+='<rect x="'+x+'" y="'+y+'" width="'+(cs-1)+'" height="'+(cs-1)+'" fill="'+col[f]+'"/>';continue}
      g+='<rect x="'+x+'" y="'+y+'" width="'+(cs-1)+'" height="'+(cs-1)+'" fill="var(--acc)" opacity=".55"/>';
      const c=cut.get(k);if(c)g+='<rect x="'+x+'" y="'+y+'" width="'+(cs-1)+'" height="'+Math.max(1,(cs-1)*Math.min(1,c)).toFixed(1)+'" fill="var(--c6)"/>'}
    el.innerHTML=RD.svg(cols*cs,h,g,'Grid of 2,692 documents coloured by the step that removed them');
    const S=stats(r,i-1),s=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+d+'</div></div>';
    $('dp-cmp-cnt').innerHTML=s('documents left',U.fmt(S.docs),U.pct(1-S.docs/n)+' removed')+s('text left',kb(S.bytes),U.pct(1-S.bytes/TOT)+' of '+kb(TOT)+' removed')+
      ['exact','fuzzy','semantic','suffix array'].map((nm,k)=>s(nm,k<3?S.per[k].d+' docs':kb(S.per[k].b),k<i?kb(S.per[k].b)+' of text':'not yet run')).join('');
    const cap=['Before: the 2,692 documents that reach dedup in run0.',
      st.ex==='on'?'Exact document hashes remove '+r.steps[0].length+' byte-identical copies (the first copy stays).':'Exact hashing is off.',
      st.fz==='off'?'No fuzzy step.':LBL[st.fz]+' removes '+r.steps[1].length+' more'+(st.ex==='on'&&st.fz!=='simhash'?': the near copies exact hashing cannot see, and the rest of each MinHash cluster.':'.')+(st.fz==='simhash'?' 64 bits at Hamming 3 only fire on near-identical pages, and exact hashing already took those.':''),
      st.se==='off'?'No semantic step.':'SemDeDup at &epsilon; '+st.se+' removes '+r.steps[2].length+' documents whose embedding is within cosine '+(1-st.se).toFixed(2)+' of one ranked before it in its k-means cluster: consent pages from different plugins, spam that shares no phrase.',
      st.sa==='off'?'No suffix array.':'The suffix array cuts '+kb(stats(r,3).per[3].b)+' of repeated 230-byte spans from '+r.steps[3].length+' surviving documents ('+(st.sa==='keep'?'keeping the first copy of each span':'removing every copy, the tool\'s default output')+'): boilerplate inside pages that are otherwise different.'];
    $('dp-cmp-cap').innerHTML='<b>'+STEPN[i]+'.</b> '+cap[i]}
  function table(){const row=(ex,fz)=>'<tr><td>'+(ex==='on'?'exact + ':'')+LBL[fz]+'</td>'+['off','0.05','0.1'].map(se=>{const r=result({ex,fz,se,sa:st.sa}),S=stats(r,3);
      const cur=ex===st.ex&&fz===st.fz&&se===st.se;return '<td class="num"'+(cur?' style="font-weight:700"':'')+'>'+U.fmt(S.docs)+' / '+kb(S.bytes)+'</td>'}).join('')+'</tr>';
    let h='<thead><tr><th>exact and fuzzy</th><th class="num">semantic off</th><th class="num">&epsilon; 0.05</th><th class="num">&epsilon; 0.1</th></tr></thead><tbody>';
    ['off','on'].forEach(ex=>Object.keys(LBL).forEach(fz=>{h+=row(ex,fz)}));$('dp-cmp-tab').innerHTML=h+'</tbody>'}
  const upd=()=>{an.go(4);table()};
  ['ex','fz','se','sa'].forEach(k=>RD.seg($('dp-cmp-'+k),m=>{st[k]=m;upd()}));
  an=RD.anim({card:'dp-cmp-card',ctl:'dp-cmp-ctl',n:5,draw,ms:1700,label:'Dedup step'});
  table();
  U.onTab('t-cmp',()=>an.redraw());
  window.DPCMP={result,stats};
})();
