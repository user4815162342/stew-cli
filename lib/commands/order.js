var engine = require("../engine");
var manager = require("../manager");

// FUTURE: Doc 'here' position, which allows ord to return the current
// index. If I just specified a Doc name, it would be assumed to be a
// position with an empty doc.

var setOrder = function(doc,position,relativeTo,parent) {
    return parent.properties().then(function(props) {
        if (position === "here") {
            var index = props.indexOfDoc(doc.baseName());
            return index;
        } 
        props.orderDoc(doc.baseName(),position,relativeTo && relativeTo.baseName());
        return props.save().then(function() {
            var index = props.indexOfDoc(doc.baseName());
            return index;
        });
    });
}

module.exports = engine.promiseCommand(function(doc,position,relativeTo) {
    return manager.requireRelativeDoc(doc).then(function(doc) {
        if (typeof doc === "undefined") {
            throw new engine.CommandError("Not in a stew project.");
        }
        var parentPath = path.dirname(doc.path());
        if (parentPath !== doc.path()) {
            var root = doc._project.root();
            return root.getDoc(parentPath).then(function(parent) {
                if (relativeTo) {
                    return manager.requireRelativeDoc(relativeTo).then(function(relativeTo) {
                        return setOrder(doc,position,relativeTo,parent);
                    });
                } else {
                    return setOrder(doc,position,null,parent);
                }
            });
        } else {
            // we are trying to change the order of the root.
            throw new engine.CommandError("Please specify a document");
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
         (typeof doc === "string")) {
        if (typeof position === "string") {
            if (["here","first","last","next","previous","after","before"].indexOf(position) > -1) {
                if (["after","before"].indexOf(position) > -1) {
                    if ((typeof relativeTo === "undefined") || 
                         ((typeof relativeTo === "object") && (typeof relativeTo.ensurePrimary === "function")) ||
                         (typeof relativeTo === "string")) {
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


