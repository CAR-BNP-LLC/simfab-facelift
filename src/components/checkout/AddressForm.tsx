import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin } from 'lucide-react';
import { Country, State, City } from 'country-state-city';
import { Address } from '@/contexts/CheckoutContext';

interface AddressFormProps {
  title: string;
  address: Address;
  onAddressChange: (field: keyof Address, value: string) => void;
  required?: boolean;
}

export const AddressForm: React.FC<AddressFormProps> = ({
  title,
  address,
  onAddressChange,
  required = true
}) => {
  const [countries, setCountries] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [selectedCountry, setSelectedCountry] = useState(address.country || '');
  const [selectedState, setSelectedState] = useState(address.state || '');
  const [selectedCity, setSelectedCity] = useState(address.city || '');

  // Load countries on component mount
  useEffect(() => {
    const allCountries = Country.getAllCountries();
    setCountries(allCountries);
    
    // Set initial country if address.country is provided
    if (address.country) {
      const country = allCountries.find(c => c.isoCode === address.country);
      if (country) {
        setSelectedCountry(country.isoCode);
        loadStates(country.isoCode);
      }
    }
  }, [address.country]);

  // Load states when country changes
  const loadStates = (countryCode: string) => {
    const countryStates = State.getStatesOfCountry(countryCode);
    setStates(countryStates);
    setCities([]); // Clear cities when country changes
    setSelectedState('');
    setSelectedCity('');
  };

  // Load cities when state changes
  const loadCities = (countryCode: string, stateCode: string) => {
    const stateCities = City.getCitiesOfState(countryCode, stateCode);
    setCities(stateCities);
    setSelectedCity('');
  };

  const handleCountryChange = (countryCode: string) => {
    setSelectedCountry(countryCode);
    setSelectedState('');
    setSelectedCity('');
    setStates([]);
    setCities([]);
    onAddressChange('country', countryCode);
    onAddressChange('state', '');
    onAddressChange('city', '');
    if (countryCode) {
      loadStates(countryCode);
    }
  };

  const handleStateChange = (stateCode: string) => {
    setSelectedState(stateCode);
    setSelectedCity('');
    setCities([]);
    onAddressChange('state', stateCode);
    onAddressChange('city', '');
    if (stateCode && selectedCountry) {
      loadCities(selectedCountry, stateCode);
    }
  };

  const handleCityChange = (cityName: string) => {
    setSelectedCity(cityName);
    onAddressChange('city', cityName);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Name Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name {required && '*'}</Label>
              <Input
                id="firstName"
                value={address.firstName}
                onChange={(e) => onAddressChange('firstName', e.target.value)}
                required={required}
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name {required && '*'}</Label>
              <Input
                id="lastName"
                value={address.lastName}
                onChange={(e) => onAddressChange('lastName', e.target.value)}
                required={required}
              />
            </div>
          </div>

          {/* Company Field */}
          <div>
            <Label htmlFor="company">Company (optional)</Label>
            <Input
              id="company"
              value={address.company || ''}
              onChange={(e) => onAddressChange('company', e.target.value)}
            />
          </div>

          {/* Address Fields */}
          <div>
            <Label htmlFor="addressLine1">Street Address {required && '*'}</Label>
            <Input
              id="addressLine1"
              placeholder="123 Main Street"
              value={address.addressLine1}
              onChange={(e) => onAddressChange('addressLine1', e.target.value)}
              required={required}
            />
          </div>

          <div>
            <Label htmlFor="addressLine2">Apartment, suite, etc. (optional)</Label>
            <Input
              id="addressLine2"
              placeholder="Apt 4B"
              value={address.addressLine2 || ''}
              onChange={(e) => onAddressChange('addressLine2', e.target.value)}
            />
          </div>

          {/* Country Selection */}
          <div>
            <Label htmlFor="country">Country {required && '*'}</Label>
            <Select
              value={selectedCountry}
              onValueChange={handleCountryChange}
              required={required}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {countries.map((country) => (
                  <SelectItem key={country.isoCode} value={country.isoCode}>
                    {country.flag} {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* State/Province Selection */}
          <div>
            <Label htmlFor="state">State/Province {required && '*'}</Label>
            <Select
              value={selectedState}
              onValueChange={handleStateChange}
              disabled={!selectedCountry || states.length === 0}
              required={required}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select state/province" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {states.map((state) => (
                  <SelectItem key={state.isoCode} value={state.isoCode}>
                    {state.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* City Selection */}
          <div>
            <Label htmlFor="city">City {required && '*'}</Label>
            <Select
              value={selectedCity}
              onValueChange={handleCityChange}
              disabled={!selectedState || cities.length === 0}
              required={required}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select city" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {cities.map((city) => (
                  <SelectItem key={city.name} value={city.name}>
                    {city.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Postal Code */}
          <div>
            <Label htmlFor="postalCode">Postal Code {required && '*'}</Label>
            <Input
              id="postalCode"
              placeholder="10001"
              value={address.postalCode}
              onChange={(e) => onAddressChange('postalCode', e.target.value)}
              required={required}
            />
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone {required && '*'}</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1-555-0123"
                value={address.phone}
                onChange={(e) => onAddressChange('phone', e.target.value)}
                required={required}
              />
            </div>
            <div>
              <Label htmlFor="email">Email {required && '*'}</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={address.email}
                onChange={(e) => onAddressChange('email', e.target.value)}
                required={required}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
