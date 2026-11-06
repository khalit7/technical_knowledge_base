// ---- Scene: Fig. 4, from rollouts to a fine-tuning dataset (renderer v2). Data: HT.runs (each rollout's hidden and visible result and its
// final code, r.d). Filters as in the former funnel: A visible tests, B hidden verifier, then one per distinct final code per task, or at most 3 per task. ----
(function(){
  if(!document.getElementById('stg-ds')||!window.HT)return;const {at,mix,lerp}=S3,HT=window.HT,$=id=>document.getElementById(id);
  const S={m:'local'},HO={local:['bash','tools','plain'],haiku:['bash','tools','plain','ccfull']};
  function model(m){const hs=HO[m],rs=HT.runs.filter(r=>r.m===m&&r.stop!=='infra_error'),reps=[...new Set(rs.map(r=>r.r))].sort(),nr=reps.length;
    const hid=rs.filter(r=>r.bin),seen={},dist=new Set(),per={},cap=new Set();
    hid.forEach(r=>{const k=r.t+'|'+r.d;if(!seen[k]){seen[k]=1;dist.add(r)}per[r.t]=(per[r.t]||0)+1;if(per[r.t]<=3)cap.add(r)});
    const keep=[r=>true,r=>!!r.vis,r=>!!r.bin,r=>dist.has(r),r=>cap.has(r)];
    const pos=r=>{const c=hs.indexOf(r.h)*nr+reps.indexOf(r.r),g=hs.indexOf(r.h);return [-4.9+c*.48+g*.22,(+r.t.slice(1)-5.5)*-.48]};
    return {rs,keep,pos,n:keep.map(f=>rs.filter(f).length)}}
  const M={local:model('local'),haiku:model('haiku')};
  const DX=3.0,SL=1.7/120;
  function draw(R,k,e){const P=R.P,fa=Math.min(1,e*1.6),D=M[S.m],nar=R.W<520;R.grid(-5.6,4.4,-3,3,.5);
    D.rs.forEach(r=>{const [x,z]=D.pos(r),now=D.keep[k](r),was=k===0||D.keep[k===4?2:k-1](r),
      t=now?1:was?1-e:0,hgt=(r.bin?.42:r.vis?.28:.12)*(.25+.75*t),fill=r.bin?P.good:r.vis?P.c5:mix(P.paper,P.mute,.4);
      R.box([x,0,z],[.34,hgt,.34],{fill,a:.14+.86*t,shadow:false,lw:.6})});
    for(let i=0;i<10;i++)R.label([-5.15,.05,(i+1-5.5)*-.48],'T'+String(i+1).padStart(2,'0'),{fs:12,mono:true,al:'right',dx:-2,c:P.mute,grp:'t'});
    HO[S.m].forEach((h,g)=>{const nr=S.m==='local'?4:3,x=-4.9+(g*nr+(nr-1)/2)*.48+g*.22;R.label([x,0,2.6],HT.harness[h],{fs:12,c:P.mute,dy:14,wide:1})});
    // the dataset: one slab per kept trajectory, filled as the step plays
    const n=D.n[k],n0=k===0?0:D.n[k===4?2:k-1],nn=Math.round(lerp(n0,n,k===0?0:e));
    R.box([DX,0,0],[1.1,Math.max(.01,nn*SL),1.1],{fill:mix(P.paper,P.c3,.4),a:k===0?.25:1});R.box([DX,0,0],[1.1,120*SL,1.1],{fa:0,a:.18,shadow:false});
    if(k>0)R.flowArc([-.3,.5,0],[DX,nn*SL+.05,0],.9,{c:P.c3,a:fa,r:.065+.04*n/120,speed:1.2,n:Math.max(4,Math.round(n/3.5))});
    R.label([DX,120*SL,0],k===0?'dataset':'dataset · '+n,{fs:13.5,b:1,mono:true,dy:-12,c:P.c3});
    R.label([DX,0,.6],['all '+D.rs.length+' recorded','A: visible tests','B: hidden verifier','B, one per distinct fix','B, at most 3 per task'][k],{fs:12.5,mono:true,dy:18,c:P.ink,a:k===0?1:fa});
  }
  const st=S3.stage({id:'stg-ds',list:'sx-ds',fig:'Fig. 4 · 120 rollouts per model through four filters',cam:[.25,.82],bounds:[[-5.6,0,-2.6],[3.8,1.8,2.7]],aspect:.66,dur:1400,hold:4800,draw,
    margin:w=>w<520?[14,8,14,8]:[16,14,14,14]});
  // the model chips: a mode toggle, so the stage restarts from step 1 and replays
  RD.seg($('tj-fm'),v=>{S.m=v;if(st)st.list('sx-ds')});
})();
