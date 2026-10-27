// ---- Index against cost per task on two index versions (each view its own axis), with the cost frontier ----
(function(){
  const box=$('aaSvg');if(!box)return;
  const S411={mu:'Artificial Analysis, Muse Spark 1.3 article (Sep 2)',reg:'The Register, citing Artificial Analysis (Sep 2)',zai:'Z.ai model page, vendor-reported, discounted tier',oai:'OpenAI Astra table (Sep 3)'};
  const SNAP='Artificial Analysis model pages, read 2026-10-01 (v4.3.2)';
  // w: released this week; v: vendor-reported; s: source
  const V={
    v411:{name:'v4.1.1',y:[55,67],yt:[56,58,60,62,64,66],pts:[
      {n:'Claude Fable 5.1 (max)',i:66,c:3.76,w:1,s:S411.reg},
      {n:'Claude Opus 5 (high)',i:61,c:1.23,s:S411.mu},
      {n:'GPT-5.6 Sol (max)',i:61,c:0.95,s:S411.mu},
      {n:'Grok 4.6 (high)',i:61,c:0.94,s:S411.mu},
      {n:'Muse Spark 1.3 (xhigh)',i:61,c:0.55,w:1,s:S411.mu},
      {n:'GLM-5.3 (max)',i:60,c:0.68,s:S411.mu},
      {n:'GPT-5.6 Sol (xhigh)',i:59,c:0.63,s:S411.mu},
      {n:'Gemini 3.8 Flash (high)',i:59,c:0.58,w:1,s:S411.mu},
      {n:'Muse Spark 1.2',i:57,c:0.40,s:S411.mu},
      {n:'GLM-5.3-Flash',i:57,c:0.045,w:1,v:1,s:S411.zai}],
      ghost:[{n:'GLM-5.3-Flash, as the issue states',i:57,c:0.09,s:'the issue; no source states $0.09'}],
      unpriced:'Claude Opus 5 (max) 63, Claude Fable 5 (max) 62, Muse Spark 1.3 (max, limited preview) 62, GPT-6 Astra 61.2 (in OpenAI\'s own table), Kimi K3 (max) 60'},
    v43:{name:'v4.3',y:[38,56],yt:[40,44,48,52],pts:[
      {n:'Claude Fable 5.1 (max)',i:53.4,c:7.63,w:1,s:SNAP},
      {n:'GPT-6 Astra (max)',i:52.7,c:3.26,w:1,s:SNAP},
      {n:'Claude Opus 5 (max)',i:50.8,c:5.86,s:SNAP},
      {n:'Muse Spark 1.3 (max)',i:48.1,c:1.60,w:1,s:SNAP+'; priced at Meta\'s API price'},
      {n:'GPT-5.6 Sol (max)',i:47.0,c:1.99,s:SNAP},
      {n:'Qwen3.8 Max (0902)',i:45.4,c:5.41,w:1,s:SNAP},
      {n:'Muse Spark 1.3 (xhigh)',i:45.1,c:1.37,w:1,s:SNAP},
      {n:'GLM-5.3 (max)',i:44.8,c:2.01,s:SNAP},
      {n:'Grok 4.6 (high)',i:44.3,c:1.86,s:SNAP},
      {n:'Kimi K3 (max)',i:43.6,c:2.00,s:SNAP},
      {n:'GLM-5.3-Flash',i:41.8,c:0.25,w:1,s:SNAP},
      {n:'Gemini 3.8 Flash (high)',i:40.9,c:1.24,w:1,s:SNAP}],
      ghost:[],unpriced:'K2 Horizon 375B 30.5 (below this range; no price listed)'}};
  let ver='v411',sel=null;
  const frontier=pts=>{const o=pts.slice().sort((a,b)=>a.c-b.c||b.i-a.i);let best=-1;return o.filter(p=>{if(p.i>best){best=p.i;return true}return false})};
  const usd2=c=>'$'+(c<0.1?c.toFixed(3):c.toFixed(2));
  function draw(){
    const D=V[ver],cw=box.clientWidth||360,narrow=cw<560;
    const W=Math.max(300,Math.round(cw)),H=narrow?320:360,pl=38,pr=narrow?6:14,pt=10,pb=40;
    const xr=[0.03,12],lg=Math.log10,X=v=>pl+(W-pl-pr)*(lg(v)-lg(xr[0]))/(lg(xr[1])-lg(xr[0])),Y=v=>pt+(H-pt-pb)*(1-(v-D.y[0])/(D.y[1]-D.y[0]));
    let s='';
    D.yt.forEach(v=>{s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/><text x="'+(pl-5)+'" y="'+(Y(v)+4)+'" font-size="11" text-anchor="end" fill="var(--mute)">'+v+'</text>'});
    [0.05,0.1,0.25,0.5,1,2,4,8].forEach(v=>{s+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+(H-pb)+'" y2="'+(H-pb+4)+'" stroke="var(--mute)"/><text x="'+X(v)+'" y="'+(H-pb+16)+'" font-size="11" text-anchor="middle" fill="var(--mute)">$'+v+'</text>'});
    s+='<text x="'+((pl+W-pr)/2)+'" y="'+(H-4)+'" font-size="11" text-anchor="middle" fill="var(--mute)">cost per index task, US dollars (log scale)</text>';
    s+='<text x="'+(pl+4)+'" y="'+(pt+11)+'" font-size="11" fill="var(--mute)">Intelligence Index '+D.name+'</text>';
    // frontier as a step line
    const F=frontier(D.pts);let path='';F.forEach((p,k)=>{path+=(k?'H'+X(p.c)+'V'+Y(p.i):'M'+X(p.c)+' '+Y(p.i))});path+='H'+(W-pr);
    s+='<path d="'+path+'" fill="none" stroke="var(--good)" stroke-width="1.6" stroke-dasharray="5 3"/>';
    // points
    const placed=[];D.pts.forEach(p=>placed.push({x:X(p.c)-6,y:Y(p.i)-6,w:12,h:12}));
    // keep labels off the frontier line too
    F.forEach((p,k)=>{const x1=X(p.c),y1=Y(p.i),x2=k<F.length-1?X(F[k+1].c):W-pr;placed.push({x:x1,y:y1-3,w:x2-x1,h:6,line:1});if(k<F.length-1)placed.push({x:x2-3,y:Y(F[k+1].i),w:6,h:y1-Y(F[k+1].i),line:1})});
    const base=n=>n.replace(/ \((max|high|xhigh)\)/,''),dup=n=>D.pts.filter(q=>base(q.n)===base(n)).length>1;
    const pts=D.pts.concat(D.ghost.map(g=>Object.assign({g:1},g)));
    pts.forEach((p,k)=>{const cx=X(p.c),cy=Y(p.i),isS=sel===p.n,col=p.w?'var(--c2)':'var(--mute)';
      if(p.g)s+='<circle class="aap" data-k="'+k+'" cx="'+cx+'" cy="'+cy+'" r="5.5" fill="none" stroke="var(--c2)" stroke-width="1.5" stroke-dasharray="2 2"><title>'+p.n+': $'+p.c+'</title></circle>';
      else if(p.v)s+='<path class="aap" data-k="'+k+'" d="M'+cx+' '+(cy-7)+'l7 7l-7 7l-7-7z" fill="'+col+'" stroke="'+(isS?'var(--ink)':'var(--bg)')+'" stroke-width="'+(isS?2:1)+'"><title>'+p.n+'</title></path>';
      else s+='<circle class="aap" data-k="'+k+'" cx="'+cx+'" cy="'+cy+'" r="'+(isS?7:5.5)+'" fill="'+col+'" stroke="'+(isS?'var(--ink)':'var(--bg)')+'" stroke-width="'+(isS?2:1)+'"><title>'+p.n+'</title></circle>';
      // label: week releases always tried, others only on wide screens; skipped when every position collides
      if(p.g||(!p.w&&narrow&&!isS))return;
      const t=dup(p.n)?p.n:base(p.n),tw=t.length*6.1+4,th=13;
      const cand=[[cx+9,cy+4,'start'],[cx-9,cy+4,'end'],[cx,cy-10,'middle'],[cx,cy+18,'middle']];
      // first pass avoids points, labels and the frontier line; a week release may cross the line if nothing else fits
      const hit=(r,lineOk)=>placed.some(q=>(!lineOk||!q.line)&&r.x<q.x+q.w&&q.x<r.x+r.w&&r.y<q.y+q.h&&q.y<r.y+r.h);
      for(const lineOk of p.w?[false,true]:[false]){let done=false;
        for(const [lx,ly,an] of cand){const x0=an==='start'?lx:an==='end'?lx-tw:lx-tw/2,r={x:x0,y:ly-11,w:tw,h:th};
          if(r.x<pl||r.x+r.w>W-pr+2||r.y<pt||r.y+r.h>H-pb)continue;
          if(hit(r,lineOk))continue;
          placed.push(r);s+='<text x="'+lx+'" y="'+ly+'" font-size="11" text-anchor="'+an+'"'+(p.w?'':' fill="var(--mute)"')+' paint-order="stroke" stroke="var(--bg)" stroke-width="3">'+t+'</text>';done=true;break}
        if(done)break}});
    box.innerHTML=svgEl(W,H,s,'Intelligence Index '+D.name+' against cost per task');
    box.querySelectorAll('.aap').forEach(m=>m.addEventListener('click',()=>{const p=pts[+m.dataset.k];sel=p.n;draw();det(p)}));
    $('aaLgd').innerHTML='<span><i style="background:var(--c2);border-radius:50%"></i>released this week</span><span><i style="background:var(--mute);border-radius:50%"></i>reference model</span>'+(ver==='v411'?'<span><i style="background:var(--c2);transform:rotate(45deg);width:9px;height:9px"></i>vendor-reported cost</span><span><i style="border:1.5px dashed var(--c2);border-radius:50%;background:none"></i>the issue\'s $0.09</span>':'')+'<span><i style="height:2px;background:var(--good)"></i>cost frontier</span>';
    // stats
    const FR=frontier(D.pts),fr=FR.map(p=>dup(p.n)?p.n:base(p.n)).join(', ');
    let st;
    if(ver==='v411'){const at59=D.pts.filter(p=>p.i>=59&&!p.v).sort((a,b)=>a.c-b.c);
      st=stat('Cheapest at 59 or above',at59[0].n.replace(' (xhigh)',' xhigh'),usd2(at59[0].c)+' per task; Gemini 3.8 Flash next at '+usd2(at59[1].c))+
        stat('Gemini 3.8 Flash, "cheapest at its level"','only among models at 59','Muse Spark 1.3 (xhigh) scores 61 for $0.55, announced the same day')+
        stat('Cost frontier on v4.1.1',FR.length+' of '+D.pts.length+' priced models',fr)}
    else{const g=D.pts.find(p=>p.n.startsWith('Gemini')),glm=D.pts.find(p=>p.n==='GLM-5.3-Flash');
      st=stat('Gemini 3.8 Flash on v4.3',g.i+' at '+usd2(g.c),'GLM-5.3-Flash scores '+glm.i+' for '+usd2(glm.c)+': the claim no longer holds')+
        stat('Same models, both versions','13 to 18 points lower','v4.3 swapped in harder agentic tasks; cost per task 2 to 3 times higher')+
        stat('Cost frontier on v4.3',FR.length+' of '+D.pts.length+' priced models',fr)}
    $('aaStats').innerHTML=st+'<div class="stat"><div class="k">No cost per task published</div><div class="d">'+D.unpriced+'</div></div>';
  }
  function det(p){$('aaDet').innerHTML='<b>'+p.n+'</b>, Intelligence Index '+V[ver].name+': <b>'+p.i+'</b>, '+usd2(p.c)+' per index task. <span class="mute small">Source: '+p.s+'.</span>'}
  segBind('aaVer',m=>{ver=m;sel=null;$('aaVer').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));$('aaDet').innerHTML='<span class="mute small">Click or tap a point for its source.</span>';draw()});
  let rw=box.clientWidth;addEventListener('resize',()=>{const w=box.clientWidth;if(w&&w!==rw){rw=w;draw()}});
  onTab(box.closest('.tab').id,draw);draw();
})();
