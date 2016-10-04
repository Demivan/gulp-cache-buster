'use strict';

var path = require('path');
var url = require('url');

var _ = require('lodash');
var es = require('event-stream');
var rs = require('replacestream');

var defaults = {
  hashes: {},
  assetRoot: '',
  tokenRegExp: /ASSET{(.*?)}/g,
  hashLength: 8
};

var plugin = function(options) {
  var opts = _.extend({}, defaults, options);
  var replaceFunc = function(match, group) {
    var parts = group.split(',');
    var assetPath = _.first(parts);
    var args = _.map(_.rest(parts), _.trim);
    var p = path.join(opts.assetRoot, assetPath);
    var digest = (opts.hashes[p] || '');
    var u = url.parse(assetPath);
    if (digest) {
      u.query = _.extend({}, u.query, {v: digest.substr(0, opts.hashLength)});
    }
    return match.replace(assetPath, url.format(u));
  };
  return es.map(function(file, cb) {
    var out = file;
    if (file.isNull()) { return cb(null, out); }
    if (file.isBuffer()) {
      file.contents = new Buffer(String(file.contents)
          .replace(opts.tokenRegExp, replaceFunc));
    }
    else if (file.isStream()) {
      out = file.pipe(rs(opts.tokenRegExp, replaceFunc));
    }
    return cb(null, out);
  });
};

module.exports = plugin;
