// Reading: the hero (the chain of harness decisions, each with its measured effect) and the tokens-per-problem figure of section 5.
// Hero numbers come from window.HN_DATA (paired changes on 200 MMLU items) and window.HX.runs (this page's GSM8K run); LLaMA-65B from the Hugging Face post.
(function(){
const $=id=>document.getElementById(id);
const f1=x=>(x>=0?'+':'')+(+x).toFixed(1);
function pair(a,b){const D=window.HN_DATA;const p=D&&D.repro.pairs.find(q=>q.a===a&&q.b===b);return p?[p.d,Math.abs(p.d)>1.96*p.se]:[NaN,false]}
function stages(){
  const R=window.HX&&window.HX.runs,S=R?R.summary.lm.results:null;
  const strict=S?Math.round(10*S['exact_match,strict-match']):0,flex=S?Math.round(10*S['exact_match,flexible-extract']):1;
  const p=(a,b,t)=>{const z=pair(a,b);return [f1(z[0])+' '+t,z[1]]};
  return [
   ['Prompt template','labels, instruction',[p('c1','c10','HELM-style')]],
   ['Few-shot examples','which, how many',[p('c1','c2','5 to 0 shots')]],
   ['Chat template','raw text or turns',[p('c6','c7','template on'),p('c7','c9','"only the letter"')]],
   ['Read the answer','log-likelihood or write',[p('c10','c5','generate'),['-14.8 text, LLaMA-65B',true]]],
   ['Extract','regex, parser, stops',[p('c7','c8','lenient'),['GSM8K '+strict+' vs '+flex+' of 10',false]]],
   ['Normalise, average','acc_norm, macro',[p('c3','c4','acc_norm'),['66.70 vs 65.46 macro/micro',false]]],
   ['Score and log','what you can audit',[['per-sample logs',false]]]];
}
function hero(){
  const el=$('hr-fig');if(!el)return;const W=RD.width(el),st=stages(),n=st.length;let g='';
  if(W>=760){
    const gap=12,bw=(W-gap*(n-1))/n,bh=50,y0=8;
    st.forEach((s,i)=>{const x=i*(bw+gap);const big=s[2].some(z=>z[1]);
      g+='<rect x="'+x+'" y="'+y0+'" width="'+bw+'" height="'+bh+'" rx="7" fill="var(--soft)" stroke="'+(big?'var(--bad)':'var(--line)')+'" stroke-width="'+(big?2:1)+'"/>';
      g+=RD.t(x+bw/2,y0+21,s[0],{a:'middle',w:600,fs:12});g+=RD.t(x+bw/2,y0+38,s[1],{a:'middle',fill:'var(--mute)'});
      if(i<n-1)g+='<path d="M'+(x+bw+1)+' '+(y0+bh/2)+' l'+(gap-3)+' 0 m-5 -4 l5 4 l-5 4" fill="none" stroke="var(--mute)"/>';
      s[2].forEach((z,j)=>{g+=RD.t(x+bw/2,y0+bh+20+j*16,z[0],{a:'middle',fs:11,fill:z[1]?'var(--bad)':'var(--mute)',w:z[1]?700:400})});});
    g+=RD.t(0,y0+bh+60,'Measured change when only that link moves (points of accuracy); bold red: outside the paired 95% interval or a published gap',{fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,y0+bh+68,g,'The chain of harness decisions with measured effects');
  } else {
    const rh=46,bw=Math.min(150,W*0.42);
    st.forEach((s,i)=>{const y=6+i*rh;const big=s[2].some(z=>z[1]);
      g+='<rect x="0" y="'+y+'" width="'+bw+'" height="'+(rh-12)+'" rx="6" fill="var(--soft)" stroke="'+(big?'var(--bad)':'var(--line)')+'" stroke-width="'+(big?2:1)+'"/>';
      g+=RD.t(8,y+14,s[0],{w:600});g+=RD.t(8,y+28,s[1],{fill:'var(--mute)'});
      if(i<n-1)g+='<path d="M'+(bw/2)+' '+(y+rh-12)+' l0 11 m-4 -5 l4 5 l4 -5" fill="none" stroke="var(--mute)"/>';
      s[2].forEach((z,j)=>{g+=RD.t(bw+8,y+14+j*14,z[0],{fill:z[1]?'var(--bad)':'var(--mute)',w:z[1]?700:400})});});
    el.innerHTML=RD.svg(W,6+n*rh,g,'The chain of harness decisions with measured effects');
  }
}
function scale(){
  const el=$('sc-fig');const R=window.HX&&window.HX.runs;if(!el||!R||!window.HX_SCALE)return;const W=RD.width(el),narrow=W<560;
  const L=narrow?28:70,Rm=8,bw=W-L-Rm,max=2800,x=v=>L+bw*v/max,rh=26;let top=38;
  let g='';
  [0,500,1000,1500,2000,2500].forEach(t=>{if(narrow&&t%1000)return;g+='<line x1="'+x(t)+'" x2="'+x(t)+'" y1="'+(top-6)+'" y2="'+(top+R.items.length*rh)+'" stroke="var(--line)"/>'+RD.t(x(t),top+R.items.length*rh+14,t.toLocaleString('en-GB'),{a:'middle',fill:'var(--mute)'})});
  const key=[['var(--c1)',1,'lm-eval prompt'],['var(--c2)',.45,'Inspect: same system message'],['var(--c2)',1,'Inspect: rest of prompt'],['var(--ink)',.35,'output']];
  let kx=L,ky=4;key.forEach(k=>{const w=k[2].length*6.2+28;if(kx+w>W){kx=L;ky+=16}g+='<rect x="'+kx+'" y="'+ky+'" width="10" height="10" fill="'+k[0]+'" opacity="'+k[1]+'"/>';g+=RD.t(kx+14,ky+9,k[2],{fill:'var(--mute)'});kx+=w;});
  top+=ky-4;
  R.items.forEach((it,i)=>{const y=top+i*rh;const L1=it.lm.prompt_tokens,O1=it.lm.output_tokens,L2=it['in'].real.input,O2=it['in'].real.output;
    const pre=Math.round(L2*window.HX_SCALE.share[i]);
    g+=RD.t(L-6,y+15,narrow?String(it.id+1):'problem '+(it.id+1),{a:'end',fill:'var(--mute)'});
    g+='<rect x="'+L+'" y="'+(y+2)+'" width="'+(x(L1)-L)+'" height="9" fill="var(--c1)"><title>lm-eval prompt '+L1+' tokens</title></rect><rect x="'+x(L1)+'" y="'+(y+2)+'" width="'+(x(L1+O1)-x(L1))+'" height="9" fill="var(--ink)" opacity=".35"><title>output '+O1+' tokens</title></rect>';
    g+='<rect x="'+L+'" y="'+(y+12)+'" width="'+(x(pre)-L)+'" height="9" fill="var(--c2)" opacity=".45"><title>identical system message, about '+pre+' tokens by character share</title></rect><rect x="'+x(pre)+'" y="'+(y+12)+'" width="'+(x(L2)-x(pre))+'" height="9" fill="var(--c2)"/><rect x="'+x(L2)+'" y="'+(y+12)+'" width="'+(x(L2+O2)-x(L2))+'" height="9" fill="var(--ink)" opacity=".35"><title>output '+O2+' tokens</title></rect>';
  });
  g+=RD.t(L+bw/2,top+R.items.length*rh+30,narrow?'tokens per problem; top lm-eval, bottom Inspect':'tokens per GSM8K problem (prompt, then output); top bar lm-eval, bottom bar Inspect',{a:'middle',fill:'var(--mute)'});
  el.innerHTML=RD.svg(W,top+R.items.length*rh+36,g,'Prompt and output tokens per GSM8K problem in the two runs');
}
RD.onRender(()=>{hero();scale()});RD.onResize(()=>{hero();scale()});
})();
