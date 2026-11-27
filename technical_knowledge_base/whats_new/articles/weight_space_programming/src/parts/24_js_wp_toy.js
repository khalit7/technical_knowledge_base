// ---- The live ingredient: Experiment 8's edit formula W <- W - alpha u (m * u^T W) on an illustrative toy MLP. ----
// 16 neurons write into a 6-number residual stream; u is the first axis (any unit direction works the same after a rotation).
// The values are made up to show the mechanism (labelled illustrative on the page); the arithmetic is exact.
(function(){
  if(!window.RD||!document.getElementById('wp-toy'))return;
  const $=id=>document.getElementById(id), t=RD.t, D=6, N=16;
  // u-components of each neuron's output column (u . w_j): neurons 0-3 are the "loop" writers; the rest write a little along u,
// so a productive context has some u-component of its own, which editing every column (a full projection) would also move
  const UW=[0.9,0.7,0.8,0.6, 0.12,0.1,0.15,0.08,0.11,0.09,0.13,0.1,0.12,0.08,0.1,0.14];
  // activations in two contexts: looping (loop neurons fire) and productive (they are quiet)
  const ACT={loop:[1.0,0.8,0.9,0.7, .3,.35,.25,.4,.3,.2,.35,.3,.25,.4,.3,.35],
             prod:[0.01,0.01,0.015,0.01, .35,.3,.4,.25,.35,.3,.2,.4,.3,.25,.35,.3]};
  const CHOSEN=[0,1,2,3];
  let alpha=0, mask='few';
  // the edit, per column: only its u-component changes, from c to (1 - alpha) c when the column is in the mask
  const edited=()=>UW.map((c,j)=>(mask==='all'||CHOSEN.includes(j))?(1-alpha)*c:c);
  const outU=(uw,a)=>uw.reduce((s,c,j)=>s+c*a[j],0);
  window.WPTOY={UW,ACT,CHOSEN,edit:(a,m)=>{const o=alpha,k=mask;alpha=a;mask=m;const e=edited(),r={loop:outU(e,ACT.loop),prod:outU(e,ACT.prod)};alpha=o;mask=k;return r}};
  function draw(){
    const el=$('wp-toysvg'),W=RD.width(el),L=10,R=W-10,top=18,h1=120,mid=top+h1/2;
    const e=edited(),cw=(R-L)/N,sc=(h1/2-6)/Math.max(...e.map(Math.abs),...UW.map(Math.abs),1e-9);
    let s=t(L,12,'each neuron\'s write along u',{fs:12,fill:'var(--mute)'});
    s+='<line x1="'+L+'" x2="'+R+'" y1="'+mid+'" y2="'+mid+'" stroke="var(--line)"/>';
    for(let j=0;j<N;j++){const x=L+j*cw+cw*.18,w=cw*.64,ch=(mask==='all'||CHOSEN.includes(j));
      const b=UW[j],a=e[j],y=v=>v>=0?mid-v*sc:mid,hh=v=>Math.abs(v)*sc;
      s+='<rect x="'+x+'" y="'+y(b)+'" width="'+w+'" height="'+Math.max(1,hh(b))+'" fill="none" stroke="var(--mute)" stroke-dasharray="3 2"/>';
      s+='<rect x="'+(x+w*.2)+'" y="'+y(a)+'" width="'+w*.6+'" height="'+Math.max(1,hh(a))+'" rx="2" fill="'+(ch?'var(--c2)':'var(--dim)')+'"/>';}
    s+=t(L+2*cw,top+h1+12,'loop neurons 1 to 4',{fs:11,a:'middle',fill:'var(--c2)'});
    // outputs along u for the two contexts, before and after
    const y0=top+h1+30,bh=16,ctx=[['looping context','loop'],['productive context','prod']];
    const vals=ctx.map(c=>[outU(UW,ACT[c[1]]),outU(e,ACT[c[1]])]),m=Math.max(...vals.flat().map(Math.abs),.5);
    const cx=L+(R-L)*.5,ox=v=>cx+v/m*(R-L)*.47;
    s+='<line x1="'+cx+'" x2="'+cx+'" y1="'+(y0-4)+'" y2="'+(y0+ctx.length*(2*bh+18))+'" stroke="var(--line)"/>';
    ctx.forEach((c,i)=>{const y=y0+i*(2*bh+18);s+=t(L,y+8,c[0]+': output along u',{fs:12,w:600});
      [[vals[i][0],'var(--mute)','before'],[vals[i][1],c[1]==='loop'?'var(--c2)':'var(--c6)','after']].forEach((q,k)=>{const yy=y+12+k*bh,x1=Math.min(cx,ox(q[0])),x2=Math.max(cx,ox(q[0]));
        s+='<rect x="'+x1+'" y="'+yy+'" width="'+Math.max(1,x2-x1)+'" height="'+(bh-4)+'" rx="2" fill="'+q[1]+'"/>'+t(q[0]>=0?cx-4:cx+4,yy+bh-5,q[2]+' '+q[0].toFixed(2),{fs:11.5,a:q[0]>=0?'end':'start',fill:'var(--mute)'})});});
    const H=y0+ctx.length*(2*bh+18)+4;
    el.innerHTML=RD.svg(W,H,s,'Toy MLP: each neuron write along u, and the output along u for two contexts');
    const nC=mask==='all'?N:CHOSEN.length;
    $('wp-toyout').innerHTML=RD.stat('weights changed',(nC*D)+' of '+(N*D),Math.round(100*nC/N)+'% of the columns')+
      RD.stat('looping output along u',vals[0][0].toFixed(2)+' → '+vals[0][1].toFixed(2),'')+
      RD.stat('productive output along u',vals[1][0].toFixed(2)+' → '+vals[1][1].toFixed(2),'')+
      RD.stat('output orthogonal to u','unchanged','at any α');
    $('wp-av').textContent=String(alpha);
    $('wp-an').textContent=alpha===0?'(no edit)':alpha===1?'(removes the direction)':alpha===6?'(Astra\'s choice)':alpha<1?'(shrinks it)':'(reverses it, '+(alpha-1)+'x)';
  }
  $('wp-a').addEventListener('input',e=>{alpha=+e.target.value;draw()});
  RD.seg($('wp-mask'),m=>{mask=m;draw()});
  RD.onRender(draw);RD.onResize(draw);draw();
})();
