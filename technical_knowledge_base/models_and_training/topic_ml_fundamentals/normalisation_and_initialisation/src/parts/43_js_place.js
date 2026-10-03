// ---- Reading 5: norm placement on Xiong et al.'s simplified Transformer, forward block by block, then backward ----
(function(){
  const NI=window.NI,svg=document.getElementById('pl-svg');if(!svg)return;
  const MODES=[['pre','Pre-norm (GPT-2)'],['post','Post-norm (2017)'],['peri','Peri-norm (Gemma)'],['out','Output norm (OLMo 2)'],['deep','DeepNorm'],['none','No norm']];
  const NAME=Object.fromEntries(MODES);
  const st={m:'pre',c:'post',L:12,init:'xavier'};
  document.getElementById('pl-modes').innerHTML=MODES.map(m=>'<button data-m="'+m[0]+'"'+(m[0]===st.m?' class="on"':'')+'>'+m[1]+'</button>').join('');
  const cmp=document.getElementById('pl-cmp');cmp.innerHTML='<option value="">nothing</option>'+MODES.map(m=>'<option value="'+m[0]+'"'+(m[0]===st.c?' selected':'')+'>'+m[1]+'</option>').join('');
  let A,B;
  const runs=()=>{A=NI.toy({place:st.m,L:st.L,init:st.init,seed:st.L+7});B=st.c?NI.toy({place:st.c,L:st.L,init:st.init,seed:st.L+7}):null};
  runs();
  let W=600;const H=380,pl=44,pr=10,top=[16,170],bot=[214,350];
  const fe=v=>v>=100||v<0.01?v.toExponential(1):v.toFixed(v>=10?1:2);
  function scale(vals){const v=vals.filter(x=>x>0&&isFinite(x));let lo=Math.min(...v),hi=Math.max(...v);lo=Math.pow(10,Math.floor(Math.log10(lo)));hi=Math.pow(10,Math.ceil(Math.log10(hi)));if(hi/lo<100)hi=lo*100;return [lo,hi]}
  function panel(y0,y1,lo,hi,label){let h='';const ly=v=>y1-(Math.log10(v)-Math.log10(lo))/(Math.log10(hi)-Math.log10(lo))*(y1-y0);
    for(let e=Math.log10(lo);e<=Math.log10(hi)+1e-9;e++){const Y=ly(Math.pow(10,e));h+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y+'" y2="'+Y+'" stroke="var(--line)"/><text x="'+(pl-4)+'" y="'+(Y+3)+'" font-size="10" text-anchor="end" fill="var(--mute)">'+(e===0?'1':'10'+(e<0?'⁻':'')+String(Math.abs(e)).split('').map(d=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[+d]).join(''))+'</text>'}
    h+='<text x="'+pl+'" y="'+(y0-4)+'" font-size="11" fill="var(--mute)">'+label+'</text>';return {h,ly}}
  function draw(i){W=Math.max(320,Math.min(600,RD.width(svg.parentNode)));svg.setAttribute('viewBox','0 0 '+W+' '+H);const L=st.L,n=L+3;
    const sv=[...A.stream,...(B?B.stream:[]),...(A.sum.filter(x=>x)),...(B?B.sum.filter(x=>x):[])];const [slo,shi]=scale(sv);
    const gv=[...A.g2,...(B?B.g2:[])];const [glo,ghi]=scale(gv);
    const P1=panel(top[0],top[1],slo,shi,'residual stream size (RMS)'),P2=panel(bot[0],bot[1],glo,ghi,'gradient of each block\'s 2nd feed-forward matrix');
    let h=P1.h+P2.h;const bw=(W-pl-pr)/(L+1);const X=k=>pl+bw*(k+0.5);
    const fwd=Math.min(i,L);
    for(let k=0;k<=fwd;k++){const y=P1.ly(A.stream[k]);h+='<rect x="'+(X(k)-bw*0.35)+'" y="'+y+'" width="'+(bw*0.7)+'" height="'+(top[1]-y)+'" fill="var(--c1)" opacity="'+(k===fwd&&i<=L?1:.75)+'"/>';
      if(B)h+='<circle cx="'+X(k)+'" cy="'+P1.ly(B.stream[k])+'" r="3" fill="var(--mute)"/>';
      if(k>0&&A.sum[k-1])h+='<line x1="'+(X(k)-bw*0.4)+'" x2="'+(X(k)+bw*0.4)+'" y1="'+P1.ly(A.sum[k-1])+'" y2="'+P1.ly(A.sum[k-1])+'" stroke="var(--c2)" stroke-width="2"/>';
      if(B&&k>0&&B.sum[k-1])h+='<line x1="'+(X(k)-bw*0.3)+'" x2="'+(X(k)+bw*0.3)+'" y1="'+P1.ly(B.sum[k-1])+'" y2="'+P1.ly(B.sum[k-1])+'" stroke="var(--mute)" stroke-width="1.5" stroke-dasharray="2 2"/>'}
    if(i>L){for(let k=1;k<=L;k++){const y=P2.ly(A.g2[k-1]);h+='<rect x="'+(X(k)-bw*0.35)+'" y="'+y+'" width="'+(bw*0.7)+'" height="'+(bot[1]-y)+'" fill="var(--c3)"/>';
      if(B)h+='<circle cx="'+X(k)+'" cy="'+P2.ly(B.g2[k-1])+'" r="3" fill="var(--mute)"/>'}}
    const lab=k=>k===0?'in':String(k);const every=L>24?6:L>12?3:1;
    for(let k=0;k<=L;k+=k===0?every:every){h+='<text x="'+X(k)+'" y="'+(top[1]+12)+'" font-size="9.5" text-anchor="middle" fill="var(--mute)">'+lab(k)+'</text>';if(k>0)h+='<text x="'+X(k)+'" y="'+(bot[1]+12)+'" font-size="9.5" text-anchor="middle" fill="var(--mute)">'+k+'</text>'}
    h+='<text x="'+(W-pr)+'" y="'+(bot[1]+24)+'" font-size="10" text-anchor="end" fill="var(--mute)">block</text>';
    svg.innerHTML=h;
    // caption and counters
    let cap;const m=st.m;
    if(i===0)cap=['The input','16 tokens of width 64, drawn from a standard normal: RMS about 1. '+NAME[m]+(B?', compared with '+NAME[st.c]+' (grey)':'')+'.'];
    else if(i<=L){const d=A.stream[i]/A.stream[i-1];cap=['Block '+i+' of '+L+': attention, then feed-forward',
      m==='post'||m==='deep'?'Each sub-layer\'s output is added to the stream and the sum is normalised (orange tick: the sum before the norm). The stream is back at size 1 after every block, so it carries no memory of depth.':
      m==='pre'?'The norm sits on the branch input; the stream itself only ever has things added to it, so it grows block after block (this block: ×'+d.toFixed(3)+').':
      m==='peri'||m==='out'?'Each branch adds a normalised vector of size 1, so the stream grows like the square root of the number of additions (this block: ×'+d.toFixed(3)+').':
      'Nothing is normalised: the stream and every branch grow together (this block: ×'+d.toFixed(3)+').']}
    else if(i===L+1)cap=['Backward: the gradient comes down',m==='post'?'Every gradient passes through every LayerNorm on its way down; the last blocks get the largest gradients, and they do not shrink as the depth grows, which is Theorem 1\'s case for warmup.':m==='pre'?'The identity path carries the gradient down untouched; each block\'s branch is a small part of a large stream, so its gradient is small, and shrinks further as L grows.':'Compare the size of the late blocks\' gradients with the first ones\', and with the grey run.'];
    else cap=['Summary','Pick another placement, raise the depth to 48, or switch to GPT-2\'s residual scaling: post-norm\'s last-block gradient does not fall with depth, pre-norm\'s does (the Depth and placement tab sweeps it).'];
    document.getElementById('pl-cap').innerHTML='<div class="t">'+(i+1)+' / '+n+' · '+cap[0]+'</div><p>'+cap[1]+'</p>';
    const k=Math.min(i,L);
    document.getElementById('pl-cnt').innerHTML=RD.stat('Stream RMS, '+(k?'after block '+k:'input'),fe(A.stream[k]),B?NAME[st.c]+': '+fe(B.stream[k]):'')+
      (A.sum[0]?RD.stat('Sum before the norm',k?fe(A.sum[k-1]):'&middot;','RMS; squared, Lemma 2 says about 1.5'):RD.stat('Stream growth so far','×'+(A.stream[k]/A.stream[0]).toFixed(2),'from the input'))+
      (i>L?RD.stat('Last block\'s gradient',fe(A.g2[L-1]),B?NAME[st.c]+': '+fe(B.g2[L-1]):''):RD.stat('Last block\'s gradient','&middot;','after the backward pass'))+
      (i>L?RD.stat('First / last block gradient',(A.g2[0]/A.g2[L-1]).toFixed(2),'above 1: the early blocks get more'):RD.stat('First / last block gradient','&middot;',''));
    document.getElementById('pl-leg').innerHTML='<span><i style="background:var(--c1);height:10px;width:10px"></i>stream, '+NAME[m]+'</span>'+(A.sum[0]?'<span><i style="background:var(--c2)"></i>sum before the norm</span>':'')+'<span><i style="background:var(--c3);height:10px;width:10px"></i>gradient, '+NAME[m]+'</span>'+(B?'<span><b class="dot" style="background:var(--mute)"></b>'+NAME[st.c]+'</span>':'');
  }
  const AN=RD.anim({card:'pl-card',ctl:'pl-ctl',n:st.L+3,ms:700,label:'Placement step',draw});
  function reset(){runs();AN.reset(st.L+3)}
  document.getElementById('pl-modes').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;st.m=b.dataset.m;[...e.currentTarget.children].forEach(x=>x.classList.toggle('on',x===b));runs();AN.go(AN.n-1)});
  cmp.addEventListener('change',()=>{st.c=cmp.value;runs();AN.redraw()});
  document.getElementById('pl-L').addEventListener('change',e=>{st.L=+e.target.value;reset();AN.go(st.L+2)});
  document.getElementById('pl-init').addEventListener('change',e=>{st.init=e.target.value;runs();AN.redraw()});
})();
