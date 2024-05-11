const bridgeInfo = require('./bridgeInfo')
const app = require('./app')
const event = require('./event')

bridgeInfo.startHostUpdater()

const port = process.env.PORT || 3000

app.listen(port, async () => {
  console.log(`Server running on port ${port}`)
  event.publish('server-start', 'Der Webserver wurde gestartet')
})
