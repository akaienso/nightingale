'use client';

/**
 * Branded loading overlay: shows the animated nightingale video with
 * mix-blend-mode: screen to make the black background invisible.
 * Purely visual acknowledgement — non-blocking (pointer-events-none).
 */
export default function LoadingOverlay({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none bg-background/40 backdrop-blur-[2px]"
      style={{ isolation: 'isolate' }}
    >
      <video
        src="/nightingale-loading.mp4"
        autoPlay
        loop
        muted
        playsInline
        width={112}
        height={112}
        className="object-contain"
        style={{
          width: '112px',
          height: '112px',
          maxWidth: '40vw',
          maxHeight: '40vh',
          mixBlendMode: 'screen',
        }}
      />
    </div>
  );
}
