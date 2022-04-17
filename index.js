const app = require('./src/app')
const http = require('http')
const { PORT } = require('./src/common/util/config')

const server = http.createServer(app)

const start = () => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
  })
}

start()
