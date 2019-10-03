# ElkoEP OpenHAB Web-Service Listener for eLAN-RF-003/eLAN-RF-Wi-003

This small WS Client listens to changes on ElkoEP Control Unit
(eLAN-RF-003/eLAN-RF-Wi-003) and sends updates via MQTT to OpenHAB items.

This allows ElkoEP device's state changes to be populated to OpenHAB server in case
the state was changed from the outside, e.g. with RFWB-20/G.

This bridge only implements updates from ELKO devices via the MQTT broker to OpenHAB.
Controlling the devices from the other direction (from OpenHAB) is not part of this
bridge.

The script expects config.json to be present. Please check config.json.dist to start.

**Requirements:** NodeJS, NPM

**Before start:** `$ npm install`

**Start:** `$ node elko-ws-client.js`

## MQTT

The following topic conventions are assumed:

 - `elko/control/[DEVICE_ID]:command` for sending a commands

## OpenHab Items

    Color  RGBLight    "RGB Light"     <colorwheel> (All,Lights) {mqtt="<[mosquitto:elko/state/00001:state:default],>[mosquitto:elko/control/00001:command:*:default]"}
    Dimmer LightDimmer "Dimmer [%s%%]" <light>      (All,Lights) {mqtt="<[mosquitto:elko/state/00002:state:default],>[mosquitto:elko/control/00002:command:*:default]"}
    Switch LightSwitch "Light"         <light>      (All,Lights) {mqtt="<[mosquitto:elko/state/00003:state:default],>[mosquitto:elko/control/00003:command:*:default]"}

## Configuration

You need to replace following:

- `elko.controllers`: with list of hostnames/ips of your eLAN-RF-003/eLAN-RF-Wi-003 boxes
- `elko.user`: user name to login (must be same for all boxes)
- `elko.key`: SHA1 hash of your password (must be same for all boxes)
- `broker`: your MQTT broker 


    {
      "elko": {
        "controllers": ["IP-ADDRESS-1", "IP-ADDRESS-2", ...],
        "user": "[LOGIN]",
        "key": "[PASSWORD SHA1 HASH]"
      },
      "ws": "ws://{{HOST}}/api/ws",
      "state": "http://{{HOST}}/api/devices/{{DEVICE_ID}}/state",
      "broker": "mqtt://localhost:1883",
      "regex": "http://[\\d+\\w+\\.]+/api/devices/(.*)"
    }