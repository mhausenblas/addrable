//////////////////////////////////////////////////////////
// Addrable server
//
// Michael Hausenblas, 2011.
//

var sys = require("sys");
var http = require("http"); 
var url = require("url");
var path = require("path");
var fs = require("fs");
var csv = require("./lib/csv");
var addrable = require('./addrable-core');
var adb = addrable.createAddrable();

var ADDRABLE_SERVER_DEBUG = true; // debug messages flag

// Processes an Addrable served-side:
// returns JSON-encoded slice or entire CSV file if no selector present
this.extract = function(req, res, tableuri) {
	var successful = false;
	
	resolveFile(tableuri, function(data){ // the on-data-ready anonymous function
		if(data){ // we have the CSV data in memory
			tableuri = getPathAndFragFromURI(tableuri); // remove host and port
			if(ADDRABLE_SERVER_DEBUG) console.log("DEBUG::EXTRACT check=[" + tableuri + "]");
			if(adb.isAddrable(tableuri)) { // we have an Addrable, process it ...
				if(ADDRABLE_SERVER_DEBUG) console.log("DEBUG::EXTRACT Addrable=" + tableuri);
				adb.processAddrable(data, tableuri, processcol, processrow, processwhere, res) ? successful = true : successful = false ;
				if(!successful) a404(res, "<div style='border: 1px solid red; background: #fafafa; font-family: monospace; font-size: 90%; padding: 3px;'>Sorry, I can't process the Addrable - either the selector is invalid or it didn't match anything in the CSV file.</div>");
			}
			else { // ... return entire table
				if(ADDRABLE_SERVER_DEBUG) console.log("DEBUG::EXTRACT entire file=" + tableuri);
				serveFile(req, res, tableuri, "text/csv"); 
			}
		}
		else {
			a404(res, "<div style='border: 1px solid red; background: #fafafa; font-family: monospace; font-size: 90%; padding: 3px;'>I can't the CSV file.</div>");
		}
	});
}

// Returns a reference to underlying Addrable object
this.getAddrable = function() {
	return adb;
};

/////////////////////////////////
// Addrable server functions
//

// processes the column selection case on the server-side
function processcol(data, selcol, res){
	var hrow = null; // the entire header row (column heads)
	var datatable = []; // the entire data table (without column heads)
	var thecol = [];
	var b = "";
	var rowidx = 0;
	var colidx = 0;
		
	res.writeHead(200, {"Content-Type": "application/json"});

	if(ADDRABLE_SERVER_DEBUG) console.log("DEBUG::COL SEL=" + selcol);

	csv.parse(data.toString(), function(table) { // retrieve header row from CSV file
		if(rowidx === 0) b = new String(table); // only take header row into account
		else datatable.push(new String(table));
		rowidx = rowidx + 1;
	});
	hrow = b.split(",");

	if(selcol === "*"){ // return header row
		res.write(JSON.stringify(hrow));
		res.end();
		if(ADDRABLE_SERVER_DEBUG) console.log("DEBUG::COL SEL=" + JSON.stringify(hrow));
	}
	else { // select values from the column
		for(h in hrow){ // scan for the column index
			if(hrow[h] === selcol) colidx = h;
		}
		for(row in datatable) {
			therow = datatable[row].split(",");
			thecol.push(therow[colidx]);
		}
		res.write(JSON.stringify(thecol));
		res.end();
		if(ADDRABLE_SERVER_DEBUG) console.log("DEBUG::COL SEL=" + JSON.stringify(thecol));
	}

	return true;
}

// processes the row selection case on the server-side
function processrow(data, selrow, res){
	/*
	var output = $(outputid);
	var rcounter = 0;
	var hrow = null; // the entire header row (column heads)
	var fulltable = null; // the entire table
	var b = "<div class='rowvalues'>";

	fulltable = $.csv2json()(data); // parse data into array
	
	if(selrow === "*"){ // count rows
		for(row in fulltable) {
			rcounter = rcounter + 1;
		}
		b += "<span class='colvalue'>table contains " + rcounter + " rows</span>";
	}
	else { // select all columns from specified row or null if not exists
		if (selrow < 0) return null; // row index invalid, signal failure
		hrow =  that.trimHeader($.csv()(data)[0]); // retrieve header row
		for(row in fulltable) {
			rcounter = rcounter + 1;
			if(row === selrow) {
				b += "<table><tr>";
				for(h in hrow){
					b += "<th>" + hrow[h] + "</th>";
				}
				b += "</tr><tr>";
				for(h in hrow){
					b += "<td>" + fulltable[row][hrow[h]]+ "</td>";
				}
				b += "</tr></table>";
				break;
			}
		}
		if (selrow > rcounter - 1) return null; // row index beyond table length, signal failure
	}
	output.html(b + "</div>");
	return true;
	*/
}

// processes the indirect selection case on the server-side
function processwhere(data, seldimensions, res){
	var hrow = null; // the entire header row (column heads)
	var hfrow = null; // the header row w/o the selected dimension (if only one is selected)
	var fulltable = null; // the entire table
	var xdim = "";
	var ydim = "";
}


////////////////////////////////////
// Addrable server helper functions
//

// Determines if we have to deal with a local or a remote file
// and parses the CSV data respectively
function resolveFile(tableuri, datareadyproc){
	var protocol = url.parse(tableuri).protocol;
	var host = url.parse(tableuri).hostname;
	
	//console.log("DEBUG::resolving file from host=" + host);
	if(host === "127.0.0.1") { // local file
		if(ADDRABLE_SERVER_DEBUG) console.log("DEBUG::parsing local file"); 
		return parseLocalFile(tableuri, datareadyproc);
	}
	else{ // remote file, perform HTTP GET to read content
		if(ADDRABLE_SERVER_DEBUG) console.log("DEBUG::parsing remote file"); 
		return null; // TBD
	}
}

// serves entire file from local directory
function parseLocalFile(fileuri, datareadyproc) {
	var filename = getFileNameFromURI(fileuri);
	filename =  path.join(process.cwd(), filename);

	path.exists(filename, function(exists) {
		if(!exists) return null;
		//console.log("Found file " + filename);
		fs.readFile(filename, function(err, file) {
			if(err) return null;
			if(ADDRABLE_SERVER_DEBUG) console.log("DEBUG::successfully parsed local file=[" + filename + "]");
			datareadyproc(file); // once data is available call the respective method
		});
	});
}

// serves entire file from local directory
function serveFile(req, res, fileuri, mediatype) {
	var filename = getFileNameFromURI(fileuri);
	filename =  path.join(process.cwd(), filename);
	//console.log("Looking for file " + filename);
	path.exists(filename, function(exists) {
		if(!exists) {
			a404(res, "<div style='border: 1px solid red; background: #fafafa; font-family: monospace; font-size: 90%; padding: 3px;'>Can't find the file</div>");
			return;
		}
		//console.log("Found file " + filename);
		fs.readFile(filename, function(err, file) {
			if(err) {
				a500(res, err);
				return;
			}
			console.log("Successfully served file [" + filename + "] as " + mediatype);
			res.writeHead(200, {"Content-Type": mediatype});
			res.write(file);
			res.end();
		});
	});
}

// Extracts the path component of a HTTP URI
function getFileNameFromURI(fileuri){
	var filename = url.parse(fileuri).pathname;
	if(filename.substring(0, 1) === '/') filename = filename.substring(1, filename.length);
	return filename;
}

// Extracts the path component and fragment identifier component of a HTTP URI
function getPathAndFragFromURI(fileuri){
	var filename = url.parse(fileuri).pathname;
	var hash = (url.parse(fileuri).hash || "");
	if(filename.substring(0, 1) === '/') filename = filename.substring(1, filename.length);
	return filename + hash;
}

// Removes the fragment identifier part of a HTTP URI
function stripHashFromURI(fileuri){
	var protocol = url.parse(fileuri).protocol;
	var host = url.parse(fileuri).host;
	var pathname = url.parse(fileuri).pathname;
	return protocol + "//" + host + pathname;
}

// Reads content of a file via HTTP GET
function requestFileByURI(fileuri) {
	var host = url.parse(fileuri).hostname;
	var port = url.parse(fileuri).port;
	var pathname = url.parse(fileuri).pathname;
	var reqclient =  http.createClient(port ? port : '80', host);
	var request = reqclient.request('GET', pathname, {'host': host});
	request.end();
	
	if(ADDRABLE_SERVER_DEBUG) console.log("DEBUG::remote file URI: " + fileuri);
	
	request.on('response', function (response) {
	if(ADDRABLE_SERVER_DEBUG) console.log("DEBUG:: status=" + response.statusCode);
	if(ADDRABLE_SERVER_DEBUG) console.log("DEBUG:: headers=" + JSON.stringify(response.headers));
		response.setEncoding('utf8');
		response.on('data', function (chunk) {
			return chunk;	
		});
	});	
}

// Renders a 404 in HTML
function a404(res, msg){
	res.writeHead(404, {"Content-Type": "text/html"});
	res.write("<h1 style='border-bottom: 1px solid #e0e0e0'>404</h1>\n");
	res.write("<p>Sorry, seems I've got a 404 here for you.</p>\n");
	if(msg) {
		res.write(msg + "\n");
	}
	return res.end();
}

// Renders a 500 in HTML
function a500(res, err){
	res.writeHead(500, {"Content-Type": "text/html"});
	res.write("<h1 style='border-bottom: 1px solid #e0e0e0'>500</h1>\n");
	res.write("<p>Hmm, something went wrong here, my bad, nothing you can do about it (yeah, it's a 500 ;)</p>\n");
	res.write("<p>" + err + "</p>\n");
	res.end();
}



