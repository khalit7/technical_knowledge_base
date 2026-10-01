// ---- Positional encoding: RoPE dial and YaRN frequency bands ----
(function(){
  if(!$('rope'))return;
  const th=0.5;
  function go(){const sh=+$('ropeS').value,o=+$('ropeO').value,m=3+sh,n=m+o,a=m*th,b=n*th;
    $('ropeSv').textContent=sh+' (m = '+m+', n = '+n+')';$('ropeOv').textContent=o;
    const q=[Math.cos(a),Math.sin(a)],k=[Math.cos(b),Math.sin(b)],dot=q[0]*k[0]+q[1]*k[1];
    const C=95,cx=110,cy=110,P=v=>[cx+C*v[0],cy-C*v[1]];const pq=P(q),pk=P(k);
    let s='<circle cx="'+cx+'" cy="'+cy+'" r="'+C+'" fill="none" stroke="var(--line)"/><line x1="'+(cx-C-6)+'" y1="'+cy+'" x2="'+(cx+C+6)+'" y2="'+cy+'" stroke="var(--line)"/><line x1="'+cx+'" y1="'+(cy-C-6)+'" x2="'+cx+'" y2="'+(cy+C+6)+'" stroke="var(--line)"/>';
    // arc from q to k
    const r=34,steps=24;let d='';for(let i=0;i<=steps;i++){const t=a+(b-a)*i/steps;d+=(i?'L':'M')+(cx+r*Math.cos(t)).toFixed(1)+' '+(cy-r*Math.sin(t)).toFixed(1)}
    s+='<path d="'+d+'" fill="none" stroke="var(--c5)" stroke-width="2"/>';
    s+='<line x1="'+cx+'" y1="'+cy+'" x2="'+pq[0].toFixed(1)+'" y2="'+pq[1].toFixed(1)+'" stroke="var(--c1)" stroke-width="2.5" marker-end="MARK"/><text x="'+(pq[0]+(q[0]>=0?6:-6)).toFixed(1)+'" y="'+(pq[1]-4).toFixed(1)+'" font-size="12" fill="var(--c1)"'+(q[0]<0?' text-anchor="end"':'')+'>q at m = '+m+'</text>';
    s+='<line x1="'+cx+'" y1="'+cy+'" x2="'+pk[0].toFixed(1)+'" y2="'+pk[1].toFixed(1)+'" stroke="var(--c2)" stroke-width="2.5" marker-end="MARK"/><text x="'+(pk[0]+(k[0]>=0?6:-6)).toFixed(1)+'" y="'+(pk[1]+14).toFixed(1)+'" font-size="12" fill="var(--c2)"'+(k[0]<0?' text-anchor="end"':'')+'>k at n = '+n+'</text>';
    $('ropeSvg').innerHTML=svgEl(220,220,s,'Query and key rotated by RoPE');
    $('ropeOut').innerHTML='<div class="kv"><dt>q rotated by '+a.toFixed(1)+' rad</dt><dd>('+q[0].toFixed(4)+', '+q[1].toFixed(4)+')</dd><dt>k rotated by '+b.toFixed(1)+' rad</dt><dd>('+k[0].toFixed(4)+', '+k[1].toFixed(4)+')</dd><dt>q · k</dt><dd><b>'+dot.toFixed(4)+'</b></dd><dt>cos((n − m) θ)</dt><dd>'+Math.cos(o*th).toFixed(4)+'</dd></div><p class="small mute" style="margin:2px 0">θ = 0.5 rad per token is illustrative; real pairs run from 1 rad per token down to millionths.</p>'}
  ['ropeS','ropeO'].forEach(i=>$(i).addEventListener('input',go));go();
})();
(function(){
  if(!$('yb'))return;
  // presets from config.json: rotary dims, base, original context, factor, beta_slow (alpha), beta_fast (beta)
  const PR=[['gpt-oss-120b',64,150000,4096,32,1,32,'config: yarn, factor 32 from 4,096, beta_fast 32, beta_slow 1'],
    ['DeepSeek V3 (decoupled key)',64,10000,4096,40,1,32,'config: yarn, factor 40 from 4,096, beta_fast 32, beta_slow 1, on the 64-dimension RoPE key'],
    ['Kimi K2',64,50000,4096,32,1,1,'config: yarn, factor 32 from 4,096, beta_fast 1 and beta_slow 1, so the ramp collapses to a step at one turn'],
    ['Llama 3 shape (illustrative)',128,500000,8192,8,1,32,'illustrative: YaRN with the paper\'s α = 1, β = 32 on Llama 3\'s 128 dims and base 500,000 (Llama 3.1 itself ships its own llama3 scaling)']];
  let cur=0;
  $('ybP').innerHTML=PR.map((p,i)=>'<button data-i="'+i+'"'+(i===0?' class="on"':'')+'>'+p[0]+'</button>').join('');
  $('ybP').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{cur=+b.dataset.i;$('ybP').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));go()}));
  function go(){const [nm,d,base,Lo,sc,al,be,note]=PR[cur],np=d/2;const W=Math.max(320,Math.min(720,($('yb').clientWidth||700)-28)),H=210,pl=46,pr=10,pt=12,pb=34;
    const rs=[];for(let i=0;i<np;i++){const lam=2*Math.PI*base**(2*i/d);rs.push(Lo/lam)}
    const lo=1e-4,hi=1e3,lg=Math.log10,y=v=>pt+(H-pt-pb)*(1-(lg(Math.max(lo,Math.min(hi,v)))-lg(lo))/(lg(hi)-lg(lo))),bw=(W-pl-pr)/np;
    let s='';[[1e-4,'10⁻⁴'],[1e-2,'0.01'],[1,'1'],[32,'32'],[1e3,'1,000']].forEach(([v,l])=>{s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"'+(v===1||v===32?' stroke-dasharray="4 3" stroke="var(--mute)"':'')+'/><text x="'+(pl-5)+'" y="'+(y(v)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+l+'</text>'});
    let keep=0,ramp=0,intp=0;
    rs.forEach((r,i)=>{const c=r>be?'var(--c1)':r<al?'var(--c2)':'var(--c5)';if(r>be)keep++;else if(r<al)intp++;else ramp++;
      const x=pl+i*bw+bw*.12,yy=y(r);s+='<rect x="'+x.toFixed(1)+'" y="'+yy.toFixed(1)+'" width="'+(bw*.76).toFixed(1)+'" height="'+Math.max(0,H-pb-yy).toFixed(1)+'" fill="'+c+'"><title>pair '+i+': '+(r>=1?r.toFixed(1):r.toPrecision(2))+' turns in '+fmt(Lo)+' tokens</title></rect>'});
    s+='<text x="'+(pl+(W-pl-pr)/2)+'" y="'+(H-6)+'" font-size="11" text-anchor="middle" fill="var(--mute)">RoPE pair i (0 = fastest), '+np+' pairs</text>';
    s+='<text x="12" y="'+((pt+H-pb)/2)+'" font-size="11" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 12 '+((pt+H-pb)/2)+')">turns in original context</text>';
    $('ybSvg').innerHTML=svgEl(W,H,s,'Turns per RoPE pair in the original context');
    $('ybOut').innerHTML='<div class="leg"><span><i style="background:var(--c1);height:8px"></i>kept (r &gt; β = '+be+'): '+keep+'</span><span><i style="background:var(--c5);height:8px"></i>ramp: '+ramp+'</span><span><i style="background:var(--c2);height:8px"></i>interpolated by '+sc+' (r &lt; α = '+al+'): '+intp+'</span></div>Attention temperature from the paper\'s fit, 0.1 ln '+sc+' + 1 = <b>'+(0.1*Math.log(sc)+1).toFixed(3)+'</b>. '+note+'.'}
  onTab('t-read',go);let rw=0;addEventListener('resize',()=>{const w=$('yb').clientWidth;if(Math.abs(w-rw)>40){rw=w;go()}});go();
})();
