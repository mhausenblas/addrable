//////////////////////////////////////////////////////////
// Addrable core
//
// Michael Hausenblas, 2011.
//
// -------------------------------------------------------
//  Includes code from jQuery JavaScript Library v1.5
//  http://jquery.com/
// 
//  Copyright 2011, John Resig
//  Dual licensed under the MIT or GPL Version 2 licenses.
//  http://jquery.org/license

var ADDRABLE_VERSION_INFO = "Addrable v0.1";
var ADDRABLE_SELECTOR_COL = "col";
var ADDRABLE_SELECTOR_ROW = "row";
var ADDRABLE_SELECTOR_WHERE = "where";

var ADDRABLE_DEBUG = false; // debug messages flag

//////////////////////////////////////////////////////////
// For server-side usage with node.js.
//
//  var addrable = require('./addrable-server');
//  var adb = addrable.createAddrable();
//  adb.init();
this.createAddrable = function() {
     function F() {}
     F.prototype = Addrable;
     return new F();
}

//////////////////////////////////////////////////////////
// For client-side usage in a browser. Make sure to 
// include both addrable-core.js and addrable-client.js.
//
//  Addrable.init();
//  Addrable.render(tableuri, "#someelement");
var Addrable =  {

/*
	  Initializes the Addrable.

*/

	init : function(){
		this.trim = String.prototype.trim;
		this.rnotwhite = /\S/; // check if a string has a non-whitespace character in it
		this.trimLeft = /^\s+/; // trimming left whitespace
		this.trimRight = /\s+$/; // trimming right whitespace
		if (this.rnotwhite.test("\xA0")) {// if used in the browser, check for IE as it doesn't match non-breaking spaces with \s
			trimLeft = /^[\s\xA0]+/;
			trimRight = /[\s\xA0]+$/;
		}
	},
	
	info : function(){
		return ADDRABLE_VERSION_INFO;
	},

/*
	  Turns a percent-encoded path element of a URI into a valid dimension selector string
	  (typically for server-side usage).

	   preprocessDimensions('/http%3A%2F%2F127.0.0.1%3A8086%2Fdata%2Ftable1.csv%23city%3DBerlin) -> 'http://127.0.0.1:8086/data/table1.csv#city=Berlin'
	
*/
	preprocessDimensions : function(sURI){
		if(sURI.substring(0, 1) === '/') sURI = sURI.substring(1, sURI.length); // get rid of leading slash if present
		return unescape(sURI);
	},

/*
	  Tries to parse the fragment identifier part of a URI according to 
	  the Addrable syntax selector string (see README.md). If present,
	  returns the selector case (where, column, or row) and the selector value.

	   parseAddrable('#where:city=Galway,date=2011-03-03') -> [ 'where' , {'city': 'Galway', 'date' : '2011-03-03'} ]
	
*/
	parseAddrable : function(tableuri){
		var addrableMode = "";
		var addrableVals = "";
		var selcol = "";
		var selrow = 0;
		var dimensions = [];
		var dimht = [];
		var dimk = null;
		var dimv = null;
	
		if(ADDRABLE_DEBUG) console.log("DEBUG::core trying to parse Addrable ...");
	
		if(tableuri.indexOf("#") < 0) { // no selector string found
			if(ADDRABLE_DEBUG) console.log("DEBUG::core no selector found");
			return null;
		} 
		else {
			addrableMode = tableuri.substring(tableuri.indexOf("#") + 1, tableuri.indexOf(":"));
			if(addrableMode.length < 1) {
				if(ADDRABLE_DEBUG) console.log("DEBUG::core no selector key found");
				return null; // selector key not found
			} 
			addrableVals = tableuri.substring(tableuri.indexOf("#") + 1);
			addrableVals = addrableVals.substring(addrableVals.indexOf(":") + 1);
			
			if(ADDRABLE_DEBUG) console.log("DEBUG::core selector key=" + addrableMode);
			if(addrableMode === ADDRABLE_SELECTOR_COL) { // column selection case
				selcol = addrableVals;
				if(ADDRABLE_DEBUG) console.log("DEBUG::core COL selection=" + selcol);
				return [ADDRABLE_SELECTOR_COL, selcol];
			}
			else {
				if(addrableMode === ADDRABLE_SELECTOR_ROW) { // row selection case
					selrow = addrableVals;
					if(ADDRABLE_DEBUG) console.log("DEBUG::core ROW selection=" + selrow);
					return [ADDRABLE_SELECTOR_ROW, selrow];
				}
				else {
					if(addrableMode === ADDRABLE_SELECTOR_WHERE) { // indirect selection case
						if(ADDRABLE_DEBUG) console.log("DEBUG::core WHERE selection=" + addrableVals);
						dimensions = addrableVals.split(","); // turn string into array of key/val pairs
						for (dim in dimensions){ // each dimension found, put it into a hashtable
							dimk = dimensions[dim].substring(0, dimensions[dim].indexOf("="));
							dimv = dimensions[dim].substring(dimensions[dim].indexOf("=") + 1);
							if((dimk !== '') && (dimv !== '')) {
								dimht[dimk] = dimv
							}
							else return null;//invalid selector string
						}
						return [ADDRABLE_SELECTOR_WHERE, dimht];
					}
					else {
						if(ADDRABLE_DEBUG) console.log("DEBUG::core UNKNOWN selection=" + addrableVals);
						return null; // unknown selector
					}
				}
			}
		}
	},

/*
	Checks if the fragment identifier part of a URI conforms to 
	the Addrable syntax selector string (see README.md).

	  parseDimensions('#city=Galway,date=2011-03-03') -> {'city': 'Galway', 'date' : '2011-03-03'}

*/
	isAddrable : function(tableuri){
		if(this.parseAddrable(tableuri)) return true;
		else return false;
	},
	
/*
	  Processes an Addrable generically: client and server implementations are expected to provide respective callbacks.

	  data ... CSV data
	  tableuri ... URI with Addrable frag id
	  colprocfun, rowprocfun, whereprocfun ... selector callbacks
	  outp ... client-side: the @id of the HTML element for rendering the output, server-side: the HTTP response object
	 
*/
	processAddrable : function(data, tableuri, colprocfun, rowprocfun, whereprocfun, outp){
		var addrable = this.parseAddrable(tableuri); // parse selector string 
		var addrablecase = null;
		var selval = null;
	
		if(addrable) { // we have an Addrable to process
			addrablecase = addrable[0];
			selval = addrable[1];

			if(addrablecase === ADDRABLE_SELECTOR_COL) { // column selection case
				return colprocfun(data, selval, outp);
			}
			else {
				if(addrablecase === ADDRABLE_SELECTOR_ROW) { // row selection case
					return rowprocfun(data, selval, outp);
				}
				else {
					if(addrablecase === ADDRABLE_SELECTOR_WHERE) { // indirect selection case
						return whereprocfun(data, selval, outp);
					}
				}
			}
		}
		else return null; // signal process failed
	},

/*
	  Indirect selection - produces a simple string representation of selected dimensions.

	  listDimensions('{'city': 'Galway', 'date' : '2011-03-03'}) -> 'city=Galway date=2011-03-03'

*/
	listDimensions : function(seldimensions){
		var  b = "";
		for (sdim in seldimensions){
			b += sdim + "=" + seldimensions[sdim]  + " ";
		}
		return b;
	},

/*
	  Indirect selection - finds the dimension that is not selected through 
	  comparing selected dimensions with header row.

	  nonSelectedDimension({'city': 'Galway', 'date' : '2011-03-03'}, ['city', 'date', 'temperature']) -> 'temperature' 

*/
	nonSelectedDimension  : function(seldimensions, hrow){
		for(h in hrow){
			if(!(hrow[h] in seldimensions)) {
				return hrow[h];
			}
		}
		return null;
	},
	
/*
	  Cheks if a dimension exists by comparing it against header row.

	  hasDimension('city', ['city', 'date', 'temperature']) -> true
	  hasDimension('person', ['city', 'date', 'temperature']) -> false

*/
	hasDimension  : function(seldimension, hrow){
		for(h in hrow){
			if(seldimension === hrow[h]) {
				return true;
			}
		}
		return false;
	},

/*
	  Indirect selection - slices a table along a selected dimension (with optional
	  filter key and value matches for another dimension), returning an array.

	  Given the following table encoded as CSV table object jQuery.csv()(csvstring):

	   city   T 
	  ----------
	   GWY   13
	   GWY   30
	   BER   20 

	  filterDimension(table, 'T')  -> [13, 30, 20] 
	  filterDimension(table, 'T', {'city': 'GWY'})  -> [13, 30] 

*/
	filterDimension : function(table, dim, seldimensions){
		var vals = [];
		var filters = [];
	
		if(seldimensions) { // if filter key and value is present
			for (sdim in seldimensions){ // flatten filter key and values
				filters.push(sdim);
				filters.push(seldimensions[sdim]);
			}
			for(row in table) {
				if(Object.size(filters) == 2){ // we have to filter against one dimension
					if ((this.trims(table[row][filters[0]]) === filters[1])){ // only take values into account where filter dimension matches
						for(v in table[row]) {
							if (this.trims(v) === dim){ // copy only the values where dimension matches
								vals.push(this.trims(this.stripQuotes(table[row][v])));
							}
						}
					}
				}
				else { // two dimensional filtering
					if ((this.trims(table[row][filters[0]]) === filters[1]) && (this.trims(table[row][filters[2]]) === filters[3]) ){ // only take values into account where filter dimension matches
						for(v in table[row]) {
							if (this.trims(v) === dim){ // copy only the values where dimension matches
								vals.push(this.trims(this.stripQuotes(table[row][v])));
							}
						}
					}
				}
			}
		}
		else{
			for(row in table) {
				for(v in table[row]) {
					if (this.trims(v) === dim){ // copy only the values where dimension matches
						vals.push(this.trims(this.stripQuotes(table[row][v])));
					}
				}
			}
		}	
		return vals;
	},

/*
	  Indirect selection - slices a table header row, effectively filtering out the selected dimension.
 
	  filterTableHeader(['city', 'date', 'temperature', 'reporter'], ['city','reporter']) -> ['date','temperature']
*/
	filterTableHeader : function(hrow, seldim){
		var vals = [];
		for (col in hrow) { // copy only header cells we need (that is, not the selected dimension)
			if (!(hrow[col] in seldim)){
				vals.push(hrow[col]);
			}
		}
		return vals;
	},

/*
	  Indirect selection - slices a table along a selected dimension with a dimension value, 
	  returning a CSV string representing the subtable (w/o header row).

	  Given the following table encoded as CSV table object jQuery.csv()(csvstring):

	  city  date  T 
	  --------------
	  GWY   Mo    13
	  GWY   Tue   30
	  BER   Wed   20

	  sliceTable(table, 'city', 'GWY')  -> 'Mo,13\r\nTue,30\r\n' 

*/
	sliceTable : function(table, seldim, seldimval){
		var csvstring = "";
		for(row in table) {
			if (table[row][seldim] === seldimval){ // filter only matching dimension values
				for(v in table[row]) {
					if (table[row][v] !== seldimval){ // copy only values from other columns
						csvstring += table[row][v] + ",";
					}
				}
			}
			csvstring = csvstring.substring(0, csvstring.length - 1) + "\r\n";
		}
		return csvstring;
	},

/*
	  Indirect selection - slices a table header row, effectively filtering out the selected dimension.
 
	  sliceTableHeader(['city', 'date', 'temperature'], 'date') -> 'city,temperature\r\n'
*/
	sliceTableHeader : function(hrow, seldim){
		var csvstring = "";
		for (col in hrow) { // copy only header cells we need (that is, not the selected dimension)
			if (hrow[col] !== seldim){
				csvstring += hrow[col] + ",";
			}
		}
		return csvstring.substring(0, csvstring.length - 1) + "\r\n"; // remove the last ,
	},
	

/////////////////////////////////
// Addrable core helper functions
//

	// defines trimming based on environment (browser or node)
	trims : function(text){
		if(this.trim) return text == null ? "" : this.trim.call(text);
		else return text == null ? "" : text.toString().replace(this.trimLeft, "").replace(this.trimRight, ""); 
	},
	
	// checks if a cell value is numeric
	isNumericCell  : function(cell) {
		var numberRegex = /^[+-]?\d+(\.\d+)?([eE][+-]?\d+)?$/;
		return numberRegex.test(cell);
	},

	// removes leading or trailing spaces from header row values
	trimHeader  : function(he){
		var ret = [];
		for (h in he) { 
			ret.push(this.trims(he[h]));
		}
		return ret;
	},

	// turns "xxx" or "xxx or xxx" into xxx, that is, strips all leading or trailing '"'
	stripQuotes  : function(val){
		return val.replace(/"*(\w+)"*\s*/g, '$1');
	}

};// end of Addrable core


/////////////////////////////////
// Utility functions
//

Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

Array.max = function(array){
    return Math.max.apply( Math, array );
};

Array.min = function(array){
    return Math.min.apply( Math, array );
};

