var engine = require("./engine");
var minimatch = require('minimatch');
var util = require("util");
var path = require("path");

var name = module.exports.name = function(text) {
    // Just the base name is matched, up to the end.
    var pattern = new minimatch.Minimatch(text,{});
    return function(doc,cb) {
        return cb(null,pattern.match(doc.baseName()),false);
    };
}

var path = module.exports.path = function(text) {
    // The whole path is matched, from project root to basename.
    var pattern = new minimatch.Minimatch(path.resolve("/",text),{});
    return function(doc,cb) {
        return cb(null,pattern.match(doc.path()),false);
    };
}

var tag = module.exports.tag = function(tags) {
    return function(doc,cb) {
        doc.properties(function(err,props) {
            if (err) {
                return cb(err);
            }

            return cb(null,tags.every(function(tag) {
                return props.hasTag(tag);
            }),false);
        });
    }
}

var category = module.exports.category = function(category) {
    return function(doc,cb) {
        doc.properties(function(err,props) {
            if (err) {
                return cb(err);
            }
            
            return cb(null,props.category() === category,false);
        });
    }
}

var status = module.exports.status = function(status) {
    return function(doc,cb) {
        doc.properties(function(err,props) {
            if (err) {
                return cb(err);
            }
            
            return cb(null,props.status() === status,false);
        });
    }
}

var publish = module.exports.publish = function(publish) {
    return function(doc,cb) {
        doc.properties(function(err,props) {
            if (err) {
                return cb(err);
            }
            
            return cb(null,!!props.publish(),false);
        });
    }
}

var property = module.exports.property = function(name,value) {
    if (typeof value === "undefined") {
        return function(doc,cb) {
            doc.properties(function(err,props) {
                if (err) {
                    return cb(err);
                }
                
                return cb(null,typeof props.user().get(name) === "undefined",false);
            });
        }
    } else {
        return function(doc,cb) {
            doc.properties(function(err,props) {
                if (err) {
                    return cb(err);
                }
                
                
                return cb(null,props.user().get(name) === value,false);
            });
        }
    }
}

var recurse = module.exports.recurse = function(filter,recurseFilter) {
    if (typeof filter === "undefined") {
        return function(doc,cb) {
            return cb(null,true,true);
        }
    } else {
        filter = parse(filter);
        if (typeof recurseFilter === "undefined") {
            return function(doc,cb) {
                // third argument is ignored, always recurse...
                filter(doc,function(err,pass) {
                    return cb(err,pass,true);
                });
            }
        } else {
            recurseFilter = parse(recurseFilter);
            return function(doc,cb) {
                // third argument is ignored, always recurse if recurseFilter passes.
                filter(doc,function(err,pass) {
                    if (err) {
                        return cb(err);
                    }
                    // third argument is ignored, if it passes, then we recurse.
                    recurseFilter(doc,function(err,recurse) {
                        return cb(err,pass,recurse);
                    });
                });
            }
        }
    }
}

var or = module.exports.or = function(filters) {
    if (!(filters instanceof Array)) {
        filters = Array.prototype.slice.call(arguments,0);
    }
    filters = filters.map(parse);
    
    var process = function(filters,doc,cb) {
        if (filters.length > 0) {
            var filter = filters.shift();
            filter(doc,function(err,pass,recurse) {
                if (err) {
                    return cb(err);
                }
                if (pass) {
                    return cb(null,true,false);
                }
                process(filters,doc,cb);
            });
        } else {
            return cb(null,false,false);
        }
    }
    
    return function(doc,cb) {
        process(filters.slice(0),doc,cb);
    }
}

var and = module.exports.and = function(filters) {
    if (!(filters instanceof Array)) {
        filters = Array.prototype.slice.call(arguments,0);
    }
    filters = filters.map(parse);
    
    var process = function(filters,doc,cb) {
        if (filters.length > 0) {
            var filter = filters.shift();
            filter(doc,function(err,pass,recurse) {
                if (err) {
                    return cb(err);
                }
                if (!pass) {
                    return cb(null,false,false);
                }
                process(filters,doc,cb);
            });
        } else {
            return cb(null,true,false);
        }
    }
    
    return function(doc,cb) {
        process(filters.slice(0),doc,cb);
    }
}

var not = module.exports.not = function(filter) {
    filter = parse(filter);
    
    return function(doc,cb) {
        filter(doc,function(err,pass) {
            return cb(err,!!!pass);
        });
    }
}

var Parser = module.exports._Parser = function(text) {
    
    var position = 0;
    
    this.next = function() {
        position += 1;
        return this.char();
    }
    
    this.char = function() {
        return text[position];
    }
    
    this.error = function(msg) {
        var format = "Filter Parse Error: %s '%s'";
        //                                       
        var pointerPrefixLength = (format.length - 5) + msg.length + position;
        msg = util.format(format,msg,text) + "\n" + (new Array(pointerPrefixLength + 1).join(" ") + "^");
        throw new engine.CommandError(msg,"FILTER PARSE ERROR");
    }
}

Parser.prototype.annotate = function(fn,props) {
    fn.annotations = props;
    return fn;
}

Parser.prototype.operators = /[(),]/;

Parser.prototype.expectOpenParentheses = function() {
    if (this.char() !== "(") {
        this.error("Expected open parenthesis.");
    }
    this.next();
}

Parser.prototype.matchOpenParentheses = function() {
    if (this.char() === "(") {
        this.next();
        return true;
    }
    return false;
}

Parser.prototype.expectCloseParentheses = function() {
    if (this.char() !== ")") {
        this.error("Expected close parenthesis.");
    }
    this.next();
}

Parser.prototype.matchComma = function() {
    if (this.char() === ",") {
        this.next();
        return true;
    }
    return false;
}

Parser.prototype.expectStringArgument = function() {
    var result = "";
    for (var c = this.char(); (typeof c !== "undefined") && (!this.operators.test(c)); c = this.next()) {
        switch (c) {
            case "\\":
                c = this.next();
                if (typeof c === "undefined") {
                    result += "\\";
                } else {
                    result += c;
                }
                break;
            default:
                result += c;
                break;
        }
    }
    return result;
}

Parser.prototype.expectFilter = function() {
    var word = this.expectStringArgument();
    if (this.identifiers.hasOwnProperty(word)) {
        return this.identifiers[word].bind(this)();
    } else if (word !== "") {
        return this.annotate(name(word),{ fn: "name", pattern: word });
    } else {
        this.error("Expected filter.");
    }
}

Parser.prototype.parse = function() {
    var filter = this.expectFilter();
    if (typeof this.char() !== "undefined") {
        this.error("Unexpected content after filter");
    }
    return filter;
}

Parser.prototype.identifiers = {
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
            filter = this.expectFilter();
            if (this.matchComma()) {
                recurseFilter = this.expectFilter();
            }
            this.expectCloseParentheses();
        }
        return this.annotate(recurse(filter,recurseFilter),{ fn: "recurse", filter: filter, recurse: recurseFilter });
    },
    "or": function() {
        this.expectOpenParentheses();
        var filters = [];
        filters.push(this.expectFilter());
        while (this.matchComma()) {
            filters.push(this.expectFilter());
        }
        this.expectCloseParentheses();
        return this.annotate(or(filters),{ fn: "or", filters: filters });
    },
    "and": function() {
        this.expectOpenParentheses();
        var filters = [];
        filters.push(this.expectFilter());
        while (this.matchComma()) {
            filters.push(this.expectFilter());
        }
        this.expectCloseParentheses();
        return this.annotate(and(filters),{ fn: "and", filters: filters });
    },
    "not": function() {
        this.expectOpenParentheses();
        var filter = this.expectFilter();
        this.expectCloseParentheses();
        return this.annotate(not(filter),{ fn: "not", filter: filter });
    }
}

var parse = module.exports.parse = function(text) {
    if (typeof text === "function") {
        return text;
    }
    
    return (new Parser(text).parse());
    
}

// For testing...
if (module.parent === null) {
    var denotate = function(fn) {
        debugger;
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