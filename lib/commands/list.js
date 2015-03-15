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

var applySelectors = function(doc,table,style,selectors,recurse) {
    if (selectors.length) {
        return selectors.shift()(doc).then(function(fv) {
            if (style) {
                fv.value = new formatting.Style(style,fv.value);
            }
            table.addCell(fv.field,fv.value);
            return applySelectors(doc,table,style,selectors,recurse);
        });
    } else {
        return engine.resolvedPromise(true);
    }
}

var applyStyleAndSelectors = function(doc,table,selectors,recurse) {
    // I need to retrieve the style based on the category. Might as well 
    // use the category selector here:
    // TODO: In order to add the folder icons here, I need a "folder" getter
    // as well, that returns true if the doc is a folder. And then, I have
    // to have this add a glyph style onto that folder.
    return getters.category()(doc).then(function(fv) {
        // now, I need to get the color from stew.
        // FUTURE: I should have a project function that returns the project.
        var project = doc._project;
        return project.stew().then(function(stew) {
            var style;
            var categoryDef = stew.getCategory(fv.value);
            if (categoryDef) {
                style = { "text-color": categoryDef.color() };
            }
            return applySelectors(doc,table,style,selectors,recurse);
        });
    });
    
}

var nameSelector = function(basePath,limit) {
    return function(doc) {
        return engine.resolvedPromise({ field: "Name", value: shortenPath(path.relative(basePath,doc.path()),limit)});
    }
}


module.exports = engine.promiseCommand(function(doc,filter,selectors) {
    return manager.requireRelativeDoc(doc).then(function(doc) {
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
                filter = function(doc) {
                    return engine.when(checkFilter(doc)).then(function(result) {
                        if ((result !== true) && !result.accept) {
                            return result;
                        }
                        table.addRow();
                        return applyStyleAndSelectors(doc,table,selectors.slice(0),result.recurse).then(function() {
                            return result;
                        });
                    });
                }
            } else {
                filter = function(doc) {
                    table.addRow();
                    return applyStyleAndSelectors(doc,table,selectors.slice(0),false).then(function() {
                        return { accept: true }
                    });
                }
            }
            return doc.listDocs(filter).then(function(list) {
                if (table.columns.length === 1) {
                    // this is just the name, we don't need a header,
                    // but I don't want it organized as an array either.
                    table.showCaptions = false;
                }
                return table;
            });
        } else {
            throw new engine.CommandError("Not in a stew project.");
        }
    });
},function(doc,filter,selectors) {
    if ((typeof doc === "undefined") || 
         ((typeof doc === "object") && (typeof doc.ensurePrimary === "function")) ||
         (typeof doc === "string")) {
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

