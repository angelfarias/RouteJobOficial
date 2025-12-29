"use client";

import { useEffect, useState } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
}

export default function DynamicBackground() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Generate initial particles
    const initialParticles: Particle[] = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      speedX: (Math.random() - 0.5) * 0.3,
      speedY: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.4 + 0.3,
    }));
    setParticles(initialParticles);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setParticles((prevParticles) =>
        prevParticles.map((particle) => {
          let newX = particle.x + particle.speedX;
          let newY = particle.y + particle.speedY;

          // Bounce off edges
          if (newX <= 0 || newX >= 100) {
            particle.speedX = -particle.speedX;
            newX = Math.max(0, Math.min(100, newX));
          }
          if (newY <= 0 || newY >= 100) {
            particle.speedY = -particle.speedY;
            newY = Math.max(0, Math.min(100, newY));
          }

          return {
            ...particle,
            x: newX,
            y: newY,
          };
        })
      );
    }, 50);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Gradient base */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #d1fae5 0%, #ffffff 50%, #e0f2fe 100%)'
        }}
      />
      
      {/* Dark mode gradient */}
      <div 
        className="absolute inset-0 dark:block hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(6, 78, 59, 0.1) 0%, rgba(9, 9, 11, 0.8) 50%, rgba(8, 145, 178, 0.1) 100%)'
        }}
      />
      
      {/* Grid pattern */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
          backgroundSize: '16px 16px',
          mask: 'radial-gradient(ellipse 50% 50% at 50% 50%, black 70%, transparent 100%)',
          WebkitMask: 'radial-gradient(ellipse 50% 50% at 50% 50%, black 70%, transparent 100%)'
        }}
      />
      
      {/* Floating particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size * 6}px`,
            height: `${particle.size * 6}px`,
            backgroundColor: 'rgba(16, 185, 129, 0.3)',
            opacity: particle.opacity,
            filter: 'blur(4px)',
            transition: 'all 0.05s linear',
          }}
        />
      ))}

      {/* Mouse-following gradient */}
      <div
        className="absolute rounded-full"
        style={{
          width: '400px',
          height: '400px',
          left: `${mousePosition.x - 200}px`,
          top: `${mousePosition.y - 200}px`,
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 70%)',
          filter: 'blur(40px)',
          transition: 'all 0.3s ease-out',
          pointerEvents: 'none',
        }}
      />

      {/* Animated gradient orbs */}
      <div 
        className="absolute rounded-full animate-pulse"
        style={{
          top: '0',
          left: '0',
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(134, 239, 172, 0.3) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
      <div 
        className="absolute rounded-full animate-pulse"
        style={{
          bottom: '0',
          right: '0',
          width: '350px',
          height: '350px',
          background: 'radial-gradient(circle, rgba(103, 232, 249, 0.3) 0%, transparent 70%)',
          filter: 'blur(60px)',
          animationDelay: '1s'
        }}
      />
      <div 
        className="absolute rounded-full animate-pulse"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '280px',
          height: '280px',
          background: 'radial-gradient(circle, rgba(147, 197, 253, 0.2) 0%, transparent 70%)',
          filter: 'blur(50px)',
          animationDelay: '2s'
        }}
      />

      {/* Subtle animated lines */}
      <svg 
        className="absolute inset-0 w-full h-full" 
        xmlns="http://www.w3.org/2000/svg"
        style={{ opacity: 0.3 }}
      >
        <defs>
          <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <path
          d="M0,100 Q250,50 500,100 T1000,100"
          stroke="url(#gradient1)"
          strokeWidth="2"
          fill="none"
          className="animate-pulse"
          style={{ animationDuration: "4s" }}
        />
        <path
          d="M0,200 Q300,150 600,200 T1200,200"
          stroke="url(#gradient1)"
          strokeWidth="1"
          fill="none"
          className="animate-pulse"
          style={{ animationDuration: "5s", animationDelay: "1s" }}
        />
      </svg>
    </div>
  );
}
