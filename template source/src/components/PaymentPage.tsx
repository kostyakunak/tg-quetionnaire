import React, { useState } from 'react';
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { X, ArrowLeft, Shield, CreditCard, Smartphone } from "lucide-react";

export default function PaymentPage() {
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvc, setCvc] = useState('');
  const [country, setCountry] = useState('');
  const [promoCode, setPromoCode] = useState('');

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 relative overflow-hidden">
      {/* Paper texture overlay */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cg fill='%23d4a574' fill-opacity='0.05'%3E%3Cpath d='M15 30c0-8.284 6.716-15 15-15s15 6.716 15 15-6.716 15-15 15-15-6.716-15 15zM5 5h50v50H5z'/%3E%3C/g%3E%3C/svg%3E")`,
          filter: 'contrast(1.2) brightness(0.9)'
        }}
      />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between p-4">
        <Button variant="ghost" size="icon" className="text-amber-800 hover:bg-amber-100/50">
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <div className="flex items-center space-x-2">
          <div className="w-8 h-6 bg-amber-200 rounded-sm transform rotate-2"></div>
          <span className="font-handwriting text-amber-900">5 Стульев</span>
        </div>
        <Button variant="ghost" size="icon" className="text-amber-800 hover:bg-amber-100/50">
          <X className="w-6 h-6" />
        </Button>
      </div>

      <div className="relative z-10 flex flex-col items-center px-4 pb-8">
        {/* Return policy note */}
        <div className="w-full max-w-sm mb-6">
          <Card className="bg-cream-100/80 border-amber-200 shadow-lg transform -rotate-1 backdrop-blur-sm">
            <div className="p-4 text-center space-y-3">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-cyan-500 rounded-full mx-auto flex items-center justify-center shadow-lg">
                <div className="w-8 h-8 bg-white/30 rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 bg-white rounded-full"></div>
                </div>
              </div>
              <p className="text-amber-800 font-handwriting">
                Возврат за 24ч до начала встречи
              </p>
            </div>
          </Card>
        </div>

        {/* Payment form */}
        <Card className="w-full max-w-sm bg-cream-100/90 border-amber-200 shadow-2xl transform rotate-1 backdrop-blur-sm">
          <div className="p-6 space-y-6">
            {/* Payment method selection */}
            <div className="space-y-3">
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <RadioGroupItem value="card" id="card" className="sr-only" />
                  <Label 
                    htmlFor="card" 
                    className={`flex items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all transform hover:scale-105 ${
                      paymentMethod === 'card' 
                        ? 'border-amber-400 bg-amber-100/60' 
                        : 'border-amber-200 bg-white/60'
                    }`}
                    style={{
                      boxShadow: paymentMethod === 'card' ? '3px 3px 10px rgba(180, 83, 9, 0.2)' : '2px 2px 8px rgba(180, 83, 9, 0.1)'
                    }}
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <CreditCard className="w-6 h-6 text-amber-700" />
                      <span className="text-amber-800 font-handwriting">Card</span>
                    </div>
                  </Label>
                </div>
                
                <div className="relative">
                  <RadioGroupItem value="blik" id="blik" className="sr-only" />
                  <Label 
                    htmlFor="blik" 
                    className={`flex items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all transform hover:scale-105 ${
                      paymentMethod === 'blik' 
                        ? 'border-amber-400 bg-amber-100/60' 
                        : 'border-amber-200 bg-white/60'
                    }`}
                    style={{
                      boxShadow: paymentMethod === 'blik' ? '3px 3px 10px rgba(180, 83, 9, 0.2)' : '2px 2px 8px rgba(180, 83, 9, 0.1)'
                    }}
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <div className="w-6 h-6 bg-amber-800 rounded flex items-center justify-center">
                        <span className="text-white text-xs font-bold">B</span>
                      </div>
                      <span className="text-amber-800 font-handwriting">BLIK</span>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Secure checkout badge */}
            <div className="flex items-center justify-center space-x-2 p-2 bg-green-100/60 rounded-lg border border-green-200">
              <Shield className="w-4 h-4 text-green-600" />
              <span className="text-green-700 text-sm">Secure, fast checkout with Link</span>
            </div>

            {paymentMethod === 'card' && (
              <div className="space-y-4">
                {/* Card number */}
                <div className="space-y-2">
                  <Label className="text-amber-800 font-handwriting">Card number</Label>
                  <div className="relative">
                    <Input
                      placeholder="1234 1234 1234 1234"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="bg-white/80 border-amber-200 focus:border-amber-400 text-amber-900 placeholder:text-amber-500 pr-12"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="text-blue-600 font-bold text-sm">VISA</div>
                    </div>
                  </div>
                </div>

                {/* Expiry and CVC */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-amber-800 font-handwriting">Expiration date</Label>
                    <Input
                      placeholder="MM / YY"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="bg-white/80 border-amber-200 focus:border-amber-400 text-amber-900 placeholder:text-amber-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-amber-800 font-handwriting">Security code</Label>
                    <div className="relative">
                      <Input
                        placeholder="CVC"
                        value={cvc}
                        onChange={(e) => setCvc(e.target.value)}
                        className="bg-white/80 border-amber-200 focus:border-amber-400 text-amber-900 placeholder:text-amber-500 pr-12"
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="w-6 h-4 border border-amber-300 rounded-sm bg-white/60 text-xs flex items-center justify-center text-amber-600">
                          123
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Country */}
                <div className="space-y-2">
                  <Label className="text-amber-800 font-handwriting">Country</Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger className="bg-white/80 border-amber-200 focus:border-amber-400 text-amber-900">
                      <SelectValue placeholder="Poland" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="poland">Poland</SelectItem>
                      <SelectItem value="germany">Germany</SelectItem>
                      <SelectItem value="france">France</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Promo code */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Input
                  placeholder="Промокод"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  className="bg-white/80 border-amber-200 focus:border-amber-400 text-amber-900 placeholder:text-amber-500"
                />
              </div>
              <Button 
                variant="outline" 
                className="bg-white/60 border-amber-200 text-amber-800 hover:bg-white/80 font-handwriting"
              >
                Применить
              </Button>
            </div>

            {/* Pay button */}
            <Button 
              className="w-full py-4 text-white font-handwriting text-lg transform hover:scale-105 transition-all duration-200"
              style={{
                background: 'linear-gradient(145deg, #16a34a, #15803d)',
                boxShadow: '5px 5px 15px rgba(21, 128, 61, 0.3), -3px -3px 10px rgba(34, 197, 94, 0.1)',
                borderRadius: '12px'
              }}
            >
              Оплатить 30 zł ✨
            </Button>
          </div>
        </Card>

        {/* Decorative paper scraps */}
        <div className="absolute top-20 right-8 w-12 h-16 bg-white shadow-lg transform rotate-45 rounded-sm opacity-40"></div>
        <div className="absolute bottom-32 left-6 w-10 h-8 bg-amber-100 shadow-lg transform -rotate-12 rounded-sm opacity-50"></div>
        <div className="absolute top-1/2 right-4 w-8 h-12 bg-cream-200 shadow-lg transform rotate-12 rounded-sm opacity-30"></div>
      </div>
    </div>
  );
}