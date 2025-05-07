
export interface Booking {
  id: string;
  userId: string;
  type: 'hotel' | 'restaurant' | 'wedding';
  date: string;
  timeStart?: string; // For restaurant and wedding
  hours?: number; // For restaurant and wedding
  guests: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
}

export interface HotelRoom {
  id: string;
  name: string;
  description: string;
  capacity: number;
  price: number;
  image: string;
}

export interface RestaurantTable {
  id: string;
  name: string;
  capacity: number;
  image: string;
}

export interface WeddingHall {
  id: string;
  name: string;
  description: string;
  capacity: number;
  pricePerHour: number;
  image: string;
}
