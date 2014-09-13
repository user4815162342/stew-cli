var core = require("stew-core");
var engine = require("../engine");
var manager = require("../manager");
var path = require("path");

module.exports = engine.asyncCommand(function(p,dontSearch,cb) {
    p = path.resolve(process.cwd(),p);
    core.open(p,dontSearch,function(err,result) {
        if ((err instanceof core.StewError) && (err.code === "STEW NOT FOUND")) {
            return cb(new engine.CommandError("No stew project was found at " + (dontSearch ? "" : "or above ") + p,err.code));
        }
        if (!err) {
            manager.setProject(result);
        }
        console.log("Project opened at: ",result.basePath());
        return cb(err,result);
    });
},function(p,dontSearch) {
    if (typeof dontSearch === "undefined") {
        dontSearch = false;
    } else {
        dontSearch = engine.toBoolean(dontSearch);
    }
    return [path.resolve(process.cwd(),p || ""),dontSearch];
});

