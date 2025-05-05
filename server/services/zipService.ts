import fs from "fs";
import fsExtra from "fs-extra";
import path from "path";
import JSZip from "jszip";
import sharp from "sharp";

// This removes the AdmZip references
const zip = null;

interface ProcessedImage {
  buffer: Buffer;
  filename: string;
  width: number;
  height: number;
}

interface FileProcessingOptions {
  quality: number;
}

export const zipService = {
  /**
   * Extract images from a ZIP file and process them
   */
  async extractAndProcessImages(
    zipFilePath: string,
    options: FileProcessingOptions
  ): Promise<ProcessedImage[]> {
    const processedImages: ProcessedImage[] = [];
    
    try {
      console.log(`Starting ZIP extraction from: ${zipFilePath}`);
      
      // Verify the ZIP file exists and has content
      if (!fs.existsSync(zipFilePath)) {
        throw new Error(`ZIP file doesn't exist: ${zipFilePath}`);
      }
      
      const stats = fs.statSync(zipFilePath);
      if (stats.size === 0) {
        throw new Error(`ZIP file is empty: ${zipFilePath}`);
      }
      
      console.log(`ZIP file size: ${stats.size} bytes`);
      
      // Create temporary extraction directory with unique name
      const timestamp = Date.now();
      const extractDir = path.join(
        process.cwd(),
        "tmp",
        "extracted",
        `zip_${timestamp}`
      );
      
      // Ensure directory exists
      await fsExtra.ensureDir(extractDir);
      console.log(`Created extraction directory: ${extractDir}`);
      
      try {
        // Read the zip file as a buffer
        const zipBuffer = await fs.promises.readFile(zipFilePath);
        console.log(`Read ZIP file into buffer: ${zipBuffer.length} bytes`);
        
        // Use JSZip to load the file
        const zip = new JSZip();
        let zipContents;
        
        try {
          zipContents = await zip.loadAsync(zipBuffer);
          console.log(`Successfully loaded ZIP file with JSZip`);
        } catch (zipError) {
          console.error(`Error loading ZIP with JSZip: ${zipFilePath}`, zipError);
          throw new Error(`Invalid or corrupted ZIP file: ${path.basename(zipFilePath)}`);
        }
        
        // Count files in ZIP
        const fileCount = Object.keys(zipContents.files).length;
        console.log(`ZIP contains ${fileCount} files/directories`);
        
        if (fileCount === 0) {
          throw new Error(`ZIP file is empty: ${path.basename(zipFilePath)}`);
        }
        
        // Process each file in the ZIP
        const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".webp"];
        let extractedFileCount = 0;
        let imageCount = 0;
        
        // Extract all files first
        for (const [relativePath, zipEntry] of Object.entries(zipContents.files)) {
          // Skip directories
          if (zipEntry.dir) {
            continue;
          }
          
          // Normalize path and extract file
          const fileName = path.basename(relativePath);
          const outputPath = path.join(extractDir, fileName);
          
          try {
            // Get file content as buffer
            const content = await zipEntry.async('nodebuffer');
            
            // Determine if this is an image file
            const ext = path.extname(fileName).toLowerCase();
            const isImage = imageExtensions.includes(ext);
            
            if (isImage) {
              // Process image directly from buffer
              try {
                console.log(`Processing image from ZIP: ${fileName} (${content.length} bytes)`);
                
                if (content.length === 0) {
                  console.error(`Empty image file in ZIP: ${fileName}`);
                  continue;
                }
                
                // Process with sharp
                const image = sharp(content);
                const metadata = await image.metadata();
                
                if (!metadata.width || !metadata.height) {
                  console.error(`Could not get dimensions for ${fileName}`);
                  continue;
                }
                
                console.log(`Image dimensions: ${metadata.width}x${metadata.height}`);
                
                // Apply quality settings
                let processedImage: sharp.Sharp;
                
                if (ext === ".jpg" || ext === ".jpeg") {
                  processedImage = image.jpeg({ quality: options.quality });
                } else if (ext === ".png") {
                  processedImage = image.png({ quality: options.quality });
                } else if (ext === ".webp") {
                  processedImage = image.webp({ quality: options.quality });
                } else {
                  // For other formats, convert to JPEG
                  processedImage = image.jpeg({ quality: options.quality });
                }
                
                const buffer = await processedImage.toBuffer();
                
                processedImages.push({
                  buffer,
                  filename: fileName,
                  width: metadata.width,
                  height: metadata.height
                });
                
                imageCount++;
                console.log(`Successfully processed image from ZIP: ${fileName}`);
              } catch (imgError) {
                console.error(`Error processing image from ZIP: ${fileName}`, imgError);
              }
            } else {
              console.log(`Skipping non-image file from ZIP: ${fileName}`);
            }
            
            extractedFileCount++;
          } catch (extractError) {
            console.error(`Error extracting file from ZIP: ${fileName}`, extractError);
          }
        }
        
        console.log(`Extracted ${extractedFileCount} files from ZIP, ${imageCount} were valid images`);
        
        if (imageCount === 0) {
          console.warn(`ZIP file doesn't contain any valid images: ${path.basename(zipFilePath)}`);
        }
        
      } finally {
        // Always clean up temporary extraction directory
        try {
          await fsExtra.remove(extractDir);
          console.log(`Cleaned up extraction directory: ${extractDir}`);
        } catch (cleanupError) {
          console.error(`Error cleaning up directory ${extractDir}:`, cleanupError);
        }
      }
      
    } catch (error) {
      console.error("Error extracting ZIP file:", error);
      throw error; // Rethrow to allow handling in calling code
    }
    
    console.log(`ZIP extraction complete. Processed ${processedImages.length} images.`);
    return processedImages;
  },
  
  /**
   * No longer needed with JSZip implementation
   */
};
