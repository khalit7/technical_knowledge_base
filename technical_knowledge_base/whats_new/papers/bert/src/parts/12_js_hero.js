// ---- Results at a glance: previous best against BERT-Large on each headline benchmark (numbers from §4 and Tables 2, 3, 4, 7) ----
(function(){const el=$('resFig');if(!el)return;
  const D=[['GLUE score (leaderboard)','GPT',72.8,80.5],['SQuAD v1.1 test F1','nlnet ens.',91.7,93.2],['SQuAD v2.0 test F1','MIR-MRC',78.0,83.1],['SWAG test accuracy','GPT',78.0,86.3],['CoNLL-2003 NER test F1','CSE',93.1,92.8]];
  fit(el,w=>{const pl=4,pr=10,X=v=>pl+(w-pl-pr)*(v-70)/(95-70),rh=44;let s='',y=4;
    [70,75,80,85,90,95].forEach(v=>{s+=ln2(X(v),4,X(v),8+D.length*rh,'var(--line)')+tx(Math.min(Math.max(X(v),8),w-10),22+D.length*rh,v,{fs:11,a:'middle',c:'var(--mute)'})});
    D.forEach(([n,pn,a,b])=>{const up=b>=a,yy=y+30,c=up?'var(--acc)':'var(--bad)';
      s+=tx(pl,y+14,n+': ',{fs:11.5,w:600})+tx(w-pr,y+14,pn+' '+a.toFixed(1)+' \u2192 BERT '+b.toFixed(1),{fs:11.5,a:'end',c:up?'var(--ink)':'var(--bad)'});
      s+=ln2(X(a),yy,X(b),yy,c,{sw:2.5})+'<circle cx="'+X(a)+'" cy="'+yy+'" r="5" fill="var(--dim)"/>'+'<circle cx="'+X(b)+'" cy="'+yy+'" r="5.5" fill="'+c+'"/>';y+=rh});
    el.innerHTML=svgW(w,30+D.length*44,s,'Previous best against BERT-Large on five benchmarks')})})();
