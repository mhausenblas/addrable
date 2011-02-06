var sys = require("sys");
var http = require("http"); 
var url = require("url");
var path = require("path");
var querystring = require("querystring");
var addrableserver = require('./addrable-server'); // the Addrable server object

http.createServer(function(req, res) {
	var furl = url.parse(req.url).pathname;
	var aURI = "";
	// unescape path element to make sure we have a proper Addrable selector string:
	aURI = addrableserver.getAddrable().preprocessDimensions(furl); 
	console.log("Addrable URI: " + aURI);
	// process request in the Addrable server object:
	addrableserver.extract(req, res, aURI);
}).listen(8086);

console.log('Addrable server running and listening on port 8086 ...');
console.log("Using: " + addrableserver.getAddrable().info());