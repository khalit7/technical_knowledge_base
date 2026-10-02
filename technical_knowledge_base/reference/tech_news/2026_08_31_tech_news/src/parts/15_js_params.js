// ---- The week's models counted every way: headline against checkpoint parameters, then bytes at a precision ----
(function(){
  const card=$('v-params');if(!card)return;
  // B = billions. ship = number formats in the Hugging Face checkpoint (billions of values per format); act = active per token (null: not stated)
  const BY={BF16:2,F32:4,F8:1,U8:1,I8:1};
  const MD=[
    {n:'GLM-5.3-Flash',head:320,act:18,ck:321.323,ship:{F8:314.397,BF16:6.926,F32:0.0003},pub:[305.7,'GiB','about 306 GiB (MarkTechPost, FP8 checkpoint)'],id:'i-glm-flash',tab:'t-top'},
    {n:'Qwen3.8-Flash-Next',head:125,act:6,ck:180.000,ship:{BF16:180.000},pub:[360.0,'GB','360 GB (the Hugging Face repository)'],extra:'+51B n-gram, +4B MTP',id:'i-qwen-next',tab:'t-models'},
    {n:'Tencent Hy4 preview',head:770,act:49,ck:779.961,ship:{BF16:779.930,F32:0.031},pub:[1560,'GB','"roughly 1.56TB" (the issue)'],id:'i-hy4',tab:'t-models'},
    {n:'DeepSeek-V4-Pro-0813',head:1600,act:49,ck:1650.498,shipGB:941.1,shipNote:'Nvidia\'s NVFP4 build: repository size, not computed',id:'i-nvfp4',tab:'t-models'},
    {n:'Apodex 1.1 Mini',head:35,act:null,ck:35.952,ship:{BF16:35.952},id:'i-apodex',tab:'t-research'},
    {n:'Cohere Parse 5',head:2.3,act:2.3,ck:null,ship:{BF16:2.3},pub:[4.6,'GB','about 4.6 GB (Cohere docs)'],note:'served by Cohere, weights not published',id:'i-parse5',tab:'t-models'},
    {n:'DFlash 2 drafter',head:null,act:1.924,ck:1.924,ship:{BF16:1.924},id:'i-dflash2',tab:'t-models'}];
  let cnt='head',prec='ship';
  const lg=Math.log10,LO=1,HI=2000;
  const gb=(m,p)=>{const N=cnt==='ckpt'&&m.ck?m.ck:(m.head||m.ck);
    if(p==='ship')return m.shipGB||Object.entries(m.ship).reduce((a,[k,v])=>a+v*BY[k],0);
    return N*(p==='bf16'?2:p==='fp8'?1:4.5/8)};
  const fmtGB=v=>v>=1000?fmt(v/1000,2)+' TB':v>=10?fmt(v,0)+' GB':fmt(v,1)+' GB';
  function draw(){
    const W=boxW($('pmSvg'),340),narrow=W<560,lw=narrow?10:150,pr=narrow?12:56,rh=narrow?54:28,top=8,H=top+MD.length*rh+30;
    const X=v=>lw+(W-lw-pr)*(lg(v)-lg(LO))/(lg(HI)-lg(LO));let s='';
    [1,2,5,10,20,50,100,200,500,1000,2000].forEach(v=>{const show=!narrow||[1,10,100,1000].includes(v);s+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+top+'" y2="'+(top+MD.length*rh)+'" stroke="var(--line)"'+(show?'':' opacity=".5"')+'/>'+(show?'<text x="'+X(v)+'" y="'+(top+MD.length*rh+14)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+(v>=1000?v/1000+'T':v+'B')+'</text>':'')});
    s+='<text x="'+((lw+W-pr)/2)+'" y="'+(H-2)+'" font-size="11" text-anchor="middle" fill="var(--mute)">parameters, log scale</text>';
    MD.forEach((m,r)=>{const yb=top+r*rh,y=yb+(narrow?24:rh/2);const N=cnt==='ckpt'?(m.ck||m.head):(m.head||m.ck);
      s+=narrow?'<text x="0" y="'+(yb+12)+'" font-size="12" font-weight="600">'+escH(m.n)+(cnt==='ckpt'&&!m.ck?' (no public checkpoint)':'')+'</text>':'<text x="'+(lw-8)+'" y="'+(y+4)+'" font-size="12" text-anchor="end">'+escH(m.n)+'</text>';
      if(m.act&&N&&m.act<N)s+='<line x1="'+X(m.act)+'" x2="'+X(N)+'" y1="'+y+'" y2="'+y+'" stroke="var(--c2)" stroke-width="5" opacity=".35"/>';
      if(N)s+='<rect x="'+(X(N)-2)+'" y="'+(y-8)+'" width="4" height="16" fill="var(--c2)"><title>'+escH(m.n)+': '+fmt(N,N<10?2:1)+'B '+(cnt==='ckpt'?'in the checkpoint':'headline')+'</title></rect>';
      if(m.act)s+='<circle cx="'+X(m.act)+'" cy="'+y+'" r="5" fill="var(--c1)"><title>active per token: '+m.act+'B</title></circle>';
      const lab=(N?fmt(N,N<10?2:N<100?1:0)+'B':'')+(m.act&&m.act<(N||0)?', '+m.act+'B active':'')+(cnt==='ckpt'&&m.extra?' ('+m.extra+')':'');
      if(narrow)s+='<text x="'+lw+'" y="'+(y+20)+'" font-size="11" fill="var(--mute)">'+escH(lab)+'</text>';
      else{const lx=X(N||m.act)+8,fits=lx+lab.length*6.1<W;s+='<text x="'+(fits?lx:X(m.act||N)-8)+'" y="'+(y+4)+'" font-size="11" text-anchor="'+(fits?'start':'end')+'" fill="var(--mute)">'+escH(lab)+'</text>'}});
    $('pmSvg').innerHTML='<div class="small mute" style="margin:2px 0 4px">Bar: total parameters ('+(cnt==='ckpt'?'as stored in the checkpoint':'as headlined')+'); dot: active per token; the shaded span is what a token leaves unused</div>'+svgEl(W,H,s,'Parameters per model');
    // bytes: log-scaled bars, labelled
    const rows=MD.map(m=>{const v=gb(m,prec);return {m,v}});
    $('pmBytes').innerHTML='<div class="small mute">Weights to store, '+(prec==='ship'?'in the formats each checkpoint ships':prec==='bf16'?'at 2 bytes per parameter':prec==='fp8'?'at 1 byte per parameter':'at 4.5 bits per parameter')+(prec!=='ship'?', from the '+(cnt==='ckpt'?'checkpoint':'headline')+' count':'')+' (bar length on a log scale)</div>'+
      rows.map(({m,v})=>{const w=Math.max(2,100*(lg(v)-lg(1))/(lg(2000)-lg(1)));const pub=prec==='ship'&&m.pub?' · published: '+m.pub[2]:'';const gib=prec==='ship'&&m.pub&&m.pub[1]==='GiB'?' = '+fmt(v*1e9/2**30,1)+' GiB':'';
        return '<div class="sr"><span class="nm">'+escH(m.n)+'</span><span class="bar"><span style="width:'+w.toFixed(1)+'%;background:var(--c2)"></span></span><span class="st">'+fmtGB(v)+gib+(prec==='ship'&&m.shipNote?' ('+m.shipNote+')':'')+pub+'</span></div>'}).join('');
    const per=p=>p==='fp8'?1:p==='fp4'?4.5/8:2;
    const pq=prec==='ship'?'bf16':prec;
    $('pmStats').innerHTML=stat('Qwen3.8-Flash-Next, headline against stored','125B against 180B','+44%: the n-gram embeddings are stored, though a token looks up only a few of them')+
      stat('Share of parameters active per token','GLM 5.6% · Qwen 4.8% · Hy4 6.4% · DeepSeek 3.1%','active / headline total')+
      stat('Weights read per token at '+(pq==='bf16'?'BF16':pq==='fp8'?'FP8':'NVFP4'),'GLM '+fmt(18*per(pq),0)+' GB · Qwen '+fmt(6*per(pq),0)+' GB · Hy4 '+fmt(49*per(pq),0)+' GB','active parameters x bytes: the memory traffic behind each decoding step at batch 1')+
      stat('NVFP4 check (DeepSeek-V4-Pro-0813)','928 GB computed, 941 GB shipped','1,650.5B x 4.5 bits; the real build keeps some layers at 8 and 16 bits');
  }
  [['pmC',v=>cnt=v],['pmP',v=>prec=v]].forEach(([id,f])=>{const seg=$(id);seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});f(b.dataset.m);draw()}))});
  let rw=card.clientWidth;addEventListener('resize',()=>{const w=card.clientWidth;if(w&&w!==rw){rw=w;draw()}});
  onTab(card.closest('.tab').id,draw);draw();
})();
