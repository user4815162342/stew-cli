var engine = require("./engine");
var minimatch = require('minimatch');
var util = require("util");
var path = require("path");
var SEParser = require("./simpleExpressionParser");

var name = module.exports.name = function(text) {
    // Just the base name is matched, up to the end.
    var pattern = new minimatch.Minimatch(text,{});
    return function(doc) {
        return !!pattern.match(doc.baseName());
    };
}

var path = module.exports.path = function(text) {
    // The whole path is matched, from project root to basename.
    var pattern = new minimatch.Minimatch(path.resolve("/",text),{});
    return function(doc) {
        return !!pattern.match(doc.path());
    };
}

var tag = module.exports.tag = function(tags) {
    return function(doc) {
        return doc.properties().then(function(props) {
            return !!tags.every(function(tag) {
                return props.hasTag(tag);
            });
        });
    }
}

var category = module.exports.category = function(category) {
    return function(doc) {
        return doc.properties().then(function(props) {
            return props.category() === category;
        });
    }
}

var status = module.exports.status = function(status) {
    return function(doc) {
        return doc.properties().then(function(props) {
            return props.status() === status;
        });
    }
}

var publish = module.exports.publish = function(publish) {
    return function(doc) {
        return doc.properties().then(function(props) {
            return !!props.publish();
        });
    }
}

var property = module.exports.property = function(name,value) {
    if (typeof value === "undefined") {
        return function(doc) {
            return doc.properties().then(function(props) {
                return typeof props.user().get(name) === "undefined";
            });
        }
    } else {
        return function(doc) {
            return doc.properties().then(function(props) {
                return props.user().get(name) === value;
            });
        }
    }
}

var recurse = module.exports.recurse = function(filter,recurseFilter) {

    if ((typeof filter === "undefined") && (typeof recurseFilter === "undefined")) {
        // always accept everything and recurse everywhere.
        return function(doc) {
            return { accept: true, recurse: true }
        }
    } else if (typeof filter === "undefined") {
        recurseFilter = parse(recurseFilter);
        return function(doc) {
            return engine.when(recurseFilter(doc)).then(function(result) {
                return {
                    accept: true,
                    recurse: (result === true) || result.accept
                }
            });
        }
    } else if (typeof recurseFilter === "undefined") {
        filter = parse(filter);
        return function(doc) {
            // always recurse everywhere, no matter what the filter said.
            return engine.when(filter(doc)).then(function(result) {
                return {
                    // only accept if the filter was boolean true or had an 'accept' member.
                    accept: (result === true) || result.accept,
                    // always recurse
                    recurse: true
                }
            });
        }
    } else {
        filter = parse(filter);
        recurseFilter = parse(recurseFilter);
        return function(doc) {
            // recursion depends on the recurseFilter, no matter what the other filter said.
            return engine.when(filter(doc)).then(function(accept) {
                return engine.when(recurseFilter(doc)).then(function(recurse) {
                    return {
                        // accept if the accept filter was boolean true or had an 'accept' member.
                        accept: (accept === true) || accept.accept,
                        // recurse if the recurse filter was boolean true or had a 'recurse' member.
                        recurse: (recurse === true) || recurse.accept
                    }
                });
            });
        }
    }
}

var or = module.exports.or = function(filters) {
    if (!(filters instanceof Array)) {
        filters = Array.prototype.slice.call(arguments,0);
    }
    filters = filters.map(parse);
    
    var process = function(filters,doc) {
        if (filters.length > 0) {
            var filter = filters.shift();
            return engine.when(filter(doc)).then(function(result) {
                if ((result === true) || result.accept) {
                    return true
                }
                return process(filters,doc);
            });
        } else {
            // if we got this far then we couldn't find any that were true.
            return false;
        }
    }
    
    return function(doc) {
        return process(filters.slice(0),doc);
    }
}

var and = module.exports.and = function(filters) {
    if (!(filters instanceof Array)) {
        filters = Array.prototype.slice.call(arguments,0);
    }
    filters = filters.map(parse);
    
    var process = function(filters,doc) {
        if (filters.length > 0) {
            var filter = filters.shift();
            return engine.when(filter(doc)).then(function(result) {
                if ((result === true) || result.accept) {
                    return process(filters,doc);
                }
                return false;
            });
        } else {
            // if we got this far than all of them were true.
            return true;
        }
    }
    
    return function(doc) {
        return process(filters.slice(0),doc);
    }
}

var not = module.exports.not = function(filter) {
    filter = parse(filter);
    
    return function(doc) {
        return filter(doc).then(function(result) {
            return !!!((result === true) || result.accept);
        });
    }
}

var FilterParser = module.exports._Parser = function(text) {
    SEParser.call(this,text);
}
util.inherits(FilterParser,SEParser);


FilterParser.prototype.default = function(word) {
    return this.annotate(name(word),{ fn: "name", pattern: word });
}

FilterParser.prototype.identifiers = {
    "name": function() {
        this.expectOpenParentheses();
        var pattern = this.expectStringArgument();
        this.expectCloseParentheses();
        return this.annotate(name(pattern),{ fn: "name", pattern: pattern });
    },
    "tag": function() {
        this.expectOpenParentheses();
        var tags = [];
        tags.push(this.expectStringArgument());
        while (this.matchComma()) {
            tags.push(this.expectStringArgument());
        }
        this.expectCloseParentheses();
        return this.annotate(tag(tags),{ fn: "tag", tags: tags });
    },
    "category": function() {
        this.expectOpenParentheses();
        var value = this.expectStringArgument();
        this.expectCloseParentheses();
        return this.annotate(category(value),{ fn: "category", category: value });
    },
    "status": function() {
        this.expectOpenParentheses();
        var value = this.expectStringArgument();
        this.expectCloseParentheses();
        return this.annotate(status(value),{ fn: "status", status: value });
    },
    "publish": function() {
        return this.annotate(publish(),{ fn: "publish" });
    },
    "property": function() {
        this.expectOpenParentheses();
        var name = this.expectStringArgument();
        var value;
        if (this.matchComma()) {
            value = this.expectStringArgument();
        }
        this.expectCloseParentheses();
        return this.annotate(property(name,value),{ fn: "property", name: name, value: value });
    },
    "recurse": function() {
        var filter;
        var recurseFilter;
        if (this.matchOpenParentheses()) {
            filter = this.expectCommand();
            if (this.matchComma()) {
                recurseFilter = this.expectCommand();
            }
            this.expectCloseParentheses();
        }
        return this.annotate(recurse(filter,recurseFilter),{ fn: "recurse", filter: filter, recurse: recurseFilter });
    },
    "or": function() {
        this.expectOpenParentheses();
        var filters = [];
        filters.push(this.expectCommand());
        while (this.matchComma()) {
            filters.push(this.expectCommand());
        }
        this.expectCloseParentheses();
        return this.annotate(or(filters),{ fn: "or", filters: filters });
    },
    "and": function() {
        this.expectOpenParentheses();
        var filters = [];
        filters.push(this.expectCommand());
        while (this.matchComma()) {
            filters.push(this.expectCommand());
        }
        this.expectCloseParentheses();
        return this.annotate(and(filters),{ fn: "and", filters: filters });
    },
    "not": function() {
        this.expectOpenParentheses();
        var filter = this.expectCommand();
        this.expectCloseParentheses();
        return this.annotate(not(filter),{ fn: "not", filter: filter });
    }
}

var parse = module.exports.parse = function(text) {
    if (typeof text === "function") {
        return text;
    }
    
    return (new FilterParser(text).parse());
    
}

// For testing...
if (module.parent === null) {
    var denotate = function(fn) {
        var result = {};
        if (fn.annotations) {
            Object.keys(fn.annotations).forEach(function(key) {
                if (typeof fn.annotations[key] === "function") {
                    result[key] = denotate(fn.annotations[key]);
                } else if (fn.annotations[key] instanceof Array) {
                    result[key] = fn.annotations[key].map(denotate);
                } else {
                    result[key] = fn.annotations[key];
                }
            });
        }
        return result;
    }
    
    try {
        var filter = parse(process.argv[2] || "");
        console.log(JSON.stringify(denotate(filter),null,"  "));
    } catch (e) {
        if (e instanceof engine.CommandError) {
            console.error(e.message);
        } else {
            console.error(e.stack);
        }
    }
}
