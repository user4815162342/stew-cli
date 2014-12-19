var repl = require('repl');
var Q = require("q");
var engine = require('./engine');
var manager = require("./manager");
var path = require("path");
var style = require("./style");
var readline = require("readline");
var shortenPath = require("./shortenPath");
var writer = require("./writer");


/**
 * This module runs the interactive mode for stew commands. It is basically
 * just a node repl, with a couple of modifications:
 * - the built-in node modules are *not* automatically available.
 * - shelljs/global *is* required, giving you a simple shell.
 * - all of the commands available in single-command mode, except slightly
 * more useful since you can pass javascript values to them instead of just
 * strings.
 * - a function called "wait()" allows you to pass this when an asynchronous
 * callback is needed, and it will pause the interface until that callback
 * is called back, and return whatever value was passed to it.
 * - a command called 'command', which makes it easier to turn any asynchronous
 * function (that takes a callback as it's last parameter) into a command.
 * */
 
 // I have to do things like this a few times with repl and readline. I'd rather
 // I didn't, but...
 // this one strips out the ansi colors from the prompt to get the
 // correct length. Without this, the REPL puts the cursor over about
 // eight spaces from the end of the prompt when using colors.
 var setPrompt = function(prototype) {
     var old = prototype.setPrompt;
     return function(prompt,length) {
        if (arguments.length === 1) {
            old.bind(this)(prompt,style.clear(prompt).length);
        } else {
            old.bind(this)(prompt,length);
        }
     }
 }
 readline.Interface.prototype.setPrompt = setPrompt(readline.Interface.prototype);
 
 var replEval = function(interface) {
     var old = interface.eval;
     return function(command,context,filename,callback) {
         var waiting = false;
         // this loosely inspired by node-syncrepl, except not as complicated.
         /**
          * Use wait() whenever a function requires an asynchronous callback.
          * Using 'wait' itself is not enough. Calling this function pauses
          * the repl, and returns a callback function that can be used by 
          * the asynchronous code. When that callback function is called,
          * it will report the result and error and resume the repl.
          * 
          * Wait also initializes a timeout with a generous default of 10 seconds.
          * The primary purpose of this is to keep the repl open if the return
          * value of wait is accidentally used in a place where it is never 
          * invoked. Without this timeout, a pause when the process is not
          * waiting on a native asynchronous call will cause the process to
          * exit. To change this timeout, pass the number of milliseconds you
          * want to use to the function.
          * 
          * NOTE: this has to be declared here, because I need the
          * waiting scope inside the eval to simplify things (basically,
          * I only get one wait per eval)
          * */
         var wait = context.wait = function(timeout) {
             // prevent the user from calling this more than once.
             if (waiting) {
                 throw new Error("wait() called more than once.");
             }
             // there's a chance that someone made a mistake and
             // passed the variable 'wait' instead, in which case,
             // the timeout might actually hold an error object that
             // the user might want to know about. 
             if (((typeof timeout !== "number") && 
                  (typeof timeout !== "undefined") && 
                  (timeout !== null)) || 
                 (arguments.length > 1)) {
                 console.error("Invalid arguments passed to wait. This might have been due to an improper usage of 'wait', such as not referencing it as a function call. The arguments were:",arguments);
                 return;
             }
             timeout = timeout || 10000;
             waiting = true;
             // pause the readline so I can't press return until it's
             // finished.
             interface.rli.pause();
             var endWait = function(err,result) {
                 if (!callback) {
                     // the timer cancelled the callback to prevent
                     // the command from messing with the repl out
                     // of nowhere. So, the only way to report
                     // an error is this:
                     console.error("A call to wait() timed out awhile ago, but the asynchronous function finally called back. The arguments to the callback were:",arguments);
                     return;
                 }
                 clearTimeout(timer);
                 waiting = false;
                 // now, resume it.
                 interface.rli.resume();
                 // Note that, yes, if the result of running an AsynchronousCall
                 // is another AsynchronousCall, it will be run again.
                 handleResult(err,result);
             }
             var timer = setTimeout(function() {
                 endWait(new Error("wait() timed out in about " + (timeout / 1000) + " second(s)"));
                 // prevent the real cb from messing with things.
                 callback = null;
             },timeout);
             return endWait;
         }
         
         var handleError = function(err,result) {
             if (err && err instanceof engine.CommandError) {
                 console.error(err.message);
                 callback();
             } else {
                 callback(err,result);
             }
         }
         
         var handleResult = function(err,result) {
             if (result instanceof engine.AsynchronousCall) {
                 try {
                     result.run(wait(result.timeout));
                 } catch (e) {
                     // Just because we're catching any errors here, 
                     // we shouldn't be catching them in the command.
                     // The command *should* be using the callback,
                     // (or a validate function to validate arguments
                     // sync). Because if it doesn't, the 'wait' above
                     // will timeout.
                     handleError(e);
                 }
             } else if (Q.isPromise(result)) {
                // TODO: Q has a timeout function on the promise that does
                // pretty much what we're doing in the 'wait'. We should
                // find a way to use that instead, once I get rid of the
                // async call.
                 var cb = wait(result.waitTimeout);
                 result.then(function(result) {
                     cb(null,result);
                 },function(err) {
                     // Just because we're catching any errors here, 
                     // we shouldn't be catching them in the command.
                     // The command *should* be using the callback,
                     // (or a validate function to validate arguments
                     // sync). Because if it doesn't, the 'wait' above
                     // will timeout.
                     cb(err);
                 })
             } else if (err || !waiting) {
                 // If an error already occurred in the synchronous part
                 // of the function, I assume the callback will never be
                 // called, so let's just report it and not wait.
                 handleError(err,result);
             }
         }
         
         // call the old one, and handle it in the callbacks.
         old(command,context,filename,handleResult)
     }
 }

// NOTE: As soon as you run main, it takes over your 
// stdin (although you can control this), and runs the repl. Don't require this 
// unless you actually want to do this.
// options are passed to the startup.
var main = module.exports.main = function(options,input,output) {
    
    var defaultPrompt = "stew: $ ";
    
    var promptTrimLength = 30;
    
    var buildPrompt = function() {
        var project = manager.getProject();
        var doc = manager.getWorkingDoc();
        // Ellipsis character: U+2026
        if (doc.length > promptTrimLength) {
            doc = shortenPath(doc,promptTrimLength);
        }
        if (typeof project === "undefined") {
            return defaultPrompt;
        } else {
            // TODO: Here's a case where it would be nice if
            // we had a project title.
            return style(style(path.basename(project.basePath()),"bold") + ":" + doc + " $ ","green");
        }
    }
     // start up the manager to load state from settings.
     manager.startup(options,function(err) {
         if (err) {
             if (err instanceof engine.CommandError) {
                 console.error(err.message);
                 // stay open... it could just be that the open
                 // project couldn't find a non-existent project.
             } else {
                 console.error(err);
                 if (err.stack) {
                     console.error(err.stack);
                 }
                 process.exit(1);
             }
         }
         
         

            
         // clear builtInLibs, so we have to start from the beginning.
         // NOTE: This is global, so this conflicts with other users of repl.
         // FUTURE: This doesn't work... Not sure why. But I don't
         // really care right now.
         
         var interface = repl.start({
             prompt: buildPrompt(),
             ignoreUndefined: true,
             useGlobal: true,
             writer: writer,
             input: input || process.stdin,
             output: output || process.stdout
         })
         
         // When the project or doc changes, I want to update the
         // prompt. 
         manager.onProjectChanged(function(p,folder) {
             interface.prompt = buildPrompt();
         });
         
         // install shelljs stuff...
         var shell = require('shelljs');
         for (var cmd in shell) {
             if (cmd === "config") {
                 // override this one so *I* can use it.
                 interface.context["shelljsConfig"] = shell[cmd];
             } else {
                 interface.context[cmd] = shell[cmd];
             }
         }
         // This might just be useful to someone, so I'll include it.
         interface.context.async = engine.asyncCommand.bind(engine);
         
         // and now, we install the actual commands.
         engine.installCommands(interface.context);
         
         // and some comands on the manager that aren't useful in
         // single-command mode.
         manager.installCommands(interface.context);
         
         // I could set this in the .start command, but I want to make use of
         // the old one and just override it.
         interface.eval = replEval(interface);
         
         interface.on('exit',function() {
             manager.shutdownAlert();
             // I don't need to do this. Instead, I'm unreffing the
             // tasks and their std streams, and it will close automatically
             // instead (something I prefer)
             //process.exit();
         });

     });
     
     
 }
