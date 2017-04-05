'use strict';

import {Router} from 'express';
import * as controller from './user.controller';
import * as auth from '../../auth/auth.service';

var router = new Router();

router.get('/', auth.hasRole('admin'), controller.index);
router.delete('/:id', auth.hasRole('admin'), controller.destroy);
router.get('/me', auth.isAuthenticated(), controller.me);
router.put('/me/survey', auth.isAuthenticated(), controller.updateSurvey);
router.put('/:id/password', auth.isAuthenticated(), controller.changePassword);
router.get('/:id', auth.isAuthenticated(), controller.show);
router.post('/', controller.create);
router.post('/createAdmin', auth.hasRole('admin'), controller.createAdmin);
router.post('/resetAdmin', auth.hasRole('admin'), controller.resetAdmin);
router.post('/deleteAdmin', auth.hasRole('admin'), controller.deleteAdmin);


export default router;
