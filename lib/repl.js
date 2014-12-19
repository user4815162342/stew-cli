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
     var old = Q.nbind(interface.eval,interface);
     // Unfortunately, this can't be made into a promise function
     // because the node code is expecting a node-async pattern.
     return function(command,context,filename,callback) {
         
         var handleError = function(err) {
             if (err && err instanceof engine.CommandError) {
                 console.error(err.message);
                 callback();
             } else {
                 callback(err);
             }
         }
         
         var handleResult = function(result) {
             if (result instanceof engine.AsynchronousCall) {
                 // TODO: Get rid of this once everything is promises.
                 
                 // Just recurse with the promise result.
                 try {
                    handleResult(result.runPromise());
                 } catch (e) {
                     handleError(e);
                 }
             } else if (Q.isPromise(result)) {
                 interface.rli.pause();
                 result.timeout(result.waitTimeout || 10000).then(function(result) {
                     interface.rli.resume();
                     // This *should* have been the final promise, the result should no longer be a promise,
                     // so, callback.
                     callback(null,result);
                 },function(err) {
                     interface.rli.resume();
                     handleError(err);
                 });
             } else {
                 callback(null,result);
             }
         }
         
         // call the old one, and handle it in the callbacks.
         old(command,context,filename).then(handleResult,handleError);
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
     manager.startup(options).then(function() {
            
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
     },function(err) {
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

     });
     
     
 }
