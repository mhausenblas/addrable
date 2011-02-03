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
	  Turns the percent-encoded path element of a URI into a valid dimension selector string
	  (typically for server-side usage).

	   preprocessDimensions('http%3A%2F%2F127.0.0.1%3A8086%2Fdata%2Ftable1.csv%23city%3DBerlin) -> 'http://127.0.0.1:8086/data/table1.csv#city=Berlin'
*/
	preprocessDimensions : function(sURI){
		if(sURI.substring(0, 1) === '/') sURI = sURI.substring(1, sURI.length); // get rid of leading slash if present
		return sURI;
	},
	
/*
	  Tests a URI for a table dimension selector string and if present parses it into a hastable.

	   parseDimensions('#city=Galway,date=2011-03-03') -> {'city': 'Galway', 'date' : '2011-03-03'}
*/
	parseDimensions : function(tableuri){
		var dimensions = [];
		var dimht = [];
		var dimk = null;
		var dimv = null;
	
		if(tableuri.indexOf("#") < 0){ // no dimension selector string found
			return null;
		} 
		else{
			dimensions = tableuri.substring(tableuri.indexOf("#") + 1).split(","); // turn string into array of key/val pairs
			for (dim in dimensions){ // each dimension found, put it into a hashtable
				dimk = dimensions[dim].substring(0, dimensions[dim].indexOf("="));
				dimv = dimensions[dim].substring(dimensions[dim].indexOf("=") + 1);
				if((dimk !== '') && (dimv !== '')) {
					dimht[dimk] = dimv
				}
				else return null;//invalid selector string
			}
			return dimht;
		}
	},
	
	listDimensions : function(seldimensions){
		var  b = "";
		for (sdim in seldimensions){
			b += sdim + "=" + seldimensions[sdim]  + " ";
		}
		return b;
	},

/*
	  Finds the dimension that is not selected through comparing selected dimensions with header row.

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
	  Slices a table along a selected dimension (with optional
	  filter key and value matches for another dimension), 
	  returning an array.

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
	  Slices a table header row, effectively filtering out the selected dimension.
 
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
  Slices a table along a selected dimension with a dimension value, 
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
  Slices a table header row, effectively filtering out the selected dimension.
 
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
// Addrable util functions
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

