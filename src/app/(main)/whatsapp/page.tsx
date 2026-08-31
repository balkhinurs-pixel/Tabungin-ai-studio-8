'use client';

import { useState } from 'react';
import { 
  MessageSquare, 
  PhoneCall, 
  Send, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  MessageCircle,
  Smartphone
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FonnteSettings from '@/app/(main)/settings/_components/FonnteSettings';
import Link from 'next/link';

export default function WhatsAppSettingsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shadow-xs">
            <MessageSquare className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-gray-900">Pengaturan WhatsApp Gateway</h1>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                Fonnte API
              </span>
            </div>
            <p className="text-xs font-semibold text-muted-foreground">
              Konfigurasi token API Fonnte, pesan otomatis saldo minimal, dan broadcast notifikasi walisantri
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            asChild 
            className="rounded-xl font-bold text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 h-10"
          >
            <a href="https://fonnte.com" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Buka Dashboard Fonnte
            </a>
          </Button>
          <Button 
            variant="secondary" 
            size="sm" 
            asChild 
            className="rounded-xl font-bold text-xs h-10"
          >
            <Link href="/jastip">
              <MessageCircle className="mr-1.5 h-3.5 w-3.5 text-pink-600" /> WhatsApp Jastip
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Settings Component */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xs p-2 sm:p-6">
        <FonnteSettings />
      </div>
    </div>
  );
}
