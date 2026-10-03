// ---- Milestones and benchmarks: shared helpers, headline stats, the timeline and the milestone cards ----
(function(){
  const D=window.MS;if(!D)return;
  const $=id=>document.getElementById(id);
  const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const A=(u,t)=>'<a href="'+esc(u)+'" target="_blank" rel="noopener noreferrer">'+t+'</a>';
  const NP=id=>'https://app.notion.com/p/'+id;
  const DOM={games:['Games','var(--c1)'],control:['Control','var(--c3)'],robotics:['Robotics','var(--c2)'],language:['Language','var(--c4)']};
  const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dtxt=d=>{const p=d.split('-');return p.length===1?p[0]:p.length===2?MON[+p[1]-1]+' '+p[0]:(+p[2])+' '+MON[+p[1]-1]+' '+p[0]};
  const yfrac=d=>{const p=d.split('-').map(Number);return p[0]+((p[1]||7)-1)/12+((p[2]||15)-1)/365};
  const childName=id=>id===D.deep?'Deep RL':id===D.llm?'RL for LLMs':'child page';
  window.MSU={$,esc,A,NP,DOM,dtxt};
  // the tab's own section links
  document.querySelectorAll('#t-miles [data-ms-go]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();const t=$(a.dataset.msGo);if(t)t.scrollIntoView({block:'start',behavior:'smooth'})}));

  // headline stats
  const nTab=Object.keys(D.T).length;
  const st=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+d+'</div></div>';
  $('ms-stats').innerHTML=st('Milestones',D.M.length,dtxt(D.M[0].d)+' to '+dtxt(D.M[D.M.length-1].d)+', four domains')+
    st('Atari-57 numbers',D.A.length,'printed in '+nTab+' source tables, each with its protocol')+
    st('Medians printed for DQN','6','from 47.5% to 93.5%, all correct for their protocol')+
    st('Corrections',D.M.filter(m=>m.fix).length,'to common claims, each against its source');

  // ---- cards ----
  function card(m,open){
    const dm=DOM[m.dom];
    let h='<div class="ms-meta"><span class="ms-dom" style="background:'+dm[1]+'">'+dm[0]+'</span>'+esc(dtxt(m.d))+' &middot; '+esc(m.org)+'</div>';
    h+='<h4>'+esc(m.t)+'</h4>';
    h+='<p><span class="k">Achieved</span>'+esc(m.what)+'</p>';
    h+='<p><span class="k">Method</span>'+esc(m.how)+' '+A(NP(m.child),'More on '+childName(m.child))+(m.page?' &middot; '+A(NP(m.page),'paper page'):'')+'</p>';
    h+='<p><span class="k">Compute or samples</span>'+esc(m.cost||'Not disclosed.')+'</p>';
    if(m.res&&m.res.length)h+='<dl class="ms-res">'+m.res.map(r=>'<dt>'+esc(r[0])+'</dt><dd>'+esc(r[1])+'</dd>').join('')+'</dl>';
    if(m.fix)h+='<div class="ms-fix"><b>Correction.</b> '+esc(m.fix)+'</div>';
    if(m.note)h+='<p class="small mute">'+esc(m.note)+'</p>';
    h+='<div class="ms-src"><span class="k">Source</span>'+m.src.map(s=>A(s.u,esc(s.n))).join('; ')+'</div>';
    return h;
  }
  const f={dom:'all',fix:false,sel:null};
  const vis=m=>(f.dom==='all'||m.dom===f.dom)&&(!f.fix||!!m.fix);
  function list(){
    const L=D.M.filter(vis);
    $('ms-cnt').textContent=L.length+' of '+D.M.length+' milestones shown. Each card opens to the full entry.';
    $('ms-list').innerHTML=L.map(m=>'<details class="ms-card'+(f.sel===m.id?' sel':'')+'" data-id="'+m.id+'"><summary><b>'+esc(dtxt(m.d))+'</b> &middot; '+esc(m.t)+' <span class="ms-meta">('+DOM[m.dom][0].toLowerCase()+(m.fix?', correction':'')+')</span></summary>'+card(m)+'</details>').join('');
  }
  function detail(){
    const m=D.M.find(x=>x.id===f.sel);
    $('ms-det').innerHTML=m?'<div class="ms-card sel">'+card(m)+'</div>':'<p class="small mute">Click a dot for its milestone.</p>';
  }
  // ---- the timeline: one lane per domain, broken axis 1991 to 1993 | 2013 to 2026 ----
  function draw(){
    const host=$('ms-tl');if(!host||!host.offsetParent)return;
    const W=Math.max(300,Math.round(host.clientWidth||600));
    const narrow=W<520,left=narrow?62:84,right=10,top=22;
    const segA=[1991.5,1993],segB=[2013,2026];
    const gap=22,wA=narrow?26:40,xA0=left,xB0=left+wA+gap,wB=W-right-xB0;
    const sx=y=>y<2000?xA0+(Math.min(Math.max(y,segA[0]),segA[1])-segA[0])/(segA[1]-segA[0])*wA:xB0+(Math.min(Math.max(y,segB[0]),segB[1])-segB[0])/(segB[1]-segB[0])*wB;
    const lanes=['games','control','robotics','language'];
    const r=narrow?5:6,minDx=2*r+3;
    // stack dots that would overlap within a lane
    const pos={},levels={};
    lanes.forEach(L=>{levels[L]=1;const placed=[];
      D.M.filter(m=>m.dom===L).sort((a,b)=>yfrac(a.d)-yfrac(b.d)).forEach(m=>{const x=sx(yfrac(m.d));let lv=0;
        while(placed.some(p=>p.lv===lv&&Math.abs(p.x-x)<minDx))lv++;placed.push({x,lv});pos[m.id]={x,lv};levels[L]=Math.max(levels[L],lv+1)})});
    const step=2*r+2;let y=top;const laneY={};
    lanes.forEach(L=>{laneY[L]=y;y+=Math.max(26,levels[L]*step+10)});
    const H=y+8;
    let s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Timeline of reinforcement learning milestones by domain">';
    const ticks=[[1992,'1992']].concat([2013,2015,2017,2019,2021,2023,2025].map(t=>[t,narrow?"'"+String(t).slice(2):String(t)]));
    ticks.forEach(([t,lab])=>{const x=sx(t);s+='<line x1="'+x+'" x2="'+x+'" y1="'+(top-4)+'" y2="'+(H-6)+'" stroke="var(--line)"/><text x="'+x+'" y="'+(top-8)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+lab+'</text>'});
    // break marks
    const xb=xA0+wA+gap/2;s+='<path d="M'+(xb-5)+' '+(top-2)+' l4 8 M'+(xb+1)+' '+(top-2)+' l4 8" stroke="var(--mute)" fill="none"/>';
    lanes.forEach((L,i)=>{const yy=laneY[L],hh=(i<3?laneY[lanes[i+1]]:H-8)-yy;
      if(i%2)s+='<rect x="0" y="'+yy+'" width="'+W+'" height="'+hh+'" fill="var(--soft)" opacity="0.7"/>';
      s+='<text x="'+(left-8)+'" y="'+(yy+13)+'" font-size="11.5" text-anchor="end" fill="'+DOM[L][1]+'" font-weight="600">'+DOM[L][0]+'</text>'});
    D.M.forEach((m,i)=>{const p=pos[m.id],cy=laneY[m.dom]+r+5+p.lv*step,on=f.sel===m.id,v=vis(m);
      s+='<circle data-i="'+i+'" cx="'+p.x.toFixed(1)+'" cy="'+cy+'" r="'+(on?r+2:r)+'" fill="'+(m.fix?'var(--bg)':DOM[m.dom][1])+'" stroke="'+DOM[m.dom][1]+'" stroke-width="'+(m.fix?2.2:1)+'" opacity="'+(v?1:0.15)+'"><title>'+esc(dtxt(m.d)+': '+m.t)+'</title></circle>';
      if(on)s+='<circle cx="'+p.x.toFixed(1)+'" cy="'+cy+'" r="'+(r+5)+'" fill="none" stroke="var(--ink)" stroke-width="1.5"/>'});
    s+='</svg>';host.innerHTML=s;
    host.querySelectorAll('circle[data-i]').forEach(c=>c.addEventListener('click',()=>{const m=D.M[+c.dataset.i];f.sel=m.id;draw();detail();list()}));
  }
  $('ms-leg').innerHTML=Object.keys(DOM).map(k=>'<span><i style="background:'+DOM[k][1]+'"></i>'+DOM[k][0]+'</span>').join('')+'<span><i style="background:var(--bg);border:2px solid var(--mute);box-sizing:border-box"></i>hollow: carries a correction</span>';
  document.querySelectorAll('#ms-dom button').forEach(b=>b.addEventListener('click',()=>{f.dom=b.dataset.v;document.querySelectorAll('#ms-dom button').forEach(x=>x.classList.toggle('on',x===b));draw();list()}));
  $('ms-onlyfix').addEventListener('change',e=>{f.fix=e.target.checked;draw();list()});
  // open a card: select it on the timeline too
  $('ms-list').addEventListener('toggle',e=>{const d=e.target;if(d.open&&d.dataset.id&&f.sel!==d.dataset.id){f.sel=d.dataset.id;draw();detail();d.classList.add('sel')}},true);
  // the corrections list jumps to the milestone
  window.MSU.select=id=>{f.sel=id;f.dom='all';f.fix=false;$('ms-onlyfix').checked=false;document.querySelectorAll('#ms-dom button').forEach(x=>x.classList.toggle('on',x.dataset.v==='all'));draw();detail();list();$('ms-h-tl').scrollIntoView({block:'start'})};
  f.sel=null;list();detail();
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-miles']=(window.TAB_RENDER['t-miles']||[]).concat([draw]);
  let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(draw,120)});
  draw();
})();
