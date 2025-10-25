import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Upload } from 'lucide-react';

interface ThreeColumnEditorProps {
  data: any;
  onChange: (data: any) => void;
}

const ThreeColumnEditor: React.FC<ThreeColumnEditorProps> = ({ data, onChange }) => {
  const initializedRef = useRef(false);
  const [formData, setFormData] = useState({
    columns: data.columns || [
      { heading: '', text: '', icon: '', iconColor: '#ef4444', textColor: '#ffffff' },
      { heading: '', text: '', icon: '', iconColor: '#ef4444', textColor: '#ffffff' },
      { heading: '', text: '', icon: '', iconColor: '#ef4444', textColor: '#ffffff' }
    ],
    gap: data.gap || 16,
    alignment: data.alignment || 'center',
    backgroundColor: data.backgroundColor || '#1a1a1a',
    padding: data.padding || { top: 32, bottom: 32, left: 16, right: 16 }
  });

  // Sync formData when data prop changes (for editing existing components)
  // But only once when the component first mounts
  useEffect(() => {
    if (!initializedRef.current && data && data.columns && data.columns.length > 0) {
      setFormData({
        columns: data.columns || [
          { heading: '', text: '', icon: '', iconColor: '#ef4444', textColor: '#ffffff' },
          { heading: '', text: '', icon: '', iconColor: '#ef4444', textColor: '#ffffff' },
          { heading: '', text: '', icon: '', iconColor: '#ef4444', textColor: '#ffffff' }
        ],
        gap: data.gap || 16,
        alignment: data.alignment || 'center',
        backgroundColor: data.backgroundColor || '#1a1a1a',
        padding: data.padding || { top: 32, bottom: 32, left: 16, right: 16 }
      });
      initializedRef.current = true;
    } else if (!initializedRef.current) {
      initializedRef.current = true;
    }
  }, [data]);

  const handleColumnChange = (index: number, field: string, value: any) => {
    const newData = {
      ...formData,
      columns: formData.columns.map((col, i) => 
        i === index ? { ...col, [field]: value } : col
      )
    };
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

  const handleIconUpload = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const iconUrl = `/uploads/${file.name}`;
      handleColumnChange(index, 'icon', iconUrl);
    }
  };

  return (
    <div className="space-y-6">
      {/* Layout Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Layout Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="gap">Gap (px)</Label>
              <Input
                id="gap"
                type="number"
                min="0"
                max="100"
                value={formData.gap}
                onChange={(e) => {
                  const newData = { ...formData, gap: parseInt(e.target.value) || 0 };
                  setFormData(newData);
                  onChange(newData);
                }}
              />
            </div>
            <div>
              <Label htmlFor="alignment">Alignment</Label>
              <Select
                value={formData.alignment}
                onValueChange={(value) => {
                  const newData = { ...formData, alignment: value };
                  setFormData(newData);
                  onChange(newData);
                }}
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
            <div>
              <Label htmlFor="backgroundColor">Background Color</Label>
              <Input
                id="backgroundColor"
                type="color"
                value={formData.backgroundColor}
                onChange={(e) => {
                  const newData = { ...formData, backgroundColor: e.target.value };
                  setFormData(newData);
                  onChange(newData);
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Column Editors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {formData.columns.map((column, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="text-sm">Column {index + 1}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor={`icon-${index}`}>Icon</Label>
                <div className="flex gap-2">
                  <input
                    id={`icon-${index}`}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleIconUpload(index, e)}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById(`icon-${index}`)?.click()}
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                  <Input
                    value={column.icon}
                    onChange={(e) => handleColumnChange(index, 'icon', e.target.value)}
                    placeholder="Icon URL..."
                  />
                </div>
                {column.icon && (
                  <div className="mt-2">
                    <img
                      src={column.icon}
                      alt="Icon preview"
                      className="w-8 h-8 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor={`heading-${index}`}>Heading</Label>
                <Input
                  id={`heading-${index}`}
                  value={column.heading}
                  onChange={(e) => handleColumnChange(index, 'heading', e.target.value)}
                  placeholder="Enter heading..."
                />
              </div>

              <div>
                <Label htmlFor={`text-${index}`}>Text</Label>
                <Input
                  id={`text-${index}`}
                  value={column.text}
                  onChange={(e) => handleColumnChange(index, 'text', e.target.value)}
                  placeholder="Enter description..."
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor={`iconColor-${index}`}>Icon Color</Label>
                  <Input
                    id={`iconColor-${index}`}
                    type="color"
                    value={column.iconColor}
                    onChange={(e) => handleColumnChange(index, 'iconColor', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor={`textColor-${index}`}>Text Color</Label>
                  <Input
                    id={`textColor-${index}`}
                    type="color"
                    value={column.textColor}
                    onChange={(e) => handleColumnChange(index, 'textColor', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
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

export default ThreeColumnEditor;