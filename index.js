const express = require('express')
const fs = require('fs')
const { exec } = require('child_process')
const basicAuth = require('express-basic-auth')

const app = express()
const configuration = JSON.parse('' + fs.readFileSync('/etc/stream.conf'))
const ngingConf = '/etc/nginx/modules-enabled/restream.conf'

app.use(basicAuth({
  users: { 'streamer': configuration.password },
  challenge: true
}))

app.use(express.static('wwwroot'))

function switchChannel(client) {
  const twitch = `push rtmp://live.twitch.tv/live/${configuration.key};`
  const config = `# ${client}
rtmp {
  server {
    listen 1935;
    chunk_size 4096;

    application stream {
      live on;
      record off;
      ${client == 'A' ? twitch : ''}
    }
  }
  server {
    listen 1936;
    chunk_size 4096;

    application stream {
      live on;
      record off;
      ${client == 'B' ? twitch : ''}
    }
  }
}`
  fs.writeFileSync(ngingConf, config)

  exec('service nginx restart', (error) => {
    if (error !== null) {
      console.log(`exec error: ${error}`)
    }
  })
}

app.get('/current', (_, res) => {
  try {
    const currentClient = ('' + fs.readFileSync(ngingConf)).split('\n')[0].substr(2)
    res.json({ 'client': currentClient })
  } catch (error) {
    res.json({ 'client': '' })
  }
})

app.post('/', (req, res) => {
  const client = req.query.client
  if (!client) {
    res.status(400).send()
    return
  }
  switchChannel(client)
  res.status(202).send()
})

app.listen(configuration.port, () => {
  console.log(`Example app listening on port ${configuration.port}`)
})