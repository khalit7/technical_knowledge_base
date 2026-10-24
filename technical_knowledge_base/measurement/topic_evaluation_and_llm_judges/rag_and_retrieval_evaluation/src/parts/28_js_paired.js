// ---- Reading: per-query paired comparison of two retrievers (nDCG@10, linear gain); interval from src/paired.py (window.PAIRED) ----
(function(){
  const el=document.getElementById('pd-svg');if(!el)return;
  let ds='scifact',pair='bm25_lucene|dense_minilm';
  function pq(si){return RDATA.beir[ds].Q.map(q=>{const fl=q[3][si];let d=0;for(let j=0;j<fl.length;j+=2)if(fl[j]<=10)d+=fl[j+1]/Math.log2(fl[j]+1);return d/q[1]})}
  window.PDCALC=(d,a,b)=>{const o=ds;ds=d;const A=pq(RDATA.sys.indexOf(a)),B=pq(RDATA.sys.indexOf(b));ds=o;const dl=A.map((x,i)=>B[i]-x);
    return {A,B,dl,mean:dl.reduce((s,x)=>s+x,0)/dl.length,w:dl.filter(x=>x>1e-9).length,t:dl.filter(x=>Math.abs(x)<=1e-9).length,l:dl.filter(x=>x<-1e-9).length}};
  function draw(){
    const [a,b]=pair.split('|'),R=PDCALC(ds,a,b),N=R.dl.length,s=R.dl.slice().sort((x,y)=>y-x);
    const W=RD.width(el),H=200,ml=34,mr=8,mt=16,mb=22,pw=W-ml-mr,ph=H-mt-mb,y0=mt+ph/2,bw=pw/N;
    const Y=v=>y0-v*ph/2;let g='';
    [-1,-0.5,0,0.5,1].forEach(v=>{g+='<line x1="'+ml+'" x2="'+(ml+pw)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.lines(ml-4,Y(v)+4,[(v>0?'+':'')+v],{a:'end',cls:'m'})});
    let p='',n='';
    s.forEach((v,i)=>{if(Math.abs(v)<=1e-9)return;const x=(ml+i*bw).toFixed(2),w=Math.max(bw,0.6).toFixed(2);
      const r='<rect x="'+x+'" y="'+Math.min(Y(v),y0).toFixed(1)+'" width="'+w+'" height="'+Math.abs(Y(v)-y0).toFixed(1)+'"/>';if(v>0)p+=r;else n+=r});
    g+='<g fill="var(--good)" shape-rendering="crispEdges">'+p+'</g><g fill="var(--bad)" shape-rendering="crispEdges">'+n+'</g>';
    g+='<line x1="'+ml+'" x2="'+(ml+pw)+'" y1="'+y0+'" y2="'+y0+'" stroke="var(--ink)"/>';
    g+=RD.lines(ml+pw-4,mt+10,[RUN.SS[b]+' better: '+R.w],{a:'end',fill:'var(--good)',w:600})+RD.lines(ml+4,H-mb-6,[RUN.SS[a]+' better: '+R.l],{fill:'var(--bad)',w:600});
    g+=RD.lines(ml+pw/2,H-4,[N+' queries, sorted; '+R.t+' ties'],{a:'middle',cls:'m'});
    el.innerHTML=RD.svg(W,H,g,'Per-query difference in nDCG@10 between '+RUN.SS[b]+' and '+RUN.SS[a]+' on '+RDATA.beir[ds].name);
    const P=(window.PAIRED&&PAIRED.pairs[ds+'|'+pair])||null,f=x=>(x>0?'+':'')+x.toFixed(3);
    const m=x=>x.reduce((s,v)=>s+v,0)/x.length;
    document.getElementById('pd-cnt').innerHTML=RD.stat(RUN.SS[a],m(R.A).toFixed(3),'mean nDCG@10')+RD.stat(RUN.SS[b],m(R.B).toFixed(3),'mean nDCG@10')+
      RD.stat('Mean difference',f(R.mean),'second minus first')+RD.stat('95% interval',P?f(P.ci95[0])+' to '+f(P.ci95[1]):'n/a',P?(P.ci95[0]>0||P.ci95[1]<0?'excludes 0: a result':'includes 0: not resolved'):'');
  }
  RD.seg(document.getElementById('pd-set'),m=>{ds=m;draw()});
  RD.seg(document.getElementById('pd-pair'),m=>{pair=m;draw()});
  RD.onRender(draw);RD.onResize(draw);draw();
})();
