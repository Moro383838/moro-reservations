
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { 
  HotelIcon, 
  UtensilsIcon, 
  CalendarIcon, 
  UsersIcon 
} from 'lucide-react';

const Index = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-resort-purple to-resort-purpleDark text-white py-20 px-4">
        <div className="container mx-auto grid md:grid-cols-2 gap-8 items-center">
          <div className="animate-fade-in">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">منتجع الجنة</h1>
            <p className="text-xl mb-8">
              تمتع بتجربة فريدة من نوعها في منتجعنا الفاخر، الذي يجمع بين الراحة والرفاهية في مكان واحد
            </p>
            <div className="flex flex-wrap gap-4">
              <Button asChild size="lg">
                <Link to="/hotel">حجز غرفة</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to={isAuthenticated ? '/bookings' : '/login'}>
                  {isAuthenticated ? 'حجوزاتي' : 'تسجيل الدخول'}
                </Link>
              </Button>
            </div>
          </div>
          <div className="hidden md:flex justify-center">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-6 w-full max-w-md border border-white/30">
              <h2 className="text-2xl font-bold mb-4 text-center">استمتع بخدماتنا</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-lg p-4 flex flex-col items-center">
                  <HotelIcon className="h-12 w-12 mb-3" />
                  <span className="text-lg font-medium">فندق فاخر</span>
                </div>
                <div className="bg-white/10 rounded-lg p-4 flex flex-col items-center">
                  <UtensilsIcon className="h-12 w-12 mb-3" />
                  <span className="text-lg font-medium">مطعم راقي</span>
                </div>
                <div className="bg-white/10 rounded-lg p-4 flex flex-col items-center">
                  <CalendarIcon className="h-12 w-12 mb-3" />
                  <span className="text-lg font-medium">صالة أفراح</span>
                </div>
                <div className="bg-white/10 rounded-lg p-4 flex flex-col items-center">
                  <UsersIcon className="h-12 w-12 mb-3" />
                  <span className="text-lg font-medium">خدمة متميزة</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Services */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">خدماتنا المميزة</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Hotel */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden transition-transform hover:scale-105">
              <div className="h-48 bg-gray-300 relative">
                <div className="absolute inset-0 bg-cover bg-center" style={{backgroundImage: "url('https://images.unsplash.com/photo-1566665797739-1674de7a421a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80')"}}></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-4">
                  <h3 className="text-2xl font-bold text-white">الفندق</h3>
                </div>
              </div>
              <div className="p-6">
                <p className="text-gray-700 mb-4">
                  غرف وأجنحة فاخرة مع إطلالات خلابة ووسائل راحة حديثة لإقامة لا تُنسى
                </p>
                <Button asChild className="w-full">
                  <Link to="/hotel">حجز غرفة</Link>
                </Button>
              </div>
            </div>

            {/* Restaurant */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden transition-transform hover:scale-105">
              <div className="h-48 bg-gray-300 relative">
                <div className="absolute inset-0 bg-cover bg-center" style={{backgroundImage: "url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80')"}}></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-4">
                  <h3 className="text-2xl font-bold text-white">المطعم</h3>
                </div>
              </div>
              <div className="p-6">
                <p className="text-gray-700 mb-4">
                  أشهى المأكولات المحلية والعالمية في أجواء راقية مع خدمة متميزة
                </p>
                <Button asChild className="w-full">
                  <Link to="/restaurant">حجز طاولة</Link>
                </Button>
              </div>
            </div>

            {/* Wedding Hall */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden transition-transform hover:scale-105">
              <div className="h-48 bg-gray-300 relative">
                <div className="absolute inset-0 bg-cover bg-center" style={{backgroundImage: "url('https://images.unsplash.com/photo-1519741497674-611481863552?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80')"}}></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-4">
                  <h3 className="text-2xl font-bold text-white">صالة الأفراح</h3>
                </div>
              </div>
              <div className="p-6">
                <p className="text-gray-700 mb-4">
                  صالة فاخرة للاحتفالات والمناسبات السعيدة مع تجهيزات متكاملة
                </p>
                <Button asChild className="w-full">
                  <Link to="/wedding">حجز صالة</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">آراء عملاؤنا</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center mb-4">
                <div className="h-12 w-12 rounded-full bg-resort-purple flex items-center justify-center text-white font-bold text-xl">م</div>
                <div className="mr-4">
                  <h4 className="font-semibold">محمد عبدالله</h4>
                  <p className="text-sm text-gray-500">زبون سابق</p>
                </div>
              </div>
              <p className="text-gray-700">
                "إقامة رائعة في منتجع الجنة، الغرف مريحة والخدمة ممتازة. سأعود مرة أخرى بالتأكيد."
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center mb-4">
                <div className="h-12 w-12 rounded-full bg-resort-purple flex items-center justify-center text-white font-bold text-xl">س</div>
                <div className="mr-4">
                  <h4 className="font-semibold">سارة محمد</h4>
                  <p className="text-sm text-gray-500">زبون سابق</p>
                </div>
              </div>
              <p className="text-gray-700">
                "احتفلنا بعرسنا في صالة الأفراح وكان كل شيء مثاليًا، من التنظيم إلى الضيافة!"
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center mb-4">
                <div className="h-12 w-12 rounded-full bg-resort-purple flex items-center justify-center text-white font-bold text-xl">ف</div>
                <div className="mr-4">
                  <h4 className="font-semibold">فهد سعيد</h4>
                  <p className="text-sm text-gray-500">زبون سابق</p>
                </div>
              </div>
              <p className="text-gray-700">
                "أفضل مطعم زرته، الطعام شهي جدًا والأجواء مريحة ومناسبة للعائلات."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-resort-purple text-white">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">احجز إقامتك الآن!</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            استمتع بتجربة فريدة من نوعها في منتجع الجنة واحصل على أفضل الخدمات والعروض
          </p>
          <Button asChild size="lg" variant="secondary">
            <Link to={isAuthenticated ? '/hotel' : '/signup'}>
              {isAuthenticated ? 'احجز الآن' : 'سجل واحجز الآن'}
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Index;
