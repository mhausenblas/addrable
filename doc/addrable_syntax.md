# Addressing scheme and syntax

So after you've seen how it works in practice, you might now be interested what happens behind the scenes?
The basic idea behind Addrables is that we use the so-called [fragment identifier component](http://tools.ietf.org/html/rfc3986#section-3.5) of a URI, the string following the **#**: for `http://example.org:80/data#key=value` this would be `key=value`. The fragment identifier is not transmitted to the server, though can be used by the client to perform some [pretty awesome things](http://www.w3.org/2001/tag/2011/01/HashInURI-20110115). 

## Basics
Due to the fact that the fragment identifier is not sent to the server and because the CSV media type (see [RFC4180][RFC4180]) does not specify the meaning of a fragment identifier, we can use it amongst other things to address into a CSV file. In general, a HTTP URI (based on [RFC3986][RFC3986] and [RFC2616][RFC2616]) has the following form:

    URI = "http://" authority path [ "?" query ] "#" fragment

An Addrable URI is an HTTP URI with:

* a certain `authority` component, typically containing a host and port, such as `example.org:80`,
* a `path` component, such as `/data`,
* an optional `query` part, for example `?abc`, and
* the `fragment` identifier that encodes a selected slice, column or row of the target CSV file

## Addressing scheme

The Addrable allows for one of the following three selections:

### Column selection

Begins with `col:`, where the value is either:

* one the values from the CSV file header row, in which case the respective column is selected and all rows of this columns are returned, or 
* the character `*`, meaning that the entire header row (all columns) are returned.

Examples for *column selection* against the [target table](https://github.com/mhausenblas/addrable/raw/master/data/table1.csv) introduced in the example above:

* `col:city` ... VALID column selection, yields [Berlin, London, Rom, Berlin, London, Rom]
* `col:*` ... VALID column selection, yields [city, person, visits]
* `col:` ... INVALID column selection as the value for the column is missing
* `col:meh` ... INVALID column selection as the column doesn't exist in the target table

### Row selection

Begins with `row:`, where the value is either:

* a non-negative integer, denoting the row to select (starting with 0) - if the row exists, the entire row is returned, or
* the character `*`, meaning that the number of rows is returned as an integer value.

Examples for *row selection* against the [target table](https://github.com/mhausenblas/addrable/raw/master/data/table1.csv) introduced in the example above:

* `row:2` ... VALID row selection, yields [Rom, Richard, 1]
* `row:*` ... VALID row selection, yields 6
* `row:` ... INVALID row selection as the value for the row is missing
* `row:42` ... INVALID row selection as the row doesn't exist in the target table

### Indirect selection

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

## Addrable syntax
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

[RFC2616]: http://tools.ietf.org/html/rfc2616 (Hypertext Transfer Protocol -- HTTP/1.1)
[RFC3986]: http://tools.ietf.org/html/rfc3986 (Uniform Resource Identifier (URI): Generic Syntax)
[RFC4180]: http://tools.ietf.org/html/rfc4180 (Common Format and MIME Type for Comma-Separated Values (CSV) Files)
[RFC5234]: http://tools.ietf.org/html/rfc5234 (Augmented BNF for Syntax Specifications: ABNF)