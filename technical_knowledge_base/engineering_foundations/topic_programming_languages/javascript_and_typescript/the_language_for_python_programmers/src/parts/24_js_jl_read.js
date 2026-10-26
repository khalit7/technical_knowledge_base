// ---- Reading: the double probe (section 1) and the V8 tier stepper (section 8) ----
(function(){
  // The double probe: one input, computed live with Number() and BigInt(); the presets match the recorded b1_numbers run.
  const $=id=>document.getElementById(id),esc=RD.esc;
  const inp=$('jl-dp-in'),out=$('jl-dp-out');if(!inp||!out)return;
  const bitlen=b=>b===0n?0:b.toString(2).length;
  function render(){
    const s=inp.value.trim().replace(/_/g,'');const rows=[];
    if(/^-?\d{1,400}$/.test(s)){
      const exact=BigInt(s),d=Number(s);
      if(!isFinite(d)){rows.push(['Number(s)',String(d)+': beyond the largest double, about 1.8e308',1])}
      else{
        const stored=BigInt(d),abs=stored<0n?-stored:stored,k=bitlen(abs)-1,diff=exact-stored;
        rows.push(['You typed (exact, as a BigInt)',exact.toString()]);
        rows.push(['JavaScript prints Number(s) as',String(d),diff!==0n]);
        rows.push(['The double actually stored',stored.toString()]);
        rows.push(['Lost',diff===0n?'nothing: this integer is exact':'off by '+(diff<0n?-diff:diff).toString(),diff!==0n]);
        rows.push(['Neighbouring doubles here',k>=53?'are '+(1n<<BigInt(k-52)).toString()+' apart (2^'+(k-52)+')':'are at most 1 apart: every integer up to 2^53 is exact']);
        rows.push(['Number.isSafeInteger',String(Number.isSafeInteger(d))]);
      }
    }else{
      const d=s===''?NaN:Number(s);
      if(Number.isNaN(d)){rows.push(['Number(s)','NaN: not a number (Number rejects junk; parseInt would stop at the first bad character)',1])}
      else if(!isFinite(d)){rows.push(['Number(s)',String(d),1])}
      else{
        rows.push(['JavaScript prints Number(s) as',String(d)]);
        rows.push(['The double actually stored (30 digits)',d===0?'0':d.toPrecision(30)]);
        if(d!==0){const e=Math.floor(Math.log2(Math.abs(d)))-52;rows.push(['Neighbouring doubles here','are 2^'+e+' = '+Math.pow(2,e).toExponential(3)+' apart'])}
      }
    }
    out.innerHTML=rows.map(r=>'<dt>'+esc(r[0])+'</dt><dd'+(r[2]?' class="bad"':'')+'>'+esc(r[1])+'</dd>').join('');
  }
  $('jl-dp').addEventListener('click',e=>{const b=e.target.closest('button[data-v]');if(!b)return;inp.value=b.dataset.v;render()});
  inp.addEventListener('input',render);
  render();
  window.JL_DP_PRINT=v=>{inp.value=v;render();const dd=out.querySelectorAll('dd');return dd[1]?dd[1].textContent:''};
})();
(function(){
  // The V8 stepper: each step shows one line of the recorded --trace-opt --trace-deopt output and where add's code runs.
  const $=id=>document.getElementById(id);
  if(!$('jl-v8-svg')||!window.JL||!JL.deopt)return;
  const L=JL.deopt;
  const TIERS=[['Ignition','interpreter'],['Sparkplug','baseline'],['Maglev','optimising'],['TurboFan','top tier']];
  // at: tier where add runs; line: index into the recorded trace (-1 none); arrow: which transition is active
  const S=[
    {at:0,line:-1,ar:'',t:'<code>add(i, 1)</code> starts as bytecode in Ignition. Every call records what it saw: two small integers (Smis), 200,000 times in the loop.'},
    {at:0,line:0,ar:'hot',t:'V8 marks <code>add</code> as hot and stable: called often, always with the same types. It picks Maglev.'},
    {at:0,line:1,ar:'hot',t:'Maglev compiles <code>add</code> specialised for Smis, with a check on entry that the guess still holds.'},
    {at:2,line:2,ar:'',t:'From now on <code>add</code> runs as Maglev machine code, specialised for small integers.'},
    {at:2,line:3,ar:'',t:'The program prints this line and calls <code>add("a", "b")</code>.'},
    {at:0,line:4,ar:'deopt',t:'The check fails ("not a Smi"): V8 throws the compiled code away and resumes in Ignition. "deopt-eager" means it bailed out at the failed check.'},
    {at:0,line:5,ar:'hot',t:'Ignition\'s feedback now includes strings. The second loop makes <code>add</code> hot again.'},
    {at:0,line:6,ar:'hot',t:'Recompiled, now from the wider feedback.'},
    {at:2,line:7,ar:'',t:'Back in Maglev.'},
    {at:2,line:8,ar:'',t:'The loop ends and prints <code>s</code>. TurboFan never appears in this run: which tier a function reaches depends on how hot it gets, and on load.'}
  ];
  const X=i=>6+i*88;
  function draw(i){
    const s=S[i];let b='';
    b+=RD.t(134,11,'hot code is compiled: moves right',{a:'middle',fs:11,fill:s.ar==='hot'?'var(--acc)':'var(--mute)'});
    b+='<path class="'+(s.ar==='hot'?'lna':'ln')+'" d="M46,36 C46,8 222,8 222,36" marker-end="url(#jl-v8-ah)"/>';
    b+='<path class="'+(s.ar==='deopt'?'lnb':'ln')+'" d="M222,92 C222,124 46,124 46,92" marker-end="url(#jl-v8-ah)"/>';
    b+=RD.t(134,132,'deoptimise: a guess failed',{a:'middle',fs:11,fill:s.ar==='deopt'?'var(--bad)':'var(--mute)'});
    TIERS.forEach((tr,k)=>{const on=k===s.at;
      b+='<rect class="'+(on?'bxa':'bx')+'" x="'+X(k)+'" y="36" width="80" height="56" rx="7"/>';
      b+=RD.t(X(k)+40,55,tr[0],{a:'middle',fs:12,w:600});
      b+=RD.t(X(k)+40,70,tr[1],{a:'middle',fs:11,fill:'var(--mute)'});
      if(on)b+=RD.t(X(k)+40,86,'add runs here',{a:'middle',fs:11,w:600,fill:'var(--acc)'});
    });
    $('jl-v8-svg').innerHTML='<defs><marker id="jl-v8-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--mute)"/></marker></defs>'+b;
    $('jl-v8-cap').innerHTML='<b>Step '+(i+1)+' of '+S.length+'.</b> '+s.t;
    $('jl-v8-trace').innerHTML=L.map((x,k)=>'<span class="ln'+(k===s.line?' on':k<s.line?' seen':'')+'">'+RD.esc(x)+'</span>').join('');
  }
  RD.anim({card:'jl-v8-card',ctl:'jl-v8-ctl',n:S.length,draw,ms:2200,label:'Trace step'});
})();
