'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

// Each pair: [English word, Ukrainian translation]
const WORD_PAIRS: [string, string][] = [
  ['percolating', 'фільтрую'],
  ['combobulating', 'комбобулюю'],
  ['pondering', 'розмірковую'],
  ['deciphering', 'розшифровую'],
  ['untangling', 'розплутую'],
  ['brewing', 'заварюю'],
  ['noodling', 'мізкую'],
  ['simmering', 'тушкую'],
  ['unscrambling', 'розкодовую'],
  ['marinating', 'маринуюсь'],
  ['concocting', 'вигадую'],
  ['perusing', 'вивчаю'],
  ['rummaging', 'гортаю'],
  ['calibrating', 'калібрую'],
  ['conjuring', 'чаклую'],
  ['hatching', 'висиджую'],
  ['mulling', 'обмірковую'],
  ['tinkering', 'майструю'],
  ['whipping up', 'збиваю'],
  ['finagling', 'мудрую'],
  ['wrangling', 'приборкую'],
  ['discombobulating', 'дискомбобулюю'],
  ['perambulating', 'прогулююсь'],
  ['cogitating', 'когітую'],
  ['befuddling', 'заплутуюсь'],
  ['galumphing', 'ґалумфую'],
  ['fidgeting', 'крутюся'],
  ['bamboozling', 'бамбузлю'],
  ['recalibrating', 'перекалібровую'],
  ['spelunking', 'спелеологую'],
];

interface ProcessingStatusProps {
  className?: string;
  showSpinner?: boolean;
}

export default function ProcessingStatus({ className = '', showSpinner = true }: ProcessingStatusProps) {
  const [pairIndex, setPairIndex] = useState(() => Math.floor(Math.random() * WORD_PAIRS.length));
  const [showingUkrainian, setShowingUkrainian] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const advanceWord = useCallback(() => {
    if (!showingUkrainian) {
      // Currently showing English → fade to Ukrainian
      setIsExiting(true);
      setTimeout(() => {
        setShowingUkrainian(true);
        setIsExiting(false);
      }, 250);
    } else {
      // Currently showing Ukrainian → fade to next English
      setIsExiting(true);
      setTimeout(() => {
        setPairIndex(prev => (prev + 1) % WORD_PAIRS.length);
        setShowingUkrainian(false);
        setIsExiting(false);
      }, 250);
    }
  }, [showingUkrainian]);

  useEffect(() => {
    // Show each word for ~1.2s before transitioning
    const timer = setInterval(advanceWord, 1200);
    return () => clearInterval(timer);
  }, [advanceWord]);

  const currentPair = WORD_PAIRS[pairIndex];
  const displayWord = showingUkrainian ? currentPair[1] : currentPair[0];

  return (
    <div className={`flex items-center gap-3 text-muted-foreground ${className}`}>
      {showSpinner && <Loader2 className="w-5 h-5 animate-spin text-primary shrink-0" />}
      <span
        className={`text-sm italic transition-all duration-250 ${
          isExiting ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'
        } ${showingUkrainian ? 'text-primary/70' : ''}`}
      >
        {displayWord}…
      </span>
    </div>
  );
}
