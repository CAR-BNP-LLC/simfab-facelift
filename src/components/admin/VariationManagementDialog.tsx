import { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Type, 
  List, 
  Image as ImageIcon, 
  ToggleLeft,
  AlertCircle,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import VariationOptionsManager from './VariationOptionsManager';
import { VariationWithOptions, CreateVariationDto, UpdateVariationDto, getErrorDetails } from '@/services/api';
import { useErrorHandler } from '@/hooks/use-error-handler';

interface VariationManagementDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: CreateVariationDto | UpdateVariationDto) => Promise<void>;
  variation?: VariationWithOptions | null;
  productId: number;
}

interface VariationOption {
  id?: number;
  option_name: string;
  option_value: string;
  price_adjustment?: number;
  image_url?: string;
  is_default?: boolean;
  sort_order?: number;
}

const VariationManagementDialog = ({
  open,
  onClose,
  onSave,
  variation,
  productId
}: VariationManagementDialogProps) => {
  const { handleError } = useErrorHandler();
  const [formData, setFormData] = useState({
    variation_type: 'text' as 'text' | 'dropdown' | 'image' | 'boolean',
    name: '',
    description: '',
    is_required: true,
    sort_order: 0,
    options: [] as VariationOption[],
    yes_price: 0 // For boolean variations
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data when dialog opens or variation changes
  useEffect(() => {
    if (open) {
      if (variation) {
        // Editing existing variation
        console.log('Editing variation:', variation);
        console.log('Variation options:', variation.options);
        
        const yesPrice = variation.variation_type === 'boolean' && variation.options?.length > 0 
          ? variation.options.find(opt => opt.option_name === 'Yes')?.price_adjustment || 0
          : 0;
        
        console.log('Calculated yes_price:', yesPrice);
        
        setFormData({
          variation_type: variation.variation_type,
          name: variation.name,
          description: variation.description || '',
          is_required: variation.is_required,
          sort_order: variation.sort_order,
          options: variation.options || [],
          yes_price: yesPrice
        });
      } else {
        // Creating new variation
        setFormData({
          variation_type: 'text',
          name: '',
          description: '',
          is_required: true,
          sort_order: 0,
          options: [],
          yes_price: 0
        });
      }
      setErrors({});
    }
  }, [open, variation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('=== FORM SUBMISSION STARTED ===');
    console.log('Form submitted with data:', formData);
    console.log('Variation type:', formData.variation_type);
    console.log('Yes price:', formData.yes_price);
    setLoading(true);
    setErrors({});

    try {
      // Validate form
      const validationErrors: Record<string, string> = {};
      
      if (!formData.name.trim()) {
        validationErrors.name = 'Variation name is required';
      }
      
      if (formData.variation_type === 'dropdown' || formData.variation_type === 'image') {
        if (formData.options.length === 0) {
          validationErrors.options = 'At least one option is required for dropdown and image variations';
        } else {
          // Validate options
          formData.options.forEach((option, index) => {
            if (!option.option_name.trim()) {
              validationErrors[`option_${index}_name`] = 'Option name is required';
            }
            if (!option.option_value.trim()) {
              validationErrors[`option_${index}_value`] = 'Option value is required';
            }
          });
        }
      }
      
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }

      // Prepare data for API
      const submitData: CreateVariationDto | UpdateVariationDto = {
        variation_type: formData.variation_type,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        is_required: formData.is_required,
        sort_order: formData.sort_order
      };

      console.log('Form data before submission:', formData);
      console.log('Yes price value:', formData.yes_price);
      
      // Handle options based on variation type
      if (formData.variation_type === 'dropdown' || formData.variation_type === 'image') {
        (submitData as CreateVariationDto).options = formData.options;
        console.log('Added dropdown/image options:', formData.options);
      } else if (formData.variation_type === 'boolean') {
        // For boolean variations, create Yes/No options
        const booleanOptions = [
          {
            option_name: 'Yes',
            option_value: 'true',
            price_adjustment: formData.yes_price,
            is_default: true
          },
          {
            option_name: 'No',
            option_value: 'false',
            price_adjustment: 0,
            is_default: false
          }
        ];
        (submitData as CreateVariationDto).options = booleanOptions;
        console.log('Added boolean options:', booleanOptions);
      }

      console.log('Final submit data:', submitData);

      console.log('=== CALLING API ===');
      console.log('Submitting variation data:', submitData);
      await onSave(submitData);
      console.log('Variation saved successfully');
      onClose();
    } catch (error) {
      console.error('Failed to save variation:', error);
      const errorDetails = getErrorDetails(error);
      
      if (errorDetails.code === 'RATE_LIMIT_EXCEEDED') {
        setErrors({ submit: `Rate limit exceeded. Please wait ${errorDetails.retryAfter || 60} seconds before trying again.` });
      } else if (errorDetails.code === 'VALIDATION_ERROR') {
        // Handle validation errors by showing field-specific errors
        const fieldErrors: Record<string, string> = {};
        if (errorDetails.details && Array.isArray(errorDetails.details)) {
          errorDetails.details.forEach((detail: any) => {
            fieldErrors[detail.field] = detail.message;
          });
        }
        setErrors({ ...fieldErrors, submit: errorDetails.message });
      } else {
        setErrors({ submit: errorDetails.message });
      }
    } finally {
      setLoading(false);
    }
  };

  const getVariationTypeIcon = (type: string) => {
    switch (type) {
      case 'text':
        return <Type className="h-4 w-4" />;
      case 'dropdown':
        return <List className="h-4 w-4" />;
      case 'image':
        return <ImageIcon className="h-4 w-4" />;
      case 'boolean':
        return <ToggleLeft className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getVariationTypeDescription = (type: string) => {
    switch (type) {
      case 'text':
        return 'Free text input field for custom values';
      case 'dropdown':
        return 'Select from predefined options with price adjustments';
      case 'image':
        return 'Visual selection with images (e.g., colors, models)';
      case 'boolean':
        return 'Yes/No toggle with optional price adjustments';
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getVariationTypeIcon(formData.variation_type)}
            {variation ? 'Edit Variation' : 'Create New Variation'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="variation_type">Variation Type *</Label>
                  <Select
                    value={formData.variation_type}
                    onValueChange={(value: 'text' | 'dropdown' | 'image' | 'boolean') => {
                      setFormData(prev => ({
                        ...prev,
                        variation_type: value,
                        options: value === 'text' || value === 'boolean' ? [] : prev.options,
                        yes_price: value === 'boolean' ? prev.yes_price : 0
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">
                        <div className="flex items-center gap-2">
                          <Type className="h-4 w-4" />
                          Text Input
                        </div>
                      </SelectItem>
                      <SelectItem value="dropdown">
                        <div className="flex items-center gap-2">
                          <List className="h-4 w-4" />
                          Dropdown
                        </div>
                      </SelectItem>
                      <SelectItem value="image">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="h-4 w-4" />
                          Image Selection
                        </div>
                      </SelectItem>
                      <SelectItem value="boolean">
                        <div className="flex items-center gap-2">
                          <ToggleLeft className="h-4 w-4" />
                          Yes/No Toggle
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {getVariationTypeDescription(formData.variation_type)}
                  </p>
                </div>

                <div>
                  <Label htmlFor="name">Variation Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Color, Size, Material"
                    className={errors.name ? 'border-destructive' : ''}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive mt-1">{errors.name}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description for this variation..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_required"
                    checked={formData.is_required}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_required: checked }))}
                  />
                  <Label htmlFor="is_required">Required Selection</Label>
                </div>

                <div>
                  <Label htmlFor="sort_order">Sort Order</Label>
                  <Input
                    id="sort_order"
                    type="number"
                    min="0"
                    value={formData.sort_order}
                    onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Variation Type Specific Settings */}
          {formData.variation_type === 'boolean' && (
            <Card>
              <CardHeader>
                <CardTitle>Boolean Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Boolean variations are simple Yes/No toggles. You can optionally add a price adjustment when "Yes" is selected.
                  </AlertDescription>
                </Alert>
                <div className="mt-4 space-y-4">
                  <div>
                    <Label htmlFor="yes_price">Yes Price Adjustment</Label>
                    <Input
                      id="yes_price"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.yes_price}
                      onChange={(e) => {
                        const newPrice = parseFloat(e.target.value) || 0;
                        console.log('Yes price changed to:', newPrice);
                        setFormData(prev => ({
                          ...prev,
                          yes_price: newPrice
                        }));
                      }}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Price added when customer selects "Yes" (leave empty for no price change)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Options Manager for Dropdown and Image types */}
          {(formData.variation_type === 'dropdown' || formData.variation_type === 'image') && (
            <VariationOptionsManager
              variationType={formData.variation_type}
              options={formData.options}
              onChange={(options) => setFormData(prev => ({ ...prev, options }))}
            />
          )}

          {/* Error Display */}
          {errors.submit && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.submit}</AlertDescription>
            </Alert>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {variation ? 'Update Variation' : 'Create Variation'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default VariationManagementDialog;
