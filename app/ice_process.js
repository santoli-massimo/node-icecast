
// Require node
var http = require('http');
var fs = require('fs');
var util = require('util');
var _ = require('lodash');
var rx = require('rx');

// Require Express stack
var express = require('express');
var socket = require('socket.io');

// Require pm2
var pm2 = require('pm2');

// Require dotenv
var dotenv = require('dotenv');
dotenv.load();

var NAME = process.env.MOUDULE_NAME;
var ICECAST_PREFIX= process.env.ICECAST_PREFIX;

// Create Server
var app = express();

app.use(function(req, res, next) {

    res.header("Access-Control-Allow-Origin", "http://dev.iceapi");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Cookies", "true");
    res.header("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();

});

// Icecast Service Manager

var data = {
    info:null,
    success: false,
    error: false,
    reset: function(){
        this.info = null;
        this.error = false;
    }

};

app.listen(3001, function() {
        console.log('listening on 3001')
});

app.get('/icecast/:id/start/', function(req, res) {
        start(req.params.id, req);
        data.reset();
        sedResponse(res, data.error);
    })

    .get('/icecast/:id/stop/', function(req, res) {
        stop(req.params.id, req);
        data.reset();
        sedResponse(res, data.error);
    })

    .get('/icecast/:id/info/', function(req, res) {
        info(req.params.id);
        data.reset();
        sedResponse(res, data.info);
    })
;

// PM2 actions

function start (id, req){ pm2.connect( () => {

    pm2.describe("icecast_"+id, (err, processes) => {

        if( processes.length < 1 ) {

            var options = [
                {
                    "name": ICECAST_PREFIX +'_'+ id,
                    "script": "/usr/bin/icecast2",
                    "cwd": "/usr/bin/",
                    "args": "-c "+req.query.xml,
                    "exec_interpreter": "none",
                    "watch": false,
                    "mode": "fork",
                    "killTimeout": 2500,
                    "minUptime": 2000
                }
            ];

            pm2.start(options, (err, processes) => {

                if (err) console.log(err);
                if(!err){
                    process.send(
                        {
                            id : '1',
                            topic: NAME+'.'+ICECAST_PREFIX+'.start',
                            data : { options: req.query }

                        }
                    );
                }

            });
        }
    });

});
}

function stop (id, req){ pm2.connect (function() {

    pm2.describe("icecast_"+id, function(err, processes) {
        if(processes.length > 0){
            pm2.stop("icecast_"+id , function(err, process){
                data.error = err;
            });
        }
        else error = {"success":"false", "error": "Process already started"}

    });
    pm2.describe("icecast_"+id, function(err, processes) {
        if(processes.length > 0){
            pm2.delete( "icecast_"+id , function(err, processes) {
                data.error = err;
            });
        }
        else data.error = {"success":"false", "error": "Process already started"}
    });



});
}

function info (id) {
    pm2.connect(function(id) {
        pm2.describe("icecast_"+id, function(err, processes) {
            data.info = JSON.stringify(processes)
        });
    });
}

// Helpers

var sedResponse = function(res, err){

    if (data.error === true) res.send(err);
    if(data.info !== null) res.send(data.info);
    else res.send(JSON.stringify({"success":"true"}));

};



