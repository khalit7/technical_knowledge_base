// ---- Reading top: hero, one vote to a score with the four places the number bends (ids rd-hero-); static, redrawn on resize ----
(function(){
  const el=document.getElementById('rd-hero-svg');if(!el)return;
  const B=[
    {t:'One battle',l:['prompt + answers A, B','names hidden','A, B, tie, both bad'],n:'A vs B, anonymous; one vote',k:1},
    {t:'Millions of votes',l:['8,626,731 votes','413 models','Text board, 2 Oct 2026'],n:'8,626,731 votes on 413 models',k:2},
    {t:'Bradley-Terry fit',l:['all votes at once','gap 100 = 64% wins','+ style: length 0.249'],n:'all at once; 100 points = 64% wins',k:3},
    {t:'Score and 95% CI',l:['1525','(1516 to 1534)','the leader'],n:'leader 1525 (1516 to 1534)',k:4},
    {t:'Rank spread',l:['leader: 1 to 1','4th by score:','2nd to 13th'],n:'leader 1 to 1; 4th could be 2 to 13',k:0}];
  const badge=(x,y,k)=>'<circle cx="'+x+'" cy="'+y+'" r="9" fill="var(--bad)"/>'+RD.t(x,y+4,k,{a:'middle',fs:11,w:700,fill:'var(--bg)'});
  function draw(){
    const W=Math.max(300,Math.min(900,RD.width(el)));let b='',H;
    const box=(x,y,w,h)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="8" fill="var(--soft)" stroke="var(--line)"/>';
    if(W>=820){
      const gap=22,bw=(W-gap*4-4)/5,bh=104,y=14;H=bh+y+10;
      B.forEach((d,i)=>{const x=2+i*(bw+gap);
        b+=box(x,y,bw,bh)+RD.t(x+10,y+22,d.t,{fs:12.5,w:700,fill:i===2?'var(--acc)':'var(--ink)'});
        d.l.forEach((s,j)=>{b+=RD.t(x+10,y+44+j*18,s,{fs:i===3&&j===0?16:11.5,w:i===3&&j===0?700:400,fill:j===0?'var(--ink)':'var(--mute)'})});
        if(i<4){const ax=x+bw+3,ay=y+bh/2;b+='<path d="M'+ax+','+ay+' h'+(gap-8)+'" stroke="var(--mute)" stroke-width="1.6"/><path d="M'+(ax+gap-8)+','+(ay-4)+' l6,4 l-6,4z" fill="var(--mute)"/>'}
        if(d.k)b+=badge(x+bw-10,y+2,d.k);
      });
    } else {
      const bh=50,gap=14,x=2,bw=W-4;H=B.length*(bh+gap)+6;
      B.forEach((d,i)=>{const y=6+i*(bh+gap);
        b+=box(x,y,bw,bh)+RD.t(x+10,y+20,d.t,{fs:12.5,w:700,fill:i===2?'var(--acc)':'var(--ink)'})+RD.t(x+10,y+38,d.n,{fs:11,fill:'var(--mute)'});
        if(i<4)b+='<path d="M'+(W/2)+','+(y+bh+1)+' v'+(gap-6)+'" stroke="var(--mute)" stroke-width="1.6"/><path d="M'+(W/2-4)+','+(y+bh+gap-6)+' l4,5 l4,-5z" fill="var(--mute)"/>';
        if(d.k)b+=badge(x+bw-14,y+14,d.k);
      });
    }
    el.innerHTML=RD.svg(W,H,b,'Pipeline from one anonymous battle to millions of votes, a Bradley-Terry fit, a score with interval and a rank spread, with four numbered places where the number bends');
  }
  RD.onRender(draw);RD.onResize(draw);draw();
})();
