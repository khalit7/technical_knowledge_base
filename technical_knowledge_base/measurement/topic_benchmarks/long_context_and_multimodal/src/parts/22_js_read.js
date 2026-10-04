// ---- Reading tab: needle pair, lost in the middle, NoLiMa animation, MMMU animation, half-widths ----
(function(){
const D=window.LD, esc=RD.esc;
const C=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim()||'#888';
const tok=s=>(s.toLowerCase().match(/[a-z0-9]+/g)||[]);
// content words of q found in needle (same rule as recompute.py)
function overlap(q,needle){const nd=new Set(tok(needle));const qa=tok(q);const qc=qa.filter(w=>D.stop.indexOf(w)<0);
  const hits=qc.filter(w=>nd.has(w));return {all:qa,qc,hits,prec:qc.length?hits.length/qc.length:0}}
window.LC_overlap=overlap;
// highlight words of text: in set -> w-hit ; for the question, content words not found -> w-miss
function mark(text,hitSet,missSet){return text.replace(/[A-Za-z0-9]+/g,w=>{const l=w.toLowerCase();
  if(hitSet&&hitSet.has(l))return '<span class="w-hit">'+w+'</span>';if(missSet&&missSet.has(l))return '<span class="w-miss">'+w+'</span>';return w})}

// 1. Kamradt needle and question with shared words marked
(function(){const el=document.getElementById('niah-pair');if(!el)return;const p=D.pairs.niah;const o=overlap(p.q,p.needle);
  const hs=new Set(o.hits),ms=new Set(o.qc.filter(w=>!hs.has(w)));
  el.innerHTML='<div class="qa"><b>Needle</b>'+mark(esc(p.needle),hs)+'</div><div class="qa"><b>Question</b>'+mark(esc(p.q),hs,ms)+'</div>'+
  '<p class="note" style="margin:6px 0 0">Highlighted: question content words that appear in the needle, '+o.hits.length+' of '+o.qc.length+' ('+o.hits.join(', ')+'; not found: '+o.qc.filter(w=>o.hits.indexOf(w)<0).join(', ')+'). NoLiMa measured the same thing over the whole vanilla NIAH set with ROUGE-1 precision: 0.905.</p>'})();

// 2. Lost in the middle
(function(){const sel=document.getElementById('litm-m');if(!sel)return;const L=D.litm;
  sel.innerHTML=L.rows.map((r,i)=>'<option value="'+i+'">'+esc(r[0])+'</option>').join('');
  function draw(){const r=L.rows[+sel.value];const box=document.getElementById('litm-chart');const W=Math.min(640,RD.width(box)),H=230;
    const ml=36,mr=98,mt=14,mb=34,y0=30,y1=95;const X=p=>ml+(p-1)/19*(W-ml-mr),Y=v=>mt+(1-(v-y0)/(y1-y0))*(H-mt-mb);
    let s='';for(let v=30;v<=90;v+=10){s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="'+C('--line')+'"/>'+RD.t(ml-5,Y(v)+4,v,{a:'end',fs:10.5,fill:C('--mute')})}
    L.pos.forEach(p=>{s+=RD.t(X(p),H-mb+15,p,{a:'middle',fs:10.5,fill:C('--mute')})});
    s+=RD.t((ml+W-mr)/2,H-4,'Position of the passage with the answer (of 20)',{a:'middle',fs:11,fill:C('--mute')});
    [[r[2],'closed-book',C('--bad')],[r[3],'oracle',C('--good')]].forEach(([v,lab,c])=>{s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="'+c+'" stroke-dasharray="5 4"/>'+RD.t(W-mr+4,Y(v)+4,lab+' '+v,{fs:10.5,fill:c})});
    s+='<polyline fill="none" stroke="'+C('--acc')+'" stroke-width="2.2" points="'+L.pos.map((p,i)=>X(p)+','+Y(r[1][i])).join(' ')+'"/>';
    L.pos.forEach((p,i)=>{s+='<circle cx="'+X(p)+'" cy="'+Y(r[1][i])+'" r="4" fill="'+C('--acc')+'"/>'+RD.t(i===0?X(p)+7:X(p),Y(r[1][i])-8,r[1][i].toFixed(1),{a:i===0?'start':'middle',fs:10.5})});
    box.innerHTML=RD.svg(W,H,s,'Accuracy by position of the answer passage for '+r[0]);
    const best=Math.max(...r[1]),worst=Math.min(...r[1]);const below=L.pos.filter((p,i)=>r[1][i]<r[2]);
    document.getElementById('litm-out').innerHTML=RD.stat('Best position',best.toFixed(1)+'%','position '+L.pos[r[1].indexOf(best)])+RD.stat('Worst position',worst.toFixed(1)+'%','position '+L.pos[r[1].indexOf(worst)])+
      RD.stat('Spread',(best-worst).toFixed(1)+' points','best minus worst')+RD.stat('Below closed-book',below.length?('positions '+below.join(', ')):'none','closed-book '+r[2]+'%')}
  sel.addEventListener('change',draw);RD.onRender(draw);RD.onResize(draw);draw()})();

// 3. NoLiMa: one needle, three questions
(function(){const card=document.getElementById('nb-card');if(!card)return;
  const T6=D.nolima.t6,LENS=['8K','16K','32K'];
  let mode='direct',mc=false;
  const rowKey=()=>mode==='direct'?'Direct':(mode==='one'?'One-hop':'Two-hop')+(mc?', with literal match (MC)':'');
  const steps=['hay','text','match','link','8K','16K','32K'];
  const hop={direct:'The question names the needle\'s keyword ("Semper Opera House"). Attention can match the words directly; no knowledge is needed.',
    one:'Dresden is not in the context. The model has to bring a fact of its own, "the Semper Opera House is in Dresden", and use it to recognise the needle.',
    two:'Two facts the context never states: Saxony contains Dresden, Dresden contains the Semper Opera House. Only then does the needle look relevant.'};
  function draw(i){
    const p=D.pairs[mode];let q=p.q;if(mc&&mode!=='direct')q+=' Options: Yuki, and three other names from the haystack.';
    const o=overlap(p.q,p.needle);const hs=new Set(o.hits),ms=new Set(o.qc.filter(w=>!hs.has(w)));if(mc&&mode!=='direct')hs.add('yuki');
    const showText=i>=1,showMatch=i>=2;const vals=T6[rowKey()],dv=T6.Direct;
    const box=document.getElementById('nb-svg');const W=Math.min(760,RD.width(box));
    const nar=W<520;let s='';const ml=nar?44:58,mr=46;
    // haystack strip: fixed scale of 32K, length grows with the step
    const lenK=i>=4?[8,16,32][i-4]:32;const cw=(W-ml-mr)/32;
    s+=RD.t(4,26,'Context',{fs:11,fill:C('--mute')});
    for(let k=0;k<32;k++){const on=k<lenK;s+='<rect x="'+(ml+k*cw+0.5)+'" y="12" width="'+Math.max(1,cw-1)+'" height="22" rx="2" fill="'+(on?C('--acc2'):C('--soft'))+'" stroke="'+(on?'none':C('--line'))+'"/>'}
    const nk=Math.floor(lenK/2);s+='<rect x="'+(ml+nk*cw+0.5)+'" y="8" width="'+Math.max(2,cw-1)+'" height="30" rx="2" fill="'+C('--bad')+'"/>';
    s+=RD.t(ml+(nk+0.5)*cw,52,'needle (mid depth)',{a:'middle',fs:10.5,fill:C('--bad')});
    s+=RD.t(W-mr+4,28,lenK+'K',{fs:11,w:600});
    // bars
    const by=70,bh=nar?20:22,gap=10;const bx=ml,bw=W-ml-mr;
    s+=RD.t(4,by-6,'Accuracy, Llama 3.3 70B',{fs:11,fill:C('--mute')});
    LENS.forEach((L,k)=>{const y=by+k*(bh+gap);s+=RD.t(4,y+bh*0.7,L,{fs:11.5,w:600});
      s+='<rect x="'+bx+'" y="'+y+'" width="'+bw+'" height="'+bh+'" rx="3" fill="'+C('--soft')+'"/>';
      if(mode!=='direct'||mc){s+='<rect x="'+bx+'" y="'+y+'" width="'+(bw*dv[k]/100)+'" height="'+bh+'" rx="3" fill="none" stroke="'+C('--mute')+'" stroke-dasharray="4 3"/>'}
      if(i>=4+k){const v=vals[k];s+='<rect x="'+bx+'" y="'+(y+3)+'" width="'+(bw*v/100)+'" height="'+(bh-6)+'" rx="2" fill="'+(mode==='direct'?C('--good'):mode==='one'?C('--c5'):C('--bad'))+'"/>'+
        RD.t(Math.min(bx+bw*v/100+4,W-mr+4),y+bh*0.7,v.toFixed(1),{fs:11.5,w:600})}});
    const H=by+3*(bh+gap)+16;s+=RD.t(bx,H-2,(mode!=='direct'||mc)?'dashed outline: Direct question, same model and haystacks':'',{fs:10.5,fill:C('--mute')});
    box.innerHTML='<div class="qa" style="min-height:1.5em"><b>Needle</b>'+(showText?mark(esc(p.needle),showMatch?hs:null):'<span class="mute">(hidden in the haystack)</span>')+'</div>'+
      '<div class="qa" style="min-height:1.5em"><b>Question</b>'+(showText?mark(esc(q),showMatch?hs:null,showMatch?ms:null):'')+'</div>'+RD.svg(W,H,s,'Haystack and accuracy by length');
    const cap=[ 'A haystack of book snippets, here 32K tokens; the needle is one sentence, placed at 26 depths in turn (shown at mid depth).',
      'The needle and the question. '+(mode==='direct'?'The Direct question asks about the needle in the needle\'s own words.':'The question asks about '+(mode==='one'?'Dresden':'Saxony')+'; the needle never mentions it.'),
      'Content words of the question found in the needle: '+o.hits.length+' of '+o.qc.length+(o.hits.length?' ('+o.hits.join(', ')+')':'')+'.'+(mc&&mode!=='direct'?' The options add a literal match: the name Yuki appears in the needle.':''),
      hop[mode]+(mc&&mode!=='direct'?' With the options listed, the model can instead search for four names, one of which is in the needle.':''),
      'At 8K tokens: '+vals[0].toFixed(1)+'%.','At 16K: '+vals[1].toFixed(1)+'%.',
      'At 32K: '+vals[2].toFixed(1)+'%'+(mode==='direct'&&!mc?', flat from 8K: with a literal match length barely matters.':', '+(dv[2]-vals[2]).toFixed(1)+' points below the Direct question at the same length.')][i];
    document.getElementById('nb-cap').textContent=cap;
    const shown=i>=4?vals[Math.min(2,i-4)]:null;
    document.getElementById('nb-out').innerHTML=RD.stat('Content words shared',showMatch?(o.hits.length+' of '+o.qc.length):'?',showMatch&&mc&&mode!=='direct'?'plus the name Yuki in the options':'question with needle')+
      RD.stat('Context length',lenK+'K','tokens')+RD.stat('Accuracy',shown==null?'?':shown.toFixed(1)+'%',i>=4?'Table 6, '+rowKey():'revealed from step 5')+
      RD.stat('Below Direct',shown==null?'?':(dv[Math.min(2,i-4)]-shown).toFixed(1)+' pts','same length')}
  const A=RD.anim({card:'nb-card',ctl:'nb-ctl',n:steps.length,draw,ms:1700,label:'NoLiMa step'});
  RD.seg(document.getElementById('nb-mode'),m=>{mode=m;A.reset(steps.length);A.play()});
  document.getElementById('nb-mc').addEventListener('change',e=>{mc=e.target.checked;A.redraw()});
  RD.onResize(()=>A.redraw());
})();

// 4. MMMU: the image, on and off
(function(){const card=document.getElementById('mm-card');if(!card)return;
  const sel=document.getElementById('mm-model');let mode='blind';
  const PRO=D.mmmupro.filter(r=>!/choice|Human/.test(r[0]));const HUM=D.mmmupro.filter(r=>/Human expert \((medium|high)\)/.test(r[0]));
  const RND=D.mmmupro[0];
  function fill(){sel.innerHTML=mode==='blind'?['GPT-4V','GeminiPro-Vision'].map(k=>'<option>'+k+'</option>').join(''):PRO.map((r,i)=>'<option value="'+i+'">'+esc(r[0])+'</option>').join('')}
  function bars(){if(mode==='blind'){const m=D.mmstar[sel.value];return [['Random choice',D.mmstar.random,'--dim'],['Base LLM, no image',m.llm[1],'--c5'],['Same model, no image',m.blind,'--bad'],['Same model, with image',m.full,'--good']]}
    const r=PRO[+sel.value]||PRO[0];return [['MMMU validation',r[4],'--acc'],['Filtered, 4 options',r[1],'--c6'],['10 options',r[2],'--c5'],['Screenshot only',r[3],'--bad'],['MMMU-Pro score',Math.round((r[2]+r[3])/2*100)/100,'--c4']]}
  const nSteps=()=>mode==='blind'?4:5;
  function cardSvg(i,x,y){// a question card: image box, text lines, option dots
    let s='',img=true,opts=4,shot=false,cross=false;
    if(mode==='blind'){cross=(i===1||i===2);}else{opts=i>=2?10:4;shot=i>=3;if(i===1){}}
    s+='<rect x="'+x+'" y="'+y+'" width="118" height="76" rx="6" fill="'+C('--soft')+'" stroke="'+(shot?C('--bad'):C('--line'))+'" stroke-width="'+(shot?2:1)+'"/>';
    s+='<rect x="'+(x+8)+'" y="'+(y+8)+'" width="44" height="34" rx="3" fill="'+C('--acc2')+'"/><path d="M'+(x+12)+' '+(y+38)+' l10 -12 l8 8 l6 -6 l14 10" fill="none" stroke="'+C('--acc')+'" stroke-width="1.6"/>';
    if(cross)s+='<line x1="'+(x+6)+'" y1="'+(y+6)+'" x2="'+(x+54)+'" y2="'+(y+44)+'" stroke="'+C('--bad')+'" stroke-width="3"/><line x1="'+(x+54)+'" y1="'+(y+6)+'" x2="'+(x+6)+'" y2="'+(y+44)+'" stroke="'+C('--bad')+'" stroke-width="3"/>';
    for(let k=0;k<3;k++)s+='<rect x="'+(x+60)+'" y="'+(y+10+k*9)+'" width="'+(50-k*8)+'" height="4" rx="2" fill="'+C('--mute')+'"/>';
    for(let k=0;k<opts;k++)s+='<circle cx="'+(x+12+k*10.4)+'" cy="'+(y+60)+'" r="3.4" fill="'+(k===0?C('--good'):C('--dim'))+'"/>';
    if(shot)s+=RD.t(x+59,y+72,'all one image',{a:'middle',fs:9.5,fill:C('--bad')});
    return s}
  function draw(i){const box=document.getElementById('mm-svg');const W=Math.min(760,RD.width(box));const B=bars();const nar=W<560;
    const cx=0,cy=4,lx=nar?0:136,top=nar?92:4;const lw=nar?Math.min(150,W*0.42):170,bx=lx+lw,bw=W-bx-48,bh=22,g=8;let s=cardSvg(i,cx,cy);
    const shownN=mode==='blind'?i+1:i+1;
    B.forEach((b,k)=>{const y=top+k*(bh+g);const on=k<shownN;s+='<text x="'+lx+'" y="'+(y+bh*0.68)+'" font-size="11.5"'+(on?'':' fill="'+C('--dim')+'"')+(k===shownN-1?' font-weight="600"':'')+'>'+esc(b[0].length>(nar?22:30)?b[0].slice(0,nar?21:29)+'.':b[0])+'</text>';
      s+='<rect x="'+bx+'" y="'+y+'" width="'+bw+'" height="'+bh+'" rx="3" fill="'+C('--soft')+'"/>';
      if(on)s+='<rect x="'+bx+'" y="'+(y+3)+'" width="'+(bw*b[1]/100)+'" height="'+(bh-6)+'" rx="2" fill="'+C(b[2])+'"/>'+RD.t(Math.min(bx+bw*b[1]/100+4,W-44),y+bh*0.7,(+b[1]).toFixed(mode==='pro'&&k===4?2:1),{fs:11.5,w:600})});
    let H=top+B.length*(bh+g)+8;
    if(mode==='pro'){HUM.forEach((h,k)=>{const x=bx+bw*h[2]/100;s+='<line x1="'+x+'" x2="'+x+'" y1="'+top+'" y2="'+(H-6)+'" stroke="'+C('--good')+'" stroke-dasharray="3 3"/>'+RD.t(x,H+6+k*12,'human '+h[0].match(/\((\w+)\)/)[1]+' '+h[2],{a:k?'start':'end',fs:10,fill:C('--good')})});H+=26;
      const rv=[RND[4],RND[1],RND[2],RND[3],(RND[2]+RND[3])/2][i];s+=RD.t(bx,H,'random choice at this step: '+rv.toFixed(1)+'%',{fs:10.5,fill:C('--mute')});H+=6}
    box.innerHTML=RD.svg(W,Math.max(H,nar?0:86),s,'Scores with and without the image');
    let cap,out;
    if(mode==='blind'){const m=D.mmstar[sel.value];
      cap=['MMMU validation (900 questions, mostly four options). Random choice scores '+D.mmstar.random+'%.',
        'Remove the image and give the question to the text-only language model the vision model was built on ('+m.llm[0]+'): '+m.llm[1]+'%.',
        'Now the vision model itself, with the image removed: '+m.blind+'%. '+(m.blind>m.llm[1]?'Higher than its own base: multimodal training taught it items it can now answer blind.':'Below its base model here.'),
        'Give it the image: '+m.full+'%. The image is worth '+(m.full-m.blind).toFixed(1)+' points; '+Math.round((m.blind-D.mmstar.random)/(m.full-D.mmstar.random)*100)+'% of the margin over random was there without it.'][i];
      out=RD.stat('Without image',m.blind+'%','same model')+RD.stat('With image',i>=3?m.full+'%':'?','')+RD.stat('Image worth',i>=3?(m.full-m.blind).toFixed(1)+' pts':'?','with minus without')+RD.stat('Random choice',D.mmstar.random+'%','')}
    else{const r=PRO[+sel.value]||PRO[0];
      cap=['Start: '+r[0]+' on MMMU validation, '+r[4]+'%.',
        'Step 1, filter: drop questions that text-only models answer, keep four options. '+r[1]+'% ('+(r[1]-r[4]).toFixed(1)+').',
        'Step 2, ten options: guessing falls to 12.8%. '+r[2]+'% ('+(r[2]-r[1]).toFixed(1)+' from four options).',
        'Step 3, vision-only: question and options arrive as one screenshot. '+r[3]+'% ('+(r[3]-r[2]).toFixed(1)+' more).',
        'MMMU-Pro score, the mean of the 10-option and vision-only settings: '+((r[2]+r[3])/2).toFixed(2)+'%, '+(r[4]-(r[2]+r[3])/2).toFixed(1)+' points below MMMU validation.'][i];
      out=RD.stat('MMMU validation',r[4]+'%','')+RD.stat('MMMU-Pro',i>=4?((r[2]+r[3])/2).toFixed(2)+'%':'?','mean of two settings')+RD.stat('Printed deltas',(r[5]>0?'+':'')+r[5]+' / '+r[6],'10 options, vision minus MMMU')+RD.stat('Random choice',[RND[4],RND[1],RND[2],RND[3],(RND[2]+RND[3])/2][i].toFixed(1)+'%','at this step')}
    document.getElementById('mm-cap').textContent=cap;document.getElementById('mm-out').innerHTML=out}
  fill();
  const A=RD.anim({card:'mm-card',ctl:'mm-ctl',n:nSteps(),draw,ms:1800,label:'MMMU step'});
  RD.seg(document.getElementById('mm-mode'),m=>{mode=m;fill();A.reset(nSteps());A.play()});
  sel.addEventListener('change',()=>{A.reset(nSteps());A.play()});
  RD.onResize(()=>A.redraw());
})();

// 5. half-widths list
(function(){const el=document.getElementById('hw-list');if(!el)return;
  el.textContent=D.sizes.map(([b,n,p])=>b+' (n = '+n.toLocaleString('en-US')+', top '+p+'%): ±'+(1.96*Math.sqrt(p/100*(1-p/100)/n)*100).toFixed(1)).join('; ')})();
})();
