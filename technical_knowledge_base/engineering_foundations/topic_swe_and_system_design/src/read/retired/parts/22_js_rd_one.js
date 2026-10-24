// ---- Reading, One screen: the architecture at 1 user and at 10 million, drawn at the measured width ----
(function(){
  const A=document.getElementById('rd-one-a'),B=document.getElementById('rd-one-b');if(!A||!B)return;
  const SC=['--mute','--c1','--c2','--c3','--c4','--c5','--c6'];
  function wrap(s,max){const w=s.split(' '),out=[];let l='';w.forEach(x=>{if(l&&(l+' '+x).length>max){out.push(l);l=x}else l=l?l+' '+x:x});if(l)out.push(l);return out}
  // rows of boxes: [title, plain line, step (0 = none)]
  function draw(el,rows,label){
    const W=Math.max(240,Math.min(560,RD.width(el)));const gap=8,fs=W<360?10:11,cw=fs*0.56;
    let y=4,body='',prev=null;
    rows.forEach(r=>{
      const n=r.length,bw=(W-gap*(n-1))/n,maxc=Math.max(8,Math.floor((bw-12)/cw));
      const boxes=r.map((b,i)=>{const t=wrap(b[0],maxc),s=wrap(b[1],maxc);return {x:i*(bw+gap),t,s,step:b[2],h:10+t.length*(fs+2)+s.length*(fs+1)+6}});
      const h=Math.max(...boxes.map(b=>b.h));
      if(prev){// arrows from the previous row's centre band to this row
        const x1=W/2;body+='<line x1="'+x1+'" y1="'+(y-12)+'" x2="'+x1+'" y2="'+(y-2)+'" stroke="var(--mute)" stroke-width="1.2" marker-end="url(#rd1ar)"/>'}
      boxes.forEach(b=>{const c='var('+SC[b.step]+')';
        body+='<rect x="'+(b.x+.5)+'" y="'+y+'" width="'+(bw-1)+'" height="'+h+'" rx="6" fill="var(--soft)" stroke="'+c+'" stroke-width="'+(b.step?1.6:1)+'"/>';
        let ty=y+fs+5;b.t.forEach(l=>{body+=RD.t(b.x+6,ty,RD.esc(l),{fs:fs,w:600});ty+=fs+2});
        b.s.forEach(l=>{body+=RD.t(b.x+6,ty,RD.esc(l),{fs:fs-1,fill:'var(--mute)'});ty+=fs+1});
        if(b.step)body+='<circle cx="'+(b.x+bw-11)+'" cy="'+(y+10)+'" r="7.5" fill="'+c+'"/>'+RD.t(b.x+bw-11,y+13.5,b.step,{fs:10,a:'middle',fill:'var(--bg)',w:600});
      });
      y+=h+16;prev=r;
    });
    const defs='<defs><marker id="rd1ar" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L8,4L0,8z" fill="var(--mute)"/></marker></defs>';
    el.innerHTML=RD.svg(W,y-12,defs+body,label);
  }
  const one=[[['You','one user, a browser',0]],[['One machine','the app code, the database and a call to the model, all together',0]],[['A model API','one request at a time',0]]];
  const big=[
    [['10 million users','phones and browsers',0]],
    [['DNS','name to address',1],['CDN','static files near users',2]],
    [['Load balancer','spreads requests',1]],
    [['App servers × N','identical, stateless',1]],
    [['Cache','recent answers in memory',2],['Queue and workers','slow jobs in the background',3]],
    [['Database','primary, replicas, shards by user',2],['LLM gateway','rate limits, timeouts, retries',4]],
    [['Model router','small or large model',5]],
    [['GPU pools','batched, prefix-cached models',5]],
    [['Observability','logs, metrics, traces against SLOs',4],['Design method','the estimates that sized all this',6]]
  ];
  function all(){draw(A,one,'The product at one user: everything on one machine');draw(B,big,'The product at ten million users: load balancer, stateless app servers, cache, database replicas and shards, queue and workers, LLM gateway, model router and GPU pools')}
  all();RD.onRender(all);RD.onResize(all);
})();
