// ---- Reading top: the hero figure. Five boxes of a trainer x the running example and three codebases; the highlighted
// cells are what each codebase is built for. Static, drawn at the measured width; line counts from LC.map (runs/lc_map.py). ----
(function(){
  const el=document.getElementById('lc-hero');if(!el)return;
  const T=RD.t,U=LCU,tot=LC.map.totals_py;
  const COLS=[['Running example','268 lines'],['MaxText',U.num(tot.maxtext.lines)+' lines'],['Tunix',U.num(tot.tunix.lines)+' lines'],['Levanter',U.num(tot.levanter.lines)+' lines']];
  const ROWS=[
    ['Config','section 1',[['CFG dict','common.py'],['base.yml + model','YAML, pydantic'],['Python','dataclasses'],['draccus','dataclasses']],[0,1,0,0]],
    ['Model','section 2',[['apply()','model_jax.py'],['Flax NNX,','25 block types'],['Flax NNX','models/'],['Equinox +','Haliax']],[0,0,0,0]],
    ['Sharding','sections 3, 8',[['none','(one device)'],['logical names','+ 80 rules'],['role_to_mesh','per RL role'],['named axes +','mapping dict']],[0,1,0,1]],
    ['Train step','sections 4, 7',[['6 lines,','jit, donate'],['pure train_step,','donated state'],['PeftTrainer,','RL learners'],['trainer.py','']],[0,0,1,0]],
    ['Data, checkpoints','sections 5, 8',[['numpy batches,','no checkpoint'],['grain, HF, tfds;','Orbax v1'],['Orbax','CheckpointManager'],['seekable cache,','keys saved']],[0,0,0,1]]];
  const FOR=['learning','scale on TPU','post-training','reproducibility'];
  const HL={fill:'var(--acc2)',stroke:'var(--acc)'};
  const box=(x,y,w,h,o)=>{o=o||{};return '<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+h+'" rx="6" fill="'+(o.fill||'var(--bg)')+'" stroke="'+(o.stroke||'var(--line)')+'" stroke-width="'+(o.stroke?1.6:1)+'"/>'};
  const cell=(x,y,w,h,t2,hl)=>box(x,y,w,h,hl?HL:null)+T(x+7,y+16,t2[0],{fs:11,fill:'var(--ink)',w:hl?600:null})+(t2[1]?T(x+7,y+30,t2[1],{fs:11,fill:hl?'var(--ink)':'var(--mute)'}):'');
  function draw(){const W=RD.width(el);let s='',H;
    if(W>=640){const lw=118,g=6,cw=(W-lw-g*4)/4,ch=40,hy=36;
      COLS.forEach((c,j)=>{const x=lw+g+j*(cw+g);s+=T(x+cw/2,14,c[0],{a:'middle',fs:12,w:600,fill:'var(--ink)'})+T(x+cw/2,29,c[1],{a:'middle',fs:11,fill:'var(--mute)'})});
      ROWS.forEach((r,i)=>{const y=hy+i*(ch+g);s+=T(0,y+16,r[0],{fs:12,w:600,fill:'var(--ink)'})+T(0,y+30,r[1],{fs:11,fill:'var(--mute)'});
        r[2].forEach((t2,j)=>{s+=cell(lw+g+j*(cw+g),y,cw,ch,t2,r[3][j])})});
      const fy=hy+ROWS.length*(ch+g)+4;s+=T(0,fy+14,'Built for',{fs:12,w:600,fill:'var(--acc)'});
      FOR.forEach((f,j)=>{const x=lw+g+j*(cw+g);s+=T(x+cw/2,fy+14,f,{a:'middle',fs:12,w:600,fill:'var(--acc)'})});H=fy+22;
    }else{const g=6,cw=(W-g)/2,ch=40;let y=0;
      s+=T(0,12,'Each box: running example, MaxText / Tunix, Levanter',{fs:11,fill:'var(--mute)'});y=20;
      ROWS.forEach(r=>{s+=T(0,y+13,r[0]+' ('+r[1]+')',{fs:12,w:600,fill:'var(--ink)'});y+=19;
        r[2].forEach((t2,j)=>{const x=(j%2)*(cw+g),yy=y+Math.floor(j/2)*(ch+g);s+=cell(x,yy,cw,ch,[['Example','MaxText','Tunix','Levanter'][j]+': '+t2[0],t2[1]],r[3][j])});y+=2*(ch+g)+4});
      s+=T(0,y+13,'Built for: MaxText scale on TPU; Tunix post-training;',{fs:11.5,w:600,fill:'var(--acc)'})+T(0,y+29,'Levanter reproducibility',{fs:11.5,w:600,fill:'var(--acc)'});H=y+36;}
    el.innerHTML=RD.svg(W,H,s,'Five boxes of an LLM trainer (config, model, sharding, train step, data and checkpoints) in the running example, MaxText, Tunix and Levanter; MaxText is built around config and sharding, Tunix around the post-training train step, Levanter around named axes and reproducible data')}
  RD.onRender(draw);RD.onResize(draw);draw();
})();
