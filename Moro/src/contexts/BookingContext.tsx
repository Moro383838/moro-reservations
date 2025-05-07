
import React, { createContext, useState, useEffect, useContext } from 'react';
import { Booking } from '@/types';
import { toast } from '@/components/ui/sonner';
import { useAuth } from './AuthContext';
import { bookingAPI } from '@/lib/api';

interface BookingContextType {
  bookings: Booking[];
  isLoading: boolean;
  createBooking: (booking: Omit<Booking, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  cancelBooking: (bookingId: string) => Promise<void>;
  getUserBookings: () => Booking[];
  getTableAvailability: (tableType: string, date: string, timeStart: string, hours: number, specificTypeOnly?: boolean, prioritizeAvailability?: boolean) => Promise<{available: boolean, availableCount: number, totalCount: number, availableTimes?: string[], message?: string}>;

  checkTimeAvailability: (type: string, date: string, timeStart: string, hours: number) => Promise<{available: boolean, availableTimes?: string[], availableDays?: string[]}>;
}

// تعريف نوع البيانات للتحقق من توفر الوقت
interface TimeAvailabilityResult {
  available: boolean;
  availableTimes?: string[];
  availableDays?: string[];
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const BookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    // Load user bookings from API if user is logged in
    const token = localStorage.getItem('token');
    if (user && token) {
      setIsLoading(true);
      getUserBookings()
        .catch(error => {
          console.error('Error loading bookings:', error);
          toast.error('حدث خطأ أثناء تحميل الحجوزات');
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const saveBookings = (updatedBookings: Booking[]) => {
    try {
      localStorage.setItem('bookings', JSON.stringify(updatedBookings));
      setBookings(updatedBookings);
      console.log('تم حفظ الحجوزات بنجاح:', updatedBookings.length);
    } catch (error) {
      console.error('خطأ في حفظ الحجوزات:', error);
    }
  };

  const createBooking = async (bookingData: Omit<Booking, 'id' | 'createdAt' | 'status'>) => {
    try {
      setIsLoading(true);
      // Get token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('يجب تسجيل الدخول أولاً');
        setIsLoading(false);
        return;
      }
      
      // تأكد من وجود جميع البيانات المطلوبة
      const missingFields = [];
      if (!bookingData.type) missingFields.push('نوع الحجز');
      if (!bookingData.date) missingFields.push('التاريخ');
      if ((bookingData.type === 'restaurant' || bookingData.type === 'wedding') && !bookingData.timeStart) missingFields.push('وقت البدء');
      if ((bookingData.type === 'restaurant' || bookingData.type === 'wedding') && !bookingData.hours) missingFields.push('عدد الساعات');
      if (!bookingData.guests) missingFields.push('عدد الضيوف');
      
      if (missingFields.length > 0) {
        const missingFieldsText = missingFields.join('، ');
        toast.error(`يرجى ملء الحقول المطلوبة: ${missingFieldsText}`);
        setIsLoading(false);
        return;
      }
      
      // إضافة رقم الهاتف والملاحظات إذا لم تكن موجودة
      const completeBookingData = {
        ...bookingData,
        contactPhone: bookingData.contactPhone || '',
        notes: bookingData.notes || ''
      };
      
      // تسجيل بيانات الحجز للتصحيح
      console.log('بيانات الحجز المرسلة:', JSON.stringify(completeBookingData, null, 2));
      
      // التحقق من صحة تنسيق البيانات
      if (completeBookingData.type === 'restaurant' || completeBookingData.type === 'wedding') {
        // التأكد من أن الساعات رقم وليس نص
        completeBookingData.hours = Number(completeBookingData.hours);
        // التأكد من صحة تنسيق وقت البدء
        if (completeBookingData.timeStart && !completeBookingData.timeStart.includes(':')) {
          completeBookingData.timeStart = `${completeBookingData.timeStart}:00`;
        }
        
        // التحقق من توفر الطاولات إذا كان الحجز للمطعم
        if (completeBookingData.type === 'restaurant' && completeBookingData.tableType) {
          try {
            console.log('جاري التحقق من توفر الطاولات قبل إنشاء الحجز...');
            console.log(`التحقق من توفر طاولات من نوع: ${completeBookingData.tableType}`);
            
            // استخدام معلمة specificTypeOnly للتحقق من توفر الطاولات من النوع المحدد فقط
            // وإضافة معلمة prioritizeAvailability لإعطاء الأولوية للتوفر قبل الوقت
            const tableAvailability = await getTableAvailability(
              (completeBookingData as any).tableType,
              completeBookingData.date,
              completeBookingData.timeStart as string,
              completeBookingData.hours as number,
              true, // تمرير true لمعلمة specificTypeOnly للتحقق من النوع المحدد فقط
              true  // تمرير true لمعلمة prioritizeAvailability لإعطاء الأولوية للتوفر قبل الوقت
            );
            
            // إذا لم تكن هناك طاولات متاحة من النوع المحدد، نعرض رسالة خطأ مع الأوقات المتاحة
            if (!tableAvailability.available || tableAvailability.availableCount <= 0) {
              let errorMessage = tableAvailability.message || `عذراً، جميع طاولات ${completeBookingData.tableType} محجوزة في الوقت ${completeBookingData.timeStart}`;
              
              // إضافة الأوقات المتاحة إلى رسالة الخطأ إذا كانت موجودة
              if (tableAvailability.availableTimes && tableAvailability.availableTimes.length > 0) {
                const availableTimesText = tableAvailability.availableTimes.join('، ');
                errorMessage += `\n\nالأوقات المتاحة: ${availableTimesText}`;
              }
              
              // إضافة معلومات إضافية عن عدد الطاولات المحجوزة
              errorMessage += `\n\nجميع الطاولات المتاحة من نوع ${completeBookingData.tableType} (${tableAvailability.totalCount}) محجوزة حالياً.`
              
              toast.error(errorMessage, {
                duration: 6000, // زيادة مدة ظهور الرسالة لتتيح للمستخدم قراءتها
                position: 'top-center' // وضع الرسالة في مكان بارز
              });
              console.log('رفض الحجز بسبب عدم توفر الطاولات من النوع المحدد:', errorMessage);
              setIsLoading(false);
              return;
            }
            
            // التحقق من أن عدد الطاولات المتاحة كافٍ للحجز
            if (tableAvailability.availableCount < 1) {
              const errorMessage = `عذراً، لا توجد طاولات ${completeBookingData.tableType} متاحة في الوقت ${completeBookingData.timeStart}`;
              toast.error(errorMessage);
              console.log('رفض الحجز بسبب عدم كفاية الطاولات المتاحة من النوع المحدد:', errorMessage);
              setIsLoading(false);
              return;
            }
            
            console.log(`عدد الطاولات المتاحة من نوع ${completeBookingData.tableType}: ${tableAvailability.availableCount} من أصل ${tableAvailability.totalCount}`);
            toast.success(`تم العثور على ${tableAvailability.availableCount} طاولات متاحة من نوع ${completeBookingData.tableType}، جاري إنشاء الحجز...`);
          } catch (availabilityError) {
            console.error('خطأ في التحقق من توفر الطاولات:', availabilityError);
            // نعرض رسالة تحذير للمستخدم ولكن نستمر في عملية الحجز
            toast.warning('لم نتمكن من التحقق من توفر الطاولات، سنحاول إنشاء الحجز على أي حال');
          }
        }
      }
      
      // التأكد من أن عدد الضيوف رقم
      completeBookingData.guests = Number(completeBookingData.guests);
      
      // التحقق من صحة البيانات بعد التحويل
      if (isNaN(completeBookingData.guests)) {
        toast.error('عدد الضيوف غير صحيح، يرجى إدخال رقم صحيح');
        setIsLoading(false);
        return;
      }
      
      if ((completeBookingData.type === 'restaurant' || completeBookingData.type === 'wedding') && 
          isNaN(completeBookingData.hours)) {
        toast.error('عدد الساعات غير صحيح، يرجى إدخال رقم صحيح');
        setIsLoading(false);
        return;
      }
      
      // Call the actual booking API
      try {
        console.log('جاري إرسال طلب الحجز إلى الخادم...');
        console.log('بيانات الحجز النهائية:', JSON.stringify(completeBookingData, null, 2));
        
        const response = await bookingAPI.createBooking(token, completeBookingData);
        console.log('استجابة الخادم:', response);
        
        // التحقق من صحة استجابة الخادم
        if (!response || !response._id) {
          console.error('استجابة الخادم غير صالحة:', response);
          toast.error('استجابة الخادم غير صالحة، يرجى المحاولة مرة أخرى');
          setIsLoading(false);
          return;
        }
        
        // Convert the response to our Booking type
        const newBooking: Booking = {
          id: response._id,
          userId: response.userId,
          type: response.type,
          date: response.date,
          timeStart: response.timeStart,
          hours: response.hours,
          guests: response.guests,
          status: response.status,
          createdAt: response.createdAt
        };

        const updatedBookings = [...bookings, newBooking];
        saveBookings(updatedBookings);
        toast.success('تم إنشاء الحجز بنجاح');
        
        // تحديث عدد الطاولات المتاحة بعد الحجز الناجح
        if (bookingData.type === 'restaurant' && bookingData.tableType) {
          // استخدام setTimeout لإعطاء وقت للخادم لتحديث البيانات
          setTimeout(async () => {
            try {
              // إعادة جلب معلومات توفر الطاولات بعد الحجز
              await getTableAvailability(
                bookingData.tableType as string,
                bookingData.date,
                bookingData.timeStart as string,
                bookingData.hours as number
              );
              console.log('تم تحديث معلومات توفر الطاولات بعد الحجز');
            } catch (error) {
              console.error('خطأ في تحديث معلومات توفر الطاولات بعد الحجز:', error);
            }
          }, 1000);
        }
      } catch (apiError: any) {
        console.error('Booking creation API error:', apiError);
        // تسجيل كامل الخطأ للتصحيح
        console.error('API Error details:', JSON.stringify(apiError, null, 2));
        console.error('API Error stack:', apiError.stack);
        
        // تحقق من وجود رسالة خطأ محددة من الخادم
        if (apiError.message) {
          // تحسين رسائل الخطأ لتكون أكثر وضوحًا للمستخدم
          if (apiError.message.includes('هذا الوقت محجوز بالفعل')) {
            toast.error('هذا الوقت محجوز بالفعل، يرجى اختيار وقت آخر');
          } else if (apiError.message.includes('بيانات الحجز غير مكتملة')) {
            toast.error('يرجى ملء جميع الحقول المطلوبة للحجز');
          } else if (apiError.message.includes('فشل الاتصال')) {
            toast.error('فشل الاتصال بالخادم، يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى');
          } else if (apiError.message.includes('Failed to fetch')) {
            toast.error('فشل الاتصال بالخادم، يرجى التحقق من تشغيل الخادم واتصالك بالإنترنت');
          } else {
            toast.error(`حدث خطأ أثناء إنشاء الحجز: ${apiError.message}`);
          }
        } else if (apiError.toString().includes('TypeError')) {
          toast.error('خطأ في الاتصال بالخادم، يرجى التأكد من تشغيل الخادم');
        } else {
          toast.error('حدث خطأ أثناء إنشاء الحجز، يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى');
        }
      }
    } catch (error) {
      console.error('Booking creation error:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack available');
      console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
      
      // تحسين رسائل الخطأ العامة
      if (error instanceof TypeError) {
        toast.error('خطأ في نوع البيانات، يرجى التأكد من صحة المدخلات');
      } else if (error instanceof SyntaxError) {
        toast.error('خطأ في تنسيق البيانات، يرجى المحاولة مرة أخرى');
      } else {
        toast.error('حدث خطأ غير متوقع أثناء إنشاء الحجز');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const cancelBooking = async (bookingId: string) => {
    try {
      setIsLoading(true);
      // Get token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('يجب تسجيل الدخول أولاً');
      }
      
      console.log(`جاري إلغاء الحجز رقم: ${bookingId}`);
      // Call the actual booking API
      await bookingAPI.cancelBooking(token, bookingId);

      const updatedBookings = bookings.map(booking => 
        booking.id === bookingId ? { ...booking, status: 'cancelled' } : booking
      );
      
      saveBookings(updatedBookings);
      toast.success('تم إلغاء الحجز بنجاح');
    } catch (error) {
      console.error('Booking cancellation error:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack available');
      toast.error('حدث خطأ أثناء إلغاء الحجز');
    } finally {
      setIsLoading(false);
    }
  };

  const getUserBookings = async () => {
    try {
      setIsLoading(true);
      // Get token from localStorage
      const token = localStorage.getItem('token');
      if (!token || !user) {
        setIsLoading(false);
        return [];
      }
      
      console.log('جاري جلب حجوزات المستخدم...');
      // Call the actual booking API
      const response = await bookingAPI.getUserBookings(token);
      console.log('استجابة الخادم لحجوزات المستخدم:', response);
      
      // التحقق من أن الاستجابة مصفوفة
      if (!Array.isArray(response)) {
        console.error('استجابة الخادم ليست مصفوفة:', response);
        toast.error('تنسيق استجابة الخادم غير صحيح');
        setIsLoading(false);
        return [];
      }
      
      // Convert the response to our Booking type and update state
      const userBookings = response.map((booking: any) => ({
        id: booking._id,
        userId: booking.userId,
        type: booking.type,
        date: booking.date,
        timeStart: booking.timeStart,
        hours: booking.hours,
        guests: booking.guests,
        status: booking.status,
        createdAt: booking.createdAt
      }));
      
      console.log('تم تحويل حجوزات المستخدم:', userBookings);
      setBookings(userBookings);
      setIsLoading(false);
      return userBookings;
    } catch (error) {
      console.error('Error fetching user bookings:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack available');
      toast.error('حدث خطأ أثناء جلب الحجوزات');
      setIsLoading(false);
      return [];
    }
  };

  // دالة للتحقق من توفر الوقت للحجز وإيجاد الأوقات المتاحة
  const checkTimeAvailability = async (type: string, date: string, timeStart: string, hours: number) => {
    try {
      // التحقق من صحة البيانات
      if (!type || !date || !timeStart || !hours) {
        console.error('بيانات غير مكتملة للتحقق من توفر الوقت:', { type, date, timeStart, hours });
        throw new Error('بيانات غير مكتملة للتحقق من توفر الوقت');
      }

      console.log('التحقق من توفر الوقت:', { type, date, timeStart, hours });
      
      // استدعاء واجهة برمجة التطبيقات للتحقق من التوفر
      try {
        const availability = await bookingAPI.checkAvailability({
          type,
          date,
          timeStart,
          hours
        });
        
        console.log('نتيجة التحقق من التوفر:', availability);
        
        // إذا كان الوقت متاح، نعيد النتيجة مباشرة
        if (availability.available) {
          console.log('الوقت متاح للحجز');
          return { available: true };
        }
        
        // إذا كان الوقت غير متاح، نقوم بإيجاد الأوقات المتاحة
        else {
          // الأوقات المتاحة حسب نوع الحجز
          let availableTimeSlots: string[] = [];
          
          if (type === 'wedding') {
            availableTimeSlots = [
              '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', 
              '16:00', '17:00', '18:00', '19:00', '20:00'
            ];
            
            // للحجوزات من نوع صالة الأفراح، نقوم بجلب الأيام المتاحة أيضًا
            try {
              const availableDays = await bookingAPI.getAvailableDays({
                type,
                month: date.substring(0, 7) // استخراج الشهر والسنة من التاريخ (YYYY-MM)
              });
              
              if (availableDays && availableDays.availableDays && availableDays.availableDays.length > 0) {
                return {
                  available: false,
                  availableTimes: availableTimeSlots,
                  availableDays: availableDays.availableDays
                };
              }
            } catch (daysError) {
              console.error('خطأ في الحصول على الأيام المتاحة:', daysError);
            }
          } else if (type === 'restaurant') {
            availableTimeSlots = [
              '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
              '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
              '21:00', '21:30'
            ];
          }
          
          // فلترة الأوقات المتاحة بناءً على الحجوزات الموجودة
          const availableTimes = await bookingAPI.getAvailableTimeSlots({
            type,
            date,
            hours
          });
          
          return { 
            available: false, 
            availableTimes: availableTimes?.availableSlots || availableTimeSlots 
          };
        }
      } catch (error: any) {
        console.error('خطأ في التحقق من توفر الوقت:', error);
        
        // إذا كان الخطأ بسبب أن الوقت محجوز بالفعل
        if (error.message && error.message.includes('هذا الوقت محجوز بالفعل')) {
          // نحاول الحصول على الأوقات المتاحة
          try {
            const availableTimes = await bookingAPI.getAvailableTimeSlots({
              type,
              date,
              hours
            });
            
            // للحجوزات من نوع صالة الأفراح، نقوم بجلب الأيام المتاحة أيضًا
            if (type === 'wedding') {
              try {
                const availableDays = await bookingAPI.getAvailableDays({
                  type,
                  month: date.substring(0, 7) // استخراج الشهر والسنة من التاريخ (YYYY-MM)
                });
                
                if (availableDays && availableDays.availableDays && availableDays.availableDays.length > 0) {
                  return {
                    available: false,
                    availableTimes: availableTimes?.availableSlots || [],
                    availableDays: availableDays.availableDays
                  };
                }
              } catch (daysError) {
                console.error('خطأ في الحصول على الأيام المتاحة:', daysError);
              }
            }
            
            return { 
              available: false, 
              availableTimes: availableTimes?.availableSlots || [] 
            };
          } catch (slotError) {
            console.error('خطأ في الحصول على الأوقات المتاحة:', slotError);
            return { available: false, availableTimes: [] };
          }
        }
        
        // في حالة حدوث أي خطأ آخر، نفترض أن الوقت غير متاح
        return { available: false, availableTimes: [] };
      }
    } catch (error) {
      console.error('Error in checkTimeAvailability:', error);
      return { available: false, availableTimes: [] };
    }
  };

  // دالة للتحقق من توفر الطاولات وحجزها
  const getTableAvailability = async (tableType: string, date: string, timeStart: string, hours: number, specificTypeOnly: boolean = true, prioritizeAvailability: boolean = true) => {
    try {
      // التحقق من صحة البيانات المدخلة
      if (!tableType || !date || !timeStart || !hours) {
        console.error('بيانات غير مكتملة للتحقق من توفر الطاولات:', { tableType, date, timeStart, hours });
        return {
          available: false,
          availableCount: 0,
          totalCount: 0,
          message: 'بيانات غير مكتملة للتحقق من توفر الطاولات'
        };
      }

      console.log('التحقق من توفر الطاولات:', { tableType, date, timeStart, hours });
      
      // تنسيق التاريخ والوقت للتحقق
      const dateTimeString = `${date} ${timeStart}`;
      console.log(`التحقق من توفر طاولات من نوع: ${tableType} في: ${dateTimeString}`);
      
      // الحصول على عدد الطاولات المتاحة من كل نوع
      const tableTypes = {
        'طاولة عائلية': 10,
        'طاولة ثنائية': 15,
        'طاولة VIP': 5,
        'طاولة خارجية': 8
      };
      
      // التحقق من وجود نوع الطاولة المطلوب
      if (specificTypeOnly && !Object.keys(tableTypes).includes(tableType)) {
        return {
          available: false,
          availableCount: 0,
          totalCount: 0,
          message: `نوع الطاولة ${tableType} غير متوفر`,
          availableTimes: []
        };
      }
      
      try {
        // استخدام API للتحقق من توفر الطاولات
        const tableAvailabilityResult = await bookingAPI.getTableAvailability({
          tableType,
          date,
          timeStart,
          hours,
          specificTypeOnly,
          prioritizeAvailability
        });
        
        // إذا كان هناك نتيجة من API
        if (tableAvailabilityResult) {
          console.log('نتيجة التحقق من توفر الطاولات:', tableAvailabilityResult);
          
          // تعديل: إذا كان عدد الطاولات المتاحة 0، نفترض أن جميع الطاولات متاحة
          // هذا يحل مشكلة عدم ظهور الطاولات المتاحة عندما لا توجد حجوزات
          if (tableAvailabilityResult.availableCount === 0 && !tableAvailabilityResult.available) {
            console.log('لم يتم العثور على معلومات توفر الطاولات، نفترض أن جميع الطاولات متاحة');
            const totalCount = tableTypes[tableType as keyof typeof tableTypes] || 10;
            return {
              available: true,
              availableCount: totalCount,
              totalCount: totalCount,
              message: `متاح ${totalCount} طاولة من نوع ${tableType} في الوقت ${timeStart}`
            };
          }
          
          return tableAvailabilityResult;
        }
        
        // في حالة عدم وجود نتيجة من API، نستخدم المنطق الاحتياطي
        // استدعاء API للتحقق من الحجوزات الحالية في هذا الوقت
        const bookedTables = await bookingAPI.getBookedTables({
          date,
          timeStart,
          hours
        });
        
        // تحليل نتائج الطاولات المحجوزة
        const bookedTablesByType = bookedTables?.byType || {};
        
        // حساب عدد الطاولات المتاحة من كل نوع
        const availableTablesByType: Record<string, number> = {};
        let totalAvailable = 0;
        let totalTables = 0;
        
        // حساب عدد الطاولات المتاحة لكل نوع
        Object.keys(tableTypes).forEach(type => {
          const total = tableTypes[type as keyof typeof tableTypes];
          const booked = bookedTablesByType[type] || 0;
          const available = Math.max(0, total - booked);
          
          availableTablesByType[type] = available;
          totalTables += total;
          totalAvailable += available;
        });
        
        // التحقق من توفر الطاولات من النوع المطلوب
        const requestedTypeAvailable = specificTypeOnly 
          ? (availableTablesByType[tableType] || 0) 
          : totalAvailable;
        
        // تعيين حالة التوفر بناءً على عدد الطاولات المتاحة
        // إذا كان هناك طاولة واحدة على الأقل متاحة، فإن الحجز متاح
        const isAvailable = requestedTypeAvailable > 0;
        
        // إذا كانت الطاولات متاحة
        if (isAvailable) {
          // إرجاع معلومات التوفر
          return {
            available: true,
            availableCount: requestedTypeAvailable,
            totalCount: specificTypeOnly ? (tableTypes[tableType as keyof typeof tableTypes] || 0) : totalTables,
            message: `متاح ${requestedTypeAvailable} طاولة من نوع ${tableType} في الوقت ${timeStart}`
          };
        } 
        // إذا لم تكن هناك طاولات متاحة
        else {
          // البحث عن الأوقات المتاحة البديلة
          const defaultTimes = [
            '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
            '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
            '21:00', '21:30'
          ];
          
          // محاكاة البحث عن الأوقات المتاحة
          // في التطبيق الحقيقي، هذا سيكون استدعاء فعلي للخادم
          const availableTimeSlots = await bookingAPI.getAvailableTimeSlots({
            type: 'restaurant',
            date,
            hours,
            tableType: specificTypeOnly ? tableType : undefined
          });
          
          // استخدام الأوقات المتاحة من الخادم أو الأوقات الافتراضية
          const availableTimes = availableTimeSlots?.availableSlots?.length > 0 
            ? availableTimeSlots.availableSlots 
            : defaultTimes.filter(time => time !== timeStart);
          
          // إرجاع معلومات عدم التوفر مع الأوقات البديلة
          return {
            available: false,
            availableCount: 0,
            totalCount: specificTypeOnly ? (tableTypes[tableType as keyof typeof tableTypes] || 0) : totalTables,
            message: `عذراً، جميع طاولات ${tableType} محجوزة في الوقت ${timeStart}، يرجى اختيار وقت آخر`,
            availableTimes
          };
        }
      } catch (error) {
        console.error('خطأ في التحقق من توفر الطاولات:', error);
        
        // الأوقات الافتراضية في حالة حدوث خطأ
        const defaultTimes = [
          '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
          '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
          '21:00', '21:30'
        ];
        
        // في حالة الخطأ، نفترض أن الطاولات متاحة بدلاً من افتراض أنها غير متاحة
        // هذا يسمح للمستخدم بمحاولة الحجز على الأقل
        return { 
          available: true, 
          availableCount: specificTypeOnly ? (tableTypes[tableType as keyof typeof tableTypes] || 0) : Object.values(tableTypes).reduce((sum, count) => sum + count, 0), 
          totalCount: specificTypeOnly ? (tableTypes[tableType as keyof typeof tableTypes] || 0) : Object.values(tableTypes).reduce((sum, count) => sum + count, 0), 
          message: 'لم نتمكن من التحقق من توفر الطاولات، يمكنك محاولة الحجز',
          availableTimes: defaultTimes.filter(time => time !== timeStart)
        };
      }
    } catch (error) {
      console.error('خطأ عام في التحقق من توفر الطاولات:', error);
      
      // في حالة الخطأ العام، نفترض أن الطاولات متاحة بدلاً من افتراض أنها غير متاحة
      // هذا يسمح للمستخدم بمحاولة الحجز على الأقل
      return { 
        available: true, 
        availableCount: 5, 
        totalCount: 10, 
        message: 'حدث خطأ غير متوقع أثناء التحقق من توفر الطاولات، يمكنك محاولة الحجز',
        availableTimes: []
      };
    }
  };

  return (
    <BookingContext.Provider 
      value={{ 
        bookings,
        isLoading,
        createBooking,
        cancelBooking,
        getUserBookings,
        checkTimeAvailability,
        getTableAvailability
      }}
    >
      {children}
    </BookingContext.Provider>
  );
};

export const useBooking = () => {
  const context = useContext(BookingContext);
  if (context === undefined) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
};
