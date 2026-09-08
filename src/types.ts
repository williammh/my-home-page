export interface LinkNode {
  id: string
  type: 'link'
  name: string
  url: string
}

export interface FolderNode {
  id: string
  type: 'folder'
  name: string
  icon: string
  children: TreeNode[]
}

export type TreeNode = FolderNode | LinkNode

export interface Settings {
  name: string
  /**
   * BCP 47 tag, or 'system' to follow the browser's language setting.
   *
   * 'system' is the default and is stored as-is rather than resolved once at
   * first load, so a user who changes their OS language sees the page follow.
   */
  locale: string
  timeZone: string
  dateFormat: string
  /**
   * Either an http(s) URL, or the sentinel `DEVICE_BACKGROUND_IMAGE` meaning
   * "the image the user picked from their device, stored in IndexedDB" — see
   * backgroundImageDb.ts. Kept as a plain string (not a data URL) so this
   * settings object stays small enough for localStorage regardless of the
   * picked image's size.
   */
  backgroundImage: string
  backgroundColor: string
  textTheme: 'light' | 'dark'
  glass: boolean
  openInNewTab: boolean
}
