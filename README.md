Addrable
========

All over the Web one finds tabular data in CSV files. This library enables both client-side (jQuery-based) and server-side (node.js-based) processing of tabular data. With a selector URI, certain parts (so called slices) can be selected. The result of the selection depends on the mode; in a browser, visual rendering occurs, used on the server, the data is delivered as JSON.

Layout:

* Addrable Library
  * addrable-core.js
  * addrable-client.js
  * addrable-server.js
* Demo
  * client-side: index.html and lib/
  * server-side: addrable-node.js
  * see also data/ directory for examples

Example Usages:

* data/table1.csv#city=Berlin,person=Richard
* data/table2.csv#city=Galway,date=2011-03-01,reporter=Richard


Dependencies:

* client-side: jQuery and CSV/table plugins (see lib/ directory)
* server-side: node.js

Note:

Under Chrome, due to a [known issue](http://code.google.com/p/chromium/issues/detail?id=40787) you must enable access from local files:
    
    $ cd "/Applications/Google Chrome.app/Contents/MacOS/"
    $ sudo mv "Google Chrome" Google.real
    $ sudo printf '#!/bin/bash\ncd "/Applications/Google Chrome.app/Contents/MacOS"\n"/Applications/Google Chrome.app/Contents/MacOS/Google.real"  --allow-file-access-from-files "$@"\n' > Google\ Chrome
    $ chmod 755 "Google Chrome"