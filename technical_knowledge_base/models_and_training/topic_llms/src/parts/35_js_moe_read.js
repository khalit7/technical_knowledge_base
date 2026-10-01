// ---- Reading tab (Cost to serve), from the MoE fold: the same tokens through a dense FFN and through an MoE layer. No-op if its HTML is not on the page ----
(function(){
  const $=id=>document.getElementById(id);
  const card=$('moeRd');if(!card)return;
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  // illustrative top-2 picks for 16 tokens over 8 experts (fixed list so every replay is the same)
  const PICK=[[0,3],[2,5],[0,6],[1,4],[3,7],[0,2],[5,6],[1,3],[4,7],[0,5],[2,6],[3,4],[1,7],[0,6],[2,3],[4,5]];
  const st={m:'moe',i:0,t:0,n:0,play:!RM,vis:false,raf:0,last:0,cnt:new Array(8).fill(0)};
  const DUR=1100;
  function reset(){st.i=0;st.n=0;st.t=RM?1:0;st.cnt=new Array(8).fill(0)}
  // finish the current token: count it, move to the next (a full pass of the list starts the tallies again)
  function next(){PICK[st.i].forEach(k=>st.cnt[k]++);st.n++;st.i=(st.i+1)%PICK.length;if(st.i===0){st.n=0;st.cnt=new Array(8).fill(0)}}
  function draw(){
    const W=Math.max(320,Math.min(760,card.clientWidth-28)),nar=W<520,H=nar?230:210;
    const moe=st.m==='moe',tok=PICK[st.i],e=Math.min(1,st.t);
    const x0=14,xr=W*0.3,xe=W*0.5,ew=W*0.3,top=18,eh=(H-top-40)/8;
    let s='<svg viewBox="0 0 '+W+' '+H+'" width="100%" role="img" aria-label="'+(moe?'MoE layer: the router sends the token to 2 of 8 experts':'Dense FFN: every token through the same weights')+'">';
    // token moving in
    const ty=H/2-10,tx=x0+(xr-x0-30)*Math.min(1,e*2);
    s+='<rect x="'+tx+'" y="'+(ty)+'" width="20" height="20" rx="4" fill="var(--c1)"/><text x="'+x0+'" y="'+(ty-8)+'" font-size="11" fill="var(--mute)">token '+(st.i+1)+'</text>';
    if(moe){
      s+='<rect x="'+(xr-8)+'" y="'+(ty-6)+'" width="'+(W*0.12)+'" height="32" rx="6" fill="var(--acc2)" stroke="var(--acc)"/><text x="'+(xr-8+W*0.06)+'" y="'+(ty+15)+'" font-size="11.5" text-anchor="middle">router</text>';
      for(let k=0;k<8;k++){const y=top+k*eh,on=tok.includes(k)&&e>0.5;
        s+='<rect x="'+xe+'" y="'+(y+2)+'" width="'+ew+'" height="'+(eh-4)+'" rx="4" fill="'+(on?'var(--acc)':'var(--soft)')+'" stroke="'+(on?'var(--acc)':'var(--line)')+'"/>';
        s+='<text x="'+(xe+8)+'" y="'+(y+eh/2+4)+'" font-size="10.5" fill="'+(on?'var(--bg)':'var(--mute)')+'">E'+(k+1)+'</text>';
        s+='<text x="'+(xe+ew+8)+'" y="'+(y+eh/2+4)+'" font-size="10.5" fill="var(--mute)">'+st.cnt[k]+' done</text>';
        if(tok.includes(k)&&e>0.5)s+='<line x1="'+(xr-8+W*0.12)+'" y1="'+(ty+10)+'" x2="'+xe+'" y2="'+(y+eh/2)+'" stroke="var(--acc)" stroke-width="1.6"/>'}
    } else {
      const lit=e>0.5;
      s+='<rect x="'+xe+'" y="'+(top+2+eh*3)+'" width="'+ew+'" height="'+(eh*2-4)+'" rx="5" fill="'+(lit?'var(--c5)':'var(--soft)')+'" stroke="var(--c5)"/><text x="'+(xe+ew/2)+'" y="'+(top+eh*4+4)+'" font-size="11.5" text-anchor="middle" fill="'+(lit?'var(--bg)':'var(--ink)')+'">one dense FFN, 2 units</text>';
      for(let k=0;k<8;k++){if(k===3||k===4)continue;const y=top+k*eh;s+='<rect x="'+xe+'" y="'+(y+2)+'" width="'+ew+'" height="'+(eh-4)+'" rx="4" fill="none" stroke="var(--line)" stroke-dasharray="3 3"/>'}
      s+='<text x="'+(xe+ew+8)+'" y="'+(top+eh*4+4)+'" font-size="10.5" fill="var(--mute)">'+st.n+' tokens done</text>';
      if(lit)s+='<line x1="'+(tx+20)+'" y1="'+(ty+10)+'" x2="'+xe+'" y2="'+(top+eh*4)+'" stroke="var(--c5)" stroke-width="1.6"/>'}
    s+='<text x="'+x0+'" y="'+(H-8)+'" font-size="10.5" fill="var(--mute)">'+(moe?'All 8 experts are stored; the blue ones work for this token.':'Dashed: the 6 expert-sized slots the MoE layer stores and this dense layer does not.')+'</text></svg>';
    $('moeRdSvg').innerHTML=s;
    const stored=moe?8:2,used=2;
    $('moeRdOut').innerHTML=[['Stored FFN weights',stored+' units',moe?'all 8 experts sit in memory':'one FFN'],['Used per token',used+' units',moe?'2 experts of 1 unit':'the whole FFN'],['Share of weights working',Math.round(used/stored*100)+'%',moe?'sparsity ratio of this layer: 4x':'dense: ratio 1x']].map(x=>'<div class="stat"><div class="k">'+x[0]+'</div><div class="v">'+x[1]+'</div><div class="d">'+x[2]+'</div></div>').join('');
    $('moeRdCap').textContent=moe?'MoE: the router picks 2 of 8 experts for token '+(st.i+1)+' (E'+(tok[0]+1)+' and E'+(tok[1]+1)+'). Compute per token is the same as the dense layer; memory is 4 times larger, and different tokens use different experts.':'Dense: token '+(st.i+1)+' passes through the one FFN, like every other token. Same compute per token as the MoE layer, a quarter of its stored capacity.';
    const pb=$('moeRdPlay');pb.textContent=st.play?'❚❚ Pause':'▶ Play';
  }
  const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
  function tick(now){st.raf=0;if(!st.play||!live())return;const dt=st.last?Math.min(100,now-st.last):16;st.last=now;
    st.t+=dt/DUR;if(st.t>=1){next();st.t=0}
    draw();st.raf=requestAnimationFrame(tick)}
  function kick(){if(st.play&&live()&&!st.raf){st.last=0;st.raf=requestAnimationFrame(tick)}else if(!live()&&st.raf){cancelAnimationFrame(st.raf);st.raf=0}}
  $('moeRdPlay').addEventListener('click',()=>{st.play=!st.play;if(!st.play&&st.raf){cancelAnimationFrame(st.raf);st.raf=0}kick();draw()});
  $('moeRdStep').addEventListener('click',()=>{st.play=false;if(st.raf){cancelAnimationFrame(st.raf);st.raf=0}if(st.t>=1)next();st.t=1;draw()});
  const seg=$('moeRdM');seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));st.m=b.dataset.m;reset();draw();kick()}));
  if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;kick()},{threshold:.15}).observe(card)}else st.vis=true;
  document.addEventListener('visibilitychange',kick);
  let rw=0;addEventListener('resize',()=>{const w=card.clientWidth;if(w&&Math.abs(w-rw)>30){rw=w;draw()}});
  window.TAB_RENDER=window.TAB_RENDER||{};
  (window.TAB_RENDER['t-read']=window.TAB_RENDER['t-read']||[]).push(()=>{rw=card.clientWidth;draw();kick()});
  reset();draw();
})();
