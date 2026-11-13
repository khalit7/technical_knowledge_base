// ---- Scene (Reading 2, Fig. 1): one real (benchmark item, training document) pair from the running example through the n-gram rules (renderer v2).
// The item's tokens are the front row of blocks, the document's matched part the back row; a glass window of n tokens slides along the item into the
// index, then along the document looking each n-gram up; covered item tokens rise against Tulu 3's 50% line; four plinths give the four rules' verdicts.
// Every token, mark and verdict comes from window.DG.anim (the scan's pairs, src/scripts/dg_pairs.py); the marks are recomputed here from the tokens. ----
(function(){
  if(!document.getElementById('stg-ng')||!window.DG||!DG.anim)return;const {at,lerp,mix}=S3;
  const A=DG.anim,E=RD.esc,$=id=>document.getElementById(id),f=n=>Number(n).toLocaleString('en-GB');
  const LAB={copy:'A copied question',passage:'A famous passage',phrase:'A question stem',diagram:'Diagram code'};
  let P=0,N=8,G=null;
  const grams=(t,n)=>{const s=new Map();for(let i=0;i+n<=t.length;i++){const g=t.slice(i,i+n).join(' ');if(!s.has(g))s.set(g,i)}return s};
  // tokens of a inside an n-gram also in b; for each a-position that hits, the first b-position holding the same n-gram
  function marks(a,b,n){const g=grams(b,n),m=new Array(a.length).fill(false),first=[];let hits=0;
    for(let i=0;i+n<=a.length;i++){const k=a.slice(i,i+n).join(' ');if(g.has(k)){hits++;first.push(g.get(k));for(let j=i;j<i+n;j++)m[j]=true}}
    return {m,hits,first,total:Math.max(0,a.length-n+1)}}
  const runs=m=>{const r=[];let s=-1;m.forEach((x,i)=>{if(x&&s<0)s=i;if(!x&&s>=0){r.push([s,i-1]);s=-1}});if(s>=0)r.push([s,m.length-1]);return r};
  const cut=t=>t.length>10?t.slice(0,9)+'…':t,ZI=.9,ZD=-.9,XI=6.3,ZV=2.9,PX=[-5,-1.7,1.7,5],NL=11;
  function geo(){const a=A[P],it=a.item,dc=a.doc,mi=marks(it,dc,N),md=marks(dc,it,N),L=Math.max(it.length,dc.length),tw=Math.min(.55,10.4/L);
    const cov=mi.m.filter(Boolean).length/it.length,ri=runs(mi.m),lg=ri.reduce((b,r)=>Math.max(b,r[1]-r[0]+1),0);
    return G={a,it,dc,mi,md,tw,cov,ri,rd:runs(md.m),lg,xi:i=>(i-(it.length-1)/2)*tw,xd:j=>(j-(dc.length-1)/2)*tw}}
  const v=a=>{const r=a.v;return [['GPT-3','any 13-gram',r.m13>0,r.m13+' shared 13-grams'],['Tulu 3','8-grams > 50%',r.cov8>.5,'coverage '+Math.round(r.cov8*100)+'% of all '+a.item_full_len+' tokens'],
    ['ConTAM','longest match',r.lm>=.5,'a run of '+r.run+' tokens, '+Math.round(r.lm*100)+'% of the item'],['datatrove','answer 12-gram',!!r.dt,r.dt?'an answer or answer-straddling 12-gram matched':'no answer 12-gram in the document']]};
  function draw(R,k,e){const P_=R.P,g=G||geo(),{it,dc,mi,md,tw}=g;R.grid(-6,7.5,-2,3.8,.5);
    const rowA=k===4?.28:1,bh=.12,fade=i=>Math.max(0,Math.min(1,1-(i-NL+1)*.4)),gC=mix(P_.paper,P_.good,.6);
    // the window's position along the item (step 2) or the document (step 3), in tokens
    const wI=k===1?e*(it.length-N):0,wD=k===2?e*(dc.length-N):k>2?dc.length:0;
    // 1. the two rows of token blocks
    it.forEach((t,i)=>{const cv=mi.m[i]&&k>=3,h=cv?lerp(bh,.42,k===3?e:1):bh;
      R.box([g.xi(i),0,ZI],[tw*.82,h,.62],{fill:cv?gC:P_.paper,a:(k===0?at(k,e,0)*fade(i):1)*rowA,shadow:false,lw:.6})});
    dc.forEach((t,j)=>{const lit=md.m[j]&&k>=2&&(k>2||j<wD+N);
      R.box([g.xd(j),0,ZD],[tw*.82,bh,.62],{fill:lit?gC:P_.paper,a:(k===0?at(k,e,0)*fade(j):1)*(k>=3?.55:1)*rowA,shadow:false,lw:.6})});
    // step 1: the words themselves, close up on the first tokens (above and below in turn so they never collide)
    if(k===0){const nl=Math.min(NL,it.length,dc.length),la=1;
      for(let i=0;i<nl;i++){R.label([g.xi(i),bh,ZI],cut(it[i]),{mono:true,fs:12,dy:i%2?20:-12,a:la});R.label([g.xd(i),bh,ZD],cut(dc[i]),{mono:true,fs:12,dy:i%2?20:-12,a:la,c:P_.mute})}}
    else if(k<4){R.label([g.xi(0)-tw,.1,ZI],'item · '+it.length+' tokens',{al:'right',dx:-6,mono:true,fs:12,c:P_.ink,grp:'row'});
      R.label([g.xd(0)-tw,.1,ZD],'document · '+dc.length,{al:'right',dx:-6,mono:true,fs:12,c:P_.mute,grp:'row'})}
    // the index: the item's n-grams hashed into a set
    const ia=k===0?0:k===1?Math.min(1,e*2):k===2?1:k===3?.3:.1;
    if(ia>0){R.box([XI,0,ZD],[1,.75,1],{fill:mix(P_.paper,P_.c1,.3),fa:.55,a:ia});
      const nIdx=k===1?Math.min(mi.total,Math.floor(e*mi.total)+1):mi.total;if(k<3)R.label([XI,.75,ZD],'index · '+f(nIdx)+' '+N+'-grams',{mono:true,fs:12,dy:-12,c:P_.c1,a:ia})}
    // 2-3. the sliding window, a glass plate n tokens wide, with lookups flowing between it and the index
    const win=(x0,z,a)=>{R.glass([x0-tw/2,.0,z+.26],[N*tw,0,0],[0,.6,0],{c:P_.c1,nu:N,nv:1,a});
      R.flowArc([x0-tw/2+N*tw/2,.62,z+.26],[XI,.78,ZD],.6,{c:P_.c1,a:a*.9,r:.06,speed:1.5})};
    if(k===1)win(g.xi(wI),ZI,Math.min(1,e*3));
    if(k===2){win(g.xd(Math.min(wD,dc.length-N)),ZD,1);
      const found=mi.first.filter(p=>p<=wD).length;R.label([XI,.75,ZD],'shared · '+found,{mono:true,fs:12,dy:-30,b:1,c:P_.good})}
    // 4. covered item tokens rise; marks flow from the document's lit runs to the item's; coverage against Tulu 3's 50% line
    if(k===3){const n=Math.min(g.ri.length,g.rd.length,4);for(let r=0;r<n;r++){const a0=g.rd[r],b0=g.ri[r];
        R.flowArc([g.xd((a0[0]+a0[1])/2),bh,ZD],[g.xi((b0[0]+b0[1])/2),.42,ZI],.7,{c:P_.good,a:.9,r:.06,speed:1.3})}}
    if(k>=3){const ca=k===3?1:.15,hc=1.6*g.cov*(k===3?e:1);
      R.box([XI,0,ZI],[.62,Math.max(.01,hc),.62],{fill:gC,a:ca});R.glass([XI-.6,.8,ZI-.6],[1.2,0,0],[0,0,1.2],{c:P_.c2,nu:4,nv:4,a:ca});
      if(k===3){R.label([XI+.6,.8,ZI],'50% · Tulu 3',{al:'left',dx:8,mono:true,fs:12,c:P_.c2,wide:1});
      R.label([XI-.31,hc,ZI],Math.round(100*g.cov)+'%',{al:'right',dx:-8,mono:true,fs:12.5,b:1,c:P_.good})}
      if(k===3&&g.lg){const r=g.ri.find(r=>r[1]-r[0]+1===g.lg);R.line([[g.xi(r[0]),.52,ZI],[g.xi(r[1]),.52,ZI]],{c:P_.good,w:2,a:e});
        R.label([g.xi((r[0]+r[1])/2),.52,ZI],'longest run · '+g.lg,{mono:true,fs:12,dy:-12,c:P_.good,a:e})}}
    // 5. the four rules' verdicts, each on the whole item; the marks feed every rule
    if(k===4){v(g.a).forEach(([nm,rl,fl],i)=>{const h=fl?.6:.2,x=PX[i],c=fl?P_.bad:mix(P_.paper,P_.good,.5);
      R.flowArc([0,.45,ZI],[x,h,ZV],.6,{c:fl?P_.bad:P_.good,a:e*.8,r:.055,speed:1.2});
      R.box([x,0,ZV],[1.5,h*Math.max(.05,e),.8],{fill:c});
      R.label([x,.6,ZV],nm+' · '+rl,{fs:12.5,b:1,dy:i%2?-44:-26,a:e,wide:1});R.label([x,h,ZV],fl?'flags it':'passes it',{fs:12.5,b:1,dy:-10,c:fl?P_.bad:P_.good,a:e})})}
  }
  const full={cam:[.04,.85],bounds:[[-5.4,0,ZD-.4],[8.4,.9,ZI+.4]]};
  const st=S3.stage({id:'stg-ng',list:'sx-ng',fig:'Fig. 1 · one real pair, four rules',cam:full.cam,bounds:full.bounds,aspect:.4,dur:1500,hold:4600,draw,
    margin:w=>w<520?[14,10,14,10]:[16,14,14,140],
    view:k=>{const g=G||geo();if(k===0){const n=Math.min(NL,g.it.length,g.dc.length)-1,x0=Math.min(g.xi(0),g.xd(0))-.2,x1=Math.max(g.xi(n),g.xd(n))+.2;return {cam:[.04,.5],bounds:[[x0,0,ZD-.35],[x1,.2,ZI+.35]]}}
      return k===4?{cam:[.04,.75],bounds:[[-6,0,ZD-.3],[6.2,1,ZV+.5]]}:{cam:[.32,.72],bounds:full.bounds}}});
  // the step list's numbers, the readout of the tokens, and the pair and n switches
  function chips(t,m){return '<div class="dg-tok">'+t.map((w,i)=>'<span'+(m[i]?' class="hit"':'')+'>'+E(w)+'</span>').join(' ')+'</div>'}
  function upd(){const g=geo(),a=g.a,r=v(a);
    $('ng-s1').textContent=DG.bench_names[a.bench]+' #'+a.bidx+', '+g.it.length+' tokens'+(a.item_full_len>g.it.length?' (tokens '+(a.item_off+1)+' to '+(a.item_off+g.it.length)+' of '+a.item_full_len+')':'');
    $('ng-s1d').textContent=a.label+', '+g.dc.length+' tokens shown';document.querySelectorAll('#sx-ng .ng-n').forEach(x=>x.textContent=N);
    $('ng-s2').textContent=f(g.mi.total);$('ng-s3').textContent=f(g.mi.hits);$('ng-s4').textContent=Math.round(100*g.cov)+'%';$('ng-s4r').textContent=g.lg;
    $('ng-s5').textContent=r.map(([nm,rl,fl,why],i)=>['GPT-3 (any 13-gram)','Tulu 3 (more than 50% of the item by 8-grams)','ConTAM (longest match)',"datatrove's default (a 12-gram on the answer)"][i]+(fl?' flags it':' passes it')+', '+why).join('; ');
    $('ng-s5w').textContent=a.cat+(a.note?': '+a.note:'')+'. '+(a.why||'');
    $('dg-ng-view').innerHTML='<div class="dg-lab">Benchmark item: '+E(DG.bench_names[a.bench])+' #'+a.bidx+'</div>'+chips(g.it,g.mi.m)+'<div class="dg-lab">Training document: '+E(a.label)+'</div>'+chips(g.dc,g.md.m)}
  const seg=$('dg-ng-pair');
  seg.innerHTML=A.map((a,i)=>'<button data-m="'+i+'"'+(i?'':' class="on"')+'>'+LAB[a.cat]+'</button>').join('')+'<button data-n="8" class="on">8-grams</button><button data-n="13">13-grams</button>';
  seg.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    if(b.dataset.m!=null){P=+b.dataset.m;seg.querySelectorAll('button[data-m]').forEach(x=>x.classList.toggle('on',x===b))}
    if(b.dataset.n!=null){N=+b.dataset.n;seg.querySelectorAll('button[data-n]').forEach(x=>x.classList.toggle('on',x===b))}
    G=null;upd();if(st)st.list('sx-ng')});
  upd();
})();
