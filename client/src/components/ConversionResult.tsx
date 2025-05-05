import { Download, RotateCcw, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConversionResultProps {
  pdfUrl: string | null;
  fileName: string;
  onNewConversion: () => void;
}

export default function ConversionResult({
  pdfUrl,
  fileName,
  onNewConversion,
}: ConversionResultProps) {
  if (!pdfUrl) return null;

  return (
    <div className="mt-8 border-t border-gray-200 pt-6">
      <h2 className="text-lg font-medium text-gray-900 mb-2">Conversion Complete</h2>

      <div className="bg-green-50 border border-green-200 rounded-md p-4 mt-2">
        <div className="flex">
          <div className="flex-shrink-0">
            <CheckCircle className="h-5 w-5 text-green-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-green-800">
              Your PDF has been created successfully!
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <a
          href={pdfUrl}
          download={fileName}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Download className="-ml-1 mr-2 h-5 w-5" />
          Download PDF
        </a>

        <Button
          variant="outline"
          className="ml-3"
          onClick={onNewConversion}
        >
          <RotateCcw className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
          New Conversion
        </Button>
      </div>
    </div>
  );
}
