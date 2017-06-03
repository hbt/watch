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
  console.log('write')
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

function checkScriptQueuesWhileRunningAndExecutesTwice()
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

        // queue during process run
        writeToWatchedTarget()
        assert.equal(data, 'hello\nhello\n')

      });
    }, 2000)

    setTimeout(function()
    {
      fs.readFile(target2, 'utf8', function(err, data)
      {
        if(err)
        {
          return console.log(err);
        }

        // check queued item triggered another execution
        assert.equal(data, 'hello\nhello\nhello\n')

      });
    }, 9000)
   
  }, 8000) 
}

function testSingleton() {

  // this call should be ignored since we passed singleton
  writeToWatchedTarget()
  
  checkScriptWasExecutedOnce()
  checkScriptStillWorksOnceExecutionIsComplete()
}

function testQueue() 
{
  clearFile()
  checkScriptQueuesWhileRunningAndExecutesTwice()
}

clearFile()

var monitor = createMonitor()

// 2 tests available. uncomment -- 
// tests sould be rewritten as to use timeouts 
testSingleton()
// Note(hbt) uncomment -- not worth spending time reorganizing tests
//testQueue()




process.on('uncaughtException', function(err)
{
  console.error(err)
  killChildrenRecursively(monitor)
})
