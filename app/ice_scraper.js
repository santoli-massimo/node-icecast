
// Require node
var fs = require('fs');
var util = require('util');
var _ = require('lodash');

var rx = require('rx');
var Monitor = require('icecast-monitor');

// Require gracenode
var Gracenote = require("node-gracenote");

// Require Express stack
var app = require('express')();
var server = require('http').Server(app);
server.listen(3000);

var io = require('socket.io')(server);

// Require Mongo Client
var MongoClient = require('mongodb').MongoClient;

// Require dotenv
var dotenv = require('dotenv');
dotenv.load();

var NAME = process.env.MOUDULE_NAME;
var ICECAST_PREFIX= process.env.ICECAST_PREFIX;

// Gracenode client
var clientId = process.env.GRACENODE_CLIENT_ID;
var clientTag = process.env.GRACENODE_CLIENT_TAG;
var userId = process.env.GRACENODE_USER_ID;
var graceApi = new Gracenote(clientId,clientTag,userId);

// Client server
app.get('/stream/1/', (req, res) =>{
    res.send();
});

// Global data container
var monitorContainer = [];

// Socket connection event
io.sockets.on('connection', function(client) {

    client.on('join_room', function(roomNumber) {

        client.join('icecast_'+roomNumber);

        if ( monitorContainer[roomNumber] != undefined ){

            client.emit('listeners', monitorContainer[roomNumber].listeners);
            client.emit('meta', monitorContainer[roomNumber].meta);

            // Send history data to client
            new iceMongo(roomNumber)
                .getHistory(roomNumber)
                .then((history) => {
                    client.emit('history', history);
                });
        }

    });

});

// Icecast start event listener
process.on('message', (packet) => {

    if ( packet.topic == NAME+'.'+ICECAST_PREFIX+'.start' ) {
        createFeed( packet.data.options );
    }

});

// Create scraper
var createFeed = (options) => {

    var monitor = new Monitor(options);
    var icemongo = new iceMongo(options.id);

    monitorContainer[options.id] = {
        'monitor': monitor,
        'options': options,
        'listener': 0,
        'meta': {}
    };

    monitor.createFeed(function(err, feed) {

        var room = 'icecast_'+options.id;

        if (err) console.log('Connection Error: ', err);
        else {
            io.to(room).emit('feed-on', {date: new Date()});
        }

        feed.on('mount.listeners', function(listeners, raw) {

            monitorContainer[options.id].listeners = raw;
            io.to(room).emit('listeners', raw);

            icemongo.updateListeners(raw).then(function(data){
                io.to(room).emit('debug', data);
            });

        });

        feed.on('mount.title', function(mountname, title) {

            // Obtain meta from gracenote
            var search = title.split('-');

            if(!Array.isArray(search)){
                search = title.split(',');
            }

            graceApi.searchTrack(search[0], "", search[1], function(err, results) {

                monitorContainer[options.id].meta = results;

                icemongo
                    // Add End timestamp to last song
                    .updateEnd()
                    // Add New song
                    .then( function() {
                        return icemongo.addSong(results);
                    })
                    // Set start Listener
                    .then( function(){
                        return icemongo.updateListeners(
                            monitorContainer[options.id].hasOwnProperty('listeners')? monitorContainer[options.id].listeners: 0
                        );
                    })
                    // Get history data
                    .then( function(data) {
                        return icemongo.getHistory(options.id)
                    })
                    // Send history data to client
                    .then( function (history) {
                        io.to(room).emit('history', history);
                    })
                ;

                // Send song meta to client
                io.to(room).emit('meta', results);
                
            }, { matchMode: Gracenote.BEST_MATCH_ONLY} );

        });

        feed.on('disconnect', function() {
            io.to(room).emit('disconnected', {date: new Date()});
        });

        feed.on('mount.delete', function() {
            io.to(room).emit('mount.disconnected', {date: new Date()});
        });

    });

};

var iceMongo = function(id){

    var self = this;
    this.id = id;
    this.url = 'mongodb://localhost:27017/icecast';

    this.addSong = function (meta){

        return this.connect().then( function(db) {

            return new Promise(function(resolve, reject) {

                var collection = db.collection('ice_'+self.id);

                collection.insertOne(
                    {'meta': meta, 'start': new Date(), 'end': null, 'listeners': [] } ,

                    function(error, results){
                        if (error) reject(error);
                        else resolve(results);
                    }
                );


            });
        });

    };

    this.updateListeners = function (newlisteners) {

        return this.connect().then( function(db) {

            return new Promise(function(resolve, reject) {

                var collection = db.collection('ice_' + self.id);

                collection.findAndModify(
                    {},
                    [['_id', -1]],
                    { $push: { listeners: { quantity : newlisteners, date: new Date() }  } },
                    { new:true }
                    ,
                    function (error, results) {
                        if (error) reject(error);
                        else resolve(results);
                        db.close();
                    }
                );

            });
        });

    };

    this.updateEnd = function () {

        return this.connect().then( function(db) {

            return new Promise(function(resolve, reject) {

                var collection = db.collection('ice_'+self.id);

                self.getPeakListeners().then(function(max){

                    collection.count({}, {}, function(error, results){
                        // console.log('count: ', error , results);

                        if(results > 0){
                            collection.findAndModify(
                                {},
                                [['_id', -1]],
                                { $set : { end: new Date(), peak: max } },
                                {new:true}
                                ,
                                function (error, results) {
                                    if (error) reject(error);
                                    else resolve(results);
                                    db.close();
                                }
                            );
                        }
                        else resolve();

                    });

                });

            });

        });

    };

    this.getPeakListeners = function () {

        return this.connect().then( function(db) {

            return new Promise(function(resolve, reject) {

                var collection = db.collection('ice_'+self.id);

                collection.count({}, {}, function(error, results){

                    if(results > 0){
                        collection.find()
                            .sort({$natural:-1})
                            .limit(1)
                            .toArray(function(error, res){
                                var max = _.maxBy(res[0].listeners, function(data){
                                    return data.quantity;
                                });
                                console.log('*********************** Max listeners Peak', max);
                                resolve(max);
                            });
                    }
                    else resolve(0);

                });

            });

        });

    };

    this.getHistory = function(room){

        return this.connect().then( function(db) {

            return new Promise(function(resolve, reject) {

                if(db.err) console.log('Mongo history error',  db.err );

                var collection = db.collection('ice_'+room);

                collection
                    .find()
                    .sort({$natural:-1})
                    .limit(10)
                    .toArray( function (error, docs) {
                        if (error) reject(error);
                        else resolve(docs);
                        db.close();
                    })
                ;

            });

        });

    };

    this.connect = function () {

        return new Promise( function(resolve, reject) {
            MongoClient.connect( self.url, function(err, db){
                if (err) reject(err);
                else resolve(db);
            });
        });
    };

    this.resolve = function(error, results){
        if (error) reject(error);
        else resolve(results);
        db.close();
    };

};
