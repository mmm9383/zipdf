import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConversionOptions as ConversionOptionsType } from "@/types";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConversionOptionsProps {
  options: ConversionOptionsType;
  setOptions: (options: ConversionOptionsType) => void;
  onConvert: () => void;
  isConverting: boolean;
  hasFiles: boolean;
}

export default function ConversionOptions({
  options,
  setOptions,
  onConvert,
  isConverting,
  hasFiles,
}: ConversionOptionsProps) {
  return (
    <div>
      <h2 className="text-lg font-medium text-gray-900 mb-2">Conversion Options</h2>

      <div className="mt-4 space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="showFilenames"
            checked={options.showFilenames}
            onCheckedChange={(checked) =>
              setOptions({ ...options, showFilenames: checked === true })
            }
          />
          <Label htmlFor="showFilenames" className="text-sm text-gray-700">
            Show filenames under images
          </Label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="imageQuality" className="text-sm font-medium text-gray-700">
            Image Quality
          </Label>
          <Select
            value={options.imageQuality}
            onValueChange={(value) =>
              setOptions({ ...options, imageQuality: value })
            }
          >
            <SelectTrigger id="imageQuality" className="w-full">
              <SelectValue placeholder="Select quality" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="pageSize" className="text-sm font-medium text-gray-700">
            Page Size
          </Label>
          <Select
            value={options.pageSize}
            onValueChange={(value) =>
              setOptions({ ...options, pageSize: value })
            }
          >
            <SelectTrigger id="pageSize" className="w-full">
              <SelectValue placeholder="Select page size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="a4">A4</SelectItem>
              <SelectItem value="letter">Letter</SelectItem>
              <SelectItem value="legal">Legal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-6">
        <Button
          className="w-full"
          disabled={!hasFiles || isConverting}
          onClick={onConvert}
          variant={hasFiles && !isConverting ? "default" : "secondary"}
        >
          {isConverting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Convert to PDF
        </Button>
      </div>
    </div>
  );
}
