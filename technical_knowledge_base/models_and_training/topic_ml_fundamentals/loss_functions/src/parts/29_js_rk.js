// ---- Reading, ranking: one list of ten documents, RankNet's lambdas against LambdaRank's (toggle-compare on one input) ----
(function(){
  const card=document.getElementById('rk-card');if(!card)return;
  const $=id=>document.getElementById(id);
  const N=10,S=[...Array(N)].map((_,i)=>+(2-0.4*i).toFixed(2));
  let pos=10;
  const labels=()=>S.map((_,i)=>(i===1||i===pos-1)?1:0);
  function panel(el,lam,l){
    const W=Math.max(220,Math.min(420,RD.width(el))),rowH=21,H=N*rowH+20,x0=58,x1=W-8,mid=x0+(x1-x0)*0.42,R=(x1-mid),L=(mid-x0);
    const mx=Math.max(...lam.map(Math.abs))||1;let s='<line x1="'+mid+'" x2="'+mid+'" y1="2" y2="'+(H-16)+'" stroke="var(--dim)"/>';
    lam.forEach((v,i)=>{const y=2+i*rowH,u=-v/mx,w=(u>=0?R:L)*Math.abs(u)*0.92,rel=l[i]>0;
      s+=RD.t(x0-6,y+14,'#'+(i+1)+(rel?' rel':''),{a:'end',fill:rel?'var(--ink)':'var(--mute)',w:rel?600:null});
      s+='<rect x="'+(u>=0?mid:mid-w)+'" y="'+(y+3)+'" width="'+Math.max(0.5,w)+'" height="'+(rowH-7)+'" rx="2" fill="'+(rel?'var(--c1)':'var(--c2)')+'"/>'});
    s+=RD.t(mid-4,H-3,'← down',{a:'end',fill:'var(--mute)'})+RD.t(mid+4,H-3,'up →',{fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,s,'Push on each document score');
  }
  function draw(){
    const l=labels(),a=LF.lambdas(S,l,1,false),b=LF.lambdas(S,l,1,true),lo=pos-1;
    $('rk-pv').textContent=pos;panel($('rk-a'),a.lam,l);panel($('rk-b'),b.lam,l);
    const r=(x,y)=>(x/y).toFixed(2);
    $('rk-out').innerHTML=RD.stat('wrong pairs, NDCG',a.errs+', '+a.ndcg.toFixed(3),'of '+a.pairs+' pairs')+
      RD.stat('push on rank 2 / rank '+pos,r(a.lam[1],a.lam[lo])+' → '+r(b.lam[1],b.lam[lo]),'RankNet → LambdaRank')+
      RD.stat('push down on rank 1 / up on rank '+pos,r(-a.lam[0],a.lam[lo])+' → '+r(-b.lam[0],b.lam[lo]),'RankNet → LambdaRank');
  }
  $('rk-p').addEventListener('input',e=>{pos=+e.target.value;draw()});
  RD.onRender(draw);RD.onResize(draw);draw();
})();
