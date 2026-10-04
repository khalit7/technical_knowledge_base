// ---- Reading: lease without and with a fencing token (the same GC pause, Ana's credit balance) ----
(function(){
  const box=document.getElementById('rd-fence-svg');if(!box)return;
  const capEl=document.getElementById('rd-fence-cap'),cnt=document.getElementById('rd-fence-cnt');
  // lanes: Lock service, Worker 1, Worker 2, Storage. t: time on the x axis (0..10)
  const base=[
    {t:0,ev:[['S','W1','lease, token 33','i']],w1:'holds lease',w2:'',bal:100,max:'none',t1:'Worker 1 gets the lease',p:'Worker 1 must charge Ana 10 credits. It takes the lease (TTL 10 s) and receives token 33. It reads her balance: 100.'},
    {t:1.5,ev:[],pause:1,w1:'paused (GC)',w2:'',bal:100,max:'none',t1:'Worker 1 freezes',p:'A long garbage-collection pause stops Worker 1 mid-task. It still has "100" in memory and believes it holds the lease. It cannot notice time passing.'},
    {t:4.5,ev:[['S','W2','lease, token 34','i']],pause:1,exp:1,w1:'paused (GC)',w2:'holds lease',bal:100,max:'none',t1:'The lease expires; Worker 2 takes it',p:'The lock service has not heard from Worker 1 for 10 s, so the lease expired. Worker 2, which must charge Ana 60 credits, takes the lease and receives token 34.'},
    {t:6,ev:[['W2','D','balance = 40 (token 34)','g']],pause:1,exp:1,w1:'paused (GC)',w2:'holds lease',bal:40,max:'34',acc:1,t1:'Worker 2 writes 100 − 60 = 40',p:'Correct so far: the storage now holds 40 and remembers the highest token it has seen, 34.'}];
  const M=[base.concat([
      {t:8,ev:[['W1','D','balance = 90 (token 33)','b']],exp:1,w1:'wakes, still "holds lease"',w2:'done',bal:90,max:'34',acc:2,bad:1,t1:'Worker 1 wakes and writes 100 − 10 = 90',p:'Its code continues from the next line. Without a check, the storage accepts the write: the balance is 90 and the 60-credit charge has vanished. Two workers both "held the lock".'}]),
    base.concat([
      {t:8,ev:[['W1','D','balance = 90 (token 33)','b']],rej:1,exp:1,w1:'wakes, still "holds lease"',w2:'done',bal:40,max:'34',acc:1,t1:'Worker 1 wakes; the storage rejects token 33',p:'The storage has already seen 34, so 33 must belong to an expired lease: rejected. The balance stays 40. Worker 1 gets an error, re-takes the lease (token 35) and reads the balance again.'}])];
  let mode=0;
  function draw(i){
    const W=Math.min(640,RD.width(box)),lanes=[['S','Lock service'],['W1','Worker 1'],['W2','Worker 2'],['D','Storage']],H=222,lx=78,rx=W-10,y0=26,dy=48;
    const X=t=>lx+(rx-lx)*t/10,Y={};lanes.forEach((l,k)=>Y[l[0]]=y0+k*dy);
    const s=M[mode][i];const col={i:'var(--acc)',g:'var(--good)',b:'var(--bad)'};
    let g='<defs>'+Object.keys(col).map(k=>'<marker id="fc-'+k+'" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="'+col[k]+'"/></marker>').join('')+'</defs>';
    lanes.forEach(l=>{g+=RD.t(4,Y[l[0]]+4,l[1],{fs:11.5,w:600})+'<line x1="'+lx+'" y1="'+Y[l[0]]+'" x2="'+rx+'" y2="'+Y[l[0]]+'" stroke="var(--line)" stroke-width="1.5"/>'});
    // lease bars
    g+='<rect x="'+X(0)+'" y="'+(Y.W1-7)+'" width="'+(X(4.5)-X(0))+'" height="14" rx="3" fill="var(--acc2)"/>';
    if(i>=2)g+='<rect x="'+X(4.5)+'" y="'+(Y.W2-7)+'" width="'+(X(10)-X(4.5))+'" height="14" rx="3" fill="var(--acc2)"/>';
    if(s.pause||i>=1&&i<=3)g+='<rect x="'+X(1.5)+'" y="'+(Y.W1-9)+'" width="'+(X(Math.min(8,Math.max(s.t,3)))-X(1.5))+'" height="18" fill="var(--bad)" opacity=".18"/>'+RD.t(X(1.6),Y.W1-12,'paused',{fs:10.5,fill:'var(--bad)'});
    if(s.exp)g+='<line x1="'+X(4.5)+'" y1="'+(Y.S-20)+'" x2="'+X(4.5)+'" y2="'+(Y.D+10)+'" stroke="var(--mute)" stroke-dasharray="3 3"/>'+RD.t(X(4.5)+3,12,'lease 33 expired',{fs:10.5,fill:'var(--mute)'});
    // all events up to now
    M[mode].slice(0,i+1).forEach((st,k)=>st.ev.forEach(e=>{const x=X(st.t),y1=Y[e[0]],y2=Y[e[1]],cur=k===i;
      g+='<line x1="'+x+'" y1="'+y1+'" x2="'+(x+8)+'" y2="'+(y2+(y2>y1?-6:6))+'" stroke="'+col[e[3]]+'" stroke-width="'+(cur?2.6:1.4)+'" opacity="'+(cur?1:.55)+'" marker-end="url(#fc-'+e[3]+')"/>';
      if(cur)g+=RD.t(4,H-4,'Now: '+e[2],{fs:11,fill:col[e[3]],w:600})}));
    if(s.rej)g+=RD.t(X(8)-4,Y.D+22,'✕ rejected',{a:'end',fs:11.5,w:600,fill:'var(--good)'});
    g+='<line x1="'+X(s.t)+'" y1="10" x2="'+X(s.t)+'" y2="'+(H-4)+'" stroke="var(--acc)" stroke-width="1" opacity=".5"/>';
    box.innerHTML=RD.svg(W,H,g,'Fencing token timeline, step '+(i+1));
    capEl.innerHTML='<div class="t">'+(i+1)+'/'+M[mode].length+'. '+s.t1+'</div><p>'+s.p+'</p>';
    cnt.innerHTML=RD.stat('Ana\'s balance in storage',s.bal+' credits',s.bad?'should end at 30 (100 − 60 − 10)':'')+RD.stat('Highest token seen by storage',s.max,mode?'checked on every write':'not checked')+RD.stat('Writes accepted',String(s.acc||0),s.rej?'one rejected':'')+RD.stat('Charges lost',s.bad?'60 credits':'none','');
  }
  const A=RD.anim({card:'rd-fence-card',ctl:'rd-fence-ctl',n:M[0].length,draw:draw,ms:2600,label:'Fencing step'});
  RD.seg(document.getElementById('rd-fence-seg'),v=>{mode=+v;A.reset(M[mode].length);A.play()});
  RD.onResize(()=>A.redraw());
})();
