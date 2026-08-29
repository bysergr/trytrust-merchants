'use client';

import React, { useState } from 'react';
import { CartDetail, DeliveryAddress, OrderDetail } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, MapPin, Truck, ShieldCheck, Lock, Clock, AlertCircle } from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartDetail | null;
  onConfirmOrder: (address: DeliveryAddress) => Promise<OrderDetail>;
  onOrderSuccess: (order: OrderDetail) => void;
}

export function CheckoutModal({
  isOpen,
  onClose,
  cart,
  onConfirmOrder,
  onOrderSuccess,
}: CheckoutModalProps) {
  const [recipientName, setRecipientName] = useState('Alex Taylor');
  const [street, setStreet] = useState('Carrera 15 # 93-60, Apt 502');
  const [city, setCity] = useState('Bogotá');
  const [postalCode, setPostalCode] = useState('110221');
  const [phone, setPhone] = useState('+57 300 555 1234');
  const [notes, setNotes] = useState('Please leave with security guard');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !cart) return null;

  const items = cart.items || [];
  const total = cart.total || 0;
  const isFreeDelivery = total >= 15000;
  const shippingFee = isFreeDelivery ? 0 : 2500;
  const grandTotal = total + shippingFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!street.trim()) {
      setErrorMessage('Street address is required.');
      return;
    }

    if (!city.trim()) {
      setErrorMessage('City is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const address: DeliveryAddress = {
        recipient_name: recipientName.trim(),
        street: street.trim(),
        city: city.trim(),
        postal_code: postalCode.trim() || undefined,
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      const order = await onConfirmOrder(address);
      onClose();
      onOrderSuccess(order);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Checkout failed. Please try again.';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#2D3277] text-white">
              <Lock className="size-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Express Checkout
              </h2>
              <p className="text-xs text-slate-500">
                No account required • Instant atomic reservation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50"
            aria-label="Close checkout modal"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6">
          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="size-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Checkout Notice</p>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left: Address form */}
            <div className="md:col-span-7 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <MapPin className="size-4 text-[#3483FA]" />
                <span>1. Delivery Address</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Recipient Name</label>
                  <Input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Full Name"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Phone Number</label>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+57 300 000 0000"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Street Address & Unit / Apt</label>
                <Input
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="e.g. Calle 100 # 15-20, Apt 402"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">City</label>
                  <Input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Bogotá"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Postal Code (Optional)</label>
                  <Input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="e.g. 110111"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Delivery Instructions (Optional)</label>
                <Input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Leave with doorman or ring doorbell"
                />
              </div>

              {/* Delivery Guarantee Card */}
              <div className="rounded-xl bg-emerald-50 border border-emerald-200/80 p-3.5 space-y-1.5 text-xs text-emerald-950">
                <div className="flex items-center gap-2 font-bold text-emerald-900">
                  <Clock className="size-4 text-emerald-600" />
                  <span>Express Delivery Guarantee</span>
                </div>
                <p className="text-emerald-800 text-[11px]">
                  Estimated arrival is generated at confirmation: a random moment within the next 4 hours from purchase.
                </p>
              </div>
            </div>

            {/* Right: Order Summary */}
            <div className="md:col-span-5 bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-3">
                  <Truck className="size-4 text-[#3483FA]" />
                  <span>2. Order Summary</span>
                </div>

                {/* Items List */}
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {items.map((item) => (
                    <div key={item.product_id} className="flex items-center justify-between text-xs py-1 border-b border-slate-200/60 last:border-none">
                      <div className="flex-1 pr-2 truncate">
                        <span className="font-semibold text-slate-800">{item.name}</span>
                        <span className="text-slate-500 ml-1">× {item.quantity}</span>
                      </div>
                      <span className="font-bold text-slate-900 shrink-0">
                        ${item.subtotal.toLocaleString('en-US')}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Calculation */}
                <div className="mt-4 pt-3 border-t border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Products Subtotal:</span>
                    <span className="font-semibold">${total.toLocaleString('en-US')} COP</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>4-Hour Shipping:</span>
                    <span className="font-bold text-emerald-600">
                      {isFreeDelivery ? 'FREE' : `$${shippingFee.toLocaleString('en-US')} COP`}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between text-sm">
                    <span className="font-bold text-slate-900">Total to Pay:</span>
                    <span className="font-black text-base text-slate-900">
                      ${grandTotal.toLocaleString('en-US')} COP
                    </span>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="space-y-2 pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting || items.length === 0}
                  className="w-full h-11 font-bold text-sm bg-[#3483FA] hover:bg-[#2968c8] text-white shadow-md flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    'Processing Payment...'
                  ) : (
                    <>
                      <ShieldCheck className="size-4" />
                      Pay & Place Order
                    </>
                  )}
                </Button>

                <p className="text-[10px] text-center text-slate-500">
                  Simulated atomic payment. Stock is deducted and order recorded instantly.
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
