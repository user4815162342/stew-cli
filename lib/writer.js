var util = require('util');
var formatting = require('./formatting');

var INDENT = "  ";


var writeNull = function(verbose,indent) {
    if (verbose) {
        return "<null>"
    } else {
        return "\u2205"
    }
}

var writeBoolean = function(value,verbose,indent) {
    if (verbose) {
        return (value === true) ? "<true>" : "<false>"
    } else {
        return (value === true) ? "\u2713" : "\u2715"
    }
}

var writeString = function(value,verbose,indent) {
    return value.replace(/(\r\n|\n|\r)/gm,"\n" + indent);
}

var writeNumber = function(value,verbose,indent) {
    return value.toString();
}

// http://stackoverflow.com/a/21371641/300213
var fill = function(length,char) {
    if (length === 0) {
        return "";
    }
    var half = length / 2;
    var result = char;
    
    // basically, exponentially increase the size until it's about half
    // as long as the result.
    while (result.length < half) {
        result += result;
    }
    // Then, double it one more, but trimming off the extra, to
    // get the exact length.
    return result + result.substring(0, length - result.length)
}

var padRight = function(text,length,char) {
    return text + fill(length - text.length,char);
}

var padLeft = function(text,length,char) {
    return fill(length - text.length,char) + text;
}

var layoutRow = function(columns,value,verbose,parents) {
    var lines = [];
    for (var cellIdx = 0; cellIdx < value.length; cellIdx += 1) {
        var width = columns[cellIdx] || 0;
        var cell = writeValue(value[cellIdx],verbose,"",parents).split("\n");
        for (var lineIdx = 0; lineIdx < cell.length; lineIdx += 1) {
            if (typeof lines[lineIdx] === "undefined") {
                lines[lineIdx] = [];
            }
            lines[lineIdx][cellIdx] = cell[lineIdx];
            width = Math.max(width,cell[lineIdx].length);
        }
        columns[cellIdx] = width;
    }
    return lines;
}

var layoutTable = function(value,verbose,indent,parents) {
    var columns = value.columns;
    var result = [];
    var columnWidths = result.columns = new Array(value.columns.length);
    var headerIdx = 0;
    if (value.showCaptions) {
        layoutRow(columnWidths,columns.map(function(column) {
            return column.caption;
        }),verbose,parents).forEach(function(line) {
            result.push(line);
        });
        headerIdx = result.length;
    }
    value.rows.forEach(function(row) {
        layoutRow(columnWidths,columns.map(function(column) {
            return row[column.field];
        }),verbose,parents).forEach(function(line) {
            result.push(line);
        });
    });
    if (value.showCaptions) {
        // insert a header line under each cell.
        result.splice(headerIdx,0,columnWidths.map(function(width) {
            return fill(width,"-");
        }));
    }
    return result;
}

var writeTable = function(value,verbose,indent,parents) {
    var laidOut = layoutTable(value,verbose,indent,parents);
    return laidOut.map(function(line) {
        return line.map(function(cell,idx) {
            return padRight(cell,laidOut.columns[idx]," ");
        }).join("  ");
    }).join("\n" + indent);

}

var writeArray = function(value,verbose,indent,parents) {
    if (value.length) {
        var idxLength = value.length.toString().length + 1;
        
        return value.map(function(item,idx) {
            return padLeft((idx + 1).toString() + ".",idxLength," ") + " " +
                    writeValue(item,verbose,indent + fill(idxLength + 1," "),parents);
        }).join("\n" + indent);
    }
    return "<n/a>";
}

var writeObject = function(value,verbose,indent,parents) {
    // TODO: This isn't writing out indents properly... the first line is
    // outdented and the second lines are indented.
    // TODO: This isn't a map, it needs to be filtered, otherwise
    // we get extra lines.
    var keys = Object.keys(value).filter(function(key) {
        return (verbose || ((key[0] !== "_") &&
             (key[0] !== "$") &&
             (typeof value[key] !== "undefined") &&
             (typeof value[key] !== "function")));
    });
    if (keys.length) {
        return keys.map(function(key) {
            return key + ": " + writeValue(value[key],verbose,indent  + fill(key.length + 2," "),parents);
        }).join("\n" + indent);
    } 
    return "<n/a>";
}

var writeValue = function(value,verbose,indent,parents) {
    switch (typeof value) {
        case "undefined":
            if (verbose) {
                return "<undefined>"
            } else {
                return "";
            }
        case "function":
            if (verbose) {
                return "<function>"
            } else {
                return "";
            }
        case "string":
            return writeString(value,verbose,indent);
        case "boolean":
            return writeBoolean(value,verbose,indent);
        case "number":
            return writeNumber(value,verbose,indent);
        case "object":
            if (value === null) {
                return writeNull(verbose,indent);
            }
            if (parents.indexOf(value) > -1) {
                // TODO: How is this getting here, on a simple object?
                return "<recursion>";
            }
            parents.push(value);
            var result;
            if (value instanceof formatting.Table) {
                result = writeTable(value,verbose,indent,parents);
            } else if (value instanceof Array) {
                result = writeArray(value,verbose,indent,parents);
            } else {
                result = writeObject(value,verbose,indent,parents);
            }
            parents.pop();
            return result;
        default:
            throw new Error("Unknown object type: " + typeof value);
    }
}

var writer = module.exports = function(obj) {
    return writeValue(obj,writer.mode === "verbose","",[]);
}

// TODO:
// Customization (modes?)
// - inspect -- utilizes util.inspect to do the dirty work
// - human -- some human-like display, more like YAML, also handles
//            "tables".
// - verbose -- shows all members
// - concise -- 

writer.mode = "concise";

if (!module.parent) {
    var x;
    console.log("undefined:\n%s",writer(x));
    console.log("function:\n%s",writer(writer));
    console.log("string:\n%s",writer("Text"));
    console.log("boolean(true):\n%s",writer(true));
    console.log("boolean(false):\n%s",writer(false));
    console.log("number:\n%s",writer(23.4));
    console.log("null:\n%s",writer(null));
    console.log("array:\n%s",writer(["a","b",23,true]));
    console.log("deep array:\n%s",writer(["?",["a","b"],["c","d"]]));
    console.log("long array:\n%s",writer([0,1,2,3,4,5,6,7,8,9]));
    console.log("object:\n%s",writer({ foo: "bar", bar: "foo" }));
    console.log("deep object:\n%s",writer({ foo: "bar", bar: { rab: "oof", oof: "bar" }}));
    console.log("secretive object:\n%s",writer({ foo: "bar", bar: "foo", _hidden: "Hah! I'm hiding." }));
    console.log("empty object:\n%s",writer({}));
    
    var list = [];
    list.push({ foo: "bar", bar: "foo" })
    list.push({ foo: "arb", bar: "oof" });
    list.push({ foo: "rba", bar: "ofo" });
    console.log("array of objects:\n%s",writer(list));
    
    var table = new formatting.Table();
    table.addColumn("Foobar","foo");
    table.addColumn("Yo!","bar");
    table.addRow({ foo: "bar", bar: "foo" });
    table.addRow({ foo: "arb", bar: "oof" });
    table.addRow({ foo: "rba", bar: "ofo" });
    
    console.log("table:\n%s",writer(table));
    
    console.log("nested table:\n%s",writer({ data: table }));

    var recursiveObject = {
        foo: "this",
        bar: "is"
    }
    recursiveObject.recursive = recursiveObject;
    console.log("recursive object:\n%s",writer(recursiveObject));

}
