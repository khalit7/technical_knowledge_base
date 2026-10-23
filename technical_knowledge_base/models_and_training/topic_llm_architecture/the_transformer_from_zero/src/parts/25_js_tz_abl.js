// Reading section 11: ablation curves, the running sequence through baseline and ablation, samples (data: TZD.abl from src/train/out/runs, TZD.floors, TZD.pieces). Moved from the Ablation explorer tab on 2026-10-23.
(function(){
  const D=window.TZD,$=id=>document.getElementById(id);if(!D||!$('tza-plot')||!window.RD||!window.TZ)return;
  const esc=RD.esc,A=D.abl,base=A.find(a=>a.key==='base');
  const COL={base:'var(--ink)',noresid:'var(--c2)',nonorm:'var(--c4)',nopos:'var(--c3)','1head':'var(--c6)','1head_s1':'var(--c6)',noffn:'var(--c1)',noattn:'var(--mute)','noresid_lr1e-3':'var(--c2)','nonorm_lr1e-3':'var(--c4)','base_lr1e-3':'var(--ink)'};
  A.forEach(a=>a.col=COL[a.key]||'var(--mute)');const DASH=k=>/lr1e-3|_s1/.test(k);
  const on=new Set(A.filter(a=>!DASH(a.key)).map(a=>a.key));
  $('tza-runs').innerHTML=A.map(a=>'<button data-k="'+a.key+'" class="'+(on.has(a.key)?'on':'')+'"><span style="color:'+a.col+'">&#9632;</span> '+esc(a.label)+'</button>').join('');
  $('tza-runs').addEventListener('click',e=>{const b=e.target.closest('button[data-k]');if(!b)return;const k=b.dataset.k;on.has(k)?on.delete(k):on.add(k);b.classList.toggle('on',on.has(k));plot()});
  function plot(){
    const el=$('tza-plot'),W=RD.width(el),H=W<520?250:290,m={l:40,r:10,t:24,b:28},F=D.floors;
    const X=s=>m.l+(W-m.l-m.r)*s/1500,Y=v=>m.t+(H-m.t-m.b)*(Math.min(v,8.5)-1.9)/(8.5-1.9);
    const Yr=v=>m.t+(H-m.t-m.b)-(Y(v)-m.t);
    let b='';[2,3,4,5,6,7,8].forEach(v=>{b+='<line x1="'+m.l+'" x2="'+(W-m.r)+'" y1="'+Yr(v)+'" y2="'+Yr(v)+'" stroke="var(--line)"/>'+RD.t(m.l-5,Yr(v)+4,v,{a:'end',fill:'var(--mute)'})});
    [0,500,1000,1500].forEach(s=>b+=RD.t(X(s),H-9,s.toLocaleString('en-US'),{a:s===1500?'end':s===0?'start':'middle',fill:'var(--mute)'}));
    [['unigram',F.unigram],['bigram',F.bigram]].forEach(([n,v])=>b+='<line x1="'+m.l+'" x2="'+(W-m.r)+'" y1="'+Yr(v)+'" y2="'+Yr(v)+'" stroke="var(--c5)" stroke-dasharray="4 3"/>'+RD.t(W-m.r-2,Yr(v)-3,n+' '+v.toFixed(2),{a:'end',fill:'var(--c5)'}));
    A.forEach(a=>{if(!on.has(a.key))return;const pts=a.eval.filter(e=>e[0]>=100).map(e=>X(e[0]).toFixed(1)+','+Yr(e[1]).toFixed(1)).join(' ');
      b+='<polyline fill="none" stroke="'+a.col+'" stroke-width="'+(a.key==='base'?2.6:1.7)+'"'+(DASH(a.key)?' stroke-dasharray="5 3"':'')+' points="'+pts+'"/>'});
    b+=RD.t(m.l-30,12,'held-out loss (nats), steps 100 to 1,500',{fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,b,'Held-out loss curves of the ablations');
    $('tza-final').innerHTML=A.filter(a=>on.has(a.key)).map(a=>RD.stat('<span style="color:'+a.col+'">&#9632;</span> '+esc(a.label),a.val.toFixed(3),(a.key==='base'?'baseline':(a.val-base.val>=0?'+':'')+(a.val-base.val).toFixed(3)+' vs baseline')+' · '+a.params.toLocaleString('en-US')+' params')).join('');
  }
  // before/after on the running sequence
  const withTok=A.filter(a=>a.tok&&a.key!=='base');
  $('tza-pick').innerHTML=withTok.map(a=>'<option value="'+a.key+'">'+esc(a.label)+'</option>').join('');
  let cur=withTok[0],an;
  const MODES=['base','abl','diff'];
  function drawSeq(i){
    const mode=MODES[i],a=cur,P=D.pieces;
    const vals=mode==='base'?base.tok:mode==='abl'?a.tok:a.tok.map((v,j)=>v-base.tok[j]);
    TZ.tokens($('tza-tok'),P,vals,mode==='diff'?TZ.diffColor:TZ.lossColor,(j,v)=>'baseline '+base.tok[j-1].toFixed(2)+', '+a.label+' '+a.tok[j-1].toFixed(2)+' nats');
    let g=[];if(mode==='diff'){g=['hsla(205,75%,50%,0.68) 0%','hsla(205,75%,50%,0.08) 50%','hsla(10,75%,50%,0.08) 50%','hsla(10,75%,50%,0.68) 100%'];$('tza-scale').innerHTML='<span>3 nats better</span><i style="background:linear-gradient(90deg,'+g.join(',')+')"></i><span>3 nats worse</span>'}
    else{for(let k=0;k<=8;k++)g.push(TZ.lossColor(k)+' '+(k*12.5)+'%');$('tza-scale').innerHTML='<span>loss 0</span><i style="background:linear-gradient(90deg,'+g.join(',')+')"></i><span>8 nats or more</span>'}
    const d=a.tok.map((v,j)=>v-base.tok[j]),worse=d.filter(x=>x>1).length,better=d.filter(x=>x<-1).length;
    const order=d.map((x,j)=>[x,j]).sort((p,q)=>q[0]-p[0]).slice(0,5).map(([x,j])=>'"'+esc(P[j+1])+'" +'+x.toFixed(1));
    $('tza-cap').innerHTML=mode==='base'?'<b>Before:</b> the baseline. Each of the 255 predicted tokens of the running sequence coloured by its loss; mean '+TZ.fmt(base.seq,3)+' nats.':
      mode==='abl'?'<b>After:</b> the same sequence through <b>'+esc(a.label)+'</b> ('+esc(a.what)+'); mean '+TZ.fmt(a.seq,3)+' nats.':
      '<b>Difference</b> (ablation minus baseline): red where the ablation is more surprised. Largest increases: '+order.join(', ')+'.';
    $('tza-cnt').innerHTML=RD.stat('Baseline',TZ.fmt(base.seq,3),'mean nats, running sequence')+RD.stat(esc(a.label),TZ.fmt(a.seq,3),'mean nats')+RD.stat('Tokens over 1 nat worse',worse,'of 255 ('+better+' over 1 nat better)');
  }
  an=RD.anim({card:'tza-seq',ctl:'tza-ctl',n:3,draw:drawSeq,ms:2600,label:'Before, after, difference'});
  $('tza-pick').addEventListener('change',e=>{cur=withTok.find(a=>a.key===e.target.value);an.reset(3)});
  $('tza-tok').addEventListener('click',e=>{const sp=e.target.closest('span[data-i]');if(sp)$('tza-info').textContent='"'+D.pieces[+sp.dataset.i]+'" (position '+sp.dataset.i+'): '+sp.title});
  // samples
  $('tza-prompt').innerHTML=D.prompts.map((p,i)=>'<option value="'+i+'"'+(i===6?' selected':'')+'>'+(i+1)+'. '+esc(p.slice(0,48))+'...</option>').join('');
  function samp(){const i=+$('tza-prompt').value;
    $('tza-samp').innerHTML=[base,cur].map(a=>'<div><h4>'+esc(a.label)+' <span class="k">held-out '+a.val.toFixed(3)+'</span></h4><p class="k">'+esc(D.prompts[i])+'</p><p><span class="k">greedy:</span> '+(a.samples[i].greedy.trim()?esc(a.samples[i].greedy):'<i>(empty: the first token chosen was end-of-text)</i>')+'</p><p><span class="k">T 0.8:</span> '+(a.samples[i].t08.trim()?esc(a.samples[i].t08):'<i>(empty: the first token drawn was end-of-text)</i>')+'</p></div>').join('')}
  $('tza-prompt').addEventListener('change',samp);$('tza-pick').addEventListener('change',samp);
  RD.onRender(()=>{plot();an.redraw();samp()});
  RD.onResize(plot);
  plot();samp();
})();
