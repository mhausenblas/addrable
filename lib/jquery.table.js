/*  Usage: $(selector).table(array, options)
    Creates a table inside the first element matched by selector, displaying contents of the array of arrays
    Options:
        noscroll  = don't scroll when user get's to bottom of the window
        maxshow   = number of rows to display per search
        matches   = array of function(value, regexp, searchfilter) for each column
        display   = array of function(value) for each column
    TODO:
        sort      = array of function(a,b) for each column to sort by
    TODO CSS:
        constant width
        right-align numerical columns

    Bugs: dropdowns look ugly
 */

(function($) {
    // fn.later(100, this, a,b,...) executes a this.fn(a,b,...) 100 milliseconds later
    Function.prototype.later = function() {
        var f = this,
            args = Array.prototype.slice.call(arguments),
            ms = args.shift(), obj = args.shift();
        if (f._timeout_id) { clearTimeout(f._timeout_id); }
        if (ms > 0) { f._timeout_id = setTimeout( function () { f.apply(obj, args); }, ms); }
    };
    Function.prototype.clear = function() {
        if (this._timeout_id) { clearTimeout(this._timeout_id); this._timeout_id = 0; }
    };

    /* http://blog.stevenlevithan.com/archives/faster-trim-javascript */
    if (!String.prototype.trim) {
        String.prototype.trim = function() { return this.replace(/^\s\s*/, "").replace(/\s\s*$/, ""); };
    }

    $.fn.extend({
        table: function(array, options) {
            var $header,            // Header input fields
                $results,           // DIV that contains the result tables
                shown,              // Number of rows shown so far
                next,               // Next data row to search in
                lastfilter,         // Array of parameters in $header last time search was called
                re,                 // Regular expressions of lastfilter (cached)
                hide,               // Whether to hide matching values or show matching values. Based on whether first char of filter is ! or not
                $suggest,           // Drop-down suggesting values
                suggestelem;        // Element on which dropdown was last invoked

            var header    = array[0].slice(0,array[0].length),
                cols      = header.length,
                rows      = array.length - 1,
                getval    = function () { return $(this).val(); },
                noscroll  = (options && options.noscroll ) || 0,    // Disable scroll at the bottom of the window
                matches   = (options && options.matches  ) || [],   // Array of fns that match a cell
                display   = (options && options.display  ) || [],   // Array of fns that show a cell
                maxshow   = (options && options.maxshow  ) || 100,  // Max rows to display per
                frequency = (options && options.frequency) || 0;    // Whether to do frequency analysis or not

            /* Column Analysis fields */
            var colIsNumber = [],   // colIsNumber[4] is true if column index 4 (5th column) is numeric, false otherwise
                freq = [],          // freq[4][val] is the of val in column index 4 (5th column)
                freqhtml = [],      // HTML showing top n items
                analysed = 0,       // Rows analysed so far
                maxanalysis = 1000; // Analyse 1000 rows at a time

            for (var j=0; j<cols; j++) { freq[j] = {}; colIsNumber[j] = false; }

            /*  search(-1) -- Restart search, no matter what
                search()   -- If filters haven't changed, does nothing. If not, restarts.
                search(1)  -- If filters haven't changed, extends current search. If not, restarts
            */
            function search(option) {
                // Get the filters entered by the user
                var filter = $header.map(getval).get();
                var restart = (option == -1) || !lastfilter || (lastfilter.join("") != filter.join(""));
                var extend  = (option == 1);

                if (restart) {
                    lastfilter = filter;
                    shown = next = 0;
                    re = [];
                    hide = [];
                    for (var j=0; j<cols; j++) {
                        if (filter[j].charAt(0) == '!') { hide[j] = 1; re[j] = new RegExp(filter[j].substr(1).trim(), "i"); }
                        else                            { hide[j] = 0; re[j] = new RegExp(filter[j].trim(), "i"); }
                    }
                }

                if (restart || extend) {
                    var html = ["<table><tbody>"];
                    ROWS: for (var i=next, shownnow=0, row; row = array[i]; i++) {
                        // Skip row if it doesn't match the filter (or matches the filter, and we want to hide those rows)
                        for (var j=0; j<cols; j++) {
                            var match = matches[j] ? matches[j](''+row[j] || "", re[j], filter[j]) : (''+row[j] || "").match(re[j]);
                            if (hide[j] ? match : !match) { continue ROWS; }
                        }

                        // If it does, display the row.
                        html.push("<tr>");
                        for (var j=0; j<cols; j++) {
                            html.push("<td class='", header[j], "'>",
                                      display[j] ? display[j](row[j] || "") : row[j] || "",
                                      "</td>");
                        }
                        html.push("</tr>");
                        shown++; shownnow++;

                        // Limit the number or rows shown each time.
                        if (shownnow >= maxshow) { break; }
                    }
                    next = i;
                    html.push("</tbody></table>");

                    if (extend) { $results.append(html.join("")); }
                    else        { $results.html  (html.join("")); }

                    // TODO: Align the widths of the columns
                }
            }

            /* Sort */
            function sort(elem) {
                var cls = $(elem).attr("class"),
                    col = $(elem).parent().attr("class").match(/col(\d\d*)/)[1],
                    num = colIsNumber[col];
                array.sort(
                    cls.match(/desc/) ? ( num ? function(a,b) { a = +a[col]; b = +b[col]; return a < b ? 1 : a > b ? -1 : 0; }
                                              : function(a,b) { a =  a[col]; b =  b[col]; return a < b ? 1 : a > b ? -1 : 0; } )
                                      : ( num ? function(a,b) { a = +a[col]; b = +b[col]; return a > b ? 1 : a < b ? -1 : 0; }
                                              : function(a,b) { a =  a[col]; b =  b[col]; return a > b ? 1 : a < b ? -1 : 0; } )
                );
            }

            /* Suggest top values for a column */
            function suggest(elem) {
                suggestelem = $(elem);
                var cls  = suggestelem.parent().attr("class"),
                    col  = +cls.match(/col(\d\d*)/)[1],
                    pos  = $header.eq(col).offset(),
                    h    = $header.eq(col).height();
                $suggest.css({left: pos.left + 'px', top: (pos.top + h + 2) + 'px'}).html(freqhtml[col]).show();
            }

            function unsuggest() {
                suggestelem = undefined;
                $suggest.hide();
            }

            /* Create header and body */
            function addheader(id) {
                for (var j=0; j<cols; j++) { header[j] = header[j].trim().replace(/\s/g, "_"); }
                var html = ["<table><thead>"];
                for (var row=array[0],j=0,lj=row.length; j<lj; j++) {
                    html.push("<th class='", header[j], " col", j, "'>", row[j], " ",
                        "<span class='sort asc' title='sort ascending'>&#x25b2;</span>",
                        "<span class='sort desc' title='sort descending'>&#x25bc;</span>",
                        // "<span class='sort asc' title='sort ascending'>&#9652;</span>",
                        // "<span class='sort desc' title='sort descending'>&#9662;</span>",
                        "<br/><input></input></th>");
                }
                html.push("</thead></table>");
                $header = $(html.join(""))
                    .appendTo(id)
                    .find("span.sort")
                        .click(function() { sort(this); search(-1); })
                        .css({cursor: 'pointer'})
                    .end()
                    .find("input")
                        .css("width", "95%")
                        .keyup(function (e) {               // Use keyup to detect backspaces that clear the field. keypress won't do this.
                            suggest.clear();
                            if (e.keyCode == 40) { suggest(this); }
                            else { unsuggest(); search.later(200); }
                        })
                        .focus(function (e) { suggest.later(2000, window, this); })
                        .blur(function() { unsuggest.later(200); });

                array.shift();                              // Remove the header row. Don't want it interfering with sort.
                $results = $("<div></div>").appendTo(id);   // Create the results placeholder and search
            }

            /* Analyse frequency */
            function analyse(col, fully) {
                var freqshow = 20,                                  // Show top 20 items
                    freqmax  = fully ? Infinity : 200,              // Analyse finite distinct items per column, unless it's a full analysis
                    l = fully ? rows : rows < 5000 ? rows : 5000;   // Analyse up to 5000 rows, unless it's a full analysis
                    f = freq[col],
                    vals = [];
                for (var i=0, n=0; (n < freqmax) && (i<l); i++) {
                    var cell = array[i][col];
                    if (cell) {
                        if (!isFinite(cell)) { colIsNumber[col] = -1; }
                        if (!f[cell]) { f[cell] = 1; vals.push(cell); n++; }
                        else { f[cell]++; }
                    }
                }
                vals.sort(function(a,b) { a = f[a]; b = f[b]; return a < b ? 1 : a > b ? -1 : 0; });
                for (var html=[],i=0, l=vals.length, max=f[vals[0]] || 1; i<freqshow && i<l; i++) {
                    var w = Math.round(f[vals[i]] / max * 100);
                    html.push('<div>', vals[i], '</div>');
                }
                freqhtml[col] = html.join('');
                colIsNumber[col] = colIsNumber[col] == -1 ? false : true;
            }

            var id = this.eq(0).html("")
                .css("table-layout", "fixed");      // Force fixed layout, otherwise column alignment will go for a toss.
            addheader(id);
            for (var j=0; j<cols; j++) { analyse(j, true); }
            search(-1);


            $suggest = $('<div></div>')
                .css({position:'absolute', border:'1px solid #ccc', 'background-color':'#fff', padding: '0 5px'})
                .appendTo(document.body)
                .click(function(e) {        // If user clicks on suggestion, search for it
                    if (suggestelem) {
                        suggestelem.val($(e.target).text());
                        search();
                    }
                    unsuggest();
                })
                .hide();

            // Scrolling will continue the search. If you have multiple tables, it'll continue ALL the searches, but that's OK.
            if (!noscroll) {
                $(window).scroll(function(e) {
                    var scrollX = window.pageYOffset || document.documentElement && document.documentElement.scrollTop    || document.body.scrollTop || 0,
                        height  = window.innerHeight || document.documentElement && document.documentElement.clientHeight || document.body.clientHeight || 0;
                    if (scrollX + height + 100 >= id.offset().top + id.height()) { search(1); }
                });
            }

            return this;
        }
    });
}) (jQuery);
