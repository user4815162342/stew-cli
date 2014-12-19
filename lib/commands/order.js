var engine = require("../engine");
var manager = require("../manager");

// FUTURE: Doc 'here' position, which allows ord to return the current
// index. If I just specified a Doc name, it would be assumed to be a
// position with an empty doc.

var setOrder = function(doc,position,relativeTo,parent,cb) {
    return parent.properties(function(err,props) {
        if (err) {
            return cb(err);
        }
        if (position === "here") {
            var index = props.indexOfDoc(doc.baseName());
            return cb(null,index);
        } 
        try {
            props.orderDoc(doc.baseName(),position,relativeTo && relativeTo.baseName());
            props.save(function(err) {
                if (err) {
                    return cb(err);
                }
                var index = props.indexOfDoc(doc.baseName());
                return cb(null,index);
            });
        } catch (e) {
            return cb(e);
        }
    });
}

module.exports = engine.asyncCommand(function(doc,position,relativeTo,cb) {
    manager.requireRelativeDoc(doc).nodeify(function(err,doc) {
        if (err) {
            return cb(err);
        }
        if (typeof doc === "undefined") {
            return cb(new engine.CommandError("Not in a stew project."));
        }
        var parentPath = path.dirname(doc.path());
        if (parentPath !== doc.path()) {
            return doc._project.root().getDoc(parentPath,function(err,parent) {
                if (err) {
                    return cb(err);
                }
                if (relativeTo) {
                    manager.requireRelativeDoc(relativeTo).nodeify(function(err,relativeTo) {
                        if (err) {
                            return cb(err);
                        }
                        return setOrder(doc,position,relativeTo,parent,cb);
                    });
                } else {
                    return setOrder(doc,position,null,parent,cb);
                }
            });
        } else {
            // we are trying to change the order of the root.
            return cb(new engine.CommandError("Please specify a document"));
        }
    });

},function(doc,position,relativeTo) {
    if (arguments.length == 1) {
        position = doc;
        doc = void 0;
    } else if (arguments.length == 2) {
        if ((doc === "before") ||
             (doc === "after")) {
            relativeTo = position;
            position = doc;
        }
    }
    if ((typeof doc === "undefined") || 
         ((typeof doc === "object") && (typeof doc.ensurePrimary === "function")) ||
         (typeof doc === "string") ||
         (doc instanceof RegExp) ||
         (doc instanceof manager.Glob)) {
        if (typeof position === "string") {
            if (["here","first","last","next","previous","after","before"].indexOf(position) > -1) {
                if (["after","before"].indexOf(position) > -1) {
                    if ((typeof relativeTo === "undefined") || 
                         ((typeof relativeTo === "object") && (typeof relativeTo.ensurePrimary === "function")) ||
                         (typeof relativeTo === "string") ||
                         (relativeTo instanceof RegExp) ||
                         (relativeTo instanceof manager.Glob)) {
                        return [doc,position,relativeTo];
                    } else {
                        throw new engine.CommandError("Please specify a name for after/before predicate.");
                    }
                }
                return [doc,position,void 0];
            } else {
                var nposition = Number(position);
                if (isNaN(nposition)) {
                    throw new engine.CommandError("Invalid position argument: " + position);
                }
                return [doc,nposition,void 0];
            }
        } else if (typeof position === "number") {
            return [doc,position,void 0];
        } else {
            throw new engine.CommandError("Invalid position argument: " + position);
        }
    }
    throw new engine.CommandError("Invalid document argument.");
});


