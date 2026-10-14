// ---- Reading tab, sections 5 and 6: hybrid and rerank chart, lever calculator ----
(function(){
  const D=window.RD_DATA;
  const hs=document.getElementById('rd-hyb-svg');
  if(hs){
    let mode='rrf';
    function drawRRF(W){
      const H=D.hybrid,rows=H.rows,lw=Math.min(170,Math.max(118,W*0.33)),rh=34,top=22,Hh=top+rows.length*rh+26;
      const lo=0.62,hi=0.79,x=v=>lw+(W-lw-16)*(v-lo)/(hi-lo);
      let s='<line x1="'+x(H.bm25)+'" y1="12" x2="'+x(H.bm25)+'" y2="'+(Hh-20)+'" stroke="var(--c2)" stroke-dasharray="4 3"/>'+RD.t(x(H.bm25)+3,12,'BM25 alone '+H.bm25.toFixed(3),{fs:10.5,fill:'var(--c2)'});
      rows.forEach((r,i)=>{const y=top+i*rh+10,up=r.rrf>r.alone,col=up?'var(--good)':'var(--bad)';
        s+=RD.t(lw-8,y+4,RD.esc(r.name),{a:'end',fs:11.5});
        s+='<line x1="'+x(r.alone)+'" y1="'+y+'" x2="'+x(r.rrf)+'" y2="'+y+'" stroke="'+col+'" stroke-width="2.5"/>';
        s+='<circle cx="'+x(r.alone)+'" cy="'+y+'" r="5" fill="var(--bg)" stroke="var(--mute)" stroke-width="2"/>';
        s+='<path d="M'+x(r.rrf)+' '+y+' l'+(up?-7:7)+' -5 v10 z" fill="'+col+'"/>';
        s+=RD.t(lw-8,y+15,r.alone.toFixed(3)+' to '+r.rrf.toFixed(3),{a:'end',fs:10,fill:'var(--mute)'});});
      [0.65,0.70,0.75].forEach(v=>{s+=RD.t(x(v),Hh-4,v.toFixed(2),{a:'middle',fs:10,fill:'var(--mute)'})});
      hs.innerHTML=RD.svg(W,Hh,s,'nDCG@10 of each model alone and fused with BM25');
      document.getElementById('rd-hyb-note').innerHTML='Hollow dot: the model alone; arrowhead: fused with BM25 by RRF (k 60). Green up, orange down. Fusion lifts the three models within about 0.06 of BM25 and lowers the two that beat it clearly.';
    }
    function drawRR(W){
      const R=D.rerank,lw=Math.min(190,Math.max(134,W*0.36)),rh=34,top=8;
      const rows=[{name:'Fused, no reranker',params:'',a:R.first,b:null}].concat(R.rows.map(r=>({name:r.name,params:r.params,a:r.k20,b:r.k30,c:r.k100})));
      const Hh=top+rows.length*rh+24,lo=0.6,hi=0.8,x=v=>lw+(W-lw-50)*(v-lo)/(hi-lo);
      let s='<line x1="'+x(R.first)+'" y1="4" x2="'+x(R.first)+'" y2="'+(Hh-20)+'" stroke="var(--mute)" stroke-dasharray="4 3"/>';
      rows.forEach((r,i)=>{const y=top+i*rh;
        s+=RD.t(lw-8,y+13,RD.esc(r.name),{a:'end',fs:11.5});if(r.params)s+=RD.t(lw-8,y+25,r.params,{a:'end',fs:9.5,fill:'var(--mute)'});
        const bar=(v,yy,col,lab)=>'<rect x="'+lw+'" y="'+yy+'" width="'+Math.max(1,x(v)-lw)+'" height="11" rx="2" fill="'+col+'"/>'+RD.t(x(v)+4,yy+9.5,v.toFixed(3)+(lab?' '+lab:''),{fs:10.5});
        if(r.b===null){s+=bar(r.a,y+6,'var(--mute)','')}
        else{const col=r.a>R.first?'var(--acc)':'var(--bad)';s+=bar(r.a,y+2,col,'K 20')+bar(r.b,y+15,col,'K 30')}});
      s+=RD.t(lw,Hh-4,'nDCG@10, axis from 0.60',{fs:10,fill:'var(--mute)'});
      hs.innerHTML=RD.svg(W,Hh,s,'nDCG@10 of the fused list after each reranker');
      const mini=R.rows.find(r=>r.key==='ce-minilm-l6');
      document.getElementById('rd-hyb-note').innerHTML='Dashed line: the fused list alone ('+R.first.toFixed(3)+'; recall@30 '+R.recall30.toFixed(3)+'). The two large rerankers lift it; the small web-trained cross-encoder lowers it, and further the deeper it reads ('+mini.k100.toFixed(3)+' at K 100).';
    }
    function draw(){const W=RD.width(hs);mode==='rrf'?drawRRF(W):drawRR(W)}
    RD.seg(document.getElementById('rd-hyb-mode'),m=>{mode=m;draw()});
    RD.onRender(draw);RD.onResize(draw);draw();
  }

  // lever calculator
  const lv=document.getElementById('rd-lev-svg');
  if(lv){
    const F=D.fates.agg_on,g=id=>document.getElementById(id);
    const P={meas:{n:188,r:F.in_K/188,p:F.in_k/F.in_K,g:F.correct_strict/F.in_k},old:{n:200,r:0.9,p:0.833,g:0.9}};
    // exact preset values are kept until a slider moves (a slider would round them to its step)
    let cur={};
    function set(pr){cur=Object.assign({},P[pr]);g('rd-lev-n').value=cur.n;g('rd-lev-r').value=cur.r;g('rd-lev-p').value=cur.p;g('rd-lev-g').value=cur.g;draw()}
    function draw(){
      const N=cur.n,r=cur.r,p=cur.p,gg=cur.g;
      g('rd-lev-nv').textContent=N;g('rd-lev-rv').textContent=r.toFixed(3);g('rd-lev-pv').textContent=p.toFixed(3);g('rd-lev-gv').textContent=gg.toFixed(3);
      const A=r*p*gg,mR=N*(1-r),mK=N*r*(1-p),mG=N*r*p*(1-gg),ok=N*A;
      const W=RD.width(lv),H=58,x=v=>W*v/N;
      const segs=[[ok,'var(--c3)','correct'],[mG,'var(--c4)','generation'],[mK,'var(--c5)','ranking'],[mR,'var(--c2)','retrieval']];
      let s='',x0=0;
      segs.forEach(sg=>{const w=x(sg[0]);s+='<rect x="'+x0+'" y="4" width="'+Math.max(0,w)+'" height="26" fill="'+sg[1]+'"/>';
        if(w>54)s+=RD.t(x0+4,22,Math.round(sg[0])+' '+sg[2],{fs:11,fill:'var(--bg)',w:600});x0+=w});
      s+=RD.t(0,48,'0',{fs:10,fill:'var(--mute)'})+RD.t(W,48,N+' questions',{a:'end',fs:10,fill:'var(--mute)'});
      lv.innerHTML=RD.svg(W,H,s,'Questions by fate');
      const best=[['r = 1',p*gg],['p = 1',r*gg],['g = 1',r*p]].sort((a,b)=>b[1]-a[1])[0];
      g('rd-lev-out').innerHTML=RD.stat('A = r &times; p &times; g',A.toFixed(3),Math.round(ok)+' of '+N+' correct')+
        RD.stat('Buckets: retrieval, ranking, generation',Math.round(mR)+', '+Math.round(mK)+', '+Math.round(mG),'add up to '+Math.round(mR+mK+mG)+' = N(1 &minus; A)')+
        RD.stat('A if r were perfect',(p*gg).toFixed(3),'+'+(p*gg-A).toFixed(3))+
        RD.stat('A if p were perfect',(r*gg).toFixed(3),'+'+(r*gg-A).toFixed(3))+
        RD.stat('A if g were perfect',(r*p).toFixed(3),'+'+(r*p-A).toFixed(3))+
        RD.stat('Best single lever',best[0],'gives '+best[1].toFixed(3));
    }
    [['rd-lev-n','n'],['rd-lev-r','r'],['rd-lev-p','p'],['rd-lev-g','g']].forEach(([id,k])=>g(id).addEventListener('input',()=>{cur[k]=+g(id).value;draw()}));
    RD.seg(g('rd-lev-pre'),set);
    RD.onRender(draw);RD.onResize(draw);set('meas');
  }
})();
