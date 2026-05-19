export interface TreeNode {
  name: string
  path: string
  isDirectory: boolean
  children: TreeNode[]
}

export interface FlatTreeNode {
  node: TreeNode
  depth: number
  isExpanded: boolean
}

export interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
}

export function buildTree(files: FileEntry[]): TreeNode[] {
  const root: TreeNode[] = []
  for (const file of files) {
    const parts = file.path.split('/')
    let current = root
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLast = i === parts.length - 1
      const isDir = isLast ? file.isDirectory : true
      const existingNode = current.find(n => n.name === part)
      if (existingNode) {
        current = existingNode.children
      } else {
        const newNode: TreeNode = {
          name: part,
          path: parts.slice(0, i + 1).join('/'),
          isDirectory: isDir,
          children: [],
        }
        current.push(newNode)
        current.sort((a, b) => {
          if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
          return a.name.localeCompare(b.name)
        })
        current = newNode.children
      }
    }
  }
  return root
}

export function flattenTree(
  nodes: TreeNode[],
  expandedDirs: Set<string>,
  depth = 0,
): FlatTreeNode[] {
  const result: FlatTreeNode[] = []
  for (const node of nodes) {
    const isDir = node.isDirectory
    const expanded = isDir && expandedDirs.has(node.path)
    result.push({ node, depth, isExpanded: expanded })
    if (isDir && expanded && node.children.length > 0) {
      result.push(...flattenTree(node.children, expandedDirs, depth + 1))
    }
  }
  return result
}
