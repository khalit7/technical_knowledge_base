// ---- Reading section 1: one step for Orca's four requests, tensor batching against selective batching ----
(function(){
  const el=document.getElementById('bk-sb-svg');if(!el)return;
  const COL=['var(--c1)','var(--c2)','var(--c3)','var(--c4)'];
  // Orca Figure 4/5: x1 decoding (x11 x12 prompt, x13 generated, x14 new), x2 decoding (x21 prompt, x22 new),
  // x3 prompt x31 x32, x4 prompt x41 x42 x43. New tokens this step: 7. Outputs: x15, x23, x33, x44.
  const R=[
    {nm:'x1',st:'decoding',toks:[['x11','p'],['x12','p'],['x13','g'],['x14','n']],out:'x15'},
    {nm:'x2',st:'decoding',toks:[['x21','p'],['x22','n']],out:'x23'},
    {nm:'x3',st:'new prompt',toks:[['x31','np'],['x32','np']],out:'x33'},
    {nm:'x4',st:'new prompt',toks:[['x41','np'],['x42','np'],['x43','np']],out:'x44'}];
  const SEL=[
    ['The request pool','Four requests in four states. x1 and x2 each need one new token computed (x14, x22) on top of what is cached; x3 and x4 have just arrived with 2- and 3-token prompts. Seven token rows need computing in this step.'],
    ['Stack every new token','Selective batching stacks the seven rows into one matrix of shape [7, H], with no padding and no batch dimension. Non-attention layers do not care which request a row belongs to.'],
    ['QKV projection: one read of the weights','The query, key and value projections run once on all seven rows. The weights stream from memory once for the whole step; that is the saving batching is for.'],
    ['Split for attention','Attention is the only place requests must stay apart: each request\'s rows attend to its own keys and values, the cached ones (x11 to x13 for x1, x21 for x2) plus those just computed. Orca ran one attention call per request; vLLM now does all four in one variable-length kernel call.'],
    ['Merge back','The four attention outputs are stacked into [7, H] again.'],
    ['Output projection and MLP: one more read','The rest of the layer runs on all seven rows at once, again one read of each weight matrix. (Every layer of the model repeats steps 3 to 6.)'],
    ['Sample one token per request','Only each request\'s last row produces a token: x15, x23, x33 and x44. x3 and x4 got their first token in the same step that x1 and x2 continued: none of them waited for the others.']];
  const CAN=[
    ['The request pool','The same four requests. A system that batches [batch, length, hidden] tensors needs every request in a batch to have the same number of new tokens at the same position.'],
    ['Group by shape','x3 and x4 have different prompt lengths (2 and 3), x1 and x2 decode at different positions (4 and 2), and prompts and decodes differ in length. No two of them match, so the step falls apart into four separate runs (Orca, section 3, the three cases of challenge C2). Padding to [4, 3, H] would add 5 empty rows and still mix positions.'],
    ['Run x1 alone','One token row through the whole layer: the weights stream from memory for a single token.'],
    ['Run x2 alone','Another full read of the weights for one row.'],
    ['Run x3 alone','A third read, for two rows.'],
    ['Run x4 alone','A fourth read, for three rows.'],
    ['Same four tokens, four times the weight traffic','The outputs are the same x15, x23, x33 and x44, after four reads of the weights instead of one. In practice such systems did not even try: they waited until a whole batch finished (static batching).']];
  let mode='sel';
  function draw(i){
    const W=Math.max(320,Math.min(860,RD.width(el))),s=W<480?13:16,lh=s+26,top=24;
    const lx=W<480?62:84, sx=Math.round(W*0.56), wx=Math.round(W*0.80), H=top+4*lh+30;
    let b='';
    const box=(x,y,w,h,f,st,o)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="2" fill="'+f+'"'+(st?' stroke="'+st+'" stroke-width="'+(o||1.5)+'"':'')+'/>';
    const steps=mode==='sel'?SEL:CAN;
    b+=RD.t(4,14,'requests (cached tokens, new tokens)',{fs:11,fill:'var(--mute)'});
    // weights block
    let wOn=(mode==='sel'&&(i===2||i===5))||(mode==='can'&&i>=2&&i<=5);
    b+=box(wx,top,Math.min(70,W-wx-6),4*lh-8,wOn?'var(--acc2)':'var(--soft)',wOn?'var(--acc)':'var(--line)',wOn?2:1);
    b+=RD.t(wx+Math.min(70,W-wx-6)/2,top+2*lh-4,'layer',{a:'middle',fs:11});b+=RD.t(wx+Math.min(70,W-wx-6)/2,top+2*lh+10,'weights',{a:'middle',fs:11});
    const runOne=mode==='can'&&i>=2&&i<=5?i-2:-1;
    R.forEach((r,k)=>{
      const y=top+k*lh;
      const dim=runOne>=0&&runOne!==k;
      b+='<g opacity="'+(dim?0.3:1)+'">';
      b+=RD.t(4,y+s-2,r.nm,{fs:12,w:600});b+=RD.t(4,y+s+10,r.st,{fs:9.5,fill:'var(--mute)'});
      r.toks.forEach((t,j)=>{
        const x=lx+j*(s+3),kind=t[1];
        const isNew=kind==='n'||kind==='np';
        const fill=kind==='p'||kind==='np'?'color-mix(in srgb,'+COL[k]+' 35%,var(--bg))':'var(--soft)';
        const hist=mode==='sel'&&i===3;
        b+=box(x,y,s,s,fill,isNew?COL[k]:(hist?'var(--acc)':'var(--line)'),isNew?2:(hist?2:1));
        if(W>=480)b+=RD.t(x+s/2,y+s+10,t[0],{a:'middle',fs:8.5,fill:'var(--mute)'});
      });
      if(i===6){const x=lx+r.toks.length*(s+3);b+=box(x,y,s,s,'var(--open2)','var(--good)',2);b+=RD.t(x+s/2,y+s+11,r.out,{a:'middle',fs:9,fill:'var(--good)'})}
      if(runOne===k){b+='<line x1="'+(lx+r.toks.length*(s+3)+4)+'" y1="'+(y+s/2)+'" x2="'+(wx-4)+'" y2="'+(y+s/2)+'" stroke="var(--acc)" stroke-width="2" marker-end="url(#bkArr)"/>'}
      if(mode==='sel'&&i===3){const ax=lx+r.toks.length*(s+3)+6;b+=box(ax,y-2,W<480?30:38,s+4,'var(--hl)','var(--line)');b+=RD.t(ax+(W<480?15:19),y+s-2,'attn',{a:'middle',fs:10})}
      b+='</g>';
    });
    // stacked tensor
    if(mode==='sel'&&i>=1&&i<=5&&i!==3){
      const rows=[];R.forEach((r,k)=>r.toks.forEach(t=>{if(t[1]==='n'||t[1]==='np')rows.push(k)}));
      const h=Math.min(s,Math.floor((4*lh-14)/7))-2,y0=top+4;
      rows.forEach((k,j)=>{b+=box(sx-20,y0+j*(h+2),40,h,'color-mix(in srgb,'+COL[k]+' 55%,var(--bg))',null)});
      b+=RD.t(sx,y0+7*(h+2)+12,'[7, H]',{a:'middle',fs:11,fill:'var(--mute)'});
      if(i===2||i===5)b+='<line x1="'+(sx+22)+'" y1="'+(y0+3.5*(h+2))+'" x2="'+(wx-4)+'" y2="'+(y0+3.5*(h+2))+'" stroke="var(--acc)" stroke-width="2" marker-end="url(#bkArr)"/>';
    }
    const defs='<defs><marker id="bkArr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--acc)"/></marker></defs>';
    el.innerHTML=RD.svg(W,H,defs+b,'Orca selective batching example');
    document.getElementById('bk-sb-cap').innerHTML='<div class="t">'+(i+1)+'. '+steps[i][0]+'</div><p>'+steps[i][1]+'</p>';
    const reads=mode==='sel'?(i<2?0:(i<5?1:2)):(i<2?0:Math.min(4,i-1));
    const passes=mode==='sel'?(i>=2?1:0):Math.max(0,Math.min(4,i-1));
    document.getElementById('bk-sb-cnt').innerHTML=RD.stat('Weight reads per layer',mode==='sel'?(reads+' (QKV, then the rest)'):(reads+' of 4'))+RD.stat('Forward passes for this step',mode==='sel'?(passes?'1':'0'):String(passes))+RD.stat('Token rows computed','7')+RD.stat('Tokens per pass',mode==='sel'?'7':'1.75 on average');
  }
  const an=RD.anim({card:'bk-sb-card',ctl:'bk-sb-ctl',n:7,draw:draw,ms:2200,label:'Step'});
  RD.seg(document.getElementById('bk-sb-mode'),m=>{mode=m;an.reset(7)});
  RD.onResize(()=>an.redraw());
})();
