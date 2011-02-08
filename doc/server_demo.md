# Addrable server demo

## Entire file

If you select an entire file like:

    curl http://127.0.0.1:8086/http%3A%2F%2F127.0.0.1%3A8086%2Fdata%2Ftable1.csv

it results in a 200 and content served as CSV (`text/csv`):
    
    "city","person","visits"
    "Berlin","Richard",20
    "London","Richard",2
    "Rom","Richard",1
    "Berlin","Michael",4
    "London","Michael",10
    "Rom","Michael",2

## Column selection

* `curl http://127.0.0.1:8086/http%3A%2F%2F127.0.0.1%3A8086%2Fdata%2Ftable2.csv%23col%3A%2A` ... VALID (200, header in JSON)
* `curl http://127.0.0.1:8086/http%3A%2F%2F127.0.0.1%3A8086%2Fdata%2Ftable2.csv%23col%3Atemperature` ... VALID (200, column in JSON)
* `curl http://127.0.0.1:8086/http%3A%2F%2F127.0.0.1%3A8086%2Fdata%2Ftable2.csv%23col%3Ate` ... INVALID (404)


## Row selection

* `curl http://127.0.0.1:8086/http%3A%2F%2F127.0.0.1%3A8086%2Fdata%2Ftable2.csv%23row%3A%2A` ... VALID (200, number of rows in JSON)
* `curl http://127.0.0.1:8086/http%3A%2F%2F127.0.0.1%3A8086%2Fdata%2Ftable2.csv%23row%3A1` ... VALID (200, row number 1 in JSON)
* `curl http://127.0.0.1:8086/http%3A%2F%2F127.0.0.1%3A8086%2Fdata%2Ftable2.csv%23row%3A20` ... INVALID (404, row index out of range)
* `curl http://127.0.0.1:8086/http%3A%2F%2F127.0.0.1%3A8086%2Fdata%2Ftable2.csv%23row%3Aabc` ... INVALID (404, row index invalid)

## Indirect selection

* `curl http://127.0.0.1:8086/http%3A%2F%2F127.0.0.1%3A8086%2Fdata%2Ftable2.csv%23where%3Acity%3DGalway%2Cdate%3D2011-03-01%2Creporter%3DRichard` ... VALID (200, one remaining column in JSON)
* `curl http://127.0.0.1:8086/http%3A%2F%2F127.0.0.1%3A8086%2Fdata%2Ftable2.csv%23where%3Acity%3DGalway%2Creporter%3DRichard` ... VALID (200, two remaining columns in JSON)
* `curl http://127.0.0.1:8086/http%3A%2F%2F127.0.0.1%3A8086%2Fdata%2Ftable2.csv%23where%3Acity%3DGalway` ... VALID (200, three remaining columns in JSON)
