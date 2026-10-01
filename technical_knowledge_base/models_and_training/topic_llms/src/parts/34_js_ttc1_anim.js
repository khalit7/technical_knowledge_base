// ---- Deeper: test-time compute. Two step animations: one chain against five, and depth by writing, looping or carrying state ----
(function(){
const T=window.TTC;if(!T)return;
const {$,fmt,fmtBytes,mulberry32,segBind,svgEl,stat,sci,A,logFrame,lineChart,legend,n3,pc1,TM,makeAnim,onTab}=T;
// ---- Animation 1: one problem, one long chain against five parallel samples (vote or verifier) ----
(function(){
  if(!$('ttcSp'))return;
  // Illustrative model and budget, the Mechanism section's: 60 layers, 8 KV heads of 128 in BF16, 50 tokens a second.
  const L=60,KVB=2*60*8*128*2,TPS=50,U=250,BUD=10000; // one square = 250 tokens
  // serial trace: phases [from,to,label,colour]
  const SER=[[0,3500,'attempt 1','c1'],[3500,4500,'"Wait": re-check','c5'],[4500,8000,'attempt 2','c1'],[8000,9500,'verify','c3'],[9500,10000,'answer','c4']];
  const ANS=[384,412,384,97,384],LEN=2000; // five samples of 2,000 tokens each, answers illustrative
  const S={
    ser:[['The problem arrives','One prompt, one sequence. The model will spend the whole budget, 10,000 tokens, on a single chain. Each token is one full forward pass through all 60 layers, conditioned on everything written so far.',0,0],
      ['Attempt 1','The first 3,500 tokens work the problem and reach a candidate answer, 412. Every token adds 240 KiB of keys and values to the cache, because every later token must be able to attend to it.',0,3500],
      ['Re-check ("Wait")','The model rereads its own working, finds a step that contradicts an earlier one, and backs up. Only a sequential chain can do this: the later tokens see the earlier ones.',3500,4500],
      ['Attempt 2','A second line of attack from the corrected step, 3,500 more tokens. Nothing here can run in parallel: token 6,000 cannot start before token 5,999 exists.',4500,8000],
      ['Verify, then answer','The model substitutes its result back into the problem, then commits to 384. 10,000 tokens at an illustrative 50 tokens a second is 200 seconds before the answer starts. How likely the answer is to be right has no formula: it depends on how well the model revises.',8000,10000]],
    vote:[['The problem arrives, five times','The same prompt is sampled five times, independently and at a temperature above zero, so the five chains take different paths. The budget is the same 10,000 tokens, split 5 × 2,000.',0,0],
      ['Five chains at once','All five generate simultaneously. Wall-clock time follows the longest chain, not the total: 1,000 tokens each is 20 seconds, whatever the number of chains, given the hardware.',0,1000],
      ['Five answers','At 2,000 tokens (40 seconds) each chain commits: 384, 412, 384, 97, 384. No chain saw another, so chain 2\'s mistake was never corrected; it can only be outvoted.',1000,2000],
      ['Majority vote','The most common final answer wins: 384, three votes of five. Voting needs answers in a comparable form (a number, a choice), which is why it works for mathematics and not for essays.',2000,2000],
      ['What the vote is worth','If each chain is right with p = 0.6 and the wrong ones all agree on one answer, a five-vote is right 68.3% of the time; if wrong answers scatter over four values, 83.5%. With p below the strongest wrong answer, more votes make it worse (Sampling lab below).',2000,2000]],
    ver:[['The problem arrives, five times','The same prompt is sampled five times, independently, with the same 10,000-token budget split 5 × 2,000. This time a checker exists: unit tests, a proof checker, or a reference answer.',0,0],
      ['Five chains at once','All five generate simultaneously: 1,000 tokens each after 20 seconds.',0,1000],
      ['Five answers','At 2,000 tokens each (40 seconds) the chains commit: 384, 412, 384, 97, 384.',1000,2000],
      ['The verifier checks each','Only answers the checker accepts survive (384, three times); the selector needs just one. It is correct by construction on the property it checks, so a larger sample can only help.',2000,2000],
      ['What the verifier is worth','The chance that at least one of five is right is pass@5 = 1 − (1 − 0.6)⁵ = 0.990 at p = 0.6. A learned reward model in the checker\'s place is weaker: a larger sample is also a larger search for its errors (Sampling lab below).',2000,2000]]};
  const col={c1:'var(--c1)',c3:'var(--c3)',c4:'var(--c4)',c5:'var(--c5)'};
  function draw(m,k,e){
    const narrow=$('ttcSp').clientWidth<560,steps=S[m],s=steps[k];
    const pitch=narrow?7.6:16,cs=pitch-2,x0=narrow?8:70,W=narrow?Math.max(340,x0+40*pitch+12):x0+40*pitch+170,laneH=narrow?14:22;
    const par=m!=='ser',lanes=par?5:1,top=34,H=top+lanes*(laneH+6)+(narrow?96:44);let g='';
    // time axis: 0 to 200 s, one square = 250 tokens = 5 s at 50 tokens a second
    for(let t=0;t<=200;t+=50){const x=x0+t/5*pitch;g+='<line x1="'+x+'" x2="'+x+'" y1="'+(top-6)+'" y2="'+(top+lanes*(laneH+6))+'" stroke="var(--line)"/><text x="'+x+'" y="'+(top-10)+'" font-size="10" text-anchor="middle" fill="var(--mute)">'+t+' s</text>'}
    g+='<text x="'+x0+'" y="12" font-size="10.5" fill="var(--mute)">'+(narrow?'Wall-clock time; 1 square = 250 tokens':'Wall-clock time at 50 tokens a second (illustrative). One square = 250 tokens, to scale.')+'</text>';
    const upto=s[2]+(s[3]-s[2])*e; // tokens generated per chain so far
    let tok=0;
    if(!par){
      if(!narrow)g+='<text x="'+(x0-6)+'" y="'+(top+laneH/2+4)+'" font-size="11" text-anchor="end">1 chain</text>';
      for(let i=0;i<BUD/U;i++){const a=i*U;if(a>=upto)break;const ph=SER.find(p=>a>=p[0]&&a<p[1]);const fill=Math.min(1,(upto-a)/U);
        g+='<rect x="'+(x0+i*pitch+1)+'" y="'+(top+1)+'" width="'+(cs*fill).toFixed(2)+'" height="'+(laneH-2)+'" rx="2" fill="'+col[ph[3]]+'"/>'}
      tok=upto;
      // phase labels under the lane
      if(!narrow)SER.forEach(p=>{if(upto>p[0]){const xa=x0+p[0]/U*pitch,xb=x0+p[1]/U*pitch;g+='<text x="'+((xa+xb)/2)+'" y="'+(top+laneH+14)+'" font-size="10" text-anchor="middle" fill="var(--mute)">'+p[2]+'</text>'}});
      if(k===4&&e>=1){const x=x0+40*pitch+10;g+=narrow?'':'<rect x="'+x+'" y="'+(top-2)+'" width="140" height="'+(laneH+4)+'" rx="6" class="boxc"/><text x="'+(x+70)+'" y="'+(top+laneH/2+4)+'" font-size="12" text-anchor="middle">answer: 384</text>'}
    }else{
      for(let j=0;j<5;j++){const y=top+j*(laneH+6);if(!narrow)g+='<text x="'+(x0-6)+'" y="'+(y+laneH/2+4)+'" font-size="11" text-anchor="end">chain '+(j+1)+'</text>';
        for(let i=0;i<LEN/U;i++){const a=i*U;if(a>=upto)break;const fill=Math.min(1,(upto-a)/U);
          g+='<rect x="'+(x0+i*pitch+1)+'" y="'+(y+1)+'" width="'+(cs*fill).toFixed(2)+'" height="'+(laneH-2)+'" rx="2" fill="'+(i===LEN/U-1?'var(--c4)':'var(--c1)')+'"/>'}
        if(upto>=LEN){const ok=ANS[j]===384,xa=x0+LEN/U*pitch+6;let mark='';
          if(m==='ver'&&k>=3)mark=ok?' ✓':' ✗';
          g+='<text x="'+xa+'" y="'+(y+laneH/2+4)+'" font-size="'+(narrow?10:12)+'" fill="'+(m==='ver'&&k>=3?(ok?'var(--good)':'var(--bad)'):'var(--ink)')+'">'+ANS[j]+mark+'</text>'}}
      tok=5*upto;
      if(k>=3){const bx0=narrow?x0:x0+LEN/U*pitch+70,by=narrow?top+5*(laneH+6)+6:top,bw=narrow?W-x0-12:200,bh=narrow?40:5*(laneH+6)-6;
        g+='<rect x="'+bx0+'" y="'+by+'" width="'+bw+'" height="'+bh+'" rx="8" class="'+(k>=3?'boxc':'box')+'"/>';
        if(m==='vote'){const t=['384: three votes','412: one','97: one'];if(narrow)g+='<text x="'+(bx0+bw/2)+'" y="'+(by+17)+'" font-size="11" text-anchor="middle">Vote: 384 ×3, 412 ×1, 97 ×1</text><text x="'+(bx0+bw/2)+'" y="'+(by+32)+'" font-size="11" text-anchor="middle" font-weight="600">returns 384</text>';
          else{g+='<text x="'+(bx0+14)+'" y="'+(by+22)+'" font-size="12" font-weight="600">Majority vote</text>';t.forEach((l,i)=>g+='<text x="'+(bx0+14)+'" y="'+(by+44+i*18)+'" font-size="12">'+l+'</text>');g+='<text x="'+(bx0+14)+'" y="'+(by+bh-12)+'" font-size="12" font-weight="600">returns 384</text>'}}
        else{if(narrow)g+='<text x="'+(bx0+bw/2)+'" y="'+(by+17)+'" font-size="11" text-anchor="middle">Verifier accepts chains 1, 3, 5</text><text x="'+(bx0+bw/2)+'" y="'+(by+32)+'" font-size="11" text-anchor="middle" font-weight="600">returns 384</text>';
          else{g+='<text x="'+(bx0+14)+'" y="'+(by+22)+'" font-size="12" font-weight="600">Verifier</text><text x="'+(bx0+14)+'" y="'+(by+44)+'" font-size="12">accepts chains 1, 3, 5</text><text x="'+(bx0+14)+'" y="'+(by+62)+'" font-size="12">rejects 2 and 4</text><text x="'+(bx0+14)+'" y="'+(by+bh-12)+'" font-size="12" font-weight="600">returns 384</text>'}}}
    }
    // legend
    const leg=par?[['c1','reasoning tokens'],['c4','final answer']]:[['c1','working'],['c5','re-check'],['c3','verify'],['c4','answer']];
    let lx=x0,ly=H-14;leg.forEach(([c,l])=>{const lw=l.length*5.8+26;if(lx+lw>W){lx=x0;ly+=14}g+='<rect x="'+lx+'" y="'+(ly-9)+'" width="10" height="10" rx="2" fill="'+col[c]+'"/><text x="'+(lx+14)+'" y="'+ly+'" font-size="10.5" fill="var(--mute)">'+l+'</text>';lx+=lw});
    $('ttcSpSvg').innerHTML=svgEl(W,H,g,'Test-time compute spent '+(par?'as five parallel chains':'as one long chain'));
    $('ttcSpStep').textContent='Step '+(k+1)+' of '+steps.length+': '+s[0];$('ttcSpCap').textContent=s[1];
    const longest=upto,secs=longest/TPS;
    $('ttcSpCnt').innerHTML=stat('Tokens generated',fmt(tok),'of the 10,000 budget')+
      stat('Wall-clock so far',fmt(secs)+' s','longest chain ÷ 50 tokens a second')+
      stat('KV cache held',fmtBytes(tok*KVB),(par?'5 sequences, ':'1 sequence, ')+'240 KiB a token')+
      stat('Serial depth L × T',fmt(L*longest),'layer applications in the longest chain')+
      stat('Chance the answer is right',m==='ser'?'no formula':m==='vote'?(k>=4?'68.3% to 83.5%':'·'):(k>=4?'99.0%':'·'),m==='ser'?'depends on revision quality':m==='vote'?'p = 0.6, five votes':'pass@5 at p = 0.6');
  }
  makeAnim({card:'ttcSp',pre:'ttcSp',mode:'ser',n:m=>S[m].length,dur:(m,k)=>S[m][k][3]>S[m][k][2]?2600+(S[m][k][3]-S[m][k][2])*0.35:2600,draw});
})();
// ---- Animation 2: depth through tokens, through looped layers, or through a state carried across tokens ----
(function(){
  if(!$('ttcLp'))return;
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
    const card=$('ttcLp'),narrow=card.clientWidth<560,P=narrow?30:44,C=P-4,RH=narrow?42:54;
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
    $('ttcLpSvg').innerHTML=svgEl(W,H+(narrow?14:0),g,'Layer applications for one mode of spending depth');
    const s=S[m][k];$('ttcLpStep').textContent='Step '+(k+1)+' of '+S[m].length+': '+s[0];$('ttcLpCap').textContent=s[1];
    const nd=Math.floor(done+1e-9),toks=m==='loop'?(nd>=32?1:0):Math.floor(nd/8);
    const path=m==='ord'?Math.min(8,nd-8*Math.max(0,Math.ceil(nd/8)-1)):m==='loop'?nd:(()=>{const t=Math.ceil(nd/8)||0,inTok=nd-8*(t-1);return t?4*(t-1)+Math.max(0,inTok-4):0})();
    $('ttcLpCnt').innerHTML=stat('Layer applications',fmt(nd),'serial compute spent so far')+
      stat('Distinct layer weights','8','the same parameters in every mode')+
      stat('Tokens written',fmt(toks),m==='loop'?'depth without emitting':'each one readable text')+
      stat('Longest continuous path',fmt(Math.max(0,path))+' layers',m==='ord'?'resets at every token':m==='loop'?'one token, looped core':'grows 4 a token');
  }
  makeAnim({card:'ttcLp',pre:'ttcLp',mode:'ord',n:m=>S[m].length,dur:(m,k)=>{const d=doneAt[m];return k?2200+(d[k]-d[k-1])*180:2600},draw});
})();
})();
