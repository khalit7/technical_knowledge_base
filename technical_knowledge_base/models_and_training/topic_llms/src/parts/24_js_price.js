// ---- Cost per task: C = (Tc*pc + Ti*pi + To*po) / 1e6 ----
(function(){
  const $=id=>document.getElementById(id);
  // [name, cached $/M, input $/M, output $/M, open?] from Artificial Analysis, read 1 Oct 2026 (each lab's own API price)
  const P=[
    ['Claude Fable 5.1',0.25,10,50,0],
    ['GPT-6 Astra',1,10,50,0],
    ['Claude Opus 5.5',0.20,4,20,0],
    ['Kimi K3',0.30,3,15,1],
    ['Claude Sonnet 5.5',0.20,2,10,0],
    ['GPT-6.1 Sol',0.10,2,10,0],
    ['Gemini 4 Argon',0.10,2,10,0],
    ['Grok 4.7',0.50,2,6,0],
    ['GLM-5.3',0.26,1.4,4.4,1],
    ['Muse Spark 1.3',0.15,1.25,4.25,0],
    ['Gemini 3.8 Flash',0.075,0.75,3.75,0],
    ['Step 5 Preview',0.05,1.00,2.70,0],
    ['MiMo-V2.6-Pro',0.0036,0.435,0.87,1],
    ['DeepSeek V4.1-Flash',0.006,0.30,1.20,1],
    ['GLM-5.3-Flash',0.03,0.15,0.50,1],
    ['Qwen3.8-Flash-Next',0.016,0.15,0.47,1],
    ['MiMo-V2.6-Flash',0.0028,0.14,0.28,1],
    ['GPT-6 Luna',0.01,0.10,0.50,0]
  ];
  let sel='Claude Opus 5.5';
  const sizes=[0,10000,25000,50000,100000,200000,400000];
  function money(x){return x>=0.095?'$'+x.toFixed(2):x>=0.01?'$'+x.toFixed(3):'$'+x.toFixed(4)}
  function cost(p,Tc,Ti,To,useCache){const pc=(useCache&&p[1]!==null)?p[1]:p[2];return (Tc*pc+Ti*p[2]+To*p[3])/1e6}
  function run(){
    const Tc=sizes[+$('pcC').value],Ti=+$('pcI').value*1000,To=+$('pcO').value*1000,useCache=$('pcUse').checked;
    $('pcCv').textContent=Tc.toLocaleString('en-GB');$('pcIv').textContent=Ti.toLocaleString('en-GB');$('pcOv').textContent=To.toLocaleString('en-GB');
    const rows=P.map(p=>({p,c:cost(p,Tc,Ti,To,useCache)})).sort((a,b)=>b.c-a.c);
    const max=Math.max(...rows.map(r=>r.c),1e-9);
    $('pcBars').innerHTML=rows.map(r=>'<div class="row'+(r.p[0]===sel?' hl':'')+'" data-n="'+r.p[0]+'" style="cursor:pointer"><span class="nm">'+r.p[0]+(r.p[1]===null&&Tc>0&&useCache?' *':'')+'</span><span class="track"><span class="fill" style="width:'+(100*r.c/max).toFixed(2)+'%;background:'+(r.p[4]?'var(--open)':'var(--closed)')+';opacity:'+(r.p[0]===sel?1:.55)+'"></span></span><span class="val">'+money(r.c)+'</span></div>').join('');
    $('pcBars').querySelectorAll('.row').forEach(el=>el.addEventListener('click',()=>{sel=el.dataset.n;run()}));
    const p=P.find(x=>x[0]===sel),pc=(useCache&&p[1]!==null)?p[1]:p[2];
    const a=Tc*pc/1e6,b=Ti*p[2]/1e6,c=To*p[3]/1e6,tot=a+b+c;
    
    const m2=x=>x>=0.01||x===0?'$'+x.toFixed(2):'$'+x.toFixed(4);$('pcEq').textContent=sel+': ('+Tc.toLocaleString('en-GB')+' × '+pc+' + '+Ti.toLocaleString('en-GB')+' × '+p[2]+' + '+To.toLocaleString('en-GB')+' × '+p[3]+') / 10⁶ = '+m2(a)+' + '+m2(b)+' + '+m2(c)+' = '+money(tot);
        const nc=(Tc*p[2]+Ti*p[2]+To*p[3])/1e6;
    $('pcNo').textContent=(useCache&&Tc>0)?'Without the cache this turn would cost '+money(nc)+' on '+sel+', '+(nc/tot).toFixed(1)+' times as much.':'';
  }
  ['pcC','pcI','pcO','pcUse'].forEach(id=>$(id).addEventListener('input',run));
  $('pcReset').addEventListener('click',()=>{$('pcC').value=5;$('pcI').value=20;$('pcO').value=5;$('pcUse').checked=true;sel='Claude Opus 5.5';run()});
  run();
})();
