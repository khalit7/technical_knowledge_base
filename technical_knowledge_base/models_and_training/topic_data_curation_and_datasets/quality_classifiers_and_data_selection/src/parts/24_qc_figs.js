// Reading figures added 2026-10-24: hero (#qc-hero), LLM-graded pipeline (#qc-llmg), DSIR length bias (#qc-dsir), gradient alignment (#qc-grad).
// All static diagrams drawn at the measured width; SVG text kept to short labels (captions are HTML beside each figure).
(function(){
  const D=window.QC; if(!D)return;
  const T=RD.t, CW=6.3; // approximate width of one 11 px character
  const box=(x,y,w,h,o)=>{o=o||{};return '<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+h.toFixed(1)+'" rx="7" fill="'+(o.fill||'var(--soft)')+'" stroke="'+(o.stroke||'var(--line)')+'"'+(o.sw?' stroke-width="'+o.sw+'"':'')+'/>'};
  const lines=(x,y,arr,o)=>{o=o||{};let g='';arr.forEach((s,i)=>{const it=typeof s==='string'?{s}:s;g+=T(x,y+i*(o.lh||15),it.s,{a:o.a,fs:it.fs||o.fs||11,fill:it.fill||o.fill,w:it.w})});return g};
  const arrowH=(x1,x2,y)=>'<line x1="'+x1+'" x2="'+(x2-6)+'" y1="'+y+'" y2="'+y+'" stroke="var(--mute)" stroke-width="1.5"/><path d="M'+(x2-7)+' '+(y-4)+' L'+x2+' '+y+' L'+(x2-7)+' '+(y+4)+'Z" fill="var(--mute)"/>';
  const arrowV=(x,y1,y2)=>'<line x1="'+x+'" x2="'+x+'" y1="'+y1+'" y2="'+(y2-6)+'" stroke="var(--mute)" stroke-width="1.5"/><path d="M'+(x-4)+' '+(y2-7)+' L'+x+' '+y2+' L'+(x+4)+' '+(y2-7)+'Z" fill="var(--mute)"/>';

  // ---------- hero: pool -> scorer -> score and cut (real DCLM logits of run0) -> kept ----------
  function hero(){
    const el=document.getElementById('qc-hero'); if(!el||!D.tr)return;
    const W=Math.min(RD.width(el),880), wide=W>=640;
    const lg=D.tr.logits.dclm, cut=D.tr.models.find(m=>m.key==='dclm').cut_logit;
    let lo=Infinity,hi=-Infinity;lg.forEach(v=>{if(v<lo)lo=v;if(v>hi)hi=v});
    const nb=28,bw=(hi-lo)/nb,cnt=new Array(nb).fill(0),kc=new Array(nb).fill(0);
    lg.forEach(v=>{const b=Math.min(nb-1,Math.floor((v-lo)/bw));cnt[b]++;if(v>=cut)kc[b]++});
    const mx=Math.max(...cnt);
    const families=[{s:'looks like a reference',fill:'var(--acc)',w:600},'follows an LLM\'s rubric','is predictable to an LM','matches target n-grams','lowers a target loss'];
    function pool(x,y,w,h){let g=box(x,y,w,h)+T(x+10,y+18,'1. The pool',{fs:12,w:600});
      const cols=wide?6:12, rows=wide?6:2, s=Math.min(11,(w-20)/cols-3), gx=x+10, gy=y+28;
      for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)g+='<rect x="'+(gx+c*(s+3)).toFixed(1)+'" y="'+(gy+r*(s+3)).toFixed(1)+'" width="'+s.toFixed(1)+'" height="'+s.toFixed(1)+'" rx="1.5" fill="var(--dim)"/>';
      const ty=wide?gy+rows*(s+3)+14:y+18, tx=wide?x+10:x+Math.max(130,w*0.5);
      g+=lines(tx,ty,wide?['2,617 pages','after filters','and dedup']:['2,617 pages','after filters and dedup'],{fill:'var(--mute)'});return g}
    function scorer(x,y,w,h){let g=box(x,y,w,h,{stroke:'var(--acc)'})+T(x+10,y+18,'2. A scorer: good =',{fs:12,w:600});
      families.forEach((f,i)=>{const it=typeof f==='string'?{s:f}:f;g+=T(x+10,y+38+i*16,(i?'or ':'')+it.s,{fill:it.fill||'var(--ink)',w:it.w})});return g}
    function hist(x,y,w,h){let g=box(x,y,w,h)+T(x+10,y+18,'3. Score each page, cut',{fs:12,w:600});
      const px=x+10,pw=w-20,py=y+28,ph=h-56,b=pw/nb, X=v=>px+(v-lo)/(hi-lo)*pw;
      cnt.forEach((c,i)=>{const hh=c/mx*ph,hk=kc[i]/mx*ph;
        g+='<rect x="'+(px+i*b+0.5).toFixed(1)+'" y="'+(py+ph-hh).toFixed(1)+'" width="'+Math.max(1,b-1).toFixed(1)+'" height="'+hh.toFixed(1)+'" fill="var(--dim)"/>';
        if(hk>0)g+='<rect x="'+(px+i*b+0.5).toFixed(1)+'" y="'+(py+ph-hk).toFixed(1)+'" width="'+Math.max(1,b-1).toFixed(1)+'" height="'+hk.toFixed(1)+'" fill="var(--good)"/>'});
      const cx=X(cut);g+='<line x1="'+cx.toFixed(1)+'" x2="'+cx.toFixed(1)+'" y1="'+(py-2)+'" y2="'+(py+ph+2)+'" stroke="var(--ink)" stroke-dasharray="4 3"/>';
      g+=T(Math.min(cx+4,x+w-60),py+10,'cut',{fs:11});
      g+=T(px,py+ph+16,'drop',{fs:11,fill:'var(--mute)'})+T(px+pw,py+ph+16,'keep: '+'@@keep_dclm@@',{a:'end',fs:11,fill:'var(--good)',w:600});
      g+=T(px+pw/2,py+ph+16,'DCLM logit',{a:'middle',fs:11,fill:'var(--mute)'});return g}
    function kept(x,y,w,h){let g=box(x,y,w,h)+T(x+10,y+18,'4. What survives',{fs:12,w:600});
      g+=lines(x+10,y+38,[{s:'DCLM: @@keep_dclm@@',fill:'var(--good)',w:600},'FineWeb-Edu: @@keep_edu@@','shared: @@jacc_published@@']);
      g+=lines(x+10,y+(wide?100:38),wide?[{s:'5. Train on it:',w:600,fill:'var(--acc)'},{s:'the only real test',fill:'var(--acc)'}]:[],{});
      if(!wide)g+=lines(x+Math.max(150,w*0.5),y+38,[{s:'5. Train on it:',w:600,fill:'var(--acc)'},{s:'the only real test',fill:'var(--acc)'}]);
      return g}
    let g='',H;
    if(wide){const gap=22,avail=W-3*gap,ws=[0.17,0.25,0.36,0.22].map(r=>r*avail);H=200;let x=0;
      [pool,scorer,hist,kept].forEach((f,i)=>{g+=f(x,4,ws[i],H-8);if(i<3)g+=arrowH(x+ws[i]+3,x+ws[i]+gap-3,H/2);x+=ws[i]+gap});}
    else{const hs=[62,118,150,80],gap=20;let y=2;
      [pool,scorer,hist,kept].forEach((f,i)=>{g+=f(0,y,W-2,hs[i]);if(i<3)g+=arrowV(W/2,y+hs[i]+2,y+hs[i]+gap-2);y+=hs[i]+gap});H=y;}
    el.innerHTML=RD.svg(W,H,g,'A pool of 2,617 pages, a scorer, the real distribution of DCLM scores with the cut, and the kept sets');
  }

  // ---------- LLM-graded: annotator -> student -> cut, FineWeb-Edu and Nemotron-CC ----------
  function llmg(){
    const el=document.getElementById('qc-llmg'); if(!el)return;
    const W=Math.min(RD.width(el),880), wide=W>=760;
    const rows=[
      {name:'FineWeb-Edu',steps:[['Llama-3-70B grades','460,000 pages, 0 to 5'],['arctic-embed-m','+ regression head'],['one student,','nothing to combine'],['Keep rounded','score ≥ 3']]},
      {name:'Nemotron-CC',steps:[['Mixtral 8x22B and','Nemotron-4-340B grade'],['2 regressors','+ DCLM\'s fastText'],['Rank buckets 0 to 19,','max of the three'],['5 levels, chosen','by annealing tests']]}];
    const tags=['annotator (a sample, once)','student (every page)','combine','cut'];
    let g='',H;
    if(wide){const lab=96,gap=24,bw=(W-lab-3*gap)/4,bh=46;H=26+rows.length*(bh+18);
      tags.forEach((t,j)=>g+=T(lab+j*(bw+gap)+bw/2,14,t,{a:'middle',fs:11,fill:'var(--mute)'}));
      rows.forEach((r,i)=>{const y=24+i*(bh+18);g+=T(0,y+bh/2+4,r.name,{fs:12,w:600});
        r.steps.forEach((s,j)=>{const x=lab+j*(bw+gap);g+=box(x,y,bw,bh,{stroke:j===1?'var(--acc)':'var(--line)'})+lines(x+bw/2,y+19,s,{a:'middle'});if(j<3)g+=arrowH(x+bw+3,x+bw+gap-3,y+bh/2)})});}
    else{const gap=12,cw=(W-gap)/2,bh=44,vg=16;H=24+4*(bh+vg);
      rows.forEach((r,i)=>{const x=i*(cw+gap);g+=T(x+cw/2,14,r.name,{a:'middle',fs:12,w:600});
        r.steps.forEach((s,j)=>{const y=22+j*(bh+vg);const fs=(Math.max(s[0].length,s[1].length)*CW>cw-8)?10.5:11;
          g+=box(x,y,cw,bh,{stroke:j===1?'var(--acc)':'var(--line)'})+lines(x+cw/2,y+18,s,{a:'middle',fs:Math.max(11,fs)});if(j<3)g+=arrowV(x+cw/2,y+bh+2,y+bh+vg-1)})});}
    el.innerHTML=RD.svg(W,H,g,'FineWeb-Edu and Nemotron-CC: an LLM annotator grades a sample, a small student scores every page, a cut or buckets decide');
  }

  // ---------- DSIR: median length of the selected 10% against the pool ----------
  function dsir(){
    const el=document.getElementById('qc-dsir'); if(!el||!D.dsir)return;
    const t=D.dsir.targets, W=Math.min(RD.width(el),700), pool=t.wiki.pool_median_tokens;
    const rows=[{l:'Pool: 50,000 FineWeb rows',v:pool,c:'var(--dim)'},
      {l:'toward Wikipedia',v:t.wiki.selected_median_tokens,rho:t.wiki.spearman_logw_length,c:'var(--c1)'},
      {l:'toward OH-2.5 + ELI5',v:t.oh_eli5.selected_median_tokens,rho:t.oh_eli5.spearman_logw_length,c:'var(--c2)'},
      {l:'toward FineWeb-Edu',v:t.fwedu.selected_median_tokens,rho:t.fwedu.spearman_logw_length,c:'var(--c3)'}];
    const mx=1800, L=4, iw=W-L-70, rh=40; let g='';
    const X=v=>L+v/mx*iw;
    rows.forEach((r,i)=>{const y=i*rh;g+=T(L,y+13,r.l+(r.rho!=null?',  ρ = '+r.rho.toFixed(2):''),{fs:11,fill:r.rho!=null?'var(--ink)':'var(--mute)'});
      g+='<rect x="'+L+'" y="'+(y+18)+'" width="'+(X(r.v)-L).toFixed(1)+'" height="14" rx="3" fill="'+r.c+'"/>'+T(X(r.v)+5,y+30,r.v.toLocaleString('en-GB'),{fs:11,w:600})});
    const px=X(pool);g+='<line x1="'+px+'" x2="'+px+'" y1="16" y2="'+(rows.length*rh)+'" stroke="var(--mute)" stroke-dasharray="3 3"/>';
    el.innerHTML=RD.svg(W,rows.length*rh+4,g,'Median length of the pages DSIR selects toward three targets, against the pool');
  }

  // ---------- gradient alignment (illustrative) ----------
  function grad(){
    const el=document.getElementById('qc-grad'); if(!el)return;
    const W=Math.min(RD.width(el),540), H=190, ox=W*0.42, oy=112, R=Math.min(100,W*0.25);
    const ar=(deg,len,col,sw,lab,sub,anc,below)=>{const a=deg*Math.PI/180,x=ox+Math.cos(a)*len,y=oy-Math.sin(a)*len;
      let s='<line x1="'+ox+'" y1="'+oy+'" x2="'+x.toFixed(1)+'" y2="'+y.toFixed(1)+'" stroke="'+col+'" stroke-width="'+sw+'"/>';
      const hx=Math.cos(a),hy=-Math.sin(a),px=-hy,py=hx;
      s+='<path d="M'+x.toFixed(1)+' '+y.toFixed(1)+' L'+(x-hx*9+px*4).toFixed(1)+' '+(y-hy*9+py*4).toFixed(1)+' L'+(x-hx*9-px*4).toFixed(1)+' '+(y-hy*9-py*4).toFixed(1)+'Z" fill="'+col+'"/>';
      const tx=ox+Math.cos(a)*(len+10),ty=oy-Math.sin(a)*(len+10);
      if(below){const bx=x-6,by=y+22;s+=T(bx,by,lab,{a:'start',fs:11,w:600,fill:col})+T(bx,by+14,sub,{a:'start',fs:11,fill:'var(--mute)'});return s}
      s+=T(tx,ty-2,lab,{a:anc,fs:11,w:600,fill:col})+T(tx,ty+13,sub,{a:anc,fs:11,fill:'var(--mute)'});return s};
    let g='<circle cx="'+ox+'" cy="'+oy+'" r="3" fill="var(--ink)"/>';
    g+=ar(20,R*1.05,'var(--acc)',3,'target gradient','task examples','start');
    g+=ar(40,R*0.8,'var(--good)',2,'A: cos 0.94','keep','start');
    g+=ar(110,R*0.75,'var(--mute)',2,'B: cos 0.0','little effect','middle');
    g+=ar(190,R*0.85,'var(--bad)',2,'C: cos −0.98','raises target loss','end',true);
    el.innerHTML=RD.svg(W,H,g,'Illustrative gradients: a target direction and three candidates with their cosines');
  }
  const all=()=>{hero();llmg();dsir();grad()};
  RD.onRender(all);RD.onResize(all);all();
})();
