// ---- Reading, Step 1: one server against a load balancer and three servers (illustrative traffic; src/read/recompute.py a1) ----
window.RDSIM=window.RDSIM||{};
RDSIM.A1_ARR=[6,7,5,8,6,7,6,5,7,6];RDSIM.A1_CAP=4;
RDSIM.a1=function(ns){let q=new Array(ns).fill(0),rr=0;const rows=[];
  RDSIM.A1_ARR.forEach(a=>{const add=new Array(ns).fill(0);for(let k=0;k<a;k++){q[rr%ns]++;add[rr%ns]++;rr++}
    const served=q.map(x=>Math.min(x,RDSIM.A1_CAP));q=q.map((x,i)=>x-served[i]);
    rows.push({arr:a,add:add,served:served.reduce((s,x)=>s+x,0),perServed:served,q:q.slice(),waiting:q.reduce((s,x)=>s+x,0),wait_s:Math.round(100*Math.max(...q)/RDSIM.A1_CAP)/100})});
  return rows};
(function(){
  const svg=document.getElementById('rd-lb-svg');if(!svg)return;
  const cap=document.getElementById('rd-lb-cap'),cnt=document.getElementById('rd-lb-cnt'),leg=document.getElementById('rd-lb-leg');
  let mode='one';const R={one:RDSIM.a1(1),lb:RDSIM.a1(3)};
  const L=(c,t)=>'<span style="--sw:var('+c+')">'+t+'</span>';
  leg.innerHTML=L('--c1','arriving this second')+L('--bad','waiting in line')+L('--good','answered this second');
  const fmt=n=>Math.round(n).toLocaleString('en-US');
  function draw(i){
    const rows=R[mode],ns=mode==='one'?1:3,r=i>0?rows[i-1]:null;
    const W=Math.max(280,Math.min(820,RD.width(svg)));const D=8,G=2;
    const xA=6,wA=2*(D+G)+4,xL=mode==='lb'?xA+wA+14:xA+wA+6,wL=mode==='lb'?Math.min(84,W*0.16):0;
    const xS=W-Math.min(118,W*0.3),wS=W-xS-4,xQ=xL+wL+12,wQ=xS-xQ-8;
    const rowH=ns===1?150:62,H=ns*rowH+(ns-1)*8+10;
    let b='';
    // arrivals column
    const arr=r?r.arr:0;b+=RD.t(xA,11,'in',{fs:10,fill:'var(--mute)'});
    for(let k=0;k<arr;k++){const cx=xA+(k%2)*(D+G),cy=18+Math.floor(k/2)*(D+G);b+='<rect x="'+cx+'" y="'+cy+'" width="'+D+'" height="'+D+'" rx="2" fill="var(--c1)"/>'}
    if(mode==='lb'){b+='<rect x="'+xL+'" y="'+(H/2-24)+'" width="'+wL+'" height="48" rx="7" fill="var(--soft)" stroke="var(--c1)" stroke-width="1.6"/>'+RD.t(xL+wL/2,H/2-4,'Load',{fs:11,a:'middle',w:600})+RD.t(xL+wL/2,H/2+10,'balancer',{fs:11,a:'middle',w:600})}
    const cols=Math.max(3,Math.floor(wQ/(D+G)));
    for(let s=0;s<ns;s++){
      const y0=5+s*(rowH+8),q=r?r.q[s]:0,served=r?r.perServed[s]:0,add=r?r.add[s]:0;
      // arrow into this server's line
      b+='<line x1="'+(mode==='lb'?xL+wL:xA+wA)+'" y1="'+(mode==='lb'?H/2:y0+rowH/2)+'" x2="'+xS+'" y2="'+(y0+rowH/2)+'" stroke="var(--mute)" stroke-width="1.2" opacity=".6"/>';
      // waiting dots, filled from the server leftwards
      for(let k=0;k<q;k++){const c=k%cols,rw=Math.floor(k/cols);const x=xS-8-(c+1)*(D+G),y=y0+6+rw*(D+G);
        if(y<y0+rowH-18)b+='<rect x="'+x+'" y="'+y+'" width="'+D+'" height="'+D+'" rx="2" fill="var(--bad)"/>'}
      // server box
      const busy=r?Math.min(1,(served)/RDSIM.A1_CAP):0;
      b+='<rect x="'+xS+'" y="'+y0+'" width="'+wS+'" height="'+rowH+'" rx="7" fill="var(--soft)" stroke="'+(q>0?'var(--bad)':'var(--line)')+'" stroke-width="1.5"/>';
      b+=RD.t(xS+8,y0+15,'Server '+(ns>1?s+1:''),{fs:11,w:600})+RD.t(xS+8,y0+29,'400 req/s max',{fs:10,fill:'var(--mute)'});
      for(let k=0;k<served;k++)b+='<rect x="'+(xS+8+k*(D+G))+'" y="'+(y0+36)+'" width="'+D+'" height="'+D+'" rx="2" fill="var(--good)"/>';
      if(rowH>60)b+=RD.t(xS+8,y0+62,'busy '+Math.round(busy*100)+'%',{fs:10,fill:'var(--mute)'});
      if(q>0)b+=RD.t(xQ,y0+rowH-4,(q*100).toLocaleString('en-US')+' waiting',{fs:10,fill:'var(--bad)'});
    }
    svg.innerHTML=RD.svg(W,H,b,mode==='one'?'One server with a growing line of waiting requests':'A load balancer spreading requests over three servers');
    const tot=rows.slice(0,i).reduce((s,x)=>s+x.arr,0);
    cnt.innerHTML=RD.stat('Second',i+' of 10','')+RD.stat('Arrived so far',fmt(tot*100),'requests')+RD.stat('Waiting now',r?fmt(r.waiting*100):'0','requests in line')+RD.stat('Wait for a new arrival',r?r.wait_s.toFixed(2)+' s':'0 s','before work starts');
    let t,p;
    if(i===0){t='Requests start arriving';p=mode==='one'?'About 600 requests a second arrive at a server that can finish 400. Press play and watch the line.':'The same arrivals, now handed out in turn by a load balancer to three identical servers, 1,200 a second of capacity in total.'}
    else if(mode==='one'){t='Second '+i+': '+r.arr*100+' arrived, 400 answered';
      p=r.waiting?'The line now holds '+fmt(r.waiting*100)+' requests; a request arriving now waits about '+r.wait_s.toFixed(2)+' s before the server even starts on it.':'The server keeps up this second.';
      if(i===10)p='After 10 seconds '+fmt(r.waiting*100)+' requests are waiting and newcomers wait '+r.wait_s.toFixed(2)+' s. The line grows by about 230 a second on average and never shrinks: this is the wall.'}
    else {t='Second '+i+': '+r.arr*100+' arrived, '+r.served*100+' answered';
      p='Each server receives about a third ('+r.add.map(x=>x*100).join(', ')+') and finishes it within the second. Nothing waits'+(i===10?'. Capacity is now 1,200 a second, double the load: room for the next spike, or for one server to fail.':'.')}
    cap.innerHTML='<div class="t">'+t+'</div><p>'+p+'</p>';
  }
  const an=RD.anim({card:'rd-lb-card',ctl:'rd-lb-ctl',n:11,ms:1100,draw,label:'Second'});
  RD.seg(document.getElementById('rd-lb-seg'),m=>{mode=m;an.reset(11);an.play()});
  RD.onResize(()=>an.redraw());
})();
