// ---- Quantile Balancing against the fixed-step bias rule (illustrative router scores) ----
(function(){
  const card=$('qb');if(!card)return;
  const M=16,NE=4,rnd=mulberry32(11),skew=[0.7,0.25,-0.1,-0.5];
  const SC=[...Array(M)].map(()=>[...Array(NE)].map((_,j)=>1/(1+Math.exp(-(skew[j]+(rnd()*2-1)*1.3)))));
  let K=1,b=[0,0,0,0],hist=[],last='start';
  const biased=i=>SC[i].map((s,j)=>s+b[j]);
  function topk(arr,k){return arr.map((v,j)=>[v,j]).sort((x,y)=>y[0]-x[0]).slice(0,k).map(x=>x[1])}
  function route(){const sel=[...Array(M)].map((_,i)=>topk(biased(i),K));const load=[0,0,0,0];sel.forEach(r=>r.forEach(j=>load[j]++));return {sel,load}}
  function qbStep(){const q=M*K/NE;const alpha=[...Array(M)].map((_,i)=>{const v=biased(i).slice().sort((x,y)=>y-x);return v[K]});
    const bh=[...Array(NE)].map((_,j)=>{const mg=[...Array(M)].map((_,i)=>SC[i][j]-alpha[i]).sort((x,y)=>y-x);return -mg[q]});
    const mean=bh.reduce((p,c)=>p+c,0)/NE;b=bh.map(x=>x-mean);last='qb'}
  function fixedStep(){const {load}=route(),mean=M*K/NE,g=+$('qbGam').value;b=b.map((x,j)=>x+g*Math.sign(mean-load[j]));last='fixed'}
  function draw(){
    const {sel,load}=route(),q=M*K/NE;$('qbG').textContent=(+$('qbGam').value).toFixed(3);
    const W=Math.max(300,Math.min(760,card.clientWidth-28)),narrow=W<520;
    const gw=narrow?W:W*0.5,cw=Math.min(34,(gw-60)/NE),ch=11,gx=44,gy=22;
    let s='<text x="'+gx+'" y="12" font-size="11" fill="var(--mute)">tokens × experts: filled = chosen (top-'+K+' of score + bias)</text>';
    for(let j=0;j<NE;j++)s+='<text x="'+(gx+j*cw+cw/2)+'" y="'+(gy+M*ch+14)+'" font-size="11" text-anchor="middle">E'+(j+1)+'</text>';
    for(let i=0;i<M;i++){s+='<text x="'+(gx-6)+'" y="'+(gy+i*ch+9)+'" font-size="9.5" text-anchor="end" fill="var(--mute)">t'+(i+1)+'</text>';
      for(let j=0;j<NE;j++){const on=sel[i].includes(j);s+='<rect x="'+(gx+j*cw+1)+'" y="'+(gy+i*ch+1)+'" width="'+(cw-2)+'" height="'+(ch-2)+'" rx="2" fill="'+(on?'var(--acc)':'var(--soft)')+'" stroke="var(--line)"/>'}}
    const ox=narrow?0:gw+10,oy=narrow?gy+M*ch+34:0,bh=narrow?140:gy+M*ch,bwid=(narrow?W:W-gw-10)-50,bx0=ox+40,ymax=Math.max(M*K/2,...load)+1;
    const Y=v=>oy+20+(bh-40)*(1-v/ymax);
    s+='<text x="'+bx0+'" y="'+(oy+12)+'" font-size="11" fill="var(--mute)">load per expert; target q = mk/n = '+q+'</text>';
    for(let j=0;j<NE;j++){const x=bx0+j*(bwid/NE)+6,w=bwid/NE-12;s+='<rect x="'+x+'" y="'+Y(load[j])+'" width="'+w+'" height="'+(Y(0)-Y(load[j]))+'" rx="2" fill="'+(load[j]===q?'var(--good)':load[j]>q?'var(--c2)':'var(--dim)')+'"/><text x="'+(x+w/2)+'" y="'+(Y(load[j])-4)+'" font-size="11" text-anchor="middle">'+load[j]+'</text><text x="'+(x+w/2)+'" y="'+(Y(0)+14)+'" font-size="11" text-anchor="middle">E'+(j+1)+'</text><text x="'+(x+w/2)+'" y="'+(Y(0)+27)+'" font-size="9.5" text-anchor="middle" fill="var(--mute)">b '+(b[j]>=0?'+':'−')+Math.abs(b[j]).toFixed(3)+'</text>'}
    s+='<line x1="'+bx0+'" x2="'+(bx0+bwid)+'" y1="'+Y(q)+'" y2="'+Y(q)+'" stroke="var(--good)" stroke-dasharray="5 3"/>';
    const Ht=narrow?oy+bh+20:gy+M*ch+22;
    $('qbSvg').innerHTML=svgEl(W,Ht,s,'Routing and per-expert load');
    const dev=Math.max(...load.map(l=>Math.abs(l-q)));
    $('qbNote').innerHTML=(last==='start'?'Unbalanced routing: the router favours E1, so it is overloaded and E4 starves.':last==='qb'?'One Quantile Balancing step set each bias from its margin quantile'+(dev===0?': every expert now receives exactly '+q+'.':'; the largest deviation from the target is now '+dev+' token'+(dev>1?'s':'')+'. Re-routing moves each token\'s cutoff, so one step is not exact on a batch this small; repeated steps settle at a fixed point near the target.'):'A fixed-step update moved each bias by ±'+(+$('qbGam').value).toFixed(3)+' towards the mean load; largest deviation now '+dev+'. Repeat it to converge, or watch it oscillate if γ is large.')+' Scores are <span class="ill">illustrative</span>; the rule is Eq. 13 and 14 of the K3 report, applied here to the same batch so its effect is visible (in training the bias acts on the next batch).';
  }
  segBind('qbK',m=>{K=+m;b=[0,0,0,0];last='start';draw()});
  $('qbQ').addEventListener('click',()=>{qbStep();draw()});
  $('qbF').addEventListener('click',()=>{fixedStep();draw()});
  $('qbR').addEventListener('click',()=>{b=[0,0,0,0];last='start';draw()});
  $('qbGam').addEventListener('input',draw);
  addEventListener('resize',draw);onTab('t-read',draw);draw();
})();
