var engine = require("../engine");
var manager = require("../manager");

module.exports = engine.promiseCommand(function(doc,name,cmd,cb) {
    return manager.requireRelativeDoc(doc).then(function(doc) {
        if (typeof doc === "undefined") {
            throw new engine.CommandError("Not in a stew project.");
        }
        return doc.addDoc(name).then(function(doc) {
            console.log("Document created at " + doc.path());
            if (cmd) {
                switch (cmd) {
                    case "goto":
                        if (goto) {
                            // should be true if we're in the repl, at least.
                            // rather than try to mimic the command, just use it.
                            return goto(doc);
                        }
                        break;
                }
            }
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

