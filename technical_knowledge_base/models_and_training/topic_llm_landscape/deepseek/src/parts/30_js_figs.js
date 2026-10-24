// ---- Reading figures (2026-10-24 rebuild): the hero (layer by release), the attention factors, the training-cost bar.
// Static figures drawn at the measured width; no motion. Numbers are in the HTML captions beside them.
(function(){
  if(!window.RD||!document.getElementById('dsHero'))return;
  const T=RD.t, F=n=>n.toLocaleString('en-GB');
  // halo so a label stays readable over the carry line
  const H=(x,y,s,o)=>{o=o||{};return '<text x="'+x+'" y="'+y+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' font-size="'+(o.fs||11)+'"'+(o.fill?' fill="'+o.fill+'"':'')+(o.w?' font-weight="'+o.w+'"':'')+' stroke="var(--bg)" stroke-width="4" paint-order="stroke">'+s+'</text>'};

  // ---- hero: which release first shipped DeepSeek's answer for each part of the model ----
  const COLS=[['V2','May 2024','236B / 21B'],['V3','Dec 2024','671B / 37B'],['R1','Jan 2025','671B / 37B'],['V3.1','Aug 2025',''],['V3.2-Exp','Sep 2025','671B / 37B'],['V4','Apr 2026','1.6T / 49B'],['V4.1-Flash','Sep 2026','552B / 8B to 16B']];
  const ROWS=[
    ['g','Serving cost: the attention cache and the network'],
    ['Bytes per cache entry','s-mla',[[0,'MLA: 576 numbers']]],
    ['Entries a token reads','s-dsa',[[4,'DSA: top 2,048']]],
    ['Entries stored','s-csa',[[5,'CSA ÷ 4, HCA ÷ 128']]],
    ['Network shape','s-enc',[[6,'encoder-decoder']]],
    ['g','Training cost: the model and the cluster'],
    ['Feed-forward','s-moe',[[0,'fine-grained + shared experts']]],
    ['Load balance','s-bal',[[1,'bias, no aux loss']]],
    ['Objective','s-mtp',[[1,'MTP, depth 1']]],
    ['Number format','s-fp8',[[1,'FP8 training'],[5,'FP4 experts']]],
    ['Pipeline, comms','s-pipe',[[1,'DualPipe, DeepEP']]],
    ['Residual, optimiser','s-v4x',[[5,'mHC, Muon']]],
    ['g','Post-training'],
    ['RL','s-rl',[[2,'GRPO, RLVR']]],
    ['One checkpoint','s-hyb',[[3,'hybrid thinking'],[5,'specialists, distilled']]]];
  function hero(){
    const el=document.getElementById('dsHero');
    const cw0=RD.width(el.parentElement);
    if(cw0<560){ // phone: one release per block, its changes listed under it, same colours and links
      let y=0,s='';const W=cw0;
      COLS.forEach((c,i)=>{
        s+=T(0,y+15,c[0],{fs:12.5,w:600})+T(W-2,y+15,c[1]+(c[2]?', '+c[2]:''),{a:'end',fill:'var(--mute)'});y+=22;
        ROWS.forEach(r=>{if(r[0]==='g')return;r[2].forEach(([ci,lab])=>{if(ci!==i)return;
          s+='<a href="#'+r[1]+'"><rect x="0" y="'+y+'" width="'+W+'" height="22" fill="transparent"/><circle cx="8" cy="'+(y+11)+'" r="5" fill="var(--acc)"/>'+T(20,y+15,r[0]+':',{fill:'var(--acc)'})+T(158,y+15,lab)+'</a>';y+=22})});
        y+=6;s+='<line x1="0" x2="'+W+'" y1="'+(y-3)+'" y2="'+(y-3)+'" stroke="var(--line)"/>'});
      el.style.minWidth='';el.innerHTML=RD.svg(W,y,s,'DeepSeek releases and the parts of the model each one changed');return}
    const W=Math.max(640,cw0),lw=150,n=COLS.length,cw=(W-lw-6)/n,cx=i=>lw+cw*(i+0.5);
    let y=0,s='';const top=50;
    COLS.forEach((c,i)=>{s+=T(cx(i),14,c[0],{a:'middle',fs:12,w:600})+T(cx(i),29,c[1],{a:'middle',fill:'var(--mute)'})+(c[2]?T(cx(i),43,c[2],{a:'middle',fill:'var(--mute)'}):'')});
    y=top;
    const body=[];
    ROWS.forEach(r=>{
      if(r[0]==='g'){body.push(T(0,y+16,r[1],{fs:11.5,w:600,fill:'var(--mute)'}));y+=22;return}
      const ym=y+13;
      let row='<a href="#'+r[1]+'"><rect x="0" y="'+y+'" width="'+W+'" height="26" fill="transparent"/>'+T(0,ym+4,r[0],{fs:12,fill:'var(--acc)'})+'</a>';
      const first=r[2][0][0];
      row+='<line x1="'+cx(first)+'" x2="'+(W-2)+'" y1="'+ym+'" y2="'+ym+'" stroke="var(--acc)" stroke-opacity=".35" stroke-width="3"/>';
      r[2].forEach(([c,lab])=>{const x=cx(c),len=lab.length*6.1,right=x+10+len<W-2;
        row+='<circle cx="'+x+'" cy="'+ym+'" r="6" fill="var(--acc)"/>'+H(right?x+10:x-10,ym+4,lab,{a:right?'start':'end'})});
      body.push(row);y+=26});
    let grid='';for(let i=0;i<=n;i++)grid+='<line x1="'+(lw+cw*i-0.5)+'" x2="'+(lw+cw*i-0.5)+'" y1="2" y2="'+y+'" stroke="var(--line)"/>';
    el.style.minWidth=W+'px';
    el.innerHTML=RD.svg(W,y+4,grid+s+body.join(''),'DeepSeek releases against the parts of the model each one changed');
  }

  // ---- attention: the factor each generation shrank ----
  const AR=[
    {t:'Numbers per entry (V2, MLA), per token per layer at V3\u2019s dimensions',ts:'Numbers per entry (V2, MLA)',b:[32768,'MHA: 32,768 numbers'],a:[[576,'MLA: 576 numbers, 57× fewer']]},
    {t:'Entries each decoded token reads (V3.2-Exp, DSA), 131,072-token context',ts:'Entries read (V3.2-Exp, DSA), 128K context',b:[131072,'full attention: all 131,072'],a:[[2048,'DSA: the top 2,048, 64× fewer']]},
    {t:'Entries stored per layer (V4), 1,048,576-token context',ts:'Entries stored (V4), 1M context',b:[1048576,'one per token: 1,048,576'],a:[[262144+128,'CSA layer: 262,144 + 128 window, 4× fewer'],[8192+128,'HCA layer: 8,192 + 128 window, 126× fewer']]}];
  function att(){
    const el=document.getElementById('dsAtt');if(!el)return;
    const W=RD.width(el),bw=W-4;let y=0,s='';
    AR.forEach(r=>{
      s+=T(0,y+13,W<560?r.ts:r.t,{fs:12,w:600});y+=20;
      const bar=(v,max,lab,c)=>{const w=Math.max(2,bw*v/max);const o=T(0,y+11,lab,{fill:c==='var(--dim)'?'var(--mute)':'var(--ink)'})+'<rect x="0" y="'+(y+15)+'" width="'+w.toFixed(1)+'" height="11" rx="2" fill="'+c+'"/>';y+=32;return o};
      s+=bar(r.b[0],r.b[0],r.b[1],'var(--dim)');
      r.a.forEach(a=>{s+=bar(a[0],r.b[0],a[1],'var(--acc)')});
      y+=8});
    el.innerHTML=RD.svg(W,y,s,'Before and after bars for MLA, DSA and CSA/HCA');
  }

  // ---- cost: GPU hours of the runs DeepSeek priced ----
  function cost(){
    const el=document.getElementById('dsCost');if(!el)return;
    const W=RD.width(el),box=46,sc=(W-box-10)/2788,narrow=W<480;let s='';
    const seg=[[2664,'var(--acc)'],[119,'var(--c6)'],[5,'var(--c2)']];
    s+=T(0,14,narrow?'V3 run: 2,788K H800 hours × $2 = $5.576M':'V3 official training run: 2,788K H800 GPU hours × $2 = $5.576M',{fs:12,w:600});
    let x=0;seg.forEach(([h,c])=>{const w=Math.max(1.5,h*sc);s+='<rect x="'+x.toFixed(1)+'" y="22" width="'+w.toFixed(1)+'" height="22" fill="'+c+'"/>';x+=w});
    s+=T(8,37,'pre-training 2,664K',{fill:'var(--bg)',w:600});
    s+='<rect x="'+(x+6).toFixed(1)+'" y="22" width="'+box+'" height="22" fill="none" stroke="var(--mute)" stroke-dasharray="4 3"/>'+T(x+6+box/2,37,'?',{a:'middle',fill:'var(--mute)',w:600});
    s+=T(x,60,'context extension 119K + post-training 5K',{a:'end',fill:'var(--mute)'});
    s+=T(W-2,76,'excluded: prior research and ablations',{a:'end',fill:'var(--mute)'});
    s+=T(0,100,narrow?'R1 RL: 147K hours, $294K':'R1’s own training: 147K hours, $294K at the same rate',{fs:12,w:600});
    s+='<rect x="0" y="108" width="'+(147*sc).toFixed(1)+'" height="22" fill="var(--c4)"/>';
    el.innerHTML=RD.svg(W,136,s,'GPU hours of V3 and R1 training runs');
  }
  function all(){hero();att();cost()}
  RD.onRender(all);RD.onResize(all);all();
})();
