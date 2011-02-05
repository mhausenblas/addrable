//////////////////////////////////////////////////////////
// Addrable client
//
// Michael Hausenblas, 2011.
//

// renders slices in one of three modes: single value, line chart or table, depending on selected dimensions
Addrable.render = function(tableuri, outputid) {
	var that = this;
	
	$.ajax({
		url : tableuri,
		success : function(data) {
			var successful = false;
			
			if(that.isAddrable(tableuri)) { // we have an Addrable, process it ...
				that.processAddrable(data, tableuri, processcol, processrow, processwhere, outputid) ? successful = true : successful = false ;
				if(!successful) $(outputid).html("<div style='border: 1px solid red; background: #fafafa; font-family: monospace; font-size: 90%; padding: 3px;'>Sorry, I can't process the Addrable - either the selector is invalid or it didn't match anything in the CSV file.</div>");
			}
			else { // ... render entire table
				$(outputid).table($.csv()(data));
			}
		},
		error: function(xhr, textStatus, errorThrown){
			alert("Error: " + textStatus);
		}
	});

	////////////////////////////////////
	// Addrable client helper functions
	//

	// processes the column selection case on the client-side
	function processcol(data, selcol, outputid){
		var output = $(outputid);
		var hrow = null; // the entire header row (column heads)
		var fulltable = null; // the entire table
		var b = "<div class='colvalues'>";
		
		if(selcol === "*"){ // return header row
			hrow =  that.trimHeader($.csv()(data)[0]); // retrieve header row
			for(h in hrow){
				b += "<span class='colvalue'>" + hrow[h] + "</span>";
			}
		}
		else { // select values from the column
			fulltable = $.csv2json()(data); // parse data into array
			for(row in fulltable) {
				b += "<div class='rowvalue'>" + fulltable[row][selcol] + "</div>";
			}
			
		}
		output.html(b + "</div>");
		return true;
	}

	// processes the row selection case on the client-side
	function processrow(data, selrow, outputid){
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
	}
	
	// processes the indirect selection case on the client-side
	function processwhere(data, seldimensions, outputid){
		var output = $(outputid);
		var hrow = null; // the entire header row (column heads)
		var hfrow = null; // the header row w/o the selected dimension (if only one is selected)
		var fulltable = null; // the entire table
		var xdim = "";
		var ydim = "";
			
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
		return true;
	}
	
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
			b = "<div class='pvalue'><div class='vsel'>not found</div></div>";
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








