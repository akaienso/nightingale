'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Upload, FileText, Image as ImageIcon, Loader2, Info, X, Copy, Check, AlertCircle } from 'lucide-react';
import NextImage from 'next/image';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { TranslationSettings } from './translator-app';
import { useI18n } from '@/components/i18n-provider';
import { englishFlag } from '@/lib/utils';

interface ImageTranslateModeProps {
  settings: TranslationSettings;
}

export default function ImageTranslateMode({ settings }: ImageTranslateModeProps) {
  const { t, lang } = useI18n();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [contentType, setContentType] = useState<string>('image/jpeg');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ extractedText: string; translation: string; culturalNote: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [imgDirection, setImgDirection] = useState<'en-to-ua' | 'ua-to-en'>(
    (settings?.direction as 'en-to-ua' | 'ua-to-en') ?? 'en-to-ua'
  );
  const engFlag = englishFlag(settings?.englishDialect);
  const uaFlag = '🇺🇦';

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const processFile = useCallback((file: File) => {
    if (!file) return;
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      toast.error(t('image.fileTooLarge'));
      return;
    }

    setResult(null);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);
      // Extract base64 part
      const base64 = dataUrl.split(',')[1];
      setImageBase64(base64);
      setContentType(file.type || 'image/jpeg');
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile, t]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      setCameraActive(true);
      // Wait for video element to mount
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      toast.error(t('image.cameraError'));
    }
  }, [t]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setImagePreview(dataUrl);
    setImageBase64(dataUrl.split(',')[1]);
    setContentType('image/jpeg');
    // Stop camera
    streamRef.current?.getTracks().forEach(t => t.stop());
    setCameraActive(false);
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    setCameraActive(false);
  }, []);

  const handleTranslate = useCallback(async () => {
    if (!imageBase64) return;
    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/translate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          contentType,
          direction: imgDirection,
          dialect: settings.dialect,
          englishDialect: settings.englishDialect,
          formality: settings.formality,
          outputFormat: settings.outputFormat,
          speakerGender: settings.speakerGender,
          addresseeGender: settings.addresseeGender,
          uiLang: lang,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t('image.processFailed'));
      }

      setResult({
        extractedText: data.extractedText || '',
        translation: data.translation || '',
        culturalNote: data.culturalNote || null,
      });
    } catch (err: any) {
      setError(err?.message || t('image.processFailed'));
      toast.error(err?.message || t('image.processFailed'));
    } finally {
      setIsProcessing(false);
    }
  }, [imageBase64, contentType, imgDirection, settings, lang, t]);

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(t('common.copiedToClipboard'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('common.failedToCopy'));
    }
  }, [t]);

  const clearImage = useCallback(() => {
    setImagePreview(null);
    setImageBase64(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col items-center gap-2 py-3 px-4 border-b border-border/50 bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="relative w-5 h-5 rounded-full overflow-hidden">
            <NextImage src="/nightingale-icon.png" alt="Nightingale" fill className="object-contain" sizes="20px" />
          </div>
          <span className="font-medium text-sm">{t('image.title')}</span>
        </div>
        {/* Language direction toggle */}
        <div className="flex items-center gap-1 bg-background rounded-full p-0.5 border border-border/60">
          <button
            type="button"
            onClick={() => setImgDirection('en-to-ua')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${imgDirection === 'en-to-ua' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {engFlag} {t('common.english')} → {uaFlag} {t('common.ukrainian')}
          </button>
          <button
            type="button"
            onClick={() => setImgDirection('ua-to-en')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${imgDirection === 'ua-to-en' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {uaFlag} {t('common.ukrainian')} → {engFlag} {t('common.english')}
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground">{t('image.subtitle')}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Camera View */}
        {cameraActive && (
          <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-3">
              <Button
                onClick={capturePhoto}
                className="bg-white text-black hover:bg-gray-100 rounded-full h-14 w-14 shadow-lg"
                size="icon"
              >
                <Camera className="w-6 h-6" />
              </Button>
              <Button
                variant="destructive"
                onClick={stopCamera}
                className="rounded-full h-10 w-10"
                size="icon"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Upload Area */}
        {!imagePreview && !cameraActive && (
          <div className="border-2 border-dashed border-border/60 rounded-xl p-8 sm:p-12 text-center space-y-4">
            <div className="relative w-16 h-16 mx-auto">
              <NextImage src="/nightingale-icon.png" alt="Nightingale" fill className="object-contain dark:hidden" sizes="64px" />
              <NextImage src="/nightingale-icon-light.png" alt="Nightingale" fill className="object-contain hidden dark:block" sizes="64px" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-lg mb-1">{t('image.mainTitle')}</h3>
              <p className="text-xs text-primary font-medium mb-1">{t('image.mainSubtitle')}</p>
              <p className="text-sm text-muted-foreground">
                {t('image.instruction')}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                variant="outline"
                className="gap-2 w-full sm:w-auto"
                onClick={startCamera}
              >
                <Camera className="w-4 h-4" />
                {t('image.camera')}
              </Button>
              <Button
                variant="outline"
                className="gap-2 w-full sm:w-auto"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4" />
                {t('image.upload')}
              </Button>
              <Button
                variant="outline"
                className="gap-2 w-full sm:w-auto"
                onClick={() => cameraInputRef.current?.click()}
              >
                <FileText className="w-4 h-4" />
                {t('image.gallery')}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t('image.supports')}</p>
          </div>
        )}

        {/* Image Preview */}
        {imagePreview && !cameraActive && (
          <div className="space-y-4">
            <div className="relative rounded-xl overflow-hidden border border-border/50 bg-muted/20">
              <img
                src={imagePreview}
                alt={t('image.imageAlt')}
                className="w-full max-h-[400px] object-contain"
              />
              <Button
                variant="destructive"
                size="icon"
                onClick={clearImage}
                className="absolute top-2 right-2 h-8 w-8 rounded-full"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center justify-center gap-3">
              <Button
                onClick={handleTranslate}
                disabled={isProcessing}
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                {isProcessing ? t('image.processing') : t('image.extract')}
              </Button>
            </div>
          </div>
        )}

        {/* Results */}
        {error && (
          <div className="flex items-start gap-2 text-destructive p-4 rounded-lg bg-destructive/10">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {/* Extracted Text */}
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border/50">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('image.extractedText')}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(result.extractedText)}
                  className="h-7 text-xs gap-1"
                >
                  <Copy className="w-3 h-3" />
                  {t('common.copy')}
                </Button>
              </div>
              <div className="p-4">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{result.extractedText}</p>
              </div>
            </div>

            {/* Translation */}
            <div className="rounded-xl border border-accent/20 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-accent/10 border-b border-accent/20">
                <span className="text-xs font-medium text-accent uppercase tracking-wider">{t('image.translation')}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(result.translation)}
                  className="h-7 text-xs gap-1"
                >
                  {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  {copied ? t('common.copied') : t('common.copy')}
                </Button>
              </div>
              <div className="p-4">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{result.translation}</p>
              </div>
            </div>

            {/* Cultural Note */}
            {result.culturalNote && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-accent/10 border border-accent/20">
                <Info className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-accent mb-0.5">{t('image.culturalNote')}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{result.culturalNote}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        onChange={handleFileUpload}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
}