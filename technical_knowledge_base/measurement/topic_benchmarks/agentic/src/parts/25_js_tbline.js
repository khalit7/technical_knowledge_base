// ---- Reading: Terminal-Bench versions on one time axis (click a version) ----
(function(){
  const fig=document.getElementById('tbl-fig');if(!fig)return;
  const sv=AG.survey;
  const V=[
    {v:'1.0',d:'2025-05-19',ds:'19 May 2025',n:80,ver:'Tests run inside the agent\'s container',to:'not surveyed',top:'64.5%, Apex2 agent with Claude Sonnet 4.5 (15 Oct 2025); board frozen',topk:'ind',note:'"As of launch we\'ve created 80 tasks." Saturated within months and retired.'},
    {v:'2.0',d:'2025-11-07',ds:'7 Nov 2025 (with Harbor)',n:89,ver:'Same container; '+sv.tb2.curl+' of '+sv.tb2.n+' test scripts fetch uv with curl at verification time',to:'agent timeout '+sv.tb2.tmin/60+' to '+sv.tb2.tmax/60+' min, median '+sv.tb2.tmed/60+' min',top:'84.7%, NexAU-AHE agent with GPT-5.5 (14 May 2026, &plusmn;2.1)',topk:'ind',note:'The paper: frontier agents under 65% at launch. Broken at 100% by Berkeley RDI (Apr 2026).'},
    {v:'2.1',d:'2026-05-06',ds:'6 May 2026',n:89,ver:'Same as 2.0',to:'as 2.0',top:'83.8%, Claude Code with Claude Fable 5 (xhigh) (7 Jun 2026, &plusmn;1.2); lab: 91.9% GPT-5.6 Sol Ultra, four parallel agents (OpenAI)',topk:'ind',note:'Fixed 28 of the 89 tasks; Opus 4.6 in Claude Code went from 58.0% on 2.0 to 70.1% on 2.1, so 2.0 and 2.1 are different scales.'},
    {v:'3.0',d:'2026-07-23',ds:'tag 23 Jul 2026 (post 30 Jul)',n:74,ver:'Separate verifier environment in '+sv.tb3.sep+' of '+sv.tb3.n+' task files',to:'agent timeout '+sv.tb3.tmin/60+' min to '+sv.tb3.tmax/3600+' h, median '+sv.tb3.tmed/3600+' h',top:'about 34% at launch: GPT-5.6 Sol in Codex 34.4%, Claude Fable 5 in Claude Code 33.8% (announcement chart)',topk:'ind',note:'"74 tasks across 7 domains." Replaced five weeks later.'},
    {v:'4.0',d:'2026-08-26',ds:'tag 26 Aug 2026 (post 28 Aug)',n:66,ver:'Separate verifier in '+sv.tb4.sep+' of '+sv.tb4.n+'; nothing installed at trial time ('+sv.tb4.curl+' fetch tools)',to:'flat 8 h ('+sv.tb4.t8h+' of '+sv.tb4.n+' files state 28,800 s)',top:'58.18%, Codex with GPT-6 Astra (max) (3 Sep 2026, &plusmn;2.79); Fable 5.1 57.88%; Opus 5 (xhigh) 53.94%; Grok 4.7 (xhigh) 37.58%',topk:'ind',note:'8 removed (2 saturated, 2 refused, 2 public solutions, 2 quality), 19 fixed. Lab: Opus 5.5 66.4% (Anthropic).'},
    {v:'Science 0.1',d:'2026-08-27',ds:'27 Aug 2026',n:70,ver:'Same harness; task-specific tests',to:'three trials per task',top:'68.1%, Codex with GPT-6 Astra (max) (3 Sep 2026, &plusmn;3.2); launch top 30.0% Claude Opus 5',topk:'ind',note:'376 contributors, 22 countries. Lab and board disagree: Fable 5.1 52.6% (Anthropic) against 40.0% (board). 0.2 accepting tasks until 5 Oct 2026.'}
  ];
  let cur=4;
  const t0=Date.parse('2025-04-01'),t1=Date.parse('2026-10-15');
  function draw(){
    const W=RD.width(fig),pad=14,H=150;
    const x=d=>pad+(W-2*pad)*(Date.parse(d)-t0)/(t1-t0);
    let b='<line x1="'+pad+'" x2="'+(W-pad)+'" y1="96" y2="96" stroke="var(--line)" stroke-width="2"/>';
    ['2025-07-01','2026-01-01','2026-07-01'].forEach(d=>{b+='<line x1="'+x(d)+'" x2="'+x(d)+'" y1="92" y2="100" stroke="var(--mute)"/>'+RD.t(x(d),116,d.slice(0,7),{a:'middle',fs:10.5,fill:'var(--mute)'})});
    const maxN=89;
    const pos=[];V.forEach((v,i)=>{let xx=x(v.d);if(i&&xx-pos[i-1]<20)xx=pos[i-1]+20;pos.push(xx)});
    V.forEach((v,i)=>{const xx=pos[i],h=50*v.n/maxN,sel=i===cur;
      b+='<g data-i="'+i+'" style="cursor:pointer"><rect x="'+(xx-7)+'" y="'+(90-h)+'" width="14" height="'+h+'" rx="2" fill="'+(sel?'var(--acc)':'var(--acc2)')+'" stroke="var(--acc)"/>'+
        (Math.abs(xx-x(v.d))>1?'<line x1="'+x(v.d)+'" x2="'+xx+'" y1="96" y2="92" stroke="var(--acc)"/>':'')+'<circle cx="'+xx+'" cy="96" r="'+(sel?6:4.5)+'" fill="'+(sel?'var(--acc)':'var(--bg)')+'" stroke="var(--acc)" stroke-width="2"/>'+
        RD.t(xx,(i%2?140:130),v.v==='Science 0.1'?'Sci 0.1':v.v,{a:'middle',fs:11.5,w:sel?600:400})+RD.t(xx,86-h,v.n,{a:'middle',fs:10,fill:'var(--mute)'})+
        '<rect x="'+(xx-16)+'" y="20" width="32" height="128" fill="transparent"/></g>'});
    b+=RD.t(pad,12,'bar height: number of tasks',{fs:10.5,fill:'var(--mute)'});
    fig.innerHTML=RD.svg(W,H,b,'Terminal-Bench versions on a time axis');
    fig.querySelectorAll('g[data-i]').forEach(g=>g.addEventListener('click',()=>{cur=+g.dataset.i;draw()}));
    const v=V[cur];
    document.getElementById('tbl-info').innerHTML='<div class="kv"><dt>Version</dt><dd><b>Terminal-Bench '+v.v+'</b>, '+v.ds+'</dd><dt>Tasks</dt><dd>'+v.n+'</dd><dt>Checker</dt><dd>'+v.ver+'</dd><dt>Limits</dt><dd>'+v.to+'</dd><dt>Top score</dt><dd>'+v.top+' <span class="nl i">board</span></dd><dt>Note</dt><dd>'+v.note+'</dd></div>';
  }
  draw();RD.onResize(draw);RD.onRender(draw);
})();
