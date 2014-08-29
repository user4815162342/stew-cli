var util = require('util');
var path = require('path');

 // In order to 'install' a command, it not only has to be located in
 // the commands subdirectory, but it has to be referenced here. This
 // is a security measure. We don't have plugins (yet).
 var commands = [
    "open","init","lsdoc","edit","config","tags","mvdoc","dupdoc",
    "lsbackup","restore","graph","applyGraph","publish","mkdoc",
    "gprop","sprop","tag","untag","lstag","ref","unref","lsref",
    "ord","nstat","pstat","gsynopsis","synopsis","notes","thumbnail",
    "backup","version","brokenClock","car"];


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
 * Takes a function and some arguments, and turns it into something
 * that can be called asynchronously, either from the repl or the
 * single-command interface.
 * */
var AsynchronousCall = module.exports.AsynchronousCall = function(fn,args/*...*/) {
    args = Array.prototype.slice.call(arguments,1);
    
    this.run = function(cb) {
        if (typeof cb !== "function") {
            throw new CommandError("Callback not specified. This is most likely caused by calling the 'run' function in the repl command, instead of letting the repl handle all of that.");
        }
        fn.apply(null,args.concat(cb));
    }
}

/**
 * Wraps an asynchronous function so that can more easily be used from 
 * the command line. You just supply the actual function to run. The
 * returned function will be a synchronous function that returns
 * an AsynchronousCall object when called with arguments, passing
 * those arguments on to the core function. The repl or the 
 * single-command engine will then be able to find it and
 * call it's run method with a callback. The interface will then
 * pause and wait for the asynchronous code to complete.
 * 
 * */
 // TODO: You know, this is sort of starting to look like a promise pattern.
 // Perhaps it would be better to move the core over to a promises
 // architecture instead, then any number of things would suddenly
 // work without even trying.
 var asyncCommand = module.exports.asyncCommand = function(fn,validate,options) {
     return function() {
         // We need to bind variadic arguments to the AsynchronousCall
         // constructor. See stackoverflow.com/questions/3362471/how-can-i-call-a-javascript-constructor-using-call-or-apply/14378462#14378462
        
        // need a copy of arguments array capable of being concatenated to another array.
        var args = Array.prototype.slice.call(arguments,0);
        
        if (validate) {
            // allow the user to validate
            args = validate.apply(null,args);
        }
        
        // need to create a function with bound arguments out of the constructor.
        // just applying won't work, because applying requires us to have
        // the object already.
        // Since the arguments we are binding are variadic, we have to use 
        // bind.apply, not just bind. Now, apply requires two arguments: 
        // the object that will become the 'this' and an array of arguments.
        // Bind requires multiple arguments, and the first one is the
        // one that requires the 'this'. Thus, we have to specify the
        // constructor function as an argument *twice*, once as an argument
        // to apply, and once as an argument that will be passed on to bind
        // by apply.
        var constructor = AsynchronousCall.bind.apply(AsynchronousCall,[AsynchronousCall,fn].concat(args));
        // now, we just have to create the object, and in theory, the constructor will
        // by AsynchronousCall.
        var result = new constructor();
        // allow specifying a timeout on the wait.
        if (options && options.timeout) {
            result.timeout = options.timeout;
        }
        return result;
    }
    return result;
 }

 
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
