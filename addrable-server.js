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
			else { // ... return entire table as CSV file 
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
	var result = {};
	var sresult = "";

	if(ADDRABLE_SERVER_DEBUG) sys.debug("COL SEL=[" + selcol + "]");
	
	if(selcol === "*"){ // return header row
		res.writeHead(200, {"Content-Type": "application/json"});
		sresult = JSON.stringify({ header : hrow });
		res.write(sresult);
		res.end();
		if(ADDRABLE_SERVER_DEBUG) sys.debug("COL value=" + sresult);
	}
	else { // select values from the column
		if(adb.hasDimension(selcol, hrow)){ // check if column exists in header row
			for(row in datatable) {
				thecol.push(datatable[row][selcol]);
			}
			res.writeHead(200, {"Content-Type": "application/json"});
			result[selcol] = thecol;
			sresult = JSON.stringify(result);
			res.write(sresult);
			res.end();
			if(ADDRABLE_SERVER_DEBUG) sys.debug("COL value=" + sresult);
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
	var presult = parseCSVData(data);
	var hrow = presult[0]; // the entire header row (column heads)
	var datatable = presult[1]; // the entire data table in d[i][column] format
	var rcounter = 0;
	var sresult = "";
	var r = {};
	
	if(ADDRABLE_SERVER_DEBUG) sys.debug("ROW SEL=[" + selrow + "]");

	for(row in datatable) { // determine number of rows
		rcounter = rcounter + 1;
	}
	if(selrow === "*"){ // count rows
		res.writeHead(200, {"Content-Type": "application/json"});
		sresult = JSON.stringify({ numrows : rcounter });
		res.write(sresult);
		res.end();
		if(ADDRABLE_SERVER_DEBUG) sys.debug("ROW count=" + sresult);
	}
	else { // select all columns from specified row or null if not exists
		if (isNaN(parseInt(selrow, 10)) || (selrow < 0) || (selrow > rcounter - 1)) { // invalid row index or out of range, signal failure
			if(ADDRABLE_SERVER_DEBUG) sys.debug("ROW [" + selrow + "] invalid or does not exist");
			return false;
		}
		else { // row index in range
			for(row in datatable) {
				if(row === selrow) {
					for(h in hrow){ // copy values from row
						r[hrow[h]] = datatable[row][hrow[h]];
					}
					break;
				}
			}
			res.writeHead(200, {"Content-Type": "application/json"});
			sresult = JSON.stringify({ row : r });
			res.write(sresult);
			res.end();
			if(ADDRABLE_SERVER_DEBUG) sys.debug("ROW value=" + sresult);
		}
	}
	return true;
}

// processes the indirect selection case on the server-side
function processwhere(data, seldimensions, res){
	var presult = parseCSVData(data);
	var hrow = presult[0]; // the entire header row (column heads)
	var hfrow = adb.filterTableHeader(hrow, seldimensions); // the filtered header row (only non-selected dimensions)
	var datatable = presult[1]; // the entire data table in d[i][column] format
	var result = {};
	var matches = true;	
	var arow = [];
	var rowidx = 0;
	var colidx = 0;
			
	// todo: check if all dimensions exist, otherwise return false
	
	// todo - outsource this to core and update client implementation as well
	for(h in hfrow){ // scan through filtered header row
		rowidx = 0;
		arow[colidx] = [];
		for(row in datatable) { // go through all rows in original data table
			matches =  true;
			for(sdim in seldimensions){ // check if selected dimension values match
				if(seldimensions[sdim] !== datatable[row][sdim]) matches = false;
			}
			if(matches){
				if(ADDRABLE_SERVER_DEBUG) sys.debug("WHERE matched cell=" + hfrow[h] + ":" + datatable[row][hfrow[h]] + " for col/row =" + colidx + "/" + rowidx);
				arow[colidx][rowidx] = datatable[row][hfrow[h]];
				rowidx = rowidx + 1;
			}
		}
		colidx =  colidx + 1;
	}
	
	// todo: check if anything matched, otherwise return false
	
	res.writeHead(200, {"Content-Type": "application/json"});
	result = { header : hfrow, rows : arow }; // note - differs from row:x output format, maybe align?
	sresult = JSON.stringify(result);
	res.write(sresult);
	res.end();
	if(ADDRABLE_SERVER_DEBUG) sys.debug("WHERE result=" + sresult);
	
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
		if(ADDRABLE_SERVER_DEBUG) sys.debug("PARSE -------------------");
		if(rowidx === 0){ // remember header row
			hrow = row; 
			if(ADDRABLE_SERVER_DEBUG) sys.debug("PARSE header=" + hrow);
		} 
		else { // non-header rows
			for(h in hrow) {
				rvals[hrow[h]] = row[h]; // encode data table in d[i][column] format
			}
			if(ADDRABLE_SERVER_DEBUG) {
				b = "";
				for(c in rvals) b +=  c + ":" + rvals[c] + " ";
				sys.debug("PARSE row=[ " + b + "]");
			} 
			datatable.push(rvals);
		}
		rowidx = rowidx + 1;
	});
	
	if(ADDRABLE_SERVER_DEBUG) {
		end = new Date().getTime();
		sys.debug("PARSE CSV data parsed in " + (end-start)  + "ms");
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
		if(ADDRABLE_SERVER_DEBUG) sys.debug("RESOLVE trying to parse local file"); 
		return parseLocalFile(tableuri, datareadyproc);
	}
	else{ // remote file, perform HTTP GET to read content
		if(ADDRABLE_SERVER_DEBUG) sys.debug("RESOLVE trying to parse remote file"); 
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
			if(ADDRABLE_SERVER_DEBUG) sys.debug("LOCAL FILE " + filename + " doesn't exist ..."); 
			datareadyproc(null, ADDRABLE_SERVER_404, "LOCAL FILE " + getFileNameFromURI(fileuri) + " doesn't exist ...");
			return;
		}
		fs.readFile(filename, function(err, filecontent) {
			if(err) {
				if(ADDRABLE_SERVER_DEBUG) sys.debug("LOCAL FILE error reading " + filename + " ..."); 
				datareadyproc(null, ADDRABLE_SERVER_500, "LOCAL FILE error reading " + getFileNameFromURI(fileuri) + " ...");
				return;
			} 
			end = new Date().getTime();
			if(ADDRABLE_SERVER_DEBUG) sys.debug("LOCAL FILE successfully parsed " + filename + " in " + (end-start) + "ms");
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



