// ---- Reading, top: the hero figure. Four tokens by plain decoding (four target passes) against one speculative step
// (four cheap draft passes, one target pass over 5 positions, 3 guesses kept, the 4th replaced by the target's token).
// Time to scale under the stated illustrative costs: draft pass 0.1, check of 5 positions 1.0 target pass.
(function(){
  const el=document.getElementById('sd-hero');if(!el)return;
  const DR=0.1,CHK=1.0;
  const plain=['The',' cat',' sat',' on'],guess=['The',' cat',' sat',' in'],keep=[1,1,1,0],fix=' on';
  function draw(){
    const W=Math.max(300,Math.min(860,RD.width(el))),L=8,R=8,u=(W-L-R)/4.15,narrow=W<520;
    const box=(x,y,w,h,cls,txt,fs)=>'<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+Math.max(1,w).toFixed(1)+'" height="'+h+'" rx="4" fill="'+cls[0]+'" stroke="'+cls[1]+'"/>'+(txt?RD.t((x+w/2).toFixed(1),y+h/2+4,txt,{a:'middle',fs:fs||11.5}):'');
    const T=['var(--acc2)','var(--acc)'],Dc=['var(--soft)','var(--mute)'];
    let s='',y=14;
    s+=RD.t(L,y,'Plain decoding: one target pass per token',{fs:12,w:600});
    y=22;for(let i=0;i<4;i++)s+=box(L+i*u+1,y,u-2,30,T,(narrow?'':'pass '+(i+1)+': ')+'"'+plain[i].trim()+'"');
    y=76;s+=RD.t(L,y,'Speculative decoding: one step, k = 4 guesses',{fs:12,w:600});
    y=84;const dw=u*DR;
    for(let i=0;i<4;i++)s+=box(L+i*dw+0.5,y,dw-1,30,Dc,'');
    const tx=L+4*dw+1,tw=u*CHK-2;s+=box(tx,y,tw,30,T,narrow?'check 5':'target checks 5');
    s+=RD.t(tx+tw+8,y+19,(narrow?'guesses':'the drafter guessed')+' "The cat sat in"',{fs:11,fill:'var(--mute)'});
    // result chips under and right of the check
    const cy=y+42,cw=Math.min(78,(W-L-R)/4-4);let cx=L;
    for(let i=0;i<4;i++){const ok=keep[i],t=ok?guess[i].trim()+' ✓':'in→on';
      s+='<rect x="'+cx.toFixed(1)+'" y="'+cy+'" width="'+cw.toFixed(1)+'" height="22" rx="4" fill="'+(ok?'var(--open2)':'var(--soft)')+'" stroke="'+(ok?'var(--good)':'var(--bad)')+'"/>'+RD.t((cx+cw/2).toFixed(1),cy+15,t,{a:'middle',fs:11.5,fill:ok?'var(--ink)':'var(--bad)'});
      cx+=cw+4}
    s+=RD.t(L,cy+38,narrow?'3 kept + the target\'s token = 4':'3 guesses kept, the 4th replaced by the target\'s token: 4 tokens',{fs:11,fill:'var(--mute)'});
    // time axis
    const ay=y+96;s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+ay+'" y2="'+ay+'" stroke="var(--line)"/>';
    const e1=L+4*u,e2=tx+tw;
    s+='<line x1="'+e2.toFixed(1)+'" x2="'+e2.toFixed(1)+'" y1="'+(y-4)+'" y2="'+(y+34)+'" stroke="var(--good)" stroke-dasharray="3 3"/>';
    s+='<line x1="'+(e1-1).toFixed(1)+'" x2="'+(e1-1).toFixed(1)+'" y1="18" y2="'+(y+34)+'" stroke="var(--mute)" stroke-dasharray="3 3"/>';
    s+='<line x1="'+e2.toFixed(1)+'" x2="'+e2.toFixed(1)+'" y1="'+(ay-5)+'" y2="'+(ay+5)+'" stroke="var(--good)" stroke-width="2"/><line x1="'+(e1-1).toFixed(1)+'" x2="'+(e1-1).toFixed(1)+'" y1="'+(ay-5)+'" y2="'+(ay+5)+'" stroke="var(--mute)" stroke-width="2"/>';
    s+=RD.t(e2+3,ay+15,'1.4 passes',{fs:11,fill:'var(--good)'})+RD.t(e1-3,ay+15,'4 passes',{a:'end',fs:11,fill:'var(--mute)'});
    s+=RD.t(L,ay+15,'time',{fs:11,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,ay+22,s,'four tokens by plain decoding against one speculative step');
  }
  RD.onRender(draw);RD.onResize(draw);draw();
})();
