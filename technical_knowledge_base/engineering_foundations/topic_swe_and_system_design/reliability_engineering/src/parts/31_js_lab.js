// ---- Resilience lab tab: controls -> RE.sim -> stats and three charts ----
(function(){
  const root=document.getElementById('t-lab');if(!root||!window.RE)return;
  const $=id=>document.getElementById(id);
  // [key, label, min, max, step, formatter]
  const ms=v=>v+' ms',sec=v=>(v/1000)+' s';
  const G=[
    ['Traffic and our service',[
      ['rate','New requests per second',10,400,10,v=>v],
      ['pA','Share that call the dependency',0,1,0.05,v=>Math.round(v*100)+'%'],
      ['W','Our worker slots (0 = unlimited)',0,200,1,v=>v?v:'unlimited'],
      ['own','Our own work per request',0,50,1,ms],
      ['maxQ','Our queue limit (0 = unbounded)',0,500,5,v=>v?v:'unbounded'],
      ['Tu','User patience (0 = waits forever)',0,10000,250,v=>v?sec(v):'forever']]],
    ['The dependency and the slowdown',[
      ['Kd','Dependency slots',1,1000,1,v=>v],
      ['Ld','Normal latency per call',5,300,1,ms],
      ['Ls','Latency during the slowdown',10,5000,10,ms],
      ['dur','Slowdown length (starts at 10 s)',1,25,1,v=>v+' s'],
      ['dmaxQ','Dependency queue limit (0 = unbounded)',0,200,1,v=>v?v:'unbounded']]],
    ['Timeouts and retries',[
      ['Td','Timeout per call (0 = none)',0,3000,10,v=>v?ms(v):'none'],
      ['att','Attempts in all (1 = no retry)',1,5,1,v=>v],
      ['base','Backoff base',10,1000,10,ms],
      ['cap','Backoff cap',100,10000,100,ms]]],
    ['Circuit breaker',[
      ['brkN','Window (last N calls)',5,200,1,v=>v],
      ['brkF','Opens at failure share',10,100,5,v=>v+'%'],
      ['brkOpen','Stays open for',500,60000,500,sec],
      ['brkHalf','Trial calls when half-open',1,20,1,v=>v]]]
  ];
  const TOG=[['back','Backoff with full jitter (otherwise retry at once)'],['budget','Retry budget (gRPC throttle)'],['brk','Circuit breaker'],['fb','Fallback answer when the call fails'],['drop','Deadline propagation (skip expired work)']];
  const PRE=[
    ['m_none','Measured: timeouts only'],['m_naive','Measured: retry at once'],['m_backoff','Measured: backoff + jitter'],['m_budget','Measured: retry budget'],['m_deadline','Measured: deadline'],['m_shed','Measured: bounded queue'],
    ['before','Hung provider: no protection'],['after','Hung provider: defended']];
  let st={},cur='m_naive',seed=1;
  function fromCfg(c){const d=Object.assign({},RE.DEF,c);const o={};G.forEach(g=>g[1].forEach(x=>{o[x[0]]=x[0]==='dur'?(d.slowTo-d.slowFrom)/1000:d[x[0]]}));
    o.back=d.back==='full'?1:0;['budget','brk','fb','drop'].forEach(k=>o[k]=d[k]?1:0);return o}
  function toCfg(){const c={seed:seed};G.forEach(g=>g[1].forEach(x=>{if(x[0]!=='dur')c[x[0]]=+st[x[0]]}));c.slowTo=10000+st.dur*1000;c.back=st.back?'full':'none';
    ['budget','brk','fb','drop'].forEach(k=>c[k]=st[k]?1:0);return c}
  // controls
  let h='';G.forEach((g,gi)=>{h+='<details class="grp"'+(gi<3?' open':'')+'><summary>'+g[0]+'</summary><div class="ctl">';
    g[1].forEach(x=>h+='<label>'+x[1]+': <b id="lab-v-'+x[0]+'"></b><input type="range" id="lab-'+x[0]+'" min="'+x[2]+'" max="'+x[3]+'" step="'+x[4]+'" aria-label="'+x[1]+'"></label>');
    h+='</div></details>'});
  h+='<div class="tog">'+TOG.map(t=>'<label><input type="checkbox" id="lab-'+t[0]+'"> '+t[1]+'</label>').join('')+'<label>Seed <select id="lab-seed">'+[1,2,3,4,5,6,7,8,9].map(s=>'<option>'+s+'</option>').join('')+'</select></label></div>';
  $('lab-ctl').innerHTML=h;
  $('lab-pre').innerHTML=PRE.map(p=>'<button data-p="'+p[0]+'">'+p[1]+'</button>').join('');
  function sync(){G.forEach(g=>g[1].forEach(x=>{$('lab-'+x[0]).value=st[x[0]];$('lab-v-'+x[0]).textContent=x[5](+st[x[0]])}));TOG.forEach(t=>$('lab-'+t[0]).checked=!!st[t[0]]);$('lab-seed').value=String(seed);
    $('lab-pre').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.p===cur))}
  function load(p){cur=p;st=fromCfg(RE.P[p]);sync();run()}
  $('lab-pre').addEventListener('click',e=>{const b=e.target.closest('button');if(b)load(b.dataset.p)});
  G.forEach(g=>g[1].forEach(x=>$('lab-'+x[0]).addEventListener('input',e=>{st[x[0]]=+e.target.value;cur=null;sync();sched()})));
  TOG.forEach(t=>$('lab-'+t[0]).addEventListener('change',e=>{st[t[0]]=e.target.checked?1:0;cur=null;sync();run()}));
  $('lab-seed').addEventListener('change',e=>{seed=+e.target.value;run()});
  let tm=0;function sched(){clearTimeout(tm);tm=setTimeout(run,120)}
  let R=null;
  const pct=v=>(v*100).toFixed(1)+'%';
  function run(){R=RE.sim(toCfg());stats();draw()}
  function stats(){const T=R.tot,c=R.c;
    $('lab-out').innerHTML=RD.stat('Users answered',pct(T.success),T.deg?pct(T.deg/T.req)+' by fallback':'all full answers')+RD.stat('Failed',T.fail,'of '+T.req+' requests')+
      RD.stat('Recovery',T.recovery===null?'never':T.recovery+' s','after the slowdown ends')+RD.stat('Dependency calls per request needing it',T.attPerA.toFixed(2),T.brkRej?T.brkRej+' rejected by the breaker':'')+
      RD.stat('Useful dependency work',pct(T.useful),T.waste+' calls finished after the caller gave up')+RD.stat('Latency of answers',T.p50===null?'n/a':'p50 '+T.p50+' ms',T.p99===null?'':'p99 '+T.p99+' ms')+(T.shed?RD.stat('Shed',T.shed,'rejected at once by a queue limit'):'');
    const k=cur&&cur.indexOf('m_')===0?cur.slice(2):null;let v='';
    if(k&&window.MEAS){const rs=['1','2','3'].map(s=>MEAS.runs[k][s]);const m=rs.reduce((a,r)=>a+r.success,0)/3;
      v='<b>Against the real runs:</b> measured success '+pct(m)+' (3 seeds; recovery '+rs.map(r=>r.recovery_s===null?'never':r.recovery_s+' s').join(', ')+'), model '+pct(T.success)+' for seed '+seed+'. The dotted line in the first chart is the measured answers per second (mean of 3 seeds).'}
    else if(cur==='before'||cur==='after')v='The Reading animates this preset second by second (section Graceful degradation).';
    else v='Your own setting: compare with a preset to see what each change did.';
    $('lab-vs').innerHTML=v;
    $('lab-pre-note').textContent=cur?'Preset: '+PRE.find(p=>p[0]===cur)[1]+'.':'Custom setting.'}
  function axes(W,top,h,mx,x0,x1,NS,X){let b='<line x1="'+x0+'" x2="'+x1+'" y1="'+(top+h)+'" y2="'+(top+h)+'" stroke="var(--line)"/>'+RD.t(x0-4,top+8,String(Math.round(mx)),{fs:9.5,a:'end'})+RD.t(x0-4,top+h,'0',{fs:9.5,a:'end'});
    for(let k=0;k<NS;k+=5)b+=RD.t(X(k)+2,top+h+13,String(k),{fs:9.5,fill:'var(--mute)'});return b}
  function band(c,top,h,X){return '<rect x="'+X(c.slowFrom/1000)+'" y="'+top+'" width="'+(X(c.slowTo/1000)-X(c.slowFrom/1000))+'" height="'+h+'" fill="var(--bad)" opacity=".09"/>'}
  function draw(){if(!R||root.hidden)return;const S=R.S,c=R.c,NS=Math.floor(c.T/1000)+3;
    const W=Math.max(300,Math.min(860,RD.width($('lab-c1'))));const x0=38,x1=W-6,bw=(x1-x0)/NS,X=k=>x0+k*bw,h=150,top=8;
    // chart 1
    let mx=Math.max(10,...S.arr.slice(0,NS).map((a,k)=>Math.max(a,S.good[k]+S.deg[k]+S.fail[k])));let b=band(c,top,h,X)+axes(W,top,h,mx,x0,x1,NS,X);const Y=v=>top+h*(1-v/mx);
    for(let k=0;k<NS;k++){let y=Y(0);[[S.good[k],'var(--good)'],[S.deg[k],'var(--c5)'],[S.fail[k],'var(--bad)']].forEach(p=>{const hh=h*p[0]/mx;if(hh>0){y-=hh;b+='<rect x="'+(X(k)+1)+'" y="'+y+'" width="'+Math.max(1.5,bw-2)+'" height="'+hh+'" fill="'+p[1]+'"/>'}})}
    let pa='';for(let k=0;k<NS;k++)pa+=(k?'L':'M')+(X(k)+bw/2).toFixed(1)+' '+Y(S.arr[k]).toFixed(1);b+='<path d="'+pa+'" fill="none" stroke="var(--ink)" stroke-width="1"/>';
    const k0=cur&&cur.indexOf('m_')===0?cur.slice(2):null;
    if(k0&&window.MEAS){let pm='';for(let k=0;k<Math.min(NS,41);k++){const v=(MEAS.runs[k0]['1'].series.ok[k]+MEAS.runs[k0]['2'].series.ok[k]+MEAS.runs[k0]['3'].series.ok[k])/3;pm+=(k?'L':'M')+(X(k)+bw/2).toFixed(1)+' '+Y(v).toFixed(1)}
      b+='<path d="'+pm+'" fill="none" stroke="var(--c6)" stroke-width="2" stroke-dasharray="3 2"/>'}
    $('lab-c1').innerHTML=RD.svg(W,top+h+18,b,'Answers per second: full, fallback, failed, and arrivals');
    $('lab-l1').innerHTML='<span style="--sw:var(--good)">full answer</span><span style="--sw:var(--c5)">fallback answer</span><span style="--sw:var(--bad)">failed or too late</span><span style="--sw:var(--ink)">new requests (line)</span>'+(k0?'<span style="--sw:var(--c6)">measured answers (dotted)</span>':'');
    // chart 2
    const capOf=k=>{const L=(k*1000>=c.slowFrom&&k*1000<c.slowTo)?c.Ls:c.Ld;return c.Kd*1000/L};
    mx=Math.max(10,...S.att.slice(0,NS),...Array.from({length:NS},(_,k)=>Math.min(capOf(k),Math.max(...S.att)*1.5+10)));
    b=band(c,top,h,X)+axes(W,top,h,mx,x0,x1,NS,X);const Y2=v=>top+h*(1-Math.min(v,mx)/mx);
    for(let k=0;k<NS;k++){if(S.att[k])b+='<rect x="'+(X(k)+1)+'" y="'+Y2(S.att[k])+'" width="'+Math.max(1.5,bw-2)+'" height="'+(Y2(0)-Y2(S.att[k]))+'" fill="var(--c4)" opacity=".85"/>';
      if(S.waste[k])b+='<rect x="'+(X(k)+1)+'" y="'+Y2(S.waste[k])+'" width="'+Math.max(1.5,bw-2)+'" height="'+(Y2(0)-Y2(S.waste[k]))+'" fill="var(--bad)" opacity=".55"/>'}
    let pc='';for(let k=0;k<NS;k++){const y=Y2(capOf(k)).toFixed(1);pc+=(k?'L':'M')+X(k).toFixed(1)+' '+y+'L'+X(k+1).toFixed(1)+' '+y}
    b+='<path d="'+pc+'" fill="none" stroke="var(--ink)" stroke-dasharray="4 3"/>';
    $('lab-c2').innerHTML=RD.svg(W,top+h+18,b,'Dependency calls per second against capacity');
    $('lab-l2').innerHTML='<span style="--sw:var(--c4)">calls sent</span><span style="--sw:var(--bad)">calls finished after the caller gave up (wasted)</span><span style="--sw:var(--ink)">dependency capacity (dashed; clipped at the top if far above)</span>';
    // chart 3
    mx=Math.max(5,...S.q.slice(0,NS),...S.dq.slice(0,NS));b=band(c,top,h,X)+axes(W,top,h,mx,x0,x1,NS,X);const Y3=v=>top+h*(1-v/mx);
    for(let k=0;k<NS;k++)if(S.open[k])b+='<rect x="'+X(k)+'" y="'+top+'" width="'+(bw*S.open[k]/1000)+'" height="6" fill="var(--c5)"/>';
    [['q','var(--c1)'],['dq','var(--c2)']].forEach(p=>{let d='';for(let k=0;k<NS;k++)d+=(k?'L':'M')+(X(k)+bw/2).toFixed(1)+' '+Y3(S[p[0]][k]).toFixed(1);b+='<path d="'+d+'" fill="none" stroke="'+p[1]+'" stroke-width="2"/>'});
    $('lab-c3').innerHTML=RD.svg(W,top+h+18,b,'Queue lengths per second, ours and the dependency, with breaker-open time');
    $('lab-l3').innerHTML='<span style="--sw:var(--c1)">our queue</span><span style="--sw:var(--c2)">dependency queue</span><span style="--sw:var(--c5)">breaker open (top strip)</span><span style="--sw:var(--bad)">slowdown (shaded)</span>';
  }
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-lab']=[draw];
  addEventListener('resize',()=>{if(!root.hidden){clearTimeout(tm);tm=setTimeout(draw,80)}});
  load(cur);
})();
