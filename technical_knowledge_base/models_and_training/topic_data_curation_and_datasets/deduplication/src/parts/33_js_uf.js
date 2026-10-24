// ---- Union-find clusters (Reading section 4; was tab t-uf) ----
(function(){
  const F=DP.uf,U=DPU,$=id=>document.getElementById(id),esc=U.esc;
  const NAMES=['25 pages: one cookie banner','8 pages: a consent notice','8 pages: flower-shop template'];
  let ci=0,chk=0,an=null;
  $('dp-uf-cl').innerHTML=F.anim.map((a,i)=>'<button data-m="'+i+'"'+(i?'':' class="on"')+'>'+(NAMES[i]||a.members.length+' pages')+'</button>').join('');
  $('dp-uf-eq').textContent=F.equals_run0?F.removed+' documents, identical ids':'MISMATCH';
  const short=h=>h.replace(/^www\./,'');
  function layout(n,w,h){const cx=w/2,cy=h/2,R=Math.min(w,h)/2-26;return [...Array(n)].map((_,i)=>{const a=-Math.PI/2+2*Math.PI*i/n;return [cx+R*Math.cos(a),cy+R*Math.sin(a)]})}
  function draw(i){const A=F.anim[ci],n=A.members.length,last=i>=A.ops.length,op=last?A.ops[A.ops.length-1]:A.ops[i];
    const idx={};A.members.forEach((m,k)=>idx[m]=k);
    const par=op.par.map(p=>idx[p]);
    const root=k=>{while(par[k]!==k)k=par[k];return k};
    const el=$('dp-uf-plot'),w=Math.min(560,RD.width(el)),h=Math.min(440,w*0.86),pos=layout(n,w,h);
    let g='<defs><marker id="dp-uf-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--mute)"/></marker></defs>';
    // parent pointers
    for(let k=0;k<n;k++){if(par[k]===k)continue;const a=pos[k],b=pos[par[k]],dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy)||1;
      g+='<line x1="'+(a[0]+dx/L*9).toFixed(1)+'" y1="'+(a[1]+dy/L*9).toFixed(1)+'" x2="'+(b[0]-dx/L*10).toFixed(1)+'" y2="'+(b[1]-dy/L*10).toFixed(1)+'" stroke="var(--mute)" stroke-width="1.2" marker-end="url(#dp-uf-ar)"/>'}
    const ka=idx[op.a],kc=idx[op.c],path=new Set([...op.pa,...op.pc].map(x=>idx[x]));
    if(!last){const a=pos[ka],b=pos[kc];g+='<line x1="'+a[0]+'" y1="'+a[1]+'" x2="'+b[0]+'" y2="'+b[1]+'" stroke="var(--acc)" stroke-width="2.5" stroke-dasharray="5 3"/>'}
    const kept=idx[A.kept];
    for(let k=0;k<n;k++){const [x,y]=pos[k],isRoot=par[k]===k,inPair=!last&&(k===ka||k===kc);
      let fill='var(--bg)',stroke='var(--line)';
      if(last){const jk=A.jk[k],rem=k!==kept&&(!chk||(jk!=null&&jk>=0.8));fill=k===kept?'var(--good)':rem?'var(--bad)':'var(--acc)';stroke=fill}
      else{if(isRoot&&op.par.some((p,q)=>q!==k&&idx[p]===k))stroke='var(--good)';if(path.has(k))fill='var(--acc2)';if(inPair)stroke='var(--acc)'}
      g+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="9" fill="'+fill+'" stroke="'+stroke+'" stroke-width="2"><title>'+esc(A.hosts[k])+'</title></circle>'+RD.t(x,y+3.5,k+1,{a:'middle',fs:9.5,fill:last?'var(--bg)':'var(--ink)'})}
    el.innerHTML=RD.svg(w,h,g,'Union-find forest of one MinHash cluster');
    // caption
    const sets=new Set([...Array(n)].map((_,k)=>root(k))).size;
    let c;
    if(last){const removed=A.members.filter((m,k)=>k!==kept&&(!chk||(A.jk[k]!=null&&A.jk[k]>=0.8))).length;
      c='<b>Result.</b> One root survives (green, #'+(kept+1)+' '+esc(short(A.hosts[kept]))+'); '+(chk?'with the check, only members whose true Jaccard with it is at least 0.8 are removed: <b>'+removed+'</b> of '+(n-1)+'; the blue ones stay.':'every other member is removed: <b>'+(n-1)+'</b> documents, whatever their own similarity to the root.')+' The root is whichever set won the size comparisons, not the longest, newest or best page.'}
    else{const pl=(p)=>p.map(x=>'#'+(idx[x]+1)).join(' &rarr; ');
      c='Band '+(op.b+1)+': #'+(ka+1)+' and #'+(kc+1)+' have an equal band value. find(#'+(ka+1)+') walks '+pl(op.pa)+', find(#'+(kc+1)+') walks '+pl(op.pc)+'. '+(op.j?'Different roots: the smaller set\'s root #'+(idx[op.j[0]]+1)+' now points to #'+(idx[op.j[1]]+1)+' (union by size).':'Same root already: nothing to do.')+' Path compression re-points every node on a walked path straight at its root, so the next find is one step.'}
    const nb=Object.keys(A.noop).length?' Not drawn: '+Object.entries(A.noop).map(([b,c])=>c+' in band '+(+b+1)).join(', ')+', all already joined.':'';
    $('dp-uf-cap').innerHTML=c+(i===0?nb:'');
    const st=(k,v)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div></div>';
    $('dp-uf-cnt').innerHTML=st('operation',last?'done':(i+1)+' of '+A.ops.length)+st('pair records for this cluster',A.n_ops)+st('separate sets now',sets)+st('documents',n);
    $('dp-uf-leg').innerHTML=A.members.map((m,k)=>{const rem=last&&k!==kept&&(!chk||(A.jk[k]!=null&&A.jk[k]>=0.8));
      return '<span class="'+(last?(k===kept?'kp':rem?'rm':''):'')+'">#'+(k+1)+' '+esc(short(A.hosts[k]))+' <span class="g">'+(k===kept?'kept':'J '+(A.jk[k]==null?'n/a':A.jk[k].toFixed(2)))+'</span></span>'}).join('')}
  function start(){an.reset(F.anim[ci].ops.length+1)}
  RD.seg($('dp-uf-cl'),m=>{ci=+m;start()});
  RD.seg($('dp-uf-chk'),m=>{chk=+m;an.redraw()});
  an=RD.anim({card:'dp-uf-card',ctl:'dp-uf-ctl',n:F.anim[0].ops.length+1,draw,ms:900,label:'Union-find operation'});
  // table of all clusters
  function table(){$('dp-uf-tab').innerHTML='<thead><tr><th class="num">#</th><th class="num">size</th><th>hosts (first of '+'up to 4)</th><th class="num">Jaccard min to max</th><th class="num">removed</th><th class="num">removed with 0.8 check</th></tr></thead><tbody>'+
      F.clusters.map((c,i)=>'<tr><td class="num">'+(i+1)+'</td><td class="num">'+c.n+'</td><td>'+c.hosts.map(h=>esc(short(h))).join(', ')+(c.nhosts>4?' and '+(c.nhosts-4)+' more':'')+'</td><td class="num">'+c.j_min.toFixed(2)+' to '+c.j_max.toFixed(2)+'</td><td class="num">'+(c.n-1)+'</td><td class="num">'+c.chk+'</td></tr>').join('')+'</tbody>';
    $('dp-uf-tabnote').innerHTML='Total: '+F.removed+' removed by datatrove, '+F.removed_with_check08+' with the check. The kept root is the longest member in '+F.kept_is_longest+' of 31 clusters and the lowest document index in '+F.kept_is_first+'. Candidate pair records written: '+F.pair_records+' ('+F.distinct_pairs+' distinct pairs).'}
  table();
  U.onTab('t-read',()=>an.redraw());
})();
