// ---- Reading: alignment and uniformity on the circle, before/after (InfoNCE against positives only) ----
(function(){
  const card=document.getElementById('sp-card');if(!card||!window.CSD)return;
  const T=CSD.ts,$=id=>document.getElementById(id),S=T.snap_steps,lab=T.labels;
  const st={l:'infonce_t05'};
  const ang={};for(const k in T.runs)ang[k]=T.runs[k].ang.map(b=>{const s=atob(b),a=new Uint8Array(s.length);for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i);return a});
  const dark=()=>matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches;
  const hue=c=>'hsl('+(c*36+8)+','+(dark()?'62%,62%':'62%,42%')+')';
  const U_IDEAL=Math.log(Math.exp(-4)*11.301921952136330); // log(e^-4 I0(4)): uniform on the circle, t = 2
  function circle(k,i,el,cnt){
    const W=Math.min(RD.width(el),330),c=W/2,R=W/2-26,a=ang[k][i],s=T.runs[k].snaps[i];
    let h='<circle cx="'+c+'" cy="'+c+'" r="'+R+'" fill="none" stroke="var(--line)" stroke-width="1.5"/>';
    for(let j=0;j<a.length;j++){const t=a[j]/256*2*Math.PI,r=R+(lab[j]-4.5)*2.2;
      h+='<circle cx="'+(c+r*Math.cos(t)).toFixed(1)+'" cy="'+(c-r*Math.sin(t)).toFixed(1)+'" r="3.2" fill="'+hue(lab[j])+'" fill-opacity=".8"/>'}
    el.innerHTML=PF.svg(W,W,'200 test digits on the unit circle, '+k,h);
    cnt.innerHTML=RD.stat('alignment ↓',s.align.toFixed(3),'two views of a digit, mean squared distance')+RD.stat('uniformity ↓',s.unif.toFixed(3),'perfectly even circle: '+U_IDEAL.toFixed(3))+
      RD.stat('5-NN accuracy',(100*s.knn).toFixed(0)+'%','digit class, chance 10%');
  }
  const CAP=[
    ['Random initialisation','Spread out but meaningless: the untrained encoder puts two augmented views of the same digit almost anywhere on the circle (alignment near 2, the value for unrelated points). Both runs start from the same weights.'],
    ['Alignment wins first, on both sides','Pulling the two views together is the easy direction, and in the first few dozen steps both runs shrink towards a point. Here InfoNCE collapses too, briefly.'],
    ['The negatives push back','Once every digit sits close to every other, each negative carries a large share of the softmax, so InfoNCE\'s push apart dominates and the left run re-expands. Nothing pushes on the right.'],
    ['Uniformity separates them','The left spreads round the circle, with digits of a class tending to land together although no label was used. The right has collapsed: perfect alignment, uniformity 0, and useless.']];
  function draw(i){
    circle(st.l,i,$('sp-l'),$('sp-lc'));circle('pos_only',i,$('sp-r'),$('sp-rc'));
    const q=S[i]===0?0:S[i]<=51?1:S[i]<=293?2:3;
    $('sp-cap').innerHTML='<div class="t">Step '+S[i].toLocaleString('en-US')+' of '+T.steps.toLocaleString('en-US')+': '+CAP[q][0]+'</div>'+CAP[q][1];
    $('sp-hl').innerHTML='InfoNCE, τ = '+T.runs[st.l].cfg.tau+' <small>negatives push apart</small>';
  }
  const A=RD.anim({card:'sp-card',ctl:'sp-ctl',n:S.length,draw,ms:700,label:'Training snapshot'});
  $('sp-seg').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;st.l=b.dataset.k;
    [...$('sp-seg').querySelectorAll('button')].forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b)});A.reset(S.length);A.play()});
  $('sp-leg').innerHTML=[...Array(10).keys()].map(c=>'<span><i style="background:'+hue(c)+'"></i>'+c+'</span>').join('');
  addEventListener('resize',()=>{if(card.offsetParent)A.redraw()});
})();
