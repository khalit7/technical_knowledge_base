// ---- Reading tab, sections 5 to 9: published mixes, measured table, classifier bars, survival calculator, bigram collapse animation, cost calculator ----
(function(){
  const D=window.SY||{},esc=RD.esc,S={};(D.sets||[]).forEach(s=>S[s.key]=s);
  const col=g=>g==='real'?'var(--c3)':g==='rephrased'?'var(--c1)':'var(--c2)';

  // published synthetic shares
  (function(){const el=document.getElementById('sy-mix');if(!el)return;
    const M=[
      ['phi-1.5 pretraining',80,'r','80% of 150B training tokens synthetic (Section 2.3, arXiv 2309.05463)'],
      ['Olmo 3 mid-training (Dolmino 100B)',57.5,'r','derived: 100% minus the four non-synthetic rows of the Dolma 3 Dolmino card table (parent page, section 8)'],
      ['phi-4 pretraining',55,'r','derived: synthetic 40% + web rewrites 15% (Table 5, arXiv 2412.08905)'],
      ['WRAP experiments',50,'r','real and rephrased sampled 1:1 (Section 3.1, arXiv 2401.16380)'],
      ['Nemotron-CC v2 (as released)',42.7,'r','derived: (1,257.3 + 692.9 + 558.2) / (3,359.8 + 2,508.4) billion tokens, card table (nvidia/Nemotron-CC-v2)'],
      ['BeyondWeb experiments',40,'r','60% RedPajama + 40% synthetic (arXiv 2508.10975)'],
      ['Nemotron-CC (as released)',30.2,'r','derived: 1.9T synthetic / 6.3T total (Table 4, arXiv 2412.02595)'],
      ['SmolLM2 final stage',4,'r','Cosmopedia v2 at 4% of stage 4 (Section 4.5, arXiv 2502.02737)'],
      ['FinePhrase sweep: plateau',70,'a','60 to 80% best, 1.2B model on 21B tokens, benchmark average (Table 22, arXiv 2604.13977); bar at the middle'],
      ['Kang et al. sweep: best',30,'a','"converging to ~30%" for rephrased data by validation loss (arXiv 2510.01631)']];
    el.innerHTML=M.map(m=>'<div title="'+esc(m[3])+'"><span class="nm">'+esc(m[0])+'</span><span class="tr"><span style="width:'+m[1]+'%;background:'+(m[2]==='r'?'var(--c1)':'var(--c3)')+'"></span></span><span class="v">'+m[1]+'%</span></div>').join('');
    document.getElementById('sy-mix-src').innerHTML=M.map(m=>'<li><b>'+esc(m[0])+'</b>: '+esc(m[3])+'</li>').join('')})();

  // measured table, eight sets
  (function(){const el=document.getElementById('sy-m6');if(!el||!D.sets)return;
    const K=['fineweb','wikipedia','nemo_lq_real','nemo_lq_wiki','cosmo_web_v2','cosmo_khan','cosmo_stories','tinystories'];
    const C=[['Group',s=>s.group],['Words (median)',s=>s.words_median],['distinct-2 &uarr;',s=>s.distinct2.toFixed(3)],['gzip ratio &darr;',s=>s.gzip_ratio.toFixed(2)],['Top-10 openings &darr;',s=>(100*s.openings_top10_share).toFixed(1)+'%'],
      ['Embedding similarity &darr;',s=>s.homogeneity!=null?s.homogeneity.toFixed(2):'n/a'],['Near-dup pairs',s=>(100*s.neardup_share).toFixed(1)+'%'],['Bench 13-gram',s=>(100*s.bench13_share).toFixed(1)+'%']];
    el.innerHTML='<thead><tr><th>Set</th>'+C.map(c=>'<th class="num">'+c[0]+'</th>').join('')+'</tr></thead><tbody>'+K.filter(k=>S[k]).map(k=>'<tr><td>'+esc(S[k].label)+'</td>'+C.map(c=>'<td class="num">'+c[1](S[k])+'</td>').join('')+'</tr>').join('')+'</tbody>'})();

  // FineWeb-Edu classifier pass rate
  (function(){const el=document.getElementById('sy-edu');if(!el||!D.sets)return;
    const rows=D.sets.filter(s=>s.edu_ge3!=null);
    el.innerHTML=rows.map(s=>'<div title="'+esc(s.label)+'"><span class="nm">'+esc(s.label)+'</span><span class="tr"><span style="width:'+(100*s.edu_ge3).toFixed(1)+'%;background:'+col(s.group)+'"></span></span><span class="v">'+(100*s.edu_ge3).toFixed(0)+'%</span></div>').join('')+
      '<div class="leg"><span style="--sw:var(--c3)">real</span><span style="--sw:var(--c1)">rephrased or transformed</span><span style="--sw:var(--c2)">generated from seeds</span></div>'})();

  // survival calculator
  (function(){const pS=document.getElementById('sy-surv-p'),nS=document.getElementById('sy-surv-n'),gS=document.getElementById('sy-surv-g'),out=document.getElementById('sy-surv-out');if(!pS)return;
    const fmt=x=>x>=0.995?(100*x).toFixed(1)+'%':x>=0.01?(100*x).toFixed(1)+'%':x>=1e-6?(100*x).toPrecision(2)+'%':'under 0.0001%';
    function up(){const p=+pS.value,n=+nS.value,g=+gS.value;document.getElementById('sy-surv-gv').textContent=g;
      const miss=Math.exp(n*Math.log1p(-p)),surv=Math.pow(1-miss,g);
      out.innerHTML=RD.stat('Expected count per sample',(n*p).toLocaleString('en-US',{maximumFractionDigits:2}),'n &times; p')+RD.stat('Lost in one generation',fmt(miss),'(1 &minus; p)<sup>n</sup>')+RD.stat('Survives '+g+' generations, at most',fmt(surv),'(1 &minus; (1 &minus; p)<sup>n</sup>)<sup>g</sup>')}
    [pS,nS,gS].forEach(e=>e.addEventListener('input',up));up()})();

  // bigram collapse animation
  (function(){const B=D.bigram,host=document.getElementById('sy-bg-svg');if(!B||!host)return;
    const M=B.modes,G=M.replace.length-1,NAME={replace:'Replace',keep10:'Keep 10% real',accumulate:'Accumulate'},CL={replace:'var(--c2)',keep10:'var(--c5)',accumulate:'var(--c3)'};
    let mode='replace';const all=[].concat(...Object.values(M).map(r=>r.map(x=>x.test_ppl))),ymax=Math.ceil(Math.max(...all)/10)*10+5,ymin=Math.floor(Math.min(...all)/10)*10;
    function draw(i){const w=RD.width(host),h=230,l=44,r=12,t=12,b=34,X=g=>l+(w-l-r)*g/G,Y=v=>t+(h-t-b)*(1-(v-ymin)/(ymax-ymin));
      let s='';for(let v=ymin;v<=ymax;v+=20){s+='<line x1="'+l+'" x2="'+(w-r)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(l-6,Y(v)+4,v,{a:'end'})}
      for(let g=0;g<=G;g+=2)s+=RD.t(X(g),h-b+16,g,{a:'middle'});s+=RD.t((l+w-r)/2,h-4,'generation',{a:'middle',fill:'var(--mute)'});
      s+='<text x="12" y="'+(t+(h-t-b)/2)+'" transform="rotate(-90 12 '+(t+(h-t-b)/2)+')" text-anchor="middle" font-size="11" fill="var(--mute)">perplexity on real stories</text>';
      Object.keys(M).forEach(m=>{const rows=M[m].slice(0,m===mode?i+1:G+1);const d=rows.map((x,g)=>(g?'L':'M')+X(g).toFixed(1)+' '+Y(x.test_ppl).toFixed(1)).join(' ');
        s+='<path d="'+d+'" fill="none" stroke="'+CL[m]+'" stroke-width="'+(m===mode?3:1.2)+'" opacity="'+(m===mode?1:.45)+'"/>';
        if(m===mode){const x=rows[rows.length-1];s+='<circle cx="'+X(i)+'" cy="'+Y(x.test_ppl)+'" r="4" fill="'+CL[m]+'"/>'}
        else{const x=M[m][G];s+=RD.t(X(G)-2,Y(x.test_ppl)-5,NAME[m],{a:'end',fs:10,fill:'var(--mute)'})}});
      host.innerHTML=RD.svg(w,h,s,'Perplexity on held-out real stories by generation');
      const x=M[mode][i],x0=M[mode][0];
      document.getElementById('sy-bg-cap').innerHTML='<div class="t">'+NAME[mode]+', generation '+i+(i===0?' (trained on real stories)':'')+'</div><p>'+(i===0?'The bigram model counted '+B.params.train_tokens.toLocaleString('en-US')+' words of real TinyStories. Every later generation is refit on text sampled from the model before it.':mode==='replace'?'Refit only on the previous model\'s samples: every word pair the sample missed is gone for good.':mode==='keep10'?'Refit on 90% sampled text plus a fresh random 10% of the real stories: lost words can come back.':'Refit on the real stories plus every sample so far: nothing real is ever removed.')+'</p><p class="small"><i>Sampled: "'+esc(x.examples[0])+'"</i></p>';
      document.getElementById('sy-bg-cnt').innerHTML=RD.stat('Perplexity, real stories',x.test_ppl.toFixed(1),'generation 0: '+x0.test_ppl.toFixed(1))+RD.stat('Word types in training data',x.vocab.toLocaleString('en-US'),'of '+x0.vocab.toLocaleString('en-US'))+RD.stat('Distinct word pairs',x.bigrams.toLocaleString('en-US'),'of '+x0.bigrams.toLocaleString('en-US'))}
    const A=RD.anim({card:'sy-bg-card',ctl:'sy-bg-ctl',n:G+1,draw,ms:900,label:'Generation'});
    RD.seg(document.getElementById('sy-bg-seg'),m=>{mode=m;A.go(0);A.play()});RD.onResize(()=>A.redraw())})();

  // cost calculator
  (function(){const g=document.getElementById('sy-cost-g');if(!g)return;
    const P=[['WRAP: Mistral-7B on one A100',3.0,'3M tokens per hour on a single A100 (WRAP Section 7.1)'],
      ['Cosmopedia: Mixtral-8x7B on H100s',2.5,'25B tokens in "over 10k GPU hours", so at most 2.5M per hour (blog); FinePhrase Table 10 also lists Cosmopedia as under 2.5M'],
      ['REWIRE: Llama-3.3-70B on H100s',1.1,'about 400B tokens for about 352K H100-hours (FinePhrase Table 10)'],
      ['FinePhrase: SmolLM2-1.7B on H100s, speculative decoding',33.1,'33.1M tokens per GPU-hour (FinePhrase Table 10)']];
    g.innerHTML=P.map((p,i)=>'<option value="'+i+'"'+(i===0?' selected':'')+'>'+p[0]+' ('+p[1]+'M tok/GPU-h)</option>').join('');
    const ids=['sy-cost-t','sy-cost-g','sy-cost-n','sy-cost-p'].map(i=>document.getElementById(i));
    const f=x=>x.toLocaleString('en-US',{maximumFractionDigits:x<10?1:0});
    function up(){const T=Math.max(0,+ids[0].value||0)*1e9,p=P[+ids[1].value],N=Math.max(1,+ids[2].value||1),pr=Math.max(0,+ids[3].value||0);
      const h=T/(p[1]*1e6),days=h/N/24;
      document.getElementById('sy-cost-out').innerHTML=RD.stat('GPU-hours',f(h),'tokens / throughput')+RD.stat('Wall-clock on '+f(N)+' GPUs',days<2?f(days*24)+' hours':f(days)+' days','perfect scaling assumed')+RD.stat('Cost',''+(pr?'$'+f(h*pr):'n/a'),'GPU-hours &times; price (illustrative price)');
      document.getElementById('sy-cost-src').innerHTML='<span class="der">derived</span> Throughput: '+esc(p[2])+'. Real runs lose time to failures, uneven output lengths and post-processing; the GPU types differ between presets.'}
    ids.forEach(e=>e.addEventListener('input',up));up()})();
})();
