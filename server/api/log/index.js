'use strict';

var express = require('express');
var controller = require('./log.controller');
var auth = require('../../auth/auth.service');

var router = express.Router();

router.get('/', auth.isAuthenticated(), controller.index);
router.get('/:user', auth.isAuthenticated(), controller.show);
router.get('/file/:user', auth.isAuthenticated(), controller.showFromFile);
router.get('/history/:user', auth.hasRole('admin'), controller.showHistory);
router.get('/user/db', auth.isAuthenticated(), controller.showFromDb);
router.post('/',  auth.isAuthenticated(), controller.create);
router.post('/finish',  auth.isAuthenticated(), controller.finish);
router.post('/delete',  auth.isAuthenticated(),controller.destroy);

module.exports = router;
