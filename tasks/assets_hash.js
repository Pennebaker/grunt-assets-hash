/*
 * grunt-assets-hash
 * https://github.com/ricardoriogo/grunt-assets-hash
 *
 * Copyright (c) 2015 Ricardo Riogo
 * Licensed under the MIT license.
 */

'use strict';

var fs = require('fs')
  , path = require('path')
  , crypto = require('crypto');

module.exports = function(grunt) {

  grunt.registerMultiTask('assets_hash', 'Rename assets files with hash for better caching and create a JSON reference file', function() {

    var options = this.options({
      encoding: 'utf8',
      algorithm: 'md5',
      jsonfile: 'assets-hash.json',
      suffix: false,
      length: 8,
      rename: false,
      clear: false,
      fullPath: true,
      removeFromPath: ''
    });

    this.files.forEach(function(files) {

      files.src.forEach(function (file) {

        if (file.length === 0) {
          grunt.log.warn('src does not exist');
          return false;
        }

        var jsonfile = options.jsonfile || 'assets-hash.json';
        if (! /\.json$/.test(jsonfile)) {
          grunt.log.warn(jsonfile + ' needs to be a JSON file.');
          return false;
        }

        if ( ! fs.existsSync(jsonfile)) {
          grunt.file.write(jsonfile, '{}');
        }

        var basename = path.basename,
            name = basename(file),
            content = grunt.file.read(file),
            hash = crypto.createHash(options.algorithm).update(content, options.encoding).digest('hex'),
            fingerprint = hash.slice(0, options.length),
            ext = path.extname(file),
            newName = options.suffix ? [basename(file, ext), fingerprint, ext.slice(1)].join('.') : [fingerprint, basename(file, ext), ext.slice(1)].join('.');

        // Prevent rename hashed files
        if(name.search(fingerprint) >= 0){
          return false;
        }

        // Copy/rename file base on hash and format
        var resultPath = path.resolve(path.dirname(file), newName);
        if (options.rename) {
          fs.renameSync(file, resultPath);
        } else {
          grunt.file.copy(file, resultPath);
        }
        grunt.log.writeln('  ' + file.grey + (' changed to ') + newName.green);

        // Open JSON file
        var jsonref = grunt.file.readJSON(jsonfile);
        
        // Delete old version file
        if (options.clear && typeof(jsonref[file]) != 'undefined' && fs.existsSync(jsonref[file])){
          grunt.file.delete(options.fullPath ? jsonref[file] : path.dirname(file) + jsonref[file]);
          grunt.log.writeln('  Deleted ' + file.grey + (' old version '));
        }
        
        // Define the output method
        var hashed = (options.fullPath) ? [path.dirname(file).replace(options.removeFromPath, ''), newName].join('/') : newName;
        var ref = (options.fullPath) ? [path.dirname(file).replace(options.removeFromPath, ''), basename(file)].join('/') : basename(file);
        jsonref[ref] = hashed;

        grunt.file.write(jsonfile, JSON.stringify(jsonref, null, 2));
        grunt.log.writeln('  ' + jsonfile.grey + (' updated hash: ') + fingerprint.green);
      });
    });
  });
};
