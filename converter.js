var path = require('path'),
    os = require('os'),
    fs = require('fs'),
    walk = require('walk'),
    marked = require('marked'),
    _ = require('lodash'),
    q = require('q');

function Converter(inPath, outPath) {
  this.inPath = inPath;
  this.outPath = outPath;
  this.files = [];
  this.annotations = [];
}

Converter.prototype = {
  convert: function() {
    var self = this;
    this.read().then(function() {
      _(self.files).each(function(file) {
        var chunks = self.parseText(file);
        chunks = self.parseMarkdown(chunks);
        self.annotations = self.annotations.concat(chunks);
      });

      self.writeAnnotations();

    }).done();

  },
  read: function() {
    var options = {
      followLinks: false
    };

    var deferred = q.defer();

    var walker = walk.walk(this.inPath, options);

    var self = this;
    walker.on("file", function(root, fileStats, next) {
      if (path.extname(fileStats.name) === ".md") {
        self.files.push(root + path.sep + fileStats.name);
      }
      next();
    });

    walker.on("end", function() {
      deferred.resolve(self);
    });

    return deferred.promise;
  },

  parseText: function(file) {
    var text = fs.readFileSync(file, 'utf8');
    var lines = text.split(os.EOL);
    var chunks = [];

    var commentPrefix = "[//]: # ";
    
    var chunk = {
      el: '',
      title: '',
      comment: ''
    };

    _(lines).each(function(line, i) {
      if (line.indexOf(commentPrefix) !== -1) {
        if (chunk.el && chunk.el !== '') {
            chunks.push(chunk);
        }

        var heading = line.replace(commentPrefix, '');
        heading = heading.split("|");
        chunk = {
          el: heading[1],
          title: heading[0],
          comment: ''
        }
      } else {
        chunk.comment = chunk.comment + line + os.EOL;
      }

      if (i == lines.length - 1) {
          chunks.push(chunk);
      }
    });

    return chunks;
  },

  parseMarkdown: function(chunks) {
    _(chunks).each(function(chunk) {
      chunk.comment = marked(chunk.comment);
    });

    return chunks;
  },

  writeAnnotations: function() {
    var filename = "annotations.js";
    var content = "var comments = { 'comments':" + JSON.stringify(this.annotations) + "};";
    fs.writeFile(this.outPath + path.sep + filename, content, function(err) {
      if (err) console.log(err);
      console.log('Annotations written.');
    });

  }
};

module.exports = Converter;
