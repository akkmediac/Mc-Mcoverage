import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, Calendar, Clock, MapPin, FileText, Send, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { EthiopianDateInput } from '@/components/ui/ethiopian-date-input';
import { EthiopianTimeInput } from '@/components/ui/ethiopian-time-input';
import { 
  ethiopianToGregorian,
  ethiopianToGregorianAccurate,
  gregorianToEthiopianAccurate,
  ethiopianTimeTo24Hour,
  parseEthiopianDate,
  parseEthiopianTime
} from '@/utils/ethiopianDateInput';
import { isValidCoverageTime } from '@/utils/validateCoverageTime';
import { sanitizeLocation, sanitizeAgenda, rateLimiter } from '@/utils/security';

export default function RequestForm() {
  const [formData, setFormData] = useState({
    coverageDate: '',
    coverageTime: '',
    location: '',
    agenda: ''
  });
  const [loading, setLoading] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorDetails, setErrorDetails] = useState({
    title: '',
    description: ''
  });

  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Rate limiting check
    const userIdentifier = user?.id || 'anonymous';
    if (!rateLimiter.isAllowed(userIdentifier)) {
      setErrorDetails({
        title: "በጣም ብዙ ጥያቄዎች",
        description: "በጣም ብዙ ጥያቄዎችን አስገብተዋል። እባክዎ ትንሽ ይጠብቁ።"
      });
      setShowError(true);
      setLoading(false);
      return;
    }

    // Sanitize inputs
    const sanitizedLocation = sanitizeLocation(formData.location);
    const sanitizedAgenda = sanitizeAgenda(formData.agenda);

    // Parse Ethiopian date and time
    const ethDate = parseEthiopianDate(formData.coverageDate);
    const ethTime = parseEthiopianTime(formData.coverageTime);
    
    // Extract time period from the time string
    const timePeriod = ethTime.period || 'ጥዋት';

    if (!ethDate || !ethTime) {
      setErrorDetails({
        title: "የተሳሳተ የቀን እና ሰዓት ግብዓት",
        description: "እባክዎ ትክክለኛ ቀን እና ሰዓት ያስገቡ። የሚያስገቡት ቀን እና ሰዓት በኢትዮጵያ አቆጣጠር መሆን አለበት።"
      });
      setShowError(true);
      setLoading(false);
      return;
    }

    // Convert to Gregorian date and 24-hour time
    const gregorianDate = ethiopianToGregorianAccurate(ethDate.year, ethDate.month, ethDate.day);
    const time24Hour = ethiopianTimeTo24Hour(ethTime.hour!, ethTime.minute!, ethTime.period!);

    // Validate coverage time
    const validation = isValidCoverageTime(
      gregorianDate.toISOString().split('T')[0], 
      time24Hour
    );
    
    if (!validation.isValid) {
      console.log('❌ Error: Frontend validation failed:', validation.message);
      setErrorDetails({
        title: "የጊዜ ማስታወሻ",
        description: validation.message
      });
      setShowError(true);
      setLoading(false);
      return;
    }


    try {
      const insertData = {
        user_id: user?.id,
        office_name: profile?.office_name || '',
        coverage_date: gregorianDate.toISOString().split('T')[0],
        coverage_time: time24Hour,
        time_period: timePeriod,
        location: sanitizedLocation,
        agenda: sanitizedAgenda
      };
      
      const { error } = await supabase
        .from('media_requests')
        .insert(insertData);

      if (error) {
        throw error;
      }

      toast({
        title: 'ተሳክቷል!',
        description: 'የሚድያ ሽፋን ጥያቄዎ በተሳካ ሁኔታ ተልኳል።',
      });

      navigate('/history');
    } catch (error: any) {
      // Log error for debugging in development only
      if (import.meta.env.DEV) {
        console.error('Error submitting request:', error);
      }
      
      let errorTitle = 'የጥያቄ ስህተት';
      let errorMessage = 'ጥያቄውን ማስገባት አልተሳካም። እባክዎ እንደገና ይሞክሩ።';
      
      // Check for specific error types
      if (error?.message) {
        errorTitle = 'የማያስፈቅድ የጊዜ ምርጫ';
        // Use the error message directly from the database
        errorMessage = error.message;
      }
      
      setErrorDetails({
        title: errorTitle,
        description: errorMessage
      });
      setShowError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <Layout>
      <AlertDialog open={showError} onOpenChange={setShowError}>
        <AlertDialogContent className="max-w-[400px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              {errorDetails.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base whitespace-pre-line">
              {errorDetails.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowError(false)} className="w-full">
              ተረድቻለሁ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-primary-glow rounded-2xl shadow-lg mb-4">
              <FileText className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
              የሚድያ ሽፋን ጠይቅ
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              እባክዎ የሚድያ ሽፋን ጥያቄዎን ለማስገባት የሚከተሉትን መረጃዎች ይሙሉ
            </p>
          </div>


          {/* Quick Tips Section */}
          <div className="mb-8">
            <Card className="bg-gradient-to-br from-primary/5 to-primary-glow/5 border-primary/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 mr-2 text-primary" />
                  የጥያቄ ማስገባት ምክሮች
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-sm text-gray-600">
                      የተግባሩን ቦታ በትክክል ያስገቡ
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-sm text-gray-600">
                      አጀንዳውን በዝርዝር ይግለጹ
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-sm text-gray-600">
                      ጊዜውን በኢትዮጵያ አቆጣጠር ያስገቡ
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="max-w-4xl mx-auto">
            {/* Form Section */}
            <div>
              <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
                <CardContent className="p-8">
                  <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Office Information */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary/10 to-primary-glow/10 rounded-xl flex items-center justify-center">
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900">የጽህፈት ቤት መረጃ</h3>
                      </div>
                      <div className="bg-gradient-to-r from-primary/5 to-primary-glow/5 p-6 rounded-2xl border border-primary/10">
                        <Label htmlFor="office_name" className="text-base font-medium text-gray-700 mb-3 block">
                          የሚድያ ሽፋን ጠያቂ ጽህፈት ቤት ስም
                        </Label>
                        <Input
                          id="office_name"
                          value={profile?.office_name || ''}
                          disabled
                          className="bg-white/80 border-primary/20 text-gray-900 font-medium h-12"
                        />
                      </div>
                    </div>

                    {/* Date and Time Section */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary/10 to-primary-glow/10 rounded-xl flex items-center justify-center">
                          <Calendar className="h-5 w-5 text-primary" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900">የሽፋን ጊዜ</h3>
                      </div>
                      
                      <Alert className="border-amber-200 bg-amber-50/80">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-amber-800">
                          <strong>ማስታወሻ:</strong> ለነገ የሚሆን የሚድያ ሽፋን ጥያቄ በኢትዮጵያ አቆጣጠር ከቀኑ 7 ሰአት በፊት መቅረብ አለበት። ከዚያ በኋላ ከነገ ወዲያ ላሉት ቀናት ብቻ ማስገባት ይችላሉ።
                        </AlertDescription>
                      </Alert>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <Label htmlFor="coverageDate" className="text-base font-medium text-gray-700 flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-primary" />
                            ሽፋን የሚሰጥበት ቀን
                          </Label>
                          <EthiopianDateInput
                            value={formData.coverageDate}
                            onChange={(value) => setFormData(prev => ({ ...prev, coverageDate: value }))}
                            disabled={loading}
                          />
                        </div>
                        <div className="space-y-3">
                          <Label htmlFor="coverageTime" className="text-base font-medium text-gray-700 flex items-center">
                            <Clock className="h-4 w-4 mr-2 text-primary" />
                            ሰአት
                          </Label>
                          <EthiopianTimeInput
                            value={formData.coverageTime}
                            onChange={(value) => setFormData(prev => ({ ...prev, coverageTime: value }))}
                            disabled={loading}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Location and Agenda Section */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary/10 to-primary-glow/10 rounded-xl flex items-center justify-center">
                          <MapPin className="h-5 w-5 text-primary" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900">የተግባሩ ዝርዝር</h3>
                      </div>
                      
                      <div className="space-y-6">
                        <div className="space-y-3">
                          <Label htmlFor="location" className="text-base font-medium text-gray-700 flex items-center">
                            <MapPin className="h-4 w-4 mr-2 text-primary" />
                            ቦታ
                          </Label>
                          <Input
                            id="location"
                            name="location"
                            value={formData.location}
                            onChange={handleInputChange}
                            placeholder="የተግባሩ ቦታ ያስገቡ..."
                            required
                            disabled={loading}
                            className="h-12 border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/10"
                          />
                        </div>

                        <div className="space-y-3">
                          <Label htmlFor="agenda" className="text-base font-medium text-gray-700 flex items-center">
                            <FileText className="h-4 w-4 mr-2 text-primary" />
                            አጀንዳ
                          </Label>
                          <Textarea
                            id="agenda"
                            name="agenda"
                            value={formData.agenda}
                            onChange={handleInputChange}
                            placeholder="የተግባሩ ዝርዝር አጀንዳ ይግለጹ..."
                            rows={4}
                            required
                            disabled={loading}
                            className="border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/10 resize-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-6">
                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            እየላካ ነው...
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-5 w-5" />
                            ጥያቄ አስገባ
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>

          </div>
        </div>
      </div>
    </Layout>
  );
}