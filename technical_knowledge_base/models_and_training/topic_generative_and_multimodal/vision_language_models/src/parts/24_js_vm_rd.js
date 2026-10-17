// ---- Reading figures (sections 1e, 2, 3, 4, 5, 6a, 7, 8) ----
(function(){
  const V=VM,D=V.D,R=D.runs||{};if(!V.$('t-read'))return;
  const ink=()=>V.css('--ink'),mute=()=>V.css('--mute');
  function axes(g,L,T,Rr,B,xt,yt,xl,yl){g.strokeStyle=V.css('--line');g.fillStyle=mute();yt.forEach(t=>{g.beginPath();g.moveTo(L,t[0]);g.lineTo(Rr,t[0]);g.stroke();g.fillText(t[1],2,t[0])});
    xt.forEach(t=>g.fillText(t[1],t[0]-8,B+12));if(xl)g.fillText(xl,L,B+26);if(yl)g.fillText(yl,L,T-4)}
  // 1e: max patch-norm ratio per image, four encoders
  function norms(){const el=V.$('vm-norm-fig');if(!el)return;const S=[];
    if(D.sigNorm&&D.sigNorm['224'])S.push(['SigLIP 2 B/16 at 224',D.sigNorm['224'].max,V.css('--c5')]);
    if(D.sigNorm&&D.sigNorm['512'])S.push(['SigLIP 2 B/16 at 512 (interpolated)',D.sigNorm['512'].max,V.css('--c6')]);
    if(D.drift&&D.drift.sig512)S.push(['SigLIP base 512 (public checkpoint)',D.drift.sig512.max,V.css('--c3')]);
    if(D.smolNorm)S.push(['SmolVLM-500M encoder (17 views)',D.smolNorm.test16.map(r=>r.max),V.css('--acc')]);
    if(D.qwenNorm)S.push(['Qwen3.5-0.8B encoder',D.qwenNorm.test16.map(r=>r.max_ratio),V.css('--c4')]);
    const W=Math.min(V.width(el),760),lh=30,L=W<480?150:230,H=S.length*lh+44,{g}=V.canvas(el,W,H),Rr=W-14,x=v=>L+(v-1)/(25-1)*(Rr-L);
    g.strokeStyle=V.css('--line');g.fillStyle=mute();[1,5,10,15,20,25].forEach(v=>{g.beginPath();g.moveTo(x(v),6);g.lineTo(x(v),H-24);g.stroke();g.fillText(v+'x',x(v)-6,H-14)});
    g.fillText(W<480?'largest / median patch norm, per image':'largest patch norm / median patch norm, one dot per test image',W<480?4:L,H-3);
    S.forEach((s,i)=>{const y=18+i*lh;g.fillStyle=ink();g.fillText(s[0],4,y,L-8);s[1].forEach((v,j)=>{g.globalAlpha=.8;g.fillStyle=s[2];g.beginPath();g.arc(x(Math.min(25,v)),y+((j*5)%11)-5,3.5,0,7);g.fill();g.globalAlpha=1})})}
  // 2: tokens against image side for square images (real processors)
  function res(){const el=V.$('vm-res-fig');if(!el||!D.rules)return;const sz=D.rules.sizes,pts=[];
    sz.forEach((hw,i)=>{if(hw[0]!==hw[1])return;const s=hw[0];pts.push({s,smol:VMB.smol(s,s,4).tokens,q:D.rules.qwen[i][0],ivl:D.rules.internvl[i][1]*256})});
    const W=Math.min(V.width(el),760),H=W<480?290:260,L=46,T=W<480?62:44,Rr=W-30,B=H-34,{g}=V.canvas(el,W,H);
    const lx=s=>L+(Math.log(s)-Math.log(64))/(Math.log(3000)-Math.log(64))*(Rr-L),ly=t=>B-(Math.log(t)-Math.log(32))/(Math.log(20000)-Math.log(32))*(B-T);
    axes(g,L,T,Rr,B,[64,224,512,1024,2048,3000].map(s=>[lx(s),s]),[64,256,1024,4096,16384].map(t=>[ly(t),V.comma(t)]),'square image side in pixels (log)','image tokens (log)');
    const ser=[['SmolVLM-500M (default)','smol',V.css('--acc')],['Qwen3.5-0.8B (default limits)','q',V.css('--c4')],['InternVL3-1B (processor)','ivl',V.css('--c5')]];
    ser.forEach(([n,k,col],si)=>{g.strokeStyle=col;g.lineWidth=2;g.beginPath();pts.forEach((p,j)=>{const X=lx(p.s),Y=ly(p[k]);j?g.lineTo(X,Y):g.moveTo(X,Y)});g.stroke();g.lineWidth=1;
      pts.forEach(p=>{g.fillStyle=col;g.beginPath();g.arc(lx(p.s),ly(p[k]),3,0,7);g.fill()});g.fillStyle=col;g.fillText(n,4+(W<480?0:si*Math.min(250,(W-8)/3)),8+(W<480?si*14:0))});
    g.strokeStyle=V.css('--c6');g.setLineDash([4,3]);g.beginPath();g.moveTo(L,ly(576));g.lineTo(Rr,ly(576));g.stroke();g.setLineDash([]);g.fillStyle=V.css('--c6');g.fillText('LLaVA-1.5: 576 always',Rr-130,ly(576)-8)}
  // 3: OCR grid (font size x budget), both models
  let ocrM='smol';
  function ocr(){const el=V.$('vm-ocr-fig');if(!el)return;const rows=(R[ocrM]&&R[ocrM].ocr&&R[ocrM].ocr.rows)||[];if(!rows.length){el.innerHTML='<p class="vm-small">Measurements pending.</p>';return}
    const buds=[...new Set(rows.map(r=>r.budget))],fonts=[...new Set(rows.map(r=>r.font_px))];
    const W=Math.min(V.width(el),620),cw=Math.min(110,(W-118)/buds.length),ch=26,H=fonts.length*ch+50,{g}=V.canvas(el,W,H);
    g.fillStyle=mute();g.fillText('font (cap height)',4,10);buds.forEach((b,j)=>g.fillText(V.comma(+b)+' tok',118+j*cw+4,10));
    fonts.forEach((f,i)=>{const y=22+i*ch,cap=(D.syn&&D.syn.ocr.find(o=>o.font===f)||{}).h;g.fillStyle=ink();g.fillText(f+' px ('+(cap||'?')+' tall)',4,y+ch/2);
      buds.forEach((b,j)=>{const cell=rows.filter(r=>r.font_px===f&&r.budget===b),ex=cell.filter(r=>r.exact).length,cer=cell.reduce((a,r)=>a+r.cer,0)/cell.length;
        g.fillStyle=V.heat(1-Math.max(0,1-cer));g.globalAlpha=.9;g.fillRect(118+j*cw,y,cw-3,ch-3);g.globalAlpha=1;g.fillStyle=cer>0.5?'#fff':'#222';g.fillText((cw<90?'':'')+ex+'/'+cell.length+(cw<90?', ':' exact, CER ')+cer.toFixed(2),118+j*cw+4,y+ch/2-1,cw-8)})});
    g.fillStyle=mute();g.fillText('cell: codes read exactly out of 3, mean character error rate (0 = perfect, 1 = nothing right)',4,H-8)}
  // 4: grounding boxes
  let gi=0,conv='best';
  function ground(){const el=V.$('vm-gr-fig');if(!el||!D.syn)return;const sc=D.syn.ground[gi],rq=R.qwen&&R.qwen.ground,rs=R.smol&&R.smol.ground;
    const W=Math.min(V.width(el),620),s=Math.min((W-8)/sc.w,320/sc.h),H=sc.h*s+8,{g}=V.canvas(el,W,H);
    V.img(sc.thumb,im=>{if(im)g.drawImage(im,4,4,sc.w*s,sc.h*s);
      sc.objects.forEach(o=>{const b=o.box;g.strokeStyle=V.css('--good');g.lineWidth=2;g.setLineDash([5,3]);g.strokeRect(4+b[0]*s,4+b[1]*s,(b[2]-b[0])*s,(b[3]-b[1])*s);g.setLineDash([])});
      [[rq,'qwen',V.css('--bad')],[rs,'smol',V.css('--c5')]].forEach(([rr,who,col])=>{if(!rr)return;rr.rows.filter(r=>r.key===sc.key).forEach(r=>{const bx=(D.groundParsed||{})[who+':'+r.key+':'+r.obj];if(!bx)return;
        const cv=conv==='best'?(D.groundBest||{})[who]:conv;const b=bx[cv];if(!b)return;g.strokeStyle=col;g.lineWidth=2;g.strokeRect(4+b[0]*s,4+b[1]*s,Math.max(1,(b[2]-b[0])*s),Math.max(1,(b[3]-b[1])*s));
        g.fillStyle=col;g.fillText(who==='qwen'?'Qwen3.5':'SmolVLM',4+b[0]*s+2,4+b[1]*s-6)})});g.lineWidth=1});
    const cap=[];[['qwen',rq],['smol',rs]].forEach(([who,rr])=>{if(!rr)return;rr.rows.filter(r=>r.key===sc.key).forEach(r=>cap.push('<b>'+(who==='qwen'?'Qwen3.5':'SmolVLM')+', '+V.esc(r.obj)+':</b> '+V.esc(r.answer.slice(0,90))))});
    V.$('vm-gr-cap').innerHTML='Scene '+(gi+1)+' ('+sc.w+' x '+sc.h+'): dashed green = true boxes. Raw answers: '+cap.join('; ')}
  // 5: video strips + answers
  function video(){const el=V.$('vm-vid-fig');if(!el||!D.syn)return;const rv=R.qwen&&R.qwen.video;let h='<div class="vm-two">';
    D.syn.video.forEach(v=>{const a=rv?rv.rows.filter(r=>r.key===v.key):[],vi=a.find(r=>r.mode==='video'),fi=a.find(r=>r.mode!=='video');
      const ok=x=>x&&x.answer.toLowerCase().includes(v.direction)?'<span class="vm-ok">right</span>':'<span class="vm-no">wrong</span>';
      h+='<div><img alt="" style="width:100%;max-width:320px;border-radius:4px" src="'+v.strip+'"><div class="vm-small">'+v.colour+' dot, '+v.direction+(vi?'. Video: &#8220;'+V.esc(vi.answer)+'&#8221; '+ok(vi)+'. First frame only: &#8220;'+V.esc(fi?fi.answer:'')+'&#8221; '+ok(fi):'')+'</div></div>'});
    el.innerHTML=h+'</div>'}
  // 6a: encoder drift per block
  function drift(){const el=V.$('vm-drift-fig');if(!el||!D.drift)return;const b=D.drift.blocks.filter(x=>x[0]!=='post_layernorm');
    const W=Math.min(V.width(el),620),lh=17,L=110,H=b.length*lh+30,{g}=V.canvas(el,W,H),Rr=W-50,mx=0.5,x=v=>L+v/mx*(Rr-L);
    g.fillStyle=mute();g.fillText('relative change from the public checkpoint (0 = identical)',L,H-6);
    b.forEach((r,i)=>{const y=8+i*lh;g.fillStyle=ink();g.fillText(r[0],4,y+lh/2-2);g.fillStyle=V.css('--acc');g.fillRect(L,y,Math.max(1,x(r[1])-L),lh-5);g.fillStyle=ink();g.fillText(r[1].toFixed(2),x(r[1])+4,y+lh/2-2)})}
  // 7: hallucination summary bars (yes rate on absent objects by condition, both models)
  function hal(){const el=V.$('vm-hal-fig');if(!el)return;const M=[['smol','SmolVLM'],['qwen','Qwen3.5']].filter(m=>R[m[0]]&&R[m[0]].pope);if(!M.length){el.innerHTML='<p class="vm-small">Measurements pending.</p>';return}
    const C=[['img','image'],['grey','grey image'],['none','no image'],['leading','leading']];
    const W=Math.min(V.width(el),700),lh=16,L=W<480?150:200,H=M.length*C.length*lh*2+M.length*14+28,{g}=V.canvas(el,W,H),Rr=W-46,x=v=>L+v*(Rr-L);let y=6;
    M.forEach(([k,n])=>{const rows=R[k].pope.rows;g.fillStyle=ink();g.font='600 11px system-ui';g.fillText(n,4,y+6);g.font='11px system-ui';y+=14;
      C.forEach(([c,cl])=>{const ab=rows.filter(r=>r.kind!=='present'),pr=rows.filter(r=>r.kind==='present');const ma=ab.reduce((a,r)=>a+r[c].yes_share,0)/ab.length,mp=pr.reduce((a,r)=>a+r[c].yes_share,0)/pr.length;
        g.fillStyle=mute();g.fillText(cl,8,y+lh-2);g.fillStyle=V.css('--good');g.fillRect(L,y,x(mp)-L,lh-4);g.fillStyle=ink();g.fillText(mp.toFixed(2),x(mp)+3,y+lh/2-2);y+=lh;
        g.fillStyle=V.css('--bad');g.fillRect(L,y,Math.max(1,x(ma)-L),lh-4);g.fillStyle=ink();g.fillText(ma.toFixed(2),x(ma)+3,y+lh/2-2);y+=lh})});
    g.fillStyle=mute();g.fillText(W<480?'mean P(yes): green present, red absent':'mean P(yes): green = objects present (25), red = absent (47)',W<480?4:L,H-6)}
  // 8: cache bytes against prompt tokens (measured)
  function kv(){const el=V.$('vm-kv-fig');if(!el)return;const S=[['smol','SmolVLM-500M',V.css('--acc')],['qwen','Qwen3.5-0.8B',V.css('--c4')]].filter(s=>R[s[0]]&&R[s[0]].kv);if(!S.length){el.innerHTML='<p class="vm-small">Measurements pending.</p>';return}
    const W=Math.min(V.width(el),620),H=220,L=50,T=16,Rr=W-12,B=H-34,{g}=V.canvas(el,W,H);const allT=S.flatMap(s=>R[s[0]].kv.runs.map(r=>r.prompt_tokens)),allB=S.flatMap(s=>R[s[0]].kv.runs.map(r=>r.total_bytes));
    const mt=Math.max(...allT)*1.08,mb=Math.max(...allB)*1.1/1e6,lx=t=>L+t/mt*(Rr-L),ly=b=>B-b/1e6/mb*(B-T);
    axes(g,L,T,Rr,B,[0,500,1000].filter(t=>t<mt).map(t=>[lx(t),t]),[0,mb/2,mb].map(b=>[ly(b*1e6),b.toFixed(0)+' MB']),'prompt tokens','cache after prefill');
    S.forEach(([k,n,col],i)=>{const rs=R[k].kv.runs.slice().sort((a,b)=>a.prompt_tokens-b.prompt_tokens);g.strokeStyle=col;g.lineWidth=2;g.beginPath();rs.forEach((r,j)=>{j?g.lineTo(lx(r.prompt_tokens),ly(r.total_bytes)):g.moveTo(lx(r.prompt_tokens),ly(r.total_bytes))});g.stroke();g.lineWidth=1;
      rs.forEach(r=>{g.fillStyle=col;g.beginPath();g.arc(lx(r.prompt_tokens),ly(r.total_bytes),3.5,0,7);g.fill()});g.fillStyle=col;g.fillText(n,L+8,T+6+i*14)})}
  // 8a: token reduction results
  function red(){const el=V.$('vm-red-fig');if(!el)return;const r=R.smol&&R.smol.reduce;if(!r){el.innerHTML='<p class="vm-small">Measurements pending.</p>';return}
    const S=r.settings,W=Math.min(V.width(el),700),nar=W<480,lh=20,L=nar?96:150,H=S.length*lh+30,{g}=V.canvas(el,W,H),Rr=W-(nar?118:190),x=v=>L+v/30*(Rr-L);
    S.forEach((s,i)=>{const y=6+i*lh,n=r.right[s],tk=(r.rows.find(q=>q.setting===s)||{}).image_tokens,pf=r.prefill&&r.prefill[s];g.fillStyle=ink();g.fillText(s,4,y+lh/2-2);
      g.fillStyle=s.startsWith('random')?V.css('--c5'):s.startsWith('attention')?V.css('--c4'):V.css('--acc');g.fillRect(L,y,Math.max(1,x(n)-L),lh-5);g.fillStyle=ink();
      g.fillText(n+'/30, '+V.comma(tk)+(nar?' tok':' img tok')+(pf?', '+pf.seconds.toFixed(2)+' s':''),x(n)+4,y+lh/2-2)});
    g.fillStyle=mute();g.fillText(nar?'right of 30; tokens kept; prefill s':'questions right (of 30); image tokens kept; prefill seconds on the cat (M1 Pro)',nar?4:L,H-6)}
  // predict-then-reveal (position question)
  document.querySelectorAll('#t-read .pr').forEach(p=>p.addEventListener('click',e=>{const b=e.target.closest('.opts button');if(!b)return;p.querySelectorAll('.opts button').forEach(x=>x.classList.toggle(x.dataset.a==='1'?'right':'wrong',x===b||x.dataset.a==='1'));p.querySelector('.ans').hidden=false}));
  // pickers
  if(D.syn){const pk=V.$('vm-gr-pick');if(pk){pk.innerHTML=D.syn.ground.map((s,i)=>'<button data-i="'+i+'" class="'+(i?'':'on')+'" aria-label="scene '+(i+1)+'"><img alt="" src="'+s.thumb+'"></button>').join('');
      pk.onclick=e=>{const b=e.target.closest('button');if(!b)return;gi=+b.dataset.i;pk.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));ground()}}
    const cr=V.$('vm-ocr-crops');if(cr)cr.innerHTML=D.syn.ocrCrops.map(c=>'<span style="display:inline-block;text-align:center;font-size:11px;color:var(--mute)"><img alt="" style="width:128px;height:64px;object-fit:cover;border:1px solid var(--line);border-radius:3px;image-rendering:pixelated" src="'+c.uri+'"><br>'+c.font_px+' px</span>').join(' ')}
  const cs=V.$('vm-gr-conv');if(cs)V.seg(cs,[['best','best-fitting reading'],['k1000','as 0 to 1,000'],['resized','as resized-image pixels'],['orig','as original pixels']],'best',v=>{conv=v;ground()});
  const os=V.$('vm-ocr-seg');if(os)V.seg(os,[['smol','SmolVLM-500M'],['qwen','Qwen3.5-0.8B']],'smol',v=>{ocrM=v;ocr()});
  function all(){V.fill(V.$('t-read'));norms();res();ocr();ground();video();drift();hal();kv();red()}
  V.onRender(all);RD.onResize(all);
})();
