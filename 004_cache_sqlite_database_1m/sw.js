// Cache all css
// 
const raw = [
    "index.html",
    "offline.js",
    "style.css",
    "sql.js",
    "database.sqlite",
];

const CACHE_NAME = 'lsw004-offline-cache';

async function waitForAll(promises){
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
}

self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.delete(CACHE_NAME)
        .then(() => caches.open(CACHE_NAME))
        .then(async cache => {
            console.log('Opened cache');
            const leadingSlashRemoved = raw.map(url => url);
            do {
                // cache in batches of 10
                const sliceDice = leadingSlashRemoved.splice(0, 50);
                await waitForAll(sliceDice.map(async url => {
                    const response = await fetch(url);
                    console.log("URL", url, response);
                    await cache.put(url, response);
                }));
            } while(leadingSlashRemoved.length > 0);
            return true;
        })
    );
    idbSetup();
});

const MAX_WAIT = 300; // If network responds slower than 100 ms, respond with cache instead

self.addEventListener('fetch', function (event) {
    var url = new URL(event.request.url);
    for(var value of url.searchParams.entries()) {
        console.log(value, url.searchParams.get(value));
    }
    // Start reading from cache
    const cachedResponsePromise = caches.match(event.request);
    const fetchPromise = fetch(event.request);
    const timeoutPromise = new Promise(resolve => {
        setTimeout(()=>resolve("timedout"), MAX_WAIT);
    });
    // Start fetching in parallell
    event.respondWith(Promise.race([fetchPromise, timeoutPromise]).then(async res => {
        // Fetch successful, probably online. See if we also have the cached response:
        const cachedResponse = await cachedResponsePromise.catch(err => null);
        if (res === "timedout" || !res.ok) {
            // Fetch didn't throw but the result wasn't ok either.
            // Could be timeout, a 404, 500 or maybe offline?
            // In case we have an OK response in the cache, respond with that one instead:
            if (cachedResponse && cachedResponse.ok) {
                if (res === "timedout") console.log("URL", event.request.url, "timedout. Serving it from cache to speed up site");
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
                const cache = await caches.open(CACHE_NAME);
                await cache.put(event.request, res.clone());
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
});

async function idbSetup() {
    
   
  }


  