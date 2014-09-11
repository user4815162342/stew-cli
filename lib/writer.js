var util = require('util');
var formatting = require('./formatting');
var style = require("./style");
var supportsColor = require("supports-color");

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
    var textLength = style.clear(text).length;
    return text + fill(length - textLength,char);
}

var padLeft = function(text,length,char) {
    var textLength = style.clear(text).length;
    return fill(length - textLength,char) + text;
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
            // need to check against the text without style, otherwise
            // we get bad length results.
            width = Math.max(width,style.clear(cell[lineIdx]).length);
        }
        columns[cellIdx] = width;
    }
    return lines;
}

var layoutTable = function(value,verbose,indent,parents) {
    var columns = value.columns;
    var result = [];
    var columnWidths = result.columns = new Array(value.columns.length);
    result.headerIndex = -1;
    if (value.showCaptions) {
        layoutRow(columnWidths,columns.map(function(column) {
            return column.caption;
        }),verbose,parents).forEach(function(line,idx,arr) {
            result.push(line);
        });
        result.headerIndex = result.length - 1;
    }
    value.rows.forEach(function(row) {
        layoutRow(columnWidths,columns.map(function(column) {
            return row[column.field];
        }),verbose,parents).forEach(function(line) {
            result.push(line);
        });
    });
    return result;
}

// Capable of handling line breaks in cells, as well as styled values.
// Styles can only be applied to cell values, there is no efficient
// way to apply them to whole columns or headers.
var writeTable = function(value,verbose,indent,parents) {
    var laidOut = layoutTable(value,verbose,indent,parents);
    var lines = laidOut.map(function(line,lineIdx) {
        return line.map(function(cell,cellIdx) {
            cell = padRight(cell,laidOut.columns[cellIdx]," ");
            // underline the headers.
            if (supportsColor && (lineIdx === laidOut.headerIndex)) {
                cell = style(cell,"underline");
            }
            return cell;
        }).join("  ");
    })
    if (!supportsColor && (laidOut.headerIndex > -1)) {
        // if styles can't be used, add in our own underline.
        lines.splice(laidOut.headerIndex + 1,0,laidOut.columns.map(function(width) {
            return fill(width,"-");
        }).join("  "));
    }
    
    return lines.join("\n" + indent);

}

// even though the indexes are numeric, I have no intention on using
// the length property, so there's no need for the extra overhead.
var colorCache = {};

var knownColors = [
    { name: "red", r: 255, g: 0, b: 0 },
    { name: "green", r: 0, g: 255, b: 0 },
    { name: "blue", r: 0, g: 0, b: 255 },
    { name: "yellow", r: 255, g: 255, b: 0 },
    { name: "magenta", r: 255, g: 0, b: 255 },
    { name: "cyan", r: 0, g: 255, b: 255 },
    { name: "black", r: 0, g: 0, b: 0 },
    { name: "white", r: 255, g: 255, b: 255 },
    // classically grey *should* be 127,127,127 -- but this is closer
    // to what the terminals seem to do.
    { name: "grey", r: 75, g: 75, b: 75 }
]

var colorDistance = function(c1,c2) {
    // 3d Euclidean Distance:
    // d(p,q) = sqrt((p1 - q1)^2 + (p2 - q2)^2 + (p3 - q3)^2)
    
    // However, we're only comparing distances, we don't require the actual metric,
    // so, we can optimize it to:
    // d^2(p,q) = (p1 - q1)^2 + (p2 - q2)^2 + (p3 - q3)^2
    return Math.pow(c1.r - c2.r,2) + Math.pow(c1.g - c2.g,2) + Math.pow(c1.b - c2.b,2);
}

var mapColor = function(color) {
    if (typeof color === "string") {
        return color;
    }
    if (typeof color === "number") {
        var result = colorCache[color];
        if (typeof result === "undefined") {
            return mapColor({ r: ((color >> 16) & 255), g: ((color >> 8) & 255), b: (color & 255)})
        }
        return result;
    }
    // #1, I'm caching the results, so I don't have to recalculate for
    // the same values.
    var result = colorCache[(color.r * 65536) + (color.b * 256) + color.g];
    if (typeof result === "undefined") {
        
        // Some complex mathematics here.
        // Figure out the closest available color of the following, based on
        // distance on a 3-D grid. I'm using classic, purist definitions of 
        // these colors, not what's actually defined in the terminal settings, 
        // so results may vary greatly.
        
        // If it weren't for that "grey", I could just divide the whole
        // thing up into eight cubes. But, because I have it, I still only
        // need to do a distance algorithm.
        
        // start with Infinity, although there's probably some value which
        // the distance can never be greater than. The only way we'll still
        // have infinity as the distance at the end is if knownColors
        // was empty.
        var lastDistance = Infinity;
        var distance;
        for (var i = 0; i < knownColors.length; i += 1) {
            distance = colorDistance(knownColors[i],color);
            if (distance < lastDistance) {
                lastDistance = distance;
                result = knownColors[i].name;
            }
        }
        
        // okay, so now I've got a result, so cache it.
        colorCache[(color.r * 65536) + (color.b * 256) + color.g] = result;
        
    }
    return result;
    
}

/**
 *  * - "text-style": an array containing one or more of the following:
 *   bold
 *   italic
 *   underline
 * - "text-color": either an object containing an 'r', 'g', and 'b' members
 *   with values from 0-256, or one of the following strings:
 *   "white","grey","black","blue","cyan","green","magenta","red","yellow"
 * - "background-color": same type of value as text-color.
*/
var convertStyle = function(style) {
    // text-style is converted as is.
    var result = style["text-style"] || [];
    if (style["text-color"]) {
        result.push(mapColor(style["text-color"]));
    }
    if (style["background-color"]) {
        var color = mapColor(style["background-color"])
        result.push("bg" + color[0].toUpperCase() + color.slice(1));
    }
    return result;
}


var writeStyled = function(value,verbose,indent,parents) {
    var result = writeValue(value.data,verbose,indent,parents);
    if (supportsColor) {
        var styles = convertStyle(value.styles);
        styles.forEach(function(s) {
            result = style(result,s);
        });
    }
    return result;
}

var writeArray = function(value,verbose,indent,parents) {
    if (value.length) {
        var idxLength = value.length.toString().length + 1;
        
        return value.map(function(item,idx) {
            return padLeft((idx + 1).toString() + ".",idxLength," ") + " " +
                    writeValue(item,verbose,indent + fill(idxLength + 1," "),parents);
        }).join("\n" + indent);
    }
    return "<empty array>";
}

var writeObject = function(value,verbose,indent,parents) {
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
    // If they've overridden object.toString, then report that.
    if (value.hasOwnProperty("toString") || value.constructor.prototype.hasOwnProperty("toString")) {
        return writeValue(value.toString());
    }
    return "<object>";
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
            // Need to output an indicator that this is a function
            // you're supposed to call.
            return "<function>";
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
            } else if (value instanceof formatting.Style) {
                result = writeStyled(value,verbose,indent,parents);
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

    var red = { "text-color": { r: 255, g: 0, b: 0 }};
    console.log("red text:\n%s",writer(new formatting.Style(red,"Text")));
    var bold = { "text-style": ["bold"] }
    
    console.log("bold table:\n%s",writer(new formatting.Style(bold,table)));
    
    var italicGreen = { "text-style": ["underline"], "text-color": { r: 0, g: 255, b: 0 }};
    console.log("styled property value:\n%s",writer(new formatting.Style(red,{ foo: new formatting.Style(italicGreen,"bar") })));
    
    var cyan = { "text-color": "cyan" };
    var muteGreen = { "text-color": { r:144, g: 238, b: 144 }, "text-style": ["italic"] };
    table.addRow({ foo: "Cyan\nOcean", bar: "Lake"});
    table.addRow({ foo: new formatting.Style(cyan,"Cyan\nOcean"), bar: new formatting.Style(muteGreen,"Lake")});
    console.log("styled cells:\n%s",writer(table));
    
    console.log("some colors:");
    console.log(writer(new formatting.Style({ "text-color": 0x90EE90 },"Kind of light-green")));
    console.log(writer(new formatting.Style({ "text-color": 0x8B6914 },"Kind of brown")));
    console.log(writer(new formatting.Style({ "text-color": 0xA020F0 },"Kind of purple")));
    console.log(writer(new formatting.Style({ "text-color": 0xFFC0CB },"Kind of pink")));
    
    console.log("some background colors:");
    console.log(writer(new formatting.Style({ "background-color": 0x90EE90 },"Kind of light-green")));
    console.log(writer(new formatting.Style({ "background-color": 0x8B6914 },"Kind of brown")));
    console.log(writer(new formatting.Style({ "background-color": 0xA020F0 },"Kind of purple")));
    console.log(writer(new formatting.Style({ "background-color": 0xFFC0CB },"Kind of pink")));
    console.log(writer(new formatting.Style({ "background-color": "red" },"blue"))); // :)
    console.log(writer(new formatting.Style({ "background-color": "green" },"red"))); // :)
    console.log(writer(new formatting.Style({ "background-color": { r: 255, g: 0, b: 255} },"yellow"))); // :)
    console.log(writer(new formatting.Style({ "background-color": { r: 0, g: 0, b: 0 } },"white"))); // :)

}
