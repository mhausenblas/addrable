# Addrable

All over the Web you can find [rectangular](http://webofdata.wordpress.com/2010/04/14/oh-it-is-data-on-the-web/#comment-437) data in [CSV files](http://www.google.com/search?q=filetype%3Acsv). Typically, this data is treated in its entirety, meaning you retrieve the entire CSV file and then you deal with it in your application. But that's not very [webby](http://webofdata.wordpress.com/2010/03/01/data-and-the-web-choices/).

Wouldn't it be nicer to be able to address parts of a table, like certain columns or rows? Now you can, with Addrables!

## How does this work?
 Addrable is short for **Addr**essable T**able** - essentially making parts of a table addressable via URIs. OK, sounds nice in theory, but how does it work? Well, take a look at this [example table](https://github.com/mhausenblas/addrable/raw/master/data/table1.csv):

    city    person   visits
    ----------------------
    Berlin  Richard  20
    London  Richard  2
    Rom     Richard  1
    Berlin  Michael  4
    London  Michael  10
    Rom     Michael  2

Now, imagine you're only interested in the part of the table where the `city` column has the value `Berlin`. With Addrables, you'd state this as follows:

    table1.csv#where:city=Berlin

This would yield the following part of the table (called slice, here):

    person   visits
    ---------------
    Richard  20
    Michael  4

But you can also go a step further, for example addressing a single value, if you specify all but one of the columns (called dimension, here) of a table, like so: 

    table1.csv#where:city=Berlin,person=Richard

Which would result, not very surprisingly, in the value `20`.

## What does it offer?

Addrable is a 100% JavaScript library for either client-side or server-side processing of tabular data. The result of the selection via an Addrable depends on the mode: on the client-side (in a browser) the selected slices are rendered visually, on the server-side, the slices are delivered as JSON. Both client and server implementations share a common [core Addrable](https://github.com/mhausenblas/addrable/raw/master/addrable-core.js) functionality. So, the Addrable library essentially contains:

* `addrable-core.js`, providing generic methods to parse the slice's addressing and filtering of the data.
* `addrable-client.js`, a [jQuery](http://jquery.com/)-based implementation that renders slices in various ways.
* `addrable-server.js`, a [node.js](http://nodejs.org/)-based implementation that returns slices in JSON.

## Dependencies

* Client-side: tested with jQuery 1.4.2 and the [js-tables](http://code.google.com/p/js-tables/) plug-in
* Server-side: tested with node-v0.2.6

## How can I use it?

To better understand how Addrable works, you might want run the following examples.

### Client-side

As already mentioned, the client is implemented using jQuery and a jQuery plug-in, see the [lib/](https://github.com/mhausenblas/addrable/tree/master/lib) directory for details. To play around with the client demo, simply grab the content of the repository via git clone or [download it](https://github.com/mhausenblas/addrable/archives/master) and point your browser to `index.html`. Try the following Addrables:

* `data/table2.csv#where:city=Galway,date=2011-03-01,reporter=Richard`
* `data/table2.csv#where:city=Galway,reporter=Richard`
* `data/table2.csv#where:city=Galway`

### Note for Chrome users

To use the Addrable client demo under Chrome you must enable access from local files due to a [known issue](http://code.google.com/p/chromium/issues/detail?id=40787):
    
    $ cd "/Applications/Google Chrome.app/Contents/MacOS/"
    $ sudo mv "Google Chrome" Google.real
    $ sudo printf '#!/bin/bash\ncd "/Applications/Google Chrome.app/Contents/MacOS"\n"/Applications/Google Chrome.app/Contents/MacOS/Google.real"  --allow-file-access-from-files "$@"\n' > Google\ Chrome
    $ chmod 755 "Google Chrome"

### Server-side

On the server, you need to have node.js [installed](https://github.com/ry/node/wiki/Installation). You can then run the Addrable server demo:

    $ node addrable-node.js 
    Addrable server running and listening on port 8086 ...
    Using: Addrable v0.1

Note that the server-side is not yet fully functional. I'm working on it ;)

## Addrable addressing scheme

So after you've seen how it works in practice, you might now be interested what happens behind the scenes?
The basic idea behind Addrables is that we use the so-called [fragment identifier component](http://tools.ietf.org/html/rfc3986#section-3.5) of a URI, the string following the **#**: for `http://example.org:80/data#key=value` this would be `key=value`. The fragment identifier is not transmitted to the server, though can be used by the client to perform some awesome things ([read more ...](http://www.w3.org/2001/tag/2011/01/HashInURI-20110115)). 

### Basics
Due to the fact that the fragment identifier is not sent to the server and because the CSV media type (see [RFC4180][RFC4180]) does not specify the meaning of a fragment identifier, we can use it amongst other things to address into a CSV file. In general, a HTTP URI (based on [RFC3986][RFC3986] and [RFC2616][RFC2616]) has the following form:

    URI = "http://" authority path [ "?" query ] "#" fragment

An Addrable URI is an HTTP URI with:

* a certain `authority` component, typically containing a host and port, such as `example.org:80`,
* a `path` component, such as `/data`,
* an optional `query` part, for example `?abc`, and
* the `fragment` identifier that encodes a selected slice, column or row of the target CSV file

### Addrable addressing

The Addrable allows for one of the following three selections:

#### Column selection

Begins with `col:`, where the value is either:

* one the values from the CSV file header row, in which case the respective column is selected and all rows of this columns are returned, or 
* the character `*`, meaning that the entire header row (all columns) are returned.

Examples for *column selection* against the [target table](https://github.com/mhausenblas/addrable/raw/master/data/table1.csv) introduced in the example above:

* `col:city` ... VALID column selection, yields [Berlin, London, Rom, Berlin, London, Rom]
* `col:*` ... VALID column selection, yields [city, person, visits]
* `col:` ... INVALID column selection as the value for the column is missing
* `col:meh` ... INVALID column selection as the column doesn't exist in the target table

#### Row selection

Begins with `row:`, where the value is either:

* a non-negative integer, denoting the row to select (starting with 0) - if the row exists, the entire row is returned, or
* the character `*`, meaning that the number of rows is returned as an integer value.

Examples for *row selection* against the [target table](https://github.com/mhausenblas/addrable/raw/master/data/table1.csv) introduced in the example above:

* `row:2` ... VALID row selection, yields [Rom, Richard, 1]
* `row:*` ... VALID row selection, yields 6
* `row:` ... INVALID row selection as the value for the row is missing
* `row:42` ... INVALID row selection as the row doesn't exist in the target table

#### Indirect selection

Begins with with `where:`, with a comma-separated list of column-value pairs where:

* `col`, being one of the values from the CSV file header row (aka as column), occurring at most once, and
* `val`, which is a value in the respective selected column of a non-header row in the CSV file, 
* separated by an equal sign `=` 

Examples for *indirect selection* against the [target table](https://github.com/mhausenblas/addrable/raw/master/data/table1.csv) introduced in the example above:

* `where:city=Berlin` ... VALID indirect selection (see introductory example for result)
* `where:city=Berlin,city=Galway` ... INVALID indirect selection as `city` can only occur once
* `where:city=` ... INVALID indirect selection as the value is missing
* `where:=Berlin` ... INVALID indirect selection as the value for the column is missing
* `where:number=20` ... INVALID indirect selection as the column doesn't exist in the target table

#### Addrable syntax
A fragment identifier in Addrable is interpreted according to the following syntax (given in ABNF, as per [RFC5234][RFC5234]):

    addrable =  wheresel / colsel / rowsel ; top-level production
    wheresel = "where:" kvpairs ; indirect selection 
    colsel   = "col:" colspec ; column-selection
    rowsel   = "row:" rowspec ; row-selection
    kvpairs = 1*( col "=" val 0*1(",") ) 
    col = 1*TEXTDATA
    val = 1*TEXTDATA
    colspec = "*" / column 
    rowspec = "*" / rownum
    column = 1*TEXTDATA
    rownum = 1*DIGIT
    ;;; TERMINALS ;;;
    TEXTDATA =  %x23-2B / %x2D-3C / %x3E-7E  ; per RFC4180 (CSV format) but exclude ' ' (space) and '='
    DIGIT =  %x30-39 ; the digits 0-9 (cf. RFC5234 core rules)


## Acknowledgements
The following people influenced the design of Addrable and came up with improvements: [Richard Cyganiak](https://github.com/cygri) for the initial idea of how to render slices as well as for his proposal to extend Addrables to address rows; [KevBurnsJr](https://github.com/KevBurnsJr) for pointing out the similarity with [JSON hyper-schema](http://tools.ietf.org/html/draft-zyp-json-schema) and for the Addrable sales-pitch 'a CSV query interface implemented in URL fragments'. 

## License

Addrable is Public Domain - see [UNLICENSE](https://github.com/mhausenblas/addrable/raw/master/UNLICENSE) for more details.

[RFC2616]: http://tools.ietf.org/html/rfc2616 (Hypertext Transfer Protocol -- HTTP/1.1)
[RFC3986]: http://tools.ietf.org/html/rfc3986 (Uniform Resource Identifier (URI): Generic Syntax)
[RFC4180]: http://tools.ietf.org/html/rfc4180 (Common Format and MIME Type for Comma-Separated Values (CSV) Files)
[RFC5234]: http://tools.ietf.org/html/rfc5234 (Augmented BNF for Syntax Specifications: ABNF)