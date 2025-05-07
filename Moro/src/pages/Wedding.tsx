
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/contexts/AuthContext';
import { useBooking } from '@/contexts/BookingContext';
import { bookingAPI } from '@/lib/api';
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
import { WeddingHall } from '@/types';

// Available time slots
const timeSlots = [
  '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', 
  '16:00', '17:00', '18:00', '19:00', '20:00'
];

// Duration options
const durationOptions = [3, 4, 5, 6];

const weddingHalls: WeddingHall[] = [
  {
    id: '1',
    name: 'قاعة الياسمين',
    description: 'قاعة أنيقة تتسع لـ 150 ضيفًا مع ديكورات راقية وإضاءة مميزة',
    capacity: 150,
    pricePerHour: 2000,
    image: 'https://images.unsplash.com/photo-1519741497674-611481863552?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  },
  {
    id: '2',
    name: 'قاعة الورد',
    description: 'قاعة فاخرة تتسع لـ 250 ضيفًا مع مساحة رقص واسعة ومسرح',
    capacity: 250,
    pricePerHour: 3000,
    image: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  },
  {
    id: '3',
    name: 'قاعة الملكية',
    description: 'أفخم قاعاتنا تتسع لـ 400 ضيف مع تصميم فاخر وخدمة VIP',
    capacity: 400,
    pricePerHour: 5000,
    image: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  },
];

const formSchema = z.object({
  hallId: z.string({
    required_error: 'يرجى اختيار القاعة',
  }),
  date: z.date({
    required_error: 'يرجى اختيار التاريخ',
  }),
  timeStart: z.string({
    required_error: 'يرجى اختيار وقت الحجز',
  }),
  hours: z.coerce.number().min(3, 'يجب أن لا يقل عن 3 ساعات').max(6, 'الحد الأقصى هو 6 ساعات'),
  guests: z.coerce.number().min(50, 'يجب أن لا يقل عن 50 ضيف').max(400, 'الحد الأقصى هو 400 ضيف'),
});

type FormValues = z.infer<typeof formSchema>;

const Wedding = () => {
  const { isAuthenticated, user } = useAuth();
  const { createBooking, isLoading, checkTimeAvailability } = useBooking();
  const navigate = useNavigate();
  const [selectedHall, setSelectedHall] = useState<WeddingHall | null>(null);
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [isDateAvailable, setIsDateAvailable] = useState<boolean>(true);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      hours: 4,
      guests: 100,
    },
  });

  const onHallSelect = (hallId: string) => {
    const hall = weddingHalls.find(h => h.id === hallId);
    if (hall) {
      setSelectedHall(hall);
      form.setValue('hallId', hallId);
      form.setValue('guests', Math.min(form.getValues('guests'), hall.capacity));
    }
  };

  // التحقق من توفر صالة الأفراح عند تغيير التاريخ
  const checkWeddingAvailability = async (date: Date) => {
    try {
      const formattedDate = format(date, 'yyyy-MM-dd');
      const result = await bookingAPI.checkWeddingHallAvailability(formattedDate);
      
      // تعديل: نفترض أن صالة الأفراح متاحة دائمًا إذا لم يكن هناك استجابة واضحة من الخادم
      if (result && result.available === false) {
        setIsDateAvailable(false);
        toast.error('هذا اليوم محجوز بالفعل، يرجى اختيار يوم آخر');
        
        // عرض الأيام المتاحة إذا كانت موجودة
        if (result.availableDays && Array.isArray(result.availableDays) && result.availableDays.length > 0) {
          setAvailableDays(result.availableDays);
          // عرض رسالة بالأيام المتاحة
          const formattedAvailableDays = result.availableDays.map(day => {
            const date = new Date(day);
            return format(date, 'yyyy/MM/dd');
          });
          toast.info(`الأيام المتاحة: ${formattedAvailableDays.join(', ')}`);
        } else {
          // إذا لم تكن الأيام المتاحة موجودة في النتيجة، نحاول الحصول عليها
          try {
            const availableDaysResult = await bookingAPI.getAvailableDays({
              type: 'wedding',
              month: format(date, 'yyyy-MM')
            });
            
            if (availableDaysResult && availableDaysResult.availableDays && availableDaysResult.availableDays.length > 0) {
              setAvailableDays(availableDaysResult.availableDays);
              // عرض رسالة بالأيام المتاحة
              const formattedAvailableDays = availableDaysResult.availableDays.map(day => {
                const date = new Date(day);
                return format(date, 'yyyy/MM/dd');
              });
              toast.info(`الأيام المتاحة: ${formattedAvailableDays.join(', ')}`);
            }
          } catch (daysError) {
            console.error('خطأ في الحصول على الأيام المتاحة:', daysError);
            // في حالة حدوث خطأ، نفترض أن اليوم متاح
            setIsDateAvailable(true);
          }
        }
      } else {
        // إذا كانت النتيجة تشير إلى أن اليوم متاح أو لم تكن هناك نتيجة واضحة
        setIsDateAvailable(true);
        setAvailableDays([]);
      }
    } catch (error) {
      console.error('خطأ في التحقق من توفر صالة الأفراح:', error);
      // نفترض أن اليوم متاح في حالة حدوث خطأ
      setIsDateAvailable(true);
      setAvailableDays([]);
    }
  };

  const onSubmit = async (data: FormValues) => {
    if (!isAuthenticated) {
      toast.error('يرجى تسجيل الدخول للاستمرار');
      navigate('/login');
      return;
    }

    try {
      if (!selectedHall) {
        toast.error('يرجى اختيار القاعة');
        return;
      }
      
      // التحقق من توفر اليوم قبل إنشاء الحجز - تعديل: نتجاهل هذا التحقق إذا كانت هناك مشكلة في الخادم
      if (!isDateAvailable && availableDays.length > 0) {
        toast.error('هذا اليوم محجوز بالفعل، يرجى اختيار يوم آخر من الأيام المتاحة');
        return;
      }

      // التحقق من توفر الوقت قبل إنشاء الحجز
      try {
        const result = await checkTimeAvailability(
          'wedding',
          format(data.date, 'yyyy-MM-dd'),
          data.timeStart,
          data.hours
        );
        
        // إذا كان الوقت غير متاح، نعرض الأوقات المتاحة للمستخدم
        if (result && typeof result === 'object' && 'available' in result && result.available === false) {
          // عرض الأوقات المتاحة للمستخدم
          if (result.availableTimes && Array.isArray(result.availableTimes) && result.availableTimes.length > 0) {
            toast.error(`هذا الوقت محجوز بالفعل. الأوقات المتاحة في هذا اليوم: ${result.availableTimes.join(', ')}`);
          } else {
            toast.error('هذا الوقت محجوز بالفعل. لا توجد أوقات متاحة في هذا اليوم، يرجى اختيار يوم آخر');
          }
          
          // حفظ الأيام المتاحة إذا كانت موجودة
          if (result.availableDays && Array.isArray(result.availableDays) && result.availableDays.length > 0) {
            setAvailableDays(result.availableDays);
          }
          return;
        }
      } catch (error: any) {
        // إذا كان هناك خطأ محدد من التحقق من التوفر
        if (error.message && error.message.includes('هذا الوقت محجوز بالفعل')) {
          // نحاول الحصول على الأوقات المتاحة
          try {
            const availableSlots = await bookingAPI.getAvailableTimeSlots({
              type: 'wedding',
              date: format(data.date, 'yyyy-MM-dd'),
              hours: data.hours
            });
            
            if (availableSlots && availableSlots.availableSlots && availableSlots.availableSlots.length > 0) {
              toast.error(`هذا الوقت محجوز بالفعل. الأوقات المتاحة في هذا اليوم: ${availableSlots.availableSlots.join(', ')}`);
            } else {
              toast.error('هذا الوقت محجوز بالفعل. لا توجد أوقات متاحة في هذا اليوم، يرجى اختيار يوم آخر');
            }
            
            // محاولة الحصول على الأيام المتاحة
            try {
              const availableDaysResult = await bookingAPI.getAvailableDays({
                type: 'wedding',
                month: format(data.date, 'yyyy-MM')
              });
              
              if (availableDaysResult && availableDaysResult.availableDays && availableDaysResult.availableDays.length > 0) {
                setAvailableDays(availableDaysResult.availableDays);
              }
            } catch (daysError) {
              console.error('خطأ في الحصول على الأيام المتاحة:', daysError);
            }
          } catch (slotError) {
            toast.error('هذا الوقت محجوز بالفعل. يرجى اختيار وقت آخر');
          }
          return;
        }
        throw error; // إعادة رمي الأخطاء الأخرى
      }

      await createBooking({
        userId: user!.id,
        type: 'wedding',
        date: format(data.date, 'yyyy-MM-dd'),
        timeStart: data.timeStart,
        hours: data.hours,
        guests: data.guests,
      });
      
      toast.success('تم حجز القاعة بنجاح');
      navigate('/bookings');
    } catch (error) {
      console.error('Wedding hall booking error:', error);
      toast.error('حدث خطأ أثناء الحجز');
    }
  };

  const calculateTotalPrice = () => {
    if (!selectedHall) return 0;
    return selectedHall.pricePerHour * form.watch('hours');
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-resort-purple">صالة أفراح منتجع الجنة</h1>
        <p className="text-xl mt-2 text-gray-600">احتفل بمناسباتك الخاصة في أجواء فاخرة</p>
      </div>
      
      {/* عرض الأيام المتاحة إذا كان اليوم المحدد غير متاح */}
      {!isDateAvailable && availableDays.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <h2 className="text-xl font-semibold text-blue-800 mb-2">الأيام المتاحة للحجز:</h2>
          <div className="flex flex-wrap gap-2">
            {availableDays.map((day) => {
              const date = new Date(day);
              return (
                <Button 
                  key={day} 
                  variant="outline" 
                  size="sm"
                  className="bg-white hover:bg-blue-100"
                  onClick={() => {
                    form.setValue("date", date);
                    setIsDateAvailable(true);
                  }}
                >
                  {format(date, 'yyyy/MM/dd')}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        {/* عرض الأيام المتاحة إذا كان هناك أيام محجوزة */}
        {availableDays.length > 0 && (
          <div className="col-span-1 lg:col-span-2 bg-blue-50 p-6 rounded-lg shadow mb-6">
            <h3 className="text-xl font-semibold mb-3 text-blue-800">الأيام المتاحة للحجز:</h3>
            <p className="mb-3 text-gray-700">اليوم الذي اخترته محجوز بالفعل. يمكنك اختيار أحد الأيام المتاحة التالية:</p>
            <div className="flex flex-wrap gap-2">
              {availableDays.map((day) => (
                <Button 
                  key={day} 
                  variant="outline" 
                  size="sm"
                  className="bg-white hover:bg-blue-100"
                  onClick={() => {
                    const [year, month, dayOfMonth] = day.split('-');
                    const newDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(dayOfMonth));
                    form.setValue("date", newDate);
                  }}
                >
                  {day}
                </Button>
              ))}
            </div>
          </div>
        )}
        
        {/* Hall Selection */}
        <div className="space-y-8">
          <h2 className="text-2xl font-semibold">اختر القاعة المناسبة</h2>
          <div className="grid grid-cols-1 gap-6">
            {weddingHalls.map((hall) => (
              <Card 
                key={hall.id}
                className={cn(
                  "cursor-pointer transition-all", 
                  selectedHall?.id === hall.id 
                    ? "ring-2 ring-resort-purple shadow-lg" 
                    : "hover:shadow-md"
                )}
                onClick={() => onHallSelect(hall.id)}
              >
                <div className="grid grid-cols-1 md:grid-cols-3">
                  <div className="md:col-span-1">
                    <div className="h-full w-full bg-gray-200 relative">
                      <div 
                        className="absolute inset-0 bg-cover bg-center" 
                        style={{backgroundImage: `url(${hall.image})`}}
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2 p-6">
                    <h3 className="text-xl font-bold">{hall.name}</h3>
                    <p className="text-gray-600 mt-2">{hall.description}</p>
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-gray-600">السعة:</span>
                        <span className="font-semibold mr-2">{hall.capacity} ضيف</span>
                      </div>
                      <div>
                        <span className="text-gray-600">السعر:</span>
                        <span className="font-semibold mr-2">{hall.pricePerHour} $ / ساعة</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Booking Form */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-6">تفاصيل الحجز</h2>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Hall - Hidden, handled by card selection */}
              <input type="hidden" {...form.register('hallId')} />
              
              {/* Date */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>التاريخ</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-right font-normal",
                              !field.value && "text-muted-foreground",
                              !isDateAvailable && "border-red-500 bg-red-50"
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
                          onSelect={(date) => {
                            field.onChange(date);
                            if (date) {
                              checkWeddingAvailability(date);
                            }
                          }}
                          disabled={(date) => date < new Date() || date < new Date(new Date().setDate(new Date().getDate() + 14))}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      يجب الحجز قبل الموعد بأسبوعين على الأقل
                    </FormDescription>
                    {!isDateAvailable && (
                      <p className="text-red-500 text-sm mt-1">هذا اليوم محجوز بالفعل، يرجى اختيار يوم آخر</p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Time */}
              <FormField
                control={form.control}
                name="timeStart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>وقت البدء</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="حدد وقت البدء" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Duration */}
                <FormField
                  control={form.control}
                  name="hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>المدة (بالساعات)</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="حدد المدة" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {durationOptions.map((hours) => (
                            <SelectItem key={hours} value={hours.toString()}>
                              {hours} ساعات
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                          min={50} 
                          max={selectedHall?.capacity || 400} 
                          {...field}
                        />
                      </FormControl>
                      {selectedHall && (
                        <FormDescription>
                          الحد الأقصى {selectedHall.capacity} ضيف
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Price Summary */}
              {selectedHall && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-semibold">ملخص الحجز:</p>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between">
                      <span>اسم القاعة:</span>
                      <span>{selectedHall.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>التاريخ:</span>
                      <span>{form.watch('date') ? format(form.watch('date'), "yyyy/MM/dd") : '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>الوقت:</span>
                      <span>{form.watch('timeStart') || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>المدة:</span>
                      <span>{form.watch('hours')} ساعات</span>
                    </div>
                    <div className="flex justify-between">
                      <span>عدد الضيوف:</span>
                      <span>{form.watch('guests')}</span>
                    </div>
                    <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between font-bold">
                      <span>الإجمالي:</span>
                      <span>{calculateTotalPrice()} $</span>
                    </div>
                  </div>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || !selectedHall}
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

      {/* Services Section */}
      <section className="mt-20">
        <h2 className="text-2xl font-bold text-center mb-8">خدمات إضافية</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="bg-resort-purple/10 w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-resort-purple">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
              </svg>
            </div>
            <h3 className="font-semibold text-lg mb-2">خدمات موسيقية</h3>
            <p className="text-gray-600">فرق موسيقية متنوعة لإضفاء أجواء مميزة على مناسبتك</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="bg-resort-purple/10 w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-resort-purple">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-lg mb-2">خدمات التصوير</h3>
            <p className="text-gray-600">مصورين محترفين لتوثيق لحظاتك الخاصة بأعلى جودة</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="bg-resort-purple/10 w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-resort-purple">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.125-6 .37m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.17c0 .62-.504 1.124-1.125 1.124H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M12.265 3.11a.375.375 0 11-.53 0L12 2.845l.265.265zm-3 0a.375.375 0 11-.53 0L9 2.845l.265.265zm6 0a.375.375 0 11-.53 0L15 2.845l.265.265z" />
              </svg>
            </div>
            <h3 className="font-semibold text-lg mb-2">تنسيق الحفلات</h3>
            <p className="text-gray-600">خدمات تنسيق متكاملة لتنظيم مناسبتك بأفضل شكل</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Wedding;
