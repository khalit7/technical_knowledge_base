// Block lab core (window.BL): data decoding, colour grids, model specs (the tiny GPT by hand, real models through
// window.CC, the Config calculator's port of src/calc/calc.py), shapes, parameter and FLOP counts per step.
// window.CC is defined by a later script (33_js_cc_1core.js), so everything that needs it runs at render time.
window.BL=(function(){
  if(!window.BLD)return null;
  const D=window.BLD;
  const $=id=>document.getElementById(id);
  const dec8=a=>{const s=a[0],b=atob(a[1]),o=new Float32Array(b.length);for(let i=0;i<b.length;i++){let v=b.charCodeAt(i);if(v>127)v-=256;o[i]=v*s}return o};
  const decU=a=>{const s=a[0],b=atob(a[1]),o=new Float32Array(b.length);for(let i=0;i<b.length;i++)o[i]=b.charCodeAt(i)/255*s;return o};
  const cache={};
  const vec=(li,k)=>{const key=li+':'+k;if(!cache[key])cache[key]=dec8(li<0?D.trace.embed[k]:D.trace.layers[li][k]);return cache[key]};
  const att=(li,h)=>{const key='a'+li+':'+h;if(!cache[key])cache[key]=decU(D.trace.layers[li].attn[h]);return cache[key]};
  const norm=v=>{let s=0;for(const x of v)s+=x*x;return Math.sqrt(s)};
  const fmt=(x,d)=>{if(!isFinite(x))return '?';const a=Math.abs(x);
    if(a>=1e12)return (x/1e12).toFixed(d===undefined?2:d)+' T';if(a>=1e9)return (x/1e9).toFixed(d===undefined?2:d)+' G';
    if(a>=1e6)return (x/1e6).toFixed(d===undefined?2:d)+' M';if(a>=1e4)return (x/1e3).toFixed(d===undefined?1:d)+' k';return String(Math.round(x))};
  const comma=x=>Math.round(x).toString().replace(/\B(?=(\d{3})+(?!\d))/g,',');
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const tokTxt=s=>esc(String(s).replace(/\n/g,'↵').replace(/^ /,'␣'));
  // one grid of cells (rows x cols) at (x,y), cell size c; colour by sign, opacity by |v|/max
  function grid(v,rows,cols,x,y,c,mx){
    mx=mx||Math.max(1e-9,...Array.from(v,Math.abs));let s='';
    for(let r=0;r<rows;r++)for(let k=0;k<cols;k++){const val=v[r*cols+k];if(val===undefined)continue;const o=Math.min(1,Math.abs(val)/mx);if(o<0.04)continue;
      s+='<rect x="'+(x+k*c).toFixed(1)+'" y="'+(y+r*c).toFixed(1)+'" width="'+Math.max(1,c-(c>4?0.6:0)).toFixed(1)+'" height="'+Math.max(1,c-(c>4?0.6:0)).toFixed(1)+'" fill="var('+(val<0?'--c1':'--c2')+')" fill-opacity="'+o.toFixed(2)+'"/>'}
    return '<rect x="'+x+'" y="'+y+'" width="'+(cols*c).toFixed(1)+'" height="'+(rows*c).toFixed(1)+'" fill="none" stroke="var(--line)"/>'+s;
  }
  const W=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-60))};
  // ---- model specs ----
  const TINY={key:'tiny',label:'Tiny GPT (running example)'};
  function tinySpec(){const c=D.trace.config;const d=c.d_model;
    const mix={t:'attn',nh:c.n_head,nkv:c.n_head,hd:c.head_dim,hdv:c.head_dim,bqkv:false,bo:false,qk:0,sinks:false,gate:false,win:0};
    const lay={mix,ffn:{t:'mlp',ff:c.ffn_hidden,bias:false},norms:2*d};
    return {model_type:'tiny',notes:[],d,V:c.vocab,tied:true,pos_embed:c.ctx*d,final_norm:d,layers:Array(c.n_layer).fill(lay),act:'gelu',norm:'LayerNorm',pos:'learned'}}
  const PICK=['tiny','smollm2-135m','qwen3-0.6b','llama-3.1-8b','qwen3-8b','llama-3.1-70b'];
  function models(){const out=[{key:'tiny',label:TINY.label}];
    if(window.CCD)for(const k of PICK.slice(1)){const m=window.CCD.models.find(x=>x.key===k);if(m)out.push({key:k,label:m.label})}return out}
  const specs={};
  function spec(key){if(specs[key])return specs[key];
    if(key==='tiny')return specs[key]=tinySpec();
    const m=window.CCD.models.find(x=>x.key===key);const s=window.CC.normalise(m.cfg);
    const c=m.cfg.text_config||m.cfg;s.act=c.hidden_act||c.hidden_activation||'silu';s.norm='RMSNorm';s.pos='RoPE';
    return specs[key]=s}
  // per-block numbers for the first layer of a spec (all layers equal in the models offered here)
  function block(s){const L=s.layers[0],m=L.mix,f=L.ffn,d=s.d;
    const glu=f.t==='glu';
    return {d,nh:m.nh,nkv:m.nkv,hd:m.hd,ff:f.ff,glu,V:s.V,n:s.layers.length,tied:s.tied,
      q:d*m.nh*m.hd,k:d*m.nkv*m.hd,v:d*m.nkv*m.hd,o:m.nh*m.hdv*d,up:d*f.ff*(glu?2:1),down:f.ff*d,normp:L.norms/2,
      bias:!!m.bqkv}}
  // the registration helper for this tab
  function onRender(f){(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-block']=window.TAB_RENDER['t-block']||[]).push(f)}
  function onResize(f){let t=0;addEventListener('resize',()=>{const r=$('t-block');if(!r||r.hidden)return;clearTimeout(t);t=setTimeout(f,80)})}
  function seg(el,f){el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!el.contains(b))return;el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));f(b.dataset.m)})}
  return {D,$,vec,att,norm,fmt,comma,esc,tokTxt,grid,W,spec,block,models,onRender,onResize,seg,dec8};
})();
