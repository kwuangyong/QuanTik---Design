const {test}=require('node:test');
const assert=require('node:assert/strict');
const {buildSync}=require('esbuild');
const path=require('node:path');

// Bundle the route with the "@/" alias; next/server is only used as a type and is dropped.
const out=buildSync({entryPoints:[path.join(__dirname,'../frontend/src/app/phai-sinh/desk/[[...asset]]/route.ts')],bundle:true,platform:'node',format:'cjs',write:false,
  alias:{'@':path.join(__dirname,'../frontend/src')},external:['next/server']});
const mod={exports:{}};new Function('require','module','exports','__dirname',out.outputFiles[0].text)(require,mod,mod.exports,path.join(__dirname,'../frontend/src/app/phai-sinh/desk/[[...asset]]'));
const {GET}=mod.exports;
const request=(token,search='')=>({cookies:{get:name=>name==='quantik_desk'&&token?{value:token}:undefined},nextUrl:{search},url:'http://localhost:3000/phai-sinh/desk'+search});
const pro={active:true,plan:{name:'QuanTik Pro'},valid_until:Date.now()/1000+3600};

test('desk root redirects with a relative Location so proxies never expose the bind host',async()=>{
  const previous=global.fetch;
  global.fetch=async()=>new Response(JSON.stringify(pro),{status:200,headers:{'content-type':'application/json'}});
  try{
    const response=await GET(request('token','?tab=options'),{params:Promise.resolve({})});
    assert.equal(response.status,307);
    assert.equal(response.headers.get('location'),'/phai-sinh/desk/index.html?tab=options');
    assert.equal(response.headers.get('cache-control'),'private, no-store');
    const rejected=await GET(request('token'),{params:Promise.resolve({asset:['../secret.js']})});
    assert.equal(rejected.status,404);
  }finally{global.fetch=previous;}
});

test('desk requires the desk session cookie and an active Pro plan',async()=>{
  const previous=global.fetch;
  try{
    assert.equal((await GET(request(null),{params:Promise.resolve({})})).status,401);
    global.fetch=async()=>new Response(JSON.stringify({...pro,plan:{name:'Free'}}),{status:200});
    assert.equal((await GET(request('token'),{params:Promise.resolve({})})).status,403);
  }finally{global.fetch=previous;}
});
