var util = require('util');
var path = require('path');
var Q = require('q');

 // In order to 'install' a command, it not only has to be located in
 // the commands subdirectory, but it has to be referenced here. This
 // is a security measure. We don't have plugins (yet).
 var commands = [
    "open",
    "init",
    "list",
    "edit",
    "config",
    "category",
    "status",
    "tags",
    "move",
    "copy",
    "lsbackup",
    "restore",
    "graph",
    "applyGraph",
    "publish",
    "create",
    "get",
    "set",
    "tag",
    "untag",
    "reference",
    "unreference",
    "order",
    "nextstatus",
    "prevstatus",
    "gsynopsis",
    "synopsis",
    "notes",
    "thumbnail",
    "backup",
    "version",
    "rename",
    "coreVersion",
    "sfmsVersion",
    "brokenClock",
    "car"];


/**
 * Should be used to indicate user-input errors that should simply be emitted to the
 * console in single-command mode. It has a stack trace, but this won't
 * be used. You should include as much information in the message as possible
 * to indicate what the user did wrong.
 * */
var CommandError = module.exports.CommandError = function(msg,code) {
    Error.call(this);
    Error.captureStackTrace(this,this.constructor);
    this.name = this.constructor.name;
    this.message = msg;
    this.code = code;
};
util.inherits(CommandError, Error);

 /**
 * Wraps an promise function so that can more easily be used from 
 * the command line. You just supply the actual function to run, and
 * an optional validation function. The body function must return a Q promise 
 * (right now that's the only promise library supported). The returned 
 * function will call the validation routine and then, assuming it doesn't
 * throw, the function body, and returns the promise from that function body.
 * The repl or the single-command engine will then know to pause and wait until the
 * promise is resolved or rejected.
 * 
  * */
 var promiseCommand = module.exports.promiseCommand = function(fn,validate,options) {
     return function() {
         try {
            // need a copy of arguments array capable of being concatenated to another array.
            var args = Array.prototype.slice.call(arguments,0);
            
            if (validate) {
                // allow the user to validate
                args = validate.apply(null,args);
            }
            
            // now, just call the function, and it *should* be returning a promise.
            var result = fn.apply(null,args);
            // allow specifying a timeout on the wait.
            // Q promises already have a 'timeout' property (and yes, we
            // should use that instead), so I need to put it in a different
            // place.
            if (options && options.timeout) {
                result.waitTimeout = options.timeout;
            }
            return result;
        } catch (e) {
            return Q.reject(e);
        }
    }
    return result;
 }

 /** 
  * defer, callbackToPromise and resolvedPromise are functions included
  * to make it easier for commands to use the same promise library supported
  * by the engine.
  * */ 
 module.exports.defer = Q.defer.bind(Q);
 
 module.exports.resolvedPromise = Q.resolve.bind(Q);
 
 module.exports.when = Q.when.bind(Q);

 
 var loadCommand = module.exports.loadCommand = function(name) {
     if (commands.indexOf(name) > -1) {
         var lib = require("./commands/" + name);
         return lib;
     } else {
         throw new CommandError("Unknown command: " + name);
     }
 }


 var installCommands = module.exports.installCommands = function(context) {
      commands.forEach(function(name) {
          if (context.hasOwnProperty(name)) {
              throw "Context already has command named: " + name;
          }
         Object.defineProperty(context, name, {
             get: function() {
                 var lib = require("./commands/" + name);
                 context[name] = lib;
                 return lib;
             },
             // let the user override.
             set: function(val) {
                 delete context[name];
                 context[name] = val;
             },
             configurable: true
         });
     });
 }
 
var toBoolean = module.exports.toBoolean = function(value) {
    value = value && (value.toLowerCase && value.toLowerCase()) || value;
    if ((value === true) ||
            ((typeof value === "number") && (value !== 0)) ||
            (value === "true") ||
            (value === "yes") ||
            (value === "on")) {
        return true;
    } else if ((value === false) ||
               (value === 0) ||
               (value === "false") ||
               (value === "no") ||
               (value === "off")) {
        return false;
    } else {
        throw new CommandError("Invalid value for boolean argument: " + value)
    }
}
