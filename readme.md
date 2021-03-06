*If there is anyone who is following this project: I am no longer maintaining this project, and I was alerted to a security vulnerability in one of the requirements, so I do not recommend using it.*

*I no longer use writing organizers for myself, I have found better ways, and stew was a stepping stone towards that.*

*[A GUI version of stew is now available.](https://github.com/user4815162342/stew-gui) This command line version is not deprecated, however, I am focusing on the GUI for now, and any new features will probably show up there first.*

Stew
====

Stew is a way to organize notes, documents, research, etc. It's hard to explain
until you need it.

I intend to use it as an alternative not only to authoring applications like
Scrivener, but also note-keeping applications like OneNote and EverNote.

The primary goal for Stew involves data storage. All of the above applications
use proprietary mechanisms for saving their data, although some are better than
others. The primary problems with this is that they are either not portable, not
future-proof, or not flexible enough.

For example, some of the applications above cost money, and you will need to
keep shelling out money to keep their software working in order to access your
data. Or, they might not even have software available on the platform you want
to use. Or, if they are free and cross-platform, there is no insurance that the
software will remain in use in the future.

Stew solves this problem by decoupling the software from the data. No
proprietary databases are used here, everything is stored in the file system.
Sure, some of the software above does this as well, but Stew goes several steps
further. Files are organized in the file system almost exactly the way your
project is organized -- folders are folders, documents are documents. When it's
necessary to store metadata, it's not stored in some big XML file, it's stored
right alongside the document. Finally, Stew doesn't care what kind of format you
want to keep your primary documents in. Plain text files, word processor
documents, image files, audio files, whatever you want, you can store it in
Stew.

In essence, a stew project is the files you see on disk. Stew itself is just a
set of tools which makes it easier for working with them. Because of this,
anytime you want to use Stew on a computer you can't get the tools for, then
you're not blocked from making changes. If you want to edit a document, just
open it up in an available editor. If you want to quickly change a tag, status
or other property for a scene, you just open up the properties file in a
text-editor and make the change. If you need to edit the notes for the document,
you'll find them right there.

And, someday, if Stew isn't around, and you stumble upon your own project, you
will probably still be able to go through it and see what's there.

## Installation:

Stew command line is an application. It isn't really intended as a library,
so you should install it globally to make "stew" available in your path:

`npm -g install stew-cli`

Sudo as necessary.

That said, it is possible to use stew-cli as a library, to some extent,
although the advantages of this aren't clear to me. In that case, you
should install it locally in your project.

`npm install --save stew-cli`

You should then be able to run stew commands from the command line.

`stew version`

