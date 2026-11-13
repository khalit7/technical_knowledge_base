// ---- Scene: Fig. 1 (stg-pipe), one Common Crawl file through the pipeline, cheapest stage first (renderer v2, 25_js_s3.js) ----
// Nine glass gates in pipeline order (URL filter, extract, language ID, heuristic rules, dedup, quality model, decontamination and PII,
// mix, store), the documents flowing through them as dots, the removed ones falling into a tray in front, and after each gate a white
// column whose height is the share of the file's 20,463 HTML pages still alive (to scale). Every count is the page's own data:
// window.RDP.funnel (Pipeline lab funnel), window.DCPD.run0 (datatrove run), window.QD.S (Quality lab keeps), window.MXD.proxy.doremi
// (Mixing lab DoReMi run), window.TM_DATA.storage (Tool map storage measurement). Positions, gate sizes and the four shards are a layout.
(function(){
  if(!document.getElementById('stg-pipe')||!window.S3)return;
  const {mix,cl,lerp}=S3;
  const win=(e,a,b)=>cl((e-a)/(b-a),0,1);
  const f0=n=>Math.round(n).toLocaleString('en-US');
  let T=null;
  function data(){if(T)return T;
    const F=window.RDP.funnel.docs,R0=(window.DCPD||{}).run0||{},S=(window.QD||{}).S||{},DR=(((window.MXD||{}).proxy)||{}).doremi||{},ST=(window.TM_DATA||{}).storage||{};
    const N0=F.html_pages;
    // [name, short name, colour key, count in, count out, owner]
    const G=[
      ['URL filter','URL','c1',N0,F.after_url,'Extraction and filtering, s. 10'],
      ['Extract','extract','c1',F.after_url,F.after_extraction,'Extraction and filtering, s. 1 to 5'],
      ['Language ID','language','c1',F.after_extraction,F.after_lid,'Extraction and filtering, s. 6'],
      ['Heuristic rules','rules','c5',F.after_lid,F.after_c4_and_fineweb_rules,'Extraction and filtering, s. 7 to 9'],
      ['Deduplicate','dedup','c2',F.after_c4_and_fineweb_rules,F.after_minhash_in_file,'Deduplication'],
      ['Quality model','quality','c4',F.after_minhash_in_file,F.after_minhash_in_file,'Quality classifiers'],
      ['Decontaminate, PII','decontam.','c6',F.after_minhash_in_file,F.after_minhash_in_file,'Decontamination, PII'],
      ['Mix and stage','mix','c3',null,null,'Data mixing'],
      ['Store and load','store','c3',null,null,'Storage and loading']];
    const byte=k=>{const r=(ST.sizes||[]).find(s=>s.fmt===k);return r&&ST.tokens?r.bytes/ST.tokens:null};
    return T={N0,G,resp:R0.responses,edu:S.keep_edu,dclm:S.keep_dclm,ref:DR.ref_w,dr:DR.avg_w,
      bpt:{jsonl:byte('jsonl'),zst:byte('jsonl.zst'),bin:byte('bin')},fwKept:R0.fineweb_kept,fwIn:R0.fineweb_in_final}}
  const NG=9,X=i=>-5.6+1.45*i,GH=1.0,GZ0=-.8,GZ1=.7,SZ=.15,SY=.28,CZ=-.5,TZ=1.3,HMAX=2.2;
  const SRC=[-7.25,0,.1];
  const DOM=['web','Wikipedia','code','maths','papers'],DC=['c1','c5','c2','c4','c6'];
  let moving=false;
  const lab=(R,p,t,o)=>{if(!moving)R.label(p,t,o)};
  // the glide from step 9's close-up out to the whole pipeline: what was out of step 9's view fades in as the camera arrives,
  // so nothing enters cut at the card's left edge (each drawing call's options, its last argument, get their alpha scaled)
  function draw(R,k,e,st){const pk=st&&st.pk!=null?st.pk:k,g=k===NG&&pk===NG-1&&e<1?win(e,.35,.8):1;if(g>=1)return draw0(R,k,e,st);
    const M=['box','glass','flow','flowArc','quad','line','glow','ball','label'],keep={},x0=X(NG-1)-1.1;
    M.forEach(m=>{keep[m]=R[m];R[m]=function(...a){const p=a[0],x=Array.isArray(p[0])?p[0][0]:p[0],o=a[a.length-1];
      if(x<x0&&o&&typeof o==='object'&&!Array.isArray(o))a[a.length-1]=Object.assign({},o,{a:(o.a==null?1:o.a)*g});return keep[m].apply(this,a)}});
    try{draw0(R,k,e,st)}finally{M.forEach(m=>{R[m]=keep[m]})}}
  function draw0(R,k,e,st){const P=R.P,D=data(),pk=st&&st.pk!=null?st.pk:k,late=win(e,.55,1),grow=win(e,.05,.55);moving=e<.55&&k!==pk;
    const all=k===NG,H=n=>HMAX*n/D.N0,wide=R.W>=520;
    R.grid(-8.2,7.8,-2.6,2.3,.5);
    // the source: one WARC file
    const sa=k===0||all?1:.35;
    R.box(SRC,[.95,.95,.95],{fill:mix(P.paper,P.c1,.18),a:sa});
    // the removal trays: one in front of each gate that drops documents
    for(let i=0;i<5;i++){const ta=all?.9:i===k?.95:i===k-1?.3:0;if(ta>0)R.box([X(i)+.4,0,TZ],[1.05,.1,.55],{fill:mix(P.paper,P.bad,.2),a:ta,shadow:false})}
    // the main stream: from the file through every gate reached so far
    const reach=all?NG-1:k;
    for(let i=0;i<=Math.min(reach,NG-1);i++){
      const g=D.G[i],nin=g[3]!=null?g[3]:D.G[6][4],share=nin/D.N0,from=i===0?[SRC[0]+.5,SY,SZ]:[X(i-1),SY,SZ],to=[X(i)+.02,SY,SZ];
      const a=all?.8:i===k?1:i===k-1?.45:0,len=to[0]-from[0];if(a<=0)continue;
      R.flow([from,to],{c:P[g[2]],a,r:.05+.04*share,n:Math.max(2,Math.round(len*(1+4*share))),speed:1.1});
      // the removed documents fall forward into the tray, as many dots as the share removed
      if(g[3]!=null&&g[4]<g[3]){const rm=(g[3]-g[4])/g[3],fa=all?.55:i===k?win(e,.1,.5):i===k-1?.3:0;
        R.flowArc([X(i),SY,SZ+.1],[X(i)+.35,.12,TZ-.05],.35,{c:P.bad,a:fa,r:.04+.05*rm,n:Math.max(2,Math.round(2+10*rm)),speed:1.2})}
    }
    // after the last gate reached: the stream goes on to the next gate, faint
    if(!all&&k<NG-1)R.flow([[X(k),SY,SZ],[X(k+1),SY,SZ]],{c:P[D.G[k][2]],a:win(e,.4,.9)*.8,r:.05,n:3,speed:1.1});
    if(all||k===NG-1)R.flow([[X(NG-1),SY,SZ],[X(NG-1)+1.7,SY,SZ]],{c:P.c3,a:.8,r:.06,n:4,speed:1.1});
    // gates and columns
    for(let i=0;i<NG;i++){const g=D.G[i],c=P[g[2]];
      const ga=all?.85:i===k?1:i===k-1?.3:i<k?.06:.14;
      R.glass([X(i),.02,GZ0],[0,0,GZ1-GZ0],[0,GH,0],{c,a:ga,nu:5,nv:4});
      if(i===k&&!all)R.glow([X(i),GH*.55,(GZ0+GZ1)/2],.6,{c,a:.3*win(e,.2,.8)});
      if(g[3]!=null&&i!==5&&i!==6){ // a counting gate: its column is the share still alive
        const ca=all?1:i===k?1:i===k-1?.35:0;if(ca<=0)continue;
        const h=i===k&&!all?lerp(H(g[3]),H(g[4]),grow):H(g[4]);
        R.box([X(i)+.72,0,CZ],[.5,Math.max(.012,h),.5],{a:ca,shadow:ca>.5});
      }
    }
    // the quality model: two thresholds, two thin columns beside the stream's own 2,617
    const q=D.G[5],qa=all?1:k===5?1:k===6?.4:0;
    if(qa>0){const g5=k===5&&!all?grow:1;
      R.box([X(5)+.72,0,CZ],[.5,H(q[4]),.5],{a:qa*(k===5?.45:1)});
      R.box([X(5)+.55,0,.75],[.34,Math.max(.012,lerp(H(q[4]),H(D.dclm),g5)),.34],{fill:mix(P.paper,P.c4,.55),a:qa,shadow:false});
      R.box([X(5)+1.15,0,1.2],[.34,Math.max(.012,lerp(H(q[4]),H(D.edu),g5)),.34],{fill:mix(P.paper,P.c3,.6),a:qa,shadow:false})}
    // decontamination and PII: nothing removed; the column stays at 2,617
    const d6=D.G[6],da=all?1:k===6?1:k===7?.4:0;
    if(da>0)R.box([X(6)+.72,0,CZ],[.5,H(d6[4]),.5],{a:da});
    // mixing: four other domains flow in from behind; the column is the mixture, shares and not to scale
    const ma=all?.9:k===7?1:k===8?.4:0;
    if(ma>0){const t=k===7&&!all?win(e,.3,.85):all||k>7?1:0;
      DOM.forEach((d,j)=>{if(j===0)return;const sp=[X(7)-1.3+.42*(j-1),0,-1.95];
        R.box(sp,[.3,.3,.3],{fill:mix(P.paper,P[DC[j]],.45),a:ma});
        R.flowArc([sp[0],.3,sp[2]],[X(7),SY+.1,GZ0+.2],.45,{c:P[DC[j]],a:ma*(k===7?win(e,.05,.4):.6),r:.05,n:5,speed:1})});
      let y=0;const HM=1.2;
      DOM.forEach((d,j)=>{const w=lerp(D.ref[j],D.dr[j],t),h=HM*w;
        R.box([X(7)+.72,y,CZ],[.5,Math.max(.01,h),.5],{fill:mix(P.paper,P[DC[j]],.6),a:ma,shadow:j===0&&ma>.5});
        if(k===7&&!all&&wide)lab(R,[X(7)+.97,y+h/2,CZ],d+' '+(100*w).toFixed(1)+'%',{fs:12,mono:1,al:'left',dx:6,c:P[DC[j]],a:late,grp:'mx'});
        y+=h})}
    // storing: the stream becomes token shards (four, illustrative)
    const sa8=all?1:k===8?1:0;
    if(sa8>0)for(let j=0;j<4;j++)R.box([X(8)+.62,j*.2,CZ+.1],[.62,.16,.62],{fill:mix(P.paper,P.c3,.3),a:sa8*(k===8&&!all?win(e,.1+.1*j,.45+.1*j):1),shadow:j===0});
    // labels for the step in view, once the camera has arrived
    if(!all){const g=D.G[k],c=P[g[2]],tp=[X(k),k===7?1.5:Math.max(GH,g[3]!=null&&k<5?H(g[3])+.15:GH),GZ0];
      lab(R,tp,(k+1)+' · '+g[0],{fs:14.5,b:1,c,dy:-30,a:late});
      lab(R,tp,'page: '+g[5],{fs:12.5,c:P.mute,dy:-12,a:late,wide:1});
      if(k===0)lab(R,[SRC[0],0,SRC[2]+.5],'one WARC file: '+f0(D.N0)+' HTML pages',{fs:12.5,b:1,c:P.ink,dy:18,a:late});
      if(g[3]!=null&&k<5){
        lab(R,[X(k)+.72,H(g[4]),CZ],f0(g[4])+' left',{fs:13,b:1,mono:1,c:P.ink,al:'left',dx:22,dy:-4,a:late});
        lab(R,[X(k)+.4,.1,TZ+.25],'−'+f0(g[3]-g[4])+' removed',{fs:12.5,b:1,mono:1,c:P.bad,dy:14,a:late})}
      if(k===5){lab(R,[X(5)+.72,H(q[4]),CZ],f0(q[4])+' go on',{fs:12.5,mono:1,c:P.mute,al:'left',dx:22,dy:-6,a:late});
        lab(R,[X(5)+.55,H(D.dclm),.75],'DCLM keeps '+f0(D.dclm),{fs:12.5,b:1,c:P.c4,al:'right',dx:-14,dy:4,a:late});
        lab(R,[X(5)+1.15,H(D.edu),1.2],'FineWeb-Edu keeps '+f0(D.edu),{fs:12.5,b:1,c:P.c3,al:'left',dx:14,dy:4,a:late})}
      if(k===6){lab(R,[X(6)+.72,H(d6[4]),CZ],f0(d6[4])+': nothing removed',{fs:12.5,b:1,mono:1,c:P.ink,al:'left',dx:22,dy:-4,a:late});
        lab(R,[X(6)+.72,0,TZ-.4],'PII: 101 edited',{fs:12.5,c:P.c6,al:'left',dx:10,a:late,wide:1})}
      if(k===7)lab(R,[X(7)-1.45,.15,-1.95],'other domains',{fs:12.5,c:P.mute,al:'right',dx:-8,a:late,wide:1});
      if(k===8&&D.bpt.jsonl){lab(R,[X(8)+.62,.8,CZ+.1],'token shards',{fs:12.5,b:1,c:P.c3,dy:-8,a:late});
        lab(R,[X(8)+1.0,.3,CZ+.1],'bytes per token: JSONL '+D.bpt.jsonl.toFixed(2)+', uint32 '+D.bpt.bin.toFixed(2),{fs:12,mono:1,c:P.mute,al:'left',dx:14,dy:10,a:late,wide:1})}
    }else{
      for(let i=0;i<NG;i++)lab(R,[X(i),GH,GZ0],D.G[i][1],{fs:12.5,b:1,c:P[D.G[i][2]],dy:-12,a:late,grp:'nm'});
      for(let i=0;i<NG;i++)lab(R,[X(i),GH,GZ0],String(i+1),{fs:13,b:1,c:P[D.G[i][2]],dy:-12,a:late*(wide?0:1)});
      const end=D.G[6][4];
      lab(R,[X(1)+.4,0,TZ+.3],(wide?f0(D.N0)+' pages in, '+f0(end)+' documents out: ':f0(end)+' of '+f0(D.N0)+': ')+(100*end/D.N0).toFixed(1)+'%',{fs:12.5,b:1,mono:1,c:P.ink,dy:18,a:late});
      // beside the main line: synthetic data joins the mix; post-training data is its own smaller line
      R.box([X(7)-.35,0,1.55],[.42,.3,.42],{fill:mix(P.paper,P.c3,.35),a:.9});
      R.flowArc([X(7)-.35,.3,1.55],[X(7),SY+.1,GZ1-.1],.4,{c:P.c3,a:.7,r:.05,n:4,speed:1});
      lab(R,[X(7)-.35,0,1.55],'synthetic',{fs:12.5,b:1,c:P.c3,dy:16,a:late,wide:1});
}
  }
  const full={cam:[.34,.62],bounds:[[-7.9,0,-2.1],[7.6,2.3,1.8]]};
  const phoneFull={cam:[.6,.62],bounds:full.bounds}; // on a phone the whole pipeline turns into depth, so the gates are larger
  const V=k=>{if(k===NG)return (document.getElementById('stg-pipe').clientWidth||999)<520?phoneFull:full;const D=data(),g=D.G[k],top=g[3]!=null?Math.max(1.35,HMAX*g[3]/D.N0+.25):1.35;
    const x0=k===0?SRC[0]-.7:X(k)-1.1,x1=X(k)+(k===8?3.0:k>=5?2.4:2.0),z0=k===7?-2.2:k===5?-1.7:-1.0,z1=k<=4?TZ+.4:GZ1+.3;
    return {cam:[.46,.42],bounds:[[x0,0,z0],[x1,top,z1]]}};
  S3.stage({id:'stg-pipe',list:'sx-pipe',fig:'Fig. 1 · one Common Crawl file through the pipeline',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1600,hold:5000,draw,
    margin:w=>w<520?[34,10,16,10]:[44,18,22,18],view:V});
})();
