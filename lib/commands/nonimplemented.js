var engine = require("../engine");
var Q = require('q');

/**
 * TODO: Anything which utilizes this command should eventually be finished,
 * until this file is no longer needed and can be deleted.
 * */

module.exports = engine.promiseCommand(function() {
    return Q.reject(new engine.CommandError("Command is not implemented."));
},function() {
    throw new engine.CommandError("Command is not implemented.")
});


