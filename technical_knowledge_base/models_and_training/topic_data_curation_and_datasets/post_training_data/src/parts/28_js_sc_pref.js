// ---- Scene (Reading 5, Fig. 3): binarization and the length trap. Real UltraFeedback prompts (window.PD.pref.ub.examples: four answers, their Qwen3 token
// lengths, GPT-4's overall_score and four aspect ratings, and the pairs the H4 and Argilla rules picked), each answer a column whose height is its length;
// three rules form three pairs at the front; the last step is every rule replayed over all 10,000 raw prompts (PD.pref.ub.rule_stats). ----
(function(){
  if(!document.getElementById('stg-pref')||!window.PD||!PD.pref)return;const {at,lerp,mix,cl}=S3;
  const U=PD.pref.ub,X=U.examples,RS=U.rule_stats,E=RD.esc,f=n=>Math.round(n).toLocaleString('en-US');
  const mean=c=>{const v=c.asp.filter(x=>x!=null);return v.length?v.reduce((a,b)=>a+b,0)/v.length:null};
  // the pair each rule picks: H4 and Argilla as recorded in the data, best against worst recomputed from the aspect means
  const pairs=e=>{const m=e.comps.map(mean);return [e.h4,e.argilla,[m.indexOf(Math.max(...m)),m.indexOf(Math.min(...m))]]};
  const share=k=>RS[k].chosen_longer/RS[k].diff,RULES=[['h4','overall_score'],['argilla','mean of aspects'],['maxmin','best against worst']];
  // default prompt: one where the two common rules choose differently
  let pi=Math.max(0,X.findIndex(e=>e.h4[0]!==e.argilla[0]&&e.comps.some(c=>c.tok>300)));
  const CX=[-2.85,-.95,.95,2.85],ZB=-1.7,ZF=2.3,PXc=-1.0,PXr=1.0,HM=2.2,W=.9;
  const short=s=>s.replace(/-(chat|instruct)$/,'');
  function col(R,x,z,h,fill,a,lw){R.box([x,.14,z],[W,Math.max(.03,h),W*.8],{fill,a,lw:lw||.8,shadow:false});R.box([x,0,z],[W+.2,.14,W*.8+.2],{a,lw:.6})}
  function draw(R,k,e){const P=R.P,ex=X[pi],cs=ex.comps,mx=Math.max(...cs.map(c=>c.tok),1),hh=t=>HM*t/mx;R.grid(-4.5,4.5,-2.4,2.8,.5);
    const PR=pairs(ex);
    // the four answers
    const back=k===4?1-e:1;if(back>.01){const pk=k>=1&&k<=3?PR[k-1]:null;
      cs.forEach((c,i)=>{const rise=k===0?cl(e*1.5-i*.15,0,1):1,on=!pk||pk.includes(i),a=back*(on?1:.28);
        col(R,CX[i],ZB,hh(c.tok)*rise,mix(P.paper,P.c1,.25),a);
        R.label([CX[i],.14+hh(c.tok)*rise,ZB],f(c.tok)+' tok',{mono:true,fs:12,dy:-11,c:P.ink,a:a*Math.max(.5,rise)});
        const la=pk&&!on?.18:back;R.label([CX[i],0,ZB+.55],short(c.model||''),{mono:true,fs:12,dy:12,c:P.ink,a:la,b:on&&!!pk});
        const m=mean(c);R.label([CX[i],0,ZB+.55],'overall '+(c.overall==null?'n/a':c.overall),{mono:true,fs:12,dy:28,c:P.mute,a:la,wide:1});
        R.label([CX[i],0,ZB+.55],'mean '+(m==null?'n/a':m.toFixed(2)),{mono:true,fs:12,dy:43,c:P.mute,a:la,wide:1})})}
    // the pair's two empty slots, faint, so the front of the frame is full from the first step
    if(k===0)[[PXc,'chosen',P.good],[PXr,'rejected',P.bad]].forEach(([x,nm,c])=>{R.box([x,0,ZF],[W+.2,.14,W*.8+.2],{a:.3,lw:.6});R.label([x,.14,ZF],nm+' · ?',{mono:true,fs:12.5,dy:-12,c,a:.55*e})});
    // the pair at the front: the previous rule's pair fades out before this one fades in
    if(k>=1&&k<=3){const show=(pk,a,lab)=>{if(a<=.01)return;const [ci,ri]=pk;[[ci,PXc,P.good,'chosen'],[ri,PXr,P.bad,'rejected']].forEach(([i,x,c,nm])=>{
          col(R,x,ZF,hh(cs[i].tok),mix(P.paper,c,.6),a,1);R.label([x,.14+hh(cs[i].tok),ZF],nm+' · '+f(cs[i].tok),{mono:true,fs:12.5,b:1,dy:R.W<520&&nm==='rejected'?-27:-11,c,a});
          if(lab)R.flowArc([CX[i],.14+hh(cs[i].tok)*.6,ZB],[x,.14+hh(cs[i].tok)*.6,ZF],.35,{c,a:a*.75,r:.055,speed:1.2,n:7})});
        R.label([0,0,ZF+.55],lab,{mono:true,fs:12.5,b:1,dy:14,c:P.ink,a})};
      const cur=PR[k-1],prev=k>=2?PR[k-2]:null;
      if(prev&&e<.5)show(prev,1-2*e,null);
      show(cur,prev?cl(2*e-1,0,1):e,RULES[k-1][1]+' rule')}
    // the last step: each rule over every prompt, the share of pairs whose chosen answer is longer, against the 50% glass plane
    if(k===4){const ZS=.4;RULES.forEach(([key,nm],r)=>{const x=(r-1)*2.2,s=share(key),h=3*s*e;
        R.box([x,0,ZS],[1.1,Math.max(.02,h),1.1],{fill:mix(P.paper,P.c2,.35+.25*r),a:e});
        R.label([x,h,ZS],Math.round(100*s)+'%',{mono:true,fs:13,b:1,dy:-12,c:P.c2,a:e});R.label([x,0,ZS+.6],nm,{mono:true,fs:12,dy:14,c:P.ink,a:e})});
      R.glass([-3.5,1.5,-.4],[7,0,0],[0,0,1.6],{c:P.c1,a:.8*e,nu:10,nv:2});R.label([3.5,1.5,.4],'50%: length says nothing',{mono:true,fs:12,al:'left',dx:8,c:P.c1,a:e,wide:1});
      R.label([0,3.05,ZS],'chosen is the longer answer · '+f(U.prompts)+' prompts',{mono:true,fs:12.5,dy:-8,c:P.ink,a:e})}
  }
  const seg=document.getElementById('pd-pref-p'),q=document.getElementById('pd-pref-q');
  const full={cam:[.14,.82],bounds:[[-3.6,0,-2.3],[3.6,2.3,3.0]]};
  const st=S3.stage({id:'stg-pref',list:'sx-pref',fig:'Fig. 3 · one prompt, three rules, three pairs',cam:full.cam,bounds:full.bounds,aspect:.66,dur:1500,hold:5000,draw,
    margin:w=>w<520?[14,10,14,10]:[18,40,16,40],view:k=>k===4?{cam:[.2,.5],bounds:[[-3.6,0,-.6],[4.6,3.1,1.4]]}:full,onStep:()=>note()});
  // the prompt picker (a mode switch: it replays the stage on the new prompt) and the prompt line
  function note(){const ex=X[pi];if(q)q.innerHTML='<b>Prompt '+(pi+1)+' of '+X.length+'</b> (UltraFeedback evol_instruct): '+E(ex.prompt.length>200?ex.prompt.slice(0,200)+' ...':ex.prompt)}
  if(seg){seg.innerHTML=X.map((e,i)=>'<button data-m="'+i+'"'+(i===pi?' class="on"':'')+' title="'+E(e.prompt)+'">'+(i+1)+'. '+E(e.prompt.split(/\s+/).slice(0,4).join(' '))+'</button>').join('');
    RD.seg(seg,m=>{pi=+m;note();if(st)st.list('sx-pref')})}
  note();
})();
