/**
 * Email Templates Tab Component
 * Admin interface for managing email templates
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Send, Save, FileText } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface EmailTemplate {
  id: number;
  type: string;
  name: string;
  description: string;
  subject: string;
  html_body: string;
  text_body?: string;
  recipient_type: 'admin' | 'customer' | 'both';
  is_active: boolean;
}

export default function EmailTemplatesTab() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/email-templates`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
        if (data.length > 0 && !selectedTemplate) {
          setSelectedTemplate(data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch email templates',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;
    
    setSaving(true);
    try {
      const res = await fetch(
        `${API_URL}/api/admin/email-templates/${selectedTemplate.type}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            subject: selectedTemplate.subject,
            html_body: selectedTemplate.html_body,
            text_body: selectedTemplate.text_body,
            is_active: selectedTemplate.is_active
          })
        }
      );
      
      if (res.ok) {
        toast({
          title: 'Success',
          description: 'Template saved successfully'
        });
        fetchTemplates(); // Refresh list
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save template',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!selectedTemplate || !testEmail) {
      toast({
        title: 'Error',
        description: 'Please enter a test email address',
        variant: 'destructive'
      });
      return;
    }
    
    setSendingTest(true);
    try {
      const res = await fetch(
        `${API_URL}/api/admin/email-templates/${selectedTemplate.type}/test`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ recipientEmail: testEmail })
        }
      );
      
      if (res.ok) {
        const result = await res.json();
        toast({
          title: 'Test Email Sent',
          description: `Email sent to ${testEmail} (Test mode: logged to console)`
        });
      } else {
        throw new Error('Failed to send test email');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send test email',
        variant: 'destructive'
      });
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
      {/* Template List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Email Templates
          </CardTitle>
          <CardDescription>
            {templates.length} templates available
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {templates.map((template) => (
              <div
                key={template.id}
                onClick={() => handleSelectTemplate(template)}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedTemplate?.id === template.id
                    ? 'bg-red-50 border-red-500 border-2'
                    : 'bg-white hover:bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className={`font-medium text-sm ${
                      selectedTemplate?.id === template.id ? 'text-gray-900' : 'text-gray-900'
                    }`}>{template.name}</div>
                    <div className={`text-xs mt-1 ${
                      selectedTemplate?.id === template.id ? 'text-gray-600' : 'text-gray-500'
                    }`}>
                      {template.description}
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Badge 
                      variant={template.is_active ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {template.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline" className={`text-xs ${
                    selectedTemplate?.id === template.id ? 'border-gray-700 text-gray-700' : ''
                  }`}>
                    {template.recipient_type}
                  </Badge>
                  <Badge variant="outline" className={`text-xs ${
                    selectedTemplate?.id === template.id ? 'border-gray-700 text-gray-700' : ''
                  }`}>
                    {template.type}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Template Editor */}
      {selectedTemplate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Edit Template
            </CardTitle>
            <CardDescription>{selectedTemplate.name}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="subject">Subject Line</Label>
              <Input
                id="subject"
                value={selectedTemplate.subject}
                onChange={(e) => setSelectedTemplate({
                  ...selectedTemplate,
                  subject: e.target.value
                })}
                placeholder="Email subject with variables"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use &#123;&#123;variable&#125;&#125; for dynamic content
              </p>
            </div>
            
            <div>
              <Label htmlFor="html_body">HTML Body</Label>
              <Textarea
                id="html_body"
                rows={15}
                value={selectedTemplate.html_body}
                onChange={(e) => setSelectedTemplate({
                  ...selectedTemplate,
                  html_body: e.target.value
                })}
                className="font-mono text-sm"
                placeholder="HTML email body"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use &#123;&#123;variable&#125;&#125; for dynamic content (HTML supported)
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="flex-1"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Template
                  </>
                )}
              </Button>
            </div>

            <div className="border-t pt-4">
              <Label htmlFor="test_email">Test Email Address</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="test_email"
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@example.com"
                  className="flex-1"
                />
                <Button
                  onClick={handleTest}
                  disabled={sendingTest || !testEmail}
                  variant="outline"
                >
                  {sendingTest ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Test
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Send a test email to preview the template
              </p>
            </div>

            <div className="border-t pt-4">
              <Label>Template Info</Label>
              <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                <div>
                  <span className="text-gray-500">Type:</span>{' '}
                  <code className="text-xs">{selectedTemplate.type}</code>
                </div>
                <div>
                  <span className="text-gray-500">Recipient:</span>{' '}
                  <Badge variant="outline" className="ml-1">
                    {selectedTemplate.recipient_type}
                  </Badge>
                </div>
                <div>
                  <span className="text-gray-500">Status:</span>{' '}
                  <Badge 
                    variant={selectedTemplate.is_active ? 'default' : 'secondary'}
                    className="ml-1"
                  >
                    {selectedTemplate.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

