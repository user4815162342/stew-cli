var engine = require("../engine");
var manager = require("../manager");
var path = require("path");
var filters = require("../filters");
var getters = require("../getters");
var shortenPath = require("../shortenPath");
var formatting = require("../formatting");

// TODO: Eventually, this might take more arguments: See manual.md
// But, all that's left is command, and that was originally put
// in to get synopsis and apply mass changes. The first we can get
//  via getters. The second could be handled with some similar 'setters'
// scheme, but probably in an 'update' command.

var applySelectors = function(doc,table,style,selectors,recurse,cb) {
    if (selectors.length) {
        selectors.shift()(doc,function(err,field,value) {
            if (err) {
                return cb(err);
            }
            if (style) {
                value = new formatting.Style(style,value);
            }
            table.addCell(field,value);
            applySelectors(doc,table,style,selectors,recurse,cb);
        });
    } else {
        return cb(null,true,recurse);
    }
}

var applyStyleAndSelectors = function(doc,table,selectors,recurse,cb) {
    // I need to retrieve the style based on the category. Might as well 
    // use the category selector here:
    getters.category()(doc,function(err,f,category) {
        if (err) {
            return cb(err);
        }
        // now, I need to get the color from stew.
        // FUTURE: I should have a project function that returns the project.
        var project = doc._project;
        project.stew(function(err,stew) {
            if (err) {
                return cb(err);
            }
            var style;
            var categoryDef = stew.getCategory(category);
            if (categoryDef) {
                style = { "text-color": categoryDef.color() };
            }
            applySelectors(doc,table,style,selectors,recurse,cb);
        });
    });
    
}

var nameSelector = function(basePath,limit) {
    return function(doc,cb) {
        return cb(null,"Name",shortenPath(path.relative(basePath,doc.path()),limit));
    }
}


module.exports = engine.asyncCommand(function(doc,filter,selectors,cb) {
    manager.requireRelativeDoc(doc).nodeify(function(err,doc) {
        if (err) {
            return cb(err);
        }
        if (doc) {
            var basePath = doc.path();
            // for best performance, run the selectors at the same time
            // as the filter, so I don't have to iterate through the list
            // a second time.
            if (typeof selectors === "undefined") {
                selectors = [
                    nameSelector(basePath)
                ];
            } else {
                // add the name selector in, but this one gets a length limit.
                selectors.unshift(nameSelector(basePath,30));
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
                        return applyStyleAndSelectors(doc,table,selectors.slice(0),recurse,cb);
                    });
                }
            } else {
                filter = function(doc,cb) {
                    table.addRow();
                    return applyStyleAndSelectors(doc,table,selectors.slice(0),false,cb);
                }
            }
            doc.listDocs(filter,function(err,list) {
                if (err) {
                    return cb(err);
                }
                if (table.columns.length === 1) {
                    // this is just the name, we don't need a header,
                    // but I don't want it organized as an array either.
                    table.showCaptions = false;
                }
                cb(null,table);
            });
        } else {
            cb(new engine.CommandError("Not in a stew project."));
        }
    });
},function(doc,filter,selectors) {
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
            if (typeof selectors !== "undefined") {
                selectors = getters.parse(selectors);
                if (!(selectors instanceof Array)) {
                    selectors = [selectors];
                }
            }
            return [doc,filter,selectors];
        } else {
            throw new engine.CommandError("Invalid filter argument for lsdoc.");
        }
    }
    throw new engine.CommandError("Invalid document argument for lsdoc.");
});

