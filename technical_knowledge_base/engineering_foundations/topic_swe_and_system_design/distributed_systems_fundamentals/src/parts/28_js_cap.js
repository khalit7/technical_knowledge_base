// ---- Reading: CAP and PACELC on one picture (toggle-compare of end states; illustrative balances, 69 ms from the parent's Numbers to know) ----
(function(){
  const $=id=>document.getElementById(id);if(!$('rd-cap-card'))return;
  const M=[
    {part:1,ans:'100',ansc:'var(--bad)',rep:0,lin:'no',av:'yes',lat:'none',cls:'PA',
     c:'<b>Partition, choose availability.</b> Ana spent 60 credits on the left (balance 40). Her other device reads from R3 on the right, which cannot hear from the left. To answer at all it must use what it has: <b>100</b>. The read returned after a write that had finished, so the history is not linearisable. This is what CAP calls choosing A.'},
    {part:1,ans:'error',ansc:'var(--mute)',rep:0,lin:'yes',av:'no',lat:'until healed',cls:'PC',
     c:'<b>Partition, choose consistency.</b> R3 knows it is cut off from the majority, so it refuses: "cannot reach a majority, try later". Nobody sees a stale balance, and R3 is not available, exactly the trade CAP proves you cannot escape. Raft\'s minority side behaves this way (section 7).'},
    {part:0,ans:'100',ansc:'var(--bad)',rep:1,lin:'no',av:'yes',lat:'none',cls:'EL',
     c:'<b>No partition, choose latency.</b> The write is confirmed as soon as the left side has it; the copy to R3 is still in flight when the read arrives, so R3 answers 100 at once. Nothing failed, yet the read was stale: the everyday trade CAP does not mention and PACELC names ("else, latency or consistency").'},
    {part:0,ans:'40',ansc:'var(--good)',rep:2,lin:'yes',av:'yes',lat:'+69 ms per write',cls:'EC',
     c:'<b>No partition, choose consistency.</b> The write is confirmed only after R3 has it too, so every read anywhere sees 40. The price is paid on every write, in good weather: one round trip to the far replica, 69 ms if it is across the US.'}];
  let m=0;
  function draw(){
    const s=M[m],el=$('rd-cap-svg'),W=Math.min(640,RD.width(el)),H=176,y1=34,y2=112;
    const xs={R1:W*.12,R2:W*.32,R3:W*.82,X:W*.22,Y:W*.82},wall=W*.57,rr=Math.min(24,W*.06);
    let g='<defs><marker id="cp-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--mute)"/></marker></defs>';
    const box=(x,y,t,sub,col)=>'<rect x="'+(x-rr-14)+'" y="'+(y-15)+'" width="'+(2*rr+28)+'" height="30" rx="6" fill="var(--soft)" stroke="'+col+'" stroke-width="1.5"/>'+RD.t(x,y+4,t,{a:'middle',fs:12,w:600});
    const line=(xa,ya,xb,yb,col,dash)=>'<line x1="'+xa+'" y1="'+ya+'" x2="'+xb+'" y2="'+yb+'" stroke="'+col+'" stroke-width="2"'+(dash?' stroke-dasharray="5 4"':'')+' marker-end="url(#cp-a)"/>';
    g+=RD.t(xs.X,y1-20,'Ana, phone',{a:'middle',fs:11,fill:'var(--mute)'})+RD.t(xs.Y,y1-20,'Ana, laptop',{a:'middle',fs:11,fill:'var(--mute)'});
    g+=box(xs.X,y1,'spend 60','', 'var(--acc)')+box(xs.Y,y1,'read','', 'var(--acc)');
    ['R1','R2'].forEach(k=>{g+='<circle cx="'+xs[k]+'" cy="'+y2+'" r="'+rr+'" fill="var(--open2)" stroke="var(--good)" stroke-width="2"/>'+RD.t(xs[k],y2-2,k,{a:'middle',fs:12,w:600})+RD.t(xs[k],y2+12,'40',{a:'middle',fs:11,fill:'var(--good)'})});
    const r3=s.rep===2?'40':'100',r3c=s.rep===2?'var(--good)':'var(--bad)';
    g+='<circle cx="'+xs.R3+'" cy="'+y2+'" r="'+rr+'" fill="var(--soft)" stroke="'+r3c+'" stroke-width="2"/>'+RD.t(xs.R3,y2-2,'R3',{a:'middle',fs:12,w:600})+RD.t(xs.R3,y2+12,r3,{a:'middle',fs:11,fill:r3c});
    g+=line(xs.X,y1+15,xs.R2-6,y2-rr-2,'var(--acc)');
    g+=line(xs.Y,y1+15,xs.R3,y2-rr-2,'var(--acc)');
    g+=RD.t(Math.min(xs.R3,W-50),y2+rr+20,'answer: '+s.ans,{a:'middle',fs:12,w:600,fill:s.ansc});
    if(s.part){g+='<line x1="'+wall+'" y1="'+(y1-4)+'" x2="'+wall+'" y2="'+(H-8)+'" stroke="var(--bad)" stroke-width="3" stroke-dasharray="6 5"/>'+RD.t(wall,H-2,'network partition',{a:'middle',fs:11,fill:'var(--bad)',w:600})}
    else{const xa=xs.R2+rr+4,xb=xs.R3-rr-6;
      if(s.rep===1){g+=line(xa,y2,xa+(xb-xa)*.55,y2,'var(--mute)',1)+RD.t((xa+xb)/2,y2+28,'copy still in flight',{a:'middle',fs:11,fill:'var(--mute)'})}
      else{g+=line(xa,y2,xb,y2,'var(--good)')+RD.t((xa+xb)/2,y2+28,'write waits for R3: +69 ms',{a:'middle',fs:11,fill:'var(--good)'})}}
    el.innerHTML=RD.svg(W,H,g,'Three replicas, a write on the left and a read on the right');
    $('rd-cap-cnt').innerHTML=RD.stat('Read returns',s.ans==='error'?'an error':s.ans+' credits',s.ans==='100'?'stale: the write had finished':'')+RD.stat('Linearisable',s.lin,'')+RD.stat('Available',s.av,'')+RD.stat('Latency added',s.lat,'')+RD.stat('PACELC letter',s.cls,'');
    $('rd-cap-cap').innerHTML=s.c;
  }
  RD.seg($('rd-cap-seg'),v=>{m=+v;draw()});
  RD.onRender(draw);RD.onResize(draw);draw();
})();
