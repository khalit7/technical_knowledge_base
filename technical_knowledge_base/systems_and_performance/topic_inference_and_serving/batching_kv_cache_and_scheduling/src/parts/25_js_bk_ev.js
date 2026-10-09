// ---- Reading section 3: 16 real agent requests through a small prefix cache under five policies (data: BKD.evanim) ----
(function(){
  const el=document.getElementById('bk-ev-svg');if(!el||!BKD.evanim)return;
  const A=BKD.evanim,NM={lru:'LRU, tail first',lru_head:'LRU, head first',fifo:'FIFO',lfu:'LFU',opt:'Belady'};
  let pol='lru',cap=24;
  const fam=l=>l[0]==='A'?'var(--c1)':l[0]==='B'?'var(--c3)':l[0]==='S'?'var(--c5)':'var(--dim)';
  const famName=b=>b[0][0]==='A'?'tool prompt A':b[0][0]==='B'?'tool prompt B':'shared first block S';
  function draw(i){
    const st=A.pol[pol+'|'+cap],r=A.reqs[i],s0=st[i];
    const W=Math.max(300,Math.min(860,RD.width(el))),s=W<480?15:18,g=3,per=Math.max(8,Math.floor((W-6)/(s+g)));
    let b='',y=12;
    const sq=(x,y,l,fill,stroke,sw,op)=>'<g opacity="'+(op||1)+'"><rect x="'+x+'" y="'+y+'" width="'+s+'" height="'+s+'" rx="2" fill="'+fill+'"'+(stroke?' stroke="'+stroke+'" stroke-width="'+sw+'"':'')+'/>'+(s>=15?'<text x="'+(x+s/2)+'" y="'+(y+s/2+3)+'" text-anchor="middle" font-size="7.5" fill="'+(l[0]==='u'?'var(--ink)':'var(--bg)')+'">'+l+'</text>':'')+'</g>';
    b+=RD.t(2,y,'request '+(i+1)+' of 16 ('+r.P.toLocaleString('en-US')+' prompt tokens): '+r.b.length+' blocks',{fs:11,fill:'var(--mute)'});y+=6;
    r.b.forEach((l,k)=>{const row=Math.floor(k/per),x=2+(k%per)*(s+g);const hit=k<s0.hit;b+=sq(x,y+row*(s+g),l,fam(l),hit?'var(--good)':'var(--bad)',hit?2.5:1.2,hit?1:0.55)});
    y+=Math.ceil(r.b.length/per)*(s+g)+14;
    b+=RD.t(2,y,'cache after it ('+s0.c.length+' of '+cap+' blocks), next to be evicted on the left',{fs:11,fill:'var(--mute)'});y+=6;
    const mine=new Set(r.b);
    for(let k=0;k<cap;k++){const row=Math.floor(k/per),x=2+(k%per)*(s+g),l=s0.c[k];
      if(l===undefined){b+='<rect x="'+x+'" y="'+(y+row*(s+g))+'" width="'+s+'" height="'+s+'" rx="2" fill="none" stroke="var(--line)" stroke-dasharray="2 2"/>';continue}
      b+=sq(x,y+row*(s+g),l,fam(l),mine.has(l)?'var(--ink)':null,1.5)}
    y+=Math.ceil(cap/per)*(s+g)+14;
    b+=RD.t(2,y,'evicted while serving it: '+(s0.ev.length?s0.ev.length+' blocks':'none'),{fs:11,fill:'var(--mute)'});y+=6;
    s0.ev.forEach((l,k)=>{const row=Math.floor(k/per),x=2+(k%per)*(s+g);b+=sq(x,y+row*(s+g),l,fam(l),null,0,0.45)});
    y+=Math.max(1,Math.ceil(s0.ev.length/per))*(s+g)+4;
    el.innerHTML=RD.svg(W,y,b,'eviction animation');
    let cum=0,tot=0,orph=0;for(let k=0;k<=i;k++){cum+=st[k].hit;tot+=A.reqs[k].b.length;orph+=st[k].orph}
    const kind=famName(r.b),miss=r.b.length-s0.hit;
    let why='';
    if(s0.orph>0)why=' '+s0.orph+' of its later blocks were still cached but useless: their prefix was gone (orphans).';
    else if(s0.hit===0&&i>0)why=' Nothing of its prefix survived.';
    document.getElementById('bk-ev-cap-t').innerHTML='<div class="t">'+NM[pol]+', request '+(i+1)+': '+kind+'</div><p>'+s0.hit+' of '+r.b.length+' blocks found at the start of the cache ('+(s0.hit*512).toLocaleString('en-US')+' prompt tokens not recomputed), '+miss+' computed and inserted'+(s0.ev.length?', '+s0.ev.length+' evicted to make room':'')+'.'+why+'</p>';
    document.getElementById('bk-ev-cnt').innerHTML=RD.stat('Hit blocks so far',cum+' of '+tot)+RD.stat('Possible with unlimited space','77 of 140 by the end')+RD.stat('Orphans met so far',String(orph))+RD.stat('Prompt tokens saved so far',(cum*512).toLocaleString('en-US'));
  }
  const an=RD.anim({card:'bk-ev-card',ctl:'bk-ev-ctl',n:16,draw:draw,ms:1700,label:'Request'});
  RD.seg(document.getElementById('bk-ev-pol'),m=>{pol=m;an.redraw()});
  document.getElementById('bk-ev-cap').addEventListener('change',e=>{cap=+e.target.value;an.redraw()});
  RD.onResize(()=>an.redraw());
})();
