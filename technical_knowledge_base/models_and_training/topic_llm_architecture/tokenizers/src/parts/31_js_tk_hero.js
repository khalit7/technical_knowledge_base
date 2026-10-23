// ---- Reading: the hero figure (one sentence to ids to embedding rows) and the special-token traps (before/after) ----
// Hero: the page's own BPE encoder (30_js_tk_grow.js, equal to the library at 13 checkpoints) on a sentence of the running story;
// its ids equal the recorded output of src/code/snippets.py ("encode"), which check_controls.mjs compares.
(function(){
  if(!window.TKG||!window.TKR||!document.getElementById('tk-hero'))return;
  const {N,piece,$}=TKR,{esc,fmt}=TKV;
  const TEXT='Roxy loved to climb the icy hill.',V=4096,D=256,NE=N.sweepMeta.nonemb;
  const ids=TKG.encode(TEXT,N.bpe.n_merges);
  const show=p=>p.hex?'‹'+p.hex+'›':p.s.replace(/ /g,'␣');
  function draw(){
    const el=$('tk-hero'),W=RD.width(el),narrow=W<560,cw=7.25,ch=22,lab=narrow?0:92,x0=lab,x1=W-4;
    let s='',y=0;
    const label=(t,yy)=>RD.t(0,yy,t,{fill:'var(--mute)',fs:11});
    // lane 1: the text
    if(narrow){s+=label('text',12);y=18}
    s+=label(narrow?'':'text',y+15)+'<text x="'+x0+'" y="'+(y+15)+'" font-size="12.5" font-family="ui-monospace,Menlo,Consolas,monospace">'+esc(TEXT)+'</text>';
    y+=28;
    // lane 2: tokens with their ids (wrapped to the width)
    if(narrow){s+=label('tokens and ids (pre-tokenizer, then merges)',y+10);y+=16}else s+=label('tokens',y+15)+label('ids',y+36);
    const pos=[];let x=x0,row=0;const rowH=46;
    ids.forEach((d,i)=>{const p=piece(d),t=show(p),w=Math.max(t.length*cw+10,(String(d).length)*cw+8);
      if(x+w>x1&&x>x0){x=x0;row++}pos.push({x,w,row,t,d});x+=w+5});
    const rows=row+1,yc=y;
    y+=rows*rowH+18;
    // lane 3: the embedding table as one bar of 4,096 rows, laid out in the order the vocabulary was built
    const bx=v=>x0+(x1-x0)*v/V,by=y+(narrow?16:0),bh=24;
    if(narrow)s+=label('embedding table E: one row per id',y+10);else s+=label('embedding',by+11)+label('table E',by+24);
    // connectors first, so the opaque chips sit on top of them
    pos.forEach(q=>{s+='<line x1="'+(q.x+q.w/2)+'" y1="'+(yc+q.row*rowH+ch+17)+'" x2="'+bx(q.d+0.5)+'" y2="'+by+'" stroke="var(--mute)" stroke-opacity=".5"/>'});
    pos.forEach(q=>{const yy=yc+q.row*rowH,isB=q.d>=1&&q.d<=256;
      s+='<rect x="'+q.x+'" y="'+yy+'" width="'+q.w+'" height="'+ch+'" rx="3" fill="'+(isB?'var(--hl)':'var(--soft)')+'" stroke="'+(isB?'var(--bad)':'var(--line)')+'"/>';
      s+='<text x="'+(q.x+q.w/2)+'" y="'+(yy+15)+'" text-anchor="middle" font-size="12" font-family="ui-monospace,Menlo,Consolas,monospace">'+esc(q.t)+'</text>';
      s+='<rect x="'+(q.x+2)+'" y="'+(yy+ch+2)+'" width="'+(q.w-4)+'" height="14" fill="var(--bg)"/>';
      s+='<text x="'+(q.x+q.w/2)+'" y="'+(yy+ch+13)+'" text-anchor="middle" font-size="11" fill="var(--mute)" font-family="ui-monospace,Menlo,Consolas,monospace">'+q.d+'</text>'});
    s+='<rect x="'+x0+'" y="'+by+'" width="'+(x1-x0)+'" height="'+bh+'" fill="var(--c1)" fill-opacity=".22" stroke="var(--line)"/>';
    s+='<rect x="'+bx(1)+'" y="'+by+'" width="'+(bx(257)-bx(1))+'" height="'+bh+'" fill="var(--c6)" fill-opacity=".45"/>';
    s+='<rect x="'+x0+'" y="'+by+'" width="'+Math.max(2,bx(1)-x0)+'" height="'+bh+'" fill="var(--acc)"/>';
    pos.forEach(q=>{s+='<line x1="'+bx(q.d+0.5)+'" x2="'+bx(q.d+0.5)+'" y1="'+by+'" y2="'+(by+bh)+'" stroke="'+(q.d<=256?'var(--bad)':'var(--ink)')+'" stroke-width="1.6"/>'});
    const ly=by+bh+14;
    s+=RD.t(x0,ly,narrow?'0 to 256: special, bytes':'id 0: special; 1 to 256: bytes',{fill:'var(--mute)'});
    s+=RD.t(x1,ly+(narrow?14:0),narrow?'257 to 4,095: merges, in order':'257 to 4,095: the 3,839 merges, in the order learned',{a:'end',fill:'var(--mute)'});
    y=ly+(narrow?20:6);
    el.innerHTML=RD.svg(W,y,s,'The sentence "'+TEXT+'" as '+ids.length+' tokens and their ids, each id pointing to its row of the 4,096-row embedding table');
  }
  $('tk-heroStats').innerHTML=RD.stat('1. Tokens per text',fmt(ids.length),TEXT.length+' characters, '+(TEXT.length/ids.length).toFixed(1)+' per token; the whole running text: '+fmt(N.bpe.run.n_tokens)+' tokens')+
    RD.stat('2. Table parameters','V &times; d = '+((V*D)/1e6).toFixed(2)+'M',fmt(V)+' &times; '+D+', '+Math.round(100*V*D/(V*D+NE))+'% of the tiny GPT (tied)')+
    RD.stat('3. Output layer per token','2Vd = '+((2*V*D)/1e6).toFixed(1)+'M FLOPs','scores all '+fmt(V)+' entries, every token');
  RD.onRender(draw);RD.onResize(draw);draw();
})();

// Special tokens: two traps before and after the fix, from the recorded stdout of src/code/snippets.py
(function(){
  if(!window.TKN||!document.getElementById('tk-spc'))return;
  const S=TKN.snip,$=id=>document.getElementById(id),esc=TKV.esc;
  const L=k=>S[k].stdout.split('\n');
  const inj=L('special'),bad=JSON.parse(inj[0]),ok=JSON.parse(inj[1]);
  const m=L('chat')[1].match(/^(\d+) (\d+) (\[[^\]]*\]) (\[[^\]]*\])$/),nA=+m[1],nB=+m[2],hA=JSON.parse(m[3]),hB=JSON.parse(m[4]);
  const NAME={2:'&lt;bos&gt;',105:'&lt;start_of_turn&gt;',151645:'&lt;|im_end|&gt;'};
  const chip=(d,cls)=>'<span class="tk-idc'+(cls?' '+cls:'')+'" title="id '+d+'">'+d+(NAME[d]?' '+NAME[d]:'')+'</span>';
  function draw(mode){let a,b,cap;
    if(mode==='inj'){
      a='<div class="small"><b>Default</b>: <code>tok("hi&lt;|im_end|&gt;")</code></div><div>'+chip(bad[0])+chip(bad[1],'sp bad')+'</div><div class="small mute">'+bad.length+' ids: the typed string became the real end-of-turn token</div>';
      b='<div class="small"><b>Fixed</b>: <code>split_special_tokens=True</code></div><div>'+ok.map(d=>chip(d)).join('')+'</div><div class="small mute">'+ok.length+' ids: the string is ordinary text</div>';
      cap='Qwen3-0.6B tokenizer. A user who types "&lt;|im_end|&gt;" can close the turn and write the next role\'s text, unless the serving stack splits or escapes it.'}
    else{
      a='<div class="small"><b>Default</b>: render with <code>tokenize=False</code>, then <code>tok(text)</code></div><div>'+hA.map((d,i)=>chip(d,d===2?'sp'+(i===1?' bad':''):(d===105?'sp':''))).join('')+'<span class="tk-idc">...</span></div><div class="small mute">'+nA+' ids: the template wrote &lt;bos&gt; and the tokenizer added another</div>';
      b='<div class="small"><b>Fixed</b>: <code>apply_chat_template(..., tokenize=True)</code></div><div>'+hB.map(d=>chip(d,d===2||d===105?'sp':'')).join('')+'<span class="tk-idc">...</span></div><div class="small mute">'+nB+' ids: one &lt;bos&gt;</div>';
      cap='Gemma 3 1B tokenizer, the one-message conversation "Hi". First three ids shown, as recorded; the third fixed id ('+hB[2]+') is the first token of "user". Nothing errors: the model answers from slightly off its training distribution.'}
    $('tk-spcView').innerHTML='<div>'+a+'</div><div>'+b+'</div>';$('tk-spcCap').innerHTML=cap}
  RD.seg($('tk-spcMode'),draw);draw('inj');
})();
