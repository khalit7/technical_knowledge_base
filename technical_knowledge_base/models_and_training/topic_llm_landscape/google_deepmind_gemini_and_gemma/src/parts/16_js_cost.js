// ---- Reading, "works harder": the 3.7 vs 3.8 card and one task taken apart (the price-list and index-vs-cost charts were removed on 2026-10-24) ----
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
  setH();onTab('t-read',draw);
})();
