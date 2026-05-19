import { useState, useCallback, useMemo } from 'react'
import { buildTree, type FileEntry, type TreeNode } from '../../utils/flattenTree'

interface FileTreeSelectorProps {
  files: FileEntry[]
  maxHeight?: string
  onChange?: (uncheckedPaths: string[]) => void
}

function collectDescendants(node: TreeNode): string[] {
  const paths = [node.path]
  for (const child of node.children) {
    paths.push(...collectDescendants(child))
  }
  return paths
}

function FileTreeRow({
  node,
  depth,
  uncheckedPaths,
  onToggle,
  expandedDirs,
  onToggleDir,
}: {
  node: TreeNode
  depth: number
  uncheckedPaths: Set<string>
  onToggle: (path: string, isDirectory: boolean, children: TreeNode[]) => void
  expandedDirs: Set<string>
  onToggleDir: (path: string) => void
}) {
  const isDir = node.isDirectory
  const isExpanded = isDir && expandedDirs.has(node.path)
  const isUnchecked = uncheckedPaths.has(node.path)
  const allChecked = !isUnchecked

  // Determine if this directory has mixed children
  let isIndeterminate = false
  if (isDir && node.children.length > 0) {
    const childPaths = collectDescendants(node).slice(1) // exclude self
    const uncheckedCount = childPaths.filter(p => uncheckedPaths.has(p)).length
    isIndeterminate = uncheckedCount > 0 && uncheckedCount < childPaths.length
  }

  const handleCheckChange = () => {
    onToggle(node.path, isDir, node.children)
  }

  const handleDirClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isDir) onToggleDir(node.path)
  }

  const rowHeight = 28
  const indent = 12 + depth * 18

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: rowHeight,
          paddingLeft: indent,
          paddingRight: 8,
          cursor: 'default',
          opacity: isUnchecked && !isDir ? 0.4 : 1,
          fontSize: 13,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={allChecked}
          ref={el => {
            if (el) el.indeterminate = isIndeterminate
          }}
          onChange={handleCheckChange}
          style={{ marginRight: 6, flexShrink: 0, cursor: 'pointer' }}
        />

        {/* Expand arrow (directories only) */}
        <span
          onClick={handleDirClick}
          style={{
            width: 16,
            textAlign: 'center',
            flexShrink: 0,
            cursor: isDir ? 'pointer' : 'default',
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s',
            fontSize: 11,
            color: isDir ? '#9ca3af' : 'transparent',
            userSelect: 'none',
          }}
        >
          &#9654;
        </span>

        {/* Icon */}
        <span style={{
          width: 22,
          textAlign: 'center',
          flexShrink: 0,
          fontSize: 12,
          color: isDir ? '#f59e0b' : '#6b7280',
          userSelect: 'none',
        }}>
          {isDir ? '📁' : '📄'}
        </span>

        {/* Name */}
        <span style={{
          marginLeft: 4,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: isUnchecked && isDir ? '#9ca3af' : '#374151',
        }}>
          {node.name}
        </span>
      </div>

      {/* Render expanded children */}
      {isDir && isExpanded && node.children.map(child => (
        <FileTreeRow
          key={child.path}
          node={child}
          depth={depth + 1}
          uncheckedPaths={uncheckedPaths}
          onToggle={onToggle}
          expandedDirs={expandedDirs}
          onToggleDir={onToggleDir}
        />
      ))}
    </>
  )
}

export default function FileTreeSelector({
  files,
  maxHeight = '300px',
  onChange,
}: FileTreeSelectorProps) {
  const [uncheckedPaths, setUncheckedPaths] = useState<Set<string>>(new Set())
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())

  const tree = useMemo(() => buildTree(files), [files])

  const toggleCheck = useCallback((path: string, isDirectory: boolean, children: TreeNode[]) => {
    setUncheckedPaths(prev => {
      const next = new Set(prev)
      if (isDirectory) {
        const descendants = collectDescendants({ path, isDirectory: true, name: '', children })
        if (next.has(path)) {
          // Re-check: remove self and all descendants
          for (const d of descendants) next.delete(d)
        } else {
          // Uncheck: add self and all descendants
          for (const d of descendants) next.add(d)
        }
      } else {
        if (next.has(path)) {
          next.delete(path)
        } else {
          next.add(path)
        }
      }
      // Notify parent
      onChange?.(Array.from(next))
      return next
    })
  }, [onChange])

  const toggleDir = useCallback((path: string) => {
    setExpandedDirs(prev => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }, [])

  if (files.length === 0) {
    return (
      <div style={{ padding: 12, color: '#6b7280', fontSize: 13 }}>
        No files found.
      </div>
    )
  }

  return (
    <div style={{
      maxHeight,
      overflowY: 'auto',
      border: '1px solid #e5e7eb',
      borderRadius: 6,
      backgroundColor: '#fafbfc',
    }}>
      {/* Header hint */}
      <div style={{
        padding: '6px 12px',
        fontSize: 11,
        color: '#9ca3af',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#f3f4f6',
      }}>
        {uncheckedPaths.size > 0
          ? `${uncheckedPaths.size} item(s) selected to ignore`
          : 'All files included — uncheck items to ignore'}
      </div>
      {tree.map(node => (
        <FileTreeRow
          key={node.path}
          node={node}
          depth={0}
          uncheckedPaths={uncheckedPaths}
          onToggle={toggleCheck}
          expandedDirs={expandedDirs}
          onToggleDir={toggleDir}
        />
      ))}
    </div>
  )
}
