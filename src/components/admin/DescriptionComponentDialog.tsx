import React, { useState, useEffect } from 'react';
import { ProductDescriptionComponent } from '@/services/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Save, X } from 'lucide-react';
import TextBlockEditor from './description/TextBlockEditor';
import ImageBlockEditor from './description/ImageBlockEditor';
import TwoColumnEditor from './description/TwoColumnEditor';
import ThreeColumnEditor from './description/ThreeColumnEditor';

interface DescriptionComponentDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  component?: ProductDescriptionComponent | null;
  productId: number;
}

const DescriptionComponentDialog: React.FC<DescriptionComponentDialogProps> = ({
  open,
  onClose,
  onSave,
  component,
  productId
}) => {
  const [componentType, setComponentType] = useState<string>('text');
  const [componentData, setComponentData] = useState<any>({});
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      if (component) {
        setComponentType(component.component_type);
        setComponentData(component.content);
        setIsActive(component.is_active);
      } else {
        setComponentType('text');
        setComponentData({});
        setIsActive(true);
      }
    }
  }, [open, component]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        component_type: componentType,
        content: componentData,
        is_active: isActive
      };

      await onSave(submitData);
    } catch (error) {
      console.error('Error saving component:', error);
    } finally {
      setLoading(false);
    }
  };

  const getComponentTypeIcon = (type: string) => {
    switch (type) {
      case 'text': return '📝';
      case 'image': return '🖼️';
      case 'two_column': return '📊';
      case 'three_column': return '📋';
      case 'full_width_image': return '🖼️';
      default: return '❓';
    }
  };

  const renderComponentEditor = () => {
    switch (componentType) {
      case 'text':
        return (
          <TextBlockEditor
            data={componentData}
            onChange={setComponentData}
          />
        );
      case 'image':
        return (
          <ImageBlockEditor
            data={componentData}
            onChange={setComponentData}
            productId={productId}
          />
        );
      case 'two_column':
        return (
          <TwoColumnEditor
            data={componentData}
            onChange={setComponentData}
            productId={productId}
          />
        );
      case 'three_column':
        return (
          <ThreeColumnEditor
            data={componentData}
            onChange={setComponentData}
          />
        );
      case 'full_width_image':
        return (
          <ImageBlockEditor
            data={{ ...componentData, width: 'full' }}
            onChange={(data) => setComponentData({ ...data, width: 'full' })}
            productId={productId}
          />
        );
      default:
        return <div>Select a component type</div>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{getComponentTypeIcon(componentType)}</span>
            {component ? 'Edit Component' : 'Create New Component'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Component Type Selection */}
          <div>
            <Label htmlFor="component_type">Component Type</Label>
            <Select
              value={componentType}
              onValueChange={setComponentType}
              disabled={!!component} // Don't allow changing type when editing
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">
                  <div className="flex items-center gap-2">
                    <span>📝</span>
                    Text Block
                  </div>
                </SelectItem>
                <SelectItem value="image">
                  <div className="flex items-center gap-2">
                    <span>🖼️</span>
                    Image Block
                  </div>
                </SelectItem>
                <SelectItem value="two_column">
                  <div className="flex items-center gap-2">
                    <span>📊</span>
                    Two Column Layout
                  </div>
                </SelectItem>
                <SelectItem value="three_column">
                  <div className="flex items-center gap-2">
                    <span>📋</span>
                    Three Column Layout
                  </div>
                </SelectItem>
                <SelectItem value="full_width_image">
                  <div className="flex items-center gap-2">
                    <span>🖼️</span>
                    Full Width Image
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Component Editor */}
          <div>
            <Label>Component Content</Label>
            <div className="mt-2">
              {renderComponentEditor()}
            </div>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="is_active">Active (visible to customers)</Label>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
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
                  {component ? 'Update Component' : 'Create Component'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DescriptionComponentDialog;

