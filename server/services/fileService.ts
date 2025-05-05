import fs from "fs";
import path from "path";
import sharp from "sharp";
import { zipService } from "./zipService";

interface ProcessedImage {
  buffer: Buffer;
  filename: string;
  width: number;
  height: number;
}

interface FileProcessingOptions {
  quality: number;
}

export const fileService = {
  /**
   * Process uploaded files (images and zip files)
   */
  async processFiles(
    files: Express.Multer.File[],
    options: FileProcessingOptions
  ): Promise<ProcessedImage[]> {
    const processedImages: ProcessedImage[] = [];
    
    for (const file of files) {
      try {
        console.log(`Processing file: ${file.originalname}, MIME: ${file.mimetype}, Size: ${file.size} bytes`);
        const fileExt = path.extname(file.originalname).toLowerCase();
        
        // Check if file exists and has content
        const stats = await fs.promises.stat(file.path);
        if (stats.size === 0) {
          console.error(`File ${file.path} is empty`);
          continue;
        }
        
        // Better check for ZIP files with multiple possible conditions
        const isZip = fileExt === ".zip" || 
                    file.mimetype === "application/zip" || 
                    file.mimetype === "application/x-zip-compressed" || 
                    file.mimetype === "application/octet-stream" ||
                    file.originalname.toLowerCase().endsWith('.zip');
                
        if (isZip) {
          console.log(`Extracting ZIP file: ${file.originalname}, Size: ${file.size} bytes`);
          try {
            // Extract and process images from ZIP file
            const extractedImages = await zipService.extractAndProcessImages(file.path, options);
            console.log(`Extracted ${extractedImages.length} images from ZIP file ${file.originalname}`);
            if (extractedImages.length === 0) {
              console.log(`No valid images found in ZIP file: ${file.originalname}`);
            }
            processedImages.push(...extractedImages);
          } catch (zipError) {
            console.error(`Error extracting ZIP file ${file.originalname}:`, zipError);
          }
        } else if ([".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff"].includes(fileExt)) {
          // Process individual image file
          console.log(`Processing image file: ${file.originalname}`);
          const processedImage = await this.processImage(file, options);
          if (processedImage) {
            processedImages.push(processedImage);
          }
        } else {
          console.log(`Unsupported file extension: ${fileExt} for file ${file.originalname}`);
        }
      } catch (error) {
        console.error(`Error processing file ${file.originalname}:`, error);
      } finally {
        // Clean up the uploaded file
        try {
          await fs.promises.unlink(file.path);
        } catch (err) {
          console.error(`Error deleting file ${file.path}:`, err);
        }
      }
    }
    
    return processedImages;
  },
  
  /**
   * Process an individual image file
   */
  async processImage(
    file: Express.Multer.File,
    options: FileProcessingOptions
  ): Promise<ProcessedImage | null> {
    try {
      // Use sharp to process the image
      const image = sharp(file.path);
      const metadata = await image.metadata();
      
      if (!metadata.width || !metadata.height) {
        console.error(`Could not get dimensions for ${file.originalname}`);
        return null;
      }
      
      // Apply quality settings
      let processedImage: sharp.Sharp;
      
      // Apply different quality settings based on the input format
      if (file.mimetype === "image/jpeg" || file.mimetype === "image/jpg") {
        processedImage = image.jpeg({ quality: options.quality });
      } else if (file.mimetype === "image/png") {
        processedImage = image.png({ quality: options.quality });
      } else if (file.mimetype === "image/webp") {
        processedImage = image.webp({ quality: options.quality });
      } else {
        // For other formats, convert to JPEG with quality setting
        processedImage = image.jpeg({ quality: options.quality });
      }
      
      const buffer = await processedImage.toBuffer();
      
      return {
        buffer,
        filename: file.originalname,
        width: metadata.width,
        height: metadata.height
      };
    } catch (error) {
      console.error(`Error processing image ${file.originalname}:`, error);
      return null;
    }
  },
  
  /**
   * Clean up temporary files and directories
   */
  async cleanupTempFiles(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (error) {
      console.error(`Error cleaning up file ${filePath}:`, error);
    }
  }
};
