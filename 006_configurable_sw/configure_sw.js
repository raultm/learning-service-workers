var loc = window.location.pathname;
var currentFolder = window.location.pathname.substring(0, loc.lastIndexOf('/')) + "/";

async function setupServiceWorker () {
    if (!('serviceWorker' in navigator)) {
        console.log('Service Worker NOT supported!');
        return;
    }
    await unregisterServiceWorker()
    navigator.serviceWorker.register(currentFolder + 'sw.js?foo=bar&skipWaiting=true').then(function (registration) {
        console.log('Service Worker registration successful with scope: ', registration.scope);
    }).catch(function (err) {
        console.error(err);
    });
} 

async function unregisterServiceWorker() {
    await navigator.serviceWorker.getRegistration(currentFolder + "sw.js").then(function (reg) {
        if( ! reg ) { return; }
        console.log("Unregistering...");
        return reg.unregister();
    }).then(function (res) {
        console.log("Unregistered", res);
    }).catch(function(error) {
        console.error(error);
    });
}