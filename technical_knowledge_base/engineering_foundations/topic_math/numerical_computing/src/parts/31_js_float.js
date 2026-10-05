// ---- Float explorer tab ----
(function(){
  const $=id=>document.getElementById(id),S=FP.show,ORDER=['fp64','fp32','tf32','bf16','fp16','e5m2','e4m3'];
  const NOTE={fp64:'NumPy default',fp32:'PyTorch default, master weights',tf32:'tensor-core matmul mode',bf16:'training default',fp16:'needs loss scaling',e5m2:'FP8 for gradients',e4m3:'FP8 for weights, activations'};
  // parse "1e-8", "2^-24", "1+2^-8", "-0", "inf", "nan", "pi": numbers, ^ for powers, + - * / and parentheses only
  function parse(s){s=String(s).trim().toLowerCase().replace(/−/g,'-').replace(/\s+/g,'');
    if(s==='nan')return NaN;if(s==='inf'||s==='+inf'||s==='infinity')return Infinity;if(s==='-inf')return -Infinity;if(s==='-0')return -0;
    if(!/^[0-9.e+\-*/^()pi]+$/.test(s))return null;
    let i=0;const peek=()=>s[i];
    function num(){const m=/^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/.exec(s.slice(i));if(m){i+=m[0].length;return parseFloat(m[0])}if(s.startsWith('pi',i)){i+=2;return Math.PI}
      if(peek()==='('){i++;const v=expr();if(peek()!==')')throw 0;i++;return v}throw 0}
    function unary(){if(peek()==='-'){i++;return -unary()}if(peek()==='+'){i++;return unary()}return pow()}
    function pow(){const b=num();if(peek()==='^'){i++;const e=unary();return Math.pow(b,e)}return b}
    function term(){let v=unary();while(peek()==='*'||peek()==='/'){const o=s[i++];const w=unary();v=o==='*'?v*w:v/w}return v}
    function expr(){let v=term();while(peek()==='+'||peek()==='-'){const o=s[i++];const w=term();v=o==='+'?v+w:v-w}return v}
    try{const v=expr();return i===s.length?v:null}catch(e){return null}}
  let X=Math.log(Math.exp(2)+Math.exp(1)+1);
  const PRE=[['loss 2.4076',String(X)],['0.1','0.1'],['1e-8','1e-8'],['2^-24','2^-24'],['1+2^-8','1+2^-8'],['999','999'],['448','448'],['500','500'],['65504','65504'],['70000','70000'],['3e38','3e38'],['1e-40','1e-40'],['-0','-0'],['inf','inf'],['nan','nan']];
  $('fx-pre').innerHTML=PRE.map(p=>'<button data-v="'+p[1]+'">'+p[0]+'</button>').join('');
  $('fx-pre').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;$('fx-x').value=b.dataset.v;fromText()});
  function card(k){
    const f=FP.F[k],sat=k==='e4m3'&&$('fx-sat').value==='1',v=FP.rnd(X,f,{sat}),e=FP.enc(v,f),c=FP.cls(v,f);
    let d='<h3><span>'+f.name+' <span class="mute small">'+f.bits+' bits, '+NOTE[k]+'</span></span><span class="cl '+c+'">'+c+'</span></h3>';
    d+=FP.bitsHTML(e.bits,f,{flip:true,sm:k==='fp64'});
    let read='';
    if(c==='normal')read='(−1)<sup>'+e.s+'</sup> × (1 + '+e.mf+'/2<sup>'+f.m+'</sup>) × 2<sup>'+e.ef+'−'+f.bias+'</sup>';
    else if(c==='subnormal')read='(−1)<sup>'+e.s+'</sup> × '+e.mf+'/2<sup>'+f.m+'</sup> × 2<sup>'+f.emin+'</sup> (no hidden 1)';
    else if(c==='zero')read=e.s?'negative zero':'zero';else if(c==='infinity')read='exponent all ones, fraction 0';else read=f.kind==='fn'?'S.1111.111, the only NaN':'exponent all ones, fraction not 0';
    const ae=Math.abs(v-X),fin=isFinite(X)&&isFinite(v);
    let why='';
    if(isFinite(X)&&X!==0&&v===0)why=' <span class="bad">underflow: below half the smallest subnormal ('+S(f.minSub,3)+')</span>';
    else if(isFinite(X)&&!isFinite(v))why=' <span class="bad">overflow: past '+S(f.max)+'</span>';
    else if(isFinite(X)&&k==='e4m3'&&sat&&Math.abs(X)>f.max)why=' <span class="bad">saturated (true value '+S(X)+')</span>';
    d+='<dl class="fx-kv"><dt>stored</dt><dd><b>'+S(v,17)+'</b>'+why+'</dd><dt>fields</dt><dd>'+read+'</dd>';
    if(fin&&X!==0)d+='<dt>error</dt><dd>'+S(ae,3)+' (relative '+S(ae/Math.abs(X),3)+'; bound <i>u</i> = '+S(f.u,3)+')</dd>';
    if(isFinite(v))d+='<dt>gap here</dt><dd>'+S(FP.ulp(v===0?f.minSub:v,f),4)+(c==='normal'?' = 2<sup>'+(e.E-f.m)+'</sup>':'')+'</dd>';
    const lo=FP.step(v,f,-1),hi=FP.step(v,f,1);
    d+='</dl><div class="fx-nb"><button data-k="'+k+'" data-go="'+lo+'">◀ '+S(lo,k==='fp64'?17:9)+'</button><button data-k="'+k+'" data-go="'+hi+'">'+S(hi,k==='fp64'?17:9)+' ▶</button></div>';
    const y=parse($('fx-y').value);
    if(y!==null&&!Number.isNaN(y)&&isFinite(v)){const yy=FP.rnd(y,f,{sat}),s=FP.rnd(v+yy,f,{sat});
      d+='<div class="fx-add">stored + y: '+S(v,9)+' + '+S(yy,6)+' = <b>'+S(s,9)+'</b>'+(s===v&&yy!==0?' <span class="bad">y absorbed (below half a gap)</span>':(yy===0&&y!==0?' <span class="bad">y itself underflows to 0</span>':''))+'</div>'}
    return '<div class="fx-card" data-k="'+k+'">'+d+'</div>';
  }
  function draw(){$('fx-cards').innerHTML=ORDER.map(card).join('');
    const a=Math.abs(X);$('fx-tv').textContent=isFinite(a)&&a>0?Math.log2(a).toFixed(2):'n/a';
    if(isFinite(a)&&a>0){const t=Math.log2(a);if(t>=-30&&t<=20)$('fx-t').value=t}}
  function fromText(){const v=parse($('fx-x').value);if(v===null){$('fx-msg').textContent='Could not read that number; use digits, e, ^, + - * / and parentheses.';return}$('fx-msg').textContent='';X=v;draw()}
  $('fx-x').addEventListener('input',fromText);$('fx-y').addEventListener('input',draw);$('fx-sat').addEventListener('change',draw);
  $('fx-t').addEventListener('input',e=>{const t=+e.target.value,sg=(X<0||Object.is(X,-0))?-1:1;X=sg*2**t;$('fx-x').value=String(+X.toPrecision(10));$('fx-msg').textContent='';draw()});
  $('fx-cards').addEventListener('click',e=>{
    const nb=e.target.closest('button[data-go]');if(nb){X=+nb.dataset.go;$('fx-x').value=String(X);draw();return}
    const b=e.target.closest('.bits.flip .b');if(!b)return;const k=b.closest('.fx-card').dataset.k,f=FP.F[k],sat=k==='e4m3'&&$('fx-sat').value==='1';
    const bits=FP.enc(FP.rnd(X,f,{sat}),f).bits,i=+b.dataset.i,nb2=bits.slice(0,i)+(bits[i]==='1'?'0':'1')+bits.slice(i+1);
    X=FP.dec(nb2,f);$('fx-x').value=Object.is(X,-0)?'-0':String(X);$('fx-msg').textContent='Flipped bit '+i+' of '+f.name+': the new bits encode '+S(X,17)+'.';draw()});
  $('fx-cards').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('.bits.flip .b')){e.preventDefault();e.target.click()}});
  window.FX={parse,set:v=>{X=v;draw()},get:()=>X};
  draw();
})();
