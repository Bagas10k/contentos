// src/pages/LocalNetwork.tsx
import { useState, useEffect, useRef } from 'react';
import { 
  Globe, Laptop, Smartphone, Tablet, Monitor, UploadCloud, 
  Download, Trash2, Edit3, Check, Wifi, AlertCircle, 
  FileText, Image, Video, Music, File, RefreshCw, X
} from 'lucide-react';
import { TopBar } from '../components/layout/TopBar';
import { toast } from '../components/ui/Toast';

interface ActiveDevice {
  deviceId: string;
  deviceName: string;
  userAgent: string;
  ip: string;
  lastSeen: number;
  username?: string;
}

interface SharedFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
}

export default function LocalNetwork() {
  const [devices, setDevices] = useState<ActiveDevice[]>([]);
  const [sharedFiles, setSharedFiles] = useState<SharedFile[]>([]);
  // Local storage values
  const [myDeviceId, setMyDeviceId] = useState<string>('');
  const [deviceName, setDeviceName] = useState<string>('');
  
  // Rename state
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempDeviceName, setTempDeviceName] = useState('');
  
  // Upload states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  // Loading states
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`
    };
  };

  // Fetch active devices
  const fetchDevices = async (silent = false) => {
    if (!silent) setIsLoadingDevices(true);
    try {
      const res = await fetch('/api/network/devices', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setDevices(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch devices:', error);
    } finally {
      if (!silent) setIsLoadingDevices(false);
    }
  };

  // Fetch shared files
  const fetchSharedFiles = async (silent = false) => {
    if (!silent) setIsLoadingFiles(true);
    try {
      const res = await fetch('/api/network/shared-files', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSharedFiles(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch shared files:', error);
    } finally {
      if (!silent) setIsLoadingFiles(false);
    }
  };

  // Initialize data
  useEffect(() => {
    const storedId = localStorage.getItem('contentos_device_id') || '';
    const storedName = localStorage.getItem('contentos_device_name') || '';
    setMyDeviceId(storedId);
    setDeviceName(storedName);
    setTempDeviceName(storedName);
    
    fetchDevices();
    fetchSharedFiles();

    // Poll active devices and files every 5 seconds
    const interval = setInterval(() => {
      fetchDevices(true);
      fetchSharedFiles(true);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Handle device name update
  const handleUpdateDeviceName = async () => {
    if (!tempDeviceName.trim()) {
      toast.error('Nama perangkat tidak boleh kosong');
      return;
    }
    
    const newName = tempDeviceName.trim();
    localStorage.setItem('contentos_device_name', newName);
    setDeviceName(newName);
    setIsEditingName(false);
    toast.success('Nama perangkat berhasil disimpan');

    // Trigger heartbeat immediately to notify backend
    const storedId = localStorage.getItem('contentos_device_id');
    const token = localStorage.getItem('token');
    if (storedId && token) {
      try {
        await fetch('/api/network/heartbeat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            deviceId: storedId,
            deviceName: newName,
            userAgent: navigator.userAgent
          })
        });
        fetchDevices(true);
      } catch (error) {
        console.warn('Failed to update device status:', error);
      }
    }
  };

  // Handle file upload
  const handleUploadFile = (file: File) => {
    if (file.size > 500 * 1024 * 1024) {
      toast.error('Ukuran file melebihi batas maksimal 500MB');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const token = localStorage.getItem('token');
    const storedName = localStorage.getItem('contentos_device_name') || 'Perangkat Jaringan';
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('deviceName', storedName);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/network/upload', true);
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percent);
      }
    };

    xhr.onload = () => {
      setIsUploading(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (response.success) {
            toast.success(`Berkas "${file.name}" berhasil dibagikan!`);
            fetchSharedFiles();
          } else {
            toast.error(response.message || 'Gagal memproses unggahan');
          }
        } catch {
          toast.error('Gagal memproses respon dari server');
        }
      } else {
        toast.error('Unggahan gagal. Periksa koneksi Anda.');
      }
    };

    xhr.onerror = () => {
      setIsUploading(false);
      toast.error('Koneksi terputus saat mengunggah berkas.');
    };

    xhr.send(formData);
  };

  // File selection / drag drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUploadFile(e.target.files[0]);
      e.target.value = ''; // Reset
    }
  };

  // File delete
  const handleDeleteFile = async (id: string, name: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus berkas "${name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/network/shared-files/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Berkas berhasil dihapus');
        fetchSharedFiles();
      } else {
        toast.error(data.message || 'Gagal menghapus berkas');
      }
    } catch {
      toast.error('Gagal menghubungi server untuk menghapus berkas');
    }
  };

  // Utilities
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' · ' + d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit' });
    } catch {
      return '-';
    }
  };

  const getDeviceIcon = (ua: string) => {
    const uaLower = ua.toLowerCase();
    if (uaLower.includes('mobi') || uaLower.includes('phone') || uaLower.includes('android')) {
      return Smartphone;
    }
    if (uaLower.includes('tablet') || uaLower.includes('ipad')) {
      return Tablet;
    }
    if (uaLower.includes('smarttv') || uaLower.includes('appletv')) {
      return Monitor;
    }
    return Laptop;
  };

  const getDevicePlatform = (ua: string) => {
    const uaLower = ua.toLowerCase();
    if (uaLower.includes('iphone') || uaLower.includes('ipad')) return 'iOS';
    if (uaLower.includes('android')) return 'Android';
    if (uaLower.includes('macintosh') || uaLower.includes('mac os')) return 'macOS';
    if (uaLower.includes('windows')) return 'Windows';
    if (uaLower.includes('linux')) return 'Linux';
    return 'Lainnya';
  };

  const getFileIcon = (mimeType: string, filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const mime = mimeType?.toLowerCase() || '';
    
    if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(ext)) {
      return { Icon: Image, color: 'var(--color-green)', bg: 'rgba(52, 199, 89, 0.12)' };
    }
    if (mime.startsWith('video/') || ['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext)) {
      return { Icon: Video, color: 'var(--color-indigo)', bg: 'rgba(88, 86, 214, 0.12)' };
    }
    if (mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext)) {
      return { Icon: Music, color: 'var(--color-purple)', bg: 'rgba(175, 82, 222, 0.12)' };
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return { Icon: FileText, color: 'var(--color-orange)', bg: 'rgba(255, 149, 0, 0.12)' };
    }
    if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'md'].includes(ext)) {
      return { Icon: FileText, color: 'var(--color-blue)', bg: 'rgba(0, 122, 255, 0.12)' };
    }
    return { Icon: File, color: 'var(--text-tertiary)', bg: 'var(--bg-tertiary)' };
  };



  // Sort devices so "My Device" is always on top
  const sortedDevices = [...devices].sort((a, b) => {
    if (a.deviceId === myDeviceId) return -1;
    if (b.deviceId === myDeviceId) return 1;
    return 0;
  });

  return (
    <div className="page-container">
      <style>{customStyles}</style>
      <TopBar title="Local Share" subtitle="Discovery dan Transfer Berkas dalam Jaringan WiFi Lokal" />
      
      <div className="page-content">
        <div className="local-network-container">
          
          {/* SISI KIRI: DEVICE TRACKER & CONNECTIONS */}
          <div className="flex flex-col gap-5">
            
            {/* CARD 1: IDENTITAS PERANGKAT INI */}
            <div className="card p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-ios flex items-center justify-center text-white" style={{ background: 'linear-gradient(135deg, var(--color-blue), var(--color-indigo))' }}>
                  <Wifi size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Perangkat Anda</h3>
                  <p className="text-[11px]" style={{ color: 'var(--text-quaternary)' }}>Nama identitas di jaringan lokal</p>
                </div>
              </div>

              {isEditingName ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input flex-1"
                    style={{ minHeight: '38px', fontSize: '13px' }}
                    value={tempDeviceName}
                    onChange={(e) => setTempDeviceName(e.target.value)}
                    maxLength={30}
                    placeholder="Beri nama perangkat..."
                    autoFocus
                  />
                  <button className="btn btn-primary btn-icon w-9 h-9 flex-shrink-0" onClick={handleUpdateDeviceName} title="Simpan">
                    <Check size={16} />
                  </button>
                  <button className="btn btn-ghost btn-icon w-9 h-9 flex-shrink-0" onClick={() => { setTempDeviceName(deviceName); setIsEditingName(false); }} title="Batal">
                    <X size={16} style={{ color: 'var(--text-tertiary)' }} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 rounded-ios hover-bg-subtle transition-colors border" style={{ borderColor: 'var(--border-color)' }}>
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{deviceName || 'Mendeteksi...'}</p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>ID: <span className="font-mono text-[10px]">{myDeviceId.substring(0, 12)}...</span></p>
                  </div>
                  <button 
                    className="btn btn-ghost btn-icon w-8 h-8 flex-shrink-0 hover-bg-hover"
                    onClick={() => { setTempDeviceName(deviceName); setIsEditingName(true); }}
                    title="Ubah Nama Perangkat"
                  >
                    <Edit3 size={14} style={{ color: 'var(--text-tertiary)' }} />
                  </button>
                </div>
              )}
            </div>


            {/* CARD 3: DEVICE LIST MONITOR */}
            <div className="card p-5 flex-1 flex flex-col min-h-[220px]">
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Perangkat Aktif</h3>
                  <span className="badge text-[10px]" style={{ background: 'rgba(52, 199, 89, 0.1)', color: 'var(--color-green)', fontWeight: 'bold' }}>
                    {devices.length} Online
                  </span>
                </div>
                <button 
                  className="btn btn-ghost btn-icon w-7 h-7" 
                  onClick={() => fetchDevices()} 
                  title="Refresh Daftar Perangkat"
                  disabled={isLoadingDevices}
                >
                  <RefreshCw size={13} className={isLoadingDevices ? 'animate-spin' : ''} style={{ color: 'var(--text-tertiary)' }} />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 pr-1 flex flex-col gap-2" style={{ maxHeight: '280px' }}>
                {devices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center text-xs" style={{ color: 'var(--text-quaternary)' }}>
                    <AlertCircle size={20} className="mb-2" />
                    <span>Mencari perangkat lokal lain...</span>
                  </div>
                ) : (
                  sortedDevices.map((dev) => {
                    const DeviceIcon = getDeviceIcon(dev.userAgent);
                    const isMe = dev.deviceId === myDeviceId;
                    
                    return (
                      <div 
                        key={dev.deviceId} 
                        className={`flex items-center gap-3 p-3 rounded-ios border transition-all ${isMe ? 'device-card-active' : ''}`}
                        style={{ 
                          borderColor: isMe ? 'var(--color-blue)' : 'var(--border-color)',
                          background: 'var(--bg-secondary)'
                        }}
                      >
                        <div 
                          className="w-9 h-9 rounded-ios flex items-center justify-center flex-shrink-0"
                          style={{ 
                            background: isMe ? 'rgba(0, 122, 255, 0.1)' : 'var(--bg-tertiary)',
                            color: isMe ? 'var(--color-blue)' : 'var(--text-secondary)'
                          }}
                        >
                          <DeviceIcon size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                              {dev.username ? `@${dev.username}` : dev.deviceName}
                            </span>
                            {isMe && (
                              <span className="badge text-[9px] px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: 'var(--color-blue)', color: 'white', fontWeight: 'bold' }}>
                                Anda
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--text-tertiary)' }}>
                            {dev.username ? `${dev.deviceName} · ` : ''}IP: {dev.ip} · {getDevicePlatform(dev.userAgent)}
                          </p>
                        </div>
                        <div className="flex items-center flex-shrink-0">
                          <span className="pulse-online" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

          {/* SISI KANAN: LOCAL DROP FILE SHARING */}
          <div className="flex flex-col gap-5 min-w-0">
            
            {/* DROPZONE AREA */}
            <div 
              className={`dropzone ${isDragging ? 'dragging' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileSelect} 
              />
              
              {isUploading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 animate-spin" style={{ borderColor: 'var(--bg-tertiary)', borderTopColor: 'var(--color-blue)' }} />
                    <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{uploadProgress}%</span>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Sedang membagikan berkas...</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-quaternary)' }}>Jangan tutup halaman ini</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="dropzone-icon-container">
                    <UploadCloud size={24} />
                  </div>
                  <div className="text-center max-w-[280px]">
                    <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                      Seret berkas di sini untuk membagikan
                    </p>
                    <p className="text-[11px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                      Atau <span style={{ color: 'var(--color-blue)', fontWeight: 'semibold' }}>klik untuk memilih berkas</span> dari penyimpanan lokal (Maksimal 500MB)
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* SHARED FILES TABLE */}
            <div className="card p-5 flex-1 flex flex-col min-h-[350px]">
              <div className="flex items-center justify-between mb-4 border-b pb-3" style={{ borderColor: 'var(--border-color)' }}>
                <div>
                  <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Berkas Terbagi</h3>
                  <p className="text-[11px]" style={{ color: 'var(--text-quaternary)' }}>Berkas yang ditransfer di jaringan WiFi lokal</p>
                </div>
                <button 
                  className="btn btn-ghost btn-icon w-8 h-8" 
                  onClick={() => fetchSharedFiles()} 
                  title="Refresh Daftar Berkas"
                  disabled={isLoadingFiles}
                >
                  <RefreshCw size={14} className={isLoadingFiles ? 'animate-spin' : ''} style={{ color: 'var(--text-tertiary)' }} />
                </button>
              </div>

              {/* TABLE AREA */}
              <div className="flex-1 overflow-x-auto overflow-y-auto" style={{ maxHeight: '450px' }}>
                {sharedFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center" style={{ color: 'var(--text-quaternary)' }}>
                    <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: 'var(--bg-secondary)', color: 'var(--text-quaternary)' }}>
                      <Globe size={20} />
                    </div>
                    <p className="text-xs font-bold">Belum ada berkas dibagikan</p>
                    <p className="text-[11px] mt-1 max-w-[240px]">Tarik berkas Anda ke panel atas untuk membagikannya secara instan dengan perangkat lain.</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse" style={{ minWidth: '480px' }}>
                    <thead>
                      <tr className="border-b text-[10px] font-bold uppercase tracking-wider" style={{ borderColor: 'var(--border-color)', color: 'var(--text-quaternary)' }}>
                        <th className="py-2.5 px-3">Berkas</th>
                        <th className="py-2.5 px-3">Ukuran</th>
                        <th className="py-2.5 px-3">Pengirim</th>
                        <th className="py-2.5 px-3">Waktu</th>
                        <th className="py-2.5 px-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sharedFiles.map((file) => {
                        const fileMeta = getFileIcon(file.mimeType, file.originalName);
                        const FileIcon = fileMeta.Icon;
                        const token = localStorage.getItem('token') || '';
                        const downloadUrl = `/api/network/download/${file.id}?token=${encodeURIComponent(token)}`;
                        
                        return (
                          <tr key={file.id} className="border-b last:border-b-0 hover-bg-subtle transition-colors text-xs" style={{ borderColor: 'var(--border-color)' }}>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2.5 min-w-0 max-w-[220px]">
                                <div className="file-type-icon flex-shrink-0" style={{ background: fileMeta.bg, color: fileMeta.color }}>
                                  <FileIcon size={18} />
                                </div>
                                <span className="font-semibold truncate" style={{ color: 'var(--text-primary)' }} title={file.originalName}>
                                  {file.originalName}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-3" style={{ color: 'var(--text-secondary)' }}>
                              {formatBytes(file.size)}
                            </td>
                            <td className="py-3 px-3" style={{ color: 'var(--text-secondary)' }}>
                              <span className="truncate max-w-[100px] inline-block" title={file.uploadedBy}>
                                {file.uploadedBy}
                              </span>
                            </td>
                            <td className="py-3 px-3" style={{ color: 'var(--text-quaternary)' }}>
                              {formatDate(file.uploadedAt)}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <a 
                                  href={downloadUrl} 
                                  download={file.originalName}
                                  className="btn btn-ghost btn-icon w-8 h-8 flex items-center justify-center hover-bg-hover"
                                  title="Unduh Berkas"
                                >
                                  <Download size={14} style={{ color: 'var(--color-blue)' }} />
                                </a>
                                <button 
                                  className="btn btn-ghost btn-icon w-8 h-8 flex items-center justify-center hover-bg-danger"
                                  onClick={() => handleDeleteFile(file.id, file.originalName)}
                                  title="Hapus Berkas"
                                >
                                  <Trash2 size={14} style={{ color: 'var(--color-red)' }} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

            </div>

          </div>

        </div>
      </div>
    </div>
  );
}

const customStyles = `
  .local-network-container {
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;
    height: 100%;
  }
  
  @media (min-width: 1024px) {
    .local-network-container {
      grid-template-columns: 320px 1fr;
    }
  }

  .device-card-active {
    border: 1.5px solid var(--color-blue) !important;
    background: rgba(0, 122, 255, 0.04) !important;
  }

  .pulse-online {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: var(--color-green);
    box-shadow: 0 0 0 0 rgba(52, 199, 89, 0.4);
    animation: pulse-green 2s infinite;
  }

  @keyframes pulse-green {
    0% {
      transform: scale(0.95);
      box-shadow: 0 0 0 0 rgba(52, 199, 89, 0.7);
    }
    70% {
      transform: scale(1);
      box-shadow: 0 0 0 8px rgba(52, 199, 89, 0);
    }
    100% {
      transform: scale(0.95);
      box-shadow: 0 0 0 0 rgba(52, 199, 89, 0);
    }
  }

  .dropzone {
    border: 2px dashed var(--border-color);
    background: var(--bg-secondary);
    border-radius: var(--radius);
    padding: 32px;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    position: relative;
    overflow: hidden;
  }

  .dropzone:hover {
    border-color: var(--color-blue);
    background: var(--bg-hover-subtle);
  }

  .dropzone.dragging {
    border-color: var(--color-blue);
    background: rgba(0, 122, 255, 0.05);
    transform: scale(1.01);
  }

  .dropzone-icon-container {
    width: 54px;
    height: 54px;
    border-radius: 50%;
    background: var(--bg-tertiary);
    color: var(--text-tertiary);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .dropzone.dragging .dropzone-icon-container {
    background: var(--color-blue);
    color: white;
  }

  .file-type-icon {
    width: 34px;
    height: 34px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
  }


`;
