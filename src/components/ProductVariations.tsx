import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { getCurrencySymbol } from "@/utils/currency";

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
  variationStock?: Array<{ variationName: string; optionName: string; available: number }>;
  productRegion?: 'us' | 'eu'; // Product region for currency display
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
  onBooleanChange,
  variationStock = [],
  productRegion
}: ProductVariationsProps) => {
  // Derive selected "model" option name from image variations (used for conditional add-on visibility)
  const selectedModelName = (() => {
    for (const variation of imageVariations) {
      const selectedOptionId = selectedImageValues[variation.id];
      if (selectedOptionId) {
        const option = variation.options.find((o) => o.id === selectedOptionId);
        if (option?.name) {
          return String(option.name);
        }
      }
    }
    return undefined;
  })();

  // Helper to check stock status for a specific variation option
  const isOptionOutOfStock = (variationName: string, optionName: string): boolean => {
    // If no stock info is available, assume in stock (or not checked yet)
    if (!variationStock || variationStock.length === 0) return false;
    
    // Find the stock entry for this variation and option
    const stockEntry = variationStock.find(
      (entry) => entry.variationName === variationName && entry.optionName === optionName
    );
    
    // If we found an entry and available is <= 0, it's out of stock
    return !!stockEntry && stockEntry.available <= 0;
  };

  return (
    <div className="space-y-4">
      {/* Image Variations (visual options first) */}
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
                {variation.options.map((option) => {
                  const outOfStock = isOptionOutOfStock(variation.name, option.name);
                  
                  return (
                    <button
                      key={option.id}
                      onClick={() => onImageChange?.(variation.id, option.id)}
                      className={`relative p-2 rounded-lg border-2 transition-colors text-left ${
                        selectedImageValues[variation.id] === option.id
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-muted-foreground'
                      } ${outOfStock ? 'opacity-60 grayscale' : ''}`}
                    >
                      <div className="aspect-square rounded-lg overflow-hidden mb-1">
                        <img 
                          src={option.image || '/api/placeholder/80/80'} 
                          alt={option.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="text-center">
                        <span className="text-xs font-medium block">
                          {String(option.name)}
                          {outOfStock && <span className="text-destructive block text-[10px] uppercase font-bold">(Out of Stock)</span>}
                        </span>
                        {option.price !== undefined && option.price !== null && option.price !== 0 && (() => {
                          const currency = getCurrencySymbol(productRegion);
                          return (
                            <p className="text-xs text-muted-foreground">
                              {option.price > 0 ? '+' : ''}{currency}{option.price.toFixed(2)}
                            </p>
                          );
                        })()}
                      </div>
                      {selectedImageValues[variation.id] === option.id && (
                        <div className="absolute top-2 right-2 w-4 h-4 bg-primary rounded-full"></div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

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
          {dropdownVariations.map((variation) => {
            const varName = (variation.name || '').toLowerCase();
            const modelName = (selectedModelName || '').toLowerCase();

            const isLdComponents =
              varName.includes('add ld components');
            const isHdComponents =
              varName.includes('add hd components');

            // For single monitor stand:
            // - If LD model is selected, hide "Add LD components..."
            // - If HD model is selected, hide "Add HD components..."
            if (modelName.includes('model ld') && isLdComponents) {
              return null;
            }
            if (modelName.includes('model hd') && isHdComponents) {
              return null;
            }

            const yesOption = variation.options.find((o) => o.name === 'Yes');
            const noOption = variation.options.find((o) => o.name === 'No');
            const isYesNoAddon = yesOption && noOption && variation.options.length === 2;
            const selectedId = selectedDropdownValues[variation.id];

            if (isYesNoAddon && yesOption && noOption) {
              const isChecked = selectedId === yesOption.id;
              const price = yesOption.price ?? 0;
              const hasPrice = price !== 0 && price !== null && price !== undefined;
              
              // Check stock for Yes option (No option usually doesn't have stock constraints)
              const yesOutOfStock = isOptionOutOfStock(variation.name, 'Yes');

              return (
                <div key={variation.id} className="space-y-2">
                  <Label className="text-lg font-medium">
                    {variation.name}
                    {variation.isRequired && <span className="text-primary ml-1">*</span>}
                  </Label>
                  {variation.description && (
                    <p className="text-sm text-muted-foreground">{variation.description}</p>
                  )}
                  <div className={`flex items-center justify-between rounded-lg border p-3 ${yesOutOfStock && isChecked ? 'border-destructive bg-destructive/5' : ''}`}>
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(checked) =>
                          onDropdownChange?.(variation.id, checked ? yesOption.id : noOption.id)
                        }
                      />
                      <div className="flex items-center space-x-2">
                        {yesOption.image && (
                          <img
                            src={yesOption.image}
                            alt={variation.name}
                            className="w-10 h-10 rounded object-cover"
                          />
                        )}
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {variation.name}
                          </span>
                          {yesOutOfStock && (
                            <span className="text-xs text-destructive font-medium">
                              Out of Stock
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {hasPrice && (() => {
                      const currency = getCurrencySymbol(productRegion);
                      return (
                        <span className="ml-2 font-bold">
                          {price > 0 ? '+' : ''}{currency}{Math.abs(price).toFixed(2)}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              );
            }

            return (
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
                    {variation.options.map((option) => {
                      const price = option.price ?? 0;
                      const hasPrice = price !== 0 && price !== null && price !== undefined;
                      const outOfStock = isOptionOutOfStock(variation.name, option.name);
                      
                      return (
                        <SelectItem key={option.id} value={option.id} disabled={false /* We allow selection but warn */}>
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center space-x-2">
                              {option.image && (
                                <img
                                  src={option.image}
                                  alt={option.name}
                                  className="w-10 h-10 rounded object-cover"
                                />
                              )}
                              <span>
                                {option.name} 
                                {outOfStock && <span className="text-destructive ml-2 text-xs font-bold">(OUT OF STOCK)</span>}
                              </span>
                            </div>
                            {hasPrice && (() => {
                              const currency = getCurrencySymbol(productRegion);
                              return (
                                <span className="ml-2 font-bold">
                                  {price > 0 ? '+' : ''}{currency}{Math.abs(price).toFixed(2)}
                                </span>
                              );
                            })()}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </div>
      )}

      {/* Boolean Variations */}
      {booleanVariations.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-primary">Yes/No Options</h3>
          {booleanVariations.map((variation) => {
            // Check if this variation's selected option is out of stock
            const isYesSelected = selectedBooleanValues[variation.id] === true;
            
            // For checking specifically if YES option is out of stock (common case)
            const yesOutOfStock = isOptionOutOfStock(variation.name, 'Yes');
            
            // Check current selection status
            const stockInfo = variationStock.find(
              (item) => item.variationName === variation.name && 
              ((isYesSelected && item.optionName === 'Yes') || (!isYesSelected && item.optionName === 'No'))
            );
            const isSelectionOutOfStock = stockInfo && stockInfo.available <= 0;
            
            return (
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
                  {yesOutOfStock && !selectedBooleanValues[variation.id] && (
                    <span className="text-xs text-destructive font-medium">(Yes option out of stock)</span>
                  )}
                </div>
                {isSelectionOutOfStock && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mt-2">
                    <p className="text-sm text-destructive font-medium">
                      The selected option "{isYesSelected ? 'Yes' : 'No'}" is out of stock
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProductVariations;
