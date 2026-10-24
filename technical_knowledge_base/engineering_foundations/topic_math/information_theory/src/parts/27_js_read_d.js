// ---- Reading: hero figure (top) and the temperature slider (s5) ----
(function(){
  const T=RD.t;
  // hero: loss = floor + removable, two codes (exact) and two real models on one passage (measured)
  const he=document.getElementById('it-hero');
  function drawHero(){if(!he)return;const W=Math.min(RD.width(he),760),l=4,r=8,pw=W-l-r,bh=22;let o='',y=0;
    const g=ITM.texts.en.models['openai-community/gpt2'].bpb,q=ITM.texts.en.models['Qwen/Qwen2.5-0.5B'].bpb;
    const seg=(x,w,yy,col,lab,op)=>'<rect x="'+x+'" y="'+yy+'" width="'+Math.max(1,w-1)+'" height="'+bh+'" rx="3" fill="'+col+'"'+(op?' opacity="'+op+'"':'')+'/>'+(lab&&w>60?T(x+w/2,yy+15,lab,{a:'middle',fs:11.5,w:600,fill:'var(--bg)'}):'');
    const head=(yy,s,col)=>T(l,yy,s,{fs:12,w:600,fill:col||'var(--ink)'});
    // group 1: bits per symbol, scale 2.5
    const S1=pw/2.5;
    o+=head(y+12,'Two codes, one stream (bits per symbol, exact)','var(--mute)');y+=20;
    o+=T(l,y+12,'code built for the truth p: 1.75',{fs:11.5});y+=16;
    o+=seg(l,1.75*S1,y,'var(--c1)','floor H(p) = 1.75');y+=bh+8;
    o+=T(l,y+12,'code built for a wrong guess q: 2.375',{fs:11.5});y+=16;
    o+=seg(l,1.75*S1,y,'var(--c1)','floor H(p) = 1.75')+seg(l+1.75*S1,0.625*S1,y,'var(--c2)','KL 0.625');
    if(0.625*S1<=60)o+=T(l+2.375*S1+4,y+15,'KL 0.625',{fs:11.5,w:600,fill:'var(--c2)'});
    y+=bh+18;
    // group 2: bits per byte on the Darwin passage, scale 1.1
    const S2=pw/1.1;
    o+=head(y+12,'Two models, one passage (bits per byte, measured)','var(--mute)');y+=20;
    o+=T(l,y+12,'Qwen2.5-0.5B: '+q.toFixed(3),{fs:11.5});y+=16;
    o+=seg(l,q*S2,y,'var(--c1)','floor + its own KL',0.55);y+=bh+8;
    o+=T(l,y+12,'GPT-2 (124M): '+g.toFixed(3)+' = '+q.toFixed(3)+' + <tspan fill="var(--c2)" font-weight="600">'+(g-q).toFixed(3)+' more KL</tspan>',{fs:11.5});y+=16;
    o+=seg(l,q*S2,y,'var(--c1)','floor + Qwen\'s KL',0.55)+seg(l+q*S2,(g-q)*S2,y,'var(--c2)','');
    if(l+g*S2+80<W)o+=T(l+g*S2+4,y+15,'+'+(g-q).toFixed(3)+' KL',{fs:11.5,w:600,fill:'var(--c2)'});
    y+=bh+4;
    he.innerHTML=RD.svg(W,y,o,'Cross-entropy split into entropy and KL for two codes and two real models')}
  RD.onRender(drawHero);RD.onResize(drawHero);drawHero();

  // temperature slider on the tiny model's scores
  const sl=document.getElementById('it-tp-s');if(!sl)return;
  const Z=[2,1,0],NM=['cat','dog','sat'],COL=['var(--c1)','var(--c4)','var(--c2)'];
  const tOf=v=>Math.pow(10,v/100);
  const Hb=t=>IT.H(IT.softmax(Z.map(z=>z/t)),2);
  const crv=document.getElementById('it-tp');
  function draw(){const t=tOf(+sl.value),q=IT.softmax(Z.map(z=>z/t)),h=IT.H(q,2),hn=IT.H(q,Math.E);
    const m=q.reduce((s,v,i)=>s+v*Z[i],0),va=q.reduce((s,v,i)=>s+v*(Z[i]-m)**2,0);
    document.getElementById('it-tp-v').textContent=t.toFixed(2);
    document.getElementById('it-tp-bars').innerHTML=q.map((v,i)=>'<div class="tp-row"><span>'+NM[i]+'</span><span class="tr"><span style="width:'+(100*v).toFixed(1)+'%;background:'+COL[i]+'"></span></span><b>'+v.toFixed(3)+'</b></div>').join('');
    const W=Math.min(RD.width(crv),640),H=150,l=34,r=10,tp=10,b=30,pw=W-l-r,ph=H-tp-b;
    const X=x=>l+(Math.log10(x)+1)/2*pw,Y=y=>tp+(1-y/1.7)*ph;let o='';
    [0,0.5,1,1.5].forEach(y=>{o+='<line x1="'+l+'" y1="'+Y(y)+'" x2="'+(W-r)+'" y2="'+Y(y)+'" stroke="var(--line)"/>'+T(l-5,Y(y)+4,y.toFixed(1),{a:'end',fs:10.5,fill:'var(--mute)'})});
    [0.1,0.3,1,3,10].forEach(x=>{o+=T(X(x),H-16,String(x),{a:'middle',fs:10.5,fill:'var(--mute)'})});
    o+=T(l+pw/2,H-2,'temperature T (log scale)',{a:'middle',fs:10.5,fill:'var(--mute)'});
    o+='<line x1="'+l+'" y1="'+Y(Math.log2(3))+'" x2="'+(W-r)+'" y2="'+Y(Math.log2(3))+'" stroke="var(--mute)" stroke-dasharray="5 4"/>'+T(l+4,Y(Math.log2(3))-4,'log₂ 3 = 1.585',{fs:10.5,fill:'var(--mute)'});
    let d='';for(let k=0;k<=120;k++){const x=Math.pow(10,-1+k/60);d+=(k?'L':'M')+X(x).toFixed(1)+','+Y(Hb(x)).toFixed(1)}
    o+='<path d="'+d+'" fill="none" stroke="var(--c4)" stroke-width="2.2"/><circle cx="'+X(t)+'" cy="'+Y(h)+'" r="4.5" fill="var(--c2)"/>';
    crv.innerHTML=RD.svg(W,H,o,'Entropy of the sampling distribution against temperature');
    document.getElementById('it-tp-cnt').innerHTML=RD.stat('entropy',h.toFixed(3)+' bits',hn.toFixed(3)+' nats')+RD.stat('effective choices 2^H',Math.pow(2,h).toFixed(2),'of 3 words')+RD.stat('dH/dT',(va/(t*t*t)).toFixed(3)+' nats','Var(z) / T³, always ≥ 0')}
  sl.addEventListener('input',draw);RD.onRender(draw);RD.onResize(draw);draw();
})();
