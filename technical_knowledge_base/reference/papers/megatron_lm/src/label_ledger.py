"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-24 from the page before the light pass).
Each entry: id -> (label, key). Rerun after editing; it rewrites label and key only and appends the new units once."""
import json
from pathlib import Path
F = Path(__file__).with_name('ledger.json')
D = 'models_and_training/topic_llm_training_and_post_training/distributed_training'
NORM = 'models_and_training/topic_llm_architecture/normalisation_residuals_and_stability'
L = {
1:('fat',''),2:('fat',''),3:('core','Mohammad Shoeybi'),4:('core',"about 5.5 times GPT-2's 1.5B"),5:('core','weak scaling in model size against a strong baseline'),6:('fat',''),
7:('core','BERT-large at 336M parameters'),8:('core','a 32 GB V100 was running out even with activation checkpointing'),9:('core','the model must fit entirely on one worker'),10:('core','as ALBERT does'),
11:('core','PipeDream and others'),12:('core','require rewriting the model'),13:('fat',''),14:('core','16 bytes per parameter for mixed-precision Adam'),15:('fat',''),
16:('depth','checkpointed fp16 layer inputs'),17:('depth',"Batch 8 and sequence 1,024 as in the paper's model-parallel scaling runs"),18:('depth','Ignores fragmentation and framework buffers'),
19:('core','the fewest GPUs that fit is 1, 2, 4 and 8'),20:('core','no new compiler, no new framework'),21:('fat',''),22:('core','now called tensor parallelism'),23:('core','synchronise a few times per layer'),
24:('core','a self-attention block followed by a two-layer MLP'),25:('core','matrix multiply (GEMM) followed by a GeLU'),26:('core','is the batch of token vectors'),27:('core','split a by rows and x by columns'),
28:('core','Each GPU holds a partial sum of the whole output'),29:('core','must add their partials (an all-reduce)'),30:('core','split a by columns'),31:('core','applies to each shard independently'),
32:('core','How close is that to the true GeLU(XA)?'),33:('core','these are real matrices'),34:('core','with no nonlinearity both splits are exact'),35:('depth','3 tokens, h = 8'),
36:('depth','tanh approximation used by GPT-2 and BERT'),37:('depth','largest absolute difference over all 48 outputs'),38:('depth',"Illustrative sizes; the equations are the paper's"),
39:('core','single all-reduce before dropout'),40:('core','column-split the layer that feeds a nonlinearity'),41:('core','The MLP block is'),42:('core','two conjugate autograd functions'),
43:('core','4 all-reduces in total'),44:('fat',''),45:('core','embarrassingly parallel over heads'),46:('core','for a subset of heads'),47:('core','consumes the local head outputs directly'),
48:('depth','16 heads of 192 scale at 82%'),49:('core',"GPT-2's vocabulary is 50,257 tokens"),50:('core','is split along the vocabulary'),51:('core','gives each GPU the logits of its slice'),
52:('core','fused with the cross-entropy'),53:('depth','Bars to scale on a log axis'),54:('core',"the maximum logit, the target's logit and the sum of exponentials"),55:('depth',"Llama 3's vocabulary is from its"),
56:('core','50,257 becomes 51,200'),57:('core','keeping the GPUs compute bound'),58:('core','duplicate copy of the LayerNorm parameters'),59:('core','no updated parameter values are ever communicated'),
60:('depth','some inside (attention dropout)'),61:('depth','seeded uniquely per worker'),62:('core','orthogonal to data parallelism'),63:('core','model-parallel group'),64:('core','The total GPU count is the product'),
65:('core','64-way data parallelism is 512 GPUs'),66:('core','PyTorch calling NCCL'),67:('core','100 GB/s per server between servers'),68:('fat',''),69:('core','all-reducing gradients once per step'),
70:('depth','16 V100s in two rows of 8'),71:('depth','CC-Stories'),72:('depth','174 GB'),73:('depth','dynamic loss scaling'),74:('depth','0.083 for the 72-layer'),75:('depth','global gradient-norm clipping at 1.0'),
76:('depth','3k warmup iterations'),77:('depth','sentence-order prediction'),78:('depth','8 InfiniBand adapters per server'),79:('core','hidden size per head at 96'),80:('core','a fixed batch of 8'),
81:('core','30% of the theoretical peak'),82:('core','weak scaling in model size'),83:('core','the chart is missing from the arXiv HTML'),84:('core','74% at 512 GPUs is 14.8 PFLOP/s'),
85:('core','keeps 77% of linear scaling'),86:('core','sustaining up to 15.1 PFLOP/s'),87:('core','76% or 74%?'),88:('core','75.6%'),89:('core','which measurement each uses'),90:('core','neither is wrong by its own arithmetic'),
91:('core','2.98 on 8'),92:('core','82%, 59% and 37% of linear'),93:('core','larger than any left-to-right transformer language model'),94:('core','it takes about two days (2.10)'),95:('core','reaches 9.27'),
96:('core','19.31'),97:('core','Khandelwal et al. 2019'),98:('core','10.8 against 15.8'),99:('depth','Two evaluation details matter'),100:('depth','245,566'),101:('depth','every one of its subword tokens'),
102:('depth','9.09%'),103:('depth','17B Turing-NLG'),104:('core','often-forgotten second contribution'),105:('core','answered with parameter sharing'),106:('core','752M BERT'),107:('core','What is the change?'),
108:('core','takes the residual from before the LayerNorm'),109:('depth','The count is structural'),110:('fat',''),111:('core','the pre-LN arrangement GPT-2 already used'),112:('core',"BERT-xlarge's configuration"),
113:('core','1.58, 1.30, 1.16'),114:('core','91.4/91.4'),115:('core',"89.5% against ALBERT's 86.5%"),116:('core','ratio 1 against 2 to 3'),117:('fat',''),118:('fat',''),
119:('core','The mechanism is exact'),120:('core','only the order of floating-point additions'),121:('core','error of 0 on real matrices'),122:('core','no accuracy trade-off to measure'),
123:('core','The baseline is strong, not flattering'),124:('core','the entire application'),125:('core','A weak baseline would have inflated'),126:('core','The configurations check out'),
127:('core','Every parameter count in Tables 1, 2 and 4'),128:('core','MT-NLG, the PTD-P runs and Llama 3'),129:('core','is weak scaling in model size, not a speedup'),130:('core','different models, different GEMM shapes'),
131:('core','8 GPUs give 2.98 times, 37% of linear'),132:('core','is primarily designed to enable training models larger'),133:('core','The paper disagrees with itself on the headline'),134:('core','76% in the abstract and introduction'),
135:('depth','How FLOPs are counted is not stated'),136:('depth','recomputed forward pass of activation checkpointing, or attention'),137:('depth','implies 13.8 PFLOP/s'),138:('depth','no seeds or error bars'),
139:('depth',"92.7 against XLNet's 92.3"),140:('depth','not like for like'),141:('depth','nearest-neighbour language model'),142:('depth','the LAMBADA baseline GPT-2 itself'),143:('depth','bounds overlap only at'),
144:('depth','is a 5-way ensemble'),145:('depth','which cuts the other way'),146:('depth','An unfinished run'),147:('depth','rests on one pair of curves'),148:('depth','one 752M run of each arrangement'),
149:('depth','later gave a theoretical reason'),150:('depth','one comparison, not a study'),151:('core','believe the method completely'),152:('core','a 7 times larger model on 8 GPUs'),
153:('core','Tensor parallelism became a standard axis'),154:('core','3D parallelism'),155:('volatile','tensor_parallel_size'),156:('volatile','The codebase outlived the paper'),157:('volatile','Nemotron-4 340B report'),
158:('core','Follow-up work completed the picture'),159:('core','502 PFLOP/s on 3,072 A100s'),160:('core','classic pre-training scaling playbook'),161:('core','fixed the mental model for communication cost'),
162:('core','capped at the NVLink domain'),163:('core','tensor model parallelism is best within a node'),164:('core','helped make pre-norm the default'),165:('core','It was not the first pre-LN transformer'),
166:('owned:'+NORM,'Xiong et al. 2020'),167:('core','lets BERT-style encoders scale'),168:('core','contemporaneous memory-side alternative'),169:('core','TP as the default multi-GPU serving strategy'),
170:('core','One MLP block runs forward and backward'),171:('core','Megatron splits A by columns and B by rows'),172:('core','must synchronise before the GeLU'),173:('core','the lane is 4 H wide'),
174:('depth','100 GB/s per server ÷ 16 GPUs'),175:('core','a partial sum, full width but not yet the answer'),176:('core','the full tensor, identical on every GPU'),177:('depth','an all-reduce of n elements sends'),
178:('depth','no overlap and no latency'),179:('depth','derived here (the conjugate of each forward step)'),180:('fat',''),181:('core','2 all-reduces forward and 2 backward'),182:('depth','6 per layer in practice'),
183:('depth','Does communication alone explain the lost efficiency'),184:('depth','a model that charges only for communication'),185:('depth','Switch the link to InfiniBand'),186:('depth','count the recomputation all-reduces'),
187:('depth','4 or 6 all-reduces of'),188:('depth','since the 1-GPU baseline has no communication'),189:('depth','speedups ÷ t'),
190:('core','Every number below is transcribed from the arXiv HTML (v4)'),191:('fat',''),192:('core','tied embedding with the padded vocabulary'),193:('core','1.2, 2.5, 4.2 and 8.3 billion independently'),
194:('core','35.9 billion tokens'),195:('core','which counts the recomputed forward pass of activation checkpointing'),196:('fat',''),197:('core','Training days = days per epoch'),198:('core','27.0 TFLOP/s per GPU'),
199:('core','6.5% below'),200:('core','Table 7: heads at 8.3B'),201:('core','8.69'),202:('core','word (30,522), position (512)'),203:('core','336M, 1.3B and 3.9B independently'),
204:('core','distance from the best non-Megatron model'),205:('core','Where a cell has two numbers'),206:('core','Show the 13 rows'),207:('core','Then and now: tensor parallelism from 2019 to 2026'),
208:('core','coloured by the axis that lives inside it'),209:('core','drawn dashed and marked'),210:('core','Degrees and GPU counts are as each paper states them'),211:('fat',''),
212:('core','35-way PP per 280-GPU replica'),213:('core','activation memory falls 5×'),214:('core','CP 16 at 131,072 tokens'),215:('core','Within each machine, the high NVLink bandwidth'),
216:('core','Vocabulary-parallel embeddings and the fused cross-entropy'),217:('core','serves attention with TP 4'),218:('fat',''),219:('core','Reading time of the resources below'),
220:('core','the HTML version has the anchors'),221:('core','still developed, now as Megatron-Core'),222:('core','The Ultra-Scale Playbook'),223:('core','How to Train Really Large Models on Many GPUs'),
224:('core','Lilian Weng, 2021'),225:('core','Efficient Large-Scale Language Model Training on GPU Clusters'),226:('core','Reducing Activation Recomputation in Large Transformer Models'),
227:('core','the layer structure being partitioned'),228:('core','to scale it past 336M'),229:('core','Turing-NLG used both'),230:('core','at the scale this line of work enabled'),
231:('core','the axis that later replaced tensor parallelism'),232:('core','4D parallelism with tensor parallelism of 8'),233:('core','pipeline 16, expert 64, ZeRO-1'),234:('core','Bounding the memory bottlenecks'),
235:('core','distributed training: the tensor-parallel axis'),236:('core','tensor parallelism as the default way to serve'),237:('core','NVLink and NVSwitch bandwidth as the constraint'),238:('core','DualPipe'),
239:('core','This page is one row of the Papers database'),
}
FAT_NOTES = {1:'old reading-time line, replaced by the measured subtitle',2:'tab labels',6:'card links and section nav',13:'lead-in to the calculator',15:'"Try" instruction',21:'section heading',
44:'pointer to the removed Split tab; the animation is now inline',68:'"Try: pick a GPU" instruction',110:'animation manners line, replaced by "Nothing moves until you press play"',117:'recap of the results',
118:'sub-heading',180:'animation manners line',191:'"each section links the table" instruction',196:'sentence fragment of 195',211:'animation manners line',218:'"every link opens in a new tab"'}
NEW = [
 {'tab':'t-read','section':'the idea in one sentence','text':'Core sentence: column-split the matrix feeding a nonlinearity, row-split the one after; 2 all-reduces forward and 2 backward per layer.','label':'core','key':'split the matrix that feeds a nonlinearity by columns'},
 {'tab':'t-read','section':'hero','text':'Hero figure: one transformer layer on 2 GPUs with the 8.3B scaling shapes, redrawn from Figures 3 and 4.','label':'core','key':'One transformer layer on 2 GPUs'},
 {'tab':'t-read','section':'hero','text':'You need: data parallelism and all-reduce (Distributed training); new terms column-parallel, row-parallel, f and g, weak and strong scaling.','label':'core','key':'each GPU holds input rows and produces a partial sum'},
 {'tab':'t-read','section':'method: the f and g operators','text':'Prediction: Option 1 sends 3.75 times Megatron\'s bytes per block, 15(t-1)/t against 4(t-1)/t numbers per token in units of H.','label':'core','key':'3.75 times'},
 {'tab':'t-read','section':'problem','text':'What activation checkpointing recomputes and trades is taught by the distributed-training page (section 10).','label':'owned:'+D,'key':'activation checkpointing'},
 {'tab':'t-read','section':'problem','text':'The pipeline bubble itself is drawn on the distributed-training page (section 6).','label':'owned:'+D,'key':'bubble'},
 {'tab':'t-read','section':'results: bert','text':'Why pre-LN trains more stably (gradients at initialisation) is taught on Normalisation, residuals and stability.','label':'owned:'+NORM,'key':'post-norm trains only in a narrow window'},
 {'tab':'t-read','section':'method: f and g','text':'Ring all-reduce bytes 2(n-1)/n and its cost model belong to Interconnects and scaling.','label':'owned:systems_and_performance/topic_hardware/interconnects_and_scaling','key':'2(n−1)/n'},
]
u = json.loads(F.read_text())
for x in u:
    if x['id'] in L:
        x['label'], x['key'] = L[x['id']]
        if x['id'] in FAT_NOTES: x['note'] = FAT_NOTES[x['id']]
have = {x['text'] for x in u}
n = max(x['id'] for x in u)
for x in NEW:
    if x['text'] not in have:
        n += 1; u.append(dict(id=n, where='', **x))
    else:
        for y in u:
            if y['text'] == x['text']: y['label'], y['key'] = x['label'], x['key']
F.write_text(json.dumps(u, indent=1, ensure_ascii=False) + '\n')
print('labelled', len(u))
