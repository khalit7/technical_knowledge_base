// ---- Post-training data lab: the same web page before and after rephrasing (section 5) ----
(function(){
  const P=window.PT,D=P.D,R=D.rephrase,esc=P.esc,fmt=P.fmt,pct=P.pct;
  const W=/[A-Za-z]+(?:'[a-z]+)?|[0-9]+(?:[.,][0-9]+)?/g,NUM=/\b\d+(?:[.,]\d+)?\b/g;
  const STY={easy:'easy (toddler)',medium:'medium (Wikipedia)',hard:'hard (scholar)',qa:'question and answer'};
  const docs=R.docs.map(d=>({label:'Qwen3-4B rephrase: '+d.url.replace(/^https?:\/\/(www\.)?/,'').split('/')[0],src:d.source,edu:d.edu,styles:d.styles,url:d.url}));
  const cp=R.cosmo_pair;docs.push({label:'Cosmopedia: seed page to '+cp.format.replace(/_/g,' '),src:cp.seed,edu:cp.seed_edu,styles:{generated:{output:cp.out,edu:cp.out_edu,model:'Mixtral-8x7B-Instruct (Cosmopedia)'}}});
  const dsel=document.getElementById('pt-rdoc'),sseg=document.getElementById('pt-rsty');
  dsel.innerHTML=docs.map((d,k)=>'<option value="'+k+'">'+esc(d.label)+'</option>').join('');
  let di=0,sty='medium',view=null;
  function words(t){const out=[];let m;W.lastIndex=0;while((m=W.exec(t)))out.push({w:m[0].toLowerCase(),s:m.index,e:m.index+m[0].length});return out}
  function analyse(){const d=docs[di],o=d.styles[sty];const sw=words(d.src),ow=words(o.output);
    const g=new Set();for(let i=0;i+4<=sw.length;i++)g.add(sw.slice(i,i+4).map(x=>x.w).join(' '));
    const cov=new Uint8Array(ow.length);let novel=0,tot=0;for(let i=0;i+4<=ow.length;i++){tot++;if(g.has(ow.slice(i,i+4).map(x=>x.w).join(' '))){for(let j=i;j<i+4;j++)cov[j]=1}else novel++}
    const sn=(d.src.match(NUM)||[]),on=new Set(o.output.match(NUM)||[]);
    view={d,o,sw,ow,cov,novel:tot?novel/tot:0,sn,kept:sn.filter(n=>on.has(n)).length,on}}
  function mark(text,ws,cls,upto){let h='',p=0;ws.forEach((x,k)=>{if(upto!=null&&x.s>=upto)return;h+=esc(text.slice(p,x.s))+'<span class="'+cls(k,x)+'">'+esc(text.slice(x.s,x.e))+'</span>';p=x.e});return h+esc(text.slice(p,upto==null?text.length:Math.max(p,upto)))}
  const N=7;
  function draw(i){if(!view)analyse();const v=view,el=document.getElementById('pt-rtxt'),cap=document.getElementById('pt-rcap');
    if(i===0){const isn=x=>/^[0-9]/.test(x.w);el.innerHTML=mark(v.d.src,v.sw,(k,x)=>isn(x)?(v.on.has(x.w)?'k':'x'):'');
      cap.innerHTML='<b>Before:</b> the source, '+fmt(v.sw.length)+' words. Numbers are marked: kept if the output repeats them, struck if it drops them ('+fmt(v.kept)+' of '+fmt(v.sn.length)+' kept).'}
    else{const upto=i>=N-1?null:Math.round(v.o.output.length*i/(N-1));
      el.innerHTML=mark(v.o.output,v.ow,k=>v.cov[k]?'k':'n',upto);
      cap.innerHTML=i>=N-1?'<b>After:</b> '+fmt(v.ow.length)+' words; '+pct(v.novel,0)+' of its 4-word sequences are new. FineWeb-Edu score '+fmt(v.d.edu,2)+' before, '+fmt(v.o.edu,2)+' after (2.5 or more passes FineWeb-Edu\'s cut).':'Rewriting... '+Math.round(100*i/(N-1))+'%'}
    const st=document.getElementById('pt-rstats');const card=(k,a,b)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+a+'</div><div class="d">'+b+'</div></div>';
    st.innerHTML=card('Words',fmt(v.sw.length)+' to '+fmt(v.ow.length),'×'+fmt(v.ow.length/Math.max(1,v.sw.length),2))+card('New 4-word sequences',pct(v.novel,0),'0% would be a copy')+card('Source numbers kept',fmt(v.kept)+' of '+fmt(v.sn.length),'a cheap fidelity check')+card('FineWeb-Edu score',fmt(v.d.edu,2)+' to '+fmt(v.o.edu,2),'classifier rev 284663cb, CPU');
    document.getElementById('pt-rsrc').innerHTML='Source: '+esc(v.d.url||'Cosmopedia web_samples_v2 row '+cp.i)+'. Output by '+esc(v.o.model)+'. Measures as in the Synthetic data page\'s <code>analyze_rephrase.py</code>; scores <span class="meas">measured on Apple M1 Pro (CPU)</span>.'}
  const A=P.anim({card:'pt-rcard',ctl:'pt-rctl',n:N,draw,ms:1300,label:'Rephrasing step'});
  function styles(){const ks=Object.keys(docs[di].styles);if(!ks.includes(sty))sty=ks.includes('medium')?'medium':ks[0];
    sseg.innerHTML=ks.map(k=>'<button data-m="'+k+'" class="'+(k===sty?'on':'')+'" aria-pressed="'+(k===sty)+'">'+esc(STY[k]||k)+'</button>').join('')}
  P.seg(sseg,m=>{sty=m;view=null;A.reset(N)});
  dsel.addEventListener('change',()=>{di=+dsel.value;styles();view=null;A.reset(N)});
  styles();
  const ag=R.agg;
  const SY=window.RDP&&window.RDP.syn;
  if(!R.complete&&SY){const L={easy:'Easy',medium:'Medium',hard:'Hard',qa:'QA'};document.getElementById('pt-rpend').innerHTML='<b>From the full run</b> (Synthetic data child page, '+SY.docs+' running-example pages \u00d7 4 styles, '+esc(SY.model)+', M1 Pro GPU, 2026-10-16; the two documents above are from its earlier CPU smoke test, same model and prompts): '+
    Object.keys(L).map(k=>{const a=SY.styles[k];return L[k]+': length \u00d7'+fmt(a.len_ratio,2)+', '+pct(a.num_kept,0)+' of source numbers kept, '+pct(a.preamble,1)+' open with a chat preamble, '+pct(a.edu_ge3,1)+' pass FineWeb-Edu'}).join('; ')+' (sources: '+pct(SY.edu_source.ge3,1)+' pass). <span class="meas">measured</span>; details in section 3 of the child page.'}
  else document.getElementById('pt-rpend').innerHTML=(R.complete?'<b>From the full run</b> ('+esc(R.syn_file)+'): ':'<b>Pending GPU run (owned by the Synthetic data child page):</b> 200 web documents of the running example rephrased by Qwen3-4B in WRAP\'s four styles (its <code>scripts/run_pending.sh</code>, Job 1, 1.5 to 2 hours on the M1 Pro GPU). Until then the two documents above come from its CPU smoke test (same model, prompts and sampling). On those two: ')+
    Object.entries(ag).map(([k,a])=>esc(STY[k]||k)+': length ×'+fmt(a.len_ratio_median,2)+', '+pct(a.novel4_median,0)+' new 4-grams, edu '+fmt(a.src_edu_mean,2)+' to '+fmt(a.edu_mean,2)).join('; ')+'. This box and the numbers refill from that output when it exists (<code>src/post/pt_rephrase.py</code>).';
  function scatter(){const el=document.getElementById('pt-rsc'),w=Math.min(520,P.width(el)),H=Math.min(320,w*0.75),l=40,b=34,t=8,pts=R.cosmo;
    const X=v=>l+(w-l-8)*Math.max(0,Math.min(5,v))/5,Y=v=>t+(H-t-b)*(1-Math.max(0,Math.min(5,v))/5);
    let s='';for(let k=0;k<=5;k++){s+='<line x1="'+X(k)+'" x2="'+X(k)+'" y1="'+t+'" y2="'+(H-b)+'" stroke="var(--line)"/><line x1="'+l+'" x2="'+(w-8)+'" y1="'+Y(k)+'" y2="'+Y(k)+'" stroke="var(--line)"/><text x="'+X(k)+'" y="'+(H-b+13)+'" text-anchor="middle" font-size="10" fill="var(--mute)">'+k+'</text><text x="'+(l-5)+'" y="'+(Y(k)+3)+'" text-anchor="end" font-size="10" fill="var(--mute)">'+k+'</text>'}
    s+='<line x1="'+X(0)+'" y1="'+Y(0)+'" x2="'+X(5)+'" y2="'+Y(5)+'" stroke="var(--mute)" stroke-dasharray="3 3"/><line x1="'+X(2.5)+'" x2="'+X(2.5)+'" y1="'+t+'" y2="'+(H-b)+'" stroke="var(--bad)" stroke-dasharray="4 3"/><line x1="'+l+'" x2="'+(w-8)+'" y1="'+Y(2.5)+'" y2="'+Y(2.5)+'" stroke="var(--bad)" stroke-dasharray="4 3"/>';
    pts.forEach(([a,c])=>{s+='<circle cx="'+X(a).toFixed(1)+'" cy="'+Y(c).toFixed(1)+'" r="2.6" fill="var(--c1)" opacity=".6"/>'});
    s+='<text x="'+(l+(w-l)/2)+'" y="'+(H-4)+'" text-anchor="middle" font-size="10.5" fill="var(--mute)">seed web extract score</text><text x="12" y="'+(t+(H-b)/2)+'" font-size="10.5" fill="var(--mute)" transform="rotate(-90 12 '+(t+(H-b)/2)+')" text-anchor="middle">generated document score</text>';
    el.innerHTML='<svg viewBox="0 0 '+w+' '+H+'" width="'+w+'" height="'+H+'" role="img" aria-label="Scatter of seed against generated document educational score">'+s+'</svg>';
    const c=R.cosmo_agg;document.getElementById('pt-rscsrc').innerHTML=fmt(c.n)+' Cosmopedia rows (seeded draw), FineWeb-Edu classifier on the seed extract and on the generated document; dashed red lines are the 2.5 cut, the grey diagonal is "no change". Mean score '+fmt(c.seed_edu_mean,2)+' to '+fmt(c.out_edu_mean,2)+'; passing '+fmt(c.seed_pass)+' to '+fmt(c.out_pass)+'. Median length ×'+fmt(c.len_ratio_median,1)+', '+pct(c.novel4_median,0)+' new 4-word sequences, '+fmt(c.nums_kept)+' of '+fmt(c.nums)+' seed numbers reappear. The generator writes in the register the classifier was trained to like; that is a score, not proof of better training data. <span class="meas">measured on Apple M1 Pro (CPU)</span>.'}
  scatter();P.onRender(scatter);P.onResize(scatter);
})();
