// ---- Reading tab, section 5: one gradient step on the tiny model, before and after (animation with a learning-rate switch) ----
(function(){
  const el=document.getElementById('rd-st-svg');if(!el)return;
  const M=RDM,T=RD.t,cols=['var(--c1)','var(--c4)','var(--c2)'];
  let eta=0.1,cur=0;
  const mat=Wm=>Wm.map(r=>'('+r.map(v=>M.f(v)).join(', ')+')');
  function st(){const a=M.step(M.W,eta),b=M.step(a.W2,0);return {a,b}}
  function caps(){const {a,b}=st(),f=M.f;return [
    ['Before the step','The bet is '+M.vec(a.p)+' and the loss on the truth (sat) is '+f(a.L)+' nats.'],
    ['The gradient','∇z L = p − y = '+M.vec(a.g)+'. Times the input (2, 1) it gives one row of ∇W per word: cat '+M.vec(a.gW[0])+', dog '+M.vec(a.gW[1])+', sat '+M.vec(a.gW[2])+'.'],
    ['The update, learning rate '+eta,'Each row moves against its gradient: W ← W − '+eta+' × ∇W. New rows: cat '+mat(a.W2)[0]+', dog '+mat(a.W2)[1]+', sat '+mat(a.W2)[2]+'. Dashed arrows are the old rows; the sat arrow turns towards the input, the cat arrow away.'],
    ['New scores','z′ = W′x = '+M.vec(b.z)+', the same as z − '+eta+' × 5 × (p − y), because x·x = 5.'],
    ['After the step','The bet is now '+M.vec(b.p)+' and the loss is '+f(b.L)+' nats, down from '+f(a.L)+'.'+(b.p[2]>Math.max(b.p[0],b.p[1])?' The model now bets on sat.':' The model still bets on cat, but less.')]]}
  function arrow(x1,y1,x2,y2,col,w,dash,op){const an=Math.atan2(y2-y1,x2-x1),k=7;
    return '<g opacity="'+(op==null?1:op)+'"><line x1="'+x1+'" y1="'+y1+'" x2="'+(x2-3*Math.cos(an))+'" y2="'+(y2-3*Math.sin(an))+'" stroke="'+col+'" stroke-width="'+w+'"'+(dash?' stroke-dasharray="4 3"':'')+'/>'+
      '<path d="M'+x2+','+y2+' L'+(x2-k*Math.cos(an-0.4))+','+(y2-k*Math.sin(an-0.4))+' L'+(x2-k*Math.cos(an+0.4))+','+(y2-k*Math.sin(an+0.4))+' z" fill="'+col+'"/></g>'}
  function draw(i){cur=i;const {a,b}=st(),Wd=RD.width(el),wide=Wd>=600;
    const pw=wide?Math.min(300,Wd*0.42):Math.min(Wd,300),ph=pw*0.8,bwid=wide?Wd-pw-24:Wd,bh=190;
    const H=wide?Math.max(ph,bh):ph+10+bh;
    const X0=-1.2,X1=3.2,Y0=-2.3,Y1=1.2,sc=Math.min(pw/(X1-X0),ph/(Y1-Y0)),ox=(wide?0:(Wd-pw)/2)-X0*sc,oy=Y1*sc;
    const P=(u,v)=>[ox+u*sc,oy-v*sc];let o='';
    o+='<line x1="'+P(X0,0)[0]+'" y1="'+P(0,0)[1]+'" x2="'+P(X1,0)[0]+'" y2="'+P(0,0)[1]+'" stroke="var(--line)"/><line x1="'+P(0,0)[0]+'" y1="'+P(0,Y0)[1]+'" x2="'+P(0,0)[0]+'" y2="'+P(0,Y1)[1]+'" stroke="var(--line)"/>';
    const O=P(0,0);
    M.W.forEach((r,k)=>{const E=P(r[0],r[1]);
      if(i>=2){o+=arrow(O[0],O[1],E[0],E[1],cols[k],1.5,true,0.55);const N=P(a.W2[k][0],a.W2[k][1]);o+=arrow(O[0],O[1],N[0],N[1],cols[k],2.6);
        o+=T(N[0]+5,N[1]+(a.W2[k][1]>0?-4:13),M.V[k],{fs:11.5,w:600,fill:cols[k]})}
      else{o+=arrow(O[0],O[1],E[0],E[1],cols[k],2.6);o+=T(E[0]+5,E[1]+(r[1]>0?-4:13),M.V[k],{fs:11.5,w:600,fill:cols[k]});
        if(i===1){const G=P(r[0]-0.25*a.gW[k][0],r[1]-0.25*a.gW[k][1]);o+=arrow(E[0],E[1],G[0],G[1],'var(--c3)',1.6)}}
    });
    const XE=P(2,1);o+=arrow(O[0],O[1],XE[0],XE[1],'var(--ink)',2.6)+T(XE[0]+5,XE[1]-4,'x',{fs:12,w:600});
    if(i===1)o+=T(P(X0,0)[0]+2,P(0,Y0)[1]+12,'green: direction each row will move (−∇W, drawn shorter)',{fs:10.5,fill:'var(--c3)'});
    // bars: before (outline) and after (filled)
    const bx0=wide?pw+24:0,by0=wide?0:ph+10,cw=Math.min(110,bwid/3),gx=bx0+(bwid-3*cw)/2,base=by0+bh-34,top=by0+28;
    o+=T(bx0+bwid/2,by0+14,i<4?'the bet before the step':'the bet before (outline) and after (filled)',{a:'middle',fs:12,fill:'var(--mute)'});
    o+='<line x1="'+gx+'" y1="'+base+'" x2="'+(gx+3*cw)+'" y2="'+base+'" stroke="var(--mute)"/>';
    for(let k=0;k<3;k++){const x=gx+k*cw+cw*0.2,w=cw*0.6,h0=a.p[k]*(base-top),h1=b.p[k]*(base-top);
      if(i>=4){o+='<rect x="'+x+'" y="'+(base-h1)+'" width="'+w+'" height="'+h1+'" rx="3" fill="'+cols[k]+'"/>'+
        '<rect x="'+x+'" y="'+(base-h0)+'" width="'+w+'" height="'+h0+'" rx="3" fill="none" stroke="var(--ink)" stroke-dasharray="4 3"/>'+
        T(x+w/2,base-Math.max(h0,h1)-5,M.f(a.p[k])+' → '+M.f(b.p[k]),{a:'middle',fs:11,w:600})}
      else{o+='<rect x="'+x+'" y="'+(base-h0)+'" width="'+w+'" height="'+h0+'" rx="3" fill="'+cols[k]+'" opacity="0.85"/>'+T(x+w/2,base-h0-5,M.f(a.p[k]),{a:'middle',fs:11.5,w:600})}
      o+=T(x+w/2,base+15,M.V[k]+(k===2?' (truth)':''),{a:'middle',fs:11.5})}
    el.innerHTML=RD.svg(Wd,H,o,'The weight rows as arrows before and after one gradient step, and the bet before and after');
    const c=caps()[i];document.getElementById('rd-st-cap').innerHTML='<div class="t">'+c[0]+'</div><p>'+c[1]+'</p>';
    document.getElementById('rd-st-cnt').innerHTML=RD.stat('loss before',M.f(a.L),'nats')+RD.stat('loss after',i>=4?M.f(b.L):'?','nats')+
      RD.stat('p(sat) before',M.f(a.p[2]),'')+RD.stat('p(sat) after',i>=4?M.f(b.p[2]):'?','');
  }
  const A=RD.anim({card:'rd-st-card',ctl:'rd-st-ctl',n:5,draw,ms:2300,label:'Step of the gradient update'});
  RD.seg(document.getElementById('rd-st-seg'),m=>{eta=+m;A.reset(5);A.play()});
  RD.onResize(()=>draw(cur));
})();
