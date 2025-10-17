import { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Upload,
  Image as ImageIcon,
  Star,
  StarOff,
  List
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface VariationOption {
  id?: number;
  option_name: string;
  option_value: string;
  price_adjustment?: number;
  image_url?: string;
  is_default?: boolean;
  sort_order?: number;
}

interface VariationOptionsManagerProps {
  variationType: 'text' | 'dropdown' | 'image' | 'boolean';
  options: VariationOption[];
  onChange: (options: VariationOption[]) => void;
}

const VariationOptionsManager = ({ 
  variationType, 
  options, 
  onChange 
}: VariationOptionsManagerProps) => {
  const [uploadingImages, setUploadingImages] = useState<Set<number>>(new Set());

  const addOption = () => {
    const newOption: VariationOption = {
      option_name: '',
      option_value: '',
      price_adjustment: 0,
      image_url: '',
      is_default: false,
      sort_order: options.length
    };
    onChange([...options, newOption]);
  };

  const removeOption = (index: number) => {
    const newOptions = options.filter((_, i) => i !== index);
    // Reset default if we removed the default option
    if (options[index]?.is_default && newOptions.length > 0) {
      newOptions[0].is_default = true;
    }
    onChange(newOptions);
  };

  const updateOption = (index: number, field: keyof VariationOption, value: any) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    
    // If setting as default, unset all other defaults
    if (field === 'is_default' && value === true) {
      newOptions.forEach((option, i) => {
        if (i !== index) {
          option.is_default = false;
        }
      });
    }
    
    onChange(newOptions);
  };

  const moveOption = (index: number, direction: 'up' | 'down') => {
    const newOptions = [...options];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex >= 0 && newIndex < newOptions.length) {
      [newOptions[index], newOptions[newIndex]] = [newOptions[newIndex], newOptions[index]];
      // Update sort_order
      newOptions.forEach((option, i) => {
        option.sort_order = i;
      });
      onChange(newOptions);
    }
  };

  const handleImageUpload = async (index: number, file: File) => {
    setUploadingImages(prev => new Set(prev).add(index));
    
    try {
      // Create FormData for image upload
      const formData = new FormData();
      formData.append('image', file);
      
      // Upload to backend (assuming there's an image upload endpoint)
      const response = await fetch('/api/admin/upload/image', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      
      if (response.ok) {
        const data = await response.json();
        updateOption(index, 'image_url', data.data.url);
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Image upload failed:', error);
      // Fallback: use a placeholder or allow manual URL entry
    } finally {
      setUploadingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });
    }
  };

  // Don't show options manager for text and boolean types
  if (variationType === 'text' || variationType === 'boolean') {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Variation Options</span>
          <Button onClick={addOption} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Option
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {options.length === 0 ? (
          <Alert>
            <AlertDescription>
              No options configured. Add options to allow customers to choose from different values.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            {options.map((option, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`option-name-${index}`}>Option Name *</Label>
                    <Input
                      id={`option-name-${index}`}
                      value={option.option_name}
                      onChange={(e) => updateOption(index, 'option_name', e.target.value)}
                      placeholder="e.g., Red, Large, Premium"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor={`option-value-${index}`}>Option Value *</Label>
                    <Input
                      id={`option-value-${index}`}
                      value={option.option_value}
                      onChange={(e) => updateOption(index, 'option_value', e.target.value)}
                      placeholder="e.g., red, large, premium"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label htmlFor={`price-adjustment-${index}`}>Price Adjustment</Label>
                    <Input
                      id={`price-adjustment-${index}`}
                      type="number"
                      step="0.01"
                      value={option.price_adjustment || 0}
                      onChange={(e) => updateOption(index, 'price_adjustment', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Positive adds to price, negative subtracts
                    </p>
                  </div>
                  
                  {variationType === 'image' && (
                    <div>
                      <Label htmlFor={`image-url-${index}`}>Image URL</Label>
                      <div className="flex gap-2">
                        <Input
                          id={`image-url-${index}`}
                          value={option.image_url || ''}
                          onChange={(e) => updateOption(index, 'image_url', e.target.value)}
                          placeholder="https://example.com/image.jpg"
                        />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleImageUpload(index, file);
                            }
                          }}
                          className="hidden"
                          id={`image-upload-${index}`}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById(`image-upload-${index}`)?.click()}
                          disabled={uploadingImages.has(index)}
                        >
                          {uploadingImages.has(index) ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Image Preview */}
                {variationType === 'image' && option.image_url && (
                  <div className="mt-4">
                    <Label>Image Preview</Label>
                    <div className="mt-2">
                      <img 
                        src={option.image_url} 
                        alt={option.option_name}
                        className="w-20 h-20 object-cover rounded border"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                )}
                
                {/* Option Actions */}
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateOption(index, 'is_default', !option.is_default)}
                    >
                      {option.is_default ? (
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ) : (
                        <StarOff className="h-4 w-4" />
                      )}
                      <span className="ml-1">
                        {option.is_default ? 'Default' : 'Set Default'}
                      </span>
                    </Button>
                    
                    {option.is_default && (
                      <Badge variant="secondary">Default Option</Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveOption(index, 'up')}
                      disabled={index === 0}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveOption(index, 'down')}
                      disabled={index === options.length - 1}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOption(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {variationType === 'dropdown' && options.length === 0 && (
          <div className="text-center py-8">
            <List className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              Add options to create a dropdown selection
            </p>
            <Button onClick={addOption}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Option
            </Button>
          </div>
        )}
        
        {variationType === 'image' && options.length === 0 && (
          <div className="text-center py-8">
            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              Add image options for visual selection
            </p>
            <Button onClick={addOption}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Image Option
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VariationOptionsManager;
