// Debate and voting: methods computed from the recorded calls (shared by Reading section 8 and the Debate lab).
window.FMD=(function(){
  const P=(FM.debate&&FM.debate.puzzles||[]).filter(p=>['s1','s2','s3','s4','s5','d1','d2','d3','j'].every(k=>p.calls[k]));
  const maj=(arr)=>{const c={};let best=null,bn=0;arr.forEach(a=>{if(!a)return;c[a]=(c[a]||0)+1;if(c[a]>bn){bn=c[a];best=a}});return best};
  const ok=(p,a)=>!!a&&a===p.truth;
  const tok=(p,ks)=>ks.reduce((s,k)=>s+p.calls[k].in+p.calls[k].out,0);
  const cost=(p,ks)=>ks.reduce((s,k)=>s+p.calls[k].cost,0);
  const M=[
    {id:'single',name:'One sample',ks:['s1'],ans:p=>p.calls.s1.a},
    {id:'vote3',name:'Vote of 3',ks:['s1','s2','s3'],ans:p=>maj(['s1','s2','s3'].map(k=>p.calls[k].a))},
    {id:'vote5',name:'Vote of 5',ks:['s1','s2','s3','s4','s5'],ans:p=>maj(['s1','s2','s3','s4','s5'].map(k=>p.calls[k].a))},
    {id:'judge',name:'3 samples + judge',ks:['s1','s2','s3','j'],ans:p=>p.calls.j.a},
    {id:'debate',name:'Debate, 3 x 2 rounds',ks:['s1','s2','s3','d1','d2','d3'],ans:p=>maj(['d1','d2','d3'].map(k=>p.calls[k].a))}
  ];
  M.forEach(m=>{m.right=P.filter(p=>ok(p,m.ans(p))).length;m.n=P.length;m.tok=P.length?P.reduce((s,p)=>s+tok(p,m.ks),0)/P.length:0;m.cost=P.length?P.reduce((s,p)=>s+cost(p,m.ks),0)/P.length:0;
    m.out=P.length?P.reduce((s,p)=>s+m.ks.reduce((a,k)=>a+p.calls[k].out,0),0)/P.length:0});
  // expected accuracy of a vote over k of the 5 samples, averaged over every subset of size k (exact, no resampling)
  function subsets(n,k){const r=[];(function go(s,a){if(a.length===k){r.push(a.slice());return}for(let i=s;i<n;i++){a.push(i);go(i+1,a);a.pop()}})(0,[]);return r}
  const voteK=k=>{const S=subsets(5,k);let tot=0;P.forEach(p=>{const a=['s1','s2','s3','s4','s5'].map(x=>p.calls[x].a);S.forEach(s=>{tot+=ok(p,maj(s.map(i=>a[i])))?1:0})});return P.length?tot/(P.length*S.length):0};
  const curve=[1,2,3,4,5].map(k=>({k,acc:voteK(k)}));
  // debate transitions: each solver's round-1 answer against its round-2 answer
  const tr={rr:0,wr:0,rw:0,ww:0};
  P.forEach(p=>[1,2,3].forEach(i=>{const a=ok(p,p.calls['s'+i].a),b=ok(p,p.calls['d'+i].a);tr[(a?'r':'w')+(b?'r':'w')]++}));
  const unan1=P.filter(p=>{const a=['s1','s2','s3'].map(k=>p.calls[k].a);return a[0]&&a.every(x=>x===a[0])}).length;
  const unan2=P.filter(p=>{const a=['d1','d2','d3'].map(k=>p.calls[k].a);return a[0]&&a.every(x=>x===a[0])}).length;
  const unanWrong2=P.filter(p=>{const a=['d1','d2','d3'].map(k=>p.calls[k].a);return a[0]&&a.every(x=>x===a[0])&&a[0]!==p.truth}).length;
  const parseFail=P.reduce((s,p)=>s+Object.values(p.calls).filter(c=>!c.a).length,0);
  const sampleAcc=P.length?P.reduce((s,p)=>s+['s1','s2','s3','s4','s5'].filter(k=>ok(p,p.calls[k].a)).length,0)/(5*P.length):0;
  function chart(el){
    const W=Math.min(RD.width(el),720),H=Math.round(Math.max(220,Math.min(300,W*0.5))),l=46,r=14,t=12,b=40;
    const xmax=Math.max.apply(null,M.map(m=>m.tok))*1.1,ymin=Math.max(0,Math.min.apply(null,M.map(m=>m.right/m.n))-0.15),ymax=Math.min(1,Math.max.apply(null,M.map(m=>m.right/m.n))+0.1);
    const x=v=>l+(W-l-r)*v/xmax,y=v=>t+(H-t-b)*(1-(v-ymin)/(ymax-ymin));
    let s='';
    for(let g=Math.ceil(ymin*10)/10;g<=ymax+1e-9;g+=0.1){s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+y(g)+'" y2="'+y(g)+'" stroke="var(--line)"/>'+RD.t(l-6,y(g)+4,Math.round(g*100)+'%',{fs:10.5,fill:'var(--mute)',a:'end'})}
    const st=xmax>60000?20000:10000;
    for(let g=0;g<=xmax;g+=st){s+=RD.t(x(g),H-22,(g/1000)+'K',{fs:10.5,fill:'var(--mute)',a:'middle'})}
    s+=RD.t((l+W-r)/2,H-6,'mean tokens per puzzle (input + output, all calls)',{fs:11,fill:'var(--mute)',a:'middle'});
    const col={single:'var(--mute)',vote3:'var(--c1)',vote5:'var(--c1)',judge:'var(--c4)',debate:'var(--c2)'};
    M.forEach((m,i)=>{const cx=x(m.tok),cy=y(m.right/m.n);s+='<circle cx="'+cx+'" cy="'+cy+'" r="6" fill="'+col[m.id]+'"><title>'+m.name+': '+m.right+' of '+m.n+'</title></circle>'+
      (function(){const lab=m.name+' '+m.right+'/'+m.n,lw=lab.length*6.3,pl={single:['s',16],vote3:['s',16],vote5:['e',19],judge:['e',17],debate:['e',-10]}[m.id]||['s',-8];
        let right=pl[0]==='s'&&cx+9+lw<=W-4;return RD.t(right?cx+9:Math.max(lw+2,cx-6),cy+pl[1],lab,{fs:11,a:right?'start':'end'})})()});
    el.innerHTML=RD.svg(W,H,s,'Accuracy against tokens per puzzle');
  }
  return {P,M,curve,tr,unan1,unan2,unanWrong2,parseFail,sampleAcc,ok,chart};
})();
// Reading section 8: chart and the numbers quoted in prose.
(function(){
  const D=FMD,U=FMU;if(!D.P.length)return;
  const setv=(k,v)=>document.querySelectorAll('.fm-v[data-v="'+k+'"]').forEach(e=>{e.textContent=v;e.classList.remove('fm-miss')});
  const by={};D.M.forEach(m=>by[m.id]=m);
  ['single','vote3','vote5','debate','judge'].forEach(k=>setv('deb.'+k,by[k].right+' of '+by[k].n));
  setv('deb.judge_vs_vote5',U.nf(100*by.judge.tok/by.vote5.tok,0)+'%');
  setv('deb.wr',D.tr.wr);setv('deb.rw',D.tr.rw);setv('deb.unan1',D.unan1);setv('deb.unan2',D.unan2);setv('deb.unanw',D.unanWrong2);
  const el=document.getElementById('fm-debsvg');
  if(el){const draw=()=>D.chart(el);RD.onRender(draw);RD.onResize(draw);draw()}
})();
