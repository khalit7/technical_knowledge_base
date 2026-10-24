// ---- The hero figure (top of Reading): one real wrong answer, one score at its end, and the credit each method hands its tokens ----
// Static: drawn once per width, no controls. PPO row: GAE with gamma = lambda = 1 and the KL left out, so A_t = R - V(s_t) = -V(s_t),
// with V measured by 16 continuations from each cut point (src/rollouts/mc_values.py). GRPO and Dr. GRPO rows: the real group of 16.
(function(){
  const E=window.LLE,D=window.LLD,P=document.getElementById('rd-heroP');
  if(!P||!E||!D)return;
  const f=D.feat.find(x=>!x.pass)||D.feat[0],g=D.groups[f.g],T=f.L;
  const vAt=t=>{const c=f.cuts,v=f.vpass;if(t<=c[0])return v[0];for(let j=1;j<c.length;j++)if(t<=c[j]){const a=(t-c[j-1])/(c[j]-c[j-1]);return v[j-1]*(1-a)+v[j]*a}return v[v.length-1]};
  const V=[];for(let t=0;t<T;t++)V.push(vAt(t));
  const R=f.pass,rew=new Array(T).fill(0);rew[T-1]=R;
  const Appo=E.gae(rew,V,1,1),gr=E.groupAdv(g.r,'grpo'),dr=E.groupAdv(g.r,'drgrpo');
  const rows=[['RLHF with PPO: Â = R − V(prefix), differs per token',Appo,'var(--c4)'],
    ['GRPO: (r − group mean) / std, same on every token',new Array(T).fill(gr.A[f.i]),'var(--c2)'],
    ['Dr. GRPO: r − group mean, same on every token',new Array(T).fill(dr.A[f.i]),'var(--c5)']];
  // the stretch where the critic's estimate fell most
  let b=1;for(let j=2;j<f.vpass.length;j++)if(f.vpass[j-1]-f.vpass[j]>f.vpass[b-1]-f.vpass[b])b=j;
  function draw(){const W=RD.width(P),l=4,r=4,X=k=>l+(W-l-r)*k/T,bw=Math.max(0.5,(W-l-r)/T-0.25);
    const m=Math.max(...rows.map(x=>Math.max(...x[1].map(Math.abs)))),bh=46;let s='',y=16;
    s+=RD.t(l,y-4,'The answer, '+T+' tokens; reward 0 on all but the last',{fs:11,w:600});
    s+='<rect x="'+l+'" y="'+y+'" width="'+(W-l-r)+'" height="10" fill="var(--soft)" stroke="var(--line)"/>';
    s+='<rect x="'+(X(T-1)-1).toFixed(1)+'" y="'+(y-2)+'" width="'+Math.max(4,bw+2).toFixed(1)+'" height="14" fill="var(--bad)"/>';
    s+=RD.t(W-r,y+26,'verifier: '+R+' (wrong)',{a:'end',fs:11,fill:'var(--bad)',w:600});
    s+='<rect x="'+X(f.cuts[b-1]).toFixed(1)+'" y="'+y+'" width="'+(X(f.cuts[b])-X(f.cuts[b-1])).toFixed(1)+'" height="10" fill="var(--c4)" opacity=".45"/>';
    y+=44;
    rows.forEach(([lab,A,col],k)=>{s+=RD.t(l,y-5,lab,{fs:11,w:600,fill:col});
      s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/>';
      A.forEach((a,t)=>{if(!a)return;const h=bh*Math.abs(a)/m;s+='<rect x="'+X(t).toFixed(2)+'" y="'+(a<0?y:y-h).toFixed(1)+'" width="'+bw.toFixed(2)+'" height="'+Math.max(0.6,h).toFixed(1)+'" fill="'+col+'"/>'});
      const a0=A[0];s+=RD.t(W-r,y+bh*Math.abs(Math.min(...A))/m+13,k?'Â = '+RD.n(a0,3)+' on all '+T:'from '+RD.n(Math.min(...A),2)+' to '+RD.n(Math.max(...A),2),{a:'end',fs:11,fill:'var(--mute)'});
      if(!k){const xa=X(f.cuts[b-1]),xb=X(f.cuts[b]);s+='<line x1="'+((xa+xb)/2).toFixed(1)+'" x2="'+((xa+xb)/2).toFixed(1)+'" y1="'+(y-44)+'" y2="'+(y-2)+'" stroke="var(--c4)" stroke-dasharray="2 2"/>'}
      y+=bh+40});
    P.innerHTML=RD.svg(W,y-22,s,'One wrong answer: per-token credit under PPO, GRPO and Dr. GRPO')}
  RD.onRender(draw);RD.onResize(draw);draw();
})();
