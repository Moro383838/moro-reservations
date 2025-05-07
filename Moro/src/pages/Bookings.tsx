
import React from 'react';
import { format, parseISO } from 'date-fns';
import { useBooking } from '@/contexts/BookingContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HotelIcon, UtensilsIcon, CalendarIcon } from 'lucide-react';
import { Booking } from '@/types';
import { toast } from '@/components/ui/sonner';

const BookingItem = ({ booking, onCancel }: { booking: Booking, onCancel: (id: string) => void }) => {
  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'yyyy/MM/dd');
    } catch (error) {
      console.error('Date parsing error:', error);
      return dateString;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-500';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-yellow-500';
    }
  };

  const getBookingTypeIcon = (type: string) => {
    switch (type) {
      case 'hotel':
        return <HotelIcon className="h-6 w-6" />;
      case 'restaurant':
        return <UtensilsIcon className="h-6 w-6" />;
      case 'wedding':
        return <CalendarIcon className="h-6 w-6" />;
      default:
        return null;
    }
  };

  const getBookingTypeName = (type: string) => {
    switch (type) {
      case 'hotel':
        return 'فندق';
      case 'restaurant':
        return 'مطعم';
      case 'wedding':
        return 'صالة أفراح';
      default:
        return type;
    }
  };

  const getStatusName = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'مؤكد';
      case 'cancelled':
        return 'ملغي';
      case 'pending':
        return 'قيد الانتظار';
      default:
        return status;
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-resort-purple/10 rounded-full">
              {getBookingTypeIcon(booking.type)}
            </div>
            <div>
              <CardTitle className="text-lg">{getBookingTypeName(booking.type)}</CardTitle>
              <CardDescription>
                رقم الحجز: {booking.id.substring(0, 8)}
              </CardDescription>
            </div>
          </div>
          <Badge className={`${getStatusColor(booking.status)} text-white`}>
            {getStatusName(booking.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="grid grid-cols-2 gap-y-2">
          <div>
            <p className="text-sm text-gray-500">التاريخ</p>
            <p>{formatDate(booking.date)}</p>
          </div>
          {booking.timeStart && (
            <div>
              <p className="text-sm text-gray-500">الوقت</p>
              <p>{booking.timeStart}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-gray-500">عدد الضيوف</p>
            <p>{booking.guests}</p>
          </div>
          {booking.hours && (
            <div>
              <p className="text-sm text-gray-500">المدة</p>
              <p>{booking.hours} {booking.hours === 1 ? 'ساعة' : 'ساعات'}</p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <div className="w-full flex justify-between items-center">
          <p className="text-sm text-gray-500">
            تاريخ الحجز: {formatDate(booking.createdAt)}
          </p>
          {booking.status === 'pending' && (
            <Button variant="destructive" size="sm" onClick={() => onCancel(booking.id)}>
              إلغاء الحجز
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};

const Bookings = () => {
  const { bookings, cancelBooking, isLoading } = useBooking();

  const handleCancelBooking = async (id: string) => {
    try {
      await cancelBooking(id);
    } catch (error) {
      toast.error('حدث خطأ أثناء إلغاء الحجز');
    }
  };

  const filterBookings = (type: string) => {
    if (type === 'all') {
      return bookings;
    }
    return bookings.filter(booking => booking.type === type);
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-resort-purple">حجوزاتي</h1>
        <p className="text-xl mt-2 text-gray-600">إدارة جميع حجوزاتك في مكان واحد</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-resort-purple"></div>
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-gray-100 rounded-full w-20 h-20 mx-auto flex items-center justify-center mb-4">
            <CalendarIcon className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold mb-2">لا توجد حجوزات</h3>
          <p className="text-gray-600 mb-6">لم تقم بأي حجوزات حتى الآن</p>
          <div className="flex justify-center gap-4">
            <Button variant="outline" onClick={() => window.location.href = '/hotel'}>
              حجز غرفة
            </Button>
            <Button onClick={() => window.location.href = '/restaurant'}>
              حجز طاولة
            </Button>
          </div>
        </div>
      ) : (
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid grid-cols-4 mb-8">
            <TabsTrigger value="all">الكل</TabsTrigger>
            <TabsTrigger value="hotel">الفندق</TabsTrigger>
            <TabsTrigger value="restaurant">المطعم</TabsTrigger>
            <TabsTrigger value="wedding">صالة الأفراح</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-0">
            {filterBookings('all').map(booking => (
              <BookingItem 
                key={booking.id} 
                booking={booking} 
                onCancel={handleCancelBooking} 
              />
            ))}
          </TabsContent>
          
          <TabsContent value="hotel" className="mt-0">
            {filterBookings('hotel').length > 0 ? (
              filterBookings('hotel').map(booking => (
                <BookingItem 
                  key={booking.id} 
                  booking={booking} 
                  onCancel={handleCancelBooking} 
                />
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">لا توجد حجوزات في الفندق</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="restaurant" className="mt-0">
            {filterBookings('restaurant').length > 0 ? (
              filterBookings('restaurant').map(booking => (
                <BookingItem 
                  key={booking.id} 
                  booking={booking} 
                  onCancel={handleCancelBooking} 
                />
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">لا توجد حجوزات في المطعم</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="wedding" className="mt-0">
            {filterBookings('wedding').length > 0 ? (
              filterBookings('wedding').map(booking => (
                <BookingItem 
                  key={booking.id} 
                  booking={booking} 
                  onCancel={handleCancelBooking} 
                />
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">لا توجد حجوزات في صالة الأفراح</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default Bookings;
