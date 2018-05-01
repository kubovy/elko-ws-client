"use strict";

const child_process = require('child_process');
const WebSocket = require('ws');
const fs = require('fs');
const DEBUG = false;

console.log("Starting...");

let config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
if (DEBUG) console.log(config);

let subprocess = child_process.fork(`${__dirname}/elko-ws-process.js`);
let webservices = [];
for (let i in config['elko']) {
	let host = config['elko'][i];
	let ws = new WebSocket(config['ws'].replace("{{HOST}}", host));

	ws.on('open', function open() {
		console.log('[WS] Client connected');
	});

	ws.on('close', function close() {
		console.log('[WS] Client disconnected');
	});

	ws.on('message', function incoming(data) {
		console.log("[WS] Incoming (" + host + "):", data);
		let pattern = RegExp(config['regex']);
		let matches = pattern.exec(data);
		if (matches && matches.length > 1) {
			let deviceId = matches[1];
			subprocess.send({"deviceId": deviceId, "source": host})
		}
	});

	webservices.push(ws);
}




