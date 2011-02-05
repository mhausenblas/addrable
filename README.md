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

Which would result, not very surprisingly, in the value `20`. You're now equipped with the Addrables basics, but if you want to dive into the details, you might want to have a look at the [Addrable addressing scheme and syntax](https://github.com/mhausenblas/addrable/blob/master/doc/addrable_syntax.md).


## What does it offer?

Addrable is a 100% JavaScript library for either client-side or server-side processing of tabular data. The result of the selection via an Addrable depends on the mode: on the client-side (in a browser) the selected slices are rendered visually, on the server-side, the slices are delivered as JSON. Both client and server implementations share a common [core Addrable](https://github.com/mhausenblas/addrable/raw/master/addrable-core.js) functionality. So, the Addrable library essentially contains:

* `addrable-core.js`, providing generic methods to parse the slice's addressing and filtering of the data.
* `addrable-client.js`, a [jQuery](http://jquery.com/)-based implementation that renders slices in various ways.
* `addrable-server.js`, a [node.js](http://nodejs.org/)-based implementation that returns slices in JSON.

## How can I use it?

To better understand how Addrable works, you might want run the following examples either using the client demo (in your browser) or the server demo (using the command-line).

### Client-side

As already mentioned, the client is implemented using jQuery and a jQuery plug-in, see the [lib/](https://github.com/mhausenblas/addrable/tree/master/lib) directory for details. To play around with the client demo, simply grab the content of the repository via git clone or [download it](https://github.com/mhausenblas/addrable/archives/master) and point your browser to `index.html`. 

#### Examples
Try the following Addrables:

* `data/table2.csv#col:*`
* `data/table2.csv#col:temperature`
* `data/table2.csv#row:*`
* `data/table2.csv#row:10`
* `data/table2.csv#where:city=Galway,date=2011-03-01,reporter=Richard`
* `data/table2.csv#where:city=Galway,reporter=Richard`
* `data/table2.csv#where:city=Galway`

#### Dependencies

I've tested it with jQuery 1.4.2 and the [js-tables](http://code.google.com/p/js-tables/) plug-in (which you can find in the `lib/` directory) under MacOS X 10.5.8/Firefox 3.6.13. **Note for Chrome users**: to use the Addrable client demo under Chrome you must enable access from local files due to a [known issue](http://code.google.com/p/chromium/issues/detail?id=40787):
    
    $ cd "/Applications/Google Chrome.app/Contents/MacOS/"
    $ sudo mv "Google Chrome" Google.real
    $ sudo printf '#!/bin/bash\ncd "/Applications/Google Chrome.app/Contents/MacOS"\n"/Applications/Google Chrome.app/Contents/MacOS/Google.real"  --allow-file-access-from-files "$@"\n' > Google\ Chrome
    $ chmod 755 "Google Chrome"

### Server-side

On the server, you need to have node.js [installed](https://github.com/ry/node/wiki/Installation). You can then run the Addrable server demo:

    $ node addrable-node.js 
    Addrable server running and listening on port 8086 ...
    Using: Addrable v0.1

Once you've started the Addrable server demo, you can use, for example `curl` to resolve Addrables, for example:

    $ curl http://127.0.0.1:8086/http%3A%2F%2F127.0.0.1%3A8086%2Fdata%2Ftable1.csv

#### Dependencies

I've tested it with node-v0.2.6 and curl under MacOS X 10.5.8. *Note that the server-side is not yet fully functional, but I'm working on it ;)*


## Acknowledgements
The following people influenced the design of Addrable and came up with improvements: [Richard Cyganiak](https://github.com/cygri) for the initial idea of how to render slices as well as for his proposal to extend Addrables to address rows; [KevBurnsJr](https://github.com/KevBurnsJr) for pointing out the similarity with [JSON hyper-schema](http://tools.ietf.org/html/draft-zyp-json-schema) and for the Addrable sales-pitch 'a CSV query interface implemented in URL fragments'. 

## License

Addrable is Public Domain - see [UNLICENSE](https://github.com/mhausenblas/addrable/raw/master/UNLICENSE) for more details.
