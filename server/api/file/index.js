'use strict';

var express = require('express');
var controller = require('./file.controller');
var auth = require('../../auth/auth.service');


var router = express.Router();

router.get('/', auth.isAuthenticated(), controller.index);
router.get('/:timestamp', auth.isAuthenticated(), controller.show);
router.get('/:user/:timestamp/diff', auth.isAuthenticated(), controller.showDiff);
router.post('/', auth.isAuthenticated(), controller.createTemp);
router.put('/:id', auth.isAuthenticated(), controller.update);
router.patch('/:id', auth.isAuthenticated(), controller.update);
router.delete('/:id', auth.isAuthenticated(), controller.destroy);

module.exports = router;
