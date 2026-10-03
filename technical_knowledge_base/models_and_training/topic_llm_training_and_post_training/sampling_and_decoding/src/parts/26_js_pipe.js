// ---- Reading: one real distribution through temperature, truncation, renormalisation and a draw (top-p against min-p) ----
(function(){
  const POS={story:SD.LAB.prompts.find(p=>p.k==='story').pos[1],capital:SD.LAB.prompts.find(p=>p.k==='capital').pos[5]};
  const Q={story:SD.LAB.prompts.find(p=>p.k==='story').q,capital:SD.LAB.prompts.find(p=>p.k==='capital').q};
  const st={m:'p',inp:'story',T:1.5};
  const SHOW=12;
  const STEPS=['Logits','Divide by T','Softmax','Truncate','Renormalise','Sample'];
  let E,R,R0;
  function compute(){
    E=SD.entries(POS[st.inp]);
    const cfg={T:st.T,k:0,p:st.m==='p'?0.9:1,minp:st.m==='m'?0.1:0,typ:1,order:'first'};
    R=SD.run(E,cfg);
    R0=SD.run(E,{T:st.T,k:0,p:1,minp:0,typ:1,order:'first'});
  }
  const tailN=()=>E.filter(e=>!e.tail).length-SHOW+E.filter(e=>e.tail).reduce((a,e)=>a+e.n,0);
  function rows(i){
    const idx=[...Array(SHOW).keys()];
    let h='';
    const lmax=E[0].l, lmin=E[SHOW-1].l-2;
    // tail entry aggregates
    const restPre=1-idx.reduce((a,j)=>a+R.pre[j],0), restFin=1-idx.reduce((a,j)=>a+R.fin[j],0);
    let restKept=0;for(let j=SHOW;j<E.length;j++)restKept+=R.keep[j];
    const pick=i>=5?draw1():-1;
    idx.forEach(j=>{
      const e=E[j];let g=0,f=0,val='',cls='',x='';
      if(i===0){g=(e.l-lmin)/(lmax-lmin);val=e.l.toFixed(2)}
      else if(i===1){g=(e.l-lmin)/(lmax-lmin);f=g/st.T;val=(e.l/st.T).toFixed(2)}
      else if(i===2){g=R.pre[j];val=SD.fmtP(R.pre[j])}
      else if(i===3){g=R.pre[j];if(R.keep[j]){f=R.pre[j]}else{cls='cut';x=R.cut[j]}val=R.keep[j]?SD.fmtP(R.pre[j]):'cut'}
      else {g=R.pre[j];if(R.keep[j])f=R.fin[j];else{cls='cut';x=R.cut[j]}val=R.keep[j]?SD.fmtP(R.fin[j]):'cut'}
      if(j===pick)cls+=' pick';
      h+='<div class="nm '+cls+'"><span class="tk">'+SD.vis(e.t)+'</span></div><div class="tr"><div class="g" style="width:'+(Math.min(1,g)*100).toFixed(1)+'%"></div><div class="f" style="width:'+(Math.min(1,f)*100).toFixed(1)+'%"></div>'+(x?'<span class="x">'+x+'</span>':'')+'</div><div class="v">'+val+'</div>';
    });
    // the rest of the vocabulary
    let g=0,f=0,val='';
    if(i<=1){val='z '+E[E.length-1].l.toFixed(0)+' to '+E[SHOW].l.toFixed(1)}
    else if(i===2){g=restPre;val=SD.fmtP(restPre)}
    else if(i===3){g=restPre;f=R.pre.slice(SHOW).reduce((a,p,k)=>a+p*R.keep[SHOW+k]/E[SHOW+k].n,0);val=SD.fmtN(restKept)+' kept'}
    else {g=restPre;f=restFin;val=SD.fmtP(restFin)}
    h+='<div class="nm tail"><span class="tk">'+'+'+SD.fmtN(tailN())+' more</span></div><div class="tr"><div class="g" style="width:'+(g*100).toFixed(1)+'%"></div><div class="f" style="width:'+(f*100).toFixed(1)+'%"></div></div><div class="v">'+val+'</div>';
    return h;
  }
  let pickCache=null;
  function draw1(){if(pickCache!=null)return pickCache;const c=SD.draw(R,1,7);pickCache=+Object.keys(c)[0];return pickCache}
  function draw(i){
    pickCache=null;
    document.getElementById('rd-ppCtx').innerHTML='<span class="q">User: '+SD.vis(Q[st.inp]).replace(/␣/g,' ')+'</span>\nAssistant: '+SD.vis(POS[st.inp].s).replace(/␣/g,' ')+'<span class="nw"> ? </span>';
    document.getElementById('rd-ppL').innerHTML='<div class="hd">token</div><div class="hd">'+(i<2?'logit, scaled':'probability')+'</div><div class="hd v">'+(i<2?'logit':'p')+'</div>'+rows(i);
    const name=st.m==='p'?'top-p 0.9':'min-p 0.1';
    const top=E[0].t, pTop1=R0.raw[0], pTopT=R0.pre[0];
    const cap=[
      ['1. Logits','The model\'s raw scores for the next token, highest first. Only differences matter: "'+SD.vis(top)+'" leads the runner-up by '+(E[0].l-E[1].l).toFixed(2)+'. The other '+SD.fmtN(tailN())+' tokens have lower logits but there are very many of them.'],
      ['2. Divide by T = '+st.T,st.T>1?'Dividing by '+st.T+' shrinks every gap between logits by the same factor, so the softmax will be flatter.':'At T = 1 nothing changes: this is the model\'s own distribution.'],
      ['3. Softmax','Probabilities. At T = 1 "'+SD.vis(top)+'" has '+SD.fmtP(pTop1)+'; at T = '+st.T+' it has '+SD.fmtP(pTopT)+', and the '+SD.fmtN(tailN())+' tokens outside the top 12 hold '+SD.fmtP(1-R0.pre.slice(0,SHOW).reduce((a,b)=>a+b,0))+' together.'],
      ['4. Truncate: '+name,st.m==='p'?'Top-p sorts the tokens and keeps adding them until their probabilities sum to 0.9. With mass spread thinly, it has to go deep: '+SD.fmtN(R.kept)+' tokens survive.':'Min-p keeps tokens with at least 0.1 times the top token\'s probability ('+SD.fmtP(0.1*pTopT)+' here). The cut follows the top token, not the tail: '+SD.fmtN(R.kept)+' token'+(R.kept===1?'':'s')+' survive.'],
      ['5. Renormalise','The survivors are rescaled to sum to 1. Kept mass before rescaling: '+SD.fmtP(R.mass)+'. Effective number of choices (exp of the entropy): '+R.eff.toFixed(1)+'.'],
      ['6. Sample','One draw from the final distribution (seeded). Over many draws, '+SD.fmtP(R.out10)+' of picks would be a token outside the model\'s top 10.']
    ][i];
    document.getElementById('rd-ppTt').textContent=cap[0];document.getElementById('rd-ppP').innerHTML=cap[1];
    document.getElementById('rd-ppN').innerHTML=RD.stat('Tokens in play',i<3?SD.fmtN(E.reduce((a,e)=>a+e.n,0)):SD.fmtN(R.kept),i<3?'whole vocabulary':name)+
      RD.stat('Top token',SD.fmtP(i<2?pTop1:i<4?pTopT:R.fin[0]),i<2?'at T = 1':i<4?'at T = '+st.T:'after renormalising')+
      RD.stat('Effective choices',(v=>v<100?v.toFixed(1):SD.fmtN(v))(i<4?R0.eff:R.eff),'exp(entropy)')+
      RD.stat('Outside top 10',SD.fmtP(i<4?R0.pre.reduce((a,p,j)=>a+(E[j].r>=10?p:0),0):R.out10),'chance a draw lands there');
  }
  compute();
  const A=RD.anim({card:'rd-pp',ctl:'rd-ppC',n:STEPS.length,draw,ms:2400,label:'Step'});
  const seg=(id,k,conv)=>{const el=document.getElementById(id);el.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));st[k]=conv?conv(b.dataset.m):b.dataset.m;compute();A.go(A.i)}))};
  seg('rd-ppM','m');seg('rd-ppI','inp');seg('rd-ppT','T',Number);
})();
