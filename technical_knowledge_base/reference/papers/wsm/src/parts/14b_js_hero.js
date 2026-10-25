// ---- Hero (2026-10-25 light pass): a mean merge of 10 checkpoints taken at a flat LR applies a linear decay to the updates
// (Eq. 3 and 4), beside what that bought on Ling-mini at matched tokens (Figure 3, Table 1). Static: nothing moves. Numbers from window.PAPER.rc. ----
(function(){const host=$('heroSvg');if(!host)return;
  const F=window.PAPER.rc.fig3,wsd=F.WSD_best[0],wsm=F.WSM_best_le400[0],raw=+(wsm-F.merge_over_raw_400).toFixed(2),best=F.WSM_best;
  function merge(x0,pw){let s=tx(x0,13,'Average 10 checkpoints (0.1 each) = a linear decay',{fs:12.5,w:600});
    const K=9,c=Array(K+1).fill(0.1),w=[];for(let i=1;i<=K;i++){let a=0;for(let j=i;j<=K;j++)a+=c[j];w.push(a)}
    const pl=x0+38,aw=pw-38-6,top=40,ch=110,base=top+ch,X=j=>pl+aw*j/K,Y=v=>base-ch*v;
    [0,0.5,1].forEach(v=>{s+=ln2(pl,Y(v),pl+aw,Y(v),'var(--line)')+tx(pl-5,Y(v)+4,(v*100)+'%',{fs:11,a:'end',c:'var(--mute)'})});
    s+=ln2(pl,Y(1),pl+aw,Y(1),'var(--ink)',{sw:1.6,da:'5 4'})+tx(pl+aw,Y(1)-6,'LR actually used: flat at the peak',{fs:11,a:'end',c:'var(--mute)'});
    let d='';w.forEach((v,i)=>{d+=(i?'L':'M')+X(i).toFixed(1)+','+Y(v).toFixed(1)+'L'+X(i+1).toFixed(1)+','+Y(v).toFixed(1)});
    s+='<path d="'+d+'" fill="none" stroke="var(--acc)" stroke-width="2.6"/>';
    s+=tx(pl+aw,Y(0.78),'effective LR of each update',{fs:11,a:'end',c:'var(--acc)',w:600})+tx(pl+aw,Y(0.78)+14,'in the merged model',{fs:11,a:'end',c:'var(--acc)',w:600});
    const by=base+20,bh=30;
    c.forEach((v,j)=>{const x=X(j);s+='<circle cx="'+x.toFixed(1)+'" cy="'+(by+bh+8).toFixed(1)+'" r="3.5" fill="var(--c2)"/>'+rc(x-5,by+bh-bh*v/0.2,10,bh*v/0.2,'var(--c2)',{r:1})});
    s+=tx(pl,by+bh+26,'10 checkpoints, merge weight 0.1 each',{fs:11,c:'var(--mute)'});
    return {s,h:by+bh+32}}
  function result(x0,pw){let s=tx(x0,13,'Ling-mini, 400B tokens: merge against decay',{fs:12.5,w:600});
    const B=[['flat LR, no merge',raw,'var(--soft)','var(--mute)'],['WSD: decay the LR',wsd,'var(--c3)','var(--bg)'],['WSM: flat LR, merge',wsm,'var(--acc)','var(--bg)']];
    const pl=x0+2,aw=pw-8,lo=58,hi=65,X=v=>pl+aw*(v-lo)/(hi-lo),top=30,rh=24;
    B.forEach((b,i)=>{const y=top+i*(rh+24);s+=tx(pl,y+12,b[0],{fs:11.5,w:600})+rc(pl,y+17,X(b[1])-pl,rh,b[2],{r:4,s:i?null:'var(--line)'})+tx(X(b[1])-8,y+17+17,b[1].toFixed(2),{fs:12,a:'end',w:600,c:b[3]})});
    const y=top+3*(rh+24)+6;
    s+=tx(pl,y+4,'Average of 41 base-model benchmarks; axis from '+lo+'.',{fs:11,c:'var(--mute)'});
    s+=tx(pl,y+20,'+'+(wsm-wsd).toFixed(2)+' at matched tokens; best merged point',{fs:11,c:'var(--mute)'});
    s+=tx(pl,y+36,best[0].toFixed(2)+' at '+best[1]+'B (+'+(best[0]-wsd).toFixed(2)+'). One run per arm.',{fs:11,c:'var(--mute)'});
    return {s,h:y+42}}
  function draw(W){const two=W>=720;let s,h;
    if(two){const pw=(W-34)/2,a=merge(1,pw),b=result(pw+33,pw);s=a.s+b.s;h=Math.max(a.h,b.h)}
    else{const a=merge(1,W-2),b=result(1,W-2);s=a.s+'<g transform="translate(0,'+(a.h+18)+')">'+b.s+'</g>';h=a.h+18+b.h}
    host.innerHTML=svgW(W,h+2,s,'Left: ten checkpoints saved at a flat learning rate, averaged with weight 0.1 each, give the merged model the updates since the oldest checkpoint at 90%, 80%, down to 10% of the learning rate: a linear decay. Right: on Ling-mini at 400 billion tokens, the flat run without merging scores '+raw+', the WSD decay '+wsd+' and the merge '+wsm)}
  fit(host,draw)})();
