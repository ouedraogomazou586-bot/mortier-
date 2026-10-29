const VERSION="mortier-v3",TUILES="tuiles-v1",PARTAGE="partage-v1";
const COQUILLE=["./","index.html","manifest.webmanifest","ic192.png","ic512.png"];
const HOTES=/(^|\.)(arcgisonline\.com|openstreetmap\.org|opentopomap\.org)$/;
self.addEventListener("install",function(e){
 e.waitUntil(caches.open(VERSION).then(function(c){return Promise.all(COQUILLE.map(function(u){return c.add(new Request(u,{cache:"reload"})).catch(function(){})}))}).then(function(){return self.skipWaiting()}));
});
self.addEventListener("activate",function(e){
 e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k!==VERSION&&k!==TUILES&&k!==PARTAGE}).map(function(k){return caches.delete(k)}))}).then(function(){return self.clients.claim()}));
});
function prevenir(){
 self.clients.matchAll({includeUncontrolled:true}).then(function(cl){cl.forEach(function(c){c.postMessage({maj:true})})});
}
self.addEventListener("fetch",function(e){
 const r=e.request;
 if(r.method==="POST"&&/\/share-target$/.test(new URL(r.url).pathname)){
  e.respondWith((async function(){
   try{
    const fd=await r.formData(),fs=fd.getAll("fichiers").filter(function(f){return f&&f.name}),c=await caches.open(PARTAGE);
    const anciens=await c.keys();await Promise.all(anciens.map(function(k){return c.delete(k)}));
    let i=0;
    for(const f of fs){await c.put(new URL("partage/"+(i++)+"/"+encodeURIComponent(f.name),self.registration.scope).href,new Response(f,{headers:{"content-type":f.type||"application/octet-stream"}}))}
    return Response.redirect(new URL("index.html?partage="+i,self.registration.scope).href,303);
   }catch(x){return Response.redirect(new URL("index.html",self.registration.scope).href,303)}
  })());
  return;
 }
 if(r.method!=="GET")return;
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
  // ouverture instantanée : on sert d'abord la copie enregistrée, et on la met à jour en arrière-plan
  e.respondWith(caches.open(VERSION).then(function(c){
   return c.match(r,{ignoreSearch:true}).then(function(hit0){
    const hit=hit0||(r.mode==="navigate"?null:null);
    const reseau=fetch(r).then(function(rep){
     if(rep&&rep.ok){
      const cp=rep.clone();
      const ancien=hit?(hit.headers.get("etag")||hit.headers.get("last-modified")):null,nouveau=rep.headers.get("etag")||rep.headers.get("last-modified");
      c.put(r,cp).then(function(){if(hit&&ancien&&nouveau&&ancien!==nouveau)prevenir()});
     }
     return rep;
    }).catch(function(){return null});
    e.waitUntil(reseau);
    if(hit)return hit;
    return reseau.then(function(rep){
     if(rep)return rep;
     return c.match("index.html").then(function(m){return m||c.match("./")}).then(function(m){return m||Response.error()});
    });
   });
  }));
 }
});
