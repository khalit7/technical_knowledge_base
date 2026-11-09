// ---- Scene (Reading 2, Fig. 1): one real page of the running example through jusText (renderer v2) ----
// The page's 37 blocks in page order, left to right, each plate as deep as its text is long (window.EF.jt: jusText 3.0.2's own
// features and classes after each pass, recorded by src/scripts/ef_jt_steps.py). A glass bar walks the page for each pass; plates take
// their new class as it passes; in pass 2 and pass 4 arcs bring each changed block's deciding neighbours. The last step peels the
// boilerplate away. A second mode puts the same blocks through trafilatura 1.11 and resiliparse (their real outputs, aligned to the blocks).
(function(){
  if(!document.getElementById('stg-jt')||!window.S3||!window.EF||!EF.jt)return;const {at,lerp,mix,cl}=S3;
  const H=EFH,J=EF.jt,PA=J.paras,SN=J.snaps,np=PA.length,$=id=>document.getElementById(id);
  const page=(EF.pages||[]).find(p=>p.host===J.host)||{},maxL=Math.max(...PA.map(p=>p.len));
  // align an extractor's output lines to the blocks, in order; a link-only block (a contents entry with a heading's words) only when nothing else matches
  const norm=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const same=(t,l)=>{const a=norm(t).slice(0,40),b=norm(l).slice(0,40);return a.length>1&&b.length>1&&(a.startsWith(b)||b.startsWith(a))};
  function align(list){const hit=PA.map(()=>false);let cur=0;
    list.forEach(l=>{let j=-1;for(let i=cur;i<np;i++){if(PA[i].ld<0.9&&same(PA[i].t,l)){j=i;break}}
      if(j<0){for(let i=cur;i<np;i++){if(same(PA[i].t,l)){j=i;break}}}
      if(j>=0){hit[j]=true;cur=j+1}});return hit}
  const FIN=SN[SN.length-1],KEEP=[FIN.map(c=>c==='good'),align(J.traf),align(J.res)];
  // what the step list quotes, for src/check_stages.mjs
  window.EFS=window.EFS||{};EFS.jt={np,html:page.html_chars,cls:SN.map(s=>{const c={};s.forEach(x=>c[x]=(c[x]||0)+1);return c}),
    keptChars:PA.reduce((a,p,i)=>a+(FIN[i]==='good'?p.len:0),0),allChars:PA.reduce((a,p)=>a+p.len,0),kept:KEEP.map(k=>k.filter(Boolean).length),
    resExtra:KEEP[2].map((v,i)=>v&&!KEEP[0][i]?i:-1).filter(i=>i>=0),trafSame:KEEP[1].every((v,i)=>v===KEEP[0][i])};
  let mode='jt';
  // geometry: blocks left to right in page order; each plate's depth grows with the square root of its text length
  const X=i=>-3.1+i*.172,DEP=i=>.22+2.0*Math.sqrt(PA[i].len/maxL),ZF=1.05;
  const HT={good:.22,neargood:.15,short:.075,bad:.04};
  const REG=[[0,11,'menu, title, contents'],[12,23,'6 headings, 6 paragraphs'],[24,35,'sidebar'],[36,36,'footer']];
  const clsAt=(k,i)=>k<=0?null:SN[k-1][i];
  const colOf=(P,c)=>c==='good'?P.good:c==='bad'?mix(P.paper,P.bad,.62):c==='short'?mix(P.paper,P.mute,.32):c==='neargood'?P.c5:P.paper;
  // the nearest block on each side whose class (before this pass) is good or bad: what decides a short block in pass 2
  function nb(C,j,dir){for(let i=j+dir;i>=0&&i<np;i+=dir)if(C[i]==='good'||C[i]==='bad')return i;return -1}
  function draw(R,k,e){const P=R.P,nw=R.W<520;R.grid(-5.4,4.4,-1.8,2,.5);
    if(mode==='cmp')return drawCmp(R,k,e);
    const sx=k>=1?lerp(X(0)-.5,X(np-1)+.5,cl(e*1.25,0,1)):-99; // the glass bar's position during a pass
    const peel=k===5?cl((e-.72)/.28,0,1):0;
    // step 1: the WARC record, parsed into blocks
    if(k===0){const ra=1;R.box([-4.65,0,.15],[.95,.6,1.15],{fill:mix(P.paper,P.c1,.2),a:ra});
      R.label([-4.65,.6,.15],'WARC record',{b:1,fs:13,dy:-12,c:P.c1});if(page.html_chars)R.label([-4.65,0,.75],H.n(page.html_chars)+' characters of HTML',{fs:12,dy:16,c:P.mute,wide:1});
      R.flowArc([-4.2,.5,.15],[X(0),.1,ZF-.6],.6,{c:P.c1,a:.85,r:.06,n:9,speed:1.3})}
    for(let i=0;i<np;i++){const prev=k<=1?null:clsAt(k-1,i),now=clsAt(k,i),passed=sx>X(i),c=k===0?null:(passed?now:prev);
      const d=DEP(i),h=c?HT[c]:.05,grow=k===0?cl((e*1.4-i/np*.9)*3,0,1):1;if(grow<=0)continue;
      const isOut=k===5&&c!=='good',lift=isOut?.55*peel:0,zz=ZF-d/2-(isOut?.9*peel:0);
      R.box([X(i),lift,zz],[.13,h,d*grow],{fill:colOf(P,c),a:isOut?1-.75*peel:1,shadow:lift<.05,lw:.6});
      const changed=k>=2&&prev!==now&&passed;if(changed)R.glow([X(i),h+.05,ZF-d/2],.35,{c:now==='good'?P.good:P.bad,a:.8})}
    // the glass bar that walks the page during a pass
    if(k>=1&&e<1)R.glass([sx,0,-1.35],[0,0,2.55],[0,.6,0],{c:P.c2,a:.9,nu:6,nv:3});
    // pass 2 and pass 4: arcs from the deciding neighbours into each changed block
    if(k===3||k===5){const C=SN[k-2],N=SN[k-1];for(let j=0;j<np;j++){if(C[j]===N[j]||sx<X(j)-.05)continue;
      const src=k===3?[nb(C,j,-1),nb(C,j,1)]:[j+1];src.forEach(i=>{if(i<0)return;const cc=C[i]==='good'?P.good:P.bad;
        R.flowArc([X(i),HT[C[i]]+.02,ZF-.25],[X(j),HT[N[j]]+.04,ZF-.25],.28+.04*Math.abs(i-j),{c:cc,a:.85,r:.045,n:5,speed:1.2})})}}
    // labels: the regions under the row, the tally above it
    REG.forEach(([a,b,t],r)=>{const xm=(X(a)+X(b))/2;if(!nw)R.line([[X(a)-.05,0,ZF+.12],[X(b)+.05,0,ZF+.12]],{c:P.mute,w:1.2,a:.7});
      R.label([xm,0,ZF+.12],t+(b>a?' · '+(b-a+1):''),{fs:12,dy:r===3?30:14,c:P.mute,wide:1})});
    const cnt={};for(let i=0;i<np;i++){const c=k===0?null:(sx>X(i)?clsAt(k,i):(k<=1?null:clsAt(k-1,i)));if(c)cnt[c]=(cnt[c]||0)+1}
    const tally=k===0||(k===1&&!cnt.bad&&!cnt.good&&!cnt.short)?np+' blocks, not yet classified':k===5&&peel>.5?'kept: '+(cnt.good||0)+' blocks · '+H.n(EFS.jt.keptChars)+' of '+H.n(EFS.jt.allChars)+' characters':['good','neargood','short','bad'].filter(c=>cnt[c]).map(c=>(c==='neargood'?'near-good':c)+' '+cnt[c]).join(' · ');
    R.label([0,.62,-1.35],tally,{fs:13,b:1,c:P.ink,dy:-6})}
  // the comparison: the same blocks as three rows, one per extractor; what each kept stands up
  const ZR=[1.55,0,-1.55],NM=['jusText','trafilatura 1.11','resiliparse'],DS=i=>.12+.95*Math.sqrt(PA[i].len/maxL);
  function drawCmp(R,k,e){const P=R.P,LC=[P.c5,P.c1,P.c3];
    for(let r=0;r<3;r++){if(r>k)continue;const cur=r===k,a=cur?1:.42,grow=cur?e:1;
      for(let i=0;i<np;i++){const keep=KEEP[r][i],d=DS(i),z=ZR[r]+.55-d/2;
        R.box([X(i),0,z],[.13,keep?.04+.2*grow:.03,d],{fill:keep?LC[r]:P.paper,a:keep?a:a*.35,shadow:false,lw:.5});
        if(cur&&keep&&r===2&&!KEEP[0][i])R.glow([X(i),.3,z],.4,{c:P.c3,a:.9*e})}
      R.label([X(0)-.15,0,ZR[r]],NM[r],{al:'right',dx:-8,fs:13,b:cur,c:LC[r],grp:'row'});
      R.label([X(np-1)+1.05,.3,ZR[r]+.3],KEEP[r].filter(Boolean).length+' blocks kept',{fs:12,b:cur,dy:-12,c:cur?P.ink:P.mute,a:cur?Math.max(.3,e):1,wide:1});
      // the kept text streams out of the row into the extractor's output
      if(cur){const ks=KEEP[r].map((v,i)=>v?i:-1).filter(i=>i>=0);ks.forEach(i=>R.flowArc([X(i),.24,ZR[r]+.3],[X(np-1)+.9,.1,ZR[r]+.3],.3,{c:LC[r],a:.55,r:.04,n:3,speed:1.3}))}
      R.box([X(np-1)+1.05,0,ZR[r]+.3],[.45,.3,.45],{fill:mix(P.paper,LC[r],.35),a:cur?e:.6});
      if(cur&&r===2){const t=EFS.jt.resExtra[0];if(t!=null)R.label([X(t),.3,ZR[r]],'the title',{fs:12,b:1,c:P.c3,dy:-14,a:e})}}
    if(k===0)R.label([X(2),.04,ZR[0]+.2],'title dropped',{fs:12,c:P.mute,dy:-14,a:e,wide:1})}
  const full={cam:[.22,.8],bounds:[[-3.4,0,-1.35],[3.4,.62,ZF+.2]]};
  const st=S3.stage({id:'stg-jt',list:'sx-jt',fig:'Fig. 1 · one real page through jusText',cam:full.cam,bounds:full.bounds,aspect:.56,dur:2400,hold:4600,draw,
    margin:w=>w<520?[16,10,14,10]:[22,16,34,mode==='cmp'?104:16],
    view:k=>mode==='cmp'?{cam:[0,.92],bounds:[[-3.4,0,-1.6],[4.5,.4,2.2]]}:k===0?{cam:[.28,.72],bounds:[[-5.2,0,-1.35],[3.4,.62,ZF+.2]]}:full,
    onStep:k=>{try{readout(k)}catch(err){}}});
  // the readout beside the stage: counts, and the blocks as text in a closed block
  function readout(s){const rows=[];let good=0,chars=0,chg=0;
    for(let i=0;i<np;i++){let c,keep,changed=false;
      if(mode==='jt'){c=s===0?null:SN[s-1][i];changed=s>1&&SN[s-1][i]!==SN[s-2][i];keep=c==='good'}
      else{c=FIN[i];keep=KEEP[s][i]}
      if(changed)chg++;if(keep){good++;chars+=PA[i].len}
      const kk=c?'<span class="k ef-k-'+c+'">'+(c==='neargood'?'near-good':c)+'</span>':'<span class="k" style="background:var(--soft);color:var(--mute)">block</span>';
      const out=mode==='jt'?(s===5&&c!=='good'):!keep;
      rows.push('<div class="ef-para'+(changed?' chg':'')+(out?' out':'')+'" title="length '+PA[i].len+', stop-word density '+PA[i].sw+', link density '+PA[i].ld+(PA[i].h?', heading':'')+'">'+kk+'<span class="x">'+(PA[i].h?'<b>':'')+H.esc(PA[i].t)+(PA[i].h?'</b>':'')+'</span></div>')}
    $('ef-jt-body').innerHTML='<div class="ef-paras">'+rows.join('')+'</div>';
    $('ef-jt-cnt').innerHTML=H.stat('Blocks',np,'on '+H.esc(J.host))+H.stat(mode==='jt'?'Good now':'Kept',good,'blocks')+H.stat('Characters in them',H.n(chars),'')+(mode==='jt'?H.stat('Changed at this step',chg,''):H.stat('Extractor',NM[s],''))}
  readout(0);
  // the mode switch shows that mode's step list and replays the stage
  H.chips($('ef-jt-mode'),m=>{mode=m;$('sx-jt').hidden=m!=='jt';$('sx-jtc').hidden=m!=='cmp';st.list(m==='jt'?'sx-jt':'sx-jtc')});
})();
