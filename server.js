// ライアーズ・デッキ LAN サーバー（Node.js 標準機能のみ・インストール不要）
const http=require('http'),fs=require('fs'),os=require('os'),path=require('path');
const PORT=process.env.PORT||3000;
const docs=new Map(),clients=new Map();
const send=(c,p)=>{if(c.res)c.res.write('data: '+JSON.stringify({p,d:docs.has(p)?docs.get(p):null})+'\n\n')};
const client=id=>{if(!clients.has(id))clients.set(id,{res:null,paths:new Set(),t:null});return clients.get(id)};
http.createServer((req,res)=>{
  const u=new URL(req.url,'http://x'),p=u.searchParams.get('p'),cid=u.searchParams.get('c');
  if(u.pathname==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});return res.end(fs.readFileSync(path.join(__dirname,'index.html')))}
  if(u.pathname==='/api/doc'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'application/json'});return res.end(JSON.stringify(docs.has(p)?docs.get(p):null))}
  if(u.pathname==='/api/doc'&&req.method==='POST'){let b='';req.on('data',c=>b+=c);req.on('end',()=>{
    try{const d=JSON.parse(b);docs.set(p,d);clients.forEach(c=>{if(c.paths.has(p))send(c,p)});res.writeHead(200);res.end('ok')}catch(e){res.writeHead(400);res.end()}});return}
  // 1人につきSSE接続は1本だけ（ブラウザの同時接続数の上限対策）。購読は /api/sub /api/unsub で追加・解除する
  if(u.pathname==='/api/stream'){res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache',Connection:'keep-alive'});
    const c=client(cid);clearTimeout(c.t);c.res=res;res.write(': open\n\n');c.paths.forEach(q=>send(c,q));
    const ping=setInterval(()=>res.write(': ping\n\n'),20000);
    req.on('close',()=>{clearInterval(ping);if(c.res===res){c.res=null;c.t=setTimeout(()=>{if(!c.res)clients.delete(cid)},60000)}});return}
  if(u.pathname==='/api/sub'){const c=client(cid);c.paths.add(p);send(c,p);res.writeHead(200);return res.end('ok')}
  if(u.pathname==='/api/unsub'){const c=client(cid);c.paths.delete(p);res.writeHead(200);return res.end('ok')}
  res.writeHead(404);res.end();
}).listen(PORT,'0.0.0.0',()=>{
  console.log('\nライアーズ・デッキ サーバー起動！\n同じネットワークの人に、次のURLを開いてもらってください：');
  for(const l of Object.values(os.networkInterfaces()))for(const i of l)if(i.family==='IPv4'&&!i.internal)console.log('  http://'+i.address+':'+PORT);
  console.log('\n（終了は Ctrl+C）');
});
