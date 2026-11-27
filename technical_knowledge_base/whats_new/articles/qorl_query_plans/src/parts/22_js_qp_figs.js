// ---- Static figures of the Reading tab: the hero (every JOB evaluation in the article, in order), one search of the harness,
// and the four-rollout example under both advantage rules. Every number is printed by the article (see each caption);
// the 1.33x to 1.47x band is from the repository's results for experiment 033.
(function(){
  if(!window.RD||!document.getElementById('qp-hero-svg'))return;
  const $=id=>document.getElementById(id), t=RD.t;
  // [label, geometric mean, total workload, group, note]
  const ROWS=[
    ['Untrained 4B',0.85,0.85,'base','15 of 113 scored'],
    ['SFT, 100 trajectories, 1 epoch',0.72,0.76,'sft',''],
    ['SFT, 2 epochs',1.08,1.04,'sft','harness may now keep the default'],
    ['SFT, 3 epochs',0.82,0.89,'sft','regressed; not kept'],
    ['SFT, + 300 trajectories, 1 epoch',1.10,1.05,'sft',''],
    ['SFT, + 2 epochs (RL starts here)',1.16,1.06,'sft',''],
    ['RL, 120 updates, lr 1e-6',1.14,0.99,'rl',''],
    ['RL, 600 updates, lr 1e-5',1.35,1.16,'rl','34 wins, 0 regressions'],
    ['RL, 1,200 updates',1.41,1.29,'rl','38 wins, 2 regressions'],
    ['Same model, 3 searches: its own choice',1.40,1.24,'rl3','339 searches'],
    ['3 searches: best single timing within each',1.44,1.29,'rl3',''],
    ['3 searches: best of all three (the headline)',1.81,1.81,'s3','up to 15 plans a query']];
  const COL={base:'var(--mute)',sft:'var(--c1)',rl:'var(--c2)',rl3:'var(--c2)',s3:'var(--c3)'};
  const lx=v=>Math.log(v);
  function hero(){
    const el=$('qp-hero-svg'),W=RD.width(el),narrow=W<560;
    const labW=narrow?0:250, x0=(narrow?18:8)+labW, x1=W-56, rh=narrow?40:24, top=24, H=top+ROWS.length*rh+30;
    const lo=lx(0.6),hi=lx(2.0),X=v=>x0+(lx(v)-lo)/(hi-lo)*(x1-x0);
    let s='';
    // the band: three repeated searches of the final checkpoint ranged 1.33x to 1.47x (model's own choice)
    s+='<rect x="'+X(1.3272)+'" y="'+(top-4)+'" width="'+(X(1.4651)-X(1.3272))+'" height="'+(ROWS.length*rh+4)+'" fill="var(--c2)" opacity=".12"/>';
    s+=t((X(1.3272)+X(1.4651))/2,top-8,'spread of 3 repeats',{fs:11.5,a:'middle',fill:'var(--mute)'});
    [0.6,0.8,1,1.25,1.5,2].forEach(v=>{s+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+(top-2)+'" y2="'+(top+ROWS.length*rh)+'" stroke="var(--line)"'+(v===1?' stroke-width="2"':' stroke-dasharray="2 3"')+'/>'+
      t(X(v),top+ROWS.length*rh+16,v+'x',{fs:11.5,a:'middle',fill:'var(--mute)'})});
    s+=t(X(1),top+ROWS.length*rh+28,'Postgres = 1x (geometric mean, log scale)',{fs:11.5,a:'middle',fill:'var(--mute)'});
    ROWS.forEach((r,i)=>{
      const y=top+i*rh, by=narrow?y+20:y+5, bh=narrow?14:14, c=COL[r[3]];
      if(narrow)s+=t(8,y+13,r[0],{fs:12,fill:'var(--ink)'});
      else s+=t(x0-8,y+16,r[0],{fs:12,a:'end',fill:'var(--ink)',w:r[3]==='s3'?600:400});
      const xa=X(Math.min(1,r[1])),xb=X(Math.max(1,r[1]));
      s+='<rect x="'+xa+'" y="'+by+'" width="'+Math.max(2,xb-xa)+'" height="'+bh+'" rx="3" fill="'+c+'"'+(r[1]<1?' opacity=".55"':'')+'/>';
      s+=t(xb+5,by+11,r[1].toFixed(2)+'x',{fs:12,fill:'var(--ink)',w:600});
    });
    el.innerHTML=RD.svg(W,H,s,'Geometric-mean speedup over Postgres on the 113 JOB queries for every evaluation in the article');
  }

  // one search of the harness, top to bottom
  function flow(){
    const el=$('qp-flow-svg'); if(!el)return;
    const W=RD.width(el),bw=Math.min(W-16,420),bx=(W-bw)/2,bh=34,gap=16;
    const N=[['A JOB query and Postgres\'s default plan (timed: 1 warm-up, 3 runs)','var(--soft)'],
      ['The 4B model reads tables, statistics, plans (inspect_relation, get_column_stats, get_plan)','var(--soft)'],
      ['It proposes a PlanAction (JSON): join tree, join and scan methods, settings','var(--c1)'],
      ['The harness compiles it to a pg_hint_plan comment, checks it with EXPLAIN','var(--soft)'],
      ['evaluate_candidate: 1 warm-up, 1 timed run, ratio to the default shown to the model','var(--c3)'],
      ['Up to 5 candidates, then finish(c) or keep_default','var(--soft)'],
      ['Score: 3 interleaved (default, candidate) pairs, median over median, clipped to [0.1, 10]','var(--c2)']];
    let s='',y=6;
    N.forEach((n,i)=>{
      const lines=wrap(n[0],Math.floor((bw-20)/6.6)), h=Math.max(bh,lines.length*15+12);
      s+='<rect x="'+bx+'" y="'+y+'" width="'+bw+'" height="'+h+'" rx="8" fill="'+n[1]+'" '+(n[1]==='var(--soft)'?'stroke="var(--line)"':'opacity=".9"')+'/>';
      lines.forEach((l,k)=>{s+=t(bx+10,y+18+k*15,l,{fs:12,fill:n[1]==='var(--soft)'?'var(--ink)':'var(--bg)',w:n[1]==='var(--soft)'?400:600})});
      if(i===4){s+='<path d="M'+(bx+bw-6)+' '+(y+h/2)+' C '+(bx+bw+14)+' '+(y+h/2)+' '+(bx+bw+14)+' '+(y-gap-30)+' '+(bx+bw-6)+' '+(y-gap-30)+'" fill="none" stroke="var(--mute)" stroke-dasharray="3 3"/>'}
      y+=h;
      if(i<N.length-1){s+='<line x1="'+(W/2)+'" x2="'+(W/2)+'" y1="'+y+'" y2="'+(y+gap)+'" stroke="var(--mute)"/>';y+=gap}
    });
    el.innerHTML=RD.svg(W,y+6,s,'One search of the qo-agent harness');
  }
  function wrap(str,n){const w=str.split(' '),o=[];let l='';w.forEach(x=>{if((l+' '+x).trim().length>n){o.push(l.trim());l=x}else l+=' '+x});if(l.trim())o.push(l.trim());return o}

  // the four rollouts: advantage under prime-rl GRPO (reward minus group mean) and under the anchored variant
  const G=[['Leading((t cn) mc)','rejected: t and cn never join',-1.43,-0.10],
    ['MergeJoin(t cn)','rejected: no such join',-1.43,-0.10],
    ['NestLoop(t mc)','new plan, 0.80x',1.34,-0.18],
    ['HashJoin(mc cn)','Postgres\'s own plan, 1.00x',1.52,-0.02]];
  function grpo(){
    const el=$('qp-grpo-svg'); if(!el)return;
    const W=RD.width(el),narrow=W<520,labW=narrow?0:170,x0=8+labW,x1=W-10,mid=(x0+x1)/2,sc=(x1-x0)/2/(narrow?2.1:1.7);
    const rh=narrow?66:50,top=22; let s='';
    s+=t(mid-6,14,'pushed down',{fs:12,a:'end',fill:'var(--mute)'})+t(mid+6,14,'reinforced',{fs:12,fill:'var(--mute)'});
    s+='<line x1="'+mid+'" x2="'+mid+'" y1="'+(top-2)+'" y2="'+(top+G.length*rh)+'" stroke="var(--line)" stroke-width="2"/>';
    G.forEach((g,i)=>{
      const y=top+i*rh, ly=narrow?y+12:y+18, by=narrow?y+20:y+6;
      if(narrow)s+=t(8,ly,g[0]+': '+g[1],{fs:12,fill:'var(--ink)'});
      else{s+=t(x0-8,y+18,g[0],{fs:12,a:'end',fill:'var(--ink)',w:600})+t(x0-8,y+33,g[1],{fs:11.5,a:'end',fill:'var(--mute)'})}
      [[g[2],'var(--mute)',0,'GRPO'],[g[3],'var(--c2)',17,'anchored']].forEach(([v,c,dy,nm])=>{
        const xa=v<0?mid+v*sc:mid,w=Math.abs(v)*sc;
        s+='<rect x="'+xa+'" y="'+(by+dy)+'" width="'+Math.max(2,w)+'" height="14" rx="3" fill="'+c+'"/>';
        s+=t(v<0?xa-4:xa+w+4,by+dy+11,(v>0?'+':'')+v.toFixed(2),{fs:11.5,a:v<0?'end':'start',fill:'var(--ink)'});
      });
    });
    el.innerHTML=RD.svg(W,top+G.length*rh+4,s,'Advantages of four rollouts under prime-rl GRPO and under the anchored variant');
  }
  function all(){hero();flow();grpo()}
  RD.onRender(all);RD.onResize(all);
})();
