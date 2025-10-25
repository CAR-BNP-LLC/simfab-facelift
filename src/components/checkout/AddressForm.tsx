import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, ChevronDown, Check } from 'lucide-react';
import { Country, State, City } from 'country-state-city';
import { Address } from '@/contexts/CheckoutContext';

interface AddressFormProps {
  title: string;
  address: Address;
  onAddressChange: (field: keyof Address, value: string) => void;
  onAddressBatchChange?: (updates: Partial<Address>) => void;
  required?: boolean;
}

// Searchable Select Component
interface SearchableSelectProps {
  options: Array<{ value: string; label: string; flag?: string }>;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  required?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get selected option label
  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full flex items-center justify-between px-3 py-2 text-sm border border-input bg-background rounded-md hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={value ? '' : 'text-muted-foreground'}>
          {selectedOption ? `${selectedOption.flag || ''} ${selectedOption.label}` : placeholder}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-black border border-border rounded-md shadow-md max-h-60 overflow-auto">
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border-b border-gray-700 bg-black text-white placeholder-gray-400 focus:outline-none focus:ring-0"
            autoFocus
          />
          <div className="max-h-48 overflow-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-800 flex items-center gap-2"
                >
                  {value === option.value && <Check className="h-4 w-4" />}
                  {option.flag && <span>{option.flag}</span>}
                  <span className={value === option.value ? 'font-medium' : ''}>{option.label}</span>
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-gray-400">No results found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const AddressForm: React.FC<AddressFormProps> = ({
  title,
  address,
  onAddressChange,
  onAddressBatchChange,
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
        // Load states but don't clear the address values
        const countryStates = State.getStatesOfCountry(country.isoCode);
        setStates(countryStates);
        
        // If we have a state, load cities for it
        if (address.state) {
          const state = countryStates.find(s => s.name === address.state);
          if (state) {
            const stateCities = City.getCitiesOfState(country.isoCode, state.isoCode);
            setCities(stateCities);
          }
        }
      }
    }
  }, []); // Run only once on mount



  // Load states when country changes
  const loadStates = (countryCode: string) => {
    const countryStates = State.getStatesOfCountry(countryCode);
    setStates(countryStates);
    // Only clear cities if we don't have a state selected
    if (!address.state) {
      setCities([]);
      setSelectedState('');
      setSelectedCity('');
    } else {
      // If we have a state, load cities for it
      const state = countryStates.find(s => s.name === address.state);
      if (state) {
        const stateCities = City.getCitiesOfState(countryCode, state.isoCode);
        setCities(stateCities);
      }
    }
  };

  // Load cities when state changes
  const loadCities = (countryCode: string, stateCode: string) => {
    const stateCities = City.getCitiesOfState(countryCode, stateCode);
    setCities(stateCities);
    setSelectedCity('');
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
            <SearchableSelect
              options={countries.map(country => ({
                value: country.isoCode,
                label: country.name,
                flag: country.flag
              }))}
              value={address.country || ''}
              onChange={(countryCode) => {
                console.log('Country changed to:', countryCode);
                // Use batch update if available, otherwise fall back to individual updates
                if (onAddressBatchChange) {
                  onAddressBatchChange({
                    country: countryCode,
                    state: '',
                    city: ''
                  });
                } else {
                  onAddressChange('country', countryCode);
                  onAddressChange('state', '');
                  onAddressChange('city', '');
                }
                setSelectedCountry(countryCode);
                setSelectedState('');
                setSelectedCity('');
                setStates([]);
                setCities([]);
                if (countryCode) {
                  loadStates(countryCode);
                }
              }}
              placeholder="Select country"
              required={required}
            />
          </div>

          {/* State/Province Selection */}
          <div>
            <Label htmlFor="state">State/Province {required && '*'}</Label>
            <SearchableSelect
              options={states.map(state => ({
                value: state.name,  // Use state name as value instead of isoCode
                label: state.name
              }))}
              value={address.state || ''}  // Use address.state directly
              onChange={(stateName) => {
                onAddressChange('state', stateName);
                setSelectedState(stateName);
                // Find the state code to load cities
                const state = states.find(s => s.name === stateName);
                if (state && selectedCountry) {
                  loadCities(selectedCountry, state.isoCode);
                }
              }}
              placeholder="Select state/province"
              disabled={!selectedCountry || states.length === 0}
              required={required}
            />
          </div>

          {/* City Selection */}
          <div>
            <Label htmlFor="city">City {required && '*'}</Label>
            <SearchableSelect
              options={cities.map(city => ({
                value: city.name,
                label: city.name
              }))}
              value={address.city || ''}  // Use address.city directly
              onChange={(cityName) => {
                onAddressChange('city', cityName);
                setSelectedCity(cityName);
              }}
              placeholder="Select city"
              disabled={!address.state || cities.length === 0}  // Check address.state instead of selectedState
              required={required}
            />
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
