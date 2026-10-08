// ---- Serving simulator (t-sim): section 1, the same 20 requests under static/continuous batching and contiguous/paged KV ----
(function(){
  const S=window.ISIM,U=window.SIMU,D=window.SIMD,$=U.$;
  if(!$('sim-anim'))return;
  const CAP=1280,BS=16;
  const W={n:20,rate:0,plo:20,phi:200,olo:5,ohi:60,maxtok:64,sys:0,share:0,groups:1,turns:1,gap:0,seed:1};
  const base={mode:'static',kv:'contig',bs:BS,nblocks:CAP/BS,pc:false,chunk:true,budget:512,maxseq:20,preempt:'recompute',swapbw:25e9,lv:2};
  const M=D.models.l8_bf16,HW=D.hw.h100_bf16;
  const runs={};
  for(const bat of ['static','cont'])for(const kv of ['contig','paged']){
    const cfg={w:W,hw:HW,m:M,c:Object.assign({},base,{mode:bat,kv:kv}),slo:[0.2,0.02]};
    const r=S.run(cfg,true);r.m=S.metrics(r.reqs,r.engs,cfg.slo);
    r.peak=0;for(const s of r.log)if(s.ns>r.peak)r.peak=s.ns;
    r.byId={};for(const q of r.reqs)r.byId[q.id]=q;
    runs[bat+'|'+kv]=r}
  let T=0;for(const k in runs){const r=runs[k],l=r.log[r.log.length-1];if(l.t+l.dt>T)T=l.t+l.dt}
  let cur={bat:'static',kv:'contig'};
  const R=()=>runs[cur.bat+'|'+cur.kv];
  // the real cache size for scale: 0.9 of 80 GB minus the weights, over bytes per token
  const realTok=(0.9*80e9-M.wbytes)/M.kvtok;
  $('sim-w-cap').textContent=U.n0(CAP);$('sim-w-real').textContent=U.n0(Math.round(realTok/1e4)*1e4);

  function timeline(r,i){
    const el=$('sim-a-tl'),w=U.width(el),padL=34,padR=8,rowH=w<480?8:10,gap=2,h=W.n*(rowH+gap)+22;
    const x=t=>padL+(w-padL-padR)*t/T;
    const now=r.log[i].t+r.log[i].dt;
    let b='';
    // waiting bars: from arrival to the first step that schedules the request (or now)
    const firstStep={};for(let k=0;k<=i;k++)for(const row of r.log[k].rows)if(firstStep[row[0]]===undefined)firstStep[row[0]]=r.log[k].t;
    for(let id=0;id<W.n;id++){const q=r.byId[id],y=id*(rowH+gap);
      const end=firstStep[id]!==undefined?firstStep[id]:now;
      if(end>q.arr)b+='<rect x="'+x(q.arr).toFixed(1)+'" y="'+y+'" width="'+Math.max(0,x(end)-x(q.arr)).toFixed(1)+'" height="'+rowH+'" fill="var(--soft)" stroke="var(--line)" stroke-width="0.5"/>';
      b+=U.t(padL-4,y+rowH-1,'R'+id,{a:'end',fs:w<480?8:9})}
    for(let k=0;k<=i;k++){const s=r.log[k],x0=x(s.t),x1=x(s.t+s.dt),ww=Math.max(0.6,x1-x0-(x1-x0>3?0.6:0));
      for(const row of s.rows){const y=row[0]*(rowH+gap),kd=row[3];
        const f=kd==='d'?'var(--c1)':kd==='x'?'var(--dim)':'var(--c2)';
        b+='<rect x="'+x0.toFixed(1)+'" y="'+y+'" width="'+ww.toFixed(1)+'" height="'+rowH+'" fill="'+f+'"'+(k===i?' stroke="var(--ink)" stroke-width="0.6"':'')+'/>'}}
    const y0=W.n*(rowH+gap)+2;b+='<line x1="'+padL+'" x2="'+(w-padR)+'" y1="'+y0+'" y2="'+y0+'" class="sim-ax"/>';
    for(const tv of U.ticks(0,T*1e3,w<480?4:7))b+=U.t(x(tv/1e3),y0+13,U.n0(tv)+(tv===0?' ms':''),{a:U.anc(x(tv/1e3),w)});
    b+='<line x1="'+x(now).toFixed(1)+'" x2="'+x(now).toFixed(1)+'" y1="0" y2="'+y0+'" stroke="var(--ink)" stroke-dasharray="2 2" stroke-width="0.8"/>';
    el.innerHTML=U.svg(w,h,b,'Timeline of 20 requests up to step '+(i+1));
  }
  function kvmap(r,i){
    const el=$('sim-a-kvmap'),w=U.width(el),nb=CAP/BS,per=w<480?10:20,bw=(w-2)/per,bh=w<480?16:18,rows=Math.ceil(nb/per),h=rows*(bh+3);
    const kv=r.log[i].kv;let b='';
    // per slot: owner and filled
    const own=new Array(CAP).fill(-1),fil=new Array(CAP).fill(0);
    if(kv.own){for(let k=0;k<nb;k++){if(kv.own[k]<0)continue;for(let s=0;s<BS;s++){own[k*BS+s]=kv.own[k];fil[k*BS+s]=s<kv.fill[k]?1:0}}}
    else for(const sg of kv.segs){const q=r.byId[sg[2]],used=Math.min(sg[1],q?sg[3]:0);for(let s=0;s<sg[1];s++){own[sg[0]+s]=sg[2];fil[sg[0]+s]=s<used?1:0}}
    // paged: blocks are scattered in memory; draw them in the order the pool holds them (block id)
    for(let k=0;k<nb;k++){const cx=(k%per)*bw+1,cy=Math.floor(k/per)*(bh+3);
      b+='<rect x="'+cx.toFixed(1)+'" y="'+cy+'" width="'+(bw-2).toFixed(1)+'" height="'+bh+'" fill="var(--soft)" stroke="var(--line)" stroke-width="0.5"/>';
      let s=0;while(s<BS){const o=own[k*BS+s],f=fil[k*BS+s];let e=s;while(e<BS&&own[k*BS+e]===o&&fil[k*BS+e]===f)e++;
        if(o>=0){const sx=cx+(bw-2)*s/BS,sw=(bw-2)*(e-s)/BS;b+='<rect x="'+sx.toFixed(1)+'" y="'+(cy+1)+'" width="'+sw.toFixed(1)+'" height="'+(bh-2)+'" fill="'+(f?U.col(o):U.col(o,true))+'"/>'}
        s=e}
      if(kv.own&&kv.own[k]>=0&&bw>22)b+=U.t(cx+(bw-2)/2,cy+bh-5,'R'+kv.own[k],{a:'middle',fs:8,fill:'var(--bg)'});
    }
    if(!kv.own){// contiguous: mark segment starts with the request id
      for(const sg of kv.segs){const k=Math.floor(sg[0]/BS),cx=(k%per)*bw+1+(bw-2)*(sg[0]%BS)/BS,cy=Math.floor(k/per)*(bh+3);if(bw>22)b+=U.t(cx+2,cy+bh-5,'R'+sg[2],{fs:8,fill:'var(--bg)'})}}
    el.innerHTML=U.svg(w,h,b,'KV cache map at step '+(i+1));
    let filled=0,res=0;for(let k=0;k<CAP;k++){if(own[k]>=0){if(fil[k])filled++;else res++}}
    let hole='';if(!kv.own){// largest free run, and whether the next waiting request fits
      let best=0,run=0;for(let k=0;k<CAP;k++){if(own[k]<0){run++;if(run>best)best=run}else run=0}
      hole=', largest free gap '+U.n0(best)+' tokens'}
    $('sim-a-kvcap').innerHTML=U.n0(filled)+' of '+U.n0(CAP)+' token slots hold KV, '+U.n0(res)+' are reserved but empty, '+U.n0(CAP-filled-res)+' free'+hole;
    return {filled,res};
  }
  function caption(r,i){
    const s=r.log[i],stat=cur.bat==='static';
    const pre=s.rows.filter(x=>x[3]==='P'||x[3]==='p'),dec=s.rows.filter(x=>x[3]==='d'),pad=s.rows.filter(x=>x[3]==='x');
    const fin=[];for(const row of s.rows){const q=r.byId[row[0]];if(q.done>=0&&Math.abs(q.done-(s.t+s.dt))<1e-12&&row[3]!=='x')fin.push(row[0])}
    let txt='<b>Step '+(i+1)+' of '+r.log.length+'</b>, starts at '+U.ms(s.t)+' and takes '+U.ms(s.dt)+'. ';
    if(stat&&i>0&&r.log[i-1].rows.length&&s.rows.some(x=>x[3]==='P')){txt+='A new static batch of '+s.rows.length+' requests: every prompt is padded to the longest ('+U.n0(s.rows[0][2])+' tokens), so this one pass computes '+U.n0(s.rows.length*s.rows[0][2])+' token positions. '}
    else if(stat&&i===0)txt+='The first static batch takes '+s.rows.length+' requests, as many as fit when each reserves its prompt plus 64 output tokens. Prompts are padded to the longest ('+U.n0(s.rows[0][2])+' tokens). ';
    else{if(pre.length)txt+='Prefill for '+pre.map(x=>'R'+x[0]+' ('+U.n0(x[2])+' tokens'+(x[1]>0?' from '+U.n0(x[1]):'')+')').join(', ')+'. ';
      if(dec.length)txt+=dec.length+' request'+(dec.length>1?'s':'')+' decode one token each. '}
    if(pad.length)txt+=pad.length+' row'+(pad.length>1?'s have':' has')+' already finished and only adds padding. ';
    if(s.pre&&s.pre.length)txt+='Out of blocks: '+s.pre.map(x=>'R'+x).join(', ')+' preempted (KV dropped; it will recompute later). ';
    if(fin.length)txt+=fin.map(x=>'R'+x).join(', ')+' finished'+(stat?' but keeps its memory until the batch ends':(cur.kv==='paged'?'; its blocks are free for the next step':'; its reservation is free now'))+'. ';
    const now=s.t+s.dt;let wait=0;for(const q of r.reqs){if(q.arr<=now&&!r.log.slice(0,i+1).some(st=>st.rows.some(x=>x[0]===q.id)))wait++}
    if(wait)txt+=wait+' still waiting.';
    $('sim-a-cap').innerHTML=txt;
    return {now,wait};
  }
  function counters(r,i,kvs,cp){
    let out=0,done=0;for(const q of r.reqs){for(const t of q.times)if(t<=cp.now+1e-12)out++;if(q.done>=0&&q.done<=cp.now+1e-12)done++}
    $('sim-a-cnt').innerHTML=U.stat('Time',U.ms(cp.now))+U.stat('In this step',r.log[i].ns+' requests')+U.stat('Waiting',cp.wait)+U.stat('Finished',done+' of 20')+U.stat('Tokens out',U.n0(out))+U.stat('KV holding tokens',Math.round(100*kvs.filled/CAP)+'%',Math.round(100*kvs.res/CAP)+'% reserved, empty');
  }
  function draw(i){const r=R();i=Math.min(i,r.log.length-1);timeline(r,i);const k=kvmap(r,i),c=caption(r,i);counters(r,i,k,c)}
  function summary(){
    const rows=[['static','contig','Static, contiguous'],['static','paged','Static, paged'],['cont','contig','Continuous, contiguous'],['cont','paged','Continuous, paged']];
    let h='<thead><tr><th>Setting</th><th class="num">Last request done</th><th class="num">Mean TTFT</th><th class="num">Mean TPOT</th><th class="num">Most at once</th><th class="num">Steps</th><th class="num">Preempted</th></tr></thead><tbody>';
    for(const x of rows){const r=runs[x[0]+'|'+x[1]],m=r.m,on=x[0]===cur.bat&&x[1]===cur.kv;
      h+='<tr'+(on?' class="sim-base"':'')+'><td>'+(on?'<b>'+x[2]+'</b>':x[2])+'</td><td class="num">'+U.ms(m.span)+'</td><td class="num">'+U.ms(m.ttft[3])+'</td><td class="num">'+U.ms(m.tpot[3])+'</td><td class="num">'+r.peak+'</td><td class="num">'+m.steps+'</td><td class="num">'+m.npre+'</td></tr>'}
    $('sim-a-sum').innerHTML=h+'</tbody>';
  }
  const A=U.anim({card:'sim-anim',ctl:'sim-a-ctl',n:R().log.length,draw:draw,ms:450,label:'Step of the 20-request run'});
  function change(){A.reset(R().log.length);summary()}
  U.seg($('sim-a-bat'),v=>{cur.bat=v;change()});
  U.seg($('sim-a-kv'),v=>{cur.kv=v;change()});
  summary();
  U.onResize(()=>A.redraw());
  // predictions, answered from the runs above
  const sc=runs['static|contig'],cc=runs['cont|contig'],cp=runs['cont|paged'];
  U.predict($('sim-pr1'),()=>cc.m.span<0.85*sc.m.span?0:(cc.m.span>1.05*sc.m.span?2:1),()=>'With the same contiguous memory, the last of the 20 finishes at '+U.ms(cc.m.span)+' instead of '+U.ms(sc.m.span)+' ('+Math.round(100*(1-cc.m.span/sc.m.span))+'% sooner), and the mean time to first token drops from '+U.ms(sc.m.ttft[3])+' to '+U.ms(cc.m.ttft[3])+'. Static batching loses twice: rows that finished early keep their slot and their memory until the longest answer ends, and prompts are padded to the longest one. Continuous batching hands a finished request\'s place to a waiting one at the very next step.');
  U.predict($('sim-pr2'),()=>cp.peak>cc.peak?2:(cp.peak<cc.peak?0:1),()=>'At the busiest step, '+cp.peak+' requests run together with paged blocks against '+cc.peak+' with contiguous reservations. A contiguous reservation holds prompt + 64 tokens from the start, although these answers average about '+U.n0(cc.reqs.reduce((a,q)=>a+q.O,0)/20)+' tokens; paging only holds what has been written, rounded up to one 16-token block. The price: when the blocks run out, a request is preempted and recomputed ('+cp.m.npre+' preemptions in this run), which never happens to a request that reserved its maximum up front.');
})();
