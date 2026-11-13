// ---- Place a burst: the tab's 3D stage (Fig. 2), its generated step lists, counters and the four-policy table ----
// Every bar height is placeSim's output (30_js_place.js: the paper's power-of-k placement with per-engine overlay and edge admission, §3.2 and §7,
// and three alternatives) on the inputs the sliders set. Published: about 160 nodes, bursts up to 32K, over 5,000 a second, 3,200 per node.
// Illustrative: k, the number of engines, the refresh interval and the starting load. The burst plays in PB.STEPS = 8 stretches (the long-replay rule).
(function(){
  if(!document.getElementById('stg-pb'))return;const {at,mix}=S3;
  const MODES={pko:'Power of k + overlay (DSec)',pk:'Power of k, no overlay',rnd:'Random',least:'Least loaded'};
  const ids=['B','R','N','K','E','P','L','S'];let seed=1,M='pko',RES={};
  const par=()=>({B:PB.B[+$('pbB').value],R:PB.R[+$('pbR').value],N:PB.N[+$('pbN').value],k:+$('pbK').value,E:+$('pbE').value,
    P:PB.P[+$('pbP').value],L:PB.L[+$('pbL').value],S:PB.S[+$('pbS').value],seed});
  function labels(o){$('pbBv').textContent=fmt(o.B);$('pbRv').textContent=fmt(o.R);$('pbNv').textContent=o.N;$('pbKv').textContent=o.k;$('pbEv').textContent=o.E;
    $('pbPv').textContent=o.P+' s';$('pbLv').textContent=Math.round(o.L*100)+'%';$('pbSv').textContent=Math.round(o.S*100)+'%';$('pbSeedV').textContent='draw '+seed}
  const COLS={40:8,80:10,160:16,320:20},HC=2.4;
  const geo=N=>{const c=COLS[N]||Math.ceil(Math.sqrt(N*1.6)),r=Math.ceil(N/c),sp=Math.min(.62,7.2/c);return {c,r,sp,x0:-(c-1)*sp/2,z0:-(r-1)*sp/2,ze:(r-1)*sp/2+1.15}};
  const span=(L,i0,i1)=>{let mx=-1,mn=1e18,full=0;for(let i=0;i<L.length;i++){mx=Math.max(mx,L[i]);mn=Math.min(mn,L[i]);if(L[i]>=PB.CAP)full++}return {mx,mn,full}};
  // the step list of one policy: before the burst, then the 8 stretches, with the numbers of this run
  function steps(m,o,r){const out=[],dt=r.T/PB.STEPS,per=o.B/PB.STEPS;
    const how={least:'Every engine sends its requests to the node its snapshot says is emptiest, so between refreshes they all land on the same node until its edge refuses them.',
      rnd:'Each request goes to one node drawn at random: no herding, but the starting unevenness and chance fluctuations stay.',
      pk:'Each request samples '+o.k+' node'+(o.k>1?'s':'')+' and takes the least loaded in the snapshot: requests spread out even though the view is stale.',
      pko:'As power of k, but each engine also counts its own placements since the snapshot, so it stops favouring a node it has just filled.'}[m];
    const s0=span(r.frames[0]);
    out.push(['Before the burst','Each of the '+o.N+' nodes already runs about '+fmt(PB.CAP*o.L)+' sandboxes (± '+Math.round(o.S*100)+'%; fullest '+fmt(s0.mx)+', emptiest '+fmt(s0.mn)+'). A burst of '+fmt(o.B)+' requests arrives at '+fmt(o.R)+' a second, so it lasts '+r.T.toFixed(1)+' s; the watcher refreshes the engines\' view every '+o.P+' s.']);
    for(let s=1;s<=PB.STEPS;s++){const q=span(r.frames[s]),rj=r.rejAt[s];
      const nums='Fullest node '+fmt(q.mx)+' of '+fmt(PB.CAP)+', emptiest '+fmt(q.mn)+(q.full?'; '+q.full+' node'+(q.full>1?'s':'')+' at capacity':'')+'; edges have refused '+fmt(rj)+' request'+(rj===1?'':'s')+' so far'+(rj?', each one a retry':'')+'.';
      const t=(s===1?'The first ':'To ')+(s*dt).toFixed(2)+' s'+(s===1?'':', '+fmt(Math.round(per*s))+' requests');
      const tail=s===PB.STEPS?' Burst done: '+fmt(o.B-r.fail)+' placed'+(r.fail?', '+fmt(r.fail)+' not placed':'')+'; spread across nodes (sd) '+r.sd.toFixed(1)+'.':'';
      out.push([t,(s===1?how+' ':'')+nums+tail])}
    return out}
  function fill(){Object.keys(MODES).forEach(m=>{const L=$('sx-pb-'+m),S=steps(m,RES.o,RES[m]);
    while(L.children.length<S.length)L.appendChild(document.createElement('li'));
    S.forEach(([t,c],i)=>{L.children[i].innerHTML='<b>'+t+'.</b> '+c})})} // the items are kept, so the stage's bindings survive a rerun
  function counters(k){const r=RES[M];if(!r)return;const o=RES.o,q=span(r.frames[k]);
    $('pbCnt').innerHTML=stat('Placed so far',fmt(Math.round(o.B*k/PB.STEPS)),'of '+fmt(o.B))+stat('Fullest node',fmt(q.mx),'capacity '+fmt(PB.CAP))+stat('Refusals by edges so far',fmt(r.rejAt[k]),r.rej?'whole burst '+fmt(r.rej):'none needed')+stat('Watcher refreshes',fmt(r.refreshes),'one every '+o.P+' s')}
  function run(){const o=par();labels(o);RES={o};const rows=[];
    for(const m of Object.keys(MODES)){const r=placeSim(Object.assign({mode:m},o));RES[m]=r;
      rows.push('<tr><td>'+MODES[m]+'</td><td class="num">'+fmt(r.max)+'</td><td class="num">'+fmt(r.min)+'</td><td class="num">'+fmt(r.max-r.min)+'</td><td class="num">'+r.sd.toFixed(1)+'</td><td class="num">'+fmt(r.rej)+'</td><td class="num">'+fmt(r.fail)+'</td></tr>')}
    $('pbTab').innerHTML=rows.join('');
    const mu=o.B/o.N;$('pbTheory').innerHTML='Each node gets '+mu.toFixed(1)+' sandboxes from this burst on average. For comparison, if requests were placed independently and uniformly, the added load per node would have a standard deviation of about √(B/N) = '+Math.sqrt(mu).toFixed(1)+' (a binomial count); balanced-allocation theory says sampling two nodes with fresh information keeps the fullest node within about ln ln N / ln 2 = '+(Math.log(Math.log(o.N))/Math.log(2)).toFixed(1)+', plus a constant, above the average. Random placement cannot correct the starting unevenness; the load-aware policies fill the emptier nodes first, which is why their final spread can be smaller than the burst\'s own randomness.';
    fill()}
  window.__pbRun=run;window.DSEC_PB=()=>RES; // read by check_stages.mjs
  run();
  function draw(R,k,e){const P=R.P,r=RES[M],o=RES.o;if(!r)return;const G=geo(o.N),bw=G.sp*.72,y=v=>v/PB.CAP*HC;
    R.grid(G.x0-1.2,-G.x0+1.2,G.z0-.9,G.ze+.5,.5);
    const prev=r.frames[Math.max(0,k-1)],cur=r.frames[k],col=mix(P.paper,{pko:P.c3,pk:P.c1,rnd:P.c4,least:P.c5}[M],.75),red=P.bad;
    const gain=[];
    for(let i=0;i<o.N;i++){const x=G.x0+(i%G.c)*G.sp,z=G.z0+Math.floor(i/G.c)*G.sp,a0=r.init[i],L=k===0?a0:prev[i]+(cur[i]-prev[i])*e,h0=y(a0)*(k===0?Math.max(.05,e):1);
      R.box([x,0,z],[bw,Math.max(.01,h0),bw],{fill:mix(P.paper,P.ink,.12),shadow:false,lw:.5,ea:.5});
      if(L>a0)R.box([x,h0,z],[bw,y(L-a0),bw],{fill:L>=PB.CAP?red:col,shadow:false,lw:.5,ea:.5});
      if(k>0)gain.push([cur[i]-prev[i],i,x,z,y(L)])}
    // the capacity plane, 3,200 sandboxes per node
    const W=(G.c-1)*G.sp+G.sp,D=(G.r-1)*G.sp+G.sp;R.glass([G.x0-G.sp/2,y(PB.CAP),G.z0-G.sp/2],[W,0,0],[0,0,D],{c:P.bad,a:.55,nu:Math.min(G.c,10),nv:Math.min(G.r,8),th:.02});
    R.label([G.x0-G.sp/2+W,y(PB.CAP),G.z0-G.sp/2],'capacity 3,200 a node',{fs:12,c:P.bad,al:'left',dx:6,wide:1});
    // the placement engines at the front, and where this stretch's requests went
    const nE=Math.min(o.E,8),ex=j=>G.x0+W*(j+.5)/nE-G.sp/2;
    for(let j=0;j<nE;j++)R.box([ex(j),0,G.ze],[Math.min(.7,W/nE*.7),.28,.4],{fill:mix(P.paper,P.c2,.3)});
    R.label([0,.28,G.ze],o.E+' placement engine'+(o.E>1?'s':'')+(o.E>nE?' (8 drawn)':''),{fs:12,c:P.c2,dy:22});
    if(k>0){gain.sort((a,b)=>b[0]-a[0]);const g0=gain[0][0]||1;
      gain.slice(0,6).forEach(([g,i,x,z,top],n)=>{if(g<=0)return;R.flowArc([ex(n%nE),.3,G.ze],[x,top+.05,z],.6+.3*Math.abs(z-G.ze)/D,{c:P.c2,a:k===0?0:.95,r:.05+.05*g/g0,n:Math.max(2,Math.round(3+9*g/g0)),speed:1.6})})}
    R.label([G.x0-G.sp/2,0,-G.z0+G.sp/2],o.N+' nodes',{fs:12,c:P.mute,al:'right',dx:-8,wide:1});
  }
  const bounds=()=>{const G=geo(RES.o.N),W=(G.c)*G.sp;return [[-W/2-.3,0,G.z0-G.sp],[W/2+.3,HC+.2,G.ze+.3]]};
  const stg=S3.stage({id:'stg-pb',list:'sx-pb-pko',fig:'Fig. 2 · one burst landing on the fleet',cam:[.5,.62],bounds:()=>bounds(),aspect:.68,dur:1300,hold:3800,draw,
    margin:w=>w<520?[18,8,22,8]:[22,16,26,16],onStep:k=>counters(k)});
  // a slider or a new draw reruns the simulation; it is a reader control, so autoplay stops
  const rerun=()=>{run();if(stg){stg.pause();stg.st.user=true;stg.draw()}counters(stg?stg.st.k:0)};
  ids.forEach(i=>$('pb'+i).addEventListener('input',rerun));
  $('pbSeed').addEventListener('click',()=>{seed++;rerun()});
  const seg=$('pbM');seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{
    seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    M=b.dataset.m;Object.keys(MODES).forEach(m=>$('sx-pb-'+m).hidden=m!==M);stg.list('sx-pb-'+M)}));
})();
