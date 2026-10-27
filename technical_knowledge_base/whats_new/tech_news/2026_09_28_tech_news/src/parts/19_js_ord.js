// ---- Ord's swarm arithmetic: N agents = one agent with N^lambda tokens ----
(function(){
  const card=$('v-ord');if(!card)return;
  const LS=[[0.68,'BrowseComp','var(--c1)'],[0.57,'SEC-Bench Pro','var(--c2)'],[0.48,'Terminal-Bench','var(--c3)']];
  const f=v=>v>=100?fmt(v):v>=10?v.toFixed(1):v.toFixed(2);
  function draw(){
    const N=10**+$('orNs').value,l=+$('orL').value,M=10**+$('orMs').value,need=M**(1/l);
    $('orN').textContent=fmt(N);$('orM').textContent=f(M)+'x';
    const box=$('orSvg'),W=Math.max(300,Math.round(box.clientWidth||340)),narrow=W<560,H=narrow?250:290;
    const fr=logFrame({W,H,pl:46,pr:narrow?14:118,pt:12,pb:40,x:[1,1e4],y:[1,1e4],
      xt:[[1,'1'],[10,'10'],[100,'100'],[1e3,'1k'],[1e4,'10k']],yt:[[1,'1x'],[10,'10x'],[100,'100x'],[1e3,'1,000x'],[1e4,'10,000x']],
      xl:'agents in the swarm (N)',yl:''});
    let s=fr.s.replace(/font-size="10.5"/g,'font-size="11"');const {lx,ly}=fr;
    s+='<text x="50" y="22" font-size="11" fill="var(--mute)">equivalent single-agent tokens</text>';
    s+='<line x1="'+lx(1)+'" y1="'+ly(1)+'" x2="'+lx(1e4)+'" y2="'+ly(1e4)+'" stroke="var(--mute)" stroke-dasharray="4 3"/>';
    const ends=[{y:ly(1e4)-2,n:'perfect: N',c:'var(--mute)',how:'no stepping on toes, lambda = 1'}];
    LS.forEach(([L,n,c])=>{let d='';for(let i=0;i<=40;i++){const x=10**(i/10);d+=(i?'L':'M')+lx(x).toFixed(1)+','+ly(x**L).toFixed(1)}
      s+='<path d="'+d+'" fill="none" stroke="'+c+'" stroke-width="'+(L===l?3:1.5)+'" opacity="'+(L===l?1:.55)+'"/>';ends.push({y:ly(1e4**L),n:n,c:c,how:'lambda '+L})});
    if(!narrow)s+=endLabels(ends,W-112,13);
    const yv=N**l;s+='<line x1="'+lx(N)+'" x2="'+lx(N)+'" y1="'+ly(1)+'" y2="'+ly(yv)+'" stroke="var(--ink)" stroke-dasharray="2 3"/><circle cx="'+lx(N)+'" cy="'+ly(yv)+'" r="5" fill="var(--ink)"/>';
    const tx=lx(N)>W/2?lx(N)-8:lx(N)+8;
    s+='<text x="'+tx+'" y="'+(ly(yv)-9)+'" font-size="11.5" text-anchor="'+(lx(N)>W/2?'end':'start')+'">'+fmt(N)+' agents = '+f(yv)+'x tokens</text>';
    box.innerHTML=svgEl(W,H,s,'Swarm size against equivalent single-agent tokens');
    $('orStats').innerHTML=stat('Equivalent single agent',f(yv)+'x tokens','N^λ = '+fmt(N)+'^'+l)+stat('Finishes sooner by',f(yv)+'x','speed-up N^λ')+stat('Compute against that single agent',f(N**(1-l))+'x','N^(1−λ)')+stat('Agents to match '+f(M)+'x tokens',fmt(need),'M^(1/λ)')+(narrow?stat('Lines','blue 0.68, orange 0.57, green 0.48','dashed: perfect scaling'):'');
  }
  ['orNs','orMs'].forEach(i=>$(i).addEventListener('input',draw));$('orL').addEventListener('change',draw);
  let rw=0;addEventListener('resize',()=>{const w=card.clientWidth;if(w!==rw){rw=w;draw()}});
  onTab(card.closest('.tab').id,draw);
})();
