var fs = require('fs')
var path = require('path')

var pull = require('pull-stream')
var toPull = require('stream-to-pull-stream')

require('ssb-client')(function (err, sbot) {
  if(err) throw err

  var program = require('commander')

  program
    .requiredOption('--dir [value]', 'The directory containing the application')
    .option('-t, --title [value]', 'Application title')
    .option('-a, --author [value]', 'The author of the application')
    .option('-d, --desc [value]', 'The description of the application')
    .requiredOption('-v, --appversion [value]', 'Application version')
    .option('-c, --changelog [value]', 'A changelog for the specified version')
    .option('-s, --screenshot [value]', 'The hash (sbot blobs.add) of a screenshot for the application')
    .option('-r, --root [value]', 'The root message of the thread or this application')
    .option('-b, --branch [value]', 'The previous message of the thread for this application')

  program.on('--help', function(){
    console.log('')
    console.log('If --root is specified title, author, description, screenshot and branch will automatically be extracted from previous message')
    console.log('')
  })

  program.parse(process.argv);

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

  var originalDir = path.resolve(program.dir)
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

      function postMsg(program) {
        if (!program.title || !program.author)
        {
          console.error("Unable to post, application must have at least title and author")
          return
        }

        var msg = {
          type: 'ssb-browser-app',
          name: program.title,
          blobs,
          version: program.appversion,
          author: program.author
        }

        if (program.changelog)
          msg.changelog = program.changelog
        if (program.desc)
          msg.description = program.desc
        if (program.screenshot)
          msg.screenshot = program.screenshot
        if (program.root)
          msg.root = program.root
        if (program.branch)
          msg.branch = program.branch

        sbot.publish(msg, (err, appMsg) => {
          if (err) console.error(err)
          console.log(appMsg)
        })
      }
      
      if (program.root) {
        pull(
          sbot.query.read({
            query: [{
              $filter: {
                value: {
                  content: { root: program.root },
                }
              }
            }]
          }),
          pull.filter((msg) => msg.value.content.type == 'ssb-browser-app'),
          pull.collect((err, msgs) => {
            if (err) throw err

            var lastMsg = msgs[msgs.length-1]

            if (program.author == undefined && lastMsg.value.author)
              program.author = lastMsg.value.author
            if (program.title == undefined && lastMsg.value.content.name)
              program.title = lastMsg.value.content.name
            if (program.desc == undefined && lastMsg.value.content.description)
              program.desc = lastMsg.value.content.description
            if (program.screenshot == undefined && lastMsg.value.content.screenshot)
              program.screenshot = lastMsg.value.content.screenshot

            program.branch = lastMsg.key

            postMsg(program)
          })
        )
      } else
        postMsg(program)

      sbot.close()
    })
  )
})
