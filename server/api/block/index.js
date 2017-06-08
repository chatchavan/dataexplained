'use strict';

var express = require('express');
var controller = require('./block.controller');
var auth = require('../../auth/auth.service');

var router = express.Router();

router.get('/', auth.hasRole('admin'), controller.index);
router.get('/user', auth.isAuthenticated(), controller.show);
router.get('/user/db', auth.isAuthenticated(), controller.showFromDb);
router.get('/admin/:user', auth.hasRole('admin'), controller.showAdmin);
router.post('/plumb', auth.isAuthenticated(), controller.createPlumb);
router.post('/plumb/delete', auth.isAuthenticated(), controller.deletePlumb);
router.post('/', auth.isAuthenticated(),  controller.create);
// router.post('/delete/:user/:blockId', controller.destroy);
router.put('/', auth.isAuthenticated(), controller.update);
router.patch('/:id', auth.isAuthenticated(), controller.update);
router.delete('/:user/:blockId', auth.isAuthenticated(), controller.destroy);

module.exports = router;
