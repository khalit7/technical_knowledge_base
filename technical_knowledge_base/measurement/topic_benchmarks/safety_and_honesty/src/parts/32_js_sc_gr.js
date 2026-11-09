// ---- Scene: Fig. 2 (stg-gr, renderer v2): one model's 450 XSTest answers read by three graders (the repository's string-match rule, its GPT-4 classifier, people) ----
// The block at the back is the answers, one cube each (front ten rows: the 250 safe prompts; back eight rows: the 200 unsafe ones). A cube stands up where the
// active grader calls the answer a refusal (half height for a partial refusal). Each grader is a flat glass plate carrying two bars: the share of safe and of
// unsafe answers it calls refusals (full or partial, as window.GR.rates counts them). Steps 5 and 6 raise only the answers a grader calls differently from people.
// Every number is computed from window.XS (released label files) and published in window.SHN.gr for check_stages.mjs.
(function(){
  if(!document.getElementById('stg-gr')||!window.S3||!window.XSU||!window.GR)return;
  const {mix,lerp,cl}=S3,U=window.XSU,X=U.X,G=window.GR;
  const PT=.15,CU=.115,GX=[-2.8,0,2.8],GZ=1.25,ZU0=-3.05,ZS0=ZU0+8*PT+.22;
  const GR3=[['s','string match','c2'],['g','GPT-4 classifier','c4'],['h','people','ink']];
  let model='llama2orig',D=null;
  // cube positions: safe prompts (index order) in ten rows of 25 at the front, unsafe in eight rows behind
  const cells=[];let ns=0,nu=0;for(let i=0;i<450;i++){const u=U.unsafe(i),j=u?nu++:ns++;cells.push({i,u,x:((j%25)-12)*PT,z:u?ZU0+Math.floor(j/25)*PT:ZS0+Math.floor(j/25)*PT})}
  const isRef=c=>c==='2'||c==='3';
  function data(){if(D&&D.m===model)return D;const m=model,L=X.L[m];
    const rates=GR3.map(g=>G.rates(m,g[0]));
    const cnt=GR3.map(g=>{let s=0,u=0,p=0,z=0;for(let i=0;i<450;i++){const c=L[g[0]][i];if(c==='3')p++;if(c==='0')z++;if(isRef(c)){if(U.unsafe(i))u++;else s++}}return {s,u,p,z}});
    const dis=['s','g'].map(g=>{let n=0,s=0,u=0;const f=[];for(let i=0;i<450;i++){const a=L.h[i]!=='1',b=isRef(L[g][i]);f.push(a!==b);if(a!==b){n++;U.unsafe(i)?u++:s++}}return {n,s,u,f}});
    D={m,L,rates,cnt,dis};
    (window.SHN=window.SHN||{}).gr=window.SHN.gr||{};SHN.gr[m]={cnt,rates:rates.map(r=>[+(r.s*100).toFixed(1),+(r.u*100).toFixed(1)]),dis:dis.map(x=>({n:x.n,s:x.s,u:x.u}))};
    return D}
  const pc=v=>(Math.round(v*1000)/10).toFixed(1)+'%';
  function draw(R,k,e){const P=R.P,d=data(),gc=g=>P[g[2]];R.grid(-6,6,-3.6,2.6,.5);
    const act=k>=1&&k<=3?k-1:k===4?0:k===5?1:-1; // the grader whose calls the cubes show
    const base=mix(P.paper,P.line,.45);
    // the answers
    cells.forEach(c=>{let h=.03,fill=base,a=1;
      if(k>=1&&k<=3){const g=GR3[act],cc=d.L[g[0]][c.i];const tgt=cc==='2'?.2:cc==='3'?.11:.03,col=cc==='2'||cc==='3'?mix(P.paper,gc(g),cc==='3'?.5:.8):base;
        const pg=k>=2?GR3[act-1]:null,pc0=pg?d.L[pg[0]][c.i]:'1',from=pg?(pc0==='2'?.2:pc0==='3'?.11:.03):.03,fcol=pg&&isRef(pc0)?mix(P.paper,gc(pg),pc0==='3'?.5:.8):base;
        h=lerp(from,tgt,e);fill=mix(fcol,col,e)}
      else if(k>=4){const x=d.dis[k-4],on=x.f[c.i],g=GR3[k-4];h=on?lerp(.03,.26,e):.03;fill=on?mix(P.paper,gc(g),.85):base;a=on?1:.45}
      R.box([c.x,0,c.z],[CU,h,CU],{fill,a,shadow:false,lw:.45,ea:.35})});
    R.label([-12.5*PT-.1,0,ZS0+4.5*PT],'250 answers, safe prompts',{al:'right',dx:-4,fs:12,c:P.mute,grp:'side'});
    R.label([-12.5*PT-.1,0,ZU0+3.5*PT],'200 answers, unsafe prompts',{al:'right',dx:-4,fs:12,c:P.mute,grp:'side'});
    // the three graders: a flat glass plate each, carrying its two bars (safe and unsafe answers called refusals)
    GR3.forEach((g,gi)=>{const x0=GX[gi],c=gc(g),on=k===0||gi===act||(k>=1&&k<=3&&gi<act)||(k>=4&&(gi===2||gi===k-4)),a=on?1:.28;
      R.glass([x0-.85,.01,GZ-.45],[1.7,0,0],[0,0,.9],{c,a:a*(gi===act||k===0?1:.6),nu:4,nv:2,th:.04});
      R.label([x0,0,GZ+.45],g[1],{fs:13,b:1,c,a,dy:R.W<520?14:30});
      if(k>=1&&k<=3&&gi===act)R.flowArc([0,.25,ZS0+10*PT-.1],[x0,.15,GZ-.3],.7,{c,a:.85,r:.06,n:9,speed:1.3});
      const shown=k>=1&&k<=3?gi<=act:k>=4;if(!shown)return;
      const r=d.rates[gi],grow=k>=1&&k<=3&&gi===act?e:1,ba=k>=4&&!(gi===2||gi===k-4)?.3:1;
      const nar=R.W<520,va=nar&&!(gi===act||(k>=4&&gi===2))?0:1;[['safe',r.s,nar?-.55:-.4],['unsafe',r.u,nar?.55:.4]].forEach(([t,v,dx])=>{const h=Math.max(.02,v*1.1*grow);
        R.box([x0+dx,.04,GZ],[.5,h,.42],{fill:mix(P.paper,c,t==='safe'?.55:.85),a:ba,shadow:false});
        R.label([x0+dx,h+.04,GZ],pc(v*grow),{mono:true,fs:12.5,b:1,dy:-10,c,a:ba*va});if(!nar)R.label([x0+dx,0,GZ+.45],t,{fs:12,dy:13,c:P.mute,a:ba})})});
    if(k>=4){const x=d.dis[k-4];R.label([0,.3,ZU0-.1],x.n+' of 450 called differently from people',{fs:12.5,b:1,dy:-22,c:gc(GR3[k-4]),a:e})}
  }
  const full={cam:[0,.95],bounds:[[-4.2,0,-3.3],[4.2,1.1,1.75]]};
  const stg=S3.stage({id:'stg-gr',list:'sx-gr-'+model,fig:'Fig. 2 · XSTest answers, three graders',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1500,hold:4800,draw,
    margin:w=>w<520?[16,8,24,8]:[18,14,26,150],
    view:k=>k>=4?{cam:[0,1.05],bounds:[[-4.2,0,-3.3],[4.2,.8,1.75]]}:full});
  data();
  document.querySelectorAll('#gr-mode button').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('#gr-mode button').forEach(x=>x.classList.toggle('on',x===b));model=b.dataset.m;data();
    ['llama2orig','mistralinstruct'].forEach(m=>{document.getElementById('sx-gr-'+m).hidden=m!==model});stg.list('sx-gr-'+model)}));
  ['llama2orig','mistralinstruct'].forEach(m=>{const s=model;model=m;data();model=s});D=null;data();
  window.SHN.grStage=stg;
})();
