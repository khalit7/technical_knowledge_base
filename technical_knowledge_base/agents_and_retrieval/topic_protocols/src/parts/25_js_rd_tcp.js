// ---- Reading tab, section 3: one transfer, one lost segment, two window sizes (simplified Reno, one row per RTT) ----
(function(){
  const card=document.getElementById('rd-tcp');if(!card)return;
  const viz=document.getElementById('rd-tcp-viz'),cap=document.getElementById('rd-tcp-cap'),cnt=document.getElementById('rd-tcp-cnt');
  const N=96,LOST=20,MSS=1460,RTT=0.1;
  function schedule(W){
    const rows=[{hs:true}];let next=1,cwnd=W,pend=false,lostDone=false,recv=new Set(),rec=0;
    while(rec<N&&rows.length<60){
      const segs=[];
      if(pend){segs.push({n:LOST,t:'re'});cwnd=Math.max(2,Math.floor(W/2));pend=false}
      else if(cwnd<W&&lostDone&&rows[rows.length-1].segs&&!rows[rows.length-1].loss)cwnd=Math.min(W,cwnd+1);
      while(segs.length<cwnd&&next<=N){const n=next++;const lost=(n===LOST&&!lostDone);if(lost)lostDone=true;segs.push({n,t:lost?'lost':'new'})}
      const loss=segs.some(s=>s.t==='lost');
      segs.forEach(s=>{if(s.t!=='lost')recv.add(s.n)});
      while(recv.has(rec+1))rec++;
      if(loss)pend=true;
      rows.push({segs,cwnd,loss,rec,dup:loss?segs.filter(s=>s.n>LOST).length:0});
    }
    return rows;
  }
  let W=8,rows=schedule(W);
  const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  function draw(i){
    const w=RD.width(viz),lab=52,right=w<500?80:118,gap=1;
    const sq=Math.max(3,Math.min(13,Math.floor((w-lab-right)/32)-gap)),rh=Math.max(14,sq+6);
    const H=rows.length*rh+8;
    let b='';
    for(let r=0;r<=i&&r<rows.length;r++){
      const y=4+r*rh,R=rows[r];
      b+=RD.t(0,y+rh*0.72,(r===0?'RTT 1':'RTT '+(r+1)),{fs:11,fill:r===i?css('--ink'):css('--mute')});
      if(R.hs){b+=RD.t(lab,y+rh*0.72,'SYN →  SYN-ACK ←  ACK →',{fs:11,fill:css('--mute')});continue}
      R.segs.forEach((s,j)=>{const x=lab+j*(sq+gap);const col=s.t==='lost'?css('--bad'):s.t==='re'?css('--c5'):css('--acc');
        b+='<rect x="'+x+'" y="'+(y+(rh-sq)/2)+'" width="'+sq+'" height="'+sq+'" rx="1.5" fill="'+(s.t==='lost'?'none':col)+'" stroke="'+col+'" stroke-width="'+(s.t==='lost'?1.5:0)+'"/>';
        if(s.t==='lost')b+='<path d="M'+x+' '+(y+(rh-sq)/2)+'l'+sq+' '+sq+'M'+(x+sq)+' '+(y+(rh-sq)/2)+'l'+(-sq)+' '+sq+'" stroke="'+col+'" stroke-width="1.5"/>'});
      b+=RD.t(w-2,y+rh*0.72,'acked to '+R.rec,{fs:11,a:'end',fill:r===i?css('--ink'):css('--mute')});
    }
    viz.innerHTML=RD.svg(w,H,b,'Segments sent per round trip');
    const R=rows[i];const t=(i+1)*RTT;const done=i>0?R.rec:0;
    let tt,p;
    if(i===0){tt='Round trip 1: the handshake';p='SYN, SYN-ACK, ACK. No data has moved yet, and 100 ms are gone. This is the price of every new TCP connection, before TLS adds its own round trip (section 4).'}
    else if(R.loss){tt='Round trip '+(i+1)+': segment '+LOST+' is lost';p='The receiver gets the segments after it but cannot pass them up: TCP delivers in order. It keeps acknowledging "everything up to '+(LOST-1)+'": '+R.dup+' duplicate ACKs, enough (3) for the sender to retransmit at once instead of waiting for a timer.'}
    else if(R.segs[0].t==='re'){tt='Round trip '+(i+1)+': retransmit, window halved to '+R.cwnd;p='Segment '+LOST+' goes again, and congestion control reads the loss as a full queue somewhere: the window drops to '+R.cwnd+' segments. The buffered segments are released the moment '+LOST+' arrives.'}
    else if(R.rec>=N){tt='Round trip '+(i+1)+': done';p='All '+N+' segments ('+(N*MSS/1000).toFixed(0)+' KB) delivered in '+(t*1000).toFixed(0)+' ms. '+(W===8?'Switch to the window of 32: same file, same loss, same link.':'Against '+(schedule(8).length*100)+' ms with a window of 8: the link did not change, only how much may be in flight per round trip.')}
    else{tt='Round trip '+(i+1)+': '+R.segs.length+' segments in flight';p=R.cwnd<W?'Congestion avoidance: the window grows by one segment per round trip, back towards the receiver’s limit of '+W+'.':'The sender may have '+W+' unacknowledged segments; it sends them and waits one round trip for the acknowledgements. That wait, not the link, sets the speed.'}
    cap.innerHTML='<div class="t">'+tt+'</div><p>'+p+'</p>';
    const thr=i>0?done*MSS*8/t/1e6:0;
    cnt.innerHTML=RD.stat('Time',(t*1000).toFixed(0)+' ms',(i+1)+' round trips of 100 ms')+RD.stat('Delivered in order',done+' / '+N,'segments')+
      RD.stat('Average so far',thr.toFixed(2)+' Mbit/s','delivered / time')+RD.stat('Ceiling W / RTT',(W*MSS*8/RTT/1e6).toFixed(2)+' Mbit/s',W+' × 1,460 B × 8 / 0.1 s');
  }
  const a=RD.anim({card:'rd-tcp',ctl:'rd-tcp-ctl',n:rows.length,draw,ms:1100,label:'Round trip'});
  RD.seg(document.getElementById('rd-tcp-seg'),m=>{W=+m;rows=schedule(W);a.reset(rows.length);a.play()});
  RD.onResize(()=>a.redraw());
  // ---- the window-over-RTT calculator ----
  const RT=[0.1,0.5,1,2,5,10,20,50,80,100,150,200,300],WN=[65535,262144,1048576,4194304,16777216,67108864,268435456,1073741824],LK=[0.1,1,5,10,25,100,400];
  const rI=document.getElementById('rd-bdp-rtt'),wI=document.getElementById('rd-bdp-win'),lI=document.getElementById('rd-bdp-link'),out=document.getElementById('rd-bdp-out');
  rI.max=RT.length-1;rI.value=RT.indexOf(100);wI.max=WN.length-1;wI.value=0;lI.max=LK.length-1;lI.value=LK.indexOf(10);
  const fb=b=>b>=1073741824?(b/1073741824).toFixed(0)+' GiB':b>=1048576?(b/1048576).toFixed(0)+' MiB':(b/1024).toFixed(0)+' KiB';
  const fr=x=>x>=1e9?(x/1e9).toFixed(x>=1e10?0:1)+' Gbit/s':x>=1e6?(x/1e6).toFixed(1)+' Mbit/s':(x/1e3).toFixed(0)+' kbit/s';
  function calc(){
    const rtt=RT[+rI.value]/1000,win=WN[+wI.value],link=LK[+lI.value]*1e9;
    document.getElementById('rd-bdp-rtt-v').textContent=RT[+rI.value]+' ms';document.getElementById('rd-bdp-win-v').textContent=fb(win)+(+wI.value===0?' (no window scaling)':'');
    document.getElementById('rd-bdp-link-v').textContent=fr(link);
    const cap=win*8/rtt,thr=Math.min(cap,link),bdp=link*rtt/8;
    out.innerHTML=RD.stat('One connection gets',fr(thr),thr<link?'window-limited: window × 8 / RTT':'link-limited')+RD.stat('Bandwidth-delay product',(bdp>=1e6?(bdp/1e6).toFixed(bdp>=1e7?0:1)+' MB':(bdp/1e3).toFixed(1)+' kB'),'bytes in flight to fill the link')+
      RD.stat('Link used',(100*thr/link).toFixed(thr/link<0.01?2:0)+'%','by one connection');
  }
  [rI,wI,lI].forEach(x=>x.addEventListener('input',calc));calc();
})();
