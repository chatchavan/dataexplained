'use strict';

var app = require('../..');
import request from 'supertest';

var newFile;

describe('File API:', function() {

  describe('GET /api/files', function() {
    var files;

    beforeEach(function(done) {
      request(app)
        .get('/api/files')
        .expect(200)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          files = res.body;
          done();
        });
    });

    it('should respond with JSON array', function() {
      files.should.be.instanceOf(Array);
    });

  });

  describe('POST /api/files', function() {
    beforeEach(function(done) {
      request(app)
        .post('/api/files')
        .send({
          name: 'New File',
          info: 'This is the brand new file!!!'
        })
        .expect(201)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          newFile = res.body;
          done();
        });
    });

    it('should respond with the newly created file', function() {
      newFile.name.should.equal('New File');
      newFile.info.should.equal('This is the brand new file!!!');
    });

  });

  describe('GET /api/files/:id', function() {
    var file;

    beforeEach(function(done) {
      request(app)
        .get('/api/files/' + newFile._id)
        .expect(200)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          file = res.body;
          done();
        });
    });

    afterEach(function() {
      file = {};
    });

    it('should respond with the requested file', function() {
      file.name.should.equal('New File');
      file.info.should.equal('This is the brand new file!!!');
    });

  });

  describe('PUT /api/files/:id', function() {
    var updatedFile;

    beforeEach(function(done) {
      request(app)
        .put('/api/files/' + newFile._id)
        .send({
          name: 'Updated File',
          info: 'This is the updated file!!!'
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          updatedFile = res.body;
          done();
        });
    });

    afterEach(function() {
      updatedFile = {};
    });

    it('should respond with the updated file', function() {
      updatedFile.name.should.equal('Updated File');
      updatedFile.info.should.equal('This is the updated file!!!');
    });

  });

  describe('DELETE /api/files/:id', function() {

    it('should respond with 204 on successful removal', function(done) {
      request(app)
        .delete('/api/files/' + newFile._id)
        .expect(204)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          done();
        });
    });

    it('should respond with 404 when file does not exist', function(done) {
      request(app)
        .delete('/api/files/' + newFile._id)
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
