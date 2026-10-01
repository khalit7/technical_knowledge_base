// ---- Where the long tail lands: Intelligence Index v4.3 against cost per index task ----
(function(){
  if(!$('aa'))return;
  const TAIL=['Xiaomi (MiMo)','StepFun','Tencent (Hunyuan)','Institute of Foundation Models'];
  let mode='tail';
  function draw(){
    const narrow=$('aa').clientWidth<560,W=narrow?360:720,H=narrow?300:340;
    const rows=AA.filter(r=>r[3]!=null);
    const f=logFrame({W,H,pl:narrow?36:44,pr:narrow?8:12,pt:12,pb:34,xlin:false,x:[0.012,12],y:[8,62],
      xt:[[0.01,''],[0.03,'$0.03'],[0.1,'$0.10'],[0.3,'$0.30'],[1,'$1'],[3,'$3'],[10,'$10']],yt:[[10,'10'],[20,'20'],[30,'30'],[40,'40'],[50,'50'],[60,'60']],
      xl:'cost per Intelligence Index task (log)',yl:'index v4.3'});
    // the y axis here is linear: rebuild ly
    const pt=12,pb=34,ly=v=>pt+(H-pt-pb)*(1-(v-8)/(62-8));
    let s='';[10,20,30,40,50,60].forEach(v=>{s+='<line x1="'+(narrow?36:44)+'" x2="'+(W-(narrow?8:12))+'" y1="'+ly(v)+'" y2="'+ly(v)+'" stroke="var(--line)"/><text x="'+((narrow?36:44)-5)+'" y="'+(ly(v)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+v+'</text>'});
    s+=f.s.replace(/<line[^>]*stroke="var\(--line\)"\/><text[^>]*text-anchor="end"[^>]*>[^<]*<\/text>/g,'');
    // efficient frontier: best index at or below each cost
    const so=rows.slice().sort((a,b)=>a[3]-b[3]);let best=-1,fr=[];so.forEach(r=>{if(r[2]>best){best=r[2];fr.push(r)}});
    let d='';fr.forEach((r,i)=>{const x=f.lx(r[3]),y=ly(r[2]);d+=(i?'H'+x.toFixed(1)+'V'+y.toFixed(1):'M'+x.toFixed(1)+' '+y.toFixed(1))});
    s+='<path d="'+d+'" fill="none" stroke="var(--mute)" stroke-dasharray="4 3"/>';
    const lab=[];
    rows.forEach(r=>{const tail=TAIL.includes(r[1]),x=f.lx(r[3]),y=ly(r[2]);const show=mode==='all'||tail;
      const c=tail?'var(--acc)':(r[4]?'var(--open)':'var(--closed)');
      s+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+(tail?5.5:3.6)+'" fill="'+c+'" fill-opacity="'+(show?.95:.35)+'" stroke="var(--bg)"><title>'+r[0]+' ('+r[1]+'): '+r[2]+' at $'+r[3]+' per task</title></circle>';
      if(tail||['Claude Opus 5.5 (max)','GPT-6.1 Sol (max)','GLM-5.3 (max)','GLM-5.3-Flash','Kimi K3 (max)','DeepSeek V4.1 Flash (max)','Gemini 4 Argon (high)'].includes(r[0]))lab.push({x,y,n:r[0].replace(' (max)','').replace(' (high)',''),tail})});
    lab.sort((a,b)=>a.y-b.y);const used=[];lab.forEach(l=>{let y=l.y-8;while(used.some(u=>Math.abs(u.y-y)<11&&Math.abs(u.x-l.x)<120))y+=11;used.push({x:l.x,y});
      const right=l.x>W-150;s+='<text x="'+(right?l.x-8:l.x+8)+'" y="'+y.toFixed(1)+'" font-size="'+(narrow?9.5:10.5)+'"'+(right?' text-anchor="end"':'')+(l.tail?' font-weight="600" fill="var(--acc)"':' fill="var(--mute)"')+'>'+l.n+'</text>'});
    $('aaSvg').innerHTML=svgEl(W,H,s,'Intelligence Index against cost per task');
  }
  segBind('aaM',v=>{mode=v;draw()});
  addEventListener('resize',draw);onTab('t-read',draw);draw();
})();
