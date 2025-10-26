import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Image as ImageIcon } from 'lucide-react';

interface ImageBlockEditorProps {
  data: any;
  onChange: (data: any) => void;
  productId: number;
}

const ImageBlockEditor: React.FC<ImageBlockEditorProps> = ({ data, onChange, productId }) => {
  const initializedRef = useRef(false);
  const [formData, setFormData] = useState({
    imageUrl: data.imageUrl || '',
    altText: data.altText || '',
    caption: data.caption || '',
    width: data.width || 'full',
    alignment: data.alignment || 'center',
    padding: data.padding || { top: 8, bottom: 8, left: 0, right: 0 }
  });

  // Sync formData when data prop changes (for editing existing components)
  useEffect(() => {
    if (!initializedRef.current && data && data.imageUrl) {
      setFormData({
        imageUrl: data.imageUrl || '',
        altText: data.altText || '',
        caption: data.caption || '',
        width: data.width || 'full',
        alignment: data.alignment || 'center',
        padding: data.padding || { top: 8, bottom: 8, left: 0, right: 0 }
      });
      initializedRef.current = true;
    } else if (!initializedRef.current) {
      initializedRef.current = true;
    }
  }, [data]);

  const handleInputChange = (field: string, value: any) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    onChange(newData);
  };

  const handlePaddingChange = (side: string, value: number) => {
    const newData = {
      ...formData,
      padding: { ...formData.padding, [side]: value }
    };
    setFormData(newData);
    onChange(newData);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Here you would typically upload to your server
    // For now, we'll use a placeholder URL
    const imageUrl = `/uploads/${file.name}`;
    handleInputChange('imageUrl', imageUrl);
  };

  return (
    <div className="space-y-4">
      {/* Image Upload */}
      <div>
        <Label htmlFor="image-upload">Image</Label>
        <div className="mt-2 space-y-2">
          <div className="flex gap-2">
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('image-upload')?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Image
            </Button>
          </div>
          <Input
            value={formData.imageUrl}
            onChange={(e) => handleInputChange('imageUrl', e.target.value)}
            placeholder="Enter image URL..."
          />
          {formData.imageUrl && (
            <div className="mt-2">
              <img
                src={formData.imageUrl}
                alt="Preview"
                className="w-32 h-32 object-cover rounded border"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Alt Text and Caption */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="altText">Alt Text</Label>
          <Input
            id="altText"
            value={formData.altText}
            onChange={(e) => handleInputChange('altText', e.target.value)}
            placeholder="Enter alt text..."
          />
        </div>
        <div>
          <Label htmlFor="caption">Caption</Label>
          <Input
            id="caption"
            value={formData.caption}
            onChange={(e) => handleInputChange('caption', e.target.value)}
            placeholder="Enter caption..."
          />
        </div>
      </div>

      {/* Width and Alignment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="width">Width</Label>
          <Select
            value={formData.width}
            onValueChange={(value) => handleInputChange('width', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small">Small</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="large">Large</SelectItem>
              <SelectItem value="full">Full Width</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="alignment">Alignment</Label>
          <Select
            value={formData.alignment}
            onValueChange={(value) => handleInputChange('alignment', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="right">Right</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Padding */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Padding (px)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="padding-top">Top</Label>
              <Input
                id="padding-top"
                type="number"
                min="0"
                max="100"
                value={formData.padding.top}
                onChange={(e) => handlePaddingChange('top', parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label htmlFor="padding-bottom">Bottom</Label>
              <Input
                id="padding-bottom"
                type="number"
                min="0"
                max="100"
                value={formData.padding.bottom}
                onChange={(e) => handlePaddingChange('bottom', parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label htmlFor="padding-left">Left</Label>
              <Input
                id="padding-left"
                type="number"
                min="0"
                max="100"
                value={formData.padding.left}
                onChange={(e) => handlePaddingChange('left', parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label htmlFor="padding-right">Right</Label>
              <Input
                id="padding-right"
                type="number"
                min="0"
                max="100"
                value={formData.padding.right}
                onChange={(e) => handlePaddingChange('right', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ImageBlockEditor;

