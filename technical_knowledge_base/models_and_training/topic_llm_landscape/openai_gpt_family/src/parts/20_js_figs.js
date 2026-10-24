// ---- Reading figures: the hero (six bets: who pays, what is disclosed) and deliberative alignment before/after ----
(function(){
  const el=$('heroSvg');if(!el)return;
  const T=RD.t;
  const B=[
    {n:'Pretraining scale',y:'GPT-1 to 3, 2018 to 2020',who:0,pill:'more params, data',d:['117M, 1.5B, 175B:','sizes and papers']},
    {n:'Post-training',y:'InstructGPT, 2022',who:0,pill:'SFT, reward, PPO',d:['recipe published;','1.3B beats 175B']},
    {n:'Inference compute',y:'o-series, 2024',who:1,pill:'hidden reasoning',d:['chain of thought','hidden, but billed']},
    {n:'A router',y:'GPT-5, 2025',who:1,pill:'router sets effort',d:['the router\'s choice','is not shown']},
    {n:'Price tiers',y:'GPT-5.6 and 6, 2026',who:1,pill:'caller picks tier',d:['tier names only,','no sizes']},
    {n:'Inside the network',y:'GPT-6 Astra, 2026',who:1,pill:'loops, not tokens',d:['reasoning partly','never becomes text']}];
  const pill=(x,y,w,h,txt,on)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+(h/2)+'" fill="'+(on?'var(--acc)':'var(--dim)')+'"/>'+T(x+w/2,y+h/2+4,txt,{a:'middle',fs:10.5,fill:on?'var(--bg)':'var(--ink)',w:on?600:400});
  function draw(){
    const W=Math.round(RD.width(el));let s='',H;
    if(W>=760){
      const lx=104,cw=(W-lx)/6,yL0=62,yL1=96,lh=26,yD=148;H=258;
      s+='<rect x="'+lx+'" y="'+yL0+'" width="'+(W-lx)+'" height="'+lh+'" rx="4" fill="var(--soft)"/><rect x="'+lx+'" y="'+yL1+'" width="'+(W-lx)+'" height="'+lh+'" rx="4" fill="var(--acc2)"/>';
      s+=T(0,yL0+11,'OpenAI pays',{fs:10.5,fill:'var(--mute)',w:600})+T(0,yL0+23,'once, in training',{fs:10.5,fill:'var(--mute)'});
      s+=T(0,yL1+11,'Caller pays',{fs:10.5,fill:'var(--acc)',w:600})+T(0,yL1+23,'on every request',{fs:10.5,fill:'var(--acc)'});
      s+=T(0,yD+12,'What OpenAI',{fs:10.5,fill:'var(--mute)',w:600})+T(0,yD+25,'disclosed',{fs:10.5,fill:'var(--mute)',w:600});
      B.forEach((b,i)=>{const x=lx+i*cw,cx=x+cw/2;
        if(i)s+='<line x1="'+x+'" x2="'+x+'" y1="0" y2="'+(yD+34)+'" stroke="var(--line)"/>';
        s+='<circle cx="'+(x+12)+'" cy="12" r="9" fill="'+(b.who?'var(--acc)':'var(--mute)')+'"/>'+T(x+12,16,String(i+1),{a:'middle',fs:11,fill:'var(--bg)',w:700});
        s+=T(x+26,16,b.n,{fs:11.5,w:600})+T(x+6,36,b.y,{fs:10.5,fill:'var(--mute)'});
        s+=pill(x+5,(b.who?yL1:yL0)+3,cw-10,lh-6,b.pill,b.who);
        s+=T(cx,yD+12,b.d[0],{a:'middle',fs:10.5})+T(cx,yD+25,b.d[1],{a:'middle',fs:10.5});});
      // the move from training budget to request bill
      const xb=lx+2*cw;s+='<path d="M'+(xb-16)+' '+(yL0+lh/2)+' C '+(xb)+' '+(yL0+lh/2)+', '+(xb)+' '+(yL1+lh/2)+', '+(xb+16)+' '+(yL1+lh/2)+'" fill="none" stroke="var(--acc)" stroke-width="2" marker-end="url(#hzA)"/>';
      // gpt-oss: the one window, August 2025, between bets 3 and 4
      const gx=lx+3*cw-cw*0.55,gw=cw*2.1,gy=yD+48;
      s+='<line x1="'+(lx+3*cw)+'" x2="'+(lx+3*cw)+'" y1="'+(yD+32)+'" y2="'+gy+'" stroke="var(--open)" stroke-dasharray="4 3"/>';
      s+='<rect x="'+gx+'" y="'+gy+'" width="'+gw+'" height="44" rx="6" fill="var(--open2)" stroke="var(--open)"/>'+T(gx+gw/2,gy+18,'gpt-oss, August 2025: the one window',{a:'middle',fs:11.5,w:600})+T(gx+gw/2,gy+34,'open weights, 116.8B total, 5.1B active',{a:'middle',fs:10.5});
    }else{
      const top=24,rh=70,cO=Math.min(190,W*0.5),cw2=W-cO;
      s+=T(cO+cw2/2,12,'Who pays, and for what',{a:'middle',fs:10.5,fill:'var(--mute)',w:600});
      let y=top;
      B.forEach((b,i)=>{
        if(i===3){s+='<rect x="0" y="'+(y+2)+'" width="'+W+'" height="40" rx="6" fill="var(--open2)" stroke="var(--open)"/>'+T(8,y+18,'gpt-oss, August 2025: the one window',{fs:11,w:600})+T(8,y+33,'open weights, 116.8B total, 5.1B active',{fs:10.5});y+=48}
        s+='<line x1="0" x2="'+W+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/>';
        s+='<circle cx="10" cy="'+(y+16)+'" r="9" fill="'+(b.who?'var(--acc)':'var(--mute)')+'"/>'+T(10,y+20,String(i+1),{a:'middle',fs:11,fill:'var(--bg)',w:700});
        s+=T(24,y+20,b.n,{fs:11.5,w:600})+T(24,y+35,b.y,{fs:10.5,fill:'var(--mute)'});
        s+=pill(cO+2,y+6,cw2-4,20,b.who?'caller, per request':'OpenAI, in training',b.who)+T(cO+cw2/2,y+40,b.pill,{a:'middle',fs:10.5,fill:b.who?'var(--acc)':'var(--mute)'});
        s+=T(24,y+56,'Disclosed: '+b.d.join(' '),{fs:10.5,fill:'var(--mute)'});
        y+=rh;});
      H=y+8;
    }
    el.innerHTML=RD.svg(W,H,'<defs><marker id="hzA" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--acc)"/></marker></defs>'+s,'Six bets on where capability is bought: who pays for each and what OpenAI disclosed');
  }
  RD.onRender(draw);RD.onResize(draw);
})();
(function(){
  const el=$('daSvg');if(!el)return;
  const T=RD.t;
  const P=[
    {t:'Before: refusal as a reflex',c:'var(--bad)',b:[
      ['box',['Request: "How do I open the lock on my own shed?','I lost the key."']],
      ['box',['Trained on refusal examples: "open a lock"','looks like burglary']],
      ['bad',['Refuses. A harmful request phrased innocently','passes the same surface filter.']]]},
    {t:'After: deliberative alignment',c:'var(--good)',b:[
      ['box',['Request: "How do I open the lock on my own shed?','I lost the key."']],
      ['acc',['Chain of thought cites the written spec:','help with your own property is allowed;','defeating someone else\'s lock is not']],
      ['good',['Answers, with the boundary stated; the same','reasoning refuses the harmful phrasing.']]]}];
  const fill={box:['var(--soft)','var(--line)'],acc:['var(--acc2)','var(--acc)'],bad:['var(--soft)','var(--bad)'],good:['var(--open2)','var(--open)']};
  function panel(x,y,w,p){let s=T(x,y+12,p.t,{fs:12,w:600,fill:p.c}),yy=y+22;
    p.b.forEach(([k,lines],i)=>{const h=10+lines.length*15;
      s+='<rect x="'+x+'" y="'+yy+'" width="'+w+'" height="'+h+'" rx="6" fill="'+fill[k][0]+'" stroke="'+fill[k][1]+'"/>';
      lines.forEach((l,j)=>{s+=T(x+8,yy+17+j*15,l,{fs:11})});
      yy+=h;if(i<p.b.length-1){s+='<line x1="'+(x+w/2)+'" x2="'+(x+w/2)+'" y1="'+yy+'" y2="'+(yy+14)+'" stroke="var(--mute)" stroke-width="1.4" marker-end="url(#daA)"/>';yy+=16}});
    return {s,h:yy-y}}
  function draw(){
    const W=Math.round(RD.width(el));let s='',H;
    if(W>=640){const pw=(W-24)/2,a=panel(0,0,pw,P[0]),b=panel(pw+24,0,pw,P[1]);s=a.s+b.s;H=Math.max(a.h,b.h)+4}
    else{const a=panel(0,0,W,P[0]),b=panel(0,a.h+14,W,P[1]);s=a.s+b.s;H=a.h+14+b.h+4}
    el.innerHTML=RD.svg(W,H,'<defs><marker id="daA" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--mute)"/></marker></defs>'+s,'The same request through a reflex refusal and through deliberative alignment');
  }
  RD.onRender(draw);RD.onResize(draw);
})();
