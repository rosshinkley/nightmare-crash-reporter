// This script is used to start nightmare 
// but then throw a user space error
// this trips the uncaught exception handler
var Nightmare = require('nightmare');
require('../../nightmare-crash-reporter')(Nightmare);
var nightmare = Nightmare();
nightmare.crashReporter({})
  .then(function(port) {
    console.log(port);
    setImmediate(() => {
      throw new Error("uncaught");
    });
  });
