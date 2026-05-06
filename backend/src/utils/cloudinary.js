const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Storage for PDF documents ────────────────────────────────────────────────
const documentStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'tarix-ticketer/documents',
    resource_type: 'raw',           // Cloudinary treats PDFs as raw assets
    allowed_formats: ['pdf'],
    use_filename: true,
    unique_filename: true,
  },
});

// ── Storage for bus photos / images ─────────────────────────────────────────
const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'tarix-ticketer/bus-photos',
    resource_type: 'image',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, crop: 'limit', quality: 'auto' }],
    use_filename: true,
    unique_filename: true,
  },
});

// ── Smart multer: routes each field to the right storage engine ──────────────
const DOCUMENT_FIELDS = [
  'vehicleRegistrationCert',
  'insuranceCert',
  'roadworthinessCert',
  'inspectionReport',
  'emissionTestCert',
];

const IMAGE_FIELDS = ['busPhotos'];

// Disk-based memory storage as a fallback selector
const memoryStorage = multer.memoryStorage();

// We expose one multer instance per type; the route layer picks the right one
const uploadDocuments = multer({
  storage: documentStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (DOCUMENT_FIELDS.includes(file.fieldname) && file.mimetype !== 'application/pdf') {
      return cb(new Error(`${file.fieldname}: Only PDF files are accepted.`));
    }
    cb(null, true);
  },
});

const uploadImages = multer({
  storage: imageStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (IMAGE_FIELDS.includes(file.fieldname) && !file.mimetype.startsWith('image/')) {
      return cb(new Error(`${file.fieldname}: Only image files are accepted.`));
    }
    cb(null, true);
  },
});

// ── Combined upload middleware for the bus registration form ─────────────────
// Accepts all fields through Cloudinary (documents → raw, photos → image)
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isDocument = DOCUMENT_FIELDS.includes(file.fieldname);
    return {
      folder: isDocument ? 'tarix-ticketer/documents' : 'tarix-ticketer/bus-photos',
      resource_type: isDocument ? 'raw' : 'image',
      allowed_formats: isDocument ? ['pdf'] : ['jpg', 'jpeg', 'png', 'webp'],
      use_filename: true,
      unique_filename: true,
    };
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
  fileFilter: (req, file, cb) => {
    if (DOCUMENT_FIELDS.includes(file.fieldname) && file.mimetype !== 'application/pdf') {
      return cb(new Error(`${file.fieldname}: Only PDF files are accepted.`));
    }
    if (IMAGE_FIELDS.includes(file.fieldname) && !file.mimetype.startsWith('image/')) {
      return cb(new Error(`${file.fieldname}: Only image files are accepted (JPG/PNG/WEBP).`));
    }
    cb(null, true);
  },
});

module.exports = { cloudinary, upload, uploadDocuments, uploadImages };
