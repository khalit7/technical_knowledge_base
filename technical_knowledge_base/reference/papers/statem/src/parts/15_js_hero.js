// ---- Hero figure (light pass 2026-10-25): every before/after pair the paper reports, as dumbbells on one scale, coloured by
// whether the runbook was developed on the tasks it is scored on (Terminal-Bench 2.1) or frozen before them (BusinessBench held-out).
// Numbers: §4.2 (GPT-5.5, GPT-5.6 Sol), §4.3 (Luna, DeepSeek frozen), §4.4 (DeepSeek adapted, 89 tasks, standard timeouts), Table 1 (held-out macro).
(function(){const el=$('heroSvg');if(!el)return;
  const R=[
    {l:'GPT-5.5 xhigh',a:83.1,b:92.1,n:'reference 83.1, StateM 92.1'},
    {l:'GPT-5.6 Sol xhigh, frozen runbook',a:84.9,b:95.28,n:'95.28 raw, never adjudicated'},
    {l:'GPT-5.6 Luna, frozen runbook',a:76.7,b:85.4,n:'76.7 to 85.4'},
    {l:'DeepSeek-V4-Flash, frozen runbook',a:82.7,b:82.0,n:'82.7 to 82.0'},
    {l:'DeepSeek-V4-Flash, adapted ($37)',a:82.7,b:88.09,n:'82.7 to 88.09'},
    {l:'BusinessBench held-out, Luna',a:84.67,b:85.22,n:'+0.55 (macro)',held:true}];
  const lo=74,hi=97;
  fit(el,w=>{const wide=w>=640,lw=wide?250:0,x0=lw+6,x1=w-12,sx=v=>x0+(v-lo)/(hi-lo)*(x1-x0);let s='',y=8;
    R.forEach((r,i)=>{if(i===5){y+=10;s+=tx(0,y+12,'Held out: profiles frozen before these instances',{fs:11.5,c:'var(--mute)',w:600});y+=18}
      else if(i===0){s+=tx(0,y+12,'Terminal-Bench 2.1 (runbook built on these tasks)',{fs:11.5,c:'var(--mute)',w:600});y+=18}
      let ly=y+14;if(!wide){s+=tx(0,y+12,r.l,{fs:12,w:600});y+=16;ly=y+14}else s+=tx(0,ly,r.l,{fs:12,w:600});
      const col=r.held?'var(--c3)':'var(--c1)',xa=sx(r.a),xb=sx(r.b);
      s+=ln2(xa,ly-4,xb,ly-4,col,{sw:3});
      s+='<circle cx="'+xa.toFixed(1)+'" cy="'+(ly-4)+'" r="4.5" fill="var(--bg)" stroke="var(--mute)" stroke-width="1.6"/>';
      s+='<circle cx="'+xb.toFixed(1)+'" cy="'+(ly-4)+'" r="5" fill="'+col+'"/>';
      const right=Math.max(xa,xb)+9,left=Math.min(xa,xb)-9,lab=r.n,lwid=lab.length*6.2;
      if(right+lwid<w)s+=tx(right,ly,lab,{fs:11.5,c:'var(--ink)'});else if(left-lwid>0)s+=tx(left,ly,lab,{fs:11.5,a:'end',c:'var(--ink)'});else{s+=tx(x0,ly+16,lab,{fs:11.5,c:'var(--ink)'});y+=14}
      y+=wide?24:22});
    y+=4;s+=ln2(x0,y,x1,y,'var(--mute)');
    for(let v=75;v<=95;v+=5){const x=sx(v);s+=ln2(x,y,x,y+4,'var(--mute)');s+=tx(x,y+16,v+'%',{fs:11,a:'middle',c:'var(--mute)'})}
    s+=tx(x0,y+32,'hollow: without StateM; filled: with it (trial success, %)',{fs:11.5,c:'var(--mute)'});
    el.innerHTML=svgW(w,y+40,s,'Before and after StateM: large gains on the Terminal-Bench tasks the runbook was developed on, none for the frozen runbook on DeepSeek, and plus 0.55 points on held-out BusinessBench instances')});
  onTab('t-read',()=>refit(el));
})();
