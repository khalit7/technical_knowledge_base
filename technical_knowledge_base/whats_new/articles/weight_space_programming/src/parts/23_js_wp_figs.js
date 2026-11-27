// ---- Static figures of the Reading tab (hero, copying heads, MinAtar, Experiment 8 runs, the measured edit). ----
// Every number is printed by the post or its logs (see each caption); drawn at the card's measured width, redrawn on resize.
(function(){
  if(!window.RD||!document.getElementById('wp-hero-svg'))return;
  const $=id=>document.getElementById(id), t=RD.t;
  const fmtK=n=>n>=1e9?(n/1e9)+'B':n>=1e6?(n/1e6)+'M':n>=1e3?(n/1e3)+'K':String(n);

  // Fig. hero: experiments by network size (log x) and by what Astra was given (rows)
  const EXP=[
    {id:'1',n:17253,row:0,w:false,ok:true,dy:-1},{id:'5',n:20486,row:0,w:true,ok:true,dy:1},{id:'2',n:23824,row:0,w:false,ok:true,dy:0},
    {id:'4',n:171664,row:0,w:true,ok:true,dy:0},
    {id:'3',n:7160000,row:1,w:false,ok:true,dy:0},{id:'7a',n:270e6,row:1,w:false,ok:false,dy:0},
    {id:'6',n:1480274,row:2,w:true,ok:true,dy:0},{id:'7b',n:270e6,row:2,w:false,ok:true,dy:-1},{id:'8b',n:270e6,row:2,w:true,ok:false,dy:1},{id:'8',n:0.8e9,row:2,w:true,ok:true,dy:0}];
  const ROWS=['Raw weights in the prompt, no tools','Python over the weights, no running the network','Python plus runs of the network'];
  function hero(){
    const el=$('wp-hero-svg'),W=RD.width(el),L=16,R=W-16,band=96,top=6,H=top+band*3+34;
    const lx=v=>L+(Math.log10(v)-4)/(9.2-4)*(R-L);
    let s='';
    ROWS.forEach((r,i)=>{const y=top+i*band;s+='<rect x="0" y="'+y+'" width="'+W+'" height="'+(band-6)+'" rx="8" fill="var(--soft)"/>'+t(10,y+16,(i+1)+'. '+r,{fs:12,fill:'var(--mute)'})});
    [1e4,1e5,1e6,1e7,1e8,1e9].forEach(v=>{const x=lx(v);s+='<line x1="'+x+'" x2="'+x+'" y1="'+top+'" y2="'+(top+band*3-6)+'" stroke="var(--line)"/>'+t(x,top+band*3+12,fmtK(v),{fs:11,a:'middle',fill:'var(--mute)'})});
    s+=t(R,top+band*3+28,'weights in the network (log scale)',{fs:11,a:'end',fill:'var(--mute)'});
    EXP.forEach(e=>{const x=lx(e.n),y=top+e.row*band+54+e.dy*23,c=e.w?'var(--c2)':'var(--c1)',r=12;
      const fill=e.ok?c:'var(--card)',tc=e.ok?'var(--bg)':c;
      s+=e.w?'<rect x="'+(x-r)+'" y="'+(y-r)+'" width="'+2*r+'" height="'+2*r+'" rx="3" fill="'+fill+'" stroke="'+c+'" stroke-width="2"/>'
            :'<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+fill+'" stroke="'+c+'" stroke-width="2"/>';
      s+=t(x,y+4,e.id,{fs:e.id.length>1?11:12,a:'middle',fill:tc,w:600})});
    el.innerHTML=RD.svg(W,H,s,'Experiments 1 to 8 placed by network size and by what Astra was given');
  }

  // Fig. copying heads: 4 layers x 6 heads per model, the copying heads filled
  const HEADS=[['Python',['2.1','3.1','3.5']],['Romaji',['3.3']],['English',['3.1']]];
  function heads(){
    const el=$('wp-heads'),W=RD.width(el),gap=14,per=Math.min(210,(W-2*gap)/3),cs=Math.floor((per-14)/6),gw=cs*6,H=cs*4+44;
    let s='';
    HEADS.forEach(([nm,hs],k)=>{const x0=k*(gw+gap+14)+14;s+=t(x0,14,nm,{fs:12.5,w:600});
      for(let l=0;l<4;l++)for(let h=0;h<6;h++){const on=hs.includes(l+'.'+h);
        s+='<rect x="'+(x0+h*cs+1)+'" y="'+(22+l*cs+1)+'" width="'+(cs-2)+'" height="'+(cs-2)+'" rx="3" fill="'+(on?'var(--c2)':'var(--soft)')+'" stroke="var(--line)"/>'}
      if(k===0)for(let l=0;l<4;l++)s+=t(x0-4,22+l*cs+cs/2+4,String(l),{fs:11,a:'end',fill:'var(--mute)'});});
    s+=t(14,H-4,'rows: layer 0 to 3 · columns: head 0 to 5',{fs:11,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,s,'Copying heads of the three character-level models');
  }

  // Fig. MinAtar: three bars per game, log scale
  const MIN=[['Breakout',15.8,25.3,517.4],['Seaquest',5.6,88.9,53.1],['Asterix',25.8,55.2,53.2]];
  const SER=[['PPO, 100M steps','var(--dim)'],['PPO, 500M steps','var(--mute)'],['Astra, one reply','var(--c2)']];
  function minatar(){
    const el=$('wp-minatar'),W=RD.width(el),L=W<440?74:96,R=W-52,bh=15,gh=3*bh+22,H=MIN.length*gh+30;
    const lx=v=>L+(Math.log10(v)-0)/(3)*(R-L);
    let s='';
    [1,10,100,1000].forEach(v=>{const x=lx(v);s+='<line x1="'+x+'" x2="'+x+'" y1="0" y2="'+(H-24)+'" stroke="var(--line)"/>'+t(x,H-10,String(v),{fs:11,a:'middle',fill:'var(--mute)'})});
    MIN.forEach((g,i)=>{const y0=i*gh+6;s+=t(0,y0+bh*1.5+4,g[0],{fs:12.5,w:600});
      for(let k=0;k<3;k++){const y=y0+k*bh,x=lx(g[k+1]);s+='<rect x="'+L+'" y="'+y+'" width="'+Math.max(1,x-L)+'" height="'+(bh-3)+'" rx="2" fill="'+SER[k][1]+'"/>'+t(x+4,y+bh-5,String(g[k+1]),{fs:11.5,fill:k===2?'var(--c2)':'var(--mute)',w:k===2?600:400})}});
    el.innerHTML=RD.svg(W,H,s,'MinAtar scores, PPO and Astra')+
      '<div class="wp-lg">'+SER.map(x=>'<span><i style="background:'+x[1]+'"></i>'+x[0]+'</span>').join('')+'</div>';
  }

  // Fig. Experiment 8 runs: MATH-500 against forward passes, every run of the released results table
  const RUNS=[ // [passes, MATH-500, series, label]
    [0,7.9,'q','unedited'],[10,12.3,'q',''],[25,14.1,'q',''],[50,48.1,'q',''],
    [0,7.9,'qo','v2: no edit'],[5,7.9,'qo','v3: no edit'],[10,7.9,'qo','v4: no edit'],[25,14.1,'qo','v4'],
    [0,6.8,'g',''],[5,7.0,'g',''],[10,7.6,'g',''],[25,7.7,'g',''],[50,7.0,'g','']];
  function runs(){
    const el=$('wp-runs'),W=RD.width(el),L=36,R=W-14,T=10,B=200,H=B+34;
    const xs=[0,5,10,25,50],px=p=>L+xs.indexOf(p)/(xs.length-1)*(R-L)+(0),py=v=>B-v/50*(B-T);
    let s='';
    [0,10,20,30,40,50].forEach(v=>{s+='<line x1="'+L+'" x2="'+R+'" y1="'+py(v)+'" y2="'+py(v)+'" stroke="var(--line)"/>'+t(L-6,py(v)+4,String(v),{fs:11,a:'end',fill:'var(--mute)'})});
    xs.forEach(p=>{s+=t(px(p),B+16,String(p),{fs:11,a:'middle',fill:'var(--mute)'})});
    s+=t(R,B+30,'forward passes allowed',{fs:11,a:'end',fill:'var(--mute)'});
    const line=(k,c)=>{const p=RUNS.filter(r=>r[2]===k).map(r=>px(r[0])+','+py(r[1])).join(' ');return '<polyline points="'+p+'" fill="none" stroke="'+c+'" stroke-width="2"/>'};
    s+=line('q','var(--c2)')+line('g','var(--c6)');
    RUNS.forEach(r=>{const c=r[2]==='g'?'var(--c6)':'var(--c2)',x=px(r[0])+(r[2]==='qo'?9:0),y=py(r[1]);
      s+='<circle cx="'+x+'" cy="'+y+'" r="5" fill="'+(r[2]==='qo'?'var(--card)':c)+'" stroke="'+c+'" stroke-width="2"/>'});
    s+=t(px(50)-8,py(48.1)+4,'48.1',{fs:12,a:'end',fill:'var(--c2)',w:600});
    s+=t(px(25),py(14.1)-10,'14.1',{fs:11,a:'middle',fill:'var(--c2)'})+t(px(10),py(12.3)-10,'12.3',{fs:11,a:'middle',fill:'var(--c2)'});
    s+=t(px(50)-8,py(7.0)+16,'Gemma 7.0',{fs:11,a:'end',fill:'var(--c6)'});
    el.innerHTML=RD.svg(W,H,s,'MATH-500 against forward passes for every Experiment 8 run');
  }

  // Fig. the measured edit: |u.w_j| of every neuron, sorted, the edited ones marked (inputs/real_edit.json via window.ARTICLE.edit)
  let lay=0;
  function edit(){
    const D=window.ARTICLE&&ARTICLE.edit;if(!D)return;const Ld=D.layers[lay],v=Ld.abs_u_sorted,n=v.length;
    const el=$('wp-edit'),W=RD.width(el),L=44,R=W-10,T=10,B=170,H=B+40;
    const lo=Math.log10(Math.max(1e-5,v[n-1])),hi=Math.log10(v[0]);
    const px=i=>L+i/(n-1)*(R-L),py=x=>B-(Math.log10(Math.max(1e-5,x))-lo)/(hi-lo)*(B-T);
    let s='';
    [1e-4,1e-3,1e-2,1e-1].forEach(g=>{if(Math.log10(g)<lo||Math.log10(g)>hi)return;s+='<line x1="'+L+'" x2="'+R+'" y1="'+py(g)+'" y2="'+py(g)+'" stroke="var(--line)"/>'+t(L-6,py(g)+4,String(g),{fs:11,a:'end',fill:'var(--mute)'})});
    const step=Math.max(1,Math.floor(n/(R-L)));let p='';for(let i=0;i<n;i+=step)p+=px(i).toFixed(1)+','+py(v[i]).toFixed(1)+' ';
    s+='<polyline points="'+p+'" fill="none" stroke="var(--mute)" stroke-width="1.5"/>';
    Ld.edited_sorted_pos.forEach(i=>{s+='<line x1="'+px(i)+'" x2="'+px(i)+'" y1="'+(B+4)+'" y2="'+(B+14)+'" stroke="var(--c2)" stroke-width="1.5"/><circle cx="'+px(i)+'" cy="'+py(v[i])+'" r="2.6" fill="var(--c2)"/>'});
    [0,1000,2000,3000].forEach(i=>{s+=t(px(i),B+28,i===0?'1':String(i),{fs:11,a:'middle',fill:'var(--mute)'})});
    s+=t(R,B+28,'rank of 3,584',{fs:11,a:'end',fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,s,'Sorted write strength along u for every neuron, edited ones marked');
    const f=x=>x.toFixed(4),nm=lay?'19':'15';
    $('wp-edit-cap').innerHTML='Layer '+nm+': all 3,584 MLP neurons sorted by |u·w<sub>j</sub>| before the edit (log scale), how strongly the neuron\'s output column points along the edit\'s direction. Orange: the 64 edited neurons. '+Ld.edited_in_top64_by_abs_u+' of them are in the top 64; the lowest-ranked is number '+(Ld.edited_rank_max+1).toLocaleString('en-GB')+'. Median |u·w<sub>j</sub>|: '+f(Ld.abs_u_edited_median)+' for the edited neurons, '+f(Ld.abs_u_all_median)+' for all. After the edit each edited component is −5 times its old value (share removed '+Ld.removed_share_median.toFixed(2)+'); the matrix changed by '+(100*Ld.rel_change_tensor).toFixed(1)+'% of its norm. Measured by <code>src/real_edit.py</code> from the released diff (CC BY 4.0) and Qwen/Qwen3.5-0.8B at revision 2fc0636 (both hashes checked).';
  }
  const segL=$('wp-lay');if(segL)RD.seg(segL,m=>{lay=+m;edit()});

  const all=()=>{hero();heads();minatar();runs();edit()};
  RD.onRender(all);RD.onResize(all);all();
})();
