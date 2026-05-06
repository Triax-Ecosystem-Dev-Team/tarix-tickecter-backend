const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Define fields
const DOCUMENT_FIELDS = [
  'vehicleRegistrationCert',
  'insuranceCert',
  'roadworthinessCert',
  'inspectionReport',
  'emissionTestCert',
  'licenseFile',
  'ninFile',
];

const IMAGE_FIELDS = ['busPhotos', 'profilePhoto', 'avatar'];

// Create storage engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let dir = 'uploads/temp'; // Default temp folder for Cloudinary processing
    
    if (DOCUMENT_FIELDS.includes(file.fieldname)) {
      dir = 'uploads/documents'; // Local storage for sensitive docs
    }

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (DOCUMENT_FIELDS.includes(file.fieldname)) {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed for documents'), false);
    }
  } else if (IMAGE_FIELDS.includes(file.fieldname)) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for photos'), false);
    }
  } else {
    cb(null, true);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Helper to upload to Cloudinary and delete local temp file
const uploadToCloudinary = async (localPath, folder) => {
  try {
    const result = await cloudinary.uploader.upload(localPath, {
      folder: `tarix-ticketer/${folder}`,
      use_filename: true,
      unique_filename: true,
    });
    // Delete local temp file
    fs.unlinkSync(localPath);
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary Upload Error:', error);
    throw error;
  }
};

module.exports = { upload, uploadToCloudinary };
