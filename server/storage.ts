import fs from "fs";
import path from "path";

// Ensure temp directories exist
const ensureTempDirs = () => {
  const dirs = [
    path.join(process.cwd(), "tmp"),
    path.join(process.cwd(), "tmp", "uploads"),
    path.join(process.cwd(), "tmp", "output"),
    path.join(process.cwd(), "tmp", "extracted"),
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
};

// Create a cleanup function to remove older files
const cleanupOldFiles = () => {
  const now = Date.now();
  const oneHourAgo = now - 3600000; // 1 hour in milliseconds
  
  const directories = [
    path.join(process.cwd(), "tmp", "uploads"),
    path.join(process.cwd(), "tmp", "output"),
    path.join(process.cwd(), "tmp", "extracted"),
  ];
  
  directories.forEach(dir => {
    if (fs.existsSync(dir)) {
      fs.readdir(dir, (err, files) => {
        if (err) {
          console.error(`Error reading directory ${dir}:`, err);
          return;
        }
        
        files.forEach(file => {
          const filePath = path.join(dir, file);
          
          // Check if the file is older than 1 hour
          fs.stat(filePath, (err, stats) => {
            if (err) {
              console.error(`Error getting file stats for ${filePath}:`, err);
              return;
            }
            
            if (stats.isFile() && stats.mtimeMs < oneHourAgo) {
              fs.unlink(filePath, err => {
                if (err) {
                  console.error(`Error deleting file ${filePath}:`, err);
                }
              });
            } else if (stats.isDirectory() && stats.mtimeMs < oneHourAgo) {
              // For extracted directories, use the recursive deletion
              fs.rm(filePath, { recursive: true }, err => {
                if (err) {
                  console.error(`Error deleting directory ${filePath}:`, err);
                }
              });
            }
          });
        });
      });
    }
  });
};

// Run cleanup every hour
setInterval(cleanupOldFiles, 3600000);

// Initialize storage by ensuring directories exist
ensureTempDirs();

export const storage = {
  getFilePath: (filename: string) => path.join(process.cwd(), "tmp", "output", filename),
  
  // Check if a file exists
  fileExists: (filename: string) => {
    const filePath = path.join(process.cwd(), "tmp", "output", filename);
    return fs.existsSync(filePath);
  },
  
  // Clean up a specific file
  cleanupFile: (filePath: string) => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error(`Error cleaning up file ${filePath}:`, error);
    }
  }
};
