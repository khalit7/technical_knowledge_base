// ---- Serving simulator (t-sim): section 3 (a long prompt against eight decodes, chunked or not) and section 4 (load sweep) ----
(function(){
  const S=window.ISIM,U=window.SIMU,D=window.SIMD,$=U.$,L=window.SIMLAB;
  // ---------- section 3 ----------
  if($('sim-stbox')){
    const M=D.models.l8_bf16,HW=D.hw.h100_bf16,PL=12000,T0=0.2;
    const reqs=[];for(let i=0;i<8;i++)reqs.push({id:i,arr:0,P:500,O:400,M:512,g:-1,S:0,conv:i,turn:0});
    reqs.push({id:8,arr:T0,P:PL,O:20,M:512,g:-1,S:0,conv:8,turn:0});
    const base={mode:'cont',kv:'paged',bs:16,nblocks:4000,pc:false,chunk:true,budget:512,maxseq:256,preempt:'recompute',swapbw:25e9,lv:1};
    const modes=[{chunk:false,budget:16384},{chunk:true,budget:512},{chunk:true,budget:2048}];
    const res=modes.map(o=>{const cfg={reqs:reqs,w:{},hw:HW,m:M,c:Object.assign({},base,o),slo:[1,1]};const r=S.run(cfg,true);
      const big=r.reqs.find(q=>q.id===8);let worst=0,wt=0;const gaps=[];
      for(const q of r.reqs){if(q.id===8)continue;for(let k=1;k<q.times.length;k++){const g=q.times[k]-q.times[k-1];if(q.id===0)gaps.push([q.times[k],g]);if(g>worst){worst=g;wt=q.times[k]}}}
      let sum=0,n=0;for(const q of r.reqs){if(q.id===8)continue;for(let k=1;k<q.times.length;k++)if(q.times[k]>T0&&q.times[k-1]<big.first+0.05){sum+=q.times[k]-q.times[k-1];n++}}
      return {r,big,worst,gaps,ttft:big.first-big.arr,mean:n?sum/n:0}});
    $('sim-st-p').textContent=U.n0(PL);
    let cur=0;
    function draw(){const el=$('sim-st-plot'),w=U.width(el),h=w<480?170:200,pl=44,pr=10,pt=10,pb=28;
      let ymax=0,tmax=0;for(const x of res){for(const g of x.gaps){if(g[1]>ymax)ymax=g[1]}tmax=Math.max(tmax,x.big.first+0.15)}
      tmax=Math.min(tmax,0.2+Math.max(...res.map(x=>x.ttft))+0.15);ymax*=1.1;
      const X=t=>pl+(w-pl-pr)*t/tmax,Y=v=>h-pb-(h-pt-pb)*v/ymax;let b='';
      for(const tv of U.ticks(0,ymax*1e3,4)){const y=Y(tv/1e3);b+='<line x1="'+pl+'" x2="'+(w-pr)+'" y1="'+y.toFixed(1)+'" y2="'+y.toFixed(1)+'" class="sim-ax"/>'+U.t(pl-4,y+3,U.sig(tv,3),{a:'end'})}
      for(const tv of U.ticks(0,tmax*1e3,w<480?4:6)){const x=X(tv/1e3);b+=U.t(x,h-pb+13,U.n0(tv)+(tv===0?' ms':''),{a:U.anc(x,w)})}
      b+=U.t(4,pt+6,'time user 1 waits for its next token, ms')+U.t(w-pr,h-3,'time',{a:'end'});
      const xa=X(T0);b+='<line x1="'+xa+'" x2="'+xa+'" y1="'+pt+'" y2="'+(h-pb)+'" stroke="var(--c2)" stroke-dasharray="3 3"/>'+U.t(xa+3,pt+18,'document arrives',{fill:'var(--c2)'});
      // step plot: each gap is drawn over the interval it lasted, so a stall is a plateau
      res.forEach((x,i)=>{let p='';for(const g of x.gaps){if(g[0]-g[1]>tmax)break;p+=(p?'L':'M')+X(g[0]-g[1]).toFixed(1)+' '+Y(g[1]).toFixed(1)+'L'+X(Math.min(g[0],tmax)).toFixed(1)+' '+Y(g[1]).toFixed(1)}
        b+='<path d="'+p+'" fill="none" stroke="'+(i===cur?'var(--c1)':'var(--dim)')+'" stroke-width="'+(i===cur?2:1)+'"/>';
        const xf=X(x.big.first);if(i===cur)b+='<line x1="'+xf+'" x2="'+xf+'" y1="'+pt+'" y2="'+(h-pb)+'" stroke="var(--c3)" stroke-dasharray="2 2"/>'+U.t(Math.min(xf+3,w-90),pt+30,'its first token',{fill:'var(--c3)'})});
      el.innerHTML=U.svg(w,h,b,'Token gaps for one decoding user, around the arrival of a long prompt');
      const x=res[cur];
      $('sim-st-cnt').innerHTML=U.stat('Longest gap for the 8 users',U.ms(x.worst))+U.stat('Document TTFT',U.ms(x.ttft))+U.stat('Mean gap while it is processed',U.ms(x.mean))+U.stat('Steps to prefill it',String(x.r.log.filter(s=>s.np>=Math.min(PL,512)&&s.t>=T0-1e-9).length));
      $('sim-st-note').innerHTML='Same nine requests in all three runs (Llama 3.1 8B BF16 on H100, step model of section 5). The grey lines are the other two settings. Chunking trades a slightly later first token for the document ('+U.ms(res[1].ttft)+' at 512 tokens per step against '+U.ms(res[0].ttft)+' in one piece) for answers that never stall: the longest gap falls from '+U.ms(res[0].worst)+' to '+U.ms(res[1].worst)+'. A bigger budget ('+U.n0(2048)+') sits between the two. vLLM v1 on an H100 uses 8,192 tokens per step by default for the API server.';
    }
    U.seg($('sim-st-mode'),v=>{cur=+v;draw()});
    U.onRender(draw);U.onResize(()=>{if(U.shown())draw()});
  }
  // ---------- section 4 ----------
  if($('sim-swbox')&&L){
    let data=null;
    function sweep(){const base=L.cfgFrom();const r0=base.w.rate>0?base.w.rate:10;const rates=[0.1,0.25,0.4,0.55,0.7,0.85,1,1.2,1.4,1.7,2].map(f=>f*r0);
      const t0=performance.now();
      data=rates.map(rate=>{const cfg=L.cfgFrom();cfg.w.rate=rate;cfg.c.lv=0;const r=S.run(cfg,false);const m=S.metrics(r.reqs,r.engs,cfg.slo);return {rate,m}});
      $('sim-sw-note').textContent=' '+data.length+' runs in '+Math.round(performance.now()-t0)+' ms; base rate '+U.sig(r0,3)+' req/s'+(base.w.rate>0?'':' (the lab was set to all-at-once, so 10 req/s is used)')+'.';
      draw()}
    function draw(){if(!data)return;const el=$('sim-sw-plot'),w=U.width(el),h=w<480?200:240,pl=48,pr=48,pt=10,pb=32;
      let x1=0,y1=0,g1=0;for(const d of data){x1=Math.max(x1,d.m.tps);y1=Math.max(y1,d.m.tpot[0],d.m.ttft[2]);g1=Math.max(g1,d.m.goodput)}
      x1*=1.08;const ylo=1e-3,yhi=y1*1.5;
      const X=v=>pl+(w-pl-pr)*v/x1,Y=v=>h-pb-(h-pt-pb)*(Math.log10(Math.max(v,ylo))-Math.log10(ylo))/(Math.log10(yhi)-Math.log10(ylo)),G=v=>h-pb-(h-pt-pb)*v/(g1*1.1||1);
      let b='';for(const tv of U.logTicks(ylo,yhi)){const y=Y(tv);b+='<line x1="'+pl+'" x2="'+(w-pr)+'" y1="'+y.toFixed(1)+'" y2="'+y.toFixed(1)+'" class="sim-ax"/>'+U.t(pl-4,y+3,U.ms(tv),{a:'end',fs:10})}
      for(const tv of U.ticks(0,x1,w<480?4:6))b+=U.t(X(tv),h-pb+13,U.n0(tv),{a:U.anc(X(tv),w)});
      b+=U.t(pl+(w-pl-pr)/2,h-3,'throughput, output tokens/s',{a:'middle'})+U.t(w-pr+4,pt+8,U.sig(g1,3))+U.t(w-pr+4,h-pb,'0');
      const line=(f,c)=>{let p='';for(const d of data)p+=(p?'L':'M')+X(d.m.tps).toFixed(1)+' '+f(d).toFixed(1);let dots='';for(const d of data)dots+='<circle cx="'+X(d.m.tps).toFixed(1)+'" cy="'+f(d).toFixed(1)+'" r="2.5" fill="'+c+'"/>';return '<path d="'+p+'" fill="none" stroke="'+c+'" stroke-width="1.6"/>'+dots};
      b+=line(d=>Y(d.m.tpot[0]),'var(--c1)')+line(d=>Y(d.m.ttft[2]),'var(--c2)')+line(d=>G(d.m.goodput),'var(--c3)');
      let best=data[0];for(const d of data)if(d.m.goodput>best.m.goodput)best=d;
      const xb=X(best.m.tps);b+='<line x1="'+xb.toFixed(1)+'" x2="'+xb.toFixed(1)+'" y1="'+pt+'" y2="'+(h-pb)+'" stroke="var(--c3)" stroke-dasharray="3 3"/>'+U.t(Math.min(xb+3,w-pr-110),pt+10,'goodput peaks at '+U.sig(best.rate,3)+' req/s',{fill:'var(--c3)'});
      el.innerHTML=U.svg(w,h,b,'Latency and goodput against throughput as the arrival rate rises')}
    $('sim-sw-run').addEventListener('click',sweep);
    let done=false;U.onRender(()=>{if(!done&&L.cur){done=true;sweep()}else draw()});U.onResize(()=>{if(U.shown())draw()});
  }
})();
