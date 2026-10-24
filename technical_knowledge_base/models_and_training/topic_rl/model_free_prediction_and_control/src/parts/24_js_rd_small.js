// ---- Reading tab: the small widgets (lambda-return weights, one transition two targets, the cliff fall chance).
(function(){
'use strict';
const M=window.MFE;if(!M||!window.RD)return;const $=id=>document.getElementById(id),n=(v,d)=>RD.n(v,d==null?3:d);
// ---------- lambda-return on the worked random-walk episode ----------
(function(){const sl=$('rd-laml');if(!sl)return;
  const R=[0,0,1],Vn=[0.5,0.5];// rewards from C; estimates of D and E (all 0.5)
  function draw(){const l=+sl.value/100;$('rd-lamv').textContent=l.toFixed(2);const o=M.lamReturn(R,Vn,1,l),el=$('rd-lamP'),W=RD.width(el),H=150,lw=Math.min(150,W*0.36),r=56,X=v=>lw+(W-lw-r)*v;
    const lab=['G<tspan font-size="8" dy="-4">(1)</tspan><tspan dy="4"> = 0 + V(D)</tspan>','G<tspan font-size="8" dy="-4">(2)</tspan><tspan dy="4"> = 0 + 0 + V(E)</tspan>','G<tspan font-size="8" dy="-4">(3)</tspan><tspan dy="4"> = G, the full return</tspan>'];let s='';
    o.w.forEach((w,i)=>{const y=8+i*34;s+='<text x="0" y="'+(y+13)+'" font-size="11">'+lab[i]+'</text><rect x="'+lw+'" y="'+(y+2)+'" width="'+Math.max(1,X(w)-lw).toFixed(1)+'" height="15" rx="2" fill="'+(i===2?'var(--c2)':'var(--c1)')+'"/><text x="'+(X(w)+5).toFixed(1)+'" y="'+(y+14)+'" font-size="11">'+n(w,3)+' &#215; '+n(o.G[i],2)+'</text>'});
    const y=8+3*34;s+='<text x="0" y="'+(y+13)+'" font-size="11" font-weight="600">G&#955; target for C</text><rect x="'+lw+'" y="'+(y+2)+'" width="'+Math.max(1,X(o.v)-lw).toFixed(1)+'" height="15" rx="2" fill="var(--ink)" opacity=".7"/><text x="'+(X(o.v)+5).toFixed(1)+'" y="'+(y+14)+'" font-size="11" font-weight="600">'+n(o.v,4)+'</text>';
    el.innerHTML=RD.svg(W,H,s,'Weights of the n-step returns in the lambda-return');
    $('rd-lamT').innerHTML='Weights (1 &minus; &lambda;)&lambda;<sup>n&minus;1</sup> = '+o.w.slice(0,2).map(w=>n(w,3)).join(' and ')+' on the one- and two-step returns, and the lump &lambda;<sup>2</sup> = '+n(o.w[2],3)+' on the full return; G<sup>&lambda;</sup> = '+o.w.map((w,i)=>n(w,3)+' &times; '+n(o.G[i],1)).join(' + ')+' = <b>'+n(o.v,4)+'</b> <i class="nl d">derived</i>. TD(0)\'s target is 0.5 (&lambda; = 0), Monte Carlo\'s is 1 (&lambda; = 1). The bars are the weights; each row\'s right-hand number is weight &times; return.'}
  sl.addEventListener('input',draw);RD.onRender(draw);RD.onResize(draw);draw()})();
// ---------- one transition, two targets ----------
(function(){const box=$('rd-ttS');if(!box)return;
  const P=[['R','reward R',-1,-10,10,1],['q','Q(S, right) now',-5,-20,0,0.5],['qBest','Q(S&prime;, right)',-4,-20,0,0.5],['qDown','Q(S&prime;, down), into the cliff',-100,-120,0,1],['a','step size &alpha;',0.5,0.05,1,0.05],['eps','&epsilon; (Expected SARSA)',0.1,0,1,0.05]];
  box.innerHTML=P.map(p=>'<label>'+p[1]+' = <b id="rd-tt'+p[0]+'v"></b><input type="range" id="rd-tt'+p[0]+'" min="'+p[3]+'" max="'+p[4]+'" step="'+p[5]+'" value="'+p[2]+'" aria-label="'+p[1].replace(/&[a-z]+;/g,'')+'"></label>').join('')+
    '<label>A&prime; actually taken next <select id="rd-ttap"><option value="down" selected>down (exploratory)</option><option value="right">right (greedy)</option></select></label>';
  function draw(){const v={};P.forEach(p=>{v[p[0]]=+$('rd-tt'+p[0]).value;$('rd-tt'+p[0]+'v').textContent=RD.n(v[p[0]],p[5]<1?2:0)});
    const ap=$('rd-ttap').value,o=M.twoTargets({R:v.R,q:v.q,qBest:v.qBest,qDown:v.qDown,qO1:-5,qO2:-6,qAp:ap==='down'?v.qDown:v.qBest,a:v.a,g:1,eps:v.eps});
    $('rd-ttO').innerHTML=RD.stat('SARSA target R + Q(S&prime;, A&prime;)',n(o.sarsa.tg,2),'new Q(S, right) = <b>'+n(o.sarsa.nw,2)+'</b>')+RD.stat('Q-learning target R + max Q(S&prime;, &middot;)',n(o.q.tg,2),'new Q(S, right) = <b>'+n(o.q.nw,2)+'</b>')+RD.stat('Expected SARSA target',n(o.es.tg,2),'E<sub>&pi;</sub>Q(S&prime;, &middot;) = '+n(o.es.boot,2)+'; new Q = <b>'+n(o.es.nw,2)+'</b>')}
  box.addEventListener('input',draw);box.addEventListener('change',draw);draw()})();
// ---------- the cliff fall chance ----------
(function(){const box=$('rd-fallS');if(!box)return;
  box.innerHTML='<label>&epsilon; = <b id="rd-fallev"></b><input type="range" id="rd-falle" min="0" max="0.5" step="0.01" value="0.1" aria-label="epsilon"></label><label>Number of actions m = <b id="rd-fallmv"></b><input type="range" id="rd-fallm" min="2" max="8" step="1" value="4" aria-label="number of actions"></label><label>Steps along the edge k = <b id="rd-fallkv"></b><input type="range" id="rd-fallk" min="1" max="20" step="1" value="10" aria-label="steps along the edge"></label>';
  function draw(){const e=+$('rd-falle').value,m=+$('rd-fallm').value,k=+$('rd-fallk').value;$('rd-fallev').textContent=e.toFixed(2);$('rd-fallmv').textContent=m;$('rd-fallkv').textContent=k;const o=M.cliffFall(e,m,k);
    $('rd-fallO').innerHTML=RD.stat('Chance of the fatal action per step','&epsilon;/m = '+n(o.p,4))+RD.stat('A pass with no fall','(1 &minus; &epsilon;/m)<sup>k</sup> = '+n(o.pass,3))+RD.stat('At least one fall',RD.pct(o.fall,1),'per pass along the edge')}
  box.addEventListener('input',draw);draw()})();
})();
