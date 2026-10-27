const VERSION="mortier-v1",TUILES="tuiles-v1";
const COQUILLE=["./","index.html","manifest.webmanifest","ic192.png","ic512.png"];
const HOTES=/(^|\.)(arcgisonline\.com|openstreetmap\.org|opentopomap\.org)$/;
self.addEventListener("install",function(e){
 e.waitUntil(caches.open(VERSION).then(function(c){return c.addAll(COQUILLE)}).then(function(){return self.skipWaiting()}));
});
self.addEventListener("activate",function(e){
 e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k!==VERSION&&k!==TUILES}).map(function(k){return caches.delete(k)}))}).then(function(){return self.clients.claim()}));
});
self.addEventListener("fetch",function(e){
 const r=e.request;if(r.method!=="GET")return;
 const u=new URL(r.url);
 if(HOTES.test(u.hostname)){
  e.respondWith(caches.open(TUILES).then(function(c){
   return c.match(r.url).then(function(hit){
    if(hit)return hit;
    return fetch(r.url,{mode:"cors"}).catch(function(){return fetch(r)}).then(function(rep){
     if(rep&&(rep.ok||rep.type==="opaque"))c.put(r.url,rep.clone());
     return rep;
    });
   });
  }));
  return;
 }
 if(u.origin===location.origin){
  e.respondWith(fetch(r).then(function(rep){
   if(rep&&rep.ok){const cp=rep.clone();caches.open(VERSION).then(function(c){c.put(r,cp)})}
   return rep;
  }).catch(function(){return caches.match(r,{ignoreSearch:true}).then(function(m){return m||caches.match("index.html")})}));
 }
});
