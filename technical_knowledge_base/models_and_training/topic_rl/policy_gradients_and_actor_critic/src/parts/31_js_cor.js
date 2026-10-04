// ---- Short corridor tab: Example 13.1 exact, one run of each learner animated on J(p), Figures 13.1 and 13.2 rerun ----
(function(){
  const E=window.PGE,$=id=>document.getElementById(id);if(!$('t-cor'))return;
  const reg=f=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-cor']=window.TAB_RENDER['t-cor']||[]).push(f)};
  const onRes=f=>addEventListener('resize',()=>{const t=$('t-cor');if(t&&!t.hidden)f()});
  const EPS=1000,FLOOR=0.05,MAXT=5000;
  // ---- 1. J(p) with three learners moving on it ----
  (function(){
    const P=$('co-exP'),Tt=$('co-exT'),Xp=$('co-exX'),N=$('co-exN'),S=$('co-exS');let mode='rf',runs;
    const L=[{k:'rf',at:Math.pow(2,-13),aw:0,lab:'REINFORCE',col:'var(--c2)'},{k:'rfb',at:Math.pow(2,-9),aw:Math.pow(2,-6),lab:'with baseline',col:'var(--c1)'},{k:'ac',at:Math.pow(2,-9),aw:Math.pow(2,-6),lab:'actor-critic',col:'var(--c4)'}];
    function compute(){runs=L.map(o=>E.corRun(o.k,o.at,o.aw,EPS,+S.value,FLOOR,MAXT))}
    function avg(a,i0,i1){let s=0;for(let i=i0;i<i1;i++)s+=a[i];return s/(i1-i0)}
    function draw(i){const ep=i*10,W=RD.width(P),H=232,l=40,r=12,t=10,b=38,lo=-100,hi=-5,X=p=>l+(W-l-r)*p,Y=v=>t+(H-t-b)*(hi-Math.max(lo,v))/(hi-lo);
      let s='';[-100,-80,-60,-40,-20].forEach(v=>s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(l-4,Y(v)+4,String(v).replace('-','−'),{a:'end',fs:10,fill:'var(--mute)'}));
      const pts=[];for(let k=1;k<200;k++){const p=k/200;pts.push(X(p).toFixed(1)+','+Y(E.corV(p)[0]).toFixed(1))}
      s+='<polyline fill="none" stroke="var(--ink)" stroke-width="1.8" points="'+pts.join(' ')+'"/>';
      const mk=(p,lab,col,dy)=>'<circle cx="'+X(p)+'" cy="'+Y(E.corV(p)[0])+'" r="4" fill="none" stroke="'+col+'" stroke-width="1.6"/>'+RD.t(X(p)+(p>0.5?-6:6),Y(E.corV(p)[0])+dy,lab,{a:p>0.5?'end':'start',fs:10,fill:col});
      s+=mk(0.05,'ε-greedy left −82.1','var(--mute)',-6)+mk(0.95,'ε-greedy right −44.2','var(--mute)',16)+mk(E.COR.pStar,'optimum p* 0.586, −11.66','var(--good)',-8);
      [0,0.2,0.4,0.6,0.8,1].forEach(v=>s+=RD.t(X(v),H-16,RD.n(v,1),{a:'middle',fs:10,fill:'var(--mute)'}));s+=RD.t((l+W-r)/2,H-2,'probability of right, p',{a:'middle',fs:10,fill:'var(--mute)'});
      const show=mode==='ac'?L:L.slice(0,2);
      show.forEach((o,j)=>{const ru=runs[j],p=ru.ps[ep];s+='<circle cx="'+X(p)+'" cy="'+Y(E.corV(p)[0])+'" r="6.5" fill="'+o.col+'" stroke="var(--bg)" stroke-width="1.5"/>'});
      P.innerHTML=RD.svg(W,H,s,'Value of the start state against the probability of right')+'<div class="leg">'+show.map(o=>'<span><i style="background:'+o.col+'"></i>'+o.lab+'</span>').join('')+'</div>';
      Tt.textContent=ep===0?'Episode 0: all learners start at p(right) = 0.05':'After '+ep+' episodes';
      const f=j=>RD.n(runs[j].ps[ep],3);
      Xp.innerHTML=ep===0?'All start near the ε-greedy-left policy (value −82.1). Every learner sees the same random numbers; press play.':
        'p(right): REINFORCE '+f(0)+', with baseline '+f(1)+(mode==='ac'?', actor-critic '+f(2):'')+' (optimum 0.586). '+(ep>=100&&Math.abs(runs[1].ps[ep]-E.COR.pStar)<0.06?'The baselined learner has found the stochastic optimum; ':'')+'Mean total reward over the last 10 episodes: '+show.map((o,j)=>o.lab+' '+RD.n(avg(runs[j].tot,Math.max(0,ep-10),Math.max(1,ep)),1)).join(', ')+'.';
      N.innerHTML=show.map((o,j)=>RD.stat(o.lab,RD.n(runs[j].ps[ep],3),'p(right); value '+RD.n(E.corV(runs[j].ps[ep])[0],1))).join('')}
    compute();
    const an=RD.anim({card:'co-ex',ctl:'co-exC',n:EPS/10+1,ms:220,draw,label:'Episode'});
    $('co-exM').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;mode=b.dataset.k;[...b.parentNode.children].forEach(x=>x.classList.toggle('on',x===b));an.redraw()});
    S.addEventListener('change',()=>{compute();an.redraw()});reg(()=>an.redraw());onRes(()=>an.redraw());
  })();
  // ---- 2. Figures 13.1 and 13.2: averages over runs, computed in chunks so the page stays responsive ----
  (function(){
    const P=$('co-figP'),K=$('co-figK'),Sx=$('co-figS'),Tb=$('co-figT'),Nr=$('co-figN'),Fl=$('co-figF');
    const C=[{id:'r12',k:'rf',at:-12,aw:0,lab:'REINFORCE α = 2⁻¹²',col:'var(--c6)',on:true},{id:'r13',k:'rf',at:-13,aw:0,lab:'REINFORCE α = 2⁻¹³',col:'var(--c2)',on:true},
      {id:'r14',k:'rf',at:-14,aw:0,lab:'REINFORCE α = 2⁻¹⁴',col:'var(--c3)',on:true},{id:'rb',k:'rfb',at:-9,aw:-6,lab:'with baseline α^θ = 2⁻⁹, α^w = 2⁻⁶',col:'var(--c1)',on:true},
      {id:'ac',k:'ac',at:-9,aw:-6,lab:'actor-critic 2⁻⁹, 2⁻⁶',col:'var(--c4)',on:false},{id:'ac12',k:'ac',at:-12,aw:-6,lab:'actor-critic 2⁻¹², 2⁻⁶',col:'var(--c5)',on:false}];
    const cache={};let job=0;
    K.innerHTML=C.map(c=>'<button data-id="'+c.id+'" class="'+(c.on?'on':'')+'"><i style="display:inline-block;width:10px;height:3px;vertical-align:middle;margin-right:5px;background:'+c.col+'"></i>'+c.lab+'</button>').join('');
    const key=c=>c.id+'|'+Nr.value+'|'+(Fl.checked?1:0);
    function run(){const my=++job,n=+Nr.value,eps=Fl.checked?FLOOR:0;const todo=C.filter(c=>c.on&&!cache[key(c)]);
      if(!todo.length){draw();return}
      const c=todo[0],acc={m:new Float64Array(EPS),mp:new Float64Array(EPS+1),cut:0,done:0};
      (function chunk(){if(my!==job)return;const t0=Date.now();
        while(acc.done<n&&Date.now()-t0<40){const o=E.corRun(c.k,Math.pow(2,c.at),c.aw?Math.pow(2,c.aw):0,EPS,1+acc.done,eps,MAXT);
          for(let e=0;e<EPS;e++)acc.m[e]+=o.tot[e]/n;for(let e=0;e<=EPS;e++)acc.mp[e]+=o.ps[e]/n;acc.cut+=o.cut;acc.done++}
        Sx.textContent='Computing '+c.lab+': run '+acc.done+' of '+n+'...';
        if(acc.done<n){setTimeout(chunk,0)}else{cache[key(c)]=acc;draw();setTimeout(run,0)}})()}
    function draw(){const W=RD.width(P),H=230,l=40,r=12,t=10,b=24,lo=-100,hi=-5,X=e=>l+(W-l-r)*e/EPS,Y=v=>t+(H-t-b)*(hi-Math.min(hi,Math.max(lo,v)))/(hi-lo);
      let s='';[-100,-80,-60,-40,-20].forEach(v=>s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(l-4,Y(v)+4,String(v).replace('-','−'),{a:'end',fs:10,fill:'var(--mute)'}));
      s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(E.COR.vStar)+'" y2="'+Y(E.COR.vStar)+'" stroke="var(--good)" stroke-dasharray="5 3"/>'+RD.t(W-r,Y(E.COR.vStar)-4,'v*(s₀) = −11.66',{a:'end',fs:10,fill:'var(--good)'});
      [1,200,400,600,800,1000].forEach(v=>s+=RD.t(X(v),H-6,String(v),{a:'middle',fs:10,fill:'var(--mute)'}));
      const rows=[];
      C.forEach(c=>{const d=cache[key(c)];if(!c.on||!d)return;const pts=[];for(let e=0;e<EPS;e++)pts.push(X(e+1).toFixed(1)+','+Y(d.m[e]).toFixed(1));
        s+='<polyline fill="none" stroke="'+c.col+'" stroke-width="1.3" points="'+pts.join(' ')+'"/>';
        const av=(a,b2)=>{let q=0;for(let e=a;e<b2;e++)q+=d.m[e];return q/(b2-a)};
        rows.push('<tr><td>'+c.lab+'</td><td class="num">'+RD.n(av(0,10),1)+'</td><td class="num">'+RD.n(av(100,200),1)+'</td><td class="num">'+RD.n(av(400,500),1)+'</td><td class="num">'+RD.n(av(900,1000),1)+'</td><td class="num">'+RD.n(d.mp[EPS],3)+'</td><td class="num">'+d.cut+'</td></tr>')});
      P.innerHTML=RD.svg(W,H,s,'Total reward per episode, averaged over runs');
      Tb.innerHTML='<tr><th>Learner</th><th class="num">Episodes 1 to 10</th><th class="num">100 to 200</th><th class="num">400 to 500</th><th class="num">900 to 1000</th><th class="num">Mean p(right) at the end</th><th class="num">Episodes cut at '+MAXT+' steps</th></tr>'+rows.join('');
      const pend=C.filter(c=>c.on&&!cache[key(c)]).length;Sx.textContent=pend?'':'Seeds 1 to '+Nr.value+' for every curve; 1,000 episodes each; '+(Fl.checked?'probability floor 0.05.':'no floor (episodes cut at '+MAXT+' steps).')}
    K.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const c=C.find(x=>x.id===b.dataset.id);c.on=!c.on;b.classList.toggle('on',c.on);run()});
    Nr.addEventListener('change',run);Fl.addEventListener('change',run);
    let started=false;reg(()=>{if(!started){started=true;run()}else draw()});onRes(draw);
  })();
})();
