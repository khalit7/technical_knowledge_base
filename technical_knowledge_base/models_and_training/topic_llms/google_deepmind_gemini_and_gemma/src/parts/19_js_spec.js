// ---- Speculative decoding with the MTP drafter (Gemma on one machine) ----
(function(){
  // Leviathan et al. (2023) Table 4: task, drafter, temperature, gamma, alpha, c, expected, measured
  const L4=[['EnDe','T5-small',0,7,.75,.02,3.2,3.4],['EnDe','T5-base',0,7,.8,.04,3.3,2.8],['EnDe','T5-large',0,7,.82,.11,2.5,1.7],['EnDe','T5-small',1,7,.62,.02,2.3,2.6],['EnDe','T5-base',1,5,.68,.04,2.4,2.4],['EnDe','T5-large',1,3,.71,.11,2.0,1.4],['CNNDM','T5-small',0,5,.65,.02,2.4,3.1],['CNNDM','T5-base',0,5,.73,.04,2.6,3.0],['CNNDM','T5-large',0,3,.74,.11,2.0,2.2],['CNNDM','T5-small',1,5,.53,.02,1.9,2.3],['CNNDM','T5-base',1,3,.55,.04,1.8,2.2],['CNNDM','T5-large',1,3,.56,.11,1.6,1.7]];
  const tok=(a,g)=>(1-a**(g+1))/(1-a), S=(a,g,c)=>tok(a,g)/(g*c+1);
  // Gemma 4 31B preset: c = drafter parameters over target active parameters (illustrative), gamma 4 (illustrative), alpha fitted to 3.0
  const GC=0.5/30.7,GG=4,GT=3.0;
  let lo=0.01,hi=0.99;for(let i=0;i<100;i++){const m=(lo+hi)/2;if(S(m,GG,GC)<GT)lo=m;else hi=m}
  const GA=(lo+hi)/2;
  let seed=1;
  const sel=$('spP');
  sel.innerHTML=L4.map((r,i)=>'<option value="'+i+'">Leviathan Table 4: '+r[0]+', '+r[1]+', temp '+r[2]+'</option>').join('')+'<option value="g">Gemma 4 31B + 500M drafter (α fitted to ~3x)</option>';
  function setPreset(v){if(v==='g'){$('spA').value=Math.round(GA*100);$('spG').value=GG;$('spC').value=Math.round(GC*1000)}else{const r=L4[+v];$('spA').value=Math.round(r[4]*100);$('spG').value=r[3];$('spC').value=Math.round(r[5]*1000)}}
  function draw(){
    const a=+$('spA').value/100,g=+$('spG').value,c=+$('spC').value/1000,pv=sel.value;
    $('spAv').textContent=a.toFixed(2);$('spGv').textContent=g;$('spCv').textContent=c.toFixed(3);
    const E=tok(a,g),sp=S(a,g,c);
    let best=1;for(let k=1;k<=40;k++)if(S(a,k,c)>S(a,best,c))best=k;
    // is the preset untouched?
    let pin;
    if(pv==='g'){const un=Math.abs(a-Math.round(GA*100)/100)<1e-9&&g===GG&&Math.abs(c-Math.round(GC*1000)/1000)<1e-9;
      pin='<div class="t">'+(un?'Fitted, not reproduced: Gemma 4\'s "up to ~3x"':'At these settings')+'</div>'+(un?'Google publishes no acceptance rate. With γ = 4 and c = 0.5 / 30.7 = '+GC.toFixed(4)+' (both <span class="ill">illustrative</span>), a speed-up of 3.0 needs α = '+GA.toFixed(3)+' (<span class="ill">fitted</span>, solved from the formula); the slider rounds it to '+a.toFixed(2)+', which gives '+sp.toFixed(2)+'. At γ = 5 it would need α = '+fitA(5).toFixed(2)+'. Source of the 3x: {{Hugging Face|@hfg4}}. ':'')+'Speed-up '+sp.toFixed(2)+' at α = '+a.toFixed(2)+', γ = '+g+', c = '+c.toFixed(3)+'.'}
    else{const r=L4[+pv],un=Math.abs(a-r[4])<1e-9&&g===r[3]&&Math.abs(c-r[5])<1e-9;
      pin='<div class="t">'+(un?'Defaults reproduce Leviathan et al., Table 4 (independent)':'At these settings')+'</div>'+(un?r[0]+', T5-XXL drafted by '+r[1]+', temperature '+r[2]+': the formula gives '+sp.toFixed(2)+' against the paper\'s expected '+r[6].toFixed(1)+' (measured '+r[7].toFixed(1)+'), from the paper\'s own α, γ and c ({{Leviathan et al.|@lev}}). ':'')+'Speed-up '+sp.toFixed(2)+' at α = '+a.toFixed(2)+', γ = '+g+', c = '+c.toFixed(3)+'.'}
    $('spPin').innerHTML=pin;
    $('spOut').innerHTML=stat('Tokens per target pass',E.toFixed(2),'(1 − α<sup>γ+1</sup>) / (1 − α)')
      +stat('Speed-up',sp>=1?'×'+sp.toFixed(2):'×'+sp.toFixed(2)+' (slower)','tokens per pass / (γ c + 1)')
      +stat('Best γ here','γ = '+best,'×'+S(a,best,c).toFixed(2)+(a>c?'':'; α ≤ c, no γ helps'))
      +stat('Drafts thrown away per step',(g-(E-1)).toFixed(2)+' of '+g,'γ − (tokens per pass − 1)');
    // speed-up against gamma
    const W=620,H=250,pl=48,pr=24,pt=14,pb=36,G=12;
    const ys=[];for(let k=1;k<=G;k++)ys.push(S(a,k,c));
    const ymax=Math.max(2,Math.ceil(Math.max(...ys)+0.5)),lx=k=>pl+(W-pl-pr)*(k-1)/(G-1),ly=v=>pt+(H-pt-pb)*(1-v/ymax);
    let s='';for(let v=0;v<=ymax;v++){s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+ly(v)+'" y2="'+ly(v)+'" stroke="var(--line)"/><text x="'+(pl-6)+'" y="'+(ly(v)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">×'+v+'</text>'}
    for(let k=1;k<=G;k++)s+='<text x="'+lx(k)+'" y="'+(H-pb+16)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+k+'</text>';
    s+='<text x="'+((pl+W-pr)/2)+'" y="'+(H-4)+'" font-size="11" text-anchor="middle" fill="var(--mute)">drafted tokens γ</text>';
    s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+ly(1)+'" y2="'+ly(1)+'" stroke="var(--ink)" stroke-dasharray="5 3"/><text x="'+(W-pr)+'" y="'+(ly(1)-5)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">no speed-up</text>';
    // c = 0 reference: the drafter for free
    const z=[];for(let k=1;k<=G;k++)z.push(lx(k).toFixed(1)+','+ly(Math.min(tok(a,k),ymax)).toFixed(1));
    s+='<path d="M'+z.join('L')+'" fill="none" stroke="var(--dim)" stroke-width="2" stroke-dasharray="4 3"/>';
    s+='<path d="M'+ys.map((v,i)=>lx(i+1).toFixed(1)+','+ly(v).toFixed(1)).join('L')+'" fill="none" stroke="var(--acc)" stroke-width="2.2"/>';
    ys.forEach((v,i)=>{s+='<circle cx="'+lx(i+1)+'" cy="'+ly(v)+'" r="'+(i+1===g?5:2.5)+'" fill="'+(i+1===g?'var(--acc)':'var(--bg)')+'" stroke="var(--acc)" stroke-width="1.5"><title>γ = '+(i+1)+': ×'+v.toFixed(2)+'</title></circle>'});
    if(best<=G)s+='<text x="'+lx(best)+'" y="'+(ly(S(a,best,c))-10)+'" font-size="11" text-anchor="middle" fill="var(--good)" font-weight="600">best γ = '+best+'</text>';
    $('spPlot').innerHTML=svgEl(W,H,s,'Speed-up against drafted tokens');$('spLeg').innerHTML='<div class="leg"><span><i style="background:var(--acc)"></i>speed-up at c = '+c.toFixed(3)+'</span><span><i style="background:var(--dim)"></i>tokens per target pass (a free drafter, c = 0)</span></div>';
    // seeded strip
    const rnd=mulberry32(seed*7919+Math.round(a*100)*31+g);let rows='',tot=0;
    for(let st=0;st<10;st++){let cells='',acc=0,rej=false;
      for(let i=0;i<g;i++){let cl;if(rej)cl='var(--dim)';else if(rnd()<a){cl='var(--good)';acc++}else{cl='var(--bad)';rej=true}
        cells+='<span style="flex:0 1 22px;min-width:3px;height:18px;border-radius:2px;background:'+cl+'"></span>'}
      cells+='<span style="flex:0 1 22px;min-width:3px;height:18px;border-radius:2px;background:var(--acc)"></span>';tot+=acc+1;
      rows+='<div style="display:flex;gap:8px;align-items:center;font-size:12px;margin:2px 0"><span class="mute" style="flex:0 0 3.6em">step '+(st+1)+'</span><div style="display:flex;gap:2px;flex:0 1 auto;min-width:0;width:'+(24*(g+1))+'px">'+cells+'</div><span style="flex:0 0 auto;white-space:nowrap">+'+(acc+1)+' token'+(acc?'s':'')+'</span></div>'}
    $('spStrip').innerHTML=rows+'<p class="small" style="margin:4px 0">'+tot+' tokens in 10 target passes: '+(tot/10).toFixed(1)+' per pass, against an expected '+E.toFixed(2)+'.</p>';
    $('spSv').textContent='seed '+seed;
    // Table 4 recomputed
    let t='<tr><th>Task</th><th>Drafter</th><th class="num">Temp</th><th class="num">γ</th><th class="num">α</th><th class="num">c</th><th class="num">Recomputed</th><th class="num">Paper, expected</th><th class="num">Difference</th><th class="num">Paper, measured</th></tr>';
    let mx=0;L4.forEach((r,i)=>{const v=S(r[4],r[3],r[5]),d=v-r[6];mx=Math.max(mx,Math.abs(d));
      t+='<tr'+(String(i)===pv?' style="background:var(--acc2)"':'')+'><td>'+r[0]+'</td><td>'+r[1]+'</td><td class="num">'+r[2]+'</td><td class="num">'+r[3]+'</td><td class="num">'+r[4]+'</td><td class="num">'+r[5]+'</td><td class="num">'+v.toFixed(2)+'</td><td class="num">'+r[6].toFixed(1)+'</td><td class="num">'+(Math.abs(d)<0.005?'0.00':(d>0?'+':'−')+Math.abs(d).toFixed(2))+'</td><td class="num">'+r[7].toFixed(1)+'</td></tr>'});
    $('spTab').innerHTML=t+'<tr><td colspan="10" class="small mute">All 12 rows within '+mx.toFixed(2)+' of the paper\'s expected column, which it computed from the same theorem and rounded to one decimal; the measured column differs more, as the paper notes (implementation differences, and α not being independent token to token).</td></tr>';
  }
  function fitA(g){let lo=0.01,hi=0.99;for(let i=0;i<100;i++){const m=(lo+hi)/2;if(S(m,g,GC)<GT)lo=m;else hi=m}return (lo+hi)/2}
  sel.addEventListener('input',()=>{setPreset(sel.value);draw()});
  ['spA','spG','spC'].forEach(id=>$(id).addEventListener('input',draw));
  $('spS').addEventListener('click',()=>{seed++;draw()});
  setPreset('0');
  onTab('t-gemma',draw);
})();
