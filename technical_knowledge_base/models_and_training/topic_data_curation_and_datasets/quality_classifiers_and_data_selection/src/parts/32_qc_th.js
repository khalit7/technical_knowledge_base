// Threshold explorer (t-qcth): keep the top k% of run0 by a classifier; hand-label precision/recall, overlap, annotation P/R
(function(){
  const T=window.QC&&window.QC.th; if(!T)return;
  const $=id=>document.getElementById(id), esc=RD.esc, pc=x=>(x*100).toFixed(x<0.1&&x>0?1:0)+'%';
  const sel=$('th-mod'), K=$('th-k');
  sel.innerHTML=T.models.map(m=>'<option value="'+m.key+'">'+esc(m.label)+'</option>').join('');
  const N=T.n, totW=T.words.reduce((a,b)=>a+b,0);
  const labs=T.lab.filter(l=>l.src==='random'), nYes=labs.filter(l=>l.keep==='y').length;
  function keptSet(key,k){const r=T.rank[key],c=Math.round(k*N),s=new Uint8Array(N);for(let i=0;i<N;i++)if(r[i]<c)s[i]=1;return s}
  function prec(key,k){const s=keptSet(key,k);let kl=0,ky=0,kn=0,yk=0;labs.forEach(l=>{if(s[l.i]){kl++;if(l.keep==='y')ky++;if(l.keep==='n')kn++}if(l.keep==='y'&&s[l.i])yk++});
    return {kl,ky,kn,p:kl?ky/kl:NaN,no:kl?kn/kl:NaN,r:nYes?yk/nYes:NaN}}
  function model(){return T.models.find(m=>m.key===sel.value)}
  function plot(){
    const el=$('th-plot'),m=model(),W=Math.min(RD.width(el),760),H=220,L=40,R=12,Tp=14,B=34,iw=W-L-R,ih=H-Tp-B;
    const x=k=>L+(k-0.01)/0.59*iw,y=v=>Tp+ih-v*ih;
    let g='<rect x="'+L+'" y="'+Tp+'" width="'+iw+'" height="'+ih+'" fill="none" stroke="var(--line)"/>';
    [0,0.25,0.5,0.75,1].forEach(v=>{g+='<line x1="'+L+'" x2="'+(L+iw)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/>'+RD.t(L-5,y(v)+4,(v*100)+'%',{a:'end',fs:10.5})});
    [1,10,20,30,40,50,60].forEach(v=>g+=RD.t(x(v/100),H-B+14,v+'%',{a:v===60?'end':'middle',fs:10.5}));
    let pP=[],pR=[];for(let k=1;k<=60;k++){const q=prec(m.key,k/100);if(!isNaN(q.p))pP.push(x(k/100).toFixed(1)+','+y(q.p).toFixed(1));pR.push(x(k/100).toFixed(1)+','+y(q.r).toFixed(1))}
    g+='<polyline fill="none" stroke="var(--good)" stroke-width="2" points="'+pP.join(' ')+'"/><polyline fill="none" stroke="var(--c4)" stroke-width="2" points="'+pR.join(' ')+'"/>';
    // base rate
    const base=nYes/labs.length;g+='<line x1="'+L+'" x2="'+(L+iw)+'" y1="'+y(base)+'" y2="'+y(base)+'" stroke="var(--mute)" stroke-dasharray="4 3"/>'+RD.t(L+iw-4,y(base)-4,'yes in the whole sample '+pc(base),{a:'end',fs:10.5,fill:'var(--mute)'});
    const k=+K.value/100;g+='<line x1="'+x(k)+'" x2="'+x(k)+'" y1="'+Tp+'" y2="'+(Tp+ih)+'" stroke="var(--ink)"/>';
    if(m.pub_keep&&m.pub_keep<=0.6)g+='<line x1="'+x(m.pub_keep)+'" x2="'+x(m.pub_keep)+'" y1="'+Tp+'" y2="'+(Tp+ih)+'" stroke="var(--bad)" stroke-dasharray="3 3"/>'+RD.t(x(m.pub_keep)+3,Tp+ih-6,'published cut',{fs:10.5,fill:'var(--bad)'});
    g+=RD.t(L+iw-120,Tp+14,'precision',{fs:11,fill:'var(--good)',w:600})+RD.t(L+iw-50,Tp+14,'recall',{fs:11,fill:'var(--c4)',w:600})+RD.t(L+iw/2,H-4,'keep the top share of run0',{a:'middle',fs:11});
    el.innerHTML=RD.svg(W,H,g,'Precision and recall against hand labels as the keep rate changes');
  }
  function render(){
    const m=model(),k=+K.value/100;$('th-kv').textContent=K.value+'%';
    $('th-desc').innerHTML=m.desc;
    const s=keptSet(m.key,k);let n=0,w=0;for(let i=0;i<N;i++)if(s[i]){n++;w+=T.words[i]}
    const q=prec(m.key,k);
    $('th-out').innerHTML=RD.stat('Documents kept',n.toLocaleString('en-GB'),'of '+N.toLocaleString('en-GB'))+RD.stat('Words kept',pc(w/totW),'longer pages weigh more')+
      RD.stat('Precision (hand labels)',isNaN(q.p)?'n/a':pc(q.p),q.kl+' labelled docs kept, '+q.kn+' judged not worth it')+RD.stat('Recall of "yes" docs',pc(q.r),'of '+nYes+' in the random sample')+
      RD.stat('Published cut keeps',m.pub_keep?pc(m.pub_keep):'n/a',m.pub_desc||'');
    // overlap
    const c=Math.round(k*N),rnd=k/(2-k);
    $('th-ovl').innerHTML=T.models.filter(o=>o.key!==m.key).map(o=>{const t=keptSet(o.key,k);let a=0,u=0;for(let i=0;i<N;i++){if(s[i]&&t[i])a++;if(s[i]||t[i])u++}const j=u?a/u:0;
      return '<div><span>'+esc(o.label)+'</span><span class="tr"><span style="width:'+(j*100).toFixed(1)+'%"></span><i style="left:'+(rnd*100).toFixed(1)+'%"></i></span><span class="v">'+pc(j)+'</span></div>'}).join('');
    const a=m.annot;
    $('th-annot').innerHTML=a?(()=>{let bi=0;a.rates.forEach((r,i)=>{if(Math.abs(r-k)<Math.abs(a.rates[bi]-k))bi=i});
      return RD.stat('AUC vs Llama score ≥ 3',a.auc.toFixed(3),'1.0 = perfect ranking, 0.5 = chance')+RD.stat('Precision at top '+pc(a.rates[bi]),pc(a.prec[bi]),'Llama ≥ 3 among kept (base rate '+pc(a.base)+')')+RD.stat('Recall at top '+pc(a.rates[bi]),pc(a.rec[bi]),'of all Llama ≥ 3 pages')})():RD.stat('Not scored','n/a','this classifier was not run on the annotation pages ('+esc(m.why_no_annot||'an encoder; not run on all rows here')+')');
    plot();
  }
  sel.addEventListener('change',render);K.addEventListener('input',render);
  $('th-pub').addEventListener('click',()=>{const m=model();if(m.pub_keep){K.value=Math.max(1,Math.min(60,Math.round(m.pub_keep*100)));render()}});
  RD.onTab('t-qcth',render);RD.onResize(render,'t-qcth');
  render();
})();
