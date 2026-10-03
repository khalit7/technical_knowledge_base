// ---- The frontier calculator: Eq. 2 (evidence score), Eq. 3 (diversity-aware UCB) and the cluster summary
// (single-link clusters at a cosine threshold, effective cluster count) on a small ILLUSTRATIVE graph.
// The formulas and constants are the paper's (§3.2, §3.4); the graph, accounts, scores and description
// "angles" are made up to look like the run's first days. Description embeddings are reduced to one angle,
// so cosine similarity = cos(angle difference).
(function(){
  const host=$('frSvg');if(!host)return;
  // id, account, tags, bpb (null = no metric), parents, angle (degrees), label
  const NODES=[
    ['s','setup','setup',null,[],0,'program.md (setup)'],
    ['a','w1','result',4.68,['s'],228,'slice-copy donor weights'],
    ['b','w1','result',2.52,['s'],0,'unigram prior from GPT-2'],
    ['c','w1','result',2.13,['b'],4,'bigram table + SVD'],
    ['d','w2','result',1.932,['c'],33,'24 prefixes'],
    ['e','w3','verification',null,['d'],35,'verify d: confirmed'],
    ['f','w2','result',1.930,['d'],37,'log-softmax per prefix'],
    ['g','w4','result',1.923,['f'],66,'second donor'],
    ['h','w5','result',1.923,['f'],68,'second donor, rerun'],
    ['i','w4','insight',null,['g','h'],140,'plateau: evaluator looks linear'],
    ['j','w2','result',1.912,['g'],97,'28th context'],
    ['k','w2','result',1.914,['j'],99,'own follow-up of j'],
    ['l','w3','endorsed',null,['j'],100,'endorse j'],
    ['m','w5','hypothesis',null,['i'],176,'SSM band mean-pool'],
    ['n','w3','result',1.930,['c'],182,'SSM edit on bare bigram'],
    ['o','w4','result',1.913,['j'],102,'context weights retuned']
  ].map(([id,acct,tag,m,par,ang,lab])=>({id,acct,tag,m,par,ang,lab}));
  const byId=Object.fromEntries(NODES.map(n=>[n.id,n]));
  NODES.forEach(n=>n.kids=NODES.filter(k=>k.par.includes(n.id)));
  const W={setup:5,result:5,insight:5,hypothesis:5,report:5,verification:20,endorsed:0,wip:0};
  const st={D:1,tau:.8,self:false,sel:'c'};
  const cos=(a,b)=>Math.cos((a.ang-b.ang)*Math.PI/180);
  function compute(){
    // Eq. 2: weighted direct children by other accounts
    NODES.forEach(u=>{u.S=0;u.Sparts=[];u.kids.forEach(v=>{const other=v.acct!==u.acct;const w=W[v.tag];u.Sparts.push({v,w,counted:other||st.self});if(other||st.self)u.S+=w})});
    // descendant count: other accounts' contributions reachable, excluding endorsements, wip, failed verifications
    NODES.forEach(u=>{const seen=new Set(),q=[...u.kids];while(q.length){const v=q.shift();if(seen.has(v.id))continue;seen.add(v.id);q.push(...v.kids)}
      u.n=[...seen].map(i=>byId[i]).filter(v=>(v.acct!==u.acct||st.self)&&v.tag!=='endorsed'&&v.tag!=='wip').length});
    const N=NODES.filter(v=>v.par.length).length;
    const cand=NODES.filter(v=>['result','hypothesis','insight'].includes(v.tag));
    const withM=cand.filter(v=>v.m!=null);
    cand.forEach(v=>{if(v.m==null){v.Q=0;return}const worse=withM.filter(x=>x.m>v.m).length;v.Q=withM.length>1?worse/(withM.length-1):1;
      // candidates without a metric share the lowest percentile: put metric-bearing ones above them
    });
    const emb=NODES.filter(v=>v.tag!=='setup');
    cand.forEach(v=>{v.rho=emb.filter(x=>x!==v&&cos(v,x)>=.95).length;const C=15;
      v.tq=100*v.Q;v.te=C*Math.sqrt(Math.log(N+1)/(v.n+1));v.td=100*st.D/Math.sqrt(1+v.rho);v.U=v.tq+v.te+v.td});
    // single-link clusters over the description embeddings at the threshold
    const par={};emb.forEach(v=>par[v.id]=v.id);const f=x=>par[x]===x?x:(par[x]=f(par[x]));
    emb.forEach(a=>emb.forEach(b=>{if(a!==b&&cos(a,b)>=st.tau)par[f(a.id)]=f(b.id)}));
    const cl={};emb.forEach(v=>{const r=f(v.id);(cl[r]=cl[r]||[]).push(v)});
    const sizes=Object.values(cl).sort((a,b)=>b.length-a.length);
    sizes.forEach((g,i)=>g.forEach(v=>v.cl=i));
    const p=sizes.map(g=>g.length/emb.length),keff=Math.exp(-p.reduce((s,x)=>s+x*Math.log(x),0));
    return {N,cand:cand.sort((a,b)=>b.U-a.U),sizes,keff,top:p[0],k:sizes.length};
  }
  const COL=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)'];
  function draw(){const R=compute();const w=host.clientWidth;if(!w)return;
    const H=Math.round(Math.min(340,Math.max(250,w*.42))),pl=44,pr=12,pt=24,pb=30;
    const xs=v=>pl+(w-pl-pr)*(NODES.indexOf(v))/(NODES.length-1),ys=a=>pt+(H-pt-pb)*(a/240);
    let s='';
    // axis: description angle
    [0,60,120,180,240].forEach(a=>{s+=ln2(pl,ys(a),w-pr,ys(a),'var(--line)')+tx(pl-6,ys(a)+4,a+'°',{fs:11,a:'end',c:'var(--mute)'})});
    s+=tx(pl,H-8,'publication order →',{fs:11,c:'var(--mute)'})+(w>=560?tx(w-pr,H-8,'y: what the description is about (1-D, illustrative)',{fs:11,a:'end',c:'var(--mute)'}):'');
    NODES.forEach(v=>v.par.forEach(pid=>{const u=byId[pid];s+=ln2(xs(u),ys(u.ang),xs(v),ys(v.ang),'var(--mute)',{op:.45})}));
    const top=R.cand[0];
    NODES.forEach(v=>{const x=xs(v),y=ys(v.ang),c=v.tag==='setup'?'var(--dim)':COL[v.cl%COL.length];const r=v.tag==='result'?7:5.5;
      s+='<g class="fr-node" data-id="'+v.id+'">'+(v.id===st.sel?'<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+(r+4)+'" fill="none" stroke="var(--ink)" stroke-width="1.5"/>':'')+
      (v===top?'<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+(r+7)+'" fill="none" stroke="var(--bad)" stroke-width="1.5" stroke-dasharray="3 2"/>':'')+
      (v.tag==='result'?'<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+r+'" fill="'+c+'"/>':'<rect x="'+(x-r).toFixed(1)+'" y="'+(y-r).toFixed(1)+'" width="'+2*r+'" height="'+2*r+'" fill="'+c+'" transform="rotate(45 '+x.toFixed(1)+' '+y.toFixed(1)+')"/>')+
      tx(x,y-r-4,v.id,{fs:11,a:'middle'})+'<title>'+v.id+': '+v.lab+' ('+v.acct+', '+v.tag+(v.m!=null?', '+v.m+' bpb':'')+')</title></g>'});
    host.innerHTML=svgW(w,H,s,'Illustrative contribution graph');
    host.querySelectorAll('.fr-node').forEach(g=>g.addEventListener('click',()=>{st.sel=g.dataset.id;draw()}));
    // ranking table
    let t='<div class="tw"><table class="rk"><thead><tr><th>#</th><th>node</th><th>acct</th><th class="num">bpb</th><th class="num">100·Q</th><th class="num">explore</th><th class="num">novelty</th><th class="num">U</th></tr></thead><tbody>';
    R.cand.forEach((v,i)=>{t+='<tr'+(v.id===st.sel?' class="sel"':'')+'><td>'+(i+1)+'</td><td class="nm"><b>'+v.id+'</b> '+v.lab+' <span class="mute">('+v.tag+')</span></td><td>'+v.acct+'</td><td class="num">'+(v.m==null?'none':v.m.toFixed(3))+'</td><td class="num">'+v.tq.toFixed(1)+'</td><td class="num">'+v.te.toFixed(1)+'</td><td class="num">'+v.td.toFixed(1)+'</td><td class="num"><b>'+v.U.toFixed(1)+'</b></td></tr>'});
    $('frRank').innerHTML=t+'</tbody></table></div>';
    const v=byId[st.sel];
    let d='<b>'+v.id+'</b>: '+v.lab+' <span class="mute">('+v.acct+', '+v.tag+(v.m!=null?', '+v.m+' bpb':'')+')</span><br>';
    d+='Evidence score S = '+(v.Sparts.length?v.Sparts.map(p=>(p.counted?'':'<s>')+p.w+' ('+p.v.id+', '+p.v.acct+', '+p.v.tag+')'+(p.counted?'':'</s>')).join(' + ')+' = <b>'+v.S+'</b>':'<b>0</b> (nothing built on it yet)');
    if(v.Sparts.some(p=>!p.counted))d+=' <span class="mute">(struck out: same account as '+v.id+', excluded as self-citation)</span>';
    d+='<br>Descendants by other accounts n = <b>'+v.n+'</b>'+(v.rho!=null?'; near-duplicates within cosine 0.95, ρ = <b>'+v.rho+'</b>; Q = '+v.Q.toFixed(2):'; not a ranking candidate (only results, hypotheses and insights are)');
    $('frNode').innerHTML=d;
    $('frStats').innerHTML=stat('clusters at '+st.tau.toFixed(2),R.k,'single-link over descriptions')+stat('largest cluster',Math.round(100*R.top)+'%','of '+NODES.filter(v=>v.tag!=='setup').length+' contributions')+stat('effective clusters','k<sub>eff</sub> = '+R.keff.toFixed(2),'evenness '+(R.keff/R.k).toFixed(2))+stat('ranked first',R.cand[0].id+' ('+R.cand[0].tag+')','U = '+R.cand[0].U.toFixed(1)+', N = '+R.N);
  }
  $('frTau').addEventListener('input',e=>{st.tau=+e.target.value;$('frTauV').textContent=st.tau.toFixed(2);draw()});
  segBind('frD',m=>{st.D=+m;draw()});
  $('frSelf').addEventListener('change',e=>{st.self=e.target.checked;draw()});
  onTab('t-read',()=>fit(host,draw));fit(host,draw);
})();
