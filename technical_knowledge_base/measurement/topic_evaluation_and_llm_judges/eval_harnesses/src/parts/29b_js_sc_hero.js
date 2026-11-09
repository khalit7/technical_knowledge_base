// ---- Scene: Fig. 1 (stg-hero, renderer v2): the chain of harness decisions, each link with its measured effect.
// Seven stations in the order a harness makes its decisions; an item flows through them. Behind each station a white plinth carries signed bars:
// the paired change in points of accuracy when only that link moves (window.HN_DATA.repro.pairs: Qwen2.5-0.5B-Instruct on 200 MMLU items,
// src/spread/repro_mmlu_knobs.py), red when outside the paired 95% interval. One bar is a published case (LLaMA-65B, answer text against letter:
// 48.8 - 63.6, Hugging Face, 23 June 2023), drawn in another colour. The GSM8K line is this page's own lm-eval run (window.HX.runs).
// What the scene computes is published in window.HXN.hero for check_stages.mjs. ----
(function(){
  if(!document.getElementById('stg-hero')||!window.S3||!window.HN_DATA)return;const {at,mix}=S3;
  const D=window.HN_DATA,PR=D.repro.pairs,N=D.nums;
  const pair=(a,b)=>{const p=PR.find(q=>q.a===a&&q.b===b);return {d:p.d,sig:Math.abs(p.d)>1.96*p.se,se:p.se}};
  const RS=window.HX&&window.HX.runs?window.HX.runs.summary.lm.results:null;
  const strict=RS?Math.round(10*RS['exact_match,strict-match']):null,flex=RS?Math.round(10*RS['exact_match,flexible-extract']):null;
  const llama=+(D.blogtab[0].harness-D.blogtab[0].orig).toFixed(1); // 48.8 - 63.6
  const L=[
    {n:'Prompt template',o:'labels, instruction',bars:[Object.assign(pair('c1','c10'),{t:'HELM-style'})]},
    {n:'Few-shot',o:'which, how many',bars:[Object.assign(pair('c1','c2'),{t:'5 to 0 shots'})]},
    {n:'Chat template',o:'raw text or turns',bars:[Object.assign(pair('c6','c7'),{t:'template on'}),Object.assign(pair('c7','c9'),{t:'"only the letter"'})]},
    {n:'Read the answer',o:'log-likelihood or write',bars:[Object.assign(pair('c10','c5'),{t:'generate'}),{d:llama,sig:true,pub:true,t:'answer text, LLaMA-65B'}]},
    {n:'Extract',o:'regex, parser, stops',bars:[Object.assign(pair('c7','c8'),{t:'lenient parser'})],note:strict!=null?'GSM8K: '+strict+' vs '+flex+' of 10':null},
    {n:'Normalise, average',o:'acc_norm, macro',bars:[Object.assign(pair('c3','c4'),{t:'acc_norm'})],note:'macro '+N.v1_l3.toFixed(2)+' / micro '+N.micro_l3.toFixed(2)},
    {n:'Score and log',o:'what you can audit',bars:[],note:'per-sample logs'}];
  (window.HXN=window.HXN||{}).hero={bars:L.map(l=>l.bars.map(b=>[b.d,b.sig])),strict,flex,macro:N.v1_l3.toFixed(2),micro:N.micro_l3.toFixed(2),llama};
  const X=i=>(i-3)*2.05,ZS=.75,ZP=-.55,YP=1.55,HS=1.45/33.5,fmt=d=>(d>0?'+':d<0?'−':'')+Math.abs(d).toFixed(1);
  // which links each step is about (step 0 and 6: all of them)
  const FOC=[null,[0,1],[2],[3],[4],[5],null];
  function plinth(R,c,w,a){R.box([c[0],c[1]-.05,c[2]],[w,.05,.5],{a,shadow:false});[-1,1].forEach(s=>R.box([c[0]+s*(w/2-.05),0,c[2]],[.035,c[1]-.05,.035],{a:a*.9}))}
  function draw(R,k,e){const P=R.P,ph=R.W<520,F=FOC[k];R.grid(-7.6,7.6,-2,2.2,.5);
    const on=i=>!F||F.includes(i),alpha=i=>on(i)?1:.22;
    // the item's path: through every link on the first and last steps, up to the link in focus otherwise
    const end=F?X(F[F.length-1]):X(6)+1.1,path=[[X(0)-1.5,.42,ZS],[end,.42,ZS]];
    R.flow(path,{c:P.c2,r:.07,speed:1.5,a:k===0?Math.min(1,e*1.5):1});
    L.forEach((l,i)=>{const a=alpha(i),x=X(i),last=i===6;
      R.box([x,0,ZS],[1.5,.32,1],{fill:last?mix(P.paper,P.c2,.18):P.paper,a});
      // on the last step the labels hidden during the close-up come back only once the camera has nearly arrived (no overlaps mid-glide)
      const la=k===6&&!(FOC[5]||[]).includes(i)?Math.max(0,(e-.8)/.2):1;
      if(!F||on(i))R.label([x,0,ZS+.5],ph?String(i+1):l.n,{fs:12.5,b:!!F,dy:13,a:la});
      if(F&&F.includes(i)&&!ph)R.label([x,0,ZS+.5],l.o,{fs:12,c:P.mute,dy:29});
      // the effect bars appear from step 2 on for their own link, and all together on the last step
      const si=FOC.findIndex(f=>f&&f.includes(i)),show=k===6?e:si===k?e:si>0&&k>si?1:0;
      const foc=!!F&&F.includes(i);
      if(l.note&&foc&&!ph)R.label([x,0,ZS+.5],l.note,{mono:true,fs:12,c:P.ink,dy:46,a:e});
      if(!l.bars.length||show<=0)return;
      const nb=l.bars.length,bw=.42,wd=Math.max(.9,nb*bw+.5);plinth(R,[x,YP,ZP],wd,show*a);
      const jm=l.bars.reduce((m,q,jj)=>Math.abs(q.d)>Math.abs(l.bars[m].d)?jj:m,0);
      l.bars.forEach((b,j)=>{const bx=x+(j-(nb-1)/2)*(bw+.1),h=Math.max(.02,Math.abs(b.d)*HS*show),c=b.pub?P.c4:b.sig?P.bad:mix(P.paper,P.mute,.5);
        R.box([bx,b.d>=0?YP:YP-.05-h,ZP],[bw,h,.3],{fill:c,a:show*a,shadow:false,lw:.7});
        if(ph&&!F&&j!==jm)return;
        const txt=foc&&!ph?fmt(b.d)+'  '+b.t:fmt(b.d);
        R.label([bx,b.d>=0?YP+h:YP-.05-h,ZP],txt,{mono:true,fs:12.5,b:b.sig,c:b.pub?P.c4:b.sig?P.bad:P.mute,dy:b.d>=0?-11:11,al:foc&&!ph&&nb>1?(j?'left':'right'):'center',dx:foc&&!ph&&nb>1?(j?12:-12):0,a:show*a})})});
    if(k===6&&!ph){R.label([X(0)-1.2,YP,ZP],'change in points when only that link moves',{al:'left',fs:12,c:P.mute,dy:-56,a:Math.max(0,(e-.8)/.2)});
      R.label([X(6),.4,ZS],'score',{fs:12,b:1,c:P.c2,dy:-22,a:e})}
  }
  const full={cam:[.22,.5],bounds:[[-7.4,0,-1.2],[7.4,3.1,1.6]]},start={cam:[.22,.72],bounds:[[-7.4,0,-1.2],[7.4,1.1,1.8]]};
  const close=i=>({cam:[.34,.4],bounds:[[X(i[0])-1.7,0,-1.1],[X(i[i.length-1])+1.7,3.1,2.4]]});
  S3.stage({id:'stg-hero',list:'sxl-hero',fig:'Fig. 1 · seven links, the effect of each, measured',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1400,hold:4800,draw,
    // on a phone the full views turn the chain into depth so it fills the narrow card
    view:k=>{const ph=innerWidth<520,v=k===0?start:FOC[k]?close(FOC[k]):full;return ph&&!FOC[k]?{cam:[.9,.62],bounds:v.bounds}:v}});
})();
