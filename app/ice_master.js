
var pm2 = require('pm2');
var _ = require('lodash');

var dotenv = require('dotenv');
dotenv.load();

var moduleDir = process.env.MODULE_DIR;
var NAME = process.env.MOUDULE_NAME ;

var modules = [
    {
        "name" : 'process_manager',
        "script": "app/ice_process.js",
        "watch": false
    },
    {
        "name": 'scraper',
        "script": "app/ice_scraper.js",
        "watch": false
    }
];

// Spawn process
_.each(modules, (module) => {

    pm2.connect( ()=> {

        module.name = NAME + '_' + module.name;

        pm2.start(module, (err, process) => {

            console.log('|||||||||| Master: ', err , process);

        });

    });

});
