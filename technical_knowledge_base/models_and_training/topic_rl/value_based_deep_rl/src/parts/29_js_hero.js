// ---- Hero: DQN's training loop as a static annotated diagram, with the place each later fix acts (blue tags) ----
// Drawn at the measured width: three columns from 600 px, two columns below.
(function(){
  const el=document.getElementById('vb-heroD');if(!el)return;
  const N={
    env:{t:['Atari emulator','4 stacked 84 × 84 frames']},
    act:{t:['Act: argmax Q(s, ·; θ)','ε-greedy, ε 1.0 to 0.1'],g:['NoisyNet §9: noisy weights']},
    rep:{t:['Replay buffer','last 1M (s, a, r, s′)'],g:['Multi-step §7: n rewards'],a:1},
    mb:{t:['Minibatch of 32','sampled uniformly'],g:['Prioritised §6: by |δ|']},
    on:{t:['Online network θ','outputs Q(s, a; θ)'],g:['Dueling §5: V + A head','Distributional §8: atoms']},
    tg:{t:['Target network θ⁻','y = r + γ max Q(s′, ·; θ⁻)'],g:['Double §4: θ picks, θ⁻ values'],a:1},
    ls:{t:['Loss (y − Q)², Huber','gradient step on θ']}};
  const WIDE={env:[0,0],act:[1,0],rep:[2,0],on:[1,1],mb:[2,1],ls:[0,2],tg:[1,2]};
  const NARROW={env:[0,0],act:[1,0],rep:[1,1],mb:[1,2],on:[0,3],tg:[1,3],ls:[0,4]};
  const EW=[['env','act','s'],['act','rep','store'],['rep','mb','sample'],['mb','on','s, a'],['mb','tg','r, s′'],['on','tg','copy every C'],['on','act','acts on Q'],['tg','ls','y'],['on','ls','Q, then ∇θ']];
  const EN=[['env','act',''],['act','rep','store'],['rep','mb','sample'],['mb','on','s, a'],['mb','tg','r, s′'],['on','tg',''],['tg','ls','y'],['on','ls','Q, ∇θ']];
  function draw(){
    const W=RD.width(el),wide=W>=600,P=wide?WIDE:NARROW,E=wide?EW:EN,cols=wide?3:2;
    const gx=wide?56:30,bw=(W-gx*(cols-1)-4)/cols,LH=15,gy=wide?46:40;
    const rows=Math.max(...Object.values(P).map(p=>p[1]))+1;const rh=[];
    for(let r=0;r<rows;r++)rh[r]=Math.max(...Object.keys(P).filter(k=>P[k][1]===r).map(k=>(N[k].t.length+(N[k].g||[]).length)*LH+12));
    const ry=[2];for(let r=1;r<rows;r++)ry[r]=ry[r-1]+rh[r-1]+gy;const H=ry[rows-1]+rh[rows-1]+4;
    const box={};Object.keys(P).forEach(k=>{const [c,r]=P[k];const h=(N[k].t.length+(N[k].g||[]).length)*LH+12;box[k]={x:2+c*(bw+gx),y:ry[r]+(rh[r]-h)/2,w:bw,h}});
    let s='<defs><marker id="vb-heroA" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--mute)"/></marker></defs>';
    const cen=b=>[b.x+b.w/2,b.y+b.h/2];
    const clip=(b,dx,dy)=>{const t=Math.min(dx?(b.w/2)/Math.abs(dx):1e9,dy?(b.h/2)/Math.abs(dy):1e9);const [cx,cy]=cen(b);return [cx+t*dx,cy+t*dy]};
    let labs='';
    E.forEach(([a,b,lab])=>{const A=box[a],B=box[b];let [ax,ay]=cen(A),[bx,by]=cen(B);
      // edges between boxes in the same column run vertically, offset when two edges share the column
      if(Math.abs(ax-bx)<1){const off=(a==='on'&&b==='act')?-bw*0.18:(a==='on'&&b==='tg'&&wide)?bw*0.18:0;ax+=off;bx+=off}
      const dx=bx-ax,dy=by-ay;const p=clip({x:A.x,y:A.y,w:A.w,h:A.h},dx,dy),q=clip({x:B.x,y:B.y,w:B.w,h:B.h},-dx,-dy);
      const D=Math.hypot(dx,dy)||1,ux=dx/D,uy=dy/D;const p2=[p[0]+ux*3,p[1]+uy*3],q2=[q[0]-ux*3,q[1]-uy*3];
      const acc=(a==='on'&&b==='tg');
      s+='<line x1="'+p2[0].toFixed(1)+'" y1="'+p2[1].toFixed(1)+'" x2="'+q2[0].toFixed(1)+'" y2="'+q2[1].toFixed(1)+'" stroke="'+(acc?'var(--acc)':'var(--mute)')+'" stroke-width="1.5"'+(acc?' stroke-dasharray="5 3"':'')+' marker-end="url(#vb-heroA)"/>';
      // label beside the line, never on it: above a horizontal edge, right of a vertical one, off the side of a diagonal
      const mx=(p2[0]+q2[0])/2,my=(p2[1]+q2[1])/2,hor=Math.abs(dx)>Math.abs(dy)*2,ver=Math.abs(dy)>Math.abs(dx)*2;
      let lx=mx,ly=my-6,an='middle';if(ver){lx=mx+6;ly=my+4;an='start'}else if(!hor){lx=mx+(dx*dy>0?8:-8);ly=my-4;an=dx*dy>0?'start':'end'}
      if(lab)labs+=RD.t(lx,ly,lab,{a:an,fs:11,fill:acc?'var(--acc)':'var(--mute)'})});
    Object.keys(box).forEach(k=>{const b=box[k],n=(!wide&&k==='tg')?Object.assign({},N[k],{t:['Target θ⁻: copy every C',N[k].t[1]]}):N[k];
      s+='<rect x="'+b.x.toFixed(1)+'" y="'+b.y.toFixed(1)+'" width="'+b.w.toFixed(1)+'" height="'+b.h+'" rx="8" fill="var(--soft)" stroke="'+(n.a?'var(--acc)':'var(--line)')+'" stroke-width="'+(n.a?1.6:1)+'"/>';
      let y=b.y+6+LH-3;n.t.forEach((t,i)=>{s+=RD.t(b.x+b.w/2,y,t,{a:'middle',fs:i?11:12,w:i?400:600,fill:'var(--ink)'});y+=LH});
      (n.g||[]).forEach(t=>{s+=RD.t(b.x+b.w/2,y,t,{a:'middle',fs:11,w:600,fill:'var(--acc)'});y+=LH})});
    el.innerHTML=RD.svg(W,H,s+labs,'DQN training loop: emulator, actor, replay buffer, minibatch, online and target networks, loss; tags mark where Double DQN, dueling, prioritised replay, multi-step, distributional and NoisyNet act');
  }
  RD.onRender(draw);RD.onResize(draw);draw();
})();
