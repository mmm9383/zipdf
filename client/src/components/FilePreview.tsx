import { useState, useEffect } from "react";
import { X, ImageIcon, Folder, Archive, Image, File, Loader2, ArrowUpCircle, ArrowDownCircle, Trash2, MoveDown, MoveUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import JSZip from "jszip";

interface FilePreviewProps {
  files: File[];
  onRemoveFile: (index: number) => void;
  onClearAll: () => void;
}

// Define a type for ZIP content
interface ZipImage {
  name: string;
  url: string;
  size: number;
  id: string; // Unique identifier for each image
}

interface ZipContent {
  zipFile: File;
  images: ZipImage[];
  loading: boolean;
  error: string | null;
  modified: boolean; // Track if the ZIP contents have been modified
}

export default function FilePreview({
  files,
  onRemoveFile,
  onClearAll,
}: FilePreviewProps) {
  // State to hold extracted ZIP contents
  const [zipContents, setZipContents] = useState<Record<string, ZipContent>>({});
  // State to track which ZIP file is expanded
  const [expandedZip, setExpandedZip] = useState<string | null>(null);
  
  // Function to delete a specific image from a ZIP file
  const deleteImageFromZip = (zipFileName: string, imageId: string) => {
    setZipContents(prev => {
      if (!prev[zipFileName]) return prev;
      
      // Filter out the image with the matching ID
      const updatedImages = prev[zipFileName].images.filter(img => img.id !== imageId);
      
      return {
        ...prev,
        [zipFileName]: {
          ...prev[zipFileName],
          images: updatedImages,
          modified: true
        }
      };
    });
  };
  
  // Function to move an image up in the order (towards the beginning of the array)
  const moveImageUp = (zipFileName: string, imageId: string) => {
    setZipContents(prev => {
      if (!prev[zipFileName]) return prev;
      
      const images = [...prev[zipFileName].images];
      const imageIndex = images.findIndex(img => img.id === imageId);
      
      // Can't move up if it's already at the top
      if (imageIndex <= 0) return prev;
      
      // Swap with previous image
      const temp = images[imageIndex];
      images[imageIndex] = images[imageIndex - 1];
      images[imageIndex - 1] = temp;
      
      return {
        ...prev,
        [zipFileName]: {
          ...prev[zipFileName],
          images,
          modified: true
        }
      };
    });
  };
  
  // Function to move an image down in the order (towards the end of the array)
  const moveImageDown = (zipFileName: string, imageId: string) => {
    setZipContents(prev => {
      if (!prev[zipFileName]) return prev;
      
      const images = [...prev[zipFileName].images];
      const imageIndex = images.findIndex(img => img.id === imageId);
      
      // Can't move down if it's already at the bottom
      if (imageIndex >= images.length - 1 || imageIndex === -1) return prev;
      
      // Swap with next image
      const temp = images[imageIndex];
      images[imageIndex] = images[imageIndex + 1];
      images[imageIndex + 1] = temp;
      
      return {
        ...prev,
        [zipFileName]: {
          ...prev[zipFileName],
          images,
          modified: true
        }
      };
    });
  };
  
  // Function to check if a file is a ZIP file
  const isZipFile = (file: File): boolean => {
    // Check by extension first (most reliable)
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.zip')) {
      return true;
    }
    
    // Then check by MIME type
    const fileType = file.type.toLowerCase();
    return fileType === "application/zip" || 
           fileType === "application/x-zip-compressed" || 
           fileType === "application/octet-stream" ||
           fileType === "application/x-compressed" ||
           fileType === "multipart/x-zip";
  };
  
  // Count images and ZIP files with improved detection
  const imageCount = files.filter(file => file.type.startsWith("image/")).length;
  const zipCount = files.filter(file => isZipFile(file)).length;
  
  // Extract images from ZIP files
  useEffect(() => {
    // Process each ZIP file
    const zipFiles = files.filter(file => isZipFile(file));
    
    zipFiles.forEach(async (zipFile) => {
      // Skip if we've already processed this file
      if (zipContents[zipFile.name] && !zipContents[zipFile.name].loading) {
        return;
      }
      
      // Set initial loading state
      setZipContents(prev => ({
        ...prev,
        [zipFile.name]: {
          zipFile,
          images: [],
          loading: true, 
          error: null,
          modified: false
        }
      }));
      
      try {
        // Read the ZIP file
        const zip = new JSZip();
        const zipData = await zip.loadAsync(zipFile);
        
        // Find image files in the ZIP
        const imagePromises: Promise<ZipImage | null>[] = [];
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff'];
        
        zipData.forEach((relativePath, zipEntry) => {
          // Skip directories
          if (zipEntry.dir) return;
          
          // Check if it's an image by extension
          const isImage = imageExtensions.some(ext => 
            relativePath.toLowerCase().endsWith(ext)
          );
          
          if (isImage) {
            const promise = zipEntry.async('blob').then(blob => {
              // Create a URL for the blob
              const url = URL.createObjectURL(blob);
              // Generate a unique ID for the image
              const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
              return {
                name: relativePath,
                url,
                size: blob.size,
                id
              };
            }).catch(err => {
              console.error(`Error extracting ${relativePath}:`, err);
              return null;
            });
            
            imagePromises.push(promise);
          }
        });
        
        // Wait for all images to be processed
        const images = (await Promise.all(imagePromises)).filter(Boolean) as ZipImage[];
        
        // Update state with extracted images
        setZipContents(prev => ({
          ...prev,
          [zipFile.name]: {
            zipFile,
            images,
            loading: false,
            error: null,
            modified: false
          }
        }));
      } catch (error) {
        console.error(`Error processing ZIP file ${zipFile.name}:`, error);
        setZipContents(prev => ({
          ...prev,
          [zipFile.name]: {
            zipFile,
            images: [],
            loading: false,
            error: `Failed to extract ZIP: ${error instanceof Error ? error.message : 'Unknown error'}`,
            modified: false
          }
        }));
      }
    });
    
    // Cleanup function to revoke object URLs when component unmounts
    return () => {
      Object.values(zipContents).forEach(content => {
        content.images.forEach(image => {
          URL.revokeObjectURL(image.url);
        });
      });
    };
  }, [files]);

  if (files.length === 0) {
    return (
      <div className="py-12 text-center">
        <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-500">No files uploaded yet</p>
      </div>
    );
  }

  // Store the zipContents data as a JSON string in a hidden element
  // This allows the parent component to access it when needed
  const zipContentsJSON = JSON.stringify(zipContents);

  return (
    <>
      {/* Hidden element to store ZIP contents data */}
      <div id="zip-contents-data" data-contents={zipContentsJSON} style={{ display: 'none' }}></div>
      
      {/* File type counts */}
      <div className="flex gap-2 mb-3">
        {imageCount > 0 && (
          <Badge variant="outline" className="flex items-center gap-1 px-3 py-1 bg-blue-50">
            <Image className="h-3.5 w-3.5" />
            <span>{imageCount} image{imageCount !== 1 ? 's' : ''}</span>
          </Badge>
        )}
        {zipCount > 0 && (
          <Badge variant="outline" className="flex items-center gap-1 px-3 py-1 bg-green-50">
            <Archive className="h-3.5 w-3.5" />
            <span>{zipCount} ZIP file{zipCount !== 1 ? 's' : ''}</span>
          </Badge>
        )}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-4 max-h-80 overflow-y-auto pr-1">
        {files.map((file, index) => {
          const isImage = file.type.startsWith("image/");
          
          // Improved ZIP file detection that matches our other components
          const isZip = (() => {
            // Check by extension first (most reliable)
            const fileName = file.name.toLowerCase();
            if (fileName.endsWith('.zip')) {
              return true;
            }
            
            // Then check by MIME type
            const fileType = file.type.toLowerCase();
            return fileType === "application/zip" || 
                   fileType === "application/x-zip-compressed" || 
                   fileType === "application/octet-stream" ||
                   fileType === "application/x-compressed" ||
                   fileType === "multipart/x-zip";
          })();
          
          const isExpanded = expandedZip === file.name;
          const zipHasImages = zipContents[file.name]?.images?.length > 0;
          
          // Toggle function for expandable ZIP preview
          const toggleExpand = () => {
            if (isZip && zipHasImages) {
              if (isExpanded) {
                setExpandedZip(null);
              } else {
                setExpandedZip(file.name);
              }
            }
          };
          
          return (
            <div key={`${file.name}-${index}`} className={`relative group ${isExpanded ? 'col-span-2' : ''}`}>
              <div 
                className={`relative bg-gray-100 rounded border overflow-hidden ${
                  isImage ? 'border-blue-200' : isZip ? 'border-green-200' : 'border-gray-200'
                } ${isZip && zipHasImages ? 'cursor-pointer' : ''}`}
                onClick={toggleExpand}
              >
                <AspectRatio ratio={isExpanded ? 16/9 : 4/3}>
                  {isImage ? (
                    <img
                      src={URL.createObjectURL(file)}
                      className="object-cover w-full h-full"
                      alt={file.name}
                      onLoad={() => URL.revokeObjectURL(file.name)}
                    />
                  ) : isZip ? (
                    <div className="w-full h-full flex items-center justify-center bg-green-50">
                      {zipContents[file.name]?.loading ? (
                        // Loading state
                        <div className="text-center p-4">
                          <Loader2 className="mx-auto h-10 w-10 text-green-500 animate-spin" />
                          <p className="mt-1 text-xs text-green-700 font-medium">Extracting ZIP...</p>
                        </div>
                      ) : zipContents[file.name]?.error ? (
                        // Error state
                        <div className="text-center p-4">
                          <Archive className="mx-auto h-10 w-10 text-red-500" />
                          <p className="mt-1 text-xs text-red-700 font-medium">Error extracting ZIP</p>
                        </div>
                      ) : zipContents[file.name]?.images?.length > 0 ? (
                        isExpanded ? (
                          // Expanded view with multiple images
                          <div className="w-full h-full p-2 overflow-auto bg-green-50">
                            {zipContents[file.name]?.modified && (
                              <div className="mb-2 p-2 bg-amber-50 rounded border border-amber-200 text-xs text-amber-800">
                                <strong>Note:</strong> Images have been modified. The file order will be used when converting to PDF.
                              </div>
                            )}
                            <div className="grid grid-cols-3 gap-2">
                              {zipContents[file.name].images.map((image, imgIndex) => (
                                <div key={image.id} className="relative bg-white rounded overflow-hidden border border-green-100">
                                  <div className="relative pb-[75%]">
                                    <img
                                      src={image.url}
                                      className="absolute inset-0 w-full h-full object-cover"
                                      alt={image.name}
                                    />
                                    
                                    {/* Image controls */}
                                    <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-opacity flex items-center justify-center opacity-0 hover:opacity-100">
                                      <div className="flex space-x-1">
                                        {imgIndex > 0 && (
                                          <button 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              moveImageUp(file.name, image.id);
                                            }}
                                            className="bg-white rounded-full p-1.5 text-green-600 hover:text-green-900"
                                            title="Move up"
                                          >
                                            <MoveUp className="h-4 w-4" />
                                          </button>
                                        )}
                                        
                                        {imgIndex < zipContents[file.name].images.length - 1 && (
                                          <button 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              moveImageDown(file.name, image.id);
                                            }}
                                            className="bg-white rounded-full p-1.5 text-green-600 hover:text-green-900"
                                            title="Move down"
                                          >
                                            <MoveDown className="h-4 w-4" />
                                          </button>
                                        )}
                                        
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            deleteImageFromZip(file.name, image.id);
                                          }}
                                          className="bg-white rounded-full p-1.5 text-red-600 hover:text-red-900"
                                          title="Delete image"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </div>
                                    
                                    {/* Image position indicator */}
                                    <div className="absolute top-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1.5 py-0.5 rounded-full">
                                      {imgIndex + 1}
                                    </div>
                                  </div>
                                  <div className="p-1 text-xs truncate text-center bg-green-50">
                                    {image.name.split('/').pop()}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          // Collapsed view showing first image
                          <div className="w-full h-full flex items-center justify-center overflow-hidden">
                            <img
                              src={zipContents[file.name].images[0].url}
                              className="object-cover w-full h-full"
                              alt={zipContents[file.name].images[0].name}
                            />
                            <div className="absolute bottom-1 right-1 bg-green-100 text-green-800 text-xs rounded-full px-2 py-1 font-medium">
                              {zipContents[file.name].images.length} images
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="bg-white rounded-full p-2">
                                <Folder className="h-6 w-6 text-green-600" />
                              </div>
                            </div>
                          </div>
                        )
                      ) : (
                        // Empty ZIP file
                        <div className="text-center p-4">
                          <Archive className="mx-auto h-10 w-10 text-green-500" />
                          <p className="mt-1 text-xs text-green-700 font-medium">ZIP Archive</p>
                          {zipContents[file.name] && <p className="text-xs text-gray-500 mt-1">No images found</p>}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <div className="text-center p-4">
                        <File className="mx-auto h-10 w-10 text-gray-400" />
                        <p className="mt-1 text-xs text-gray-500">Unknown file</p>
                      </div>
                    </div>
                  )}
                </AspectRatio>
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent triggering the parent's click event
                    onRemoveFile(index);
                  }}
                  className="absolute top-1 right-1 bg-white rounded-full p-1 shadow text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
                
                {isExpanded && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedZip(null);
                    }}
                    className="absolute top-1 left-1 bg-white rounded-full p-1 shadow text-green-500"
                    aria-label="Collapse"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="mt-1 text-xs text-gray-600 truncate flex items-center" title={file.name}>
                <span className="truncate">{file.name}</span>
                {isZip && zipHasImages && !isExpanded && (
                  <span className="ml-1 text-green-600 whitespace-nowrap">(click to view images)</span>
                )}
                {isZip && zipContents[file.name]?.modified && (
                  <Badge variant="outline" className="ml-1 px-1 py-0 text-[10px] bg-amber-50 text-amber-800 border-amber-200">
                    modified
                  </Badge>
                )}
              </div>
              <div className="text-xs text-gray-400 flex items-center">
                <span>{(file.size / 1024).toFixed(1)} KB</span>
                {isZip && zipHasImages && (
                  <span className="ml-1">• {zipContents[file.name].images.length} images</span>
                )}
                {isZip && zipContents[file.name]?.modified && (
                  <span className="ml-1 text-amber-600">• Images rearranged</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <div className="flex justify-between items-center">
          <span>{files.length} file{files.length !== 1 ? 's' : ''} selected</span>
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 hover:text-red-900 text-sm"
            onClick={onClearAll}
          >
            <X className="h-4 w-4 mr-1" />
            Clear all
          </Button>
        </div>
      </div>
    </>
  );
}
