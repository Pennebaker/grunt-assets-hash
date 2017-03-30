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
  crypto = require('crypto'),
  globby = require('globby');

String.prototype.escaperegex = function() {
  return this.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
};

function replaceRefs(grunt, options, file, re) {
  var jsonFile = options.jsonfile || options.jsonFile;
  if (!/\.json$/.test(jsonFile)) {
    grunt.log.warn(jsonFile + ' needs to be a JSON file.');
    return false;
  }

  var basename = path.basename,
    name = basename(file),
    content = grunt.file.read(file);

  // Open JSON file
  var jsonref = grunt.file.readJSON(jsonFile);

  var matches = content.match(re);
  if (matches) {
    var replacementPerformed = false;
    grunt.log.writeln('  ' + file.grey + ' replacements:'.blue);
    matches.forEach(function(match) {
      var match_clean = match.replace(new RegExp('\.[a-f0-9]{' + options.length + '}\.', 'g'), '.');
      if (jsonref[match_clean] != 'undefined') {
        if (match != jsonref[match_clean]) {
          content = content.replace(new RegExp(match, 'g'), jsonref[match_clean]);
          replacementPerformed = true;
        }
      } else {
        if (match != match_clean) {
          grunt.log.writeln('    ' + match.grey + ' with ' + match_clean.red);
          content = content.replace(new RegExp(match, 'g'), match_clean);
          replacementPerformed = true;
        }
      }
    });
    if (replacementPerformed) {
      grunt.file.write(file, content);
    } else {
      grunt.log.writeln('    File already up to date'.green);
    }
  }
}

function hashFile(grunt, options, file, originalNames, re, computed) {
  if (file.length === 0) {
    grunt.log.warn('src does not exist');
    return false;
  }

  var jsonFile = options.jsonfile || options.jsonFile;
  if (!/\.json$/.test(jsonFile)) {
    grunt.log.warn(jsonFile + ' needs to be a JSON file.');
    return false;
  }

  if (computed.indexOf(file) >= 0) {
    // grunt.log.writeln('    skipping ' + file.grey)
    return false;
  } else {
    computed.push(file);
  }

  if (!fs.existsSync(jsonFile)) {
    grunt.file.write(jsonFile, '{}');
  }

  var basename = path.basename,
    name = basename(file),
    content = grunt.file.read(file);

  // Open JSON file
  var jsonref = grunt.file.readJSON(jsonFile);

  var matches = content.match(re);
  if (matches) {
    var replacementPerformed = false;
    grunt.log.writeln('  ' + file.grey + ' replacements:'.blue);
    matches.forEach(function(match) {
      var match_clean = match.replace(new RegExp('\.[a-f0-9]{' + options.length + '}\.', 'g'), '.');
      hashFile(grunt, options, originalNames[match_clean], originalNames, re, computed);
      jsonref = grunt.file.readJSON(jsonFile);
      if (jsonref[match_clean] != 'undefined') {
        if (match != jsonref[match_clean]) {
          grunt.log.writeln('    ' + match.grey + ' with ' + jsonref[match_clean].green);
          content = content.replace(new RegExp(match, 'g'), jsonref[match_clean]);
          replacementPerformed = true;
        }
      } else {
        if (match != match_clean) {
          grunt.log.writeln('    ' + match.grey + ' with ' + match_clean.red);
          content = content.replace(new RegExp(match, 'g'), match_clean);
          replacementPerformed = true;
        }
      }
    });
    if (replacementPerformed) {
      grunt.file.write(file, content);
    } else {
      grunt.log.writeln('    File already up to date'.green);
    }
  }

  var hash = crypto.createHash(options.algorithm).update(content, options.encoding).digest('hex');
  var fingerprint = hash.slice(0, options.length);
  var ext = path.extname(file);
  var newName = [
    basename(file, ext),
    fingerprint,
    ext.slice(1)
  ].join('.');

  // Define the output method
  var ref = (options.fullPath) ? [
      path.dirname(file).replace(options.removeFromPath, ''),
      basename(file)
    ].join('/') :
    basename(file);
  var hashed = (options.fullPath) ? [
      path.dirname(file).replace(options.removeFromPath, ''),
      newName
    ].join('/') :
    newName;

  // The new file
  var resultPath = path.resolve(path.dirname(file), newName);

  // Prevent rename hashed files
  if (name.search(fingerprint) >= 0 || fs.existsSync(resultPath)) {
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
  // grunt.log.writeln('  ' + file.grey + (' changed to ') + newName.green);

  // Delete old version file
  if (options.clear && typeof(jsonref[ref]) != 'undefined') {
    var fileToDelete = (options.fullPath ?
      options.removeFromPath + jsonref[ref] :
      path.dirname(file) + jsonref[ref]);

    if (fs.existsSync(fileToDelete)) {
      grunt.file.delete(fileToDelete);
      grunt.log.writeln('  Deleted ' + file.grey + (' old version '));
    }
  }

  // Add or update new hashed file to JSON
  if (ext === '.map') {
    jsonref[ref.split('/').pop()] = hashed.split('/').pop();
  } else {
    jsonref[ref] = hashed;
  }
  grunt.file.write(jsonFile, JSON.stringify(jsonref, null, 2));
  // grunt.log.writeln('  ' + jsonFile.grey + (' updated hash: ') + fingerprint.green);
}

module.exports = function(grunt) {

  grunt.registerMultiTask('assets_hash', 'Rename assets files with hash for better caching and create a JSON reference file', function() {

    var options = this.options({
      encoding: 'utf8',
      algorithm: 'sha256',
      jsonFile: 'assets-hash.json',
      jsonOnly: true,
      length: 8,
      rename: false,
      clear: false,
      fullPath: true,
      removeFromPath: ''
    });

    var regExFiles = []
    var originalNames = []
    this.files.forEach(function(files) {
      files.src.forEach(function(file) {
        var reFile = file.replace(options.removeFromPath, '').escaperegex();
        if (path.extname(file) === '.map') {
          reFile = file.split('/').pop().replace(options.removeFromPath, '').escaperegex();
        }

        var arr = reFile.split('.')
        arr = arr.slice(0, arr.length - 1).concat("(?:[a-f0-9]{" + options.length + "}\.)?" + arr.slice(arr.length - 1)[0]);
        var match_re = arr.join('.');

        regExFiles.push(match_re);
        if (path.extname(file) === '.map') {
          originalNames[file.split('/').pop()] = file;
        } else {
          originalNames[file.replace(options.removeFromPath, '')] = file;
        }
      });
    });
    var re = new RegExp(regExFiles.join('|'), 'g');
    var computed = []
    this.files.forEach(function(files) {
      files.src.forEach(function(file) {
        hashFile(grunt, options, file, originalNames, re, computed);
      });
    });

    var files = globby.sync(this.data.replace_in);
    files.forEach(function(file) {
      replaceRefs(grunt, options, file, re);
    });
  });
};
