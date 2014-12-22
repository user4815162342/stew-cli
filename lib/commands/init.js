var core = require("stew-core");
var engine = require("../engine");
var manager = require("../manager");
var path = require("path");

module.exports = engine.promiseCommand(function(p) {
    p = path.resolve(process.cwd(),p);
    return engine.callbackToPromise(core.init,core)(p).then(function(result) {
        manager.setProject(result);
        console.log("Project created at: " + result.basePath());
        return result;
    },function(err) {
        if ((err instanceof core.StewError) && (err.code === "STEW ALREADY EXISTS")) {
            throw new engine.CommandError("Path " + p + " is already part of a stew project ");
        }
    });
},function(p) {
    return [path.resolve(process.cwd(),p || "")];
});


