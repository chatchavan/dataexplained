/**
 * Main application routes
 */

'use strict';

import errors from './components/errors';
import path from 'path';

export default function(app) {
  // Insert routes below
  app.use('/api/configurations', require('./api/configuration'));
  app.use('/api/files', require('./api/file'));
  app.use('/api/users', require('./api/user'));
  app.use('/api/logs', require('./api/log'));
  app.use('/api/blocks', require('./api/block'));
  app.use('/api/things', require('./api/thing'));
  app.use('/auth', require('./auth'));

  // Catch unauthorised errors
  app.use(function (err, req, res, next) {
    if (err.name === 'UnauthorizedError') {
      res.status(401);
      res.json({"message" : err.name + ": " + err.message});
    }
  });

  // All undefined asset or api routes should return a 404
  app.route('/:url(api|auth|components|app|bower_components|assets)/*')
   .get(errors[404]);

  // All other routes should redirect to the index.html
  app.route('/*')
    .get((req, res) => {
      res.status(404);
      if(req.url === '/muieblackcat'){
        res.status(404).end();
      }
      else{
        res.sendFile(path.resolve(app.get('appPath') + '/index.html'));
      }
    });
}
