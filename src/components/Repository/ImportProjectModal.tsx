import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAppState } from '../../context/AppContext'
import { useI18n } from '../../i18n'
import FileTreeSelector from '../common/FileTreeSelector'
import { type FileEntry } from '../../utils/flattenTree'

const DEFAULT_IGNORE_PATTERNS = ['dist/', 'build/', '*.log', '.env', '.tmp/']

interface Props {
  folderPath: string
  warning?: string
  progressLog: string[]
  onConfirm: (projectName: string, initWithCommit: boolean, ignorePatterns?: string[]) => void
  onCancel: () => void
}

export default function ImportProjectModal({ folderPath, warning, progressLog, onConfirm, onCancel }: Props) {
  const [state] = useAppState()
  const { t } = useI18n()
  const [projectName, setProjectName] = useState('')
  const [initWithCommit, setInitWithCommit] = useState(true)
  const [fileEntries, setFileEntries] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(false)

  // Tree state
  const [uncheckedPaths, setUncheckedPaths] = useState<Set<string>>(new Set())
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())

  // Default ignore patterns that are active (checked = will be ignored)
  const [activePatterns, setActivePatterns] = useState<Set<string>>(new Set(DEFAULT_IGNORE_PATTERNS))

  // Disabled file extensions (unchecked = ignored)
  const [disabledExtensions, setDisabledExtensions] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (folderPath) {
      window.electronAPI.pathBasename(folderPath).then(result => {
        setProjectName(result.result)
      })
    }
  }, [folderPath])

  useEffect(() => {
    if (folderPath) {
      window.electronAPI.listFiles(folderPath).then(result => {
        if (result.success && result.files) {
          setFileEntries(result.files)
        }
      }).catch(() => {})
    }
  }, [folderPath])

  // Extract all file extensions from entries
  const extensionMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const entry of fileEntries) {
      if (entry.isDirectory) continue
      const dotIdx = entry.name.lastIndexOf('.')
      if (dotIdx > 0) {
        const ext = entry.name.substring(dotIdx + 1).toLowerCase()
        map.set(ext, (map.get(ext) || 0) + 1)
      } else {
        // Files without extension
        map.set('(no ext)', (map.get('(no ext)') || 0) + 1)
      }
    }
    return new Map([...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])))
  }, [fileEntries])

  // Toggle a file extension - bulk check/uncheck all files with that extension
  const toggleExtension = useCallback((ext: string) => {
    setDisabledExtensions(prev => {
      const next = new Set(prev)
      if (next.has(ext)) {
        next.delete(ext)
      } else {
        next.add(ext)
      }
      return next
    })
    // Bulk toggle files in the tree
    setUncheckedPaths(prev => {
      const next = new Set(prev)
      const targetFiles = ext === '(no ext)'
        ? fileEntries.filter(e => !e.isDirectory && !e.name.includes('.'))
        : fileEntries.filter(e => !e.isDirectory && e.name.toLowerCase().endsWith('.' + ext))

      const isCurrentlyDisabled = disabledExtensions.has(ext)
      // If currently disabled, we're re-enabling → remove from unchecked
      // If currently enabled, we're disabling → add to unchecked
      for (const f of targetFiles) {
        if (isCurrentlyDisabled) {
          next.delete(f.path)
        } else {
          next.add(f.path)
        }
      }
      return next
    })
  }, [fileEntries, disabledExtensions])

  // Toggle a default ignore pattern
  const togglePattern = useCallback((pattern: string) => {
    setActivePatterns(prev => {
      const next = new Set(prev)
      if (next.has(pattern)) next.delete(pattern)
      else next.add(pattern)
      return next
    })
  }, [])

  const handleTreeChange = useCallback((paths: string[]) => {
    setUncheckedPaths(new Set(paths))
  }, [])

  const handleExpandChange = useCallback((dirs: string[]) => {
    setExpandedDirs(new Set(dirs))
  }, [])

  const handleConfirm = async () => {
    if (!projectName.trim()) return
    setLoading(true)

    // Build final ignore patterns:
    // 1. Active default patterns (dist/, build/, etc.)
    // 2. Unchecked file/directory paths from tree (dirs get / suffix)
    const patterns: string[] = [...activePatterns]
    for (const p of uncheckedPaths) {
      const entry = fileEntries.find(f => f.path === p)
      const pattern = entry?.isDirectory ? p + '/' : p
      if (!patterns.includes(pattern)) {
        patterns.push(pattern)
      }
    }

    await onConfirm(projectName.trim(), initWithCommit, patterns.length > 0 ? patterns : undefined)
    setLoading(false)
  }

  const canConfirm = projectName.trim().length > 0 && !loading
  const uncheckedArr = Array.from(uncheckedPaths)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: '#f5f5f5',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 24px',
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#1f2937' }}>{t.importProject.title}</h2>
          <span style={{
            fontSize: '12px', color: '#6b7280',
            background: '#f3f4f6', padding: '3px 10px', borderRadius: '4px',
            fontFamily: 'Consolas, monospace',
          }}>
            {folderPath}
          </span>
        </div>
        <button
          onClick={onCancel}
          style={{
            border: 'none', background: 'transparent', cursor: 'pointer',
            fontSize: '20px', color: '#9ca3af', padding: '4px 8px',
          }}
        >✕</button>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left: File Tree */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          background: '#fff', margin: '12px', borderRadius: '8px',
          border: '1px solid #e5e7eb', overflow: 'hidden',
        }}>
          <div style={{
            padding: '10px 16px', borderBottom: '1px solid #e5e7eb',
            background: '#fafbfc', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div>
              <span style={{ fontWeight: 600, fontSize: '13px', color: '#374151' }}>
                {t.importProject.fileTree || 'Project File Tree'}
              </span>
              <span style={{ fontSize: '11px', color: '#9ca3af', marginLeft: '8px' }}>
                {fileEntries.length > 0
                  ? (t.importProject.filesCount || '{count} files').replace('{count}', String(fileEntries.length))
                  : t.importProject.scanning}
              </span>
            </div>
            <span style={{ fontSize: '11px', color: '#9ca3af' }}>
              {uncheckedArr.length > 0
                ? (t.importProject.ignoreCount || '{count} ignored').replace('{count}', String(uncheckedArr.length))
                : t.importProject.allIncluded || 'All synced'}
            </span>
          </div>
          <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            {fileEntries.length > 0 ? (
              <div style={{ position: 'absolute', inset: 0 }}>
                <FileTreeSelector
                  files={fileEntries}
                  maxHeight="100%"
                  uncheckedPaths={uncheckedArr}
                  expandedDirs={Array.from(expandedDirs)}
                  onChange={handleTreeChange}
                  onExpandChange={handleExpandChange}
                />
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
                {t.importProject.scanning}
              </div>
            )}
          </div>
        </div>

        {/* Right: Settings Panel */}
        <div style={{
          width: '340px', flexShrink: 0,
          display: 'flex', flexDirection: 'column', gap: '12px',
          padding: '12px 12px 12px 0', overflowY: 'auto',
        }}>
          {/* Warning */}
          {warning && (
            <div style={{
              padding: '10px 14px', background: '#fffbeb', borderRadius: '8px',
              border: '1px solid #fde68a', fontSize: '13px', color: '#92400e',
              lineHeight: '1.5',
            }}>
              {warning}
            </div>
          )}

          {/* Default Ignore Patterns */}
          <div style={{
            background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb',
            padding: '12px 14px',
          }}>
            <div style={{ fontWeight: 600, fontSize: '13px', color: '#374151', marginBottom: '4px' }}>
              {t.importProject.defaultIgnores || 'Default Ignore Rules'}
            </div>
            <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '10px' }}>
              {t.importProject.defaultIgnoresHint || 'These file types are ignored by default. Uncheck to sync them.'}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {DEFAULT_IGNORE_PATTERNS.map(pattern => {
                const active = activePatterns.has(pattern)
                return (
                  <button
                    key={pattern}
                    onClick={() => togglePattern(pattern)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '5px',
                      padding: '4px 10px', borderRadius: '16px', fontSize: '12px',
                      fontWeight: 500, cursor: 'pointer',
                      border: active ? '1px solid #fca5a5' : '1px solid #bbf7d0',
                      background: active ? '#fef2f2' : '#f0fdf4',
                      color: active ? '#dc2626' : '#16a34a',
                      fontFamily: 'Consolas, monospace',
                      transition: 'all 0.15s',
                    }}
                    title={active ? 'Click to sync this type' : 'Click to ignore this type'}
                  >
                    <span style={{ fontSize: '14px' }}>{active ? '🚫' : '✅'}</span>
                    {pattern}
                  </button>
                )
              })}
            </div>
            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '8px' }}>
              {(t.importProject.rulesCount || '{count} rules').replace('{count}', String(activePatterns.size))}
            </div>
          </div>

          {/* File Extension Filter */}
          {extensionMap.size > 0 && (
            <div style={{
              background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb',
              padding: '12px 14px',
            }}>
              <div style={{ fontWeight: 600, fontSize: '13px', color: '#374151', marginBottom: '4px' }}>
                {t.importProject.fileTypes || 'File Type Filter'}
              </div>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '10px' }}>
                {t.importProject.fileTypesHint || 'Bulk toggle by file extension for quick selection'}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                {[...extensionMap.entries()].map(([ext, count]) => {
                  const disabled = disabledExtensions.has(ext)
                  return (
                    <button
                      key={ext}
                      onClick={() => toggleExtension(ext)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        padding: '3px 9px', borderRadius: '14px', fontSize: '11px',
                        fontWeight: 500, cursor: 'pointer',
                        border: disabled ? '1px solid #fca5a5' : '1px solid #d1d5db',
                        background: disabled ? '#fef2f2' : '#fff',
                        color: disabled ? '#dc2626' : '#374151',
                        fontFamily: 'Consolas, monospace',
                        transition: 'all 0.15s',
                      }}
                    >
                      <span style={{
                        width: '14px', height: '14px', borderRadius: '3px',
                        border: disabled ? '1px solid #fca5a5' : '1px solid #d1d5db',
                        background: disabled ? '#fca5a5' : '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '9px', color: '#fff',
                      }}>
                        {!disabled && '✓'}
                      </span>
                      .{ext}
                      <span style={{ color: disabled ? '#f87171' : '#9ca3af', fontWeight: 400 }}>
                        ({count})
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Project Name */}
          <div style={{
            background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb',
            padding: '12px 14px',
          }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
              {t.importProject.repoName}
            </label>
            <input
              type="text"
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              placeholder={t.importProject.repoNamePlaceholder}
              autoFocus
              style={{
                width: '100%', padding: '8px 12px', fontSize: '13px',
                borderRadius: '6px', border: '1px solid #d1d5db',
                fontFamily: 'Consolas, monospace', boxSizing: 'border-box',
              }}
            />
            <div style={{
              marginTop: '6px', fontSize: '11px', color: '#9ca3af',
              fontFamily: 'Consolas, monospace',
            }}>
              {state.rootRepositoryPath}/repositories/{projectName || t.importProject.repoPathName}
            </div>
          </div>

          {/* Init Commit */}
          <div style={{
            padding: '10px 14px', background: '#f0fdf4', borderRadius: '8px',
            border: '1px solid #bbf7d0',
            display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <input
              type="checkbox"
              checked={initWithCommit}
              onChange={e => setInitWithCommit(e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#16a34a', flexShrink: 0 }}
              id="init-commit-check"
            />
            <label htmlFor="init-commit-check" style={{ cursor: 'pointer', flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#166534' }}>{t.importProject.initialCommit}</div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                {t.importProject.initialCommitHint}
              </div>
            </label>
          </div>

          {/* Progress Log */}
          {progressLog.length > 0 && (
            <div style={{
              padding: '8px 12px', background: '#1e293b', borderRadius: '8px',
              maxHeight: '120px', overflowY: 'auto',
              fontFamily: 'Consolas, monospace', fontSize: '11px',
              color: '#94a3b8', lineHeight: '1.6',
            }}>
              {progressLog.map((msg, i) => (
                <div key={i} style={{ color: msg.includes('完成') ? '#4ade80' : '#94a3b8' }}>
                  {msg}
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: 'auto' }}>
            <button
              onClick={onCancel}
              disabled={loading}
              style={{
                padding: '8px 20px', borderRadius: '6px', fontSize: '13px',
                border: '1px solid #d1d5db', background: '#fff',
                color: '#374151', cursor: loading ? 'default' : 'pointer',
              }}
            >{t.common.cancel}</button>
            <button
              onClick={handleConfirm}
              disabled={!canConfirm}
              style={{
                padding: '8px 20px', borderRadius: '6px', fontSize: '13px',
                fontWeight: 500, cursor: canConfirm ? 'pointer' : 'default',
                border: 'none', background: canConfirm ? '#4f46e5' : '#d1d5db',
                color: '#fff', opacity: canConfirm ? 1 : 0.6,
              }}
            >
              {loading ? t.importProject.importing : t.importProject.confirmImport}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
