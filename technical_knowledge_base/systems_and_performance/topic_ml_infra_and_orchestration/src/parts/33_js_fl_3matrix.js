// ---- Failure lab: the failure matrix and the replay of one run's timeline (from its logs) ----
(function(){
  const H=window.FL_H,D=window.FL_DATA;if(!H||!D)return;const $=H.$,esc=H.esc;
  const S={};D.scen.forEach(s=>S[s.id]=s);
  const NA=(t)=>({na:t});
  const ROWS=[
    ['Rank crashes, no retries',['s-crash','k-crash0','r-crash0']],
    ['Rank crashes, retries on',['s-maxr2','k-crash2','r-crash2']],
    ['Retries with PyTorch defaults',['s-maxr',NA('Not applicable: a JobSet restart makes new pods, so torchrun starts with a new store'),NA('Not applicable: Ray Train sets up a new process group itself')]],
    ['The same crash every attempt',['s-poison',NA('Not run. Each attempt would count against maxRestarts the same way'),NA('Not run. Each attempt would count against max_failures')]],
    ['Node lost',['s-node','k-node','r-node']],
    ['Rank hangs',['s-hang',NA('Not run: the timeout lives in the process group (gloo), not in the scheduler, so it is the same 30 s'),NA('Not run, for the same reason')]]];
  const kind=s=>s.resume_s==null?'fail':(s.operator_s!=null||s.id==='s-crash'?'person':'ok');
  const fmt=x=>x==null?'':(x<10?x.toFixed(1):Math.round(x))+' s';
  function cellText(s){
    let t='<b>'+esc(s.id==='k-node'?'node frozen':s.id==='s-node'||s.id==='r-node'?'node killed':s.id==='s-hang'?'SIGSTOP':s.id==='s-maxr'?'torchrun restarts':s.id==='s-poison'?'poison step':s.id==='s-crash'?'exit 13':s.id==='s-maxr2'?'store not shared':'exit 13')+'</b>';
    if(s.resume_s!=null)t+='resumed after '+fmt(s.resume_s)+(s.operator_s!=null?' (a person acted at '+fmt(s.operator_s)+')':s.id==='s-crash'?' (resubmitted by hand)':'');
    else t+='failed'+(s.detect_s!=null?', seen after '+fmt(s.detect_s):'');
    return t;
  }
  let cur='s-node';
  function grid(){
    const g=$('fl-mx');if(!g)return;
    let h='<div class="h h0"></div><div class="h">Slurm</div><div class="h">Kubernetes (JobSet)</div><div class="h">Ray Train</div>';
    ROWS.forEach(([lab,cells])=>{h+='<div class="rh">'+esc(lab)+'</div>';
      cells.forEach(c=>{if(typeof c==='string'){const s=S[c];h+='<button class="'+kind(s)+(c===cur?' sel':'')+'" data-id="'+c+'" aria-pressed="'+(c===cur)+'">'+cellText(s)+'</button>'}
        else h+='<div class="na">'+esc(c.na)+'</div>'})});
    g.innerHTML=h;
  }
  $('fl-mx').addEventListener('click',e=>{const b=e.target.closest('button[data-id]');if(!b)return;cur=b.dataset.id;grid();A.reset(S[cur].events.length);A.go(0)});
  const COL={fail:'var(--bad)',detect:'var(--c5)',act:'var(--c1)',err:'var(--bad)',end:'var(--mute)',resume:'var(--good)'};
  const LAB={fail:'failure',detect:'noticed',act:'action',err:'error',end:'job ended',resume:'resumed'};
  function draw(i){
    const s=S[cur],ev=s.events,el=$('fl-tl-svg');if(!el)return;
    $('fl-tl-head').textContent=s.title;
    const W=H.width(el),pad=14,h=96,tmax=Math.max(1,...ev.map(e=>e[0]))*1.04;
    const X=t=>pad+(W-2*pad)*Math.sqrt(Math.max(0,t)/tmax);
    let b='';const y=48;
    b+=H.line(pad,y,W-pad,y,'var(--line)',{sw:2});
    const ti=ev[i][0];b+=H.line(pad,y,X(ti),y,'var(--acc)',{sw:3});
    // ticks
    const ticks=[0,1,10,30,100,300,1000].filter(t=>t<=tmax);let lastx=-99;
    ticks.forEach(t=>{const x=X(t);if(x-lastx<26)return;lastx=x;b+=H.line(x,y+6,x,y+10,'var(--mute)');b+=H.t(x,y+22,t+' s',{a:'middle',fs:10,fill:'var(--mute)'})});
    ev.forEach((e,k)=>{const x=X(e[0]),on=k<=i;b+='<circle cx="'+x.toFixed(1)+'" cy="'+y+'" r="'+(k===i?7:5)+'" fill="'+(on?COL[e[1]]:'var(--bg)')+'" stroke="'+COL[e[1]]+'" stroke-width="2"/>'});
    // label of current event above, clamped
    const x=X(ti),lab=LAB[ev[i][1]]+' at '+(ti<10?ti.toFixed(2):ti.toFixed(1))+' s';
    const lx=Math.min(W-pad-4,Math.max(pad+4,x));const anc=lx<W*0.2?'start':lx>W*0.8?'end':'middle';
    b+=H.t(lx,y-16,esc(lab),{a:anc,fs:12,w:600,fill:COL[ev[i][1]]});
    el.innerHTML=H.svg(W,h,b,'Timeline of '+s.title);
    $('fl-tl-cap').innerHTML='<b>'+esc(LAB[ev[i][1]])+', '+(ti<10?ti.toFixed(2):ti.toFixed(1))+' s:</b> '+esc(ev[i][2])+' <span class="small mute">('+esc(ev[i][3])+')</span>';
    const c=s.cont;
    $('fl-tl-out').innerHTML=[
      ['Noticed after',s.detect_s!=null?fmt(s.detect_s):'n/a'],
      ['Running again after',s.resume_s!=null?fmt(s.resume_s):'never'],
      ['Steps redone',s.steps_redone!=null?String(s.steps_redone):'n/a'],
      ['Outcome',s.outcome]].map(([k,v])=>'<div class="stat"><div class="k">'+esc(k)+'</div><div class="v" style="font-size:'+(v.length>16?'13px':'16px')+'">'+esc(v)+'</div></div>').join('');
  }
  grid();
  const A=H.anim({card:'fl-mx-card',ctl:'fl-tl-ctl',n:S[cur].events.length,draw,ms:1500,label:'Event'});
})();
