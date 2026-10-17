// ---- Vision lab: similarity-matrix explorer, contrastive-loss calculator, why the sigmoid loss scales ----
(function(){
  const V=window.VS,D=V.D,$=V.$;if(!$('vs-sm'))return;
  const K=D.keys,N16=K.length,short=k=>k.split('_')[0];
  // ---------------- similarity explorer
  const sm={w:'clip',view:'cos',cell:[3,3]};
  V.seg($('vs-sm-m'),[['clip','CLIP B/32'],['siglip','SigLIP 2 B/16']],'clip',v=>{sm.w=v;drawSM()});
  V.seg($('vs-sm-v'),[['cos','cosine'],['row','softmax over captions'],['col','softmax over images'],['sig','sigmoid']],'cos',v=>{sm.view=v;drawSM()});
  function mats(w){const m=D.models[w],S=m.sim16,t=m.scale,b=m.bias||0;
    const L=S.map(r=>r.map(x=>t*x+b));
    const row=L.map(r=>V.softmax(r));
    const colT=K.map((_,j)=>V.softmax(L.map(r=>r[j])));const col=L.map((r,i)=>r.map((_,j)=>colT[j][i]));
    const sg=L.map(r=>r.map(x=>V.sig(x)));
    return {S,L,row,col,sg,t,b}}
  function drawSM(){
    const M=mats(sm.w),m=D.models[sm.w];
    const val=(i,j)=>sm.view==='cos'?M.S[i][j]:sm.view==='row'?M.row[i][j]:sm.view==='col'?M.col[i][j]:M.sg[i][j];
    let lo=1e9,hi=-1e9;for(let i=0;i<N16;i++)for(let j=0;j<N16;j++){const v=val(i,j);lo=Math.min(lo,v);hi=Math.max(hi,v)}
    if(sm.view!=='cos'){lo=0;hi=1}
    let h='<div class="vs-mx" style="grid-template-columns:30px repeat('+N16+',minmax(0,1fr))"><div></div>';
    K.forEach((k,j)=>{h+='<div class="vs-ch" title="'+V.esc(D.captions[j])+'">'+(j+1)+'</div>'});
    for(let i=0;i<N16;i++){h+='<div class="vs-rh"><img src="'+D.thumbs[K[i]]+'" alt="'+V.esc(K[i])+'" width="26" height="26"></div>';
      for(let j=0;j<N16;j++){const v=val(i,j),x=(v-lo)/Math.max(1e-9,hi-lo);const on=sm.cell[0]===i&&sm.cell[1]===j;
        const best=sm.view==='col'?M.S.every((r,ii)=>r[j]<=M.S[i][j]):M.S[i].every(x2=>x2<=M.S[i][j]);
        h+='<button class="vs-c'+(on?' on':'')+(i===j?' dg':'')+'" data-i="'+i+'" data-j="'+j+'" style="background:'+V.seq(x)+'" aria-label="image '+(i+1)+' caption '+(j+1)+'">'+(best?'&#8226;':'')+'</button>'}}
    h+='</div>';$('vs-sm-g').innerHTML=h;
    $('vs-sm-g').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{sm.cell=[+b.dataset.i,+b.dataset.j];drawSM()}));
    const [i,j]=sm.cell;const rank=1+M.S[i].filter(x=>x>M.S[i][i]).length;
    $('vs-sm-d').innerHTML='<div class="vs-det"><img src="'+D.thumbs[K[i]]+'" alt="" width="72" height="72"><div><b>Image '+(i+1)+'</b> ('+V.esc(K[i])+') against <b>caption '+(j+1)+'</b>: &#8220;'+V.esc(D.captions[j])+'&#8221;'+
      '<div class="small mute">cosine '+V.fmt(M.S[i][j],4)+' &#183; logit '+V.fmt(M.L[i][j],2)+' = '+M.t+' &#215; cosine'+(m.bias!=null?' + ('+m.bias+')':'')+
      ' &#183; softmax over captions '+V.pct(M.row[i][j])+' &#183; over images '+V.pct(M.col[i][j])+(sm.w==='siglip'?' &#183; sigmoid '+V.pct(M.sg[i][j]):'')+
      '<br>Its own caption ranks '+rank+' of 16 for this image'+(rank===1?'':' (a miss)')+'.</div></div></div>';
    let top1=0,top1t=0,dg=0,od=0;for(let a=0;a<N16;a++){if(M.S[a].every(x=>x<=M.S[a][a]))top1++;if(M.S.every(r=>r[a]<=M.S[a][a]))top1t++;dg+=M.S[a][a];od+=M.S[a].reduce((p,q)=>p+q,0)-M.S[a][a]}
    $('vs-sm-o').innerHTML=V.stat('Image picks its own caption',top1+' of 16','argmax along each row')+V.stat('Caption picks its own image',top1t+' of 16','argmax down each column')+
      V.stat('Mean cosine, matching pairs',V.fmt(dg/16,3),'the diagonal')+V.stat('Mean cosine, other pairs',V.fmt(od/240,3),'240 off-diagonal cells');
    $('vs-sm-n').innerHTML=sm.view==='sig'&&sm.w==='clip'?'<b>Careful:</b> CLIP was trained with the softmax and has no bias; a sigmoid of 100 &#215; cosine is close to 1 for every cell, which is why the sigmoid view only makes sense for SigLIP 2 (scale '+D.models.siglip.scale+', bias '+D.models.siglip.bias+').':
      sm.view==='cos'?'Cosines are small for both models (CLIP&#8217;s matching pairs sit near 0.3): only their order matters, and the learned scale stretches them before the softmax or sigmoid.':
      sm.view==='sig'?'Each cell is judged on its own: the bias '+D.models.siglip.bias+' pushes every pair towards &#8220;no match&#8221; unless the cosine is high. Rows need not sum to 1.':'Each '+(sm.view==='row'?'row':'column')+' sums to 100%: the softmax turns the scaled cosines into a choice among the 16. A dot marks the winner.'}
  // ---------------- loss calculator
  const lc={w:'clip',loss:'softmax',n:8,t:100,b:-10,perm:null};
  V.seg($('vs-lc-m'),[['clip','CLIP B/32 embeddings'],['siglip','SigLIP 2 B/16 embeddings']],'clip',v=>{lc.w=v;drawLC()});
  V.seg($('vs-lc-l'),[['softmax','softmax (CLIP)'],['sigmoid','sigmoid (SigLIP)']],'softmax',v=>{lc.loss=v;drawLC()});
  const tS=$('vs-lc-t'),nS=$('vs-lc-n'),bS=$('vs-lc-b');
  const tOf=()=>Math.pow(10,+tS.value);
  tS.addEventListener('input',()=>{lc.t=tOf();drawLC()});nS.addEventListener('input',()=>{lc.n=+nS.value;drawLC()});bS.addEventListener('input',()=>{lc.b=+bS.value;drawLC()});
  $('vs-lc-learn').addEventListener('click',()=>{const m=D.models[lc.w];lc.t=m.scale;tS.value=Math.log10(m.scale);if(m.bias!=null){lc.b=m.bias;bS.value=m.bias}drawLC()});
  $('vs-lc-shuf').addEventListener('click',()=>{const a=K.map((_,i)=>i);for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}lc.perm=a;drawLC()});
  $('vs-lc-first').addEventListener('click',()=>{lc.perm=null;drawLC()});
  function lossAt(S,t,b,kind){const n=S.length;let tot=0;const per=[];
    if(kind==='softmax'){const L=S.map(r=>r.map(x=>t*x));
      for(let i=0;i<n;i++){const ri=-Math.log(V.softmax(L[i])[i]);const ci=-Math.log(V.softmax(L.map(r=>r[i]))[i]);per.push((ri+ci)/2);tot+=(ri+ci)/2}
      return {loss:tot/n,per}}
    for(let i=0;i<n;i++){let s=0;for(let j=0;j<n;j++){const z=i===j?1:-1;s-=V.logsig(z*(t*S[i][j]+b))}per.push(s);tot+=s}
    return {loss:tot/n,per}}
  function drawLC(){
    const m=D.models[lc.w],idx=(lc.perm||K.map((_,i)=>i)).slice(0,lc.n);
    const S=idx.map(i=>idx.map(j=>m.sim16[i][j]));const n=S.length;
    $('vs-lc-tv').textContent=lc.t<10?lc.t.toFixed(2):lc.t.toFixed(1);$('vs-lc-nv').textContent=n;$('vs-lc-bv').textContent=(+lc.b).toFixed(1);
    $('vs-lc-bw').style.display=lc.loss==='sigmoid'?'':'none';
    const r=lossAt(S,lc.t,lc.b,lc.loss);let acc=0;for(let i=0;i<n;i++)if(S[i].every(x=>x<=S[i][i]))acc++;
    $('vs-lc-o').innerHTML=V.stat('Loss',V.fmt(r.loss,3),lc.loss==='softmax'?'mean of image-to-text and text-to-image cross-entropy':'sum over the row of &#8722;log &#963;(label &#215; logit), mean over rows')+
      (lc.loss==='softmax'?V.stat('Chance level, ln N',V.fmt(Math.log(n),3),'what a model that knows nothing scores'):V.stat('Pairs scored',String(n*n),n+' positives, '+(n*n-n)+' negatives'))+
      V.stat('Rows where the match wins',acc+' of '+n,'independent of the scale')+V.stat('Scale t = 1 / temperature',lc.t<10?lc.t.toFixed(2):lc.t.toFixed(1),'learned: CLIP '+D.models.clip.scale+', SigLIP 2 '+D.models.siglip.scale);
    // per-pair bars
    const mx=Math.max(...r.per,1e-9);
    $('vs-lc-bars').innerHTML=idx.map((k,a)=>'<div class="row"><span class="nm">'+(a+1)+'. '+V.esc(short(K[k]))+'</span><span class="track"><span class="fill" style="width:'+(100*r.per[a]/mx).toFixed(1)+'%;background:var(--c2)"></span></span><span class="val">'+V.fmt(r.per[a],3)+'</span></div>').join('');
    // loss against scale, for this batch
    const box=$('vs-lc-plot'),Wd=V.width(box),H=170,pl=40,pr=12,pt=10,pb=30;const xs=[];for(let e=0;e<=2.5;e+=0.025)xs.push(Math.pow(10,e));
    const ys=xs.map(t=>lossAt(S,t,lc.b,lc.loss).loss);const ymax=Math.max(...ys,lc.loss==='softmax'?Math.log(n):0)*1.05;
    const X=t=>pl+(Math.log10(t)/2.5)*(Wd-pl-pr),Y=v=>pt+(1-v/ymax)*(H-pt-pb);
    let s='<svg width="'+Wd+'" height="'+H+'" viewBox="0 0 '+Wd+' '+H+'" role="img" aria-label="Loss against the scale t">';
    [0,0.5,1,1.5,2,2.5].forEach(e=>{const x=X(Math.pow(10,e));s+='<line x1="'+x+'" x2="'+x+'" y1="'+pt+'" y2="'+(H-pb)+'" stroke="var(--line)"/><text x="'+x+'" y="'+(H-pb+14)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+(Math.pow(10,e)>=10?Math.round(Math.pow(10,e)):Math.pow(10,e).toFixed(1))+'</text>'});
    s+='<text x="'+(pl+(Wd-pl-pr)/2)+'" y="'+(H-2)+'" font-size="11" text-anchor="middle" fill="var(--mute)">scale t (log axis)</text>';
    [0,.5,1].forEach(f=>{const v=ymax*f;s+='<text x="'+(pl-5)+'" y="'+(Y(v)+4)+'" font-size="11" text-anchor="end" fill="var(--mute)">'+v.toFixed(1)+'</text>'});
    if(lc.loss==='softmax'){const y=Y(Math.log(n));s+='<line x1="'+pl+'" x2="'+(Wd-pr)+'" y1="'+y+'" y2="'+y+'" stroke="var(--mute)" stroke-dasharray="4 3"/><text x="'+(Wd-pr)+'" y="'+(y-4)+'" font-size="11" text-anchor="end" fill="var(--mute)">ln N</text>'}
    s+='<polyline fill="none" stroke="var(--acc)" stroke-width="2" points="'+xs.map((t,k)=>X(t).toFixed(1)+','+Y(ys[k]).toFixed(1)).join(' ')+'"/>';
    const cx=X(Math.min(316,Math.max(1,lc.t))),cy=Y(r.loss);s+='<circle cx="'+cx+'" cy="'+cy+'" r="5" fill="var(--bad)"/>';
    s+='</svg>';box.innerHTML=s;
  }
  // ---------------- why the sigmoid scales (derived from SigLIP section 3.3)
  const sc={B:32768,D:256,d:768};
  const bS2=$('vs-sc-b'),dS2=$('vs-sc-d');
  function drawSC(){sc.B=Math.round(Math.pow(2,+bS2.value));sc.D=Math.round(Math.pow(2,+dS2.value));if(sc.D>sc.B)sc.D=sc.B;const b=sc.B/sc.D;
    $('vs-sc-bv').textContent=V.comma(sc.B);$('vs-sc-dv').textContent=V.comma(sc.D)+' (b = '+V.comma(b)+' per device)';
    const by=4,fmtB=x=>x>=1e9?(x/1e9).toFixed(1)+' GB':x>=1e6?(x/1e6).toFixed(1)+' MB':(x/1e3).toFixed(1)+' kB';
    const rows=[['Full |B| &#215; |B| matrix (the vanilla loss SigLIP describes)',sc.B*sc.B*by,'every device materialises all pairs'],
      ['Each device its own rows, b &#215; |B| (softmax after all-gathering the other side&#8217;s embeddings)',b*sc.B*by,'the row and column sums need every embedding'],
      ['Sigmoid, chunked: b &#215; b at a time',b*b*by,'texts passed round the ring, D steps; no global sum']];
    const mx=rows[0][1];
    $('vs-sc-bars').innerHTML=rows.map(r=>'<div class="row"><span class="nm">'+r[0]+'</span><span class="track"><span class="fill" style="width:'+Math.max(0.6,100*Math.log10(1+r[1]/1e3)/Math.log10(1+mx/1e3)).toFixed(1)+'%;background:var(--acc)"></span></span><span class="val">'+fmtB(r[1])+'</span></div>').join('');
    $('vs-sc-o').innerHTML=V.stat('Logits held per device, softmax rows',V.comma(b*sc.B),'b &#215; |B|, float32')+V.stat('Logits held per device, chunked sigmoid',V.comma(b*b),'b &#215; b: '+V.comma(sc.D)+'&#215; fewer')+
      V.stat('Embeddings each device must receive (softmax)',V.comma(2*(sc.B-b)*sc.d),'all-gather of both towers: 2 &#215; (|B| &#8722; b) &#215; d numbers')+V.stat('Received per device (chunked sigmoid)',V.comma((sc.D-1)*b*sc.d),'(D &#8722; 1) permutes of b &#215; d text embeddings');
  }
  bS2.addEventListener('input',drawSC);dS2.addEventListener('input',drawSC);
  V.onRender(()=>{drawSM();drawLC();drawSC()});
  addEventListener('resize',()=>{if($('vs-lc-plot').offsetParent)drawLC()});
})();
