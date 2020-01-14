var fs = require('fs')
var path = require('path')

var pull = require('pull-stream')
var toPull = require('stream-to-pull-stream')

require('ssb-client')(function (err, sbot) {
  if(err) throw err

  // %bnTRHCyFvPIgMndnCS0+Mq4UQJEdq0cSzgktKp3jAXk=.sha256
  
  /*
  pull(
    sbot.createHistoryStream({id: sbot.id}),
    pull.collect((err, msgs) => {
      console.log(JSON.stringify(msgs))
    })
  )
  */
  
  // FIXME: add rootId as input for updates
  // FIXME: add dir as input

  var name = "ssb-browser-demo"
  var changelog = "Initial version"
  var version = "1.0.0"

  function listDir(fs, dir, files)
  {
    fs.readdirSync(dir).forEach(filename => {
      const fullPath = path.resolve(dir, filename)
      if (!fs.statSync(fullPath).isFile())
	listDir(fs, fullPath, files)
      else
        files.push(fullPath)
    })

    return files
  }

  var originalDir = path.resolve("../ssb-lite/dist/")
  var files = listDir(fs, originalDir, [])
  
  console.log("Found files:", files)
  
  pull(
    pull.values(files),
    pull.asyncMap((file, cb) => {
      pull(
        toPull.source(fs.createReadStream(file)),
        sbot.blobs.add(cb)
      )
    }),
    pull.collect((err, blobIds) => {
      if (err) return console.error(err)
      console.log("Generated blobs:", blobIds)

      var blobs = {}
      for (var i = 0; i < files.length; ++i) {
        var relativePath = files[i].substring(originalDir.length+1)
        blobs[relativePath] = blobIds[i]
      }

      var initial = {
        type: 'ssb-browser-app',
        name,
        blobs,
        changelog,
        version
      }
      
      console.log(initial)

      sbot.publish(initial, (err, msg) => {
        console.log(msg)
      })

      sbot.close()
    })
  )
})
