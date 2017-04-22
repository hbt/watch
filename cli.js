#!/usr/bin/env node

var argv = require('minimist')(process.argv.slice(2))
var execshell = require('exec-sh')
var path = require('path')
var watch = require('./main.js')
var cp = require('child_process'),
  psTree = require('ps-tree');
//var console = require('tracer').colorConsole()

// TODO(hbt) NEXT sigint sighup handling and interruptions -- orphans and memory leaks
// TODO(hbt) NEXT case where we stop and reload instead of wait and reload
// TODO(hbt) NEXT singleton-lock singleton-kill
if(argv._.length === 0) {
  console.error([
    'Usage: watch <command> [...directory]',
    '[--wait=<seconds>]',
    '[--filter=<file>]',
    '[--interval=<seconds>]',
    '[--singleton]',
    '[--ignoreDotFiles]',
    '[--ignoreUnreadable]',
    '[--ignoreDirectoryPattern]'
  ].join(' '))
  process.exit()
}

var watchTreeOpts = {}
var command = argv._[0]
var dirs = []

var i
var argLen = argv._.length
if (argLen > 1) {
  for(i = 1; i< argLen; i++) {
      dirs.push(argv._[i])
  }
} else {
  dirs.push(process.cwd())
}

var waitTime = Number(argv.wait || argv.w)
if (argv.interval || argv.i) {
  watchTreeOpts.interval = Number(argv.interval || argv.i || 0.2);
}

if(argv.singleton || argv.s)
  watchTreeOpts.singleton = true

if(argv.ignoreDotFiles || argv.d)
  watchTreeOpts.ignoreDotFiles = true

if(argv.ignoreUnreadable || argv.u)
  watchTreeOpts.ignoreUnreadableDir = true

if(argv.ignoreDirectoryPattern || argv.p) {
  var match = (argv.ignoreDirectoryPattern || argv.p).match(/^\/(.*)\/([gimuy]*)$/);
  watchTreeOpts.ignoreDirectoryPattern = new RegExp(match[1], match[2])
}

if(argv.filter || argv.f) {
  try {
    watchTreeOpts.filter = require(path.resolve(process.cwd(), argv.filter || argv.f))
  } catch (e) {
    console.error(e)
    process.exit(1)
  }
}


function killAllOrphans(pid)
{
  psTree(pid, function(err, children)
  {
    cp.spawn('kill', ['-9'].concat(children.map(function(p)
    {
      return p.PID
    })));
  });
}

var wait = false

var dirLen = dirs.length
var skip = dirLen - 1
var childMonitor 
for(i = 0; i < dirLen; i++) {
  var dir = dirs[i]
  console.log('> Watching', dir)
  watch.watchTree(dir, watchTreeOpts, function (f, curr, prev) {
    if(skip) {
        skip--
        return
    }
    if(wait) return

    // ignore modified files if command (child process) is already running (do not create another process)
    if(watchTreeOpts.singleton && childMonitor)
    {
        psTree(childMonitor.pid, function(err, children)
        {
          // all children are done executing. We can now launch command again.
          if(!children.length)
          {
            childMonitor = execshell(command)
          }
        });
    }
    else
    {
      childMonitor = execshell(command)
    }

    

    if(waitTime > 0) {
      wait = true
      setTimeout(function () {
        wait = false
      }, waitTime * 1000)
    }
  })
}
