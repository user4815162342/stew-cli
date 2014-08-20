var engine = require("../engine");

/**
 * Note a few things that this does...
 * 1. verify that the callback is in the right location, look at the
 * end of the arguments array if you are allowing variadic arguments.
 * 2. argument validation (synchronous, at least) should be done in a 
 * separate validate command, that way you can throw an error immediately
 * if there is something invalid. Validation errors *should* be CommandErrors.
 * The callback is checked prior to this function, so don't worry about
 * that if the user does something silly like call command().run().
 * 3. Other errors are programmer errors, and should *not* be CommandErrors.
 * But should be called back.
 * 4. When validating arguments, you should always be able to accept strings,
 * since that's what's going to happen when the command is called from
 * the command line.
 * 5. Keep in mind that something might be running from the command line,
 * meaning strings are the best way to return results. Arrays will also
 * be joined with linefeeds. Other objects will not be util.inspected,
 * they will be toStringed.
 * */
module.exports = engine.asyncCommand(function(timeout,message,cb) {
    // validator ensures that we've got exactly the right arguments, so
    // don't need to check, expand or anything them. 
    setTimeout(function() {
        if (timeout > 5000) {
            // this should cause an error. It's an example of
            // what would happen if there's a programmer error.
            // (in this case, calling a function that doesn't exist).
            try {
                timeout.thisfunctiondoesnotexist();
            } catch (e) {
                return cb(e);
            }
            cb(null,"Timeout was too high.");
        } else {
            return cb(null,message);
        }
    },Math.min(timeout,5000));
},function(timeout,message) {
    if (typeof timeout === "undefined") {
        throw new engine.CommandError("timeout not specified");
    } 
    // don't assume that timeout is an actual number, it might be a string.
    // (I parse them with Number, not with parseFloat, as parseFloat ignores
    // non-numeric content after the number).
    timeout = Number(timeout);
    if (isNaN(timeout)) {
        throw new engine.CommandError("Invalid value for timeout");
    }
    // this is an example of what to do if the argument is optional.as
    if (typeof message === "undefined") {
        message = "Ahoy! How be ye?";
    }
    return [timeout,message];    
});
