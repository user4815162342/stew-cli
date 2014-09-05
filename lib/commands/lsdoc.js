var engine = require("../engine");
var manager = require("../manager");
var path = require("path");
var filters = require("../filters");

// TODO: Eventually, this must take arguments:
// 1. An optional doc to look in.
// 2. A filter function
// See manual.md

// TODO: Should also be able to show documents based on the color associated
// with their category. This is tricky, since the tty will probably only
// support a certain number of colors. Although, a *lot* of them will
// now support 256, which is probably good enough (but, how do I check?)

module.exports = engine.asyncCommand(function(doc,filter,cb) {
    manager.requireRelativeDoc(doc,function(err,doc) {
        if (err) {
            return cb(err);
        }
        if (doc) {
            doc.listDocs(filter,function(err,list) {
                if (err) {
                    return cb(err);
                }
                var basePath = doc.path();
                cb(null,list.map(function(doc) {
                    // TODO: Need to show the path relative to the base doc.
                    return path.relative(basePath,doc.path());
                }));
            });
        } else {
            cb(new engine.CommandError("Not in a stew project."));
        }
    });
},function(doc,filter) {
    if ((typeof doc === "undefined") || 
         ((typeof doc === "object") && (typeof doc.ensurePrimary === "function")) ||
         (typeof doc === "string") ||
         (doc instanceof RegExp) ||
         (doc instanceof manager.Glob)) {
        if (typeof filter === "string") {
            filter = filters.parse(filter);
        } 
        if ((typeof filter === "function") ||
             (typeof filter === "boolean") ||
             (typeof filter === "undefined")) {
            return [doc,filter];
        } else {
            throw new engine.CommandError("Invalid filter argument for lsdoc.");
        }
    }
    throw new engine.CommandError("Invalid document argument for lsdoc.");
});

