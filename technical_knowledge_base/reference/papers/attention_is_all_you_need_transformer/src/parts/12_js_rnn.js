// ---- Recurrent layer against one self-attention layer, the same sentence, animated (Table 1) ----
(function(){
  if(!$('rnx'))return;
  const S='the big red dog chased a small cat near the tree'.split(' '),n=S.length,D=512;
  const RS=[];for(let t=1;t<=n;t++)RS.push({t:t===1?'h<sub>1</sub> from the first word':'h'+sub(t)+' needs h'+sub(t-1),
    c:t===1?'The recurrent layer reads "'+S[0]+'" and computes h<sub>1</sub> = f(h<sub>0</sub>, x<sub>1</sub>): one matrix-vector product of '+fmt(D)+' × '+fmt(D)+' = '+fmt(D*D)+' multiply-adds. Nothing else can start: h<sub>2</sub> needs h<sub>1</sub>.'
      :'"'+S[t-1]+'": h'+sub(t)+' = f(h'+sub(t-1)+', x'+sub(t)+'). Step '+t+' of '+n+' has to wait for step '+(t-1)+', however many GPU cores are idle. A signal from "'+S[0]+'" has now passed through '+t+' steps to get here.'});
  RS.push({t:'Compare',c:'Eleven sequential steps for eleven words, and a path of '+n+' steps from the first word to the last state: Table 1\'s O(n) sequential operations and O(n) path length. Per layer it did n·d² = '+fmt(n*D*D)+' multiply-adds. Switch to Self-attention to run the same sentence.'});
  const AS=[{t:'All 11 words arrive at once',c:'Every word\'s embedding (plus its position) enters the layer together. Nothing waits on anything: this is the parallelism the paper is named for.'},
    {t:'Queries, keys and values for every word, in parallel',c:'Each word is projected to a query, a key and a value by the same three matrices, for all 11 words in one batched matrix multiply.'},
    {t:'Every word scores every word: 121 dot products at once',c:'Each query is compared with all 11 keys: n² = 121 dot products of length d, '+fmt(n*n*D)+' multiply-adds, all independent. Line strength is the real attention weight of the toy model\'s first encoder layer (heads averaged) on this sentence.'},
    {t:'Weighted sums: all 11 outputs in one step',c:'Each output is the attention-weighted sum of the values. One sequential step for the whole layer, and any word reaches any other in a single hop: Table 1\'s O(1) sequential operations and O(1) path length.'},
    {t:'Compare',c:'At n = 11 and d = 512 self-attention needs n²·d = '+fmt(n*n*D)+' multiply-adds against the recurrent layer\'s n·d² = '+fmt(n*D*D)+': '+(D/n).toFixed(1)+' times fewer, because n < d. The crossover is at n = d = 512 tokens; past it, self-attention\'s n² term is the one that grows, the cost later pages on this knowledge base spend their time attacking.'}];
  function sub(t){return '<sub>'+t+'</sub>'}
  let ATT=null;function att(){if(ATT)return ATT;try{const M=TM.load('full'),r=TM.translate(M,S);const a=r.enc[0];ATT=S.map((_,i)=>S.map((_,j)=>a.reduce((s,h)=>s+h[i][j],0)/a.length))}catch(e){ATT=S.map(()=>S.map(()=>1/n))}return ATT}
  function geo(w){const nar=w<560;if(!nar){const pad=8,p=(w-2*pad)/n;return {nar,W:w,H:206,pos:i=>pad+p*i+p/2,bw:p-6,bh:26,yIn:166,yOut:44,
      P:(s,dpt)=>[s,dpt]}}
    const p=30;return {nar,W:w,H:n*p+40,pos:i=>26+p*i,bw:Math.min(118,(w-90)/2),bh:24,yIn:Math.min(118,(w-90)/2)/2+6,yOut:w-Math.min(118,(w-90)/2)/2-6,P:(s,dpt)=>[dpt,s]}}
  const C1='var(--c1)',C2='var(--c2)';
  function box(g,s,dpt,txt,fill,stroke,op){txt=txt.replace(/^([hz])(\d+)$/,'$1<tspan font-size="11" dy="3">$2</tspan>');const [x,y]=g.P(s,dpt);const w=g.nar?g.bw:g.bw,h=g.bh;return G(op,rc(x-w/2,y-h/2,w,h,fill,{s:stroke})+tx(x,y+4,txt,{a:'middle',fs:11.5}))}
  function draw(m,k,e,w){const g=geo(w);let s='';const mid=(g.yIn+g.yOut)/2;
    // labels for the two rows
    if(!g.nar){s+=tx(4,g.yIn+g.bh/2+15,'input words',{fs:11,c:'var(--mute)'})+tx(4,g.yOut-g.bh/2-6,m==='rnn'?'hidden states h':'outputs z',{fs:11,c:'var(--mute)'})}
    else{s+=tx(g.yIn,12,'input words',{fs:11,c:'var(--mute)',a:'middle'})+tx(g.yOut,12,m==='rnn'?'hidden states h':'outputs z',{fs:11,c:'var(--mute)',a:'middle'})}
    const off=g.nar?16:0;const pos=i=>g.pos(i)+off;
    for(let i=0;i<n;i++)s+=box(g,pos(i),g.yIn,S[i],'var(--soft)','var(--line)',1);
    if(m==='rnn'){const done=k>=n?n:k+e*1;
      for(let i=0;i<n;i++){const on=i<Math.floor(done)||(i===k&&e>=.99);const cur=i===k&&k<n;
        const a=i<k||k>=n?1:i===k?e:0;
        // input arrow up
        const [x1,y1]=g.P(pos(i),g.yIn+(g.nar?g.bw/2:-g.bh/2)),[x2,y2]=g.P(pos(i),g.yOut+(g.nar?-g.bw/2:g.bh/2));
        s+=G(a,ln2(x1,y1,x1+(x2-x1)*1,y1+(y2-y1)*1,C2,{sw:1.4}));
        if(i>0){const [a1,b1]=g.P(pos(i-1)+(g.nar?g.bh/2:g.bw/2),g.yOut),[a2,b2]=g.P(pos(i)-(g.nar?g.bh/2:g.bw/2),g.yOut);s+=G(a,ln2(a1,b1,a2,b2,C2,{sw:2}))}
        s+=box(g,pos(i),g.yOut,'h'+(i+1),a>=.99?'var(--closed2)':'var(--bg)',cur?C2:'var(--line)',a>0?1:.35)}
      if(k>=n){// path from word 1 to the last state
        const [x0,y0]=g.P(pos(0),g.yIn),[x1,y1]=g.P(pos(0),g.yOut),[x2,y2]=g.P(pos(n-1),g.yOut);
        s+=G(e,'<polyline points="'+x0+','+y0+' '+x1+','+y1+' '+x2+','+y2+'" fill="none" stroke="var(--bad)" stroke-width="3" opacity=".55"/>')}
    }else{const A=att();
      const lit=k>=0?(k===0?e:1):0;
      if(k>=1){for(let i=0;i<n;i++){const [x,y]=g.P(pos(i),mid);s+=G(k===1?e:1,rc(x-(g.nar?28:Math.min(30,g.bw/2)),y-9,g.nar?56:Math.min(60,g.bw),18,'var(--acc2)',{s:'var(--acc)'})+tx(x,y+4,'q k v',{a:'middle',fs:11}))}}
      if(k>=2){const op=k===2?e:1;let l='';for(let i=0;i<n;i++)for(let j=0;j<n;j++){const [x1,y1]=g.P(pos(j),g.yIn+(g.nar?g.bw/2:-g.bh/2)),[x2,y2]=g.P(pos(i),g.yOut+(g.nar?-g.bw/2:g.bh/2));
        l+=ln2(x1,y1,x2,y2,C1,{sw:.4+3.2*A[i][j],op:Math.min(1,.06+1.6*A[i][j])})}s+=G(op,l)}
      for(let i=0;i<n;i++)s+=box(g,pos(i),g.yOut,'z'+(i+1),k>=3?'var(--acc2)':'var(--bg)',k>=3?C1:'var(--line)',k>=3?(k===3?Math.max(.35,e):1):.35);
      if(k>=4){const [x0,y0]=g.P(pos(0),g.yIn),[x2,y2]=g.P(pos(n-1),g.yOut);s+=G(e,ln2(x0,y0,x2,y2,'var(--good)',{sw:3.5,op:.7}))}}
    return svgW(g.W,g.H,s,(m==='rnn'?'Recurrent layer':'Self-attention layer')+', step '+(k+1))}
  function counters(m,k,e){if(m==='rnn'){const t=Math.min(n,k+(e>=.99||k>=n?1:0));
      return stat('Sequential steps so far',t+' of '+n,'each waits for the one before')+stat('Path from word 1 to the newest state',t?t+' steps':'0','grows with n: O(n)')+stat('Multiply-adds so far',fmt(t*D*D),'n·d², d = 512')+stat('Work that can run at once','1 position','d² = '+fmt(D*D)+' multiply-adds')}
    const t=k>=3?1:0;return stat('Sequential steps',t+' of 1','the whole layer at once')+stat('Path from word 1 to any output',k>=3?'1 step':'0','O(1)')+stat('Multiply-adds (attention scores)',fmt(k>=2?n*n*D:0),'n²·d, d = 512')+stat('Work that can run at once',k>=2?n*n+' dot products':k>=1?n*3+' projections':n+' words','all independent')}
  makeAnim({id:'rnx',modes:{sa:AS,rnn:RS},mode:'sa',draw,counters,dur:2600});
})();
