import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { Cloud, AlertTriangle, File, Archive } from "lucide-react";

interface FileUploadProps {
  onFilesAdded: (files: File[]) => void;
  hasError: boolean;
  errorMessage: string;
  acceptTypes: string;  // e.g. "image/*" or ".zip"
  uploadType: "images" | "zip";
}

export default function FileUpload({
  onFilesAdded,
  hasError,
  errorMessage,
  acceptTypes,
  uploadType,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      processFiles(selectedFiles);
    }
  };

  const processFiles = (files: File[]) => {
    // Filter for valid file types based on uploadType
    let validFiles: File[] = [];
    
    if (uploadType === "images") {
      validFiles = files.filter(file => {
        const fileType = file.type;
        // Check image files by type
        return fileType.startsWith('image/jpeg') || 
               fileType.startsWith('image/png') || 
               fileType.startsWith('image/gif') || 
               fileType.startsWith('image/bmp') || 
               fileType.startsWith('image/tiff');
      });
    } else if (uploadType === "zip") {
      // For ZIP files, we primarily check by file extension
      validFiles = files.filter(file => {
        const fileName = file.name.toLowerCase();
        
        // Always check the file extension first for ZIP files (most reliable)
        if (fileName.endsWith('.zip')) {
          console.log(`ZIP file accepted by extension: ${file.name}`);
          return true;
        }
        
        // As fallback, also check MIME types
        const fileType = file.type.toLowerCase();
        const isZipMimeType = fileType === 'application/zip' || 
                             fileType === 'application/x-zip-compressed' || 
                             fileType === 'application/octet-stream' ||
                             fileType === 'application/x-compressed' ||
                             fileType === 'multipart/x-zip';
                             
        if (isZipMimeType) {
          console.log(`ZIP file accepted by MIME type: ${file.name}, type: ${fileType}`);
          return true;
        }
                             
        console.log(`File rejected: ${file.name}, type: ${fileType}`);
        return false;
      });
    }

    console.log(`Processed ${files.length} files, ${validFiles.length} are valid`);
    
    if (validFiles.length > 0) {
      // Log details of all valid files
      validFiles.forEach((file, index) => {
        console.log(`Valid file ${index + 1}: ${file.name}, Type: ${file.type}, Size: ${file.size} bytes`);
      });
      
      onFilesAdded(validFiles);
    } else {
      console.log('No valid files found');
    }
  };

  const openFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div>
      <div
        onClick={openFileDialog}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed ${
          isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
        } rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer`}
      >
        {uploadType === "images" ? (
          <File className="mx-auto h-10 w-10 text-gray-400" />
        ) : (
          <Archive className="mx-auto h-10 w-10 text-gray-400" />
        )}
        
        <p className="mt-2 text-sm text-gray-600">
          Drag and drop {uploadType === "images" ? "image files" : "a ZIP file"} here, or click to browse
        </p>
        <p className="mt-1 text-xs text-gray-500">
          {uploadType === "images" ? "Supports JPEG, PNG, GIF, BMP, TIFF" : "Supports ZIP files containing images"}
        </p>

        <input
          type="file"
          id={`fileInput-${uploadType}`}
          ref={fileInputRef}
          className="hidden"
          multiple={uploadType === "images"}
          accept={acceptTypes}
          onChange={handleFileInputChange}
        />
      </div>

      {hasError && (
        <div className="mt-2 text-sm text-red-600 flex items-center">
          <AlertTriangle className="h-4 w-4 mr-1" />
          {errorMessage}
        </div>
      )}
    </div>
  );
}
