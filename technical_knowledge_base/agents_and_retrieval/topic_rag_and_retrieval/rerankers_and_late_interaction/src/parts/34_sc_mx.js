// ---- Scene: Fig. 4, MaxSim as a claim-token by abstract-token similarity field (renderer v2; replaces the 2D token stepper of 2026-10-24).
// Every cell is a real cosine between stored ColBERT token vectors (answerai-colbert-small-v1, RR.mx, e_maxsim_pair.py; stored x100); each row's
// maximum, the sums and the top-10 rescoring (MaxSim, MaxSim over real tokens, Qwen3-Embedding cosine) are the recorded ones. ----
(function(){
  const R0=window.RR;if(!R0||!R0.mx||!document.getElementById('stg-mx'))return;const {at,mix,lerp}=S3,$=id=>document.getElementById(id),esc=RRL.esc;
  let pi=Math.max(0,R0.mx.findIndex(p=>p.qid==='1180'));
  const SPC=t=>/^\[/.test(t),WORD=t=>/^[a-z]{3,}$/.test(t);
  function geo(){const p=R0.mx[pi],n=p.dtok.length,real=p.qtok.map((t,i)=>i).filter(i=>p.qtok[i]!=='[MASK]'),mask=p.qtok.map((t,i)=>i).filter(i=>p.qtok[i]==='[MASK]');
    const XS=9.2/(n-1),RS=Math.min(.26,4.2/real.length),z0=-2;
    const zr={};real.forEach((i,r)=>zr[i]=z0+r*RS);mask.forEach((i,m)=>zr[i]=z0+real.length*RS+.25+m*.17);
    const sum=a=>a.reduce((s,i)=>s+p.best_sim[i],0);
    const rel=p.cands.find(c=>c.rel)||{};return {p,n,real,mask,XS,x:j=>-4.6+j*XS,zr,sR:rel.maxsim_real!=null?rel.maxsim_real:sum(real),sA:rel.maxsim!=null?rel.maxsim:sum(real)+sum(mask),RS}}
  const XT=5.6,TS=2.6/32,XR=7,ZRK=[-.45,.45];
  function rankOf(p,k){return 1+p.cands.slice().sort((a,b)=>b[k]-a[k]).findIndex(c=>c.rel)}
  function draw(R,k,e){const P=R.P,G=geo(),p=G.p,x=G.x;R.grid(-5.8,9.8,-3,3,.5);
    const fade=k===5?.15:1;
    // the abstract's stored token vectors (back) and the claim's tokens (left)
    for(let j=0;j<G.n;j++)R.box([x(j),0,-2.5],[G.XS*.7,.14,.18],{fill:SPC(p.dtok[j])?mix(P.paper,P.mute,.3):P.paper,a:fade,shadow:false,lw:.4});
    R.label([0,.14,-2.5],'abstract '+p.doc+': '+G.n+' stored token vectors',{fs:12.5,dy:-12,c:P.mute,a:fade,wide:1});
    const rows=k>=4?G.real.concat(G.mask):G.real;
    rows.forEach((i,r)=>{const isM=p.qtok[i]==='[MASK]',a=(isM?(k===4?e:1):1)*fade;R.box([-5.1,0,G.zr[i]],[.2,.2,Math.min(.2,G.RS*.8)],{fill:mix(P.paper,P.q,isM?.3:.75),a,shadow:false});
      if(!isM&&k<5)R.label([-5.2,.1,G.zr[i]],p.qtok[i],{al:'right',dx:-6,fs:12,mono:true,c:P.q,grp:'qt',a})});
    if(k>=4)R.label([-5.2,.1,G.zr[G.mask[Math.floor(G.mask.length/2)]]],G.mask.length+' × [MASK]',{al:'right',dx:-6,fs:12,mono:true,c:P.mute,a:e*fade,wide:1});
    // the field: one row per claim token, one column per abstract token, shaded within the row
    if(k>=1){rows.forEach((i,r)=>{const row=p.sim[i],lo=Math.min(...row),hi=Math.max(...row),z=G.zr[i],dz=(p.qtok[i]==='[MASK]'?.15:G.RS*.85)/2;
        const ra=(k===1?Math.max(0,Math.min(1,e*G.real.length*1.15-r)):p.qtok[i]==='[MASK]'&&k===4?e:1)*(k>=2?.75:1)*fade;if(ra<=.01)return;
        R.quad([[x(0)-G.XS/2,0,z-dz],[x(G.n-1)+G.XS/2,0,z-dz],[x(G.n-1)+G.XS/2,0,z+dz],[x(0)-G.XS/2,0,z+dz]],{fill:P.paper,a:ra*.8,edge:false});
        for(let j=0;j<G.n;j++){const t=(row[j]-lo)/Math.max(1,hi-lo),tt=t*t;if(tt<.12)continue;
          R.quad([[x(j)-G.XS/2,.002,z-dz],[x(j)+G.XS/2,.002,z-dz],[x(j)+G.XS/2,.002,z+dz],[x(j)-G.XS/2,.002,z+dz]],{fill:mix(P.paper,P.q,.1+.8*tt),a:ra,edge:false})}})}
    // each row's maximum as a pillar
    if(k>=2){rows.forEach(i=>{const isM=p.qtok[i]==='[MASK]',a=(k===2?e:isM&&k===4?e:1)*fade,j=p.best[i],h=p.best_sim[i]*1.1,z=G.zr[i];
        R.box([x(j),0,z],[Math.max(G.XS,.07),h*a,isM?.12:.14],{fill:isM?mix(P.paper,P.mute,.4):P.q,a:Math.max(.2,a),shadow:false,lw:.5});
        if(k===2&&!isM)R.flow([[-5,.15,z],[x(j),.15,z],[x(j),h,z]],{c:P.q,a:e*.8,n:4,r:.04,speed:2.2});
        if(k===2&&!isM&&WORD(p.qtok[i]))R.label([x(j),h,z],p.qtok[i]+' → '+p.dtok[j]+' '+p.best_sim[i].toFixed(2),{fs:12,mono:true,b:1,c:P.q,dy:-10,a:e,grp:'pk'})})}
    // the score tower: the maxima stacked
    if(k>=3){let y=0;const ta=k===3?e:1;G.real.forEach(i=>{const h=p.best_sim[i]*TS;R.box([XT,y,0],[.5,h*ta,.5],{fill:P.q,a:fade<1?.3:1,shadow:y===0,lw:.4});y+=h*ta});
      if(k===3)G.real.forEach(i=>R.flowArc([x(p.best[i]),p.best_sim[i]*1.1,G.zr[i]],[XT,y,0],.6,{c:P.q,a:e*.7,n:3,r:.045,speed:1.6}));
      R.label([XT,y,0],'Σ max = '+G.sR.toFixed(2),{fs:13,b:1,mono:true,dy:-12,c:P.q,a:ta*(k===4?1-e*.6:1)*(k===5?.4:1),grp:'tw'});
      if(k>=4){const ma=k===4?e:1;G.mask.forEach(i=>{const h=p.best_sim[i]*TS;R.box([XT,y,0],[.5,h*ma,.5],{fill:mix(P.paper,P.mute,.4),a:fade<1?.3:1,shadow:false,lw:.4});y+=h*ma});
        if(k===4)G.mask.forEach(i=>R.flowArc([x(p.best[i]),p.best_sim[i]*1.1,G.zr[i]],[XT,y,0],.6,{c:P.mute,a:e*.6,n:3,r:.04,speed:1.6}));
        R.label([XT,y,0],'with [MASK]: '+G.sA.toFixed(2),{fs:13,b:1,mono:true,dy:-12,c:P.ink,a:ma*(k===5?.4:1),grp:'tw'})}}
    // the claim's top 10, rescored two ways: rank slots, best on the left
    if(k===5){[['maxsim','MaxSim'],['cos','cosine']].forEach(([key,nm],r)=>{const L=p.cands.slice().sort((a,b)=>b[key]-a[key]);
        L.forEach((c,j)=>R.box([XR+j*.32,0,ZRK[r]],[.24,c.rel?.5:.22,.3],{fill:c.rel?P.good:mix(P.paper,r?P.c1:P.q,.4),a:e}));
        R.label([XR-.25,.1,ZRK[r]],nm,{al:'right',dx:-6,fs:12.5,b:1,a:e});R.label([XR+L.findIndex(c=>c.rel)*.32,.5,ZRK[r]],'relevant · '+(L.findIndex(c=>c.rel)+1),{fs:12.5,mono:true,b:1,dy:-10,c:P.good,a:e})});
      R.label([XR+1.45,0,ZRK[1]+.2],'rank 1 → 10',{fs:12,dy:14,c:P.mute,a:e})}
  }
  function readout(){const G=geo(),p=G.p;const rr=k=>rankOf(p,k);
    const bm=G.real.filter(i=>!SPC(p.qtok[i])).map(i=>'<code>'+esc(p.qtok[i])+'</code> → <code>'+esc(p.dtok[p.best[i]])+'</code> '+p.best_sim[i].toFixed(2)).join(' · ');
    const L=p.cands.slice().sort((a,b)=>b.maxsim-a.maxsim);
    $('rr-mx-ro').innerHTML='<b>Claim '+p.qid+':</b> "'+esc(p.claim)+'" against abstract '+p.doc+' ('+G.n+' stored token vectors). Best matches of the real claim tokens: '+bm+'.'+
      '<div style="margin-top:4px">Sum over the '+G.real.length+' real tokens <b>'+G.sR.toFixed(2)+'</b>; with the '+G.mask.length+' [MASK] tokens <b>'+G.sA.toFixed(2)+'</b>. Rank of the relevant abstract among the claim\'s top 10: MaxSim <b>'+rr('maxsim')+'</b>, MaxSim without [MASK] <b>'+rr('maxsim_real')+'</b>, single-vector cosine <b>'+rr('cos')+'</b>.</div>'+
      '<details class="dp"><summary>The top 10 rescored both ways</summary><div class="b"><table><tr><td></td><td>abstract</td><td class="num">MaxSim</td><td class="num">cosine</td></tr>'+L.map((c,i)=>'<tr class="'+(c.rel?'rel':'')+'"><td>'+(i+1)+'</td><td title="'+esc(c.title)+'">'+esc(c.title)+'</td><td class="num">'+c.maxsim.toFixed(2)+'</td><td class="num">'+c.cos.toFixed(3)+'</td></tr>').join('')+'</table></div></details>'}
  const full={cam:[.3,.72],bounds:[[-5.6,0,-2.7],[6.2,1.6,2.4]]};
  const st=S3.stage({id:'stg-mx',list:'sx-mx',fig:'Fig. 4 · MaxSim, token by token',cam:full.cam,bounds:full.bounds,aspect:.66,dur:1500,hold:4800,draw,
    margin:w=>w<520?[12,8,12,8]:[18,16,16,90],
    view:k=>k===2?{cam:[.25,.62],bounds:[[-5.6,0,-2.7],[4.8,1.3,1.4]]}:k===5?{cam:[.25,.55],bounds:[[XT-1,0,-1],[XR+3.2,1.4,1]]}:full});
  const sg=$('rr-mx-pair');
  sg.innerHTML=R0.mx.map((p,i)=>'<button data-m="'+i+'"'+(i===pi?' class="on"':'')+'>Claim '+p.qid+'</button>').join('');
  readout();
  if(st)RD.seg(sg,m=>{pi=+m;readout();st.list('sx-mx')});
})();
