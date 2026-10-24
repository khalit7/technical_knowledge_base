// Hero: every pattern placed by who decides the next step (columns) and what each loop sees (rows),
// with what it did on this page's task. Results are computed from the recordings (FMU, FMD), not typed.
(function(){
  const el=document.getElementById('fm-hero');if(!el)return;
  const U=FMU,D=window.FMD,H=FM.handoffs||[],W=FM.write||[];
  const tp=d=>U.runs(d).map(r=>r.tp).join(', ');
  const xs=r=>Object.values(r.xk||{}).reduce((a,b)=>a+b,0);
  const bx=Math.max.apply(null,U.runs('board').map(xs).concat([0]));
  const ho=H.filter(r=>r.design!=='as_tool'),at=H.filter(r=>r.design==='as_tool');
  const hoMiss=ho.filter(r=>!r.tool_calls.some(t=>t[0]==='check_status')).length;
  const atBoth=at.filter(r=>r.tool_calls.some(t=>t[0]==='check_status')&&r.tool_calls.some(t=>t[0]==='lookup_invoice')).length;
  const op=W.filter(r=>r.spec==='open'&&r.design==='parallel');
  const by={};(D&&D.M||[]).forEach(m=>by[m.id]=m);
  const ms=U.mean(U.runs('multi').map(r=>r.tot.cost))/U.mean(U.runs('single').map(r=>r.tot.cost));
  const P=[
    {c:1,r:1,n:'One agent',s:'audit: '+tp('single')+' of 16',v:'bad',sec:3},
    {c:1,r:1,n:'Handoff',s:'2nd request lost '+hoMiss+'/'+ho.length,v:'bad',sec:6},
    {c:1,r:0,n:'Orchestrator-workers',s:'16/16, '+U.nf(ms,1)+'x the cost',v:'mid',sec:3},
    {c:1,r:0,n:'Agents as tools',s:'both requests '+atBoth+'/'+at.length,v:'ok',sec:6},
    {c:0,r:0,n:'Fan-out workflow',s:'16/16, cheapest split',v:'ok',sec:4},
    {c:0,r:0,n:'Parallel writers',s:'open spec: fit '+op.filter(r=>r.ok).length+' of '+op.length,v:'bad',sec:7},
    {c:0,r:0,n:'Voting (5 samples)',s:by.vote5?by.vote5.right+' of '+by.vote5.n+' puzzles':'',v:'ok',sec:8},
    {c:0,r:1,n:'Debate',s:by.debate?by.debate.right+' of '+by.debate.n+', more tokens':'',v:'mid',sec:8},
    {c:2,r:1,n:'Blackboard',s:'16/16, up to '+bx+' extra',v:'mid',sec:5}
  ];
  const cols=['Your code decides','A model decides','Nobody: agents claim from a store'];
  const rows=['Each loop sees only its brief or slice','A loop sees the shared history or store'];
  const col={ok:'var(--good)',bad:'var(--bad)',mid:'var(--c5)'};
  function draw(){
    const Wd=RD.width(el),narrow=Wd<600,bh=40,gap=6,pad=8;
    let s='',H0=0;
    // wide: columns = deciders, rows = what is seen. narrow: one band per decider, two columns for what is seen.
    if(!narrow){
      const lw=118,cw=(Wd-lw-8)/3,top=34;
      const rowH=r=>{let m=1;for(let c=0;c<3;c++)m=Math.max(m,P.filter(p=>p.c===c&&p.r===r).length);return m*(bh+gap)+pad*2};
      const rh=[rowH(0),rowH(1)],y0=[top,top+rh[0]+6];H0=top+rh[0]+rh[1]+14;
      cols.forEach((t,c)=>{s+=RD.t(lw+c*cw+cw/2,14,t.split(':')[0],{fs:12,a:'middle',w:600})+(c===2?RD.t(lw+c*cw+cw/2,28,'(agents claim from a store)',{fs:11,a:'middle',fill:'var(--mute)'}):'')});
      const RL=[['Each loop sees','only its brief','or slice'],['A loop sees','the shared','history or store']];
      rows.forEach((t,r)=>{
        s+='<rect x="0" y="'+y0[r]+'" width="'+(Wd)+'" height="'+rh[r]+'" rx="8" fill="var(--soft)" opacity="'+(r?0.55:1)+'"/>';
        RL[r].forEach((ln,j)=>{s+=RD.t(6,y0[r]+rh[r]/2-10+j*14,ln,{fs:11,fill:'var(--mute)'})})});
      for(let c=1;c<3;c++)s+='<line x1="'+(lw+c*cw)+'" y1="'+top+'" x2="'+(lw+c*cw)+'" y2="'+(H0-8)+'" stroke="var(--line)"/>';
      P.forEach(p=>{const k=P.filter(q=>q.c===p.c&&q.r===p.r).indexOf(p);s+=box(lw+p.c*cw+6,y0[p.r]+pad+k*(bh+gap),cw-12,p)});
    }else{
      const cw=(Wd-6)/2;let y=0;
      s+=RD.t(cw/2,12,'sees only its slice',{fs:11,a:'middle',fill:'var(--mute)'})+RD.t(cw+6+cw/2,12,'sees shared history',{fs:11,a:'middle',fill:'var(--mute)'});y=20;
      cols.forEach((t,c)=>{const n=Math.max(1,P.filter(p=>p.c===c&&p.r===0).length,P.filter(p=>p.c===c&&p.r===1).length);
        const h=n*(bh+gap)+pad+18;s+='<rect x="0" y="'+y+'" width="'+Wd+'" height="'+h+'" rx="8" fill="var(--soft)"/>'+RD.t(6,y+14,t,{fs:11.5,w:600});
        [0,1].forEach(r=>P.filter(p=>p.c===c&&p.r===r).forEach((p,k)=>{s+=box(r*(cw+6)+4,y+20+k*(bh+gap),cw-8,p)}));
        y+=h+6});
      H0=y;
    }
    el.innerHTML=RD.svg(Wd,H0,s,'Patterns placed by who decides and what each loop sees, with measured results');
  }
  function box(x,y,w,p){const fs=w<170?11:12;
    return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+bh0+'" rx="6" fill="var(--bg)" stroke="'+col[p.v]+'" stroke-width="1.6"/>'+
      '<circle cx="'+(x+9)+'" cy="'+(y+13)+'" r="4" fill="'+col[p.v]+'"/>'+
      RD.t(x+18,y+17,p.n,{fs:fs,w:600})+(w>=190?RD.t(x+w-5,y+17,'section '+p.sec,{fs:11,a:'end',fill:'var(--mute)'}):'')+RD.t(x+8,y+33,p.s,{fs:11,fill:'var(--ink)'})}
  const bh0=40;
  RD.onRender(draw);RD.onResize(draw);draw();
})();
