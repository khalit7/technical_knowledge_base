// ---- Harness atlas: the harness-tax animation (two real recordings) ----
(function(){
  const {A,RM,$,esc,onRender,tabShown,n0}=window.ATLX;
  const AN=A.anim;if(!AN||!AN.loop)return;
  // Haiku 4.5 list prices per million tokens (pricing page read 2026-10-05; FACTS.md): input 1, 1-hour cache write 2, cache read 0.10, output 5
  const PR={in:1,w:2,r:0.1,out:5};
  const L=AN.loop.calls.map(c=>({f:c[0],w:c[1],r:c[2],o:c[3]})),C=AN.cc.calls.map(c=>({f:c[0],w:c[1],r:c[2],o:c[3]}));
  const N=Math.max(L.length,C.length);$('atl-ascrub').max=N;
  const cost=c=>(c.f*PR.in+c.w*PR.w+c.r*PR.r+c.o*PR.out)/1e6;
  const sum=(xs,k)=>xs.reduce((s,c)=>s+(k?c[k]:c.f+c.w+c.r),0);
  const maxIn=Math.max(...L.concat(C).map(c=>c.f+c.w+c.r+c.o));
  let k=0,timer=null,vis=true;
  function cap(){
    if(k===0)return 'Before the first call. Both harnesses get the same task text and the same model. Press play or step forward.';
    const l=L[k-1],c=C[k-1];
    let t='Call '+k+'. ';
    t+=l?'Small harness: reads '+n0(l.f+l.w+l.r)+' tokens, all fresh (it resends its transcript as one block, so nothing is cached), writes '+n0(l.o)+'. ':'Small harness: already finished after '+L.length+' calls. ';
    t+=c?'Claude Code: reads '+n0(c.f+c.w+c.r)+' tokens, '+n0(c.r)+' of them from the cache at a tenth of the price, writes '+n0(c.o)+'.':'Claude Code: finished after '+C.length+' calls.';
    if(k===1)t+=' The gap on call 1 is the harness itself: Claude Code\'s system prompt and six tool definitions, against a short prompt describing four tools.';
    if(k===N)t+=' Both runs passed the tests. Totals below: Claude Code read about '+Math.round(sum(C)/sum(L))+' times as many input tokens.';
    return t}
  function draw(){
    const el=$('atl-anim');const W=Math.max(300,el.clientWidth||600);const narrow=W<520;
    const LW=0,bh=9,gap=3,lane=N*(bh+gap);const top0=16;const H=2*(lane+top0+22)+6;
    const sx=v=>v/maxIn*(W-LW-8);
    let s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Context read per model call in two harnesses">';
    [['Small harness (Loop lab)',L],['Claude Code',C]].forEach((p,j)=>{const y0=j*(lane+top0+22)+top0+14;
      s+='<text x="0" y="'+(y0-6)+'" font-size="12" font-weight="600">'+p[0]+'</text>';
      p[1].forEach((c,i)=>{const y=y0+i*(bh+gap);const show=i<k;let x=LW;
        [['f','var(--c2)'],['w','var(--c5)'],['r','var(--c1)'],['o','var(--c3)']].forEach(q=>{const wv=sx(c[q[0]]);if(wv>0){s+='<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+Math.max(0.5,wv).toFixed(1)+'" height="'+bh+'" fill="'+q[1]+'" opacity="'+(show?1:0.08)+'"/>';x+=wv+(q[0]==='r'?2:0)}})});
    });
    el.innerHTML=s+'</svg>';
    const upto=xs=>xs.slice(0,k);
    const st=(nm,xs,all,extra)=>'<div class="stat"><div class="k">'+nm+'</div><div class="v">$'+upto(xs).reduce((s,c)=>s+cost(c),0).toFixed(4)+'</div><div class="d">'+Math.min(k,xs.length)+' of '+xs.length+' calls; read '+n0(sum(upto(xs)))+' input tokens ('+n0(sum(upto(xs),'r'))+' cached), wrote '+n0(sum(upto(xs),'o'))+'; whole run '+all+'. '+extra+'</div></div>';
    $('atl-astat').innerHTML=st('Small harness, API-price equivalent so far',L,AN.loop.secs.toFixed(0)+' s','')+st('Claude Code, API-price equivalent so far',C,AN.cc.secs.toFixed(0)+' s','The CLI reported $'+AN.cc.cost.toFixed(4)+' for the whole run.');
    $('atl-astep').textContent=cap();$('atl-ascrub').value=k;
  }
  function stop(){if(timer){clearInterval(timer);timer=null}$('atl-aplay').textContent='Play'}
  function play(){if(timer){stop();return}if(k>=N)k=0;$('atl-aplay').textContent='Pause';
    timer=setInterval(()=>{if(!vis||!tabShown())return;if(k>=N){stop();return}k++;draw()},+$('atl-aspeed').value)}
  $('atl-aplay').addEventListener('click',play);
  $('atl-afwd').addEventListener('click',()=>{stop();k=Math.min(N,k+1);draw()});
  $('atl-aback').addEventListener('click',()=>{stop();k=Math.max(0,k-1);draw()});
  $('atl-ascrub').addEventListener('input',()=>{stop();k=+$('atl-ascrub').value;draw()});
  $('atl-aspeed').addEventListener('change',()=>{if(timer){stop();play()}});
  if('IntersectionObserver' in window)new IntersectionObserver(es=>{vis=es[0].isIntersecting}).observe($('atl-anim'));
  if(RM)k=0;
  onRender(draw);let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{if(tabShown())draw()},120)});

})();
