var core = require("stew-core");
var engine = require("../engine");
var manager = require("../manager");
var path = require("path");

module.exports = engine.promiseCommand(function(p,dontSearch) {
    p = path.resolve(process.cwd(),p);
    return core.open(p,dontSearch).then(function(result) {
        manager.setProject(result);
        console.log("Project opened at: ",result.basePath());
        return result;
    },function(err) {
        if ((err instanceof core.StewError) && (err.code === "STEW NOT FOUND")) {
            throw new engine.CommandError("No stew project was found at " + (dontSearch ? "" : "or above ") + p,err.code);
        }
    });
},function(p,dontSearch) {
    if (typeof dontSearch === "undefined") {
        dontSearch = false;
    } else {
        dontSearch = engine.toBoolean(dontSearch);
    }
    return [path.resolve(process.cwd(),p || ""),dontSearch];
});

