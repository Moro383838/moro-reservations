import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/contexts/AuthContext";
import { useBooking } from "@/contexts/BookingContext";
import { Button } from "@/components/ui/button";
import { bookingAPI } from "@/lib/api";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { CalendarIcon, ClockIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { RestaurantTable } from "@/types";

// Available time slots
const timeSlots = [
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
  "21:00",
  "21:30",
];

// Duration options
const durationOptions = [1, 2, 3, 4];

const tables: RestaurantTable[] = [
  {
    id: "1",
    name: "طاولة داخلية",
    capacity: 4,
    image:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "2",
    name: "طاولة خارجية",
    capacity: 4,
    image:
      "https://images.unsplash.com/photo-1552566626-52f8b828add9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "3",
    name: "طاولة VIP",
    capacity: 8,
    image:
      "https://images.unsplash.com/photo-1588429439379-7c63a127a403?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "4",
    name: "طاولة عائلية",
    capacity: 10,
    image:
      "https://images.unsplash.com/photo-1514933651103-005eec06c04b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
  },
];

const formSchema = z.object({
  tableId: z.string({
    required_error: "يرجى اختيار نوع الطاولة",
  }),
  date: z.date({
    required_error: "يرجى اختيار التاريخ",
  }),
  timeStart: z.string({
    required_error: "يرجى اختيار وقت الحجز",
  }),
  hours: z.coerce
    .number()
    .min(1, "يجب أن لا يقل عن ساعة واحدة")
    .max(4, "الحد الأقصى هو 4 ساعات"),
  guests: z.coerce
    .number()
    .min(1, "يجب أن لا يقل عن شخص واحد")
    .max(10, "الحد الأقصى هو 10 أشخاص"),
});

type FormValues = z.infer<typeof formSchema>;

const Restaurant = () => {
  const { isAuthenticated, user } = useAuth();
  const { createBooking, isLoading, checkTimeAvailability, getTableAvailability } = useBooking();
  const navigate = useNavigate();
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
  const [tableAvailability, setTableAvailability] = useState<{
    indoor: { available: boolean; availableCount: number; totalCount: number; availableTimes?: string[] };
    outdoor: { available: boolean; availableCount: number; totalCount: number; availableTimes?: string[] };
    vip: { available: boolean; availableCount: number; totalCount: number; availableTimes?: string[] };
    family: { available: boolean; availableCount: number; totalCount: number; availableTimes?: string[] };
  }>({    
    indoor: { available: false, availableCount: 0, totalCount: 0 },
    outdoor: { available: false, availableCount: 0, totalCount: 0 },
    vip: { available: false, availableCount: 0, totalCount: 0 },
    family: { available: false, availableCount: 0, totalCount: 0 }
  });
  
  // حالة لتخزين الأوقات المتاحة للطاولة المحددة
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      hours: 2,
      guests: 2,
    },
  });

  // تحديث معلومات توفر الطاولات عند تغيير التاريخ أو الوقت
  useEffect(() => {
    const updateTableAvailability = async () => {
      const date = form.getValues('date');
      const timeStart = form.getValues('timeStart');
      const hours = form.getValues('hours');

      if (date && timeStart && hours) {
        const formattedDate = format(date, "yyyy-MM-dd");
        
        // جلب معلومات توفر الطاولات لكل نوع
        const indoorAvailability = await getTableAvailability('indoor', formattedDate, timeStart, hours);
        const outdoorAvailability = await getTableAvailability('outdoor', formattedDate, timeStart, hours);
        const vipAvailability = await getTableAvailability('vip', formattedDate, timeStart, hours);
        const familyAvailability = await getTableAvailability('family', formattedDate, timeStart, hours);
        
        // التأكد من أن جميع البيانات تحتوي على قيم صالحة
        const ensureValidAvailability = (availability: any) => {
          if (!availability || typeof availability !== 'object') {
            return { available: true, availableCount: 5, totalCount: 10, availableTimes: [] };
          }
          // التأكد من وجود عدد الطاولات المتاحة
          if (typeof availability.availableCount !== 'number' || availability.availableCount < 0) {
            availability.availableCount = 5; // قيمة افتراضية
          }
          // التأكد من وجود إجمالي عدد الطاولات
          if (typeof availability.totalCount !== 'number' || availability.totalCount <= 0) {
            availability.totalCount = 10; // قيمة افتراضية
          }
          // التأكد من وجود حالة التوفر
          if (typeof availability.available !== 'boolean') {
            availability.available = availability.availableCount > 0; // تحديد التوفر بناءً على عدد الطاولات المتاحة
          }
          return availability;
        };

        // تحديث الأوقات المتاحة للطاولة المحددة إذا كانت غير متاحة
        if (selectedTable) {
          const tableTypeMap: Record<string, string> = {
            "1": "indoor",
            "2": "outdoor",
            "3": "vip",
            "4": "family"
          };
          
          const selectedTableType = tableTypeMap[selectedTable.id];
          if (selectedTableType) {
            const availability = {
              indoor: ensureValidAvailability(indoorAvailability),
              outdoor: ensureValidAvailability(outdoorAvailability),
              vip: ensureValidAvailability(vipAvailability),
              family: ensureValidAvailability(familyAvailability)
            }[selectedTableType];
            
            // تحقق من وجود أوقات متاحة بديلة وعرضها للمستخدم
            console.log(`توفر طاولات ${selectedTableType}:`, availability);
            if (availability && !availability.available) {
              console.log(`طاولات ${selectedTableType} غير متاحة، البحث عن أوقات بديلة`);
              if (availability.availableTimes && availability.availableTimes.length > 0) {
                console.log(`تم العثور على ${availability.availableTimes.length} أوقات متاحة بديلة`);
                setAvailableTimes(availability.availableTimes);
                toast.info(`لا توجد طاولات متاحة في الوقت المحدد. يمكنك اختيار أحد الأوقات المتاحة المعروضة أدناه`);
              } else {
                // إذا لم تكن هناك أوقات متاحة في الاستجابة، نحاول الحصول عليها من الخادم
                try {
                  const availableSlots = await bookingAPI.getAvailableTimeSlots({
                    type: 'restaurant',
                    date: formattedDate,
                    hours: hours
                  });
                  
                  if (availableSlots && availableSlots.availableSlots && availableSlots.availableSlots.length > 0) {
                    console.log(`تم العثور على ${availableSlots.availableSlots.length} أوقات متاحة من الخادم`);
                    setAvailableTimes(availableSlots.availableSlots);
                    toast.info(`لا توجد طاولات متاحة في الوقت المحدد. يمكنك اختيار أحد الأوقات المتاحة المعروضة أدناه`);
                  } else {
                    setAvailableTimes([]);
                  }
                } catch (error) {
                  console.error('خطأ في الحصول على الأوقات المتاحة:', error);
                  setAvailableTimes([]);
                }
              }
            } else {
              // إذا كانت الطاولات متاحة، نمسح قائمة الأوقات المتاحة البديلة
              setAvailableTimes([]);
            }
            
            if (availability && !availability.available && availability.availableTimes) {
              setAvailableTimes(availability.availableTimes);
            } else {
              setAvailableTimes([]);
            }
          }
        }

        setTableAvailability({
          indoor: ensureValidAvailability(indoorAvailability),
          outdoor: ensureValidAvailability(outdoorAvailability),
          vip: ensureValidAvailability(vipAvailability),
          family: ensureValidAvailability(familyAvailability)
        });
      }
    };

    updateTableAvailability();
  }, [form.watch('date'), form.watch('timeStart'), form.watch('hours'), getTableAvailability]);

  const onTableSelect = (tableId: string) => {
    const table = tables.find((t) => t.id === tableId);
    if (table) {
      setSelectedTable(table);
      form.setValue("tableId", tableId);
      form.setValue(
        "guests",
        Math.min(form.getValues("guests"), table.capacity)
      );
      
      // عرض معلومات توفر الطاولات المحددة
      const tableTypeMap: Record<string, string> = {
        "1": "indoor",
        "2": "outdoor",
        "3": "vip",
        "4": "family"
      };
      
      const selectedTableType = tableTypeMap[tableId];
      if (selectedTableType && tableAvailability[selectedTableType]) {
        const availability = tableAvailability[selectedTableType];
        if (availability.availableCount > 0) {
          toast.success(`متاح ${availability.availableCount} طاولة من أصل ${availability.totalCount}`);
        } else {
          toast.error(`لا توجد طاولات متاحة من هذا النوع في الوقت المحدد`);
          if (availability.availableTimes && availability.availableTimes.length > 0) {
            setAvailableTimes(availability.availableTimes);
          }
        }
      }
    }
  };

  const onSubmit = async (data: FormValues) => {
    if (!isAuthenticated) {
      toast.error("يرجى تسجيل الدخول للاستمرار");
      navigate("/login");
      return;
    }

    try {
      if (!selectedTable) {
        toast.error("يرجى اختيار نوع الطاولة");
        return;
      }

      // التحقق من توفر الوقت قبل إنشاء الحجز
      try {
        const result = await checkTimeAvailability(
          "restaurant",
          format(data.date, "yyyy-MM-dd"),
          data.timeStart,
          data.hours
        );
        
        // إذا كان الوقت غير متاح، نعرض الأوقات المتاحة للمستخدم
        if (result && typeof result === 'object' && 'available' in result && !result.available) {
          // عرض الأوقات المتاحة للمستخدم
          if (result.availableTimes && Array.isArray(result.availableTimes) && result.availableTimes.length > 0) {
            setAvailableTimes(result.availableTimes);
            toast.error(`هذا الوقت محجوز بالفعل. يرجى اختيار أحد الأوقات المتاحة المعروضة أدناه`);
          } else {
            setAvailableTimes([]);
            toast.error('هذا الوقت محجوز بالفعل. لا توجد أوقات متاحة في هذا اليوم، يرجى اختيار يوم آخر');
          }
          return;
        }
      } catch (error: any) {
        // إذا كان هناك خطأ محدد من التحقق من التوفر
        if (error.message && error.message.includes('هذا الوقت محجوز بالفعل')) {
          // نحاول الحصول على الأوقات المتاحة
          try {
            const availableSlots = await bookingAPI.getAvailableTimeSlots({
              type: 'restaurant',
              date: format(data.date, "yyyy-MM-dd"),
              hours: data.hours
            });
            
            if (availableSlots && availableSlots.availableSlots && availableSlots.availableSlots.length > 0) {
              toast.error(`هذا الوقت محجوز بالفعل. الأوقات المتاحة في هذا اليوم: ${availableSlots.availableSlots.join(', ')}`);
            } else {
              toast.error('هذا الوقت محجوز بالفعل. لا توجد أوقات متاحة في هذا اليوم، يرجى اختيار يوم آخر');
            }
          } catch (slotError) {
            toast.error('هذا الوقت محجوز بالفعل. يرجى اختيار وقت آخر');
          }
          return;
        }
        throw error; // إعادة رمي الأخطاء الأخرى
      }

      // تحديد نوع الطاولة بناءً على الطاولة المحددة
      const tableTypeMap: Record<string, string> = {
        "1": "indoor",
        "2": "outdoor",
        "3": "vip",
        "4": "family"
      };
      
      await createBooking({
        userId: user!.id,
        type: "restaurant",
        date: format(data.date, "yyyy-MM-dd"),
        timeStart: data.timeStart,
        hours: data.hours,
        guests: data.guests,
        tableType: tableTypeMap[data.tableId] // إضافة نوع الطاولة للحجز
      });

      toast.success("تم حجز الطاولة بنجاح");
      navigate("/bookings");
    } catch (error) {
      console.error("Restaurant booking error:", error);
      toast.error("حدث خطأ أثناء الحجز");
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-resort-purple">
          مطعم منتجع الجنة
        </h1>
        <p className="text-xl mt-2 text-gray-600">
          استمتع بأشهى المأكولات في أجواء راقية
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        {/* معلومات توفر الطاولات */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">توفر الطاولات</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className={`border rounded-lg p-3 ${tableAvailability.indoor.available ? 'bg-green-50' : 'bg-red-50'}`}>
              <h3 className="font-medium text-lg">طاولات داخلية</h3>
              <p className="text-sm text-gray-600">المتاح: {tableAvailability.indoor.availableCount} من أصل {tableAvailability.indoor.totalCount}</p>
              {!tableAvailability.indoor.available && tableAvailability.indoor.availableTimes && tableAvailability.indoor.availableTimes.length > 0 && (
                <p className="text-xs text-blue-600 mt-1">هناك أوقات متاحة أخرى</p>
              )}
            </div>
            <div className={`border rounded-lg p-3 ${tableAvailability.outdoor.available ? 'bg-green-50' : 'bg-red-50'}`}>
              <h3 className="font-medium text-lg">طاولات خارجية</h3>
              <p className="text-sm text-gray-600">المتاح: {tableAvailability.outdoor.availableCount} من أصل {tableAvailability.outdoor.totalCount}</p>
              {!tableAvailability.outdoor.available && tableAvailability.outdoor.availableTimes && tableAvailability.outdoor.availableTimes.length > 0 && (
                <p className="text-xs text-blue-600 mt-1">هناك أوقات متاحة أخرى</p>
              )}
            </div>
            <div className={`border rounded-lg p-3 ${tableAvailability.vip.available ? 'bg-green-50' : 'bg-red-50'}`}>
              <h3 className="font-medium text-lg">طاولات VIP</h3>
              <p className="text-sm text-gray-600">المتاح: {tableAvailability.vip.availableCount} من أصل {tableAvailability.vip.totalCount}</p>
              {!tableAvailability.vip.available && tableAvailability.vip.availableTimes && tableAvailability.vip.availableTimes.length > 0 && (
                <p className="text-xs text-blue-600 mt-1">هناك أوقات متاحة أخرى</p>
              )}
            </div>
            <div className={`border rounded-lg p-3 ${tableAvailability.family.available ? 'bg-green-50' : 'bg-red-50'}`}>
              <h3 className="font-medium text-lg">طاولات عائلية</h3>
              <p className="text-sm text-gray-600">المتاح: {tableAvailability.family.availableCount} من أصل {tableAvailability.family.totalCount}</p>
              {!tableAvailability.family.available && tableAvailability.family.availableTimes && tableAvailability.family.availableTimes.length > 0 && (
                <p className="text-xs text-blue-600 mt-1">هناك أوقات متاحة أخرى</p>
              )}
            </div>
          </div>
          
          {/* عرض الأوقات المتاحة إذا كانت الطاولة المحددة غير متاحة */}
          {availableTimes.length > 0 && (
            <div className="mt-4 p-3 border rounded-lg bg-blue-50">
              <h3 className="font-medium text-lg mb-2">الأوقات المتاحة البديلة:</h3>
              <div className="flex flex-wrap gap-2">
                {availableTimes.map((time) => (
                  <Button 
                    key={time} 
                    variant="outline" 
                    size="sm"
                    className="bg-white hover:bg-blue-100"
                    onClick={() => form.setValue("timeStart", time)}
                  >
                    {time}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Table Selection */}
        <div className="space-y-8">
          <h2 className="text-2xl font-semibold">اختر نوع الطاولة</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tables.map((table) => (
              <Card
                key={table.id}
                className={cn(
                  "cursor-pointer transition-all overflow-hidden",
                  selectedTable?.id === table.id
                    ? "ring-2 ring-resort-purple shadow-lg"
                    : "hover:shadow-md"
                )}
                onClick={() => onTableSelect(table.id)}
              >
                <div className="h-48 bg-gray-200 relative">
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${table.image})` }}
                  />
                </div>
                <CardHeader>
                  <CardTitle>{table.name}</CardTitle>
                </CardHeader>
                <CardFooter>
                  <div className="flex flex-col space-y-2">
                    <p>تتسع لـ {table.capacity} أشخاص</p>
                    {tableAvailability && table.id === "1" && (
                      <span className="text-sm mt-1">
                        متاح: {tableAvailability.indoor.availableCount} من {tableAvailability.indoor.totalCount}
                      </span>
                    )}
                    {tableAvailability && table.id === "2" && (
                      <span className="text-sm mt-1">
                        متاح: {tableAvailability.outdoor.availableCount} من {tableAvailability.outdoor.totalCount}
                      </span>
                    )}
                    {tableAvailability && table.id === "3" && (
                      <span className="text-sm mt-1">
                        متاح: {tableAvailability.vip.availableCount} من {tableAvailability.vip.totalCount}
                      </span>
                    )}
                    {tableAvailability && table.id === "4" && (
                      <span className="text-sm mt-1">
                        متاح: {tableAvailability.family.availableCount} من {tableAvailability.family.totalCount}
                      </span>
                    )}
                  </div>
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
              {/* Table Type - Hidden, handled by card selection */}
              <input type="hidden" {...form.register("tableId")} />

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

              {/* Time */}
              <FormField
                control={form.control}
                name="timeStart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الوقت</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="حدد وقت الحضور" />
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
                      <Select
                        onValueChange={(value) =>
                          field.onChange(parseInt(value))
                        }
                        defaultValue={field.value.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="حدد المدة" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {durationOptions.map((hours) => (
                            <SelectItem key={hours} value={hours.toString()}>
                              {hours} {hours === 1 ? "ساعة" : "ساعات"}
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
                          min={1}
                          max={selectedTable?.capacity || 10}
                          {...field}
                        />
                      </FormControl>
                      {selectedTable && (
                        <FormDescription>
                          الحد الأقصى {selectedTable.capacity} ضيوف
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Summary */}
              {selectedTable && form.watch("timeStart") && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-semibold">ملخص الحجز:</p>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between">
                      <span>نوع الطاولة:</span>
                      <span>{selectedTable.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>التاريخ:</span>
                      <span>
                        {form.watch("date")
                          ? format(form.watch("date"), "yyyy/MM/dd")
                          : "-"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>الوقت:</span>
                      <span>{form.watch("timeStart")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>المدة:</span>
                      <span>
                        {form.watch("hours")}{" "}
                        {form.watch("hours") === 1 ? "ساعة" : "ساعات"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>عدد الضيوف:</span>
                      <span>{form.watch("guests")}</span>
                    </div>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !selectedTable}
              >
                {isLoading ? "جاري الحجز..." : "تأكيد الحجز"}
              </Button>

              {!isAuthenticated && (
                <p className="text-center text-sm text-gray-500 mt-4">
                  يجب تسجيل الدخول للحجز.
                  <Button
                    variant="link"
                    className="p-0 mx-1 h-auto"
                    onClick={() => navigate("/login")}
                  >
                    تسجيل الدخول
                  </Button>
                </p>
              )}
            </form>
          </Form>
        </div>
      </div>

      {/* Menu Highlights Section */}
      <section className="mt-20">
        <h2 className="text-2xl font-bold text-center mb-8">أشهر أطباقنا</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="rounded-lg overflow-hidden shadow">
            <div
              className="h-48 bg-cover bg-center"
              style={{
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1601050690597-df0568f70950?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80')",
              }}
            ></div>
            <div className="p-4">
              <h3 className="font-semibold text-lg">لحم مشوي</h3>
              <p className="text-gray-600 text-sm">
                لحم مشوي طازج مع صلصة خاصة
              </p>
            </div>
          </div>

          <div className="rounded-lg overflow-hidden shadow">
            <div
              className="h-48 bg-cover bg-center"
              style={{
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1555939594-58d7cb561ad1?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80')",
              }}
            ></div>
            <div className="p-4">
              <h3 className="font-semibold text-lg">سلمون مشوي</h3>
              <p className="text-gray-600 text-sm">
                سلمون طازج مع الخضروات المشوية
              </p>
            </div>
          </div>

          <div className="rounded-lg overflow-hidden shadow">
            <div
              className="h-48 bg-cover bg-center"
              style={{
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1611270629569-8b357cb88da9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80')",
              }}
            ></div>
            <div className="p-4">
              <h3 className="font-semibold text-lg">باستا الروبيان</h3>
              <p className="text-gray-600 text-sm">
                باستا شهية مع الروبيان الطازج
              </p>
            </div>
          </div>

          <div className="rounded-lg overflow-hidden shadow">
            <div
              className="h-48 bg-cover bg-center"
              style={{
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1551024506-0bccd828d307?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80')",
              }}
            ></div>
            <div className="p-4">
              <h3 className="font-semibold text-lg">كيكة الشوكولاتة</h3>
              <p className="text-gray-600 text-sm">
                حلوى شهية مع صوص الشوكولاتة
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Restaurant;
