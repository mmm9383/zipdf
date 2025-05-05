import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";

interface Image {
  buffer: Buffer;
  filename: string;
  width: number;
  height: number;
}

interface PDFOptions {
  showFilenames: boolean;
  pageSize: string;
}

export const pdfService = {
  /**
   * Generate a PDF from processed images
   */
  async generatePDF(
    images: Image[],
    options: PDFOptions
  ): Promise<string> {
    // Create output directory if it doesn't exist
    const outputDir = path.join(process.cwd(), "tmp", "output");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Create a unique filename for the PDF
    const timestamp = new Date().getTime();
    const outputFilename = `converted_${timestamp}.pdf`;
    const outputPath = path.join(outputDir, outputFilename);
    
    // Create a write stream for the PDF file
    const pdfStream = fs.createWriteStream(outputPath);
    
    // Create a new PDF document with the specified page size
    const doc = new PDFDocument({
      size: options.pageSize,
      autoFirstPage: false,
      margin: 50,
      info: {
        Title: "Converted Images",
        Author: "Image to PDF Converter",
        CreationDate: new Date(),
      },
    });
    
    // Pipe the PDF to the write stream
    doc.pipe(pdfStream);
    
    // Add each image to the PDF
    for (const [index, image] of images.entries()) {
      // Add a new page for each image
      doc.addPage();
      
      // Calculate dimensions to fit the image on the page
      const maxWidth = doc.page.width - 100; // 50px margin on each side
      const maxHeight = doc.page.height - 150; // 50px margin on top and bottom, plus space for filename
      
      let imgWidth = image.width;
      let imgHeight = image.height;
      
      // Scale down the image if it's too large
      if (imgWidth > maxWidth || imgHeight > maxHeight) {
        const widthRatio = maxWidth / imgWidth;
        const heightRatio = maxHeight / imgHeight;
        const ratio = Math.min(widthRatio, heightRatio);
        
        imgWidth = imgWidth * ratio;
        imgHeight = imgHeight * ratio;
      }
      
      // Calculate position to center the image on the page
      const x = (doc.page.width - imgWidth) / 2;
      const y = (doc.page.height - imgHeight - (options.showFilenames ? 30 : 0)) / 2;
      
      // Add the image to the PDF
      doc.image(image.buffer, x, y, {
        width: imgWidth,
        height: imgHeight,
      });
      
      // Add the filename as a caption if requested
      if (options.showFilenames) {
        doc.font("Helvetica")
          .fontSize(12)
          .fillColor("#333333")
          .text(image.filename, {
            width: doc.page.width - 100,
            align: "center",
            y: y + imgHeight + 10,
          });
      }
      
      // Add page number
      doc.font("Helvetica")
        .fontSize(10)
        .fillColor("#999999")
        .text(`Page ${index + 1} of ${images.length}`, {
          align: "center",
          y: doc.page.height - 30,
        });
    }
    
    // Finalize and close the PDF
    doc.end();
    
    // Wait for the PDF to be written to disk
    return new Promise<string>((resolve, reject) => {
      pdfStream.on("finish", () => {
        resolve(outputPath);
      });
      
      pdfStream.on("error", (error) => {
        reject(error);
      });
    });
  },
};
