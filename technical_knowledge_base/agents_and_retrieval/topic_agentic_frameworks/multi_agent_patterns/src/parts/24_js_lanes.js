// Lanes: one row per model loop, one bar per model call (height = context sent, to one scale), a time cursor.
// Used by the Reading tab (section 3 replay) and the Audit lab.
window.FMLanes=(function(){
  const WIN=200000;
  function short(n){n=n||'';return n.replace(/^Audit group (\d+).*/,'group $1').replace(/^Audit /,'').replace('agent','agent').slice(0,14)}
  // o: {T (seconds on the x axis), t (cursor time, or null for all), hl (lane index to highlight)}
  function svg(el,run,o){
    const W=RD.width(el),narrow=W<520,lab=narrow?62:92,pad=8,axis=22;
    const lanes=run.lanes,rowH=lanes.length>8?26:lanes.length>3?38:64;
    const H=lanes.length*rowH+axis+10,T=o.T||run.wall,t=o.t==null?1e9:o.t;
    const x=s=>lab+pad+(W-lab-2*pad)*Math.min(1,s/T);
    let s='';
    // time grid
    const step=T>240?60:T>120?30:T>60?20:10;
    for(let g=0;g<=T;g+=step){s+='<line x1="'+x(g)+'" y1="4" x2="'+x(g)+'" y2="'+(H-axis)+'" stroke="var(--line)"/>'+RD.t(x(g),H-8,g+'s',{fs:10,fill:'var(--mute)',a:'middle'})}
    lanes.forEach((L,i)=>{
      const y0=6+i*rowH,base=y0+rowH-4,hmax=rowH-8;
      const col=L.kind==='main'&&lanes.length>1?'var(--c4)':'var(--c1)';
      s+=RD.t(4,base-2,RD.esc(short(L.name)),{fs:10.5,fill:'var(--mute)'});
      s+='<line x1="'+x(0)+'" y1="'+(base-hmax)+'" x2="'+x(T)+'" y2="'+(base-hmax)+'" stroke="var(--dim)" stroke-dasharray="2 3"/>';
      const st=Math.min(L.start,t),en=Math.min(L.end,t);
      if(en>st)s+='<line x1="'+x(st)+'" y1="'+base+'" x2="'+x(en)+'" y2="'+base+'" stroke="'+col+'" stroke-width="2" opacity=".5"/>';
      L.calls.forEach(c=>{if(c[0]>t)return;const h=Math.max(1.5,Math.min(1,c[1]/WIN)*hmax);
        s+='<rect x="'+(x(c[0])-1.5)+'" y="'+(base-h)+'" width="3" height="'+h+'" fill="'+(c[1]>WIN?'var(--bad)':col)+'"><title>'+RD.esc(short(L.name))+' at '+c[0].toFixed(0)+' s: '+c[1].toLocaleString('en-US')+' tokens sent</title></rect>'});
    });
    if(o.t!=null)s+='<line x1="'+x(Math.min(o.t,T))+'" y1="2" x2="'+x(Math.min(o.t,T))+'" y2="'+(H-axis)+'" stroke="var(--c2)" stroke-width="1.5"/>';
    el.innerHTML=RD.svg(W,H,s,'Model calls over time for each agent');
  }
  // counters up to time t
  function upto(run,t){
    let calls=0,reads=0,peak=0,sent=0;
    run.lanes.forEach(L=>L.calls.forEach(c=>{if(c[0]<=t){calls++;sent+=c[1];peak=Math.max(peak,c[1]);reads+=typeof c[2]==='number'?c[2]:c[2].filter(z=>z[0]==='Read').length}}));
    return {calls,reads,peak,sent};
  }
  return {svg,upto};
})();
// Reading, section 3: the same clock for one run of each design.
(function(){
  const U=FMU;
  const pick=[['single','haiku','One agent'],['multi','haiku','Lead + 6 auditors'],['fanout','haiku','Fan-out workflow'],['board','haiku','Blackboard'],['single','sonnet','One agent, Sonnet 5.5']];
  const avail=pick.filter(p=>U.runs(p[0],p[1]).length);
  if(!avail.length)return;
  const seg=document.getElementById('fm-laneseg');
  seg.innerHTML=avail.map((p,i)=>'<button data-m="'+i+'"'+(i===0?' class="on"':'')+'>'+p[2]+'</button>').join('');
  let cur=0;const N=48;
  const T=Math.max.apply(null,avail.map(p=>U.runs(p[0],p[1])[0].wall));
  const note={single:'One loop holds everything it reads. It batches many reads into each call; watch the bars climb toward the dashed 200,000-token line.',
    multi:'The lead (top row) lists the files, writes six briefs and starts six auditors at once. Each auditor reads its eight modules; the lead\'s own context stays small while it waits, then merges.',
    fanout:'No lead and no tools: six calls start together, each with its eight modules pasted in. One bar per row, because each worker answers in a single model turn.',
    board:'Six agents and no lead: each claims the next unclaimed module from the board, reads it, posts findings, and claims again. Faster agents end up auditing more modules.'};
  function draw(i){
    const p=avail[cur],run=U.runs(p[0],p[1])[0],t=T*i/(N-1);
    FMLanes.svg(document.getElementById('fm-lanesvg'),run,{T,t});
    const u=FMLanes.upto(run,t),done=t>=run.wall;
    document.getElementById('fm-lanecap').innerHTML='<div class="t">'+p[2]+', '+U.nf(Math.min(t,run.wall),0)+' s'+(done?' (finished at '+U.nf(run.wall,0)+' s)':'')+'</div><p>'+(p[1]==='sonnet'?'Same prompt as the single Haiku agent, on a model with a 1,000,000-token window: it reads every module in full, and its calls pass Haiku\'s 200,000-token line (red bars).':note[p[0]])+(done?' Result: '+run.tp+' of 16 planted bugs found, '+run.fp+' other reports, '+U.usd(run.tot.cost)+'.':'')+'</p>';
    document.getElementById('fm-lanecnt').innerHTML=RD.stat('Model calls so far',u.calls,'all rows')+RD.stat('Files read so far',u.reads,'Read tool calls')+RD.stat('Largest context so far',u.peak.toLocaleString('en-US'),'tokens in one call')+RD.stat('Tokens sent so far',U.tok(u.sent),'sum over calls');
  }
  const A=RD.anim({card:'fm-lanecard',ctl:'fm-lanectl',n:N,draw,ms:260,label:'Time',start:N-1});
  RD.seg(seg,m=>{cur=+m;A.reset(N);A.go(N-1)});
  RD.onResize(()=>A.redraw());
  // results table
  const tb=document.querySelector('#fm-audtab tbody');
  const rows=[['single','haiku'],['multi','haiku'],['fanout','haiku'],['board','haiku'],['boardv','haiku'],['boardb','haiku'],['boardsharp','haiku'],['single','sonnet']];
  tb.innerHTML=rows.filter(r=>U.runs(r[0],r[1]).length).map(([d,m])=>{const rs=U.runs(d,m);
    return '<tr><td>'+(U.DN[d]||d)+(m==='sonnet'?', Sonnet 5.5':'')+'</td><td class="num">'+rs.length+'</td><td class="num">'+rs.map(r=>r.tp).join(', ')+'</td><td class="num">'+rs.map(r=>r.fp).join(', ')+'</td><td class="num">'+U.tok(U.mean(rs.map(U.lanePeak)))+'</td><td class="num">'+U.tok(U.mean(rs.map(r=>r.tot.processed)))+'</td><td class="num">'+U.usd(U.mean(rs.map(r=>r.tot.cost)))+'</td><td class="num">'+U.secs(U.mean(rs.map(r=>r.wall)))+'</td></tr>'}).join('');
})();
