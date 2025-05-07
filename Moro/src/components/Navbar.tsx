
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, X } from 'lucide-react';

const Navbar = () => {
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="bg-white shadow-md w-full">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo and Site Name */}
          <div className="flex items-center">
            <Link to="/" className="text-2xl font-bold text-resort-purple">
              منتجع الجنة
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8 space-x-reverse">
            <Link to="/" className={`text-gray-700 hover:text-resort-purple ${isActive('/') ? 'font-bold text-resort-purple' : ''}`}>
              الرئيسية
            </Link>
            <Link to="/hotel" className={`text-gray-700 hover:text-resort-purple ${isActive('/hotel') ? 'font-bold text-resort-purple' : ''}`}>
              الفندق
            </Link>
            <Link to="/restaurant" className={`text-gray-700 hover:text-resort-purple ${isActive('/restaurant') ? 'font-bold text-resort-purple' : ''}`}>
              المطعم
            </Link>
            <Link to="/wedding" className={`text-gray-700 hover:text-resort-purple ${isActive('/wedding') ? 'font-bold text-resort-purple' : ''}`}>
              صالة الأفراح
            </Link>
            {isAuthenticated && (
              <Link to="/bookings" className={`text-gray-700 hover:text-resort-purple ${isActive('/bookings') ? 'font-bold text-resort-purple' : ''}`}>
                حجوزاتي
              </Link>
            )}
          </div>

          {/* Authentication Buttons */}
          <div className="hidden md:flex items-center space-x-4 space-x-reverse">
            {isAuthenticated ? (
              <div className="flex items-center space-x-4 space-x-reverse">
                <span className="text-gray-700">أهلاً، {user?.firstName}</span>
                <Button variant="outline" onClick={handleLogout}>تسجيل الخروج</Button>
              </div>
            ) : (
              <div className="flex space-x-2 space-x-reverse">
                <Button variant="outline" onClick={() => navigate('/login')}>تسجيل الدخول</Button>
                <Button onClick={() => navigate('/signup')}>إنشاء حساب</Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-4">
            <Link 
              to="/" 
              className={`block py-2 text-gray-700 hover:text-resort-purple ${isActive('/') ? 'font-bold text-resort-purple' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              الرئيسية
            </Link>
            <Link 
              to="/hotel" 
              className={`block py-2 text-gray-700 hover:text-resort-purple ${isActive('/hotel') ? 'font-bold text-resort-purple' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              الفندق
            </Link>
            <Link 
              to="/restaurant" 
              className={`block py-2 text-gray-700 hover:text-resort-purple ${isActive('/restaurant') ? 'font-bold text-resort-purple' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              المطعم
            </Link>
            <Link 
              to="/wedding" 
              className={`block py-2 text-gray-700 hover:text-resort-purple ${isActive('/wedding') ? 'font-bold text-resort-purple' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              صالة الأفراح
            </Link>
            {isAuthenticated && (
              <Link 
                to="/bookings" 
                className={`block py-2 text-gray-700 hover:text-resort-purple ${isActive('/bookings') ? 'font-bold text-resort-purple' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                حجوزاتي
              </Link>
            )}
            {isAuthenticated ? (
              <div className="pt-2 border-t">
                <span className="block text-gray-700 mb-2">أهلاً، {user?.firstName}</span>
                <Button variant="outline" onClick={handleLogout}>تسجيل الخروج</Button>
              </div>
            ) : (
              <div className="pt-2 border-t flex flex-col space-y-2">
                <Button variant="outline" onClick={() => { navigate('/login'); setMobileMenuOpen(false); }}>تسجيل الدخول</Button>
                <Button onClick={() => { navigate('/signup'); setMobileMenuOpen(false); }}>إنشاء حساب</Button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
