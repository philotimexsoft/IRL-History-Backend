// utils/multer.js
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../Config/cloudinary');

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    return {
      folder: 'webdevprimeavtars',
      allowed_formats: ['jpg', 'png', 'jpeg'],
      transformation: [{ width: 300, height: 300, crop: 'limit' }],
      resource_type: 'image',
    };
  },
});

const upload = multer({ storage });

module.exports = upload;
