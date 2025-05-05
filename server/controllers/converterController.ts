import { Request, Response } from "express";
import { fileService } from "../services/fileService";
import { pdfService } from "../services/pdfService";
import fs from "fs";
import path from "path";

export const converterController = {
  /**
   * Convert uploaded files to PDF
   */
  async convertToPdf(req: Request, res: Response) {
    try {
      console.log("Starting file conversion process");
      
      // Get uploaded files
      const files = req.files as Express.Multer.File[];
      
      // Validate input
      if (!files || files.length === 0) {
        console.log("No files were uploaded");
        return res.status(400).json({
          success: false,
          message: "No files were uploaded",
        });
      }
      
      console.log(`Received ${files.length} files for conversion`);
      
      // Log file details
      files.forEach((file, index) => {
        console.log(`File ${index + 1}: ${file.originalname}, MIME: ${file.mimetype}, Size: ${file.size} bytes`);
      });
      
      // Get conversion options from request
      const showFilenames = req.body.showFilenames === "true";
      const imageQuality = req.body.imageQuality || "medium";
      const pageSize = req.body.pageSize || "a4";
      
      console.log(`Conversion options: showFilenames=${showFilenames}, quality=${imageQuality}, pageSize=${pageSize}`);
      
      // Convert quality setting to a number
      let qualityValue = 80; // medium quality default
      
      if (imageQuality === "high") {
        qualityValue = 100;
      } else if (imageQuality === "low") {
        qualityValue = 50;
      }
      
      // Process files (extract images from ZIP, process individual images)
      console.log("Processing files...");
      const processedImages = await fileService.processFiles(files, {
        quality: qualityValue,
      });
      
      console.log(`Processed ${processedImages.length} images total`);
      
      if (processedImages.length === 0) {
        console.log("No valid images found in the uploaded files");
        return res.status(400).json({
          success: false,
          message: "No valid images found in the uploaded files",
        });
      }
      
      // Generate the PDF
      console.log("Generating PDF...");
      const pdfPath = await pdfService.generatePDF(processedImages, {
        showFilenames,
        pageSize,
      });
      
      console.log(`PDF generated at: ${pdfPath}`);
      
      // Send the PDF file as response
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="converted_${Date.now()}.pdf"`
      );
      
      console.log("Sending PDF to client...");
      const pdfStream = fs.createReadStream(pdfPath);
      pdfStream.pipe(res);
      
      // Clean up the PDF file after sending (delayed to ensure complete transfer)
      pdfStream.on("end", () => {
        console.log("PDF sent successfully, cleaning up...");
        // Wait a moment before deleting the file
        setTimeout(() => {
          fileService.cleanupTempFiles(pdfPath);
        }, 1000);
      });
    } catch (error) {
      console.error("Error converting files to PDF:", error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to convert files to PDF",
      });
    }
  },
};
