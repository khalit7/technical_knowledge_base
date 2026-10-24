// ---- Reading, section 9: a lost reply and a retry under three designs (stepper; illustrative amounts and key) ----
(function(){
  const box=document.getElementById('rd-idem-svg');if(!box)return;
  const capEl=document.getElementById('rd-idem-cap'),cnt=document.getElementById('rd-idem-cnt');
  // ev: [from lane, to lane, label, colour key, lost?]; t: time on the x axis (0..10)
  const lbl=[['charge 10','charge 10, msg m-1','charge 10, key k-7f3'],['charge 10','charge 10, msg m-2','charge 10, key k-7f3']];
  function steps(m){
    const first=[
      {t:.6,ev:[['A','G',lbl[0][m],'i'],['G','P',lbl[0][m],'i']],bal:90,n:1,sees:'waiting',t1:'Ana\'s app sends the charge',
       p:['The app asks for a 10-credit charge. Nothing identifies this operation except its content.','The gateway tags each message it forwards with its own id (m-1) and drops any message whose id it has already seen, as many brokers do.','Before the first attempt the app generates a key, <code>k-7f3</code>, that names this one charge, and will reuse it on every retry.'][m]},
      {t:2.4,ev:[['P','G','ok, balance 90','g']],bal:90,n:1,sees:'waiting',store:m===2,t1:'Payments charges: 100 becomes 90',
       p:['The charge is applied and the reply sent.','The charge is applied and the reply sent. (If the gateway re-sent m-1 after its own timeout, it would drop the duplicate correctly.)','In one transaction, payments applies the charge and inserts <code>k-7f3</code> with its result into a table with a unique key.'][m]},
      {t:4,ev:[['G','A','ok, balance 90','b',1]],bal:90,n:1,sees:'timeout',t1:'The reply is lost; the app\'s timeout fires',
       p:['The fourth silence: the charge happened, and the app cannot know it. It retries, as it must.','The fourth silence: the charge happened, and the app cannot know it. It retries, as it must.','The fourth silence: the charge happened, and the app cannot know it. It retries with the same key.'][m]},
      {t:6,ev:[['A','G',lbl[1][m],'i'],['G','P',lbl[1][m],'i']],bal:90,n:1,sees:'waiting',t1:'The app retries',
       p:['The retry looks exactly like a new charge.','To the gateway the retry is a <b>new message</b>, so it gets a new id, m-2, and passes the duplicate check. This is Saltzer, Reed and Clark\'s point: application-level duplicates "look like different messages to the communication system".','The retry carries <code>k-7f3</code> again: the operation has a name the end can recognise.'][m]}];
    const last=[
      {t:8,ev:[['P','A','ok, balance 80','b']],bal:80,n:2,bad:1,sees:'ok, 80',t1:'Charged twice: 90 becomes 80',p:'Payments has no way to tell a retry from a second purchase. Ana paid 20 credits for one request.'},
      {t:8,ev:[['P','A','ok, balance 80','b']],bal:80,n:2,bad:1,sees:'ok, 80',t1:'Charged twice anyway',p:'Deduplication in the middle removed only the duplicates the middle created. The end received two different-looking requests and charged twice. Only the end can do this job.'},
      {t:8,ev:[['P','A','ok, balance 90 (stored)','g']],bal:90,n:1,store:1,hit:1,sees:'ok, 90',t1:'Key found: return the stored result, charge nothing',p:'The insert of <code>k-7f3</code> fails on the unique key, so payments returns the result it stored the first time. One charge, and the app finally hears "ok, balance 90". At-least-once delivery plus this check is the exactly-once <b>effect</b>.'}][m];
    return first.concat([last])}
  let mode=0,S=steps(0);
  function draw(i){
    const W=Math.min(640,RD.width(box)),lanes=[['A','Ana\'s app'],['G','Gateway'],['P','Payments']],H=190,lx=80,rx=W-12,y0=30,dy=58;
    const X=t=>lx+(rx-lx)*t/10,Y={};lanes.forEach((l,k)=>Y[l[0]]=y0+k*dy);
    const s=S[i],col={i:'var(--acc)',g:'var(--good)',b:'var(--bad)'};
    let g='<defs>'+Object.keys(col).map(k=>'<marker id="id-'+k+'" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="'+col[k]+'"/></marker>').join('')+'</defs>';
    lanes.forEach(l=>{g+=RD.t(4,Y[l[0]]+4,l[1],{fs:11.5,w:600})+'<line x1="'+lx+'" y1="'+Y[l[0]]+'" x2="'+rx+'" y2="'+Y[l[0]]+'" stroke="var(--line)" stroke-width="1.5"/>'});
    if(mode===2&&i>=1)g+='<rect x="'+(X(2.4)-2)+'" y="'+(Y.P+8)+'" width="'+Math.min(150,rx-X(2.4))+'" height="20" rx="4" fill="var(--soft)" stroke="var(--good)"/>'+RD.t(X(2.4)+4,Y.P+22,'keys: k-7f3 = ok, 90',{fs:11,fill:'var(--good)'});
    if(mode===1&&i>=0)g+=RD.t(X(2.4)+8,Y.G-8,'seen: m-1'+(i>=3?', m-2':''),{fs:11,fill:'var(--mute)'});
    if(i>=2)g+='<line x1="'+X(4.6)+'" y1="'+(Y.A-12)+'" x2="'+X(4.6)+'" y2="'+(Y.A+12)+'" stroke="var(--bad)" stroke-width="2"/>'+RD.t(X(4.6)+4,Y.A-14,'timeout',{fs:11,fill:'var(--bad)'});
    const dx=Math.min(34,(rx-lx)/16);
    S.slice(0,i+1).forEach((st,k)=>st.ev.forEach((e,j)=>{const x1=X(st.t)+j*dx,y1=Y[e[0]],y2=Y[e[1]],cur=k===i,lost=e[4];
      const x2=x1+dx,ye=y2+(y2>y1?-5:5),xe=lost?x1+dx/2:x2,yE=lost?(y1+ye)/2:ye;
      g+='<line x1="'+x1+'" y1="'+y1+'" x2="'+xe+'" y2="'+yE+'" stroke="'+col[e[3]]+'" stroke-width="'+(cur?2.8:1.6)+'" opacity="'+(cur?1:.5)+'"'+(lost?'':' marker-end="url(#id-'+e[3]+')"')+'/>';
      if(lost)g+=RD.t(xe+4,yE+4,'✕ lost',{fs:11,fill:'var(--bad)',w:600});
      if(cur&&j===st.ev.length-1)g+=RD.t(4,H-4,'Now: '+e[2],{fs:11,fill:col[e[3]],w:600})}));
    g+='<line x1="'+X(s.t)+'" y1="10" x2="'+X(s.t)+'" y2="'+(H-16)+'" stroke="var(--acc)" stroke-width="1" opacity=".5"/>';
    box.innerHTML=RD.svg(W,H,g,'Charge request timeline, step '+(i+1));
    capEl.innerHTML='<div class="t">'+(i+1)+'/'+S.length+'. '+s.t1+'</div><p>'+s.p+'</p>';
    cnt.innerHTML=RD.stat('Ana\'s balance',s.bal+' credits',s.bad?'should be 90':'')+RD.stat('Charges applied',String(s.n),s.bad?'one request, two charges':'')+RD.stat('The app sees',s.sees,'')+RD.stat('Duplicate check',['none','in the middle, by message id','at the end, by key'][mode],s.hit?'hit: k-7f3':'');
  }
  const A=RD.anim({card:'rd-idem-card',ctl:'rd-idem-ctl',n:S.length,draw:draw,ms:2600,label:'Retry step'});
  RD.seg(document.getElementById('rd-idem-seg'),v=>{mode=+v;S=steps(mode);A.reset(S.length)});
  RD.onResize(()=>A.redraw());
})();
