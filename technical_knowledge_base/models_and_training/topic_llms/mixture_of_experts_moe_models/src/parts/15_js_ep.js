// ---- Decode arithmetic for one MoE layer: tokens per expert and all-to-all volume ----
(function(){
  if(!$('ep'))return;
  const P=[
    {id:'v3',n:'DeepSeek-V3',d:7168,N:256,k:8,L:58,u:'https://huggingface.co/deepseek-ai/DeepSeek-V3/raw/main/config.json'},
    {id:'k2',n:'Kimi K2',d:7168,N:384,k:8,L:60,u:'https://huggingface.co/moonshotai/Kimi-K2-Instruct/blob/main/config.json'},
    {id:'k3',n:'Kimi K3 (latent 3,584)',d:3584,N:896,k:16,L:92,u:'https://huggingface.co/moonshotai/Kimi-K3/blob/main/config.json'},
    {id:'q3',n:'Qwen3-235B',d:4096,N:128,k:8,L:94,u:'https://huggingface.co/Qwen/Qwen3-235B-A22B/blob/main/config.json'},
    {id:'oss',n:'gpt-oss-120b',d:2880,N:128,k:4,L:36,u:'https://huggingface.co/openai/gpt-oss-120b/blob/main/config.json'},
    {id:'mix',n:'Mixtral 8x7B',d:4096,N:8,k:2,L:32,u:'https://huggingface.co/mistralai/Mixtral-8x7B-v0.1/blob/main/config.json'}];
  const BS=[1,8,32,64,128,256,512,1024,2048,4096];
  const st={p:'v3',b:5,by:2};
  $('epPre').innerHTML=P.map(p=>'<button data-m="'+p.id+'"'+(p.id===st.p?' class="on"':'')+'>'+p.n+'</button>').join('');
  $('epCtl').innerHTML='<label>Running sequences (decode batch) <b id="epBv"></b><input type="range" id="epB" min="0" max="'+(BS.length-1)+'" step="1" value="5"></label><label>Bytes per value sent<br><select id="epBy"><option value="2" selected>2 (BF16)</option><option value="1">1 (FP8)</option></select></label>';
  function draw(){const p=P.find(x=>x.id===st.p),B=BS[st.b],tpe=B*p.k/p.N,vol=p.k*p.d*st.by,step=B*p.L*vol*2;
    $('epBv').textContent=fmt(B);
    $('epOut').innerHTML=stat('Tokens per expert',fmt(tpe,tpe<10?2:0),'B · k / N = '+fmt(B)+' × '+p.k+' / '+p.N)+stat('Dense FFN',fmt(B)+' tokens','per weight read; MoE is '+(B/tpe).toFixed(0)+'x fewer ('+p.N+'/'+p.k+')')+
      stat('All-to-all per token per layer',fmtBytes(vol)+' each way','k · d · bytes = '+p.k+' × '+fmt(p.d)+' × '+st.by)+stat('Per decode step, all '+p.L+' MoE layers',fmtBytes(step),'dispatch plus combine, '+fmt(B)+' tokens');
    const W=Math.max(320,Math.min(720,$('epSvg').clientWidth||680)),H=230;
    const f=logFrame({W,H,pl:52,pr:96,pt:12,pb:38,x:[1,4096],y:[0.01,4096],xt:[[1,'1'],[16,'16'],[256,'256'],[4096,'4,096']],yt:[[0.01,'0.01'],[1,'1'],[100,'100'],[4096,'4,096']],xl:'running sequences',yl:'tokens per weight read'});
    let s=f.s;const line=(fn,c,lab)=>{let d='';BS.forEach((b,i)=>{d+=(i?'L':'M')+f.lx(b).toFixed(1)+' '+f.ly(Math.max(0.01,fn(b))).toFixed(1)});return '<path d="'+d+'" fill="none" stroke="'+c+'" stroke-width="2"/><text x="'+(f.lx(4096)+6)+'" y="'+(f.ly(fn(4096))+4)+'" font-size="11" fill="'+c+'">'+lab+'</text>'};
    s+=line(b=>b,'var(--c2)','dense FFN')+line(b=>b*p.k/p.N,'var(--c1)','per expert');
    s+='<circle cx="'+f.lx(B)+'" cy="'+f.ly(tpe)+'" r="5" fill="var(--c1)"/><circle cx="'+f.lx(B)+'" cy="'+f.ly(B)+'" r="4" fill="var(--c2)"/>';
    const y1=f.ly(1);s+='<line x1="52" x2="'+(W-96)+'" y1="'+y1+'" y2="'+y1+'" stroke="var(--mute)" stroke-dasharray="4 3" stroke-opacity=".6"/><text x="56" y="'+(y1-4)+'" font-size="10" fill="var(--mute)">one token per expert</text>';
    $('epSvg').innerHTML=svgEl(W,H,s,'Tokens served per weight read against decode batch, dense against per expert')+'<p class="q" style="margin:4px 0 0">Config: '+A(p.u,p.n+' config.json')+'. Expected values with perfectly even routing; real traffic is skewed, so hot experts see more and cold ones less.</p>'}
  const pre=$('epPre');pre.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{pre.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));st.p=b.dataset.m;draw()}));
  $('epB').addEventListener('input',e=>{st.b=+e.target.value;draw()});
  $('epBy').addEventListener('change',e=>{st.by=+e.target.value;draw()});
  let lw=0;addEventListener('resize',()=>{const w=$('epSvg').clientWidth;if(w&&Math.abs(w-lw)>30){lw=w;draw()}});
  onTab('t-read',()=>{lw=$('epSvg').clientWidth;draw()});
})();
