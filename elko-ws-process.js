"use strict";

const fs = require('fs');
const mqtt = require('mqtt');

const DEBUG = false;

console.log("ELKO WS Process Starting...");

let config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
if (DEBUG) console.log(config);
let client = mqtt.connect(config['broker']);

/**
 * @return {string}
 */
function RGB2HSV(red, green, blue, brightness) {
	"use strict";
	let max = Math.max(red, green, blue),
		min = Math.min(red, green, blue),
		d = max - min,
		hue,
		saturation = (max === 0 ? 0 : d / max);
		//value = max / 255;

	switch (max) {
		case min: hue = 0; break;
		case red: hue = (green - blue) + d * (green < blue ? 6: 0); hue /= 6 * d; break;
		case green: hue = (blue - red) + d * 2; hue /= 6 * d; break;
		case blue: hue = (red - green) + d * 4; hue /= 6 * d; break;
	}

	let hsv = {
		hue: hue * 360,
		saturation: saturation * 100,
		value: brightness * 100 / 255 // was value
	};

	return parseInt(hsv.hue) + ',' + parseInt(hsv.saturation) + ',' + parseInt(hsv.value);
}

/*
 * HTTP Server
 */
function publishItemState(topic, payload, defaultValue) {
	"use strict";
	console.log("[MQTT] Publish: elko/state/" + topic + ": " + payload);
	//client.subscribe('elko/control/#')
	if (payload === null || payload === "null") payload = defaultValue;
	client.publish("elko/state/" + topic, '' + payload, { "qos": 1, "retain": true});
}

function processDevice(data) {
	"use strict";

	let device = data['device'];
	let result = data['result'];

	if (result.hasOwnProperty('red') && result.hasOwnProperty('green') && result.hasOwnProperty('blue') && result.hasOwnProperty('brightness')) {
		let state = RGB2HSV(result['red'], result['green'], result['blue'], result['brightness']);
		publishItemState(device, state, "0,0,0");
	} else if (result.hasOwnProperty('brightness')) {
		let state = result['brightness'] + '';
		publishItemState(device, state, "0");
	} else if (result.hasOwnProperty('on')) {
		let state = result['on'] ? 'ON' : 'OFF';
		publishItemState(device, state, "OFF");
	} else {
		if (result.hasOwnProperty('temperature')) publishItemState(device + "/temperature", result['temperature'], "0");
		if (result.hasOwnProperty('temperature IN')) publishItemState(device + "/temperature-in", result['temperature IN'], "0");
		if (result.hasOwnProperty('temperature OUT')) publishItemState(device + "/temperature-out", result['temperature OUT'], "0");
		if (result.hasOwnProperty('battery')) publishItemState(device + "/battery", result['battery'] ? 'OPEN' : 'CLOSED', "CLOSED");
		if (result.hasOwnProperty('open window')) publishItemState(device + "/open-window", result['open window'] ? 'OPEN' : 'CLOSED', "CLOSED");
		if (result.hasOwnProperty('open valve')) publishItemState(device + "/open-valve", result['open valve'], "0");
		if (result.hasOwnProperty('requested temperature')) publishItemState(device + "/requested-temperature", result['requested temperature'], "0");
		if (result.hasOwnProperty('open window sensitivity')) publishItemState(device + "/open-window-sensitivity", result['open window sensitivity'], "0");
		if (result.hasOwnProperty('open window off time')) publishItemState(device + "/open-window-off-time", result['open window off time'], "0");
		if (result.hasOwnProperty('locked')) publishItemState(device + "/locked", result['locked'] ? 'OPEN' : 'CLOSED', "CLOSED");
		if (result.hasOwnProperty('error')) publishItemState(device + "/error", result['error'] ? 'OPEN' : 'CLOSED', "CLOSED");
	}
	if (DEBUG) console.log('[HTTP:' + host + '] Result: "' + state + '"');
}

client.on('connect', function() {
	console.log("[MQTT] Client connected")
});

client.on('message', function (topic, message) {
	console.log("[MQTT] Message: " + topic + ": " + message.toString())
});

process.on('message', function(message) {
	let data = JSON.parse(message);
	if (data['action'] === 'state' && data['device'] && data['result']) {
		processDevice(data);
	}
});