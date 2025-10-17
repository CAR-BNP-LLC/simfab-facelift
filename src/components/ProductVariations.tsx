import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface VariationOption {
  id: string;
  name: string;
  price?: number;
  image?: string;
}

interface TextVariation {
  id: string;
  name: string;
  description?: string;
  isRequired: boolean;
}

interface DropdownVariation {
  id: string;
  name: string;
  description?: string;
  isRequired: boolean;
  options: VariationOption[];
}

interface ImageVariation {
  id: string;
  name: string;
  description?: string;
  isRequired: boolean;
  options: VariationOption[];
}

interface BooleanVariation {
  id: string;
  name: string;
  description?: string;
  isRequired: boolean;
  yesPrice?: number;
}

interface ProductVariationsProps {
  textVariations?: TextVariation[];
  dropdownVariations?: DropdownVariation[];
  imageVariations?: ImageVariation[];
  booleanVariations?: BooleanVariation[];
  selectedTextValues?: Record<string, string>;
  selectedDropdownValues?: Record<string, string>;
  selectedImageValues?: Record<string, string>;
  selectedBooleanValues?: Record<string, boolean>;
  onTextChange?: (variationId: string, value: string) => void;
  onDropdownChange?: (variationId: string, optionId: string) => void;
  onImageChange?: (variationId: string, optionId: string) => void;
  onBooleanChange?: (variationId: string, value: boolean) => void;
}

const ProductVariations = ({
  textVariations = [],
  dropdownVariations = [],
  imageVariations = [],
  booleanVariations = [],
  selectedTextValues = {},
  selectedDropdownValues = {},
  selectedImageValues = {},
  selectedBooleanValues = {},
  onTextChange,
  onDropdownChange,
  onImageChange,
  onBooleanChange
}: ProductVariationsProps) => {
  return (
    <div className="space-y-4">
      {/* Text Variations */}
      {textVariations.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-primary">Text Input Options</h3>
          {textVariations.map((variation) => (
            <div key={variation.id} className="space-y-2">
              <Label className="text-lg font-medium">
                {variation.name}
                {variation.isRequired && <span className="text-primary ml-1">*</span>}
              </Label>
              {variation.description && (
                <p className="text-sm text-muted-foreground">{variation.description}</p>
              )}
              <Input
                placeholder={`Enter ${variation.name.toLowerCase()}...`}
                value={selectedTextValues[variation.id] || ''}
                onChange={(e) => onTextChange?.(variation.id, e.target.value)}
                required={variation.isRequired}
              />
            </div>
          ))}
        </div>
      )}

      {/* Dropdown Variations */}
      {dropdownVariations.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-primary">Selection Options</h3>
          {dropdownVariations.map((variation) => (
            <div key={variation.id} className="space-y-2">
              <Label className="text-lg font-medium">
                {variation.name}
                {variation.isRequired && <span className="text-primary ml-1">*</span>}
              </Label>
              {variation.description && (
                <p className="text-sm text-muted-foreground">{variation.description}</p>
              )}
              <Select 
                value={selectedDropdownValues[variation.id] || ""} 
                onValueChange={(value) => onDropdownChange?.(variation.id, value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {variation.options.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{option.name}</span>
                        {option.price && option.price !== 0 && (
                          <span className="ml-2 font-bold">
                            {option.price > 0 ? '+' : ''}${option.price.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}

      {/* Image Variations */}
      {imageVariations.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-primary">Visual Options</h3>
          {imageVariations.map((variation) => (
            <div key={variation.id} className="space-y-3">
              <Label className="text-lg font-medium">
                {variation.name}
                {variation.isRequired && <span className="text-primary ml-1">*</span>}
              </Label>
              {variation.description && (
                <p className="text-sm text-muted-foreground">{variation.description}</p>
              )}
              <div className="grid grid-cols-2 gap-3">
                {variation.options.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => onImageChange?.(variation.id, option.id)}
                    className={`relative p-2 rounded-lg border-2 transition-colors text-left ${
                      selectedImageValues[variation.id] === option.id
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-muted-foreground'
                    }`}
                  >
                    <div className="aspect-square rounded-lg overflow-hidden mb-1">
                      <img 
                        src={option.image || '/api/placeholder/80/80'} 
                        alt={option.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-center">
                      <span className="text-xs font-medium">{option.name}</span>
                      {option.price && option.price !== 0 && (
                        <p className="text-xs text-muted-foreground">
                          {option.price > 0 ? '+' : ''}${option.price.toFixed(2)}
                        </p>
                      )}
                    </div>
                    {selectedImageValues[variation.id] === option.id && (
                      <div className="absolute top-2 right-2 w-4 h-4 bg-primary rounded-full"></div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Boolean Variations */}
      {booleanVariations.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-primary">Yes/No Options</h3>
          {booleanVariations.map((variation) => (
            <div key={variation.id} className="space-y-3">
              <Label className="text-lg font-medium">
                {variation.name}
                {variation.isRequired && <span className="text-primary ml-1">*</span>}
                {variation.yesPrice && variation.yesPrice > 0 && (
                  <span className="text-primary ml-2 font-normal">
                    (+${variation.yesPrice.toFixed(2)})
                  </span>
                )}
              </Label>
              {variation.description && (
                <p className="text-sm text-muted-foreground">{variation.description}</p>
              )}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={selectedBooleanValues[variation.id] || false}
                    onCheckedChange={(checked) => onBooleanChange?.(variation.id, checked)}
                  />
                  <Label className="text-base">
                    {selectedBooleanValues[variation.id] ? 'Yes' : 'No'}
                  </Label>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductVariations;