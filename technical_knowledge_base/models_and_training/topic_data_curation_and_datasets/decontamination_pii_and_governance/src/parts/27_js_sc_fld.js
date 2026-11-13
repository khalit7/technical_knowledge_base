// ---- Scene (Reading 3, Fig. 2): the running example as two fields of document sets (web, post-training), each tile's side growing with the square root
// of its size, and what each n-gram rule lifts out of them: one column per rule and field, its height the flagged pairs (datatrove: documents removed),
// split into copies (red), variants or sources (gold) and passages, phrases or diagram code (grey). Counts: window.DG.rules and DG.corpora (the scan). ----
(function(){
  if(!document.getElementById('stg-fld')||!window.DG||!DG.rules)return;const {at,lerp,mix}=S3;
  const f=n=>Number(n).toLocaleString('en-GB'),C=DG.corpora;
  const RULES=[['gpt3_13','GPT-3 · 13-gram'],['tulu_8_50','Tulu 3 · 8-gram > 50%'],['longest_50','longest match'],['datatrove','datatrove default']];
  const split=(k,g)=>{const r=DG.rules[k+'|'+g],c=r.cats,tot=r.pairs_label||r.pairs,cp=c.copy||0,gz=(c.variant||0)+(c.source||0);return {tot,cp,gz,fp:tot-cp-gz}};
  const MX=Math.max(...RULES.flatMap(([k])=>['web','post'].map(g=>split(k,g).tot))),HS=2.4/MX;
  const SN={run0_final:'run0 final',run0_extracted:'run0 extracted',fineweb:'FineWeb 50k',fineweb_edu:'FineWeb-Edu 50k',dclm:'DCLM 50k',nemotron:'Nemotron-CC',fineweb_file0:'FineWeb file',fineweb_edu_file0:'FineWeb-Edu file',tulu3_sft:'Tulu 3 SFT',ultrafeedback:'UltraFeedback',rlvr:'Tulu 3 RLVR',cosmopedia:'Cosmopedia'};
  const dmax=Math.max(...C.map(c=>c.docs)),side=c=>.32+1.05*Math.sqrt(c.docs/dmax);
  // the two fields: web tiles in a 4 x 2 block on the left, post-training tiles in a 2 x 2 block on the right; rule columns behind each
  const F={web:{x:-2.9,cols:[-4.5,-3.4,-2.3,-1.2]},post:{x:2.9,cols:[1.3,2.4,3.5,4.6]}},ZF=1.0,ZC=-1.1,CW=.7;
  const tiles={};['web','post'].forEach(g=>{const cs=C.filter(c=>c.group===g),per=g==='web'?4:2,pitch=g==='web'?1.25:.8;
    cs.forEach((c,i)=>{const col=i%per,row=Math.floor(i/per);tiles[c.key]=[F[g].x+(col-(per-1)/2)*pitch,ZF+(row-.5)*pitch,side(c)]})});
  const tot=g=>C.filter(c=>c.group===g).reduce((s,c)=>s+c.docs,0);
  function column(R,x,s,a,grow){const P=R.P;let y=0;[[s.cp,P.bad],[s.gz,P.c5],[s.fp,mix(P.paper,P.mute,.35)]].forEach(([n,c])=>{if(!n)return;const h=Math.max(.035,n*HS)*grow;
    R.box([x,y,ZC],[CW,h,CW],{fill:c,a,shadow:y===0,lw:.6});y+=h});return y}
  function draw(R,k,e){const P=R.P;R.grid(-6,6,-2.2,2.6,.5);
    // the fields
    const fa=k===0?1:.75;Object.entries(tiles).forEach(([key,[x,z,s]])=>{const c=C.find(c=>c.key===key),hot=key==='rlvr'&&k>=1&&k<=5;
      R.box([x,0,z],[s,.08,s],{fill:hot?mix(P.paper,P.bad,.25):c.group==='web'?mix(P.paper,P.c1,.18):mix(P.paper,P.c4,.22),a:fa*(k===0?at(k,e,0):1)})});
    if(k===0)Object.entries(tiles).forEach(([key,[x,z,s]])=>{if(['fineweb_file0','rlvr'].includes(key))R.label([x,.08,z],SN[key]+' · '+f(C.find(c=>c.key===key).docs),{mono:true,fs:12,dy:-12,a:e,wide:1})});
    const nw=R.W<520;R.label([F.web.x,0,ZF+1.45],nw?'web · '+f(tot('web')):'web text · 8 sets · '+f(tot('web'))+' documents',{mono:true,fs:12,dy:10,c:P.c1});
    R.label([F.post.x,0,ZF+1.05],nw?'post · '+f(tot('post')):'post-training · 4 sets · '+f(tot('post'))+' rows',{mono:true,fs:12,dy:nw?24:10,c:P.c4});
    let topW=0;
    // the rule columns: empty slots from the start, the current rule's columns rising out of the fields, earlier ones receding
    RULES.forEach(([key,nm],r)=>['web','post'].forEach(g=>{const x=F[g].cols[r],s=split(key,g),cur=k===r+1,done=k>r+1;
      if(!cur&&!done){R.box([x,0,ZC],[CW,.02,CW],{fill:P.paper,a:k===0?.12:.3,shadow:false});return}
      const a=cur||k===5?1:.16,grow=cur?e:1,top=column(R,x,s,a,grow);if(cur&&g==='web')topW=top;
      if(cur){const [fx,fz]=g==='web'?[F.web.x,ZF]:[tiles.rlvr[0],tiles.rlvr[1]];
        R.flowArc([fx,.1,fz],[x,top+.05,ZC],.5+.15*top,{c:s.cp?P.bad:P.mute,a:.85,r:.04+.05*Math.sqrt(s.tot/MX),n:Math.max(3,Math.round(3+10*s.tot/MX)),speed:1.3});
        R.label([x,top,ZC],f(s.tot),{mono:true,fs:12,dy:-12,c:P.ink,a:e})}
      if(cur||k===5)R.label([x,k===5?top:0,ZC],s.cp+(k===5?'':s.cp===1?' copy':' copies'),{mono:true,fs:12.5,b:1,dy:k===5?-12:16,c:P.bad,a:cur?e:1})}));
    if(k>=1&&k<=4)R.label([F.web.cols[k-1],topW,ZC],RULES[k-1][1],{fs:13,b:1,dy:-32,c:P.ink});
  }
  const full={cam:[.1,.62],bounds:[[-5.4,0,ZC-.5],[5.4,2.5,ZF+1.6]]};
  S3.stage({id:'stg-fld',list:'sx-fld',fig:'Fig. 2 · what each rule lifts out',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1500,hold:4800,draw,
    view:k=>k===0?{cam:[.1,.8],bounds:[[-5.4,0,ZF-1.2],[5.4,.4,ZF+1.6]]}:k===5?{cam:[.25,.45],bounds:[[-5.4,0,ZC-.5],[5.4,2.6,ZF+1.6]]}:full});
})();
