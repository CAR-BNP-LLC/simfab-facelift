import { useState } from 'react';
import { 
  Edit, 
  Trash2, 
  Plus, 
  ChevronDown, 
  ChevronRight,
  Type,
  List,
  Image as ImageIcon,
  ToggleLeft,
  GripVertical,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { VariationWithOptions } from '@/services/api';

interface VariationsListProps {
  variations: VariationWithOptions[];
  loading?: boolean;
  onEdit: (variation: VariationWithOptions) => void;
  onDelete: (variationId: number) => void;
  onAdd: () => void;
}

const VariationsList = ({ 
  variations, 
  loading = false, 
  onEdit, 
  onDelete, 
  onAdd 
}: VariationsListProps) => {
  const [expandedVariations, setExpandedVariations] = useState<Set<number>>(new Set());

  const toggleExpanded = (variationId: number) => {
    const newExpanded = new Set(expandedVariations);
    if (newExpanded.has(variationId)) {
      newExpanded.delete(variationId);
    } else {
      newExpanded.add(variationId);
    }
    setExpandedVariations(newExpanded);
  };

  const getVariationIcon = (type: string) => {
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

  const getVariationTypeColor = (type: string) => {
    switch (type) {
      case 'text':
        return 'bg-blue-100 text-blue-800';
      case 'dropdown':
        return 'bg-green-100 text-green-800';
      case 'image':
        return 'bg-purple-100 text-purple-800';
      case 'boolean':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getVariationTypeLabel = (type: string) => {
    switch (type) {
      case 'text':
        return 'Text Input';
      case 'dropdown':
        return 'Dropdown';
      case 'image':
        return 'Image Selection';
      case 'boolean':
        return 'Yes/No Toggle';
      default:
        return 'Unknown';
    }
  };

  const handleDelete = (variationId: number, variationName: string) => {
    if (confirm(`Are you sure you want to delete the variation "${variationName}"? This action cannot be undone.`)) {
      onDelete(variationId);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading variations...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Product Variations
            <Badge variant="outline">{variations.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No variations configured for this product. Add variations to allow customers to customize their purchase.
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button onClick={onAdd} type="button">
              <Plus className="mr-2 h-4 w-4" />
              Add First Variation
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Product Variations
            <Badge variant="outline">{variations.length}</Badge>
          </CardTitle>
          <Button onClick={onAdd} type="button">
            <Plus className="mr-2 h-4 w-4" />
            Add Variation
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {variations.map((variation) => {
            const isExpanded = expandedVariations.has(variation.id);
            const optionCount = variation.options?.length || 0;
            
            return (
              <div key={variation.id} className="border rounded-lg">
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpanded(variation.id)}
                        className="h-8 w-8 p-0"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                      
                      <div className="flex items-center gap-2">
                        {getVariationIcon(variation.variation_type)}
                        <span className="font-medium">{variation.name}</span>
                        <Badge className={getVariationTypeColor(variation.variation_type)}>
                          {getVariationTypeLabel(variation.variation_type)}
                        </Badge>
                        {variation.is_required && (
                          <Badge variant="destructive">Required</Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {optionCount} option{optionCount !== 1 ? 's' : ''}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(variation)}
                        type="button"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(variation.id, variation.name)}
                        type="button"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  
                  {variation.description && (
                    <p className="text-sm text-muted-foreground mt-2 ml-11">
                      {variation.description}
                    </p>
                  )}
                </div>
                
                {isExpanded && (
                  <div className="border-t bg-muted/30 p-4">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Options:</h4>
                      {optionCount === 0 ? (
                        <p className="text-sm text-muted-foreground italic">
                          No options configured for this variation.
                        </p>
                      ) : (
                        <div className="space-y-1">
                          {variation.options?.map((option, index) => (
                            <div key={option.id || index} className="flex items-center justify-between bg-background p-2 rounded border">
                              <div className="flex items-center gap-2">
                                {variation.variation_type === 'image' && option.image_url && (
                                  <img 
                                    src={option.image_url} 
                                    alt={option.option_name}
                                    className="w-8 h-8 rounded object-cover"
                                  />
                                )}
                                <span className="text-sm font-medium">{option.option_name}</span>
                                {option.is_default && (
                                  <Badge variant="secondary" className="text-xs">Default</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {option.price_adjustment !== undefined && option.price_adjustment !== 0 && (
                                  <span className="text-sm text-muted-foreground">
                                    {option.price_adjustment > 0 ? '+' : ''}${option.price_adjustment.toFixed(2)}
                                  </span>
                                )}
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default VariationsList;
