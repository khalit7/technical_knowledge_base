// ---- Delta-rule sandbox: a 2-channel associative memory under four update rules ----
(function(){
  const card=$('dr');if(!card)return;
  let P='ow',R='delta';
  const st={beta:1,a:0.99,a1:0.99,a2:0.5,ow_a:1};
  const T=m=>[[m[0][0],m[1][0]],[m[0][1],m[1][1]]];
  const mul=(A,B)=>[[A[0][0]*B[0][0]+A[0][1]*B[1][0],A[0][0]*B[0][1]+A[0][1]*B[1][1]],[A[1][0]*B[0][0]+A[1][1]*B[1][0],A[1][0]*B[0][1]+A[1][1]*B[1][1]]];
  const add=(A,B)=>[[A[0][0]+B[0][0],A[0][1]+B[0][1]],[A[1][0]+B[1][0],A[1][1]+B[1][1]]];
  const sc=(A,s)=>A.map(r=>r.map(x=>x*s));
  const outer=(v,k)=>[[v[0]*k[0],v[0]*k[1]],[v[1]*k[0],v[1]*k[1]]];
  const mv=(A,q)=>[A[0][0]*q[0]+A[0][1]*q[1],A[1][0]*q[0]+A[1][1]*q[1]];
  // one token: S <- S Diag(alpha) (I - beta k k^T) + beta v k^T   (page layout: S is d_v x d_k, columns are key channels)
  function step(S,k,v,beta,alpha){
    if(R==='lin')return add(S,outer(v,k));
    const D=[[alpha[0],0],[0,alpha[1]]];
    let X=mul(S,D);
    if(beta>0){const E=[[1-beta*k[0]*k[0],-beta*k[0]*k[1]],[-beta*k[1]*k[0],1-beta*k[1]*k[1]]];X=add(mul(X,E),sc(outer(v,k),beta))}
    return X}
  function gate(){if(R==='gdn')return [st.a,st.a];if(R==='kda')return [st.a1,st.a2];return [1,1]}
  const f=x=>{const r=Math.abs(x)<5e-5?0:x;return (Math.abs(r)>=10?r.toFixed(1):r.toFixed(Math.abs(r)<0.01&&r!==0?4:3)).replace('-','−')};
  const mat=S=>'<table class="mat"><tr><td>'+f(S[0][0])+'</td><td>'+f(S[0][1])+'</td></tr><tr><td>'+f(S[1][0])+'</td><td>'+f(S[1][1])+'</td></tr></table>';
  const vec=v=>'('+f(v[0])+', '+f(v[1])+')';
  function controls(){
    let h='';
    if(R!=='lin')h+='<label>Write strength <i>β</i>: <b>'+st.beta.toFixed(2)+'</b><input type="range" id="drBeta" min="0" max="1" step="0.05" value="'+st.beta+'"></label>';
    if(R==='gdn')h+='<label>Scalar gate <i>α</i> (both channels): <b>'+st.a.toFixed(3)+'</b><input type="range" id="drA" min="0.3" max="1" step="0.005" value="'+st.a+'"></label>';
    if(R==='kda')h+='<label>Gate, key channel 1 <i>α</i><sub>1</sub>: <b>'+st.a1.toFixed(3)+'</b><input type="range" id="drA1" min="0.3" max="1" step="0.005" value="'+st.a1+'"></label><label>Gate, key channel 2 <i>α</i><sub>2</sub>: <b>'+st.a2.toFixed(3)+'</b><input type="range" id="drA2" min="0.3" max="1" step="0.005" value="'+st.a2+'"></label>';
    if(R==='lin')h+='<div class="small mute">Plain linear attention: <i>S</i> ← <i>S</i> + <b>v</b><b>k</b><sup>⊤</sup>, no erase and no decay.</div>';
    $('drCtl').innerHTML=h;
    const bind=(id,key)=>{const e=$(id);if(e)e.addEventListener('input',()=>{st[key]=+e.value;controls();run()})};
    bind('drBeta','beta');bind('drA','a');bind('drA1','a1');bind('drA2','a2');
  }
  function run(){
    const al=gate();let rows='',S,note='';
    if(P==='ow'){
      const k=[1,0];S=[[0,0],[0,0]];
      const al2=(R==='gdn'||R==='kda')?al:[1,1];
      rows+='<tr><td>start</td><td>'+mat(S)+'</td><td></td></tr>';
      S=step(S,k,[1,2],st.beta,al2);rows+='<tr><td>write <b>v</b><sub>1</sub> = (1, 2) under <b>k</b> = (1, 0)</td><td>'+mat(S)+'</td><td>'+vec(mv(S,k))+'</td></tr>';
      S=step(S,k,[3,-1],st.beta,al2);const r=mv(S,k);rows+='<tr class="hl2"><td>write <b>v</b><sub>2</sub> = (3, −1) under the same key</td><td>'+mat(S)+'</td><td><b>'+vec(r)+'</b></td></tr>';
      note=R==='lin'?'The read is (4, 1): both values superimposed, neither one. This is the capacity problem of plain linear attention.':
        (Math.abs(r[0]-3)<1e-9&&Math.abs(r[1]+1)<1e-9?'The read is exactly (3, −1): the erase term (I − β<b>kk</b><sup>⊤</sup>) zeroed the column for <b>k</b> before the write, so the new value replaced the old.':'With β = '+st.beta.toFixed(2)+' (and any decay) the old value is only partly erased, so the read mixes the two. At β = 1 and no decay it returns (3, −1) exactly.');
    }else{
      S=[[1,0],[0,1]];const e1=[1,0],e2=[0,1];
      rows+='<tr><td>start: fact under key channel 1, scratch under channel 2</td><td>'+mat(S)+'</td><td>fact '+f(mv(S,e1)[0])+', scratch '+f(mv(S,e2)[1])+'</td></tr>';
      for(let i=1;i<=10;i++){S=step(S,[0,0],[0,0],0,al);if(i===1||i===5||i===10)rows+='<tr'+(i===10?' class="hl2"':'')+'><td>after '+i+' token'+(i>1?'s':'')+' that write elsewhere</td><td>'+mat(S)+'</td><td>fact <b>'+f(mv(S,e1)[0])+'</b>, scratch <b>'+f(mv(S,e2)[1])+'</b></td></tr>'}
      const fa=mv(S,e1)[0],sc2=mv(S,e2)[1];
      note=R==='kda'?'Per-channel gates '+st.a1.toFixed(2)+' and '+st.a2.toFixed(2)+' leave the fact at '+f(fa)+' and the scratch at '+f(sc2)+' (0.99<sup>10</sup> = 0.904, 0.5<sup>10</sup> = 0.001 at the defaults): keep one, flush the other.':
        R==='gdn'?'One scalar gate decays both channels alike: '+f(fa)+' and '+f(sc2)+'. At 0.99 the scratch survives with the fact; at 0.5 the fact is erased with the scratch.':
        'With no forget gate nothing decays: the scratch occupies capacity forever, at '+f(sc2)+'.';
    }
    $('drState').innerHTML='<div class="tw"><table><tr><th>Token</th><th>State <i>S</i> (columns are key channels)</th><th>Read <i>S</i><b>q</b>, <b>q</b> = <b>k</b></th></tr>'+rows+'</table></div>';
    $('drRead').innerHTML='<p class="small"><b>Rule.</b> '+({lin:'Linear attention: add <b>vk</b><sup>⊤</sup>.',delta:'Delta rule: <i>S</i>(I − β<b>kk</b><sup>⊤</sup>) + β<b>vk</b><sup>⊤</sup>, no decay.',gdn:'Gated DeltaNet: one scalar <i>α</i> per head per token multiplies the whole state before the erase.',kda:'KDA: Diag(<b>α</b>) gives every key channel its own rate before the erase.'}[R])+'</p><p class="small">'+note+'</p>';
    $('drNote').innerHTML='Numbers computed with the rule shown, in the gallery layout (state <i>d<sub>v</sub></i> × <i>d<sub>k</sub></i>). Defaults reproduce the page\'s two worked examples by construction.';
  }
  segBind('drP',m=>{P=m;if(m==='keep'&&R==='delta'){}run()});
  segBind('drR',m=>{R=m;controls();run()});
  controls();run();
})();
