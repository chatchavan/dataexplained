'use strict';

var proxyquire = require('proxyquire').noPreserveCache();

var logCtrlStub = {
  index: 'logCtrl.index',
  show: 'logCtrl.show',
  create: 'logCtrl.create',
  update: 'logCtrl.update',
  destroy: 'logCtrl.destroy'
};

var routerStub = {
  get: sinon.spy(),
  put: sinon.spy(),
  patch: sinon.spy(),
  post: sinon.spy(),
  delete: sinon.spy()
};

// require the index with our stubbed out modules
var logIndex = proxyquire('./index.js', {
  'express': {
    Router: function() {
      return routerStub;
    }
  },
  './log.controller': logCtrlStub
});

describe('Log API Router:', function() {

  it('should return an express router instance', function() {
    logIndex.should.equal(routerStub);
  });

  describe('GET /api/logs', function() {

    it('should route to log.controller.index', function() {
      routerStub.get
        .withArgs('/', 'logCtrl.index')
        .should.have.been.calledOnce;
    });

  });

  describe('GET /api/logs/:id', function() {

    it('should route to log.controller.show', function() {
      routerStub.get
        .withArgs('/:id', 'logCtrl.show')
        .should.have.been.calledOnce;
    });

  });

  describe('POST /api/logs', function() {

    it('should route to log.controller.create', function() {
      routerStub.post
        .withArgs('/', 'logCtrl.create')
        .should.have.been.calledOnce;
    });

  });

  describe('PUT /api/logs/:id', function() {

    it('should route to log.controller.update', function() {
      routerStub.put
        .withArgs('/:id', 'logCtrl.update')
        .should.have.been.calledOnce;
    });

  });

  describe('PATCH /api/logs/:id', function() {

    it('should route to log.controller.update', function() {
      routerStub.patch
        .withArgs('/:id', 'logCtrl.update')
        .should.have.been.calledOnce;
    });

  });

  describe('DELETE /api/logs/:id', function() {

    it('should route to log.controller.destroy', function() {
      routerStub.delete
        .withArgs('/:id', 'logCtrl.destroy')
        .should.have.been.calledOnce;
    });

  });

});
