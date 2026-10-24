// ---- Hero: capital to compute to a shipped Grok, five stages; wide = a row, narrow = a column ----
(function(){
  const box=$('hero');if(!box)return;
  const S=[['s-compute','1 Build compute','Colossus clusters','online in 64 to 122 days'],
    ['s-grok1','2 Pretrain big','Grok-1: 314B MoE,','last published design'],
    ['s-train','3 RL at scale','Grok 4: RL "at a','pretraining scale"'],
    ['s-heavy','4 Spend at test time','Heavy: 4 or 16 agents','81k tokens per task'],
    ['s-models','5 Ship fast and cheap','5 flagships in 8 months','$2 / $6 per 1M tokens']];
  function draw(){const cw=box.clientWidth||860,wide=cw>=780;let s='',W,H;
    const band=(x,y,w,h,col,t,href)=>'<a href="#'+href+'"><rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="6" fill="var(--soft)" stroke="'+col+'" stroke-dasharray="4 3"/><text x="'+(x+w/2)+'" y="'+(y+h/2+4)+'" text-anchor="middle" font-size="12" fill="var(--ink)">'+t+'</text></a>';
    const node=(x,y,w,h,r,hot)=>'<a href="#'+r[0]+'"><rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="7" fill="var(--bg)" stroke="'+(hot?'var(--c2)':'var(--acc)')+'" stroke-width="'+(hot?2:1.4)+'"/>'+
      '<text x="'+(x+w/2)+'" y="'+(y+19)+'" text-anchor="middle" font-size="12" font-weight="600" fill="var(--ink)">'+r[1]+'</text>'+
      '<text x="'+(x+w/2)+'" y="'+(y+37)+'" text-anchor="middle" font-size="11" fill="var(--mute)">'+r[2]+'</text>'+
      '<text x="'+(x+w/2)+'" y="'+(y+52)+'" text-anchor="middle" font-size="11" fill="var(--mute)">'+r[3]+'</text></a>';
    if(wide){W=cw;const g=18,bw=(W-4*g)/5,bh=64,y=34;H=y+bh+64;
      s+=band(0,2,W,24,'var(--good)','Data: the X firehose, in-house since March 2025; Cursor data from Grok 4.5','s-train');
      S.forEach((r,i)=>{const x=i*(bw+g);s+=node(x,y,bw,bh,r,i===2);if(i<4)s+=ar(x+bw+2,y+bh/2,x+bw+g-2,y+bh/2)});
      s+=band(0,y+bh+12,W,24,'var(--bad)','Cost: the loosest posture of any frontier lab; an injection left unpatched for 78 days','s-align');
      s+='<text x="0" y="'+(y+bh+56)+'" font-size="11" fill="var(--mute)">Highlighted: the stage xAI describes most, release after release (see Training).</text>'}
    else{W=Math.max(300,cw);const bh=60,g=16,x=0,bw=W;let y=0;
      s+=band(0,y,W,24,'var(--good)','Data: the X firehose; Cursor data','s-train');y+=32;
      S.forEach((r,i)=>{s+=node(x,y,bw,bh,r,i===2);if(i<4)s+=ar(W/2,y+bh+1,W/2,y+bh+g-1);y+=bh+g});
      y+=-g+8;s+=band(0,y,W,24,'var(--bad)','Cost: looser posture; 78-day open injection','s-align');H=y+28}
    box.innerHTML=svgEl(W,H,s,'Capital to compute to a shipped Grok, in five stages')}
  let rw=0;addEventListener('resize',()=>{const w=box.clientWidth;if(w&&Math.abs(w-rw)>20){rw=w;draw()}});
  onTab('t-read',draw);draw();rw=box.clientWidth;
})();
