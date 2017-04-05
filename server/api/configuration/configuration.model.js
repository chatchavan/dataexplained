'use strict';

var mongoose = require('bluebird').promisifyAll(require('mongoose'));

var ConfigurationSchema = new mongoose.Schema({
  survey: {
    type: Boolean,
    default: false
  }
});

export default mongoose.model('Configuration', ConfigurationSchema);
