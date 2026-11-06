// ---- Scene, Fig. 1 (top): the real 534 MB Parquet file (D.full: 82 row groups, 7 column chunks each) and the one-day query (renderer v2) ----
// Row groups run left to right (one slice each); column chunks run front to back, their depth to scale from the footer's compressed bytes
// (created_at, chat_id and tokens from each row group's own footer entry, the other columns from row group 0's). The footer sits at the end of the file.
(function(){
  if(!document.getElementById('stg-hero'))return;const {at,off,lerp,mix}=S3;
  const F=D.full,RG=F.rgs,N=RG.length,C0=F.rg0_columns,T0=C0.reduce((s,c)=>s+c.compressed,0);
  const day=r=>!(r.ca1<'2026-03-01 00:00:00'||r.ca0>='2026-03-02 00:00:00'),hit=RG.findIndex(day);
  const DZ=5,SW=.1,X0=-N*SW/2,H=.4,x=g=>X0+(g+.5)*SW,XF=X0+N*SW+.14,RDR=[X0+N*SW+1.15,0,0];
  // bands front to back in file order: created_at (written last) at the front
  let z=-DZ/2;const B={};C0.forEach(c=>{const w=Math.max(.025,c.compressed/T0*DZ);B[c.col]={z0:z,w,zc:z+w/2};z+=w});
  const per={created_at:'cab',chat_id:'cb',tokens:'tb'},need={created_at:1,tokens:1},sliced=['id','chat_id','tokens','content','created_at'];
  const wOf=(col,g)=>per[col]?Math.max(.025,RG[g][per[col]]/T0*DZ):B[col].w;
  function draw(R,k,e){const P=R.P;R.grid(-5,6,-3.2,3.2,.5);
    const rest=k===0?1:k===1?1-.85*e:.15;          // the five columns the query does not name recede from step 2
    const named=k===0?0:k===1?e:1;                  // the two it names light up
    const pick=k<3?0:k===3?e:1;                     // min/max rules out every row group but one
    // the columns the query never names: role and model are thin enough to draw as one long block each
    ['role','model'].forEach(cn=>R.box([0,0,B[cn].zc],[N*SW,H,B[cn].w],{a:rest,shadow:false,lw:.6}));
    sliced.forEach(cn=>{const nm=need[cn];
      for(let g=0;g<N;g++){const w=wOf(cn,g);let a=nm?1:rest,fill=P.paper,lift=0;
        if(nm){fill=mix(P.paper,P.c1,.5*named);if(g===hit){fill=mix(fill,P.c2,pick);lift=.55*pick}else a=1-.82*pick}
        R.box([x(g),lift,B[cn].zc],[SW*.92,H,w],{fill,a,shadow:false,lw:.5,ea:nm&&g===hit&&k>=3?.9:nm&&k>=1?.4:.22})}});
    // the footer at the end of the file (76,648 bytes: drawn far wider than its share so it can be seen)
    const fa=k>=2?1:.85;R.box([XF,0,0],[.12,H,DZ],{fill:k>=2?P.c2:mix(P.paper,P.c2,.35),a:fa,shadow:false});
    if(k>=2)R.glow([XF,H+.05,0],.5,{c:P.c2,a:(k===2?e:1)*.6});
    // the reader (DuckDB) asks for the footer first, then for the chunks the footer points to
    const ra=at(k,e,2);R.box(RDR,[.8,.55,.8],{fill:mix(P.paper,P.c1,.25),a:ra});
    R.label([RDR[0],.95,RDR[2]],'DuckDB',{b:1,fs:13,a:ra,c:P.c1});
    if(k===2||k===3)R.flowArc([XF,H+.02,.6],[RDR[0]-.2,.45,0],.55,{c:P.c2,a:k===2?e:.6,r:.06,n:7,speed:1.2});
    if(k===4){[['created_at',.06,12],['tokens',.05,7]].forEach(([cn,r,n])=>R.flowArc([x(hit),.55+H,B[cn].zc],[RDR[0]-.3,.5,0],1.1,{c:P.c2,a:e,r,n,speed:1.4}))}
    // labels: column names on the left, upright; the file's ends; the chosen row group
    C0.forEach(c=>{const nm=need[c.col];R.label([X0-.12,H/2,B[c.col].zc],c.col,{al:'right',dx:-4,mono:true,fs:12,grp:'cols',c:nm&&k>=1?P.c1:P.ink,a:nm||k===0?1:Math.max(.45,rest)})});
    R.label([x(0),0,DZ/2+.15],'row group 0',{mono:true,fs:12,dy:12,c:P.mute,wide:1});R.label([x(N-1),0,DZ/2+.15],'row group 81',{mono:true,fs:12,dy:12,c:P.mute,wide:1});
    R.label([XF,H,-DZ/2],'footer',{mono:true,fs:12,dy:-12,b:k>=2,c:P.c2});
    if(k===0)R.label([0,0,DZ/2+.15],'534 MB · 82 row groups × 7 column chunks · area is bytes',{mono:true,fs:12,dy:34,c:P.mute,wide:1});
    if(k===1)R.label([0,H,B.created_at.z0],'created_at + tokens in every row group: 76 MB',{mono:true,fs:12.5,dy:-16,b:1,c:P.c1,a:e});
    if(k>=3){const r=RG[hit];R.label([x(hit),.55+H,-DZ/2+.3],'row group '+hit+': '+r.ca0.slice(5,10)+' to '+r.ca1.slice(5,10),{mono:true,fs:12.5,dy:-14,b:1,c:P.c2,a:pick})}
    if(k===4)R.label([RDR[0],.55,RDR[2]],'1,197,073 bytes',{mono:true,fs:12.5,b:1,dy:30,c:P.c2,a:e})
  }
  const full={cam:[.42,.66],bounds:[[X0-.2,0,-DZ/2-.2],[RDR[0]+.5,1.1,DZ/2+.2]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · the real 534 MB file, one day queried',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1400,hold:4800,draw,
    margin:w=>w<520?[16,10,16,10]:[18,14,18,110],
    // steps 4 and 5 move in close on the one row group that can hold 1 March and the reader beside the footer
    view:k=>k>=3?{cam:[.62,.6],bounds:[[x(hit)-1.2,0,-DZ/2],[RDR[0]+.5,1.2,DZ/2]]}:full});
  window.CHK=window.CHK||{};CHK.heroHit=hit;
})();
