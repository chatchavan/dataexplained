'use strict';

var express = require('express');
var controller = require('./log.controller');

var router = express.Router();

router.get('/', controller.index);
router.get('/:user', controller.show);

module.exports = router;
