"use strict";

const axios = require("axios");
const fs = require('fs');
const mqtt = require('mqtt');

const DEBUG = false;

console.log("Starting...");

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

function processDevice(deviceId, host) {
	"use strict";

	let url = config['state'].replace("{{HOST}}", host).replace("{{DEVICE_ID}}", deviceId);
	console.log("[HTTP] GET " + url);
	axios.request({
		method: 'GET',
		url: url
	}).then(function(response) {
		let body = response.data;
		console.log("[HTTP] Response (" + host + "): " + JSON.stringify(body) + ' - ' + body.hasOwnProperty('blue'));

		if (body.hasOwnProperty('red') && body.hasOwnProperty('green') && body.hasOwnProperty('blue') && body.hasOwnProperty('brightness')) {
			let state = RGB2HSV(body['red'], body['green'], body['blue'], body['brightness']);
			publishItemState(deviceId, state, "0,0,0");
		} else if (body.hasOwnProperty('brightness')) {
			let state = body['brightness'] + '';
			publishItemState(deviceId, state, "0");
		} else if (body.hasOwnProperty('on')) {
			let state = body['on'] ? 'ON' : 'OFF';
			publishItemState(deviceId, state, "OFF");
		} else {
			if (body.hasOwnProperty('temperature')) publishItemState(deviceId + "/temperature", body['temperature'], "0");
			if (body.hasOwnProperty('temperature IN')) publishItemState(deviceId + "/temperature-in", body['temperature IN'], "0");
			if (body.hasOwnProperty('temperature OUT')) publishItemState(deviceId + "/temperature-out", body['temperature OUT'], "0");
			if (body.hasOwnProperty('battery')) publishItemState(deviceId + "/battery", body['battery'] ? 'OPEN' : 'CLOSED', "CLOSED");
			if (body.hasOwnProperty('open window')) publishItemState(deviceId + "/open-window", body['open window'] ? 'OPEN' : 'CLOSED', "CLOSED");
			if (body.hasOwnProperty('open valve')) publishItemState(deviceId + "/open-valve", body['open valve'], "0");
			if (body.hasOwnProperty('requested temperature')) publishItemState(deviceId + "/requested-temperature", body['requested temperature'], "0");
			if (body.hasOwnProperty('open window sensitivity')) publishItemState(deviceId + "/open-window-sensitivity", body['open window sensitivity'], "0");
			if (body.hasOwnProperty('open window off time')) publishItemState(deviceId + "/open-window-off-time", body['open window off time'], "0");
			if (body.hasOwnProperty('locked')) publishItemState(deviceId + "/locked", body['locked'] ? 'OPEN' : 'CLOSED', "CLOSED");
			if (body.hasOwnProperty('error')) publishItemState(deviceId + "/error", body['error'] ? 'OPEN' : 'CLOSED', "CLOSED");
		}
		if (DEBUG) console.log("Result (" + host + "): '" + state + "'");
	});
}

client.on('connect', function() {
	console.log("[MQTT] Client connected")
});

client.on('message', function (topic, message) {
	console.log("[MQTT] Message: " + topic + ": " + message.toString())
});

process.on('message', function(msg) {
	processDevice(msg["deviceId"], msg["source"])
});

