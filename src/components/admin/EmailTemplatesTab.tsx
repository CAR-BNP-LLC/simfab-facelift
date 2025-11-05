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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Send, Save, FileText, Eye, Plus, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface EmailTemplate {
  id: number;
  type: string;
  name: string;
  description: string;
  subject: string;
  html_body: string;
  text_body?: string;
  recipient_type: 'admin' | 'customer' | 'both' | 'custom';
  is_active: boolean;
  header_image?: string;
  header_title?: string;
  trigger_event?: string;
  custom_recipient_email?: string;
}

const TRIGGER_EVENTS = [
  { value: 'order.created', label: 'Order Created' },
  { value: 'order.cancelled', label: 'Order Cancelled' },
  { value: 'order.payment_failed', label: 'Payment Failed' },
  { value: 'order.on_hold', label: 'Order On Hold' },
  { value: 'order.processing', label: 'Order Processing' },
  { value: 'order.completed', label: 'Order Completed' },
  { value: 'order.refunded', label: 'Order Refunded' },
  { value: 'order.details_requested', label: 'Order Details Requested' },
  { value: 'admin.note_added', label: 'Admin Note Added' },
  { value: 'auth.password_reset', label: 'Password Reset Requested' },
  { value: 'auth.account_created', label: 'New Account Created' },
  { value: 'cart.reminder_1day', label: 'Cart Reminder (1 Day)' },
  { value: 'cart.reminder_7days', label: 'Cart Reminder (7 Days)' },
  { value: 'manual', label: 'Manual (No Auto Trigger)' },
];

export default function EmailTemplatesTab() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTemplate, setNewTemplate] = useState<Partial<EmailTemplate>>({
    type: '',
    name: '',
    description: '',
    subject: '',
    html_body: '<div class="email-content"><h1 style="color: #ffffff; font-size: 28px; margin: 0 0 8px 0; font-weight: 700;">Welcome</h1><p style="color: #cccccc; font-size: 16px; line-height: 1.6;">Your email content here.</p></div>',
    recipient_type: 'customer',
    trigger_event: 'manual',
    is_active: true
  });
  const [creating, setCreating] = useState(false);
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
            is_active: selectedTemplate.is_active,
            recipient_type: selectedTemplate.recipient_type,
            trigger_event: selectedTemplate.trigger_event,
            custom_recipient_email: selectedTemplate.custom_recipient_email,
            header_image: selectedTemplate.header_image,
            header_title: selectedTemplate.header_title
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

  const handleCreateTemplate = async () => {
    if (!newTemplate.type || !newTemplate.name || !newTemplate.subject || !newTemplate.html_body) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields (Type, Name, Subject, HTML Body)',
        variant: 'destructive'
      });
      return;
    }

    setCreating(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/email-templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newTemplate)
      });

      if (res.ok) {
        const created = await res.json();
        toast({
          title: 'Success',
          description: 'Template created successfully'
        });
        setShowCreateDialog(false);
        setNewTemplate({
          type: '',
          name: '',
          description: '',
          subject: '',
          html_body: '<div class="email-content"><h1 style="color: #ffffff; font-size: 28px; margin: 0 0 8px 0; font-weight: 700;">Welcome</h1><p style="color: #cccccc; font-size: 16px; line-height: 1.6;">Your email content here.</p></div>',
          recipient_type: 'customer',
          trigger_event: 'manual',
          is_active: true
        });
        fetchTemplates();
        setSelectedTemplate(created);
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create template',
        variant: 'destructive'
      });
    } finally {
      setCreating(false);
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-6 px-0 bg-[#0b0b0b] min-h-[calc(100vh-200px)]">
      {/* Template List */}
      <Card className="bg-[#1a1a1a] border-[#2b2b2b] flex flex-col h-full">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-white">
                <FileText className="h-5 w-5" />
                Email Templates
              </CardTitle>
              <CardDescription className="text-[#999999]">
                {templates.length} templates available
              </CardDescription>
            </div>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-[#c5303b] hover:bg-[#d42a37] text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0 p-4">
          <div className="space-y-2 flex-1 overflow-y-auto pr-2">
            {templates.map((template) => (
              <div
                key={template.id}
                onClick={() => handleSelectTemplate(template)}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedTemplate?.id === template.id
                    ? 'bg-[#2b2b2b] border-[#c5303b] border-2'
                    : 'bg-[#1a1a1a] hover:bg-[#252525] border-[#2b2b2b]'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className={`font-medium text-sm ${
                      selectedTemplate?.id === template.id ? 'text-white' : 'text-white'
                    }`}>{template.name}</div>
                    <div className={`text-xs mt-1 ${
                      selectedTemplate?.id === template.id ? 'text-[#cccccc]' : 'text-[#999999]'
                    }`}>
                      {template.description}
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Badge 
                      variant={template.is_active ? 'default' : 'secondary'}
                      className={`text-xs ${template.is_active ? 'bg-[#c5303b] text-white' : 'bg-[#2b2b2b] text-[#999999]'}`}
                    >
                      {template.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline" className={`text-xs border-[#2b2b2b] bg-[#1a1a1a] ${
                    selectedTemplate?.id === template.id ? 'border-[#c5303b] text-[#c5303b]' : 'text-[#cccccc]'
                  }`}>
                    {template.recipient_type}
                  </Badge>
                  <Badge variant="outline" className={`text-xs border-[#2b2b2b] bg-[#1a1a1a] ${
                    selectedTemplate?.id === template.id ? 'border-[#c5303b] text-[#c5303b]' : 'text-[#cccccc]'
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
        <div className="flex flex-col gap-4 h-full overflow-y-auto">
          <Card className="bg-[#1a1a1a] border-[#2b2b2b] flex flex-col">
            <CardHeader className="flex-shrink-0">
              <CardTitle className="flex items-center gap-2 text-white">
                <Mail className="h-5 w-5" />
                Edit Template
              </CardTitle>
              <CardDescription className="text-[#999999]">{selectedTemplate.name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pb-6">
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
              <p className="text-xs text-[#999999] mt-1">
                Use &#123;&#123;variable&#125;&#125; for dynamic content
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="header_title">Email Header Title</Label>
                <Input
                  id="header_title"
                  value={selectedTemplate.header_title || ''}
                  onChange={(e) => setSelectedTemplate({
                    ...selectedTemplate,
                    header_title: e.target.value
                  })}
                  placeholder="e.g., SimFab, Your Store, etc."
                />
                <p className="text-xs text-[#999999] mt-1">
                  Title shown at top of email
                </p>
              </div>

              <div>
                <Label htmlFor="header_image">Header Image URL</Label>
                <Input
                  id="header_image"
                  value={selectedTemplate.header_image || ''}
                  onChange={(e) => setSelectedTemplate({
                    ...selectedTemplate,
                    header_image: e.target.value
                  })}
                  placeholder="https://example.com/logo.png"
                />
                <p className="text-xs text-[#999999] mt-1">
                  URL to header image or logo
                </p>
              </div>
            </div>

            <div className="border-t pt-4 space-y-2">
              <Label>Quick Formatting Options</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newBody = selectedTemplate.html_body + '<h2>Heading</h2><p>Your text here</p>';
                    setSelectedTemplate({ ...selectedTemplate, html_body: newBody });
                  }}
                >
                  Add Heading
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newBody = selectedTemplate.html_body + '<p><strong>Bold text</strong></p>';
                    setSelectedTemplate({ ...selectedTemplate, html_body: newBody });
                  }}
                >
                  Add Bold
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newBody = selectedTemplate.html_body + '<p><a href="#">Link text</a></p>';
                    setSelectedTemplate({ ...selectedTemplate, html_body: newBody });
                  }}
                >
                  Add Link
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newBody = selectedTemplate.html_body + '<table border="1"><tr><th>Header</th></tr><tr><td>Data</td></tr></table>';
                    setSelectedTemplate({ ...selectedTemplate, html_body: newBody });
                  }}
                >
                  Add Table
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newBody = selectedTemplate.html_body + '<ul><li>Item 1</li><li>Item 2</li></ul>';
                    setSelectedTemplate({ ...selectedTemplate, html_body: newBody });
                  }}
                >
                  Add List
                </Button>
              </div>
              <p className="text-xs text-[#999999]">
                Quick insert common HTML elements. Edit the content as needed.
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
              <p className="text-xs text-[#999999] mt-1">
                Use &#123;&#123;variable&#125;&#125; for dynamic content (HTML supported)
              </p>
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
              <p className="text-xs text-[#999999] mt-1">
                Send a test email to preview the template
              </p>
            </div>

            {/* Trigger Event Setting */}
            <div className="border-t pt-4">
              <Label htmlFor="trigger_event" className="text-white">Triggered On</Label>
              <Select
                value={selectedTemplate.trigger_event || 'manual'}
                onValueChange={(value) => setSelectedTemplate({
                  ...selectedTemplate,
                  trigger_event: value
                })}
              >
                <SelectTrigger id="trigger_event" className="bg-[#1a1a1a] border-[#2b2b2b] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-[#2b2b2b]">
                  {TRIGGER_EVENTS.map((event) => (
                    <SelectItem key={event.value} value={event.value} className="text-white hover:bg-[#2b2b2b]">
                      {event.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-[#999999] mt-1">
                When this email should be automatically sent
              </p>
            </div>

            {/* Recipient Settings */}
            <div className="border-t pt-4">
              <Label htmlFor="recipient_type" className="text-white">Send To</Label>
              <Select
                value={selectedTemplate.recipient_type || 'customer'}
                onValueChange={(value) => setSelectedTemplate({
                  ...selectedTemplate,
                  recipient_type: value as 'admin' | 'customer' | 'both' | 'custom',
                  custom_recipient_email: value !== 'custom' ? undefined : selectedTemplate.custom_recipient_email
                })}
              >
                <SelectTrigger id="recipient_type" className="bg-[#1a1a1a] border-[#2b2b2b] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-[#2b2b2b]">
                  <SelectItem value="customer" className="text-white hover:bg-[#2b2b2b]">Customer</SelectItem>
                  <SelectItem value="admin" className="text-white hover:bg-[#2b2b2b]">Admin</SelectItem>
                  <SelectItem value="both" className="text-white hover:bg-[#2b2b2b]">Both (Customer & Admin)</SelectItem>
                  <SelectItem value="custom" className="text-white hover:bg-[#2b2b2b]">Custom Email Address</SelectItem>
                </SelectContent>
              </Select>
              {selectedTemplate.recipient_type === 'custom' && (
                <div className="mt-2">
                  <Input
                    id="custom_recipient_email"
                    type="email"
                    value={selectedTemplate.custom_recipient_email || ''}
                    onChange={(e) => setSelectedTemplate({
                      ...selectedTemplate,
                      custom_recipient_email: e.target.value
                    })}
                    placeholder="email@example.com"
                    className="bg-[#1a1a1a] border-[#2b2b2b] text-white"
                  />
                  <p className="text-xs text-[#999999] mt-1">
                    Specific email address to send to
                  </p>
                </div>
              )}
              <p className="text-xs text-[#999999] mt-1">
                Choose who receives this email
              </p>
            </div>

            <div className="border-t pt-4">
              <Label>Template Info</Label>
              <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                <div>
                  <span className="text-[#999999]">Type:</span>{' '}
                  <code className="text-xs text-white">{selectedTemplate.type}</code>
                </div>
                <div>
                  <span className="text-[#999999]">Status:</span>{' '}
                  <Badge 
                    variant={selectedTemplate.is_active ? 'default' : 'secondary'}
                    className={`ml-1 ${selectedTemplate.is_active ? 'bg-[#c5303b] text-white' : 'bg-[#2b2b2b] text-[#999999]'}`}
                  >
                    {selectedTemplate.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
              
              {/* Toggle to Enable/Disable Email */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#2b2b2b]">
                <div className="space-y-0.5">
                  <Label htmlFor="email-active-toggle" className="text-white">
                    Enable Email Template
                  </Label>
                  <p className="text-xs text-[#999999]">
                    {selectedTemplate.is_active 
                      ? 'This email will be sent automatically when triggered'
                      : 'This email is disabled and will not be sent'}
                  </p>
                </div>
                <Switch
                  id="email-active-toggle"
                  checked={selectedTemplate.is_active}
                  onCheckedChange={(checked) => {
                    setSelectedTemplate({
                      ...selectedTemplate,
                      is_active: checked
                    });
                  }}
                  className="data-[state=checked]:bg-[#c5303b]"
                />
              </div>
            </div>

            {/* Save Template Button - At the bottom */}
            <div className="border-t pt-4 mt-4">
              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="w-full bg-[#c5303b] hover:bg-[#a02630] text-white"
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
          </CardContent>
          </Card>

          {/* Email Preview */}
          <Card className="bg-[#1a1a1a] border-[#2b2b2b] mb-20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Eye className="h-5 w-5" />
                Email Preview
              </CardTitle>
              <CardDescription className="text-[#999999]">
                Preview of how the email will look
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-gray-700 rounded-lg overflow-hidden bg-black">
                <div className="bg-gray-900 p-2 border-b border-gray-700 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <div className="ml-auto text-xs text-gray-400">
                    Preview
                  </div>
                </div>
                {/* Email Wrapper - Black Background */}
                <div className="bg-black p-[50px_20px]" style={{ fontFamily: "'Roboto', 'Helvetica Neue', Arial, sans-serif" }}>
                  {/* Email Container */}
                  <div className="max-w-[600px] mx-auto bg-[#0a0a0a] rounded-xl overflow-hidden shadow-2xl">
                    {/* Logo Header - No Red Background */}
                    <div className="px-10 pt-10 pb-5 text-center border-b border-[#1a1a1a]">
                      <img 
                        src="/SimFab-logo-red-black-min-crop.svg" 
                        alt="SimFab" 
                        className="max-w-[160px] mx-auto h-auto"
                      />
                    </div>
                    {/* Content Area */}
                    <div className="px-10 py-12 bg-[#0a0a0a] max-h-[500px] overflow-y-auto">
                      <style>{`
                        .email-preview {
                          color: #ffffff;
                        }
                        .email-preview h1 {
                          color: #ffffff;
                          font-size: 28px;
                          margin: 0 0 8px 0;
                          font-weight: 700;
                          letter-spacing: -0.5px;
                        }
                        .email-preview h2, .email-preview h3 {
                          color: #c5303b;
                          margin: 16px 0;
                          font-size: 24px;
                        }
                        .email-preview p {
                          line-height: 1.6;
                          margin: 12px 0;
                          color: #cccccc;
                          font-size: 16px;
                        }
                        .email-preview strong {
                          font-weight: 600;
                          color: #ffffff;
                        }
                        .email-preview ul, .email-preview ol {
                          margin: 12px 0;
                          padding-left: 24px;
                          color: #cccccc;
                        }
                        .email-preview table {
                          width: 100%;
                          border-collapse: collapse;
                          margin: 16px 0;
                        }
                        .email-preview th, .email-preview td {
                          padding: 8px 12px;
                          text-align: left;
                          border-bottom: 1px solid #1a1a1a;
                          color: #cccccc;
                        }
                        .email-preview th {
                          background-color: #1a1a1a;
                          font-weight: 600;
                          color: #ffffff;
                        }
                        .email-preview a {
                          color: #c5303b;
                          text-decoration: none;
                        }
                        .email-preview .order-info {
                          background: #1a1a1a;
                          padding: 16px;
                          border-radius: 8px;
                          margin: 16px 0;
                          border-left: 3px solid #c5303b;
                        }
                        .email-preview .highlight {
                          color: #c5303b;
                          font-weight: 600;
                        }
                      `}</style>
                  <div 
                    className="email-preview"
                    dangerouslySetInnerHTML={{ 
                      __html: selectedTemplate.html_body
                        .replace(/\{\{order_number\}\}/g, '<span style="color: #c5303b; font-weight: 600;">SF-20240101-00001</span>')
                        .replace(/\{\{customer_name\}\}/g, 'John Doe')
                        .replace(/\{\{customer_email\}\}/g, 'customer@example.com')
                        .replace(/\{\{order_total\}\}/g, '<strong style="color: #c5303b;">$199.99</strong>')
                        .replace(/\{\{order_date\}\}/g, new Date().toLocaleDateString())
                        .replace(/\{\{subtotal\}\}/g, '$179.99')
                        .replace(/\{\{tax_amount\}\}/g, '$14.40')
                        .replace(/\{\{shipping_amount\}\}/g, '$5.60')
                        .replace(/\{\{discount_amount\}\}/g, '$0.00')
                        .replace(/\{\{tracking_number\}\}/g, '<code style="background: #f3f4f6; padding: 2px 6px; border-radius: 3px;">1Z999AA10123456784</code>')
                        .replace(/\{\{carrier\}\}/g, 'UPS')
                        .replace(/\{\{reset_url\}\}/g, 'https://simfab.com/reset-password?token=xxx')
                        .replace(/\{\{login_url\}\}/g, 'https://simfab.com/login')
                        .replace(/\{\{note\}\}/g, 'This is a sample note from the admin.')
                        .replace(/\{\{refund_amount\}\}/g, '<strong style="color: #c5303b;">$199.99</strong>')
                        .replace(/\{\{error_message\}\}/g, 'Payment declined')
                        .replace(/\{\{cancellation_reason\}\}/g, 'Customer request')
                        .replace(/\{\{expire_hours\}\}/g, '15 minutes')
                        .replace(/\{\{cart_total\}\}/g, '<strong style="color: #c5303b;">$199.99</strong>')
                        .replace(/\{\{item_count\}\}/g, '3')
                        .replace(/\{\{cart_url\}\}/g, 'https://simfab.com/cart?region=us')
                        .replace(/\{\{cart_id\}\}/g, '12345')
                    }} 
                      />
                    </div>
                    {/* Footer */}
                    <div className="px-10 py-10 bg-black text-center border-t border-[#1a1a1a]">
                      <p className="text-[#888888] text-xs mb-2">
                        &copy; {new Date().getFullYear()} SimFab. All rights reserved.
                      </p>
                      <p className="text-[#888888] text-xs mb-2">
                        Questions? <a href="mailto:info@simfab.com" className="text-[#c5303b] no-underline">info@simfab.com</a>
                      </p>
                      <p className="text-[#888888] text-xs">
                        <a href="#" className="text-[#c5303b] no-underline font-medium">Visit SimFab.com</a>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-[#999999] mt-2">
                This preview shows sample data. Variables will be replaced with actual values when sent.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Template Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-[#1a1a1a] border-[#2b2b2b] text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Create New Email Template</DialogTitle>
            <DialogDescription className="text-[#999999]">
              Create a custom email template for your business
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new_type" className="text-white">Template Type (Unique ID)</Label>
                <Input
                  id="new_type"
                  value={newTemplate.type}
                  onChange={(e) => setNewTemplate({ ...newTemplate, type: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  placeholder="e.g., custom_notification"
                  className="bg-[#0a0a0a] border-[#2b2b2b] text-white"
                />
                <p className="text-xs text-[#999999] mt-1">Lowercase, underscores only (e.g., order_custom)</p>
              </div>
              <div>
                <Label htmlFor="new_name" className="text-white">Template Name</Label>
                <Input
                  id="new_name"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  placeholder="e.g., Custom Notification"
                  className="bg-[#0a0a0a] border-[#2b2b2b] text-white"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="new_description" className="text-white">Description</Label>
              <Input
                id="new_description"
                value={newTemplate.description || ''}
                onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                placeholder="Brief description of when this email is used"
                className="bg-[#0a0a0a] border-[#2b2b2b] text-white"
              />
            </div>

            <div>
              <Label htmlFor="new_subject" className="text-white">Subject Line</Label>
              <Input
                id="new_subject"
                value={newTemplate.subject}
                onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })}
                placeholder="Email Subject - Use {{variable}} for dynamic content"
                className="bg-[#0a0a0a] border-[#2b2b2b] text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new_trigger" className="text-white">Triggered On</Label>
                <Select
                  value={newTemplate.trigger_event || 'manual'}
                  onValueChange={(value) => setNewTemplate({ ...newTemplate, trigger_event: value })}
                >
                  <SelectTrigger className="bg-[#0a0a0a] border-[#2b2b2b] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-[#2b2b2b]">
                    {TRIGGER_EVENTS.map((event) => (
                      <SelectItem key={event.value} value={event.value} className="text-white hover:bg-[#2b2b2b]">
                        {event.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="new_recipient" className="text-white">Send To</Label>
                <Select
                  value={newTemplate.recipient_type || 'customer'}
                  onValueChange={(value) => setNewTemplate({
                    ...newTemplate,
                    recipient_type: value as 'admin' | 'customer' | 'both' | 'custom'
                  })}
                >
                  <SelectTrigger className="bg-[#0a0a0a] border-[#2b2b2b] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-[#2b2b2b]">
                    <SelectItem value="customer" className="text-white hover:bg-[#2b2b2b]">Customer</SelectItem>
                    <SelectItem value="admin" className="text-white hover:bg-[#2b2b2b]">Admin</SelectItem>
                    <SelectItem value="both" className="text-white hover:bg-[#2b2b2b]">Both</SelectItem>
                    <SelectItem value="custom" className="text-white hover:bg-[#2b2b2b]">Custom Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(newTemplate.recipient_type === 'custom') && (
              <div>
                <Label htmlFor="new_custom_email" className="text-white">Custom Email Address</Label>
                <Input
                  id="new_custom_email"
                  type="email"
                  value={newTemplate.custom_recipient_email || ''}
                  onChange={(e) => setNewTemplate({ ...newTemplate, custom_recipient_email: e.target.value })}
                  placeholder="email@example.com"
                  className="bg-[#0a0a0a] border-[#2b2b2b] text-white"
                />
              </div>
            )}

            <div>
              <Label htmlFor="new_html_body" className="text-white">HTML Body</Label>
              <Textarea
                id="new_html_body"
                rows={10}
                value={newTemplate.html_body}
                onChange={(e) => setNewTemplate({ ...newTemplate, html_body: e.target.value })}
                placeholder="HTML email content - Use {{variable}} for dynamic content"
                className="bg-[#0a0a0a] border-[#2b2b2b] text-white font-mono text-sm"
              />
              <p className="text-xs text-[#999999] mt-1">
                The content will be wrapped with SimFab branding automatically
              </p>
            </div>

            <div className="flex gap-2 pt-4 border-t border-[#2b2b2b]">
              <Button
                onClick={handleCreateTemplate}
                disabled={creating}
                className="flex-1 bg-[#c5303b] hover:bg-[#d42a37] text-white"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Template
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                className="border-[#2b2b2b] text-white hover:bg-[#2b2b2b]"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

