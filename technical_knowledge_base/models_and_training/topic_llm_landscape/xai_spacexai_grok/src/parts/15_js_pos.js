// ---- Price and position tab: AA v4.3 index against cost per task or blended price ----
(function(){
  if(!$('psSvg'))return;
  const FRONT=['Anthropic','OpenAI','Google DeepMind','Meta','SpaceXAI (xAI)'];
  const LC={'Anthropic':'var(--c2)','OpenAI':'var(--c1)','Google DeepMind':'var(--c3)','Meta':'var(--c4)','SpaceXAI (xAI)':'var(--ink)'};
  const blend=r=>(3*r.pi+r.po)/4;
  let ax='cpt',filt='all',sel=AA.find(r=>/^Grok 4\.7/.test(r.m));
  const xv=r=>ax==='cpt'?r.cpt:blend(r);
  function info(r){const g=/^Grok/.test(r.m);return stat(r.m,'Index '+r.ix.toFixed(1),r.lab+(r.ow?', open weights':'')+'; on AA since '+r.d)+stat('Cost per index task',usd(r.cpt,2),'what AA paid per task')+stat('Blended price, 3:1',usd(blend(r),2)+' per 1M',usd(r.pi,2)+' in, '+usd(r.po,2)+' out')+(g?'':stat('Against Grok 4.7',(r.ix-46.4>=0?'+':'')+(r.ix-46.4).toFixed(1)+' points',(r.cpt/3.7383).toFixed(2)+'x its cost per task'))}
  function draw(){const rows=AA.filter(r=>filt==='all'||(filt==='front'?FRONT.includes(r.lab):r.ow));
    const W=Math.max(340,Math.min(880,$('psSvg').clientWidth||800)),H=W<500?340:420,narrow=W<500;
    const xr=ax==='cpt'?[0.005,12]:[0.05,40],xt=ax==='cpt'?[[0.01,'$0.01'],[0.1,'$0.10'],[1,'$1'],[10,'$10']]:[[0.1,'$0.10'],[1,'$1'],[10,'$10']];
    const lg=Math.log10,pl=40,pr=12,pt=12,pb=36,y0=5,y1=62,X=v=>pl+(W-pl-pr)*(lg(v)-lg(xr[0]))/(lg(xr[1])-lg(xr[0])),Y=v=>pt+(H-pt-pb)*(1-(v-y0)/(y1-y0));
    let s='';[10,20,30,40,50,60].forEach(v=>{s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/><text x="'+(pl-6)+'" y="'+(Y(v)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+v+'</text>'});
    xt.forEach(([v,l])=>{s+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+pt+'" y2="'+(H-pb)+'" stroke="var(--line)"/><text x="'+X(v)+'" y="'+(H-pb+15)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+l+'</text>'});
    s+='<text x="'+((pl+W-pr)/2)+'" y="'+(H-4)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+(ax==='cpt'?'Cost per index task (log scale)':'Blended price per 1M tokens, 3 input : 1 output (log scale)')+'</text>';
    s+='<text x="12" y="'+((pt+H-pb)/2)+'" font-size="11" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 12 '+((pt+H-pb)/2)+')">Intelligence Index v4.3</text>';
    const g6=AA.find(r=>/^Grok 4\.6/.test(r.m)),g7=AA.find(r=>/^Grok 4\.7/.test(r.m));
    rows.slice().sort((a,b)=>(/^Grok/.test(a.m)?1:0)-(/^Grok/.test(b.m)?1:0)).forEach(r=>{const g=/^Grok/.test(r.m),c=LC[r.lab]||'var(--dim)',on=r===sel,x=X(Math.max(xr[0],Math.min(xr[1],xv(r)))),y=Y(r.ix);
      s+='<g data-i="'+AA.indexOf(r)+'" style="cursor:pointer"><title>'+r.m+': '+r.ix.toFixed(1)+', '+usd(xv(r),2)+'</title><circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+(g?6.5:on?6:4.5)+'" fill="'+(r.ow?'var(--bg)':c)+'" stroke="'+(on?'var(--ink)':c)+'" stroke-width="'+(on?2.4:1.6)+'" fill-opacity="'+(g?1:.85)+'"/><circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="11" fill="transparent"/>';
      if(g){const is7=/4\.7/.test(r.m)||x>W-120;s+='<text x="'+(x+(is7?-10:10)).toFixed(1)+'" y="'+(y+(is7?-9:16)).toFixed(1)+'" font-size="11" font-weight="600" fill="var(--ink)" text-anchor="'+(is7?'end':'start')+'">'+r.m+'</text>'}
      s+='</g>'});
    if(g6&&g7&&rows.includes(g6)&&rows.includes(g7))s+=ar(X(xv(g6))+6,Y(g6.ix)-2,X(xv(g7))-7,Y(g7.ix)+3);
    $('psSvg').innerHTML=svgEl(W,H,s,'Intelligence Index against cost, '+rows.length+' models')+'<div class="leg">'+Object.entries(LC).map(([l,c])=>'<span><i style="background:'+c+';height:8px"></i>'+l+'</span>').join('')+'<span><i style="background:var(--dim);height:8px"></i>other labs</span><span>hollow: open weights</span></div>';
    $('psSvg').querySelectorAll('g[data-i]').forEach(g=>{const f=()=>{sel=AA[+g.dataset.i];$('psOut').innerHTML=info(sel)};g.addEventListener('click',()=>{f();draw()});g.addEventListener('mouseenter',f)});
    if(sel)$('psOut').innerHTML=info(sel);
    const best={};AA.forEach(r=>{if(!best[r.lab]||r.ix>best[r.lab].ix)best[r.lab]=r});const top=Object.values(best).sort((a,b)=>b.ix-a.ix).slice(0,8);
    $('psTab').innerHTML='<thead><tr><th>#</th><th>Lab, best model</th><th class="num">Index</th><th class="num">Cost per task</th><th class="num">Blend</th></tr></thead><tbody>'+top.map((r,i)=>'<tr'+(/Grok/.test(r.m)?' style="background:var(--hl)"':'')+'><td>'+(i+1)+'</td><td>'+r.lab+'<br><span class="small mute">'+r.m+'</span></td><td class="num">'+r.ix.toFixed(1)+'</td><td class="num">'+usd(r.cpt,2)+'</td><td class="num">'+usd(blend(r),2)+'</td></tr>').join('')+'</tbody>';
    $('psNote').innerHTML='Ranked by each lab\'s best model. SpaceXAI is fifth: Artificial Analysis called Grok 4.7 a top-four result on 21 September, before Gemini 4 Argon (30 September). Grok 4.7 costs '+usd(g7.cpt,2)+' per task against Grok 4.6\'s '+usd(g6.cpt,2)+' at identical $2 / $6 prices, because it writes about 81,000 output tokens per task against 36,000 ('+A(U.aa47,'Artificial Analysis')+'). Hollow dots are open-weights models.'}
  segBind('psX',v=>{ax=v;draw()});
  const ch=$('psF');ch.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{ch.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));filt=b.dataset.m;draw()}));
  onTab('t-pos',draw);
})();
