require('mocha-generators')
  .install();

var Nightmare = require('nightmare');
var should = require('chai')
  .should();
var url = require('url');
var server = require('./server');
var fs = require('fs');
var mkdirp = require('mkdirp');
var path = require('path');
var rimraf = require('rimraf');
var portscanner = require('portscanner');
var child_process = require('child_process');
var tmp_dir = path.join(__dirname, 'tmp')
var base = 'http://localhost:7500/';

describe('Nightmare crash reporter', function() {
  before(function(done) {
    require('../nightmare-crash-reporter')(Nightmare);
    Nightmare.action('crash', function(ns, options, parent, win, renderer, done) {
      parent.respondTo('crash', function(done) {
        process.crash();
        done();
      });
      done();
    }, function(done) {
      this.child.call('crash', done);
    });
    server.listen(7500, done);
  });

  it('should be constructable', function*() {
    var nightmare = Nightmare();
    nightmare.should.be.ok;
    yield nightmare.end();
  });

  describe('crash', function() {
    var nightmare;

    before(function(done) {
      mkdirp(path.join(tmp_dir), done);
    });

    after(function(done) {
      rimraf(tmp_dir, done)
    });

    beforeEach(function() {
      nightmare = new Nightmare();
    });

    afterEach(function*() {
      yield nightmare.end();
    });

    it('should handle crash reports', function(done) {
      nightmare
        .goto(fixture('crash'))
        .engineVersions()
        .then(function(versions) {
          nightmare
            .crashReporter({
              dumpDirectory: tmp_dir,
              callback: function(err, fields) {
                fields.should.be.ok;
                fields.path.should.be.ok;
                path.dirname(fields.path)
                  .should.equal(tmp_dir);
                fields.ver.should.equal(versions.electron);
                done(err);
              }
            })
            .goto(fixture('crash'))
            .crash()
            .then();
        });
    });

    it('should omit dumps', function(done) {
      nightmare
        .crashReporter({
          omitDump: true,
          callback: function(err, fields) {
            fields.should.be.ok;
            should.not.exist(fields.path);
            done(err);
          }
        })
        .goto(fixture('crash'))
        .crash()
        .then();
    });

    it('should not be using the port after a crash', function(done) {
      var port;
      nightmare
        .crashReporter({
          omitDump: true,
          callback: function(err, fields) {
            portscanner.checkPortStatus(port, '127.0.0.1', function(err, status) {
              status.should.equal('closed');
              done(err);
            });
          }
        })
        .then(function(cr) {
          port = cr.port;
          return nightmare
            .goto(fixture('crash'))
            .crash()
            .then();
        })

    });

    it('should not be using the port after a successful end', function(done) {
      nightmare
        .crashReporter({
          omitDump: true,
          callback: function(err, fields) {
            done('no crash should happen!');
          }
        })
        .then(function(cr) {
          return nightmare
            .goto(fixture('crash'))
            .end()
            .then(function() {
              portscanner.checkPortStatus(cr.port, '127.0.0.1', function(err, status) {
                status.should.equal('closed');
                done(err);
              });
            });
        });
    });

    it('should not be using the port after an uncaught exception', function(done) {
      var child = child_process.fork(
        path.join(__dirname, 'files', 'nightmare-error.js'), [], {
          silent: true,
          stdio: 'pipe'
        });

      var port;
      child.stdout.on('data', (chunk) => {
        port = chunk;
      });

      child.once('exit', function() {
        portscanner.checkPortStatus(port, '127.0.0.1', function(err, status) {
          status.should.equal('closed');
          done(err);
        });
      });
    });
  });
});

function fixture(path) {
  return url.resolve(base, path);
}
