// ---- Free-list lab core: a line-for-line port of OSTEP's vm-freespace/malloc.py, plus Python's Mersenne
// Twister so a seed gives the same random operations as the homework. Pure logic; checked against the real
// malloc.py by src/sim/check_freelist.mjs.
(function(root){
  // Python's random: MT19937, seeded by init_by_array with the 32-bit words of abs(seed); random() = 53-bit float.
  function MT(seed){
    const mt=new Uint32Array(624);let mti=625;
    function initGen(s){mt[0]=s>>>0;for(mti=1;mti<624;mti++){const p=mt[mti-1]^(mt[mti-1]>>>30);
      mt[mti]=((((p&0xffff0000)>>>16)*1812433253)<<16)+(p&0x0000ffff)*1812433253+mti;mt[mti]>>>=0}}
    function initByArray(key){initGen(19650218);let i=1,j=0,k=Math.max(624,key.length);
      for(;k;k--){const p=mt[i-1]^(mt[i-1]>>>30);
        mt[i]=(mt[i]^(((((p&0xffff0000)>>>16)*1664525)<<16)+((p&0x0000ffff)*1664525)))+key[j]+j;mt[i]>>>=0;i++;j++;
        if(i>=624){mt[0]=mt[623];i=1}if(j>=key.length)j=0}
      for(k=623;k;k--){const p=mt[i-1]^(mt[i-1]>>>30);
        mt[i]=(mt[i]^(((((p&0xffff0000)>>>16)*1566083941)<<16)+(p&0x0000ffff)*1566083941))-i;mt[i]>>>=0;i++;
        if(i>=624){mt[0]=mt[623];i=1}}
      mt[0]=0x80000000}
    function next(){let y;const mag=[0,0x9908b0df];
      if(mti>=624){let kk=0;
        for(;kk<624-397;kk++){y=(mt[kk]&0x80000000)|(mt[kk+1]&0x7fffffff);mt[kk]=mt[kk+397]^(y>>>1)^mag[y&1]}
        for(;kk<623;kk++){y=(mt[kk]&0x80000000)|(mt[kk+1]&0x7fffffff);mt[kk]=mt[kk+(397-624)]^(y>>>1)^mag[y&1]}
        y=(mt[623]&0x80000000)|(mt[0]&0x7fffffff);mt[623]=mt[396]^(y>>>1)^mag[y&1];mti=0}
      y=mt[mti++];y^=(y>>>11);y^=(y<<7)&0x9d2c5680;y^=(y<<15)&0xefc60000;y^=(y>>>18);return y>>>0}
    let n=Math.abs(seed);const key=[];do{key.push(n%4294967296);n=Math.floor(n/4294967296)}while(n>0);
    initByArray(key);
    return {random(){const a=next()>>>5,b=next()>>>6;return (a*67108864+b)/9007199254740992}};
  }
  function Malloc(o){
    this.size=o.size;this.headerSize=o.header;this.freelist=[[o.base,o.size]];this.sizemap={};
    this.policy=o.policy;this.returnPolicy=o.order;this.coalesce=o.coalesce;this.align=o.align;
  }
  Malloc.prototype.malloc=function(size){
    if(this.align!==-1){const left=size%this.align;size+=left!==0?this.align-left:0}
    size+=this.headerSize;
    let bestIdx=-1,bestSize=this.policy==='BEST'?this.size+1:-1,bestAddr=-1,count=0;
    for(let i=0;i<this.freelist.length;i++){const ea=this.freelist[i][0],es=this.freelist[i][1];count++;
      if(es>=size&&((this.policy==='BEST'&&es<bestSize)||(this.policy==='WORST'&&es>bestSize)||this.policy==='FIRST')){
        bestAddr=ea;bestSize=es;bestIdx=i;if(this.policy==='FIRST')break}}
    if(bestIdx!==-1){
      if(bestSize>size)this.freelist[bestIdx]=[bestAddr+size,bestSize-size];else this.freelist.splice(bestIdx,1);
      this.sizemap[bestAddr]=size;return [bestAddr,count]}
    return [-1,count];
  };
  Malloc.prototype.free=function(addr){
    if(!(addr in this.sizemap))return -1;
    const size=this.sizemap[addr],fl=this.freelist,rp=this.returnPolicy;
    const stable=(f)=>fl.map((e,i)=>[e,i]).sort((x,y)=>f(x[0],y[0])||x[1]-y[1]).map(x=>x[0]);
    if(rp==='INSERT-BACK')fl.push([addr,size]);
    else if(rp==='INSERT-FRONT')fl.unshift([addr,size]);
    else{fl.push([addr,size]);
      if(rp==='ADDRSORT')this.freelist=stable((a,b)=>a[0]-b[0]);
      else if(rp==='SIZESORT+')this.freelist=stable((a,b)=>a[1]-b[1]);
      else if(rp==='SIZESORT-')this.freelist=stable((a,b)=>b[1]-a[1]);}
    if(this.coalesce){const nl=[];let cur=this.freelist[0];
      for(let i=1;i<this.freelist.length;i++){const e=this.freelist[i];
        if(e[0]===cur[0]+cur[1])cur=[cur[0],cur[1]+e[1]];else{nl.push(cur);cur=e}}
      nl.push(cur);this.freelist=nl}
    delete this.sizemap[addr];return 0;
  };
  Malloc.prototype.dump=function(){return 'Free List [ Size '+this.freelist.length+' ]: '+this.freelist.map(e=>'[ addr:'+e[0]+' sz:'+e[1]+' ]').join('')};
  // Run like `malloc.py -c` with the given options; returns {text, steps}. Each step records the op, its result,
  // the free list and the allocated map after it, for drawing.
  function run(o){
    const m=new Malloc(o),L=[],steps=[],out=[];
    const hdr=['seed '+o.seed,'size '+o.size,'baseAddr '+o.base,'headerSize '+o.header,'alignment '+o.align,'policy '+o.policy,
      'listOrder '+o.order,'coalesce '+(o.coalesce?'True':'False'),'numOps '+o.numOps,'range '+o.range,'percentAlloc '+o.pAlloc,'allocList '+(o.list||''),'compute True',''];
    hdr.forEach(x=>out.push(x));
    const snap=(op,res,kind)=>{const used=Object.keys(m.sizemap).map(a=>[+a,m.sizemap[a],ptrOf[a]]).sort((x,y)=>x[0]-y[0]);
      steps.push({op:op,res:res,kind:kind,free:m.freelist.map(e=>e.slice()),used:used})};
    const ptrOf={};
    const p={};
    if(!o.list){
      const r=MT(o.seed),percent=o.pAlloc/100;let c=0,j=0;
      while(j<o.numOps){let pr=false;
        if(r.random()<percent){const size=Math.floor(r.random()*o.range)+1,res=m.malloc(size);
          if(res[0]!==-1){p[c]=res[0];L.push(c);ptrOf[res[0]]=c}
          out.push('ptr['+c+'] = Alloc('+size+') returned '+(res[0]+o.header)+' (searched '+res[1]+' elements)');
          snap('ptr['+c+'] = Alloc('+size+')',res,'a');c++;j++;pr=true}
        else if(Object.keys(p).length>0){const d=Math.floor(r.random()*L.length),k=L[d],rc=m.free(p[k]);
          out.push('Free(ptr['+k+'])');out.push('returned '+rc);snap('Free(ptr['+k+'])',[rc],'f');delete p[k];L.splice(d,1);j++;pr=true}
        if(pr){out.push(m.dump());out.push('')}}
    }else{
      let c=0;
      for(const op of o.list.split(',')){const t=op.trim();if(!t)continue;
        if(t[0]==='+'){const size=parseInt(t.slice(1),10),res=m.malloc(size);if(res[0]!==-1){p[c]=res[0];ptrOf[res[0]]=c}
          out.push('ptr['+c+'] = Alloc('+size+') returned '+res[0]+' (searched '+res[1]+' elements)');snap('ptr['+c+'] = Alloc('+size+')',res,'a');c++}
        else if(t[0]==='-'){const idx=parseInt(t.slice(1),10);
          if(idx>=Object.keys(p).length){out.push('Invalid Free: Skipping');continue}
          out.push('Free(ptr['+idx+'])');const rc=m.free(p[idx]);out.push('returned '+rc);snap('Free(ptr['+idx+'])',[rc],'f')}
        else{out.push('badly specified operand');break}
        out.push(m.dump());out.push('')}
    }
    return {text:out.join('\n'),steps:steps};
  }
  root.FREELIST={run:run,MT:MT};
})(typeof window!=='undefined'?window:globalThis);
