// ---- Anneal a toy tab: four cells, loss curves, per-character heatmap animation, findings ----
(function(){
  const $=id=>document.getElementById(id);
  if(!$('ty-card')||!window.TOY)return;
  const esc=RD.esc,S=TOY.seeds,K=TOY.keys,meta=TOY.meta;
  const ki=k=>K.indexOf(k);
  const MET={text:['All text','bits per character',false],t_start:['Word starts','bits per character',false],t_inside:['Inside words','bits per character',false],
    t_space:['Spaces and punctuation','bits per character',false],m_answer:['Sum answers','bits per digit',false],m_operand:['Sum operands','bits per digit',false],acc:['Sum accuracy','held-out sums correct',true]};
  const BR={const_same:['LR flat, same mix','var(--dim)'],decay_same:['LR to zero, same mix','var(--c1)'],const_maths:['LR flat, maths-heavy mix','var(--c5)'],decay_maths:['LR to zero, maths-heavy mix','var(--c2)']};
  const BN=Object.keys(BR);
  let met='m_answer',view='all',seed=-1;
  $('ty-par').textContent=S.length?S[0].params.toLocaleString('en-GB'):'?';
  $('ty-sec').textContent=S.length?'about '+Math.round(S.reduce((a,s)=>a+(s.seconds||0),0)/S.length/60)+' minutes per seed':'';
  $('ty-met').innerHTML=Object.keys(MET).map(k=>'<button data-m="'+k+'"'+(k===met?' class="on"':'')+'>'+MET[k][0]+'</button>').join('');
  [...$('ty-seed').children].forEach(b=>{if(+b.dataset.s>=S.length)b.hidden=true});
  const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
  const fmtv=(v,k)=>MET[k][2]?(v*100).toFixed(1)+'%':v.toFixed(3);
  function finals(k){const i=ki(k),o={ckpt:S.map(s=>s.pt[s.pt.length-1][i])};BN.forEach(b=>o[b]=S.map(s=>s.br[b][s.br[b].length-1][i]));return o}
  function grid(){
    const f=finals(met),c=(b)=>{const v=f[b];return '<div class="c" style="border-left:4px solid '+BR[b][1]+'"><div class="v">'+fmtv(mean(v),met)+'</div><div class="r">seeds '+v.map(x=>fmtv(x,met)).join(', ')+'</div></div>'};
    $('ty-grid').innerHTML='<div></div><div class="h">Same mix (3% sums)</div><div class="h">Maths-heavy mix (25% sums)</div>'+
      '<div class="h">LR held flat</div>'+c('const_same')+c('const_maths')+'<div class="h">LR to zero</div>'+c('decay_same')+c('decay_maths');
    const d=b=>mean(f[b])-mean(f.const_same),sg=v=>(v>=0?'+':'')+(MET[met][2]?(v*100).toFixed(1)+' points':v.toFixed(3));
    $('ty-gnote').innerHTML=MET[met][0]+' at the end of each branch, mean of '+S.length+' seeds ('+MET[met][1]+(MET[met][2]?'':', lower is better')+'); the stage-1 checkpoint they all start from: '+fmtv(mean(f.ckpt),met)+'. '+
      'Against the flat, same-mix branch (same tokens, no anneal): decay alone '+sg(d('decay_same'))+', data alone '+sg(d('const_maths'))+', both '+sg(d('decay_maths'))+'.';
  }
  function series(k,b){ // returns {x:[], lo:[], hi:[], m:[]} for stage 1 (b=null) or branch b
    const i=ki(k),src=S.map(s=>b?s.br[b]:s.pt),n=Math.min(...src.map(a=>a.length));const o={x:[],lo:[],hi:[],m:[]};
    for(let j=0;j<n;j++){const v=seed<0?src.map(a=>a[j][i]):[src[seed][j][i]];o.x.push(src[0][j][0]);o.lo.push(Math.min(...v));o.hi.push(Math.max(...v));o.m.push(mean(v))}return o}
  function plot(){
    const w=RD.width($('ty-plot')),h=Math.round(Math.min(320,Math.max(220,w*0.45))),pl=44,pr=10,pt=10,pb=34,W=w-pl-pr,H=h-pt-pb-16;
    const s1=series(met,null),bs=BN.map(b=>[b,series(met,b)]);
    const x0=view==='br'?meta.stage1-200:0,x1=meta.stage1+meta.branch;
    const vals=[];const add=o=>o.x.forEach((x,j)=>{if(x>=x0&&!(x===0&&!MET[met][2])){vals.push(o.lo[j],o.hi[j])}});add(s1);bs.forEach(b=>add(b[1]));
    let lo=Math.min(...vals),hi=Math.max(...vals);if(met==='m_operand'){lo=Math.min(lo,3.2)}const pad=(hi-lo)*0.08||0.1;lo-=pad;hi+=pad;lo=Math.max(0,lo);if(MET[met][2]){hi=Math.min(1,hi)}
    const X=x=>pl+(x-x0)/(x1-x0)*W,Y=v=>pt+(hi-v)/(hi-lo)*H;
    let s='<svg width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="'+MET[met][0]+' against training step">';
    for(let k=0;k<=4;k++){const v=lo+(hi-lo)*k/4;s+='<line x1="'+pl+'" x2="'+(pl+W)+'" y1="'+Y(v).toFixed(1)+'" y2="'+Y(v).toFixed(1)+'" stroke="var(--line)"/><text x="'+(pl-4)+'" y="'+(Y(v)+4).toFixed(1)+'" text-anchor="end" fill="var(--mute)">'+(MET[met][2]?Math.round(v*100)+'%':v.toFixed(2))+'</text>'}
    const FL=(Math.log2(9)+Math.log2(10))/2;if(met==='m_operand'&&FL>lo&&FL<hi)s+='<line x1="'+pl+'" x2="'+(pl+W)+'" y1="'+Y(FL).toFixed(1)+'" y2="'+Y(FL).toFixed(1)+'" stroke="var(--bad)" stroke-dasharray="4 3"/><text x="'+(pl+W-4)+'" y="'+(Y(FL)+12).toFixed(1)+'" text-anchor="end" fill="var(--bad)">floor: about 3.25</text>';
    s+='<line x1="'+X(meta.stage1).toFixed(1)+'" x2="'+X(meta.stage1).toFixed(1)+'" y1="'+pt+'" y2="'+(pt+H)+'" stroke="var(--mute)" stroke-dasharray="3 3"/><text x="'+(X(meta.stage1)-4).toFixed(1)+'" y="'+(pt+11)+'" text-anchor="end" fill="var(--mute)">branch point</text>';
    const ln=(o,c,wd)=>{let p='',a='',b='';o.x.forEach((x,j)=>{if(x<x0||(x===0&&!MET[met][2]))return;p+=(p?'L':'M')+X(x).toFixed(1)+' '+Y(o.m[j]).toFixed(1)+' ';a+=(a?'L':'M')+X(x).toFixed(1)+' '+Y(o.hi[j]).toFixed(1)+' '});
      for(let j=o.x.length-1;j>=0;j--){const x=o.x[j];if(x<x0||(x===0&&!MET[met][2]))continue;a+='L'+X(x).toFixed(1)+' '+Y(o.lo[j]).toFixed(1)+' '}
      return (seed<0?'<path d="'+a+'Z" fill="'+c+'" opacity=".18"/>':'')+'<path d="'+p+'" fill="none" stroke="'+c+'" stroke-width="'+wd+'"/>'};
    s+=ln(s1,'var(--ink)',1.6);
    // branches start from the last stage-1 point
    bs.forEach(([b,o])=>{const j=s1.x.length-1;o.x.unshift(s1.x[j]);o.m.unshift(s1.m[j]);o.lo.unshift(s1.lo[j]);o.hi.unshift(s1.hi[j]);s+=ln(o,BR[b][1],2)});
    // LR strip
    const ly=pt+H+8,lh=12;
    s+='<text x="'+(pl-4)+'" y="'+(ly+10)+'" text-anchor="end" fill="var(--mute)">LR</text>';
    const lr=x=>x<=meta.stage1?Math.min(1,x/meta.warmup):null;
    let p='';for(let k=0;k<=200;k++){const x=x0+(meta.stage1-x0)*k/200;p+=(p?'L':'M')+X(x).toFixed(1)+' '+(ly+lh-lr(x)*lh).toFixed(1)}
    s+='<path d="'+p+'" fill="none" stroke="var(--ink)"/><path d="M'+X(meta.stage1).toFixed(1)+' '+ly+'L'+X(x1).toFixed(1)+' '+ly+'" stroke="var(--c5)" stroke-width="1.5"/><path d="M'+X(meta.stage1).toFixed(1)+' '+ly+'L'+X(x1).toFixed(1)+' '+(ly+lh)+'" stroke="var(--c2)" stroke-width="1.5"/>';
    [x0,meta.stage1,x1].forEach((x,k)=>{s+='<text x="'+X(x).toFixed(1)+'" y="'+(h-4)+'" text-anchor="'+(k===0?'start':k===2?'end':'middle')+'" fill="var(--mute)">'+x.toLocaleString('en-GB')+'</text>'});
    s+='<text x="'+((pl+pl+W)/2)+'" y="'+(h-4)+'" text-anchor="middle" fill="var(--mute)" opacity="'+(view==='br'?0:1)+'">step</text>';
    $('ty-plot').innerHTML=s+'</svg>';
  }
  $('ty-leg').innerHTML='<span><i style="background:var(--ink)"></i>Stage 1</span>'+BN.map(b=>'<span><i style="background:'+BR[b][1]+'"></i>'+BR[b][0]+'</span>').join('');
  function redraw(){grid();if($('ty-plot').offsetParent)plot()}
  $('ty-met').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;met=b.dataset.m;[...$('ty-met').children].forEach(x=>x.classList.toggle('on',x===b));redraw()});
  $('ty-view').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;view=b.dataset.v;[...$('ty-view').children].forEach(x=>x.classList.toggle('on',x===b));redraw()});
  $('ty-seed').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||+b.dataset.s>=S.length)return;seed=+b.dataset.s;[...$('ty-seed').children].forEach(x=>x.classList.toggle('on',x===b));redraw()});
  // ---- heatmap animation (seed 1) ----
  const s0=S[0],disp=meta.display;
  let brSel='decay_maths';
  $('ty-br').innerHTML=BN.map(b=>'<button data-b="'+b+'"'+(b===brSel?' class="on"':'')+'>'+BR[b][0]+'</button>').join('');
  const col=v=>{const t=Math.max(0,Math.min(1,v/6));return 'hsla('+(210-210*t).toFixed(0)+',75%,'+(55)+'%,'+(0.15+0.6*t).toFixed(2)+')'};
  $('ty-scale').innerHTML=[0,1,2,3,4,5,6].map(v=>'<span style="background:'+col(v)+'"></span>').join('');
  const STEPS=[{k:'0',h:'Step 0: an untrained model',p:'Every character is a guess among '+meta.vocab.length+' symbols: about log2 '+meta.vocab.length+' = '+Math.log2(meta.vocab.length).toFixed(2)+' bits each.'},
    {k:'600',h:'Step 600: spelling arrives first',p:'Letters inside common words and the spaces after them are already cheap; the first letter of each word, where the text makes a choice, is still expensive.'},
    {k:'2000',h:'Step 2,000: words, not yet sense',p:'Most of the remaining loss sits on word starts and on the digits of the sums. The sample reads like English words in no particular order.'},
    {k:'6000',h:'Step 6,000: end of stage 1 at a flat learning rate',p:'This checkpoint is where the four branches start. With 3% sums in the mix the answers are still mostly guessed.'},
    {k:'br',h:'Step 7,200: after the branch',p:''}];
  function cat(prev,c){if(/[0-9+=\n]/.test(c)||/[0-9+=]/.test(prev))return null;return /[a-z]/.test(c)?(/[a-z]/.test(prev)?'in':'st'):'sp'}
  function heat(i){
    const st=STEPS[i],key=st.k==='br'?brSel:st.k,hv=s0.heat[key];
    let h='<span>'+esc(disp[0])+'</span>';const acc={txt:[],ans:[],op:[]};
    let seenEq=false;
    for(let j=1;j<disp.length;j++){const c=disp[j],v=hv[j-1];if(disp[j-1]==='\n')seenEq=false;if(c==='=')seenEq=true;
      const inSum=/[0-9+=]/.test(c)||(c==='\n'&&/[0-9]/.test(disp[j-1]));
      if(/[0-9]/.test(c))(seenEq?acc.ans:acc.op).push(v);else if(!inSum)acc.txt.push(v);
      h+=(c==='\n'?'<span style="background:'+col(v)+'">⏎</span>\n':'<span style="background:'+col(v)+'" title="'+v.toFixed(2)+' bits">'+esc(c)+'</span>')}
    $('ty-heat').innerHTML=h;
    const p=st.k==='br'?(brSel.indexOf('maths')>0?'The maths-heavy branch has seen far more sums: the answer digits go cold, while the operands, which are random, stay warm by necessity.':'On the same mix the answer digits stay warm: decaying the learning rate sharpens what the model has, it does not supply sums it rarely saw.')+(brSel.indexOf('decay')===0?' The text cools a little more on the decayed branches.':' With the learning rate held flat the text barely moves from step 6,000.'):st.p;
    $('ty-cap').innerHTML='<div class="t">'+(st.k==='br'?'Step 7,200: '+BR[brSel][0]:st.h)+'</div><p>'+p+'</p>';
    $('ty-cnt').innerHTML=RD.stat('Text',mean(acc.txt).toFixed(2)+' bits','per character, this passage')+RD.stat('Sum answers',mean(acc.ans).toFixed(2)+' bits','per digit after "="')+RD.stat('Sum operands',mean(acc.op).toFixed(2)+' bits','per digit; floor about 3.25');
    $('ty-sample').textContent=s0.samples[key]||'';
  }
  const A=RD.anim({card:'ty-card',ctl:'ty-ctl',n:STEPS.length,draw:heat,ms:2600,label:'Checkpoint'});
  $('ty-br').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;brSel=b.dataset.b;[...$('ty-br').children].forEach(x=>x.classList.toggle('on',x===b));A.go(STEPS.length-1)});
  // ---- findings, from the recorded runs ----
  const f=k=>{const o=finals(k),r={};Object.keys(o).forEach(b=>r[b]=mean(o[b]));return r};
  const A1=f('acc'),T=f('text'),AN=f('m_answer');
  const pc=v=>(v*100).toFixed(1)+'%';
  $('ty-find').innerHTML=[
    '<b>The data lever moves the skill the data contains.</b> Held-out sum accuracy: '+pc(A1.const_same)+' with no anneal, '+pc(A1.decay_same)+' with the decay alone, '+pc(A1.const_maths)+' with the maths-heavy mix alone and '+pc(A1.decay_maths)+' with both (means of '+S.length+' seeds).',
    '<b>The learning-rate lever moves everything a little.</b> Text loss: '+T.const_same.toFixed(3)+' bits per character with no anneal, '+T.decay_same.toFixed(3)+' with the decay alone; the maths-heavy mix alone makes text slightly worse ('+T.const_maths.toFixed(3)+'), because a quarter of the batch is no longer text, and the decay recovers it ('+T.decay_maths.toFixed(3)+').',
    '<b>The two levers combine.</b> Answer-digit loss falls from '+AN.const_same.toFixed(3)+' to '+AN.decay_maths.toFixed(3)+' bits with both, below either alone ('+AN.decay_same.toFixed(3)+' and '+AN.const_maths.toFixed(3)+'). So the data switch does not need the decay to work, but the decay finishes it.',
    '<b>Where the toy and OLMo 2 differ.</b> Here the decay alone also improved the sums ('+pc(A1.const_same)+' to '+pc(A1.decay_same)+'), while OLMo 2\'s decay alone left GSM* unchanged. A likely reason, untested: two-digit addition is partly learned from the 3% of sums in stage 1, so a quieter optimiser sharpens it, whereas grade-school word problems at 0.6% maths in OLMo 2\'s mix were barely learned, so only new data could help.',
    '<b>What it cannot show.</b> A character model of 0.8M parameters on six novels says nothing about scale: Llama 3 found annealing gains negligible at 405B. It has no tokenizer, no long context and no instruction data, and three seeds bound the noise only roughly. It shows the mechanism, not the size of the effect.'
  ].map(x=>'<li>'+x+'</li>').join('');
  grid();
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-toy']=window.TAB_RENDER['t-toy']||[]).push(()=>{plot();A.redraw()});
  addEventListener('resize',()=>{if($('ty-plot').offsetParent)plot()});
})();
