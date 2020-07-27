// https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
// https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB

var getDB = function (name, version, {
    onsuccess = (db,event) => { console.log(db, event) },
    onerror = (error,event) => { console.log(error,event) },
    onupgradeneeded = (db, oldVersion, event) => { console.log(db, oldVersion, event) },
} = {}) {
    return {
        name: name,
        version: version,
        db: null,
        setup: () => {
            console.log(this, db)
            var self = this
            if(!db){
                self.open({
                    onsuccess: (db) => {
                        self.db = db
                        return self
                    }
                })
            }
        },
        open: ({name, version, onsuccess, onerror, onupgradeneeded} = {}) => {
            const request = indexedDB.open(name, version);

            request.onerror = (event) => onerror(event.target.error, event);
            request.onsuccess = (event) => onsuccess(event.target.result,event);
            request.onupgradeneeded = (event) => onupgradeneeded(event.target.result,event.oldVersion, event);
        },
    };
}


function openDB({
    name = "003_populate_indexeddb",
    version = 1,
    onsuccess = (db,event) => { console.log(db, event) },
    onerror = (error,event) => { console.log(error,event) },
    onupgradeneeded = migrate
  } = {})
{
    const request = indexedDB.open(name, version);

    request.onerror = (event) => onerror(event.target.error, event);
    request.onsuccess = (event) => onsuccess(event.target.result,event);
    request.onupgradeneeded = (event) => onupgradeneeded(event.target.result,event.oldVersion, event);
}


function migrate(db, oldVersion, event)
{
    switch(oldVersion) {
        // https://developer.mozilla.org/en-US/docs/Web/API/IDBDatabase/createObjectStore
        case 0:
            //db.createObjectStore("sces");
            db.createObjectStore("sces", {autoIncrement: true});
            // code block
        //case 1:
            // code block
        //default:
            // code block
    }
}

function addData(data)
{
    openDB({
        onsuccess: (db) => {
            const transaction = db.transaction(['sces'], "readwrite") // "readonly" by default, "readwrite"
            const objectStore = transaction.objectStore('sces');
            const request = objectStore.add(data);
        }
    })
}

function updateData(data)
{
    openDB({
        onsuccess: (db) => {
            db.transaction(['sces'], "readwrite")
              .objectStore('sces')
              .put(data)
              .onsuccess( (e) => console.log("Elemento actualizado") )
        }
    })
}

function deleteData(key)
{
    openDB({
        onsuccess: (db) => {
            const transaction = db.transaction(['sces'], "readwrite") // "readonly" by default, "readwrite"
            const objectStore = transaction.objectStore('sces');
            const request = objectStore.delete(key);
        }
    })
}

function readData()
{
    openDB({
        onsuccess: (db) => {
            const transaction = db.transaction(['sces'], "readonly") // "readonly" by default, "readwrite"
            const objectStore = transaction.objectStore('sces');
            const request = objectStore.openCursor();
            const items = []
            request.onsuccess = (e) => {
                const cursor = e.target.result;
                //console.log(e)
                if(cursor === null){ return console.log(items) }
                items.push(cursor.value);
                cursor.continue();
            }
        }
    })
}

function filter(search)
{
    // Match anything between "Bill" and "Donna", but not including "Donna"
    var boundKeyRange = IDBKeyRange.bound(search, search + '\uffff');

    // To use one of the key ranges, pass it in as the first argument of openCursor()/openKeyCursor()
    // objectStore.openCursor(boundKeyRange, "prev") If ORDER BY DESC
    // objectStore.openCursor(null, "prev") All Order By DESC
    index.openCursor(boundKeyRange).onsuccess = function(event) {
        var cursor = event.target.result;
        if (cursor) {
            // Do something with the matches.
            cursor.continue();
        }
    };
}

function find(key)
{
    openDB({
        onsuccess: (db) => {
            const transaction = db.transaction(['sces'], "readwrite") // "readonly" by default, "readwrite"
            const objectStore = transaction.objectStore('sces');
            const request = objectStore.get(key);

            request.onsuccess = (e) => {
                console.log(e)
            }
        }
    })
}