'use strict';

var mongoose = require('bluebird').promisifyAll(require('mongoose'));

var CommitSchema = new mongoose.Schema({
  timestamp: Date,
  commit: String
});

var FileSchema = new mongoose.Schema({
  user: String,
  commits: [CommitSchema],
});

export default mongoose.model('File', FileSchema);
