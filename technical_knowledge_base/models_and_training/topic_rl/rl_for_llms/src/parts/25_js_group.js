// ---- Section 3: one group, step by step (GRPO, Dr. GRPO, RLOO) ----
// Adapted from Topic: rl's reading_full/29_js_rd_llm.js (for_children); presets now include real groups from LLD.
(function(){
  const E=window.LLE,D=window.LLD;
  const ILL=[220,410,160,530,300,680,250,390,450,180,600,340,270,510,230,360];
  const PRE=[{k:'a',lab:'Worked example: 1 of 4',G:4,r:[1,0,0,0],L:ILL.slice(0,4)},
    {k:'b',lab:'1 of 16 (difficulty bias)',G:16,r:[1].concat(new Array(15).fill(0)),L:ILL},
    {k:'c',lab:'8 of 16',G:16,r:[1,0,1,0,0,1,1,0,1,0,1,0,0,1,0,1],L:ILL}];
  // real groups: the hardest, a middling and an easy one that is not uniform, plus a uniform one if any
  const gs=D.groups.map((g,j)=>({j,n:g.r.reduce((a,b)=>a+b,0),g}));
  const pick=[];const nonU=gs.filter(x=>x.n>0&&x.n<16).sort((a,b)=>a.n-b.n);
  if(nonU.length){pick.push(nonU[0]);pick.push(nonU[Math.floor(nonU.length/2)]);pick.push(nonU[nonU.length-1])}
  const uni=gs.find(x=>x.n===0||x.n===16);if(uni)pick.push(uni);
  [...new Set(pick)].forEach(x=>PRE.push({k:'g'+x.j,lab:'Real: GSM8K #'+x.g.pid+', '+x.n+' of 16',G:16,r:x.g.r.slice(),L:x.g.L.slice(),real:1}));
  const P=document.getElementById('rd-grP'),Tt=document.getElementById('rd-grT'),Xp=document.getElementById('rd-grX'),N=document.getElementById('rd-grN'),GB=document.getElementById('rd-grG');
  GB.innerHTML=PRE.map(p=>'<button data-p="'+p.k+'">'+p.lab+'</button>').join('');
  let cur=PRE[0],r=cur.r.slice(),kind='grpo',pre='a';
  const STEPS=['Sample a group','Score with the verifier','Group statistics','Advantages','Spread over tokens'];
  function stats(){const ad=E.groupAdv(r,kind),L=cur.L,Lmax=Math.max(...L),G=r.length;
    const tok=E.tokenWeights(ad.A,L,kind==='drgrpo'?'drgrpo':'grpo');return {ad,L,Lmax,tok,G}}
  function draw(i){const st=stats(),G=st.G,W=RD.width(P),rh=G>8?19:28,H=G*rh+30,l=W<480?64:86,r0=W<480?118:150,bx=l,bw=W-l-r0;let s='';
    const maxT=Math.max(1e-12,...st.tok.map(Math.abs)),Lsc=Math.max(700,...st.L);
    for(let k=0;k<G;k++){const y=6+k*rh,sc=i>=1,col=sc?(r[k]?'var(--c3)':'var(--c2)'):'var(--dim)';
      s+='<g class="rd-grR" data-k="'+k+'" style="cursor:pointer"><rect x="0" y="'+y+'" width="'+W+'" height="'+(rh-2)+'" fill="transparent"/>'+RD.t(2,y+rh/2+2,'response '+(k+1),{fs:rh<22?9.5:10.5});
      const w=bw*st.L[k]/Lsc;s+='<rect x="'+bx+'" y="'+(y+3)+'" width="'+w.toFixed(1)+'" height="'+(rh-8)+'" rx="2" fill="'+col+'" opacity="'+(sc?0.85:0.6)+'"/>';
      if(i===0||W>=480)s+=RD.t(Math.min(bx+w+4,W-r0-34),y+rh/2+2,st.L[k]+' tok',{fs:9,fill:'var(--mute)'});
      if(sc)s+=RD.t(W-r0+6,y+rh/2+2,r[k]?'pass 1':'fail 0',{fs:10,fill:col,w:600});
      if(i>=3)s+=RD.t(W-r0+(W<480?50:60),y+rh/2+2,'Â '+RD.sg(st.ad.A[k],2),{fs:10.5,w:600,fill:st.ad.A[k]>0?'var(--c3)':st.ad.A[k]<0?'var(--c2)':'var(--mute)'});
      if(i>=4){const tw=Math.abs(st.tok[k])/maxT*Math.min(36,r0*0.22);s+='<rect x="'+(W-tw-2).toFixed(1)+'" y="'+(y+rh/2-3)+'" width="'+tw.toFixed(1)+'" height="6" fill="var(--c4)"/>'}
      s+='</g>'}
    if(i>=2)s+=RD.t(2,H-12,'mean '+RD.n(st.ad.m,3)+'   std '+RD.n(st.ad.sd,3),{fs:10.5,w:600});
    if(i>=4)s+=RD.t(W-2,H-12,'per-token weight',{a:'end',fs:9.5,fill:'var(--c4)'});
    P.innerHTML=RD.svg(W,H,s,'One group of responses');
    Tt.textContent=STEPS[i]+' ('+(kind==='grpo'?'GRPO':kind==='drgrpo'?'Dr. GRPO':'RLOO')+', '+G+' responses'+(cur.real?', real':'')+')';
    const allSame=st.ad.sd===0,nc=r.reduce((a,b)=>a+b,0),neg=st.tok.map((t,k)=>[t,k]).filter(x=>x[0]<0);
    let lenTxt='no wrong answers here';
    if(neg.length>1){const lo=neg.reduce((a,b)=>st.L[a[1]]>st.L[b[1]]?a:b),hi=neg.reduce((a,b)=>st.L[a[1]]<st.L[b[1]]?a:b);
      lenTxt='per 1,000 tokens: '+RD.n(1000*lo[0],3)+' on the longest wrong answer ('+st.L[lo[1]]+' tokens) against '+RD.n(1000*hi[0],3)+' on the shortest ('+st.L[hi[1]]+')'}
    Xp.innerHTML=[
      'The policy samples '+G+' responses to the same prompt at temperature 1. '+(cur.real?'These are real: Qwen2.5-0.5B-Instruct on GSM8K problem '+cur.lab.replace(/^Real: GSM8K #(\d+).*/,'$1')+', bars to scale by length in tokens.':'Lengths are illustrative.'),
      'A verifier scores each: '+nc+' of '+G+' pass. No reward model, no critic.',
      allSame?'Every response scored the same, so the standard deviation is 0: this group carries no learning signal at all (DAPO\'s dynamic sampling drops such groups; dividing by a zero standard deviation is also a classic bug).':'The group mean '+RD.n(st.ad.m,3)+' is the baseline: it plays the role V(s) plays in an actor-critic. GRPO also divides by the standard deviation '+RD.n(st.ad.sd,3)+'.',
      allSame?'All advantages are 0.':kind==='grpo'?'Â = (r − mean)/std. A lone correct answer in a hard group gets a large push (1 of 16: +3.873); in a half-right group each correct answer gets +1.000. That gap is Dr. GRPO\'s difficulty bias.':kind==='drgrpo'?'Dr. GRPO drops the division by the standard deviation: Â = r − mean, so a correct answer\'s push depends on how surprising it was (1 of 16: +0.938; 8 of 16: +0.500), not on the group\'s spread.':'RLOO\'s baseline for each response is the mean of the other '+(G-1)+': a correct answer gets 1 minus the others\' pass rate, exactly '+G+'/'+(G-1)+' times Dr. GRPO\'s advantage.',
      kind==='drgrpo'?'Dr. GRPO divides every response by the same constant (here the longest length, '+st.Lmax+'), so each token of every response gets the same weight per unit of advantage, short or long.':'GRPO\'s 1/|o| spreads each response\'s advantage over its own length: a long wrong answer is penalised less per token than a short one ('+lenTxt+'), so wrong answers drift longer: Dr. GRPO\'s length bias.'][i];
    N.innerHTML=RD.stat('Passes',nc+' / '+G,'')+RD.stat('Mean, std',RD.n(st.ad.m,3)+', '+RD.n(st.ad.sd,3),'population std')+RD.stat('Σ advantages',RD.n(E.sum(st.ad.A),3),'zero by construction')+RD.stat('Top advantage',RD.sg(Math.max(...st.ad.A),3),'')}
  const an=RD.anim({card:'rd-gr',ctl:'rd-grC',n:STEPS.length,ms:2200,draw,label:'Step'});
  function setBtns(){[...GB.querySelectorAll('button')].forEach(b=>b.classList.toggle('on',b.dataset.p===pre))}
  GB.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;pre=b.dataset.p;cur=PRE.find(p=>p.k===pre);r=cur.r.slice();setBtns();an.reset(STEPS.length);an.play()});
  document.getElementById('rd-grK').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;kind=b.dataset.k;[...b.parentNode.children].forEach(x=>x.classList.toggle('on',x===b));an.redraw()});
  P.addEventListener('click',e=>{const g=e.target.closest('.rd-grR');if(!g)return;const k=+g.dataset.k;r[k]=1-r[k];pre='';setBtns();if(an.i<1)an.go(3);else an.redraw()});
  setBtns();RD.onResize(()=>an.redraw());
  // the uniform-group count in the text
  const z=document.getElementById('rd-zeroShare');if(z){const u=gs.filter(x=>x.n===0||x.n===16).length;z.textContent=u+' of '+gs.length}
})();
