/**
 * Location Data Formatter Service
 * Handles conversion of location objects to displayable strings
 */

export type LocationData = 
  | string 
  | { latitude: number; longitude: number } 
  | { lat: number; lng: number }
  | { address?: string; city?: string; country?: string }
  | null 
  | undefined;

export interface LocationFormatter {
  formatLocation(location: LocationData): string;
  isLocationObject(data: any): boolean;
  extractCoordinates(location: LocationData): { lat: number; lng: number } | null;
}

export class LocationFormatterService implements LocationFormatter {
  /**
   * Formats location data into a displayable string
   */
  formatLocation(location: LocationData): string {
    // Handle null/undefined
    if (!location) {
      return 'Ubicación no especificada';
    }

    // Handle string locations
    if (typeof location === 'string') {
      return location.trim() || 'Ubicación no especificada';
    }

    // Handle object locations
    if (typeof location === 'object') {
      // Handle coordinate objects
      if ('latitude' in location && 'longitude' in location) {
        const { latitude, longitude } = location;
        if (typeof latitude === 'number' && typeof longitude === 'number') {
          return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        }
      }

      if ('lat' in location && 'lng' in location) {
        const { lat, lng } = location;
        if (typeof lat === 'number' && typeof lng === 'number') {
          return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        }
      }

      // Handle address objects
      if ('address' in location || 'city' in location || 'country' in location) {
        const parts = [];
        if (location.address) parts.push(location.address);
        if (location.city) parts.push(location.city);
        if (location.country) parts.push(location.country);
        
        if (parts.length > 0) {
          return parts.join(', ');
        }
      }

      // Handle generic objects - try to extract meaningful text
      const locationStr = this.extractLocationText(location);
      if (locationStr) {
        return locationStr;
      }
    }

    return 'Ubicación no especificada';
  }

  /**
   * Checks if data is a location object (not a string)
   */
  isLocationObject(data: any): boolean {
    if (!data || typeof data !== 'object') {
      return false;
    }

    // Check for coordinate properties
    const hasCoordinates = 
      ('latitude' in data && 'longitude' in data) ||
      ('lat' in data && 'lng' in data);

    // Check for address properties
    const hasAddress = 
      'address' in data || 
      'city' in data || 
      'country' in data;

    return hasCoordinates || hasAddress;
  }

  /**
   * Extracts coordinates from location data
   */
  extractCoordinates(location: LocationData): { lat: number; lng: number } | null {
    if (!location || typeof location !== 'object') {
      return null;
    }

    // Handle latitude/longitude format
    if ('latitude' in location && 'longitude' in location) {
      const { latitude, longitude } = location;
      if (typeof latitude === 'number' && typeof longitude === 'number') {
        return { lat: latitude, lng: longitude };
      }
    }

    // Handle lat/lng format
    if ('lat' in location && 'lng' in location) {
      const { lat, lng } = location;
      if (typeof lat === 'number' && typeof lng === 'number') {
        return { lat, lng };
      }
    }

    return null;
  }

  /**
   * Attempts to extract meaningful text from a generic location object
   */
  private extractLocationText(location: any): string | null {
    if (!location || typeof location !== 'object') {
      return null;
    }

    // Try common location properties
    const possibleKeys = [
      'name', 'title', 'label', 'description',
      'formatted_address', 'formattedAddress',
      'place_name', 'placeName',
      'display_name', 'displayName'
    ];

    for (const key of possibleKeys) {
      if (key in location && typeof location[key] === 'string') {
        const value = location[key].trim();
        if (value) {
          return value;
        }
      }
    }

    return null;
  }

  /**
   * Safely formats location for React rendering
   * Prevents "Objects are not valid as a React child" errors
   */
  static safeFormatForReact(location: LocationData): string {
    const formatter = new LocationFormatterService();
    try {
      return formatter.formatLocation(location);
    } catch (error) {
      console.error('Error formatting location for React:', error);
      return 'Ubicación no disponible';
    }
  }

  /**
   * Validates that location data is safe for rendering
   */
  static validateForRendering(location: any): boolean {
    // Null/undefined are safe
    if (location == null) return true;
    
    // Strings are safe
    if (typeof location === 'string') return true;
    
    // Numbers and booleans are safe
    if (typeof location === 'number' || typeof location === 'boolean') return true;
    
    // Objects and arrays are NOT safe for direct rendering
    if (typeof location === 'object') return false;
    
    return true;
  }
}

// Export singleton instance for convenience
export const locationFormatter = new LocationFormatterService();