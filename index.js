const spirit = require("spirit")
const route = require("spirit-router")
const express = require("spirit-express")

const http = require("http")
const bodyParser = require("body-parser")
const postal = require("node-postal")
const cluster = require("cluster")

const numCPUs = 2

function server() {
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
                )
            })
        ),
    ])

    const middleware = [
        express(bodyParser.json()),
        express(bodyParser.urlencoded({extended: true}))
    ]

    const site = spirit.node.adapter(app, middleware)

    const server = http.createServer(site)
    server.listen(3009)
}


if (cluster.isMaster) {
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }
} else {
    server()
}