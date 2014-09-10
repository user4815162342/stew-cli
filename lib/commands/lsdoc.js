var engine = require("../engine");
var manager = require("../manager");
var path = require("path");
var filters = require("../filters");
var selectors = require("../selectors");
var shortenPath = require("../shortenPath");
var formatting = require("../formatting");

// TODO: Need a "StyledOutput" object, which the Writer will recognize.
// which will provide a color, style (font decorations) and a value. If the writer encounters such
// an object, and it's in TTY mode, then it will wrap the result of calling
// itself on the value in the specified color (or the closest TTY value to
// that). The table writer has to check if a row is a StyledOutput as well
// before writing out it's contents wrapped in the style.

// TODO: This probably also means that I need to make the Table a separate
// constructor as well, since I'm not depending on hacks for the above
// (I can't depend on hacks, because I can't *tag* strings and probably
// numbers).

// TODO: Make sure this output stuff works right in single-command mode as well.

// TODO: Need to grab the "color" out of the stew settings based on the
// category (possibly only if the category is selected for), after all
// fields are selected, and then wrap the row in a StyledOutput
// as mentioned above. 

// TODO: Eventually, this must take more arguments: See manual.md

// TODO: Should also be able to show documents based on the color associated
// with their category. This is tricky, since the tty will probably only
// support a certain number of colors. Although, a *lot* of them will
// now support 256, which is probably good enough (but, how do I check?)

var applySelectors = function(doc,table,selectors,recurse,cb) {
    if (selectors.length) {
        selectors.shift()(doc,function(err,field,value) {
            if (err) {
                return cb(err);
            }
            table.addCell(field,value);
            applySelectors(doc,table,selectors,recurse,cb);
        });
    } else {
        return cb(null,true,recurse);
    }
}

var nameSelector = function(basePath,limit) {
    return function(doc,cb) {
        return cb(null,"name",shortenPath(path.relative(basePath,doc.path()),limit));
    }
}


module.exports = engine.asyncCommand(function(doc,filter,selector,cb) {
    manager.requireRelativeDoc(doc,function(err,doc) {
        if (err) {
            return cb(err);
        }
        if (doc) {
            var basePath = doc.path();
            // for best performance, run the selectors at the same time
            // as the filter, so I don't have to iterate through the list
            // a second time.
            if (typeof selector === "undefined") {
                selector = [
                    nameSelector(basePath)
                ];
            } else {
                // add the name selector in, but this one gets a length limit.
                selector.unshift(nameSelector(basePath,30));
            }
            var table = new formatting.Table();
            if (typeof filter !== "undefined") {
                var checkFilter = filter;
                filter = function(doc,cb) {
                    return checkFilter(doc,function(err,pass,recurse) {
                        if (err || (!pass)) {
                            return cb(err,pass,recurse);
                        }
                        table.addRow();
                        return applySelectors(doc,table,selector.slice(0),recurse,cb);
                    });
                }
            } else {
                filter = function(doc,cb) {
                    table.addRow();
                    return applySelectors(doc,table,selector.slice(0),false,cb);
                }
            }
            doc.listDocs(filter,function(err,list) {
                if (err) {
                    return cb(err);
                }
                if (table.columns.length === 1) {
                    // this is just the name.
                    table.showCaptions = false;
                }
                cb(null,table);
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

