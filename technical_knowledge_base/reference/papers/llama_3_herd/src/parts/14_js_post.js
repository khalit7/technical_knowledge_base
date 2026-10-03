// ---- Post-training: one prompt through a Llama 3 round, and through PPO-based RLHF ----
(function(){if(!$('pt'))return;const K=20;
  // illustrative reward-model scores for the K samples (seeded), the kept one is the maximum
  const rnd=mulberry32(7),SC=[...Array(K)].map(()=>{let u=0;for(let i=0;i<4;i++)u+=rnd();return u/4}),BEST=SC.indexOf(Math.max(...SC));
  const BOX={l3:[['Prompt','human annotation'],['Sampler','best checkpoint'],['Reward model','scores K'],['SFT','LR 10⁻⁵'],['DPO','β 0.1, masked'],['Average','several runs']],
    ppo:[['Prompt','dataset'],['Policy','generates'],['Reward model','scores'],['Reference','KL penalty'],['Value model','advantage'],['PPO update','policy step']]};
  const MODES={l3:[
    {t:'A prompt from human annotation',c:'Each round starts from prompts collected during human annotation (§4.2.1). The same prompts feed rejection sampling for SFT and, with pairs of responses from two different models, the preference data.',a:0,show:0},
    {t:'Sample K responses offline',c:'The best checkpoint so far (or the best for this capability) writes K = 10 to 30 responses; here K = 20. This is batch inference, outside any training loop, sped up more than 2× by PagedAttention sharing the prompt\'s KV cache across all K (§4.2.2).',a:1,show:1},
    {t:'The reward model scores every response',c:'The reward model, trained on all preference data so far, scores each sample. The bar heights here are illustrative draws, not the paper\'s data.',a:2,show:2},
    {t:'Keep only the best: rejection sampling',c:'The highest-scoring response is kept and the other K − 1 are discarded. Later rounds add system prompts so the kept responses also follow a house tone, style and format.',a:2,show:3},
    {t:'Supervised finetuning on the kept responses',c:'SFT trains on the kept responses plus synthetic and curated data (Table 7): cross-entropy on target tokens, prompt tokens masked, learning rate 10⁻⁵ for 8.5K to 9K steps (§4.1.3).',a:3,show:3},
    {t:'DPO on the newest preference pairs',c:'Pairs from two different models, ranked by annotators (edited > chosen > rejected), only "significantly better" or "better". DPO with β = 0.1 on the latest batches only, header and end-of-turn tokens masked from the loss, plus 0.2 × NLL on the chosen response (§4.1.4).',a:4,show:4},
    {t:'Average the runs',c:'Models trained with different data or hyperparameters at each of the RM, SFT and DPO stages are averaged into one (§4.1.5).',a:5,show:4},
    {t:'Round done: the new model writes the next round\'s data',c:'The averaged model becomes the sampler for the next round\'s rejection sampling and one of the models annotators compare. Six rounds in all (§4.1.6).',a:1,show:5}],
   ppo:[
    {t:'A prompt from the training set',c:'PPO-based RLHF (InstructGPT; Llama 2\'s later rounds) samples prompts during training.',a:0,show:0},
    {t:'The policy generates one response, inside the training loop',c:'Generation happens online: every optimisation step needs fresh samples from the current policy, so inference and training alternate on the same weights.',a:1,show:1},
    {t:'The reward model scores it',c:'A separate reward model network must be resident to score each new response as it is generated.',a:2,show:2},
    {t:'Subtract a KL penalty against the reference model',c:'A frozen copy of the starting policy computes per-token log-probabilities so the reward can be penalised for drifting too far.',a:3,show:2},
    {t:'A value model estimates the advantage',c:'A fourth network, the critic, predicts the expected reward per token so PPO can compute advantages.',a:4,show:2},
    {t:'One clipped PPO step, then sample again',c:'The policy (and value model) update, and the loop returns to generation. Meta "explored on-policy algorithms such as PPO, but found that DPO required less compute for large-scale models and performed better" (§4.1.4).',a:5,show:5}]};
  function draw(m,k,e,w){const S=MODES[m][k],B=BOX[m],cols=w<620?3:6,gap=10,bw=(w-gap*(cols-1))/cols,bh=46,rows=Math.ceil(B.length/cols);
    let s='';const pos=i=>[(i%cols)*(bw+gap),Math.floor(i/cols)*(bh+26)];
    B.forEach((b,i)=>{const [x,y]=pos(i),on=i===S.a,past=m==='l3'?i<S.a||k===7:i<S.a;
      s+=rc(x,y,bw,bh,on?'var(--acc2)':'var(--soft)',{s:on?'var(--acc)':'var(--line)',sw:on?2:1,r:7});
      s+=tx(x+bw/2,y+19,b[0],{fs:12,a:'middle',w:600})+tx(x+bw/2,y+36,b[1],{fs:11,a:'middle',c:'var(--mute)'});
      if(i<B.length-1&&(i+1)%cols!==0){s+=ln2(x+bw+1,y+bh/2,x+bw+gap-1,y+bh/2,past||on?'var(--acc)':'var(--line)',{sw:2})}});
    if(rows>1){const [x,y]=pos(cols-1);s+=ln2(x+bw/2,y+bh+2,x+bw/2,y+bh+12,'var(--line)',{sw:2})+ln2(x+bw/2,y+bh+12,bw/2,y+bh+12,'var(--line)',{sw:2})+ln2(bw/2,y+bh+12,bw/2,y+bh+24,'var(--line)',{sw:2})}
    // the loop back to the start
    const ly=rows*(bh+26)-8;s+='<path d="M'+(w-6)+','+(pos(B.length-1)[1]+bh)+' V'+ly+' H6 V'+(bh+2)+'" fill="none" stroke="'+((m==='l3'&&k===7)||(m==='ppo'&&k===5)?'var(--acc)':'var(--line)')+'" stroke-width="1.6" stroke-dasharray="4 3"/>';
    s+=tx(w/2,ly-4,m==='l3'?'next round (× 6): new preference data and SFT data from the latest model':'next batch: sample again from the updated policy',{fs:11,a:'middle',c:'var(--mute)'});
    // the samples panel
    const py=ly+14,ph=96;s+=rc(0,py,w,ph,'var(--bg)',{s:'var(--line)',r:8});
    if(m==='l3'){const n=K,cw=(w-24)/n;
      for(let i=0;i<n;i++){const x=12+i*cw,vis=S.show>=1?(k===1?cl01(e*n-i):1):0;if(vis<=0)continue;const keep=i===BEST,fade=S.show>=3&&!keep;
        const hh=S.show>=2?(k===2?e:1)*SC[i]*(ph-34):6;
        s+=G(vis*(fade?0.22:1),rc(x+1,py+ph-12-hh,cw-2,hh,keep&&S.show>=3?'var(--c3)':'var(--c1)',{r:2}))}
      s+=tx(12,py+16,S.show===0?'one prompt':S.show===1?'K = 20 sampled responses':S.show===2?'reward-model score of each (illustrative)':S.show<=3?'kept: the best one; the rest are discarded':S.show===4?'kept response → SFT data; chosen/rejected pairs → DPO':'the averaged model samples the next round',{fs:11,c:'var(--mute)'})}
    else{const vis=S.show>=1?(k===1?e:1):0;s+=G(vis,rc(12,py+ph-12-(S.show>=2?.55:.06)*(ph-34),Math.min(40,w/12),(S.show>=2?.55:.06)*(ph-34),'var(--c1)',{r:2}));
      s+=tx(12+Math.min(40,w/12)+10,py+ph/2+4,S.show===0?'one prompt':S.show===1?'one fresh response from the current policy':S.show<5?'scored online, penalised by KL, critic baseline':'gradient step, then generate again',{fs:11,c:'var(--mute)'})}
    return svgW(w,py+ph+2,s,'Post-training data flow')}
  function counters(m,k){const L=m==='l3';
    return stat('Responses sampled per prompt',L?(k>=1?'K = 20':'0'):(k>=1?'1 per step':'0'),L?'10 to 30 in the paper':'repeated every step')+
      stat('Generation inside the update loop',L?'no':'yes',L?'sampling is offline batch inference':'policy samples between updates')+
      stat('Networks held while weights change',L?(k>=5?'2':k>=4?'1':'–'):(k>=4?'4':k>=3?'3':k>=2?'2':'1'),L?(k>=5?'DPO: policy + reference (whose log-probs can be precomputed)':'SFT: the model being trained'):'policy, reference, reward, value')+
      stat('Round',L?(k===7?'1 → 2 of 6':'1 of 6'):'batch by batch',L?'six rounds in all':'continuous')}
  makeAnim({id:'pt',modes:MODES,mode:'l3',draw,counters,dur:3200});})();
