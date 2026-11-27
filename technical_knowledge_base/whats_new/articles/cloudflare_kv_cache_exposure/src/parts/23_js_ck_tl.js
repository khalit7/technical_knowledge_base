// Section 1's timeline: one row per event, spaced by event (not to scale); the exposure span shaded. Every event is also in the caption.
(function(){
  const el=document.getElementById('ck-tl-svg');if(!el)return;
  // [date, who (1 Cloudflare, 2 SGLang, 3 researcher), short label, long label]
  const E=[
    ['6 Jul',2,'#30233 reports the bug','Issue #30233 reports the bug (GLM-5.2, 1M window)'],
    ['3 Aug',1,'page-tag checks announced','Cloudflare announces page-tag integrity checks'],
    ['mid-Aug',1,'tags tested, then disabled','Page tags tested on GLM 5.2, then disabled'],
    ['27 Aug',1,'GLM-5.3 launches, pool &lt; window','GLM-5.3 launches: pool 681,280 &lt; window 1,048,576'],
    ['5 Sep',2,'#30233 closed; v0.5.19','#30233 closed for inactivity; v0.5.19 released'],
    ['6 Sep',2,'#36988 merged (the fix)','#36988 merged on main: the change that stops it'],
    ['8 Sep',3,'report via HackerOne','Report via HackerOne (23:11)'],
    ['9 Sep',1,'offline, then restored','Incident 13:22, private 14:00, restored 19:40'],
    ['16 Sep',2,'#38935 merged','#38935 (admission doors) and #39500 (checksum) merged'],
    ['18 Sep',2,'v0.5.20 ships #36988','v0.5.20 released with #36988'],
    ['2 Oct',2,'v0.5.21','v0.5.21: deferred release on by default'],
    ['19 Oct',2,'v0.5.22','v0.5.22: the version Cloudflare recommends'],
    ['26 Oct',1,'coordinated disclosure','Coordinated disclosure: Cloudflare and SGLang']];
  const col=w=>['','var(--c1)','var(--c2)','var(--c3)'][w];
  function draw(){
    const W=RD.width(el),narrow=W<430,rh=26,y0=14,H=y0+E.length*rh+6,xa=narrow?62:72;
    let s='';
    const ya=y0+3*rh+rh/2-9,yb=y0+7*rh+rh/2+9; // 27 Aug to 9 Sep
    s+='<rect x="'+(xa-10)+'" y="'+ya+'" width="'+(W-xa+6)+'" height="'+(yb-ya)+'" rx="6" fill="var(--bad)" fill-opacity=".09"/>';
    s+='<line x1="'+xa+'" x2="'+xa+'" y1="'+y0+'" y2="'+(H-6)+'" stroke="var(--line)" stroke-width="2"/>';
    E.forEach((e,i)=>{const y=y0+i*rh+rh/2;
      s+=RD.t(xa-12,y+4,e[0],{a:'end',fs:12,fill:'var(--mute)'});
      s+='<circle cx="'+xa+'" cy="'+y+'" r="5.5" fill="'+col(e[1])+'"/>';
      s+=RD.t(xa+12,y+4,narrow?e[2]:e[3],{fs:12,fill:'var(--ink)',w:(i===3||i===5||i===7)?600:400});
    });
    el.innerHTML=RD.svg(W,H,s,'Timeline of the bug, the fix and the incident, 6 July to 26 October 2026');
  }
  RD.onRender(draw);RD.onResize(draw);draw();
})();
