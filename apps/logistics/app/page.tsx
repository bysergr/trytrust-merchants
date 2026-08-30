'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { ServicePicker } from '@/components/ServicePicker';
import { RideBookingView } from '@/components/RideBookingView';
import { PackageBookingView } from '@/components/PackageBookingView';
import { FreightBookingView } from '@/components/FreightBookingView';
import { TrackingView } from '@/components/TrackingView';
import { ActivityDrawer } from '@/components/ActivityDrawer';
import { ServiceRequest, ServiceType } from '@/lib/types';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<ServiceType | 'home' | 'tracking' | 'activity'>('home');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activeRequest, setActiveRequest] = useState<ServiceRequest | null>(null);
  const [sessionRequests, setSessionRequests] = useState<ServiceRequest[]>([]);
  const [isActivityOpen, setIsActivityOpen] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        const sessRes = await fetch('/api/session');
        const sessData = await sessRes.json();
        if (!ignore && sessData.sessionId) {
          setSessionId(sessData.sessionId);
        }

        const reqRes = await fetch('/api/requests');
        const reqData = await reqRes.json();
        if (!ignore && reqData.requests) {
          setSessionRequests(reqData.requests);
          const activeOne = reqData.requests.find(
            (r: ServiceRequest) => r.status === 'matched' || r.status === 'en_route'
          );
          if (activeOne) {
            setActiveRequest((prev) => prev || activeOne);
          }
        }
      } catch (err) {
        console.error('Session sync error:', err);
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, []);

  // Handle successful request creation
  const handleRequestSuccess = (newRequest: ServiceRequest) => {
    setActiveRequest(newRequest);
    setSessionRequests((prev) => [newRequest, ...prev.filter((r) => r.id !== newRequest.id)]);
    setActiveTab('tracking');
  };

  const handleTabChange = (tab: ServiceType | 'home' | 'tracking' | 'activity') => {
    if (tab === 'activity') {
      setIsActivityOpen(true);
      return;
    }
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      {/* Top Uber-style Navigation */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={handleTabChange}
        activeRequestId={activeRequest?.id}
        sessionId={sessionId}
        requestCount={sessionRequests.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {activeTab === 'home' && (
          <ServicePicker
            onSelectService={(service) => {
              setActiveTab(service);
            }}
          />
        )}

        {activeTab === 'ride' && (
          <RideBookingView onSuccess={handleRequestSuccess} />
        )}

        {activeTab === 'package' && (
          <PackageBookingView onSuccess={handleRequestSuccess} />
        )}

        {activeTab === 'freight' && (
          <FreightBookingView onSuccess={handleRequestSuccess} />
        )}

        {activeTab === 'tracking' && activeRequest && (
          <TrackingView
            requestId={activeRequest.id}
            onBackToBooking={() => setActiveTab('home')}
            onStatusChange={(updated) => {
              setActiveRequest(updated);
              setSessionRequests((prev) =>
                prev.map((r) => (r.id === updated.id ? updated : r))
              );
            }}
          />
        )}

        {activeTab === 'tracking' && !activeRequest && (
          <div className="flex-1 flex items-center justify-center p-8 text-center">
            <div className="max-w-md">
              <h3 className="text-xl font-bold text-white mb-2">No Active Trip Selected</h3>
              <p className="text-neutral-400 text-xs mb-6">
                You do not have an active trip to track. Choose a service above to book your ride or delivery.
              </p>
              <button
                onClick={() => setActiveTab('home')}
                className="px-6 py-3 bg-emerald-500 text-black font-extrabold rounded-2xl text-xs"
              >
                Go to Services
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Session Activity Drawer */}
      <ActivityDrawer
        requests={sessionRequests}
        isOpen={isActivityOpen}
        onClose={() => setIsActivityOpen(false)}
        onSelectRequest={(id) => {
          const found = sessionRequests.find((r) => r.id === id);
          if (found) {
            setActiveRequest(found);
            setActiveTab('tracking');
          }
        }}
      />
    </div>
  );
}
