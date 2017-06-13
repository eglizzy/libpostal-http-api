require('dotenv').config()
const argsParser = require('yargs-parser')
const spirit = require("spirit")
const route = require("spirit-router")
const express = require("spirit-express")

const http = require("http")
const bodyParser = require("body-parser")
const postal = require("node-postal")
const cluster = require("cluster")

const runTimeArgs = argsParser(process.argv.slice(2))
const numCPUs = parseInt(process.env.CPUS) || 0
const apiPort = parseInt(runTimeArgs.API_PORT) || parseInt(process.env.API_PORT)

function server(port) {
    const callableDirectives = {
        expand: address => ({expansions: postal.expand.expand_address(address)}),
        parse: address => ({parse: postal.parser.parse_address(address)}),
    }

    const app = route.define([
        route.get("/health", {up: true}),
        route.post("/expand", ["body"], ({address}) => callableDirectives['expand'](address)),
        route.post("/parse", ["body"], ({address}) => callableDirectives['parse'](address)),
        route.post("/batch", ["body"], body => ({
                addresses: body.addresses.map(({address, directives}) =>
                    directives.reduce(
                        (accResults, directive) => Object.assign(accResults, callableDirectives[directive](address)),
                        {address}
                    )
                ),
            })
        ),
    ])

    const middleware = [
        express(bodyParser.json()),
        express(bodyParser.urlencoded({extended: true})),
    ]

    const api = spirit.node.adapter(app, middleware)

    const server = http.createServer(api)
    server.listen(port)
}


if (numCPUs) {
    if (cluster.isMaster) {
        for (let i = 0; i < numCPUs; i++) {
            cluster.fork();
        }
    } else {
        server(apiPort)
    }
} else {
    server(apiPort)
}
