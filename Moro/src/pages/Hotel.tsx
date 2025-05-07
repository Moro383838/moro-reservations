
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/contexts/AuthContext';
import { useBooking } from '@/contexts/BookingContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HotelRoom } from '@/types';

const hotelRooms: HotelRoom[] = [
  {
    id: '1',
    name: 'غرفة ديلوكس',
    description: 'غرفة فاخرة مع إطلالة رائعة وسرير كبير مزدوج',
    capacity: 2,
    price: 450,
    image: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  },
  {
    id: '2',
    name: 'جناح عائلي',
    description: 'جناح فسيح يناسب العائلات مع غرفتي نوم ومنطقة معيشة',
    capacity: 4,
    price: 700,
    image: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  },
  {
    id: '3',
    name: 'غرفة بريميوم',
    description: 'غرفة فاخرة مع خدمات إضافية وإطلالة بانورامية',
    capacity: 2,
    price: 550,
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  },
  {
    id: '4',
    name: 'جناح رئاسي',
    description: 'أفخم أجنحة المنتجع مع خدمات شخصية ومساحة واسعة',
    capacity: 2,
    price: 1200,
    image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  }
];

const formSchema = z.object({
  roomId: z.string({
    required_error: 'يرجى اختيار نوع الغرفة',
  }),
  date: z.date({
    required_error: 'يرجى اختيار تاريخ الوصول',
  }),
  nights: z.coerce.number().min(1, 'يجب أن لا يقل عن ليلة واحدة').max(30, 'الحد الأقصى هو 30 ليلة'),
  guests: z.coerce.number().min(1, 'يجب أن لا يقل عن شخص واحد').max(6, 'الحد الأقصى هو 6 أشخاص'),
});

type FormValues = z.infer<typeof formSchema>;

const Hotel = () => {
  const { isAuthenticated, user } = useAuth();
  const { createBooking, isLoading } = useBooking();
  const navigate = useNavigate();
  const [selectedRoom, setSelectedRoom] = useState<HotelRoom | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nights: 1,
      guests: 2,
    },
  });

  const onRoomSelect = (roomId: string) => {
    const room = hotelRooms.find(r => r.id === roomId);
    if (room) {
      setSelectedRoom(room);
      form.setValue('roomId', roomId);
      form.setValue('guests', Math.min(form.getValues('guests'), room.capacity));
    }
  };

  const onSubmit = async (data: FormValues) => {
    if (!isAuthenticated) {
      toast.error('يرجى تسجيل الدخول للاستمرار');
      navigate('/login');
      return;
    }

    try {
      if (!selectedRoom) {
        toast.error('يرجى اختيار نوع الغرفة');
        return;
      }

      await createBooking({
        userId: user!.id,
        type: 'hotel',
        date: format(data.date, 'yyyy-MM-dd'),
        guests: data.guests,
        roomId: selectedRoom.id,
        nights: data.nights,
        notes: `غرفة: ${selectedRoom.name}, سعر الليلة: ${selectedRoom.price}$, الإجمالي: ${selectedRoom.price * data.nights}$`
      });
      
      toast.success('تم حجز الغرفة بنجاح');
      navigate('/bookings');
    } catch (error) {
      console.error('Hotel booking error:', error);
      toast.error('حدث خطأ أثناء الحجز');
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-resort-purple">فندق منتجع الجنة</h1>
        <p className="text-xl mt-2 text-gray-600">استمتع بإقامة فاخرة في غرف وأجنحة استثنائية</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        {/* Room Selection */}
        <div className="space-y-8">
          <h2 className="text-2xl font-semibold">اختر نوع الغرفة</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hotelRooms.map((room) => (
              <Card 
                key={room.id}
                className={cn(
                  "cursor-pointer transition-all overflow-hidden", 
                  selectedRoom?.id === room.id 
                    ? "ring-2 ring-resort-purple shadow-lg" 
                    : "hover:shadow-md"
                )}
                onClick={() => onRoomSelect(room.id)}
              >
                <div className="h-48 bg-gray-200 relative">
                  <div 
                    className="absolute inset-0 bg-cover bg-center" 
                    style={{backgroundImage: `url(${room.image})`}}
                  />
                </div>
                <CardHeader className="pb-2">
                  <CardTitle>{room.name}</CardTitle>
                  <CardDescription>حتى {room.capacity} أشخاص</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 text-sm line-clamp-2">{room.description}</p>
                </CardContent>
                <CardFooter className="pt-2">
                  <p className="font-bold text-lg">{room.price} $ / ليلة</p>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>

        {/* Booking Form */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-6">تفاصيل الحجز</h2>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Room Type - Hidden, handled by card selection */}
              <input type="hidden" {...form.register('roomId')} />
              
              {/* Check-in Date */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>تاريخ الوصول</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-right font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "yyyy/MM/dd")
                            ) : (
                              <span>اختر تاريخ</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nights */}
                <FormField
                  control={form.control}
                  name="nights"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>عدد الليالي</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={30} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Guests */}
                <FormField
                  control={form.control}
                  name="guests"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>عدد الضيوف</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={1} 
                          max={selectedRoom?.capacity || 6} 
                          {...field}
                        />
                      </FormControl>
                      {selectedRoom && (
                        <FormDescription>
                          الحد الأقصى {selectedRoom.capacity} ضيوف
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Price Summary */}
              {selectedRoom && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-semibold">ملخص الحجز:</p>
                  <div className="flex justify-between mt-2">
                    <span>{selectedRoom.name}</span>
                    <span>{selectedRoom.price} $ / ليلة</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span>عدد الليالي</span>
                    <span>{form.watch('nights')}</span>
                  </div>
                  <div className="border-t border-gray-200 my-2 pt-2 flex justify-between font-bold">
                    <span>الإجمالي</span>
                    <span>{selectedRoom.price * form.watch('nights')} $</span>
                  </div>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || !selectedRoom}
              >
                {isLoading ? 'جاري الحجز...' : 'تأكيد الحجز'}
              </Button>

              {!isAuthenticated && (
                <p className="text-center text-sm text-gray-500 mt-4">
                  يجب تسجيل الدخول للحجز. 
                  <Button 
                    variant="link" 
                    className="p-0 mx-1 h-auto" 
                    onClick={() => navigate('/login')}
                  >
                    تسجيل الدخول
                  </Button>
                </p>
              )}
            </form>
          </Form>
        </div>
      </div>

      {/* Features Section */}
      <section className="mt-20">
        <h2 className="text-2xl font-bold text-center mb-8">مميزات الفندق</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="bg-resort-purple/10 w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-resort-purple">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <h3 className="font-semibold text-lg mb-2">خدمة 24/7</h3>
            <p className="text-gray-600">فريق خدمة العملاء متاح على مدار الساعة لتلبية احتياجاتك</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="bg-resort-purple/10 w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-resort-purple">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605" />
              </svg>
            </div>
            <h3 className="font-semibold text-lg mb-2">مسبح فاخر</h3>
            <p className="text-gray-600">استمتع بمسبح خارجي مع إطلالة بانورامية رائعة</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="bg-resort-purple/10 w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-resort-purple">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
              </svg>
            </div>
            <h3 className="font-semibold text-lg mb-2">سبا ومركز صحي</h3>
            <p className="text-gray-600">دلل نفسك في السبا والمركز الصحي المجهز بأحدث التقنيات</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Hotel;
