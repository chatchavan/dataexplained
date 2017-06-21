/**
 * Main application file
 */

'use strict';

require('pmx').init({
  transactions : true
});

import express from 'express';
import mongoose from 'mongoose';
mongoose.Promise = require('bluebird');
import config from './config/environment';
import http from 'http';
import https from 'https';
import fs from 'fs';

// Connect to MongoDB
mongoose.connect(config.mongo.uri, config.mongo.options);
mongoose.connection.on('error', function(err) {
  console.error('MongoDB connection error: ' + err);
  process.exit(-1);
});

// Populate databases with sample data
if (config.seedDB) { require('./config/seed'); }


// Setup server
var app = express();
// var server = http.createServer(app);

// Create an HTTPS service identical to the HTTP service.
require('./config/express')(app);
require('./routes')(app);

// Start server
function startServer() {

  // if(config.env === 'development'){
   var server =  http.createServer(app).listen(config.port, config.ip, function() {
      console.log('Express server listening on %d, in %s mode', config.port, app.get('env'));
    });
  // }
  // else{
  //   var options = {
  //     key: fs.readFileSync('/home/ubuntu/privkey.pem'),
  //     cert: fs.readFileSync('/home/ubuntu/fullchain.pem'),
  //     ca: fs.readFileSync('/home/ubuntu/chain.pem')
  //   };
  //
  //   http.createServer(function(req, res){
  //     res.writeHead(301, {"Location": "https://" + req.headers['host'] + req.url});
  //     res.end();
  //   });
  //
  //   https.createServer(options, app).listen(443, config.ip, function() {
  //     console.log('Express server listening on %d, in %s mode', 443, app.get('env'));
  //   });
  // }


  var socketio = require('socket.io')(server);
  require('./config/socketio')(socketio);

}

setImmediate(startServer);

// Expose app
exports = module.exports = app;



