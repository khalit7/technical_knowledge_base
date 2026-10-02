// ---- DFlash 2: the same 16 tokens decoded four ways, then the card's measured throughput ----
(function(){
  const card=$('v-dflash');if(!card)return;
  const TOK=['The','cache','stores','keys','and','values','so','each','new','token','reads','them','instead','of','recomputing','.'];
  // Per-cycle costs in ms, derived from the card (GSM8K, one request): step = acceptance length / throughput.
  // plain: 1/68.9 s; verification assumed to cost one plain step; draft = step - verification.
  const AR=1000/68.9, MTPstep=1000*5.02/178.5, D2step=1000*5.46/236.1;
  const COST={plain:{draft:0,ver:AR},ar:{draft:MTPstep-AR,ver:AR,dp:7},d1:{draft:(D2step-AR)/1.01,ver:AR,dp:1},d2:{draft:D2step-AR,ver:AR,dp:1}};
  // Illustrative cycles: s = first token of the cycle, a = drafts accepted (the cycle commits a + 1 tokens), w = the wrong guess at position a.
  const CYC={
    ar:[{s:0,a:5,w:'vectors'},{s:6,a:3,w:'time'},{s:10,a:5,w:'everything'}],
    d1:[{s:0,a:2,w:'cache',stut:1},{s:3,a:4,w:'so',stut:1},{s:8,a:3,w:'reads',stut:1},{s:12,a:3,w:'recomputing',stut:1}],
    d2:[{s:0,a:5,w:'all'},{s:6,a:4,w:'uses'},{s:11,a:4,w:'again'}]};
  const FILL=['the','a','it','them','of','to','and','is'];
  function drafts(cy){const d=[];for(let i=0;i<7;i++){const j=cy.s+i;d.push(i<cy.a?TOK[j]:i===cy.a?cy.w:(TOK[j]||'·'))}return d}
  // DFlash 2 keeps candidates per position; its top pick alone would stutter at positions 2 and 4 (a repeat of the neighbour)
  function cands(cy,i,d){const top=(i===2||i===4)&&i<cy.a?d[i-1]:d[i];const alt=top===d[i]?FILL[(cy.s+i)%FILL.length]:d[i];return [top,alt,FILL[(cy.s+i+3)%FILL.length]]}
  const NM={plain:'Plain decoding',ar:'Draft one at a time',d1:'DFlash',d2:'DFlash 2'};
  const tot=m=>m==='plain'?16*AR:CYC[m].length*(COST[m].draft+COST[m].ver);
  function steps(m){
    if(m==='plain'){const S=[];for(let g=0;g<4;g++)S.push({t:'Passes '+(4*g+1)+' to '+(4*g+4)+': one token each',ph:'plain',g,c:g===0?'With no drafter the target model runs one full forward pass per token: it reads all 27B weights from memory to produce a single token. That memory read, not the arithmetic, is what each pass costs at one request at a time.':g===3?'Sixteen tokens took sixteen passes. Every speculative method below produces exactly these sixteen tokens; the question is how many target passes, and how long, it takes.':'Same again: a pass, a token. The bar below grows by one pass ('+fmt(AR,1)+' ms, from 68.9 tokens per second) per token.'});
      S.push({t:'Result',ph:'done',c:'16 target passes, '+fmt(tot('plain'),0)+' ms (derived). Now switch to a drafter.'});return S}
    const S=[];CYC[m].forEach((cy,i)=>{
      const n=cy.a+1,last=i===CYC[m].length-1;
      S.push({t:'Cycle '+(i+1)+': draft',ph:'draft',i,c:m==='ar'?'The drafter writes its seven guesses one after another: each guess needs the previous one, so it is seven small passes ('+fmt(COST.ar.draft,1)+' ms in all, derived from the card\'s MTP measurement).':m==='d1'?'DFlash predicts all seven positions in one pass of a small diffusion model. Each position picks its own most likely token, without knowing what its neighbours picked'+(cy.stut?': here two neighbours both picked "'+escH(cy.w)+'".':'.'):'DFlash 2 also drafts the whole block in one pass, but keeps the top candidates at every position (16 in the real drafter, 3 drawn here) instead of committing to one.'});
      if(m==='d2')S.push({t:'Cycle '+(i+1)+': select a path',ph:'select',i,c:'A light selector scores every neighbouring pair of candidates (how well each fits the token before it) and walks the best path. Where the top pick alone would have repeated its neighbour, the selector takes the second candidate. Inco measures the selector at around 1% of the cycle.'});
      S.push({t:'Cycle '+(i+1)+': verify',ph:'verify',i,c:'The target checks all seven guesses in one pass. The first '+cy.a+' match what it would have written; guess '+(cy.a+1)+' ("'+escH(cy.w)+'") does not, so it and everything after it is thrown away, and the target adds its own token ("'+escH(TOK[cy.s+cy.a])+'"). '+n+' tokens from one target pass.'+(m==='d1'&&cy.stut?' The stutter is what cut this block short: the reason DFlash 2 exists.':'')+(last?'':'')});
    });
    const nc=CYC[m].length,dp=nc*COST[m].dp;
    S.push({t:'Result',ph:'done',c:'16 tokens from '+nc+' target passes and '+dp+' drafter pass'+(dp>1?'es':'')+', '+fmt(tot(m),0)+' ms (derived) against '+fmt(tot('plain'),0)+' ms for plain decoding, '+fmt(tot('plain')/tot(m),1)+'x faster on this sentence.'+(m==='ar'?' The drafter\'s seven sequential passes are a large share of each cycle: that is the cost DFlash removes.':m==='d1'?' One-pass drafting is cheap, but incoherent blocks break early, so it needs more cycles than the sequential drafter.':' As many tokens per verification as the sequential drafter, at the cost of a one-pass draft: the card\'s ranking on every task.')});
    return S}
  const modes={};['plain','ar','d1','d2'].forEach(m=>modes[m]={name:NM[m],steps:steps(m)});
  function state(st){
    const m=st.m,S=modes[m].steps,step=S[st.k];
    let tok=0,tp=0,dp=0,ms=0,segs=[],cyc=-1,blk=null;const owner=[];
    if(m==='plain'){
      const done=step.ph==='done'?16:4*step.g+Math.min(4,Math.floor(4*st.t+1e-9)+(st.t>=1?0:0));
      const n=step.ph==='done'?16:Math.min(16,4*step.g+Math.floor(4*Math.min(1,st.t)+1e-9));
      tok=n;tp=n;ms=n*AR;for(let i=0;i<n;i++){owner.push(i);segs.push(['v',AR])}
      return {tok,tp,dp,ms,segs,owner,blk:null}}
    const C=CYC[m],co=COST[m];
    for(let k=0;k<=st.k;k++){const s=S[k],fr=k<st.k?1:st.t;if(s.ph==='done')break;const cy=C[s.i];
      if(s.ph==='draft'){dp+=fr>=1?co.dp:Math.floor(co.dp*fr);ms+=co.draft*fr;segs.push(['d',co.draft*fr])}
      if(s.ph==='verify'){if(fr>0){tp+=1;ms+=co.ver*fr;segs.push(['v',co.ver*fr])}if(fr>=.6){for(let j=0;j<=cy.a;j++)owner.push(s.i);tok+=cy.a+1}}
      cyc=s.i}
    if(step.ph!=='done'){const cy=C[step.i],d=drafts(cy);blk={cy,d,ph:step.ph,t:st.t}}
    return {tok,tp,dp,ms,segs,owner,blk}}
  function render(st){
    const m=st.m,s=state(st),narrow=card.clientWidth<560;
    // output tokens, coloured by the cycle that produced them
    const CC=['var(--c1)','var(--c3)','var(--c4)','var(--c2)'];
    let o='<div class="df-lab">Output so far, '+s.tok+' of 16 tokens'+(m==='plain'?'':' (colour = the cycle that produced it)')+'</div><div class="df-toks">';
    TOK.forEach((t,i)=>{const on=i<s.tok;o+='<span class="df-t'+(on?' on':'')+'" style="'+(on?'border-color:'+(m==='plain'?'var(--c1)':CC[s.owner[i]%4])+';':'')+'">'+escH(t)+'</span>'});
    $('dfOut').innerHTML=o+'</div>';
    // the current block
    let b='';
    if(m==='plain'){b='<div class="df-lab">No drafter: each target pass writes exactly one token.</div>'}
    else if(s.blk){const {cy,d,ph,t}=s.blk;const shown=m==='ar'&&ph==='draft'?Math.min(7,Math.floor(7*t+1e-9)+(t>=1?0:0)):(ph==='draft'&&t<.3?0:7);
      const ver=ph==='verify'&&t>=.3,sel=m==='d2'&&(ph==='select'||ph==='verify');
      b='<div class="df-lab">This cycle: seven draft positions and the target\'s own token'+(m==='d2'?' (three of the sixteen candidates kept at each position)':'')+'</div><div class="df-cells">';
      for(let i=0;i<7;i++){let cls='df-c';let inner='';
        if(i<(m==='ar'&&ph==='draft'?Math.floor(7*t+1e-9):shown)||ph!=='draft'){
          if(m==='d2'){const cs=cands(cy,i,d);const pick=d[i];const pi=sel&&(ph==='verify'||i<Math.ceil(7*t))?cs.indexOf(pick):-1;
            inner=cs.map((c,j)=>'<span class="df-k'+(j===pi?' sel':'')+(j===0?' top':'')+'">'+escH(c)+'</span>').join('')}
          else inner='<span class="df-k sel">'+escH(d[i])+'</span>';
          if(ver)cls+=i<cy.a?' ok':i===cy.a?' bad':' gone'}
        else{cls+=' empty';inner='<span class="df-k">&nbsp;</span>'}
        b+='<div class="'+cls+'"><span class="df-i">'+(i+1)+'</span>'+inner+'</div>'}
      b+='<div class="df-c bonus'+(ver?' ok':' empty')+'"><span class="df-i">target</span><span class="df-k sel">'+(ver?escH(TOK[cy.s+cy.a]):'&nbsp;')+'</span></div></div>'}
    else b='<div class="df-lab">Done.</div>';
    $('dfBlk').innerHTML=b;
    // time lanes, to scale across the four modes
    const W=Math.min(780,boxW($('dfSvg'),340)),lw=narrow?10:150,pr=narrow?40:48,lh=narrow?34:24,top=6,maxT=240,X=v=>lw+(W-lw-pr)*v/maxT;let g='';
    for(let v=0;v<=maxT;v+=narrow?80:40)g+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+top+'" y2="'+(top+4*lh)+'" stroke="var(--line)"/><text x="'+X(v)+'" y="'+(top+4*lh+14)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+v+'</text>';
    ['plain','ar','d1','d2'].forEach((k,r)=>{const y=top+r*lh+(narrow?16:4),h=narrow?12:14,cur=k===m;
      g+='<text x="'+(narrow?lw:lw-8)+'" y="'+(narrow?y-4:y+h-2)+'" font-size="'+(narrow?11:12)+'" text-anchor="'+(narrow?'start':'end')+'" fill="'+(cur?'var(--ink)':'var(--mute)')+'"'+(cur?' font-weight="600"':'')+'>'+NM[k]+'</text>';
      if(cur){let x=X(0);s.segs.forEach(([kind,v])=>{const w=X(v)-X(0);if(w>0)g+='<rect x="'+x+'" y="'+y+'" width="'+Math.max(0,w-.6)+'" height="'+h+'" fill="'+(kind==='d'?'var(--c2)':'var(--c1)')+'"/>';x+=w});
        g+='<text x="'+(x+4)+'" y="'+(y+h-2)+'" font-size="11" fill="var(--ink)">'+fmt(s.ms,0)+'</text>'}
      else{g+='<rect x="'+X(0)+'" y="'+y+'" width="'+(X(tot(k))-X(0))+'" height="'+h+'" fill="var(--dim)" opacity=".7"/><text x="'+(X(tot(k))+4)+'" y="'+(y+h-2)+'" font-size="11" fill="var(--mute)">'+fmt(tot(k),0)+'</text>'}});
    $('dfSvg').innerHTML='<div class="small mute">Time for the 16 tokens in milliseconds, one lane per method, same scale; blue is target passes, orange is drafting</div>'+svgEl(W,top+4*lh+20,g,'Time per method');
    const tpp=s.tp?s.tok/s.tp:0;
    $('dfCnt').innerHTML=stat('Target passes',fmt(s.tp),'one per token without a drafter')+stat('Drafter passes',fmt(s.dp),m==='ar'?'seven per cycle':m==='plain'?'no drafter':'one per cycle')+stat('Tokens out',s.tok+' of 16','identical text in every mode')+stat('Tokens per target pass',s.tp?fmt(tpp,2):'0','card, GSM8K: MTP 5.02, DFlash 2 5.46')+stat('Time',fmt(s.ms,0)+' ms','derived, see below');
  }
  stepAnim({card,pre:'df',modes,dur:1500,render});
  // ---- measured throughput (card tables)
  const T={'1':{GSM8K:[68.9,178.5,185.3,236.1],'MATH-500':[69.0,172.8,174.5,230.7],HumanEval:[69.0,151.9,159.9,214.6],MBPP:[69.0,153.1,163.3,226.9],'MT-Bench':[68.9,134.9,137.6,184.0]},
    '8':{GSM8K:[467.2,1022.1,1040.8,1328.7],'MATH-500':[480.0,1023.5,1025.8,1368.3],HumanEval:[483.4,934.2,956.5,1291.5],MBPP:[478.0,938.1,974.1,1328.0],'MT-Bench':[480.5,835.2,802.3,1090.2]},
    '32':{GSM8K:[1329.8,1381.1,1506.5,1922.5],'MATH-500':[1505.8,1415.6,1429.0,1951.8],HumanEval:[1546.5,1296.8,1330.1,1799.0],MBPP:[1507.7,1314.9,1361.3,1886.8],'MT-Bench':[1507.4,1159.7,1115.5,1525.3]}};
  const ACC={GSM8K:[5.02,4.36,5.46],'MATH-500':[4.72,3.92,5.28],HumanEval:[3.91,3.30,4.39],MBPP:[3.99,3.51,4.79],'MT-Bench':[3.74,3.01,4.10]};
  const MN=['Plain decoding','MTP (built in)','DSpark','DFlash 2'],MC=['var(--dim)','var(--c5)','var(--c4)','var(--acc)'];
  let conc='1';
  function bars(){const task=$('dfTask').value,row=T[conc][task],mx=Math.max(...row.filter(v=>v!=null));
    $('dfBars').innerHTML='<div class="small mute">Output tokens per second, '+task+', '+(conc==='1'?'one request':conc+' requests at once')+'</div>'+row.map((v,i)=>'<div class="sr"><span class="nm">'+MN[i]+'</span><span class="bar">'+(v!=null?'<span style="width:'+(100*v/mx).toFixed(1)+'%;background:'+MC[i]+'"></span>':'')+'</span><span class="st">'+(v==null?'not shown in the table as read':fmt(v,1)+(i?' ('+fmt(v/row[0],2)+'x)':''))+'</span></div>').join('');
    const a=ACC[task];const sp=row.map(v=>v==null?null:v/row[0]);
    $('dfStats').innerHTML=stat('Tokens per verification, '+task,'MTP '+a[0]+' · DSpark '+a[1]+' · DFlash 2 '+a[2],'the same at every concurrency')+
      stat('Time per verification (derived)','MTP '+fmt(1000*a[0]/T['1'][task][1],1)+' · DFlash 2 '+fmt(1000*a[2]/T['1'][task][3],1)+' ms','one request: tokens per verification / tokens per second; plain step '+fmt(1000/T['1'][task][0],1)+' ms')+
      stat('DFlash 2 speed-up here',sp[3]==null?'n/a':fmt(sp[3],2)+'x',conc==='32'?'MTP '+fmt(sp[1],2)+'x: below 1 means drafting slows a busy GPU':'against plain decoding');
  }
  const seg=$('dfC');seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});conc=b.dataset.m;bars()}));
  $('dfTask').addEventListener('change',bars);onTab(card.closest('.tab').id,bars);bars();
})();
