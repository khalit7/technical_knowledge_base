// ---- Prompt caching across a session: one model, a mid-session switch, and Fusion's lead + sidekick ----
(function(){
  const card=$('v-fusion');if(!card)return;
  $('fuAnim').innerHTML=animCtl('fu',[['one','One model throughout'],['route','Switch models mid-session'],['fusion','Fusion: lead + sidekick']]);
  // Illustrative session: 20K of system prompt and task, 4K of new material per turn. Units: thousands of tokens.
  const S0=20,D=4;
  function linear(model,from,to,lane){const out=[];for(let i=from;i<=to;i++)out.push({x:i,lane:lane||0,model,ctx:S0+D*(i-1)});return out}
  // each turn: cached = part of its prompt already in that model's cache; fresh = processed at full price
  function withCache(turns,rule){return turns.map((u,j)=>{const r=rule(u,j);return Object.assign(u,r)})}
  const ONE=withCache(linear('F',1,12),u=>u.x===1?{cached:0,fresh:u.ctx}:{cached:u.ctx-D,fresh:D});
  const ROUTE=withCache([...linear('F',1,6),...linear('C',7,9),...linear('F',10,12)],u=>{
    if(u.x===1)return {cached:0,fresh:u.ctx};if(u.x===7||u.x===10)return {cached:0,fresh:u.ctx,miss:1};return {cached:u.ctx-D,fresh:D}});
  // Fusion: lead lane 0 (frontier), sidekick lane 1 (cheaper); the sidekick's context is its own prompt (8K) + the brief (2K) + its work
  const FU=[];
  [1,2,3,4].forEach(i=>FU.push({x:i,lane:0,model:'F',ctx:S0+D*(i-1),cached:i===1?0:S0+D*(i-2),fresh:i===1?S0:D}));
  FU[3].brief=1;
  for(let i=5;i<=10;i++){const ctx=10+D*(i-5);FU.push({x:i,lane:1,model:'C',ctx,cached:i===5?0:ctx-D,fresh:i===5?ctx:D})}
  FU.push({x:11,lane:0,model:'F',ctx:S0+D*3+2,cached:S0+D*3,fresh:2,result:1});
  FU.push({x:12,lane:0,model:'F',ctx:S0+D*4+2,cached:S0+D*3+2,fresh:D});
  const MODES={
    one:{name:'One model throughout',turns:ONE,steps:[
      {t:'Turns 1 to 3: the prefix is cached',n:3,c:'Every turn resends the whole history. The provider caches the shared prefix, so after the first turn only the new part (dark) is processed at full price; the rest (light) is read from cache at a small fraction of the price.'},
      {t:'Turns 4 to 8: the cached part grows with the history',n:8,c:'The context keeps growing, but almost all of it is a prefix the model has already seen, so the fresh part stays small.'},
      {t:'Turns 9 to 12: the session ends',n:12,c:'One model, one unbroken prefix: the cache never misses after the first turn. This is the baseline Claude Code works in.'}]},
    route:{name:'Switch models mid-session',turns:ROUTE,steps:[
      {t:'Turns 1 to 6: as before',n:6,c:'Same session, same model, same cached prefix.'},
      {t:'Turn 7: a router switches to a cheaper model',n:7,c:'Cached computation belongs to one model on one provider. The cheaper model has never seen this session, so the <b>whole 44K history</b> is processed at full price: a cache miss as big as the context.'},
      {t:'Turns 8 and 9: the new model caches its own copy',n:9,c:'The cheaper model now caches the prefix for itself and the fresh part shrinks again.'},
      {t:'Turn 10: back to the frontier model',n:10,c:'Most cached inputs expire after about five minutes, and the frontier model has been idle. Its cache is gone: the <b>whole 56K history</b> is re-processed, at frontier prices this time.'},
      {t:'Turns 11 and 12: warm again',n:12,c:'Each switch cost one full re-read of the history. Routing per turn trades a cheaper token for a re-read every time the model changes.'}]},
    fusion:{name:'Fusion: lead + sidekick',turns:FU,steps:[
      {t:'Turns 1 to 3: the lead plans',n:3,c:'The frontier lead reads the task and owns the plan, in its own context with its own cache.'},
      {t:'Turn 4: the lead writes a brief',n:4,c:'For a piece of work, the lead hands the sidekick a <b>brief</b>: constraints and success criteria, not the transcript.'},
      {t:'Turns 5 to 10: the sidekick works in its own context',n:10,c:'The cheaper sidekick explores, edits, builds and tests in a context of its own (its prompt plus the brief), cached in its own cache. Nothing is resent to the lead.'},
      {t:'Turn 11: a result comes back, not a transcript',n:11,c:'The sidekick reports a short result. The lead appends 2K to a prefix it still has cached, so it re-reads nothing.'},
      {t:'Turn 12: the lead reviews',n:12,c:'Two models, two unbroken prefixes. In Artificial Analysis\'s runs Fusion used more tokens and nearly three times the steps, but a higher share of them came from cache (measured figures below).'}]}};
  Object.values(MODES).forEach(m=>m.steps.forEach((s,i)=>{s.from=i?m.steps[i-1].n:0}));
  const cl=v=>Math.max(0,Math.min(1,v));
  function draw(st,mode,step){
    const box=$('fuSvg'),W=Math.min(780,Math.max(300,Math.round(box.clientWidth||340))),narrow=W<560;
    const two=st.m==='fusion',pl=narrow?6:96,pr=8,laneH=narrow?96:120,top=18,gap=two?(narrow?40:34):0;
    const H=top+laneH*(two?2:1)+gap+42;
    const cw=(W-pl-pr)/12,bw=Math.max(6,cw-(narrow?4:8)),ys=tk=>laneH*tk/70;
    // how many turns are shown, and how far the current one has grown
    const shown=step.from+(step.n-step.from)*cl(st.t),full=Math.floor(shown+1e-9),part=shown-full;
    let s='';
    const lanes=two?[['Lead','frontier model'],['Sidekick','cheaper model']]:[['Session','']];
    lanes.forEach((L,li)=>{const y0=top+li*(laneH+gap);
      s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+(y0+laneH)+'" y2="'+(y0+laneH)+'" stroke="var(--line)"/>';
      if(narrow)s+='<text x="'+pl+'" y="'+(y0-4)+'" font-size="11.5" font-weight="600">'+L[0]+(L[1]?' <tspan font-weight="400" fill="var(--mute)">('+L[1]+')</tspan>':'')+'</text>';
      else{s+='<text x="'+(pl-8)+'" y="'+(y0+laneH/2)+'" font-size="12" font-weight="600" text-anchor="end">'+L[0]+'</text>';if(L[1])s+='<text x="'+(pl-8)+'" y="'+(y0+laneH/2+15)+'" font-size="11" fill="var(--mute)" text-anchor="end">'+L[1]+'</text>'}});
    let cached=0,fresh=0,miss=0;
    mode.turns.forEach((u,j)=>{const idx=j+1;if(idx>full+1)return;const g=idx<=full?1:part;if(g<=0)return;
      const y0=top+(two?u.lane:0)*(laneH+gap)+laneH,x=pl+cw*(u.x-1)+(cw-bw)/2;
      const col=u.model==='F'?'var(--c2)':'var(--c6)';
      const hc=ys(u.cached)*g,hf=ys(u.fresh)*g;
      s+='<rect x="'+x+'" y="'+(y0-hc)+'" width="'+bw+'" height="'+hc+'" fill="'+col+'" opacity=".28"/>';
      s+='<rect x="'+x+'" y="'+(y0-hc-hf)+'" width="'+bw+'" height="'+hf+'" fill="'+col+'" opacity="'+(u.miss?1:.85)+'"'+(u.miss?' stroke="var(--bad)" stroke-width="2"':'')+'/>';
      if(u.miss&&g>.6)s+='<text x="'+(x+bw/2)+'" y="'+(y0-hc-hf-5)+'" font-size="11" text-anchor="middle" fill="var(--bad)">miss</text>';
      if(u.brief&&g>.6&&two){const xb=x+bw/2;s+='<line x1="'+xb+'" y1="'+(y0+3)+'" x2="'+(pl+cw*4+cw/2)+'" y2="'+(top+laneH+gap+laneH-ys(10)-4)+'" stroke="var(--mute)" stroke-dasharray="3 2" marker-end="MARK"/><text x="'+(xb+6)+'" y="'+(y0+15)+'" font-size="11" fill="var(--mute)">brief</text>'}
      if(u.result&&g>.6){const xr=x+bw/2;s+='<line x1="'+(pl+cw*9+cw/2)+'" y1="'+(top+laneH+gap+laneH-ys(30)-4)+'" x2="'+xr+'" y2="'+(y0+3)+'" stroke="var(--mute)" stroke-dasharray="3 2" marker-end="MARK"/><text x="'+(xr-6)+'" y="'+(y0+15)+'" font-size="11" fill="var(--mute)" text-anchor="end">result</text>'}
      cached+=u.cached*g;fresh+=u.fresh*g;if(u.miss&&g>=1)miss++});
    for(let i=1;i<=12;i+=narrow?2:1)s+='<text x="'+(pl+cw*(i-.5))+'" y="'+(H-22)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+i+'</text>';
    s+='<text x="'+((pl+W-pr)/2)+'" y="'+(H-6)+'" font-size="11" text-anchor="middle" fill="var(--mute)">turn (bar height: input tokens that turn, to scale)</text>';
    box.innerHTML=svgEl(W,H,s,'Prompt caching, '+mode.name);
    const tot=cached+fresh,end=st.k===mode.steps.length-1&&st.t>=1;
    $('fuCnt').innerHTML=stat('Read from cache',fmt(cached)+'K','light part of each bar')+stat('Processed at full price',fmt(fresh)+'K','dark part')+stat('Cache hit rate',tot?Math.round(100*cached/tot)+'%':'..','this illustrative session')+stat('Full re-reads',fmt(miss),miss?'one per model switch':'none');
  }
  makeAnim({card,pre:'fu',modes:MODES,start:'one',dur:2600,draw});
})();
