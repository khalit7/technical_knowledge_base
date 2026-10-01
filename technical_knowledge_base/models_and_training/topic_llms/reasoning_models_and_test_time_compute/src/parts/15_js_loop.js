// ---- Animation 2: depth through tokens, through looped layers, or through a state carried across tokens ----
(function(){
  if(!$('lp'))return;
  // Each mode is a list of rows; a row is a list of cells (one cell = one layer application, to scale) and an optional emitted token.
  // ord: an ordinary 8-layer transformer thinking in 4 tokens. loop: Huginn's (2, 4, 2) shape with the core run r = 7 times.
  // rlt: RLT's 4+4 split (4 encoder blocks, 4 decoder blocks), the final decoder state carried into the next token.
  const R=7;
  const rowsOf={
    ord:[1,2,3,4].map(t=>({cells:[1,2,3,4,5,6,7,8].map(i=>({l:''+i,k:'o'})),tok:'x'+'₁₂₃₄'[t-1]})),
    loop:(()=>{const rs=[{cells:[{l:'P1',k:'p'},{l:'P2',k:'p'}].concat([1,2,3,4].map(i=>({l:'C'+i,k:'c'}))),loop:1}];
      for(let j=2;j<=R;j++)rs.push({cells:[1,2,3,4].map(i=>({l:'C'+i,k:'c'})),off:2,loop:j});
      rs[rs.length-1].cells=rs[rs.length-1].cells.concat([{l:'K1',k:'k'},{l:'K2',k:'k'}]);rs[rs.length-1].tok='x₁';return rs})(),
    rlt:[1,2,3,4].map(t=>({cells:[1,2,3,4].map(i=>({l:'E'+i,k:'e'})).concat([1,2,3,4].map(i=>({l:'D'+i,k:'d'}))),tok:'x'+'₁₂₃₄'[t-1],carry:t<4}))};
  const S={
    ord:[['A token arrives','An ordinary transformer with 8 distinct layers. One forward pass is 8 layer applications in a row, and that is all the serial computation one token can get. Each square below is one layer application, to scale.',0],
      ['Token 1','The activations climb the 8 layers once and the model emits a token. The only way to compute more is to write something down and start again from it.',1],
      ['Token 2','The next forward pass reads token 1 back in. Depth now accumulates across tokens, but only through the text: the top-layer state of token 1 is discarded, and what crosses to token 2 is the sampled token.',2],
      ['Token 3','8 more applications, one more token of chain of thought.',3],
      ['Token 4: depth by writing','32 layer applications of serial depth (D = L × T = 8 × 4), bought with 4 tokens a monitor can read, a 4-step wait, and 4 tokens of KV cache in every layer. This is chain-of-thought reasoning.',4]],
    loop:[['A token arrives','The same 8 distinct layers, arranged as in Huginn (Geiping et al., 2025): a 2-layer prelude (P), a 4-layer recurrent core (C) and a 2-layer coda (K). The core\'s output is fed back into its own input, with the token\'s embedding re-injected each time.',0],
      ['Prelude','The prelude embeds the token into the latent space the core works in: 2 layer applications.',1],
      ['Core, loop 1','The 4 core layers run once. Instead of passing on to the coda, the result loops back to the core\'s first layer.',2],
      ['Loops 2 to 7','The same 4 layers, the same weights, six more times. Serial depth climbs with no token emitted and nothing written: the deliberation lives in activations.',3],
      ['Coda: one token','After r = 7 loops the coda decodes one token. Depth 2 + 4 × 7 + 2 = 32, the same as four tokens of chain of thought, from the same 8 layers of weights, and nothing a monitor can read. Huginn trained with a mean of 32 loops, 2 + 4 × 32 + 2 = 132 layers of depth from 8 real ones.',7]],
    rlt:[['A token arrives','RLT (Zhang, Feng and Qin, 2026) in its 4+4 split: 4 causal encoder blocks (E) supply token representations and a global key-value memory, and 4 decoder blocks (D) do the stepping. Every token still evaluates all 8 blocks.',0],
      ['Token 1','The encoder and then the decoder run once, and the model emits a token, as an ordinary model would.',1],
      ['Token 2: the state crosses','The difference: the previous token\'s final decoder state is fed into this token\'s decoder input through a gated merge. In an ordinary decoder nothing computed at the last layer of token 1 reaches the first layer of token 2; here it does, continuously, without passing through the text.',2],
      ['Token 3','The carried state has now passed through 12 decoder blocks: the path grows by 4 every token, at fixed per-token compute.',3],
      ['Token 4: unbounded temporal depth','After t tokens the state path has traversed 4t decoder blocks (48t in the report\'s tied 48+48 illustration). The tokens are still written, but part of what links them is an activation no transcript shows.',4]]};
  const fillOf={o:'var(--c6)',p:'var(--c2)',c:'var(--c1)',k:'var(--c4)',e:'var(--dim)',d:'var(--c1)'};
  const order=m=>{const out=[];rowsOf[m].forEach((r,ri)=>r.cells.forEach((c,ci)=>out.push([ri,ci])));return out};
  // number of cells done at the end of each step
  const doneAt={ord:[0,8,16,24,32],loop:[0,2,6,30,32],rlt:[0,8,16,24,32]};
  function draw(m,k,e){
    const card=$('lp'),narrow=card.clientWidth<560,P=narrow?30:44,C=P-4,RH=narrow?42:54;
    const rows=rowsOf[m],ox=narrow?8:110,top=26;
    const prev=k?doneAt[m][k-1]:0,cur=doneAt[m][k],done=prev+(cur-prev)*e,ord=order(m);
    const lit=new Set();for(let i=0;i<Math.floor(done+1e-9);i++)lit.add(ord[i].join(','));
    const head=done<ord.length&&done>0?ord[Math.min(ord.length-1,Math.floor(done))]:null;
    const W=ox+10*P+(narrow?16:70),H=top+rows.length*RH+40;let g='';
    g+='<text x="'+ox+'" y="14" font-size="10.5" fill="var(--mute)">'+(narrow?'1 square = 1 layer application':'One square = one layer application, to scale. Labels name the weights used.')+'</text>';
    let lastTok=null;
    rows.forEach((r,ri)=>{const y=top+ri*RH,off=(r.off||0);
      if(!narrow){const lab=m==='loop'?(r.loop?'loop '+r.loop:''):'token '+(ri+1);g+='<text x="'+(ox-8)+'" y="'+(y+C/2+4)+'" font-size="11" text-anchor="end" fill="var(--mute)">'+lab+'</text>'}
      r.cells.forEach((c,ci)=>{const x=ox+(off+ci)*P,on=lit.has(ri+','+ci),isHead=head&&head[0]===ri&&head[1]===ci;
        g+='<rect x="'+x+'" y="'+y+'" width="'+C+'" height="'+C*0.78+'" rx="4" fill="'+(on?fillOf[c.k]:'var(--soft)')+'" stroke="'+(isHead?'var(--ink)':'var(--line)')+'" stroke-width="'+(isHead?2:1)+'"/>';
        g+='<text x="'+(x+C/2)+'" y="'+(y+C*0.39+4)+'" font-size="'+(narrow?9:11)+'" text-anchor="middle" fill="'+(on&&c.k!=='e'?'var(--bg)':'var(--mute)')+'">'+c.l+'</text>'});
      const endX=ox+(off+r.cells.length)*P,midY=y+C*0.39;
      const rowDone=r.cells.every((c,ci)=>lit.has(ri+','+ci));
      if(r.tok&&rowDone){g+='<rect x="'+(endX+6)+'" y="'+(y-1)+'" width="'+(narrow?28:40)+'" height="'+(C*0.78+2)+'" rx="5" class="boxc"/><text x="'+(endX+6+(narrow?14:20))+'" y="'+(midY+4)+'" font-size="'+(narrow?11:13)+'" text-anchor="middle">'+r.tok+'</text>';lastTok=[endX+6,y]}
      // links to the next row
      const nr=rows[ri+1];if(nr&&rowDone){const ny=top+(ri+1)*RH,nx=ox+(nr.off||0)*P;
        if(m==='loop'){const x1=endX-P+C/2,y1=y+C*0.78,x2=nx+C/2;g+='<path d="M'+x1+' '+y1+' C'+x1+' '+(y1+18)+','+x2+' '+(ny-18)+','+x2+' '+(ny-2)+'" fill="none" stroke="var(--c1)" stroke-width="1.8" marker-end="MARK"/>'}
        else{g+='<path d="M'+(endX+(narrow?20:26))+' '+(y+C*0.78+1)+' L'+(endX+(narrow?20:26))+' '+(y+RH-6)+' L'+(nx+6)+' '+(y+RH-6)+' L'+(nx+6)+' '+(ny-1)+'" fill="none" stroke="var(--mute)" stroke-width="1.2" stroke-dasharray="3 2" marker-end="MARK"/>';
          if(m==='rlt'&&r.carry){const x1=ox+7*P+C/2,y1=y+C*0.78,x2=ox+4*P+C/2;g+='<path d="M'+x1+' '+y1+' C'+x1+' '+(y1+20)+','+x2+' '+(ny-20)+','+x2+' '+(ny-2)+'" fill="none" stroke="var(--c4)" stroke-width="2.4" marker-end="MARK"/>'}}}
    });
    if(m==='loop'&&!narrow)g+='<text x="'+(ox+2*P)+'" y="'+(top+rows.length*RH+8)+'" font-size="10.5" fill="var(--mute)">the same 4 core layers on every row</text>';
    const leg=m==='ord'?[['o','layers 1 to 8'],['tok','emitted token']]:m==='loop'?[['p','prelude'],['c','recurrent core'],['k','coda'],['tok','emitted token']]:[['e','encoder'],['d','decoder'],['st','carried state'],['tok','emitted token']];
    let lx=ox,ly=H-10;leg.forEach(([c,l])=>{const lw=l.length*5.8+28;if(lx+lw>W){lx=ox;ly+=13}
      g+=c==='st'?'<line x1="'+lx+'" x2="'+(lx+12)+'" y1="'+(ly-4)+'" y2="'+(ly-4)+'" stroke="var(--c4)" stroke-width="2"/>':'<rect x="'+lx+'" y="'+(ly-9)+'" width="11" height="10" rx="2" '+(c==='tok'?'class="boxc"':'fill="'+fillOf[c]+'"')+'/>';
      g+='<text x="'+(lx+16)+'" y="'+ly+'" font-size="10.5" fill="var(--mute)">'+l+'</text>';lx+=lw});
    $('lpSvg').innerHTML=svgEl(W,H+(narrow?14:0),g,'Layer applications for one mode of spending depth');
    const s=S[m][k];$('lpStep').textContent='Step '+(k+1)+' of '+S[m].length+': '+s[0];$('lpCap').textContent=s[1];
    const nd=Math.floor(done+1e-9),toks=m==='loop'?(nd>=32?1:0):Math.floor(nd/8);
    const path=m==='ord'?Math.min(8,nd-8*Math.max(0,Math.ceil(nd/8)-1)):m==='loop'?nd:(()=>{const t=Math.ceil(nd/8)||0,inTok=nd-8*(t-1);return t?4*(t-1)+Math.max(0,inTok-4):0})();
    $('lpCnt').innerHTML=stat('Layer applications',fmt(nd),'serial compute spent so far')+
      stat('Distinct layer weights','8','the same parameters in every mode')+
      stat('Tokens written',fmt(toks),m==='loop'?'depth without emitting':'each one readable text')+
      stat('Longest continuous path',fmt(Math.max(0,path))+' layers',m==='ord'?'resets at every token':m==='loop'?'one token, looped core':'grows 4 a token');
  }
  makeAnim({card:'lp',pre:'lp',mode:'ord',n:m=>S[m].length,dur:(m,k)=>{const d=doneAt[m];return k?2200+(d[k]-d[k-1])*180:2600},draw});
})();
