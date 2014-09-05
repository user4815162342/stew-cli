/**
 * The manager manages "shared resources" used in the tool. It's sort of a
 * global state thing without storing the data in the repl context. If 
 * used in the repl, then a startup and shutdown function will be 
 * called that let's it restore from and save to settings. 
 * */
var settings = require("./settings");
var path = require("path");
var engine = require("./engine");
var minimatch = require("minimatch");
var child_process = require("child_process");
var opener = require('opener');
var filters = require("./filters");
var mime = require("mime");
mime.default_type = null;

var project;
var workingDoc = "";
var inREPL = false;

/**
 * Called only in the repl, to initialize resources and user state
 * from settings.
 * */
module.exports.startup = function(options,cb) {
    var projectPath;
    if (arguments.length === 2) {
        if (options) {
            if (options.private === true) {
                settings.globals.privateMode(options.private);
            }
            projectPath = options.project;
        }
    } else {
        cb = options;
    }
    
    // if startup is called, then we are running in the REPL, and settings
    // should be stored.
    inREPL = true;
    
    // initialize the project that was open the last time.
    projectPath = projectPath || settings.globals.get("project");
    if (typeof projectPath !== "undefined") {
        require("./commands/open")(projectPath,true).run(function(err,result) {
            // the command should have already set the project itself,
            // so no need to do anything with the result.
            if (err) {
                if (err && err.code && (err.code === "STEW NOT FOUND")) {
                    // make sure we clear the project so it doesn't open
                    // again next time. Other errors might still allow
                    // us to open.
                    setProject();
                } 
                return cb(err);
            } 
            cb();
        });
    } else {
        cb();
    }
}

// FUTURE: Maybe the manager needs to be an event emitter here.
var projectChanged = function() {};
module.exports.onProjectChanged = function(fn) {
    
    projectChanged = fn;
    projectChanged(project,workingDoc);
}

/**
 * Called by commands which change the current open project. This
 * also applies the paths to the settings and *saves* so that
 * they will be reloaded next time.
 * */
 /*
  * NOTE: Saving the project here instead of on exit is simpler and more
  * robust (otherwise, if stew crashes before exit, it forgets where you
  * were), but it does lead to a potential issue:
  * 
  * 1) Run up Stew with Project A already set as the default, it will be automatically opened.
  * 
  * The user wants to quickly review another project, so:
  * 
  * 2) Run another instance of Stew: Project A will be automatically opened.
  * 3) in the second instance, open up Project B.
  * 
  * The user reviews the work, then: 
  * 
  * 4) Close the second instance of Stew
  * 
  * The user returns to the first instance and does a bunch of work.
  * 
  * 5) Close the first instance of Stew
  * 
  * The next day:
  * 
  * 6) Open up Stew: Project *B* will be automatically opened.
  * 
  * User is Surprised.
  * 
  * However.. this is not necessarily the wrong thing to do. There are
  * possibilities where the user *wants* this to happen. For example the
  * following could also happen, and as far as the program can see, the
  * same exact steps are taken.
  * 
  * 1) Run up Stew with Project A already set as the default, it will be automatically opened.
  * 
  * The user does some work on it, and finishes up, happy and satisfied,
  * but leaves it open. Later, the user wants to start working on a different
  * project.
  * 
  * 2) Run another instance of Stew: Project A will be automatically opened.
  * 3) in the second instance, open up Project B.
  * 
  * The user does a whole bunch of work on Project B, then.
  * 
  * 4) Close the second instance of Stew
  * 
  * The user is about to shut down the computer for the day, and notices
  * the first instance was still open.
  * 
  * 5) Close the first instance of Stew
  * 
  * The next day:
  * 
  * 6) Open up Stew: Project *B* will be automatically opened.
  * 
  * User doesn't even notice a problem, because that's the project he wants to work with now.
  */
var setProject = module.exports.setProject = function(p) {
    if (project !== p) {
        project = p;
        if (inREPL) {
            console.log("Project opened at: ",p.basePath());
            if (typeof p === "undefined") {
                settings.globals.delete("project");
                workingDoc = "";
            } else {
                settings.globals.set("project",p.basePath());
                
                workingDoc = settings.project(p.basePath()).get("working-doc",path.sep);
                // don't need to worry about calling setWorkingDoc, because
                // we already have the right path, and we're about
                // to notify that it's changed anyway.
            }
            settings.globals.save();
            projectChanged(p,workingDoc);
        } else {
            // we don't have settings to go against, so use setWorkingDoc
            // to get it to an appropriate path.
            setWorkingDoc(pathToWorkingDoc(process.cwd()));
        }
    }
}

/**
 * Called to retrieve the current open project.
 * */
var getProject = module.exports.getProject = function() {
    return project;
}

var pathToWorkingDoc = module.exports.pathToWorkingDoc = function(p) {
    if (project) {
        if (typeof p !== "undefined") {
            if (p.lastIndexOf(path.join(project.basePath(),path.sep),0) === 0) {
                p = p.slice(project.basePath().length);
                return p;
            }
            // we are possibly attempting to set a folder outside
            // of the project, so just return the base.
            return path.sep;
        } 
    }
    return "";
}

var setWorkingDoc = function(p) {
    if (typeof p === "object") {
        p = p.path();
    } else if (typeof p === "undefined") {
        p = "";
    }
    if (p !== workingDoc) {
        workingDoc = p;
        if (inREPL) {
            console.log("Working document changed to " + (workingDoc || "project root"));
            var s = settings.project(project.basePath());
            s.set("working-doc",workingDoc);
            s.save();
        } 
        projectChanged(project,workingDoc);
    }
}

var getWorkingDoc = module.exports.getWorkingDoc = function() {
    // In order to do anything with this folder, of course, someone
    // needs to actually open up the document.
    return workingDoc;
}

/**
 * Called by commans which require an open project. Will return the
 * currently open project, or attempt to open a project from the
 * current directory.
 * */
var requireProject = module.exports.requireProject = function(cb) {
    if (project) {
        cb(null,project);
    } else {
        require("./commands/open")(process.cwd()).run(cb);
    }
}

var requireWorkingDoc = module.exports.requireWorkingDoc = function(cb) {
    requireProject(function(err,project) {
        if (err) {
            return cb(err);
        }
        openWorkingDoc(cb);
    });
}

var requireWorkingDocPath = module.exports.requireWorkingDocPath = function(cb) {
    requireProject(function(err,project) {
        if (err) {
            return cb(err);
        }
        cb(null,workingDoc,project);
    });
}

var openWorkingDoc = module.exports.openWorkingDoc = function(cb) {
    if (typeof project !== "undefined") {
        project.root().getDoc(workingDoc,function(err,doc) {
            if (err) {
                return cb(err);
            }
            cb(null,doc);
        });
    } else {
        cb();
    }
}

/** Helper function to find a document given either a document object,
 * a path string (which might be relative), or a RegExp (preferably 
 * created with minimatch).
 * */
var requireRelativeDoc = module.exports.requireRelativeDoc = function(p,cb) {
    if (typeof p === "undefined") {
        // no argument passed, look for a current working document.
        requireWorkingDoc(cb)
    } else if ((typeof p === "object") && (typeof p.listDocs === "function")) {
        // actual document object passed, just pass it on
        // (note that this argument should be pre-validated)
        cb(null,p)
    } else if (typeof p === "string") {
        // we were passed a string. This could be a filename, or a pattern,
        // use matchDocs to get it.
        requireWorkingDoc(function(err,doc) {
            if (err) {
                return cb(err);
            }
            if (typeof doc === "undefined") {
                return cb(new engine.CommandError("Not in a stew project."));
            }
            doc.matchDocs(p,function(err,docs) {
                if (err) {
                    return cb(err);
                }
                if (docs.length == 0) {
                    return cb(new engine.CommandError("No matching doc."));
                }
                if (docs.length > 1) {
                    return cb(new engine.CommandError("Too many matching docs."));
                }
                cb(null,docs[0]);
            });
        });
    } else {
        // should be a RegExp or Glob if validation is working correctly, might
        // need to search relative to the current working document.
        requireWorkingDocPath(function(err,docPath,project) {
            if (err) {
                return cb(err);
            }
            if (typeof docPath !== "undefined") {
                if (p instanceof Glob) {
                    p = p.getRegEx(docPath);
                }
                project.root().listDocs(function(doc,cb) {
                    cb(null,p.test(doc.path()),true);
                },function(err,docs) {
                    if (err) {
                        return cb(err);
                    }
                    if (docs.length == 0) {
                        return cb(new engine.CommandError("No matching doc."));
                    }
                    if (docs.length > 1) {
                        return cb(new engine.CommandError("Too many matching docs."));
                    }
                    cb(null,docs[0]);
                });
            } else {
                return cb(new engine.CommandError("Not in a stew project."));
            }
        });
    } 
}

/**
 * The same as setProject() with an undefined parameter, except that
 * it logs a message to the console. Used as a simple command.
 * */
var closeProject = module.exports.closeProject = function(cb) {
    setProject();
    console.log("Project closed");
};

var changeWorkingDoc = module.exports.changeWorkingDoc = function(p,cb) {
    requireRelativeDoc(p,function(err,doc) {
        if (err) {
            return cb(err);
        }
        setWorkingDoc(doc);
        return cb();
    });
}

var changeWorkingDocBy = module.exports.changeWorkingDocBy = function(delta,filter,cb) {
    if (delta === 0) {
        // don't change doc. Not sure why anyone would want to do this.
        cb();
    } else {
        // Needs to be relative to the current doc, so we need to get that
        // first.
        requireWorkingDoc(function(err,doc) {
            if (err) {
                return cb(err);
            }
            if (!doc) {
                return cb(new engine.CommandError("Not in a stew project."));
            }
            // sibling-relative, so we need the parent doc.
            if (doc.path() === path.sep) {
                // can't do anything, but this is just the same
                // as if we went next on the last one, or previous
                // on the first.
                return cb();
            } else {
                var parentPath = path.dirname(doc.path());
                project.root().getDoc(parentPath,function(err,parent) {
                    if (err) {
                        return cb(err);
                    }
                    
                    // Need to 'fix' the filter. Without this, an attempt
                    // to move forward or backward from a document that
                    // *doesn't* match the filter causes us to move 
                    // first or last, respectively.
                    var includeThisFilter = function(filteringDoc,cb) {
                        filter(filteringDoc,function(err,pass,recurse) {
                            if (err) {
                                return cb(err);
                            }
                            // if already passing, then don't bother.
                            if (!pass) {
                                // set pass to true if we're at the same
                                // path.
                                pass = (filteringDoc.path() === doc.path());
                            }
                            return cb(null,pass,recurse);
                        });
                    }
                    
                    parent.listDocs(includeThisFilter,function(err,siblings) {
                        if (err) {
                            return cb(err);
                        }
                        var idx = -1;
                        for (var i = 0; i < siblings.length; i += 1) {
                            if (siblings[i].path() === doc.path()) {
                                idx = i;
                                break;
                            }
                        }
                        idx += delta;
                        if ((idx < siblings.length) && (idx >= 0)) {
                            var newDoc = siblings[idx];
                            if (newDoc) {
                                // there's always a chance that the user
                                // tried to trick us by passing a floating point number
                                // as a parameter, or worse...
                                setWorkingDoc(newDoc);
                            }
                        }
                        // if it didn't match, we might have been trying
                        // to go out of bounds. Just eat the issue, the
                        // user should be able to tell it's not at the
                        // right place.
                        cb();
                    });
                });
            }
        });
    }
}

var changeToFirstChild = module.exports.changeToFirstChild = function(cb) {
    // Needs to be relative to the current doc, so we need to get that
    // first.
    requireWorkingDoc(function(err,doc) {
        if (err) {
            return cb(err);
        }
        if (!doc) {
            return cb(new engine.CommandError("Not in a stew project."));
        }
        doc.listDocs(function(err,children) {
            if (err) {
                return cb(err);
            }
            if (children.length) {
                setWorkingDoc(children[0]);
            }
            return cb();
        })
    });
}

// FUTURE: Don't need this anymore.
var Glob = module.exports.Glob = function(pattern) {
    
    /**
     * Returns a regex after resolving the pattern relative
     * to another document.
     * */
    this.getRegEx = function(docPath) {
        return minimatch.makeRe(path.resolve(docPath,pattern));
    }
    
}

var clearCache = module.exports.clearCache = function() {
    if (project) {
        project.clearCache();
    }
}


/**
 * These are commands exposed to the REPL. They would be useless in
 * single-command mode, since they only change state that disappears
 * after each run.
 * */
var commands = {
    close: closeProject,
    
    proj: getProject,
    
    cwdoc: getWorkingDoc,
    
    doc: engine.asyncCommand(openWorkingDoc,function() { return [] }),
    
    chdoc: engine.asyncCommand(changeWorkingDoc,
            function(doc) {
                if (typeof doc === "undefined") {
                    return [path.sep];
                } else if ((typeof doc === "string") || (doc instanceof RegExp) || (doc instanceof Glob)) {
                    return [doc];
                }
                throw new engine.CommandError("Invalid argument to chdoc");
            }),
    
    ndoc: engine.asyncCommand(changeWorkingDocBy.bind(null,1),function(filter) { 
        if (typeof filter === "string") {
            filter = filters.parse(filter);
        } 
        if ((typeof filter === "function") ||
             (typeof filter === "boolean") ||
             (typeof filter === "undefined")) {
            return [filter];
        } else {
            throw new engine.CommandError("Invalid filter argument for ndoc.");
        }
    }),

    pdoc: engine.asyncCommand(changeWorkingDocBy.bind(null,-1),function(filter) { 
        if (typeof filter === "string") {
            filter = filters.parse(filter);
        } 
        if ((typeof filter === "function") ||
             (typeof filter === "boolean") ||
             (typeof filter === "undefined")) {
            return [filter];
        } else {
            throw new engine.CommandError("Invalid filter argument for pdoc.");
        }
    }),

    // TODO: Do I want to be able to do filters here?
    dndoc: engine.asyncCommand(changeToFirstChild,function() { return [] }),
    
    updoc: engine.asyncCommand(changeWorkingDoc.bind(null,".."),function() { return [] }),
            
    // TODO: It might be nice if commands that accepted a regex would
    // also check a filename for glob characters and create this matcher
    // itself. But, I don't want to have to "escape" glob characters, so
    // some sort of quick marker would be better (perhaps including a character
    // like '%' at the beginning of the string).
    glob: function(match) {
        return new Glob(match);
    },
    
    clear: clearCache,
    
    f: filters
    
}

module.exports.installCommands = function(context) {
    Object.keys(commands).forEach(function(name) {
          if (context.hasOwnProperty(name)) {
              throw "Context already has command named: " + name;
          }
          context[name] = commands[name];
    });
}

var tasks = {};
var taskID = 0;

module.exports.edit = function(path,taskDone,cb) {
    if (arguments.length === 2) {
        cb = taskDone;
        taskDone = void 0;
    }
    console.log("Editing " + path + "...");
    if (project) {
        project.stew(function(err,stew) {
            if (err) {
                return cb(err);
            }
            var type = mime.lookup(path);
            var editor;
            if (type !== null) {
                editor = stew.editor(type);
            }
            if (typeof editor !== "undefined") {
                return this.startTask("Editing " + path,opener.bind(null,path,{ command: editor }),taskDone,cb);
            } else {
                return this.startTask("Editing " + path,opener.bind(null,path),taskDone,cb);
            }
            
        }.bind(this));
    } else {
        return this.startTask("Editing " + path,opener.bind(null,path),taskDone,cb);
    }
}

module.exports.startTask = function(name,task,taskDone,cb) {
    if (arguments.length === 3) {
        cb = taskDone;
        taskDone = void 0;
    }
    var id = taskID;
    taskID += 1;
    tasks["" + id] = {
        task: task,
        name: name
    }
    var cp = task(function(err) {
        if (err) {
            console.error("task finished with error");
            console.error(name);
            console.error(err);
        } else {
            console.log("task finished: " + name)
        }
        if (taskDone) {
            taskDone(err);
        }
        delete tasks["" + id]
    });
    if (typeof cp.unref === "function") {
        tasks["" + id].process = cp;
    }
    cb();
}

module.exports.shutdownAlert = function() {
    var taskids = Object.keys(tasks);
    
    // unreference the ones we can...
    var i = 0;
    while (i < taskids.length) {
        var task = tasks[taskids[i]];
        if (task.process) {
            console.log("Detaching: " + task.name);
            task.process.unref();
            task.process.stdin.unref();
            task.process.stdout.unref();
            task.process.stderr.unref();
            taskids.splice(i,1);
        } else {
            i += 1;
        }
    }
    
    if (taskids.length > 0) {
        console.log("The following tasks are incomplete and could not be detached. You can press Ctrl-C to end stew anyway, but this may force these applications to close and lose your changes.");
        taskids.forEach(function(id) {
            console.log("> " + tasks[id].name);
        });
    }
};
