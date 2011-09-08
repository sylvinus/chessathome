Chess@home
==========

Build
-----

Unit tests FTW! Run:

```

all of them:
$ fab test

with the distributed engine:
$ fab dist test

or just one

$ AI_ENGINE="distributed-mongo" node test/runner.js chess/positions1.js
$ AI_ENGINE="local" node test/runner.js chess/positions1.js

```
Install required dependencies:

```
$ fab install
```

Launch the server with local computation:

```
$ fab serve
```

Launch the server with distributed computation:

```
$ fab dist serve
```

Credits
-------

**Npm modules:**

 - [dnode](https://github.com/substack/dnode)
 - [node-webworker](https://github.com/pgriess/node-webworker)
 - [node-qunit](https://github.com/kof/node-qunit)
 - [sharedjs](https://github.com/kof/sharedjs)
 - [express](https://github.com/visionmedia/express)
 - [connect](https://github.com/senchalabs/connect)
 - [ejs](http://search.npmjs.org/#/ejs)
 - [mongoose](https://github.com/LearnBoost/mongoose)
 - [node-browserify](https://github.com/substack/node-browserify)
 - [underscore](http://documentcloud.github.com/underscore/)
 - [node-uuid](http://search.npmjs.org/#/node-uuid)

**Assets:**

 - [Oxygen icons for the globe](http://kde-look.org/content/show.php/Oxygen+Icons?content=74184)
 - [Twitter bootstrap](http://twitter.github.com/bootstrap/) (for the layout)
 - [GarboChess](http://forwardcoding.com/projects/ajaxchess/chess.html) (starting point for the IA and pieces icons)
