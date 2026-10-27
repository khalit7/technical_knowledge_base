// ---- The toy pipeline, trained on first use in stages so the page never freezes; PPO runs cached by setting ----
const MCOL={'GPT':'var(--c6)','GPT (prompted)':'var(--c1)','SFT':'var(--c3)','PPO':'var(--c5)','PPO-ptx':'var(--c2)','FLAN':'var(--c4)','T0':'var(--mute)','Pretrained':'var(--c6)'};
const TM=(function(){const st={S:null,stage:0,busy:false,wait:[],ls:[],runs:{},ms:[]};
  const emit=()=>st.ls.forEach(f=>{try{f(st)}catch(e){__jsErr(e.message)}});
  const later=f=>setTimeout(()=>{try{f()}catch(e){__jsErr(e.message);st.busy=false}},16);
  const tick=()=>{const t=performance.now();st.ms.push(Math.round(t-st.t));st.t=t};
  function start(){if(st.busy||st.stage>=3)return;st.busy=true;st.t=performance.now();emit();
    later(()=>{st.S=TOY.stage0({});tick();st.stage=1;emit();
      later(()=>{TOY.stage1(st.S);tick();st.stage=2;emit();
        later(()=>{TOY.stage2(st.S);tick();st.stage=3;st.busy=false;emit();const w=st.wait;st.wait=[];w.forEach(f=>{try{f(st.S)}catch(e){__jsErr(e.message)}})})})})}
  function need(f){if(st.stage>=3)f(st.S);else{st.wait.push(f);start()}}
  const key=c=>[c.beta,c.gamma||0,c.seed||21].join('|');
  // train PPO for setting c, about 24 ms of work per slice; onTick(R) after each slice, onDone(R) at the end
  function train(c,onTick,onDone){need(S=>{const k=key(c);let R=st.runs[k];
    if(R&&R.done){onTick&&onTick(R);onDone&&onDone(R);return}
    if(!R)R=st.runs[k]={c,st:TOY.ppoInit(S,{beta:c.beta,gamma:c.gamma||0,seed:c.seed||21}),done:false,cbs:[]};
    R.cbs.push({onTick,onDone});if(R.running)return;R.running=true;
    const step=()=>{try{const t=performance.now();let fin=false;while(performance.now()-t<24&&!fin)fin=TOY.ppoIter(R.st);
      R.cbs.forEach(x=>x.onTick&&x.onTick(R));
      if(fin){R.done=true;R.running=false;R.pol=R.st.pol;const cb=R.cbs;R.cbs=[];cb.forEach(x=>x.onDone&&x.onDone(R));emit()}else setTimeout(step,0)}catch(e){__jsErr(e.message)}};
    step()})}
  return {st,start,need,train,key,on:f=>{st.ls.push(f);f(st)}}})();
// the two policies the Reading tab uses: the toy's PPO and PPO-ptx at their default settings
const TOY_PPO={beta:.3,gamma:0,seed:21},TOY_PTX={beta:.3,gamma:.1,seed:21};
// a response as word chips; prompt words greyed
const chips=(ws,cls)=>ws.map(w=>'<span class="tok'+(cls?' '+cls:'')+(w==='sure'?' s':'')+(w==='<end>'?' e':'')+'">'+escH(w)+'</span>').join('');
const words=y=>y.map(x=>TOY.WORDS[x]);
const fmtU=u=>(u>0?'+':'')+u.toFixed(1);
const uCls=u=>u>=3?'good':u<0?'bad':'';
