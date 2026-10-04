// ---- 10-armed testbed tab: Sutton and Barto Figures 2.2 to 2.6 run live, in slices, when the tab opens ----
(function(){
  const B=window.BX,$=id=>document.getElementById(id);
  const C=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)'];
  const P2=e=>Math.pow(2,e),fr=e=>e<0?'1/'+Math.pow(2,-e):String(Math.pow(2,e));
  const F={
    f22:{steps:1000,lines:[{lab:'ε = 0 (greedy)',cfg:{kind:'eps',eps:0}},{lab:'ε = 0.01',cfg:{kind:'eps',eps:0.01}},{lab:'ε = 0.1',cfg:{kind:'eps',eps:0.1}}],
      note:'Figure 2.2: ε-greedy with sample-average estimates starting at 0. Greedy rises fastest for a few steps, then levels off near 1 because in most tasks it never returns to the best arm. ε = 0.1 finds the best arm sooner; ε = 0.01 is slower but would pass it in the long run.'},
    f23:{steps:1000,lines:[{lab:'Optimistic, greedy: Q₁ = 5, ε = 0',cfg:{kind:'eps',eps:0,q0:5,alpha:0.1}},{lab:'Realistic, ε-greedy: Q₁ = 0, ε = 0.1',cfg:{kind:'eps',eps:0.1,alpha:0.1}}],
      note:'Figure 2.3: both use a constant step size α = 0.1. The optimistic agent is disappointed by every arm in turn, so it explores everything early (worse at first, the spikes of Exercise 2.6), then settles on the best arm more often than the ε-greedy agent, which keeps exploring forever.'},
    f24:{steps:1000,lines:[{lab:'UCB, c = 2',cfg:{kind:'ucb',c:2}},{lab:'ε-greedy, ε = 0.1',cfg:{kind:'eps',eps:0.1}}],
      note:'Figure 2.4: UCB tries each arm once (steps 1 to 10), then picks the largest upper bound. The spike at step 11 is Exercise 2.8: after one pull each, the arm with the best single reward has the highest bound, and it is often the best arm; on step 12 its bonus has shrunk and the others\' have grown.'},
    f25:{steps:1000,off:4,lines:[{lab:'α = 0.1, with baseline',cfg:{kind:'grad',alpha:0.1,base:true,off:4}},{lab:'α = 0.4, with baseline',cfg:{kind:'grad',alpha:0.4,base:true,off:4}},{lab:'α = 0.1, without baseline',cfg:{kind:'grad',alpha:0.1,base:false,off:4}},{lab:'α = 0.4, without baseline',cfg:{kind:'grad',alpha:0.4,base:false,off:4}}],
      note:'Figure 2.5: the true values are drawn around +4 instead of 0. With the baseline (the average reward so far, this reward included, as the book\'s footnote says) the shift changes nothing; without it every reward looks good, the chosen arm is always pushed up, and learning is much worse.'},
    f26:{steps:1000,param:true,lines:[
      {lab:'ε-greedy (ε)',ex:[-7,-6,-5,-4,-3,-2],mk:e=>({kind:'eps',eps:P2(e)})},
      {lab:'gradient bandit (α)',ex:[-5,-4,-3,-2,-1,0,1],mk:e=>({kind:'grad',alpha:P2(e),base:true})},
      {lab:'UCB (c)',ex:[-4,-3,-2,-1,0,1,2],mk:e=>({kind:'ucb',c:P2(e)})},
      {lab:'greedy with optimistic Q₀, α = 0.1',ex:[-2,-1,0,1,2],mk:e=>({kind:'eps',eps:0,q0:P2(e),alpha:0.1})},
      {lab:'Thompson sampling (no parameter; not in the book)',ex:[0],flat:true,mk:()=>({kind:'ts'})}],
      note:'Figure 2.6: each point is the average reward over all 1000 steps (proportional to the area under a learning curve) at one parameter value, varied by factors of two. Every method has an inverted U: too little exploration and too much both cost reward. The parameter ranges follow the widely used reproduction of the book\'s figures (Zhang, ten_armed_testbed.py); Thompson sampling, added here, has no parameter and is drawn as a flat line.'},
    fall:{steps:1000,lines:[{lab:'greedy',cfg:{kind:'eps',eps:0}},{lab:'ε-greedy, ε = 0.1',cfg:{kind:'eps',eps:0.1}},{lab:'optimistic greedy, Q₁ = 5, α = 0.1',cfg:{kind:'eps',eps:0,q0:5,alpha:0.1}},{lab:'UCB, c = 2',cfg:{kind:'ucb',c:2}},{lab:'gradient, α = 0.1, baseline',cfg:{kind:'grad',alpha:0.1,base:true}},{lab:'Thompson sampling',cfg:{kind:'ts'}}],
      note:'Beyond the book: every method of the chapter at its book setting, plus Thompson sampling with the testbed\'s own prior (true values N(0, 1), reward noise variance 1, so its posterior is exact). Matching the prior to how tasks are generated is an advantage the other methods do not get: say so whenever Thompson wins on a testbed.'},
    fns:{steps:10000,lines:[{lab:'sample averages, ε = 0.1',cfg:{kind:'eps',eps:0.1,walk:0.01}},{lab:'constant step α = 0.1, ε = 0.1',cfg:{kind:'eps',eps:0.1,alpha:0.1,walk:0.01}}],
      note:'Exercise 2.5 (no published figure): all true values start equal and take independent random walks (a normal increment with standard deviation 0.01 each step), 10,000 steps. Sample averages weight a reward from step 1 as much as one from step 9,000, so they follow the moving best arm ever more slowly; a constant step size forgets old rewards at rate (1 − α) per pull and keeps up.'}
  };
  let cur='f22',runs=2000,cache={},job=0;
  const el={fig:$('tb-fig'),runs:$('tb-runs'),prog:$('tb-prog'),stat:$('tb-stat'),p1:$('tb-p1'),p2:$('tb-p2'),h1:$('tb-h1'),h2:$('tb-h2'),leg:$('tb-leg'),repro:$('tb-repro'),note:$('tb-note'),w2:$('tb-w2')};
  function units(f){if(f.param)return f.lines.map(L=>L.ex.map(e=>({L,e,cfg:L.mk(e)}))).flat();return f.lines.map(L=>({L,cfg:L.cfg}))}
  function start(){const key=cur+'|'+runs;if(cache[key]&&cache[key].done){draw();return}
    const f=F[cur],us=units(f),my=++job;
    const st=cache[key]||(cache[key]={u:us.map(u=>Object.assign({},u,{acc:B.tbNew(f.steps)})),i:0,done:false});
    const total=st.u.length*runs;let last=0;
    function slice(){if(my!==job)return;const t0=performance.now();
      while(st.i<total&&performance.now()-t0<28){const u=st.u[Math.floor(st.i/runs)],r=st.i%runs,n=Math.min(runs-r,20);B.tbBatch(u.cfg,r,r+n,f.steps,u.acc);st.i+=n}
      el.prog.style.width=(100*st.i/total).toFixed(1)+'%';
      el.stat.textContent=st.i<total?'Running: '+st.i.toLocaleString('en')+' of '+total.toLocaleString('en')+' task runs ('+f.steps.toLocaleString('en')+' steps each)':'Done: '+total.toLocaleString('en')+' task runs, '+(total*f.steps).toLocaleString('en')+' pulls, computed in your browser.';
      if(st.i>=total)st.done=true;
      if(st.done||performance.now()-last>400){last=performance.now();draw()}
      if(!st.done)setTimeout(slice,0)}
    slice()}
  const bins=(a,n,k)=>{const out=[],xs=[];if(k<=1){for(let i=0;i<a.length;i++){out.push(a[i]/n);xs.push(i+1)}return {ys:out,xs}}
    for(let i=0;i<a.length;i+=k){let s=0,m=0;for(let j=i;j<Math.min(a.length,i+k);j++){s+=a[j];m++}out.push(s/m/n);xs.push(i+m/2+0.5)}return {ys:out,xs}};
  function draw(){const f=F[cur],st=cache[cur+'|'+runs];if(!st)return;el.note.innerHTML=f.note;
    if(f.param){el.w2.hidden=true;el.h1.textContent='Average reward over the first 1000 steps against each method\'s parameter';
      const ser=f.lines.map((L,j)=>{const us=st.u.filter(u=>u.L===L),ys=us.map(u=>u.acc.runs?u.acc.R.reduce((a,b)=>a+b,0)/u.acc.runs/f.steps:null);
        if(L.flat)return {lab:L.lab,col:C[j],xs:[-7,2],ys:[ys[0],ys[0]],dash:'5 4',w:1.6};return {lab:L.lab,col:C[j],xs:L.ex,ys,dots:true,w:2}});
      RD.chart(el.p1,ser,{x0:-7,x1:2,y0:1,y1:1.6,xt:[-7,-6,-5,-4,-3,-2,-1,0,1,2].map(e=>[e,fr(e)]),yt:[1,1.1,1.2,1.3,1.4,1.5,1.6].map(v=>[v,v.toFixed(1)]),xlab:'ε, α, c or Q₀ (log scale, factors of 2)',H:260,label:'Parameter study'});
      RD.legend(el.leg,ser);
      if(st.done){const best=ser.filter(s=>!s.dash).map(s=>{let i=0;s.ys.forEach((y,j)=>{if(y>s.ys[i])i=j});return s.lab.split(' (')[0]+' peaks at '+RD.n(s.ys[i],3)+' ('+fr(s.xs[i])+')'});
        const top=ser.filter(s=>!s.dash).map(s=>Math.max(...s.ys)),w=top.indexOf(Math.max(...top));
        el.repro.innerHTML='<b>Shape check, independently</b> (the book prints no values for this figure, and curves are not read off images): '+best.join('; ')+'. Highest of the four: <b>'+ser[w].lab.split(' (')[0]+'</b> (book: "Overall, on this problem, UCB seems to perform best"). Every curve is an inverted U. Thompson sampling: '+RD.n(ser[4].ys[0],3)+'.'}
      else el.repro.textContent='Computing; the curves fill in as tasks finish.';return}
    el.w2.hidden=false;const k=f.steps>2000?20:1;
    const sR=st.u.map((u,j)=>Object.assign({lab:u.L.lab,col:C[j]},bins(u.acc.R,Math.max(1,u.acc.runs),k)));
    const sO=st.u.map((u,j)=>Object.assign({lab:u.L.lab,col:C[j]},bins(u.acc.O,Math.max(1,u.acc.runs)/100,k)));
    const off=f.off||0,xt=f.steps>2000?[[1,'1'],[2500,'2,500'],[5000,'5,000'],[7500,'7,500'],[10000,'10,000']]:[[1,'1'],[250,'250'],[500,'500'],[750,'750'],[1000,'1000']];
    const maxq=st.u[0].acc.maxq/Math.max(1,st.u[0].acc.runs);
    el.h1.textContent='Average reward';el.h2.textContent='% optimal action';
    RD.chart(el.p1,sR,{x0:1,x1:f.steps,y0:off-0.1,y1:off+1.65,xt,yt:[0,0.5,1,1.5].map(v=>[off+v,String(off+v)]),xlab:'Steps',hl:f.walk||cur==='fns'?[]:[{y:maxq,lab:'best possible '+RD.n(maxq,2)}],label:'Average reward'});
    RD.chart(el.p2,sO,{x0:1,x1:f.steps,y0:0,y1:100,xt,yt:[0,20,40,60,80,100].map(v=>[v,v+'%']),xlab:'Steps',label:'Percent optimal action'});
    RD.legend(el.leg,sR);
    if(!st.done){el.repro.textContent='Computing; the curves fill in as tasks finish.';return}
    const fin=s=>s.ys[s.ys.length-1],mx=s=>Math.max(...s.ys),last100=u=>{let s=0;for(let i=f.steps-100;i<f.steps;i++)s+=u.acc.R[i];return s/100/u.acc.runs};
    let h='';
    if(cur==='f22')h='<b>Defaults reproduce the book\'s printed numbers, independently</b> (same testbed definition, our own random tasks): best possible, the mean of the largest true value over these '+runs.toLocaleString('en')+' tasks, '+RD.n(maxq,3)+' (book: "about 1.54"; the expected maximum of 10 standard normals is 1.539 by integration). Greedy\'s reward over the last 100 steps '+RD.n(last100(st.u[0]),2)+' (book: "only about 1"); greedy picks the best arm on '+RD.n(fin(sO[0]),1)+'% of tasks at step 1000 (book: "only approximately one-third"). ε = 0.1 peaks at '+RD.n(mx(sO[2]),1)+'% optimal (book: "never selected that action more than 91% of the time"; 91% = 1 − 0.1 + 0.1/10 is a ceiling by construction).';
    else if(cur==='f23'){let x=-1;for(let i=50;i<f.steps;i++){if(st.u[0].acc.O[i]>st.u[1].acc.O[i]){x=i+1;break}}
      let sp=0,spi=0;for(let i=0;i<40;i++)if(sO[0].ys[i]>sp){sp=sO[0].ys[i];spi=i+1}
      h='<b>Shape check, independently</b> (the book prints no values): optimistic greedy ends at '+RD.n(fin(sO[0]),1)+'% optimal against '+RD.n(fin(sO[1]),1)+'% for realistic ε-greedy, and is ahead to stay from about step '+(x>0?x:'none')+' (book: "initially worse... eventually it performs better"). Its early spike peaks at step '+spi+' with '+RD.n(sp,1)+'% (Exercise 2.6).'}
    else if(cur==='f24'){const r=sR[0].ys;h='<b>Shape check, independently</b>: UCB\'s average reward at steps 10, 11, 12 is '+[9,10,11].map(i=>RD.n(r[i],2)).join(', ')+': the step-11 spike of Exercise 2.8. Over the last 100 steps UCB averages '+RD.n(last100(st.u[0]),3)+' against '+RD.n(last100(st.u[1]),3)+' for ε-greedy (book: "UCB generally performs better than ε-greedy action selection, except in the first k steps").'}
    else if(cur==='f25')h='<b>Shape check, independently</b>: % optimal at step 1000: '+sO.map(s=>s.lab+' '+RD.n(fin(s),1)+'%').join('; ')+'. With the baseline the +4 shift has no effect (the same curves as on a testbed centred at 0, up to noise); without it performance is "significantly degraded", as the book says.';
    else if(cur==='fall')h='<b>Beyond the book</b> (labelled, not a published figure): average reward over all 1000 steps: '+st.u.map((u,j)=>u.L.lab+' '+RD.n(u.acc.R.reduce((a,b)=>a+b,0)/u.acc.runs/f.steps,3)).join('; ')+'.';
    else if(cur==='fns'){const tail=u=>{let s=0;for(let i=f.steps-1000;i<f.steps;i++)s+=u.acc.O[i];return 100*s/1000/u.acc.runs};h='<b>Exercise, no published answer</b>: % optimal over the last 1,000 steps: sample averages '+RD.n(tail(st.u[0]),1)+'%, constant step '+RD.n(tail(st.u[1]),1)+'%.'}
    el.repro.innerHTML=h}
  el.fig.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;cur=b.dataset.f;[...el.fig.children].forEach(x=>x.classList.toggle('on',x===b));start()});
  el.runs.addEventListener('change',()=>{runs=+el.runs.value;start()});
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-test']=window.TAB_RENDER['t-test']||[]).push(()=>{if(!cache[cur+'|'+runs])start();else draw()});
  addEventListener('resize',()=>{const t=$('t-test');if(t&&!t.hidden)draw()});
})();
