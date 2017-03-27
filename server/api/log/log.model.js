'use strict';

var mongoose = require('bluebird').promisifyAll(require('mongoose')),
  Schema = mongoose.Schema;

var LogEntrySchema = new mongoose.Schema({
  log: String,
  timestamp: Date,
  used: {
    type: Boolean,
    default: false
  },
  block: {type: Schema.Types.ObjectId, ref: 'Block'},
});

var LogSchema = new mongoose.Schema({
  user: String,
  logs: [LogEntrySchema]
});

export default mongoose.model('Log', LogSchema);
