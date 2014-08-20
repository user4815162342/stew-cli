var path = require("path");
var pathExtra = require("path-extra");
var fs = require("fs");
var mkdirp = require("mkdirp");

var Settings = function(storagePath) {
    
    var data = {};
    var dirty = false;
    
    this.get = function(name,def) {
        if (data.hasOwnProperty(name)) {
            return data[name];
        }
        return def;
    }
    
    this.set = function(name,value) {
        if (!data.hasOwnProperty(name) || (data[name] !== value)) {
            // run stringify just to make sure we're not
            // getting an invalid object now. I'd rather know
            // now than when we're trying to save, and can't figure
            // out where it came from.
            // (I'd like to test for non-serializable values as
            // well (functions), but stringify just quietly ignores them instead
            // of raising an error. And, oddly enough, the replacer
            // function is only called at the top level. I could add
            // a Function.prototype.toJSON function that throws an error,
            // but... well...just, no.).
            JSON.stringify(value);
            // but we don't want it stringified right now, yet,
            // that will make saving the object more difficult later.
            data[name] = value;
            dirty = true;
        }
    }
    
    this.list = function() {
        return Object.keys(data);
    }
    
    this.delete = function(name) {
        if (data.hasOwnProperty(name)) {
            delete data[name];
            dirty = true;
        }
    }
    
    this.save = function(force) {
        if (dirty || force) {
            // doing it sync to save some trouble.
            mkdirp.sync(path.dirname(storagePath));
            fs.writeFileSync(storagePath,JSON.stringify(data,null,"  "),{ encoding: "utf8"})
            dirty = false;
        }
    }
    
    try {
        // doing it sync to save some trouble.
        data = JSON.parse(fs.readFileSync(storagePath,{encoding: "utf8"}));
    } catch (e) {
        // only throw if the file did not exist.
        if (e.code !== "ENOENT") {
            throw e;
        } 
    }
    
    
}

var globals;
var globalsPath = path.join(pathExtra.datadir("stew-tools-cli"),"globals.json");

// Only create the globals when accessed.
Object.defineProperty(module.exports,"globals",{
    // I'm not allowing user to override this. Come up with a use
    // case for me setting configurable to true, or providing
    // a 'set' and let me know.
    enumerable: true,
    get: function() {
        if (!globals) {
            globals = new Settings(globalsPath);
        }
        return globals;
    }
});

var projectSettings = {};

module.exports.project = function(p) {
    if (!projectSettings.hasOwnProperty(p)) {
        projectSettings[p] = new Settings(path.join(p,".stew-tools-cli"));
    } 
    return projectSettings[p];
    
}

module.exports.Settings = Settings;
