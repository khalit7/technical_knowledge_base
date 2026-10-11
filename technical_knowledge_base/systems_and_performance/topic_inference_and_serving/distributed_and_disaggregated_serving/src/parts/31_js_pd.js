// ---- Disaggregation lab (t-pd): every number from window.DDP (src/pd/pd_sim.py -> out/pd_grid.json, compacted by gen_data.py) ----
(function(){
  const P=window.DDP;if(!P||!document.getElementById('pd-plot'))return;
  const $=id=>document.getElementById(id);
  const NA=P.ttfts.length,NT=P.tpots.length;
  // row layout per rate: [att(ttft i, tpot j) at i*NT+j ..., ttft p50, ttft p90, tpot p50, tpot p90, output tokens/s]
  const att=(row,i,j)=>row[i*NT+j];
  const keys=w=>Object.keys(P.workloads[w].res);
  const layName=k=>k==='co'?'8 colocated':k.split(':')[0].replace('P',' prefill + ').replace('D',' decode');
  function goodput(w,k,i,j){const W=P.workloads[w],rs=W.res[k];let g=0;for(let r=0;r<rs.length;r++){if(att(rs[r],i,j)>=0.9)g=W.rates[r];else break}return g}
  const fmt=(x,d)=>(+x).toLocaleString('en-GB',{maximumFractionDigits:d==null?2:d});
  const wsel=$('pd-w');Object.keys(P.workloads).forEach(w=>wsel.insertAdjacentHTML('beforeend','<option value="'+w+'">'+RD.esc(P.workloads[w].name)+'</option>'));
  P.ttfts.forEach((a,i)=>$('pd-a').insertAdjacentHTML('beforeend','<option value="'+i+'"'+(a===2?' selected':'')+'>'+a+' s</option>'));
  P.tpots.forEach((t,j)=>$('pd-t').insertAdjacentHTML('beforeend','<option value="'+j+'"'+(t===0.05?' selected':'')+'>'+Math.round(t*1000)+' ms (mean per request)</option>'));
  for(let x=1;x<P.gpus;x++)$('pd-l').insertAdjacentHTML('beforeend','<option value="'+x+'">'+x+' prefill + '+(P.gpus-x)+' decode</option>');
  $('pd-l').insertAdjacentHTML('afterbegin','<option value="best" selected>best split for these targets</option>');
  $('pd-pool').textContent=fmt(P.wbytes/1e9,1)+' GB of weights and '+fmt(P.nblocks,0)+' blocks of 16 tokens (about '+fmt(P.nblocks*16/1000,0)+'k tokens) of cache per GPU';
  $('pd-n').textContent=fmt(P.n,0);
  function state(){const w=wsel.value,i=+$('pd-a').value,j=+$('pd-t').value,x=$('pd-x').value;
    const splits=[];for(let p=1;p<P.gpus;p++)splits.push(p+'P'+(P.gpus-p)+'D:'+x);
    let best=splits[0];splits.forEach(k=>{if(goodput(w,k,i,j)>goodput(w,best,i,j))best=k});
    const sel=$('pd-l').value==='best'?best:$('pd-l').value+'P'+(P.gpus-+$('pd-l').value)+'D:'+x;
    return {w,i,j,x,splits,best,sel}}
  function plot(){
    const s=state(),W0=P.workloads[s.w],el=$('pd-plot');
    const Wd=Math.max(300,Math.min(860,RD.width(el))),H=Wd<480?230:270,L=40,R=10,T=10,B=34;
    const n=W0.rates.length,xm=W0.rates[n-1],x=v=>L+(Wd-L-R)*v/xm,y=v=>T+(H-T-B)*(1-v);
    let b='';
    for(let v=0;v<=1.0001;v+=0.25)b+='<line x1="'+L+'" x2="'+(Wd-R)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/>'+RD.t(L-4,y(v)+4,Math.round(v*100)+'%',{a:'end',fs:10,fill:'var(--mute)'});
    b+='<line x1="'+L+'" x2="'+(Wd-R)+'" y1="'+y(0.9)+'" y2="'+y(0.9)+'" stroke="var(--good)" stroke-dasharray="4 3"/>'+RD.t(Wd-R,y(0.9)-4,'90% target',{a:'end',fs:10,fill:'var(--good)'});
    const st=xm>40?8:xm>10?2:0.5;for(let v=0;v<=xm+1e-9;v+=st)b+=RD.t(x(v),H-B+14,fmt(v,1),{a:'middle',fs:10,fill:'var(--mute)'});
    b+=RD.t((L+Wd-R)/2,H-4,'requests per second, all 8 GPUs',{a:'middle',fs:10.5,fill:'var(--mute)'});
    const line=(k,col,wd,dash)=>{const pts=W0.res[k].map((r,q)=>x(W0.rates[q])+','+y(att(r,s.i,s.j))).join(' ');return '<polyline fill="none" stroke="'+col+'" stroke-width="'+wd+'"'+(dash?' stroke-dasharray="'+dash+'"':'')+' points="'+pts+'"/>'};
    s.splits.forEach(k=>{if(k!==s.sel)b+=line(k,'var(--dim)',1.2)});
    b+=line('co','var(--c1)',2.6);b+=line(s.sel,'var(--c2)',2.6);
    [['co','var(--c1)'],[s.sel,'var(--c2)']].forEach(([k,c])=>{const g=goodput(s.w,k,s.i,s.j);if(g>0)b+='<circle cx="'+x(g)+'" cy="'+y(0.9)+'" r="4.5" fill="'+c+'"/>'});
    el.innerHTML=RD.svg(Wd,H,b,'Share of requests meeting both targets against request rate');
    $('pd-leg').innerHTML='<span style="--sw:var(--c1)">8 colocated engines</span><span style="--sw:var(--c2)">'+layName(s.sel)+(s.sel===s.best?' (best split)':'')+'</span><span style="--sw:var(--dim)">other splits</span><span style="--sw:var(--good)">dots: goodput</span>';
    const gc=goodput(s.w,'co',s.i,s.j),gs=goodput(s.w,s.sel,s.i,s.j),top=W0.rates[W0.rates.length-1],ge=g=>g>=top?'at least ':'';
    $('pd-res').innerHTML=RD.stat('Colocated goodput',ge(gc)+fmt(gc,1)+' req/s',fmt(gc/P.gpus,2)+' per GPU')+RD.stat(layName(s.sel)+' goodput',ge(gs)+fmt(gs,1)+' req/s',fmt(gs/P.gpus,2)+' per GPU')+
      RD.stat('Split against colocated',gc>0?(gs>=gc?'+':'')+Math.round(100*(gs/gc-1))+'%':(gs>0?'only the split passes':'neither passes'),'at the tried rates');
    let say;if(gc===0&&gs===0)say='Neither layout meets these targets at any rate tried: with one GPU per engine the prompt alone takes longer than the time-to-first-token target (an 8,000-token prefill is about 1.8 s on one H200 in this model). Tensor parallelism inside the prefill engines is the fix, not disaggregation.';
    else if(gs>gc)say='The split wins: decode engines never pause for a prompt, so time per output token stays low at batch sizes the colocated engines cannot reach without breaking the target.';
    else if(gs<gc)say='Colocated wins: every GPU shares the prefill work, and with this target the stalls chunked prefill puts into decoding are affordable. The split strands capacity in whichever pool is not the bottleneck.';
    else say='A tie at the tried rates.';
    $('pd-say').textContent=say;
    bars(s);table(s);
    let f='<tr><th>Workload</th><th class="num">8 colocated</th><th class="num">Best split</th><th>Which</th></tr>';
    Object.keys(P.workloads).forEach(w=>{const W1=P.workloads[w],tp=W1.rates[W1.rates.length-1],c=goodput(w,'co',s.i,s.j);let b=0,kb='';
      for(let p=1;p<P.gpus;p++){const k=p+'P'+(P.gpus-p)+'D:'+s.x,g=goodput(w,k,s.i,s.j);if(g>b){b=g;kb=k}}
      const gg=v=>(v>=tp?'\u2265 ':'')+fmt(v,1);
      f+='<tr><td>'+RD.esc(W1.name)+'</td><td class="num">'+gg(c)+'</td><td class="num">'+gg(b)+'</td><td>'+(b>0?layName(kb):'none passes')+'</td></tr>'});
    $('pd-find').innerHTML=f;
  }
  function bars(s){
    const rs=P.workloads[s.w].rates,top=rs[rs.length-1],all=['co'].concat(s.splits),g=all.map(k=>goodput(s.w,k,s.i,s.j)),mx=Math.max(1e-9,...g);
    $('pd-bars').innerHTML=all.map((k,q)=>'<div class="row'+(k===s.sel||k==='co'?' hl':'')+'"><div class="nm">'+layName(k)+'</div><div class="track"><div class="fill" style="width:'+(100*g[q]/mx)+'%;background:'+(k==='co'?'var(--c1)':k===s.best?'var(--c2)':'var(--dim)')+'"></div></div><div class="val">'+(g[q]>=top?'\u2265':'')+fmt(g[q]/P.gpus,2)+'/GPU</div></div>').join('');
  }
  function table(s){
    const W0=P.workloads[s.w],rr=$('pd-r');rr.max=W0.rates.length-1;if(+rr.value>+rr.max)rr.value=rr.max;const ri=+rr.value;$('pd-rv').textContent=fmt(W0.rates[ri],1)+' req/s';
    const all=['co'].concat(s.splits);
    let h='<tr><th>Layout</th><th class="num">Met both</th><th class="num">TTFT p50</th><th class="num">TTFT p90</th><th class="num">TPOT p50</th><th class="num">TPOT p90</th><th class="num">Output tok/s</th></tr>';
    all.forEach(k=>{const r=W0.res[k][ri],o=NA*NT;const ms=v=>v>=10?fmt(v,0)+' s':v>=1?fmt(v,1)+' s':fmt(v*1000,0)+' ms';
      h+='<tr'+(k===s.sel||k==='co'?' class="on"':'')+'><td>'+layName(k)+'</td><td class="num">'+Math.round(att(r,s.i,s.j)*100)+'%</td><td class="num">'+ms(r[o])+'</td><td class="num">'+ms(r[o+1])+'</td><td class="num">'+fmt(r[o+2]*1000,1)+' ms</td><td class="num">'+fmt(r[o+3]*1000,1)+' ms</td><td class="num">'+fmt(r[o+4],0)+'</td></tr>'});
    $('pd-tbl').innerHTML=h;
  }
  ['pd-w','pd-a','pd-t','pd-x','pd-l'].forEach(id=>$(id).addEventListener('change',plot));
  $('pd-r').addEventListener('input',()=>table(state()));
  // predict then reveal: chat, TTFT 2 s, TPOT 50 ms, 400 Gb/s
  $('pd-pr').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    const i=P.ttfts.indexOf(2);
    const at=j=>{const gc=goodput('chat','co',i,j);let gb=0,kb='';for(let p=1;p<P.gpus;p++){const k=p+'P'+(P.gpus-p)+'D:nic400',g=goodput('chat',k,i,j);if(g>gb){gb=g;kb=k}}return {gc,gb,kb}};
    const m=at(P.tpots.indexOf(0.05)),t=at(P.tpots.indexOf(0.025)),l=at(P.tpots.indexOf(0.075));
    const right=Math.abs(m.gb-m.gc)<0.1*Math.max(m.gb,m.gc)?'eq':m.gb>m.gc?'pd':'co';
    $('pd-pr').querySelectorAll('.opts button').forEach(x=>{x.classList.remove('right','wrong');if(x.dataset.a===right)x.classList.add('right');else if(x===b)x.classList.add('wrong')});
    const a=$('pd-pr').querySelector('.ans');a.hidden=false;
    a.innerHTML='Colocated: '+fmt(m.gc,1)+' requests/s; best split ('+layName(m.kb)+'): '+fmt(m.gb,1)+' requests/s, '+Math.round(100*(m.gb/m.gc-1))+'% more. The margin is small because at 50 ms colocated engines can still batch deeply. Tighten the target to 25 ms and the split serves '+fmt(t.gb/t.gc,1)+' times as much ('+fmt(t.gb,1)+' against '+fmt(t.gc,1)+'); loosen it to 75 ms and colocated wins ('+fmt(l.gc,1)+' against '+fmt(l.gb,1)+'). Disaggregation is a latency tool first.'});
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-pd']=[plot];
  addEventListener('resize',()=>{const t=$('t-pd');if(t&&!t.hidden)plot()});
})();
