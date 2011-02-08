# Addrable server demo

## Tests

Entire file:

    curl http://127.0.0.1:8086/http%3A%2F%2F127.0.0.1%3A8086%2Fdata%2Ftable1.csv

results in a 200 and content as CSV:
    
    "city","person","visits"
    "Berlin","Richard",20
    "London","Richard",2
    "Rom","Richard",1
    "Berlin","Michael",4
    "London","Michael",10
    "Rom","Michael",2

### Column selection

* `curl http://127.0.0.1:8086/http%3A%2F%2F127.0.0.1%3A8086%2Fdata%2Ftable2.csv%23col%3A%2A` ... VALID (200, header in JSON)
* `curl http://127.0.0.1:8086/http%3A%2F%2F127.0.0.1%3A8086%2Fdata%2Ftable2.csv%23col%3Atemperature` ... VALID (200, column in JSON)
* `curl http://127.0.0.1:8086/http%3A%2F%2F127.0.0.1%3A8086%2Fdata%2Ftable2.csv%23col%3Ate` ... INVALID (404)


### Row selection

* `curl http://127.0.0.1:8086/http%3A%2F%2F127.0.0.1%3A8086%2Fdata%2Ftable2.csv%23row%3A%2A` ... VALID (200, number of rows in JSON)
* `curl http://127.0.0.1:8086/http%3A%2F%2F127.0.0.1%3A8086%2Fdata%2Ftable2.csv%23row%3A1` ... VALID (200, row number 1 in JSON)
* `curl http://127.0.0.1:8086/http%3A%2F%2F127.0.0.1%3A8086%2Fdata%2Ftable2.csv%23row%3A20` ... INVALID (404, row index out of range)
* `curl http://127.0.0.1:8086/http%3A%2F%2F127.0.0.1%3A8086%2Fdata%2Ftable2.csv%23row%3Aabc` ... INVALID (404, row index invalid)