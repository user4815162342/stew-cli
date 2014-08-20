var engine = require("../engine");

/*
 * synchronous commands are easier to do, but should be avoided in
 * cases where something *can* be done asynchronously. (Avoid a command
 * that runs fs.readdirsync, and use a command that can run fs.readdir
 * with a callback instead).
 * 
 * You should still make sure validation handles strings, and strings
 * (or arrays of strings) are the only result, since that's how things
 * are output. This is the same as in asyncTest.
 * */
module.exports = function(message) {
    if (message === "break") {
        throw new engine.CommandError("Broken message");
    } 
    if (typeof message === "undefined") {
        message = "...WOOOOAAAH!!!!"
    }
    return ["                 !!!!K3WL D000DZ!!!",
             "  //  _   _   _   _   &@  _   _   _   _   _   _   _//",
             " //                 &@@&>>>> \\\\o===----=o=>       //",
             message,
             "that was one FAAASSST CAAAARRRRR!"];
}
