const path = require('path');

const getUploadDir = () => {
    if (process.env.UPLOAD_DIR && String(process.env.UPLOAD_DIR).trim()) {
        return path.resolve(process.env.UPLOAD_DIR);
    }

    return path.join(__dirname, '..', 'uploads');
};

module.exports = {
    getUploadDir
};
