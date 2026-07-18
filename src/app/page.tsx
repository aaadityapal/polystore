'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/files`
  : 'http://127.0.0.1:8000/api/files';

type FileRecord = {
  id: string;
  originalName: string;
  size: string;
  mimeType: string;
  status: string;
  createdAt: string;
};

type UploadState = {
  name: string;
  progress: number;
  speedStr?: string;
  etaStr?: string;
};

export default function Dashboard() {
  const [files, setFiles]           = useState<FileRecord[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading]   = useState<UploadState | null>(null);
  const [uploadQueue, setUploadQueue] = useState<File[]>([]);
  const [user, setUser]             = useState<{ name: string; email: string; role: string } | null>(null);

  const fileInputRef   = useRef<HTMLInputElement>(null);
  const router         = useRouter();
  const tokenRef       = useRef<string | null>(null);
  const isUploadingRef = useRef(false);

  useEffect(() => {
    const token    = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) { router.push('/login'); return; }
    tokenRef.current = token;
    setUser(JSON.parse(userData));
    fetchFiles();
    const interval = setInterval(fetchFiles, 5000);
    return () => clearInterval(interval);
  }, [router]);

  const fetchFiles = async () => {
    if (!tokenRef.current) return;
    try {
      const res  = await fetch(API_URL, { headers: { Authorization: `Bearer ${tokenRef.current}` } });
      const data = await res.json();
      if (data.success) setFiles(data.files);
    } catch { /* silent */ }
  };

  const formatBytes = (bytes: string | number) => {
    const size = Number(bytes);
    if (size === 0) return '0 B';
    const k = 1024;
    const s = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(size) / Math.log(k));
    return parseFloat((size / Math.pow(k, i)).toFixed(1)) + ' ' + s[i];
  };

  const uploadFile = (file: File): Promise<void> =>
    new Promise((resolve) => {
      if (!tokenRef.current) { resolve(); return; }
      setUploading({ name: file.name, progress: 0, speedStr: '—', etaStr: '—' });

      const xhr      = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);

      let lastLoaded = 0;
      let lastTime   = Date.now();

      xhr.upload.onprogress = (e) => {
        if (!e.lengthComputable) return;
        const progress    = Math.round((e.loaded / e.total) * 100);
        const currentTime = Date.now();
        const timeDiff    = currentTime - lastTime;

        if (timeDiff > 500 || e.loaded === e.total) {
          const speedBps   = ((e.loaded - lastLoaded) / timeDiff) * 1000;
          const remaining  = e.total - e.loaded;
          const etaSec     = speedBps > 0 ? remaining / speedBps : 0;
          const speedStr   = `${formatBytes(speedBps)}/s`;
          const etaStr     = etaSec < 60
            ? `${Math.ceil(etaSec)}s`
            : `${Math.floor(etaSec / 60)}m ${Math.ceil(etaSec % 60)}s`;
          lastLoaded = e.loaded;
          lastTime   = currentTime;
          setUploading({ name: file.name, progress, speedStr, etaStr });
        } else {
          setUploading(prev => prev ? { ...prev, progress } : null);
        }
      };

      xhr.onload = () => {
        setUploading(null);
        if (xhr.status !== 200) alert(`Upload failed: ${file.name}`);
        resolve();
      };
      xhr.onerror = () => {
        setUploading(null);
        alert(`Network error uploading: ${file.name}`);
        resolve();
      };

      xhr.open('POST', `${API_URL}/upload`, true);
      xhr.setRequestHeader('Authorization', `Bearer ${tokenRef.current}`);
      xhr.send(formData);
    });

  const processQueue = async (filesToUpload: File[]) => {
    if (isUploadingRef.current) return;
    isUploadingRef.current = true;
    for (const file of filesToUpload) {
      await uploadFile(file);
      setUploadQueue(prev => prev.slice(1));
    }
    isUploadingRef.current = false;
    fetchFiles();
  };

  const enqueueFiles = (newFiles: File[]) => {
    if (!newFiles.length) return;
    setUploadQueue(prev => {
      const updated = [...prev, ...newFiles];
      if (!isUploadingRef.current) processQueue(updated);
      return updated;
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) enqueueFiles(Array.from(e.dataTransfer.files));
  };

  const deleteFile = async (fileId: string, fileName: string) => {
    if (!tokenRef.current) return;
    if (!window.confirm(`Delete "${fileName}"?`)) return;
    try {
      const res = await fetch(`${API_URL}/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenRef.current}` }
      });
      if (res.ok) fetchFiles();
      else alert('Failed to delete file.');
    } catch { alert('Network error while deleting.'); }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (!user) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
      Loading…
    </div>
  );

  const queueRemaining = uploadQueue.slice(1); // files after the current one

  return (
    <div className={`animate-fade-in ${styles.page}`}>

      {/* ── Header ── */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <svg viewBox="0 0 24 24">
              <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
            </svg>
          </div>
          <h1>PolyStore</h1>
        </div>

        <div className={styles.headerActions}>
          <span className={styles.welcomeText}>
            Welcome, <strong>{user.name || user.email}</strong>
          </span>
          {user.role === 'ADMIN' && (
            <a href="/admin" className={styles.adminLink}>
              ⚙ Admin
            </a>
          )}
          <button onClick={handleLogout} className={styles.logoutBtn}>
            Sign out
          </button>
        </div>
      </header>

      {/* ── Main Grid ── */}
      <div className={styles.dashboardGrid}>

        {/* Sidebar */}
        <aside className={styles.sidebar}>

          {/* Dropzone */}
          <div
            className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ''}`}
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
            <h2>Upload files</h2>
            <p>Drag & drop or click to browse.<br />Multiple files supported.</p>
            <button className={styles.uploadBtn} tabIndex={-1}>Browse</button>
            <input
              type="file"
              multiple
              style={{ display: 'none' }}
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files?.length) {
                  enqueueFiles(Array.from(e.target.files));
                  e.target.value = '';
                }
              }}
            />
          </div>

          {/* Upload Queue */}
          {(uploading || uploadQueue.length > 0) && (
            <div className={styles.queuePanel}>
              <div className={styles.queueHeader}>
                <span className={styles.queueTitle}>Uploading</span>
                <span className={styles.queueCount}>{uploadQueue.length} file{uploadQueue.length !== 1 ? 's' : ''}</span>
              </div>

              {/* Active file */}
              {uploading && (
                <div className={styles.queueItem}>
                  <div className={styles.queueItemName}>{uploading.name}</div>
                  <div className={styles.queueItemMeta}>
                    <span>{uploading.speedStr}</span>
                    <span>{uploading.progress}% · ETA {uploading.etaStr}</span>
                  </div>
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: `${uploading.progress}%` }} />
                  </div>
                </div>
              )}

              {/* Waiting files */}
              {queueRemaining.map((f, i) => (
                <div key={i} className={styles.queueWaiting}>
                  <span className={styles.waitDot} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                  <span style={{ marginLeft: 'auto', flexShrink: 0 }}>{formatBytes(f.size)}</span>
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* File Grid */}
        <section className={styles.fileArea}>
          <div className={styles.fileAreaHeader}>
            <h2>Your Files</h2>
            {files.length > 0 && (
              <span className={styles.fileCount}>{files.length} file{files.length !== 1 ? 's' : ''}</span>
            )}
          </div>

          <div className={styles.fileGrid}>
            {files.map(file => (
              <div key={file.id} className={styles.fileCard}>
                <span className={`${styles.statusBadge} ${styles[file.status]}`}>{file.status}</span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
                </div>

                <div className={styles.fileActions}>
                  {file.status === 'READY' && (
                    <a
                      href={`${API_URL}/download/${file.id}?token=${tokenRef.current}`}
                      className={styles.downloadBtn}
                      download
                    >
                      ↓ Download
                    </a>
                  )}
                  <button
                    className={styles.deleteBtn}
                    onClick={() => deleteFile(file.id, file.originalName)}
                    title="Delete file"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}

            {files.length === 0 && (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📂</div>
                <p>No files yet. Upload your first file above.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
