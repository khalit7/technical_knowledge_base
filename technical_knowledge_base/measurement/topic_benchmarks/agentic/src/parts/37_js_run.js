// ---- Fig. 2 (ag-run-card): one real Terminal-Bench 2.0 task (regex-log), three runs, step by step, flat (2026-11-19: was a 3D stage with a glass
// container; which files sit inside which container is the lesson, and a flat box diagram shows it without perspective). The agent's container holds
// the files the run touches; in the third run a separate verifier container stands beside it and only the declared artifact may cross.
// Files and commands are verbatim from harbor-framework/terminal-bench-2/regex-log (read 2026-10-04, quoted in the step lists); the exploit follows
// Berkeley RDI's write-up; the third run is the separate-verifier layout of the TB 3.0 and 4.0 task files (illustrative on this task, as the page says).
// The 82 of 89 and the 74 and 66 separate-verifier counts come from AG.survey (counted from the task files by mk_data.py). ----
(function(){
  // flat SVG helpers (2026-11-19): rect, text, line, arrow, eased marks (class rd-new eases in on a forward step)
  const fx=v=>(+v).toFixed(1),MONO='ui-monospace,SFMono-Regular,Menlo,monospace';
  const rect=(x,y,w,h,o)=>{o=o||{};return '<rect'+(o.cl?' class="'+o.cl+'"':'')+' x="'+fx(x)+'" y="'+fx(y)+'" width="'+fx(Math.max(0,w))+'" height="'+fx(Math.max(0,h))+'" rx="'+(o.r==null?5:o.r)+'" fill="'+(o.fill||'none')+'"'+(o.fo!=null?' fill-opacity="'+o.fo+'"':'')+(o.s?' stroke="'+o.s+'" stroke-width="'+(o.sw||1.2)+'"':'')+(o.da?' stroke-dasharray="'+o.da+'"':'')+(o.op!=null?' opacity="'+o.op+'"':'')+'/>'};
  const text=(x,y,s,o)=>{o=o||{};return '<text'+(o.cl?' class="'+o.cl+'"':'')+' x="'+fx(x)+'" y="'+fx(y)+'" font-size="'+(o.fs||12)+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' fill="'+(o.c||'var(--ink)')+'"'+(o.w?' font-weight="'+o.w+'"':'')+(o.mono?' font-family="'+MONO+'"':'')+(o.op!=null?' opacity="'+o.op+'"':'')+'>'+s+'</text>'};
  const line=(x1,y1,x2,y2,o)=>{o=o||{};return '<line'+(o.cl?' class="'+o.cl+'"':'')+' x1="'+fx(x1)+'" y1="'+fx(y1)+'" x2="'+fx(x2)+'" y2="'+fx(y2)+'" stroke="'+(o.c||'var(--line)')+'" stroke-width="'+(o.sw||1.2)+'"'+(o.da?' stroke-dasharray="'+o.da+'"':'')+(o.op!=null?' opacity="'+o.op+'"':'')+'/>'};
  const arrow=(x1,y1,x2,y2,o)=>{o=o||{};const a=Math.atan2(y2-y1,x2-x1),h=o.h||7,c=o.c||'var(--ink)';
    const p=[[x2,y2],[x2-h*Math.cos(a-.42),y2-h*Math.sin(a-.42)],[x2-h*Math.cos(a+.42),y2-h*Math.sin(a+.42)]].map(q=>fx(q[0])+','+fx(q[1])).join(' ');
    return '<g'+(o.cl?' class="'+o.cl+'"':'')+(o.op!=null?' opacity="'+o.op+'"':'')+'>'+line(x1,y1,x2-(h*.6)*Math.cos(a),y2-(h*.6)*Math.sin(a),{c,sw:o.sw||1.6,da:o.da})+'<polygon points="'+p+'" fill="'+c+'"/></g>'};
  const grp=(s,o)=>{o=o||{};return '<g'+(o.cl?' class="'+o.cl+'"':'')+(o.op!=null&&o.op<1?' opacity="'+o.op+'"':'')+'>'+s+'</g>'};
  const card=document.getElementById('ag-run-card');if(!card||!window.AG)return;const esc=RD.esc;
  const F=[['ins','instruction.md'],['rx','regex.txt'],['tests','tests/'],['rew','reward.txt'],['curl','curl'],['uvx','uvx']];
  // state per step: [short state, cls] with cls '' | new | bad | good | dim | gone (an empty slot)
  const S0={ins:['given','new'],rx:['absent','gone'],curl:['not in image','gone'],uvx:['absent','gone'],tests:['not yet','gone'],rew:['absent','gone']};
  const st=(b,c)=>Object.assign({},b,c);
  const MODES=[
    [S0, st(S0,{ins:['given',''],rx:['1 regex line','new']}), st(S0,{ins:['given',''],rx:['1 regex line',''],tests:['uploaded','new']}),
     st(S0,{ins:['given',''],rx:['1 regex line',''],tests:['uploaded',''],curl:['installed','new'],uvx:['from astral.sh','new']}),
     st(S0,{ins:['given',''],rx:['read by test',''],tests:['9 of 9 dates','good'],curl:['installed',''],uvx:['runs pytest','']}),
     st(S0,{ins:['given',''],rx:['read by test',''],tests:['passed','good'],curl:['installed',''],uvx:['ran pytest',''],rew:['1, earned','good']})],
    [S0, st(S0,{ins:['given',''],rx:['still absent','gone'],curl:['wrapper','bad']}), st(S0,{ins:['given',''],curl:['wrapper','bad'],tests:['clean','new']}),
     st(S0,{ins:['given',''],curl:['wrapper runs','bad'],tests:['clean',''],uvx:['trojan','bad']}),
     st(S0,{ins:['given',''],rx:['never read','gone'],curl:['wrapper',''],tests:['never run','bad'],uvx:['fake "passed"','bad']}),
     st(S0,{ins:['given',''],rx:['never existed','gone'],curl:['wrapper',''],tests:['never run','bad'],uvx:['trojan',''],rew:['1, for nothing','bad']})],
    [S0, st(S0,{ins:['given',''],curl:['wrapper','bad']}), st(S0,{ins:['given',''],rx:['artifact missing','gone'],curl:['left behind','dim'],tests:['in verifier image','new']}),
     st(S0,{ins:['given',''],rx:['artifact missing','gone'],curl:['not used','dim'],tests:['own pytest','']}),
     st(S0,{ins:['given',''],rx:['does not exist','gone'],curl:['not used','dim'],tests:['FAILED','bad']}),
     st(S0,{ins:['given',''],rx:['does not exist','gone'],curl:['not used','dim'],tests:['failed','bad'],rew:['0','good']})]];
  // what moves at each step: [from, to, colour]
  const FLOW=[[[],[['agent','rx','var(--c2)']],[['harness','tests','var(--c1)']],[['net','curl','var(--c6)'],['curl','uvx','var(--c6)']],[['rx','tests','var(--c2)'],['uvx','tests','var(--c6)']],[['tests','rew','var(--good)']]],
              [[],[['agent','curl','var(--bad)']],[['harness','tests','var(--c1)']],[['curl','uvx','var(--bad)']],[['uvx','tests','var(--bad)']],[['uvx','rew','var(--bad)']]],
              [[],[['agent','curl','var(--bad)']],[['rx','tests','var(--c2)']],[],[],[['tests','rew','var(--good)']]]];
  let mode=0;
  const C=AG.survey;window.AGN=window.AGN||{};AGN.run={n:C.tb2.n,curl:C.tb2.curl,sep3:C.tb3.sep,n3:C.tb3.n,sep4:C.tb4.sep,n4:C.tb4.n,steps:MODES.map(m=>m.length)};
  const CC={bad:'var(--bad)',good:'var(--good)',new:'var(--acc)',dim:'var(--mute)','':'var(--c1)',gone:'var(--mute)'};
  function draw(k){const el=document.getElementById('ag-run'),W=RD.width(el),ph=W<520,sep=mode===2,rows=MODES[mode][k],prev=MODES[mode][Math.max(0,k-1)];let s='';
    const fs=ph?11:12,bh=34,P={};
    // the outside sources: Harbor (which uploads tests/) and, in the 2.0 layout, the internet the verifier fetches uv from
    const top=ph?6:6,hb=[0,top,ph?78:84,30],nb=[W-(ph?130:150),top,ph?130:150,30];
    s+=grp(rect(...hb,{fill:'var(--c1)',fo:.18,s:'var(--c1)',r:6})+text(hb[0]+hb[2]/2,top+19,'Harbor',{a:'middle',fs:12.5,w:700,c:'var(--c1)'}),{op:sep?.35:1});
    P.harness=[hb[0]+hb[2]/2,top+30];
    if(!sep){s+=rect(...nb,{fill:'var(--c6)',fo:.16,s:'var(--c6)',r:6})+text(nb[0]+nb[2]/2,top+19,'astral.sh (internet)',{a:'middle',fs:ph?11:12,w:600,c:'var(--c6)'});P.net=[nb[0]+nb[2]/2,top+30]}
    // the containers
    const cy=top+56,ax0=0,ax1=sep&&!ph?W*.6:W,cols=sep?2:3,pad=10,gx=ph?18:28,cw=(ax1-ax0-2*pad-(cols-1)*gx)/cols,ch=40+2*(bh+30)+4;
    const cc=sep?'var(--c1)':'var(--bad)';
    s+=rect(ax0,cy,ax1-ax0,ch,{fill:cc,fo:.06,s:cc,sw:1.5,r:10});
    s+=text(ax0+pad,cy+18,ph?(sep?'agent container':'one container'):(sep?'agent container':'one container: the agent ran here, the verifier runs here'),{fs:12.5,w:700,c:cc});
    s+=text(ax1-pad,cy+18,sep?'8 h agent limit':'900 s · 1 CPU · 2 GB',{a:'end',fs:11.5,mono:1,c:'var(--mute)'});
    P.agent=[ax0+pad+8,cy+32];
    s+='<circle cx="'+fx(P.agent[0])+'" cy="'+fx(P.agent[1])+'" r="6" fill="'+(mode?'var(--bad)':'var(--c2)')+'" opacity="'+(k<=1?1:.5)+'"/>'+text(P.agent[0]+11,P.agent[1]+4,mode?'exploit agent':'agent',{fs:11.5,w:700,c:mode?'var(--bad)':'var(--c2)'});
    const inA=sep?['ins','rx','curl','uvx']:['ins','rx','tests','curl','uvx','rew'];
    inA.forEach((id,i)=>{const c=i%cols,r=Math.floor(i/cols);P[id]=[ax0+pad+c*(cw+gx),cy+44+r*(bh+30),cw]});
    let vy=cy;
    if(sep){const vx0=ph?0:W*.6+16,vx1=W;vy=ph?cy+ch+34:cy;const vw=vx1-vx0,vc=ph?2:1,vcw=(vw-2*pad-(vc-1)*gx)/vc;
      s+=rect(vx0,vy,vw,ph?30+bh+26:ch,{fill:'var(--c6)',fo:.08,s:'var(--c6)',sw:1.5,r:10});
      s+=text(vx0+pad,vy+18,ph?'verifier':'separate verifier',{fs:12.5,w:700,c:'var(--c6)'});if(!ph)s+=text(vx0+pad,vy+33,'fresh from tests/Dockerfile',{fs:11,mono:1,c:'var(--mute)'});
      ['tests','rew'].forEach((id,i)=>{P[id]=ph?[vx0+pad+i*(vcw+gx),vy+30,vcw]:[vx0+pad,vy+44+i*(bh+30),vcw]})}
    // the file blocks
    F.forEach(([id,name])=>{const [x,y,w]=P[id],[txt,cls]=rows[id],hot=cls&&cls!=='dim'&&cls!=='gone'&&(prev[id][0]!==txt||prev[id][1]!==cls||k===0),c=CC[cls];
      if(cls==='gone')s+=rect(x,y,w,bh,{fill:'none',s:'var(--mute)',da:'4 3',r:6,op:.8});
      else s+=rect(x,y,w,bh,{fill:c,fo:cls==='dim'?.06:cls?.25:.1,s:cls?c:'var(--line)',sw:hot?2:1.2,r:6,op:cls==='dim'?.5:1,cl:hot?'rd-new':''});
      s+=text(x+w/2,y+bh/2+4,esc(name),{a:'middle',fs:ph?11:12.5,mono:1,w:600,c:cls==='gone'||cls==='dim'?'var(--mute)':'var(--ink)'});
      s+=text(x+w/2,y+bh+15,esc(txt),{a:'middle',fs,w:hot?700:400,c:cls==='gone'?'var(--mute)':c,cl:hot?'rd-new':''})});
    // this step's flows
    const mid=id=>{const p=P[id];return p.length===3?[p[0]+p[2]/2,p[1]+bh/2]:p};
    FLOW[mode][k].forEach(([a,b,c])=>{let p=mid(a),q=mid(b);const dx=q[0]-p[0],dy=q[1]-p[1],L=Math.hypot(dx,dy)||1,u=[dx/L,dy/L];
      const sh=id=>P[id].length===3?Math.min(Math.abs(bh/2/(u[1]||1e-9)),Math.abs(P[id][2]/2/(u[0]||1e-9))):8;
      const s1=sh(a),s2=sh(b);s+=arrow(p[0]+u[0]*s1,p[1]+u[1]*s1,q[0]-u[0]*(s2+2),q[1]-u[1]*(s2+2),{c,sw:2.2,cl:'rd-new'})});
    if(sep&&k===2&&!ph)s+=text((W*.6+8),cy+ch+16,'only declared artifacts cross',{a:'middle',fs:12,w:700,c:'var(--c2)',cl:'rd-new'});
    if(sep&&k===2&&ph)s+=text(W/2,cy+ch+22,'only declared artifacts cross',{a:'middle',fs:12,w:700,c:'var(--c2)',cl:'rd-new'});
    const H=sep&&ph?vy+30+bh+30:cy+ch+(sep?24:8);
    el.innerHTML=RD.svg(W,H,s,'regex-log, run '+(mode+1))}
  const an=RD.anim({card:'ag-run-card',ctl:'ag-run-ctl',n:6,ms:5000,draw,label:'Run step',list:'sx-run-0'});
  RD.onResize(()=>an.redraw());
  document.querySelectorAll('#run-mode button').forEach(b=>b.addEventListener('click',()=>{
    document.querySelectorAll('#run-mode button').forEach(x=>x.classList.toggle('on',x===b));mode=+b.dataset.m;
    [0,1,2].forEach(i=>{document.getElementById('sx-run-'+i).hidden=i!==mode});an.reset(6,'sx-run-'+mode)}));
  window.AGN.runAnim=an;
})();
