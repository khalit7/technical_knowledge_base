// ---- Scene: Fig. 4, what the fine-tune does to the vectors (renderer v2; was the Training lab's 2D radial view). Data: EMB.lab, 72 fixed texts
// re-encoded every 4 training steps of the real fine-tune: 12 SciFact test claims, each with its labelled abstract, its 3 hardest unlabelled
// abstracts (starting model), the other claims' abstracts and 12 random ones. Exact, not a projection: distance from the claim = 1 - cosine,
// on one scale for every frame and arm; the angle only groups the kinds. The 15 snapshots play as stretches (one step each):
// before; steps 4-16; steps 20-56; the gap (rings at the labelled abstract and at the nearest other abstract). ----
(function(){
  if(!document.getElementById('stg-tl')||!window.EMB)return;const {at,lerp,mix}=S3;
  const E=window.EMB,esc=RD.esc,lab=E.lab;
  const pend=document.getElementById('emb-tl-pend');
  if(!lab){pend.hidden=false;document.getElementById('stg-tl').hidden=true;
    pend.innerHTML='<b>Pending run.</b> This view is drawn from the tiny fine-tune\'s snapshots (72 fixed texts re-encoded every 4 training steps). Nothing is shown until it has run: a toy run\'s numbers would teach the wrong sizes.';return}
  if(lab.dev){pend.hidden=false;pend.innerHTML='<b>Development data.</b> These frames come from a CPU toy run used only to build this view; they are not a result.'}
  const arms=Object.keys(lab.arms),AN={inbatch:'in-batch negatives only',dense_f:'+ dense negatives, filtered'};
  const segEl=document.getElementById('emb-tl-arm');segEl.innerHTML=arms.map((a,i)=>'<button data-m="'+a+'"'+(i===0?' class="on"':'')+'>'+(AN[a]||a)+'</button>').join('');
  let arm=arms[0],gi=0;
  let cmin=1;arms.forEach(a=>lab.arms[a].frames.forEach(fr=>fr.forEach(r=>r.forEach(c=>{if(c<cmin)cmin=c}))));cmin=Math.max(-1,Math.floor(cmin*10)/10);
  const RM=3.1,rad=c=>Math.min(1,Math.max(0,(1-c)/(1-cmin)))*RM;
  const sel=document.getElementById('emb-tl-claim');
  lab.groups.forEach((g,i)=>{const o=document.createElement('option');o.value=i;o.textContent=(i+1)+'. '+lab.items[g.claim].text.slice(0,70);sel.appendChild(o)});
  const KN={pos:'its labelled abstract',neg:'its 3 hardest unlabelled abstracts',other:"the other claims' abstracts",rand:'12 random abstracts'};
  function angles(kinds){const n=kinds.length,out=[],idx=[];['pos','neg','other','rand'].forEach(kd=>kinds.forEach((x,i)=>{if(x===kd)idx.push(i)}));
    idx.forEach((i,j)=>{out[i]=-Math.PI/2+2*Math.PI*j/n});return out}
  const nF=()=>lab.arms[arm].frames.length,F4=4;
  // the snapshot shown at step k with progress e: a fractional frame index
  const fAt=(k,e)=>{const L=nF()-1;return k===0?0:k===1?lerp(0,F4,e):k===2?lerp(F4,L,e):L};
  function cosAt(f,g){const A=lab.arms[arm].frames,i=Math.floor(f),t=f-i,a=A[i][g],b=A[Math.min(i+1,A.length-1)][g];return a.map((v,j)=>lerp(v,b[j],t))}
  const margin=(c,g)=>{let best=-2;g.kinds.forEach((k,j)=>{if(k!=='pos')best=Math.max(best,c[j])});return [c[0]-best,best]};
  const circ=(r,y)=>{const p=[];for(let i=0;i<=72;i++){const a=i/72*Math.PI*2;p.push([Math.cos(a)*r,y||.005,Math.sin(a)*r])}return p};
  function draw(R,k,e){const P=R.P,g=lab.groups[gi],ang=angles(g.kinds),f=fAt(k,e),c=cosAt(f,gi),c0=lab.arms[arm].frames[0][gi];
    const KC={pos:P.good,neg:P.bad,other:P.c1,rand:P.mute};
    R.grid(-3.4,3.4,-3.4,3.4,.5);
    // rings of equal cosine
    for(let v=Math.ceil(cmin*10)/10;v<.95;v+=.2){const r=rad(v);if(r<.05)continue;R.line(circ(r),{c:P.line,w:1,dash:[4,4]});R.label([r*.71,0,r*.71],'cos '+v.toFixed(1),{fs:12,mono:true,c:P.mute,dy:12,grp:'ring'})}
    // the claim at the centre
    R.line([[0,0,0],[0,.32,0]],{c:P.mute,w:1.2});R.ball([0,.42,0],.17,{c:P.c5});R.label([0,.42,0],'claim',{fs:12.5,b:1,c:P.c5,dy:-16,wide:1});
    // every abstract at distance 1 - cosine; a faint trail from where it started
    g.kinds.forEach((kd,j)=>{const a=ang[j],r=rad(c[j]),r0=rad(c0[j]),p=[Math.cos(a)*r,.1,Math.sin(a)*r];
      if(k>0)R.line([[Math.cos(a)*r0,.02,Math.sin(a)*r0],[p[0],.02,p[2]]],{c:KC[kd],w:1.2,a:.45});
      const al=k===3?(kd==='pos'||kd==='neg'?1:.3):1;
      R.ball(p,kd==='pos'?.16:kd==='neg'?.13:.09,{c:KC[kd],a:al})});
    // the loss at work: a pull on the labelled abstract, a push on the hard ones
    if(k===1||k===2){const jp=g.kinds.indexOf('pos'),ap=ang[jp],rp=rad(c[jp]);R.flow([[Math.cos(ap)*rp,.12,Math.sin(ap)*rp],[0,.3,0]],{c:P.good,a:.9,r:.06,speed:1});
      g.kinds.forEach((kd,j)=>{if(kd!=='neg')return;const r=rad(c[j]);R.flow([[0,.3,0],[Math.cos(ang[j])*r,.12,Math.sin(ang[j])*r]],{c:P.bad,a:.8,r:.05,speed:1})})}
    // the gap: the labelled abstract's ring against the nearest other abstract's ring
    if(k===3){const [m,best]=margin(c,g),r1=rad(c[0]),r2=rad(best),pts=circ(r1,.01).concat(circ(r2,.01).reverse());
      R.quad(pts,{fill:m>=0?P.good:P.bad,fa:.16*e,a:e,edge:false});R.line(circ(r1,.012),{c:P.good,w:2,a:e});R.line(circ(r2,.012),{c:P.bad,w:2,a:e,dash:[5,4]});
      R.label([0,.05,-Math.max(r1,r2)],'margin '+(m>=0?'+':'')+m.toFixed(3),{fs:13,b:1,mono:true,c:m>=0?P.good:P.bad,dy:-12,a:e})}
  }
  function readout(k){const A=lab.arms[arm],g=lab.groups[gi],f=Math.round(fAt(k,1)),c=A.frames[f][gi],c0=A.frames[0][gi],[m]=margin(c,g),[m0]=margin(c0,g),loss=A.loss[f];
    document.getElementById('emb-tl-ctr').innerHTML='<b>'+esc(lab.items[g.claim].text)+'</b><br>'+(f===0?'Before training (the starting model)':'After <b>'+A.steps[f]+'</b> training steps ('+esc(AN[arm]||arm)+')')+
      (loss!=null?', training loss <b>'+loss.toFixed(3)+'</b>':'')+'. Labelled abstract at cosine <b>'+c[0].toFixed(3)+'</b>'+(f>0?' (was '+c0[0].toFixed(3)+')':'')+'; margin <b>'+(m>=0?'+':'')+m.toFixed(3)+'</b>'+(f>0?' (was '+(m0>=0?'+':'')+m0.toFixed(3)+')':'')+'.'+
      '<br><span class="small">'+Object.keys(KN).map(kd=>'<span style="color:var(--'+({pos:'good',neg:'bad',other:'c1',rand:'mute'}[kd])+')">&#9679;</span> '+KN[kd]).join(' &nbsp; ')+'</span>';
    const rows=lab.groups.map((gg,i)=>{const mm=margin(A.frames[f][i],gg)[0];return {name:(i+1)+'. '+lab.items[gg.claim].text.slice(0,40),v:mm,txt:(mm>=0?'+':'')+mm.toFixed(3),color:mm>=0?'var(--good)':'var(--bad)',hl:i===gi}});
    const mxm=Math.max(.05,...rows.map(r=>Math.abs(r.v)));
    document.getElementById('emb-tl-bars').innerHTML='<div class="bars">'+rows.map(r=>{const w=50*Math.abs(r.v)/mxm;return '<div class="row'+(r.hl?' hl':'')+'"><div class="nm" title="'+esc(r.name)+'">'+esc(r.name)+'</div><div class="track"><div style="position:absolute;left:50%;top:0;bottom:0;border-left:1px solid var(--mute)"></div><div class="fill" style="left:'+(r.v>=0?50:50-w).toFixed(1)+'%;width:'+w.toFixed(1)+'%;background:'+r.color+'"></div></div><div class="val">'+r.txt+'</div></div>'}).join('')+'</div>'}
  let cur=0;
  const st=S3.stage({id:'stg-tl',list:'sx-tl',fig:'Fig. 4 · distance from the claim = 1 − cosine (exact)',cam:[.5,.95],bounds:[[-3.3,0,-3.3],[3.3,.5,3.3]],aspect:.74,dur:2600,hold:4800,draw,
    margin:w=>w<520?[12,8,12,8]:[16,16,16,16],onStep:k=>{cur=k;try{readout(k)}catch(x){}}});
  RD.seg(segEl,v=>{arm=v;st.list('sx-tl')});
  sel.addEventListener('change',()=>{gi=+sel.value;readout(cur);st.draw()});
  readout(0);
})();
