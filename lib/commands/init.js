var core = require("stew-core");
var engine = require("../engine");
var manager = require("../manager");

module.exports = engine.asyncCommand(function(p,cb) {
    p = path.resolve(process.cwd(),p);
    core.init(p,function(err,result) {
        if ((err instanceof core.StewError) && (err.code === "STEW ALREADY EXISTS")) {
            return cb(new engine.CommandError("Path " + p + " is already part of a stew project "));
        }
        if (!err) {
            manager.setProject(result);
        }
        console.log("Project created at: " + result.rootPath());
        return cb(err,result);
    });
},function(p) {
    return [path.resolve(process.cwd(),p || "")];
});


