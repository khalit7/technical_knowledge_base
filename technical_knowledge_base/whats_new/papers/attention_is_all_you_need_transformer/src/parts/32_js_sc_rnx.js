// ---- Scene: a recurrent layer against one self-attention layer, the same 11-word sentence (Table 1), before/after in 3D ----
(function(){
  if(!$('stg-rnx'))return;const {at,lerp,lerp3,mix}=S3;
  const S='the big red dog chased a small cat near the tree'.split(' '),n=S.length,D=512;
  const sub=t=>'<sub>'+t+'</sub>';
  const RS=[];for(let t=1;t<=n;t++)RS.push({t:t===1?'h<sub>1</sub> from the first word':'h'+sub(t)+' needs h'+sub(t-1),
    c:t===1?'The recurrent layer reads "'+S[0]+'" and computes h<sub>1</sub> = f(h<sub>0</sub>, x<sub>1</sub>): one matrix-vector product of '+fmt(D)+' × '+fmt(D)+' = '+fmt(D*D)+' multiply-adds. Nothing else can start: h<sub>2</sub> needs h<sub>1</sub>.'
      :'"'+S[t-1]+'": h'+sub(t)+' = f(h'+sub(t-1)+', x'+sub(t)+'). Step '+t+' of '+n+' has to wait for step '+(t-1)+', however many GPU cores are idle. A signal from "'+S[0]+'" has now passed through '+t+' steps to get here.'});
  RS.push({t:'Compare',c:'Eleven sequential steps for eleven words, and a path of '+n+' steps from the first word to the last state (the red line): Table 1\'s O(n) sequential operations and O(n) path length. Per layer it did n·d² = '+fmt(n*D*D)+' multiply-adds. Switch to Self-attention to run the same sentence.'});
  const AS=[{t:'All 11 words arrive at once',c:'Every word\'s embedding (plus its position) enters the layer together. Nothing waits on anything: this is the parallelism the paper is named for.'},
    {t:'Queries, keys and values for every word, in parallel',c:'Each word is projected to a <span class="s3q">query</span>, a <span class="s3k">key</span> and a <span class="s3v">value</span> by the same three matrices, for all 11 words in one batched matrix multiply.'},
    {t:'Every word scores every word: 121 dot products at once',c:'Each query is compared with all 11 keys: n² = 121 dot products of length d, '+fmt(n*n*D)+' multiply-adds, all independent. Line strength is the real attention weight of the toy model\'s first encoder layer (heads averaged) on this sentence.'},
    {t:'Weighted sums: all 11 outputs in one step',c:'Each output is the attention-weighted sum of the values. One sequential step for the whole layer, and any word reaches any other in a single hop: Table 1\'s O(1) sequential operations and O(1) path length.'},
    {t:'Compare',c:'At n = 11 and d = 512 self-attention needs n²·d = '+fmt(n*n*D)+' multiply-adds against the recurrent layer\'s n·d² = '+fmt(n*D*D)+': '+(D/n).toFixed(1)+' times fewer, because n < d. The crossover is at n = d = 512 tokens; past it, self-attention\'s n² term is the one that grows, the cost later pages on this knowledge base spend their time attacking. The green line is the single hop from the first word to the last output.'}];
  const li=x=>'<li><b>'+x.t+'.</b> '+x.c+'</li>';
  $('sx-sa').innerHTML=AS.map(li).join('');$('sx-rnn').innerHTML=RS.map(li).join('');
  let ATT=null;function att(){if(ATT)return ATT;try{const M=TM.load('full'),r=TM.translate(M,S);const a=r.enc[0];ATT=S.map((_,i)=>S.map((_,j)=>a.reduce((s,h)=>s+h[i][j],0)/a.length))}catch(e){ATT=S.map(()=>S.map(()=>1/n))}return ATT}
  const X=i=>(i-(n-1)/2)*1.05,ZI=2,ZO=-2,YO=1.1;
  let mode='sa';
  function words(R,k,e,rise){const P=R.P,nar=R.W<620;S.forEach((w,i)=>{const y=rise?lerp(-.5,0,rise):0;R.box([X(i),y,ZI],[.78,.42,.78],{a:rise==null?1:Math.max(.05,rise)});
    R.label([X(i),0,ZI+.4],w,{serif:true,fs:12.5,dy:nar&&i%2?26:13})});R.label([X(0)-.5,.2,ZI],'input words',{al:'right',dx:-8,mono:true,fs:12,c:P.mute})}
  function draw(R,k,e){const P=R.P;R.grid(-6.5,6.5,-3,3,.5);
    if(mode==='rnn'){words(R,k,e);R.label([X(0)-.5,YO+.2,ZO],'hidden states h',{al:'right',dx:-8,mono:true,fs:12,c:P.mute});
      for(let i=0;i<n;i++){const a=k>=n||i<k?1:i===k?e:0;const cur=i===k&&k<n;
        R.box([X(i),YO,ZO],[.78,.42,.78],{fill:a>=.99?mix(P.paper,P.c2,cur?.55:.28):P.paper,a:a>0?Math.max(.25,a):.18});
        if(a>0){R.label([X(i),YO+.42,ZO],'h'+(i+1),{mono:true,fs:12,dy:-10,a,c:cur?P.c2:P.ink});
          const t=i<k||k>=n?1:e;R.line([[X(i),.42,ZI-.39],lerp3([X(i),.42,ZI-.39],[X(i),YO,ZO+.39],t)],{c:P.c2,w:1.6,a:.8,head:t>.3?6:0});
          if(i>0)R.line([[X(i-1)+.39,YO+.21,ZO],lerp3([X(i-1)+.39,YO+.21,ZO],[X(i)-.39,YO+.21,ZO],t)],{c:P.c2,w:2.4,head:6})}}
      if(k<n){const p0=k>0?[X(k-1),YO+.75,ZO]:[X(0)-1,YO+.75,ZO],p1=[X(k),YO+.75,ZO];const p=lerp3(p0,p1,e);R.glow(p,.75,{c:P.c2,top:1});R.ball(p,.12,{c:P.c2,top:1});R.label(p,'hidden state',{mono:true,fs:12,dy:-22,c:P.c2})}
      if(k>=n){const pts=[[X(0),.42,ZI]];for(let i=0;i<n;i++)pts.push([X(i),YO+.45,ZO]);R.line(pts.slice(0,1+Math.max(1,Math.round(e*n))),{c:P.bad,w:3.2,a:.85,top:1})}
    }else{const A=att();words(R,k,e,k===0?e:1);R.label([X(0)-.5,YO+.2,ZO],'outputs z',{al:'right',dx:-8,mono:true,fs:12,c:P.mute});
      if(k>=1){const a=at(k,e,1);S.forEach((_,i)=>{['q','k','v'].forEach((r,j)=>R.box([X(i)-.24+j*.24,.42+a*.02,ZI],[.18,.22*a,.18],{fill:P[r],a,edge:false}))})}
      if(k>=2){const a=at(k,e,2);for(let i=0;i<n;i++)for(let j=0;j<n;j++){const w=A[i][j];R.line([[X(j),.66,ZI],[X(i),YO,ZO+.39]],{c:P.c1,w:.5+4*w,a:a*Math.min(.9,.05+1.8*w)})}}
      for(let i=0;i<n;i++){const on=at(k,e,3);R.box([X(i),YO,ZO],[.78,.42,.78],{fill:on>0?mix(P.paper,P.c1,.45*on):P.paper,a:k>=3?Math.max(.3,on):.25});if(k>=3)R.label([X(i),YO+.42,ZO],'z'+(i+1),{mono:true,fs:12,dy:-10,a:on})}
      if(k>=4){R.line([[X(0),.42,ZI],[X(n-1),YO+.42,ZO]],{c:P.good,w:3.5,a:e*.9,top:1})}}
  }
  function counters(k){if(mode==='rnn'){const t=Math.min(n,k+1);
      return stat('Sequential steps so far',t+' of '+n,'each waits for the one before')+stat('Path from word 1 to the newest state',t+' steps','grows with n: O(n)')+stat('Multiply-adds so far',fmt(t*D*D),'n·d², d = 512')+stat('Work that can run at once','1 position','d² = '+fmt(D*D)+' multiply-adds')}
    const t=k>=3?1:0;return stat('Sequential steps',t+' of 1','the whole layer at once')+stat('Path from word 1 to any output',k>=3?'1 step':'0','O(1)')+stat('Multiply-adds (attention scores)',fmt(k>=2?n*n*D:0),'n²·d, d = 512')+stat('Work that can run at once',k>=2?n*n+' dot products':k>=1?n*3+' projections':n+' words','all independent')}
  const st=S3.stage({id:'stg-rnx',list:'sx-sa',fig:'Fig. 2 · one layer, two ways to read a sentence',cam:[.3,.82],bounds:[[-6.2,-.2,-2.6],[6.2,2,2.8]],draw,dur:1100,hold:2300,aspect:.68,
    onStep:k=>{$('rnxCnt').innerHTML=counters(k)}});
  segBind('rnxM',m=>{mode=m;$('rnxM').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m));$('sx-sa').hidden=m!=='sa';$('sx-rnn').hidden=m!=='rnn';st.list(m==='sa'?'sx-sa':'sx-rnn')});
})();
