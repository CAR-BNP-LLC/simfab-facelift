/**
 * Settings Tab Component
 * Manages region-specific settings for US and EU
 */

import { useState, useEffect } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { regionSettingsAPI } from '@/services/api';

interface WarehouseAddress {
  streetLines: string[];
  city: string;
  stateOrProvinceCode: string;
  postalCode: string;
  countryCode: string;
}

interface SettingsForm {
  admin_email: string;
  phone_number: string;
  phone_display: string;
  company_name: string;
  address: string;
  currency: string;
  tax_rate: string;
  free_shipping_threshold: string;
  site_name: string;
  fedex_warehouse_address?: WarehouseAddress;
}

export default function SettingsTab() {
  const [activeRegion, setActiveRegion] = useState<'us' | 'eu'>('us');
  const [usSettings, setUsSettings] = useState<SettingsForm>({
    admin_email: '',
    phone_number: '',
    phone_display: '',
    company_name: '',
    address: '',
    currency: 'USD',
    tax_rate: '0.08',
    free_shipping_threshold: '500',
    site_name: 'SimFab',
    fedex_warehouse_address: {
      streetLines: [''],
      city: '',
      stateOrProvinceCode: '',
      postalCode: '',
      countryCode: 'US',
    },
  });
  const [euSettings, setEuSettings] = useState<SettingsForm>({
    admin_email: '',
    phone_number: '',
    phone_display: '',
    company_name: '',
    address: '',
    currency: 'EUR',
    tax_rate: '0.19',
    free_shipping_threshold: '500',
    site_name: 'SimFab',
    fedex_warehouse_address: {
      streetLines: [''],
      city: '',
      stateOrProvinceCode: '',
      postalCode: '',
      countryCode: 'US',
    },
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings('us');
    fetchSettings('eu');
  }, []);

  const fetchSettings = async (region: 'us' | 'eu') => {
    setLoading(true);
    try {
      const response = await regionSettingsAPI.getSettings(region);
      
      if (response.success && response.data.settings) {
        const settings = response.data.settings;
        const formData: SettingsForm = {
          admin_email: settings.admin_email || '',
          phone_number: settings.phone_number || '',
          phone_display: settings.phone_display || '',
          company_name: settings.company_name || '',
          address: settings.address || '',
          currency: settings.currency || (region === 'eu' ? 'EUR' : 'USD'),
          tax_rate: settings.tax_rate?.toString() || (region === 'eu' ? '0.19' : '0.08'),
          free_shipping_threshold: settings.free_shipping_threshold?.toString() || '500',
          site_name: settings.site_name || 'SimFab',
          fedex_warehouse_address: settings.fedex_warehouse_address || {
            streetLines: [''],
            city: '',
            stateOrProvinceCode: '',
            postalCode: '',
            countryCode: region === 'eu' ? 'DE' : 'US',
          },
        };

        if (region === 'us') {
          setUsSettings(formData);
        } else {
          setEuSettings(formData);
        }
      }
    } catch (error) {
      console.error(`Failed to fetch ${region} settings:`, error);
      toast({
        title: 'Error',
        description: `Failed to load ${region.toUpperCase()} settings`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (region: 'us' | 'eu') => {
    setSaving(true);
    try {
      const settings = region === 'us' ? usSettings : euSettings;
      
      // Prepare settings object (only include defined values)
      const settingsToUpdate: Record<string, any> = {};
      Object.entries(settings).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          // Convert numeric strings to numbers where appropriate
          if (key === 'tax_rate' || key === 'free_shipping_threshold') {
            settingsToUpdate[key] = parseFloat(value) || 0;
          } else if (key === 'fedex_warehouse_address') {
            // Keep warehouse address as object for JSON type
            settingsToUpdate[key] = value;
          } else {
            settingsToUpdate[key] = value;
          }
        }
      });

      const response = await regionSettingsAPI.updateSettings(region, settingsToUpdate);

      if (response.success) {
        toast({
          title: 'Success',
          description: `${region.toUpperCase()} settings saved successfully`,
        });
        
        // Refresh settings
        await fetchSettings(region);
      }
    } catch (error: any) {
      console.error(`Failed to save ${region} settings:`, error);
      toast({
        title: 'Error',
        description: error.message || `Failed to save ${region.toUpperCase()} settings`,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const currentSettings = activeRegion === 'us' ? usSettings : euSettings;
  const setCurrentSettings = activeRegion === 'us' ? setUsSettings : setEuSettings;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Region Settings</CardTitle>
          <CardDescription>
            Manage settings for US and EU regions. Each region operates as a separate company under the SimFab brand.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeRegion} onValueChange={(v) => setActiveRegion(v as 'us' | 'eu')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="us">US Settings</TabsTrigger>
              <TabsTrigger value="eu">EU Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="us" className="space-y-6 mt-6">
              <div className="grid gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
                  <div className="grid gap-4">
                    <div>
                      <Label htmlFor="us_admin_email">Admin Email</Label>
                      <Input
                        id="us_admin_email"
                        type="email"
                        value={usSettings.admin_email}
                        onChange={(e) => setUsSettings({ ...usSettings, admin_email: e.target.value })}
                        placeholder="info@simfab.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="us_phone_number">Phone Number</Label>
                      <Input
                        id="us_phone_number"
                        value={usSettings.phone_number}
                        onChange={(e) => setUsSettings({ ...usSettings, phone_number: e.target.value })}
                        placeholder="1-888-299-2746"
                      />
                    </div>
                    <div>
                      <Label htmlFor="us_phone_display">Phone Display Text</Label>
                      <Input
                        id="us_phone_display"
                        value={usSettings.phone_display}
                        onChange={(e) => setUsSettings({ ...usSettings, phone_display: e.target.value })}
                        placeholder="Toll free for USA & Canada: 1-888-299-2746"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        This text will be displayed to users on the website
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Business Information</h3>
                  <div className="grid gap-4">
                    <div>
                      <Label htmlFor="us_company_name">Company Name</Label>
                      <Input
                        id="us_company_name"
                        value={usSettings.company_name}
                        onChange={(e) => setUsSettings({ ...usSettings, company_name: e.target.value })}
                        placeholder="SimFab US"
                      />
                    </div>
                    <div>
                      <Label htmlFor="us_address">Address</Label>
                      <Input
                        id="us_address"
                        value={usSettings.address}
                        onChange={(e) => setUsSettings({ ...usSettings, address: e.target.value })}
                        placeholder="123 Business St, Miami, FL 33101"
                      />
                    </div>
                    <div>
                      <Label htmlFor="us_site_name">Site Name</Label>
                      <Input
                        id="us_site_name"
                        value={usSettings.site_name}
                        onChange={(e) => setUsSettings({ ...usSettings, site_name: e.target.value })}
                        placeholder="SimFab"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Warehouse Address (FedEx)</h3>
                  <CardDescription className="mb-4">
                    This address is used as the ship-from address for FedEx shipping calculations.
                  </CardDescription>
                  <div className="grid gap-4">
                    <div>
                      <Label htmlFor="us_warehouse_street">Street Address *</Label>
                      <Input
                        id="us_warehouse_street"
                        value={usSettings.fedex_warehouse_address?.streetLines[0] || ''}
                        onChange={(e) => setUsSettings({
                          ...usSettings,
                          fedex_warehouse_address: {
                            ...usSettings.fedex_warehouse_address!,
                            streetLines: [e.target.value]
                          }
                        })}
                        placeholder="123 Business St"
                      />
                    </div>
                    <div>
                      <Label htmlFor="us_warehouse_city">City *</Label>
                      <Input
                        id="us_warehouse_city"
                        value={usSettings.fedex_warehouse_address?.city || ''}
                        onChange={(e) => setUsSettings({
                          ...usSettings,
                          fedex_warehouse_address: {
                            ...usSettings.fedex_warehouse_address!,
                            city: e.target.value
                          }
                        })}
                        placeholder="Miami"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="us_warehouse_state">State/Province Code *</Label>
                        <Input
                          id="us_warehouse_state"
                          value={usSettings.fedex_warehouse_address?.stateOrProvinceCode || ''}
                          onChange={(e) => setUsSettings({
                            ...usSettings,
                            fedex_warehouse_address: {
                              ...usSettings.fedex_warehouse_address!,
                              stateOrProvinceCode: e.target.value
                            }
                          })}
                          placeholder="FL"
                          maxLength={2}
                        />
                      </div>
                      <div>
                        <Label htmlFor="us_warehouse_postal">Postal Code *</Label>
                        <Input
                          id="us_warehouse_postal"
                          value={usSettings.fedex_warehouse_address?.postalCode || ''}
                          onChange={(e) => setUsSettings({
                            ...usSettings,
                            fedex_warehouse_address: {
                              ...usSettings.fedex_warehouse_address!,
                              postalCode: e.target.value
                            }
                          })}
                          placeholder="33101"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="us_warehouse_country">Country Code *</Label>
                      <Input
                        id="us_warehouse_country"
                        value={usSettings.fedex_warehouse_address?.countryCode || 'US'}
                        onChange={(e) => setUsSettings({
                          ...usSettings,
                          fedex_warehouse_address: {
                            ...usSettings.fedex_warehouse_address!,
                            countryCode: e.target.value.toUpperCase()
                          }
                        })}
                        placeholder="US"
                        maxLength={2}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={() => handleSave('us')} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save US Settings
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="eu" className="space-y-6 mt-6">
              <div className="grid gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
                  <div className="grid gap-4">
                    <div>
                      <Label htmlFor="eu_admin_email">Admin Email</Label>
                      <Input
                        id="eu_admin_email"
                        type="email"
                        value={euSettings.admin_email}
                        onChange={(e) => setEuSettings({ ...euSettings, admin_email: e.target.value })}
                        placeholder="info@simfab.eu"
                      />
                    </div>
                    <div>
                      <Label htmlFor="eu_phone_number">Phone Number</Label>
                      <Input
                        id="eu_phone_number"
                        value={euSettings.phone_number}
                        onChange={(e) => setEuSettings({ ...euSettings, phone_number: e.target.value })}
                        placeholder="+49-XXX-XXXXXXX"
                      />
                    </div>
                    <div>
                      <Label htmlFor="eu_phone_display">Phone Display Text</Label>
                      <Input
                        id="eu_phone_display"
                        value={euSettings.phone_display}
                        onChange={(e) => setEuSettings({ ...euSettings, phone_display: e.target.value })}
                        placeholder="EU Support: +49-XXX-XXXXXXX"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        This text will be displayed to users on the website
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Business Information</h3>
                  <div className="grid gap-4">
                    <div>
                      <Label htmlFor="eu_company_name">Company Name</Label>
                      <Input
                        id="eu_company_name"
                        value={euSettings.company_name}
                        onChange={(e) => setEuSettings({ ...euSettings, company_name: e.target.value })}
                        placeholder="SimFab EU"
                      />
                    </div>
                    <div>
                      <Label htmlFor="eu_address">Address</Label>
                      <Input
                        id="eu_address"
                        value={euSettings.address}
                        onChange={(e) => setEuSettings({ ...euSettings, address: e.target.value })}
                        placeholder="Business Address, City, Country"
                      />
                    </div>
                    <div>
                      <Label htmlFor="eu_site_name">Site Name</Label>
                      <Input
                        id="eu_site_name"
                        value={euSettings.site_name}
                        onChange={(e) => setEuSettings({ ...euSettings, site_name: e.target.value })}
                        placeholder="SimFab"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Warehouse Address (FedEx)</h3>
                  <CardDescription className="mb-4">
                    This address is used as the ship-from address for FedEx shipping calculations.
                  </CardDescription>
                  <div className="grid gap-4">
                    <div>
                      <Label htmlFor="eu_warehouse_street">Street Address *</Label>
                      <Input
                        id="eu_warehouse_street"
                        value={euSettings.fedex_warehouse_address?.streetLines[0] || ''}
                        onChange={(e) => setEuSettings({
                          ...euSettings,
                          fedex_warehouse_address: {
                            ...euSettings.fedex_warehouse_address!,
                            streetLines: [e.target.value]
                          }
                        })}
                        placeholder="123 Business St"
                      />
                    </div>
                    <div>
                      <Label htmlFor="eu_warehouse_city">City *</Label>
                      <Input
                        id="eu_warehouse_city"
                        value={euSettings.fedex_warehouse_address?.city || ''}
                        onChange={(e) => setEuSettings({
                          ...euSettings,
                          fedex_warehouse_address: {
                            ...euSettings.fedex_warehouse_address!,
                            city: e.target.value
                          }
                        })}
                        placeholder="Berlin"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="eu_warehouse_state">State/Province Code</Label>
                        <Input
                          id="eu_warehouse_state"
                          value={euSettings.fedex_warehouse_address?.stateOrProvinceCode || ''}
                          onChange={(e) => setEuSettings({
                            ...euSettings,
                            fedex_warehouse_address: {
                              ...euSettings.fedex_warehouse_address!,
                              stateOrProvinceCode: e.target.value
                            }
                          })}
                          placeholder="BE"
                          maxLength={2}
                        />
                      </div>
                      <div>
                        <Label htmlFor="eu_warehouse_postal">Postal Code *</Label>
                        <Input
                          id="eu_warehouse_postal"
                          value={euSettings.fedex_warehouse_address?.postalCode || ''}
                          onChange={(e) => setEuSettings({
                            ...euSettings,
                            fedex_warehouse_address: {
                              ...euSettings.fedex_warehouse_address!,
                              postalCode: e.target.value
                            }
                          })}
                          placeholder="10115"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="eu_warehouse_country">Country Code *</Label>
                      <Input
                        id="eu_warehouse_country"
                        value={euSettings.fedex_warehouse_address?.countryCode || 'DE'}
                        onChange={(e) => setEuSettings({
                          ...euSettings,
                          fedex_warehouse_address: {
                            ...euSettings.fedex_warehouse_address!,
                            countryCode: e.target.value.toUpperCase()
                          }
                        })}
                        placeholder="DE"
                        maxLength={2}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={() => handleSave('eu')} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save EU Settings
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

