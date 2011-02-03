//////////////////////////////////////////////////////////
// Addrable client
//
// Michael Hausenblas, 2011.
//

// renders slices in one of three modes: single value, line chart or table, depending on selected dimensions
Addrable.render = function(tableuri, outputid) {
	var output = $(outputid);
	var that = this;
	$.ajax({
		url : tableuri,
		success : function(data) {
			var seldimensions = that.parseDimensions(tableuri); // parse dimension selector string into hashtable 
			var hrow = null; // the entire header row (column heads)
			var hfrow = null; // the header row w/o the selected dimension (if only one is selected)
			var fulltable = null; // the entire table
			var xdim = "";
			var ydim = "";
			if(seldimensions){ // there is at least one dimension selected, for example #city=Berlin or #city=Galway,date=2011-03-03
				fulltable = $.csv2json()(data); // parse data into array
				hrow =  that.trimHeader($.csv()(data)[0]); // retrieve header row
				if(Object.size(seldimensions) === (Object.size(hrow) - 1)) { // all but one dimension selected
					output.html(renderSingleValue(seldimensions, hrow, fulltable, tableuri)); // single value rendering
				}
				else { // more than one dimension selected
					hfrow = that.filterTableHeader(hrow, seldimensions); // we check to see if we can plot it as a line chart
					if(Object.size(hfrow) == 2) {// two dimensions left for rendering	
						if(!that.isNumericCell(fulltable[0][hfrow[0]]) && !that.isNumericCell(fulltable[0][hfrow[1]])){ // neither dimension has numeric values
							output.table($.csv()(renderAsTable(seldimensions, hrow, fulltable))); // hence we can only render it as a table
						}
						else {// at least one dimension has numeric values
							if(that.isNumericCell(fulltable[0][hfrow[0]])) {
								ydim = hfrow[0];
								xdim = hfrow[1];
							}
							else {
								ydim = hfrow[1];
								xdim = hfrow[0];
							}
							output.html(renderAsLineChart(seldimensions, xdim, ydim, fulltable, tableuri));
						}
					}
					else {
						output.table($.csv()(renderAsTable(seldimensions, hrow, fulltable))); // hence we can only render it as a table
					}
				}
			}
			else { // no dimension(s) selected, hence render entire table
				output.table($.csv()(data));
			}
		},
		error: function(xhr, textStatus, errorThrown){
			alert("Error: " + textStatus);
		}
	});

	////////////////////////////////////
	// Addrable client helper functions
	//
	// renders table along selected dimensions as CSV string to be rendered by jQuery plug-in
	function renderAsTable(seldimensions, hrow, table){
		var csvstring = "";
		for(sdim in seldimensions) { 
			csvstring = that.sliceTableHeader(hrow, sdim);
			csvstring += that.sliceTable(table, sdim, seldimensions[sdim]);
			return csvstring; // should only be one dimension here to choose from, so ignore the rest ...
		}
		return null;
	}

	// renders a single value (cell) with its secondary dimensions as context
	function renderSingleValue(seldimensions, hrow, table, tableuri){
		var b = "";
		var curDim = "";
		var curVal = "";
		var matchRow = null;
		var matchDim = that.nonSelectedDimension(seldimensions, hrow);

		// find the matching cell where the other dimensions match both key and value
		for(row in table) { // scan all rows
			matchRow = null;
			for(v in table[row]) { // each cell
				curDim = that.trims(that.stripQuotes(v));
				curVal = that.trims(that.stripQuotes(table[row][v]));
				if(curDim !== matchDim) { // only compare selected dimensions for match
					if(seldimensions[curDim] === curVal) { // partial match, continue comparing
						matchRow = row;
					} 
					else { // partial non-match, stop comparing
						matchRow = null;
						break;
					}
				}
			}
			if(matchRow) break;
		}
		// given a match we render the value nicely with the other dimensions collapsed
		if(matchDim && matchRow){ 
			b = "<div class='pvalue'>";
			b += "<div class='vsel'><div>" + that.trims(that.stripQuotes(table[matchRow][matchDim]))  + "</div><div class='vseldim'>" + matchDim + "</div></div>";
			b += "<div class='vcontext'>" + renderSecondaryDimensionsSingleValue(seldimensions) + "</div>";
			b += "<div class='vsrc'><a href='" + tableuri.substring(0, tableuri.indexOf("#")) + "'>Data source ...</a></div>";
			b += "</div>";
		}
		else {
			b = "not found";
		}
		return b;
	}

	// renders the selected dimensions (secondary dimensions) for single-value rendering
	function renderSecondaryDimensionsSingleValue(seldimensions){
		var  b = "";
		for (sdim in seldimensions){
			b += "<div>" + sdim + ": " + seldimensions[sdim]  + "</div>";
		}
		return b;
	}

	// renders a table with two dimensions as a line chart
	function renderAsLineChart(seldimensions, xdim, ydim, table, tableuri){
		var b = "";
		var base = "https://chart.googleapis.com/chart?chs=400x300&cht=lc&chxt=x,y"; 
		var chrlabel = renderSecondaryDimensionsLineChart(seldimensions); // label for the chart
		var xvals = that.filterDimension(table, xdim, seldimensions);
		var yvals = that.filterDimension(table, ydim, seldimensions);
		var chr = base + chrlabel + chrXAxis(xvals) + chrScaleYAxis(that.filterDimension(table, ydim)) + chrYAxis(yvals); 
		b = "<div class='pvalue'>";
		b += "<div><img src='" + chr + "' /></div>";
		b += "<div class='vsrc'><a href='" + tableuri.substring(0, tableuri.indexOf("#")) + "'>Data source ...</a></div>";
		b += "</div>";
		return b;
	}

	// renders the selected dimensions (secondary dimensions) for line chart rendering
	function renderSecondaryDimensionsLineChart(seldimensions){
		var  b = "&chtt=";
		for (sdim in seldimensions){
			b +=  seldimensions[sdim]  + "/";
		}
		return b.substring(0, b.length - 1);
	}

	// chart helper functions
	function chrYAxis(yvalues){
		var yax = "&chd=t:";
		for (yv in yvalues){
			yvalues[yv] ? yax += yvalues[yv] + "," : yax +=  "0,";
		}
		return yax.substring(0, yax.length - 1); // remove the last ,
	}

	function chrXAxis(xvalues){
		var xax = "&chxl=0:|";	
		for (v in xvalues){
			xvalues[v] ? xax += that.stripQuotes(xvalues[v]) + "|" : xax += "?|";
		}
		return xax.substring(0, xax.length - 1); // remove the last |
	}

	function chrScaleYAxis(yvalues){
		var yaxisrange = "&chxr=1,";
		var yaxisscale = "&chds=";
		var min = Array.min(yvalues);
		var max = Array.max(yvalues);
		yaxisrange += min + "," + max + ",1"; // last param => step set to 1
		yaxisscale += min + "," + max;
		return yaxisrange +  yaxisscale;
	}	
};// end of Addrable client








