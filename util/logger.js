const morgan = require('morgan');
const Fs = require('fs');
const path = require('path');

const accessLogStream = Fs.createWriteStream(
  path.join(__dirname, "..", "access.log"), 
  { flags: 'a' }
);

module.exports = format => {
  return morgan(format, { stream: accessLogStream });
}
 