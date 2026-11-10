// ---- Scene (hero, Fig. 1): the first 8 pairs of the real batch as a cosine bar field, BERT before and after SimCSE (renderer v2) ----
// Everything drawn is CSD.rb.M (src/real_embeddings.py via mk_data.py): the real cosine between anchor i and candidate j, x1000.
// Rows are anchors (depth), columns candidates; bar height is the cosine; the diagonal is each anchor's own paraphrase.
// Step 2 streams anchor 7's comparison to every candidate, as dense as its softmax at tau 0.05; step 3 morphs every bar to SimCSE's cosines.
// The step list's numbers are static spans (data-hr) written here from the same data; check_stages.mjs compares them.
(function(){
  const $=id=>document.getElementById(id);if(!$('stg-hr')||!window.S3||!window.CSD)return;const {at,off,lerp,mix}=S3;
  const D=CSD.rb,N0=D.s1.length,n=8,ROW=6,H=2.1,G=.95;
  const cos=(m,i,j)=>D.M[m][i*N0+j]/1000;
  const stats=m=>{let pos=0,neg=0;for(let i=0;i<n;i++)for(let j=0;j<n;j++){if(i===j)pos+=cos(m,i,j);else neg+=cos(m,i,j)}return {pos:pos/n,neg:neg/(n*(n-1))}};
  const soft=(m,i,tau)=>{const z=[...Array(n).keys()].map(j=>cos(m,i,j)/tau),mx=Math.max(...z),e=z.map(v=>Math.exp(v-mx)),s=e.reduce((a,b)=>a+b,0);return e.map(v=>v/s)};
  const hardest=(m,i)=>{let b=-1,v=-9;for(let j=0;j<n;j++)if(j!==i&&cos(m,i,j)>v){v=cos(m,i,j);b=j}return [b,v]};
  const S={bert:stats('bert'),simcse:stats('simcse')},PB=soft('bert',ROW,.05),PS=soft('simcse',ROW,.05),HB=hardest('bert',ROW);
  const F={bpos:S.bert.pos.toFixed(2),bneg:S.bert.neg.toFixed(2),spos:S.simcse.pos.toFixed(2),sneg:S.simcse.neg.toFixed(2),
    row:String(ROW+1),hard:String(HB[0]+1),hcos:HB[1].toFixed(2),rpos:cos('bert',ROW,ROW).toFixed(2),pb:Math.round(100*PB[ROW])+'%',ps:Math.round(100*PS[ROW])+'%'};
  document.querySelectorAll('[data-hr]').forEach(e=>{e.textContent=F[e.dataset.hr]!=null?F[e.dataset.hr]:'?'});
  const x=j=>(j-(n-1)/2)*G,z=i=>(i-(n-1)/2)*G;
  function draw(R,k,e){const P=R.P;R.grid(-4.6,4.6,-4.6,4.6,.5);
    const t=at(k,e,2),lit=at(k,e,1);           // t: BERT -> SimCSE; lit: the diagonal stands out
    const pos=P.acc,neg=mix(P.paper,P.c2,.5);
    for(let i=0;i<n;i++)for(let j=0;j<n;j++){const v=lerp(cos('bert',i,j),cos('simcse',i,j),t),d=i===j,hgt=Math.max(.02,v*H);
      const rowOn=k===1&&i===ROW,a=d?1:k===1?(rowOn?1:lerp(1,.28,e)):k===2?lerp(.28,1,e):1;
      R.box([x(j),0,z(i)],[G*.62,hgt,G*.62],{fill:d?mix(neg,pos,lit):neg,a,shadow:false,lw:.7});
      if(d&&k>=1)R.label([x(j),hgt,z(i)],v.toFixed(2).replace(/^0/,''),{mono:true,fs:12,dy:-10,b:1,c:P.acc,a:lit})}
    // row and column numbers along two edges
    for(let q=0;q<n;q++){R.label([x(q),0,z(n-1)+G*.85],(q?'':'candidate ')+String(q+1),{mono:true,fs:12,c:P.mute});R.label([x(0)-G*.85,0,z(q)],(q?'':'anchor ')+String(q+1),{mono:true,fs:12,al:'right',c:q===ROW&&k===1?P.ink:P.mute,b:q===ROW&&k===1})}
    // step 2: anchor 7 is compared with every candidate; the stream to each is as dense as the softmax puts there (tau 0.05)
    const fa=k===1?e:k===2?1:0;
    if(fa>0){const p=k===2?PB.map((v,j)=>lerp(v,PS[j],t)):PB,src=[x(0)-G*.55,.35,z(ROW)];
      for(let j=0;j<n;j++){if(p[j]<.01)continue;const tg=[x(j),lerp(cos('bert',ROW,j),cos('simcse',ROW,j),t)*H+.08,z(ROW)];
        R.flowArc(src,tg,.35+.04*j,{c:j===ROW?P.acc:P.c2,a:fa*(.3+.7*Math.min(1,p[j]*2.5)),r:.04+.05*p[j],n:Math.max(2,Math.round(2+p[j]*14)),speed:1.2})}}
    // the means, read off this field
    const m=t<.5?'bert':'simcse',ms=S[m],nm=t<.5?'BERT, masked-LM only':'after SimCSE';
    R.label([x(0)-G*.5,H*1.25,z(0)-G*.6],R.W<520?(t<.5?'BERT':'SimCSE')+' · pos '+ms.pos.toFixed(2)+' · neg '+ms.neg.toFixed(2):nm+' · positives '+ms.pos.toFixed(2)+' · negatives '+ms.neg.toFixed(2),{mono:true,fs:12.5,b:1,al:'left',c:P.ink})
  }
  const st=S3.stage({id:'stg-hr',list:'sx-hr',fig:'Fig. 1 · eight real sentence pairs, cosine as height',cam:[.62,.62],bounds:[[-4.4,0,-4.4],[4,2.7,4.6]],aspect:.78,dur:1700,hold:4400,draw,
    margin:w=>w<520?[24,10,10,10]:[30,16,12,16],
    view:k=>k===1?{cam:[.5,.5],bounds:[[-4.4,0,-1.6],[4,2.2,4.4]]}:null});
  const pr=$('hr-pairs');if(pr)pr.innerHTML='<ol style="margin:4px 0;padding-left:22px">'+[...Array(n).keys()].map(i=>'<li>'+RD.esc(D.s1[i])+' <span class="mute">/</span> '+RD.esc(D.s2[i])+'</li>').join('')+'</ol>';
})();
