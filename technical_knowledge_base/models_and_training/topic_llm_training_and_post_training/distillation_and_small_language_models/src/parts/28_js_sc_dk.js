// ---- Scene (Soft targets, Fig. 1): real Qwen2.5-0.5B-Instruct logits through the softmax at T = 1, 2, 4 (renderer v2) ----
// Back row: the top seven logits; the glass plate: exp(z / T) normalised; front row: the probabilities, with the other 151,929 tokens as one grey column.
// The top 40 logits are exact and the rest a histogram (DS.logits, from real_logits.py); dist() is the same log-sum-exp the old widget used.
(function(){
  const $=id=>document.getElementById(id);if(!$('stg-dk')||!window.S3||!window.DS)return;const {at,off,lerp,mix}=S3;
  const L=DS.logits,PR=L.prompts,N=7,NREST=L.vocab-N;let cur=0,Tover=null;
  const NAMES={capital:'The capital',times:'7 times 8',animal:'Favourite animal',code:'Python loop'};
  function dist(p,T){const tz=p.top.map(a=>a[1]/T),cz=p.tail.map(b=>(p.lo+(b[0]+.5)*L.bw)/T);
    let m=Math.max(...tz,...cz),s=0;tz.forEach(z=>s+=Math.exp(z-m));p.tail.forEach((b,i)=>s+=b[1]*Math.exp(cz[i]-m));
    const lz=m+Math.log(s),top=tz.map(z=>Math.exp(z-lz));let H=0;top.forEach(q=>{if(q>0)H-=q*Math.log2(q)});
    p.tail.forEach((b,i)=>{const q=Math.exp(cz[i]-lz);if(q>0)H-=b[1]*q*Math.log2(q)});return {top,H}}
  const tok=t=>{const s=t.replace(/\n/g,'\\n');return s.trim()===''?'␣':s.replace(/^ /,'')};
  const pc=x=>x>=.0995?(100*x).toFixed(0)+'%':x>=.000995?(100*x).toFixed(1)+'%':x>=1e-5?(100*x).toFixed(3)+'%':'<0.001%';
  const pc1=x=>x>=.001?(100*x).toFixed(1)+'%':'<0.1%';
  const rest=(d)=>1-d.top.slice(0,N).reduce((a,b)=>a+b,0);
  // the numbers the step list quotes, for one prompt
  function facts(p){const d1=dist(p,1),d2=dist(p,2),d4=dist(p,4),q=T=>Math.exp((p.top[1][1]-p.top[0][1])/T);
    let pk=[0,1];for(let e=-2;e<=3.0001;e+=.05){const T=Math.pow(2,e),v=dist(p,T).top[1];if(v>pk[0])pk=[v,T]}
    return {d1,d2,d4,q1:q(1),q2:q(2),pk}}
  const f3=x=>x>=.01?x.toFixed(3):x.toExponential(1);
  function writeList(){const p=PR[cur],F=facts(p),t3=[0,1,2].map(i=>tok(p.top[i][0]));
    const set=(k,h)=>document.querySelectorAll('[data-dk="'+k+'"]').forEach(e=>e.innerHTML=h);
    set('z',t3.map((t,i)=>t+' '+p.top[i][1].toFixed(2)).join(', '));
    set('p1',t3.map((t,i)=>t+' '+pc1(F.d1.top[i])).join(', '));set('nrest',NREST.toLocaleString('en-US'));set('r1',pc1(rest(F.d1)));
    set('top',t3[0]);set('lost',pc1(1-F.d1.top[0]));set('q1',f3(F.q1));set('q2',f3(F.q2));set('p2',pc1(F.d2.top[0]));set('r2',pc1(rest(F.d2)));set('r4',pc1(rest(F.d4)));
    set('pk',F.pk[0]<.1?'the second answer never reaches 10% (its peak is '+pc1(F.pk[0])+' near <i>T</i> = '+F.pk[1].toFixed(1)+')':'the second answer peaks at '+pc1(F.pk[0])+', at <i>T</i> = '+F.pk[1].toFixed(2)+', below 1');
    $('dkNote').innerHTML=note(p);
    $('dkPrompt').innerHTML='Prompt: <span class="mono">"'+RD.esc(p.text.replace(/\n/g,'\\n'))+'"</span> → next token'}
  function note(p){return 'Logits from <a href="'+L.url+'" target="_blank" rel="noopener noreferrer">'+L.model+'</a> (vocabulary '+L.vocab.toLocaleString('en-US')+'), plain-text prompt, float32 on CPU. The top 40 logits are exact; the other '+(L.vocab-40).toLocaleString('en-US')+' are kept as a histogram with '+L.bw+'-logit bins, which moves the softmax normaliser by at most '+p.err.toExponential(1)+' (measured for T from 0.25 to 10 in real_logits.py). At T = 1 the columns are the model\'s own probabilities by construction.'}
  // temperature drawn at step k, progress e (geometric between the steps' values)
  const TK=[1,1,1,2,4];
  function Tat(k,e){if(Tover!=null&&k>=1)return Tover;if(k===3)return Math.pow(2,e);if(k===4)return 2*Math.pow(2,e);return TK[k]}
  const X=i=>i<N?-3.7+i*1.05:-3.7+N*1.05+.3,ZL=1.1,ZG=-.45,ZP=-2.0,HP=2.0,W=.62;
  function draw(R,k,e){const P=R.P,p=PR[cur],T=Tat(k,e),d=dist(p,T),narrow=R.W<520;R.grid(-5,5,-2.6,2.4,.5);
    const zmax=p.top[0][1],KZ=1.25/zmax;
    // 1. the logits: white bars on a plinth at the back, z / T once the temperature changes
    const la=k===0?1:k===2?.35:.75;
    R.box([(X(0)+X(N-1))/2,0,ZL],[X(N-1)-X(0)+W+.3,.05,.62],{a:la,shadow:false});
    for(let i=0;i<N;i++){const z=p.top[i][1]/(k>=3||(Tover!=null&&k>=1)?T:1),h=Math.max(.02,z*KZ);
      R.box([X(i),.05,ZL],[W*.8,h,.4],{fill:P.paper,a:la});
      if(i<3||!narrow)R.label([X(i),.05+h,ZL],(z).toFixed(i<3?2:1),{mono:true,fs:12,dy:-10,c:P.mute,a:la*(i<3?1:.8)})}
    R.label([X(0)-1.0,.2,ZL],(k>=3||(Tover!=null&&k>=1))?'logits ÷ T':'logits z',{al:'right',dx:-6,mono:true,fs:12.5,b:1,c:P.ink,grp:'row',a:Math.max(.6,la)});
    for(let i=0;i<N;i++){if(narrow&&i>2)continue;const t=tok(p.top[i][0]);R.label([X(i),0,ZL+.32],t.length>9?t.slice(0,8)+'…':t,{fs:12.5,serif:true,b:i===0,dy:12+(narrow?i*15:(i%2)*15),c:P.ink})}
    if(k===0)R.label([X(N-1)+.45,.2,ZL],'+ '+NREST.toLocaleString('en-US')+' more',{al:'left',dx:6,dy:17,mono:true,fs:12,c:P.mute,a:e});
    // 2. the softmax as a glass plate between the rows; streams carry each logit through it
    const ga=k===0?0:k===1?Math.min(1,e*1.6):k===2?.35:.7;
    if(ga>0){R.glass([X(0)-.45,.05,ZG],[X(N-1)-X(0)+.9,0,0],[0,.6,0],{c:P.c1,a:ga*.8,nu:12,nv:2});
      R.label([X(0)-1.0,.35,ZG],'exp(z / T) / Σ',{al:'right',dx:-6,mono:true,fs:12.5,b:1,c:P.c1,grp:'row',a:ga})}
    if(k===1||k>=3){const fa=k===1?Math.min(1,e*1.5):.55;for(let i=0;i<N;i++){const q=d.top[i];if(q<.002&&i>2)continue;
      R.flowArc([X(i),.45,ZL-.25],[X(i),Math.max(.1,q*HP*.6),ZP+.25],.5,{c:P.c1,a:fa*(.35+.65*Math.min(1,q*4)),r:.045+.05*Math.min(1,q*2),n:3+Math.round(6*Math.min(1,q*2)),speed:1.2})}}
    // 3. the probabilities in front: blue for the soft target, grey for the tail, the hard label as an orange outline
    if(k>=1){const grow=k===1?e:1,sa=k===2?lerp(1,.22,e):1;
      R.box([(X(0)+X(N))/2,0,ZP],[X(N)-X(0)+W+.3,.05,.62],{a:1,shadow:false});
      for(let i=0;i<N;i++){const q=d.top[i],h=Math.max(.015,q*HP*grow);
        R.box([X(i),.05,ZP],[W,h,.42],{fill:mix(P.paper,P.c1,.8),a:sa});
        if((i<3&&q>=.0005)||(!narrow&&q>=.01))R.label([X(i),.05+h,ZP],pc(q),{mono:true,fs:12,b:i===0,dy:-10,c:P.c1,a:sa})}
      const rq=rest(d),rh=Math.max(.015,rq*HP*grow);R.box([X(N),.05,ZP],[W,rh,.42],{fill:mix(P.paper,P.mute,.55),a:sa});
      R.label([X(N),.05+rh,ZP],pc1(rq),{mono:true,fs:12,b:1,dy:-10,c:P.mute,a:sa});
      R.label([X(0)-1.0,.3,ZP],k===2?'hard label':'soft target at T = '+(T<1.995&&T>1.005?T.toFixed(2):T.toFixed(0)),{al:'right',dx:-6,mono:true,fs:12.5,b:1,c:k===2?P.c2:P.c1,grp:'row'});
      if(k===2){R.box([X(0),.05,ZP],[W+.08,HP*e,.5],{fill:P.c2,fa:.12,ec:P.c2,lw:2,a:1,shadow:false});
        R.label([X(0),.05+HP*e,ZP],'100%',{mono:true,fs:12.5,b:1,dy:-10,c:P.c2,a:e});
      }
      // token names under the front row, staggered so neighbours never touch
      R.label([X(N),0,ZP+.32],narrow?'the rest':'other '+NREST.toLocaleString('en-US'),{mono:true,fs:12,dy:16,c:P.mute})}
  }
  const full={cam:[.18,.7],bounds:[[-4.3,0,-2.4],[4.4,2.1,1.7]]};
  const st=S3.stage({id:'stg-dk',list:'sx-dk',fig:'Fig. 1 · real logits, softmax at a temperature',cam:full.cam,bounds:full.bounds,aspect:.52,dur:1700,hold:4800,draw,
    margin:w=>w<520?[18,10,30,10]:[22,30,44,170],
    view:k=>k===0?{cam:[.2,.42],bounds:[[-4.3,0,.4],[4.4,1.4,1.6]]}:full,
    onStep:k=>{Tover=null;sync(Tat(k,1))}});
  // the readout under the step list: the numbers at the temperature drawn
  function sync(T){$('dkT').value=Math.log2(T).toFixed(2);$('dkTv').textContent=T.toFixed(2);const p=PR[cur],d=dist(p,T),r21=Math.exp((p.top[1][1]-p.top[0][1])/T);
    $('dkO').innerHTML=RD.stat('Top token, '+RD.esc(tok(p.top[0][0])),pc1(d.top[0]),'hard label: 100%')+RD.stat('Every other token',pc1(1-d.top[0]),'what a hard label throws away')+
      RD.stat('Second / first',r21>=.01?r21.toFixed(3):r21.toExponential(1),'exp((z₂ − z₁) / T)')+RD.stat('Entropy',d.H.toFixed(2)+' bits','2^H = '+Math.pow(2,d.H).toFixed(1)+' tokens’ worth')}
  $('dkT').addEventListener('input',()=>{const v=Math.pow(2,+$('dkT').value);st.st.user=true;st.pause();if(st.st.k<1)st.go(1,false);Tover=v;sync(v);st.draw()});
  $('dkP').innerHTML=PR.map((p,i)=>'<button data-i="'+i+'"'+(i===0?' class="on"':'')+'>'+NAMES[p.k]+'</button>').join('');
  $('dkP').addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;cur=+b.dataset.i;[...$('dkP').children].forEach(x=>x.classList.toggle('on',x===b));writeList();st.list('sx-dk')});
  writeList();sync(1);
  window.DSL_DK={dist,facts,tok,pc1};
})();
