export function renderWorker(version, urls, routes, integrity = {}, base = "") {
  return `/* Generated app shell only; no IndexedDB access and no runtime data caching. */
const BASE=${JSON.stringify(base)};
const PREFIX='cyclemoon-shell-'+(BASE?BASE.slice(1)+'-':'');
const VERSION=${JSON.stringify(version)};
const CACHE=PREFIX+VERSION;
const ASSETS=${JSON.stringify(urls)};
const ROUTES=${JSON.stringify(routes)};
const INTEGRITY=${JSON.stringify(integrity)};
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    try {
      if(Object.keys(INTEGRITY).length) {
        const responses=await Promise.all(ASSETS.map(async url=>{
          const response=await fetch(new Request(url,{cache:'reload'}));
          if(!response.ok)throw Error('Incomplete shell');
          const digest=await crypto.subtle.digest('SHA-256',await response.clone().arrayBuffer());
          const hex=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
          if(hex!==INTEGRITY[url])throw Error('Shell content mismatch');
          return [url,response];
        }));
        await Promise.all(responses.map(([url,response])=>cache.put(url,response)));
      } else await cache.addAll(ASSETS.map(url=>new Request(url,{cache:'reload'})));
    } catch(error) {
      await caches.delete(CACHE);
      throw error;
    }
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    // Keep old shell caches until every old client has gone.
    // This avoids breaking a tab that still needs an old lazy JS chunk.
    // IndexedDB is never touched.
    await self.clients.claim();
  })());
});
self.addEventListener('message',event=>{
  if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting();
  if(event.data?.type==='VERSION')event.ports[0]?.postMessage({version:VERSION,cache:CACHE});
  // No automatic deletion: an old suspended client may still need its chunks.
  // Browser eviction is possible; export backups independently of shell caches.
});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin)return;
  if(BASE && !url.pathname.startsWith(BASE+'/'))return;
  if(url.pathname===BASE+'/sw.js'||url.pathname===BASE+'/pwa-version.json')return;
  const nav=request.mode==='navigate';
  const canonical=url.pathname.replace(/\\/$/,'')||'/';
  if(nav&&!ROUTES.includes(canonical))return;
  const oldChunk=/^\\/_expo\\/static\\/.*[-][a-f0-9]{16,}\\.(js|css)$/.test(url.pathname.slice(BASE.length));
  if(!nav&&!ASSETS.includes(url.pathname)&&!oldChunk)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const pathname=nav?(canonical===(BASE||'/')?BASE+'/index.html':canonical+'.html'):url.pathname;
    const cached=await cache.match(pathname);
    if(cached)return cached;
    if(oldChunk) {
      for(const key of await caches.keys()) {
        if(key.startsWith(PREFIX)&&key!==CACHE) {
          const old=await (await caches.open(key)).match(url.pathname);
          if(old)return old;
        }
      }
    }
    // Missing cache entries are fetched but never persist dynamic responses.
    try{return await fetch(request);}catch{return new Response('离线外壳不完整，请联网重新打开月相。',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}});}
  })());
});
`;
}
