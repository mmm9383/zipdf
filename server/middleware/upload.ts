import multer from "multer";
import path from "path";
import fs from "fs";

// Create upload directory if it doesn't exist
const uploadDir = path.join(process.cwd(), "tmp", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate a unique filename with original extension
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

// Configure file filter
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept images and zip files only
  const allowedMimes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/bmp",
    "image/tiff",
    "application/zip",
    "application/x-zip-compressed", // Add common alternative MIME type for ZIP
    "application/octet-stream" // Fallback for some browsers/systems
  ];
  
  // Also check file extension for validation
  const ext = path.extname(file.originalname).toLowerCase();
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff'];
  
  // Allow files with .zip extension regardless of MIME type
  if (ext === '.zip') {
    console.log(`Accepting ZIP file: ${file.originalname}, MIME: ${file.mimetype}`);
    cb(null, true);
    return;
  }
  
  // Allow image files by extension
  if (imageExtensions.includes(ext)) {
    console.log(`Accepting image file by extension: ${file.originalname}, MIME: ${file.mimetype}`);
    cb(null, true);
    return;
  }
  
  // Finally check by MIME type
  if (allowedMimes.includes(file.mimetype)) {
    console.log(`Accepting file by MIME type: ${file.originalname}, MIME: ${file.mimetype}`);
    cb(null, true);
  } else {
    console.log(`Rejected file: ${file.originalname}, MIME: ${file.mimetype}, Extension: ${ext}`);
    cb(new Error(`Unsupported file type or extension: ${file.mimetype} / ${ext}`));
  }
};

// Configure upload limits
const limits = {
  fileSize: 50 * 1024 * 1024, // 50 MB
  files: 10, // Maximum 10 files at once
};

// Create and export multer middleware
export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits,
});
