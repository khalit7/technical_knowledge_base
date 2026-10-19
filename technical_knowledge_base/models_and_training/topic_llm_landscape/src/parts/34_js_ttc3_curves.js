(function(){
const T=window.TTC;if(!T)return;
const {$,fmt,fmtBytes,mulberry32,segBind,svgEl,stat,sci,A,logFrame,lineChart,legend,n3,pc1,TM,makeAnim,onTab}=T;
// ---- Deeper: test-time compute. Published curves, recomputed ----
(function(){
  if(!$('ttcCvSvg'))return;
  // Brown et al. (2024) fits (a, b) from Figures 5 and 10; stated measurements from the text
  const FITS=[
    {n:'SWE-bench Lite, DeepSeek-Coder-V2 + Moatless',a:-1.74,b:-0.21,c:'var(--c1)',obs:[[1,.159,'15.9% with one sample (abstract)'],[250,.56,'56% with 250 samples (abstract)']]},
    {n:'MATH, Llama-3-8B-Instruct',a:-1.33,b:-0.43,c:'var(--c2)',obs:[[100,.829,'82.9% at 100 samples (Section 1)'],[10000,.9844,'98.44% at 10,000 samples (Section 1)']],vote:[[100,.405],[10000,.4141]]},
    {n:'MATH, Llama-3-70B-Instruct',a:-0.75,b:-0.46,c:'var(--c3)',obs:[]},
    {n:'CodeContests, Llama-3-70B-Instruct',a:-2.52,b:-0.11,c:'var(--c4)',obs:[]},
    {n:'CodeContests, Gemma-2B',a:-8.54,b:-0.14,c:'var(--c5)',obs:[[1,.0002,'0.02% with one sample (Section 1)'],[10000,.071,'7.1% with 10,000 samples (Section 1)']]},
    {n:'MiniF2F, Llama-3-8B-Instruct',a:-1.33,b:-0.08,c:'var(--c6)',obs:[]}];
  let on=new Set([0,1,4]);
  const pick=$('ttcCvPick');pick.innerHTML=FITS.map((f,i)=>'<button type="button" data-i="'+i+'" class="'+(on.has(i)?'on':'')+'" aria-pressed="'+on.has(i)+'">'+f.n+'</button>').join('');
  pick.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{const i=+b.dataset.i;on.has(i)?on.delete(i):on.add(i);if(!on.size)on.add(i);b.classList.toggle('on',on.has(i));b.setAttribute('aria-pressed',on.has(i));draw()}));
  const cv=(f,k)=>Math.exp(f.a*Math.pow(k,f.b));
  function draw(){const narrow=$('ttc-s-curves').clientWidth<560,ks=[];for(let e=0;e<=4.0001;e+=0.05)ks.push(Math.pow(10,e));
    const ser=[],pts=[];FITS.forEach((f,i)=>{if(!on.has(i))return;ser.push({name:f.n+' (fit a = '+f.a+', b = '+f.b+')',c:f.c,pts:ks.map(k=>[k,cv(f,k)])});
      f.obs.forEach(o=>pts.push({x:o[0],y:o[1],c:f.c,l:o[2]}));
      if(f.vote){ser.push({name:'same samples, majority vote or reward model (measured)',c:f.c,dash:true,dots:true,pts:f.vote})}});
    $('ttcCvSvg').innerHTML=lineChart({W:narrow?360:700,H:280,x:[1,1e4],logx:true,y:[0,1],series:ser,pts,xt:[[1,'1'],[10,'10'],[100,'100'],[1000,'1,000'],[1e4,'10,000']],yt:[[0,'0%'],[.25,'25%'],[.5,'50%'],[.75,'75%'],[1,'100%']],xl:'samples per problem k (log scale)',yl:'coverage',label:'Coverage against samples'})+legend(ser)+'<div class="leg"><span>○ circles: numbers the paper states in its text</span></div>';
    let t='<tr><th>Model and task</th><th class="num">k</th><th class="num">fit exp(a k<sup>b</sup>)</th><th class="num">stated</th><th class="num">fit − stated</th></tr>';
    FITS.forEach(f=>f.obs.forEach(o=>{const v=cv(f,o[0]);t+='<tr><td>'+f.n+'</td><td class="num">'+fmt(o[0])+'</td><td class="num">'+(100*v).toFixed(v<0.01?2:1)+'%</td><td class="num">'+(100*o[1]).toFixed(o[1]<0.01?2:o[1]>0.98?2:1)+'%</td><td class="num">'+(Math.abs((v-o[1])*100)<0.05?'0.0':((v-o[1])*100>0?'+':'−')+Math.abs((v-o[1])*100).toFixed(1))+'</td></tr>'}));
    $('ttcCvTab').innerHTML=t;
    $('ttcCvRepro').innerHTML='<b>Defaults reproduce Brown et al.\'s stated coverage within 2 points, independently</b> (the fits come from the curves, the stated numbers are separate measurements): 17.6% and 57.9% against 15.9% and 56% on SWE-bench Lite; 83.2% and 97.5% against 82.9% and 98.44% on MATH. <b>Gemma-2B on CodeContests does not reproduce at the far end:</b> the fit gives 9.5% at 10,000 samples against the stated 7.1%. The dashed line is the paper\'s point: voting and reward models plateau near 41% while coverage climbs past 98%.'}
  onTab(draw);

  // selectors bars
  const SB=[
    {n:'o1, AIME 2024',v:[['one sample',.74],['vote over 64',.83],['learned scorer over 1,000',.93]]},
    {n:'DeepSeek-R1, AIME 2024',v:[['one sample (pass@1)',.798],['majority vote',.867],['some sample right (pass@64)',.90]]},
    {n:'Llama-3-8B-Instruct, MATH, 10,000 samples',v:[['vote or reward model',.4141],['some sample right (coverage)',.9844]]},
    {n:'code-davinci-002, GSM8K',v:[['one chain of thought',.601],['vote over 40 paths',.78]]}];
  const cc={'one':'var(--mute)','vote':'var(--c1)','majority':'var(--c1)','learned':'var(--c4)','some':'var(--c3)'};
  const colOf=l=>cc[l.split(' ')[0]]||'var(--c2)';
  $('ttcSlBars').innerHTML=SB.map(g=>'<div class="band">'+g.n+'</div><div class="bars">'+g.v.map(([l,v])=>'<div class="row"><span class="nm" title="'+l+'">'+l+'</span><span class="track"><span class="fill" style="width:'+(100*v).toFixed(1)+'%;background:'+colOf(l)+'"></span></span><span class="val">'+(100*v).toFixed(v*1000%10?1:0)+'%</span></div>').join('')+'</div>').join('');

  // Yue et al. Tables 3 and 4
  const YU=[{n:'Omni-MATH-Train',p1:[9.9,26.1,33.6,42.5],p256:[67.2,66.3,65.3,64.3]},{n:'Omni-MATH-Test',p1:[10.2,25.1,27.1,28.3],p256:[69.1,68.3,66.6,63.9]},{n:'MATH500',p1:[34.5,74.4,75.4,76.3],p256:[96.2,97.2,96.0,95.4]}];
  let ym=0;segBind('ttcYuM',v=>{ym=+v;yd()});
  function yd(){const d=YU[ym],xs=[0,150,300,450],narrow=$('ttc-s-curves').clientWidth<560;
    const ser=[{name:'pass@256',c:'var(--c3)',dots:true,pts:xs.map((x,i)=>[x,d.p256[i]/100])},{name:'pass@1',c:'var(--c1)',dots:true,pts:xs.map((x,i)=>[x,d.p1[i]/100])},{name:'base model pass@256',c:'var(--mute)',dash:true,pts:[[0,d.p256[0]/100],[450,d.p256[0]/100]]}];
    $('ttcYuSvg').innerHTML=lineChart({W:narrow?360:640,H:250,x:[0,450],y:[0,1],series:ser,xt:[[0,'base'],[150,'150'],[300,'300'],[450,'450']],yt:[[0,'0%'],[.25,'25%'],[.5,'50%'],[.75,'75%'],[1,'100%']],xl:'GRPO training steps on Qwen2.5-7B',yl:'accuracy',label:'pass@1 and pass@256 over GRPO training'})+legend(ser);
    const g1=d.p1[3]-d.p1[0],g2=d.p256[3]-d.p256[0];
    $('ttcYuNote').innerHTML='<b>'+d.n+':</b> from the base model to step 450, pass@1 '+(g1>=0?'+':'−')+Math.abs(g1).toFixed(1)+' points ('+d.p1[0]+'% to '+d.p1[3]+'%), pass@256 '+(g2>=0?'+':'−')+Math.abs(g2).toFixed(1)+' ('+d.p256[0]+'% to '+d.p256[3]+'%). Values are the paper\'s Table 4, plotted as published.'}
  onTab(yd);
})();
})();
