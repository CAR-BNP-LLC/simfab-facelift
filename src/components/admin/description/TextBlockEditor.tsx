import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bold, Italic, Palette } from 'lucide-react';
import RichTextEditor from './RichTextEditor';

interface TextBlockEditorProps {
  data: any;
  onChange: (data: any) => void;
}

const TextBlockEditor: React.FC<TextBlockEditorProps> = ({ data, onChange }) => {
  const initializedRef = useRef(false);
  const [formData, setFormData] = useState({
    heading: data.heading || '',
    headingSize: data.headingSize || '2xl',
    headingColor: data.headingColor || '#ffffff',
    paragraph: data.paragraph || '',
    textColor: data.textColor || '#e5e5e5',
    alignment: data.alignment || 'left',
    padding: data.padding || { top: 16, bottom: 16, left: 0, right: 0 }
  });

  // Sync formData when data prop changes (for editing existing components)
  // But only once when the component first mounts
  useEffect(() => {
    if (!initializedRef.current && data && (data.heading || data.paragraph)) {
      setFormData({
        heading: data.heading || '',
        headingSize: data.headingSize || '2xl',
        headingColor: data.headingColor || '#ffffff',
        paragraph: data.paragraph || '',
        textColor: data.textColor || '#e5e5e5',
        alignment: data.alignment || 'left',
        padding: data.padding || { top: 16, bottom: 16, left: 0, right: 0 }
      });
      initializedRef.current = true;
    } else if (!initializedRef.current) {
      // Initialize even if data is empty
      initializedRef.current = true;
    }
  }, [data]);

  // Notify parent only when user makes changes
  const handleChange = (updates: any) => {
    const newData = { ...formData, ...updates };
    setFormData(newData);
    onChange(newData);
  };

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


  return (
    <div className="space-y-4">
      {/* Basic Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="heading">Heading</Label>
          <Input
            id="heading"
            value={formData.heading}
            onChange={(e) => handleInputChange('heading', e.target.value)}
            placeholder="Enter heading..."
          />
        </div>
        <div>
          <Label htmlFor="headingSize">Heading Size</Label>
          <Select
            value={formData.headingSize}
            onValueChange={(value) => handleInputChange('headingSize', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="xl">Large (xl)</SelectItem>
              <SelectItem value="2xl">Extra Large (2xl)</SelectItem>
              <SelectItem value="3xl">3xl</SelectItem>
              <SelectItem value="4xl">4xl</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Paragraph with Rich Text Editor */}
      <div>
        <Label htmlFor="paragraph">Paragraph Content</Label>
        <div className="mt-2">
          <RichTextEditor
            value={formData.paragraph}
            onChange={(value) => handleInputChange('paragraph', value)}
            placeholder="Enter paragraph content..."
          />
        </div>
      </div>

      {/* Colors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="headingColor">Heading Color</Label>
          <Input
            id="headingColor"
            type="color"
            value={formData.headingColor}
            onChange={(e) => handleInputChange('headingColor', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="textColor">Text Color</Label>
          <Input
            id="textColor"
            type="color"
            value={formData.textColor}
            onChange={(e) => handleInputChange('textColor', e.target.value)}
          />
        </div>
      </div>

      {/* Alignment */}
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

export default TextBlockEditor;
