// ---- Reading: what breaks past the trained length, plain RoPE (before) against an extension method (after), animated over distance ----
(function(){
  const $=id=>document.getElementById(id);if(!$('br'))return;
  const D=window.PE_DATA,RO=window.ROPE,RD=window.RD;
  const NAMES={plain:'Plain RoPE',pi:'Position Interpolation',ntk:'NTK-aware',dyn:'Dynamic NTK',yarn:'YaRN',llama3:'Llama 3 scaling',longrope:'LongRoPE'};
  const OWN={llama31:'llama3',llama4:'llama3',qwen3:'yarn',dsv3:'yarn',oss:'yarn',phi3:'longrope',gemma3:'pi'};
  const S={pk:'llama31',m:'llama3'};
  const fmt=n=>Math.round(n).toLocaleString('en-US');
  const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim()||'#888';
  let P,dists,seen,plainInv,anim;
  function setup(){P=D.presets[S.pk];const L=P.L,s=P.s;
    dists=[L/4,L/2,L-1];for(let j=1;j<=5;j++)dists.push(L*Math.pow(s,j/5));
    seen=RO.seenArc(P);plainInv=RO.baseInv(P.base,P.dim);
    $('brM').innerHTML=['pi','ntk','dyn','yarn','llama3','longrope'].map(m=>{const ok=m!=='longrope'||P.long;
      return '<button data-m="'+m+'"'+(ok?'':' disabled title="Only Phi-3 ships LongRoPE factors"')+' class="'+(m===S.m?'on':'')+'" aria-pressed="'+(m===S.m)+'">'+NAMES[m]+(OWN[S.pk]===m?' (this config)':'')+'</button>'}).join('');}
  function invFor(m,dist){return m==='plain'?plainInv:RO.method(P,m,P.s,dist+1)}
  // state of each pair at a distance: 0 whole circle seen in training, 1 inside the trained arc, 2 an angle never seen
  // rotations are periodic, so a pair is judged on its angle modulo one turn
  const ang=(dist,f)=>(dist*f)%(2*Math.PI);
  function states(inv,dist){return inv.map((f,i)=>seen[i]>=2*Math.PI-1e-9?0:(ang(dist,f)>seen[i]*(1+1e-9)?2:1))}
  function panel(title,m,dist,W){const inv=invFor(m,dist),st=states(inv,dist),n=inv.length;
    const cols=W<520?4:8,cw=W/cols,r=Math.max(14,Math.min(26,cw/2-10)),pick=[];for(let k=0;k<8;k++)pick.push(Math.round(k*(n-1)/7));
    const rowsH=2*r+48,rows=Math.ceil(8/cols),stripY=rows*rowsH+8,Hh=stripY+44;
    const col=[css('--c1'),css('--good'),css('--bad')];
    let g='<svg viewBox="0 0 '+W+' '+Hh+'" width="'+W+'" height="'+Hh+'" role="img" aria-label="'+title+': rotation angle of eight pairs at distance '+fmt(dist)+'">';
    pick.forEach((i,k)=>{const cx=(k%cols+.5)*cw,cy=Math.floor(k/cols)*rowsH+r+6;
      g+='<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="var(--line)" stroke-width="1.5"/>';
      // arc of angles seen in training (from 0, counter-clockwise drawn upwards)
      const a=seen[i];if(a>=2*Math.PI-1e-9)g+='<circle cx="'+cx+'" cy="'+cy+'" r="'+(r-3)+'" fill="'+col[0]+'" opacity=".18"/>';
      else{const x1=cx+(r-3),y1=cy,x2=cx+(r-3)*Math.cos(a),y2=cy-(r-3)*Math.sin(a);g+='<path d="M'+cx+' '+cy+'L'+x1+' '+y1+'A'+(r-3)+' '+(r-3)+' 0 '+(a>Math.PI?1:0)+' 0 '+x2.toFixed(2)+' '+y2.toFixed(2)+'Z" fill="'+col[1]+'" opacity=".22"/>'}
      const ha=ang(dist,inv[i]),hx=cx+r*Math.cos(ha),hy=cy-r*Math.sin(ha);
      g+='<line x1="'+cx+'" y1="'+cy+'" x2="'+hx.toFixed(2)+'" y2="'+hy.toFixed(2)+'" stroke="'+col[st[i]]+'" stroke-width="2.4" stroke-linecap="round"/><circle cx="'+cx+'" cy="'+cy+'" r="2" fill="var(--ink)"/>';
      const wl=2*Math.PI/plainInv[i],str=plainInv[i]/inv[i];
      g+='<text x="'+cx+'" y="'+(cy+r+13)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">pair '+i+'</text>';
      g+='<text x="'+cx+'" y="'+(cy+r+25)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+(wl<100?wl.toFixed(1):fmt(wl))+(str>1.0005?' ÷'+(str<10?str.toFixed(2):str.toFixed(1)):'')+'</text>';
      const dg=x=>x*180/Math.PI,an=dg(ang(dist,inv[i])),wd=dg(a),f1=v=>v<10?v.toFixed(1):Math.round(v);
      g+='<text x="'+cx+'" y="'+(cy+r+37)+'" font-size="10.5" text-anchor="middle" fill="'+(st[i]===2?col[2]:'var(--mute)')+'">'+(a>=2*Math.PI-1e-9?'full circle':f1(an)+'° of '+f1(wd)+'°')+'</text>'});
    // all pairs as a strip
    const sw=W/n;st.forEach((v,i)=>{const str=plainInv[i]/inv[i];g+='<rect x="'+(i*sw+.5).toFixed(2)+'" y="'+stripY+'" width="'+Math.max(1,sw-1).toFixed(2)+'" height="14" fill="'+col[v]+'" opacity="'+(str>1.0005?1:.55)+'"/>'});
    g+='<text x="0" y="'+(stripY+28)+'" font-size="10.5" fill="var(--mute)">pair 0 (fastest)</text><text x="'+W+'" y="'+(stripY+28)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">pair '+(n-1)+' (slowest)</text>';
    g+='</svg>';
    const un=st.filter(v=>v===2).length;let over=0;inv.forEach((f,i)=>{if(st[i]===2)over=Math.max(over,(ang(dist,f)-seen[i])*180/Math.PI)});
    return {svg:g,un,over,fast:inv[0]/plainInv[0],st}}
  function draw(i){const dist=dists[i],W=RD.width($('brA')),L=P.L,s=P.s;
    const A=panel('Plain RoPE','plain',dist,W),B=panel(NAMES[S.m],S.m,dist,W);
    $('brA').innerHTML=A.svg;$('brB').innerHTML=B.svg;$('brBt').textContent=NAMES[S.m]+(S.m==='dyn'?' (s now '+Math.max(1,(dist+1)/L).toFixed(2)+')':' (s = '+s+')');
    const rel=dist<L?(dist/L<0.3?'a quarter of':dist/L<0.6?'half of':'the edge of')+' the trained '+fmt(L):(dist/L).toFixed(dist/L<10?1:0)+' times the trained '+fmt(L);
    $('brStep').textContent='Distance '+fmt(dist)+' ('+rel+')';
    const n=P.dim/2,full=seen.filter(a=>a>=2*Math.PI-1e-9).length,slow=seen[n-1]*180/Math.PI;
    let t;
    if(dist<L)t='Every pair is inside the range it saw in training. '+full+' of '+n+' pairs turned at least one full circle within '+fmt(L)+' tokens (blue: every angle is familiar); the '+(n-full)+' slower ones only covered part of theirs (green wedge), the slowest just '+slow.toFixed(1)+' degrees.';
    else if(i===3&&S.m!=='plain')t='Just past the trained length. Plain RoPE: '+A.un+' of the slow pairs (wavelength longer than '+fmt(L)+' tokens) already point outside their wedge (red), at angles no training example produced. The fast pairs are fine: they have seen every angle many times. ';
    else t='Plain RoPE: '+A.un+' pairs at unseen angles, the furthest '+A.over.toFixed(A.over<10?1:0)+' degrees beyond its wedge. ';
    if(dist>=L){
      if(S.m==='pi')t+='Position Interpolation divides every frequency by '+s+': '+(B.un?B.un+' pairs still unseen':'no pair leaves its wedge')+' up to '+fmt(L*s)+', but the fastest pair now turns 1/'+s+' as far per token, so neighbouring tokens look '+s+' times closer than in training (the cost the short-context benchmarks show).';
      else if(S.m==='ntk')t+='NTK-aware raises the base to '+fmt(RO.ntkBase(P,s))+': the fastest pair is untouched, the slowest slowed exactly '+s+' times, the middle ones in between. Unseen now: '+B.un+' pairs.';
      else if(S.m==='dyn')t+='Dynamic NTK sets s from the current length ('+Math.max(1,(dist+1)/L).toFixed(2)+' here), so short inputs run unchanged and the slowest pair always lands on the edge of its wedge. Unseen now: '+B.un+' pairs.';
      else if(S.m==='yarn'){const [lo,hi]=RO.yarnRange(P,s);t+='YaRN keeps pairs that turn more than 32 times in '+fmt(L)+' tokens (pairs 0 to '+Math.floor(lo)+'), divides by '+s+' those that turn less than once (from pair '+Math.ceil(hi)+'), ramps in between, and multiplies the logits by (0.1 ln '+s+' + 1)² = '+Math.pow(RO.mscale(s),2).toFixed(3)+'. Unseen now: '+B.un+' pairs.'}
      else if(S.m==='llama3')t+='Llama 3 scaling keeps wavelengths under '+fmt(L/(P.high||4))+' tokens, divides those over '+fmt(L/(P.low||1))+' by '+s+', and blends between. Unseen now: '+B.un+' pairs.';
      else if(S.m==='longrope')t+='LongRoPE divides each pair by its own searched factor (Phi-3: '+Math.min(...P.long).toFixed(2)+' to '+Math.max(...P.long).toFixed(2)+'). Unseen now: '+B.un+' pairs.';
      if(B.un&&dist>L*s*0.99)t+=' At the full target, a few pairs remain slightly past their wedge; fine-tuning at the new length is what teaches those angles.';
    }
    $('brCap').textContent=t;
    $('brCnt').innerHTML=[RD.stat('Unseen pairs, plain',A.un+' of '+n,dist<L?'inside the trained length':'all among the pairs slower than '+fmt(L)),
      RD.stat('Unseen pairs, '+NAMES[S.m],B.un+' of '+n,B.un?'furthest '+B.over.toFixed(B.over<10?1:0)+'° beyond its wedge':'all inside their wedges'),
      RD.stat('Fastest pair, per token',(B.fast).toFixed(B.fast<0.999?3:2)+'×','of its trained rotation (1 = local detail intact)'),
      RD.stat('Logit multiplier',S.m==='yarn'?Math.pow(RO.mscale(s),2).toFixed(3):'1','YaRN temperature only')].join('');
  }
  function start(){setup();if(anim)anim.reset(dists.length);else anim=RD.anim({card:'br',ctl:'brC',n:dists.length,draw,ms:2200,label:'Distance step'})}
  $('brP').addEventListener('change',e=>{S.pk=e.target.value;S.m=OWN[S.pk];start()});
  $('brM').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;S.m=b.dataset.m;
    [...$('brM').children].forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b)});anim.redraw()});
  addEventListener('resize',()=>{if($('br').offsetParent&&anim)anim.redraw()});
  start();
})();
