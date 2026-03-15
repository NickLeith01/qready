"use client";

import { useState, useEffect, useCallback } from "react";

// Bump when you replace carousel images (bypass browser cache). Uses native <img> so public/ files are served as-is, no compression.
const CAROUSEL_CACHE_VERSION = "7";

const SLIDES = [
  { src: `/carousel-1.png?v=${CAROUSEL_CACHE_VERSION}`, alt: "Digital pager – Burger Shack queue and customer screens" },
  { src: `/carousel-2.png?v=${CAROUSEL_CACHE_VERSION}`, alt: "Digital pager – Jones Pharmacy queue and customer screens" },
  { src: `/carousel-3.png?v=${CAROUSEL_CACHE_VERSION}`, alt: "Digital pager – Cutting Edge Hair Studio queue and customer screens" },
];

const INTERVAL_MS = 5000;

export default function HomeCarousel() {
  const [index, setIndex] = useState(0);

  const goTo = useCallback((i: number) => {
    setIndex((prev) => {
      const next = i < 0 ? SLIDES.length - 1 : i >= SLIDES.length ? 0 : i;
      return next;
    });
  }, []);

  useEffect(() => {
    const id = setInterval(() => goTo(index + 1), INTERVAL_MS);
    return () => clearInterval(id);
  }, [index, goTo]);

  return (
    <div className="relative w-full max-w-[100vw]">
      <div className="overflow-hidden w-full">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${index * 100}vw)` }}
        >
          {SLIDES.map((slide, i) => (
            <div key={slide.src} className="w-screen flex-shrink-0 flex justify-center">
              <img
                src={slide.src}
                alt={slide.alt}
                width={3456}
                height={1944}
                className="w-full max-w-full h-auto object-contain object-center"
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : undefined}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Arrows */}
      <button
        type="button"
        onClick={() => goTo(index - 1)}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-zinc-800 shadow-md hover:bg-white transition-colors"
        aria-label="Previous slide"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => goTo(index + 1)}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-zinc-800 shadow-md hover:bg-white transition-colors"
        aria-label="Next slide"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Dots – over carousel images */}
      <div className="absolute bottom-4 left-0 right-0 z-10 flex justify-center gap-2">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            className={`h-2 rounded-full transition-all shadow-sm ${
              i === index ? "w-6 bg-[#01a76c]" : "w-2 bg-white/80 hover:bg-white"
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
