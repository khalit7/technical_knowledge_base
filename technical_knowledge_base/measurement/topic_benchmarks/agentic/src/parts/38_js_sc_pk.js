// ---- Scene: Fig. 3 (stg-pk, renderer v2): pass^k against pass@k on real released tau2-bench trials. Each task is a tower of its 4 trials (cubes green
// for reward 1, orange for 0) in file order; step 2 moves every tower onto the platform of its success count; steps 3 to 6 set k = 1..4, fading each
// tower to its contribution (C(c,k)/C(4,k) for pass^k, 1 - C(4-c,k)/C(4,k) for pass@k, from PK) while each platform's share streams into the total.
// Every value is computed from window.AG (mk_data.py, the trajectory files); the run picker offers only the runs that reproduce the board exactly. ----
(function(){
  if(!document.getElementById('stg-pk')||!window.S3||!window.AG||!window.PK)return;
  const {mix,lerp,lerp3,cl}=S3,win=(e,a,b)=>cl((e-a)/(b-a),0,1);
  const sets=PK.ok(),sel=document.getElementById('an2-set'),out=document.getElementById('pk-out');
  sets.forEach((s,i)=>{const o=document.createElement('option');o.value=i;o.textContent=s.domn+': '+PK.label(s)+' ('+s.date+')';sel.appendChild(o)});
  let si=Math.max(0,sets.findIndex(s=>s.m==='GPT-5.2'&&s.dom==='retail'&&s.eff==='high'));sel.value=si;
  let kind='hat',D=null;
  const XP=c=>(c-2)*1.95,COLS=8,PIT=.2,CU=.15,CH=.1;
  function data(){if(D&&D.si===si)return D;const s=sets[si],T=PK.tasks(s),h=PK.hist(s),nT=T.length,rows=Math.ceil(Math.max(...h)/COLS);
    const seen=[0,0,0,0,0],raw=Math.ceil(nT/6);
    const tw=T.map((t,j)=>{const c=PK.cnt(t),i=seen[c]++,x=XP(c)-(COLS-1)*PIT/2+(i%COLS)*PIT,z=-(rows-1)*PIT/2+Math.floor(i/COLS)*PIT;
      const rx=-((raw-1)*.42)/2+(j%raw)*.42,rz=-.95+Math.floor(j/raw)*.38;return {t,c,p:[x,0,z],r:[rx,0,rz]}});
    D={si,s,T,h,nT,rows,tw,depth:rows*PIT};
    window.AGN=window.AGN||{};AGN.pk={label:PK.label(s),dom:s.dom,hist:h,nT,hat:[1,2,3,4].map(k=>+PK.metric(s,k,'hat').toFixed(2)),at:[1,2,3,4].map(k=>+PK.metric(s,k,'at').toFixed(2)),pub:s.pub};
    return D}
  function readout(){const d=data(),s=d.s,f=v=>v.toFixed(2);
    out.innerHTML='This run, computed from its '+d.nT*4+' trials: pass^1 to pass^4 '+AGN.pk.hat.map(f).join(' · ')+' (published '+s.pub.map(f).join(' · ')+'); pass@1 to pass@4 '+AGN.pk.at.map(f).join(' · ')+'; tasks on the platforms 0 to 4 of 4: '+d.h.join(', ')+'.'}
  const fk=(c,k)=>kind==='at'?PK.at(c,4,k):PK.hat(c,4,k);
  function draw(R,k,e,st){const P=R.P,d=data(),pk=st&&st.pk!=null?st.pk:k;R.grid(-5,6.4,-1.9,1.9,.5);
    const g=k===1?e:k>1?1:pk>=1&&k===0?1-e:0; // 0: raw grid, 1: grouped
    const K=k>=2?k-1:1,KP=pk>=2?pk-1:1,f=c=>k<2?(k===1?c/4*e+(1-e):1):lerp(pk>=2?fk(c,KP):c/4,fk(c,K),e);
    // the platforms
    const pa=k===0?1-e*0:1,pv=k===0&&pk===0?0:(k===0?1-e:k===1?e:1);
    for(let c=0;c<5;c++){const x=XP(c),w=COLS*PIT+.12,dz=d.depth+.12;
      R.box([x,0,0],[w,.04,dz],{fill:mix(P.paper,P.c1,.12),a:pv,shadow:false});
      if(pv>.3){R.label([x,0,dz/2],c+' of 4',{b:1,fs:12.5,dy:14,a:pv});R.label([x,0,dz/2],d.h[c]+' task'+(d.h[c]===1?'':'s'),{fs:12,dy:30,c:P.mute,a:pv})}}
    // the towers: four trial cubes each
    d.tw.forEach(o=>{const p=lerp3(o.r,o.p,g),a=k<2?1:.18+.82*f(o.c),y0=g*.04;
      for(let q=0;q<4;q++){const ok=o.t[q]==='1';R.box([p[0],y0+q*CH,p[2]],[CU,CH*.92,CU],{fill:ok?mix(P.paper,P.good,.75):mix(P.paper,P.bad,.75),a,shadow:false,lw:.5,ea:.45})}});
    if(k===0)R.label([0,.45,-1.1],d.nT+' tasks × 4 trials, in file order',{fs:12.5,b:1,dy:-12,c:P.mute,a:e});
    // contributions: a bar behind each platform, streaming into the total on the right
    if(k>=2){const XT=5.6,zb=-d.depth/2-.25;let tot=0;
      for(let c=0;c<5;c++){const v=d.h[c]*f(c)/d.nT*100;tot+=v;const hb=v/100*2.2,x=XP(c);
        R.box([x,0,zb],[.5,Math.max(.01,hb),.2],{fill:mix(P.paper,kind==='at'?P.c4:P.c1,.55),shadow:false});
        if(v>.05)R.label([x,hb,zb],'+'+v.toFixed(2),{mono:true,fs:12,b:1,dy:-10,wide:1,c:kind==='at'?P.c4:P.c1});
        if(v>.4)R.flowArc([x,hb+.02,zb],[XT,.25+tot/100*2.2*.5,0],.35+.05*(4-c),{c:kind==='at'?P.c4:P.c1,a:.75,n:Math.max(2,Math.round(2+v/5)),r:.05})}
      const ht=tot/100*2.2;R.box([XT,0,0],[.55,ht,.55],{fill:mix(P.paper,P.acc,.55)});
      R.label([XT,ht,0],(kind==='at'?'pass@':'pass^')+K+' = '+tot.toFixed(2),{mono:true,fs:13,b:1,dy:-12,c:P.acc});
      AGN.pk.drawn=+tot.toFixed(2)}
  }
  const full={cam:[.12,.72],bounds:()=>[[-4.9,0,-data().depth/2-.5],[6.2,1.9,data().depth/2+.45]]};
  const stg=S3.stage({id:'stg-pk',list:'sx-pk-hat',fig:'Fig. 3 · '+'τ²-bench, released trials',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1500,hold:4600,draw,
    margin:w=>w<520?[16,8,40,8]:[24,16,44,16]});
  document.querySelectorAll('#pk-mode button').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('#pk-mode button').forEach(x=>x.classList.toggle('on',x===b));kind=b.dataset.m;
    ['hat','at'].forEach(m=>{document.getElementById('sx-pk-'+m).hidden=m!==kind});stg.list('sx-pk-'+kind)}));
  sel.addEventListener('change',()=>{si=+sel.value;readout();stg.draw()});
  readout();AGN.pkStage=stg;
})();
