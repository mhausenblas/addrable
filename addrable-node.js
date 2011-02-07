var sys = require("sys");
var http = require("http"); 
var url = require("url");
var path = require("path");
var querystring = require("querystring");
var addrableserver = require('./addrable-server'); // the Addrable server object

var ADDRABLE_SERVER_HOSTNAME = "127.0.0.1"; // change this to the hostname where you deploy it (if not run locally)
var ADDRABLE_SERVER_PORT = "8086"; // change this to the hostname where you deploy it (if not run locally)

http.createServer(function(req, res) {
	var furl = url.parse(req.url).pathname;
	var aURI = "";
	// unescape path element to make sure we have a proper Addrable selector string:
	aURI = addrableserver.getAddrable().preprocessDimensions(furl); 
	console.log("Addrable URI: " + aURI);
	// process request in the Addrable server object:
	addrableserver.extract(ADDRABLE_SERVER_HOSTNAME, req, res, aURI);
}).listen(ADDRABLE_SERVER_PORT, ADDRABLE_SERVER_HOSTNAME);

console.log(addrableserver.getAddrable().info() + " running on server " + ADDRABLE_SERVER_HOSTNAME + ", listening on port " + ADDRABLE_SERVER_PORT);