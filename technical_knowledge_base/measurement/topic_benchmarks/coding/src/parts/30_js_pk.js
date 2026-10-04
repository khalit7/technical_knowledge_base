// ---- pass@k lab ----
(function(){
  const $=id=>document.getElementById(id);if(!$('t-pk'))return;
  const n=$('pk-n'),c=$('pk-c'),k=$('pk-k');
  function one(){
    const N=+n.value;c.max=N;k.max=N;const C=Math.min(+c.value,N),K=Math.min(+k.value,N);c.value=C;k.value=K;
    $('pk-nv').textContent=N;$('pk-cv').textContent=C;$('pk-kv').textContent=K;
    const u=CM.passk(N,C,K),p=CM.plug(N,C,K);
    $('pk-out').innerHTML=RD.stat('Codex estimator',CM.pct(u,2),'1 − C('+(N-C)+','+K+')/C('+N+','+K+')')+RD.stat('Plug-in',CM.pct(p,2),'1 − (1 − '+C+'/'+N+')<sup>'+K+'</sup>')+RD.stat('Difference',((u-p)*100).toFixed(2)+' points','Codex minus plug-in')+RD.stat('pass@1 (both agree)',CM.pct(C/N,2),'c / n');
  }
  [n,c,k].forEach(e=>e.addEventListener('input',one));one();
  function bias(){
    const P=+$('pk-p').value/100,N=+$('pk-n2').value;$('pk-pv').textContent=(P*100).toFixed(0)+'%';$('pk-n2v').textContent=N;
    const el=$('pk-bias'),W=RD.width(el),H=230,L=40,R=10,T=10,B=32,iw=W-L-R,ih=H-T-B;
    const x=kk=>L+iw*(kk-1)/Math.max(1,N-1),y=v=>T+ih*(1-v);let s='';
    for(const g of [0,.25,.5,.75,1])s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(g)+'" y2="'+y(g)+'" stroke="var(--line)"/>'+RD.t(L-5,y(g)+4,Math.round(g*100)+'%',{a:'end',fs:10,fill:'var(--mute)'});
    const ln=(f,col,w,da)=>{let d='';for(let kk=1;kk<=N;kk++)d+=(d?'L':'M')+x(kk).toFixed(1)+','+y(f(kk)).toFixed(1);return '<path d="'+d+'" fill="none" stroke="'+col+'" stroke-width="'+w+'"'+(da?' stroke-dasharray="'+da+'"':'')+'/>'};
    s+=ln(kk=>1-Math.pow(1-P,kk),'var(--ink)',1.5,'5 4')+ln(kk=>CM.expect(N,P,kk,CM.passk),'var(--c1)',2.4)+ln(kk=>CM.expect(N,P,kk,CM.plug),'var(--c2)',2.4);
    const tk=[1,Math.round(N/4),Math.round(N/2),Math.round(3*N/4),N].filter((v,i,a)=>v>=1&&a.indexOf(v)===i);
    for(const kk of tk)s+=RD.t(x(kk),H-B+15,String(kk),{a:'middle',fs:10,fill:'var(--mute)'});
    s+=RD.t(L+iw/2,H-3,'k',{a:'middle',fs:10.5,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,s,'Average estimates of pass@k against the truth');
    let worst=0,wk=1;for(let kk=1;kk<=N;kk++){const g=(1-Math.pow(1-P,kk))-CM.expect(N,P,kk,CM.plug);if(g>worst){worst=g;wk=kk}}
    $('pk-bias-note').innerHTML='With p = '+(P*100).toFixed(0)+'% and n = '+N+', the Codex estimator\'s average lies on the truth at every k (up to rounding); the plug-in\'s is lowest relative to it at k = '+wk+', '+(worst*100).toFixed(1)+' points under. Both agree at k = 1.';
  }
  ['pk-p','pk-n2'].forEach(id=>$(id).addEventListener('input',bias));
  const MS=CD.lcb.models.filter(m=>m.n>1);
  $('pk-m').innerHTML=MS.map((m,i)=>'<option value="'+i+'">'+m.m+' (n = '+m.n+')</option>').join('');
  function curve(M,f){const idx=[];CD.lcb.q.forEach((q,i)=>{if(f==='all'||q[2]===f)idx.push(i)});const cs=idx.map(i=>CM.dig(M.c[i]));
    const u=[],p=[];for(let kk=1;kk<=M.n;kk++){let a=0,b=0;for(const cc of cs){a+=CM.passk(M.n,cc,kk);b+=CM.plug(M.n,cc,kk)}u.push(a/cs.length);p.push(b/cs.length)}return {u,p,np:cs.length}}
  function real(){
    const M=MS[+$('pk-m').value],f=$('pk-f').value,r=curve(M,f);
    const el=$('pk-real'),W=RD.width(el),H=220,L=40,R=10,T=10,B=30,iw=W-L-R,ih=H-T-B;
    const lo=Math.max(0,Math.floor(Math.min(r.u[0],r.p[0])*10)/10-0.1),hi=Math.min(1,Math.ceil(r.u[M.n-1]*10)/10+0.05);
    const x=kk=>L+iw*(kk-1)/(M.n-1),y=v=>T+ih*(1-(v-lo)/(hi-lo));let s='';
    for(let g=lo;g<=hi+1e-9;g+=0.1)s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(g)+'" y2="'+y(g)+'" stroke="var(--line)"/>'+RD.t(L-5,y(g)+4,Math.round(g*100)+'%',{a:'end',fs:10,fill:'var(--mute)'});
    for(const [arr,col] of [[r.u,'var(--c1)'],[r.p,'var(--c2)']]){s+='<path d="'+arr.map((v,i)=>(i?'L':'M')+x(i+1).toFixed(1)+','+y(v).toFixed(1)).join('')+'" fill="none" stroke="'+col+'" stroke-width="2.2"/>';arr.forEach((v,i)=>s+='<circle cx="'+x(i+1)+'" cy="'+y(v)+'" r="2.6" fill="'+col+'"/>')}
    for(let kk=1;kk<=M.n;kk++)s+=RD.t(x(kk),H-B+14,String(kk),{a:'middle',fs:10,fill:'var(--mute)'});
    s+=RD.t(L+iw/2,H-2,'k',{a:'middle',fs:10.5,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,s,'pass@k on LiveCodeBench');
    $('pk-real-out').innerHTML=RD.stat('pass@1',CM.pct(r.u[0]),r.np+' problems')+RD.stat('pass@'+M.n+', Codex',CM.pct(r.u[M.n-1]),'share with ≥ 1 pass')+RD.stat('pass@'+M.n+', plug-in',CM.pct(r.p[M.n-1]),((r.u[M.n-1]-r.p[M.n-1])*100).toFixed(1)+' points low');
    const rows=MS.map(m=>{const q=curve(m,f);return [m.m,q.u[0],q.u[m.n-1],m.n]});
    const r1=rows.slice().sort((a,b)=>b[1]-a[1]).map(a=>a[0]),rk=rows.slice().sort((a,b)=>b[2]-a[2]).map(a=>a[0]);
    $('pk-rank').innerHTML='<table><thead><tr><th>Model</th><th class="num">pass@1</th><th class="num">rank</th><th class="num">pass@max k</th><th class="num">rank</th></tr></thead><tbody>'+rows.sort((a,b)=>b[1]-a[1]).map(a=>'<tr'+(a[0]===M.m?' style="font-weight:600"':'')+'><td>'+a[0]+'</td><td class="num">'+(a[1]*100).toFixed(1)+'</td><td class="num">'+(r1.indexOf(a[0])+1)+'</td><td class="num">'+(a[2]*100).toFixed(1)+' <span class="mute">(k='+a[3]+')</span></td><td class="num">'+(rk.indexOf(a[0])+1)+'</td></tr>').join('')+'</tbody></table>';
  }
  ['pk-m','pk-f'].forEach(id=>$(id).addEventListener('change',real));
  const go=()=>{bias();real()};
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-pk']=[go];
  addEventListener('resize',()=>{if(!$('t-pk').hidden)go()});
})();
