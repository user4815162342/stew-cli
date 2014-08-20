var engine = require("../engine");
var manager = require("../manager");
var path = require("path");

// TODO: Eventually, this must take arguments:
// 1. An optional doc to look in.
// 2. A filter function
// See manual.md
module.exports = engine.asyncCommand(function(cb) {
    manager.requireWorkingDoc(function(err,doc) {
        if (doc) {
            doc.listDocs(function(err,list) {
                if (err) {
                    return cb(err);
                }
                cb(null,list.map(function(doc) {
                    return path.basename(doc.path());
                }));
            });
        } else {
            cb(new engine.CommandError("Not in a stew project."));
        }
    });
},function() {
    return [];
});

