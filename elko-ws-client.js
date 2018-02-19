const WebSocket = require('ws');
const axios = require("axios");
const fs = require('fs');
const JSONPath = require('advanced-json-path');
const DEBUG = false;

console.log("Starting...");

let config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
if (DEBUG) console.log(config);

function RGB2HSV(json) {
    red = json.red;
    green = json.green
    blue = json.blue
    brightness = json.brightness
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
function getUrl(deviceDefinition, which) {
	let request = deviceDefinition[which];
	return request.url.replace("{id}", deviceDefinition.id).replace("{item}", deviceDefinition.item);
}

function axiosRequest(deviceDefinition, which, data) {
	let request = deviceDefinition[which];
	let config = {
		method: request.method.toLocaleLowerCase(),
		url: getUrl(deviceDefinition, which),
		headers: request.headers
	};
	if (data) config.data = data
        if (DEBUG) console.log("Axios: " + JSON.stringify(config));
	return axios.request(config);
}

function getResult(request, response) {
	let result;
	if (request.path) {
            result = JSONPath(response.data, request.path);
            if (DEBUG) console.log("Mapping: '" + JSON.stringify(response.data) + "' with '" + request.path + "' to '" + result + "'");
        }
	else result = response.data;
	return result;
}

function logRequest(prefix, deviceDefinition, which, response) {
	let request = deviceDefinition[which];
	let result = getResult(request, response);
	console.log(prefix, request.method + " " + getUrl(deviceDefinition, which), response.status + " " + response.statusText, result);
}

function update(deviceDefinition, state) {
	axiosRequest(deviceDefinition, 'update', state).then(function(response) {
		logRequest("Updated", deviceDefinition, 'update', response);
	});
}

function check(deviceDefinition, state) {
	let request = deviceDefinition.check
	if (request) {
		axiosRequest(deviceDefinition, 'check').then(function(response) {
			let result = getResult(request, response)
			logRequest("Checked:", deviceDefinition, 'check', response);
			if (state != result) update(deviceDefinition, state);
		});
	} else {
		update(deviceDefinition, state);
	}
}

function process(deviceDefinition) {
	axiosRequest(deviceDefinition, 'get').then(function(response) {
		let request = deviceDefinition.get
		let result = getResult(request, response);
                if (DEBUG) console.log("Transfoming: let state=" + JSON.stringify(result) + ";" + deviceDefinition.transform + ';');
                let state;
                try {
                    state = eval("let state=" + JSON.stringify(result) + ";" + deviceDefinition.transform + ';');
                } catch (e) {
                    console.log(e)
                }
                if (DEBUG) console.log("Transformation result: '" + state + "'");
		logRequest("Processed:", deviceDefinition, 'get', response);
		check(deviceDefinition, state);
	});
}

var ws = new WebSocket(config['ws']);

ws.on('open', function open() {
	console.log('connected');
});

ws.on('close', function close() {
	console.log('disconnected');
});

ws.on('message', function incoming(data) {
	console.log("Incoming:", data);
	let pattern = RegExp(config['regex']);
	let matches = pattern.exec(data);
	if (matches.length > 1) {
		let deviceId = matches[1];
		let deviceDefinition = config.devices[deviceId];
                if (deviceDefinition) {
                    deviceDefinition.id = deviceId;
                    process(deviceDefinition);
                } else {
                    console.log("Device with the ID " + deviceId + " is not defined!");
                }
	}
});


