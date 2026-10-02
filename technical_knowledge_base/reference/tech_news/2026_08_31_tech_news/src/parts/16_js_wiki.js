// ---- WikiSkill Table 1: no skills against evolved skills, model by model, with the best no-skill line ----
(function(){
  const card=$('v-wiki');if(!card)return;
  const B=['LiveMath','SealQA','SpreadSheet','OfficeQA','ALFWorld','Average'];
  // [LiveMath, SealQA, SpreadSheet, OfficeQA, ALFWorld, Avg] per method, from the paper's Table 1
  const T={
    'Qwen-3.5-4B':{size:'4B','No skill':[29.1,32.5,14.6,30.2,24.4,26.2],Trace2Skill:[31.5,37.6,17.5,31.0,42.8,32.1],EvoSkill:[41.7,37.3,18.6,29.5,41.5,33.7],SkillOpt:[48.7,33.3,14.0,34.5,45.3,35.2],WikiSkill:[49.7,39.4,21.1,28.5,53.7,38.5]},
    'Qwen-3.5-9B':{size:'9B','No skill':[28.2,26.3,24.3,35.9,34.7,29.9],Trace2Skill:[33.1,36.9,26.5,38.4,48.8,36.7],EvoSkill:[58.1,34.5,35.4,34.9,48.5,42.3],SkillOpt:[48.7,29.4,29.0,38.0,55.7,40.2],WikiSkill:[56.3,43.1,33.6,40.5,63.4,47.4]},
    'Qwen-3.6-27B':{size:'27B','No skill':[33.9,27.5,40.8,42.1,52.8,39.4],Trace2Skill:[36.3,37.3,53.3,54.3,55.5,47.3],EvoSkill:[57.3,32.9,59.5,52.5,64.2,53.3],SkillOpt:[51.9,34.5,53.2,54.8,59.2,50.7],WikiSkill:[61.9,41.6,81.7,53.7,77.6,63.3]},
    'Gemma-4-31B':{size:'31B','No skill':[33.9,30.6,48.3,43.3,50.4,41.3],Trace2Skill:[32.3,37.7,58.5,43.2,57.2,45.8],EvoSkill:[29.8,38.4,56.4,39.9,52.6,43.4],SkillOpt:[40.1,36.1,63.1,44.4,61.9,49.1],WikiSkill:[56.7,41.2,68.0,44.2,64.4,54.9]},
    'Gemini-3.5-Flash':{size:'closed','No skill':[33.0,29.4,50.5,48.6,85.9,49.5],Trace2Skill:[41.9,44.3,56.0,50.0,85.9,55.6],EvoSkill:[44.6,43.6,55.4,51.2,85.9,56.1],SkillOpt:[49.7,28.2,66.1,49.8,85.9,55.9],WikiSkill:[72.6,44.7,76.6,60.7,85.9,68.1]}};
  const ROWS=Object.keys(T);let meth='WikiSkill';
  function draw(){
    const b=+$('wkB').value,W=boxW($('wkSvg'),340),narrow=W<560,lw=narrow?10:150,pr=narrow?14:30,rh=narrow?42:30,top=8,H=top+ROWS.length*rh+30;
    const X=v=>lw+(W-lw-pr)*v/100;let s='';
    for(let v=0;v<=100;v+=narrow?25:10)s+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+top+'" y2="'+(top+ROWS.length*rh)+'" stroke="var(--line)"/><text x="'+X(v)+'" y="'+(top+ROWS.length*rh+14)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+v+'</text>';
    s+='<text x="'+((lw+W-pr)/2)+'" y="'+(H-2)+'" font-size="11" text-anchor="middle" fill="var(--mute)">score, % ('+B[b]+')</text>';
    const best=Math.max(...ROWS.map(r=>T[r]['No skill'][b])),bestM=ROWS.find(r=>T[r]['No skill'][b]===best);
    s+='<line x1="'+X(best)+'" x2="'+X(best)+'" y1="'+(top-4)+'" y2="'+(top+ROWS.length*rh)+'" stroke="var(--ink)" stroke-dasharray="4 3" opacity=".7"/>';
    let beat=0,worse=0;
    ROWS.forEach((r,i)=>{const yb=top+i*rh,y=yb+(narrow?28:rh/2),a=T[r]['No skill'][b],c=T[r][meth][b];
      s+=narrow?'<text x="0" y="'+(yb+12)+'" font-size="12" font-weight="600">'+r+' <tspan fill="var(--mute)" font-weight="400">('+T[r].size+')</tspan></text>':'<text x="'+(lw-8)+'" y="'+(y+4)+'" font-size="12" text-anchor="end">'+r+' <tspan fill="var(--mute)">('+T[r].size+')</tspan></text>';
      s+='<line x1="'+X(a)+'" x2="'+X(c)+'" y1="'+y+'" y2="'+y+'" stroke="'+(c<a?'var(--bad)':'var(--c3)')+'" stroke-width="3"/>';
      s+='<circle cx="'+X(a)+'" cy="'+y+'" r="5" fill="var(--dim)" stroke="var(--mute)"><title>'+r+', no skill: '+a+'</title></circle>';
      s+='<circle cx="'+X(c)+'" cy="'+y+'" r="6" fill="'+(c<a?'var(--bad)':'var(--c3)')+'"><title>'+r+', '+meth+': '+c+'</title></circle>';
      const lo=Math.min(a,c),hi=Math.max(a,c),d=c-a,lab=(d>=0?'+':'')+fmt(d,1);
      const right=X(hi)+9+lab.length*6.5<W;s+='<text x="'+(right?X(hi)+9:X(lo)-9)+'" y="'+(y+4)+'" font-size="11" text-anchor="'+(right?'start':'end')+'" fill="var(--mute)">'+lab+'</text>';
      if(r!==bestM&&c>best)beat++;if(c<a)worse++});
    $('wkSvg').innerHTML=svgEl(W,H,s,'WikiSkill table: scores with and without skills');
    const avg=ROWS.map(r=>{const v=T[r][meth];const m=(v[0]+v[1]+v[2]+v[3]+v[4])/5;return Math.abs(m-v[5])<0.051});
    $('wkStats').innerHTML=stat('Models above the best no-skill score',beat+' of '+(ROWS.length-1),'dashed line: '+bestM+' at '+best)+
      stat('Cells where '+meth+' scores below no skill',String(ROWS.reduce((n,r)=>n+T[r][meth].slice(0,5).filter((v,j)=>v<T[r]['No skill'][j]).length,0))+' of 25','across all five tests and five models')+
      stat('Averages recomputed from the columns',avg.filter(Boolean).length+' of 5 match','within 0.05 of the table'+(b===4?'; Gemini scores 85.9 on ALFWorld under every method':''));
  }
  const seg=$('wkM');seg.querySelectorAll('button').forEach(x=>x.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(y=>{y.classList.toggle('on',y===x);y.setAttribute('aria-pressed',y===x?'true':'false')});meth=x.dataset.m;draw()}));
  $('wkB').addEventListener('change',draw);
  let rw=card.clientWidth;addEventListener('resize',()=>{const w=card.clientWidth;if(w&&w!==rw){rw=w;draw()}});
  onTab(card.closest('.tab').id,draw);draw();
})();
