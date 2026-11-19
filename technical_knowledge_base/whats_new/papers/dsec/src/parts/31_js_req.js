// ---- Fig. 1 (rq): the path of one sandbox request through DSec's components (§3.1 to §3.3, Figure 1), flat (2026-11-19: was a 3D stage; a map of
// named boxes and the arrows between them reads the same flat). The components, what each holds and the order a request visits them are the paper's.
// Illustrative: the four nodes drawn (of about 160), the sandboxes already running on them (5, 2, 6 and 3), the three placement-engine instances and
// which k = 2 nodes are sampled. Drawn with makeAnim (11_js_ui.js): two modes, Container or VM and FnCall, each with its step list. ----
(function(){
  if(!$('rq'))return;
  const LOAD=[5,2,6,3],SAMP=[0,3],WIN=3,FN=2;
  window.DSEC_RQ={LOAD,SAMP,WIN}; // read by check_stages.mjs against the step list
  const arw=(x1,y1,x2,y2,c,op,o)=>{o=o||{};const a=Math.atan2(y2-y1,x2-x1),h=7,p=[[x2,y2],[x2-h*Math.cos(a-.42),y2-h*Math.sin(a-.42)],[x2-h*Math.cos(a+.42),y2-h*Math.sin(a+.42)]].map(q=>q[0].toFixed(1)+','+q[1].toFixed(1)).join(' ');
    return G(op,ln2(x1,y1,x2-4*Math.cos(a),y2-4*Math.sin(a),c,{sw:o.sw||2,da:o.da})+'<polygon points="'+p+'" fill="'+c+'"/>')};
  const ON={box:[['sdk'],['sdk','iam'],['iam','pl','wa','nodes'],['pl','api','edge'],['api','edge','new'],['edge','new','fs'],['sdk','api','edge','new'],['edge','new']],
    fn:[['sdk'],['sdk','iam'],['iam','fn'],['fn']]};
  function layout(w){const wide=w>=520,L={wide};
    if(wide){const lc=Math.min(230,w*.36),rx=lc+40,rw=w-rx;
      L.sdk=[0,14,lc,48];L.iam=[0,96,lc,38];L.pl=[0,166,lc*.62,62];L.wa=[lc*.66,166,lc*.34,62];L.api=[0,262,lc,40];
      L.fs=[rx,14,rw,32];const nw=(rw-14)/2,nh=96;L.nodes=[0,1,2,3].map(n=>[rx+(n%2)*(nw+14),76+Math.floor(n/2)*(nh+30),nw,nh]);L.H=76+2*nh+30+44}
    else{const cw=(w-12)/2;L.sdk=[0,14,w,44];L.iam=[0,80,cw,36];L.pl=[0,140,cw*1.25,52];L.wa=[cw*1.25+10,140,w-cw*1.25-10,52];L.api=[0,214,cw*1.25,36];
      L.fs=[0,272,w,28];const nw=(w-10)/2,nh=88;L.nodes=[0,1,2,3].map(n=>[(n%2)*(nw+10),320+Math.floor(n/2)*(nh+28),nw,nh]);L.H=320+2*nh+28+42}
    return L}
  const ctr=b=>[b[0]+b[2]/2,b[1]+b[3]/2];
  function draw(M,k,e,w){const L=layout(w),on=new Set(ON[M][k]),A=id=>on.has(id)?1:.32,fn=M==='fn';let s='';
    const box=(b,t,c,op,sub)=>G(op,rc(b[0],b[1],b[2],b[3],'var(--soft)',{s:c,sw:1.4,r:8})+rc(b[0],b[1],b[2],b[3],c,{r:8,op:.14})+tx(b[0]+8,b[1]+17,t,{fs:12.5,w:600})+(sub?tx(b[0]+8,b[1]+32,sub,{fs:11,c:'var(--mute)'}):''));
    s+=box(L.sdk,'GPU server · libdsec','var(--c1)',A('sdk'),'trusted: training code calls libdsec');
    s+=box(L.iam,'IAM','var(--c5)',A('iam'));
    const dim=fn?.15:1;
    s+=G(A('pl')*dim,rc(L.pl[0],L.pl[1],L.pl[2],L.pl[3],'var(--soft)',{s:'var(--c2)',sw:1.4,r:8})+tx(L.pl[0]+8,L.pl[1]+17,L.wide?'placement engines':'placement',{fs:12.5,w:600})+[0,1,2].map(i=>rc(L.pl[0]+8+i*((L.pl[2]-16)/3),L.pl[1]+28,(L.pl[2]-16)/3-5,24,'var(--c2)',{r:4,op:.35})).join(''));
    s+=box(L.wa,'watcher','var(--c6)',A('wa')*dim);s+=box(L.api,'apiserver','var(--c4)',A('api')*dim);
    // 3FS, the training cluster's filesystem; the CPU nodes, each with its edge and the sandboxes already running
    s+=G(on.has('fs')?1:.3*dim,rc(L.fs[0],L.fs[1],L.fs[2],L.fs[3],'var(--c6)',{r:6,op:.25})+rc(L.fs[0],L.fs[1],L.fs[2],L.fs[3],'none',{s:'var(--c6)',r:6})+tx(L.fs[0]+8,L.fs[1]+L.fs[3]/2+4,'3FS (image data)',{fs:12,w:600,c:'var(--c6)'}));
    const nA=on.has('nodes')||on.has('edge')||on.has('new')||on.has('fn')||on.has('fs')?1:.45;
    const cub=(n,i)=>{const b=L.nodes[n],cs=Math.min(18,(b[2]-62)/3-4);return [b[0]+52+(i%3)*(cs+4),b[1]+26+Math.floor(i/3)*(cs+4),cs]};
    L.nodes.forEach((b,n)=>{let g=rc(b[0],b[1],b[2],b[3],'var(--bg)',{s:'var(--line)',sw:1.2,r:8})+tx(b[0]+8,b[1]+16,'node '+(n+1),{fs:11.5,c:'var(--mute)'});
      const eon=n===WIN&&on.has('edge');g+=rc(b[0]+8,b[1]+26,38,b[3]-36,'var(--c3)',{r:5,op:eon?.6:.22,s:eon?'var(--c3)':null,sw:2})+tx(b[0]+27,b[1]+b[3]/2+12,'edge',{fs:11,a:'middle',c:'var(--c3)',w:600});
      for(let i=0;i<LOAD[n];i++){const [x,y,cs]=cub(n,i),fc=fn&&n===FN;g+=rc(x,y,cs,cs,fc?'var(--c4)':'var(--ink)',{r:3,op:fc?(i===0&&k>=2?.85:.4):.14})}
      s+=G(nA,g)});
    s+=tx(L.nodes[2][0],L.nodes[3][1]+L.nodes[3][3]+16,fn?'precreated FnCall containers (purple), node 3':'CPU nodes (4 of about 160 drawn)',{fs:11.5,c:fn?'var(--c4)':'var(--mute)'});
    const C=id=>ctr(L[id]),WN=L.nodes[WIN],eg=[WN[0]+27,WN[1]+26],NEW=cub(WIN,LOAD[WIN]),nc=[NEW[0]+NEW[2]/2,NEW[1]+NEW[2]/2];
    const bot=b=>[b[0]+b[2]/2,b[1]+b[3]],topc=b=>[b[0]+b[2]/2,b[1]],right=b=>[b[0]+b[2],b[1]+b[3]/2];
    const note=(x,y,t,c,a,op)=>G(op==null?1:op,tx(x,y,t,{fs:12,w:600,c,a}));
    if(!fn){
      if(k===0)s+=note(L.sdk[0]+8,L.sdk[1]+L.sdk[3]+16,'create: backend, image, limits, lifetime, network','var(--c2)','start',e);
      if(k===1)s+=arw(...bot(L.sdk),...topc(L.iam),'var(--c2)',e);
      if(k===2){s+=arw(L.iam[0]+20,L.iam[1]+L.iam[3],L.pl[0]+20,L.pl[1],'var(--c2)',e)+arw(L.wa[0],L.wa[1]+L.wa[3]/2+8,L.pl[0]+L.pl[2],L.pl[1]+L.pl[3]/2+8,'var(--c6)',e);
        s+=note(L.wa[0]+L.wa[2]/2,L.wa[1]+L.wa[3]+14,'fleet snapshot','var(--c6)','middle',e);
        SAMP.forEach(n=>{const b=L.nodes[n],win=n===WIN;s+=G(e,rc(b[0]-3,b[1]-3,b[2]+6,b[3]+6,'none',{s:win?'var(--c3)':'var(--c2)',sw:2.4,r:10}))+note(b[0]+b[2]-6,b[1]+16,(win?'picked: ':'sampled: ')+LOAD[n]+' running',win?'var(--c3)':'var(--c2)','end',e)})}
      if(k===3)s+=arw(L.pl[0]+L.pl[2]/2,L.pl[1]+L.pl[3],L.api[0]+L.pl[2]/2,L.api[1],'var(--c2)',1)+arw(...right(L.api),eg[0],eg[1],'var(--c2)',e);
      const nb=k===4?e:k>=5&&k<7?1:k===7?1-e*.7:0;
      if(nb>0)s+=G(nb,rc(NEW[0],NEW[1],NEW[2],NEW[2],'var(--c2)',{r:3,s:k===7?'var(--c2)':null,da:k===7?'3 2':null}));
      const wn=WN,ny=wn[1]+wn[3]+34,nx=wn[0]+wn[2];
      if(k===4)s+=arw(eg[0]+12,eg[1]+10,NEW[0]-2,nc[1],'var(--c3)',e,{sw:1.6})+note(nx,ny,'admitted: storage, eBPF rules, runtime','var(--c3)','end',e);
      if(k===5)s+=arw(nc[0],L.fs[1]+L.fs[3],nc[0],NEW[1]-2,'var(--c6)',e,{da:'4 3'})+note(L.fs[0]+L.fs[2]-8,L.fs[1]+L.fs[3]/2+4,'only the blocks it reads','var(--c6)','end',e)+note(nx,ny,'starts at once; writes stay on local disk','var(--c2)','end',e);
      if(k===6){s+=arw(L.sdk[0]+L.sdk[2]-20,L.sdk[1]+L.sdk[3],L.api[0]+L.api[2]-20,L.api[1],'var(--c2)',e,{da:'5 3'})+arw(...right(L.api),eg[0],eg[1],'var(--c2)',e)+arw(eg[0]+12,eg[1]+10,NEW[0]-2,nc[1],'var(--c2)',e,{sw:1.6});
        s+=note(nx,ny,'aether → chronus shell; output streams back','var(--c2)','end',e)}
      if(k===7)s+=note(nx,ny,'stopped or TTL: storage and memory freed','var(--c3)','end',e)}
    else{const fb=cub(FN,0),fc=[fb[0]+fb[2]/2,fb[1]];const fnN=L.nodes[FN];
      if(k===0)s+=note(L.sdk[0]+8,L.sdk[1]+L.sdk[3]+16,'a task: type, files, code to run','var(--c2)','start',e);
      if(k===1)s+=arw(...bot(L.sdk),...topc(L.iam),'var(--c2)',e);
      if(k===2)s+=arw(L.sdk[0]+L.sdk[2]-30,L.sdk[1]+L.sdk[3],fc[0],fc[1]-2,'var(--c4)',e,{da:'6 3'})+note(w,L.nodes[3][1]+L.nodes[3][3]+34,'runs at once: no image, no shell','var(--c4)','end',e);
      if(k===3)s+=note(w,L.nodes[3][1]+L.nodes[3][3]+34,'cleaned up, then reused','var(--c4)','end',e)}
    return svgW(w,L.H,s,'The path of one sandbox request through DSec')}
  const CNT={box:k=>stat('Components passed',[1,2,3,4,5,6,6,6][k]+' of 6')+stat('Per-sandbox state in the ingress','none','sandbox ID encodes its edge')+stat('Image bytes pulled before start','0','data fetched on read'),
    fn:k=>stat('Components passed',[1,2,3,3][k]+' of 3')+stat('Per-invocation provisioning','none','container is precreated')+stat('Step',(k+1)+' of 4')};
  makeAnim({id:'rq',mode:'box',modes:{box:[0,1,2,3,4,5,6,7],fn:[0,1,2,3]},lists:{box:'sx-rq-box',fn:'sx-rq-fn'},dur:4600,draw,counters:(m,k)=>CNT[m](k)});
})();
