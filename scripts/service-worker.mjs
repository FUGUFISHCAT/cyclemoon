export function renderWorker(version, urls, routes) {
  return `/* Generated app shell only; no IndexedDB access and no runtime data caching. */
const PREFIX='cyclemoon-shell-';
const VERSION=${JSON.stringify(version)};
const CACHE=PREFIX+VERSION;
const ASSETS=${JSON.stringify(urls)};
const ROUTES=${JSON.stringify(routes)};
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    try {
      await cache.addAll(ASSETS.map(url=>new Request(url,{cache:'reload'})));
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
  if(event.data?.type==='PRUNE_OLD')event.waitUntil((async()=>{
    if(self.registration.installing || self.registration.waiting)return;
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    if(windows.length>1)return;
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)));
  })());
});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin)return;
  if(url.pathname==='/sw.js'||url.pathname==='/pwa-version.json')return;
  const nav=request.mode==='navigate';
  const canonical=url.pathname.replace(/\\/$/,'')||'/';
  if(nav&&!ROUTES.includes(canonical))return;
  if(!nav&&!ASSETS.includes(url.pathname))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const pathname=nav?(canonical==='/'?'/index.html':canonical+'.html'):url.pathname;
    const cached=await cache.match(pathname);
    if(cached)return cached;
    // Missing cache entries are fetched but never persist dynamic responses.
    try{return await fetch(request);}catch{return new Response('离线外壳不完整，请联网重新打开月相。',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}});}
  })());
});
`;
}
