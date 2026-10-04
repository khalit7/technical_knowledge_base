// ---- Reading, Rate limiting: one fixed trace through five limiters (limit 10 per second). recompute.py runs the same code ----
window.RLIM=(function(){
  function trace(){const a=[];let k;
    for(k=0;k<14;k++)a.push(100+200*k);
    for(k=0;k<10;k++)a.push(2900+10*k);for(k=0;k<10;k++)a.push(3000+10*k);
    for(k=0;k<6;k++)a.push(3300+200*k);
    for(k=0;k<25;k++)a.push(4500+10*k);
    for(k=0;k<10;k++)a.push(5000+200*k);
    return a}
  const L=10,WIN=1000;
  function run(alg){const T=trace(),out=[];const acc=[];
    let tokens=L,last=0,lastRel=-1e9;const cnt={};
    T.forEach(t=>{let ok=false,rel=t;
      if(alg==='fixed'){const w=Math.floor(t/WIN);cnt[w]=cnt[w]||0;if(cnt[w]<L){cnt[w]++;ok=true}}
      else if(alg==='log'){let n=0;for(const x of acc)if(x>t-WIN)n++;ok=n<L}
      else if(alg==='slide'){const w=Math.floor(t/WIN);const cur=cnt[w]||0,prev=cnt[w-1]||0;const est=prev*(WIN-(t-w*WIN))/WIN+cur;if(est<L){cnt[w]=cur+1;ok=true}}
      else if(alg==='token'){tokens=Math.min(L,tokens+(t-last)*L/WIN);last=t;if(tokens>=1){tokens-=1;ok=true}}
      else if(alg==='leaky'){let waiting=0;for(const x of acc)if(x>t)waiting++;
        if(waiting<L){rel=Math.max(t,lastRel+WIN/L);lastRel=rel;ok=true}}
      if(ok)acc.push(rel);
      out.push({t:t,ok:ok,rel:rel});
    });
    // busiest one-second span of accepted (released) requests
    const r=acc.slice().sort((a,b)=>a-b);let mx=0;for(let i=0;i<r.length;i++){let j=i;while(j<r.length&&r[j]<r[i]+WIN)j++;mx=Math.max(mx,j-i)}
    let maxWait=0;out.forEach(o=>{if(o.ok)maxWait=Math.max(maxWait,o.rel-o.t)});
    return {out:out,accepted:acc.length,rejected:T.length-acc.length,busiest:mx,maxWait:maxWait}}
  const ALGS=[['fixed','Fixed window'],['log','Sliding log'],['slide','Sliding window counter'],['token','Token bucket (10, refill 10/s)'],['leaky','Leaky bucket queue (10 waiting)']];
  return {trace:trace,run:run,ALGS:ALGS};
})();
(function(){
  const svg=document.getElementById('rd-rl-svg'),tab=document.getElementById('rd-rl-tab');if(!svg)return;
  const res=RLIM.ALGS.map(a=>[a,RLIM.run(a[0])]);
  function draw(){const W=Math.max(300,Math.min(860,RD.width(svg)));const x0=0,x1=W-4,T=7000,X=t=>x0+(x1-x0)*t/T;const rh=40;let b='';
    for(let s=0;s<=7;s++)b+='<line x1="'+X(s*1000)+'" x2="'+X(s*1000)+'" y1="0" y2="'+(res.length*rh+4)+'" stroke="var(--line)"/>'+RD.t(X(s*1000)+(s===7?-2:2),res.length*rh+16,s+' s',{fs:9.5,a:s===7?'end':'start',fill:'var(--mute)'});
    res.forEach((p,i)=>{const y=i*rh+20;b+=RD.t(2,y-6,p[0][1],{fs:10.5,w:600});
      p[1].out.forEach(o=>{const c=!o.ok?'var(--bad)':(o.rel>o.t?'var(--c4)':'var(--good)');
        if(o.ok&&o.rel>o.t)b+='<line x1="'+X(o.t)+'" x2="'+X(o.rel)+'" y1="'+(y+6)+'" y2="'+(y+6)+'" stroke="var(--c4)" stroke-width="1" opacity=".5"/>';
        b+='<rect x="'+(X(o.ok?o.rel:o.t)-1)+'" y="'+(o.ok?y:y+9)+'" width="2" height="'+(o.ok?12:8)+'" fill="'+c+'"/>'})});
    svg.innerHTML=RD.svg(W,res.length*rh+20,b,'Accepted and rejected requests over 7 seconds for five rate limiting algorithms')}
  tab.innerHTML='<thead><tr><th>Algorithm</th><th class="num">Accepted</th><th class="num">Rejected</th><th class="num">Most in any 1 s</th><th class="num">Longest wait</th></tr></thead><tbody>'+
    res.map(p=>'<tr><td>'+p[0][1]+'</td><td class="num">'+p[1].accepted+'</td><td class="num">'+p[1].rejected+'</td><td class="num">'+p[1].busiest+'</td><td class="num">'+(p[1].maxWait?p[1].maxWait+' ms':'0')+'</td></tr>').join('')+'</tbody>';
  draw();RD.onRender(draw);RD.onResize(draw);
})();
