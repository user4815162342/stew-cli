var engine = require("../engine");
var manager = require("../manager");

module.exports = engine.asyncCommand(function(doc,name,cmd,cb) {
    manager.requireRelativeDoc(doc).nodeify(function(err,doc) {
        if (err) {
            return cb(err);
        }
        if (typeof doc === "undefined") {
            return cb(new engine.CommandError("Not in a stew project."));
        }
        doc.addDoc(name,function(err,doc) {
            if (err) {
                return cb(err);
            }
            console.log("Document created at " + doc.path());
            if (cmd) {
                switch (cmd) {
                    case "goto":
                        if (goto) {
                            // should be true if we're in the repl, at least.
                            // rather than try to mimic the command, just use it.
                            return cb(null,goto(doc));
                        }
                        break;
                }
            }
            return cb();
        });
    });
},function(doc,name,cmd) {
    if (arguments.length == 1) {
        name = doc;
        doc = void 0;
    }
    if (typeof name !== "string") {
        throw new engine.CommandError("Invalid name for document.");
    }
    if ((typeof cmd !== "undefined") &&
         (cmd !== null)) {
        if (typeof cmd === "string") {
            switch (cmd) {
                case "goto":
                    break;
                default:
                    throw new engine.CommandError("Invalid secondary command for create: " + cmd);
            }
        } else {
            throw new engine.CommandError("Invalid value for secondary command.");
        }
    }
    return [doc,name,cmd];
});

