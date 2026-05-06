const multer = require('multer');
const supabase = require('../config/supabaseClient');

// Abandon local disk storage in favor of Memory Storage
// This keeps the file buffer in RAM for a fast transfer to Supabase
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Basic filter logic (can be expanded)
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and PDFs are allowed.'), false);
    }
  }
});

/**
 * Uploads a file buffer to Supabase Storage
 * @param {Buffer} fileBuffer - The file data from multer
 * @param {string} originalName - Original filename for extension extraction
 * @param {string} mimeType - The MIME type (e.g., image/jpeg)
 * @param {string} bucketName - 'profiles' or 'documents'
 * @param {string} folderPath - Optional subfolder (e.g., 'licenses')
 * @returns {Promise<string>} - Public URL or internal file path
 */
const uploadToSupabase = async (fileBuffer, originalName, mimeType, bucketName, folderPath = '') => {
  try {
    const fileExt = originalName.split('.').pop();
    const fileName = `${Date.now()}-${Math.floor(Math.random() * 10000)}.${fileExt}`;
    const filePath = folderPath ? `${folderPath}/${fileName}` : fileName;

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, fileBuffer, {
        contentType: mimeType,
        upsert: true
      });

    if (error) {
      console.error('Supabase Storage Upload Error:', error.message);
      throw error;
    }

    // For profile photos/avatars, return the Public URL
    if (bucketName === 'profiles') {
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);
      
      return publicUrl;
    }

    // For private documents (licenses, etc.), return the internal path
    // Access will be managed via signed URLs or backend proxying
    return data.path;
  } catch (error) {
    console.error('uploadToSupabase Utility Error:', error.message);
    throw error;
  }
};

module.exports = { upload, uploadToSupabase };
