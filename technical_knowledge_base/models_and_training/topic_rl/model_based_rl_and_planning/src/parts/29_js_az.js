// ---- Reading section 6: AlphaGo against AlphaZero, the same search fed differently (toggle-compare) ----
(function(){
  const el=document.getElementById('mb-azD');if(!el)return;
  let mode='ag';
  const box=(x,y,w,h,t1,t2,o)=>{o=o||{};return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="7" fill="'+(o.hl?'color-mix(in srgb, var(--acc) 12%, var(--bg))':o.dim?'var(--bg)':'var(--soft)')+'" stroke="'+(o.hl?'var(--acc)':'var(--line)')+'"'+(o.dim?' stroke-dasharray="4 3"':'')+'/>'+
    RD.t(x+w/2,y+(t2?18:h/2+4),t1,{a:'middle',fs:12,w:700,fill:o.dim?'var(--mute)':'var(--ink)'})+(t2?RD.t(x+w/2,y+33,t2,{a:'middle',fs:11,fill:'var(--mute)'}):'')};
  const ar=(x1,y1,x2,y2,col)=>'<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" stroke="'+(col||'var(--mute)')+'" stroke-width="1.8" marker-end="url(#mbz-'+(col?'b':'a')+')"/>';
  function draw(){
    const W=Math.max(300,RD.width(el)),g=6;let s='<defs><marker id="mbz-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--mute)"/></marker><marker id="mbz-b" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--acc)"/></marker></defs>';
    const y0=4,bh=42,ys=y0+bh+40,sh=46,yo=ys+sh+34;let H;
    if(mode==='ag'){
      const n=4,bw=(W-g*(n-1))/n,lab=W<560?[['SL policy','human moves'],['RL policy','self-play'],['Value net','30M positions'],['Rollout','2 μs a move']]:[['SL policy pσ','30M human moves'],['RL policy pρ','policy-gradient self-play'],['Value net vθ','30M self-play positions'],['Rollout policy pπ','2 μs per move']];
      lab.forEach((l,i)=>{s+=box(i*(bw+g),y0,bw,bh,l[0],l[1],{dim:i===1})});
      const cx=i=>i*(bw+g)+bw/2;
      s+=ar(cx(0),y0+bh,cx(0),ys-2)+ar(cx(2),y0+bh,cx(2),ys-2)+ar(cx(3),y0+bh,cx(3),ys-2);
      s+='<line x1="'+(bw+g+bw)+'" y1="'+(y0+bh/2)+'" x2="'+(2*(bw+g)-1)+'" y2="'+(y0+bh/2)+'" stroke="var(--mute)" stroke-dasharray="3 3" marker-end="url(#mbz-a)"/>';
      s+=RD.t(cx(0)+5,ys-14,'prior P',{fs:11,fill:'var(--mute)'})+RD.t(cx(2)+5,ys-14,'(1−λ)v',{fs:11,fill:'var(--mute)'})+RD.t(cx(3)+5,ys-14,'+ λz',{fs:11,fill:'var(--mute)'});
      s+=box(0,ys,W,sh,W<560?'MCTS (PUCT): leaf = value net + rollout':'MCTS (PUCT), every leaf scored by value net and one rollout','',{hl:true});
      s+=ar(W/2,ys+sh,W/2,yo-2)+box(W/2-80,yo,160,34,'move played','');H=yo+38;
    }else{
      const bw=Math.min(300,W*0.7),x=(W-bw)/2;
      s+=box(x,y0,bw,bh,'One network fθ(s) = (p, v)','residual tower, no human data',{hl:false});
      s+=ar(W/2-40,y0+bh,W/2-40,ys-2)+ar(W/2+40,y0+bh,W/2+40,ys-2);
      s+=RD.t(W/2-46,ys-14,'prior p',{a:'end',fs:11,fill:'var(--mute)'})+RD.t(W/2+46,ys-14,'leaf value v',{fs:11,fill:'var(--mute)'});
      s+=box(0,ys,W-26,sh,'MCTS (PUCT), no rollouts','',{hl:true});
      const ow=Math.min(150,(W-40)/2.6);
      s+=ar(W*0.3,ys+sh,W*0.3,yo-2)+box(W*0.3-ow/2,yo,ow,34,'move played','')+ar(W*0.3+ow/2,yo+17,W*0.7-ow/2-2,yo+17)+box(W*0.7-ow/2,yo,ow,34,'targets π, z','');
      // loop back to the network
      const lx=W-8;s+='<path d="M'+(W*0.7+ow/2)+','+(yo+17)+' L'+lx+','+(yo+17)+' L'+lx+','+(y0+bh/2)+' L'+(x+bw+2)+','+(y0+bh/2)+'" fill="none" stroke="var(--acc)" stroke-width="1.8" marker-end="url(#mbz-b)"/>';
      s+=RD.t(lx-4,y0+bh/2-6,'train',{a:'end',fs:11.5,w:700,fill:'var(--acc)'});H=yo+38;
    }
    el.innerHTML=RD.svg(W,H,s,mode==='ag'?'AlphaGo: four learned functions feed the search; nothing flows back':'AlphaZero: one network feeds the search, and the search output trains the network');
    document.getElementById('mb-azX').innerHTML=mode==='ag'?'<b>AlphaGo (2016).</b> Four learned functions, trained before any search. The search uses the SL policy as its prior and scores each leaf with the value net plus one fast rollout (λ = 0.5); the RL policy (dashed) only generates the value net\'s training games. Search is how it <i>plays</i>; nothing it finds flows back into the networks.':'<b>AlphaGo Zero and AlphaZero (2017).</b> One network gives the prior and the leaf value, with no rollouts. Search is run at every self-play move, and its visit distribution π and the game result z become the network\'s training targets: search is how it <i>learns</i>.';
  }
  RD.seg(document.getElementById('mb-azM'),m=>{mode=m;draw()});
  RD.onRender(draw);RD.onResize(draw);draw();
})();
