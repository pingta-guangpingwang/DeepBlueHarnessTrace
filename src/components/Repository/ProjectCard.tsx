import { useState, useEffect, useCallback } from 'react'
import type { Project } from '../../context/AppContext'
import { useAppState } from '../../context/AppContext'
import { useI18n } from '../../i18n'

const NOTES_FILE = '/.dbvs-horsefarm-notes.md'

interface ProjectCardProps {
  project: Project
  index: number
  total: number
  onEnter: () => void
  onCommit: () => void
  onDeleteWithOptions: (options: { deleteFiles: boolean; deleteRepo: boolean }) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onMoveTop: () => void
  onMoveBottom: () => void
  onSetRating: (rating: number) => void
  onDragStart: (index: number) => void
  onDragOver: (e: React.DragEvent, index: number) => void
  onDrop: (index: number) => void
  onDragEnd: () => void
  isDragOver: boolean
}

function getStarColor(rating: number): string {
  if (rating === 1) return '#22c55e'
  if (rating === 2) return '#16a34a'
  if (rating === 3) return '#eab308'
  if (rating === 4) return '#f59e0b'
  if (rating === 5) return '#ef4444'
  return '#dc2626'
}

export default function ProjectCard({ project, index, total, onEnter, onCommit, onDeleteWithOptions, onMoveUp, onMoveDown, onMoveTop, onMoveBottom, onSetRating, onDragStart, onDragOver, onDrop, onDragEnd, isDragOver }: ProjectCardProps) {
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)
  const [deleteFiles, setDeleteFiles] = useState(false)
  const [deleteRepo, setDeleteRepo] = useState(false)
  const [showRatingPicker, setShowRatingPicker] = useState(false)
  const [, dispatch] = useAppState()
  const { t } = useI18n()

  const hasWorkingCopy = !!project.path

  // Notes
  const [notes, setNotes] = useState('')
  const [showNotesEditor, setShowNotesEditor] = useState(false)
  const [notesDraft, setNotesDraft] = useState('')

  useEffect(() => {
    if (!hasWorkingCopy) return
    const notesPath = project.path + NOTES_FILE
    window.electronAPI.readFile(notesPath).then(r => {
      if (r.success && r.content) setNotes(r.content)
    }).catch(() => {})
  }, [project.path])

  const openNotesEditor = useCallback(() => {
    setNotesDraft(notes)
    setShowNotesEditor(true)
  }, [notes])

  const saveNotes = useCallback(async () => {
    const notesPath = project.path + NOTES_FILE
    const result = await window.electronAPI.writeFile(notesPath, notesDraft)
    if (result.success) {
      setNotes(notesDraft)
      setShowNotesEditor(false)
    }
  }, [project.path, notesDraft])

  const notesShort = notes.length > 80 ? notes.slice(0, 80) + '...' : notes

  const openFolder = () => {
    if (!hasWorkingCopy) return
    window.electronAPI.openFolder(project.path)
  }

  const openRemoveDialog = () => {
    setDeleteFiles(false)
    setDeleteRepo(false)
    setShowRemoveDialog(true)
  }

  const handleConfirmRemove = () => {
    onDeleteWithOptions({ deleteFiles, deleteRepo })
    setShowRemoveDialog(false)
  }

  // Remove Dialog with checkbox options
  if (showRemoveDialog) {
    return (
      <div className="project-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong style={{ fontSize: '14px' }}>{project.name}</strong>
            <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '10px' }}>
              {hasWorkingCopy ? project.path : <span style={{ color: '#d97706' }}>⚠ {t.projectCard.notCheckedOut}</span>}
            </span>
          </div>
          <button
            onClick={() => setShowRemoveDialog(false)}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '16px', color: '#9ca3af' }}
          >✕</button>
        </div>

        <div style={{ fontSize: '13px', color: '#374151', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
          {t.projectCard.removeTitle}
        </div>

        {/* Checkbox 1: Remove from list (mandatory) */}
        <label style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '8px 12px', borderRadius: '6px',
          background: '#f0fdf4', border: '1px solid #bbf7d0',
          cursor: 'default', fontSize: '13px', color: '#374151',
        }}>
          <input type="checkbox" checked readOnly style={{ accentColor: '#16a34a', width: '16px', height: '16px' }} />
          <span>{t.projectCard.removeCheckboxList}</span>
        </label>

        {/* Checkbox 2: Delete working copy files */}
        {hasWorkingCopy && (
          <label style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '8px 12px', borderRadius: '6px',
            background: deleteFiles ? '#fef2f2' : '#fff',
            border: deleteFiles ? '1px solid #fca5a5' : '1px solid #e5e7eb',
            cursor: 'pointer', fontSize: '13px',
            color: deleteFiles ? '#dc2626' : '#6b7280',
          }}>
            <input
              type="checkbox"
              checked={deleteFiles}
              onChange={e => setDeleteFiles(e.target.checked)}
              style={{ accentColor: '#dc2626', width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <span style={{ color: '#dc2626' }}>{t.projectCard.removeCheckboxFiles}</span>
          </label>
        )}

        {/* Checkbox 3: Delete repository */}
        <label style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '8px 12px', borderRadius: '6px',
          background: deleteRepo ? '#fef2f2' : '#fff',
          border: deleteRepo ? '1px solid #fca5a5' : '1px solid #e5e7eb',
          cursor: 'pointer', fontSize: '13px',
          color: deleteRepo ? '#dc2626' : '#6b7280',
        }}>
          <input
            type="checkbox"
            checked={deleteRepo}
            onChange={e => setDeleteRepo(e.target.checked)}
            style={{ accentColor: '#dc2626', width: '16px', height: '16px', cursor: 'pointer' }}
          />
          <span style={{ color: '#dc2626' }}>{t.projectCard.removeCheckboxRepo}</span>
        </label>

        {/* Warning when repo delete is checked */}
        {deleteRepo && (
          <div style={{
            padding: '8px 12px', background: '#fef2f2', borderRadius: '6px',
            border: '1px solid #fca5a5', fontSize: '12px', color: '#dc2626',
            lineHeight: '1.5',
          }}>
            ⚠ {t.projectCard.removeCheckboxRepoWarn}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            className="secondary-button"
            style={{ fontSize: '12px', padding: '4px 12px' }}
            onClick={() => setShowRemoveDialog(false)}
          >
            {t.common.cancel}
          </button>
          <button
            className="warning-button"
            style={{ fontSize: '12px', padding: '4px 12px', background: '#dc2626' }}
            onClick={handleConfirmRemove}
          >
            {t.projectCard.removeConfirm}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`project-card${isDragOver ? ' drag-over' : ''}`}
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragEnd={() => onDragEnd()}
      onDrop={() => onDrop(index)}
      style={{ flexWrap: 'wrap', gap: '10px' }}
    >
      {/* Left: Order controls */}
      <div className="project-order-controls" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
        flexShrink: 0, padding: '2px 10px 2px 0',
        borderRight: '1px solid #f3f4f6', marginRight: '4px',
      }}>
        <button className="project-order-btn" onClick={onMoveTop} disabled={index === 0} title={t.projectCard.moveTop}
          style={{ border: 'none', background: 'transparent', cursor: index === 0 ? 'default' : 'pointer', fontSize: '14px', lineHeight: 1, padding: '3px 7px', borderRadius: '4px', color: '#6b7280', opacity: index === 0 ? 0.25 : 0.7 }}
        >⏫</button>
        <button className="project-order-btn" onClick={onMoveUp} disabled={index === 0} title={t.projectCard.moveUp}
          style={{ border: 'none', background: 'transparent', cursor: index === 0 ? 'default' : 'pointer', fontSize: '14px', lineHeight: 1, padding: '3px 7px', borderRadius: '4px', color: '#6b7280', opacity: index === 0 ? 0.25 : 0.7 }}
        >▲</button>
        <span className="project-order-index" title="Drag to reorder"
          style={{
            fontSize: '13px', fontWeight: 700, color: '#4f46e5',
            background: '#eef2ff', borderRadius: '6px',
            minWidth: '28px', height: '24px', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            border: '1px solid #c7d2fe', cursor: 'grab', userSelect: 'none',
            margin: '1px 0',
          }}
        >{index + 1}</span>
        <button className="project-order-btn" onClick={onMoveDown} disabled={index >= total - 1} title={t.projectCard.moveDown}
          style={{ border: 'none', background: 'transparent', cursor: index >= total - 1 ? 'default' : 'pointer', fontSize: '14px', lineHeight: 1, padding: '3px 7px', borderRadius: '4px', color: '#6b7280', opacity: index >= total - 1 ? 0.25 : 0.7 }}
        >▼</button>
        <button className="project-order-btn" onClick={onMoveBottom} disabled={index >= total - 1} title={t.projectCard.moveBottom}
          style={{ border: 'none', background: 'transparent', cursor: index >= total - 1 ? 'default' : 'pointer', fontSize: '14px', lineHeight: 1, padding: '3px 7px', borderRadius: '4px', color: '#6b7280', opacity: index >= total - 1 ? 0.25 : 0.7 }}
        >⏬</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
      <div className="project-info" style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
        {/* Star rating */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setShowRatingPicker(!showRatingPicker)}
            title={`${'★'.repeat(project.rating || 2)} (${project.rating || 2}/6)`}
            style={{
              border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: '15px', lineHeight: 1, padding: '2px 4px',
              color: getStarColor(project.rating || 2),
              letterSpacing: '1px', borderRadius: '4px',
            }}
          >
            {'★'.repeat(project.rating || 2)}{'☆'.repeat(6 - (project.rating || 2))}
          </button>
          {showRatingPicker && (
            <div className="project-rating-dropdown" style={{
              position: 'absolute', top: '100%', left: 0, zIndex: 100,
              background: '#fff', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              border: '1px solid #e5e7eb', padding: '4px',
              display: 'flex', flexDirection: 'column', gap: '1px',
              minWidth: '120px',
            }}>
              {[1, 2, 3, 4, 5, 6].map(n => (
                <button
                  key={n}
                  onClick={() => { onSetRating(n); setShowRatingPicker(false) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '5px 10px', border: 'none', borderRadius: '4px',
                    background: (project.rating || 2) === n ? '#f3f4f6' : 'transparent',
                    cursor: 'pointer', textAlign: 'left', fontSize: '13px',
                    color: getStarColor(n), fontWeight: (project.rating || 2) === n ? 600 : 400,
                  }}
                  onMouseEnter={e => { if ((project.rating || 2) !== n) e.currentTarget.style.background = '#f9fafb' }}
                  onMouseLeave={e => { if ((project.rating || 2) !== n) e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{ letterSpacing: '1px' }}>{'★'.repeat(n)}{'☆'.repeat(6 - n)}</span>
                  <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 400 }}>Lv.{n}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <h3 style={{ margin: 0, whiteSpace: 'nowrap', fontSize: '14px' }}>{project.name}</h3>
        <span style={{ fontSize: '12px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {hasWorkingCopy
            ? project.path
            : <span style={{ color: '#d97706', fontWeight: 500 }} title={t.projectCard.noWorkingCopy}>⚠ {t.projectCard.notCheckedOut}</span>
          }
        </span>
        <span className={`project-status ${project.status === t.projectCard.synced ? 'synced' : 'unsynced'}`}>
          {project.status === t.projectCard.synced ? t.projectCard.synced : project.status}
        </span>
        {project.hasChanges && (
          <span style={{ fontSize: '12px', color: '#d97706', fontWeight: 500 }}>● {t.projectCard.hasChanges}</span>
        )}
      </div>
      <div className="project-actions" style={{ flexShrink: 0 }}>
        <button
          style={{ fontSize: '12px', padding: '4px 12px' }}
          onClick={hasWorkingCopy ? onEnter : () => dispatch({ type: 'SET_MESSAGE', payload: t.projectCard.noWorkingCopy + ' ' + t.projectCard.noWorkingCopyHint })}
          disabled={!hasWorkingCopy}
          title={!hasWorkingCopy ? t.projectCard.noWorkingCopy : ''}
        >{t.projectCard.enter}</button>
        <button
          style={{ fontSize: '12px', padding: '4px 12px' }}
          onClick={hasWorkingCopy ? onCommit : () => dispatch({ type: 'SET_MESSAGE', payload: t.projectCard.noWorkingCopy + ' ' + t.projectCard.noWorkingCopyHint })}
          disabled={!hasWorkingCopy}
          title={!hasWorkingCopy ? t.projectCard.noWorkingCopy : ''}
        >{t.projectCard.commits}</button>
        <button
          className="secondary-button"
          style={{ fontSize: '12px', padding: '4px 12px' }}
          onClick={hasWorkingCopy ? openFolder : () => dispatch({ type: 'SET_MESSAGE', payload: t.projectCard.noWorkingCopy + ' ' + t.projectCard.noWorkingCopyHint })}
          disabled={!hasWorkingCopy}
          title={!hasWorkingCopy ? t.projectCard.noWorkingCopy : ''}
        >{t.projectCard.openFolder}</button>
        <button
          className="secondary-button"
          style={{ fontSize: '12px', padding: '4px 12px', color: '#9ca3af' }}
          onClick={openRemoveDialog}
        >
          {t.projectCard.remove}
        </button>
      </div>

      {/* Notes row — full width below the main row */}
      {hasWorkingCopy && (
        <div
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => { e.stopPropagation(); openNotesEditor(); }}
          title={t.projectCard.notesPlaceholder}
          style={{
            width: '100%', fontSize: '11px',
            color: notes ? '#374151' : '#9ca3af',
            lineHeight: '1.5', cursor: 'pointer', marginTop: '4px',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            padding: '3px 6px', borderRadius: '4px', minHeight: '20px',
            border: notes ? '1px solid #e5e7eb' : '1px dashed #d1d5db',
            background: notes ? '#f9fafb' : '#fafafa',
            userSelect: 'none',
          }}
        >
          {notes ? notesShort : '💬 ' + t.projectCard.notesPlaceholder}
          {notes && notes.length > 80 && (
            <button
              onClick={(e) => { e.stopPropagation(); openNotesEditor(); }}
              style={{
                fontSize: '10px', marginLeft: '6px', padding: '0 4px', border: 'none', background: 'transparent',
                color: '#6366f1', cursor: 'pointer', textDecoration: 'underline',
              }}
            >{t.projectCard.notesViewAll}</button>
          )}
        </div>
      )}

      {/* Notes Editor Popup */}
      {showNotesEditor && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10001,
          background: 'rgba(0,0,0,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowNotesEditor(false)}>
          <div style={{
            background: '#fff', borderRadius: '12px', padding: '20px',
            width: '520px', maxWidth: '94vw', maxHeight: '80vh',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            display: 'flex', flexDirection: 'column',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '14px', color: '#1f2937' }}>
                {t.projectCard.notesEditorTitle} — {project.name}
              </h4>
              <button onClick={() => setShowNotesEditor(false)} style={{
                border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '18px', color: '#9ca3af',
              }}>✕</button>
            </div>
            <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 10px' }}>
              {t.projectCard.notesHint}
            </p>
            <textarea
              value={notesDraft}
              onChange={e => setNotesDraft(e.target.value)}
              placeholder={t.projectCard.notesPlaceholder}
              autoFocus
              style={{
                flex: 1, minHeight: '180px', padding: '12px',
                border: '1px solid #d1d5db', borderRadius: '8px',
                fontSize: '13px', lineHeight: 1.6, resize: 'vertical',
                outline: 'none', fontFamily: 'inherit',
              }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button
                onClick={() => setShowNotesEditor(false)}
                style={{
                  padding: '8px 16px', borderRadius: '6px', border: '1px solid #d1d5db',
                  background: '#fff', color: '#374151', cursor: 'pointer', fontSize: '12px',
                }}
              >
                {t.projectCard.notesCancel}
              </button>
              <button
                onClick={saveNotes}
                style={{
                  padding: '8px 16px', borderRadius: '6px', border: 'none',
                  background: '#4f46e5', color: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: 500,
                }}
              >
                {t.projectCard.notesSave}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
