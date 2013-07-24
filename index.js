'use strict';

var path = require('path')
, basename = path.basename(path.dirname(__filename))
, debug = require('debug')('mill:contrib:' + basename)
, async = require('async')
, Segmenter = require('segmenter.js')
, Transform = require("stream").Transform
;

function Command(options)
{
  Transform.call(this, options);

  var regex = new RegExp(options.regex, 'gi')

  this.begin = true;
  this.seg = new Segmenter({delimiter: options.delimiter});
  this.funcgrep = function (item, callback) {
    var test = item.search(regex);
    callback((test >= 0 && !options.invert) || (test < 0 && options.invert));
  }
}

Command.prototype = Object.create(
  Transform.prototype, { constructor: { value: Command }});

Command.prototype.parse = function (lines, done) {
  var that = this;
  async.filter(lines, that.funcgrep, function (results) {
      var r = results.join(that.seg.delimiter());
      if (r) {
        r += that.seg.delimiter();
      }
      that.push(r);
      done();
    }
  );
}


Command.prototype._transform = function (chunk, encoding, done) {
  if (this.begin) {
    this.begin = false;
    this.emit('begin');
  }
  this.parse(this.seg.fetch(chunk, encoding), done);
}
Command.prototype.end = function () {
  var that = this;
  that.parse(that.seg.fetch(), function () {
      that.emit('end');
    }
  );
};

module.exports = function (input, options) {
  var cmd = new Command(options);
  return input.pipe(cmd);
}
