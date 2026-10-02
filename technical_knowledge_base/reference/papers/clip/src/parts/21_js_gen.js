// ---- The toy "web" of (image, caption) pairs. The SAME file runs in the page and, through node, writes the training data (gen_data.js) ----
// A 24x24 colour image holds one shape. It is either a "photo" (filled shape on a muted, noisy background) or a
// "drawing" (coloured outline on white). Its caption is written the way people caption pictures online: it mentions
// only some of what is in the image, in one of many phrasings, often with filler words. Every pair is a pure function of its seed.
(function(root){
const S=24;
const SHAPES=['circle','square','triangle','diamond','ring','cross'];
const COLOURS=['red','orange','yellow','green','blue','purple'];
const RGB=[[.87,.16,.16],[.95,.55,.12],[.93,.83,.16],[.16,.67,.24],[.2,.36,.92],[.6,.24,.8]];
const BGS=[[.28,.28,.3],[.36,.3,.24],[.2,.3,.24],[.18,.22,.36],[.4,.38,.36],[.3,.22,.3],[.15,.15,.16]];
const SIZES=['small','big'],POS=['left','middle','right'],STYLES=['photo','drawing'];
function rng(seed){let a=seed>>>0;return function(){a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
const pick=(r,a)=>a[Math.floor(r()*a.length)];
// inside test for shape k centred at (0,0) with radius rad, at offset (dx,dy)
function inside(k,dx,dy,rad){const d=Math.hypot(dx,dy),ax=Math.abs(dx),ay=Math.abs(dy);
  if(k===0)return d<rad;
  if(k===1)return Math.max(ax,ay)<rad*.82;
  if(k===2){const top=-rad,bot=rad*.8;if(dy<top||dy>bot)return false;return ax<(dy-top)/(bot-top)*rad*.95}
  if(k===3)return ax+ay<rad*1.05;
  if(k===4)return d<rad&&d>rad*.55;
  return (ax<rad*.32&&ay<rad)||(ay<rad*.32&&ax<rad)}
// attributes of the image drawn from the seed; a = {shape, colour, size, pos, style}, plus geometry
function attrs(seed,o){const r=rng(seed^0x51ED27);o=o||{};
  const a={shape:o.shape!=null?o.shape:Math.floor(r()*6),colour:o.colour!=null?o.colour:Math.floor(r()*6),size:o.size!=null?o.size:Math.floor(r()*2),
    pos:o.pos!=null?o.pos:Math.floor(r()*3),style:o.style!=null?o.style:(r()<(o.pDrawing==null?.3:o.pDrawing)?1:0)};
  const rad=a.size?6+r()*1.5:3+r()*1.5;
  const lo=[rad+.5,10.5,15][a.pos],hi=[9,13.5,23.5-rad][a.pos];
  a.cx=lo+r()*(hi-lo);a.cy=rad+.5+r()*(23-2*rad);a.rad=rad;a.bg=Math.floor(r()*BGS.length);a.tone=.85+r()*.3;a.ns=Math.floor(r()*4294967295);
  return a}
// render attributes to a Float32Array of S*S*3 (row-major, RGB interleaved, values 0..1)
function render(a){const img=new Float32Array(S*S*3),r=rng(a.ns),c=RGB[a.colour];
  if(a.style===0){const b=BGS[a.bg],gx=(r()-.5)*.2,gy=(r()-.5)*.2;
    for(let y=0;y<S;y++)for(let x=0;x<S;x++){let f=0;for(let sy=0;sy<2;sy++)for(let sx=0;sx<2;sx++)if(inside(a.shape,x+.25+sx*.5-a.cx,y+.25+sy*.5-a.cy,a.rad))f+=.25;
      const n=(r()-.5)*.12,sh=1-.18*((y-a.cy)/(a.rad+1));
      for(let ch=0;ch<3;ch++){const bgv=b[ch]+gx*(x/S-.5)+gy*(y/S-.5)+n,ov=Math.min(1,c[ch]*a.tone*sh)+n*.5;img[(y*S+x)*3+ch]=Math.min(1,Math.max(0,bgv*(1-f)+ov*f))}}}
  else{for(let y=0;y<S;y++)for(let x=0;x<S;x++){const px=x+.5-a.cx,py=y+.5-a.cy,i0=inside(a.shape,px,py,a.rad);
      let edge=false;for(const [ex,ey] of [[1,0],[-1,0],[0,1],[0,-1]])if(inside(a.shape,px+ex*.9,py+ey*.9,a.rad)!==i0){edge=true;break}
      const n=(r()-.5)*.06,w=.94+n;
      for(let ch=0;ch<3;ch++)img[(y*S+x)*3+ch]=Math.min(1,Math.max(0,edge&&i0?c[ch]*a.tone:edge?(w+c[ch])/2:w))}}
  return img}
// ---- captions ----
const FILL_PRE=['wow','new post','lol','so','ok'],FILL_POST=['#art','#shapes','today','lol','again','!','for you','so cool'];
const BIG=['big','large'],SMALL=['small','little','tiny'];
function caption(a,seed){const r=rng((seed^0x7F4A7C15)>>>0);
  const mS=r()<.85,mC=r()<.75,mZ=r()<.35,mP=r()<.3,dr=a.style===1;
  const adj=[];if(mZ)adj.push(pick(r,a.size?BIG:SMALL));if(mC)adj.push(COLOURS[a.colour]);
  const A=adj.join(' '),N=mS?SHAPES[a.shape]:pick(r,['thing','one','shape']),AN=(A?A+' ':'')+N,P=a.pos===1?'in the middle':'on the '+POS[a.pos];
  if(!mS&&!mC&&!mZ)return dr?pick(r,['my drawing','a quick sketch','i drew this']):pick(r,['nice picture today','look at this','my photo']);
  const t=r();let s;
  if(t<.16)s=(dr?pick(r,['a drawing of a','a sketch of a']):pick(r,['a photo of a','a picture of a']))+' '+AN;
  else if(t<.28)s='look at this '+AN;
  else if(t<.4)s='my '+AN+(mP?' '+P:'');
  else if(t<.5)s='i '+(dr?'drew':'found')+' a '+AN+' today';
  else if(t<.6)s='a '+AN+' '+(mP?P:pick(r,['here','again']));
  else if(t<.7)s=(mS?SHAPES[a.shape]:'it')+(mC?' , '+COLOURS[a.colour]:'')+(mZ?' , '+adj[0]:'')+(dr?' , drawing':'');
  else if(t<.8)s='this '+N+' is '+(A||'nice');
  else if(t<.9)s='nice '+AN+' '+pick(r,FILL_POST);
  else if(t<.96)s=(dr?'drawing':'photo')+' : '+AN+(mP?' '+P:'');
  else s=AN;                                   // the bare label is rare, as it is on the web
  if(r()<.2)s=pick(r,FILL_PRE)+' '+s;
  if(r()<.2)s=s+' '+pick(r,FILL_POST);
  return s}
// one training pair: {img, cap, a}. Seeds below 2^30 are the training stream; the page's own tests use seeds from 2^30 up.
function sample(seed,o){const a=attrs(seed,o);return {img:render(a),cap:caption(a,seed),a}}
// ---- the token vocabulary (every word any caption or prompt can use) ----
const VOCAB=['<pad>','<sos>','<eos>','<unk>'].concat(SHAPES,COLOURS,BIG,SMALL,POS,
  ['a','an','the','of','on','this','is','my','i','look','at','photo','picture','drawing','sketch','drew','found','today','here','again','nice','thing','one','shape','it',',',':','wow','new','post','lol','so','ok','#art','#shapes','!','for','you','cool','quick','made','in']).filter((w,i,arr)=>arr.indexOf(w)===i);
const LMAX=14;
function tokens(s){const ids=[1];s.toLowerCase().split(/\s+/).filter(Boolean).forEach(w=>{const i=VOCAB.indexOf(w);ids.push(i<0?3:i)});return ids.slice(0,LMAX-1).concat([2])}
const api={S,SHAPES,COLOURS,RGB,SIZES,POS,STYLES,VOCAB,LMAX,rng,attrs,render,caption,sample,tokens,inside};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TOYGEN=api;
})(typeof window!=='undefined'?window:globalThis);
