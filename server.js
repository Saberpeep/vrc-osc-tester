const osc = require('osc');
const consola = require('consola');

const isProduction = process.env.NODE_ENV == 'production';
consola.level = isProduction? consola.LogLevels.success : consola.LogLevels.debug;

const sendPort = 9000;
const recvPort = 9001;
const loopbackIP = '127.0.0.1';

// Create an osc.js UDP Port listening on the recv port.
var udpPort = new osc.UDPPort({
    localAddress: loopbackIP,
    localPort: recvPort,
    metadata: true
});

// Listen for incoming OSC messages.
udpPort.on('message', function (oscMsg, timeTag, info) {
    try {
        // consola.debug('An OSC message just arrived!', oscMsg);
        // consola.debug('Remote info is: ', info);

        const name = oscMsg.address;
        const value = oscMsg.args[0].value;

        consola.debug('Got an OSC message from VRC:', {name, value});

        if(frontendWs){
            frontendWs.send(JSON.stringify({
                name,
                value,
            }));
        }

    } catch (error) {
        consola.error('failed to parse incoming message:', error);
    }
});

// When the port is ready to receive messages
udpPort.on('ready', function () {
    consola.success(`UDP Port is ready, waiting for messages from VRChat on port ${recvPort}`);
});

// When an error is sent over the port
udpPort.on('error', function (error) {
    consola.error('A port error occurred: ', error);
});

// Open the socket.
udpPort.open();

function sendButton(address, state){
    return udpPort.send({
        address: address,
        args: [
            {
                type: 'i',
                value: state?1:0,
            }
        ]
    }, loopbackIP, sendPort);
}

function sendAxis(address, val){
    return udpPort.send({
        address: address,
        args: [
            {
                type: 'f',
                value: clamp(parseFloat(val), -1, 1) || 0,
            }
        ]
    }, loopbackIP, sendPort);
}

function sendAvatarParam(address, value){
    consola.debug(`sending OSC`, address, value, getOSCType(value));
    if(typeof value == 'boolean') value = value?1:0;
    return udpPort.send({
        address: address,
        args: [
            {
                type: getOSCType(value),
                value: value,
            }
        ]
    }, loopbackIP, sendPort);
}

function getOSCType(val){
    if(typeof val == 'boolean'){
        return 'T';
    }
    if(typeof val == 'string'){
        return 's';
    }
    if(Number.isInteger(val)){
        return 'i';
    }
    if(!isNaN(val)){
        return 'f';
    }
    throw new Error(`value unknown type '${val}'`);
}

function mapScale(number, inMin, inMax, outMin, outMax) {
    return (number - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}

function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
};


// Websocket API for Frontend
const { WebSocketServer } = require('ws');

const wsPort = 8080;
const wss = new WebSocketServer({ port: wsPort });
let frontendWs = null;

wss.on('connection', function connection(ws) {
    consola.info('a ws client has connected');
    ws.on('error', (e)=>{
        consola.error('Websocket error:', e);
    });

    ws.on('message', function message(data) {
        const {name, value} = JSON.parse(data);
        if(name == 'register-frontend'){
            consola.success('ws client has registered as frontend');
            frontendWs = ws;
        }else{
            consola.debug(`received data from frontend`, name, value);
            sendAvatarParam(name, value);
        }
    });
});
wss.on('listening', ()=>{
    consola.info('Websocket ready, waiting for connection from frontend...');
});

// Serve Frontend over HTTP
const httpPort = 8000;
const path = require('path');
const express = require('express');
const app = express();
app.use('/', express.static(path.join(__dirname,'dist')));
app.listen(httpPort, ()=> {
    consola.info(`HTTP server ready, serving frontend at 'http://127.0.0.1:${httpPort}/'`);
});

