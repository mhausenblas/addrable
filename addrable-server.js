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

this.getAddrable = function() {
	return adb;
};
 
// serve entire file from local directory
this.getFile = function(req, res, fileuri) {
	var filename = getFileNameFromURI(fileuri);
	filename =  path.join(process.cwd(), filename);
	console.log("Looking for file " + filename);
	path.exists(filename, function(exists) {
		if(!exists) {
			a404(res);
			return;
		}
		console.log("Found file " + filename);
		fs.readFile(filename, function(err, file) {
			if(err) {
				a500(res, err);
				return;
			}
			console.log("Successfully read file " + filename);
			res.writeHead(200);
			res.write(file);
			res.end();
		});
	});
}

// serve slice of a data file along selected dimension(s)
this.sliceAsJSON =  function(req, res, fileuri, seldimensions) {
	fileuri =  stripHashFromURI(fileuri);
	res.writeHead(200);
	console.log("DEBUG::" + requestFileByURI(fileuri));
	/*
    csv.each("data/table1.csv").addListener("data", function(data) { 
		console.log("DEBUG::" + data);
	});
	*/
	res.write("Selected dimensions: " + adb.listDimensions(seldimensions));	
	res.end();
};


/////////////////////////////////
// Addrable server util functions
//

function getFileNameFromURI(fileuri){
	var filename = url.parse(fileuri).pathname;
	if(filename.substring(0, 1) === '/') filename = filename.substring(1, filename.length);
	//console.log("DEBUG:: filename===" + filename);
	return filename;
}

function stripHashFromURI(fileuri){
	var protocol = url.parse(fileuri).protocol;
	var host = url.parse(fileuri).host;
	var pathname = url.parse(fileuri).pathname;
	return protocol + "//" + host + pathname;
}

function requestFileByURI(fileuri) {
	var host = url.parse(fileuri).hostname;
	var port = url.parse(fileuri).port;
	var pathname = url.parse(fileuri).pathname;
	var reqclient =  http.createClient(port ? port : '80', host);
	var request = reqclient.request('GET', pathname, {'host': host});
	request.end();
	
	console.log("File URI: " + fileuri);
	
	request.on('response', function (response) {
		console.log('STATUS: ' + response.statusCode);
		console.log('HEADERS: ' + JSON.stringify(response.headers));
		response.setEncoding('utf8');
		response.on('data', function (chunk) {
			console.log('BODY: ' + chunk);
			return chunk;	
		});
	});	
}

function a404(res){
	res.writeHead(404, {"Content-Type": "text/plain"});
	res.write("Sorry, seems I've got a 404 here for you ...\n");
	return res.end();
}

function a500(res, err){
	res.writeHead(500, {"Content-Type": "text/plain"});
	res.write("Hmm, something went wrong. My bad, nothing you can do about it (yeah, it's a 500 ;)\n");
	res.write(err + "\n");
	res.end();
}



