// src/lib/confetti.ts
// Option 1 : utilise canvas-confetti installé (npm i canvas-confetti)
export async function fireConfetti(opts?: any) {
  if (typeof window === 'undefined') return;
  try {
    const { default: confetti } = await import('canvas-confetti');
    confetti({
      particleCount: 120,
      spread: 70,
      startVelocity: 30,
      gravity: 0.9,
      ticks: 180,
      origin: { y: 0.6 },
      ...opts,
    });
  } catch {/* silencieux */}
}
