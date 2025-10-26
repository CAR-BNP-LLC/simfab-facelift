import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import TextBlockEditor from './TextBlockEditor';
import ImageBlockEditor from './ImageBlockEditor';

interface TwoColumnEditorProps {
  data: any;
  onChange: (data: any) => void;
  productId: number;
}

const TwoColumnEditor: React.FC<TwoColumnEditorProps> = ({ data, onChange, productId }) => {
  const initializedRef = useRef(false);
  const [formData, setFormData] = useState({
    leftColumn: data.leftColumn || { type: 'text', content: {} },
    rightColumn: data.rightColumn || { type: 'text', content: {} },
    columnRatio: data.columnRatio || '50-50',
    gap: data.gap || 24,
    reverseOnMobile: data.reverseOnMobile || false,
    padding: data.padding || { top: 24, bottom: 24, left: 0, right: 0 }
  });

  // Sync formData when data prop changes (for editing existing components)
  // But only once when the component first mounts
  useEffect(() => {
    if (!initializedRef.current && data && (data.leftColumn || data.rightColumn)) {
      setFormData({
        leftColumn: data.leftColumn || { type: 'text', content: {} },
        rightColumn: data.rightColumn || { type: 'text', content: {} },
        columnRatio: data.columnRatio || '50-50',
        gap: data.gap || 24,
        reverseOnMobile: data.reverseOnMobile || false,
        padding: data.padding || { top: 24, bottom: 24, left: 0, right: 0 }
      });
      initializedRef.current = true;
    } else if (!initializedRef.current) {
      initializedRef.current = true;
    }
  }, [data]);

  const handleColumnChange = (side: 'left' | 'right', field: string, value: any) => {
    const newData = {
      ...formData,
      [side + 'Column']: {
        ...formData[side + 'Column'],
        [field]: value
      }
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

  const renderColumnEditor = (side: 'left' | 'right') => {
    const column = formData[side + 'Column'];
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{side === 'left' ? 'Left' : 'Right'} Column</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Column Type</Label>
            <Select
              value={column.type}
              onValueChange={(value) => handleColumnChange(side, 'type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text Block</SelectItem>
                <SelectItem value="image">Image Block</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Content</Label>
            {column.type === 'text' ? (
              <TextBlockEditor
                data={column.content}
                onChange={(content) => handleColumnChange(side, 'content', content)}
              />
            ) : (
              <ImageBlockEditor
                data={column.content}
                onChange={(content) => handleColumnChange(side, 'content', content)}
                productId={productId}
              />
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Layout Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Layout Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="columnRatio">Column Ratio</Label>
              <Select
                value={formData.columnRatio}
                onValueChange={(value) => {
                  const newData = { ...formData, columnRatio: value };
                  setFormData(newData);
                  onChange(newData);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50-50">50% - 50%</SelectItem>
                  <SelectItem value="60-40">60% - 40%</SelectItem>
                  <SelectItem value="40-60">40% - 60%</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="reverseOnMobile"
              checked={formData.reverseOnMobile}
              onCheckedChange={(checked) => {
                const newData = { ...formData, reverseOnMobile: checked };
                setFormData(newData);
                onChange(newData);
              }}
            />
            <Label htmlFor="reverseOnMobile">Reverse columns on mobile</Label>
          </div>
        </CardContent>
      </Card>

      {/* Column Editors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderColumnEditor('left')}
        {renderColumnEditor('right')}
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

export default TwoColumnEditor;