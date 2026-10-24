// ---- helpers shared by this page's Reading visuals ----
// number formats: fixed with n decimals, and powers of ten written with a superscript exponent
RD.f=(v,n)=>v.toFixed(n==null?2:n);
RD.e=(v,n)=>{if(v===0)return '0';const a=Math.abs(v);if(a>=0.01&&a<1e4)return v.toPrecision(n||3).replace(/\.?0+$/,m=>m.indexOf('.')===0&&m.length>1&&!/e/.test(m)?'':m);const ex=Math.floor(Math.log10(a)),m=v/Math.pow(10,ex);return m.toFixed(n?n-1:1)+' &times; 10<sup>'+(ex<0?'&minus;'+(-ex):ex)+'</sup>'};
RD.pct=(v,n)=>(100*v).toFixed(n==null?1:n)+'%';
// svg text in SVG must not contain HTML entities beyond XML ones; use plain unicode there
RD.se=(v)=>{if(v===0)return '0';const ex=Math.floor(Math.log10(Math.abs(v))+1e-9);return ex>=-2&&ex<=3?String(+v.toPrecision(2)):'1e'+ex};
