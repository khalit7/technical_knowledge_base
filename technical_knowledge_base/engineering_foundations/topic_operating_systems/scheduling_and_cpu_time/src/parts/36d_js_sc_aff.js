// ---- Scene, Fig. 4 (section 7): affinity is a fence programs see, a quota is a ceiling they do not (renderer v2) ----
// Data: window.SC_DATA.cpus, four measured containers (cpus.txt): os.cpu_count, the affinity mask, nproc and torch.get_num_threads under each set of flags.
(function(){
  if(!document.getElementById('stg-aff')||!window.SC_DATA)return;const {at,off,lerp,mix,cl}=S3,C=window.SC_DATA.cpus;
  const parse=s=>{const out=[];String(s).split(',').forEach(p=>{const [a,b]=p.split('-').map(Number);for(let i=a;i<=(b==null||isNaN(b)?a:b);i++)out.push(i)});return out};
  const CX=i=>(i-2)*1.95,PR=[0,0,2.6];
  function draw(R,k,e){const P=R.P,r=C[k],al=parse(r.cpuset),q=r.quota==='max'?null:+r.quota;R.grid(-5.6,5.6,-1.6,3.6,.5);
    // the five CPUs: allowed ones solid, fenced-off ones faded
    for(let i=0;i<5;i++){const ok=al.includes(i);R.box([CX(i),0,0],[1.5,.3,1.2],{fill:ok?mix(P.paper,P.c6,.2):P.paper,a:ok?1:.3});
      R.label([CX(i),0,.6],'CPU '+i,{mono:true,fs:12,dy:14,c:ok?P.ink:P.mute,a:ok?1:.5,wide:1})}
    if(al.length<5){const xe=(CX(al[al.length-1])+CX(al[al.length-1]+1))/2;R.glass([xe,0,-.9],[0,0,1.8],[0,1.3,0],{c:P.bad,a:.75,nu:1,nv:4});
      R.label([xe,1.3,-.9],'cpuset '+r.cpuset,{fs:12.5,b:1,c:P.bad,dy:-8})}
    // the process and the threads PyTorch starts: one per CPU it believes it has, placed on the allowed CPUs
    R.box(PR,[2.2,.5,.9],{fill:mix(P.paper,P.c2,.25)});R.label([PR[0],.5,PR[2]],'python: torch starts '+r.torch+' threads',{fs:12.5,b:1,c:P.c2,dy:-10});
    for(let j=0;j<r.torch;j++){const cpu=al[j%al.length],stack=Math.floor(j/al.length),p=[CX(cpu)+(stack?.3:0),.3,stack?.25:0];
      R.box(p,[.42,.55,.42],{fill:mix(P.paper,P.c2,.6),shadow:false});R.flowArc([PR[0],.5,PR[2]-.2],[p[0],.85,p[2]],.7,{c:P.c2,r:.06,n:5,speed:1.1,a:e})}
    // the quota: a ceiling over every allowed CPU, labelled in CPUs of time
    if(q){const x0=CX(al[0])-.85,x1=CX(al[al.length-1])+.85;R.glass([x0,1.65,-.7],[x1-x0,0,0],[0,0,1.4],{c:P.c1,a:e,nu:6,nv:2});
      R.label([(x0+x1)/2,1.65,-.7],'cpu.max: '+q+' CPU'+(q>1?'s':'')+' of time per period',{dy:-10,fs:12.5,b:1,c:P.c1,a:e})}
    // what the program sees
    R.label([PR[0],0,PR[2]+.45],'os.cpu_count '+r.cpu_count+' · affinity '+r.affinity+' · nproc '+r.nproc+' · torch '+r.torch,{fs:12.5,mono:true,dy:18,c:P.ink});
    R.label([PR[0],0,PR[2]+.45],r.flags,{fs:12.5,mono:true,b:1,dy:38,c:P.mute})
  }
  S3.stage({id:'stg-aff',list:'sx-aff',fig:'Fig. 4 · affinity against a quota, measured',cam:[.12,.62],bounds:[[-5,0,-1],[5,1.9,3.3]],aspect:.62,dur:1300,hold:5000,draw,
    margin:w=>w<520?[16,10,16,10]:[18,16,18,16]});
})();
