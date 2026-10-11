// ---- Expert balancer (t-ep): routing counts in window.DDE (src/ep/route.py, balance.py); EPLB's global policy ported line for line ----
window.DDEPLB=(function(){
  const f=Math.fround;
  // deepseek-ai/EPLB eplb.py, rebalance_experts with num_groups = num_nodes = 1 (the global policy), one layer.
  // weight: loads of the E logical experts; returns phy2log in packed order (slot p on GPU p / (P/G)), logcnt, and the decisions.
  function plan(weight,P,G){
    const E=weight.length,w=weight.map(v=>f(v)),logcnt=new Array(E).fill(1),phy2log=[],rank=[],log=[];
    for(let i=0;i<E;i++){phy2log.push(i);rank.push(0)}
    for(let i=E;i<P;i++){ // replicate_experts: the expert with the highest load per copy (first on ties, as torch.max)
      let best=0,bv=-Infinity;for(let e=0;e<E;e++){const v=f(w[e]/logcnt[e]);if(v>bv){bv=v;best=e}}
      phy2log.push(best);rank.push(logcnt[best]);logcnt[best]++;log.push({t:'rep',e:best,v:bv});
    }
    const per=P/G,tok=phy2log.map(e=>f(w[e]/logcnt[e]));
    let packIdx=new Array(P),rankIn=new Array(P);
    if(per===1){for(let p=0;p<P;p++){packIdx[p]=p;rankIn[p]=0}}
    else{ // balanced_packing: heaviest first, each to the lightest pack with room (first on ties)
      const order=tok.map((v,i)=>i).sort((a,b)=>tok[b]-tok[a]||a-b);
      const pw=new Array(G).fill(0),pn=new Array(G).fill(0);
      order.forEach(p=>{let best=-1;for(let g=0;g<G;g++){if(pn[g]>=per)continue;if(best<0||pw[g]<pw[best])best=g}
        packIdx[p]=best;rankIn[p]=pn[best];pw[best]=f(pw[best]+tok[p]);pn[best]++;log.push({t:'pack',p,e:phy2log[p],g:best,v:tok[p]})});
    }
    const out=new Array(P);for(let p=0;p<P;p++)out[packIdx[p]*per+rankIn[p]]=phy2log[p];
    return {phy2log:out,logcnt,log};
  }
  function loads(phy2log,logcnt,x,G){const P=phy2log.length,per=P/G,L=new Array(G).fill(0);
    for(let p=0;p<P;p++){const e=phy2log[p];L[Math.floor(p/per)]+=x[e]/logcnt[e]}return L}
  const naive=(E)=>({phy2log:[...Array(E).keys()],logcnt:new Array(E).fill(1)});
  const imb=L=>Math.max(...L)/(L.reduce((a,b)=>a+b,0)/L.length);
  return {plan,loads,naive,imb};
})();
(function(){
  const D=window.DDE,B=window.DDEPLB;if(!D||!document.getElementById('ep-plot'))return;
  const $=id=>document.getElementById(id);
  const fmt=(x,d)=>(+x).toLocaleString('en-GB',{maximumFractionDigits:d==null?2:d});
  $('ep-data').innerHTML=RD.esc(D.model)+' (Apache 2.0): '+D.L+' layers, '+D.E+' experts per layer, '+D.K+' chosen per token by the router. It read '+D.W+' windows of '+D.window+' tokens of WikiText-2 (test split) in bfloat16 on the M1 Pro’s CPU; for every token, layer and expert we counted the router’s choices. The first '+(D.W/2)+' windows are the <b>history</b> a balancer learns from; the last '+(D.W/2)+' are the <b>traffic</b> it is judged on. Balancer: {{EPLB|https://github.com/deepseek-ai/EPLB}} (commit d52c72d, MIT), its global policy; the Python run used the file unchanged, this page uses a line-for-line port checked against it (<span id="ep-chk"></span>). A replicated expert’s tokens are split evenly between its copies.';
  $('ep-chk').textContent=D.port_check;
  for(let l=0;l<D.L;l++)$('ep-l').insertAdjacentHTML('beforeend','<option value="'+l+'"'+(l===D.worst_layer?' selected':'')+'>'+(l+1)+(l===D.worst_layer?' (least even)':'')+'</option>');
  for(let w=0;w<D.traffic_windows.length;w++)$('ep-w').insertAdjacentHTML('beforeend','<option value="'+w+'">one batch: traffic window '+(w+1)+' (512 tokens)</option>');
  $('ep-w').insertAdjacentHTML('beforeend','<option value="all">all traffic summed ('+(D.W/2*D.window).toLocaleString('en-GB')+' tokens)</option>');
  function rOpts(){const G=+$('ep-g').value,cur=$('ep-r').value;$('ep-r').innerHTML=[0,G,2*G].map(r=>'<option value="'+r+'">'+r+(r?' ('+(r/G)+' extra slot'+(r/G>1?'s':'')+' per GPU)':' (pack only)')+'</option>').join('');
    if([...$('ep-r').options].some(o=>o.value===cur))$('ep-r').value=cur}
  function cur(){const G=+$('ep-g').value,R=+$('ep-r').value,l=+$('ep-l').value,w=$('ep-w').value;
    const x=w==='all'?D.traffic_sum[l]:D.traffic_windows[+w][l];
    const pe=B.plan(D.hist[l],D.E+R,G),pn=B.naive(D.E);
    return {G,R,l,x,pe,Ln:B.loads(pn.phy2log,pn.logcnt,x,G),Le:B.loads(pe.phy2log,pe.logcnt,x,G)}}
  function plot(){
    const s=cur(),el=$('ep-plot'),W=Math.max(300,Math.min(860,RD.width(el))),H=230,L=44,R=8,T=22,Bt=28;
    const mx=Math.max(...s.Ln,...s.Le)*1.08,mean=s.Ln.reduce((a,b)=>a+b,0)/s.G,y=v=>T+(H-T-Bt)*(1-v/mx),bw=(W-L-R)/s.G;
    let b='';for(let k=0;k<=4;k++){const v=mx*k/4;b+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/>'+RD.t(L-4,y(v)+4,fmt(v,0),{a:'end',fs:10,fill:'var(--mute)'})}
    for(let g=0;g<s.G;g++){const x0=L+g*bw,w=Math.max(2,bw*0.36);
      b+='<rect x="'+(x0+bw*0.1)+'" y="'+y(s.Ln[g])+'" width="'+w+'" height="'+(y(0)-y(s.Ln[g]))+'" fill="var(--c2)"/>';
      b+='<rect x="'+(x0+bw*0.1+w+2)+'" y="'+y(s.Le[g])+'" width="'+w+'" height="'+(y(0)-y(s.Le[g]))+'" fill="var(--c1)"/>';
      b+=RD.t(x0+bw/2,H-Bt+14,'GPU '+g,{a:'middle',fs:10,fill:'var(--mute)'})}
    b+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(mean)+'" y2="'+y(mean)+'" stroke="var(--ink)" stroke-dasharray="4 3"/>';
    b+=RD.t(4,11,'token-expert pairs',{fs:10,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,b,'Load per GPU, default placement against EPLB');
    const In=B.imb(s.Ln),Ie=B.imb(s.Le);
    $('ep-res').innerHTML=RD.stat('Busiest GPU over the mean, default',fmt(In,2)+'×','MoE layer time set by this GPU')+RD.stat('Busiest GPU over the mean, EPLB',fmt(Ie,2)+'×',s.R+' redundant experts')+
      RD.stat('GPU time wasted waiting, default',fmt(100*(1-1/In),0)+'%','1 − mean/max')+RD.stat('GPU time wasted waiting, EPLB',fmt(100*(1-1/Ie),0)+'%','same batch');
    $('ep-say').textContent='Layer '+(s.l+1)+': the router’s favourite expert takes '+fmt(100*D.top_share[s.l],1)+'% of this layer’s choices over the whole text, against '+fmt(100/D.E,1)+'% if all were equal. '+(Ie<In?'The balancer, planned on history, cuts the wait on this batch from '+fmt(100*(1-1/In),0)+'% to '+fmt(100*(1-1/Ie),0)+'%.':'On this batch the balancer does not help: the batch differs from the history it planned on.');
    anim.reset(steps());
  }
  // section 2: the decisions
  let AL=null;
  function steps(){const s=cur();AL=s;return s.pe.log.length+1}
  function drawAn(i){
    if(!AL)return;const s=AL,el=$('ep-an'),W=Math.max(300,Math.min(860,RD.width(el))),E=D.E,P=E+s.R,per=P/s.G,H=200;
    const h=D.hist[s.l],cnt=new Array(E).fill(1),gL=new Array(s.G).fill(0),gN=new Array(s.G).fill(0);let last=null;
    for(let k=0;k<i;k++){const d=s.pe.log[k];last=d;if(d.t==='rep')cnt[d.e]++;else{gL[d.g]+=d.v;gN[d.g]++}}
    const tot=h.reduce((a,b)=>a+b,0),mxE=Math.max(...h),bw=(W-8)/E,topH=80;
    let b='';h.forEach((v,e)=>{const hh=topH*v/mxE;b+='<rect x="'+(4+e*bw)+'" y="'+(10+topH-hh)+'" width="'+Math.max(1,bw-1.5)+'" height="'+hh+'" fill="'+(last&&last.e===e?'var(--c2)':'var(--c4)')+'" opacity="'+(last&&last.e===e?1:0.6)+'"/>';
      if(cnt[e]>1)b+=RD.t(4+e*bw+bw/2,10+topH-hh-3,'×'+cnt[e],{a:'middle',fs:9,fill:'var(--ink)'})});
    b+=RD.t(4,8,'experts of layer '+(s.l+1)+', history load (×n = copies)',{fs:10,fill:'var(--mute)'});
    const gw=(W-8)/s.G,mxG=tot/s.G*1.6,y0=H-14;
    for(let g=0;g<s.G;g++){const hh=Math.min(90,90*gL[g]/mxG);b+='<rect x="'+(4+g*gw+gw*0.15)+'" y="'+(y0-hh)+'" width="'+gw*0.7+'" height="'+hh+'" fill="'+(last&&last.t==='pack'&&last.g===g?'var(--c2)':'var(--c1)')+'"/>'+RD.t(4+g*gw+gw/2,H-2,(gw>78?'GPU '+g+' ('+gN[g]+'/'+per+')':g+': '+gN[g]+'/'+per),{a:'middle',fs:9.5,fill:'var(--mute)'})}
    b+='<line x1="4" x2="'+(W-4)+'" y1="'+(y0-90*(tot/s.G)/mxG)+'" y2="'+(y0-90*(tot/s.G)/mxG)+'" stroke="var(--ink)" stroke-dasharray="4 3"/>';
    el.innerHTML=RD.svg(W,H,b,'EPLB decisions step by step');
    $('ep-an-cap').textContent=i===0?'Start: '+E+' experts, '+P+' slots on '+s.G+' GPUs ('+per+' each).':last.t==='rep'?'Step '+i+': a redundant slot goes to expert '+(last.e+1)+', which had the most load per copy ('+fmt(last.v,0)+').':'Step '+i+': a copy of expert '+(last.e+1)+' (load '+fmt(last.v,0)+') goes to GPU '+last.g+', the lightest GPU with a free slot.'+(i===s.pe.log.length?' Done: every GPU holds '+per+' slots.':'');
  }
  const anim=RD.anim({card:'ep-an-card',ctl:'ep-an-ctl',n:2,draw:drawAn,ms:350,label:'Decision'});
  function table(){
    let h='<tr><th>GPUs</th><th>Redundant</th><th>Placement</th><th class="num">Per batch, mean</th><th class="num">Per batch, p90</th><th class="num">All traffic</th><th class="num">On its own history</th></tr>';
    D.results.forEach(r=>{h+='<tr><td>'+r.G+'</td><td>'+r.R+'</td><td>'+(r.kind==='naive'?'default':'EPLB')+'</td><td class="num">'+fmt(r.batch_mean,2)+'</td><td class="num">'+fmt(r.batch_p90,2)+'</td><td class="num">'+fmt(r.all_mean,2)+'</td><td class="num">'+fmt(r.hist_mean,2)+'</td></tr>'});
    $('ep-tbl').innerHTML=h;
    $('ep-tnote').textContent='Busiest GPU over the mean, averaged over the '+D.L+' layers; "per batch" over every 512-token traffic window and layer; computed in Python with the unchanged eplb.py (src/ep/balance.py).';
  }
  rOpts();$('ep-g').addEventListener('change',()=>{rOpts();plot()});['ep-r','ep-l','ep-w'].forEach(id=>$(id).addEventListener('change',plot));
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-ep']=[plot,table];
  addEventListener('resize',()=>{const t=$('t-ep');if(t&&!t.hidden){plot()}});
})();
