import { useState } from "react";
import { X } from "lucide-react";

interface AddonOption {
  id: string;
  name: string;
  image?: string;
  price?: number;
}

interface Addon {
  id: string;
  name: string;
  price?: number;
  priceRange?: { min: number; max: number };
  options?: AddonOption[];
  required?: boolean;
}

interface ProductAddonsProps {
  addons: Addon[];
  selectedAddons?: Set<string>;
  selectedAddonOptions?: Record<string, string>;
  onAddonToggle?: (addonId: string) => void;
  onAddonOptionChange?: (addonId: string, optionId: string) => void;
}

const ProductAddons = ({
  addons = [],
  selectedAddons = new Set(),
  selectedAddonOptions = {},
  onAddonToggle,
  onAddonOptionChange
}: ProductAddonsProps) => {
  const [expandedAddons, setExpandedAddons] = useState<Set<string>>(new Set());

  const toggleAddonExpansion = (addonId: string) => {
    const newExpanded = new Set(expandedAddons);
    if (newExpanded.has(addonId)) {
      newExpanded.delete(addonId);
    } else {
      newExpanded.add(addonId);
    }
    setExpandedAddons(newExpanded);
  };

  const formatPrice = (price?: number, priceRange?: { min: number; max: number }) => {
    if (priceRange) {
      return `$${priceRange.min.toFixed(2)} - $${priceRange.max.toFixed(2)}`;
    }
    if (price) {
      return `$${price.toFixed(2)}`;
    }
    return "$0.00";
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-primary mb-2">Recommended add-on modules</h3>
        <p className="text-muted-foreground">
          Select the add-ons below for a complete Trainer Station package
        </p>
      </div>

      <div className="space-y-4">
        {addons.map((addon) => {
          const isSelected = selectedAddons.has(addon.id);
          const isExpanded = expandedAddons.has(addon.id);
          
          return (
            <div key={addon.id} className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="flex items-center space-x-3 flex-1">
                  <div 
                    className={`w-5 h-5 border-2 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
                      isSelected ? 'border-primary bg-primary' : 'border-muted-foreground hover:border-primary'
                    }`}
                    onClick={() => onAddonToggle?.(addon.id)}
                  >
                    {isSelected && (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{addon.name}</h4>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold">{formatPrice(addon.price, addon.priceRange)}</span>
                        {isSelected && addon.options && (
                          <button
                            onClick={() => toggleAddonExpansion(addon.id)}
                            className="p-1 hover:bg-muted rounded"
                          >
                            {isExpanded ? <X className="w-4 h-4" /> : <span className="text-sm">Configure</span>}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Addon Options */}
              {isSelected && addon.options && isExpanded && (
                <div className="ml-8 space-y-3">
                  <label className="text-lg font-medium">
                    Select {addon.name.split(' ')[0]} <span className="text-primary">*</span>
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {addon.options.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => onAddonOptionChange?.(addon.id, option.id)}
                        className={`relative p-3 rounded-lg border-2 transition-colors ${
                          selectedAddonOptions[addon.id] === option.id 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-muted-foreground'
                        }`}
                      >
                        {option.image && (
                          <div className="aspect-video rounded-lg overflow-hidden mb-2">
                            <img 
                              src={option.image} 
                              alt={option.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="text-center">
                          <h5 className="font-medium">{option.name}</h5>
                          {option.price && (
                            <p className="text-sm font-bold text-primary">${option.price.toFixed(2)}</p>
                          )}
                        </div>
                        {selectedAddonOptions[addon.id] === option.id && (
                          <div className="absolute top-2 right-2 w-3 h-3 bg-primary rounded-full"></div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProductAddons;