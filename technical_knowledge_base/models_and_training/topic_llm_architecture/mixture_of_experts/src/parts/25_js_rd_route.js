// ---- Reading section 2 (moved from the retired Router tab on 2026-10-23): before/after balancing animation (8 tokens), the sequence coloured by expert,
// and which tokens each expert takes on held-out text. All from recorded router outputs (window.MXD.runs[*].seq/special). ----
(function(){
  const M=window.MX;if(!M||!window.RD||!M.$('rt-anim'))return;const {D,$,f,pct,tx,svg,esc,EC}=M;
  const RUNS=['none','moe8','bias','sbias','moe16s'].filter(k=>D.runs[k]&&D.runs[k].seq);
  const R8=RUNS.filter(k=>D.runs[k].seq.E===8);
  if(!R8.length)return;
  const L=D.runs[R8[0]].seq.top.length,TOK=[1,2,3,4,5,6,7,8];
  const st={run:R8.includes('none')?'none':R8[0],lay:0};
  const scores=(run,lay)=>{const r=D.runs[run].seq,E=r.E,a=M.unb64(r.scores64_b64[lay]);return TOK.map(t=>Array.from({length:E},(_,e)=>a[t*E+e]/255))};
  const choice=(run,lay)=>{const r=D.runs[run].seq,k=r.k;return TOK.map(t=>r.top[lay].slice(t*k,t*k+k).split('').map(c=>parseInt(c,16)))};
  const wts=(run,lay)=>TOK.map(t=>{const w=D.runs[run].seq.w1[lay][t];return [w,1-w]});
  const CAP=Math.ceil(1.25*8*2/8);
  const STEPS=[['8 tokens reach the FFN sub-layer','Each is the 256-number hidden state of one token after attention and the norm. The router is a 256 &times; 8 matrix: one logit per expert per token.'],
    ['The router scores every expert','Each strip is one token\'s 8 scores (darker is higher): a softmax over the 8 experts for the softmax models, independent sigmoids for the sigmoid model. This costs 2 &times; 256 &times; 8 = 4,096 FLOPs per token.'],
    ['Each token keeps its top 2','Outlined: the two chosen experts. Only they run for this token; the other 6 are skipped.'],
    ['Dispatch: each assignment goes to its expert','16 assignments for 8 tokens. Each square is one token copy sent to an expert, labelled by token position.'],
    ['The load each expert gets','Dashed line: the mean, 2 per expert. The busiest expert sets the step time when experts sit on different GPUs.'],
    ['What a capacity factor of 1.25 would drop','3 slots per expert in this batch; assignments past the third, in token order, are dropped (red): those tokens get less FFN output in this layer.'],
    ['Combine: weighted sum of the two experts','Each token adds g<sub>1</sub> E<sub>a</sub>(h) + g<sub>2</sub> E<sub>b</sub>(h) to its residual stream; the numbers are the two gate weights.']];
  function draw(i){
    const sc=scores(st.run,st.lay),ch=choice(st.run,st.lay),w=wts(st.run,st.lay),E=8;
    const el=$('rt-svg'),W=M.width(el),nar=W<520,cw=(W-20)/8,H=nar?330:300;let s='';
    const ty=16,sy=nar?40:36,sh=nar?8:9,ey=sy+E*sh+(nar?34:30);
    TOK.forEach((t,j)=>{const x=10+j*cw;s+=tx(x+cw/2,ty,esc(M.piece(t).replace(/ /g,'·')),{a:'middle',fs:nar?10.5:12,w:600});
      if(i>=1)sc[j].forEach((v,e)=>{const on=i>=2&&ch[j].includes(e);s+='<rect x="'+(x+4)+'" y="'+(sy+e*sh)+'" width="'+(cw-8)+'" height="'+(sh-1)+'" fill="'+EC[e]+'" fill-opacity="'+(0.08+0.92*v).toFixed(2)+'"'+(on?' stroke="var(--ink)" stroke-width="1.6"':'')+'><title>E'+e+' '+f(v,3)+'</title></rect>'});
      if(i>=6)s+=tx(x+cw/2,sy+E*sh+14,f(w[j][0],2)+' + '+f(w[j][1],2),{a:'middle',fs:10.5})});
    if(i>=1)s+=tx(4,sy+E*sh+(nar?26:24),'',{});
    // expert columns
    const load=Array(E).fill(0),drop=[];const items=[];
    ch.forEach((c,j)=>c.forEach(e=>{load[e]++;const dr=load[e]>CAP;items.push({e,j,n:load[e],dr})}));
    const bh=nar?14:15,colw=(W-20)/E;
    for(let e=0;e<E;e++){const x=10+e*colw;s+='<rect x="'+(x+3)+'" y="'+ey+'" width="'+(colw-6)+'" height="'+(H-ey-18)+'" fill="none" stroke="var(--line)" rx="4"/>'+tx(x+colw/2,H-5,'E'+e,{a:'middle',fs:10.5,fill:EC[e]})}
    if(i>=3)items.forEach(it=>{const x=10+it.e*colw+6,y=ey+4+(it.n-1)*(bh+2);const dr=i>=5&&it.dr;
      s+='<rect x="'+x+'" y="'+y+'" width="'+(colw-12)+'" height="'+bh+'" rx="2" fill="'+EC[it.e]+'" fill-opacity="'+(dr?0.2:0.55)+'"'+(dr?' stroke="var(--bad)" stroke-width="1.6" stroke-dasharray="3 2"':'')+'/>'+tx(x+(colw-12)/2,y+bh-3.5,(dr?'✕ ':'')+(it.j+1),{a:'middle',fs:10,fill:dr?'var(--bad)':'var(--ink)'})});
    if(i>=4){const y=ey+4+2*(bh+2)-1;s+='<line x1="10" x2="'+(W-10)+'" y1="'+y+'" y2="'+y+'" stroke="var(--ink)" stroke-dasharray="4 3"/>'}
    if(i>=5){const y=ey+4+CAP*(bh+2)-1;s+='<line x1="10" x2="'+(W-10)+'" y1="'+y+'" y2="'+y+'" stroke="var(--bad)"/>'+tx(W-12,y-3,'capacity '+CAP,{a:'end',fs:10.5,fill:'var(--bad)'})}
    el.innerHTML=svg(W,H,s,'Eight tokens routed to eight experts');
    $('rt-cap').innerHTML='<div class="t">Step '+(i+1)+' of '+STEPS.length+': '+STEPS[i][0]+'</div><p>'+STEPS[i][1]+'</p>';
    const mx=Math.max(...load),idle=load.filter(v=>!v).length,nd=items.filter(x=>x.dr).length;
    $('rt-cnt').innerHTML=RD.stat('Model',esc(D.runs[st.run].short),'layer '+(st.lay+1))+(i>=3?RD.stat('Busiest expert',mx+' of 16','max / mean '+f(mx/2,1)):'')+(i>=3?RD.stat('Idle experts',idle,'weights loaded, no work'):'')+(i>=5?RD.stat('Dropped at CF 1.25',nd+' of 16',pct(nd/16,0)):'');
  }
  const anim=RD.anim({card:'rt-anim',ctl:'rt-ctl',n:STEPS.length,draw,ms:1700,label:'Router step'});
  M.seg($('rt-run'),R8.map(k=>[k,D.runs[k].short]),st.run,m=>{st.run=m;anim.reset(STEPS.length)});
  M.seg($('rt-lay'),Array.from({length:L},(_,i)=>[String(i),'layer '+(i+1)]),'0',m=>{st.lay=+m;anim.reset(STEPS.length)});
  RD.onResize(()=>anim.redraw());
  // whole sequence coloured by first choice ------------------------------------------------------------------------
  const s2={run:st.run,lay:0,tok:null};
  function txt(){const r=D.runs[s2.run].seq,E=r.E,k=r.k,top=r.top[s2.lay];let h='';
    for(let t=1;t<D.pieces.length;t++){const e=parseInt(top[t*k],16);h+='<span data-t="'+t+'" style="background:'+EC[e]+'66"'+(t===s2.tok?' class="sel"':'')+'>'+esc(M.piece(t))+'</span>'}
    $('rt-txt').innerHTML=h;$('rt-leg').innerHTML=Array.from({length:E},(_,e)=>'<span style="--sw:'+EC[e]+'">E'+e+'</span>').join('')+'<span class="mute" style="--sw:transparent">'+esc(D.runs[s2.run].label)+', layer '+(s2.lay+1)+'</span>';
    tokInfo()}
  function tokInfo(){if(s2.tok===null){$('rt-tok').innerHTML='<span class="mute">Tap a piece of text.</span>';return}
    const r=D.runs[s2.run].seq,k=r.k,t=s2.tok;
    $('rt-tok').innerHTML='<b>'+esc(M.piece(t))+'</b> (position '+t+'): '+r.top.map((L_,l)=>'layer '+(l+1)+' &rarr; '+L_.slice(t*k,t*k+k).split('').map((c,j)=>'<span style="color:'+EC[parseInt(c,16)]+';font-weight:600">E'+parseInt(c,16)+'</span>'+(j===0?' ('+f(r.w1[l][t],2)+')':'')).join(' + ')).join('; ')}
  $('rt-txt').addEventListener('click',e=>{const sp=e.target.closest('span[data-t]');if(!sp)return;s2.tok=+sp.dataset.t;txt()});
  M.seg($('rt-run2'),RUNS.map(k=>[k,D.runs[k].short]),s2.run,m=>{s2.run=m;txt()});
  M.seg($('rt-lay2'),Array.from({length:L},(_,i)=>[String(i),'layer '+(i+1)]),'0',m=>{s2.lay=+m;txt()});
  txt();
  // specialisation ----------------------------------------------------------------------------------------------------
  const s3={run:st.run,lay:0};
  function spec(){const r=D.runs[s3.run];if(!r.special){$('rt-sp').innerHTML='';return}const sp=r.special[s3.lay];
    $('rt-det').innerHTML='<b>'+esc(r.label)+', layer '+(s3.lay+1)+'</b>: determinism '+f(sp.det,3)+' (1/'+sp.ex.length+' = '+f(1/sp.ex.length,3)+' if routing ignored the token id).';
    $('rt-sp').innerHTML=sp.ex.map((toks,e)=>'<div style="--sw:'+EC[e]+'"><b>E'+e+'</b> '+(toks.length?toks.map(t=>'<code>'+M.show(t[0])+'</code> '+pct(t[2],0)).join(', '):'<span class="mute">no first-choice tokens</span>')+'</div>').join('')}
  M.seg($('rt-run3'),RUNS.filter(k=>D.runs[k].special).map(k=>[k,D.runs[k].short]),s3.run,m=>{s3.run=m;spec()});
  M.seg($('rt-lay3'),Array.from({length:L},(_,i)=>[String(i),'layer '+(i+1)]),'0',m=>{s3.lay=+m;spec()});
  spec();
})();
