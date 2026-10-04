// ---- Reading: FrontierMath tier ladder, with the best Epoch AI score on each v2 set by model release date ----
(function(){
  const card=document.getElementById('fm-card');if(!card)return;
  // Epoch AI's own runs on the v2 private sets (released 2026-06-12), by model release date; copied from the parent's src/data/saturation.json (Epoch hub, read 2026-10-04)
  const T13=[['2024-01-25',0.0,'GPT-3.5 Turbo (Jan 2024)'],['2024-04-09',0.7,'GPT-4 Turbo (Apr 2024)'],['2024-12-17',14.74,'o1 (high)'],['2025-01-31',18.6,'o3-mini (high)'],['2025-04-16',36.14,'o4-mini (high)'],['2025-08-07',55.44,'GPT-5 (high)'],['2025-10-07',55.79,'GPT-5 Pro (high)'],['2025-12-11',74.0,'GPT-5.2 Pro (xhigh)'],['2026-03-05',82.46,'GPT-5.4 Pro (xhigh)'],['2026-04-23',87.72,'GPT-5.5 Pro (xhigh)'],['2026-07-09',89.12,'GPT-5.6 Sol (max)'],['2026-09-01',90.18,'Claude Fable 5.1 (max)'],['2026-09-03',93.68,'GPT-6 Astra (max)']];
  const T4=[['2025-01-31',0.0,'o3-mini (high)'],['2025-04-16',4.88,'o4-mini (high)'],['2025-08-07',21.95,'GPT-5 (high)'],['2025-12-11',46.0,'GPT-5.2 Pro (xhigh)'],['2026-03-05',58.54,'GPT-5.4 Pro (xhigh)'],['2026-04-23',78.05,'GPT-5.5 Pro (xhigh)'],['2026-06-09',90.2,'Claude Fable 5 (max)'],['2026-09-03',97.6,'GPT-6 Astra (high)'],['2026-09-29',100.0,'GPT-6.1 Sol (max)']];
  const RUNGS=[
    {t:'Tier 1',s:'about 20% of the core',d:'Like IMO problems and advanced undergraduate exercises, but solved with tools and code rather than pencil and paper.'},
    {t:'Tier 2',s:'about 40% of the core',d:'Advanced graduate level: "an expert may devote a day or more to specialized proofs, coding, and multi-stage reasoning."'},
    {t:'Tier 3',s:'about 40% of the core',d:'"Problems which resemble early exploratory research problems of a PhD student", taking a specialist several days.'},
    {t:'Tier 4',s:'43 problems in v2 (50 in v1)',d:'An expansion set "designed to vastly exceed the difficulty of even the Tier 3 problems", written by mathematics professors and postdocs.'}];
  const ACC='Access (Epoch, 23 Jan 2025, v1 sets): OpenAI commissioned all 300 core and 50 Tier 4 problems and can see most statements and solutions; 53 core solutions and 20 Tier 4 problems are held out for Epoch\'s own runs.';
  const dates=[...new Set(T13.map(x=>x[0]).concat(T4.map(x=>x[0])))].sort();
  let selR=3;
  const best=(S,d)=>{let b=null;S.forEach(x=>{if(x[0]<=d&&(!b||x[1]>b[1]))b=x});return b};
  const fmtD=d=>{const [y,m,dd]=d.split('-');return +dd+' '+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m-1]+' '+y};
  function bar(lab,sub,b,col){return '<div class="rung" style="cursor:default"><span class="t">'+lab+'<small>'+sub+'</small></span><span><span class="d">'+(b?b[1].toFixed(b[1]%1?2:1)+'%, '+RD.esc(b[2])+', released '+fmtD(b[0]):'no model yet')+'</span><span class="bar"><span style="width:'+(b?b[1]:0)+'%;background:'+col+'"></span></span></span></div>'}
  function draw(i){const d=dates[i],a=best(T13,d),b=best(T4,d);
    let h='';RUNGS.slice().reverse().forEach((r,j)=>{const k=3-j;h+='<button class="rung'+(k===selR?' sel':'')+'" data-k="'+k+'"><span class="t">'+r.t+'<small>'+r.s+'</small></span><span class="d">'+r.d+'</span></button>'});
    h+=bar('Tier 4 v2','41 private problems',b,'var(--closed)')+bar('Tiers 1-3 v2','285 private problems, one score',a,'var(--acc)');
    const L=document.getElementById('fm-lad');L.innerHTML=h;
    L.querySelectorAll('button.rung').forEach(x=>x.addEventListener('click',()=>{selR=+x.dataset.k;draw(an.i)}));
    const tao=d>='2024-11-07'?' Tao, November 2024: these problems should "resist AIs for several years at least".':'';
    document.getElementById('fm-cap').textContent='Models released up to '+fmtD(d)+' (step '+(i+1)+' of '+dates.length+'). '+RUNGS[selR].t+': '+RUNGS[selR].d+' '+(selR<3?ACC:'Tier 4 has its own score. '+ACC)+tao;
    document.getElementById('fm-cnt').innerHTML=RD.stat('Tiers 1-3 v2, best',a?a[1].toFixed(1)+'%':'n/a',a?'≈ '+Math.round(a[1]/100*285)+' of 285':'')+
      RD.stat('Tier 4 v2, best',b?b[1].toFixed(1)+'%':'not yet run',b?'≈ '+Math.round(b[1]/100*41)+' of 41':'')+
      RD.stat('Problems left on Tier 4',b?Math.round(41-b[1]/100*41):'41','of 41 private');
  }
  const an=RD.anim({card:'fm-card',ctl:'fm-ctl',n:dates.length,start:dates.length-1,draw,ms:1500,label:'Model release date'});
})();
