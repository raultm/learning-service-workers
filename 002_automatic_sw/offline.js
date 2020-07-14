var loc = window.location.pathname;
var currentFolder = window.location.pathname.substring(0, loc.lastIndexOf('/')) + "/";

//console.log(currentFolder);

function setOffline () {
    if (!('serviceWorker' in navigator)) {
        console.log('Service Worker NOT supported!');
        return;
    }
    
    navigator.serviceWorker.register(currentFolder + 'sw.js').then(function (registration) {
        console.log('Service Worker registration successful with scope: ', registration.scope);
    }).catch(function (err) {
        console.error(err);
    });
} 