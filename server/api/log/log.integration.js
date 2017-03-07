'use strict';

var app = require('../..');
import request from 'supertest';

var newLog;

describe('Log API:', function() {

  describe('GET /api/logs', function() {
    var logs;

    beforeEach(function(done) {
      request(app)
        .get('/api/logs')
        .expect(200)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          logs = res.body;
          done();
        });
    });

    it('should respond with JSON array', function() {
      logs.should.be.instanceOf(Array);
    });

  });

  describe('POST /api/logs', function() {
    beforeEach(function(done) {
      request(app)
        .post('/api/logs')
        .send({
          name: 'New Log',
          info: 'This is the brand new log!!!'
        })
        .expect(201)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          newLog = res.body;
          done();
        });
    });

    it('should respond with the newly created log', function() {
      newLog.name.should.equal('New Log');
      newLog.info.should.equal('This is the brand new log!!!');
    });

  });

  describe('GET /api/logs/:id', function() {
    var log;

    beforeEach(function(done) {
      request(app)
        .get('/api/logs/' + newLog._id)
        .expect(200)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          log = res.body;
          done();
        });
    });

    afterEach(function() {
      log = {};
    });

    it('should respond with the requested log', function() {
      log.name.should.equal('New Log');
      log.info.should.equal('This is the brand new log!!!');
    });

  });

  describe('PUT /api/logs/:id', function() {
    var updatedLog;

    beforeEach(function(done) {
      request(app)
        .put('/api/logs/' + newLog._id)
        .send({
          name: 'Updated Log',
          info: 'This is the updated log!!!'
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          updatedLog = res.body;
          done();
        });
    });

    afterEach(function() {
      updatedLog = {};
    });

    it('should respond with the updated log', function() {
      updatedLog.name.should.equal('Updated Log');
      updatedLog.info.should.equal('This is the updated log!!!');
    });

  });

  describe('DELETE /api/logs/:id', function() {

    it('should respond with 204 on successful removal', function(done) {
      request(app)
        .delete('/api/logs/' + newLog._id)
        .expect(204)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          done();
        });
    });

    it('should respond with 404 when log does not exist', function(done) {
      request(app)
        .delete('/api/logs/' + newLog._id)
        .expect(404)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          done();
        });
    });

  });

});
