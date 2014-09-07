var engine = require("../engine");
var manager = require("../manager");
var path = require("path");
var filters = require("../filters");
var selectors = require("../selectors");

// TODO: Eventually, this must take more arguments: See manual.md

// TODO: Should also be able to show documents based on the color associated
// with their category. This is tricky, since the tty will probably only
// support a certain number of colors. Although, a *lot* of them will
// now support 256, which is probably good enough (but, how do I check?)

var applySelectors = function(doc,selectors,recurse,cb) {
    if (selectors.length) {
        selectors.shift()(doc,function(err,field,value) {
            if (err) {
                return cb(err);
            }
            if (!doc.__selections) {
                doc.__selections = [];
            }
            doc.__selections.push({
                field: field,
                value: value
            });
            applySelectors(doc,selectors,recurse,cb);
        });
    } else {
        return cb(null,true,recurse);
    }
}


module.exports = engine.asyncCommand(function(doc,filter,selector,cb) {
    manager.requireRelativeDoc(doc,function(err,doc) {
        if (err) {
            return cb(err);
        }
        if (doc) {
            // for best performance, run the selectors at the same time
            // as the filter, so I don't have to iterate through the list
            // a second time.
            if (typeof selector !== "undefined") {
                if (typeof filter !== "undefined") {
                    var testFilter = filter;
                    filter = function(doc,cb) {
                        return testFilter(doc,function(err,pass,recurse) {
                            if (err || (!pass)) {
                                return cb(err,pass,recurse);
                            }
                            return applySelectors(doc,selector.slice(0),recurse,cb);
                        });
                    }
                } else {
                    filter = function(doc,cb) {
                        return applySelectors(doc,selector.slice(0),false,cb);
                    }
                }
            }
            doc.listDocs(filter,function(err,list) {
                if (err) {
                    return cb(err);
                }
                var basePath = doc.path();
                cb(null,list.map(function(doc) {
                    var name = path.relative(basePath,doc.path());
                    if (doc.__selections) {
                        doc.__selections.unshift({
                            field: "name",
                            value: name
                        });
                        return doc.__selections;
                    }
                    return name;
                }));
            });
        } else {
            cb(new engine.CommandError("Not in a stew project."));
        }
    });
},function(doc,filter,selector) {
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
            if (typeof selector !== "undefined") {
                selector = selectors.parse(selector);
            }
            return [doc,filter,selector];
        } else {
            throw new engine.CommandError("Invalid filter argument for lsdoc.");
        }
    }
    throw new engine.CommandError("Invalid document argument for lsdoc.");
});

