// src/components/layout/ShareModal.tsx
import { useEffect, useState, useRef } from 'react';
import { X, Copy, Check, QrCode, Wifi } from 'lucide-react';
import QRCode from 'qrcode';
import { toast } from '../ui/Toast';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShareModal({ isOpen, onClose }: ShareModalProps) {
  const [ips, setIps] = useState<string[]>([]);
  const [selectedIp, setSelectedIp] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Fetch server IP address list from backend
  useEffect(() => {
    if (!isOpen) return;
    const fetchIps = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/network-ips', {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.ips && data.ips.length > 0) {
            // Smart IP Prioritization: Put VirtualBox (56) and virtual sharing adapter (137) at the bottom
            const getIpPriority = (ip: string): number => {
              if (ip.startsWith('10.')) return 10;
              if (ip.startsWith('192.168.1.')) return 9;
              if (ip.startsWith('192.168.0.')) return 8;
              if (ip.startsWith('192.168.')) {
                if (ip.startsWith('192.168.56.')) return 1;
                if (ip.startsWith('192.168.137.')) return 2;
                return 7;
              }
              if (ip.startsWith('172.')) {
                const parts = ip.split('.');
                const second = parseInt(parts[1] || '0', 10);
                if (second >= 16 && second <= 31) return 6;
              }
              return 3;
            };

            const sortedIps = [...data.ips].sort((a, b) => getIpPriority(b) - getIpPriority(a));
            setIps(sortedIps);
            setSelectedIp(sortedIps[0]);
          } else {
            // Fallback to localhost if no external IPs detected
            setIps(['localhost']);
            setSelectedIp('localhost');
          }
        } else {
          setIps(['localhost']);
          setSelectedIp('localhost');
        }
      } catch (err) {
        console.error('Failed to fetch IPs:', err);
        setIps(['localhost']);
        setSelectedIp('localhost');
      } finally {
        setLoading(false);
      }
    };
    fetchIps();
  }, [isOpen]);

  // Construct URL
  // Vite dev server port is 5173 by default, production server is 3001
  const port = window.location.port || '3001';
  const shareUrl = selectedIp ? `http://${selectedIp}:${port}` : '';

  // Render QR Code on canvas
  useEffect(() => {
    if (!canvasRef.current || !shareUrl) return;
    QRCode.toCanvas(
      canvasRef.current,
      shareUrl,
      {
        width: 180,
        margin: 1.5,
        color: {
          dark: '#1C1C1E', // var(--text-primary)
          light: '#FFFFFF', // var(--bg-surface)
        },
      },
      (error) => {
        if (error) console.error('QR code generation error:', error);
      }
    );
  }, [shareUrl]);

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        setCopied(true);
        toast.success('Link berhasil disalin!');
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        toast.error('Gagal menyalin link.');
      });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal max-w-[420px] overflow-hidden" 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-surface-translucent)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-xl)'
        }}
      >
        {/* Header */}
        <div className="modal-header pb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-[8px]" style={{ background: 'rgba(0,122,255,0.1)', color: 'var(--color-blue)' }}>
              <QrCode size={18} />
            </div>
            <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
              Bagikan Akses Jaringan
            </h3>
          </div>
          <button 
            className="btn btn-ghost btn-icon" 
            style={{ padding: '6px', borderRadius: '50%' }}
            onClick={onClose}
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body flex flex-col items-center gap-5 pt-3">
          <p className="text-xs text-center px-2" style={{ color: 'var(--text-tertiary)', lineHeight: '1.4' }}>
            Scan Kode QR di bawah menggunakan HP atau laptop lain dalam **satu jaringan Wi-Fi** yang sama untuk mengakses dasbor.
          </p>

          {/* QR Code Frame */}
          <div 
            className="flex items-center justify-center p-3 rounded-lg border bg-white" 
            style={{ 
              borderColor: 'var(--border-color)',
              boxShadow: 'var(--shadow-sm)',
              minHeight: '204px',
              minWidth: '204px'
            }}
          >
            {loading ? (
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin rounded-full h-6 w-6 border-2" style={{ borderColor: 'var(--color-blue)', borderTopColor: 'transparent' }} />
                <span className="text-[11px]" style={{ color: 'var(--text-quaternary)' }}>Memindai jaringan...</span>
              </div>
            ) : (
              <canvas ref={canvasRef} />
            )}
          </div>

          {/* IP Select and Copy Link */}
          <div className="w-full flex flex-col gap-3">
            {ips.length > 1 && (
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>Pilih Jaringan Aktif</label>
                <select 
                  className="input select" 
                  value={selectedIp}
                  onChange={(e) => setSelectedIp(e.target.value)}
                  style={{ padding: '8px 10px', fontSize: '13px' }}
                >
                  {ips.map((ip) => (
                    <option key={ip} value={ip}>
                      {ip === 'localhost' ? 'Localhost' : `Wi-Fi / LAN (${ip})`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>Tautan Akses</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  className="input" 
                  value={shareUrl} 
                  readOnly 
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  style={{ 
                    padding: '8px 10px', 
                    fontSize: '13px', 
                    background: 'var(--bg-secondary)', 
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-secondary)'
                  }} 
                />
                <button 
                  className="btn btn-primary"
                  onClick={handleCopy}
                  style={{ padding: '0 12px', flexShrink: 0, borderRadius: 'var(--radius-sm)' }}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          </div>

          {/* Wi-Fi Tip */}
          <div 
            className="w-full p-3 rounded-lg flex gap-2.5 items-start text-[11px]" 
            style={{ 
              background: 'rgba(0,122,255,0.05)', 
              color: 'var(--text-secondary)',
              border: '1px solid rgba(0,122,255,0.1)'
            }}
          >
            <Wifi size={14} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-blue)' }} />
            <div className="flex-1" style={{ lineHeight: '1.4' }}>
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Tips Jaringan:</span> Pastikan perangkat HP dan Laptop server Anda terhubung ke nama **Wi-Fi / SSID** yang sama agar link ini dapat diakses.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
