// ---- Scene, Fig. 2 (section 1): greedy against beam search as a tree of hypotheses, GPT-2 small's real log-probabilities (SD.BEAM; renderer v2) ----
// Columns are steps; in each column the candidates stand sorted by total log-probability, best at the front, a box's height its total.
// Beam mode: 3 beams x 3 tokens = 9 candidates per step, the best 3 kept; greedy mode: the 3 best next tokens, the first taken.
(function(){
  if(!document.getElementById('stg-beam')||!window.SD||!SD.BEAM||!window.S3)return;const {at,lerp,mix}=S3;
  const B=SD.BEAM,NS=B.steps.length,X=s=>-4.5+s*1.5,ZQ=q=>1.8-q*.55,H=c=>Math.max(.06,.12+(c+10.5)/10.5*.95);
  const nm=t=>t==='\n'?'↵':t.replace(/^ /,'');
  // beam nodes: per step, the 9 candidates sorted by total; kept ones carry their new beam rank
  const beam=[[{tok:'',cum:0,kept:true,rank:0,z:ZQ(0)}]];
  B.steps.forEach((cs,s)=>{const srt=cs.slice().sort((a,b)=>b.cum-a.cum);beam.push(srt.map((c,q)=>Object.assign({},c,{z:ZQ(q),q})))});
  const parentOf=(s,c)=>beam[s-1].find(n=>n.kept&&n.rank===c.from);
  // the best beam's lineage, traced back from step 6's rank-0 survivor
  const best=new Set();{let n=beam[NS].find(c=>c.kept&&c.rank===0);for(let s=NS;s>=1;s--){best.add(s+':'+n.q);n=parentOf(s,n)}}
  // greedy nodes: the 3 best next tokens after greedy's own prefix; the first is taken
  const greedy=[[{tok:'',cum:0,kept:true,z:ZQ(0)}]];
  B.greedy.forEach((g,s)=>{const prev=s?B.greedy[s-1].cum:0;greedy.push(g.alt.map((a,q)=>({tok:a[0],lp:a[1],cum:prev+a[1],kept:q===0,z:ZQ(q),q})))});
  window.SD_STG=window.SD_STG||{};
  window.SD_STG.beam={best:beam[NS].find(c=>c.kept&&c.rank===0).cum,greedy:B.greedy[NS-1].cum,ratio:Math.exp(beam[NS].find(c=>c.kept&&c.rank===0).cum-B.greedy[NS-1].cum),
    s4:beam[4].map(c=>[c.tok,+c.cum.toFixed(2),c.kept])};
  let mode='greedy';
  function draw(R,k,e){const P=R.P,W=R.W,G=mode==='greedy',T=G?greedy:beam,col=G?P.c2:P.acc;R.grid(-6.8,6.2,-3.4,2.8,.5);
    // the prompt
    R.box([X(0),0,ZQ(0)],[.7,.5,.4],{fill:mix(P.paper,P.mute,.2)});
    if(k<=1||k===NS)R.label([X(0),.5,ZQ(0)],'…awfully wild,',{serif:true,fs:13,b:1,dy:-12,c:P.ink});  // off the zoomed views otherwise (labels are clamped inside the canvas)
    // the steps still to come, as faint empty slots, so the frame shows the whole search from the first step
    for(let s=k+1;s<=NS;s++)T[s].forEach(c=>R.box([X(s),0,c.z],[.5,.1,.32],{fill:P.paper,a:.16,shadow:false}));
    for(let s=1;s<=Math.min(k,NS);s++){const cur=s===k,a0=cur?e:1;
      T[s].forEach(c=>{const par=G?T[s-1].find(n=>n.kept):parentOf(s,c),h=H(c.cum),onBest=!G&&k===NS&&best.has(s+':'+c.q);
        let a=c.kept?(cur?1:.85):(cur?.4:.1);if(k===NS&&!G&&!onBest)a=c.kept?.35:.08;
        const fill=c.kept?mix(col,P.paper,onBest?.05:.5):mix(P.paper,P.bad,.25);
        R.box([X(s),0,c.z],[.5,h*(cur?Math.min(1,e*1.4):1),.32],{fill,a:a*Math.min(1,a0*2),shadow:c.kept});
        // the edge from its parent; kept edges carry flowing dots while their step is shown
        const pa=[X(s-1)+.25,H(par.cum)*.9,par.z],pb=[X(s)-.25,h*.9,c.z];
        if(c.kept||cur)R.line([pa,pb],{c:c.kept?col:P.mute,w:c.kept?(onBest?2.4:1.6):1,a:(c.kept?.7:.3)*a0*(k===NS&&!G&&!onBest?.5:1),dash:c.kept?null:[3,3]});
        if(cur&&c.kept)R.flow([pa,pb],{c:col,r:.05,n:4,speed:.9,a:a0});
        // labels: the current column names every candidate with its total; earlier columns name the survivors
        if(cur&&k<NS)R.label([X(s)+.3,h,c.z],nm(c.tok)+'  '+c.cum.toFixed(2).replace('-','−'),{al:'left',dx:6,mono:true,fs:12,b:c.kept,c:c.kept?P.ink:P.mute,a:Math.max(.55,a)*a0,grp:c.kept?null:'d',dy:0});
        else if(!cur&&c.kept&&(k===NS?(G||onBest):s>=k-1))R.label([X(s),h,c.z],nm(c.tok),{mono:true,fs:12,dy:-10,c:P.ink,a:k===NS&&!G&&!onBest?.4:.85,wide:k===NS?0:1});
      });
      if(cur&&!G&&k<NS){const cut=(ZQ(2)+ZQ(3))/2;R.glass([X(s)-.42,0,cut],[.84,0,0],[0,1.15,0],{c:P.bad,a:a0*.45,nu:3,nv:3});
        R.label([X(s)-.45,1.1,cut],'best 3 kept in front',{al:'right',dx:-4,fs:12,b:1,c:P.bad,a:a0,wide:1})}
    }
    if(k===NS){const end=T[NS].find(c=>G?c.kept:c.kept&&c.rank===0);R.glow([X(NS),H(end.cum),end.z],.6,{c:G?P.c2:P.good,a:e});
      R.label([X(NS)+.3,H(end.cum),end.z],nm(end.tok)+' · '+(G?'greedy':'best beam')+', total '+end.cum.toFixed(2).replace('-','−'),{al:'left',dx:8,fs:13,b:1,c:G?P.c2:P.good,a:e})}
  }
  const full={cam:[.12,.62],bounds:[[X(0)-1.6,0,-2.8],[X(NS)+2.4,1.1,2.2]]},last={cam:[.12,.66],bounds:[[X(0)-1.4,0,-.6],[X(NS)+3.2,1.1,2.2]]};
  const stg=S3.stage({id:'stg-beam',list:'sx-bm-g',fig:'Fig. 2 · search over GPT-2’s real log-probabilities',cam:full.cam,bounds:full.bounds,aspect:.52,dur:1300,hold:4800,draw,
    margin:w=>w<520?[16,10,14,10]:[18,14,14,14],
    view:k=>k===0?{cam:[.12,.6],bounds:[[X(0)-1.6,0,-2.8],[X(1)+2.4,1.1,2.2]]}:k<NS?{cam:[.14,.6],bounds:[[X(k-1)-.7,0,-2.8],[X(k)+2.6,1.1,2.2]]}:last});
  const el=document.getElementById('rd-bmM');
  el.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));mode=b.dataset.m;
    const g=mode==='greedy';document.getElementById('sx-bm-g').hidden=!g;document.getElementById('sx-bm-b').hidden=g;stg.list(g?'sx-bm-g':'sx-bm-b')}));
})();
