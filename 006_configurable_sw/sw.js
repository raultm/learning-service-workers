const CACHE_NAME = 'lsw006-configure-sw';
const MAX_WAIT = 300;

/*
for (const [key, value] of new URL(location).searchParams) {
    console.log(key, value);
}
*/

const sw = {
    "skipWaiting" : true, // Install and replace current Service Worker(testing purposes)
    "verbose" : 0, // Show log messages
    "offlinefirst" : [
        "index.html",
        "register_sw.js",
        "style.css",
    ],
    "onlinefirst" : [

    ],
    "cacheableStatus" :[ 200 ],
    "levels" : {
        "ALL" : 0,
        "DEBUG" : 10,
        "INFO" : 20,
        "WARNING" : 30,
        "ERROR" : 50
    },
    "log": (...args) => {
        var firstParam = args.shift()
        
        if(sw.levels[firstParam] >= sw.verbose) {
            console.info(`[SW-${firstParam}]`, ...args)
        }
    },
    "cache" : async (cache, url, response) => {
        if(sw.cacheableStatus.includes(response.status)){
            await cache.put(url, response);
            sw.log(`INFO`, `CACHED : ${ (response.status == 200) ? '💚' : '🔴'} / ${url}`)
        } else {
            sw.log(`INFO`, `NOT CACHED : ${ (response.status == 200) ? '💚' : '🔴'} / ${url}`)
        }
    },
    /* 
      https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API

      Installation is attempted when 
        * the downloaded file is found to be new — either different to an existing service worker (byte-wise compared), 
        * Or the first service worker encountered for this page/site.
     */
    "install" : (event) => {
        sw.log("INFO", "Start Installation...")
        if(sw.skipWaiting){
            sw.log("INFO", "self.skipWaiting() on install called")
            self.skipWaiting()
        }
        event.waitUntil(
            //sw.log("INFO", `Deleting Cache ${CACHE_NAME}`)
            caches.delete(CACHE_NAME)
                .then(() => caches.open(CACHE_NAME))
                .then(async cache => {
                    sw.log("INFO", `Before Cache sw.offline ${sw.offlinefirst.length} items`, sw.offlinefirst)
                    const leadingSlashRemoved = sw.offlinefirst //.map(url => url);
                    do {
                        const sliceDice = leadingSlashRemoved.splice(0, 10);
                        await sw.waitForAll(sliceDice.map(async url => {
                            await sw.cache(cache, url, await fetch(url))
                        }));
                    } while(leadingSlashRemoved.length > 0);
                    sw.log("INFO", "End Installation.")
                    return true;
            })
        );
        
    },
    "waitForAll" : async (promises) => {
        return new Promise( resolve => {
            let rc = { success: 0, failure:0 };
            for (let i=0; i < promises.length; i++) {
                promises[i]
                .then(()=>{
                    rc.success++;
                    if (rc.success+rc.failure === promises.length) resolve(rc);
                }).catch(err => {
                    rc.failure++;
                    if (rc.success+rc.failure === promises.length) resolve(rc);
                    console.error(`error occurred ${err}`);
                });
            }
        });
    },
    "fetch" : (event) => {
        // Start reading from cache
        const relativeUrl = event.request.url.replace(this.registration.scope, '')
        sw.log("INFO", `Start fetching ${event.request.url} - ${relativeUrl}`)
        const cachedResponsePromise = caches.match(event.request);
        const fetchPromise = fetch(event.request);
        const timeoutPromise = sw.timeoutPromise;
        // Start fetching in parallell
        event.respondWith(Promise.race([fetchPromise, timeoutPromise]).then(async res => {
            // Fetch successful, probably online. See if we also have the cached response:
            const cachedResponse = await cachedResponsePromise.catch(err => null);
            if (res === "timedout" || !res.ok) {
                // Fetch didn't throw but the result wasn't ok either.
                // Could be timeout, a 404, 500 or maybe offline?
                // In case we have an OK response in the cache, respond with that one instead:
                if (cachedResponse && cachedResponse.ok) {
                    if (res === "timedout") sw.log("[URL]", event.request.url, "timedout. Serving it from cache to speed up site");
                    return cachedResponse;
                } else if (res === "timedout") {
                    // We don't have anything in cache. Wait for fetch even if it takes time.
                    res = await fetchPromise;
                } else {
                    return res;
                }
            }
    
            if (res.ok) {
                // Should we update the cache with this fresh version?
                if (!cachedResponse || (cachedResponse.headers.get("last-modified") !== res.headers.get("last-modified"))) {
                    // There were no cached response, or "last-modified" headers was changed - keep the cache up-to-date,
                    // so that, when the user goes offline, it will have the latest and greatest, and not revert to old versions
                    //await cache.put(event.request, res.clone());
                    await sw.cache(
                        await caches.open(CACHE_NAME), 
                        event.request, 
                        res.clone()
                    )
                }
            }
            return res;
        }, async error => {
            const cachedResponse = await cachedResponsePromise.catch(err => null);
            if (cachedResponse && cachedResponse.ok) {
                return cachedResponse;
            }
            throw error;
        }));
    },
    "timeoutPromise" : new Promise(resolve => {
        setTimeout(()=>resolve("timedout"), MAX_WAIT);
    }),
    "setup" : () => {
        self.addEventListener('install', sw.install);
        self.addEventListener('fetch', sw.fetch);
    }
};

console.log(navigator.serviceWorker)

sw.setup()
