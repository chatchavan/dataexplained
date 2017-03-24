'use strict';

var mongoose = require('bluebird').promisifyAll(require('mongoose'));

var AlternativesSchema = new mongoose.Schema({
  title: String,
  pro: String,
  contra: String
});

var BlockContentSchema = new mongoose.Schema({
  title : String,
  goal: String,
  alternatives: [AlternativesSchema],
  criteria: String,
  preconditions: String,
  timestamp: Date,
  content: String
});

var BlockSchema = new mongoose.Schema({
  user: String,
  blocks: [BlockContentSchema],
});

export default mongoose.model('Block', BlockSchema);
