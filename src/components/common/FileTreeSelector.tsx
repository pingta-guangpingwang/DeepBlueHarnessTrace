import { useState, useCallback, useMemo } from 'react'
import { buildTree, type FileEntry, type TreeNode } from '../../utils/flattenTree'

interface FileTreeSelectorProps {
  files: FileEntry[]
  maxHeight?: string
  onChange?: (uncheckedPaths: string[]) => void
  /** External control: provide unchecked paths to override internal state */
  uncheckedPaths?: string[]
  /** External control: provide expanded dirs to override internal state */
  expandedDirs?: string[]
  onExpandChange?: (expandedDirs: string[]) => void
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

  let isIndeterminate = false
  if (isDir && node.children.length > 0) {
    const childPaths = collectDescendants(node).slice(1)
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
        <input
          type="checkbox"
          checked={allChecked}
          ref={el => {
            if (el) el.indeterminate = isIndeterminate
          }}
          onChange={handleCheckChange}
          style={{ marginRight: 6, flexShrink: 0, cursor: 'pointer' }}
        />

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
  uncheckedPaths: externalUnchecked,
  expandedDirs: externalExpanded,
  onExpandChange,
}: FileTreeSelectorProps) {
  const [internalUnchecked, setInternalUnchecked] = useState<Set<string>>(new Set())
  const [internalExpanded, setInternalExpanded] = useState<Set<string>>(new Set())

  const isControlled = externalUnchecked !== undefined
  const uncheckedSet = useMemo(
    () => isControlled ? new Set(externalUnchecked) : internalUnchecked,
    [isControlled, externalUnchecked, internalUnchecked]
  )
  const expandedSet = useMemo(
    () => externalExpanded !== undefined ? new Set(externalExpanded) : internalExpanded,
    [externalExpanded, internalExpanded]
  )

  const tree = useMemo(() => buildTree(files), [files])

  const toggleCheck = useCallback((path: string, isDirectory: boolean, children: TreeNode[]) => {
    if (isControlled) {
      const next = new Set(uncheckedSet)
      if (isDirectory) {
        const descendants = collectDescendants({ path, isDirectory: true, name: '', children })
        if (next.has(path)) {
          for (const d of descendants) next.delete(d)
        } else {
          for (const d of descendants) next.add(d)
        }
      } else {
        if (next.has(path)) next.delete(path)
        else next.add(path)
      }
      onChange?.(Array.from(next))
    } else {
      setInternalUnchecked(prev => {
        const next = new Set(prev)
        if (isDirectory) {
          const descendants = collectDescendants({ path, isDirectory: true, name: '', children })
          if (next.has(path)) {
            for (const d of descendants) next.delete(d)
          } else {
            for (const d of descendants) next.add(d)
          }
        } else {
          if (next.has(path)) next.delete(path)
          else next.add(path)
        }
        onChange?.(Array.from(next))
        return next
      })
    }
  }, [isControlled, uncheckedSet, onChange])

  const toggleDir = useCallback((path: string) => {
    if (externalExpanded !== undefined && onExpandChange) {
      const next = new Set(expandedSet)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      onExpandChange(Array.from(next))
    } else {
      setInternalExpanded(prev => {
        const next = new Set(prev)
        if (next.has(path)) next.delete(path)
        else next.add(path)
        return next
      })
    }
  }, [externalExpanded, expandedSet, onExpandChange])

  if (files.length === 0) {
    return (
      <div style={{ padding: 12, color: '#6b7280', fontSize: 13 }}>
        No files found.
      </div>
    )
  }

  const isFullHeight = maxHeight.endsWith('%') || maxHeight.endsWith('vh')

  return (
    <div style={{
      maxHeight,
      ...(isFullHeight ? { height: '100%' } : {}),
      overflowY: 'auto',
      border: '1px solid #e5e7eb',
      borderRadius: 6,
      backgroundColor: '#fafbfc',
    }}>
      <div style={{
        padding: '6px 12px',
        fontSize: 11,
        color: '#9ca3af',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#f3f4f6',
      }}>
        {uncheckedSet.size > 0
          ? `${uncheckedSet.size} item(s) selected to ignore`
          : 'All files included — uncheck items to ignore'}
      </div>
      {tree.map(node => (
        <FileTreeRow
          key={node.path}
          node={node}
          depth={0}
          uncheckedPaths={uncheckedSet}
          onToggle={toggleCheck}
          expandedDirs={expandedSet}
          onToggleDir={toggleDir}
        />
      ))}
    </div>
  )
}
