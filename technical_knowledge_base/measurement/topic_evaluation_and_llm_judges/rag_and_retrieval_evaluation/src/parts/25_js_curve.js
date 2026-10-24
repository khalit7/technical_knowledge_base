// ---- Reading: recall@k for k = 1..100 from the stored ranks (mirrored by src/paired.py, curves) ----
window.RCURVE=function(ds,si){const Q=RDATA.beir[ds].Q,out=new Array(100).fill(0);
  for(const q of Q){const fl=q[3][si];for(let j=0;j<fl.length;j+=2){const rk=fl[j];if(rk<=100)for(let k=rk;k<=100;k++)out[k-1]+=1/q[0]}}
  return out.map(v=>v/Q.length)};
(function(){
  const el=document.getElementById('rc-svg');if(!el)return;
  let ds='scifact';
  const SY=[['bm25_lucene','BM25','var(--c2)'],['dense_minilm','Dense MiniLM','var(--c1)'],['hybrid_rrf','Hybrid RRF','var(--c3)']];
  function draw(){
    const W=RD.width(el),H=W<520?262:302,ml=40,mr=W<520?84:120,mt=26,mb=34,pw=W-ml-mr,ph=H-mt-mb;
    const cur=SY.map(s=>RCURVE(ds,RDATA.sys.indexOf(s[0])));
    const top=Math.min(1,Math.ceil((Math.max(...cur.map(c=>c[99]))+0.05)*10)/10);
    const X=k=>ml+pw*Math.log(k)/Math.log(100),Y=v=>mt+ph*(1-v/top);
    let b='';
    for(let v=0;v<=top+1e-9;v+=top>0.5?0.2:0.1){b+='<line x1="'+ml+'" x2="'+(ml+pw)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.lines(ml-6,Y(v)+4,[v.toFixed(1)],{a:'end',cls:'m'})}
    [1,3,10,30,100].forEach(k=>{b+=RD.lines(X(k),H-mb+16,[String(k)],{a:'middle',cls:'m'})});
    b+=RD.lines(ml+pw/2,H-4,['k (log scale)'],{a:'middle',cls:'m'});
    [[10,W<520?'prompt':'prompt k = 10'],[100,W<520?'reranker':'reranker reads 100']].forEach(m=>{b+='<line x1="'+X(m[0])+'" x2="'+X(m[0])+'" y1="'+(mt-6)+'" y2="'+(mt+ph)+'" stroke="var(--mute)" stroke-dasharray="4 3"/>'+RD.lines(X(m[0]),mt-10,[m[1]],{a:'middle',cls:'m'})});
    const ends=[];
    SY.forEach((s,i)=>{const c=cur[i];b+='<path d="'+c.map((v,k)=>(k?'L':'M')+X(k+1).toFixed(1)+','+Y(v).toFixed(1)).join(' ')+'" fill="none" stroke="'+s[2]+'" stroke-width="2.2"/>';
      b+='<circle cx="'+X(10)+'" cy="'+Y(c[9])+'" r="3" fill="'+s[2]+'"/>';ends.push([Y(c[99]),s,c[99]])});
    ends.sort((a,b)=>a[0]-b[0]);for(let i=1;i<ends.length;i++)if(ends[i][0]-ends[i-1][0]<15)ends[i][0]=ends[i-1][0]+15;
    ends.forEach(e=>{b+=RD.lines(ml+pw+6,e[0]+4,[(W<520?e[1][1].split(' ')[0]:e[1][1])+' '+e[2].toFixed(3)],{fill:e[1][2],w:600})});
    el.innerHTML=RD.svg(W,H,b,'Recall at k from 1 to 100 for BM25, dense and hybrid retrieval on '+RDATA.beir[ds].name);
    document.getElementById('rc-cap').innerHTML='<b>'+RDATA.beir[ds].name+'</b>: '+SY.map((s,i)=>s[1]+' recall@10 '+cur[i][9].toFixed(3)+', recall@100 '+cur[i][99].toFixed(3)).join('; ')+'.';
  }
  RD.seg(document.getElementById('rc-set'),m=>{ds=m;draw()});
  RD.onRender(draw);RD.onResize(draw);draw();
})();
