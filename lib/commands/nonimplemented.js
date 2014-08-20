var engine = require("../engine");

/**
 * TODO: Anything which utilizes this command should eventually be finished,
 * until this file is no longer needed and can be deleted.
 * */

module.exports = engine.asyncCommand(function(cb) {
    cb(new engine.CommandError("Command is not implemented."));
},function() {
    throw new engine.CommandError("Command is not implemented.")
});


