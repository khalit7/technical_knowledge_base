// ---- Section 7: TTL jitter (one slider) and one hot key's expiry under four defences (toggle of end states) ----
// The stampede model is Capacity planning and performance's model.py `stampede` (none, coalesce, xfetch), ported line by line,
// plus a serve-stale mode; recompute.py runs the Python twin and checks the database-query counts.
(function(){
  if(!window.RD)return;
  // ---------- jitter ----------
  const jb=document.getElementById('rd-jit-svg'),js=document.getElementById('rd-jit-j');
  const JIT=[0,0.01,0.02,0.05,0.1,0.2],N=10000,TTL=300,CAP=600;
  window.CAJIT={N,TTL,peak:j=>j?N/(TTL*j):N};
  if(jb&&js){
    function dj(){
      const j=JIT[+js.value],peak=CAJIT.peak(j);
      document.getElementById('rd-jit-v').textContent=Math.round(j*100)+'%';
      document.getElementById('rd-jit-out').innerHTML=RD.stat('Expiries spread over',j?(TTL*j).toFixed(0)+' s':'1 s','300 × j')+
        RD.stat('Peak expiries a second','<span style="color:'+(peak>CAP?'var(--bad)':'var(--good)')+'">'+Math.round(peak).toLocaleString('en-US')+'</span>','10,000 / (300 × j)')+
        RD.stat('Against 600 a second',peak>CAP?(peak/CAP).toFixed(1)+'× the database':'within capacity','the illustrative database of section 6');
      const W=Math.min(RD.width(jb),760),H=190,L=50,R=24,T=12,B=34,w=W-L-R,hh=H-T-B,t0=295,t1=365,YM=2000;
      const xs=t=>L+(t-t0)/(t1-t0)*w,ys=v=>T+hh-Math.min(v,YM)/YM*hh;let g='';
      for(let i=0;i<=4;i++){const v=YM*i/4,y=ys(v);g+='<line x1="'+L+'" x2="'+(L+w)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/>'+RD.t(L-5,y+4,v.toLocaleString('en-US'),{a:'end',fs:10.5,fill:'var(--mute)'})}
      for(let t=300;t<=360;t+=(W<520?20:10))g+=RD.t(xs(t),T+hh+14,t+' s',{a:'middle',fs:10.5,fill:'var(--mute)'});
      g+=RD.t(L+w/2,H-3,'seconds after the deploy filled the keys',{a:'middle',fs:11,fill:'var(--mute)'});
      const bw=Math.max(1.5,w/(t1-t0)-0.6);
      if(!j){g+='<rect x="'+xs(300)+'" y="'+T+'" width="'+bw+'" height="'+hh+'" fill="var(--bad)"/>'+RD.t(xs(300)+bw+5,T+12,'10,000 in one second (off the scale)',{fs:11,w:600,fill:'var(--bad)'})}
      else for(let t=300;t<300+TTL*j;t++){const v=Math.min(1,300+TTL*j-t)*peak;g+='<rect x="'+xs(t)+'" y="'+ys(v)+'" width="'+bw+'" height="'+(T+hh-ys(v))+'" fill="'+(v>CAP?'var(--bad)':'var(--c1)')+'"/>'}
      g+='<line x1="'+L+'" x2="'+(L+w)+'" y1="'+ys(CAP)+'" y2="'+ys(CAP)+'" stroke="var(--bad)" stroke-dasharray="5 4"/>'+RD.t(L+w-4,ys(CAP)-5,'database capacity, 600 a second',{a:'end',fs:11,fill:'var(--bad)'});
      jb.innerHTML=RD.svg(W,H,g,'Keys expiring per second with TTL jitter');
    }
    js.addEventListener('input',dj);RD.onRender(dj);RD.onResize(dj);dj();
  }
  // ---------- stampede ----------
  const sb=document.getElementById('rd-st-svg');if(!sb)return;
  function mulberry32(a){return function(){a=(a+0x6D2B79F5)|0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
  const xfetchEarly=(delta,beta,u)=>-delta*beta*Math.log(u);
  // kinds per request: 0 fresh hit, 1 queried the database, 2 waited for another's rebuild, 3 served the old value
  function stampede(mode,rate,rec,horizon,seed,beta){
    if(beta===undefined)beta=1;
    const rnd=mulberry32(seed);let expAt=1;let db=0;const waits=[],starts=[],kinds=[],times=[];
    let t=0;const step=1/rate;let pending=null;
    while(t<horizon){
      times.push(t);
      if(pending!==null&&pending<=t){expAt=pending+10;pending=null}
      if(mode==='xfetch'&&t<expAt){
        const u=1-rnd();const early=xfetchEarly(rec,beta,u);
        if(pending===null&&t+early>=expAt){db++;starts.push(t);pending=t+rec;waits.push(rec);kinds.push(1)}
        else{waits.push(0);kinds.push(0)}
      }else if(t<expAt){waits.push(0);kinds.push(0)}
      else if(mode==='coalesce'){if(pending===null){db++;starts.push(t);pending=t+rec;kinds.push(1)}else kinds.push(2);waits.push(pending-t)}
      else if(mode==='swr'){if(pending===null){db++;starts.push(t);pending=t+rec}waits.push(0);kinds.push(3)}
      else{db++;starts.push(t);waits.push(rec);kinds.push(1);if(pending===null||t+rec<pending)pending=t+rec}
      t=Math.round((t+step)*1e9)/1e9;
    }
    return{db,waits,starts,kinds,times};
  }
  window.CAST={stampede};
  const CAPT={none:'<b>No protection.</b> At t = 1 s the key expires; every request in the next 300 ms misses and runs the same query: 60 queries at once, each making the others slower. This is the shape Facebook measured at 17,000 queries a second without leases.',
    coalesce:'<b>Coalescing, or a lease.</b> The first miss rebuilds; the other 59 requests wait for its answer (up to 300 ms). One query. Across servers this needs the cache to arbitrate: Facebook\'s lease gives one token per key every 10 seconds, the 1.3K a second line.',
    swr:'<b>Serve stale while revalidating.</b> The first request after expiry starts a background refresh; everyone, including it, gets the old value for 300 ms. One query, no waiting, a little staleness.',
    xfetch:'<b>XFetch.</b> Each read before expiry rolls the dice; one reader, here at t = 0.135 s, recomputes early while the value is still valid, so the key never expires under load. One query and no locks; only that reader waits, for its own rebuild.'};
  let mode='none';
  function draw(){
    const r=stampede(mode,200,0.3,2.0,5),wmax=Math.max(...r.waits);
    document.getElementById('rd-st-out').innerHTML=RD.stat('Database queries',String(r.db),'for one key')+RD.stat('Longest wait',(wmax*1000).toFixed(0)+' ms','any request')+
      RD.stat('Served the old value',String(r.kinds.filter(k=>k===3).length),'requests');
    const W=Math.min(RD.width(sb),760),L=40,R=24,w=W-L-R,xs=t=>L+t/2*w,stripY=8,stripH=26,cy0=stripH+30,ch=100,H=cy0+ch+30;let g='';
    const colr=['var(--dim)','var(--bad)','var(--c5)','var(--c4)'];
    r.times.forEach((t,i)=>{g+='<rect x="'+xs(t).toFixed(2)+'" y="'+stripY+'" width="'+Math.max(0.9,w/400).toFixed(2)+'" height="'+stripH+'" fill="'+colr[r.kinds[i]]+'"/>'});
    g+=RD.t(L-4,stripY+stripH/2+4,'reads',{a:'end',fs:10.5,fill:'var(--mute)'});
    // database queries in flight
    const ys=v=>cy0+ch-v/60*ch;
    for(let v=0;v<=60;v+=20){const y=ys(v);g+='<line x1="'+L+'" x2="'+(L+w)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/>'+RD.t(L-4,y+4,String(v),{a:'end',fs:10.5,fill:'var(--mute)'})}
    let d='';for(let k=0;k<=400;k++){const t=k/200;const n=r.starts.filter(s=>s<=t&&t<s+0.3).length;d+=(d?' L':'M')+xs(t).toFixed(1)+','+ys(n).toFixed(1)}
    g+='<path d="'+d+'" fill="none" stroke="var(--bad)" stroke-width="2.2"/>'+RD.t(L+4,cy0-6,'database queries in flight for this key',{fs:11,fill:'var(--bad)'});
    for(let t=0;t<=2.0001;t+=(W<520?0.5:0.25))g+=RD.t(xs(t),H-12,t.toFixed(W<520?1:2)+' s',{a:'middle',fs:10.5,fill:'var(--mute)'});
    g+='<line x1="'+xs(1)+'" x2="'+xs(1)+'" y1="'+(stripY-4)+'" y2="'+(cy0+ch)+'" stroke="var(--ink)" stroke-dasharray="3 3"/>'+RD.t(xs(1)+4,cy0+ch-6,'TTL ends',{fs:11,fill:'var(--ink)'});
    sb.innerHTML=RD.svg(W,H,g,'Requests and database queries around one key\'s expiry');
    document.getElementById('rd-st-cap').innerHTML='<p>'+CAPT[mode]+'</p>';
  }
  RD.seg(document.getElementById('rd-st-mode'),m=>{mode=m;draw()});
  RD.onRender(draw);RD.onResize(draw);draw();
})();
