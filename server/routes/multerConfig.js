const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

/**
 * Storage factory function that returns a multer.diskStorage engine
 * for a specific subfolder inside public/uploads.
 * Ensures the destination directory exists before writing files.
 */
const createStorage = (subfolder) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, '../../public/uploads', subfolder);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${uuidv4()}${ext}`);
    }
  });
};

/**
 * File filter for images: allow jpg, jpeg, png, gif, webp, svg
 */
const imageFilter = (req, file, cb) => {
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only image files (jpg, jpeg, png, gif, webp, svg) are allowed.'), false);
  }
};

/**
 * File filter for certificates: allow images and pdf documents
 */
const certFilter = (req, file, cb) => {
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.pdf'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only image files (jpg, jpeg, png, gif, webp, svg) and PDF documents are allowed.'), false);
  }
};

/**
 * File filter for resume: PDF only
 */
const resumeFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (ext === '.pdf') {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF documents are allowed for resume.'), false);
  }
};

// Exported Multer middleware instances
const profileUpload = multer({
  storage: createStorage('profile'),
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
}).single('profile_image');

const projectUpload = multer({
  storage: createStorage('projects'),
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
}).single('image');

const certificateUpload = multer({
  storage: createStorage('certificates'),
  fileFilter: certFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
}).single('image');

const resumeUpload = multer({
  storage: createStorage('resume'),
  fileFilter: resumeFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
}).single('resume');

module.exports = {
  profileUpload,
  projectUpload,
  certificateUpload,
  resumeUpload,
  createStorage,
  imageFilter,
  certFilter,
  resumeFilter
};
