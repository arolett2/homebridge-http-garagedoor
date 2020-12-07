/* jshint node: true */
"use strict";
var Service;
var Characteristic;
var DoorState;

const http = require('http');

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    DoorState = homebridge.hap.Characteristic.CurrentDoorState;
    
    homebridge.registerAccessory("homebridge-http-garage-door", "HTTPGarageDoor", HTTPGarageDoorAccessory);
};

/*
 function getVal(config, key, defaultVal) {
 var val = config[key];
 if (val === null) {
 this.log("WARN: ${key} is a mandatory parameter!");
 return defaultVal;
 }
 return val;
 }
 */

function HTTPGarageDoorAccessory(log, config) {
    
    this.log = log;
    this.version = require('./package.json').version;
    log("HTTPGarageDoorAccessory version " + this.version);
    
    this.name = config.name;
    
    this.activateURL = config['activateURL'];
    this.statusURL = config['statusURL'];
    this.sensorPollInMs = 4000;
    
    log("activateURL: " + this.activateURL);
    log("  statusURL: " + this.statusURL);
    
    this.initService();
}

HTTPGarageDoorAccessory.prototype = {
        
    monitorDoorState: function() {
        
            let req = http.get(this.statusURL, res => {
                let recv_data = '';
                res.on('data', chunk => { recv_data += chunk});
                res.on('end', () => {
                    // recv_data contains state info.... {"currentState":"Closed"}
                    let state = JSON.parse(recv_data).currentState;
                    this.log('Read status from Gate: ' + state);

                    if (state == "Open") {
                      this.targetState = DoorState.OPEN;
                    } else if (state == "Opening") {
                      this.targetState = DoorState.OPENING;
                    } else if (state == "Closed") {
                      this.targetState = DoorState.CLOSED;
                    } else if (state == "Closing") {
                      this.targetState = DoorState.CLOSING;
                    } else {
                      this.targetState = DoorState.STOPPED;
                    }
                    this.currentDoorState.updateValue(this.targetState);
                    setTimeout(this.monitorDoorState.bind(this), this.sensorPollInMs);
                    return state;
                });
            });
            req.on('error', err => {
                this.targetState = DoorState.STOPPED;
                this.log("Error in monitorDoorState: "+ err.message);
                
                setTimeout(this.monitorDoorState.bind(this), this.sensorPollInMs);
                return err.message;
            })
        
    },
    
    activateDoor: function() {
      
        let req = http.get(this.activateURL, res => {
            let recv_data = '';
            res.on('data', chunk => { recv_data += chunk});
            res.on('end', () => {
                // recv_data contains state info.... {"result":"Success"}
                let result = JSON.parse(recv_data).result;
                this.log('Activate Gate Request: ' + result);

            });
        });
        req.on('error', err => {
            this.log("Error in activateDoor: "+ err.message);
        })
        
    },
   
    initService: function() {
        this.garageDoorOpener = new Service.GarageDoorOpener(this.name,this.name);
        
        this.currentDoorState = this.garageDoorOpener.getCharacteristic(DoorState);
        this.currentDoorState.on('get', this.getState.bind(this));
        
        this.targetDoorState = this.garageDoorOpener.getCharacteristic(Characteristic.TargetDoorState);
        this.targetDoorState.on('set', this.setState.bind(this));
        this.targetDoorState.on('get', this.getTargetState.bind(this));
        
        this.service = new Service.AccessoryInformation();
        this.service
        .setCharacteristic(Characteristic.Manufacturer, "PlasmaSoft")
        .setCharacteristic(Characteristic.Model, "Generic HTTP Garage Door")
        .setCharacteristic(Characteristic.SerialNumber, "Version 1.0.0");
        
        this.targetState = DoorState.CLOSED; 
        this.targetStateString = this.monitorDoorState();
        this.targetStateString = this.monitorDoorState();
        
        this.log("Initial Door State: " + this.targetState + " is " + this.targetStateString);
        this.currentDoorState.updateValue(this.targetState);
        this.targetDoorState.updateValue(this.targetState);
    },
    
    getTargetState: function(callback) {
        
        //GET DOOR STATE
        var state = monitorDoorState();
        this.log("getTargetState: " + state);
        callback(null, this.targetState);
    },
    
    setState: function(state, callback) {
        this.log("setState to " + state);
        
        /*
        this.targetState = state;
        var isClosed = this.isClosed();
        if ((state == DoorState.OPEN && isClosed) || (state == DoorState.CLOSED && !isClosed)) {
            this.log("Triggering GarageDoor Relay");
            this.operating = true;
            if (state == DoorState.OPEN) {
                this.currentDoorState.updateValue(DoorState.OPENING);
            } else {
                this.currentDoorState.updateValue(DoorState.CLOSING);
            }
            setTimeout(this.setFinalDoorState.bind(this), this.doorOpensInSeconds * 1000);
            this.switchOn();
        }
        */
        
        callback();
        return true;
    },
    
    getState: function(callback) {
        /*
        var isClosed = this.isClosed();
        var isOpen = this.isOpen();
        var state = isClosed ? DoorState.CLOSED : isOpen ? DoorState.OPEN : DoorState.STOPPED;
        this.log("GarageDoor is " + (isClosed ? "CLOSED ("+DoorState.CLOSED+")" : isOpen ? "OPEN ("+DoorState.OPEN+")" : "STOPPED (" + DoorState.STOPPED + ")"));
        */
        var state = getDoorStatusFromURL();
        this.log("getState: " + state);
        
        callback(null, state);
    },
    
    getServices: function() {
        return [this.service, this.garageDoorOpener];
    }
};
