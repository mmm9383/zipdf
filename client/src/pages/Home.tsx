import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FileUpload from "@/components/FileUpload";
import ConversionOptions from "@/components/ConversionOptions";
import FilePreview from "@/components/FilePreview";
import ConversionResult from "@/components/ConversionResult";
import { ConversionOptions as ConversionOptionsType } from "@/types";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import JSZip from "jszip";

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState({ hasError: false, message: "" });
  const [isConverting, setIsConverting] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState("converted.pdf");
  const { toast } = useToast();
  
  const [options, setOptions] = useState<ConversionOptionsType>({
    showFilenames: true,
    imageQuality: "medium",
    pageSize: "a4",
  });

  const handleFilesAdded = (newFiles: File[]) => {
    // More comprehensive check for ZIP files
    const validFiles = newFiles.filter((file) => {
      // Check by extension first (most reliable for ZIP files)
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.zip')) {
        console.log(`Home component: ZIP file accepted by extension: ${file.name}`);
        return true;
      }
      
      // Check by MIME type for ZIP files
      const fileType = file.type.toLowerCase();
      const isZip = fileType === 'application/zip' || 
                   fileType === 'application/x-zip-compressed' || 
                   fileType === 'application/octet-stream' ||
                   fileType === 'application/x-compressed' ||
                   fileType === 'multipart/x-zip';
      
      // Check for image files
      const isImage = fileType.startsWith("image/");
      
      if (isZip) {
        console.log(`Home component: ZIP file accepted by MIME type: ${file.name}, type: ${fileType}`);
      }
      
      return isZip || isImage;
    });

    if (validFiles.length === 0) {
      setFileError({
        hasError: true,
        message: "Please upload valid image files or a ZIP containing images.",
      });
      return;
    }

    console.log(`Home component: Added ${validFiles.length} files to the list`);
    setFileError({ hasError: false, message: "" });
    setFiles([...files, ...validFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleClearAll = () => {
    setFiles([]);
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
  };

  const handleConvert = async () => {
    if (files.length === 0) return;

    setIsConverting(true);
    setPdfUrl(null);

    try {
      const formData = new FormData();
      
      // Get the ZIP contents from FilePreview component
      // We'll use this to get information about modified zip files
      const zipContentsElement = document.getElementById('zip-contents-data');
      const zipContents = zipContentsElement ? JSON.parse(zipContentsElement.getAttribute('data-contents') || '{}') : {};
      
      // Add files to formData, replacing modified ZIP files with updated versions
      for (const file of files) {
        const fileName = file.name;
        const isZip = fileName.toLowerCase().endsWith('.zip') || 
                      file.type === 'application/zip' || 
                      file.type === 'application/x-zip-compressed';
        
        // Check if this is a modified ZIP file
        if (isZip && zipContents[fileName]?.modified && zipContents[fileName]?.images) {
          console.log(`Creating modified ZIP file for ${fileName}`);
          
          try {
            // Create a new ZIP file with only the remaining images
            const zip = new JSZip();
            let imageCount = 0;
            
            // Add each image to the new ZIP
            for (const image of zipContents[fileName].images) {
              try {
                // Fetch the image data from the object URL
                const response = await fetch(image.url);
                const blob = await response.blob();
                
                // Add to ZIP with the original filename
                zip.file(image.name, blob);
                imageCount++;
              } catch (error) {
                console.error(`Error adding image ${image.name} to ZIP:`, error);
              }
            }
            
            if (imageCount === 0) {
              console.warn(`No images to add to modified ZIP ${fileName}`);
              continue; // Skip this file entirely
            }
            
            // Generate the new ZIP file
            const modifiedZipBlob = await zip.generateAsync({ type: 'blob' });
            
            // Create a new File object with the modified ZIP content
            const modifiedZipFile = new File(
              [modifiedZipBlob], 
              fileName, 
              { type: file.type }
            );
            
            // Add the modified ZIP to formData instead of the original
            formData.append("files", modifiedZipFile);
            console.log(`Added modified ZIP with ${imageCount} images to form data`);
          } catch (error) {
            console.error(`Error creating modified ZIP for ${fileName}:`, error);
            // If there's an error, use the original file as fallback
            formData.append("files", file);
          }
        } else {
          // Use original file for non-ZIP files or unmodified ZIP files
          formData.append("files", file);
        }
      }
      
      // Add options to formData
      formData.append("showFilenames", options.showFilenames.toString());
      formData.append("imageQuality", options.imageQuality);
      formData.append("pageSize", options.pageSize);

      const response = await fetch("/api/convert", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to convert files");
      }

      // Get the PDF file from the response
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      // Generate a filename based on current date
      const fileName = `converted_${new Date().toISOString().slice(0, 10)}.pdf`;
      
      setPdfUrl(url);
      setPdfFileName(fileName);

      toast({
        title: "Success!",
        description: "Your PDF has been created successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Conversion failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
      });
      console.error("Conversion error:", error);
    } finally {
      setIsConverting(false);
    }
  };

  const handleNewConversion = () => {
    setFiles([]);
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="md:flex">
              {/* Left section: File upload tabs and conversion options */}
              <div className="md:w-1/2 p-6 border-b md:border-b-0 md:border-r border-gray-200">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Upload Images</h2>
                
                <Tabs defaultValue="images" className="mb-8">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="images">Individual Images</TabsTrigger>
                    <TabsTrigger value="zip">ZIP Archives</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="images">
                    <div className="p-4 bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-600 mb-4">
                        Upload individual image files (JPEG, PNG, GIF, etc.)
                      </p>
                      <FileUpload
                        onFilesAdded={handleFilesAdded}
                        hasError={fileError.hasError}
                        errorMessage={fileError.message}
                        acceptTypes="image/*"
                        uploadType="images"
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="zip">
                    <div className="p-4 bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-600 mb-4">
                        Upload a ZIP archive containing multiple images
                      </p>
                      <FileUpload
                        onFilesAdded={handleFilesAdded}
                        hasError={fileError.hasError}
                        errorMessage={fileError.message}
                        acceptTypes=".zip"
                        uploadType="zip"
                      />
                    </div>
                  </TabsContent>
                </Tabs>
                
                <ConversionOptions
                  options={options}
                  setOptions={setOptions}
                  onConvert={handleConvert}
                  isConverting={isConverting}
                  hasFiles={files.length > 0}
                />
              </div>
              
              {/* Right section: File preview and results */}
              <div className="md:w-1/2 p-6 bg-gray-50">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Uploaded Files</h2>
                
                <FilePreview
                  files={files}
                  onRemoveFile={handleRemoveFile}
                  onClearAll={handleClearAll}
                />
                
                <ConversionResult
                  pdfUrl={pdfUrl}
                  fileName={pdfFileName}
                  onNewConversion={handleNewConversion}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
