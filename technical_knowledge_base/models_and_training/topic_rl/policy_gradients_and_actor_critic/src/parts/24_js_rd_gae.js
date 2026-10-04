// ---- Reading section 6: GAE computed backwards on one episode, A_t = delta_t + gamma lambda A_{t+1} (new on this page) ----
(function(){
  const E=window.PGE,$=id=>document.getElementById(id);
  const P=$('rd-gaP'),Q=$('rd-gaQ'),Tt=$('rd-gaT'),Xp=$('rd-gaX'),N=$('rd-gaN');if(!P)return;
  const Ls=$('rd-gaL'),Gs=$('rd-gaG'),Es=$('rd-gaE');
  const PRE={ex:{R:[0,0,1],V:[0.5,0.6,0.8],g:1,lam:0.95,err:0,name:'the worked example'},
    long:{R:[0,0,0,0,0,0,0,1],V:null,g:0.99,lam:0.95,err:0.3,name:'eight steps, one reward at the end'}};
  let pk='ex',res,R,V,T;
  function trueV(g){const out=[];for(let t=0;t<8;t++)out.push(Math.pow(g,7-t));return out}
  function compute(){const p=PRE[pk],lam=+Ls.value/100,g=+Gs.value/100,err=+Es.value/100;
    $('rd-gaLv').textContent=lam.toFixed(2);$('rd-gaGv').textContent=g.toFixed(2);$('rd-gaEv').textContent=RD.sg(err,2);
    R=p.R;V=(p.V||trueV(g)).map(v=>v+err);T=R.length;res=E.gae(R,V,g,lam);res.lam=lam;res.g=g;res.err=err}
  function draw(i){compute();const W=RD.width(P),H=170,l=34,r=10,t=14,b=30,cw=(W-l-r)/T;
    const all=res.d.concat(res.A,res.mcA,[0]);const lo=Math.min(...all)-0.05,hi=Math.max(...all)+0.05,Y=v=>t+(H-t-b)*(hi-v)/(hi-lo);
    let s='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(0)+'" y2="'+Y(0)+'" stroke="var(--line)"/>';
    s+=RD.t(l-4,Y(hi)+8,RD.n(hi,2),{a:'end',fs:9.5,fill:'var(--mute)'})+RD.t(l-4,Y(lo),RD.n(lo,2),{a:'end',fs:9.5,fill:'var(--mute)'});
    const done=k=>i>=1&&k>=T-i;// A_k is computed at animation step T-k
    for(let k=0;k<T;k++){const x=l+k*cw,bw=Math.min(22,cw*0.32),d=res.d[k],a=res.A[k];
      s+='<rect x="'+(x+cw*0.5-bw-1).toFixed(1)+'" y="'+Math.min(Y(0),Y(d)).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+Math.max(1,Math.abs(Y(d)-Y(0))).toFixed(1)+'" fill="var(--mute)" opacity=".55"/>';
      if(done(k))s+='<rect x="'+(x+cw*0.5+1).toFixed(1)+'" y="'+Math.min(Y(0),Y(a)).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+Math.max(1,Math.abs(Y(a)-Y(0))).toFixed(1)+'" fill="'+(k===T-i?'var(--c2)':'var(--c1)')+'"/>';
      s+='<line x1="'+(x+cw*0.5-bw-3)+'" x2="'+(x+cw*0.5+bw+3)+'" y1="'+Y(res.mcA[k]).toFixed(1)+'" y2="'+Y(res.mcA[k]).toFixed(1)+'" stroke="var(--c3)" stroke-width="2" stroke-dasharray="3 2"/>';
      s+=RD.t(x+cw/2,H-16,'t = '+k,{a:'middle',fs:10,fill:'var(--mute)'})+RD.t(x+cw/2,H-4,'r = '+R[k],{a:'middle',fs:9.5,fill:'var(--mute)'})}
    P.innerHTML=RD.svg(W,H,s,'TD errors and GAE advantages per step')+'<div class="leg"><span><i style="background:var(--mute);opacity:.55"></i>TD error δ<sub>t</sub></span><span><i style="background:var(--c1)"></i>GAE advantage Â<sub>t</sub></span><span><i class="ln" style="background:var(--c3)"></i>return minus V (λ = 1)</span></div>';
    // A_0 against lambda
    const W2=RD.width(Q),H2=120,l2=34,r2=10,t2=10,b2=22;const cv=[];for(let k=0;k<=100;k++)cv.push(E.gae(R,V,res.g,k/100).A[0]);
    const lo2=Math.min(...cv,0)-0.03,hi2=Math.max(...cv,0)+0.03,X2=v=>l2+(W2-l2-r2)*v,Y2=v=>t2+(H2-t2-b2)*(hi2-v)/(hi2-lo2);
    let q='<line x1="'+l2+'" x2="'+(W2-r2)+'" y1="'+Y2(0)+'" y2="'+Y2(0)+'" stroke="var(--line)"/>';
    q+='<polyline fill="none" stroke="var(--c1)" stroke-width="2.2" points="'+cv.map((v,k)=>X2(k/100).toFixed(1)+','+Y2(v).toFixed(1)).join(' ')+'"/>';
    q+='<circle cx="'+X2(res.lam)+'" cy="'+Y2(res.A[0])+'" r="5" fill="var(--c2)"/>';
    q+=RD.t(l2,H2-6,'λ = 0 (TD error)',{fs:10,fill:'var(--mute)'})+RD.t(W2-r2,H2-6,'λ = 1 (return minus V)',{a:'end',fs:10,fill:'var(--mute)'});
    q+=RD.t(l2-4,Y2(hi2)+8,RD.n(hi2,2),{a:'end',fs:9.5,fill:'var(--mute)'})+RD.t(l2-4,Y2(lo2),RD.n(lo2,2),{a:'end',fs:9.5,fill:'var(--mute)'});
    Q.innerHTML=RD.svg(W2,H2,q,'First advantage against lambda');
    const gl=res.g*res.lam;
    if(i===0){Tt.textContent='Step 0: one TD error per step';Xp.innerHTML='δ<sub>t</sub> = r<sub>t</sub> + γV(s<sub>t+1</sub>) − V(s<sub>t</sub>), with V = 0 after the last step: '+res.d.map((d,k)=>'δ<sub>'+k+'</sub> = '+RD.n(d,3)).join(', ')+'. Each one needs only one real reward and the critic.'}
    else{const k=T-i,nx=k+1<T?res.A[k+1]:0;Tt.textContent='Step '+i+': Â'+String.fromCharCode(8320+Math.min(9,k))+' from the step after it';
      Xp.innerHTML='Â<sub>'+k+'</sub> = δ<sub>'+k+'</sub> + γλ Â<sub>'+(k+1)+'</sub> = '+RD.n(res.d[k],3)+' + '+RD.n(gl,4)+' × '+RD.n(nx,4)+' = <b>'+RD.n(res.A[k],4)+'</b>'+(k+1<T?'':' (nothing follows the last step)')+'. One backward pass gives every advantage; the green dashes are the λ = 1 values, return minus V'+(k===0?'. Unrolled: Â<sub>0</sub> = Σ (γλ)<sup>l</sup> δ<sub>l</sub> = '+res.parts0.map(x=>RD.n(x,3)).join(' + ')+'.':'.')}
    N.innerHTML=RD.stat('Â₀ at this λ',RD.n(res.A[0],4),'γλ = '+RD.n(gl,4))+RD.stat('Â₀ at λ = 0',RD.n(res.d[0],4),'one TD error')+RD.stat('Â₀ at λ = 1',RD.n(res.mcA[0],4),'return '+RD.n(res.G[0],3)+' minus V '+RD.n(V[0],3))+
      RD.stat('Critic error',RD.sg(res.err,2),pk==='long'?'true advantage is 0 here':'added to every V')}
  const an=RD.anim({card:'rd-ga',ctl:'rd-gaC',n:4,ms:1300,draw,label:'Step'});
  function setPre(k){pk=k;const p=PRE[k];Ls.value=Math.round(p.lam*100);Gs.value=Math.round(p.g*100);Es.value=Math.round(p.err*100);
    [...$('rd-gaM').children].forEach(x=>x.classList.toggle('on',x.dataset.p===k));compute();an.reset(T+1)}
  $('rd-gaM').addEventListener('click',e=>{const b=e.target.closest('button');if(b)setPre(b.dataset.p)});
  [Ls,Gs,Es].forEach(x=>x.addEventListener('input',()=>an.redraw()));RD.onResize(()=>an.redraw());
  setPre('ex');
})();
