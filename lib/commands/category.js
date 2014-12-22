var engine = require("../engine");
var manager = require("../manager");

/**
 * This is a temporary mechanism to make editing easier. It basically
 * just 'edits' the _stew.json and causes the cache to clear when that's
 * done.
 * */
 // TODO: Eventually, this needs to support a bunch of 'sub-commands'.
module.exports = engine.promiseCommand(function() {
    manager.requireProject().then(function(project) {
        if (typeof project === "undefined") {
            throw new engine.CommandError("Not in stew project.");
        }
        return manager.edit(path.join(project.basePath(),"_stew.json"),function() {
            project.clearCache();
            console.log("Cache cleared.");
        });
    });
},function() { return [] });
