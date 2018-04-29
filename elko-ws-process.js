"use strict";

const WebSocket = require('ws');
const axios = require("axios");
const fs = require('fs');
const JSONPath = require('advanced-json-path');
const mqtt = require('mqtt');

const DEBUG = false;

console.log("Starting...");

let config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
if (DEBUG) console.log(config);
let client = mqtt.connect(config.broker)

function RGB2HSV(red, green, blue, brightness) {
	"use strict";
	var max = Math.max(red, green, blue),
		min = Math.min(red, green, blue),
		d = max - min,
		hue,
		saturation = (max === 0 ? 0 : d / max),
		value = max / 255;

	switch (max) {
		case min: hue = 0; break;
		case red: hue = (green - blue) + d * (green < blue ? 6: 0); hue /= 6 * d; break;
		case green: hue = (blue - red) + d * 2; hue /= 6 * d; break;
		case blue: hue = (red - green) + d * 4; hue /= 6 * d; break;
	}

	var hsv = {
		hue: hue * 360,
		saturation: saturation * 100,
		value: brightness * 100 / 255 // was value
	};
	
	return parseInt(hsv.hue) + ',' + parseInt(hsv.saturation) + ',' + parseInt(hsv.value);
}

/*
 * HTTP Server
 */
function publishItemState(deviceId, state) {
	"use strict";
	console.log("[MQTT] Publish: elko/" + deviceId + ": " + state);
	//client.subscribe('elko/control/#')
	client.publish("elko/state/" + deviceId, state, { "qos": 1, "retain": true});
}

function processDevice(deviceId) {
	"use strict";

	console.log("[HTTP] GET " + config.url + (config.prefix || '/') + deviceId + (config.suffix || ''));
	axios.request({
		method: 'GET',
		url: config.url + (config.prefix || '/') + deviceId + (config.suffix || '')
	}).then(function(response) {
		let body = response.data
		let state = body
		console.log("[HTTP] Response: " + JSON.stringify(body) + ' - ' + body.hasOwnProperty('blue'));		

		if (body.hasOwnProperty('red') && body.hasOwnProperty('green') && body.hasOwnProperty('blue') && body.hasOwnProperty('brightness')) {
			state = RGB2HSV(body.red, body.green, body.blue, body.brightness);
		} else if (body.hasOwnProperty('brightness')) {
			state = body.brightness + '';
		} else if (body.hasOwnProperty('on')) {
			state = body.on ? 'ON' : 'OFF';
		}
		if (DEBUG) console.log("Result: '" + JSON.stringify(state) + "'");
		publishItemState(deviceId, state);
	});
}

client.on('connect', function() {
	console.log("[MQTT] Client connected")
});

client.on('message', function (topic, message) {
	console.log("[MQTT] Message: " + topic + ": " + message.toString())
})

process.on('message', function(msg) {
	processDevice(msg)
});

