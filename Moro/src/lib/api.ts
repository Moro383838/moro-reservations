// API service for connecting to the backend

// Base URL for API requests
// استخدام window.location.hostname للحصول على اسم المضيف الحالي بدلاً من localhost
// هذا يسمح للتطبيق بالعمل على الشبكة وليس فقط على localhost
const API_URL = `http://${window.location.hostname}:5000/api`;

// للاختبار المحلي، يمكن استخدام عنوان محدد
// const API_URL = 'http://localhost:5000/api';

// Helper function to handle API responses
const handleResponse = async (response: Response) => {
  try {
    // محاولة تحليل البيانات كـ JSON
    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      console.error('خطأ في تحليل استجابة JSON:', jsonError);
      throw new Error('خطأ في استجابة الخادم، يرجى المحاولة مرة أخرى');
    }
    
    if (!response.ok) {
      const error = data.message || response.statusText || `خطأ في الخادم: ${response.status}`;
      console.error(`API Error (${response.status}): ${error}`);
      throw new Error(error);
    }
    
    return data;
  } catch (error) {
    if (error instanceof SyntaxError) {
      // تعامل مع أخطاء تحليل JSON
      console.error('Invalid JSON response from server:', error);
      throw new Error('خطأ في استجابة الخادم، يرجى المحاولة مرة أخرى');
    }
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      console.error('Network error:', error);
      throw new Error('فشل الاتصال بالخادم، يرجى التحقق من اتصالك بالإنترنت');
    }
    throw error; // إعادة رمي الأخطاء الأخرى
  }
};

// Authentication API calls
export const authAPI = {
  register: async (userData: { firstName: string; lastName: string; email: string; password: string }) => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    return handleResponse(response);
  },
  
  login: async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(response);
  },
  
  getProfile: async (token: string) => {
    const response = await fetch(`${API_URL}/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    return handleResponse(response);
  },
  
  updateProfile: async (token: string, userData: any) => {
    const response = await fetch(`${API_URL}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    return handleResponse(response);
  },
};

// Booking API calls
export const bookingAPI = {
  createBooking: async (token: string, bookingData: any) => {
    try {
      // التحقق من وجود البيانات المطلوبة
      if (!bookingData.type || !bookingData.date || !bookingData.guests) {
        throw new Error('بيانات الحجز غير مكتملة');
      }

      // التحقق من وجود الوقت والساعات لحجوزات المطعم وقاعات الأفراح
      if ((bookingData.type === 'restaurant' || bookingData.type === 'wedding') && 
          (!bookingData.timeStart || !bookingData.hours)) {
        throw new Error('يرجى تحديد وقت البدء ومدة الحجز');
      }
      
      // التحقق من وجود معرف الغرفة وعدد الليالي لحجوزات الفندق
      if (bookingData.type === 'hotel' && (!bookingData.roomId || !bookingData.nights)) {
        throw new Error('يرجى تحديد الغرفة وعدد الليالي');
      }

      // إضافة رقم الهاتف إذا لم يكن موجودًا
      if (!bookingData.contactPhone) {
        console.warn('رقم الهاتف غير موجود في بيانات الحجز');
        // تعيين قيمة افتراضية لرقم الهاتف لتجنب الأخطاء
        bookingData.contactPhone = '';
      }

      // تأكد من أن الملاحظات موجودة
      if (!bookingData.notes) {
        bookingData.notes = '';
      }

      console.log('إرسال بيانات الحجز:', JSON.stringify(bookingData, null, 2));
      
      try {
        const response = await fetch(`${API_URL}/bookings`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(bookingData),
        });
        
        // تسجيل استجابة الخادم للتصحيح
        console.log(`استجابة الخادم: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
          let errorMessage = `فشل الحجز مع رمز الخطأ: ${response.status}`;
          try {
            const errorData = await response.json();
            console.error('تفاصيل خطأ الخادم:', errorData);
            errorMessage = errorData.message || errorMessage;
          } catch (jsonError) {
            console.error('تعذر قراءة تفاصيل الخطأ من الخادم:', jsonError);
          }
          throw new Error(errorMessage);
        }
        
        return await handleResponse(response);
      } catch (fetchError) {
        console.error('خطأ في الاتصال بالخادم:', fetchError);
        if (fetchError instanceof TypeError && fetchError.message.includes('Failed to fetch')) {
          throw new Error('فشل الاتصال بالخادم، يرجى التحقق من اتصالك بالإنترنت');
        }
        throw fetchError;
      }
    } catch (error) {
      console.error('Error in createBooking API call:', error);
      throw error; // رمي الخطأ مرة أخرى ليتم معالجته في BookingContext
    }
  },
  
  getUserBookings: async (token: string) => {
    try {
      const response = await fetch(`${API_URL}/bookings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error in getUserBookings API call:', error);
      throw error; // رمي الخطأ مرة أخرى ليتم معالجته في BookingContext
    }
  },
  
  getBookingById: async (token: string, bookingId: string) => {
    const response = await fetch(`${API_URL}/bookings/${bookingId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    return handleResponse(response);
  },
  
  cancelBooking: async (token: string, bookingId: string) => {
    try {
      const response = await fetch(`${API_URL}/bookings/${bookingId}/cancel`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error in cancelBooking API call:', error);
      throw error; // رمي الخطأ مرة أخرى ليتم معالجته في BookingContext
    }
  },
  
  checkAvailability: async (params: any) => {
    try {
      // تحقق من وجود البيانات المطلوبة
      if (!params.type || !params.date || (params.type !== 'hotel' && (!params.timeStart || !params.hours))) {
        throw new Error('بيانات غير مكتملة للتحقق من توفر الوقت');
      }

      console.log('التحقق من توفر الوقت:', params);
      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(`${API_URL}/bookings/availability?${queryString}`);
      
      // تسجيل استجابة الخادم للتصحيح
      console.log(`استجابة الخادم للتحقق من التوفر: ${response.status} ${response.statusText}`);
      
      // التعامل مع الاستجابة
      if (!response.ok) {
        console.warn(`خطأ في استجابة التحقق من التوفر: ${response.status}`);
        // في حالة حدوث خطأ في الخادم، نفترض أن الوقت متاح بدلاً من افتراض أنه غير متاح
        // هذا يسمح للمستخدم بمحاولة الحجز على الأقل
        return { available: true, message: "لم نتمكن من التحقق من التوفر، يمكنك محاولة الحجز" };
      }
      
      const result = await handleResponse(response);
      console.log('نتيجة التحقق من التوفر:', result);
      
      // بدلاً من رمي خطأ، نقوم بإرجاع كائن يحتوي على معلومات التوفر
      // هذا يسمح لوظيفة checkTimeAvailability بمعالجة الحالة بشكل صحيح
      return result;
    } catch (error) {
      console.error('Error in checkAvailability API call:', error);
      // بدلاً من افتراض أن الوقت غير متاح في حالة الخطأ، نفترض أنه متاح
      // هذا يسمح للمستخدم بمحاولة الحجز على الأقل، وسيتم التحقق مرة أخرى عند إنشاء الحجز
      return { available: true, message: "حدث خطأ أثناء التحقق من التوفر، يمكنك محاولة الحجز" };
    }
  },
  
  getAvailableTimeSlots: async (params: { type: string, date: string, hours: number, prioritizeAvailability?: boolean }) => {
    try {
      // تحقق من وجود البيانات المطلوبة
      if (!params.type || !params.date || !params.hours) {
        console.error('بيانات غير مكتملة للحصول على الأوقات المتاحة:', params);
        return { availableSlots: [] };
      }
      
      const requestParams = {
        ...params,
        prioritizeAvailability: params.prioritizeAvailability === true // إعطاء الأولوية للتوفر إذا تم تحديد ذلك
      };
      
      console.log('إرسال طلب للحصول على الأوقات المتاحة مع المعلمات:', requestParams);
      console.log(`إعطاء الأولوية للتوفر قبل الوقت: ${requestParams.prioritizeAvailability}`);
      
      console.log('جلب الأوقات المتاحة:', params);
      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(`${API_URL}/bookings/available-slots?${queryString}`);
      const result = await handleResponse(response);
      
      // تأكد من أن النتيجة تحتوي على مصفوفة الأوقات المتاحة
      if (!result || !result.availableSlots) {
        console.warn('استجابة الخادم لا تحتوي على أوقات متاحة:', result);
        return { availableSlots: [] };
      }
      
      return result;
    } catch (error) {
      console.error('Error in getAvailableTimeSlots API call:', error);
      return { availableSlots: [] };
    }
  },
  
  // دالة للحصول على معلومات توفر الطاولات
  getTableAvailability: async (params: { tableType: string, date: string, timeStart: string, hours: number, specificTypeOnly?: boolean, prioritizeAvailability?: boolean }) => {
    try {
      // تحقق من وجود البيانات المطلوبة
      if (!params.tableType || !params.date || !params.timeStart || !params.hours) {
        console.error('بيانات غير مكتملة للحصول على توفر الطاولات:', params);
        // تعيين قيم افتراضية في حالة عدم وجود بيانات كافية
        return { 
          available: false, 
          availableCount: 0, 
          totalCount: 10, 
          availableTimes: [],
          message: 'بيانات غير مكتملة للتحقق من توفر الطاولات'
        };
      }
      
      console.log('جلب معلومات توفر الطاولات:', params);
      try {
        // تعريف عدد الطاولات المتاحة لكل نوع
        const tableTypes = {
          'طاولة عائلية': 10,
          'طاولة داخلية': 15,
          'طاولة VIP': 10,
          'طاولة خارجية': 10
        };
        
        // تحسين معالجة معلمات الطلب
        // إذا كانت specificTypeOnly محددة، نستخدم قيمتها، وإلا نستخدم true كقيمة افتراضية
        // هذا يضمن أن النظام يتحقق فقط من توفر الطاولات من النوع المطلوب بشكل افتراضي
        // إضافة معلمة prioritizeAvailability لإعطاء الأولوية للتوفر قبل الوقت
        const requestParams = {
          ...params,
          specificTypeOnly: params.specificTypeOnly !== false, // القيمة الافتراضية هي true
          prioritizeAvailability: params.prioritizeAvailability === true // إعطاء الأولوية للتوفر إذا تم تحديد ذلك
        };
        
        console.log('إرسال طلب التحقق من توفر الطاولات مع المعلمات:', requestParams);
        console.log(`التحقق من توفر طاولات من نوع: ${params.tableType} فقط: ${requestParams.specificTypeOnly}`);
        console.log(`إعطاء الأولوية للتوفر قبل الوقت: ${requestParams.prioritizeAvailability}`);
        
        // محاولة الاتصال بالخادم للتحقق من توفر الطاولات
        try {
          const response = await fetch(`${API_URL}/bookings/availability/tables`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestParams),
          });
          
          const result = await handleResponse(response);
          
          // التأكد من أن النتيجة تحتوي على عدد الطاولات المتاحة والإجمالي
          if (result && typeof result.availableCount === 'undefined') {
            console.warn('استجابة الخادم لا تحتوي على عدد الطاولات المتاحة');
            // تعيين قيم افتراضية إذا لم تكن موجودة - نفترض أن جميع الطاولات متاحة
            const totalCount = tableTypes[params.tableType] || 10;
            result.availableCount = totalCount;
            result.totalCount = totalCount;
            result.available = true;
          }
          
          // تأكد من أن عدد الطاولات المتاحة هو رقم صحيح
          if (result) {
            if (typeof result.availableCount !== 'number') {
              // إذا كانت القيمة غير صالحة، نفترض أن جميع الطاولات متاحة
              const totalCount = tableTypes[params.tableType] || 10;
              result.availableCount = totalCount;
              result.available = true;
            }
            
            // تعيين حالة التوفر بناءً على عدد الطاولات المتاحة
            // إذا كان هناك طاولة واحدة على الأقل متاحة، فإن الحجز متاح
            result.available = result.availableCount > 0;
            
            // إضافة رسالة توضيحية للمستخدم
            if (!result.available) {
              // تحسين الرسالة لتوضيح أن التحقق تم على نوع محدد من الطاولات
              if (requestParams.specificTypeOnly) {
                result.message = `جميع طاولات ${params.tableType} محجوزة في الوقت ${params.timeStart}`;
              } else {
                result.message = `لا توجد طاولات متاحة في الوقت ${params.timeStart}`;
              }
            } else {
              // إضافة رسالة إيجابية عند توفر الطاولات
              result.message = `متاح ${result.availableCount} طاولة من نوع ${params.tableType} في الوقت ${params.timeStart}`;
            }
            
            // إذا كانت جميع الطاولات محجوزة (غير متاحة)، نحاول الحصول على الأوقات المتاحة
            if (!result.available) {
              console.log(`جميع طاولات ${params.tableType} محجوزة في الوقت ${params.timeStart}، جاري البحث عن أوقات متاحة بديلة...`);
              
              // جلب الأوقات المتاحة من الخادم
              try {
                // بناء عنوان URL مع معلمات الاستعلام
                const queryParams = new URLSearchParams({
                  type: 'restaurant',
                  date: params.date,
                  hours: params.hours.toString()
                }).toString();
                
                const availableTimesResponse = await fetch(`${API_URL}/bookings/available-slots?${queryParams}`, {
                  method: 'GET',
                  headers: {
                    'Content-Type': 'application/json',
                  }
                });
                
                const availableTimesResult = await handleResponse(availableTimesResponse);
                
                if (availableTimesResult && availableTimesResult.availableSlots && availableTimesResult.availableSlots.length > 0) {
                  console.log('تم العثور على أوقات متاحة بديلة:', availableTimesResult.availableSlots);
                  result.availableTimes = availableTimesResult.availableSlots;
                } else {
                  // إذا لم نتمكن من الحصول على أوقات متاحة من الخادم، نستخدم قائمة افتراضية
                  const defaultTimes = [
                    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
                    '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
                    '21:00', '21:30'
                  ];
                  
                  // استبعاد الوقت الحالي من القائمة
                  result.availableTimes = defaultTimes.filter(time => time !== params.timeStart);
                  console.log('استخدام أوقات افتراضية متاحة:', result.availableTimes);
                }
              } catch (timesError) {
                console.error('خطأ في جلب الأوقات المتاحة:', timesError);
                // تعيين قائمة افتراضية للأوقات المتاحة
                result.availableTimes = [
                  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
                  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
                  '21:00', '21:30'
                ].filter(time => time !== params.timeStart);
              }
            }
          }
          
          // إضافة معالجة للأوقات المتاحة إذا كانت موجودة في النتيجة
          if (result && result.availableTimes) {
            console.log('الأوقات المتاحة للطاولة:', result.availableTimes);
          }
          
          return result;
        } catch (fetchError) {
          console.error('خطأ في الاتصال بالخادم:', fetchError);
          // في حالة فشل الاتصال بالخادم، نفترض أن جميع الطاولات متاحة
          const totalCount = tableTypes[params.tableType] || 10;
          return {
            available: true,
            availableCount: totalCount,
            totalCount: totalCount,
            message: `متاح ${totalCount} طاولة من نوع ${params.tableType} في الوقت ${params.timeStart}`,
            availableTimes: []
          };
        }
      } catch (fetchError) {
        console.error('خطأ في الاتصال بالخادم:', fetchError);
        // تعيين قيم افتراضية في حالة فشل الاتصال بالخادم - نفترض أن الطاولات متاحة
        const totalCount = tableTypes[params.tableType] || 10;
        return { 
          available: true, 
          availableCount: totalCount, 
          totalCount: totalCount, 
          availableTimes: [],
          message: `متاح ${totalCount} طاولة من نوع ${params.tableType} في الوقت ${params.timeStart}`
        };
      }
    } catch (error) {
      console.error('Error in getTableAvailability API call:', error);
      // تعيين قيم افتراضية في حالة حدوث خطأ - نفترض أن الطاولات متاحة بدلاً من غير متاحة
      // هذا يسمح للمستخدم بمحاولة الحجز على الأقل
      const totalCount = tableTypes[params.tableType] || 10;
      return { 
        available: true, 
        availableCount: totalCount, 
        totalCount: totalCount, 
        availableTimes: [],
        message: `متاح ${totalCount} طاولة من نوع ${params.tableType} في الوقت ${params.timeStart}`
      };
    }
  },
  
  // دالة للحصول على الأيام المتاحة في شهر معين
  getAvailableDays: async (params: { type: string, month: string }) => {
    try {
      // تحقق من وجود البيانات المطلوبة
      if (!params.type || !params.month) {
        console.error('بيانات غير مكتملة للحصول على الأيام المتاحة:', params);
        return { availableDays: [] };
      }
      
      console.log('جلب الأيام المتاحة للشهر:', params);
      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(`${API_URL}/bookings/available-days?${queryString}`);
      const result = await handleResponse(response);
      
      // تأكد من أن النتيجة تحتوي على مصفوفة الأيام المتاحة
      if (!result || !result.availableDays) {
        console.warn('استجابة الخادم لا تحتوي على أيام متاحة:', result);
        return { availableDays: [] };
      }
      
      return result;
    } catch (error) {
      console.error('Error in getAvailableDays API call:', error);
      return { availableDays: [] };
    }
  },
  
  // دالة للتحقق من توفر صالة الأفراح في يوم معين
  checkWeddingHallAvailability: async (date: string) => {
    try {
      if (!date) {
        console.error('التاريخ مطلوب للتحقق من توفر صالة الأفراح');
        // تعيين قيمة افتراضية في حالة عدم وجود تاريخ
        return { available: true, availableDays: [] };
      }
      
      console.log('التحقق من توفر صالة الأفراح في التاريخ:', date);
      try {
        const response = await fetch(`${API_URL}/bookings/availability/wedding?date=${date}`);
        const result = await handleResponse(response);
        
        // إذا كانت صالة الأفراح غير متاحة، نحاول الحصول على الأيام المتاحة
        if (!result.available) {
          try {
            // استخراج الشهر من التاريخ (YYYY-MM-DD)
            const month = date.substring(0, 7); // يأخذ YYYY-MM
            const availableDaysResult = await bookingAPI.getAvailableDays({
              type: 'wedding',
              month: month
            });
            
            if (availableDaysResult && availableDaysResult.availableDays) {
              result.availableDays = availableDaysResult.availableDays;
            }
          } catch (daysError) {
            console.error('خطأ في الحصول على الأيام المتاحة لصالة الأفراح:', daysError);
          }
        }
        
        return result;
      } catch (fetchError) {
        console.error('خطأ في الاتصال بالخادم للتحقق من توفر صالة الأفراح:', fetchError);
        // تعيين قيمة افتراضية في حالة فشل الاتصال بالخادم
        // نفترض أن صالة الأفراح متاحة في حالة فشل الاتصال بالخادم
        return { available: true, availableDays: [] };
      }
    } catch (error) {
      console.error('Error in checkWeddingHallAvailability API call:', error);
      // تعيين قيمة افتراضية في حالة حدوث خطأ
      // نفترض أن صالة الأفراح متاحة في حالة حدوث خطأ
      return { available: true, availableDays: [] };
    }
  },
};