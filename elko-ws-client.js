"use strict";

const child_process = require('child_process');
const WebSocket = require('ws');
const axios = require("axios");
const fs = require('fs');
const JSONPath = require('advanced-json-path');
const DEBUG = false;

console.log("Starting...");

let config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
if (DEBUG) console.log(config);

var subprocess = child_process.fork(`${__dirname}/elko-ws-process.js`);
var ws = new WebSocket(config.ws);

ws.on('open', function open() {
	console.log('[WS] Client connected');
});

ws.on('close', function close() {
	console.log('[WS] Client disconnected');
});

ws.on('message', function incoming(data) {
	console.log("[WS] Incoming:", data);
	let pattern = RegExp(config['regex']);
	let matches = pattern.exec(data);
	if (matches.length > 1) {
		let deviceId = matches[1];
		subprocess.send(deviceId)
	}
});


