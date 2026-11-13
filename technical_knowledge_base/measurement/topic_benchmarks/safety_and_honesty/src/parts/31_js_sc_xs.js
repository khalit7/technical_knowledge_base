// ---- Scene: Fig. 1 (stg-xs, renderer v2): XSTest as two fields of cubes, one per prompt, lit by a model's real labelled answers ----
// Left field: the 250 safe prompts; right field: the 200 unsafe contrasts; rows are the eight prompt families of window.XSU.FAM.
// A flat green cube is the right call, a half-height yellow one a partial refusal, a tall orange one the wrong call (refused a safe prompt, answered an unsafe one).
// Every count is computed from window.XS (the authors' human labels, final_label) and published in window.SHN.xs for check_stages.mjs.
(function(){
  if(!document.getElementById('stg-xs')||!window.S3||!window.XSU)return;
  const {mix,lerp,cl}=S3,U=window.XSU,X=U.X;
  const PT=.22,CU=.17,GAP=.16,XS0=-3.1,XU0=3.1,HI={none:.035,ok:.035,part:.2,bad:.42};
  let model='llama2orig',D=null;
  // geometry: family f takes one row on the unsafe side and one or two rows (25 or 50 prompts) on the safe side
  const fams=U.FAM.map(f=>({n:f.n,s:[].concat(...f.s.map(t=>U.byType[t])),u:[].concat(...f.u.map(t=>U.byType[t]))}));
  let z=0;fams.forEach(f=>{f.rows=Math.ceil(f.s.length/25);f.z0=z;z+=f.rows*PT+GAP});const DEP=z-GAP-PT+CU,Z0=-DEP/2;
  fams.forEach(f=>{f.z0+=Z0;f.zc=f.z0+(f.rows-1)*PT/2});
  const cells=[];fams.forEach((f,fi)=>{f.s.forEach((i,j)=>cells.push({i,fi,side:'s',x:XS0+((j%25)-12)*PT,z:f.z0+Math.floor(j/25)*PT}));
    f.u.forEach((i,j)=>cells.push({i,fi,side:'u',x:XU0+(j-12)*PT,z:f.zc}))});
  const rank={s:0,u:0};cells.forEach(c=>{c.r=rank[c.side]++});
  function data(){if(D&&D.m===model)return D;const m=model,all=X.P.map((p,i)=>i),k=U.counts(m,all);
    const per=fams.map(f=>({s:U.counts(m,f.s),u:U.counts(m,f.u)}));
    const sideBad=(k.sf+k.sp)/k.sn>=(k.uf+k.up)/k.un?'s':'u';
    let wf=0,wv=-1;per.forEach((c,fi)=>{const v=sideBad==='s'?(c.s.sf+c.s.sp)/c.s.sn:(c.u.uf+c.u.up)/c.u.un;if(v>wv+1e-9){wv=v;wf=fi}});
    const wc=per[wf][sideBad];
    D={m,k,per,cell:cells.map(c=>U.out(m,c.i)),worst:{side:sideBad,f:wf,name:fams[wf].n,full:sideBad==='s'?wc.sf:wc.uf,part:sideBad==='s'?wc.sp:wc.up,n:sideBad==='s'?wc.sn:wc.un},
      rs:(k.sf+k.sp)/k.sn,ru:(k.uf+k.up)/k.un};
    (window.SHN=window.SHN||{}).xs=window.SHN.xs||{};SHN.xs[m]={sf:k.sf,sp:k.sp,sn:k.sn,uf:k.uf,up:k.up,un:k.un,rs:+(D.rs*100).toFixed(1),ru:+(D.ru*100).toFixed(1),worst:D.worst};
    return D}
  const pc=v=>(Math.round(v*1000)/10).toFixed(1)+'%';
  function draw(R,k,e){const P=R.P,d=data(),COL={none:mix(P.paper,P.line,.5),ok:mix(P.paper,P.good,.7),part:mix(P.paper,P.c5,.85),bad:mix(P.paper,P.bad,.85)};
    R.grid(-7,7,-3.4,3.4,.5);
    const ZB=Z0-.95,HB=2.3;
    cells.forEach((c,ci)=>{const lit=c.side==='s'?(k>=2||(k===1)):(k>=3||k===2);
      let t=0;if(lit){const now=(c.side==='s'&&k===1)||(c.side==='u'&&k===2);t=now?cl((e-c.r/(c.side==='s'?250:200)*.8)/.2,0,1):1}
      const o=d.cell[ci],h=lerp(HI.none,HI[o],t),fill=mix(COL.none,COL[o],t);
      let a=1;if(k===2&&c.side==='s')a=.35;else if(k===3&&!(c.fi===d.worst.f&&c.side===d.worst.side))a=.18;else if(k===0)a=.8;
      R.box([c.x,0,c.z],[CU,h,CU],{fill,a,shadow:false,lw:.5,ea:.4})});
    // row labels: the eight families (in the close-up of step 4 the highlighted row is named on the figure instead)
    if(k!==3)fams.forEach(f=>R.label([XS0-12.5*PT-.12,0,f.zc],f.n,{al:'right',dx:-10,fs:12,c:P.mute,grp:'rows'}));
    // field titles and counts, in front of each field
    const zf=Z0+DEP+.25,ks=d.k;
    R.label([XS0,0,zf],R.W<520?'250 safe':'250 safe prompts · should be answered',{fs:12.5,b:1,dy:12,a:k===3?(d.worst.side==='s'?1:0):k===2?.45:1});
    R.label([XU0,0,zf],R.W<520?'200 unsafe':'200 unsafe contrasts · should be refused',{fs:12.5,b:1,dy:12,a:k===3?(d.worst.side==='u'?1:0):k===1?.45:1});
    if(k>=1&&k!==3)R.label([XS0,0,zf],'refused '+ks.sf+' + '+ks.sp+' partial of 250',{fs:12,dy:30,c:P.bad,a:k===1?e:k===2?.5:1,wide:1});
    if(k>=2&&k!==3)R.label([XU0,0,zf],'answered '+ks.uf+' + '+ks.up+' partial of 200',{fs:12,dy:30,c:P.bad,a:k===2?e:1,wide:1});
    if(k===3){const w=d.worst,f=fams[w.f],x0=w.side==='s'?XS0:XU0;R.label([x0,HI.bad,f.zc],w.name+': '+(w.side==='s'?'refused ':'answered ')+w.full+' + '+w.part+' partial of '+w.n,{fs:12.5,b:1,dy:-22,c:P.bad,a:e})}
    // two bars behind the fields: the two numbers, fed by each field's failures
    if(k===4){[[XS0,d.rs,'safe prompts refused','s'],[XU0,d.ru,'unsafe prompts answered','u']].forEach(([x0,v,t,sd])=>{const h=Math.max(.02,v*HB*e);
        R.box([x0,0,ZB],[1.1,h,.55],{fill:mix(P.paper,P.bad,.75)});R.label([x0,h,ZB],pc(v),{mono:true,fs:13.5,b:1,dy:-12,c:P.bad});R.label([x0,h,ZB],t,{fs:12,dy:-30,c:P.mute,wide:1});
        const n=sd==='s'?ks.sf+ks.sp:ks.uf+ks.up;if(n>0)R.flowArc([x0,.3,Z0+DEP/2],[x0,Math.max(.1,h*.6),ZB],.6,{c:P.bad,a:.85,r:.055,n:Math.max(2,Math.round(2+n/12)),speed:1.2})})}
  }
  const full={cam:[0,1.22],bounds:[[-6.4,0,Z0-1.3],[6.4,.8,Z0+DEP+.55]]};
  const stg=S3.stage({id:'stg-xs',list:'sx-xs-'+model,fig:'Fig. 1 · XSTest, 450 prompts, human labels',cam:full.cam,bounds:full.bounds,aspect:.42,dur:1600,hold:4800,draw,
    margin:w=>w<520?[16,8,14,8]:[18,14,16,140],
    view:k=>{if(k!==3)return full;const d=data(),f=fams[d.worst.f],x0=d.worst.side==='s'?XS0:XU0,w=12.5*PT+.4;
      return {cam:[d.worst.side==='s'?.22:-.22,.75],bounds:[[x0-w,0,f.z0-.6],[x0+w,.9,f.z0+(f.rows-1)*PT+.6]]}}});
  data();
  document.querySelectorAll('#xa-mode button').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('#xa-mode button').forEach(x=>x.classList.toggle('on',x===b));model=b.dataset.m;data();
    ['llama2orig','mistralinstruct','gpt4'].forEach(m=>{document.getElementById('sx-xs-'+m).hidden=m!==model});stg.list('sx-xs-'+model)}));
  ['llama2orig','mistralinstruct','gpt4'].forEach(m=>{const s=model;model=m;data();model=s});D=null;data();
  window.SHN.xsStage=stg;
})();
