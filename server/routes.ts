import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { converterController } from "./controllers/converterController";
import { uploadMiddleware } from "./middleware/upload";
import path from "path";
import fs from "fs";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create temporary upload directory if it doesn't exist
  const uploadDir = path.join(process.cwd(), "tmp", "uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Create temporary output directory if it doesn't exist
  const outputDir = path.join(process.cwd(), "tmp", "output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Image to PDF converter routes
  app.post("/api/convert", (req, res, next) => {
    console.log("Received conversion request");
    uploadMiddleware.array("files", 10)(req, res, (err) => {
      if (err) {
        console.error("File upload middleware error:", err);
        return res.status(400).json({
          success: false,
          message: err.message || "Error uploading files",
        });
      }
      next();
    });
  }, converterController.convertToPdf);
  
  // Health check route
  app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "ok" });
  });

  const httpServer = createServer(app);

  return httpServer;
}
