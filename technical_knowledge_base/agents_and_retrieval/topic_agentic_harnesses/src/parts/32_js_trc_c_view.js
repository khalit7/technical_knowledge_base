// ---- Trace and context lab: all-runs table, trace viewer, run-to-run strips ----
(function(){
  const X=window.TRC;if(!X||!X.D.length)return;
  const {D,by,esc,n0,k1,usd,sec,P,derived,ctxOf}=X;
  const runs=D.filter(r=>r.group!=='ctx');
  let cur=by.std_haiku_2?'std_haiku_2':runs[0].id, selCall=-1, view='tok';
  const verdict=r=>r.pass===true?'<span class="trc-ok">pass</span>':r.pass===false?'<span class="trc-no">fail</span>':'<span class="mute">no edit</span>';

  // ---------- all runs ----------
  function table(){
    const el=document.getElementById('trc-table');if(!el)return;
    let h='<div class="tw"><table class="trc-t"><thead><tr><th>Run</th><th>Mode</th><th class="num">Model calls</th><th class="num">Tool calls</th><th class="num">Denied</th><th class="num">Input processed</th><th class="num">of it cache reads</th><th class="num">Output</th><th class="num">API-price equivalent</th><th class="num">Wall time</th><th>Result</th></tr></thead><tbody>';
    runs.forEach(r=>{const d=derived(r);
      h+='<tr data-id="'+r.id+'"'+(r.id===cur?' class="sel"':'')+'><td>'+esc(r.title)+'</td><td>'+esc(r.perm)+'</td><td class="num">'+d.calls+(d.allcalls>d.calls?' <span class="mute">+'+(d.allcalls-d.calls)+' sub</span>':'')+'</td><td class="num">'+d.tools+'</td><td class="num">'+d.den+'</td><td class="num">'+n0(d.inTot)+'</td><td class="num">'+Math.round(d.crshare*100)+'%</td><td class="num">'+n0(d.out)+'</td><td class="num">'+usd(d.cost)+'</td><td class="num">'+sec(d.dur)+'</td><td>'+verdict(r)+'</td></tr>'});
    h+='</tbody></table></div>';el.innerHTML=h;
    el.querySelectorAll('tbody tr').forEach(tr=>tr.addEventListener('click',()=>{select(tr.dataset.id);document.getElementById('trc-s3').scrollIntoView({block:'start'})}));
  }

  // ---------- viewer ----------
  function select(id){cur=id;selCall=-1;const s=document.getElementById('trc-run');if(s)s.value=id;table();viewer()}
  function chart(){
    const r=by[cur],el=document.getElementById('trc-chart');if(!el)return;
    const W=Math.min(860,X.width(el)),H=230,L=46,R=50,Tp=14,B=30;
    const cs=r.calls,n=cs.length,p=P(r.model);
    const segs=c=>{const q=P(c[7]||r.model);return view==='tok'?[c[2],c[1],c[0],c[3]]:[c[2]*q.r/1e6,c[1]*(c[8]?q.w5:q.w1)/1e6,c[0]*q.in/1e6,c[3]*q.out/1e6]};
    const cols=['var(--trc-cr)','var(--trc-cw)','var(--trc-in)','var(--trc-out)'];
    const tot=cs.map(c=>segs(c).reduce((a,b)=>a+b,0));const mx=Math.max(...tot,1e-9);
    let cum=0;const cumv=cs.map(c=>cum+=X.callCost(c,r.model));const cmx=Math.max(cum,1e-9);
    const bw=Math.max(4,Math.min(46,(W-L-R)/n*0.72)),step=(W-L-R)/n;
    let b='';
    for(let g=0;g<=4;g++){const y=Tp+(H-Tp-B)*(1-g/4);b+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/>'+X.T(L-4,y+4,view==='tok'?k1(mx*g/4):'$'+(mx*g/4).toFixed(mx<0.005?4:3),{a:'end',fs:10,fill:'var(--mute)'})+X.T(W-R+4,y+4,'$'+(cmx*g/4).toFixed(3),{fs:10,fill:'var(--mute)'})}
    cs.forEach((c,i)=>{const x=L+step*i+(step-bw)/2;let y=H-B;const sg=segs(c);
      sg.forEach((v,j)=>{const h=(H-Tp-B)*v/mx;if(h>0){y-=h;b+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+Math.max(0.6,h).toFixed(1)+'" fill="'+cols[j]+'"'+(c[6]?' opacity=".55"':'')+'/>'}});
      if(i===selCall)b+='<rect x="'+(x-2).toFixed(1)+'" y="'+(Tp-2)+'" width="'+(bw+4).toFixed(1)+'" height="'+(H-B-Tp+4)+'" fill="none" stroke="var(--ink)" stroke-width="1.5"/>';
      b+='<rect class="hit" data-i="'+i+'" x="'+(L+step*i).toFixed(1)+'" y="'+Tp+'" width="'+step.toFixed(1)+'" height="'+(H-B-Tp)+'" fill="transparent"><title>Call '+(i+1)+(c[6]?' (subagent)':'')+': fresh input '+n0(c[0])+', cache write '+n0(c[1])+', cache read '+n0(c[2])+', output '+n0(c[3])+' (thinking '+n0(c[4])+'), stop: '+(c[5]||'n/a')+'</title></rect>';
      if(n<=16||i%Math.ceil(n/16)===0)b+=X.T(L+step*i+step/2,H-B+13,String(i+1),{a:'middle',fs:10,fill:'var(--mute)'});
    });
    let pth='';cumv.forEach((v,i)=>{const x=L+step*i+step/2,y=Tp+(H-Tp-B)*(1-v/cmx);pth+=(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)});
    b+='<path d="'+pth+'" fill="none" stroke="var(--ink)" stroke-width="1.5" stroke-dasharray="4 3"/>';
    b+=X.T(L,H-4,'model call',{fs:10,fill:'var(--mute)'})+X.T(W-2,Tp-4,'cumulative',{a:'end',fs:10,fill:'var(--mute)'});
    el.innerHTML=X.svg(W,H,b,'Tokens per model call for '+r.title);
    el.querySelectorAll('rect.hit').forEach(h=>h.addEventListener('click',()=>{selCall=+h.dataset.i;chart();events(true)}));
  }
  function stats(){
    const r=by[cur],d=derived(r),el=document.getElementById('trc-stats');if(!el)return;
    const st=(k,v,s)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+(s||'')+'</div></div>';
    el.innerHTML=st('Model calls',d.calls+(d.allcalls>d.calls?' + '+(d.allcalls-d.calls):''),d.allcalls>d.calls?'main + subagent':'the CLI reports num_turns '+d.turns)+
      st('Tool calls',d.tools,d.den?d.den+' denied by the permission layer':'none denied')+
      st('Input processed',k1(d.inTot),Math.round(d.crshare*100)+'% read from cache')+
      st('Output',k1(d.out),'of which thinking '+n0(r.u.th))+
      st('API-price equivalent',usd(d.cost),'recomputed from usage: '+usd(d.recost))+
      st('Wall time',sec(d.dur),'API time '+sec(r.api));
    const v=document.getElementById('trc-verdict');
    if(v)v.innerHTML='<b>Result:</b> '+verdict(r)+' '+(r.verdict?esc(r.verdict):r.post?'<span class="mute">Test runner afterwards:</span> <code>'+esc(r.post.split('\n').slice(-1)[0])+'</code>':'')+
      '<br><b>Model:</b> <code>'+esc(r.model)+'</code> &nbsp; <b>Permission mode:</b> <code>'+esc(r.perm)+'</code> &nbsp; <b>Tools:</b> <code>'+esc((r.tools||[]).join(', '))+'</code> &nbsp; <b>Claude Code:</b> '+esc(r.ccv)+
      (r.denials.length?'<br><b>Denied:</b> '+r.denials.map(x=>'<code>'+esc(x.input)+'</code>').join('; '):'');
  }
  function events(scroll){
    const r=by[cur],el=document.getElementById('trc-events');if(!el)return;
    let h='',lastC=null;
    r.ev.forEach((e,j)=>{
      if(e.c!==lastC&&e.k!=='res'&&!e.p){lastC=e.c;const c=r.calls[e.c];
        h+='<div class="trc-callhd" data-c="'+e.c+'">'+(e.p?'Subagent call ':'Model call ')+(e.c+1)+(c?' · reads '+n0(ctxOf(c))+' tokens ('+n0(c[2])+' from cache), writes '+n0(c[3])+' · stop: '+esc(c[5]||'n/a'):'')+'</div>'}
      const kind=e.k==='res'&&e.e?'err':e.k;const lab={think:'thinking',text:'text',tool:'tool call',res:'tool result',err:'error result'}[kind];
      const sm=e.k==='think'?'thinking happened; its text is not in the stream (only a signature, dropped here)':e.k==='tool'?e.n+': '+e.s.split('\n')[0]:e.k==='res'?(e.n?e.n+' returned ':'')+n0(e.len)+' characters: '+e.s.split('\n')[0]:e.s.split('\n')[0];
      const body=e.k==='think'?'':'<div class="trc-body"><pre>'+esc(e.s)+'</pre></div>';
      h+='<details class="trc-ev'+(e.p?' sub':'')+(e.c===selCall?' sel':'')+'" data-c="'+e.c+'"'+(e.c===selCall&&e.k!=='think'?' open':'')+'><summary><span class="trc-k '+kind+'">'+lab+'</span><span class="trc-sm">'+esc(sm)+'</span></summary>'+body+'</details>';
    });
    h+='<div class="trc-callhd">Final result record</div><pre>'+esc(r.result)+'</pre>';
    if(r.diff)h+='<div class="trc-callhd">What changed on disk (diff against the original repo)</div><pre>'+esc(r.diff)+'</pre>';
    el.innerHTML=h;
    if(scroll&&selCall>=0){const t=el.querySelector('.trc-callhd[data-c="'+selCall+'"]');if(t)el.scrollTop=t.offsetTop-el.offsetTop-4}
  }
  function viewer(){stats();chart();events(false)}

  // ---------- run to run ----------
  function strips(){
    const el=document.getElementById('trc-strips');if(!el)return;
    const groups=[['Haiku','std_haiku_',3,'var(--c1)'],['Sonnet','std_sonnet_',3,'var(--c2)'],['Haiku + CLAUDE.md','md_haiku_',3,'var(--c3)']];
    const mets=[['Model calls',d=>d.calls,v=>v],['Tool calls',d=>d.tools,v=>v],['Input processed (tokens)',d=>d.inTot,k1],['Output (tokens)',d=>d.out,k1],['API-price equivalent',d=>d.cost,usd],['Wall time',d=>d.dur,sec]];
    const W=Math.min(860,X.width(el)),lw=Math.min(150,W*0.36),rh=26;let b='';const H=mets.length*(groups.length*rh/1.6+22)+10;let y=8;
    mets.forEach(m=>{
      const all=[];groups.forEach(g=>{for(let i=1;i<=g[2];i++){const r=by[g[1]+i];if(r)all.push(m[1](derived(r)))}});
      const mx=Math.max(...all)*1.08||1;b+=X.T(0,y+10,m[0],{fs:11.5,w:600})+X.T(W-8,y+10,'axis 0 to '+m[2](mx),{a:'end',fs:10,fill:'var(--mute)'});y+=16;
      groups.forEach(g=>{b+=X.T(lw-6,y+9,g[0],{a:'end',fs:10.5,fill:'var(--mute)'})+'<line x1="'+lw+'" x2="'+(W-8)+'" y1="'+(y+5)+'" y2="'+(y+5)+'" stroke="var(--line)"/>';
        for(let i=1;i<=g[2];i++){const r=by[g[1]+i];if(!r)continue;const v=m[1](derived(r));const x=lw+(W-8-lw)*v/mx;
          b+='<circle cx="'+x.toFixed(1)+'" cy="'+(y+5)+'" r="5" fill="'+g[3]+'" fill-opacity=".8"><title>'+esc(r.title)+': '+m[2](v)+'</title></circle>'}
        y+=rh/1.6});
      y+=6});
    el.innerHTML=X.svg(W,y+4,b,'Each run as a dot, per metric');
  }

  function init(){
    const s=document.getElementById('trc-run');
    if(s&&!s.options.length){runs.forEach(r=>{const o=document.createElement('option');o.value=r.id;o.textContent=r.title;s.appendChild(o)});s.value=cur;s.addEventListener('change',()=>select(s.value))}
    const sg=document.getElementById('trc-view');
    if(sg&&!sg.dataset.on){sg.dataset.on=1;sg.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;view=b.dataset.m;sg.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));chart()})}
    table();viewer();strips();X.fill();
  }
  X.onRender(init);X.onResize(()=>{chart();strips()});
  X.select=select;
})();
