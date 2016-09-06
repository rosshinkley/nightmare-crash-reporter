nightmare-crash-reporter
========================

Add Electron crash reporting to your [Nightmare](http://github.com/segmentio/nightmare) scripts.

## Usage
Require the library: and pass the Nightmare library as a reference to attach the plugin actions:

```js
var Nightmare = require('nightmare');
require('nightmare-crash-reporter')(Nightmare);
```

When started, `nightmare-crash-reporter` will scan for an open port on localhost starting with 3000, then stand up a temporary crash report server to accept crash reports.  When Nightmare is ended (either gracefully or via a crash), the temporary crash report server will be stopped and the port freed.

### .crashReporter([options])
Start the crash reporter with the given options.  If no options are given, the crash reporter will not be started _unless_ the `DEBUG` environment variable is set.  The options provided are ultimately passed to the crash reporter; all of the options available to the crash reporter are available to the options hash.  This method resolves to the port the temporary crash report server is started on.

#### omitDump
Remove the temporary dump after the crash is reported.

#### companyName (defaults to 'Nightmare')
Mandatory from Electron's crash reporter.  Use this to denote who is doing the crash reporting.

#### productName
From Electron's crash reporter.  Use this to denote what is doing the crash reporting.

#### dumpDirectory (defaults to `/tmp`)
The target directory for crash report dumps.

#### callback
If a crash occurs, this function will get called with an error (if there was a problem moving the dump if using `options.dumpDirectory`) and the fields from the original crash report.  The saved path of the dump is included on the fields hash.

## Example

```javascript
var Nightmare = require('nightmare');
require('nightmare-crash-reporter')(Nightmare);
var nightmare = Nightmare();
nightmare
  .crashReporter({
    dumpDirectory: '/some/path',
    callback: function(err, fields){
      console.dir(fields);    
    })
  .someActionThatCausesCrash()
  .end()
  .then(()=>console.log('done'));
```

