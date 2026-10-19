// ---- Reading section 3: one state, five write rules. A line-by-line port of src/state/state_rules.py (same mulberry32
// generator and Box-Muller draws, float64), so the end-of-sequence cosines equal the recorded ones (check_data.py). ----
(function(){
  const $=id=>document.getElementById(id);
  if(!window.RD||!window.BAD||!$('rd-wr'))return;
  const WR=BAD.wr_writes;
  function mulberry32(seed){let s=seed>>>0;return function(){s=(s+0x6D2B79F5)>>>0;let t=s;
    t=Math.imul(t^(t>>>15),t|1)>>>0;t=(t^((t+(Math.imul(t^(t>>>7),t|61)>>>0))>>>0))>>>0;return ((t^(t>>>14))>>>0)/4294967296}}
  function units(n,d,rnd){const out=[];for(let i=0;i<n;i++){const v=[];for(let j=0;j<d;j++){const u1=Math.max(rnd(),1e-12),u2=rnd();
    v.push(Math.sqrt(-2*Math.log(u1))*Math.cos(2*Math.PI*u2))}const nr=Math.sqrt(v.reduce((a,x)=>a+x*x,0));out.push(v.map(x=>x/nr))}return out}
  // returns per-step {S (dk x dk) or cache length, cos per word written so far}
  function simulate(dk,rule){const a=0.9,b=1.0,beta=8.0;
    const words=[];WR.forEach(w=>{if(!words.includes(w))words.push(w)});
    const rnd=mulberry32(1),kv=units(words.length,dk,rnd),keys={};words.forEach((w,i)=>keys[w]=kv[i]);
    const vals=units(WR.length,dk,rnd);
    let S=Array.from({length:dk},()=>Array(dk).fill(0));const cache=[],steps=[],latest={};
    WR.forEach((w,t)=>{const k=keys[w],v=vals[t];
      if(rule==='softmax')cache.push([k,v]);
      else{if(rule==='decay'||rule==='gated')S=S.map(row=>row.map(x=>a*x));
        let e=v;if(rule==='delta'||rule==='gated'){const Sk=S.map(row=>row.reduce((s,x,j)=>s+x*k[j],0));e=v.map((vi,i)=>b*(vi-Sk[i]))}
        S=S.map((row,i)=>row.map((x,j)=>x+e[i]*k[j]))}
      latest[w]=v;const cos={};
      Object.keys(latest).forEach(u=>{const q=keys[u];let r;
        if(rule==='softmax'){const sc=cache.map(([kk])=>beta*q.reduce((s,x,j)=>s+x*kk[j],0));const mx=Math.max(...sc);const ex=sc.map(s=>Math.exp(s-mx));const z=ex.reduce((p,x)=>p+x,0);
          r=Array.from({length:dk},(_,i)=>cache.reduce((s,c,j)=>s+ex[j]/z*c[1][i],0))}
        else r=S.map(row=>row.reduce((s,x,j)=>s+x*q[j],0));
        const nr=Math.sqrt(r.reduce((s,x)=>s+x*x,0))||1e-12;cos[u]=r.reduce((s,x,i)=>s+x*latest[u][i],0)/nr});
      steps.push({S:S.map(r=>r.slice()),n:cache.length,cos})});
    return {steps,words}}
  window.BA_WR=simulate;   // exposed for the data check
  let rule='linear',dk=8,sim=simulate(dk,rule);
  const NAMES={softmax:'softmax attention over a KV cache',linear:'linear attention (add v k&#8868;)',decay:'decay a = 0.9, then add',delta:'delta rule (&beta; = 1)',gated:'gated delta (a = 0.9, &beta; = 1)'};
  function draw(i){const st=sim.steps[i],w=WR[i];
    $('rd-wr-seq').innerHTML=WR.map((x,j)=>'<span class="'+(j===i?'cur':j<i?'done':'')+(j>=10?' dup':'')+'">'+x+'</span>').join('');
    // state heat map
    const el=$('rd-wr-state'),W=Math.min(360,RD.width(el)),cell=Math.max(6,Math.min(28,Math.floor((W-30)/dk))),side=cell*dk;
    let s='';
    if(rule==='softmax'){const per=Math.max(4,Math.floor(side/12));
      for(let j=0;j<=i;j++)s+='<rect x="'+(4+(j%12)*per)+'" y="'+(18+Math.floor(j/12)*per)+'" width="'+(per-2)+'" height="'+(per*2-2)+'" fill="var(--acc)" opacity="'+(j===i?1:.55)+'"/>';
      s+=RD.t(4,12,'cache: '+(i+1)+' (key, value) pairs, '+((i+1)*2*dk)+' numbers',{fs:11});
      el.innerHTML=RD.svg(W,Math.max(60,per*2+30),s,'KV cache entries');}
    else{const mx=Math.max(1e-9,...st.S.flat().map(Math.abs));
      for(let r=0;r<dk;r++)for(let c=0;c<dk;c++){const v=st.S[r][c]/mx;
        s+='<rect x="'+(24+c*cell)+'" y="'+(16+r*cell)+'" width="'+(cell-1)+'" height="'+(cell-1)+'" fill="'+(v>=0?'var(--c1)':'var(--bad)')+'" opacity="'+(0.08+0.92*Math.abs(v)).toFixed(2)+'"/>'}
      s+=RD.t(4,11,'state S: '+dk+' x '+dk+' = '+(dk*dk)+' numbers (colour: sign, depth: size)',{fs:11});
      el.innerHTML=RD.svg(W,side+22,s,'state matrix heat map')}
    // read-back bars
    const rl=$('rd-wr-read'),RW=Math.min(380,RD.width(rl)),rh=17,ws=Object.keys(st.cos);
    let r2=RD.t(0,11,'read each key back: cosine with its latest value',{fs:11});
    const x0=58,xw=RW-x0-42,mid=x0+xw/2;
    r2+='<line x1="'+mid+'" x2="'+mid+'" y1="16" y2="'+(18+ws.length*rh)+'" stroke="var(--line)"/>';
    ws.forEach((u,j)=>{const v=st.cos[u],y=18+j*rh;const len=Math.abs(v)*xw/2;
      r2+=RD.t(x0-4,y+12,u,{a:'end',fs:11,w:u===w?600:400});
      r2+='<rect x="'+(v>=0?mid:mid-len)+'" y="'+(y+3)+'" width="'+len.toFixed(1)+'" height="'+(rh-6)+'" fill="'+(v>=0.9?'var(--good)':v>=0.5?'var(--c4)':'var(--bad)')+'"/>';
      r2+=RD.t(RW-2,y+12,v.toFixed(2),{a:'end',fs:11})});
    rl.innerHTML=RD.svg(RW,22+Math.max(10,sim.words.length)*rh,r2,'read-back cosines');
    const vals=Object.values(st.cos),mean=vals.reduce((a,x)=>a+x,0)/vals.length;
    const dup=i>=10;
    $('rd-wr-cap').innerHTML='<p><b>Write '+(i+1)+' of 12: "'+w+'"'+(dup?' again, with a new value':'')+'</b> under '+NAMES[rule]+'. '+
      (rule==='softmax'?(dup?'The cache now holds two entries with the same key; a read averages their values.':'Every pair is kept; memory grows by '+(2*dk)+' numbers per write.'):
       rule==='linear'?(i+1>dk?'More keys than dimensions ('+sim.steps.length+' writes, d<sub>k</sub> '+dk+'): reads now return blends.':'Each write adds an outer product; keys that overlap blur each other.'):
       rule==='decay'?'The whole state shrinks by 0.9 before each write: older words fade (half-life 6.6 writes).':
       rule==='delta'?(dup?'The delta step first reads what "'+w+'" returns, then writes only the difference: the old value is replaced.':'Write only the error v &minus; Sk: if the key already pointed somewhere, that is corrected.'):
       'Decay, then a delta write: recent words exact, old ones fading.')+'</p>';
    $('rd-wr-cnt').innerHTML=RD.stat('numbers kept',(rule==='softmax'?(i+1)*2*dk:dk*dk).toLocaleString('en-GB'),rule==='softmax'?'grows per write':'fixed')+
      RD.stat('distinct keys so far',String(ws.length),'d<sub>k</sub> = '+dk)+RD.stat('mean read-back cosine',mean.toFixed(2),'1.00 is perfect recall')}
  const an=RD.anim({card:'rd-wr',ctl:'rd-wr-ctl',n:WR.length,draw,ms:1300,label:'Write'});
  RD.seg($('rd-wr-mode'),m=>{rule=m;sim=simulate(dk,rule);an.reset(WR.length)});
  RD.seg($('rd-wr-dk'),m=>{dk=+m;sim=simulate(dk,rule);an.reset(WR.length)});
  RD.onResize(()=>an.redraw());
})();
