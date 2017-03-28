'use strict';

var express = require('express');
var controller = require('./log.controller');

var router = express.Router();

router.get('/', controller.index);
router.get('/:user', controller.show);
router.get('/file/:user', controller.showFromFile);
router.post('/finish', controller.finish);
router.post('/delete', controller.destroy);

module.exports = router;
