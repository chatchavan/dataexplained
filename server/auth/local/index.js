'use strict';

import express from 'express';
import passport from 'passport';
import {signToken} from '../auth.service';
import User from '../.././api/user/user.model';

var router = express.Router();

router.post('/', function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    var error = err || info;
    if (error) {
      return res.status(401).json(error);
    }
    if (!user) {
      return res.status(404).json({message: 'Something went wrong, please try again.'});
    }

    User.findOne({'username': user.username}).exec(function (errFind, u){
      if(u && !errFind){
        u.lastLogin = new Date();
        u.save(function (err) {});
      }
    });

    var token = signToken(user._id, user.role);
    res.json({ token });
  })(req, res, next)
});

export default router;
