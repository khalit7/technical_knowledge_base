// ---- Reading section 8: one search path with the real rules (AlphaZero) or the learned model (MuZero) ----
(function(){
  const card=document.getElementById('rd-mz');if(!card)return;
  let mode='mu';const P=document.getElementById('rd-mzP'),T=document.getElementById('rd-mzT'),X=document.getElementById('rd-mzX');
  const NF=8;
  // three positions along a search path (tic-tac-toe, for the AlphaZero view)
  const B=[[-1,0,0,1,1,0,0,0,0],[-1,0,0,1,1,-1,0,0,0],[-1,0,0,1,1,-1,1,0,0]];
  // fixed shades for the hidden-state strips (a picture of "some vector", not real activations)
  const shade=(k,i)=>{const v=Math.abs(Math.sin(12.9898*(k+1)+78.233*(i+1))*43758.5453)%1;return Math.round(15+65*v)};
  function strip(x,y,w,h,k,on){let s='';const n=8,cw=w/n;for(let i=0;i<n;i++)s+='<rect x="'+(x+i*cw).toFixed(1)+'" y="'+y+'" width="'+(cw-1).toFixed(1)+'" height="'+h+'" fill="color-mix(in srgb, var(--c4) '+shade(k,i)+'%, var(--bg))" stroke="var(--line)"/>';return '<g opacity="'+(on?1:.35)+'">'+s+'</g>'}
  function mini(x,y,cs,b,on,last){let s='';for(let i=0;i<9;i++){const cx=x+(i%3)*cs,cy=y+Math.floor(i/3)*cs;s+='<rect x="'+cx+'" y="'+cy+'" width="'+cs+'" height="'+cs+'" fill="var(--bg)" stroke="var(--line)"/>';
    if(b[i])s+=RD.t(cx+cs/2,cy+cs*.72,b[i]===1?'X':'O',{a:'middle',fs:Math.round(cs*.62),w:700,fill:b[i]===1?'var(--c2)':'var(--c1)'});if(last===i)s+='<rect x="'+(cx+1.5)+'" y="'+(cy+1.5)+'" width="'+(cs-3)+'" height="'+(cs-3)+'" fill="none" stroke="var(--c5)" stroke-width="2"/>'}
    return '<g opacity="'+(on?1:.35)+'">'+s+'</g>'}
  const arrow=(x1,y1,x2,y2,on)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="var(--ink)" stroke-width="1.4" opacity="'+(on?.9:.3)+'" marker-end="url(#mzA)"/>';
  const CAP={
    mu:[['Representation: observations to a hidden root state','h encodes the observations up to now (in Atari, the last 32 frames and actions) into s⁰. Nothing forces s⁰ to look like the screen or the true state: it is whatever vector makes later predictions right.'],
      ['Prediction at the root','f(s⁰) gives a move prior p⁰ and a value v⁰, as AlphaZero\'s network does from a real position. The search starts here.'],
      ['Dynamics: the learned model takes the step','The search picks a¹ by PUCT. Instead of asking the rules, it calls g(s⁰, a¹), which returns a predicted reward r¹ and the next hidden state s¹. No observation is predicted.'],
      ['Prediction at the new node','f(s¹) gives p¹ (the prior for the next choice) and v¹. Each simulation expands one new node this way.'],
      ['One more step','g(s¹, a²) gives r² and s², and f(s²) gives p², v². In Atari the search does 50 simulations per move; in board games 800.'],
      ['Backup with rewards and discounting','The leaf value is backed up with the predicted rewards: from the root, r¹ + γ r² + γ² v². Q values are rescaled to [0, 1] by the smallest and largest seen in the tree, because Atari values are unbounded.'],
      ['Act in the real environment','After all simulations the root\'s visit counts give the search policy π; MuZero acts by it, and the next observation comes from the real environment. The model is only ever used inside the search.'],
      ['Training: unroll K = 5 steps along what really happened','From a stored trajectory, h encodes the observations at time t; g is then applied with the actions actually taken. At every unrolled step k, the predictions are pulled towards real targets: r<sup>k</sup> to the observed reward u<sub>t+k</sub>, v<sup>k</sup> to the n-step return z<sub>t+k</sub> (n = 10 in Atari), p<sup>k</sup> to the visit distribution π<sub>t+k</sub> of the search run at real step t+k. Gradients flow through all of h, g and f.']],
    az:[['The root is the real position','AlphaZero needs no representation function: the search starts from the actual position (here a tic-tac-toe board standing in for a Go or chess position).'],
      ['Prediction at the root','The network f(s) gives a move prior p and a value v for the position.'],
      ['The rules take the step','The search picks a move by PUCT and applies the real rules: the next node is exactly the position that move produces. In board games there is no intermediate reward.'],
      ['Prediction at the new node','The network evaluates the new position: a prior for the next choice and a value. No rollout is played.'],
      ['One more step','The rules again give the exact next position, and the network evaluates it.'],
      ['Backup','The leaf value is backed up the path with alternating sign (two players), giving each edge its mean value Q and visit count N.'],
      ['Act','The root\'s visit counts give π; the move is played (sampled from π early in self-play games, the most visited later).'],
      ['Training: one real position at a time','For each position of the finished game: p is pulled towards the search policy π at that position, v towards the game\'s result z. The rules need no training, and no step of the model can be wrong.']]};
  function draw(i){const W=Math.min(RD.width(P),620),mu=mode==='mu';let s='<defs><marker id="mzA" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--ink)"/></marker></defs>';
    const nx=8,nw=Math.min(190,W*0.36),cs=Math.round(Math.min(28,nw/3/1.25)),rowH=Math.max(90,cs*3+48),y0=24,ox=nx+nw+Math.max(18,W*0.05),labW=W-ox;
    const ys=[y0,y0+rowH,y0+2*rowH,y0+3*rowH];
    // row 0: observations (MuZero) or the real position (AlphaZero)
    s+=RD.t(nx,12,mu?'observations o₁ ... o_t':'real position s',{fs:10.5,fill:'var(--mute)'});
    if(mu){for(let k=0;k<3;k++)s+=mini(nx+k*(cs*2.4+8),ys[0],cs*0.8,B[0],i>=0);
      s+=arrow(nx+nw/2,ys[0]+cs*2.5,nx+nw/2,ys[1]-4,i===0)+RD.t(nx+nw/2+8,(ys[0]+ys[1])/2+12,'h',{fs:12,w:700,fill:i===0?'var(--ink)':'var(--mute)'})}
    const nodeY=k=>mu?ys[k+1]:ys[k];
    const nodes=mu?3:3;
    for(let k=0;k<nodes;k++){const shown=i>=[0,2,4][k],on=[[0,1],[2,3],[4]][k].includes(i)||(i>=5&&i<=7);if(!shown)continue;const y=nodeY(k);
      if(mu)s+=strip(nx,y,nw,24,k,on)+RD.t(nx,y-4,'s'+['⁰','¹','²'][k]+' (hidden)',{fs:10,fill:'var(--mute)'});
      else s+=mini(nx,y,cs,B[k],on,k?[0,5,6][k]:null)+RD.t(nx+cs*3+6,y+10,k?'s'+['','₁','₂'][k]+' = rules(s, a)':'s',{fs:10,fill:'var(--mute)'});
      // prediction outputs
      const pk=['⁰','¹','²'][k],showP=i>=[1,3,4][k];
      if(showP){const yy=y+(mu?16:cs*1.5+4),onp=[1,3,4][k]===i||i===5;
        s+=arrow(nx+nw+4,yy-4,ox-6,yy-4,onp)+RD.t(ox,yy,'f → p'+(mu?pk:'')+', v'+(mu?pk:''),{fs:11.5,w:onp?700:400,fill:onp?'var(--ink)':'var(--mute)'})}
      // dynamics arrow to the next node
      if(k<2&&i>=[2,4][k]){const y1=y+(mu?24:cs*3)+4,y2=nodeY(k+1)-14,on2=i===[2,4][k];
        s+=arrow(nx+nw/2,y1,nx+nw/2,y2,on2)+RD.t(nx+nw/2+8,(y1+y2)/2+4,mu?'g(s'+pk+', a'+['¹','²'][k]+') → r'+['¹','²'][k]+', s'+['¹','²'][k]:'rules: play a'+['¹','²'][k],{fs:11,w:on2?700:400,fill:on2?'var(--ink)':'var(--mute)'})}}
    // side notes for backup, act, train
    const ny=nodeY(2)+rowH-6;
    if(i===5)s+=RD.t(nx,ny,mu?'G = r¹ + γ r² + γ² v²  (backed up to the root)':'value backed up with alternating sign',{fs:12,w:700,fill:'var(--c1)'});
    if(i===6)s+=RD.t(nx,ny,'visit counts at the root → π → act in the real environment',{fs:12,w:700,fill:'var(--c1)'});
    if(i===7){const lines=mu?['targets at each unrolled step k (K = 5):','r^k ← u_(t+k), observed reward','v^k ← z_(t+k), n-step return (n = 10, Atari)','p^k ← π_(t+k), real search\'s visit distribution']:['targets at each real position:','p ← π, the search\'s visit distribution','v ← z, the game\'s result'];
      lines.forEach((l,j)=>{s+=RD.t(nx,ny+j*15,l.replace(/\^k/g,'ᵏ').replace(/_\(t\+k\)/g,'ₜ₊ₖ'),{fs:11.5,w:j?400:700,fill:j?'var(--ink)':'var(--c1)'})})}
    const H=ny+(i===7?(mu?4:3)*15:14)+6;
    P.innerHTML=RD.svg(W,H,s,mu?'MuZero search path in a learned latent model':'AlphaZero search path with the real rules');
    const c=CAP[mode][i];T.textContent=(i+1)+'. '+c[0];X.innerHTML=c[1]}
  const an=RD.anim({card:'rd-mz',ctl:'rd-mzC',n:NF,draw,ms:2600,label:'Step'});
  document.getElementById('rd-mzM').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    document.querySelectorAll('#rd-mzM button').forEach(x=>x.classList.toggle('on',x===b));mode=b.dataset.m;an.redraw()});
  RD.onResize(()=>an.redraw());
})();
