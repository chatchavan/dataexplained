'use strict';

var express = require('express');
var controller = require('./block.controller');
var auth = require('../../auth/auth.service');

var router = express.Router();

router.get('/', controller.index);
router.get('/:user', controller.show);
router.get('/admin/:user', auth.hasRole('admin'), controller.showAdmin);
router.post('/plumb', controller.createPlump);
router.post('/', controller.create);
// router.post('/delete/:user/:blockId', controller.destroy);
router.put('/', controller.update);
router.patch('/:id', controller.update);
router.delete('/:user/:blockId', controller.destroy);

module.exports = router;
