const Fs = require('fs');
const path = require('path');

const deleteFile = (filePath) => {
  // прописываем путь к файлу
  let fPath = path.join(__dirname, '..', filePath);
  Fs.unlink(fPath, (err) => {
    if (err) {
      throw (err);
    }
  });
}

exports.deleteFile = deleteFile;