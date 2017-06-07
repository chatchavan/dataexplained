'use strict';

import {Router} from 'express';
import * as controller from './user.controller';
import * as auth from '../../auth/auth.service';

var router = new Router();

router.get('/', auth.hasRole('admin'), controller.index);
router.delete('/:id', auth.hasRole('admin'), controller.destroy);
router.get('/me', auth.isAuthenticated(), controller.me);
router.put('/',  auth.isAuthenticated(), controller.update);
router.put('/me/survey', controller.updateSurvey);
router.put('/:id/password', auth.isAuthenticated(), controller.changePassword);
router.put('/setFinished/:finished', auth.isAuthenticated(), controller.setFinished);
router.get('/:id', auth.isAuthenticated(), controller.show);
router.post('/csv/:content', auth.hasRole('admin'), controller.csv);
router.post('/',  auth.isAuthenticated(), controller.create);
router.post('/createAdmin', auth.hasRole('admin'), controller.createAdmin);
router.post('/resetAdmin', auth.hasRole('admin'), controller.resetAdmin);
router.post('/deleteAdmin', auth.hasRole('admin'), controller.deleteAdmin);


export default router;
