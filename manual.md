Stew Tools CLI for Node.js
==========================

//  Many commands listed here are not implemented yet, or at least aren't
//  complete. I will implement them as I need them, or as I get requests to do
//  so.

Stew Tools CLI (command-line interface) is intended as a quick and dirty way to
get into the nuts and bolts of a stew project, until a GUI (graphical user
interface) is developed. It can also be useful for scripting or batch processing
of stew projects.

The CLI has two modes: "single-command" and "interactive". There are slight
differences between how each of them are used, but in general a command that
works in single-command mode should work the same in interactive mode.

This implementation of stew tools is written in JavaScript using Node.js. This
does not mean that other implementations will ever be written, but it is
mentioned to indicate that other implementations may vary in how they behave.

Single-Command Mode:
--------------------

In single-command mode, a command is issued from the command line by passing it
as the first argument to the "stew" command. Arguments for the command are then
typed after this, using conventional command line argument parsing. Only text
arguments can be passed. No state is stored in between commands, so each use of
a command requires re-opening a stew project, finding where you are in it, and
then running the command. Therefore, single-command mode is intended mostly for
when you need to run one quick command and then get on to other work.

Interactive Mode:
-----------------

Interactive mode is initiated by running the "stew" command without arguments,
or by using the `open` or `init` commands in single-command mode.
This brings you into a shell-like interface that let's you type and execute
commands, while maintaining a memory of project state, as well as making it easy
to maintain your own state using variables. This is more useful when doing lots
of interaction with the stew project.

There are a few commands which only work in interactive mode, that are used to
manage the project state. For example, there are commands to manipulate a
"current working document" in much the same way a command-line shell maintains a
"current working directory". This makes it easier to work with one document at
once and navigate throughout the tree of documents. This state is maintained
between stew tools sessions.

Because this is Stew Tools CLI *for Node.js*, stew commands in interactive mode
are just JavaScript functions. They are called by name from the command-line,
wrapping arguments in comma-separated lists inside parentheses. Any type of
JavaScript data may be passed as arguments (as long as the command supports
this). This, of course, implies that other implementations of Stew Tools CLI
would use different scripting languages.

Keep in mind that many of these commands are asynchronous, which means you
can't just assign their results to a value. In order to get the results of
asynchronous commands, you'll find them stored in a special variable 
called "_".

### Non-Stew Commands:

Interactive mode is implemented using Node.js' [Read-Eval-Print Loop module][1].
This includes a few simple commands which are prefixed with a dot, that allows
you to manage the interface itself. These commands are described in the
documentation for this module, but they include an ".exit" command to close the
interface.

In order to pull in missing, but sometimes rather important shell commands, such
as "ls", "grep", and "mv" the NPM module [ShellJS][2] has been included.

[1]: <http://nodejs.org/api/repl.html>

[2]: <https://github.com/arturadib/shelljs#command-reference>

Pattern-Matching:
-----------------

In normal shell commands on some operating systems, unquoted arguments which
contain characters like '\*' and '?' are treated as patterns to match against
filenames. Instead of a single parameter which contains just that string, zero
or more parameters will be passed, each one containing an existing filename that
matched the pattern.

Since Stew deals with file names in a slightly different way than the shell,
this can cause problems. Many stew commands want *document* names, not the file
names that are part of  the document. This means that, you have to be extra
careful when using these in single-command mode. Generally, you probably
want to quote these glob patterns to pass them correctly.

Most stew commands do accept glob patterns where they require a document
name. These are not automatically expanded into extra arguments, as they 
are in a shell, but turned into arrays or a single file as necessary by
the command. 

Most commands that accept glob patterns will also accept RegExp or Glob
objects, described below. However, these are deprecated, as the pattern
matching algorithms which use these are fairly poor. Instead, just pass
a string containing pattern-matching characters.

Commands:
---------

The commands are divided into categories below and listed by their usage. Some
"commands" may appear multiple times with different usages. Arguments to a usage
are listed by their types. They are optional if listed in square brackets, and
required if listed in angle brackets.

Whenever a command is said to run against the 'current working document', in
single-command mode this will be the current working directory. Sometimes, the
current document would be invalid for the specified command, such as attempting
to edit when the current working document is the root of the project.

### Argument Data Types:

-   `string`

-   `number`

-   `boolean`

-   `Doc`: An object which has a 'listDocs' function, such as those returned by
    core API calls.

-   `RegExp`

-   `Glob`: Returned by the 'glob' command.

-   `docpath`: Shorthand for saying that the command will accept a string, Doc,
    RegExp or Glob, which will be used to find an actual document in the
    project, usually relative to the current working document

### Interactive-Only Commands:

-   `close`: See the open command, below. This closes the current stew project.

-   `project`: Allows access to the in-memory project object itself, giving you
    access to everything in the project using the core API.

-   `doc`: Gives API access to the current working doc. Note that this
    command is asynchronous, and must be called to get the value.

-   `goto [docpath]`: Changes the current working doc to the specified value.
    This value can be a string path, relative to the base of the project, a
    RegExp, a Glob (see `glob` below), or it can be an actual API doc object. If
    no argument is passed, the new working directory will be the root of the
    project.

-   `next [filter]`: Changes the current working doc to the next one in document order.
    Specifying a filter (see `lsdoc`) allows you to skip documents that don't match the filter.
    Note that a recursive filter causes the children of all siblings to be included,
    allowing for a inefficient directory walking mechanism.

-   `previous [filter]`: Changes the current working doc to the previous one in document
    order. Specifying a filter (see `lsdoc`) allows you to skip documents that don't match the filter.
    Note that a recursive filter causes the children of all siblings to be included,
    allowing for a inefficient directory walking mechanism.

-   `down`: Changes the current working doc to the first child of the current
    doc.

-   `up`: Changes the current working doc to the container of the current
    doc.

-   `glob <string>`: *(Deprecated)* Turns a string containing pattern characters such as '\*'
    and '?' into a "Glob" object, which can be used by various commands to
    create a RegExp that matches against relative paths. Most commands which
    accept RegExp values as arguments will also accept these. However, these
    commands will generally accept string patterns, which will be compiled
    into a form that will match much more efficiently. Using this function
    is not recommended.

-   `clear`: The project state maintains a cache of document properties. Use
    this command to clear that cache on the current project, in cases where an
    external process might have changed some of the property files. In
    single-command mode, the cache only lasts the lifetime of the command.
    
-   `f`: This is an object which contains functions for creating filters
    for use in `lsdoc` and other commands which contain document filters.
    
    
    
### Stew Project Commands:

These are commands which manage the stew project itself. These commands
differ slightly depending on which mode they are used with.

-   `open <string> [boolean]` (interactive mode): Opens a Stew Project either in the current
    working directory, or at a specified path relative to that. If no stew
    project is found in the directory, it will look upwards in containing
    directories until it finds one. If the second argument passed is "true",
    this automatic searching will not happen. This command is mostly useless in
    single-command mode, except for possibly as a quick check to see if a
    project exists in the directory.
    
-   `open <string> [boolean]` (single-command mode): Starts
    up interactive mode and opens the specified project. In this case,
    the second argument is used to turn on private mode (searching is
    automatically turned off with this version). In private mode, the 
    global settings will not be saved, which means projects opened in 
    the repl will not be remembered. This is useful for using stew with 
    sensitive documents.

-   `init <string>` (interactive mode): Creates a Stew Project in the 
    current working directory, or at the specified path. This will first 
    check if the directory is within a
    stew project already, and return an error if it is. This does not completely
    prevent creating nested stew projects, since it doesn't check downwards
    through all directories, but it helps.
    
-   `init <string> [boolean]` (single-command mode): Creates a Stew Project
    as with the interactive mode version, then opens up the repl with the
    new project. The second argument can be used to turn on private mode,
    as with `open`.

### Configuration Commands:

These commands manage the properties for the project.

-   `config get <string>`:

-   `config set <string> <any>`:

-   `category create <string>`: Creates a new category

-   `category remove <string>`: Removes a category

-   `category list`: Lists all categories.

-   `category get <string> <string>`:

-   `category set <string> <string> <any>`:

-   `category rename <string> <string>`:

-   `status create <string>`:

-   `status remove <string>`:

-   `status list <string>`:

-   `status order <string> <string> [string]`:

-   `status rename <string> <string>`:

-   `config editor <string> [<string>]`: Get or set a command to use for editing
    a mime-type.

### Tag Management Commands:

These commands are for managing the tag and their properties in the stew
project. In this case, doc paths reference the paths to the tags themselves, and
therefore current working document can't be used.

-   `tags list`: Lists all tags available in the project.

-   `tags create <string>`: Makes a new tag

-   `tags remove` `<docpath>`: Removes a tag

-   `tags move <docpath> <docpath> [string]`:

-   `tags get <docpath> <string>`:

-   `tags set <docpath> <string> <any>`:

-   `tags edit <docpath>`:

### Document Management Commands:

These commands help manage documents.

-   `lsdoc [docpath] [<boolean | string | function> [<string | array of string> [command...]]]`: Lists stew
    documents in the  specified or current working document, in their normal
    order. The second argument specifies a filter, and the third argument
    specifies the name of fields or properties to return. The fourth argument
    is a command to run on each file.
    
    -   The filter can be a boolean, string or a function.
        -   A boolean value of true causes the list to be recursive. This
            is only possible in interactive mode, as true-like strings will
            be treated as filenames.

        -   A generic function would basically take an API Doc object and a
            callback, which is called with an error, a boolean as to whether to
            include the file, and a boolean as to whether to look at child
            documents in a folder.

        -   Otherwise, there are several "built-in" filter functions, available
            only in the interactive command mode. Note that if a filter
            function takes a filter as an argument, that argument can be
            one of these functions, a generic filter function, or a string
            filter definition.
            
            -   `f.name(<string>)`: filters for file with a basename matching the
            specified pattern.
            
            -   `f.path(<string>)`: filters for files with a path (from
            the project root to the basename) matching the specified
            pattern.

            -   `f.tag(<array of string>)`: filters for files containing
            the specified tags.

            -   `f.category(<string>)`: filters for files with the
            specified category.

            -   `f.status(<string>)`: filters for files with the specified
            status.

            -   `f.publish`: filters for files with publish set to
            true.

            -   `f.property(<string>[,<string>])`: filters for files
            with a specified property name with the specified value. Will
            match files which have any defined value for the property if
            no value is passed.

            -   `f.recurse(filter[,filter])`: automatically turns any filter into
            a recursive list. If only one filter is passed, all searches
            will be recursive, even if the file itself doesn't match the
            filter. However, if a second filter is passed, recursion will 
            only happen if the file matches that filter. If no filters
            are passed, all files are returned. The recurse
            filter must be the top level, surrounding all other filters,
            if it is wrapped inside another filter, that's not a recurse,
            then no recursion will happen.

            -   `f.or(<array of filters>)`: A file matches if it
            matches one of the filters in the list. The filter will return
            as soon as it matches, so filters after the matching filter
            will not be processed.

            -   `f.and(<array of filters>)`: A file matches only if
            all filters match. The filter will return as soon as it doesn't
            match, so filters after a failed filter will not be processed.

            -   `f.not(<filter>)`: A file matches only if the file
            doesn't match the specified filter.
            
            -   `f.parse(<string>)`: Parses the specified text according
            to the string values described below, into a function.
            
        -   The strings, made available for single-command mode, map to the
            above functions. Note that any spaces mean the string needs to be
            enclosed in quotes from the command line. When the string filter
            definitions take a filter in parentheses, that filter *must*
            be another filter definition.

            -   `<string>`: shortcut for `name=`, where the string is a
                glob pattern.
            
            -   `name(<string>)`

            -   `tag(<string>[,<string>]*)`

            -   `category(<string>)`

            -   `status(<string>)`

            -   `publish`

            -   `property(<string>,<any>)`

            -   `recurse[(<filter>[,<filter>])]`

            -   `or(<filter>[,<filter>]*)`

            -   `and(<filter>[,<filter>]*)`

            -   `not(<filter>)`
            
            -   `all`
    
    -   The field select functions can either be a comma-delimited string
    listing of getters, a function, or an array of strings and functions. 
    
        -   a generic function would be take a doc object and a callback,
            and call that callback with an error, the field name of the value,
            and the property of the value.
        
        -   otherwise, there are the following built-in selector functions.
    
            -   `g.category`
        
            -   `g.status`
        
            -   `g.tags`
        
            -   `g.tag(<string>[,<string>]*)`: a boolean field that indicates whether the
                item was tagged with the specified name.
        
            -   `g.publish`
        
            -   `g.property(<string>)`
        
            -   `g.synopsis`: In this case, the value is not listed in a column
                delimited list, but returned on the next line after the name of the
                file.
                
        -   The string equivalents for the above functions, are:
        
            -   `category`
            
            -   `status`
            
            -   `tags`
            
            -   `tag(<string>[,<string>])`
            
            -   `publish`
            
            -   `property(<string>)
            
            -   `synopsis`
            
        -   When a lone string is passed as the selector argument, it is
            parsed as a comma-delimited set of the above string-based
            getters. 
            
        -   When an Array is passed as the selector argument, any string
            items are parsed as one of the set of above string-based 
            getters. Only one such command can be passed per item.
        
    -   When a command is passed as the last argument, after the list is
    made, this command is run for each returned item in the list, passing
    the document as the first argument. Any further arguments to the
    command will be passed after that. This essentially allows you to
    turn the `lsdoc` command into a sort of `foreach`, or more, a `map`. 
    Once the commands have processed, an array will be returned containing
    the results of these commands for each item in the list.

-   `edit [docpath] [string]`: Looks for a primary file on the specified
    document (or current working document), and attempts to open it using the
    current operating system's specified program for opening such documents. The
    second argument is a file extension, without the period. This is necessary
    if 1) the primary file does not exist and needs to be created or 2) there
    are multiple primary files with different extensions.

-   `mkdoc [docpath] <string>`: Creates a new document relative to the current
    working document.

-   `mvdoc <docpath> <docpath> [string]`: Moves the document specified by the
    first argument into the document specified by the second. Optionally, it
    will also be renamed with the third argument.
    
-   `rename <docpath> <string>`: Renames the base of the document specified by
    the first document to the name specified by the second.

-   `dupdoc <docpath> <docpath> [string]`: Copies the document specified by the
    first argument into the document specfied by the second, optionally giving
    the result a new name.

-   `gprop [docpath] <string>`: Gets the value of a property on the current
    document, or the specified document. The properties "status", "category" and
    "publish" can be managed with get- and set-prop, and even then not in the
    root document. All other property names used with this command will be
    stored and retrieved from the 'user' space of the properties, so this can
    not be used to work with references and tags.

-   `sprop [docpath] <string> <any>`: See get-prop.

-   `tag [docpath] <string>`: Adds the specified tag to the specified document.

-   `untag [docpath] <string>`: Removes a tag from a document.

-   `lstag [docpath]`: Lists the tags in a document.

-   `addref [docpath] <docpath> [string]`:

-   `rmref [docpath] <docpath>`:

-   `lsref [docpath]`:

-   `ord [docpath] <string | number> [string]`: Repositions the specified
    document in its parent directory. The second argument specifies the new
    position. The third argument is needed for the "before" and "after"
    positions to indicate another document.

-   `nstat [docpath]`: Moves the document to the next status, and returns that
    status.

-   `pstat [docpath]`: Moves the document to the previous status, and returns
    that status.

-   `synopsis [docpath]`: Attemps to edit the synopsis for the current document.

-   `gsynopsis [docpath]`: Returns the text of the synopsis for the current
    document.

-   `thumbnail [docpath] [string]`: Attemps to edit the thumbnail for the
    current document. The second parameter is a file extension, used similarly
    to the edit command.

-   `notes [docpath] [string]`:

-   `backup [docpath] [string]`: Backs up the specified document, with an
    optional ID, or with a timestamp otherwise. The ID can only be specified if
    the docpath is also specified.

-   `lsbackup [docpath]`: Lists the backups that have been made.

-   `restore <docpath> <string>`: Restores a backup. Because this can destroy
    data, the arguments are required.

### Processing Tools:

-   `graph references [docpath] <string>`: Creates a graphml file out of the
    specified document, or all documents in the project, with connections
    between documents that reference each other.   -   `graph tree [docpath]
    <string>`: Creates a graphml file out of the specified document, or all
    documents in the project, with connections between documents that follow or
    precede each other. In the graph, folder documents are considered to precede
    their contents, and to follow the contents of preceding folder documents.
    These relationships are maintained using the "port" elements in the graphml
    document. There is no equivalent applyGraph for this, as such a command
    would involve moving files around in directories.   -   `applyGraph
    references <string>`: Reads a reference graph and applies it's changes to
    the references properties of the documents. All references will be
    overwritten, so backups are suggested before you try this for the first few
    times.  -   `tree [docpath] <string>`: Creates a text file which visualizes
    the file tree of the project or the specified document, including  synopsis
    and file tags.   -   `publish [docpath] <string>`: Creates a publishable
    directory of files.   Iterates recursively through all of the documents in
    the specified  document, or in the project. If the document has a publish
    property  set to true, the document will be copied to the directory with a
    similar name, but with a prefix indicating the order it is to be  listed in.
