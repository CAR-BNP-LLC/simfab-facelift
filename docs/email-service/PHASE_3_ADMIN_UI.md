# Phase 3: Admin UI

**Goal**: Build admin interface for managing email templates  
**Time**: 2-3 hours  
**Priority**: HIGH

---

## 📋 Tasks

- [ ] Add "Email Templates" tab to `src/pages/Admin.tsx`
- [ ] Create `src/components/admin/EmailTemplatesTab.tsx`
- [ ] Create template list view
- [ ] Create template editor with subject and HTML body
- [ ] Add test email functionality
- [ ] Add toggle for active/inactive
- [ ] Add save functionality

---

## 🎨 UI Design

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Admin Dashboard                                             │
├────┬────────────────────────────────────────────────────────┤
│    │ Email Templates                            [+ Create] │
│ ✓  │                                                    ┌──┐│
│    │ ✓ New Order (Admin)          Active  │ Admin    │ │  ││
│    │ ✓ Cancelled Order                   Active  │ Customer ││
│    │ ✓ Failed Order                   Inactive│ Customer ││
│    │   Processing Order               Active  │ Customer ││
│    │   Completed Order                Active  │ Customer ││
│    │   Refunded Order                 Active  │ Customer ││
│    │   Reset Password                 Active  │ Customer ││
│    │   New Account                    Active  │ Customer ││
│    │                                                    └──┘│
│    │ Edit Template: New Order (Admin)                    │
│    │ Subject: [New Order #{{order_number}}___]           │
│    │                                                       │
│    │ HTML Body:                                            │
│    │ ┌────────────────────────────────────────────┐       │
│    │ │ <h2>New Order Received!</h2>              │       │
│    │ │ <p>Order #{{order_number}}</p>            │       │
│    │ │ <p>Customer: {{customer_name}}</p>        │       │
│    │ └────────────────────────────────────────────┘       │
│    │                                                       │
│    │ [ Save Template ]  [ Send Test ]  [ Preview ]       │
│    │                                                       │
│    │ Test Email: [test@example.com___]                   │
└────┴────────────────────────────────────────────────────────┘
```

---

## 💻 Implementation

### Component: `src/components/admin/EmailTemplatesTab.tsx`

```typescript
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface EmailTemplate {
  id: number;
  type: string;
  name: string;
  description: string;
  subject: string;
  html_body: string;
  recipient_type: 'admin' | 'customer';
  is_active: boolean;
}

export default function EmailTemplatesTab() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/email-templates`);
      const data = await res.json();
      setTemplates(data);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;
    
    try {
      const res = await fetch(
        `${API_URL}/api/admin/email-templates/${selectedTemplate.type}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: selectedTemplate.subject,
            html_body: selectedTemplate.html_body,
            is_active: selectedTemplate.is_active
          })
        }
      );
      
      if (res.ok) {
        toast({ title: 'Template saved successfully' });
        fetchTemplates();
      }
    } catch (error) {
      toast({ title: 'Error saving template', variant: 'destructive' });
    }
  };

  const handleTest = async () => {
    if (!selectedTemplate || !testEmail) return;
    
    try {
      const res = await fetch(
        `${API_URL}/api/admin/email-templates/${selectedTemplate.type}/test`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipientEmail: testEmail })
        }
      );
      
      if (res.ok) {
        toast({ title: 'Test email sent successfully' });
      }
    } catch (error) {
      toast({ title: 'Error sending test email', variant: 'destructive' });
    }
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Template List */}
      <Card>
        <CardHeader>
          <CardTitle>Email Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {templates.map((template) => (
              <div
                key={template.id}
                onClick={() => setSelectedTemplate(template)}
                className={`p-3 border rounded cursor-pointer hover:bg-gray-50 ${
                  selectedTemplate?.id === template.id ? 'bg-blue-50 border-blue-300' : ''
                }`}
              >
                <div className="font-medium">{template.name}</div>
                <div className="text-sm text-gray-500">{template.description}</div>
                <div className="flex gap-2 mt-2">
                  <Badge variant={template.is_active ? 'default' : 'secondary'}>
                    {template.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  <Badge>{template.recipient_type}</Badge>
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
            <CardTitle>Edit Template: {selectedTemplate.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Subject</Label>
                <Input
                  value={selectedTemplate.subject}
                  onChange={(e) => setSelectedTemplate({
                    ...selectedTemplate,
                    subject: e.target.value
                  })}
                />
              </div>
              
              <div>
                <Label>HTML Body</Label>
                <Textarea
                  rows={20}
                  value={selectedTemplate.html_body}
                  onChange={(e) => setSelectedTemplate({
                    ...selectedTemplate,
                    html_body: e.target.value
                  })}
                />
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleSave}>Save Template</Button>
                <Button variant="outline" onClick={handleTest}>
                  Send Test
                </Button>
              </div>
              
              <div>
                <Label>Test Email</Label>
                <Input
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@example.com"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

---

### Update `src/pages/Admin.tsx`

Add to the tabs:

```typescript
import EmailTemplatesTab from '@/components/admin/EmailTemplatesTab';

// In the Admin component, add new tab
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList>
    <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
    <TabsTrigger value="orders">Orders</TabsTrigger>
    <TabsTrigger value="products">Products</TabsTrigger>
    <TabsTrigger value="email-templates">Email Templates</TabsTrigger>
    <TabsTrigger value="settings">Settings</TabsTrigger>
  </TabsList>
  
  <TabsContent value="email-templates">
    <EmailTemplatesTab />
  </TabsContent>
</Tabs>
```

---

## ✅ Success Criteria

- [x] Email templates tab visible in admin dashboard
- [x] Can view all templates in list
- [x] Can select template to edit
- [x] Can edit subject and HTML body
- [x] Can save changes
- [x] Can send test emails
- [x] UI is responsive and user-friendly

---

**Next Phase**: [Phase 4: Integration](./PHASE_4_INTEGRATION.md)

