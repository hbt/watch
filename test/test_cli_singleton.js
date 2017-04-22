// Note(hbt) use nodemon to run this test
// nodemon test_cli_singleton.js

var watch = require('../main')
  , assert = require('assert')
  , path = require('path')
  , fs = require('fs')
  , target = path.join(__dirname, "d/t")
  , target2 = path.join(__dirname, "d2/t2")
  ;
var execshell = require('exec-sh')
var cp = require('child_process'),
  psTree = require('ps-tree');


var monitor;

function clearFile()
{
  fs.writeFileSync(target, '')
  fs.writeFileSync(target2, '')
}


function createMonitor()
{
  var targetDir = path.join(__dirname, "d")
  var script = path.join(__dirname, "singleton-helper.sh")

  var cmd = path.join(__dirname, `../cli.js --interval=1 --singleton=true ${script} ${targetDir}`)

  return execshell(cmd)

}

function writeToWatchedTarget()
{
  execshell(`sleep 1; echo 'hello' >> ${target}`)
}

function checkScriptWasExecutedOnce()
{
  // last writeToWatchedTarget did not trigger the script because --singleton was passed and execution was not complete
  setTimeout(function()
  {
    fs.readFile(target2, 'utf8', function(err, data)
    {
      if(err)
      {
        return console.log(err);
      }

      assert.equal(data, 'hello\n')

    });
  }, 3000)

}

function checkScriptStillWorksOnceExecutionIsComplete()
{
  // another write much later triggers the script again 
  setTimeout(function()
  {
    writeToWatchedTarget()

    setTimeout(function()
    {
      fs.readFile(target2, 'utf8', function(err, data)
      {
        if(err)
        {
          return console.log(err);
        }

        assert.equal(data, 'hello\nhello\n')

      });
    }, 2000)
   
  }, 8000)
}

function killChildrenRecursively(monitor)
{
  psTree(monitor.pid, function(err, children)
  {
    cp.spawn('kill', ['-9'].concat(children.map(function(p)
    {
      return p.PID
    })));
  });

}

clearFile()

var monitor = createMonitor()
// this call should be ignored since we passed singleton
writeToWatchedTarget()

checkScriptWasExecutedOnce()
checkScriptStillWorksOnceExecutionIsComplete()


process.on('uncaughtException', function(err)
{
  console.error(err)
  killChildrenRecursively(monitor)
})
