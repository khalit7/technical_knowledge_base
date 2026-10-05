// ---- Reading tab, section 2: softmax in two moves, and temperature (animation with a temperature switch) ----
(function(){
  const el=document.getElementById('rd-sm-svg');if(!el)return;
  const M=RDM,T=RD.t,cols=['var(--c1)','var(--c4)','var(--c2)'],z=M.mv(M.W,M.x);
  let temp=1,cur=0,A;
  function stages(){const zt=z.map(v=>v/temp),e=zt.map(v=>Math.exp(v)),S=e.reduce((a,b)=>a+b,0),p=e.map(v=>v/S);return {zt,e,S,p}}
  function caps(){const s=stages(),f=M.f,tl=temp===1?'':' divided by T = '+temp;
    return [
      ['The scores'+(temp===1?'':' divided by the temperature'),'z'+(temp===1?'':'/T')+' = '+M.vec(s.zt)+'. Scores can be any size and sign, and they do not add up to anything in particular.'],
      ['Move 1: exponentiate','e raised to each score'+tl+': '+M.vec(s.e)+'. Every bar is now positive, and a score one higher means a bar 2.718 times taller.'],
      ['Add them up','The total is '+f(s.S)+'. It plays the role of 100%.'],
      ['Move 2: divide by the total','p = '+M.vec(s.p)+'. The bars add up to 1: a bet. The right word, sat, gets '+(100*s.p[2]).toFixed(1)+'%.'+(temp===1?' Try T = 0.5 and T = 2 above.':temp<1?' A low temperature exaggerates the gaps: the favourite takes more.':' A high temperature shrinks the gaps: the bet spreads out.')]]}
  function draw(i){cur=i;const s=stages(),Wd=RD.width(el),H=210,base=170,top=34;
    const cw=Math.min(150,(Wd-20)/3),x0=(Wd-3*cw)/2;let out='';
    // what the bars show at this step
    let vals,mx,label;
    if(i===0){vals=s.zt;mx=Math.max(...s.zt.map(Math.abs),1);label='score'}
    else if(i<=2){vals=s.e;mx=Math.max(...s.e);label='e^score'}
    else{vals=s.p;mx=1;label='probability'}
    out+=T(Wd/2,16,label==='probability'?'probabilities (bars on a 0 to 1 scale)':label==='score'?'scores':'e to the power of each score (scaled to the tallest)',{a:'middle',fs:12,fill:'var(--mute)'});
    out+='<line x1="'+(x0-4)+'" y1="'+base+'" x2="'+(x0+3*cw+4)+'" y2="'+base+'" stroke="var(--mute)"/>';
    vals.forEach((v,k)=>{const h=Math.abs(v)/mx*(base-top-14),bx=x0+k*cw+cw*0.22,bw=cw*0.56,y=v>=0?base-h:base;
      out+='<rect x="'+bx+'" y="'+y+'" width="'+bw+'" height="'+Math.max(1,h)+'" rx="3" fill="'+cols[k]+'" opacity="'+(k===2?1:0.8)+'"/>'+
        T(bx+bw/2,y-5,M.f(v),{a:'middle',fs:12,w:600})+
        T(bx+bw/2,base+16,M.V[k]+(k===2?' (truth)':''),{a:'middle',fs:12})});
    if(i===2)out+=T(Wd/2,base+34,'total = '+M.f(s.S),{a:'middle',fs:12.5,w:600,fill:'var(--c5)'});
    if(i===3)out+=T(Wd/2,base+34,'sum = '+M.f(s.p.reduce((a,b)=>a+b,0))+' at T = '+temp,{a:'middle',fs:12,fill:'var(--mute)'});
    el.innerHTML=RD.svg(Wd,H+4,out,'Softmax bars for cat, dog and sat');
    const c=caps()[i];document.getElementById('rd-sm-cap').innerHTML='<div class="t">'+c[0]+'</div><p>'+c[1]+'</p>';
  }
  A=RD.anim({card:'rd-sm-card',ctl:'rd-sm-ctl',n:4,draw,ms:1900,label:'Step of the softmax'});
  RD.seg(document.getElementById('rd-sm-seg'),m=>{temp=+m;A.reset(4);A.play()});
  RD.onResize(()=>draw(cur));
})();
