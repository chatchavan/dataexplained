'use strict';

var express = require('express');
var controller = require('./block.controller');

var router = express.Router();

router.get('/', controller.index);
router.get('/:user', controller.show);
router.post('/', controller.create);
router.put('/', controller.update);
router.patch('/:id', controller.update);
router.delete('/:user/:blockId', controller.destroy);

module.exports = router;
