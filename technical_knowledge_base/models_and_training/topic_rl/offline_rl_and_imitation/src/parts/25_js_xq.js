// ---- Reading: extrapolation error on a 1-D action, four offline learners on one dataset (before/after animation) ----
(function(){
  const E=window.OF,$=id=>document.getElementById(id);
  const A=$('xq-A'),Tt=$('xq-T'),Px=$('xq-P'),N=$('xq-N');
  const COL={naive:'var(--c2)',bcq:'var(--c3)',cql:'var(--c1)',iql:'var(--c4)'};
  const NAME={naive:'Naive fitted Q iteration',bcq:'BCQ-style (actions within the data\'s range)',cql:'CQL(H)',iql:'IQL (expectile over the data\'s actions)'};
  let mode='naive',cache={},cur=null,nai=null;
  function opts(m){return {beta:+$('xq-b').value,alpha:+$('xq-a').value,tau:+$('xq-t').value}}
  function get(m){const o=opts(m),seed=+$('xq-s').value,key=[m,seed,o.beta,m==='cql'?o.alpha:'',m==='iql'?o.tau:''].join(' ');
    if(!cache[key])cache[key]=E.runX(m,seed,o);return cache[key]}
  function compute(){cur=get(mode);nai=get('naive')}
  function draw(k){const W=RD.width(A),H=340,l=40,r=10,t=22,pb=46,b=22,G=E.GRID,h=cur.hist[k],hn=nai.hist[k],g=E.GAMMA;
    let ymax=12;[cur,nai].forEach(run=>run.hist.forEach(x=>x.qg.forEach(v=>{if(v>ymax)ymax=v})));ymax=Math.min(60,Math.ceil(ymax/5)*5);const ymin=-18;
    const X=a=>l+(W-l-r)*(a+1)/2,y1=H-pb-b,Y=v=>t+(y1-t)*(ymax-Math.max(ymin,Math.min(ymax,v)))/(ymax-ymin);let s='';
    for(let v=Math.ceil(ymin/10)*10;v<=ymax;v+=10)s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(v).toFixed(1)+'" y2="'+Y(v).toFixed(1)+'" stroke="var(--line)"/>'+RD.t(l-4,Y(v)+4,RD.n(v,0),{a:'end',fs:10,fill:'var(--mute)'});
    // the data's range used by the BCQ-style learner: mean plus or minus two standard deviations
    const s0=X(Math.max(-1,cur.mu-2*cur.sd)),s1=X(Math.min(1,cur.mu+2*cur.sd));
    s+='<rect x="'+s0.toFixed(1)+'" y="'+t+'" width="'+(s1-s0).toFixed(1)+'" height="'+(y1-t)+'" fill="var(--soft)" stroke="var(--mute)" stroke-dasharray="3 3"/>';
    const path=f=>G.map((a,i)=>(i?'L':'M')+X(a).toFixed(1)+','+Y(f(a,i)).toFixed(1)).join('');
    s+='<path d="'+path(a=>E.rtrue(a)/(1-g))+'" fill="none" stroke="var(--ink)" stroke-width="1.4" stroke-dasharray="5 4"/>';
    if(mode!=='naive')s+='<path d="'+path((a,i)=>hn.qg[i])+'" fill="none" stroke="var(--mute)" stroke-width="1.6" opacity=".55"/>';
    s+='<path d="'+path((a,i)=>h.qg[i])+'" fill="none" stroke="'+COL[mode]+'" stroke-width="2.6"/>';
    if(mode==='iql'&&h.V!=null)s+='<line x1="'+s0.toFixed(1)+'" x2="'+s1.toFixed(1)+'" y1="'+Y(h.V).toFixed(1)+'" y2="'+Y(h.V).toFixed(1)+'" stroke="var(--c4)" stroke-dasharray="2 2"/>'+RD.t(s1+3,Y(h.V)+4,'V (expectile)',{fs:10,fill:'var(--c4)'});
    // data actions as ticks on the axis
    s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+y1+'" y2="'+y1+'" stroke="var(--mute)"/>';
    cur.A.forEach(a=>{s+='<line x1="'+X(a).toFixed(1)+'" x2="'+X(a).toFixed(1)+'" y1="'+(y1-7)+'" y2="'+y1+'" stroke="var(--ink)" stroke-width="1.2"/>'});
    // the policy, drawn below the axis
    const pt=y1+6,ph=pb-12;let pm=0;for(const i in h.pol)pm=Math.max(pm,h.pol[i]);
    if(mode==='iql'){for(const i in h.pol){const x=X(cur.A[i]);s+='<line x1="'+x.toFixed(1)+'" x2="'+x.toFixed(1)+'" y1="'+(pt+ph).toFixed(1)+'" y2="'+(pt+ph-ph*h.pol[i]/pm).toFixed(1)+'" stroke="'+COL[mode]+'" stroke-width="2.2"/>'}}
    else{const keys=Object.keys(h.pol).map(Number).sort((a,b)=>a-b);let d='M'+X(G[keys[0]]).toFixed(1)+','+(pt+ph);keys.forEach(i=>{d+='L'+X(G[i]).toFixed(1)+','+(pt+ph-ph*h.pol[i]/pm).toFixed(1)});d+='L'+X(G[keys[keys.length-1]]).toFixed(1)+','+(pt+ph)+'Z';
      s+='<path d="'+d+'" fill="'+COL[mode]+'" opacity=".45"/>'}
    s+=RD.t(l+2,pt+ph+12,'policy',{fs:10,fill:'var(--mute)'});
    [-1,-0.5,0,0.5,1].forEach(a=>{s+=RD.t(X(a),H-4,RD.n(a,1),{a:a===-1?'start':a===1?'end':'middle',fs:10,fill:'var(--mute)'})});
    s+=RD.t(l,12,'value of the action',{fs:10,fill:'var(--mute)'});
    A.innerHTML=RD.svg(W,H,s,'Fitted Q against the true value');
    $('xq-L').innerHTML='<span><i style="background:'+COL[mode]+'"></i>'+NAME[mode]+', iteration '+k+'</span>'+(mode!=='naive'?'<span><i style="background:var(--mute)"></i>naive, same iteration</span>':'')+'<span><i style="background:var(--ink);height:1px"></i>dashed: true value r(a)/(1 − γ)</span><span><i style="background:var(--soft);border:1px dashed var(--mute);height:8px"></i>data mean ± 2 s.d.</span><span>ticks: the 30 data actions</span>';
    // caption
    const m=h.mode,inS=Math.abs(m-cur.mu)<=2*cur.sd;
    if(k===0){Tt.textContent=NAME[mode]+': before the first fit';
      Px.innerHTML='Q starts at 0 everywhere, so the policy is uniform'+(mode==='bcq'?' over the shaded band':mode==='iql'?' over the 30 data actions':' over all actions')+'. Each iteration refits Q to the targets r<sub>i</sub> + γ × (value of the next state) on the 30 data points.'}
    else{Tt.textContent='Iteration '+k+': '+NAME[mode]+', the policy\'s most likely action is a = '+RD.n(m,2)+(inS?' (inside the data\'s range)':' (outside the data)');
      let p='The learner believes its policy is worth '+RD.n(h.bel,2)+'; following it for ever is really worth '+RD.n(h.true,2)+'. ';
      if(mode==='naive')p+=h.bel>h.true+1?'Off the right edge of the data the fitted line keeps rising, nothing contradicts it, and the target feeds that height back in on every iteration.':'The first fits are close to the data; the extrapolated edge has not yet been fed back.';
      else if(mode==='bcq')p+='Only actions inside the band are ever chosen, so the Q being maximised is the Q the data supports; outside the band Q is still wrong, but never used.';
      else if(mode==='cql')p+=h.bel<=h.true?'The penalty lowers Q wherever the policy puts weight and raises it on the data, so the value the policy believes is below the true one (a lower bound, CQL\'s Theorem 3.2 with μ = π).':'With α this large the policy is held on the data, and both values sit near the behaviour policy\'s; the small excess is the noise in 30 rewards.';
      else p+='The value of the next state is an upper expectile of Q over the data\'s own actions (dotted line), so Q is never queried outside the ticks; the policy reweights the data\'s actions by exp(β(Q − V)).';
      Px.innerHTML=p}
    N.innerHTML=RD.stat('Iteration',String(k),'of '+E.KIT)+RD.stat('Believed value',RD.n(h.bel,2),'E<sub>π</sub>[Q<sub>k</sub>]')+RD.stat('True value',RD.n(h.true,2),'E<sub>π</sub>[r]/(1 − γ)')+
      RD.stat('Behaviour policy',RD.n(cur.beh,2),'true r over the data\'s actions /(1 − γ)')+RD.stat('Best in the band',RD.n(cur.bestSup,2),'best possible 10')}
  compute();
  const an=RD.anim({card:'xq',ctl:'xq-C',n:E.KIT+1,ms:420,draw,label:'Iteration'});
  $('xq-M').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;mode=b.dataset.m;[...b.parentNode.children].forEach(x=>x.classList.toggle('on',x===b));compute();an.redraw()});
  ['xq-a','xq-t','xq-b','xq-s'].forEach(id=>$(id).addEventListener('change',()=>{compute();an.redraw()}));
  RD.onResize(()=>an.redraw());
})();
