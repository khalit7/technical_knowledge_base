// ---- Shared charts: process lanes for the real killed-and-resumed runs (E6), storage growth (E3) ----
window.FLGC=(function(){
  const esc=RD.esc;
  const SHORT={diagnose_word_count:'diagnose word_count',diagnose_top_words:'diagnose top_words',propose_fix:'propose_fix',read_and_test:'read_and_test',human_review:'human_review',apply_and_test:'apply_and_test'};
  const COL={diagnose_word_count:'var(--c1)',diagnose_top_words:'var(--c3)',propose_fix:'var(--c4)'};
  // run: FLG.e6.runs.A|B; upto: time cursor in s (optional); returns svg
  function lanes(run,W,upto){
    const procs=['start','resume','approve'];const tmax=Math.max(...run.events.map(e=>e.t))*1.02;
    const L=Math.min(78,W*0.2),R=8,lh=46,top=18,H=top+procs.length*lh+26;const x=t=>L+(W-L-R)*t/tmax;
    const hid='flgHatch'+(++window.FLG_UID);let b='<defs><pattern id="'+hid+'" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="var(--soft)"/><line x1="0" y1="0" x2="0" y2="6" stroke="var(--bad)" stroke-width="2"/></pattern></defs>';
    // axis
    const step=tmax>30?10:5;for(let t=0;t<=tmax;t+=step){b+='<line x1="'+x(t)+'" y1="'+top+'" x2="'+x(t)+'" y2="'+(H-20)+'" stroke="var(--line)"/>'+RD.t(x(t),H-6,t+' s',{a:'middle',fs:10,fill:'var(--mute)'})}
    procs.forEach((p,i)=>{const y=top+i*lh;b+=RD.t(4,y+16,p==='start'?'process 1':p==='resume'?'process 2':'process 3',{fs:10.5,w:600})+RD.t(4,y+29,p==='start'?'start':p==='resume'?'invoke(None)':'Command(resume)',{fs:9.5,fill:'var(--mute)'})});
    const cut=upto===undefined?Infinity:upto;
    // calls: two parallel calls in one lane share it in two half-height rows
    const rowOf={};
    run.calls.forEach(c=>{const i=procs.indexOf(c.process);if(i<0||c.t0>cut)return;
      const same=run.calls.filter(d=>d.process===c.process&&d.t0===c.t0);const k=same.indexOf(c);const n=same.length;
      const y=top+i*lh+2+k*(36/n),h=36/n-3;const t1=c.t1===null?run.kill:c.t1;const te=Math.min(t1,cut);
      const lost=c.t1===null&&run.kill<=cut;
      b+='<rect x="'+x(c.t0)+'" y="'+y+'" width="'+Math.max(1.5,x(te)-x(c.t0))+'" height="'+h+'" rx="3" fill="'+(lost?'url(#'+hid+')':COL[c.node]||'var(--c2)')+'" stroke="'+(lost?'var(--bad)':'none')+'" opacity="'+(lost?1:.85)+'"/>';
      const lab=(SHORT[c.node]||c.node)+(lost?' (killed)':'');
      if(x(te)-x(c.t0)>lab.length*5.2)b+=RD.t(x(c.t0)+4,y+h/2+4,esc(lab),{fs:10,fill:lost?'var(--bad)':'var(--bg)',w:600});
      else if(x(te)-x(c.t0)>30)b+=RD.t(x(c.t0)+4,y+h/2+4,esc(lab.split(' ')[0].slice(0,4)+'.'),{fs:10,fill:lost?'var(--bad)':'var(--bg)',w:600})});
    // non-model node events
    run.events.forEach(e=>{const i=procs.indexOf(e.process);if(i<0||e.t>cut)return;const y=top+i*lh;
      if(e.node==='read_and_test'&&e.what==='start')b+='<rect x="'+(x(e.t)-1)+'" y="'+(y+2)+'" width="3" height="34" fill="var(--c5)"/>';
      if(e.what==='process_end'&&e.process==='resume')b+=RD.t(x(e.t)-2,y+46,'interrupt: waits',{a:'end',fs:9.5,fill:'var(--c2)'});
      if(e.what==='resumed'){const xx=x(e.t);b+='<path d="M'+xx+','+(y+8)+' l7,9 l-7,9 l-7,-9z" fill="var(--c2)"/>'+RD.t(xx-10,y+21,'approve',{a:'end',fs:10,fill:'var(--c2)',w:600})}
      if(e.what==='tested')b+=RD.t(Math.min(x(e.t)+2,W-R),y+46,e.passed?'tests pass':'tests fail',{a:'end',fs:9.5,fill:e.passed?'var(--good)':'var(--bad)'})});
    if(run.kill<=cut)b+='<line x1="'+x(run.kill)+'" y1="'+(top-6)+'" x2="'+x(run.kill)+'" y2="'+(H-20)+'" stroke="var(--bad)" stroke-width="2"/>'+RD.t(x(run.kill)+3,top-8,'SIGKILL',{fs:10,fill:'var(--bad)',w:600});
    if(upto!==undefined&&upto<tmax)b+='<line x1="'+x(upto)+'" y1="'+top+'" x2="'+x(upto)+'" y2="'+(H-20)+'" stroke="var(--ink)" stroke-dasharray="2 2"/>';
    const lg=[['var(--c1)','diagnose word_count'],['var(--c3)','diagnose top_words'],['var(--c4)','propose_fix'],['url(#'+hid+')','killed in flight'],['var(--c5)','read_and_test (tick)']];
    let lx=4,ly=H+4;const items=lg.map(([c,t])=>{const w=t.length*5.6+22;if(lx+w>W){lx=4;ly+=15}const r='<rect x="'+lx+'" y="'+(ly-9)+'" width="12" height="10" rx="2" fill="'+c+'"'+(c.startsWith('url')?' stroke="var(--bad)"':'')+'/>'+RD.t(lx+16,ly,t,{fs:10,fill:'var(--mute)'});lx+=w;return r}).join('');
    return RD.svg(W,ly+6,b+items,'Process lanes, durability '+run.durability);
  }
  function sums(run,upto){
    const cut=upto===undefined?Infinity:upto;let calls=0,done=0,inp=0,out=0,cost=0,lost=0;
    run.calls.forEach(c=>{if(c.t0>cut)return;calls++;if(c.t1!==null&&c.t1<=cut){done++;inp+=c.input;out+=c.output;cost+=c.cost}if(c.t1===null&&run.kill<=cut)lost++});
    return {calls,done,inp,out,cost,lost};
  }
  // storage growth: series of arrays, labels, colors
  function growth(el,sets){
    const W=RD.width(el),H=Math.round(Math.min(260,Math.max(190,W*0.42)));const L=52,R=10,T=10,B=30;
    const n=Math.max(...sets.map(s=>s.y.length));const ymax=Math.max(...sets.map(s=>Math.max(...s.y)))*1.05;
    const x=i=>L+(W-L-R)*(i+1)/n,y=v=>T+(H-T-B)*(1-v/ymax);let b='';
    const yt=ymax>1e6?2.5e5:1e5;for(let v=0;v<=ymax;v+=yt){b+='<line x1="'+L+'" y1="'+y(v)+'" x2="'+(W-R)+'" y2="'+y(v)+'" stroke="var(--line)"/>'+RD.t(L-4,y(v)+4,(v/1e6).toFixed(v%1e6?2:0)+' MB',{a:'end',fs:10,fill:'var(--mute)'})}
    [1,10,20,30,40].forEach(i=>{if(i<=n)b+=RD.t(x(i-1),H-12,String(i),{a:'middle',fs:10,fill:'var(--mute)'})});
    b+=RD.t((L+W-R)/2,H-1,'super-step',{a:'middle',fs:10,fill:'var(--mute)'});
    sets.forEach(s=>{b+='<polyline fill="none" stroke="'+s.c+'" stroke-width="2.2" points="'+s.y.map((v,i)=>x(i)+','+y(v)).join(' ')+'"/>';
      const lv=s.y[s.y.length-1];b+=RD.t(Math.min(x(s.y.length-1),W-R)-2,y(lv)-6,esc(s.label),{a:'end',fs:10.5,fill:s.c,w:600})});
    el.innerHTML=RD.svg(W,H,b,'Stored bytes per super-step');
  }
  return {lanes,sums,growth};
})();
