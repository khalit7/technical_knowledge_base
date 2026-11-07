// ---- Reading, section 5: a direct feedback loop, stepped (no tweening), explained by the step list ol#sx-fb; plays when scrolled into view (RD.anim): the escalation model chooses which tickets get labels ----
(function(){
  const card=document.getElementById('rd-fb-card');if(!card)return;
  const el=document.getElementById('rd-fb-svg');
  // 24 tickets, illustrative: score from the escalation model, and whether the ticket truly needed a human
  const T=[[.04,0],[.08,0],[.11,0],[.15,1],[.19,0],[.23,0],[.27,0],[.31,0],[.34,1],[.38,0],[.42,0],[.46,0],[.52,1],[.56,0],[.6,1],[.64,1],[.68,0],[.72,1],[.76,1],[.8,1],[.85,1],[.89,0],[.93,1],[.97,1]];
  const THR=.5,EXPL=[3,6,10];   // ticket indices sent to a human at random in step 4 (index 3 truly needed one)
  // the explanation of each step is the step list on the left (ol#sx-fb)
  function draw(i){const W=Math.max(280,Math.min(860,RD.width(el))),m=10,x=s=>m+(W-2*m)*s,y=44,r=W<480?6:8;let b='';
    b+='<line x1="'+x(0)+'" y1="'+y+'" x2="'+x(1)+'" y2="'+y+'" stroke="var(--line)" stroke-width="2"/>';
    b+='<line x1="'+x(THR)+'" y1="'+(y-30)+'" x2="'+x(THR)+'" y2="'+(y+30)+'" stroke="var(--ink)" stroke-dasharray="4 3"/>';
    b+=RD.t(x(THR)+5,y-20,'escalate',{fs:11,fill:'var(--ink)'})+RD.t(x(THR)-5,y-20,'answer alone',{fs:11,a:'end',fill:'var(--mute)'});
    T.forEach((t,k)=>{const cx=x(t[0]),lab=(i>=1&&t[0]>=THR)||(i>=3&&EXPL.indexOf(k)>=0);
      const fill=lab?(t[1]?'var(--bad)':'var(--good)'):'var(--bg)';
      b+='<circle cx="'+cx+'" cy="'+y+'" r="'+r+'" fill="'+fill+'" stroke="'+(lab?fill:'var(--mute)')+'" stroke-width="1.4"/>';
      if(i>=2&&t[0]<THR&&t[1]&&!(i>=3&&EXPL.indexOf(k)>=0))b+='<circle cx="'+cx+'" cy="'+y+'" r="'+(r+4)+'" fill="none" stroke="var(--bad)" stroke-width="1.4" stroke-dasharray="3 2"/>';
      if(i>=3&&EXPL.indexOf(k)>=0)b+=RD.t(cx,y+r+14+(EXPL.indexOf(k)%2)*12,'random',{fs:10.5,a:'middle',fill:'var(--mute)'})});
    b+=RD.t(x(0),y+r+40,'score 0',{fs:10.5,fill:'var(--mute)'})+RD.t(x(1),y+r+40,'score 1',{fs:10.5,a:'end',fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,y+r+46,b,'24 tickets on a score axis with an escalation threshold at 0.5');}
  const A=RD.anim({card:'rd-fb-card',ctl:'rd-fb-ctl',n:4,draw,ms:4600,label:'Step',list:'sx-fb'});
  RD.onResize(()=>A.redraw());
})();
