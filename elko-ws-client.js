"use strict";

const child_process = require('child_process');
const WebSocket = require('ws');
const fs = require('fs');
const http = require('http');
const DEBUG = false;

console.log(new Date() + ': ELKO WS Client Starting...');

let config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
if (DEBUG) console.log(config);

let subprocess = child_process.fork(`${__dirname}/elko-ws-process.js`);
let webservices = [];

function connectWS(host, httpData) {
	const httpRequest = http.request(
		{
			host: host,
			port: 80,
			path: '/login',
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
				'Content-Length': Buffer.byteLength(httpData)
			}
		},
		function(response) {
			let apiToken = response.headers['set-cookie'][0].split('=', 2)[1];
			let ws = new WebSocket(config['ws'].replace("{{HOST}}", host), [], {
				headers: { 'Cookie': 'AuthAPI=' + apiToken }
			});
			console.log(new Date() + ': [WS:' + host + '] Connecting with API token ' + apiToken + '...');

			ws.on('open', function open() {
				console.log(new Date() + ': [WS:' + host + '] Client connected');
			});

			ws.on('close', function close() {
				console.log(new Date() + ': [WS:' + host + '] Client disconnected');
				connectWS(host, httpData);
			});

			ws.on('message', function incoming(message) {
				console.log(new Date() + ': [WS:' + host + '] Incoming (' + host + '):', message);
				subprocess.send(message);
			});

			webservices.push(ws);
		});
	httpRequest.write(httpData);
	httpRequest.end();
}

for (let i in config['elko']['controllers']) {
	const host = config['elko']['controllers'][i];
	let httpData = 'name=' + config['elko']['user'] + '&key=' + config['elko']['key'];
	connectWS(host, httpData);
}