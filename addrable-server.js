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

var ADDRABLE_SERVER_200 = "200";
var ADDRABLE_SERVER_404 = "404";
var ADDRABLE_SERVER_500 = "500";


// Processes an Addrable served-side:
// returns JSON-encoded slice or entire CSV file if no selector present
this.extract = function(adrblhost, req, res, aURI) {
	var successful = false;
	
	resolveFile(adrblhost, aURI, function(data, status, msg){ // the on-data-ready anonymous function
		if(data){ // we have the CSV data in memory
			if(ADDRABLE_SERVER_DEBUG) sys.debug("EXTRACT check=[" + aURI + "]");
			aURI = getPathAndFragFromURI(aURI); // remove host and port
			if(adb.isAddrable(aURI)) { // we have an Addrable, process it ...
				if(ADDRABLE_SERVER_DEBUG) sys.debug("EXTRACT Addrable=" + aURI);
				adb.processAddrable(data, aURI, processcol, processrow, processwhere, res) ? successful = true : successful = false ;
				if(!successful) a404(res, "<div style='border: 1px solid red; background: #fafafa; font-family: monospace; font-size: 90%; padding: 3px;'>Sorry, I can't process the Addrable - either the selector is invalid or it didn't match anything in the CSV file.</div>");
			}
			else { // ... return entire table
				if(ADDRABLE_SERVER_DEBUG) sys.debug("EXTRACT serving entire file ...");
				serveFileAs(res, data, aURI, "text/csv"); 
			}
		}
		else { // error reading the data into memory, examine status
			if(status === ADDRABLE_SERVER_404) {
				a404(res, "<div style='border: 1px solid red; background: #fafafa; font-family: monospace; font-size: 90%; padding: 3px;'>" + msg + "</div>");
			}
			if(status === ADDRABLE_SERVER_404) {
				a500(res, "<div style='border: 1px solid red; background: #fafafa; font-family: monospace; font-size: 90%; padding: 3px;'>" + msg + "</div>");
			}
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
	var presult = parseCSVData(data);
	var hrow = presult[0]; // the entire header row (column heads)
	var datatable = presult[1]; // the entire data table in d[i][column] format
	var thecol = []; // the selected column

	if(ADDRABLE_SERVER_DEBUG) sys.debug("COL SEL=[" + selcol + "]");
	
	if(selcol === "*"){ // return header row
		res.writeHead(200, {"Content-Type": "application/json"});
		res.write(JSON.stringify(hrow));
		res.end();
		if(ADDRABLE_SERVER_DEBUG) sys.debug("COL value=" + JSON.stringify(hrow));
	}
	else { // select values from the column
		if(adb.hasDimension(selcol, hrow)){ // check if column exists in header row
			for(row in datatable) {
				thecol.push(datatable[row][selcol]);
			}
			res.writeHead(200, {"Content-Type": "application/json"});
			res.write(JSON.stringify(thecol));
			res.end();
			if(ADDRABLE_SERVER_DEBUG) sys.debug("COL value=" + JSON.stringify(thecol));
		}
		else { // dimension does not exits
			if(ADDRABLE_SERVER_DEBUG) sys.debug("COL [" + selcol + "] does not exist");
			return false;
		}
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


// Parse CSV data
function parseCSVData(data){
	var rowidx = 0;
	var hrow = null; // the entire header row (column heads)
	var datatable = []; // the entire data table (without column heads)
	var start = 0, end = 0;
	var b = "";
			
	if(ADDRABLE_SERVER_DEBUG) start = new Date().getTime();
	
	csv.parse(data.toString(), function(row) { // retrieve header row from CSV file
		var rvals = [];
		rvals.length = 0; // clear content
		if(ADDRABLE_SERVER_DEBUG) sys.debug("COL -------------------");
		if(rowidx === 0){ // remember header row
			hrow = row; 
			if(ADDRABLE_SERVER_DEBUG) sys.debug("COL header=" + hrow);
		} 
		else { // non-header rows
			for(h in hrow) {
				rvals[hrow[h]] = row[h]; // encode data table in d[i][column] format
			}
			if(ADDRABLE_SERVER_DEBUG) {
				b = "";
				for(c in rvals) b +=  c + ":" + rvals[c] + " ";
				sys.debug("COL parsed row=[ " + b + "]");
			} 
			datatable.push(rvals);
		}
		rowidx = rowidx + 1;
	});
	
	if(ADDRABLE_SERVER_DEBUG) {
		end = new Date().getTime();
		sys.debug("CSV data parsed in " + (end-start)  + "ms");
	}
	
	return [hrow, datatable];
}



// Determines if we have to deal with a local or a remote file
// and parses the CSV data respectively
function resolveFile(adrblhost, tableuri, datareadyproc){
	var protocol = url.parse(tableuri).protocol;
	var host = url.parse(tableuri).hostname;
	
	//sys.debug("resolving file from host=" + host);
	if(host === adrblhost) { // local file
		if(ADDRABLE_SERVER_DEBUG) sys.debug("Trying to parse local file"); 
		return parseLocalFile(tableuri, datareadyproc);
	}
	else{ // remote file, perform HTTP GET to read content
		if(ADDRABLE_SERVER_DEBUG) sys.debug("Trying to parse remote file"); 
		return null; // TBD
	}
}

// serves entire file from local directory
function parseLocalFile(fileuri, datareadyproc) {
	var filename = getFileNameFromURI(fileuri);
	var start = 0, end = 0;

	filename =  path.join(process.cwd(), filename);
		
	if(ADDRABLE_SERVER_DEBUG) start = new Date().getTime();
	
	path.exists(filename, function(exists) {
		if(!exists) {
			if(ADDRABLE_SERVER_DEBUG) sys.debug("Local file " + filename + " doesn't exist ..."); 
			datareadyproc(null, ADDRABLE_SERVER_404, "Local file " + getFileNameFromURI(fileuri) + " doesn't exist ...");
			return;
		}
		fs.readFile(filename, function(err, filecontent) {
			if(err) {
				if(ADDRABLE_SERVER_DEBUG) sys.debug("Error reading local file " + filename + " ..."); 
				datareadyproc(null, ADDRABLE_SERVER_500, "Error reading local file " + getFileNameFromURI(fileuri) + " ...");
				return;
			} 
			end = new Date().getTime();
			if(ADDRABLE_SERVER_DEBUG) sys.debug("Successfully parsed local file " + filename + " in " + (end-start) + "ms");
			datareadyproc(filecontent, ADDRABLE_SERVER_200, fileuri); // once data is available call the respective method for Addrable processing
		});
	});
}

// serves entire file from memory as with certain media type
function serveFileAs(res, data, fileuri, mediatype) {
	res.writeHead(200, {"Content-Type": mediatype});
	res.write(data);
	res.end();
	if(ADDRABLE_SERVER_DEBUG) sys.debug("Successfully served local file [" + getFileNameFromURI(fileuri) + "] as " + mediatype);
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
	
	if(ADDRABLE_SERVER_DEBUG) sys.debug("remote file URI: " + fileuri);
	
	request.on('response', function (response) {
	if(ADDRABLE_SERVER_DEBUG) sys.debug(" status=" + response.statusCode);
	if(ADDRABLE_SERVER_DEBUG) sys.debug(" headers=" + JSON.stringify(response.headers));
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



