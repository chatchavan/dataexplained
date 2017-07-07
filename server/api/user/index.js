'use strict';

import {Router} from 'express';
import * as controller from './user.controller';
import * as auth from '../../auth/auth.service';

var router = new Router();

router.get('/', auth.hasRole('admin'), controller.index);
router.get('/me', auth.isAuthenticated(), controller.me);
router.get('/admin/all', auth.hasRole('admin'), controller.indexAdmin);
router.get('/admin/userPackages', auth.hasRole('admin'), controller.getUserPackages);
router.get('/:id', auth.isAuthenticated(), controller.show);
router.get('/csvAll/:blockWise/:content', auth.hasRole('admin'), controller.csvAll);
router.put('/',  auth.isAuthenticated(), controller.update);
router.put('/me/survey', controller.updateSurvey);
router.put('/:id/password', auth.isAuthenticated(), controller.changePassword);
router.put('/setFinished/:finished', auth.isAuthenticated(), controller.setFinished);
router.post('/csv/:blockWise/:content', auth.hasRole('admin'), controller.csv);
router.post('/',  auth.isAuthenticated(), controller.create);
router.post('/createAdmin', auth.hasRole('admin'), controller.createAdmin);
router.post('/resetAdmin', auth.hasRole('admin'), controller.resetAdmin);
router.post('/deleteAdmin', auth.hasRole('admin'), controller.deleteAdmin);
router.delete('/:id', auth.hasRole('admin'), controller.destroy);


export default router;
