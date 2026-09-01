'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, LogOut, Loader2, Sparkles, X } from 'lucide-react';
import { SessionCard, SessionSummary, formatSessionDate } from '@/components/room/session-card';
import { toast } from '@/hooks/use-toast';

interface SessionModalProps {
  isOpen: boolean;
  summary: SessionSummary;
  onConfirmLeave: () => void;
  onStay: () => void;
}

export function SessionModal({
  isOpen,
  summary,
  onConfirmLeave,
  onStay,
}: SessionModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setDataUrl(null);
      setError(null);
      setGenerating(false);
      return;
    }

    let isMounted = true;
    setGenerating(true);
    setError(null);

    const generateImage = async () => {
      try {
        // Wait briefly for DOM to render completely
        await new Promise((res) => setTimeout(res, 200));

        if (!cardRef.current) return;

        const { toPng } = await import('html-to-image');
        const url = await toPng(cardRef.current, {
          pixelRatio: 2,
          cacheBust: true,
        });

        if (isMounted) {
          setDataUrl(url);
          setGenerating(false);
        }
      } catch (err) {
        console.error('Failed to generate session card image', err);
        if (isMounted) {
          setError("Couldn't create the session card.");
          setGenerating(false);
        }
      }
    };

    generateImage();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!dataUrl) return;
    try {
      const monthNames = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'
      ];
      const date = summary.startedAt;
      const month = monthNames[date.getMonth()];
      const day = date.getDate();
      const year = date.getFullYear();
      const filename = `vynyl-session-${month}-${day}-${year}.png`;

      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();

      toast({
        title: 'Memory Saved! ✦',
        description: `Saved ${filename} to your downloads.`,
      });
    } catch (err) {
      console.error('Failed to download image', err);
      toast({
        title: 'Download error',
        description: 'Failed to download image. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-md"
          onClick={onStay}
        />

        {/* Modal Window Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-md bg-[#F6F3EE] border border-[#EBE1D6] rounded-3xl p-6 sm:p-8 shadow-[0_24px_60px_rgba(0,0,0,0.22)] text-[#1B1B1B] z-10 flex flex-col items-center my-auto max-h-[90vh]"
        >
          {/* Top Close (X) */}
          <button
            onClick={onStay}
            className="absolute top-5 right-5 text-[#1B1B1B]/40 hover:text-[#1B1B1B] p-2 rounded-full hover:bg-black/5 transition-all"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Header */}
          <div className="text-center space-y-1 mb-4">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1B1B1B] font-canela">
              Jamming Memory
            </h2>
            <p className="text-xs text-[#1B1B1B]/60 font-satoshi">
              A little souvenir from your listening session.
            </p>
          </div>

          {/* Card Preview Container */}
          <div className="w-full flex items-center justify-center my-2 overflow-hidden py-1">
            {error ? (
              <div className="py-12 text-center flex flex-col items-center justify-center space-y-2">
                <p className="text-xs text-[#1B1B1B]/60 font-medium font-satoshi">
                  {error}
                </p>
              </div>
            ) : (
              <div className="relative transform scale-90 sm:scale-95 origin-center transition-transform">
                {/* Hidden DOM element rendered for html-to-image capture */}
                <div className="absolute top-0 left-0 -z-50 opacity-0 pointer-events-none">
                  <SessionCard ref={cardRef} summary={summary} />
                </div>

                {/* Visible DataURL PNG preview (or card while generating) */}
                {dataUrl ? (
                  <img
                    src={dataUrl}
                    alt="Vynyl Session Memory Card"
                    className="w-[300px] sm:w-[340px] aspect-[4/5] rounded-[28px] border border-[#EBE1D6] shadow-[0_12px_36px_rgba(0,0,0,0.08)] object-cover"
                  />
                ) : (
                  <div className="relative">
                    <SessionCard summary={summary} />
                    {generating && (
                      <div className="absolute inset-0 bg-[#F6F3EE]/80 backdrop-blur-[2px] rounded-[32px] flex flex-col items-center justify-center gap-2">
                        <Loader2 className="h-6 w-6 text-[#E07A5F] animate-spin" />
                        <span className="text-xs font-semibold text-[#1B1B1B]/70 font-satoshi">
                          Creating souvenir...
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="w-full space-y-3 pt-3">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
              {/* Save Memory Button */}
              {dataUrl && !error && (
                <button
                  onClick={handleDownload}
                  className="group w-full sm:flex-1 h-12 rounded-xl bg-[#1B1B1B] hover:bg-black text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md transition-all duration-200 hover:-translate-y-[2px] active:scale-98 hover:shadow-lg font-satoshi"
                >
                  <Download className="h-4 w-4 group-hover:scale-105 transition-transform" />
                  <span>Save Memory</span>
                </button>
              )}

              {/* Confirm Leave Button */}
              <button
                onClick={onConfirmLeave}
                className={`group w-full ${dataUrl && !error ? 'sm:flex-1' : 'w-full'
                  } h-12 rounded-xl bg-[#EBE1D6] hover:bg-red-500/15 hover:text-red-700 text-[#1B1B1B] font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-all duration-200 hover:-translate-y-[2px] active:scale-98 hover:shadow-md font-satoshi`}
              >
                <LogOut className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                <span>Leave Room</span>
              </button>
            </div>

            {/* Stay in room link */}
            <button
              onClick={onStay}
              className="w-full text-center text-xs text-[#1B1B1B]/50 hover:text-[#1B1B1B] font-medium transition-colors pt-1 underline underline-offset-4 font-satoshi"
            >
              Stay in room
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
