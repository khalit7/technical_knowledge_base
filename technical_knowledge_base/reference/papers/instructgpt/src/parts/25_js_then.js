// ---- Then and now: the recipe's seven lines, one later source per step (quotes in inputs/later_extracts.txt) ----
(function(){
const L=['Demonstrations','Preference data','Reward signal','RL algorithm','Staying near the start','Keeping capabilities','Iteration'];
const ax=window.PAPER.meta.ax;
const S=[
 {y:'March 2022',n:'InstructGPT (this paper)',u:ax,set:{0:'about 13k labeler demonstrations; SFT, 16 epochs (PPO starts from a 2-epoch SFT with 10% pretraining mix)',1:'rankings of 4 to 9 answers on about 33k prompts, by about 40 screened contractors',2:'a 6B reward model, Bradley-Terry loss over all C(K,2) pairs (Eq. 1)',3:'PPO, with a value function initialised from the RM',4:'per-token KL penalty in the reward against the SFT model, β = 0.02',5:'pretraining gradients mixed in (PPO-ptx), γ = 27.8',6:'possible; most comparisons came from SFT outputs'},
  c:'The starting recipe, as <<§3.5 and Appendix C>> describe it.'},
 {y:'April 2022',n:'Bai et al., Anthropic',u:'https://arxiv.org/abs/2204.05862',set:{0:'none: "our finetuning occurs purely through RL (we perform context distillation, but this is much more like simple prompting)"',5:'not needed at scale: "alignment bonuses" for 13B and 52B models; "Models with less than about 10B parameters ... paying an \'alignment tax\'"',6:'"an iterated online mode of training, where preference models and RL policies are updated on a weekly cadence with fresh human feedback data"'},
  c:'Helpful and harmless assistants with RLHF, a month after InstructGPT; also "a roughly linear relation between the RL reward and the square root of the KL divergence between the policy and its initialization".'},
 {y:'November 2022',n:'ChatGPT, OpenAI',u:'http://web.archive.org/web/20221202010338/https://openai.com/blog/chatgpt/',set:{0:'dialogue: "human AI trainers provided conversations in which they played both sides"',1:'"two or more model responses ranked by quality", alternative completions of model-written messages in trainers\' conversations',6:'"We performed several iterations of this process."'},
  c:'"using the same methods as InstructGPT, but with slight differences in the data collection setup"; "a sibling model to InstructGPT".'},
 {y:'December 2022',n:'Constitutional AI, Anthropic',u:'https://arxiv.org/abs/2212.08073',set:{0:'for harmlessness: the model\'s own "self-critiques and revisions", then fine-tune on the revised responses',1:'for harmlessness, AI preferences: "use a model to evaluate which of the two samples is better"; human oversight only "through a list of rules or principles"'},
  c:'RL from AI Feedback (RLAIF): the same skeleton, with the harmlessness labels made by a model.'},
 {y:'May 2023',n:'DPO',u:'https://arxiv.org/abs/2305.18290',set:{2:'none: "without explicit reward modeling or reinforcement learning"; the policy itself is the reward model',3:'none: "a simple binary cross-entropy objective" on the preference pairs; no sampling during training',4:'built into the loss: DPO "implicitly optimizes the same objective as existing RLHF algorithms (reward maximization with a KL-divergence constraint)"'},
  c:'Steps 2 and 3 collapse into one supervised loss on the same comparisons.'},
 {y:'July 2023',n:'Llama 2, Meta',u:'https://arxiv.org/abs/2307.09288',set:{1:'"a binary comparison protocol" (chosen against rejected), 1,418,091 Meta comparisons',2:'"two separate reward models, one optimized for helpfulness ... and another for safety"; a margin term m(r) in the ranking loss',3:'"Rejection Sampling fine-tuning" (best of K by reward, then fine-tune), then PPO on top from RLHF-V4',4:'a KL penalty kept: "useful for training stability, and to reduce reward hacking"',6:'five rounds, RLHF-V1 to V5'},
  c:'An open model card for the whole pipeline at scale.'},
 {y:'February 2024',n:'DeepSeekMath (GRPO)',u:'https://arxiv.org/abs/2402.03300',set:{3:'GRPO: "foregoes the value model, instead estimating the baseline from group scores"',4:'moved: "instead of adding KL penalty in the reward, GRPO regularizes by directly adding the KL divergence ... to the loss"'},
  c:'The value network (a model as large as the policy) goes; DeepSeekMath names this paper as the source of the per-token KL it replaces.'},
 {y:'November 2024',n:'Tülu 3, Ai2',u:'https://arxiv.org/abs/2411.15124',set:{0:'SFT on curated open data',1:'preference pairs for DPO',2:'for checkable tasks, RLVR: "the policy only receives a reward when its generated responses are verifiably correct"',3:'DPO, then RL with verifiable rewards'},
  c:'A fully open recipe: "supervised finetuning (SFT), Direct Preference Optimization (DPO), and ... Reinforcement Learning with Verifiable Rewards (RLVR)"; OLMo 2 adopts it.'},
 {y:'January 2025',n:'DeepSeek-R1',u:'https://arxiv.org/abs/2501.12948',set:{0:'R1-Zero none: "relies exclusively on reinforcement learning without supervised fine-tuning"',2:'"rule-based rewards" (accuracy and format) for reasoning; reward models for general data',3:'GRPO'},
  c:'For reasoning, the learned reward model is replaced by checking the answer.'}];
let k=0;
function cur(i){const v={},from={};for(let j=0;j<=i;j++)Object.keys(S[j].set).forEach(l=>{v[l]=S[j].set[l];from[l]=j});return {v,from}}
function draw(){const st=S[k],c=cur(k);$('thnT').innerHTML=st.y+': <a href="'+st.u+'" target="_blank" rel="noopener noreferrer">'+escH(st.n)+'</a>';
  $('thnC').innerHTML=escH(st.c).replace('&lt;&lt;§3.5 and Appendix C&gt;&gt;','<a href="'+ax+'#S3.SS5" target="_blank" rel="noopener noreferrer">§3.5 and Appendix C</a>');
  let h='';L.forEach((n,l)=>{const ch=k>0&&c.from[l]===k;h+='<div class="k">'+n+'</div><div>'+(ch?'<span class="chg">changed here</span> ':'')+escH(c.v[l])+(c.from[l]<k&&k>0?' <span class="small mute">('+(c.from[l]===0?'InstructGPT':'from '+escH(S[c.from[l]].n))+', not mentioned here)</span>':'')+'</div>'});
  $('thnCard').innerHTML=h;
  const kept=L.filter((_,l)=>c.from[l]===0).length;
  $('thnCnt').innerHTML=stat('step',(k+1)+' of '+S.length,st.y)+stat('lines this source changes',Object.keys(st.set).length+(k===0?' (all set)':''),'of 7')+stat('lines still as in InstructGPT',kept+' of 7','unchanged or not mentioned since');
  $('thnScrub').value=k;$('thnBack').disabled=k===0;$('thnFwd').disabled=k===S.length-1}
$('thnBack').addEventListener('click',()=>{k=Math.max(0,k-1);draw()});$('thnFwd').addEventListener('click',()=>{k=Math.min(S.length-1,k+1);draw()});
$('thnScrub').addEventListener('input',e=>{k=+e.target.value;draw()});$('thnScrub').max=S.length-1;
draw();
const fate=[['Demonstrations (SFT first)','survived as the first stage in most pipelines (ChatGPT, Llama 2, Tülu 3); skipped by Bai et al. and R1-Zero'],
 ['Human comparisons','survived; often pairs rather than rankings (Llama 2), and partly replaced by AI feedback (Constitutional AI)'],
 ['A learned reward model','survived for open-ended quality (Llama 2, R1\'s general data); removed by DPO; replaced by checks for verifiable tasks (Tülu 3, R1)'],
 ['PPO with a value function','PPO survived in Llama 2 and ChatGPT; the value function was dropped by GRPO; RL removed entirely by DPO'],
 ['KL to the starting model','survived in every source above that uses RL or DPO: in the reward (Llama 2), in the loss (GRPO), in the objective by construction (DPO); Tülu 3 calls its RLVR objective "very similar to the standard KL-constrained RLHF objective"'],
 ['Pretraining mix (ptx)','not mentioned by any later source above (which does not show that none uses it); Bai et al. found no tax to repair at 13B and above'],
 ['Iterating data and models','survived and grew: weekly online rounds (Bai et al.), five rounds (Llama 2)']];
$('thnSum').innerHTML='<table><thead><tr><th>InstructGPT\'s line</th><th>What happened to it (sources in the steps above)</th></tr></thead><tbody>'+fate.map(r=>'<tr><td>'+escH(r[0])+'</td><td>'+escH(r[1])+'</td></tr>').join('')+'</tbody></table>';
})();
