// ---- Check the bill tab: Table 1 with a price slider, utilisation against Llama 3.1 405B, cost per unit of work, wall clock ----
(function(){
if(!$('t-cost'))return;const RC=PAPER.rc,B=RC.bill,FL=RC.flops;
const M=v=>'$'+(v/1e6).toFixed(3)+'M';
function bill(){const p=+$('bp').value;$('bpV').textContent='$'+p.toFixed(2);const h=[B.usd.pre/2,B.usd.ext/2,B.usd.post/2];const tot=h[0]+h[1]+h[2];
  const T1=PAPER.tables.T1;let s='<thead><tr><th class="l">Training costs</th>'+T1.cols.map(c=>'<th>'+c+'</th>').join('')+'</tr></thead><tbody>';
  s+='<tr><td class="l">H800 GPU hours, printed</td>'+T1.hours.map(v=>'<td>'+v+'</td>').join('')+'</tr>';
  s+='<tr><td class="l">GPU hours, recomputed</td>'+h.map(v=>'<td>'+(v/1e3).toLocaleString('en-GB')+'K</td>').join('')+'<td><b>'+(tot/1e3).toLocaleString('en-GB')+'K</b></td></tr>';
  s+='<tr><td class="l">USD at $2, printed</td>'+T1.usd.map(v=>'<td>'+v+'</td>').join('')+'</tr>';
  s+='<tr><td class="l">USD at $'+p.toFixed(2)+'</td>'+h.map(v=>'<td>'+M(v*p)+'</td>').join('')+'<td><b>'+M(tot*p)+'</b></td></tr>';
  s+='<tr><td class="l">Share of the hours</td>'+h.map(v=>'<td>'+(100*v/tot).toFixed(1)+'%</td>').join('')+'<td>100%</td></tr></tbody>';
  $('billT').innerHTML=s;
  $('billNote').innerHTML='Defaults reproduce Table 1 independently: 2,664K + 119K + 5K = 2,788K hours and $5.576M at $2 (the printed $0.01M for post-training is $0.010M). The pre-training line also follows from the paper\'s rate: 180K hours per trillion tokens × 14.8T = '+(B.pre_from_rate/1e3).toLocaleString('en-GB')+'K. Moving the price only rescales the bill; the GPU hours are the claim.'}
$('bp').addEventListener('input',bill);bill();
const G6=()=>({att:$('fAtt').checked,mtp:$('fMtp').checked,pk:$('fPk').value});
function mfu(){const o=G6(),peak=o.pk==='fp8'?FL.peak_fp8:FL.peak_bf16;
  const dsTok=FL.ds.f6N+(o.att?FL.ds.f_attn:0)+(o.mtp?FL.ds.f_mtp:0),dsF=dsTok*14.8e12,ds=dsF/(2664e3*3600*peak);
  const llTok=6*405e9+(o.att?FL.llama.attn_per_token:0),llF=llTok*15.6e12,ll=llF/(30.84e6*3600*peak);
  return {o,ds,ll,dsF,llF,dsTok,llTok}}
function mfuDraw(w){const r=mfu(),H=150,pl=w<520?92:176,pr=46,bw=w-pl-pr;const X=v=>pl+bw*v/0.6;let s='';
  [0,.1,.2,.3,.4,.5,.6].forEach(v=>{s+=ln2(X(v),18,X(v),H-24,'var(--line)')+tx(X(v),H-8,(v*100)+'%',{fs:11,a:'middle',c:'var(--mute)'})});
  if(r.o.pk==='bf16'){s+=rc(X(.38),18,X(.43)-X(.38),H-42,'var(--good)',{r:0,op:.18})+tx(X(.43)+4,30,'Meta reports 38 to 43%',{fs:11,c:'var(--good)'})}
  [['DeepSeek-V3',r.ds,'var(--c1)','2,664K H800 h, 14.8T tokens'],['Llama 3.1 405B',r.ll,'var(--c2)','30.84M H100 h, 15.6T tokens']].forEach(([n,v,c,d],i)=>{const y=40+i*44;
    s+=tx(pl-6,y+13,n,{fs:12,a:'end',w:600})+rc(pl,y,X(v)-pl,20,c,{r:3})+tx(X(v)+5,y+15,(100*v).toFixed(1)+'%',{fs:12,w:600});if(w>=520)s+=tx(pl-6,y+28,d,{fs:11,a:'end',c:'var(--mute)'})});
  $('mfuSvg').innerHTML=svgW(w,H,s,'Model FLOPs utilisation, DeepSeek-V3 against Llama 3.1 405B');
  $('mfuOut').innerHTML=stat('V3 FLOPs per token',(r.dsTok/1e9).toFixed(0)+' GFLOP','6 × 36.6B = 220'+(r.o.att?' + attention 31':'')+(r.o.mtp?' + MTP 10':''))+stat('V3 training FLOPs',sci(r.dsF,2),'× 14.8T tokens')+stat('Llama training FLOPs',sci(r.llF,2),'Meta states 3.8 × 10²⁵')+stat('Ratio of work',(r.llF/r.dsF).toFixed(1)+'×','against '+FL.hours_ratio_pre.toFixed(1)+'× the GPU hours');
  $('mfuKey').innerHTML='With 6 × active parameters × tokens alone, V3 used '+(100*FL.ds.mfu_bf16_6N).toFixed(1)+'% of the dense BF16 peak and Llama 3.1 405B '+(100*FL.llama.mfu_bf16_6N).toFixed(1)+'%: the two runs did the same work per GPU-second, so V3\'s 11× smaller bill is 11× less work, which is the MoE\'s sparsity. Adding attention and the MTP module raises V3 to '+(100*FL.ds.mfu_bf16_all).toFixed(1)+'% of BF16 peak, which is '+(100*FL.ds.mfu_fp8_all).toFixed(1)+'% of the FP8 peak its GEMMs could reach: FP8\'s theoretical 2× was spent absorbing the MoE\'s communication and the BF16 parts of the model, not passed on as a lower bill. This agrees with @PB@\'s Fermi estimate (2.67M hours expected at Llama 3\'s rate, against 2.788M claimed). Derived, not printed in the paper.'.replace('@PB@',A('https://planetbanatt.net/articles/v3fermi.html','planetbanatt'))}
['fAtt','fMtp'].forEach(id=>$(id).addEventListener('change',()=>refit($('mfuSvg'))));$('fPk').addEventListener('change',()=>refit($('mfuSvg')));
function unitDraw(w){const ds=2664e3/(37*14.8),ll=30.84e6/(405*15.6),H=110,pl=w<520?92:150,bw=w-pl-60,X=v=>pl+bw*v/5500;let s='';
  [['DeepSeek-V3',ds,'var(--c1)'],['Llama 3.1 405B',ll,'var(--c2)']].forEach(([n,v,c],i)=>{const y=14+i*40;s+=tx(pl-6,y+14,n,{fs:12,a:'end',w:600})+rc(pl,y,X(v)-pl,22,c,{r:3})+tx(X(v)+5,y+16,fmt(v)+' h',{fs:12,w:600})});
  s+=tx(pl,H-8,'GPU hours per (billion active parameters × trillion tokens)',{fs:11,c:'var(--mute)'});
  $('unitSvg').innerHTML=svgW(w,H,s,'GPU hours per unit of work');
  $('unitNote').textContent='V3: 2,664K hours / (37B × 14.8T) = '+fmt(ds)+'; Llama 3.1 405B: 30.84M / (405B × 15.6T) = '+fmt(ll)+'. They differ by '+(100*Math.abs(ds/ll-1)).toFixed(1)+'%. Uses the paper\'s rounded 37B; with the recounted 37.55B, V3\'s figure is '+fmt(2664e3/(37.55*14.8))+'.'}
$('wallOut').innerHTML=stat('Per trillion tokens',B.days_per_T.toFixed(2)+' days','180K h / 2,048 GPUs; the paper says 3.7')+stat('Pre-training',B.pre_days.toFixed(1)+' days','"less than two months"')+stat('Context extension',B.ext_days.toFixed(1)+' days',(B.ext_tokens/1e9).toFixed(1)+'B tokens at '+fmt(B.ext_hours_per_B)+' h per billion, against '+fmt(B.pre_hours_per_B)+' in pre-training')+stat('Post-training',B.post_hours_wall.toFixed(1)+' hours','5K GPU hours on the whole cluster')+stat('Throughput',fmt(B.tokens_per_gpu_s)+' tokens/s','per GPU, averaged over pre-training');
onTab('t-cost',()=>{fit($('mfuSvg'),mfuDraw);fit($('unitSvg'),unitDraw)});
})();
