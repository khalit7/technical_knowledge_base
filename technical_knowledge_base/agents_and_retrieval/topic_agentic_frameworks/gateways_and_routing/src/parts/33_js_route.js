// ---- Routing lab (t-route): E1 replay, OpenRouter filters, router experiment table ----
(function(){
  const F=window.FGW,E=RD.esc;
  // 1. E1 replay
  let si=0;const C=F.e1.cases;
  const pick=document.getElementById('ro-pick');pick.innerHTML=C.map((c,i)=>'<button data-i="'+i+'"'+(i?'':' class="on"')+'>'+E(c.s)+'</button>').join('');
  const svg=document.getElementById('ro-svg'),cap=document.getElementById('ro-cap');
  function draw(i){const c=C[si],r=c.r.slice().sort((a,b)=>a[0]-b[0]),k=Math.min(i,r.length-1),now=r[k][0];const W=RD.width(svg),L=24,R=W-18,tmax=Math.max(...C.map(x=>x.wall))*1.02,X=t=>L+(R-L)*t/tmax,rowH=6,H=r.length*rowH+30;let s='';
    for(let t=0;t<=tmax;t+=1)s+='<line x1="'+X(t)+'" x2="'+X(t)+'" y1="4" y2="'+(H-14)+'" stroke="var(--line)"/>'+(t%2?'':RD.t(X(t),H-2,t+' s',{a:'middle',fs:10,fill:'var(--mute)'}));
    r.forEach((q,j)=>{if(j>k)return;s+='<rect x="'+X(q[0])+'" y="'+(4+j*rowH)+'" width="'+Math.max(2,X(q[1])-X(q[0]))+'" height="'+(rowH-1.5)+'" fill="'+(q[2]==='A'?'var(--c1)':'var(--c2)')+'"><title>'+q[2]+': '+q[0].toFixed(2)+' to '+q[1].toFixed(2)+' s</title></rect>'});
    svg.innerHTML=RD.svg(W,H,s,'Forty requests under '+E(c.s));
    const a=r.slice(0,k+1).filter(q=>q[2]==='A').length;
    cap.innerHTML='<div class="t">'+E(c.s)+': request '+(k+1)+' of 40 sent at '+now.toFixed(2)+' s</div><p>So far '+a+' to A (blue, fast), '+(k+1-a)+' to B (orange, slow). All 40 done in '+c.wall.toFixed(2)+' s.</p>'}
  const an=RD.anim({card:'ro-card',ctl:'ro-ctl',n:40,draw,ms:260,label:'Request',tab:'t-route'});
  pick.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;pick.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));si=+b.dataset.i;an.reset(40);an.play()});

  // 2. OpenRouter filters
  const OR=F.or_eps;let om='meta-llama/llama-3.3-70b-instruct';const CTX=[0,16384,32768,65536,131072,200000];
  const op=document.getElementById('ro-orpick');op.innerHTML=Object.keys(OR).map(k=>'<button data-m="'+E(k)+'"'+(k===om?' class="on"':'')+'>'+E(k)+'</button>').join('');
  const qEl=document.getElementById('ro-q');let qs={};
  function qbox(){const set=[...new Set(OR[om].map(e=>e.q||'unknown'))];qs={};set.forEach(q=>qs[q]=true);
    qEl.innerHTML=set.map(q=>'<label class="chk"><input type="checkbox" data-q="'+E(q)+'" checked> '+E(q)+'</label>').join('')}
  qEl.addEventListener('change',e=>{const c=e.target.closest('input');if(!c)return;qs[c.dataset.q]=c.checked;orDraw()});
  op.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;op.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));om=b.dataset.m;qbox();orDraw()});
  ['ro-ctx','ro-mp','ro-sort'].forEach(id=>document.getElementById(id).addEventListener('input',orDraw));
  function orDraw(){const minc=CTX[+document.getElementById('ro-ctx').value],mp=+document.getElementById('ro-mp').value/10,sort=document.getElementById('ro-sort').value;
    document.getElementById('ro-ctxv').textContent=minc?minc.toLocaleString('en-US')+' tokens':'any';document.getElementById('ro-mpv').textContent=mp>=2?'no cap':'$'+mp.toFixed(1);
    const all=OR[om],keep=all.filter(e=>qs[e.q||'unknown']&&e.ctx>=minc&&(mp>=2||e.in<=mp+1e-9));
    const el=document.getElementById('ro-or');
    if(!keep.length){el.innerHTML='<p class="small" style="color:var(--bad)">No endpoint satisfies these filters: OpenRouter would return an error rather than route.</p>';document.getElementById('ro-ornote').textContent='';return}
    let rows;if(sort==='price'){const mn=Math.min(...keep.map(e=>e.in));rows=keep.map(e=>({e,sh:e.in===mn?1/keep.filter(x=>x.in===mn).length:0}))}
    else{const w=keep.map(e=>1/(e.in*e.in)),t=w.reduce((a,b)=>a+b,0);rows=keep.map((e,i)=>({e,sh:w[i]/t}))}
    rows.sort((a,b)=>b.sh-a.sh||a.e.in-b.e.in);
    el.innerHTML='<div class="rt-row small mute"><span class="nm">endpoint (quantisation, context)</span><span>share of first picks</span><span class="v">$/M in, out</span></div>'+rows.map(({e,sh})=>'<div class="rt-row"><span class="nm" title="'+E((e.tag||e.p)+(e.up===null?'':', uptime last 30 min '+e.up+'%'))+'">'+E(e.p)+' <span class="mute">'+E(e.q||'?')+', '+Math.round(e.ctx/1024)+'K</span></span><span class="rt-bar"><span style="width:'+(sh*100).toFixed(1)+'%"></span></span><span class="v">'+(sh*100).toFixed(1)+'%<br><span class="mute small">'+e.in.toFixed(3)+', '+e.out.toFixed(2)+'</span></span></div>').join('');
    document.getElementById('ro-ornote').textContent=keep.length+' of '+all.length+' endpoints kept. '+(sort==='price'?'Sorted by price: the cheapest takes the first pick, the rest are fallbacks in price order.':'Expected average input price of the first pick: $'+rows.reduce((a,r)=>a+r.sh*r.e.in,0).toFixed(3)+' per million.')+' Uptime over the last 30 minutes is in the catalogue too (hover the provider).'}
  qbox();orDraw();

  // 3. router experiment
  const T=F.router.tasks,n=T.length,weak=T.filter(t=>t.lok).length,strong=T.filter(t=>t.hok).length,orc=T.filter(t=>!t.lok&&t.hok).length;
  const TH=[-0.2,...[...new Set(T.map(t=>t.cr))].sort((a,b)=>a-b)];
  const thEl=document.getElementById('ro-th');thEl.max=TH.length-1;let fam='all';
  const fEl=document.getElementById('ro-fam');fEl.innerHTML=['all','facts','arith','code','letters'].map(f=>'<button data-f="'+f+'"'+(f==='all'?' class="on"':'')+'>'+f+'</button>').join('');
  fEl.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;fEl.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));fam=b.dataset.f;rdraw()});
  thEl.addEventListener('input',rdraw);
  function rdraw(){const th=TH[+thEl.value];document.getElementById('ro-thv').textContent=th<=-0.2?'(everything)':th.toFixed(3);
    const up=t=>t.cr>th,share=T.filter(up).length/n,acc=T.reduce((a,t)=>a+(up(t)?t.hok:t.lok),0),cost=T.reduce((a,t)=>a+(up(t)?t.hc:0),0);
    const el=document.getElementById('ro-curve'),W=RD.width(el),L=40,R=W-12,Tp=10,Bt=160,X=f=>L+(R-L)*f,ymin=34,Y=v=>Bt-(Bt-Tp)*(v-ymin)/(n-ymin);let s='';
    for(let v=ymin;v<=n;v+=2)s+='<line x1="'+L+'" x2="'+R+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(L-5,Y(v)+3,v,{a:'end',fs:10,fill:'var(--mute)'});
    [0,.25,.5,.75,1].forEach(f=>s+=RD.t(X(f),Bt+14,Math.round(f*100)+'%',{a:'middle',fs:10,fill:'var(--mute)'}));
    s+='<line x1="'+X(0)+'" y1="'+Y(weak)+'" x2="'+X(1)+'" y2="'+Y(strong)+'" stroke="var(--mute)" stroke-dasharray="4 4"/><polyline fill="none" stroke="var(--good)" points="'+X(0)+','+Y(weak)+' '+X(orc/n)+','+Y(weak+orc)+' '+X(1)+','+Y(strong)+'"/>';
    const pts=TH.map(h=>{const sh=T.filter(t=>t.cr>h).length/n;return [sh,T.reduce((a,t)=>a+(t.cr>h?t.hok:t.lok),0)]});
    s+='<polyline fill="none" stroke="var(--c4)" stroke-width="1.5" points="'+pts.map(p=>X(p[0])+','+Y(p[1])).join(' ')+'"/>';
    s+='<circle cx="'+X(share)+'" cy="'+Y(acc)+'" r="6" fill="var(--c4)"/>';
    el.innerHTML=RD.svg(W,Bt+20,s,'Router quality against share sent to Haiku');
    document.getElementById('ro-cnt').innerHTML=RD.stat('Sent to Haiku',Math.round(share*n)+' of '+n,(share*100).toFixed(0)+'%')+RD.stat('Right',acc+' of '+n,'random at this share: '+(weak+share*(strong-weak)).toFixed(1))+RD.stat('Gap recovered',((acc-weak)/(strong-weak)).toFixed(2),'(right - '+weak+') / ('+strong+' - '+weak+')')+RD.stat('Haiku cost','$'+cost.toFixed(3),'API-price estimate');
    const rows=T.filter(t=>fam==='all'||t.f===fam);
    const tb=document.getElementById('ro-tab');tb.innerHTML='<thead><tr><th>id</th><th>family</th><th>question</th><th>answer</th><th class="num">score</th><th>local</th><th>Haiku</th><th>goes to</th></tr></thead><tbody>'+rows.map(t=>'<tr data-id="'+t.id+'" style="cursor:pointer"><td>'+t.id+'</td><td>'+t.f+'</td><td class="small">'+E(t.q.length>90?t.q.slice(0,90)+' ...':t.q)+'</td><td class="mono">'+E(t.a)+'</td><td class="num">'+t.cr.toFixed(3)+'</td><td class="'+(t.lok?'ok':'no')+'">'+E(t.lo===null?'no answer':t.lo)+'</td><td class="'+(t.hok?'ok':'no')+'">'+E(t.ho===null?'no answer':t.ho)+'</td><td>'+(up(t)?'Haiku':'local')+'</td></tr>').join('')+'</tbody>'}
  document.getElementById('ro-tab').addEventListener('click',e=>{const tr=e.target.closest('tr[data-id]');if(!tr)return;const t=T.find(x=>x.id===tr.dataset.id);
    document.getElementById('ro-det').innerHTML='<div class="detail"><h3>'+t.id+' ('+t.f+')</h3><pre style="white-space:pre-wrap">'+E(t.q)+'</pre><p class="small"><b>Local model, end of reply</b> ('+t.lt+' output tokens, '+t.ls+' s):</p><pre style="white-space:pre-wrap" class="small">'+E(t.lx)+'</pre><p class="small"><b>Haiku, end of reply</b> ('+t.hout+' output tokens, $'+t.hc.toFixed(4)+'):</p><pre style="white-space:pre-wrap" class="small">'+E(t.hx)+'</pre></div>'});
  rdraw();
  RD.onRender(()=>{an.redraw();orDraw();rdraw()},'t-route');
  addEventListener('resize',()=>{const t=document.getElementById('t-route');if(t&&!t.hidden){an.redraw();orDraw();rdraw()}});
})();
