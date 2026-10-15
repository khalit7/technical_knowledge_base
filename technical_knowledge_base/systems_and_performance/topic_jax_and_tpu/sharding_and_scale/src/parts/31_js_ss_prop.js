// ---- Propagation explorer (t-prop): one block, five annotation cases, Shardy vs GSPMD, from the post-propagation HLO ----
(function(){
  const U=SSU, esc=U.esc, $=id=>document.getElementById(id), P=SS.prop;
  const LBL={tp:'Tensor parallel',fsdp_w:'FSDP, weights only',fsdp_c:'FSDP + constraint',seq:'Sequence split',conflict:'Conflict'};
  let ci=0, part='shardy', ph='all';
  $('pp-case').insertAdjacentHTML('beforeend',P.cases.map((c,i)=>'<button data-m="'+i+'"'+(i?'':' class="on"')+'>'+LBL[c.id]+'</button>').join(''));
  const specHtml=s=>{if(!s)return '';if(s==='none')return '<span class="pp-spec mute">none</span>';
    return '<span class="pp-spec">'+esc(s).replace(/data/g,'<span class="pp-ax-data">data</span>').replace(/model/g,'<span class="pp-ax-model">model</span>')+'</span>'};
  function perDev(shape,spec,c){if(!spec||spec==='none'||spec.startsWith('raw'))return shape;
    const ax=spec.replace(/^P\(|\)$/g,'').split(',').map(x=>x.trim());
    return shape.map((d,i)=>{const a=ax[i];if(!a||a==='-')return d;let k=1;a.split('+').forEach(n=>{const j=c.axes.indexOf(n);if(j>=0)k*=c.mesh[j]});return Math.ceil(d/k)})}
  function rows(c,p){const r=c[p].rows;return r}
  // ---------- animation ----------
  let an;
  function steps(){const c=P.cases[ci];return rows(c,part).length+1}
  function drawAnim(i){
    const c=P.cases[ci],R=rows(c,part),coll=c[part].coll;
    $('pp-note').innerHTML='<b>Mesh</b> ('+c.mesh.join(', ')+') over <code>'+c.axes.map(a=>"'"+a+"'").join(', ')+'</code>; x [32, 128, 128] annotated <code>'+esc(c.x_spec)+'</code>'+(c.constraint?'; constraint <code>'+esc(c.constraint)+'</code> after attention':'')+'. '+esc(c.note)+'.';
    let fl='<div class="pp-op ann"><div class="o">inputs (annotated)</div><div class="s">x '+esc(c.x_spec)+'; weights per the case</div></div>';
    R.forEach((r,k)=>{const st=k<i-1?'done':k===i-1?'now':'pend';
      fl+='<div class="pp-op '+st+'" title="'+esc(P.src[r[0]]||'')+'"><div class="o">'+r[0]+' '+esc(r[1])+(r[2]==='bwd'?' (bwd)':'')+'</div><div class="s">'+(st==='pend'?'?':esc(r[4]))+'</div></div>'});
    $('pp-flow').innerHTML=fl;
    const done=R.slice(0,i);
    const lines=new Set(done.map(r=>r[0]+'|'+r[2]));
    const cl=coll.filter(x=>lines.has(x[1]+'|'+x[2]));
    const nb=cl.reduce((s,x)=>s+x[4],0),nc=cl.reduce((s,x)=>s+x[3],0);
    if(i===0)$('pp-cap').innerHTML='<b>Before propagation.</b> Only x and the weights carry shardings. '+R.length+' operation groups have none yet. Press play: the propagator\'s result is filled in, operation by operation.';
    else{const r=R[i-1],here=coll.filter(x=>x[1]===r[0]&&x[2]===r[2]);
      $('pp-cap').innerHTML='<b>model_jax.py:'+r[0]+'</b> <code>'+esc(P.src[r[0]]||'')+'</code><br>'+esc(r[1])+' ('+r[2]+') '+'['+r[3].join(', ')+'] got '+specHtml(r[4])+', so each device holds ['+perDev(r[3],r[4],c).join(', ')+'].'+
        (here.length?' The partitioner puts '+here.map(x=>U.chip(x[0],x[3]+' '+x[0]+', '+U.MB(x[4]))).join(' ')+' on this line.':'')}
    $('pp-cnt').innerHTML=RD.stat('operations assigned',(i)+' of '+R.length,'')+RD.stat('collectives so far',nc,U.MB(nb))+RD.stat('whole block',c[part].coll.reduce((s,x)=>s+x[3],0)+' collectives',U.MB(c[part].coll.reduce((s,x)=>s+x[4],0)));
  }
  an=U.anim({tab:'t-prop',card:'pp-card',ctl:'pp-ctl',n:steps(),draw:drawAnim,ms:700,label:'Operation'});
  // ---------- table ----------
  function drawTable(){
    const c=P.cases[ci],A=c.shardy.rows,B={};c.gspmd.rows.forEach(r=>B[r[0]+'|'+r[1]+'|'+r[2]]=r[4]);
    const R=A.filter(r=>ph==='all'||r[2]===ph);
    $('pp-t').querySelector('tbody').innerHTML=R.map(r=>{const g=B[r[0]+'|'+r[1]+'|'+r[2]];const diff=g!==undefined&&g!==r[4];
      return '<tr'+(diff?' class="pp-diff"':'')+'><td class="num">'+r[0]+'</td><td>'+esc(r[1])+'</td><td>'+r[2]+'</td><td class="num">['+r[3].join(', ')+']</td><td>'+specHtml(r[4])+'</td><td>'+specHtml(g)+'</td><td class="num">['+perDev(r[3],r[4],c).join(', ')+']</td><td class="src"><code>'+esc(P.src[r[0]]||'')+'</code></td></tr>'}).join('');
    const cs=p=>c[p].coll.length?c[p].coll.map(x=>U.chip(x[0],x[3]+' '+x[0]+' at line '+x[1]+' ('+x[2]+'), '+U.MB(x[4]))).join(' '):'none';
    $('pp-coll').innerHTML='<p class="small"><b>Collectives, Shardy:</b> '+cs('shardy')+'<br><b>Collectives, GSPMD:</b> '+cs('gspmd')+'<br>Groups compared: '+c.n_ops_compared+', different: '+c.n_ops_differ+' (only "none" against replicated). Loss against one device: Shardy '+U.sci(c.shardy.err)+', GSPMD '+U.sci(c.gspmd.err)+'. Line 0: the collective carries no Python line (inserted for an input or output).</p>';
  }
  U.seg($('pp-case'),v=>{ci=+v;an.reset(steps());drawTable()});
  U.seg($('pp-part'),v=>{part=v;an.reset(steps())});
  U.seg($('pp-ph'),v=>{ph=v;drawTable()});
  drawTable();
  // ---------- whole step ----------
  let fid='tp';
  function drawFull(){
    const F=P.full[fid],by={};
    ['shardy','gspmd'].forEach(p=>F[p].forEach(r=>{const k=r[1];by[k]=by[k]||{shardy:0,gspmd:0,kinds:new Set()};by[k][p]+=r[4];by[k].kinds.add(r[0])}));
    const ks=Object.keys(by).sort((a,b)=>Math.max(by[b].shardy,by[b].gspmd)-Math.max(by[a].shardy,by[a].gspmd));
    const el=$('pp-full-svg'),W=U.width(el),lab=Math.min(190,W*0.42),bw=W-lab-70,rh=30,H=ks.length*rh+6;
    const mx=Math.max(...ks.map(k=>Math.max(by[k].shardy,by[k].gspmd)),1);
    let s='';ks.forEach((k,i)=>{const y=i*rh+3;s+=RD.t(lab-6,y+12,esc(k.length>30?k.slice(0,29)+'.':k),{a:'end',fs:11});
      s+=RD.t(lab-6,y+24,[...by[k].kinds].join(', '),{a:'end',fs:9.5,fill:'var(--mute)'});
      [['shardy','var(--c1)',0],['gspmd','var(--c2)',12]].forEach(q=>{const v=by[k][q[0]],w=Math.max(v?1:0,v/mx*bw);s+='<rect x="'+lab+'" y="'+(y+2+q[2])+'" width="'+w+'" height="10" fill="'+q[1]+'"><title>'+q[0]+': '+U.MB(v)+'</title></rect>'+RD.t(lab+w+4,y+11+q[2],v?U.MB(v):'0',{fs:10})})});
    el.innerHTML=RD.svg(W,H,s,'Collective bytes by source line, Shardy and GSPMD');
    const tot=p=>F[p].reduce((s,r)=>[s[0]+r[3],s[1]+r[4]],[0,0]),a=tot('shardy'),b=tot('gspmd');
    $('pp-full-note').innerHTML='<span class="meas">measured</span> Shardy '+a[0]+' collectives, '+U.MB(a[1])+'; GSPMD '+b[0]+' collectives, '+U.MB(b[1])+'. "(no source line)": collectives the partitioner attached to inputs or outputs. <code>_tree_math.py</code>, <code>update.py</code>, <code>_classification.py</code>: optax 0.2.8 (Adam moments, apply_updates, cross-entropy); <code>sh_strategies.py</code>: the root lab\'s loss wrapper.';
  }
  U.seg($('pp-full'),v=>{fid=v;drawFull()});
  U.onTab('t-prop',()=>{drawFull();an.redraw()});
  addEventListener('resize',()=>{const t=$('t-prop');if(t&&!t.hidden){drawFull()}});
})();
