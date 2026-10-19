// ---- Storage lab: the same 60 steps without checkpoints, with synchronous and with asynchronous checkpoints (measured step times) ----
(function(){
  const H=window.IO_H,D=window.IO_D;if(!H||!D||!H.$('io-as-card'))return;const $=H.$;
  const fS=s=>s>=1?s.toFixed(2)+' s':(s*1e3).toFixed(0)+' ms';
  const ROWS=[['none','No checkpoints'],['sync','Synchronous dcp.save'],['async','Asynchronous dcp.async_save']];
  const NF=61;let tgt='slow_bind';
  const src=()=>tgt==='native'?D.train:D[tgt].train;
  function prep(){
    const S=src(),R={};
    ROWS.forEach(([k])=>{let t=0;const ev=[];S[k].steps.forEach(([s,w,b])=>{ev.push({s,t0:t,tb:t+Math.max(0,w-b),t1:t+w,b});t+=w});R[k]={ev,total:t}});
    // background writes of the async run, drawn with the sync run's write time at the same checkpoint
    const sb=S.sync.steps.filter(x=>x[2]>0);R.async.bg=R.async.ev.filter(e=>e.b>0).map((e,i)=>({t0:e.t1,t1:e.t1+(sb[i]?sb[i][2]:0)}));
    R.max=Math.max(...ROWS.map(([k])=>R[k].total));return R;
  }
  let R=prep();
  function draw(i){
    const el=$('io-as-svg'),W=H.width(el),t=R.max*i/(NF-1);const lab=15,rh=18,gap=14,top=4,axis=18;
    const X=v=>v/R.max*(W-2);let b='';
    ROWS.forEach(([k,name],r)=>{const y=top+r*(lab+rh+gap);b+=H.t(0,y+11,name,{fs:11.5,w:600});const yy=y+lab;
      b+=H.rect(0,yy,W-2,rh,'var(--soft)',{rx:2});
      R[k].ev.forEach(e=>{if(e.t0>=t)return;const a=Math.min(e.tb,t);b+=H.rect(X(e.t0),yy,Math.max(0.6,X(a)-X(e.t0)-0.4),rh,'var(--c3)',{rx:0});
        if(e.b>0&&e.tb<t)b+=H.rect(X(e.tb),yy,Math.max(1.5,X(Math.min(e.t1,t))-X(e.tb)),rh,'var(--c2)',{rx:0});});
      if(k==='async')R.async.bg.forEach(g=>{if(g.t0>=t)return;b+=H.rect(X(g.t0),yy+rh+2,X(Math.min(g.t1,t))-X(g.t0),5,'var(--c1)',{rx:1,op:0.35})});
    });
    const ya=top+3*(lab+rh+gap)-4;b+=H.line(0,ya,W-2,ya,'var(--line)');
    for(let s=0;s<=R.max;s+=R.max>30?10:5){b+=H.line(X(s),ya,X(s),ya+4,'var(--mute)');b+=H.t(Math.min(W-14,X(s)),ya+15,s+' s',{a:s===0?'start':'middle',fs:10.5,fill:'var(--mute)'})}
    b+=H.line(X(t),top,X(t),ya,'var(--ink)',{dash:'3 3',op:0.6});
    el.innerHTML=H.svg(W,ya+axis,b,'Timelines of three training runs');
    // counters and caption
    const st=ROWS.map(([k])=>{const ev=R[k].ev;const done=ev.filter(e=>e.t1<=t).length;const blk=ev.filter(e=>e.b>0&&e.tb<t).reduce((s,e)=>s+Math.min(e.t1,t)-e.tb,0);
      const inb=ev.find(e=>e.b>0&&e.tb<=t&&t<e.t1);return {done,blk,inb}});
    $('io-as-out').innerHTML=ROWS.map(([k,name],r)=>'<div class="stat"><div class="k">'+name+'</div><div class="v">'+st[r].done+' / 60 steps</div><div class="d">stopped for checkpoints: '+fS(st[r].blk)+'</div></div>').join('');
    let cap='t = '+t.toFixed(1)+' s. ';
    if(i===0)cap+='Three runs of the same 60 steps, same seed, same data. Press play: the synchronous run will stop at steps 15, 30, 45 and 60 for the whole write; the asynchronous one only for the copy to memory.';
    else if(st[1].inb)cap+='The synchronous run is stopped at step '+st[1].inb.s+': every rank waits until its shard is on storage ('+fS(st[1].inb.b)+' for this checkpoint).';
    else if(st[2].inb)cap+='The asynchronous run is copying its shards to memory at step '+st[2].inb.s+' ('+fS(st[2].inb.b)+'); the write then runs in a background thread.';
    else if(i===NF-1)cap+='Done. Final loss '+src().sync.loss_last+' in all three runs: checkpointing changes the timeline, never the arithmetic. Totals: '+ROWS.map(([k,n])=>n.toLowerCase()+' '+R[k].total.toFixed(1)+' s').join(', ')+'.';
    else cap+=(R.async.bg.some(g=>g.t0<=t&&t<g.t1)?'The asynchronous run trains while its checkpoint is written in the background (thin band). ':'')+'All three runs are training.';
    $('io-as-cap').textContent=cap;
  }
  const A=H.anim({card:'io-as-card',ctl:'io-as-ctl',n:NF,ms:260,label:'Time through the three runs',draw});
  function text(){
    const S=src(),bl=window.IO_BLK;const sy=bl(S.sync),as=bl(S.async);
    const norm=k=>{const w=S[k].steps.filter(x=>x[2]===0).map(x=>x[1]).sort((a,b)=>a-b);return w[w.length>>1]};
    $('io-as-text').innerHTML='<b>What it measured</b> ('+(tgt==='native'?'Mac SSD, native, 25.3M parameters':tgt==='slow_bind'?'slow shared folder, 3.2M parameters':'Docker volume, 3.2M parameters')+', '+(Object.values(S.sync.files).reduce((a,b)=>a+b,0)/1e6).toFixed(1)+' MB of DCP files per checkpoint'+'): training stood still for a median <b>'+fS(sy)+'</b> per synchronous checkpoint and <b>'+fS(as)+'</b> per asynchronous one, '+(sy/as).toFixed(0)+' times less. The cost moved elsewhere: the median ordinary step was '+fS(norm('none'))+' without checkpoints, '+fS(norm('sync'))+' with synchronous ones and '+fS(norm('async'))+' with asynchronous ones, because here the background writer competes with training for the same CPUs. On GPU nodes it competes for host CPU and PCIe instead, much less. Whole-run totals ('+S.none.total_s+' s, '+S.sync.total_s+' s, '+S.async.total_s+' s) move by a few seconds between repeats on this shared machine; the per-checkpoint stop is the clean measurement.';
  }
  H.seg($('io-as-tgt'),m=>{tgt=m;R=prep();text();A.redraw()});text();
})();
