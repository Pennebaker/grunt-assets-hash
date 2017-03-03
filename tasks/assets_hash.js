/*
 * grunt-assets-hash
 * https://github.com/ricardoriogo/grunt-assets-hash
 *
 * Copyright (c) 2015 Ricardo Riogo
 * Licensed under the MIT license.
 */

'use strict';

var fs = require('fs'),
    path = require('path'),
    crypto = require('crypto');

module.exports = function(grunt) {

  grunt.registerMultiTask('assets_hash', 'Rename assets files with hash for better caching and create a JSON reference file', function() {

    var options = this.options({
      encoding: 'utf8',
      algorithm: 'md5',
      jsonFile: 'assets-hash.json',
      jsonOnly: false,
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

        var jsonFile = options.jsonfile || options.jsonFile;
        if (! /\.json$/.test(jsonFile)) {
          grunt.log.warn(jsonFile + ' needs to be a JSON file.');
          return false;
        }

        if ( ! fs.existsSync(jsonFile)) {
          grunt.file.write(jsonFile, '{}');
        }

        var basename = path.basename,
            name = basename(file),
            content = grunt.file.read(file),
            hash = crypto.createHash(options.algorithm).update(content, options.encoding).digest('hex'),
            fingerprint = hash.slice(0, options.length),
            ext = path.extname(file),
            newName = options.suffix ? [basename(file, ext), fingerprint, ext.slice(1)].join('.') : [fingerprint, basename(file, ext), ext.slice(1)].join('.');

        // Define the output method
        var ref = (options.fullPath) ? [path.dirname(file).replace(options.removeFromPath, ''), basename(file)].join('/') : basename(file);
        var hashed = (options.fullPath) ? [path.dirname(file).replace(options.removeFromPath, ''), newName].join('/') : newName;

        // The new file
        var resultPath = path.resolve(path.dirname(file), newName);
        
        // Prevent rename hashed files
        if(name.search(fingerprint) >= 0 || fs.existsSync(resultPath)){
          return false;
        }

        // Copy/rename file base on hash and format
        if (!options.jsonOnly) {
          if (options.rename) {
            fs.renameSync(file, resultPath);
          } else {
            grunt.file.copy(file, resultPath);
          }
        }
        grunt.log.writeln('  ' + file.grey + (' changed to ') + newName.green);

        // Open JSON file
        var jsonref = grunt.file.readJSON(jsonFile);
        
        // Delete old version file
        if (options.clear && typeof(jsonref[ref]) != 'undefined'){
          var fileToDelete = (options.fullPath ? options.removeFromPath + jsonref[ref] : path.dirname(file) + jsonref[ref]);
          
          if(fs.existsSync(fileToDelete)){
            grunt.file.delete(fileToDelete);
            grunt.log.writeln('  Deleted ' + file.grey + (' old version '));
          }
        }
        
        // Add or update new hashed file to JSON
        jsonref[ref] = hashed
        grunt.file.write(jsonFile, JSON.stringify(jsonref, null, 2));
        grunt.log.writeln('  ' + jsonFile.grey + (' updated hash: ') + fingerprint.green);
      });
    });
  });
};
