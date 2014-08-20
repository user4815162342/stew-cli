var engine = require("../engine");
var manager = require("../manager");

module.exports = engine.asyncCommand(function(doc,name,cb) {
    manager.requireRelativeDoc(doc,function(err,doc) {
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
            manager.changeWorkingDoc(doc,cb);
        });
    });
},function(doc,name) {
    if (arguments.length == 1) {
        name = doc;
        doc = void 0;
    }
    if (typeof name !== "string") {
        throw new engine.CommandError("Invalid name for document.");
    }
    return [doc,name];
});

