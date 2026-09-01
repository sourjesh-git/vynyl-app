'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Link as LinkIcon, Hash } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface InviteModalProps {
  code: string;
  isOpen: boolean;
  onClose: () => void;
}

export function InviteModal({ code, isOpen, onClose }: InviteModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  // Construct full join link dynamically
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://vynyl-web.vercel.app';
  const fullUrl = `${origin}/room/${code.toUpperCase()}`;
  const displayUrl = `${origin.replace(/^https?:\/\//, '')}/room/${code.toUpperCase()}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedLink(true);
      toast({
        title: 'Link Copied! ✦',
        description: 'Direct room invitation link copied to clipboard.',
      });
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (err) {
      console.error('Failed to copy link', err);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code.toUpperCase());
      setCopiedCode(true);
      toast({
        title: 'Code Copied!',
        description: `Room code ${code.toUpperCase()} copied to clipboard.`,
      });
      setTimeout(() => setCopiedCode(false), 2500);
    } catch (err) {
      console.error('Failed to copy code', err);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-md bg-[#F6F3EE] border border-[#EBE1D6] rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.18)] text-[#1B1B1B] z-10"
        >
          {/* Top Right Close Button (X) */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-[#1B1B1B]/40 hover:text-[#1B1B1B] p-2 rounded-full hover:bg-black/5 transition-all"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Copy content */}
          <div className="space-y-2 text-left">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1B1B1B] font-canela leading-tight">
              Your room is ready.
            </h2>
            <p className="text-sm text-[#1B1B1B]/70 font-satoshi leading-relaxed pt-0.5">
              Share this with someone you want to jam with.
            </p>
          </div>

          {/* Direct URL Container */}
          <div className="my-6 p-4 rounded-2xl bg-white/80 border border-[#EBE1D6] shadow-inner font-mono text-sm font-semibold tracking-wide text-[#1B1B1B] select-all break-all flex items-center justify-between gap-3">
            <span className="truncate text-xs sm:text-sm text-[#1B1B1B]/80 font-medium font-mono">
              {displayUrl}
            </span>
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider bg-[#E07A5F]/15 text-[#E07A5F] px-2.5 py-1 rounded-lg">
              {code.toUpperCase()}
            </span>
          </div>

          {/* Action Buttons ([Copy link] [Copy code]) */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Copy Link Button */}
            <button
              onClick={copyLink}
              className="w-full sm:flex-1 h-12 rounded-xl bg-[#1B1B1B] hover:bg-black text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 font-satoshi"
            >
              {copiedLink ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span>Copied link!</span>
                </>
              ) : (
                <>
                  <LinkIcon className="h-4 w-4" />
                  <span>Copy link</span>
                </>
              )}
            </button>

            {/* Copy Code Button */}
            <button
              onClick={copyCode}
              className="w-full sm:flex-1 h-12 rounded-xl bg-[#EBE1D6] hover:bg-[#C7D1C0] text-[#1B1B1B] font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-98 font-satoshi"
            >
              {copiedCode ? (
                <>
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span>Copied code!</span>
                </>
              ) : (
                <>
                  <Hash className="h-4 w-4 text-[#1B1B1B]/70" />
                  <span>Copy code</span>
                </>
              )}
            </button>
          </div>

          {/* Funny / Casual Dismiss Button */}
          <button
            onClick={onClose}
            className="w-full text-center text-xs text-[#1B1B1B]/50 hover:text-[#1B1B1B] font-medium transition-colors mt-6 pt-2 underline underline-offset-4 font-satoshi"
          >
            I enjoy my own company
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
