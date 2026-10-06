// ---- Reading 1: one day, invoked vs resident (illustrative schedule, not a recording) ----
(function(){
  const box=document.getElementById('hp-day-svg');if(!box)return;
  const H=(h,m)=>h+m/60;
  // who: s = Sam, x = a third party, t = timer/schedule. inv: what the invoked harness does; res: the resident agent
  const EV=[
    {t:H(7,0),lab:'07:00 heartbeat',who:'t',res:'Heartbeat run: nothing new, replies NO_REPLY (dropped)',inv:null,unatt:1},
    {t:H(7,40),lab:'07:40 garage email',who:'x',res:'Seen at the 08:00 heartbeat: a one-line note to Sam ("needs your decision")',inv:'waits in the inbox until Sam looks',unatt:1},
    {t:H(8,15),lab:'08:15 Sam texts from the bus',who:'s',res:'Message run: moves the 1:1, holds the reply to Priya for approval',inv:'nobody hears it: no terminal is open'},
    {t:H(12,0),lab:'12:00 daily digest job',who:'t',res:'Scheduled run in a fresh session: three-line summary sent to Sam',inv:'never runs: nothing schedules it',unatt:1},
    {t:H(18,30),lab:'18:30 "pay the bill"',who:'s',res:'Message run: payment held for approval outside the chat',inv:'nobody hears it'},
    {t:H(21,0),lab:'21:00 heartbeat',who:'t',res:'Heartbeat run: reminds Sam of the two held approvals',inv:null,unatt:1},
    {t:H(21,30),lab:'21:30 Sam opens a terminal',who:'s',res:'(nothing new for the resident agent)',inv:'Session starts: Sam pastes the two requests; the digest and the email triage never happen',late:1}
  ];
  const cap=document.getElementById('hp-day-cap'),stats=document.getElementById('hp-day-stats');
  function draw(i){
    const W=RD.width(box),pad=12,x0=pad+4,x1=W-pad-4,T0=6.5,T1=22;
    const X=t=>x0+(x1-x0)*(t-T0)/(T1-T0);
    const narrow=W<520,hL=narrow?120:110,h=hL*2+40;
    let b='';
    const lanes=[['Invoked harness (Claude Code style)',22],['Resident agent (gateway + loop)',22+hL+18]];
    lanes.forEach(([n,y])=>{b+='<rect x="'+pad+'" y="'+y+'" width="'+(W-2*pad)+'" height="'+(hL-6)+'" rx="8" fill="var(--soft)" stroke="var(--line)"/>'+RD.t(pad+8,y+16,n,{fs:12,w:600})});
    // time axis
    [8,12,16,20].forEach(t=>{b+='<line x1="'+X(t)+'" x2="'+X(t)+'" y1="18" y2="'+(h-14)+'" stroke="var(--line)" stroke-dasharray="3 3"/>'+RD.t(X(t),h-2,(t<10?'0':'')+t+':00',{a:'middle',fs:10,fill:'var(--mute)'})});
    let onTime=0,waiting=0,never=0,unatt=0;
    EV.forEach((e,k)=>{if(k>i)return;
      const col=e.who==='s'?'var(--c1)':e.who==='x'?'var(--c2)':'var(--c5)';
      const cur=k===i;
      // invoked lane
      const yI=22+hL/2+6,yR=22+hL+18+hL/2+6;
      if(e.inv!==null){
        let st='wait';
        if(e.late)st='late';
        if(i>=6&&!e.late&&e.who==='s')st='late';
        if(i>=6&&!e.late&&e.who!=='s')st='never';
        const f=st==='late'?'var(--c3)':st==='never'?'var(--bad)':'var(--bg)';
        b+='<circle cx="'+X(e.t)+'" cy="'+yI+'" r="'+(cur?8:6)+'" fill="'+f+'" stroke="'+col+'" stroke-width="2"/>';
      }
      if(!e.late){b+='<circle cx="'+X(e.t)+'" cy="'+yR+'" r="'+(cur?8:6)+'" fill="'+col+'"/>';onTime++;if(e.unatt)unatt++}
      if(e.inv&&!e.late){if(i>=6){if(e.who!=='s')never++}else waiting++}
    });
    const e=EV[i];
    const lbl=RD.t(Math.min(Math.max(X(e.t),x0+60),x1-60),22+hL+14,RD.esc(e.lab),{a:'middle',fs:11,w:600});
    box.innerHTML=RD.svg(W,h,b+lbl,'Two lanes, one day of events');
    cap.innerHTML='<div class="t">'+RD.esc(e.lab)+'</div><p><b>Resident:</b> '+RD.esc(e.res)+'</p><p><b>Invoked:</b> '+RD.esc(e.inv||'(no event for it: a timer only exists inside a resident process)')+'</p>';
    stats.innerHTML=RD.stat('Resident: handled when they arrived',onTime,'of '+Math.min(i+1,6)+' events so far')+
      RD.stat('Resident: runs with nobody watching',unatt,'heartbeats, email triage, the job')+
      RD.stat('Invoked: waiting for a session',i>=6?0:waiting,'')+
      RD.stat('Invoked: never handled',never,i>=6?'the email triage and the job':'known only at 21:30');
  }
  RD.anim({card:'hp-day-card',ctl:'hp-day-ctl',n:EV.length,draw,ms:2200,label:'Event'});
  RD.onResize(()=>{const s=document.getElementById('hp-day-ctl-s');draw(s?+s.value:0)});
})();
