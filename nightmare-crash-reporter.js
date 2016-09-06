var debug = require('debug')('nightmare:crash-reporter'),
  portscanner = require('portscanner'),
  fs = require('fs'),
  path = require('path'),
  http = require('http'),
  multiparty = require('multiparty');

module.exports = exports = function(Nightmare) {
  Nightmare.action('crashReporter', function(ns, options, parent, win, renderer, done) {
    parent.respondTo('crashReporter', function(options, done) {
      var crashReporter = require('electron')
        .crashReporter;
      crashReporter.start(options);
      done();
    });
    done();
  }, function() {
    var options, done, port, self = this;
    if (arguments.length == 2) {
      options = arguments[0];
      done = arguments[1];
    } else {
      done = arguments[0];
    }

    if (process.env.DEBUG) {
      options = options || {};
    }

    if (options) {
      options.companyName = options.companyName || 'Nightmare';
      var callback = (request, response) => {
        var form = new multiparty.Form();
        form.parse(request, function(err, fields, files) {
          var revisedFields = Object.keys(fields)
            .reduce((a, k) => {
              a[k] = fields[k][0];
              return a;
            }, {});

          var tmppath = files['upload_file_minidump'][0].path;
          var originalFilename = files['upload_file_minidump'][0].originalFilename;
          var newpath = path.resolve(__dirname, originalFilename + '_' + path.basename(tmppath))
          if (options.dumpDirectory) {
            newpath = path.resolve(options.dumpDirectory, `${originalFilename}_${path.basename(tmppath)}`);
          }

          debug('crash report fields', revisedFields);

          var callback = function(err) {
            if (err) {
              debug('problem moving dump', err);
            }

            response.end();
            self.crashServer.close(function() {
              if (options.callback) {
                options.callback(err, revisedFields);
              }
            });
          };

          if (options.omitDump) {
            fs.unlink(tmppath, callback);
          } else {
            revisedFields.path = newpath;
            fs.rename(tmppath, newpath, callback);
          }
        });
      };

      portscanner.findAPortNotInUse(3000, 65536, '127.0.0.1', function(err, port) {
        options.submitURL = `http://127.0.0.1:${port}`;

        self.crashServer = require('http')
          .createServer(callback);

        self.crashServer.listen(port, () => {
          debug(`crash reporter listening to ${options.submitURL}`);
          self.child.call('crashReporter', options, () => {
            self.child.on('uncaughtException', () => {
              self.crashServer.close();
            });

            self.proc.on('close', () => {
              self.crashServer.close();
            });

            done(null, {
              port: port
            });
          });


        });
      });
    } else {
      debug('no options given, nothing to do');
      done();
    }
  });
};
