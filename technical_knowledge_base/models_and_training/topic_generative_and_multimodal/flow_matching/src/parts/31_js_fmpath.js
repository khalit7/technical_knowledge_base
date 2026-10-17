// ---- 2-D flow playground (t-fmpath): two panels on the same noise; exact fields, trained networks, students ----
(function(){
  const X=window.FMX,Fd=window.FMF,$=X.$;if(!$('t-fmpath'))return;
  const MODELS={
    ex_lin:{nm:'Exact field, straight path',m:{kind:'exact',path:'linear'}},
    ex_cos:{nm:'Exact field, cosine VP path',m:{kind:'exact',path:'cos'}},
    ex_vp:{nm:'Exact field, DDPM-style VP path',m:{kind:'exact',path:'vp'}},
    rf1:{nm:'Network 1-RF (random pairs, root)',m:{kind:'net',key:'rf1'}},
    rf2:{nm:'Network 2-RF (one reflow, root)',m:{kind:'net',key:'rf2'}},
    rf3:{nm:'Network 3-RF (here)',m:{kind:'net',key:'rf3'}},
    rf4:{nm:'Network 4-RF (here)',m:{kind:'net',key:'rf4'}},
    d1:{nm:'One-step student of 1-RF',m:{kind:'student',key:'d1'}},
    d2:{nm:'One-step student of 2-RF',m:{kind:'student',key:'d2'}},
    d3:{nm:'One-step student of 3-RF',m:{kind:'student',key:'d3'}}};
  const PRE={reflow:['rf1','rf2',1,'euler',0],exact:['ex_lin','rf1',2,'euler',0],path:['ex_lin','ex_vp',4,'euler',0],grid:['ex_cos','ex_vp',4,'euler',0],sde:['ex_lin','ex_lin',16,'euler',1],dist:['rf2','d2',1,'euler',0],rounds:['rf2','rf4',64,'euler',0]};
  const CAP={reflow:'Same noise, one Euler step: the random-pair flow sends everything to the centre; after one reflow round most points land on a blob.',
    exact:'The exact field (no learning error) against the trained network at 2 steps: most of the miss is the field\'s own.',
    path:'Both exact. The DDPM-style schedule spends its 4 evenly spaced steps mostly near pure noise.',
    grid:'Both exact, and their curves are identical (same straightness); only the timing differs. Compare the trails at 64 steps.',
    sde:'Panel B adds noise (set to 1) with the same marginals: individual paths wander, the cloud still ends on the ring. Try 4 steps.',
    dist:'The 2-RF teacher at 1 Euler step against its one-step student: one network call each.',
    rounds:'Fine solves: each extra round fits the previous round\'s map, and some points drift off the blobs.'};
  const sa=$('fmp-ma'),sb=$('fmp-mb');
  [sa,sb].forEach(s=>{s.innerHTML=Object.keys(MODELS).map(k=>'<option value="'+k+'">'+MODELS[k].nm+'</option>').join('')});
  let seed=11,Z=Fd.noise(300,seed),epsB=null,res={a:null,b:null},A=null,AO=null;const st={n:4,s:'euler',e:0,pre:'reflow'};
  function css(v){return getComputedStyle(document.documentElement).getPropertyValue(v).trim()||'#888'}
  const DATA=Fd.sampleData(300,5);
  function run(key,eps){const M=MODELS[key];let m=Object.assign({},M.m);if(m.kind==='exact')m.eps=eps;
    const solver=(st.s==='ddim'&&m.kind!=='exact')?'euler':st.s;
    const paths=Fd.solve(m,Z,m.kind==='student'?1:st.n,solver,seed+3);
    const nfe=m.kind==='student'?1:st.n*(solver==='midpoint'&&!(m.kind==='exact'&&eps>0)?2:1);
    let on=0,stra=0;paths.forEach(p=>{const e=p[p.length-1];if(Fd.modeOf(e[0],e[1])>=0)on++;let L=0;for(let i=1;i<p.length;i++)L+=Math.hypot(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1]);stra+=L>0?Math.hypot(e[0]-p[0][0],e[1]-p[0][1])/L:1});
    return {paths,on:on/paths.length,str:stra/paths.length,nfe,solver:(m.kind==='exact'&&eps>0)?'Euler-Maruyama':(m.kind==='student'?'one call':solver),key}}
  function compute(){const eA=0,eBv=epsB!=null?epsB:st.e;res.a=run(sa.value,st.e);res.b=run(sb.value,eBv);const n=Math.max(res.a.paths[0].length,res.b.paths[0].length);if(A){AO.ms=n>20?90:n>6?260:600;A.reset(n)}stats()}
  function stats(){[['a','fmp-oa'],['b','fmp-ob']].forEach(([k,id])=>{const r=res[k];$(id).innerHTML=X.stat('on a blob',(100*r.on).toFixed(0)+'%','of 300 particles')+X.stat('straightness',r.str.toFixed(3),r.solver+', NFE '+r.nfe)})}
  function draw(i){[['a','fmp-ca'],['b','fmp-cb']].forEach(([k,id])=>{const r=res[k];if(!r)return;const cv=$(id),W=cv.clientWidth||400,H=W;if(cv.width!==W*2){cv.width=W*2;cv.height=H*2}
    const ctx=cv.getContext('2d');ctx.setTransform(2,0,0,2,0,0);ctx.clearRect(0,0,W,H);const sc=W/9.4,c=W/2,tx=x=>c+x*sc,ty=y=>c-y*sc;
    ctx.fillStyle=css('--line');DATA.forEach(p=>{ctx.beginPath();ctx.arc(tx(p[0]),ty(p[1]),1.6,0,7);ctx.fill()});
    const n=r.paths[0].length,j=Math.min(i,n-1),cols=Fd.MODE_COL.map(v=>v.startsWith('var')?css(v.slice(4,-1)):v),grey=css('--mute');
    r.paths.forEach(p=>{const e=p[n-1];const md=Fd.modeOf(e[0],e[1]);const col=md>=0?cols[md]:grey;
      if($('fmp-tr').checked&&j>0){ctx.strokeStyle=col;ctx.globalAlpha=.35;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(tx(p[0][0]),ty(p[0][1]));for(let q=1;q<=j;q++)ctx.lineTo(tx(p[q][0]),ty(p[q][1]));ctx.stroke();ctx.globalAlpha=1}
      ctx.fillStyle=col;ctx.beginPath();ctx.arc(tx(p[j][0]),ty(p[j][1]),2.2,0,7);ctx.fill()});
    ctx.font='11px ui-sans-serif,-apple-system,sans-serif';ctx.fillStyle=css('--mute');ctx.fillText((j===0?'noise, t = 0':'after step '+j+' of '+(n-1)),8,14)})}
  function setSeg(id,v){$(id).querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.m===String(v)))}
  function preset(p){const q=PRE[p];sa.value=q[0];sb.value=q[1];st.n=q[2];st.s=q[3];st.e=0;epsB=p==='sde'?1:null;setSeg('fmp-n',st.n);setSeg('fmp-s',st.s);setSeg('fmp-e',0);
    $('fmp-pre').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.p===p));$('fmp-cap').textContent=CAP[p]||'';compute()}
  X.seg($('fmp-n'),m=>{st.n=+m;compute()});X.seg($('fmp-s'),m=>{st.s=m;compute()});X.seg($('fmp-e'),m=>{st.e=+m;epsB=null;compute()});
  [sa,sb].forEach(s=>s.addEventListener('change',()=>{epsB=null;$('fmp-cap').textContent='';$('fmp-pre').querySelectorAll('button').forEach(b=>b.classList.remove('on'));compute()}));
  $('fmp-tr').addEventListener('change',()=>A.redraw());
  $('fmp-new').addEventListener('click',()=>{seed+=1;Z=Fd.noise(300,seed);compute()});
  $('fmp-pre').addEventListener('click',e=>{const b=e.target.closest('button');if(b)preset(b.dataset.p)});
  AO={card:'fmp-card',ctl:'fmp-ctl',n:5,ms:600,hold:1600,draw:i=>draw(i),label:'Step'};A=X.anim(AO);
  preset('reflow');
  X.onRender('t-fmpath',()=>A.redraw());
})();
