var sys = require("sys");
var http = require("http"); 
var url = require("url");
var path = require("path");
var querystring = require("querystring");
var addrableserver = require('./addrable-server'); // the Addrable server object
var adb = addrableserver.getAddrable(); // the Addrable core object

http.createServer(function(req, res) {
	var furl = url.parse(req.url).pathname;
	var dimselURI = "";
	var seldimensions = null;
	
	// make sure we have a proper dimension selector string
	dimselURI = adb.preprocessDimensions(querystring.unescape(furl)); 
	// parse dimension selector string into hashtable:
	seldimensions = adb.parseDimensions(dimselURI);

	console.log("Addrable URI: " + dimselURI);
	
	// case selection full content vs. slices:
	if(dimselURI !== "") {
		if(seldimensions){ // slice along the selected dimensions and return as JSON:
			addrableserver.sliceAsJSON(req, res, dimselURI, seldimensions);
		}
		else { // serve entire file
			addrableserver.getFile(req, res, dimselURI); 
		}
	}
	else {
		res.writeHead(404, {"Content-Type": "text/plain"});
		res.write("Sorry, seems I've got a 404 here for you ...\n");
		return res.end();
	}
}).listen(8086);

console.log('Addrable server running and listening on port 8086 ...');
console.log("Using: " + adb.info());