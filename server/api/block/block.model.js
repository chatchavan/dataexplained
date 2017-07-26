'use strict';

var mongoose = require('bluebird').promisifyAll(require('mongoose'));

var CodesSchema = new mongoose.Schema({
  codeText: String,
  code: String,
  codeLabel: String,
  explanation: String
});

var BlockCodeSchema = new mongoose.Schema({
  coder: String,
  codes: [CodesSchema]
});

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
  content: String,
  blockCodes: [BlockCodeSchema]
});

var BlockSchema = new mongoose.Schema({
  user: String,
  blocks: [BlockContentSchema],
  plumb: String
});

export default mongoose.model('Block', BlockSchema);
