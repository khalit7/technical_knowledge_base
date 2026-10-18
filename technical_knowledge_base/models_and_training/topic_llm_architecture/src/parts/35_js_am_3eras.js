// ---- Architecture map: "Same model, two eras", one block rebuilt from the 2018 design, shift by shift ----
// Counters come from window.AMS (src/map/shifts.py); this file only draws them.
(function(){
  const A=window.AM,S=window.AMS;if(!A||!S||!A.$('am-er-svg'))return;
  const {$,esc,fmtB,fmtP}=A;
  let tg=S.targets[S.targets.length-1],anim=null;
  const segT=$('am-er-tg');
  segT.innerHTML=S.targets.map(t=>'<button data-m="'+t.id+'"'+(t===tg?' class="on"':'')+'>'+esc(t.n)+'</button>').join('');
  const lk=(t,u)=>A.link(t,u);
  function box(x,y,w,h,label,o){o=o||{};
    return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="5" fill="'+(o.fill||'var(--soft)')+'" stroke="'+(o.hot?'var(--acc)':'var(--line)')+'" stroke-width="'+(o.hot?2.2:1)+'"/>'+
      (label?'<text x="'+(x+w/2)+'" y="'+(y+h/2+4)+'" text-anchor="middle" font-size="11"'+(o.w?' font-weight="600"':'')+'>'+label+'</text>':'')}
  const wrap=(s,mc)=>{if(!s)return [];const out=[];let cur='';s.split(' ').forEach(wd=>{if(cur&&(cur+' '+wd).length>mc){out.push(cur);cur=wd}else cur=cur?cur+' '+wd:wd});if(cur)out.push(cur);return out};
  const tx=(x,y,s,o)=>{o=o||{};return '<text x="'+x+'" y="'+y+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' font-size="'+(o.fs||11)+'"'+(o.fill?' fill="'+o.fill+'"':'')+(o.w?' font-weight="600"':'')+'>'+s+'</text>'};
  function draw(i){
    const sv=tg.states[i],st=sv.st,c=sv.c,pv=i>0?tg.states[i-1].st:st,sh=tg.shape;
    const hot=k=>i>0&&JSON.stringify(st[k])!==JSON.stringify(pv[k]);
    const el=$('am-er-svg'),w=Math.min(A.width(el),470),nar=w<400;
    const xs=26,xb=62,bw=w-xb-8;
    let y=6,s='';const pre=st.norm!=='post',sand=st.norm==='sandwich';
    const normLbl=st.nt+(hot('nt')?'':'');
    // logits and final norm
    s+=box(xb-40,y,w-xb+32,22,(nar?'logits over ':'unembedding to logits over ')+A.num(sh.V)+' tokens');y+=22;const yTop=y;y+=12;
    if(pre){s+=box(xs-20,y,92,20,'final '+normLbl,{hot:hot('norm')||hot('nt')});y+=20+12}
    const yBlockTop=y;
    // ---- FFN sub-block ----
    if(!pre){s+=box(xs-20,y,92,20,normLbl+' (post)',{hot:hot('nt')});y+=20+8}
    const yAddF=y+8;s+='<circle cx="'+xs+'" cy="'+yAddF+'" r="8" fill="var(--bg)" stroke="var(--ink)"/>'+tx(xs,yAddF+4,'+',{a:'middle',fs:13});y+=20;
    if(sand){s+=box(xb,y,bw,18,'post-'+normLbl,{hot:hot('norm')});y+=18+6}
    // FFN box
    const ffTop=y;let fh;
    if(st.ffn==='moe'){
      const E=st.E,act=st.k,shd=st.sh;const cols=Math.max(8,Math.min(64,Math.floor((bw-14)/(nar?6:7))));const cs=Math.min(10,Math.floor((bw-14)/cols)-1);
      const rowsN=Math.ceil((E+shd)/cols);fh=36+rowsN*(cs+1)+20;
      s+=box(xb,y,bw,fh,'',{hot:hot('ffn')});s+=tx(xb+8,y+15,(nar?'MoE: ':'Mixture of experts: ')+E+' experts, top-'+act+(shd?' + '+shd+' shared':''),{w:1});
      for(let e=0;e<E+shd;e++){const r=Math.floor(e/cols),cc=e%cols;const isS=e<shd,isA=!isS&&e<shd+act;
        s+='<rect x="'+(xb+7+cc*(cs+1))+'" y="'+(y+24+r*(cs+1))+'" width="'+cs+'" height="'+cs+'" fill="'+(isS?'var(--am-mla)':isA?'var(--am-moe)':'var(--dim)')+'"/>'}
      s+=tx(xb+8,y+fh-7,nar?'cell = expert; orange: top-'+act+(shd?'; purple: shared':''):'one cell = one expert ('+A.num(st.de)+' wide); orange: top-'+act+(shd?'; purple: shared':''),{fs:10.5,fill:'var(--mute)'});
    }else{
      fh=50;const mx=Math.max(...tg.states.map(q=>q.st.ffn==='moe'?0:q.c.ffnP)),fw=Math.max(30,(bw-62)*c.ffnP/mx);
      s+=box(xb,y,bw,fh,'',{hot:hot('ffn')});
      s+=tx(xb+8,y+15,st.ffn==='gelu'?(nar?'GELU FFN, width ':'FFN: 2 matrices, GELU, width 4d = ')+A.num(4*sh.D):(nar?esc(st.glu)+' FFN, width ':'FFN: 3 matrices ('+esc(st.glu)+'), width ')+A.num(st.dff),{w:1});
      s+='<rect x="'+(xb+8)+'" y="'+(y+24)+'" width="'+fw+'" height="14" rx="3" fill="var(--am-dense)" opacity=".75"/>'+tx(xb+12+fw,y+35,fmtP(c.ffnP),{fs:10.5,fill:'var(--mute)'});
    }
    y+=fh+6;
    if(pre){s+=box(xb,y,bw,18,normLbl,{hot:hot('norm')||hot('nt')});y+=18+6}
    const ySplitF=y+4;y+=16;
    s+='<path d="M'+xs+' '+ySplitF+' H'+(xb-12)+' V'+(yAddF)+' H'+(xs+8)+'" fill="none" stroke="var(--mute)" stroke-width="1.3"/>';
    // ---- attention sub-block ----
    if(!pre){s+=box(xs-20,y,92,20,normLbl+' (post)',{hot:hot('nt')});y+=20+8}
    const yAddA=y+8;s+='<circle cx="'+xs+'" cy="'+yAddA+'" r="8" fill="var(--bg)" stroke="var(--ink)"/>'+tx(xs,yAddA+4,'+',{a:'middle',fs:13});y+=20;
    if(sand){s+=box(xb,y,bw,18,'post-'+normLbl,{hot:hot('norm')});y+=18+6}
    // attention box: query heads and the per-token cache drawn to scale against MHA
    const aTop=y;const mhaN=2*sh.H*sh.dh;let kvN,kvLbl;
    if(st.att==='mla'){kvN=576;kvLbl='latent 512 + RoPE key 64 = 576 numbers'}
    else{kvN=2*st.kvh*sh.dh;kvLbl=(st.kvh===sh.H?'K and V for all '+sh.H+' heads':'K and V for '+st.kvh+' shared KV heads')+' = '+A.num(kvN)+' numbers'}
    const tags=[];if(st.pos==='rope')tags.push('RoPE on q, k');if(st.qk)tags.push('QK-norm');if(st.gate)tags.push('output gate');if(st.win)tags.push(sh.nG+' global, '+(sh.L-sh.nG)+' windowed layers (W '+A.num(sh.W)+')');if(st.sink)tags.push('sink per head');
    const kw=bw-16,mc=Math.max(20,Math.floor(kw/5.9));
    const L1=wrap(tags.join(' · '),mc),L2=wrap(kvLbl+(kvN<mhaN?' (dashed: MHA '+A.num(mhaN)+')':''),mc),L3=wrap('x '+(st.hyb?sh.nG+' attention layers of '+sh.L:sh.L+' layers')+' = '+fmtB(c.kvTok)+' per token',mc),
      L4=st.hyb?wrap((sh.L-sh.nG)+' Gated DeltaNet layers: fixed '+fmtB(sh.st*2)+' state each, no growing cache',mc):[];
    const ah=24+L1.length*13+18+18+(L2.length+L3.length+L4.length)*13+6;
    s+=box(xb,y,bw,ah,'',{hot:hot('att')||hot('kvh')||hot('qk')||hot('win')||hot('hyb')||hot('pos')});
    const an=(st.att==='mla'?(nar?'MLA':'Multi-head latent attention'):st.att==='gqa'?(nar?'GQA':'Grouped-query attention'):st.att==='mqa'?(nar?'MQA':'Multi-query attention'):(nar?'MHA':'Multi-head attention'))+', '+sh.H+' query heads';
    s+=tx(xb+8,y+15,an,{w:1});let yy=y+15;
    L1.forEach(l=>{yy+=13;s+=tx(xb+8,yy,esc(l),{fs:10.5,fill:'var(--acc)'})});
    yy+=16;s+=tx(xb+8,yy,'cache per token per layer, to scale:',{fs:10.5,fill:'var(--mute)'});yy+=5;
    s+='<rect x="'+(xb+8)+'" y="'+yy+'" width="'+kw+'" height="14" rx="2" fill="none" stroke="var(--mute)" stroke-dasharray="3 2"/>';
    const kpx=Math.max(2,kw*kvN/mhaN);
    s+='<rect x="'+(xb+8)+'" y="'+yy+'" width="'+kpx+'" height="14" rx="2" fill="'+(st.att==='mla'?'var(--am-mla)':st.kvh===sh.H?'var(--am-mha)':'var(--am-gqa)')+'"/>';yy+=14;
    L2.forEach(l=>{yy+=13;s+=tx(xb+8,yy,esc(l),{fs:10.5})});
    L3.forEach(l=>{yy+=13;s+=tx(xb+8,yy,esc(l),{fs:10.5,fill:'var(--mute)'})});
    L4.forEach(l=>{yy+=13;s+=tx(xb+8,yy,esc(l),{fs:10.5,fill:'var(--am-hyb)',w:1})});
    y+=ah+6;
    if(pre){s+=box(xb,y,bw,18,normLbl,{hot:hot('norm')||hot('nt')});y+=18+6}
    const ySplitA=y+4;y+=14;
    s+='<path d="M'+xs+' '+ySplitA+' H'+(xb-12)+' V'+yAddA+' H'+(xs+8)+'" fill="none" stroke="var(--mute)" stroke-width="1.3"/>';
    const yBlockBot=y;
    s+='<rect x="'+(xs-22)+'" y="'+(yBlockTop-4)+'" width="'+(w-xs+18)+'" height="'+(yBlockBot-yBlockTop+4)+'" rx="8" fill="none" stroke="var(--line)" stroke-dasharray="5 3"/>'+
      tx(w-8,yBlockBot-4,'x '+sh.L+' layers',{a:'end',fs:10.5,fill:'var(--mute)'});
    y+=8;
    // embedding and position table
    const yEmb=y;s+=box(xs-20,y,96,22,'token embedding');
    if(st.pos==='learned'){s+=box(xs+90,y,w-xs-98,22,'+ position table '+fmtP(c.posP),{hot:false,fill:'var(--hl)'})}
    else s+=tx(xs+92,y+15,i>0&&pv.pos==='learned'?'position table removed':'no position table',{fs:10.5,fill:hot('pos')?'var(--acc)':'var(--mute)'});
    y+=22+6;
    // residual stream line
    s='<line x1="'+xs+'" x2="'+xs+'" y1="'+yTop+'" y2="'+yEmb+'" stroke="var(--ink)" stroke-width="2"/>'+s;
    el.innerHTML='<svg viewBox="0 0 '+w+' '+y+'" width="'+w+'" height="'+y+'" role="img" aria-label="'+esc(tg.n)+' block, step '+(i+1)+'">'+s+'</svg>';
    stats(i);caption(i);
    $('am-er-jump').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.m==='0'?i===0:i===tg.states.length-1));
  }
  function stats(i){
    const c=tg.states[i].c,p=i>0?tg.states[i-1].c:c;const ch=k=>i>0&&c[k]!==p[k];
    const it=(k,v,d,keys)=>'<div class="stat'+(keys.some(ch)?' chg':'')+'"><div class="k">'+k+'</div><div class="v am-num">'+v+'</div><div class="d">'+d+'</div></div>';
    $('am-er-stats').innerHTML=it('KV cache per token',fmtB(c.kvTok),'all layers, bf16',['kvTok'])+
      it('One 131,072-token sequence',fmtB(c.kvSeq),c.stB?'plus '+fmtB(c.stB)+' fixed state':'windows credited',['kvSeq','stB'])+
      it('Attention, one layer',fmtP(c.attnP),'parameters',['attnP'])+
      it('FFN, one layer',fmtP(c.ffnP),c.ffnP!==c.ffnA?fmtP(c.ffnA)+' active per token':'all active',['ffnP','ffnA'])+
      it('Norms, one layer',A.num(c.normP),'parameters',['normP'])+
      it('Position table',c.posP?fmtP(c.posP):'none',c.posP?'learned, at 131,072 positions':'RoPE has no parameters',['posP']);
    const f=tg.states[0].c,l=tg.states[tg.states.length-1].c;
    $('am-er-note').textContent='2018 block to shipped block for '+tg.n+': KV per token '+fmtB(f.kvTok)+' to '+fmtB(l.kvTok)+' ('+(f.kvTok/l.kvTok).toFixed(1)+'x smaller); one FFN layer '+fmtP(f.ffnP)+' to '+fmtP(l.ffnP)+(l.ffnP!==l.ffnA?' total, '+fmtP(l.ffnA)+' active':'')+'. Derived from config.json.';
  }
  function caption(i){
    const sv=tg.states[i],sh=S.shifts[sv.step];
    let h='<h4>Step '+(i+1)+' of '+tg.states.length+': '+esc(sh.t)+' <span class="small mute">'+esc(sh.when)+'</span></h4>';
    if(sv.step==='base')h+='<p>'+esc(sh.what)+'</p>';
    else h+='<dl><dt>Problem</dt><dd>'+esc(sh.problem)+'</dd><dt>How</dt><dd>'+esc(sh.how)+'</dd><dt>Cost</dt><dd>'+esc(sh.cost)+'</dd><dt>Check</dt><dd>'+esc(sh.check)+'</dd></dl>';
    h+='<div class="small">Sources: '+sh.src.map(s=>lk(s[0],s[1])).join(' · ')+'</div>';
    $('am-er-cap').innerHTML=h;
  }
  function setTarget(id){tg=S.targets.find(t=>t.id===id)||tg;anim.reset(tg.states.length,tg.states.length-1);
    $('am-er-jump').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.m!=='0'))}
  A.seg(segT,setTarget);
  A.seg($('am-er-jump'),m=>anim.go(m==='0'?0:tg.states.length-1));
  anim=A.anim({card:'am-er-card',ctl:'am-er-ctl',n:tg.states.length,start:tg.states.length-1,ms:2200,label:'Shift',draw:draw});
  A.onRender(()=>anim.redraw());A.onResize(()=>anim.redraw());
})();
