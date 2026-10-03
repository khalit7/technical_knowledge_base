// ---- Metric engine shared by every visual (checked against scikit-learn, sacrebleu, rouge-score and NLTK by check_core.mjs) ----
window.MX=(function(){
  // ---------- classification ----------
  const prob=(arr)=>arr.map(v=>1/(1+Math.exp(-v/1000)));
  function sst(rare){ // the SST-2 validation set; rare: keep every tenth positive (in file order) to make positives rare
    const S=EM.sst2,idx=[];let k=0;
    for(let i=0;i<S.y.length;i++){if(S.y[i]==='1'){if(!rare||(k++%10===0))idx.push(i)}else idx.push(i)}
    return idx;
  }
  function confusion(y,p,th){let tp=0,fp=0,tn=0,fn=0;for(let i=0;i<y.length;i++){const h=p[i]>=th;if(y[i]){h?tp++:fn++}else{h?fp++:tn++}}return {tp,fp,tn,fn}}
  function rates(c){const {tp,fp,tn,fn}=c,n=tp+fp+tn+fn,d=(a,b)=>b>0?a/b:0;
    const prec=d(tp,tp+fp),rec=d(tp,tp+fn),spec=d(tn,tn+fp),fpr=d(fp,fp+tn),acc=d(tp+tn,n),f1=d(2*prec*rec,prec+rec);
    const den=Math.sqrt((tp+fp)*(tp+fn)*(tn+fp)*(tn+fn)),mcc=den>0?(tp*tn-fp*fn)/den:0;
    return {n,acc,prec,rec,spec,fpr,f1,mcc,bacc:(rec+spec)/2,npv:d(tn,tn+fn)}}
  // ROC-AUC by ranks (ties count half), equal to the probability a random positive outscores a random negative
  function auc(y,p){const o=p.map((v,i)=>[v,y[i]]).sort((a,b)=>a[0]-b[0]);let r=1,sumPos=0,np=0,nn=0;
    for(let i=0;i<o.length;){let j=i;while(j<o.length&&o[j][0]===o[i][0])j++;const avg=(r+r+(j-i)-1)/2;for(let k=i;k<j;k++){if(o[k][1]){sumPos+=avg;np++}else nn++}r+=j-i;i=j}
    return np&&nn?(sumPos-np*(np+1)/2)/(np*nn):NaN}
  // curves over every distinct threshold (descending), plus average precision as scikit-learn computes it (step, no interpolation)
  function curves(y,p){const o=p.map((v,i)=>[v,y[i]]).sort((a,b)=>b[0]-a[0]);const P=y.reduce((a,b)=>a+b,0),N=y.length-P;
    let tp=0,fp=0,roc=[[0,0]],pr=[],ap=0,prevR=0;
    for(let i=0;i<o.length;){let j=i;while(j<o.length&&o[j][0]===o[i][0]){o[j][1]?tp++:fp++;j++}i=j;
      const rec=tp/P,prec=tp/(tp+fp);roc.push([fp/N,rec]);pr.push([rec,prec]);ap+=(rec-prevR)*prec;prevR=rec}
    return {roc,pr,ap,P,N}}
  const clip=v=>Math.min(1-1e-15,Math.max(1e-15,v));
  function brier(y,p){let s=0;for(let i=0;i<y.length;i++)s+=(p[i]-y[i])**2;return s/y.length}
  function logloss(y,p){let s=0;for(let i=0;i<y.length;i++){const q=clip(p[i]);s-=y[i]?Math.log(q):Math.log(1-q)}return s/y.length}
  // reliability: 10 equal-width bins on the predicted probability; ECE = sum over bins of (n_b / n) |mean p - fraction positive|
  function reliability(y,p,nb){nb=nb||10;const B=Array.from({length:nb},()=>({n:0,sp:0,sy:0}));
    for(let i=0;i<y.length;i++){const b=Math.min(nb-1,Math.floor(p[i]*nb));B[b].n++;B[b].sp+=p[i];B[b].sy+=y[i]}
    let ece=0;B.forEach(b=>{if(b.n){b.conf=b.sp/b.n;b.frac=b.sy/b.n;ece+=b.n/y.length*Math.abs(b.conf-b.frac)}});return {bins:B,ece}}
  // multi-class averages from a confusion matrix (rows true, columns predicted)
  function multi(cm){const K=cm.length,col=k=>cm.reduce((a,r)=>a+r[k],0),row=k=>cm[k].reduce((a,b)=>a+b,0),N=cm.reduce((a,r)=>a+r.reduce((x,y)=>x+y,0),0);
    const per=[];let TP=0;for(let k=0;k<K;k++){const tp=cm[k][k],pp=col(k),sup=row(k);TP+=tp;const p=pp?tp/pp:0,r=sup?tp/sup:0;per.push({tp,pp,sup,p,r,f:p+r?2*p*r/(p+r):0})}
    const mean=f=>per.reduce((a,c)=>a+c[f],0)/K,wmean=f=>per.reduce((a,c)=>a+c[f]*c.sup,0)/N;
    return {per,N,acc:TP/N,macro:{p:mean('p'),r:mean('r'),f:mean('f')},micro:{p:TP/N,r:TP/N,f:TP/N},weighted:{p:wmean('p'),r:wmean('r'),f:wmean('f')}}}
  // seeded generator (mulberry32) so the bootstrap is the same on every load
  function rng(seed){let a=seed>>>0;return ()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296}}
  const quant=(a,q)=>{const s=a.slice().sort((x,y)=>x-y),h=(s.length-1)*q,l=Math.floor(h);return s[l]+(s[Math.min(s.length-1,l+1)]-s[l])*(h-l)};

  // ---------- text ----------
  // sacrebleu's 13a tokenizer (mteval-v13a), as in sacrebleu 2.6 tokenizers/tokenizer_13a.py and tokenizer_re.py
  function tok13a(s){let l=s.replace(/<skipped>/g,'').replace(/-\n/g,'').replace(/\n/g,' ');
    if(l.indexOf('&')>=0)l=l.replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
    l=' '+l+' ';l=l.replace(/([\{-\~\[-\` -\&\(-\+\:-\@\/])/g,' $1 ').replace(/([^0-9])([\.,])/g,'$1 $2 ').replace(/([\.,])([^0-9])/g,' $1 $2').replace(/([0-9])(-)/g,'$1 $2 ');
    return l.split(/\s+/).filter(Boolean)}
  function ngrams(t,n){const m=new Map();for(let i=0;i+n<=t.length;i++){const k=t.slice(i,i+n).join('\u0001');m.set(k,(m.get(k)||0)+1)}return m}
  function overlap(a,b){let s=0;a.forEach((v,k)=>{if(b.has(k))s+=Math.min(v,b.get(k))});return s}
  // sentence BLEU as sacrebleu.sentence_bleu: exp smoothing (mteval method 3), effective order, brevity penalty
  function bleu(hyp,ref){const h=tok13a(hyp),r=tok13a(ref),correct=[],total=[];
    for(let n=1;n<=4;n++){const hn=ngrams(h,n),rn=ngrams(r,n);correct.push(overlap(hn,rn));total.push(Math.max(0,h.length-n+1))}
    const bp=h.length<r.length?(h.length>0?Math.exp(1-r.length/h.length):0):1,prec=[0,0,0,0];
    if(!correct.some(v=>v>0))return {score:0,prec,bp,correct,total,h,r};
    let sm=1,eff=4;for(let n=1;n<=4;n++){if(total[n-1]===0)break;eff=n;
      if(correct[n-1]===0){sm*=2;prec[n-1]=100/(sm*total[n-1])}else prec[n-1]=100*correct[n-1]/total[n-1]}
    const lg=v=>v>0?Math.log(v):-9999999999;let s=0;for(let n=0;n<eff;n++)s+=lg(prec[n]);
    return {score:bp*Math.exp(s/eff),prec,bp,correct,total,eff,h,r}}
  // rouge-score tokenizer: lower case, non-alphanumerics to spaces, no stemming (the library default)
  const rtok=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,' ').split(/\s+/).filter(w=>/^[a-z0-9]+$/.test(w));
  const prf=(m,nh,nr)=>{const p=nh?m/nh:0,r=nr?m/nr:0;return {p,r,f:p+r>0?2*p*r/(p+r):0,m}};
  function rougeN(hyp,ref,n){const h=rtok(hyp),r=rtok(ref),hn=ngrams(h,n),rn=ngrams(r,n);return prf(overlap(hn,rn),Math.max(0,h.length-n+1),Math.max(0,r.length-n+1))}
  function lcsTable(a,b){const T=Array.from({length:a.length+1},()=>new Array(b.length+1).fill(0));
    for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)T[i][j]=a[i-1]===b[j-1]?T[i-1][j-1]+1:Math.max(T[i-1][j],T[i][j-1]);return T}
  function lcsPairs(a,b){const T=lcsTable(a,b),pairs=[];let i=a.length,j=b.length;
    while(i>0&&j>0){if(a[i-1]===b[j-1]){pairs.unshift([i-1,j-1]);i--;j--}else if(T[i-1][j]>=T[i][j-1])i--;else j--}return pairs}
  function rougeL(hyp,ref){const h=rtok(hyp),r=rtok(ref);if(!h.length||!r.length)return Object.assign(prf(0,0,0),{ht:h,rt:r,pairs:[]});
    const pairs=lcsPairs(h,r);return Object.assign(prf(pairs.length,h.length,r.length),{ht:h,rt:r,pairs})}
  // ROUGE-S*: skip-bigrams with any gap (Lin 2004 section 5); implemented from the paper, no library to check against
  function rougeS(hyp,ref){const sk=t=>{const m=new Map();for(let i=0;i<t.length;i++)for(let j=i+1;j<t.length;j++){const k=t[i]+'\u0001'+t[j];m.set(k,(m.get(k)||0)+1)}return m};
    const h=rtok(hyp),r=rtok(ref),c2=n=>n*(n-1)/2;return prf(overlap(sk(h),sk(r)),c2(h.length),c2(r.length))}
  // Porter stemmer, Martin Porter's published version (NLTK mode MARTIN_EXTENSIONS)
  const stem=(function(){const s2={ational:'ate',tional:'tion',enci:'ence',anci:'ance',izer:'ize',bli:'ble',alli:'al',entli:'ent',eli:'e',ousli:'ous',ization:'ize',ation:'ate',ator:'ate',alism:'al',iveness:'ive',fulness:'ful',ousness:'ous',aliti:'al',iviti:'ive',biliti:'ble',logi:'log'},
      s3={icate:'ic',ative:'',alize:'al',iciti:'ic',ical:'ic',ful:'',ness:''},c='[^aeiou]',v='[aeiouy]',C=c+'[^aeiouy]*',V=v+'[aeiou]*',
      mgr0=new RegExp('^('+C+')?'+V+C),meq1=new RegExp('^('+C+')?'+V+C+'('+V+')?$'),mgr1=new RegExp('^('+C+')?'+V+C+V+C),sv=new RegExp('^('+C+')?'+v),cvc=new RegExp('^'+C+v+'[^aeiouwxy]$');
    return function(w){if(w.length<3)return w;let fp,st;const y0=w[0]==='y';if(y0)w='Y'+w.slice(1);
      if(/^(.+?)(ss|i)es$/.test(w))w=w.replace(/^(.+?)(ss|i)es$/,'$1$2');else if(/^(.+?)([^s])s$/.test(w))w=w.replace(/^(.+?)([^s])s$/,'$1$2');
      if((fp=/^(.+?)eed$/.exec(w))){if(mgr0.test(fp[1]))w=w.slice(0,-1)}
      else if((fp=/^(.+?)(ed|ing)$/.exec(w))){st=fp[1];if(sv.test(st)){w=st;if(/(at|bl|iz)$/.test(w))w+='e';else if(/([^aeiouylsz])\1$/.test(w))w=w.slice(0,-1);else if(cvc.test(w))w+='e'}}
      if((fp=/^(.+?)y$/.exec(w))){st=fp[1];if(sv.test(st))w=st+'i'}
      if((fp=/^(.+?)(ational|tional|enci|anci|izer|bli|alli|entli|eli|ousli|ization|ation|ator|alism|iveness|fulness|ousness|aliti|iviti|biliti|logi)$/.exec(w))){if(mgr0.test(fp[1]))w=fp[1]+s2[fp[2]]}
      if((fp=/^(.+?)(icate|ative|alize|iciti|ical|ful|ness)$/.exec(w))){if(mgr0.test(fp[1]))w=fp[1]+s3[fp[2]]}
      if((fp=/^(.+?)(al|ance|ence|er|ic|able|ible|ant|ement|ment|ent|ou|ism|ate|iti|ous|ive|ize)$/.exec(w))){if(mgr1.test(fp[1]))w=fp[1]}
      else if((fp=/^(.+?)(s|t)(ion)$/.exec(w))){st=fp[1]+fp[2];if(mgr1.test(st))w=st}
      if((fp=/^(.+?)e$/.exec(w))){st=fp[1];if(mgr1.test(st)||(meq1.test(st)&&!cvc.test(st)))w=st}
      if(/ll$/.test(w)&&mgr1.test(w))w=w.slice(0,-1);
      if(y0)w='y'+w.slice(1);return w}})();
  // METEOR as NLTK 3.10 single_meteor_score: 13a tokens lower-cased, exact then Porter-stem stages (WordNet stage left out),
  // each stage matching every hypothesis word, last to first, to the last unused reference word that is equal
  function meteor(hyp,ref,o){o=o||{};const al=o.alpha==null?0.9:o.alpha,be=o.beta==null?3:o.beta,ga=o.gamma==null?0.5:o.gamma;
    const H=tok13a(hyp).map(w=>w.toLowerCase()),R=tok13a(ref).map(w=>w.toLowerCase());
    let eh=H.map((w,i)=>[i,w]),er=R.map((w,i)=>[i,w]);const matches=[];
    function stage(f,tag){const hh=eh.map(([i,w])=>[i,f(w)]),rr=er.map(([i,w])=>[i,f(w)]);const pos=new Map();rr.forEach(([,w],j)=>{if(!pos.has(w))pos.set(w,[]);pos.get(w).push(j)});
      const mh=new Set(),mr=new Set();for(let i=hh.length-1;i>=0;i--){const L=pos.get(hh[i][1]);if(L&&L.length){const j=L.pop();mh.add(i);mr.add(j);matches.push([hh[i][0],rr[j][0],tag])}}
      eh=eh.filter((_,i)=>!mh.has(i));er=er.filter((_,j)=>!mr.has(j))}
    stage(w=>w,'exact');stage(stem,'stem');matches.sort((a,b)=>a[0]-b[0]);
    const m=matches.length;let chunks=1;for(let i=0;i<m-1;i++)if(!(matches[i+1][0]===matches[i][0]+1&&matches[i+1][1]===matches[i][1]+1))chunks++;
    if(!m||!H.length||!R.length)return {score:0,m:0,chunks:0,P:0,rec:0,fmean:0,pen:0,H,R,matches};
    const P=m/H.length,Rc=m/R.length,fmean=P*Rc/(al*P+(1-al)*Rc),pen=ga*Math.pow(chunks/m,be);
    return {score:(1-pen)*fmean,m,chunks,P,rec:Rc,fmean,pen,H,R,matches}}
  // chrF as sacrebleu.sentence_chrf: character 1- to 6-grams with whitespace removed, precision and recall averaged over orders, F-beta with beta 2
  function chrf(hyp,ref,beta){beta=beta||2;const h=hyp.split(/\s+/).join(''),r=ref.split(/\s+/).join('');const per=[];let ap=0,ar=0,eff=0;
    for(let n=1;n<=6;n++){const cg=s=>{const m=new Map();for(let i=0;i+n<=s.length;i++){const k=s.substr(i,n);m.set(k,(m.get(k)||0)+1)}return m};
      const hn=cg(h),rn=cg(r),nh=Math.max(0,h.length-n+1),nr=Math.max(0,r.length-n+1),m=overlap(hn,rn),p=nh>0?m/nh:1e-16,rc=nr>0?m/nr:1e-16;
      per.push({n,m,nh,nr,p,r:rc});if(nh>0&&nr>0){ap+=p;ar+=rc;eff++}}
    if(eff){ap/=eff;ar/=eff}else{ap=ar=0}const f=beta*beta;const score=ap+ar?100*(1+f)*ap*ar/(f*ap+ar):0;return {score,per,ap,ar}}
  // BERTScore greedy matching on a precomputed similarity matrix (rows candidate tokens, columns reference tokens, both with <s> and </s>):
  // special tokens get zero weight but stay available as matches, as in bert-score 0.3.12
  function bertscore(sim){const nc=sim.length,nr=sim[0].length;const bestR=[],bestC=[];let P=0,R=0;
    for(let i=1;i<nc-1;i++){let b=0;for(let j=1;j<nr;j++)if(sim[i][j]>sim[i][b])b=j;bestR.push([i,b]);P+=sim[i][b]}
    for(let j=1;j<nr-1;j++){let b=0;for(let i=1;i<nc;i++)if(sim[i][j]>sim[b][j])b=i;bestC.push([b,j]);R+=sim[b][j]}
    P/=nc-2;R/=nr-2;return {P,R,F:2*P*R/(P+R),bestR,bestC}}
  const rescale=(v,b)=>(v-b)/(1-b);
  return {prob,sst,confusion,rates,auc,curves,brier,logloss,reliability,multi,rng,quant,tok13a,bleu,rtok,rougeN,rougeL,rougeS,stem,meteor,chrf,bertscore,rescale,lcsPairs};
})();
