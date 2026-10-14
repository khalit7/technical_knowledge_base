// ---- Reading tab, sections 2 to 4: BM25 calculator, models across datasets, memory bill ----
(function(){
  const D=window.RD_DATA;
  const fmt=(x,d)=>Number(x).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});

  // BM25 (bm25s / Lucene 8+ form, no (k1 + 1) factor)
  const B=D.bm25,k1El=document.getElementById('rd-bm-k1'),bEl=document.getElementById('rd-bm-b');
  if(k1El){
    const idf=df=>Math.log(1+(B.N-df+0.5)/(df+0.5));
    const post=document.getElementById('rd-bm-post');
    const t0=B.docs[0].terms;
    post.innerHTML='<div><b>query terms</b> '+B.tokens.join(' &middot; ')+'</div>'+t0.map(t=>'<div><b>'+t.t+'</b>: in '+fmt(t.df,0)+' of '+fmt(B.N,0)+' abstracts, IDF '+idf(t.df).toFixed(3)+'</div>').join('');
    function draw(){
      const k1=+k1El.value,b=+bEl.value;
      document.getElementById('rd-bm-k1v').textContent=k1.toFixed(1);document.getElementById('rd-bm-bv').textContent=b.toFixed(2);
      const rows=B.docs.map(d=>{const norm=1-b+b*d.len/B.avgdl;
        const parts=d.terms.map(t=>t.tf?idf(t.df)*t.tf/(t.tf+k1*norm):0);return {d,parts,score:parts.reduce((a,c)=>a+c,0)}});
      const head='<tr><th>Abstract</th>'+B.tokens.map(t=>'<th class="num">'+t+'<br><span class="mute">tf, points</span></th>').join('')+'<th class="num">length</th><th class="num">score</th></tr>';
      const body=rows.map(r=>'<tr><td>'+(r.d.rel?'<b style="color:var(--good)">relevant</b>: ':'not relevant: ')+RD.esc(r.d.title)+'</td>'+
        r.d.terms.map((t,i)=>'<td class="num">'+t.tf+', '+r.parts[i].toFixed(2)+'</td>').join('')+'<td class="num">'+r.d.len+'</td><td class="num"><b>'+r.score.toFixed(3)+'</b></td></tr>').join('');
      document.getElementById('rd-bm-tbl').innerHTML='<thead>'+head+'</thead><tbody>'+body+'</tbody>';
      const rel=rows.find(r=>r.d.rel),oth=rows.find(r=>!r.d.rel);
      const def=Math.abs(k1-1.2)<1e-9&&Math.abs(b-0.75)<1e-9;
      document.getElementById('rd-bm-note').innerHTML=(rel.score>oth.score?'<b>The relevant abstract now scores higher.</b> ':'<b>The abstract not labelled relevant wins.</b> ')+
        'It says "statin" 7 times and "cholesterol" 3 times; the relevant one says "statin" once, "cholesterol" twice and "blood" once, and is shorter. '+
        (def?'At the defaults the scores are the recorded ones (8.963 and 7.366). ':'')+
        'Lower k<sub>1</sub> to stop rewarding repetition: at k<sub>1</sub> = 0 every matched term counts once, by its IDF alone. BM25 cannot see that the relevant abstract is about the claim\'s whole idea; a reranker that reads both texts can (section 5).';
    }
    [k1El,bEl].forEach(e=>e.addEventListener('input',draw));
    document.getElementById('rd-bm-reset').addEventListener('click',()=>{k1El.value=1.2;bEl.value=0.75;draw()});
    draw();
  }

  // models across datasets: horizontal bars
  const ms=document.getElementById('rd-mod-svg');
  if(ms){
    let set='scifact';
    const label={scifact:'SciFact',nfcorpus:'NFCorpus',hotpot:'multi-hop HotpotQA'};
    function draw(){
      const W=RD.width(ms),rows=[...D.models].sort((a,b)=>b[set]-a[set]);
      const lw=Math.min(170,Math.max(112,W*0.3)),rh=26,top=6,H=top+rows.length*rh+22;
      const max=Math.max(...rows.map(r=>r[set]))*1.12,x=v=>lw+(W-lw-50)*v/max;
      let s='';
      rows.forEach((r,i)=>{const y=top+i*rh;const best=i===0;
        s+=RD.t(lw-6,y+15,RD.esc(r.name),{a:'end',fs:11.5,w:best?600:400});
        s+=RD.t(lw-6,y+25,r.params,{a:'end',fs:9.5,fill:'var(--mute)'});
        s+='<rect x="'+lw+'" y="'+(y+5)+'" width="'+Math.max(1,x(r[set])-lw)+'" height="14" rx="3" fill="'+(r.key==='bm25'?'var(--c2)':'var(--acc)')+'" opacity="'+(best?1:0.75)+'"/>';
        s+=RD.t(x(r[set])+4,y+16,r[set].toFixed(3),{fs:11.5,w:best?600:400});});
      s+=RD.t(lw,H-6,'nDCG@10, higher is better',{fs:10.5,fill:'var(--mute)'});
      ms.innerHTML=RD.svg(W,H,s,'nDCG@10 by retriever on '+label[set]);
      const top1=rows[0];
      document.getElementById('rd-mod-note').innerHTML='Best on '+label[set]+': <b>'+RD.esc(top1.name)+'</b> ('+top1.params+'). '+
        (set==='scifact'?'BM25 beats the smallest embedding model; the 0.6 B Qwen3 is third.':set==='nfcorpus'?'Every system scores low: queries have about 38 relevant documents each; Qwen3 leads, the rest are close.':'The 33 M bge-small leads, just ahead of gte-modernbert; Qwen3-Embedding is third even though it trained on HotpotQA.');
    }
    RD.seg(document.getElementById('rd-mod-set'),m=>{set=m;draw()});
    RD.onRender(draw);RD.onResize(draw);draw();
  }

  // memory bill and exact scan
  const mo=document.getElementById('rd-mem-out');
  if(mo){
    const g=id=>document.getElementById(id);
    const human=b=>b>=1e12?fmt(b/1e12,2)+' TB':b>=1e9?fmt(b/1e9,2)+' GB':b>=1e6?fmt(b/1e6,1)+' MB':fmt(b/1e3,1)+' KB';
    const ms_=s=>s>=1?fmt(s,2)+' s':s>=0.001?fmt(s*1e3,s<0.01?2:0)+' ms':fmt(s*1e6,0)+' &micro;s';
    function draw(){
      const n=+g('rd-mem-n').value,d=+g('rd-mem-d').value,f=+g('rd-mem-f').value,M=+g('rd-mem-m').value;
      const vb=n*d*f,gb=M?n*(2*M*4+4):0,scan=vb/37e9;
      mo.innerHTML=RD.stat('Vectors',human(vb),fmt(d*f,d*f<1?3:0)+' bytes each')+
        RD.stat('HNSW layer-0 links',M?human(gb):'none',M?(2*M*4+4)+' bytes per vector':'')+
        RD.stat('Total in memory',human(vb+gb),'before text, metadata, overhead')+
        RD.stat('Exact scan, one core',ms_(scan),'at 37 GB/s per query');
    }
    ['rd-mem-n','rd-mem-d','rd-mem-f','rd-mem-m'].forEach(id=>g(id).addEventListener('change',draw));
    draw();
  }
})();
