// ---- Hero: one encoder, pretrained once with two losses, then copied and fine-tuned per task (after the paper's Figure 1) ----
(function(){const el=$('heroFig');if(!el)return;
  const cw=t=>t.length*6.6+10; // token box width at 11.5 px
  function row(x0,y,toks,maxW){let x=x0,s='',pos=[];const tw=toks.reduce((q,[t])=>q+t.length*6.3,0),g=maxW<420?3:4,pad=Math.max(4,Math.min(10,(maxW-tw-g*(toks.length-1)-2)/toks.length));toks.forEach(([t,k])=>{const w=t.length*6.3+pad;const f=k==='m'?'var(--hl)':k==='b'?'var(--open2)':k==='s'?'var(--soft)':'var(--acc2)';
    s+=rc(x,y,w,22,f,{s:k==='m'?'var(--bad)':'var(--line)'})+tx(x+w/2,y+15,t,{fs:11.5,a:'middle',w:k==='m'?600:null});pos.push(x+w/2);x+=w+g});return {s,pos,end:x}}
  function panel(x0,pw,title,toks,heads,note){let s=tx(x0,14,title,{fs:12.5,w:600});
    const r=row(x0,152,toks,pw),ew=Math.max(r.end-x0-4,pw*.6);
    s+=rc(x0,92,ew,38,'var(--soft)',{s:'var(--ink)'})+tx(x0+ew/2,110,'BERT encoder',{fs:12,a:'middle',w:600})+tx(x0+ew/2,124,'every layer attends both ways',{fs:11,a:'middle',c:'var(--mute)'});
    s+=r.s;r.pos.forEach(px=>s+=ln2(px,150,px,132,'var(--line)'));
    heads.forEach(([i,j,lab,col])=>{const a=r.pos[i],b=r.pos[j],m=(a+b)/2;s+=ln2(a,90,a,62,col,{sw:1.6})+(j!==i?ln2(b,90,b,62,col,{sw:1.6})+ln2(a,62,b,62,col,{sw:1.6}):'');
      s+=tx(Math.min(Math.max(m,x0+lab.length*3.3),x0+pw-lab.length*3.3),54,lab,{fs:11,a:'middle',c:col,w:600})});
    s+=tx(x0,192,note,{fs:11,c:'var(--mute)'});return s}
  fit(el,w=>{const wide=w>=700,pw=wide?(w-30)/2:w,H=wide?204:420;let s='';
    const T1=[['[CLS]','s'],['my','a'],['dog','a'],['is','a'],['[MASK]','m'],['[SEP]','s'],['he','b'],['barks','b'],['[SEP]','s']];
    const T2=[['[CLS]','s'],['who','a'],['barks','a'],['[SEP]','s'],['my','b'],['dog','b'],['does','b'],['[SEP]','s']];
    s+=panel(0,pw,'1. Pre-train once, on unlabelled text',T1,[[0,0,'NSP: IsNext?','var(--closed)'],[4,4,'MLM: "cute"?','var(--bad)']],'15% of tokens chosen; sentence B real or random');
    const x2=wide?pw+30:0,y2=wide?0:216;
    s+='<g transform="translate('+x2+','+y2+')">'+panel(0,pw,'2. Copy, add one output layer, fine-tune all',T2,[[0,0,'label from C','var(--closed)'],[4,5,'answer span: start, end','var(--open)']],'a fresh copy per task; NER tags each token')+'</g>';
    if(wide)s+=tx(pw+15,112,'→',{fs:18,a:'middle',c:'var(--mute)'});
    el.innerHTML=svgW(w,H,s,'BERT: one encoder pretrained with masked LM and next sentence prediction, then fine-tuned per task with one output layer')})})();

// ---- Results at a glance: previous best against BERT-Large on each headline benchmark (numbers from §4 and Tables 2, 3, 4, 7) ----
(function(){const el=$('resFig');if(!el)return;
  const D=[['GLUE score (leaderboard)','GPT',72.8,80.5],['SQuAD v1.1 test F1','nlnet ens.',91.7,93.2],['SQuAD v2.0 test F1','MIR-MRC',78.0,83.1],['SWAG test accuracy','GPT',78.0,86.3],['CoNLL-2003 NER test F1','CSE',93.1,92.8]];
  fit(el,w=>{const pl=4,pr=10,X=v=>pl+(w-pl-pr)*(v-70)/(95-70),rh=44;let s='',y=4;
    [70,75,80,85,90,95].forEach(v=>{s+=ln2(X(v),4,X(v),8+D.length*rh,'var(--line)')+tx(Math.min(Math.max(X(v),8),w-10),22+D.length*rh,v,{fs:11,a:'middle',c:'var(--mute)'})});
    D.forEach(([n,pn,a,b])=>{const up=b>=a,yy=y+30,c=up?'var(--acc)':'var(--bad)';
      s+=tx(pl,y+14,n+': ',{fs:11.5,w:600})+tx(w-pr,y+14,pn+' '+a.toFixed(1)+' \u2192 BERT '+b.toFixed(1),{fs:11.5,a:'end',c:up?'var(--ink)':'var(--bad)'});
      s+=ln2(X(a),yy,X(b),yy,c,{sw:2.5})+'<circle cx="'+X(a)+'" cy="'+yy+'" r="5" fill="var(--dim)"/>'+'<circle cx="'+X(b)+'" cy="'+yy+'" r="5.5" fill="'+c+'"/>';y+=rh});
    el.innerHTML=svgW(w,30+D.length*44,s,'Previous best against BERT-Large on five benchmarks')})})();
