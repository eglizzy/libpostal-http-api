require('dotenv').config()
const argsParser = require('yargs-parser')
const express = require("express")

const http = require("http")
const bodyParser = require("body-parser")
const postal = require("node-postal")
const cluster = require("cluster")

const runTimeArgs = argsParser(process.argv.slice(2))
const apiPort = parseInt(runTimeArgs.API_PORT) || parseInt(process.env.API_PORT)

server(normalizePort(apiPort))
function server(port) {
    const callableDirectives = {
        expand: address => ({expansions: postal.expand.expand_address(address)}),
        parse: address => ({parse: postal.parser.parse_address(address)}),
    }

    const app = express()
    const router = express.Router()

    router.get("/health", (req, res) => res.json({up: true}))
    router.post("/expand", (req, res) => res.json(callableDirectives['expand'](req.body.address)))
    router.post("/parse", (req, res) => res.json(callableDirectives['parse'](req.body.address)))
    router.post("/batch", (req, res) => res.json({
            addresses: req.body.addresses.map(({address, directives}) =>
                directives.reduce(
                    (accResults, directive) => Object.assign(accResults, callableDirectives[directive](address)),
                    {address}
                )
            ),
        })
    )

    app.use(bodyParser.json())
    app.use(bodyParser.urlencoded({extended: false}))

    app.use('/', router)
    app.set('port', port)

    const server = http.createServer(app)
    server.listen(port)
    server.on('error', onError)
    server.on('listening', onListening(server))
}


function normalizePort(val) {
    let port = (typeof val === 'string') ? parseInt(val, 10) : val
    if (isNaN(port)) return val
    else if (port >= 0) return port
    else return false
}

function onError(error) {
    if (error.syscall !== 'listen') throw error
    let bind = (typeof apiPort === 'string') ? 'Pipe ' + apiPort : 'Port ' + apiPort
    switch (error.code) {
        case 'EACCES':
            console.error(`${bind} requires elevated privileges`)
            process.exit(1)
            break
        case 'EADDRINUSE':
            console.error(`${bind} is already in use`)
            process.exit(1)
            break
        default:
            throw error
    }

}

function onListening(server) {
    return () => {
        let addr = server.address()
        let bind = (typeof addr === 'string') ? `pipe ${addr}` : `port ${addr.port}`
        console.log(`Listening on ${bind}`)
    }
}
