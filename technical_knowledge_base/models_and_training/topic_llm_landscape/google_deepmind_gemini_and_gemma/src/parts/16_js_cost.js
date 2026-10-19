// ---- Cost per task: price list, index vs cost, one task taken apart; plus the Reading-tab 3.7 vs 3.8 card ----
const AA={};AAR.forEach(r=>{AA[r[11]]={n:r[0],lab:r[1],idx:r[2],cpt:r[3],tot:r[4],tin:r[5],tout:r[6],trs:r[7],pin:r[8],pout:r[9],pc:r[10],slug:r[11]}});
const INTRO={'gemini-3-8-flash':1,'gemini-3-7-flash':1,'gemini-4-argon':1};
// cached share back-solved from the run total: tot = [tin((1-h)pin + h pc) + tout pout]/1e6
const hFit=m=>(m.tin*m.pin+m.tout*m.pout-m.tot*1e6)/(m.tin*(m.pin-m.pc));
(function(){ // Reading: 3.7 vs 3.8
  const a=AA['gemini-3-7-flash'],b=AA['gemini-3-8-flash'];
  const rows=[['Input tokens, whole run',a.tin,b.tin,v=>(v/1e9).toFixed(2)+'B'],['Output tokens, whole run',a.tout,b.tout,v=>fmt(v/1e6)+'M'],['of which reasoning',a.trs,b.trs,v=>fmt(v/1e6)+'M'],['Cost per index task',a.cpt,b.cpt,v=>'$'+v.toFixed(2)]];
  let s='<div class="small mute" style="margin-bottom:4px">3.7 Flash (light bar) against 3.8 Flash (dark bar), both at high, identical prices. Bar length relative to 3.8 Flash; the ratio is on the right.</div><div class="bars">';
  rows.forEach(([n,x,y,f])=>{s+='<div class="row"><span class="nm">'+n+'</span><span class="track"><span class="fill" style="width:'+(x/y*100)+'%;background:var(--acc2);height:7px"></span><span class="fill" style="top:7px;width:100%;background:var(--acc);height:7px"></span></span><span class="val">×'+(y/x).toFixed(2)+'</span></div><div class="small mute" style="margin:-2px 0 4px">'+f(x)+' → '+f(y)+'</div>'});
  $('wh').innerHTML=s+'</div><p class="small mute" style="margin:4px 0 0">From Artificial Analysis\' run data, v4.3 ({{3.7 Flash|@aa37}}, {{3.8 Flash|@aa38}}). The cost ratio (×1.34) sits between the input and output ratios because cached input is cheap and most of each run\'s input is cached.</p>';
})();
(function(){ // price list by generation
  const G=['2.5','3','3.1','3.5','3.6','3.7','3.8','4'];
  const S=[
    {n:'Flash',c:'var(--acc)',p:[['2.5',0.30,2.50,'2.5 Flash'],['3',0.50,3.00,'3 Flash Preview'],['3.5',1.50,9.00,'3.5 Flash'],['3.6',1.50,7.50,'3.6 Flash',0.75,3.75],['3.7',1.50,7.50,'3.7 Flash',0.75,3.75],['3.8',1.50,7.50,'3.8 Flash',0.75,3.75]]},
    {n:'Flash-Lite',c:'var(--c3)',p:[['2.5',0.10,0.40,'2.5 Flash-Lite'],['3.1',0.25,1.50,'3.1 Flash-Lite'],['3.5',0.30,2.50,'3.5 Flash-Lite']]},
    {n:'Pro and above',c:'var(--closed)',p:[['2.5',1.25,10,'2.5 Pro'],['3.1',2,12,'3.1 Pro'],['4',4,20,'4 Argon',2,10]]}
  ];
  let which='out';
  function draw(){
    const W=640,H=270,pl=50,pr=96,pt=14,pb=34,io=which==='out'?2:1;
    const lo=which==='out'?0.3:0.08,hi=which==='out'?30:6;
    const lx=g=>pl+(W-pl-pr)*(G.indexOf(g)+0.5)/G.length,ly=v=>pt+(H-pt-pb)*(1-(Math.log10(v)-Math.log10(lo))/(Math.log10(hi)-Math.log10(lo)));
    let s='';(which==='out'?[0.5,1,2,5,10,20]:[0.1,0.25,0.5,1,2,4]).forEach(v=>{s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+ly(v)+'" y2="'+ly(v)+'" stroke="var(--line)"/><text x="'+(pl-6)+'" y="'+(ly(v)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">$'+v+'</text>'});
    G.forEach(g=>{s+='<text x="'+lx(g)+'" y="'+(H-pb+16)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+g+'</text>'});
    s+='<text x="'+((pl+W-pr)/2)+'" y="'+(H-3)+'" font-size="11" text-anchor="middle" fill="var(--mute)">Gemini generation</text>';
    s+='<text x="12" y="'+((pt+H-pb)/2)+'" font-size="11" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 12 '+((pt+H-pb)/2)+')">'+(which==='out'?'output':'input')+' $ per million (log)</text>';
    const ends=[];
    S.forEach(q=>{s+='<path d="M'+q.p.map(p=>lx(p[0]).toFixed(1)+','+ly(p[io]).toFixed(1)).join('L')+'" fill="none" stroke="'+q.c+'" stroke-width="2"/>';
      q.p.forEach(p=>{s+='<circle cx="'+lx(p[0])+'" cy="'+ly(p[io])+'" r="4.5" fill="'+q.c+'"><title>'+p[3]+': $'+p[1]+' / $'+p[2]+(p[4]?' standard; $'+p[4]+' / $'+p[5]+' introductory to 31 Dec 2026':'')+'</title></circle>';
        if(p[4]){const v=p[io+3];s+='<circle cx="'+lx(p[0])+'" cy="'+ly(v)+'" r="4.5" fill="var(--bg)" stroke="'+q.c+'" stroke-width="1.6"><title>'+p[3]+' introductory: $'+p[4]+' / $'+p[5]+'</title></circle><line x1="'+lx(p[0])+'" x2="'+lx(p[0])+'" y1="'+(ly(p[io])+5)+'" y2="'+(ly(v)-5)+'" stroke="'+q.c+'" stroke-dasharray="2 2"/>'}});
      const l=q.p[q.p.length-1];ends.push({y:ly(l[io]),c:q.c,n:q.n,how:q.n})});
    s+=endLabels(ends,W-pr+8);
    $('plSvg').innerHTML=svgEl(W,H,s,'Gemini list prices by generation');
  }
  segBind('plS',m=>{which=m;draw()});onTab('t-cost',draw);
})();
(function(){ // index vs cost per task
  const named={'claude-fable-5-1':1,'gpt-5-6-sol':1,'grok-4-6':1};
  const LEFT={'gemini-4-argon':1,'gemini-3-7-flash':1,'claude-fable-5-1':1};
  function draw(){
    const y27=$('scY').checked;
    const W=660,H=330,pl=44,pr=16,pt=12,pb=36;
    const lx=v=>pl+(W-pl-pr)*(Math.log10(v)+2)/3,ly=v=>pt+(H-pt-pb)*(1-v/60);
    let s='';[0.01,0.03,0.1,0.3,1,3,10].forEach(v=>{s+='<line x1="'+lx(v)+'" x2="'+lx(v)+'" y1="'+pt+'" y2="'+(H-pb)+'" stroke="var(--line)"/><text x="'+lx(v)+'" y="'+(H-pb+15)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">$'+v+'</text>'});
    [0,10,20,30,40,50,60].forEach(v=>{s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+ly(v)+'" y2="'+ly(v)+'" stroke="var(--line)"/><text x="'+(pl-6)+'" y="'+(ly(v)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+v+'</text>'});
    s+='<text x="'+((pl+W-pr)/2)+'" y="'+(H-3)+'" font-size="11" text-anchor="middle" fill="var(--mute)">cost per Intelligence Index task (log)</text><text x="11" y="'+((pt+H-pb)/2)+'" font-size="11" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 11 '+((pt+H-pb)/2)+')">index v4.3</text>';
    const list=Object.values(AA).map(m=>({m,c:m.cpt*(y27&&INTRO[m.slug]?2:1)}));
    list.sort((a,b)=>(a.m.lab==='Google DeepMind')-(b.m.lab==='Google DeepMind'));
    list.forEach(({m,c})=>{const g=m.lab==='Google DeepMind',nm=named[m.slug];
      s+='<circle cx="'+lx(c)+'" cy="'+ly(m.idx)+'" r="'+(g?5.5:3.8)+'" fill="'+(g?'var(--closed)':nm?'var(--mute)':'var(--dim)')+'"><title>'+m.n+' ('+m.lab+'): '+m.idx+' at $'+c.toFixed(2)+' per task'+(y27&&INTRO[m.slug]?' (2027 price)':'')+'</title></circle>';
      if(g||nm)s+='<text x="'+(lx(c)+(LEFT[m.slug]?-8:7))+'" y="'+(ly(m.idx)+(m.slug==='claude-fable-5-1'?16:4))+'"'+(LEFT[m.slug]?' text-anchor="end"':'')+' font-size="'+(g?11.5:10.5)+'"'+(g?' font-weight="600" fill="var(--closed)"':' fill="var(--mute)"')+'>'+m.n.replace(/ \((high|max|max with fallback)\)/,'').replace('Claude ','').replace(' Preview','')+' $'+c.toFixed(2)+'</text>'});
    $('scSvg').innerHTML=svgEl(W,H,s,'Index score against cost per task');
  }
  $('scY').addEventListener('input',draw);onTab('t-cost',draw);
})();
(function(){ // one task taken apart
  const opts=[['gemini-3-8-flash','Gemini 3.8 Flash (high)'],['gemini-3-7-flash','Gemini 3.7 Flash (high)'],['gemini-3-1-pro-preview','Gemini 3.1 Pro Preview'],['gemini-4-argon','Gemini 4 Argon (high)'],['claude-fable-5-1','Claude Fable 5.1 (max)']];
  $('tkM').innerHTML=opts.map(([v,n])=>'<option value="'+v+'">'+n+'</option>').join('');
  function setH(){const m=AA[$('tkM').value];$('tkH').value=Math.round(hFit(m)*100)}
  function draw(){
    const m=AA[$('tkM').value],g=m.lab==='Google DeepMind',pf=+$('tkP').value;
    const f=g?(pf===2?(INTRO[m.slug]?2:1):pf):1;
    const h=+$('tkH').value/100,om=+$('tkO').value/100,h0=hFit(m),k=m.cpt/m.tot;
    $('tkHv').textContent=Math.round(h*100)+'% (fitted '+Math.round(h0*100)+'%)';$('tkOv').textContent=om.toFixed(2);
    const Ti=m.tin*k,To=m.tout*k*om;
    const cu=Ti*(1-h)*m.pin*f/1e6,cc=Ti*h*m.pc*f/1e6,co=To*m.pout*f/1e6,C=cu+cc+co;
    const W=640,H=44,mx=Math.max(C,m.cpt*2.2,0.01),sc=v=>v/mx*(W-12);let x=6,s='';
    [[cu,'var(--bad)','uncached input'],[cc,'var(--c5)','cached input'],[co,'var(--acc)','output incl. thinking']].forEach(([v,c,n])=>{s+='<rect x="'+x+'" y="6" width="'+Math.max(0.5,sc(v))+'" height="22" fill="'+c+'"><title>'+n+': $'+v.toFixed(3)+'</title></rect>';x+=sc(v)});
    const ax=6+sc(m.cpt);s+='<line x1="'+ax+'" x2="'+ax+'" y1="2" y2="34" stroke="var(--ink)" stroke-dasharray="3 2"/><text x="'+Math.min(ax+3,W-4)+'" y="42" font-size="10.5"'+(ax>W-120?' text-anchor="end"':'')+'>AA: $'+m.cpt.toFixed(2)+'</text>';
    $('tkBar').innerHTML=svgEl(W,H,s,'Cost of one task by component')+'<div class="leg"><span><i style="background:var(--bad)"></i>uncached input $'+cu.toFixed(3)+'</span><span><i style="background:var(--c5)"></i>cached input $'+cc.toFixed(3)+'</span><span><i style="background:var(--acc)"></i>output incl. thinking $'+co.toFixed(3)+'</span></div>';
    $('tkOut').innerHTML=stat('Cost of one task','$'+C.toFixed(2),'×'+(C/m.cpt).toFixed(2)+' AA\'s published $'+m.cpt.toFixed(2))
      +stat('Input tokens per task',fmt(Ti/1e6,2)+'M',Math.round(h*100)+'% cached at $'+(m.pc*f).toFixed(3)+', rest at $'+(m.pin*f).toFixed(2))
      +stat('Output tokens per task',fmt(To/1e3)+'K','at $'+(m.pout*f).toFixed(2)+' per million')
      +stat('Input share of the bill',Math.round((cu+cc)/C*100)+'%','output '+Math.round(co/C*100)+'%');
    const atDef=Math.abs(h-Math.round(h0*100)/100)<0.005&&om===1&&f===1;
    $('tkPin').innerHTML='<div class="t">'+(atDef?'Defaults reproduce AA\'s $'+m.cpt.toFixed(2)+' per task, by construction':'Against AA\'s published $'+m.cpt.toFixed(2))+'</div>'+
      (g&&INTRO[m.slug]?'Independent of the fit: Google\'s 2027 prices double every component, so this task costs $'+(m.cpt*2).toFixed(2)+' with no change to the model. ':'')+
      'Without any caching it would cost $'+((Ti*m.pin+m.tout*k*m.pout)*f/1e6).toFixed(2)+'. Fitted from AA\'s run: '+fmt(m.tin/1e9,2)+'B input and '+fmt(m.tout/1e6)+'M output tokens for $'+fmt(m.tot)+' in total.';
  }
  $('tkM').addEventListener('input',()=>{setH();draw()});['tkP','tkH','tkO'].forEach(id=>$(id).addEventListener('input',draw));
  setH();onTab('t-cost',draw);
})();
