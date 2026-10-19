// ---- Reading section 6: the same batch of 8 tokens through a dense FFN and an MoE layer (8 experts, top 2, capacity factor 1.25) ----
// Router probabilities: recorded from the tiny GPT's moe8top2 run (block 2, first 8 tokens of the running sequence; Mixture of experts child,
// router_probs_8tok.json) via window.RDL.moe_route. The seeded draw below (mulberry32, seed 26) is only a fallback if that data is missing.
(function(){
  const $=id=>document.getElementById(id);
  if(!window.RD||!$('rd-moe'))return;
  const TOK=['Once','upon','a','time',',','a','little','girl'];
  const E=8,K=2,CF=1.25,CAP=Math.ceil(CF*TOK.length*K/E); // rounded up, as tiny_gpt.py does (math.ceil)
  function mb(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  const r=mb(26);
  const P=TOK.map(()=>{const lg=[...Array(E)].map(()=>(r()-.5)*4);const m=Math.max(...lg);const ex=lg.map(x=>Math.exp(x-m));const s=ex.reduce((a,b)=>a+b,0);return ex.map(x=>x/s)});
  const rec=window.RDL&&window.RDL.moe_route; // optional recorded {tokens:[...], probs:[[...8]...]} from a lab
  if(rec&&rec.probs&&rec.probs.length===TOK.length){rec.probs.forEach((p,i)=>P[i]=p);if(rec.tokens)rec.tokens.forEach((t,i)=>TOK[i]=t)}
  const TOP=P.map(p=>[...p.keys()].sort((a,b)=>p[b]-p[a]).slice(0,K));
  // dispatch in batch order: the first CAP assignments to an expert are kept, the rest dropped
  const load=Array(E).fill(0),kept=TOP.map(()=>[]),drop=TOP.map(()=>[]);
  TOP.forEach((ix,t)=>ix.forEach(e=>{load[e]++;(load[e]<=CAP?kept:drop)[t].push(e)}));
  const nDrop=drop.reduce((s,d)=>s+d.length,0),idle=load.filter(x=>x===0).length,maxL=Math.max(...load);
  let mode='moe';
  const CAPS={
    moe:[['A batch of 8 tokens reaches the FFN sublayer','Each token is a vector of d numbers from the residual stream. Below sit 8 experts, each an FFN the size of the dense model\'s one FFN (the Mixtral 8x7B layout).'],
      ['The router scores every expert for every token','A linear layer (d &times; 8 weights) gives 8 logits per token; a softmax turns them into the strips under each token (darker is higher). This costs almost nothing next to an expert.'],
      ['Each token keeps its top 2','Only the two highest-scoring experts run for a token; their scores are renormalised to weight the two outputs. 16 assignments for 8 tokens.'],
      ['Dispatch, with a capacity per expert','Each expert takes at most capacity factor &times; tokens &times; k / experts = 1.25 &times; 8 &times; 2 / 8 = 2.5, rounded up to '+CAP+' tokens (some implementations round down, to 2). Assignments over the limit are dropped (dashed red): that token gets less, or no, FFN output in this layer. '+(nDrop?nDrop+(nDrop>1?' assignments are':' assignment is')+' dropped here. ':'')+(idle?idle+(idle>1?' experts receive':' expert receives')+' nothing and '+(idle>1?'their':'its')+' weights sit idle.':'')],
      ['The experts run on the tokens they kept','Each token pays for 2 expert FFNs, twice the dense FFN, while the layer stores 8. Busy experts set the step time: the slowest expert waits for its full load.'],
      ['Outputs are weighted and added back','Each token adds the weighted sum of its kept experts\' outputs to the residual stream. A balancing loss or a per-expert bias pushes the router towards equal loads in training, so fewer assignments are dropped.']],
    dense:[['The same batch of 8 tokens reaches the FFN sublayer','One FFN, drawn at the same scale as one expert.'],
      ['Every token goes through the one FFN','No router, no choices: every token uses every FFN weight.'],
      ['The FFN runs on all 8 tokens','Each token pays for 1 FFN; the layer stores 1. Nothing can be dropped and nothing is idle.'],
      ['Outputs are added back','Compared with the MoE: an eighth of the weights stored, half the compute per token. MoE buys more parameters (knowledge) at a modest compute increase, paid for in memory and routing.']]};
  const svgEl=$('rd-moe-svg'),cap=$('rd-moe-cap'),cnt=$('rd-moe-cnt');
  const col=i=>'var(--c'+(1+i%6)+')';
  function draw(i){
    const W=Math.min(760,RD.width(svgEl)),pad=6,bw=(W-2*pad)/8,tw=bw-4;
    const yT=8,hT=26,yS=yT+hT+3,hS=Math.max(5,Math.min(8,tw/8)),yE=118,hE=34,yL=yE+hE+16,hL=56,H=yL+hL+18;
    let b='';
    const tx=t=>pad+t*bw+2,ex=e=>pad+e*bw+2;
    const dense=mode==='dense';
    // tokens
    TOK.forEach((s,t)=>{
      const dropped=!dense&&i>=3&&drop[t].length;
      b+='<rect x="'+tx(t)+'" y="'+yT+'" width="'+tw+'" height="'+hT+'" rx="4" fill="var(--soft)" stroke="'+(dropped?'var(--bad)':'var(--line)')+'"/>';
      b+=RD.t(tx(t)+tw/2,yT+17,RD.esc(s),{a:'middle',fs:11});
      if(!dense&&i>=1){const cw=tw/E;P[t].forEach((p,e)=>{const on=i>=2&&TOP[t].includes(e);
        b+='<rect x="'+(tx(t)+e*cw)+'" y="'+yS+'" width="'+Math.max(1,cw-0.6)+'" height="'+hS+'" fill="var(--acc)" fill-opacity="'+(0.12+0.88*p/Math.max(...P[t])).toFixed(2)+'"'+(on?' stroke="var(--ink)" stroke-width="1"':'')+'/>'})}
    });
    // lines
    if(i>=(dense?1:2)){
      TOP.forEach((ix,t)=>{
        const list=dense?[[0,true]]:ix.map(e=>[e,!drop[t].includes(e)]);
        list.forEach(([e,ok])=>{
          const x1=tx(t)+tw/2,y1=yS+hS+1,x2=dense?W/2:ex(e)+tw/2,y2=yE-1;
          const bad=!dense&&i>=3&&!ok;
          b+='<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+(bad?'var(--bad)':'var(--mute)')+'" stroke-opacity="'+(bad?1:(i>=3||dense?.75:.4))+'"'+(bad?' stroke-dasharray="4 3"':'')+'/>';
        });
      });
    }
    // experts (or the one dense FFN), same size
    const boxes=dense?[[W/2-tw/2,'FFN']]:[...Array(E).keys()].map(e=>[ex(e),'E'+(e+1)]);
    boxes.forEach(([x,l],e)=>{
      const n=dense?TOK.length:Math.min(load[e],CAP);
      const busy=i>=(dense?2:4)&&n>0;
      b+='<rect x="'+x+'" y="'+yE+'" width="'+tw+'" height="'+hE+'" rx="4" fill="'+(busy?'var(--acc2)':'var(--bg)')+'" stroke="'+(busy?'var(--acc)':'var(--line)')+'"/>';
      b+=RD.t(x+tw/2,yE+21,l,{a:'middle',fs:11,w:busy?600:400});
    });
    // load bars with the capacity line
    if(!dense&&i>=3){
      const u=hL/Math.max(4,maxL);
      for(let e=0;e<E;e++){const k=Math.min(load[e],CAP),o=load[e]-k;
        if(k)b+='<rect x="'+(ex(e)+tw*.2)+'" y="'+(yL+hL-k*u)+'" width="'+tw*.6+'" height="'+k*u+'" fill="var(--acc)"/>';
        if(o)b+='<rect x="'+(ex(e)+tw*.2)+'" y="'+(yL+hL-load[e]*u)+'" width="'+tw*.6+'" height="'+o*u+'" fill="var(--bad)" fill-opacity=".55"/>';
        b+=RD.t(ex(e)+tw/2,yL+hL+13,String(load[e]),{a:'middle',fs:11});
      }
      const yc=yL+hL-CAP*u;
      b+='<line x1="'+pad+'" x2="'+(W-pad)+'" y1="'+yc+'" y2="'+yc+'" stroke="var(--bad)" stroke-dasharray="5 3"/>';
      b+=RD.t(W-pad,yc-3,'capacity '+CAP,{a:'end',fs:11,fill:'var(--bad)'});
    }
    if(dense&&i>=2){b+=RD.t(W/2,yL+hL/2,'8 tokens, 1 FFN each',{a:'middle',fs:11,fill:'var(--mute)'})}
    svgEl.innerHTML=RD.svg(W,H,b,dense?'Dense FFN: every token through one FFN':'MoE: router picks 2 of 8 experts per token, with capacity '+CAP);
    const c=CAPS[mode][i];cap.innerHTML='<div class="t">Step '+(i+1)+' of '+CAPS[mode].length+': '+c[0]+'</div><p>'+c[1]+'</p>';
    const last=i===CAPS[mode].length-1;
    cnt.innerHTML=dense?
      RD.stat('FFN weights stored','1 &times;','one FFN')+RD.stat('Weights used per token','1 &times;','every weight')+RD.stat('Assignments dropped','0','')+RD.stat('Idle weights','0','')
     :RD.stat('FFN weights stored','8 &times;','8 experts')+RD.stat('Weights used per token','2 &times;','top 2 experts')+
      RD.stat('Assignments dropped',i>=3?nDrop+' of 16':'?','capacity '+CAP+' per expert')+RD.stat('Idle experts',i>=3?String(idle):'?','tokens per expert: '+(i>=3?Math.min(...load)+' to '+maxL:'?'));
  }
  const an=RD.anim({card:'rd-moe',ctl:'rd-moe-ctl',n:CAPS.moe.length,draw,ms:2200,label:'MoE step'});
  RD.seg($('rd-moe-mode'),m=>{mode=m;an.reset(CAPS[m].length)});
  RD.onResize(()=>an.redraw());
})();
