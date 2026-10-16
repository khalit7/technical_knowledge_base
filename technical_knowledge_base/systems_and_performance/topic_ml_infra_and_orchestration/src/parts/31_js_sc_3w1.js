// ---- Scheduling lab, section 1: the eight-job queue on real Slurm, FIFO (sched/builtin) against sched/backfill ----
(function(){
  const $=SC.$,D=window.SC_DATA;if(!$('sc-w1-card')||!D)return;
  const COL={A:'var(--c1)',B:'var(--c2)',C:'var(--c3)',D:'var(--c4)',E:'var(--c5)',F:'var(--c6)',G:'var(--c4)',H:'var(--c3)'};
  const ROWS=[['c1',0],['c1',1],['c1',2],['c1',3],['c2',0],['c2',1],['c2',2],['c2',3]];
  const rowOf=(node,idx)=>ROWS.findIndex(r=>r[0]===node&&r[1]===idx);
  const sims={};['fifo','conservative','easy'].forEach(p=>{sims[p]=SC_SIM.simulate(D.w1.jobs.map(j=>({name:j.n,size:j.g,run:j.lim,limit:j.lim,submit:0})),8,p)});
  sims.nodes={sched:SC_SIM.simulateNodes(D.w1.jobs.map(j=>({name:j.n,size:j.g,run:j.lim,limit:j.lim,submit:0})),2,4)};
  const simOf=m=>m==='fifo'?sims.fifo:sims.nodes;
  let mode='fifo';
  function run(m){return D.w1[m]}
  // event times (seconds) of one run: 0, every start and end
  function events(m){const r=run(m);const ts=new Set([0]);r.forEach(j=>{ts.add(j.st);ts.add(j.en)});return [...ts].sort((a,b)=>a-b)}
  function metrics(m){const r=run(m);const mk=Math.max(...r.map(j=>j.en));const busy=r.reduce((a,j)=>a+j.g*(j.en-j.st),0);
    const mw=r.reduce((a,j)=>a+j.st,0)/r.length;return {mk,util:busy/(8*mk),mw}}
  function caption(m,ti){
    const r=run(m),ev=events(m),t=ev[ti];
    if(ti===0){const st=r.filter(j=>j.st<=t+5);return '<b class="t">0:00, all eight jobs submitted.</b> '+(st.length?st.map(j=>j.n).join(', ')+' start'+(st.length>1?'':'s')+' at once; ':'')+
      'the rest wait in the queue in submission order, each with Slurm\'s reason: the first waiting job shows <code>(Resources)</code> (it does not fit yet), the ones behind it <code>(Priority)</code> (a job ahead of them is waiting).'}
    const ends=r.filter(j=>j.en===t).map(j=>j.n),starts=r.filter(j=>j.st===t);
    const pend=j=>r.filter(k=>k.st>j.st&&k.order<j.order);
    let s='<b class="t">'+SC.mmss(t)+'</b> ';
    if(ends.length)s+=ends.join(', ')+' end'+(ends.length>1?'':'s')+'. ';
    if(starts.length)s+=starts.map(j=>{const jumped=pend(j);return j.n+' starts on '+j.alloc.map(a=>a[0]+' ('+a[1].length+')').join(' + ')+(jumped.length?', <b>backfilled</b> ahead of '+jumped.map(k=>k.n).join(', '):'')}).join('; ')+'.';
    const waiting=r.filter(j=>j.st>t).sort((a,b)=>a.order-b.order);
    s+=waiting.length?' Waiting: '+waiting.map(j=>j.n+' ('+j.g+')').join(', ')+'.':' Queue empty.';
    return s}
  function draw(ti){
    const box=$('sc-w1-svg'),W=SC.width(box),r=run(mode),ev=events(mode),t=ev[ti];
    const T=Math.max(metrics('fifo').mk,metrics('backfill').mk);
    const L=46,R=8,top=8,rh=W<500?17:21,gap=6,H=top+8*rh+gap+30;
    const x=s=>L+(W-L-R)*s/T,y=i=>top+i*rh+(i>=4?gap:0);
    let b='';
    ROWS.forEach((rw,i)=>{b+=SC.rect(L,y(i),W-L-R,rh-2,'var(--soft)',{rx:1});b+=SC.t(L-4,y(i)+rh/2+3,rw[0]+' g'+rw[1],{a:'end',fs:10,fill:'var(--mute)'})});
    for(let m=0;m<=T/60;m+=(W<500?4:2)){const xx=x(m*60);b+='<line x1="'+xx+'" x2="'+xx+'" y1="'+top+'" y2="'+(y(7)+rh)+'" stroke="var(--line)"/>'+SC.t(xx,y(7)+rh+13,m,{a:'middle',fs:10,fill:'var(--mute)'})}
    b+=SC.t(L+(W-L-R)/2,y(7)+rh+26,'minutes after submission',{a:'middle',fs:10,fill:'var(--mute)'});
    r.forEach(j=>{if(j.st>t)return;const e=Math.min(j.en,t);
      j.alloc.forEach(([nd,idx])=>idx.forEach(g=>{const i=rowOf(nd,g);if(i<0)return;
        b+=SC.rect(x(j.st),y(i)+1,x(e)-x(j.st),rh-4,COL[j.n],{op:j.en<=t?0.55:0.95})}));
      const rows=j.alloc.flatMap(([nd,idx])=>idx.map(g=>rowOf(nd,g))).filter(i=>i>=0);
      const mid=rows.length?(y(Math.min(...rows))+y(Math.max(...rows))+rh)/2:0;
      if(x(e)-x(j.st)>14)b+=SC.t((x(j.st)+x(e))/2,mid+4,j.n,{a:'middle',fs:12,w:600,fill:'var(--bg)'})});
    if($('sc-w1-ov').checked){const sm=simOf(mode).sched;
      r.forEach(j=>{const s=sm[j.n];if(!s)return;const rows=j.alloc.flatMap(([nd,idx])=>idx.map(g=>rowOf(nd,g))).filter(i=>i>=0);if(!rows.length)return;
        const y0=y(Math.min(...rows)),y1=y(Math.max(...rows))+rh-2;
        b+=SC.rect(x(s[0]*60),y0,x(s[1]*60)-x(s[0]*60),y1-y0,'none',{stroke:'var(--ink)',sw:1.3,dash:'4 3',rx:2})+SC.t(x(s[0]*60)+3,y0+10,j.n+'*',{fs:9.5,fill:'var(--ink)'})})}
    b+='<line x1="'+x(t)+'" x2="'+x(t)+'" y1="'+(top-4)+'" y2="'+(y(7)+rh)+'" stroke="var(--bad)" stroke-width="1.5"/>';
    box.innerHTML=SC.svg(W,H,b,'Gantt chart of the eight jobs on 8 fake GPUs under Slurm '+mode);
    $('sc-w1-cap').innerHTML=caption(mode,ti);
  }
  function stats(){const f=metrics('fifo'),bk=metrics('backfill'),m=mode==='fifo'?f:bk;
    $('sc-w1-stats').innerHTML=SC.stat('Makespan',SC.mmss(m.mk),mode==='fifo'?'FIFO':'backfill (FIFO '+SC.mmss(f.mk)+')')+
      SC.stat('Utilisation',Math.round(100*m.util)+'%','GPU-time used / available')+SC.stat('Mean wait',SC.mmss(m.mw),'start minus submit')+
      SC.stat('B starts at',SC.mmss(run(mode).find(j=>j.n==='B').st),'the big job')}
  const an=SC.anim({card:'sc-w1-card',ctl:'sc-w1-ctl',n:events(mode).length,draw,ms:1300,label:'Event'});
  SC.seg($('sc-w1-mode'),m=>{mode=m;an.reset(events(m).length);an.go(events(m).length-1);stats()});
  $('sc-w1-ov').addEventListener('change',()=>an.redraw());
  stats();
  // comparison table: Slurm against the pooled simulator and the node-level one
  (function(){const sF=sims.fifo.sched,sC=sims.conservative.sched,sN=sims.nodes.sched;
    const rf=Object.fromEntries(run('fifo').map(j=>[j.n,j])),rb=Object.fromEntries(run('backfill').map(j=>[j.n,j]));
    const cell=(sim,real)=>'<td class="num '+(Math.abs(real-sim*60)<=30?'sc-ok':'sc-diff')+'">'+SC.mmss(real)+'</td>';
    let h='<table><thead><tr><th>Job</th><th class="num">GPUs</th><th class="num">limit</th><th class="num">FIFO sim</th><th class="num">Slurm builtin</th><th class="num">pooled backfill sim</th><th class="num">node-level sim</th><th class="num">Slurm backfill</th></tr></thead><tbody>';
    D.w1.jobs.forEach(j=>{const r=rb[j.n].st,okP=Math.abs(r-sC[j.n][0]*60)<=30;
      h+='<tr><td>'+j.n+'</td><td class="num">'+j.g+'</td><td class="num">'+j.lim+'</td><td class="num">'+sF[j.n][0]+'</td>'+cell(sF[j.n][0],rf[j.n].st)+
      '<td class="num'+(okP?'':' sc-diff')+'">'+sC[j.n][0]+'</td><td class="num">'+sN[j.n][0]+'</td>'+cell(sN[j.n][0],r)+'</tr>'});
    $('sc-w1-cmp').innerHTML=h+'</tbody></table>';
    const miss=(sim,real)=>Object.keys(real).filter(k=>Math.abs(real[k].st-sim[k][0]*60)>30);
    const set=(id,v)=>{const e=$(id);if(e)e.textContent=v};
    set('sc-w1-nf',miss(sF,rf).length);set('sc-w1-np',miss(sC,rb).join(', ')||'none');set('sc-w1-nn',miss(sN,rb).length);
    const f=metrics('fifo'),bk=metrics('backfill');
    set('sc-w1-mkf',SC.mmss(f.mk));set('sc-w1-mkb',SC.mmss(bk.mk));set('sc-w1-uf',Math.round(100*f.util)+'%');set('sc-w1-ub',Math.round(100*bk.util)+'%');
    set('sc-w1-wf',SC.mmss(f.mw));set('sc-w1-wb',SC.mmss(bk.mw));set('sc-w1-fst',SC.mmss(rb.F.st));set('sc-w1-pmk',sims.conservative.m.makespan);
  })();
})();
