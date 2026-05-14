import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeOfficeName, rateLimiter } from '@/utils/security';

export default function Login() {
  const [officeName, setOfficeName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { signIn } = useAuth();
  const navigate = useNavigate();

  // Seed call removed — user creation is admin-only via /admin/create-user

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Sanitize office name first
    const sanitizedOfficeName = sanitizeOfficeName(officeName);
    if (sanitizedOfficeName !== officeName) {
      setError('የጽህፈት ቤት ስም ውስጥ የማይፈቀዱ ቁምፊዎች አሉ።');
      setLoading(false);
      return;
    }

    // Rate limiting check — use sanitized office name as identifier
    const clientIdentifier = `login:${sanitizedOfficeName}`;
    if (!rateLimiter.isAllowed(clientIdentifier)) {
      setError('በጣም ብዙ የመግባት ሙከራዎች። እባክዎ ትንሽ ይጠብቁ።');
      setLoading(false);
      return;
    }

    const { error } = await signIn(sanitizedOfficeName, password);

    if (error) {
      setError('የማስገቢያ መረጃ ትክክል አይደለም። እባክዎ እንደገና ይሞክሩ።');
    } else {
      navigate('/');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Professional curved background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/10 via-primary/5 to-transparent"></div>
        <div className="absolute top-0 left-0 w-full h-3/4 bg-primary" 
             style={{
               clipPath: 'ellipse(120% 100% at 50% 0%)'
             }}>
        </div>
        <div className="absolute top-0 left-0 w-full h-1/2 bg-primary/80" 
             style={{
               clipPath: 'ellipse(150% 80% at 30% 0%)'
             }}>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Logo section */}
          <div className="text-center mb-8">
            <img 
              src="/Images/logo.png" 
              alt="Amharic Connect Logo" 
              className="w-48 h-48 sm:w-56 sm:h-56 object-contain mx-auto"
            />
          </div>

          {/* Login form card */}
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50/80 backdrop-blur-sm">
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}
              
              {/* Office Name Input */}
              <div className="space-y-2">
                <label htmlFor="officeName" className="text-sm font-semibold text-gray-700">
                  የጽህፈት ቤት ስም
                </label>
                <div className="relative group">
                  <Input
                    id="officeName"
                    type="text"
                    value={officeName}
                    onChange={(e) => setOfficeName(e.target.value)}
                    placeholder="የጽህፈት ቤት ስም ያስገቡ"
                    required
                    disabled={loading}
                    className="h-12 bg-white/80 border-2 border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl text-base placeholder:text-gray-400 transition-all duration-300 group-hover:border-primary/50"
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/5 to-secondary/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </div>
              </div>
              
              {/* Password Input */}
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-semibold text-gray-700">
                  የይለፍ ቃል
                </label>
                <div className="relative group">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="የይለፍ ቃልዎን ያስገቡ"
                    required
                    disabled={loading}
                    className="h-12 bg-white/80 border-2 border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl text-base placeholder:text-gray-400 pr-12 transition-all duration-300 group-hover:border-primary/50"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-primary/10 rounded-lg transition-colors duration-200"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </Button>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/5 to-secondary/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </div>
              </div>

              {/* Login Button */}
              <Button 
                type="submit" 
                disabled={loading} 
                className="w-full h-12 bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary text-white font-bold rounded-xl text-base transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    እየገባ ነው...
                  </>
                ) : (
                  'ግባ'
                )}
              </Button>
            </form>
          </div>

          {/* Footer */}
          <div className="text-center mt-8">
            <div className="inline-flex items-center space-x-2 text-gray-500">
              <img 
                src="/icon.PNG" 
                alt="Web Icon" 
                className="h-5 w-5 opacity-60"
              />
              <span className="text-sm">የሚድያ ሽፋን ጥየቃ ሲስተም</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}