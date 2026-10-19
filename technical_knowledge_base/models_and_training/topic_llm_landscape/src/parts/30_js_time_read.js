// ---- Reading, "How we got here": the shared skeleton (MoE, reasoning, hybrid attention) assembling lab by lab, quarter by quarter ----
// Draws from the release rows (window.RH); does nothing if the section's elements are not on the page.
(function(){
  const $=id=>document.getElementById(id);
  if(!$('hhM')||!window.RH||!window.RH.ROWS)return;
  const RH=window.RH,esc=RH.esc,stat=RH.stat,ROWS=RH.byDate,NQ=15,card=$('hhCard');
  const F=[{k:'moe',n:'MoE'},{k:'reasoning',n:'Reasoning'},{k:'hybrid-attention',n:'Hybrid attention'}];
  const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const FIRST={};F.forEach(x=>{FIRST[x.k]={};ROWS.forEach(r=>{if(r.k.includes(x.k)&&!FIRST[x.k][r.l])FIRST[x.k][r.l]=r})});
  const earliest=l=>F.map(x=>FIRST[x.k][l]).filter(Boolean).sort((a,b)=>a.sk<b.sk?-1:1)[0];
  const LABS=RH.LABS.filter(l=>F.some(x=>FIRST[x.k][l])).sort((a,b)=>earliest(a).sk<earliest(b).sk?-1:1);
  const short=l=>l.replace('Institute of Foundation Models (IFM)','IFM').replace('xAI/SpaceXAI','xAI / SpaceXAI');
  const dLab=r=>MON[+r.d.slice(5,7)-1]+' '+r.d.slice(2,4);
  const byQ=Array.from({length:NQ},(_,q)=>ROWS.filter(r=>r.q===q)),mxQ=Math.max(...byQ.map(a=>a.length));
  const NOTE={3:'Mixture-of-experts arrives: xAI and Mistral ship the first MoE rows.',4:'DeepSeek and Google follow with MoE.',6:'OpenAI\'s o1-preview is the first reasoning row.',
    8:'Reasoning sweeps the field, and MiniMax-Text-01 is the first hybrid-attention row.',13:'The open record passes 1.5T total parameters (DeepSeek V4 Pro).',14:'The busiest quarter in the table.'};
  const st={q:NQ-1,play:false,timer:0,vis:false,started:false,spd:1};
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  // the quarter bars are drawn once; the current quarter is outlined
  $('hhQ').innerHTML=byQ.map((a,q)=>{const o=a.filter(r=>r.o).length,c=a.length-o,h=v=>(56*v/mxQ).toFixed(1)+'px';
    return '<div data-q="'+q+'" title="'+RH.qName(q)+': '+a.length+' releases ('+o+' open, '+c+' closed)"><span style="height:'+h(o)+';background:var(--open)"></span><span style="height:'+h(c)+';background:var(--closed)"></span></div>'}).join('');
  $('hhQl').innerHTML=byQ.map((_,q)=>'<span>'+(q%4===0?"'"+(23+q/4):'')+'</span>').join('');
  $('hhQ').querySelectorAll('div').forEach(d=>d.addEventListener('click',()=>{setPlay(false);st.q=+d.dataset.q;draw()}));
  function draw(){const q=st.q;
    let s='<span></span>'+F.map(x=>'<span class="hd">'+x.n+'</span>').join('')+'<span class="hd">all</span>';
    let full=0;const cnt=[0,0,0],news=[];
    LABS.forEach(l=>{const cells=F.map((x,j)=>{const r=FIRST[x.k][l];const on=r&&r.q<=q;if(on)cnt[j]++;if(r&&r.q===q)news.push(x.n+': '+esc(short(l))+' ('+esc(r.m)+')');
        return '<span class="c'+(on?' f'+j:'')+(r&&r.q===q?' new':'')+'" title="'+(r?x.n+': '+esc(r.m)+', '+r.d:'no '+x.n+' row')+'">'+(on?dLab(r):'')+'</span>'});
      const all=F.every(x=>FIRST[x.k][l]&&FIRST[x.k][l].q<=q);if(all)full++;
      s+='<span class="nm'+(all?' all':'')+'" title="'+esc(l)+'">'+esc(short(l))+'</span>'+cells.join('')+'<span class="ok">'+(all?'✓':'')+'</span>'});
    $('hhM').innerHTML=s;
    $('hhQ').querySelectorAll('div').forEach(d=>{const k=+d.dataset.q;d.classList.toggle('on',k<=q);d.classList.toggle('cur',k===q)});
    const a=byQ[q],o=a.filter(r=>r.o).length,sofar=ROWS.filter(r=>r.q<=q),so=sofar.filter(r=>r.o).length;
    const labsQ=new Set(a.map(r=>r.l)).size;
    $('hhStep').textContent=RH.qName(q)+(q===NQ-1?' (to 30 September 2026)':'');
    $('hhCap').innerHTML=(NOTE[q]?'<b>'+NOTE[q]+'</b> ':'')+(news.length?'New firsts: '+news.join('; ')+'. ':'No new firsts this quarter. ')+
      a.length+' release'+(a.length===1?'':'s')+' from '+labsQ+' lab'+(labsQ===1?'':'s')+', '+o+' with open weights.';
    $('hhCnt').innerHTML=stat('Labs with MoE',cnt[0],'of '+RH.LABS.length+' in the table')+stat('Labs with reasoning',cnt[1],'')+stat('Labs with hybrid attention',cnt[2],'')+
      stat('Labs with all three',full,'')+stat('Open share so far',Math.round(100*so/sofar.length)+'%',so+' of '+sofar.length+' rows');
    $('hhScrub').value=q}
  const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
  function tick(){st.timer=0;if(!st.play)return;if(!live()){return}
    if(st.q>=NQ-1){setPlay(false);return}st.q++;draw();if(st.q>=NQ-1){setPlay(false);return}st.timer=setTimeout(tick,1300/st.spd)}
  function kick(){if(st.play&&live()&&!st.timer)st.timer=setTimeout(tick,st.q===0?700/st.spd:1300/st.spd);else if(!live()&&st.timer){clearTimeout(st.timer);st.timer=0}}
  function setPlay(p){st.play=p;$('hhPlay').innerHTML=p?'&#10073;&#10073; Pause':'&#9654; Play';$('hhPlay').setAttribute('aria-label',p?'Pause':'Play');
    if(!p&&st.timer){clearTimeout(st.timer);st.timer=0}if(p&&st.q>=NQ-1){st.q=0;draw()}kick()}
  $('hhPlay').addEventListener('click',()=>setPlay(!st.play));
  $('hhFwd').addEventListener('click',()=>{setPlay(false);st.q=Math.min(NQ-1,st.q+1);draw()});
  $('hhBack').addEventListener('click',()=>{setPlay(false);st.q=Math.max(0,st.q-1);draw()});
  $('hhScrub').addEventListener('input',e=>{setPlay(false);st.q=+e.target.value;draw()});
  $('hhSpd').addEventListener('change',e=>{st.spd=+e.target.value});
  // plays once the first time it scrolls into view (never under reduced motion), and only while on screen in the visible tab
  if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;
    if(st.vis&&!st.started&&card.offsetParent){st.started=true;if(!RM){st.q=0;draw();setPlay(true)}}kick()},{threshold:.2}).observe(card)}else st.vis=true;
  document.addEventListener('visibilitychange',kick);
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-read']=window.TAB_RENDER['t-read']||[]).push(()=>{draw();kick()});
  draw();
})();
