var Converter = require('./converter.js');
var convert = new Converter('./test/docs', './test/annotations');
convert.convert();
