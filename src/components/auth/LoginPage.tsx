// src/components/auth/LoginPage.tsx
import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { toast } from '../ui/Toast';

interface LoginPageProps {
  onLoginSuccess: (token: string, user: { username: string; role: string }) => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [username, setUsername]       = useState('');
  const [password, setPassword]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]         = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.warning('Username dan password wajib diisi.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Login berhasil! Selamat datang.');
        onLoginSuccess(data.token, data.user);
      } else {
        toast.error(data.message || 'Username atau password salah.');
      }
    } catch (err) {
      console.error('Login error:', err);
      toast.error('Gagal terhubung ke server backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex items-center justify-center min-h-screen p-4"
      style={{
        background: 'var(--bg-app)',
        backgroundAttachment: 'fixed',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative blobs */}
      <div style={{
        position: 'absolute', top: '-20%', right: '-10%',
        width: '60vw', height: '60vw', maxWidth: 500, maxHeight: 500,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(10,132,255,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-15%', left: '-10%',
        width: '50vw', height: '50vw', maxWidth: 400, maxHeight: 400,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(94,92,230,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div
        className="w-full max-w-[400px] animate-scale-up"
        style={{
          background: 'var(--bg-surface)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          border: '1px solid var(--border-glass)',
          borderRadius: 'var(--radius-2xl)',
          boxShadow: 'var(--shadow-xl)',
          padding: '36px 32px',
        }}
      >
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <img
            src="/logo.png"
            alt="Logo"
            className="w-16 h-16 rounded-[16px] object-cover mb-4"
            style={{
              boxShadow: 'var(--glow-blue)',
            }}
          />
          <h1
            className="text-2xl font-bold"
            style={{
              background: 'var(--gradient-primary)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.6px',
            }}
          >
            ContentOS
          </h1>
          <p className="text-xs mt-1.5" style={{ color: 'var(--text-quaternary)' }}>
            Sistem Manajemen Data Konten & Analytics Lembaga
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="form-group">
            <label className="form-label">Username</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-quaternary)' }}>
                <User size={17} />
              </span>
              <input
                type="text"
                className="input"
                style={{ paddingLeft: '42px' }}
                placeholder="Masukkan username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                autoFocus
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-quaternary)' }}>
                <Lock size={17} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                className="input"
                style={{ paddingLeft: '42px', paddingRight: '42px' }}
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 border-none bg-transparent cursor-pointer p-0.5 rounded-md"
                style={{ color: 'var(--text-quaternary)', transition: 'color 0.15s' }}
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full justify-center mt-2"
            style={{ borderRadius: 'var(--radius-sm)', padding: '13px', fontSize: '15px', fontWeight: 700 }}
            disabled={loading}
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            ) : (
              'Masuk ke ContentOS'
            )}
          </button>
        </form>

        {/* Footer */}
        <div
          className="flex items-center justify-center gap-2 mt-8 text-[11px]"
          style={{ color: 'var(--text-quaternary)' }}
        >
          <ShieldCheck size={12} style={{ color: 'var(--color-green)' }} />
          <span>Sesi Lokal & Offline Terenkripsi</span>
        </div>
      </div>
    </div>
  );
}
