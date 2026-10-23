// ---- Reading section 7 (moved from the old MTP lab tab): self-speculative decoding replay, per-prompt table, acceptance calculator, training curves ----
(function(){
  if(!window.FOD||!document.getElementById('mt-card'))return;
  const D=FOD.mtpf,esc=FO.esc,t=RD.t,TAB='t-read',r7=D.spec[6];
  let kind='sequential';
  const ev=()=>r7[kind].events;
  function draw(i){
    const E=ev(),k=Math.min(i,E.length-1);let html='',tok=0,acc=0,rej=0;
    for(let j=0;j<=k;j++){const e=E[j];
      if(e.rej!=null&&j>0)html+='<span class="x">'+esc(e.rej.replace(/\n/g,'↵'))+'</span>',rej++;
      html+='<span class="t">'+esc(e.emit[0].replace(/\n/g,'↵'))+'</span>';tok++;
      if(e.acc){html+='<span class="new">'+esc(e.emit[1].replace(/\n/g,'↵'))+'</span>';tok++;acc++}}
    document.getElementById('mt-toks').innerHTML=html;
    const e=E[k];
    document.getElementById('mt-cap').innerHTML='<div class="t">Forward '+(k+1)+' of '+E.length+'</div><p>'+(k===0?'The first forward has no draft: it emits the main model\'s token and drafts the next one.':
      e.acc?'The draft "'+esc(e.emit[0])+'" matched the main model\'s choice: accepted, and the same forward also gives the token after it, "'+esc(e.emit[1])+'".':
      'The draft "'+esc(e.rej||'')+'" was wrong; the main model\'s own token "'+esc(e.emit[0])+'" is used and a new draft is made from it.')+'</p>';
    document.getElementById('mt-cnt').innerHTML=RD.stat('forwards',k+1,'main model')+RD.stat('tokens emitted',tok,'')+RD.stat('tokens per forward',(tok/(k+1)).toFixed(2),'')+RD.stat('drafts accepted',acc+' of '+(acc+rej),'');
  }
  const A=FO.anim({card:'mt-card',ctl:'mt-ctl',n:ev().length,draw,ms:420,label:'Forward',tab:TAB});
  RD.seg(document.getElementById('mt-seg'),m=>{kind=m;A.reset(ev().length)});
  // table
  document.querySelector('#mt-tab tbody').innerHTML=D.spec.map(r=>{const s=r.sequential,p=r.parallel,j=r.joint;
    const idn=[s,p,j].filter(Boolean).every(x=>x.identical)?'yes':'NO';
    return '<tr><td>'+r.prompt+'</td><td class="num">'+s.forwards+'</td><td class="num">'+s.tokens_per_forward.toFixed(2)+'</td><td class="num">'+FO.fmt(s.accept_rate,'pct0')+'</td><td class="num">'+p.forwards+'</td><td class="num">'+p.tokens_per_forward.toFixed(2)+'</td><td class="num">'+FO.fmt(p.accept_rate,'pct0')+'</td><td class="num">'+(j?j.tokens_per_forward.toFixed(2):'')+'</td><td>'+idn+'</td></tr>'}).join('');
  // calculator
  const mean=k=>{const rs=D.spec.filter(r=>r[k]);return rs.reduce((a,r)=>a+r[k].accept_rate,0)/rs.length};
  const pts=[['sequential',mean('sequential'),'var(--c2)'],['parallel',mean('parallel'),'var(--c4)']];
  function calc(){
    const a=+document.getElementById('mt-a').value,k=+document.getElementById('mt-k').value;
    document.getElementById('mt-av').textContent=a.toFixed(2);document.getElementById('mt-kv').textContent=k;
    let e=1,p=1;for(let i=0;i<k;i++){p*=a;e+=p}
    document.getElementById('mt-calc-out').innerHTML=RD.stat('tokens per forward',e.toFixed(2),'expected')+RD.stat('forwards for 1,000 tokens',Math.ceil(1000/e).toLocaleString('en-US'),'against 1,000 without drafts');
    const el=document.getElementById('mt-calc-svg'),W=Math.min(FO.W(el),640),H=170,l=36,bt=26,X=v=>l+(W-l-10)*v,Y=v=>8+(H-8-bt)*(1-(v-1)/4);let b='';
    for(const v of [1,2,3,4,5]){b+='<line x1="'+l+'" x2="'+(W-10)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+t(l-5,Y(v)+4,v,{a:'end'})}
    for(const v of [0,0.25,0.5,0.75,1])b+=t(X(v),H-10,v,{a:'middle'});
    b+=t(W-10,H-0.5,'acceptance rate',{a:'end',fs:11,fill:'var(--mute)'});
    let path='';for(let i=0;i<=50;i++){const x=i/50;let e2=1,p2=1;for(let j=0;j<k;j++){p2*=x;e2+=p2}path+=(i?'L':'M')+X(x)+','+Y(e2)}
    b+='<path d="'+path+'" fill="none" stroke="var(--acc)" stroke-width="2"/>';
    pts.forEach(q=>{b+='<circle cx="'+X(q[1])+'" cy="'+Y(1+q[1])+'" r="5" fill="'+q[2]+'"/>'});
    b+='<circle cx="'+X(a)+'" cy="'+Y(e)+'" r="4" fill="none" stroke="var(--ink)" stroke-width="1.5"/>';
    el.innerHTML=RD.svg(W,H,b,'tokens per forward against acceptance')+'<div class="fo-leg">'+pts.map(q=>'<span style="--sw:'+q[2]+'">'+q[0]+', measured mean acceptance '+FO.fmt(q[1],'pct0')+'</span>').join('')+'<span style="--sw:var(--ink)">open circle: your setting</span></div>';
  }
  ['mt-a','mt-k'].forEach(id=>document.getElementById(id).addEventListener('input',calc));
  function curves(){
    const el=document.getElementById('mt-tr-svg'),W=Math.min(FO.W(el),640),H=170,l=36,bt=26,C=D.curves,X=v=>l+(W-l-10)*v/600,Y=v=>8+(H-8-bt)*(1-(v-2)/6);let b='';
    for(const v of [2,4,6,8]){b+='<line x1="'+l+'" x2="'+(W-10)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+t(l-5,Y(v)+4,v,{a:'end'})}
    for(const v of [0,200,400,600])b+=t(X(v),H-10,v,{a:'middle'});
    [['sequential','var(--c2)'],['parallel','var(--c4)']].forEach(s=>{b+='<polyline points="'+C[s[0]].map(p=>X(p[0])+','+Y(Math.min(8,p[1]))).join(' ')+'" fill="none" stroke="'+s[1]+'" stroke-width="2"/>'});
    el.innerHTML=RD.svg(W,H,b,'module training curves')+'<div class="fo-leg"><span style="--sw:var(--c2)">sequential, last '+C.sequential[C.sequential.length-1][1].toFixed(2)+'</span><span style="--sw:var(--c4)">parallel, last '+C.parallel[C.parallel.length-1][1].toFixed(2)+'</span></div>';
  }
  FO.reg(TAB,()=>{calc();curves()});
  RD.onResize(()=>{calc();curves()});
})();
