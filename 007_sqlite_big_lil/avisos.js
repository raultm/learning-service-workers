'use strict';

var baseUrl = '../dist/';

function toBinArray(str) {
    var l = str.length,
        arr = new Uint8Array(l);
    for (var i = 0; i < l; i++) arr[i] = str.charCodeAt(i);
    return arr;
}

function toBinString(arr) {
    var uarr = new Uint8Array(arr);
    var strings = [], chunksize = 0xffff;
    // There is a maximum stack size. We cannot call String.fromCharCode with as many arguments as we want
    for (var i = 0; i * chunksize < uarr.length; i++) {
        strings.push(String.fromCharCode.apply(null, uarr.subarray(i * chunksize, (i + 1) * chunksize)));
    }
    return strings.join('');
}

// Normally Sql.js tries to load sql-wasm.wasm relative to the page, not relative to the javascript
// doing the loading. So, we help it find the .wasm file with this function.
var config = {
    locateFile: filename => `${baseUrl}/${filename}`
}

var db

function getDB()
{
    if(db){
        return db
    }
    var dbstr = window.localStorage.getItem("avisos.sqlite");
    var dbversion = window.localStorage.getItem("avisos.version");

    if (dbstr) {
        db = new SQL.Database(toBinArray(dbstr));
    } else {
        db = new SQL.Database();
        db.run(`CREATE TABLE "avisos" (
            "id"	INTEGER,
            "item_id"	INTEGER NOT NULL,
            "item_name"	TEXT NOT NULL,
            "round_id"	INTEGER NOT NULL,
            "round_name"	TEXT NOT NULL,
            "observations"	TEXT NOT NULL,
            "reported_at"	TEXT DEFAULT (STRFTIME('%Y-%m-%d   %H:%M:%S', 'NOW','localtime')),
            "uploaded"	INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY("id" AUTOINCREMENT)
        );`);
    }
    return db
}

function removeDB(){
    window.localStorage.removeItem("avisos.sqlite");
    db = null
}

function execAvisosSQL(sql, bindings)
{
    console.time("exec: " + sql);
    try {
        if(bindings){
            var contents = getDB().run(sql, bindings)
        }else{
            var contents = getDB().exec(sql);
        }
    } catch(err) {
        alert(err.message);
    }
    
    console.timeEnd("exec: " + sql);
    // Guardamos nuevo estado
    var dbstr = toBinString(db.export());
    window.localStorage.setItem("avisos.sqlite", dbstr);
    //delete dbstr
    // Devolvemos resultado de la consulta
    return contents
}


function insertAndUpdateAvisos()
{
    insertAviso()
    listAvisosTable()
    console.log(window.performance)
}

function insertAviso()
{
    return execAvisosSQL(`INSERT INTO avisos(item_id, item_name, round_id, round_name, observations) 
                    VALUES    (?,       ?,         ?,        ?,          ?)`, 
                              [242,     "Espejo 123", 3,     "Ronda de Noche", "Observaciones"]
    );
}

function listAvisos(){
    var contents = execAvisosSQL("SELECT * FROM avisos ORDER BY id DESC");
    var list = document.getElementById("list-avisos")
    list.innerHTML = ""
    contents.forEach(element => {
        element.values.forEach(element => {
            //console.log(element)
            var li = document.createElement('li');
            list.appendChild(li);
            li.innerHTML += element.join(' - ');
        })
    });
}

function listAvisosTable(){
    var results = execAvisosSQL("SELECT * FROM avisos ORDER BY id DESC");
    output(results)
}

function exportDB()
{
    // In localStorage save as binaryString, convert to Binary Array
    var arraybuff = toBinArray(window.localStorage.getItem("avisos.sqlite"));
    var blob = new Blob([arraybuff]);
    var a = document.createElement("a");
    document.body.appendChild(a);
    a.href = window.URL.createObjectURL(blob);
    a.download = "sql.db";
    a.onclick = function () {
        setTimeout(function () {
        window.URL.revokeObjectURL(a.href);
        }, 1500);
    };
    a.click();
}

function importDB()
{
    var fileInput = document.getElementById("dbfile")
    var f = fileInput.files[0];
    var r = new FileReader();
    var list = document.getElementById("list-avisos")
        list.innerHTML = "Cargando Datos"
        console.log("Hola")
    
	r.onload = function (event) {
        window.localStorage.removeItem("avisos.sqlite");
        // r.result is a Binary Array, convert to Binary String
        window.localStorage.setItem("avisos.sqlite", toBinString(r.result));
        db = null
        showTables()
    }
	r.readAsArrayBuffer(f);
}

function showTables()
{
    var results = execAvisosSQL("SELECT `name`, `sql`\n  FROM `sqlite_master`\n  WHERE type='table';")
    var tablesDiv = document.getElementById("tables")
    var commands = document.getElementById('commands')
    tablesDiv.innerHTML = "";
    commands.value = ""
    results[0].values.forEach( row => {
        var tableName = row[0]
        tablesDiv.innerHTML+= `<button onclick="showTable('${tableName}')">${tableName}</button>`
        commands.value+= `SELECT * FROM ${tableName};\n`
    })
}

function showTable(tableName)
{
    var commands = document.getElementById('commands')
    commands.value = `SELECT * FROM ${tableName};\n`
    runCommands()
}


var tableCreate = function () {
	function valconcat(vals, tagName) {
		if (vals.length === 0) return '';
		var open = '<' + tagName + '>', close = '</' + tagName + '>';
		return open + vals.join(close + open) + close;
	}
	return function (columns, values) {
        var tbl = document.createElement('table');
        tbl.border = "1px solid"
        tbl.style = "border-collapse: collapse"
		var html = '<thead>' + valconcat(columns, 'th') + '</thead>';
		var rows = values.map(function (v) { return valconcat(v, 'td'); });
		html += '<tbody>' + valconcat(rows, 'tr') + '</tbody>';
		tbl.innerHTML = html;
		return tbl;
	}
}();

function runCommands() {
    var commands = document.getElementById('commands')
    console.log(commands.value)
    var results = execAvisosSQL(commands.value + ';')
    output(results)
}

function output(results)
{
    var outputElm = document.getElementById('output');
    outputElm.innerHTML = "";
    for (var i = 0; i < results.length; i++) {
        outputElm.appendChild(tableCreate(results[i].columns, results[i].values));
    }
}
