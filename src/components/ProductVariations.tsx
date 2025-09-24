import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ModelVariation {
  id: string;
  name: string;
  image: string;
  description?: string;
}

interface DropdownVariation {
  id: string;
  name: string;
  options: {
    id: string;
    name: string;
    price?: number;
    image?: string;
  }[];
}

interface ProductVariationsProps {
  modelVariations?: ModelVariation[];
  dropdownVariations?: DropdownVariation[];
  selectedModelVariation?: string;
  selectedDropdownVariations?: Record<string, string>;
  onModelVariationChange?: (variationId: string) => void;
  onDropdownVariationChange?: (variationId: string, optionId: string) => void;
}

const ProductVariations = ({
  modelVariations = [],
  dropdownVariations = [],
  selectedModelVariation,
  selectedDropdownVariations = {},
  onModelVariationChange,
  onDropdownVariationChange
}: ProductVariationsProps) => {
  return (
    <div className="space-y-6">
      {/* Model Variations */}
      {modelVariations.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-primary">Base Cockpit Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {modelVariations.map((variation) => (
              <button
                key={variation.id}
                onClick={() => onModelVariationChange?.(variation.id)}
                className={`relative p-4 rounded-lg border-2 transition-colors text-left ${
                  selectedModelVariation === variation.id 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-muted-foreground'
                }`}
              >
                <div className="aspect-video rounded-lg overflow-hidden mb-3">
                  <img 
                    src={variation.image} 
                    alt={variation.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h4 className="font-semibold">{variation.name}</h4>
                {variation.description && (
                  <p className="text-sm text-muted-foreground mt-1">{variation.description}</p>
                )}
                {selectedModelVariation === variation.id && (
                  <div className="absolute top-2 right-2 w-4 h-4 bg-primary rounded-full"></div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Dropdown Variations */}
      {dropdownVariations.length > 0 && (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Please, answer the questions below for configuring your Trainer Station Cockpit
          </p>
          {dropdownVariations.map((variation) => (
            <div key={variation.id} className="space-y-2">
              <label className="text-lg font-medium">
                {variation.name} <span className="text-primary">*</span>
              </label>
              <Select 
                value={selectedDropdownVariations[variation.id] || ""} 
                onValueChange={(value) => onDropdownVariationChange?.(variation.id, value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {variation.options.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{option.name}</span>
                        {option.price && (
                          <span className="ml-2 font-bold">${option.price.toFixed(2)}</span>
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
    </div>
  );
};

export default ProductVariations;