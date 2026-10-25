// ---- Hero (2026-10-25 light pass): the recipe's three stages for the 7B, drawn to scale in tokens, with what each bought,
// beside the 7B-to-9B base models of Table 6 on average against training FLOPs. Static: nothing moves. Numbers read from window.PAPER. ----
(function(){const host=$('heroSvg');if(!host)return;
  const T=window.PAPER.tables,row=(t,name)=>{const r=T[t].rows.find(r=>r.c[0]===name);return r?r.c:null};
  const t9=T.t9.rows.filter(r=>r.g==='OLMo 2 7B').map(r=>r.c),pre=+t9[0][1],mid=+t9[1][1],gPre=t9[0][9],gMid=t9[1][9];
  const sft=row('t16','OLMo 2 7B SFT'),ins=row('t16','OLMo 2 7B Instruct');
  function stages(x0,pw){let s=tx(x0,13,'OLMo 2 7B: three stages, to scale in tokens',{fs:12.5,w:600});
    const y=26,h=30,tot=3900+150,wPre=pw*3900/tot,wMid=Math.max(10,pw*150/tot);
    s+=rc(x0,y,pw-wMid,h,'var(--c3)',{r:3})+tx(x0+8,y+19,'Pretraining: 3.90T tokens, OLMo 2 Mix',{fs:12,w:600,c:'var(--bg)'});
    s+=rc(x0+pw-wMid,y,wMid,h,'var(--acc)',{r:3});
    s+=ln2(x0+pw-wMid/2,y+h,x0+pw-wMid/2,y+h+14,'var(--acc)')+tx(x0+pw,y+h+27,'Mid-training: 3 × 50B on Dolmino, souped',{fs:11.5,a:'end',w:600,c:'var(--acc)'});
    const L=[[y+h+52,'Stage 1 is made safe by the stability fixes:','var(--ink)',600],
      [y+h+68,'the new init alone: spike score 0.40% → 0.03%','var(--mute)'],
      [y+h+92,'Mid-training: 10-task average '+pre.toFixed(1)+' → '+mid.toFixed(1),'var(--ink)',600],
      [y+h+108,'GSM8K '+gPre+' → '+gMid+', on 5 to 10% of the FLOPs','var(--mute)'],
      [y+h+132,'Post-training (Tülu 3): SFT → DPO → RLVR','var(--ink)',600],
      [y+h+148,'instruct suite '+sft[1]+' after SFT → '+ins[1]+' final','var(--mute)']];
    L.forEach(l=>{s+=tx(x0,l[0],l[1],{fs:11.5,c:l[2],w:l[3]||null})});
    return {s,h:y+h+156}}
  function frontier(x0,pw){let s=tx(x0,13,'Fully open, near the frontier with less compute',{fs:12.5,w:600});
    const P=[['OLMo 2 7B',1],['Llama 3.1 8B',0],['Qwen 2.5 7B',0],['Gemma 2 9B',0],['DCLM 7B',0],['OLMo 7B 0424',0]].map(([n,me])=>{const c=row('t6',n);return {n,me,f:+c[2],a:+c[1]}});
    const top=36,ch=146,base=top+ch,pl=x0+34,aw=pw-34-8,lo=Math.log10(0.7),hi=Math.log10(12),X=f=>pl+aw*(Math.log10(f)-lo)/(hi-lo),Y=a=>base-ch*(a-48)/(72-48);
    [50,60,70].forEach(v=>{s+=ln2(pl,Y(v),pl+aw,Y(v),'var(--line)')+tx(pl-6,Y(v)+4,v,{fs:11,a:'end',c:'var(--mute)'})});
    [1,2,5,10].forEach(f=>{s+=ln2(X(f),base,X(f),base+4,'var(--mute)')+tx(X(f),base+16,f,{fs:11,a:'middle',c:'var(--mute)'})});
    s+=tx(pl+aw,base+30,'training FLOPs, 10²³ (6ND, log scale)',{fs:11,a:'end',c:'var(--mute)'});
    s+=tx(pl,top-4,'average, 10 OLMES tasks',{fs:11,c:'var(--mute)'});
    const pts=P.map(p=>({x:X(p.f),y:Y(p.a),t:p.n+' '+p.a.toFixed(1),fs:11}));placeLabels(pts,pw+x0,base+2);
    P.forEach((p,i)=>{const q=pts[i];s+='<circle cx="'+q.x.toFixed(1)+'" cy="'+q.y.toFixed(1)+'" r="'+(p.me?6:4.5)+'" fill="'+(p.me?'var(--acc)':'var(--c2)')+'"/>'
      +tx(q.lx,q.ly,q.t,{fs:11,a:q.la,c:p.me?'var(--acc)':'var(--ink)',w:p.me?600:null})});
    return {s,h:base+36}}
  function draw(W){const two=W>=720;let s,h;
    if(two){const pw=(W-34)/2,a=stages(1,pw),b=frontier(pw+33,pw);s=a.s+b.s;h=Math.max(a.h,b.h)}
    else{const a=stages(1,W-2),b=frontier(1,W-2);s=a.s+'<g transform="translate(0,'+(a.h+18)+')">'+b.s+'</g>';h=a.h+18+b.h}
    host.innerHTML=svgW(W,h+2,s,'Left: OLMo 2 7B pretrains on 3.90 trillion tokens, then mid-trains on three 50 billion token anneals that are averaged; the stability fixes keep pretraining from spiking, mid-training lifts the average from '+pre+' to '+mid+', and post-training follows Tülu 3. Right: on average against training FLOPs, OLMo 2 7B scores 62.9 at 1.8 times ten to the 23, against Llama 3.1 8B at 61.8 with 7.2 and Qwen 2.5 7B at 67.4 with 8.2')}
  fit(host,draw)})();
