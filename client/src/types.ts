export interface ConversionOptions {
  showFilenames: boolean;
  imageQuality: string;
  pageSize: string;
}

export interface ConversionResult {
  success: boolean;
  message: string;
  pdfUrl?: string;
}
