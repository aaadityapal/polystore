'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

// Using environment variable for API URL (defaults to localhost for development)
const API_URL = process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/files` : 'http://127.0.0.1:8000/api/files';

type FileRecord = {
  id: string;
  originalName: string;
  size: string;
  mimeType: string;
  status: string;
  createdAt: string;
};

export default function Dashboard() {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState<{ name: string; progress: number; speedStr?: string; etaStr?: string } | null>(null);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      router.push('/login');
      return;
    }
    
    tokenRef.current = token;
    setUser(JSON.parse(userData));

    fetchFiles();
    // Polling for updates
    const interval = setInterval(fetchFiles, 5000);
    return () => clearInterval(interval);
  }, [router]);

  const fetchFiles = async () => {
    if (!tokenRef.current) return;
    try {
      const res = await fetch(API_URL, {
        headers: {
          'Authorization': `Bearer ${tokenRef.current}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setFiles(data.files);
      }
    } catch (err) {
      console.error('Failed to fetch files', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const formatBytes = (bytes: string | number) => {
    const size = Number(bytes);
    if (size === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(size) / Math.log(k));
    return parseFloat((size / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const uploadFile = async (file: File) => {
    if (!tokenRef.current) return;
    setUploading({ name: file.name, progress: 0, speedStr: 'Calculating...', etaStr: 'Calculating...' });
    
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);
    
    const startTime = Date.now();
    let lastLoaded = 0;
    let lastTime = startTime;

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        const currentTime = Date.now();
        
        // Calculate over the last interval for smooth updates (min 500ms)
        const timeDiff = currentTime - lastTime;
        
        let speedStr = 'Calculating...';
        let etaStr = 'Calculating...';

        if (timeDiff > 500 || event.loaded === event.total) {
            const loadedDiff = event.loaded - lastLoaded;
            // Bytes per second
            const speedBps = (loadedDiff / timeDiff) * 1000;
            const remainingBytes = event.total - event.loaded;
            const etaSeconds = speedBps > 0 ? remainingBytes / speedBps : 0;
            
            speedStr = `${formatBytes(speedBps)}/s`;
            if (etaSeconds < 60) {
              etaStr = `${Math.ceil(etaSeconds)}s`;
            } else {
              etaStr = `${Math.floor(etaSeconds / 60)}m ${Math.ceil(etaSeconds % 60)}s`;
            }

            lastTime = currentTime;
            lastLoaded = event.loaded;
        } else {
            // Keep previous state if not enough time passed to avoid jitter
            setUploading(prev => {
                if (prev) {
                   speedStr = prev.speedStr || speedStr;
                   etaStr = prev.etaStr || etaStr;
                }
                return { name: file.name, progress, speedStr, etaStr };
            });
            return;
        }

        setUploading({ name: file.name, progress, speedStr, etaStr });
      }
    };
    
    xhr.onload = () => {
      setUploading(null);
      if (xhr.status === 200) {
        fetchFiles();
      } else {
        alert('Upload failed!');
      }
    };
    
    xhr.onerror = () => {
      setUploading(null);
      alert('Upload failed due to network error.');
    };
    
    xhr.open('POST', `${API_URL}/upload`, true);
    xhr.setRequestHeader('Authorization', `Bearer ${tokenRef.current}`);
    xhr.send(formData);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  if (!user) return <div style={{ textAlign: 'center', marginTop: '20vh' }}>Loading...</div>;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <svg viewBox="0 0 24 24">
              <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
            </svg>
          </div>
          <h1>PolyStore</h1>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Welcome, <strong style={{ color: 'white' }}>{user.name}</strong></span>
          <button 
            onClick={handleLogout}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'rgba(255, 0, 0, 0.1)',
              color: '#ff8a8a',
              border: '1px solid rgba(255, 0, 0, 0.2)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className={styles.dashboardGrid}>
        
        {/* Sidebar / Upload Area */}
        <div className={styles.sidebar}>
          <div 
            className={`glass-panel ${styles.dropzone} ${isDragging ? styles.dropzoneActive : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className={styles.uploadIcon}>
              <svg viewBox="0 0 24 24">
                <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z" />
              </svg>
            </div>
            <h2>Upload a file</h2>
            <p>Drag and drop, or click to browse.</p>
            <button className={styles.uploadBtn}>Browse Files</button>
            <input 
              type="file" 
              style={{ display: 'none' }} 
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  uploadFile(e.target.files[0]);
                }
              }}
            />
          </div>
          
          {uploading && (
            <div className={`glass-panel`} style={{ padding: '1.25rem' }}>
              <p style={{ marginBottom: '0.25rem', color: '#fff', fontSize: '0.9rem', fontWeight: 500 }}>
                Uploading: {uploading.name}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                <span>{uploading.speedStr}</span>
                <span>ETA: {uploading.etaStr}</span>
              </div>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${uploading.progress}%` }}></div>
              </div>
            </div>
          )}
        </div>

        {/* File Grid */}
        <div className={styles.fileArea}>
          <h2>Your Private Files</h2>
          <div className={styles.fileGrid}>
            {files.map(file => (
              <div key={file.id} className={`glass-panel ${styles.fileCard}`}>
                <div className={`${styles.statusBadge} ${styles[file.status]}`}>{file.status}</div>
                <div className={styles.fileIcon}>
                  <svg viewBox="0 0 24 24">
                    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                  </svg>
                </div>
                <div className={styles.fileDetails}>
                  <div className={styles.fileName} title={file.originalName}>{file.originalName}</div>
                  <div className={styles.fileMeta}>
                    <span>{formatBytes(file.size)}</span>
                    <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                {file.status === 'READY' && (
                  <a href={`${API_URL}/download/${file.id}?token=${tokenRef.current}`} className={styles.downloadBtn} download>
                    Download
                  </a>
                )}
              </div>
            ))}
            
            {files.length === 0 && (
              <p>No files uploaded yet.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
