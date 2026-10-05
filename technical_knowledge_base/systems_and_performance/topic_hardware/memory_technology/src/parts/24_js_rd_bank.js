// ---- section 2: one DRAM bank, the same 16 reads in three orders (before/after animation) ----
// bankSim mirrors bank_sim() in code/build_data.py line for line; check/check_js.mjs compares them.
window.BANKSIM=function(mode,P){
  const ev=[];let tBus=0,tFree=0;const open={};
  for(let i=0;i<P.n;i++){
    let bank,row,col;
    if(mode==='seq'){bank=0;row=0;col=i}
    else if(mode==='rand1'){bank=0;row=(i*7+3)%61+1;col=(i*5)%16}
    else{bank=i;row=(i*7+3)%61+1;col=(i*5)%16}
    const e={i,bank,row,col,hit:open[bank]===row};let rd;
    if(mode==='randB'){const act=i*P.tRRD;e.pre=null;e.act=[act,act+P.tRCD];rd=act+P.tRCD}
    else if(e.hit){e.pre=null;e.act=null;rd=Math.max(P.tRCD,tBus-P.tCL)}
    else{let t=tFree;if(bank in open){e.pre=[t,t+P.tRP];t+=P.tRP}else e.pre=null;e.act=[t,t+P.tRCD];rd=t+P.tRCD}
    const d0=Math.max(rd+P.tCL,tBus);e.rd=[rd,rd+P.tCL];e.data=[d0,d0+P.tBURST];
    tBus=d0+P.tBURST;tFree=tBus;open[bank]=row;ev.push(e)}
  const end=ev[ev.length-1].data[1];const acts=ev.filter(e=>e.act).length;
  return {ev,end,acts,opened:acts*P.row,used:P.n*P.req,gbs:P.n*P.req/end};
};
(function(){
  const P=MEMD.bank,el=document.getElementById('rd-bank-svg'),cap=document.getElementById('rd-bank-cap'),cnt=document.getElementById('rd-bank-cnt');
  let mode='seq',sim=BANKSIM(mode,P);
  const tMax=Math.max(...['seq','rand1','randB'].map(m=>BANKSIM(m,P).end));
  const names={seq:'Sequential: 16 reads from one row',rand1:'Random: 16 different rows of one bank',randB:'Random: 16 different rows in 16 banks'};
  function draw(k){
    const W=RD.width(el),narrow=W<520,L=narrow?30:40,R=10,T=34,lane=narrow?9:10,H=T+P.n*lane+30;
    const X=t=>L+t/tMax*(W-L-R);let s='';
    // banks strip
    const nb=16,bw=Math.min(34,(W-L-R)/nb-3);
    for(let b=0;b<nb;b++){let openRow=null;for(let j=0;j<k;j++){if(sim.ev[j].bank===b)openRow=sim.ev[j].row}
      const x=L+b*(bw+3);s+='<rect x="'+x+'" y="4" width="'+bw+'" height="18" rx="3" style="fill:'+(openRow!=null?'var(--acc2)':'var(--soft)')+';stroke:var(--line)"/>';
      if(openRow!=null&&bw>16)s+=RD.t(x+bw/2,17,'r'+openRow,{a:'middle',fs:9})}
    if(!narrow)s+=RD.t(L-4,17,'banks',{a:'end',fs:9,fill:'var(--mute)'});
    // gantt
    for(let j=0;j<P.n;j++){const y=T+j*lane;s+=RD.t(L-4,y+lane-2,String(j+1),{a:'end',fs:9,fill:'var(--mute)'});
      if(j>=k)continue;const e=sim.ev[j];
      const seg=(a,c)=>{if(a)s+='<rect x="'+X(a[0])+'" y="'+(y+1)+'" width="'+Math.max(1,X(a[1])-X(a[0]))+'" height="'+(lane-2)+'" style="fill:'+c+'"/>'};
      seg(e.pre,'var(--c4)');seg(e.act,'var(--c2)');seg(e.rd,'var(--c5)');seg(e.data,'var(--c3)')}
    const yA=T+P.n*lane+4;s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+yA+'" y2="'+yA+'" style="stroke:var(--mute)"/>';
    for(let t=0;t<=tMax;t+=100){s+=RD.t(X(t),yA+13,t+' ns',{a:'middle',fs:9,fill:'var(--mute)'})}
    if(k>0){const tn=sim.ev[k-1].data[1];s+='<line x1="'+X(tn)+'" x2="'+X(tn)+'" y1="'+T+'" y2="'+yA+'" style="stroke:var(--ink)" stroke-dasharray="3 3"/>'}
    el.innerHTML=RD.svg(W,H,s,'DRAM bank timeline');
    // caption
    let t='',p='';
    if(k===0){t=names[mode];p='Sixteen reads of 64 bytes each, 1 KB in all. Each lane is one read: precharge, activate, column read, data burst, drawn to one time scale for all three orders. Press play or step.'}
    else{const e=sim.ev[k-1];t='Read '+k+' of 16: bank '+e.bank+', row '+e.row+', column '+e.col+(e.hit?' (row hit)':' (row miss)');
      p=e.hit?'The row is already in the row buffer: only the column read and the burst, pipelined behind the previous one.':
        mode==='randB'?'A different bank: its activate starts '+P.tRRD+' ns after the previous one, overlapping the earlier reads; only the data bus is shared.':
        (e.pre?'Another row is open: precharge it ('+P.tRP+' ns), activate the new row ('+P.tRCD+' ns), then read ('+P.tCL+' ns) and send the burst.':'The bank is idle: activate the row ('+P.tRCD+' ns), read ('+P.tCL+' ns), send the burst ('+P.tBURST+' ns).');
      if(k===P.n)p+=' Done after '+sim.end+' ns: '+MC.fmtN(sim.gbs,2)+' GB/s from this one bank and bus, against '+MC.fmtN(BANKSIM('seq',P).gbs,2)+' GB/s sequential.'}
    cap.innerHTML='<div class="t">'+t+'</div><p>'+p+'</p>';
    const done=sim.ev.slice(0,k),acts=done.filter(e=>e.act).length,tn=k?sim.ev[k-1].data[1]:0;
    cnt.innerHTML=RD.stat('Time',tn+' ns','of '+sim.end+' ns for all 16')+RD.stat('Rows opened',acts,'activates')+RD.stat('Bytes opened / used',MC.fmtN(acts*P.row/1024,0)+' KB / '+MC.fmtN(k*P.req/1024,2)+' KB','activation energy follows rows opened')+RD.stat('Effective rate',k?MC.fmtN(k*P.req/tn,2)+' GB/s':'-','bytes delivered / time');
  }
  const A=RD.anim({card:'rd-bank-card',ctl:'rd-bank-ctl',n:P.n+1,draw,ms:700,label:'Read'});
  RD.seg(document.getElementById('rd-bank-mode'),m=>{mode=m;sim=BANKSIM(mode,P);A.reset(P.n+1);A.play()});
  RD.onResize(()=>A.redraw());
})();
