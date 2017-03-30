# grunt-assets-hash

> Rename assets files with hash for better caching and add to JSON file

## Getting Started
This plugin requires Grunt `~1.0.1`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-assets-hash --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-assets-hash');
```

## NOTE
This plugin is based in [grunt-asset-version-json by Andy Ford](https://github.com/andyford/grunt-asset-version-json)


## Usage Example

```javascript
assets_hash: {
  assets: {
    options: {
      algorithm: 'sha1',
      jsonFile: 'assets/versions.json',
      clear: true
    },
    src: 'public/assets/css/main.css'
  }
},
```

This example task will rename `public/assets/css/main.css` to `public/assets/css/main.{sha1hash}.css` and update assets reference in `assets/versions.json` which would look something like `{ "public/assets/css/main.css": "public/assets/css/main.SOMEHASH.css" }`;


## Options

### rename

Type: `Boolean`  
Default: `false`

It will rename the `src` target instead of copy.

### suffix

Type: `Boolean`  
Default: `false`

Define the file name format as suffixed or prefixed.  
```
true: {filename}.{hash}.{ext}  
false: {hash}.{filename}.{ext}
```

### encoding

Type: `String`  
Default: `'utf8'`

The file encoding.

### algorithm

Type: `String`  
Default: `'md5'`

`algorithm` is dependent on the available algorithms supported by the version of OpenSSL on the platform. Examples are `'sha1'`, `'md5'`, `'sha256'`, `'sha512'`, etc. On recent releases, `openssl list-message-digest-algorithms` will display the available digest algorithms.

### length

Type: `Number`  
Default: `8`

The number of characters of the file hash to prefix the file name with.

### jsonFile

Type: `String`  
Default: `assets-hash.json`

The JSON file that will contain all reference to files and hashs. If that file doesn't exists, will be created.

### clear

Type: `Boolean`  
Default: `false`

If true, will delete old hashed file.

### fullPath

Type: `Boolean`  
Default: `true`

If true, the paths will be present in JSON file.

### removeFromPath

Type: `String`  
Default: ``

If this string is not empty, will be removed from path.  
Example: if you hash `public/assets/main.90ea3212.css` and **removeFromPath** is set to `public/` your JSON will contain only `assets/main.90ea3212.css`
