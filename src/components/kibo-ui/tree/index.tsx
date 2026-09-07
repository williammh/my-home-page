"use client";
import { ChevronRight, File, Folder, FolderOpen } from "lucide-react";
import { AnimatePresence, motion, type HTMLMotionProps } from "motion/react";
import {
  createContext,
  useCallback,
  useContext,
  useId,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

interface TreeContextValue {
  expandedIds: Set<string>;
  selectedIds: string[];
  toggleExpanded: (nodeId: string) => void;
  handleSelection: (nodeId: string, ctrlKey?: boolean) => void;
  showLines: boolean;
  showIcons: boolean;
  selectable: boolean;
  multiSelect: boolean;
  indent: number;
  animateExpand: boolean;
}

const TreeContext = createContext<TreeContextValue | undefined>(undefined);

const useTree = () => {
  const context = useContext(TreeContext);
  if (!context) {
    throw new Error("Tree components must be used within a TreeProvider");
  }
  return context;
};

interface TreeNodeContextValue {
  nodeId: string;
  level: number;
  isLast: boolean;
  parentPath: boolean[];
}

const TreeNodeContext = createContext<TreeNodeContextValue | undefined>(undefined);

const useTreeNode = () => {
  const context = useContext(TreeNodeContext);
  if (!context) {
    throw new Error("TreeNode components must be used within a TreeNode");
  }
  return context;
};

export interface TreeProviderProps {
  children?: ReactNode;
  defaultExpandedIds?: string[];
  showLines?: boolean;
  showIcons?: boolean;
  selectable?: boolean;
  multiSelect?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  indent?: number;
  animateExpand?: boolean;
  className?: string;
}

export const TreeProvider = ({
  children,
  defaultExpandedIds = [],
  showLines = true,
  showIcons = true,
  selectable = true,
  multiSelect = false,
  selectedIds,
  onSelectionChange,
  indent = 20,
  animateExpand = true,
  className
}: TreeProviderProps) => {
  const [expandedIds, setExpandedIds] = useState(new Set(defaultExpandedIds));
  const [internalSelectedIds, setInternalSelectedIds] = useState(selectedIds ?? []);

  const isControlled =
    selectedIds !== undefined && onSelectionChange !== undefined;
  const currentSelectedIds = isControlled ? selectedIds : internalSelectedIds;

  const toggleExpanded = useCallback((nodeId: string) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  }, []);

  const handleSelection = useCallback(
    (nodeId: string, ctrlKey = false) => {
      if (!selectable) {
        return;
      }

      let newSelection: string[];

      if (multiSelect && ctrlKey) {
        newSelection = currentSelectedIds.includes(nodeId)
          ? currentSelectedIds.filter((id) => id !== nodeId)
          : [...currentSelectedIds, nodeId];
      } else {
        newSelection = currentSelectedIds.includes(nodeId) ? [] : [nodeId];
      }

      if (isControlled) {
        onSelectionChange?.(newSelection);
      } else {
        setInternalSelectedIds(newSelection);
      }
    },
    [
      selectable,
      multiSelect,
      currentSelectedIds,
      isControlled,
      onSelectionChange,
    ]
  );

  return (
    <TreeContext.Provider
      value={{
        expandedIds,
        selectedIds: currentSelectedIds,
        toggleExpanded,
        handleSelection,
        showLines,
        showIcons,
        selectable,
        multiSelect,
        indent,
        animateExpand,
      }}
    >
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className={cn("w-full", className)}
        initial={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </TreeContext.Provider>
  );
};

export const TreeView = ({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-2", className)} {...props}>
    {children}
  </div>
);

export interface TreeNodeProps extends HTMLAttributes<HTMLDivElement> {
  nodeId?: string;
  level?: number;
  isLast?: boolean;
  parentPath?: boolean[];
}

export const TreeNode = ({
  nodeId: providedNodeId,
  level = 0,
  isLast = false,
  parentPath = [],
  children,
  className,
  onClick,
  ...props
}: TreeNodeProps) => {
  const generatedId = useId();
  const nodeId = providedNodeId ?? generatedId;

  // Build the parent path - mark positions where the parent was the last child
  const currentPath = level === 0 ? [] : [...parentPath];
  if (level > 0 && parentPath.length < level - 1) {
    // Fill in missing levels with false (not last)
    while (currentPath.length < level - 1) {
      currentPath.push(false);
    }
  }
  if (level > 0) {
    currentPath[level - 1] = isLast;
  }

  return (
    <TreeNodeContext.Provider
      value={{
        nodeId,
        level,
        isLast,
        parentPath: currentPath,
      }}
    >
      <div className={cn("select-none", className)} {...props}>
        {children}
      </div>
    </TreeNodeContext.Provider>
  );
};

type NativeDragHandlers = Pick<
  HTMLAttributes<HTMLDivElement>,
  "onDragStart" | "onDragEnd" | "onDragOver" | "onDragLeave" | "onDrop"
>;

export const TreeNodeTrigger = ({
  children,
  className,
  onClick,
  onKeyDown,
  hasChildren,
  ...props
}: Omit<HTMLMotionProps<"div">, "children" | keyof NativeDragHandlers> & {
  children?: ReactNode;
  /** Whether this row can expand — drives `aria-expanded`. */
  hasChildren?: boolean;
} & NativeDragHandlers) => {
  const { selectedIds, expandedIds, toggleExpanded, handleSelection, indent } = useTree();
  const { nodeId, level } = useTreeNode();
  const isSelected = selectedIds.includes(nodeId);
  const isExpanded = expandedIds.has(nodeId);

  return (
    <motion.div
      className={cn(
        "group relative mx-1 flex cursor-pointer items-center rounded-md px-3 py-2 transition-all duration-200",
        "hover:bg-accent/50",
        // A focus ring is required, not optional: this row is a real tab stop
        // now, and without it a keyboard user cannot see where they are.
        "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring",
        isSelected && "bg-accent/80",
        className
      )}
      // The row is a clickable div, which is invisible to keyboard and to
      // assistive tech on its own. `role="treeitem"` names what it is,
      // `aria-expanded` says whether it is open, and `tabIndex` puts it in the
      // tab order so it can be reached at all.
      role="treeitem"
      // Only a row that can actually expand carries `aria-expanded` — on a
      // childless row it would claim a control that isn't there.
      aria-expanded={hasChildren ? isExpanded : undefined}
      aria-selected={isSelected}
      tabIndex={0}
      onKeyDown={(e) => {
        // Enter/Space are what a treeitem is expected to respond to; without
        // them the row could be focused but never activated.
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggleExpanded(nodeId);
          handleSelection(nodeId, e.ctrlKey || e.metaKey);
        }
        onKeyDown?.(e);
      }}
      onClick={(e) => {
        toggleExpanded(nodeId);
        handleSelection(nodeId, e.ctrlKey || e.metaKey);
        onClick?.(e);
      }}
      // Logical, not physical: under `dir="rtl"` the tree has to indent from
      // the right edge, which `paddingLeft` would not do.
      style={{ paddingInlineStart: level * (indent ?? 0) + 8 }}
      whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
      {...(props as unknown as Omit<HTMLMotionProps<"div">, "children">)}
    >
      <TreeLines />
      {children}
    </motion.div>
  );
};

export const TreeLines = () => {
  const { showLines, indent } = useTree();
  const { level, isLast, parentPath } = useTreeNode();

  if (!showLines || level === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute top-0 bottom-0 left-0">
      {/* Render vertical lines for all parent levels */}
      {Array.from({ length: level }, (_, index) => {
        const shouldHideLine = parentPath[index] === true;
        if (shouldHideLine && index === level - 1) {
          return null;
        }

        return (
          <div
            className="absolute top-0 bottom-0 border-border/40 border-l"
            key={index.toString()}
            style={{
              insetInlineStart: index * (indent ?? 0) + 12,
              display: shouldHideLine ? "none" : "block",
            }}
          />
        );
      })}

      {/* Horizontal connector line */}
      <div
        className="absolute top-1/2 border-border/40 border-t"
        style={{
          insetInlineStart: (level - 1) * (indent ?? 0) + 12,
          width: (indent ?? 0) - 4,
          transform: "translateY(-1px)",
        }}
      />

      {/* Vertical line to midpoint for last items */}
      {isLast && (
        <div
          className="absolute top-0 border-border/40 border-l"
          style={{
            insetInlineStart: (level - 1) * (indent ?? 0) + 12,
            height: "50%",
          }}
        />
      )}
    </div>
  );
};

export interface TreeNodeContentProps extends HTMLMotionProps<"div"> {
  hasChildren?: boolean;
}

export const TreeNodeContent = ({
  children,
  hasChildren = false,
  className,
  ...props
}: TreeNodeContentProps) => {
  const { animateExpand, expandedIds } = useTree();
  const { nodeId } = useTreeNode();
  const isExpanded = expandedIds.has(nodeId);
  // `overflow-hidden` is only needed to clip the height-collapse animation.
  // Left on afterwards it makes this div a scroll container, which traps any
  // sticky descendant (nested folder headers) inside it instead of letting
  // them pin to the panel — so drop it once the node has settled open.
  const [animating, setAnimating] = useState(animateExpand);

  return (
    <AnimatePresence>
      {hasChildren && isExpanded && (
        <motion.div
          animate={{ height: "auto", opacity: 1 }}
          className={animating ? "overflow-hidden" : undefined}
          exit={{ height: 0, opacity: 0 }}
          initial={{ height: 0, opacity: 0 }}
          onAnimationComplete={() => setAnimating(false)}
          onAnimationStart={() => setAnimating(true)}
          transition={{
            duration: animateExpand ? 0.15 : 0,
            ease: "easeInOut",
          }}
        >
          <motion.div
            animate={{ y: 0 }}
            className={className}
            exit={{ y: -10 }}
            initial={{ y: -10 }}
            transition={{
              duration: animateExpand ? 0.1 : 0,
              delay: animateExpand ? 0.05 : 0,
            }}
            // A lingering `transform` (even translateY(0)) also creates a
            // containing block that traps sticky descendants, so clear it
            // once the slide-in has settled.
            style={animating ? undefined : { transform: "none" }}
            {...props}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export interface TreeExpanderProps extends HTMLMotionProps<"div"> {
  hasChildren?: boolean;
}

export const TreeExpander = ({
  hasChildren = false,
  className,
  onClick,
  ...props
}: TreeExpanderProps) => {
  const { expandedIds, toggleExpanded } = useTree();
  const { nodeId } = useTreeNode();
  const isExpanded = expandedIds.has(nodeId);

  if (!hasChildren) {
    return <div className="me-1 h-4 w-4" />;
  }

  return (
    <motion.div
      animate={{ rotate: isExpanded ? 90 : 0 }}
      className={cn(
        "me-1 flex h-4 w-4 cursor-pointer items-center justify-center",
        className
      )}
      onClick={(e) => {
        e.stopPropagation();
        toggleExpanded(nodeId);
        onClick?.(e);
      }}
      transition={{ duration: 0.1, ease: "easeInOut" }}
      {...props}
    >
      <ChevronRight className="h-3 w-3 text-muted-foreground" />
    </motion.div>
  );
};

export interface TreeIconProps extends HTMLMotionProps<"div"> {
  icon?: ReactNode;
  hasChildren?: boolean;
}

export const TreeIcon = ({
  icon,
  hasChildren = false,
  className,
  ...props
}: TreeIconProps) => {
  const { showIcons, expandedIds } = useTree();
  const { nodeId } = useTreeNode();
  const isExpanded = expandedIds.has(nodeId);

  if (!showIcons) {
    return null;
  }

  const getDefaultIcon = () =>
    hasChildren ? (
      isExpanded ? (
        <FolderOpen className="h-4 w-4" />
      ) : (
        <Folder className="h-4 w-4" />
      )
    ) : (
      <File className="h-4 w-4" />
    );

  return (
    <motion.div
      className={cn(
        "me-2 flex h-4 w-4 items-center justify-center text-muted-foreground",
        className
      )}
      transition={{ duration: 0.15 }}
      whileHover={{ scale: 1.1 }}
      {...props}
    >
      {icon || getDefaultIcon()}
    </motion.div>
  );
};

export const TreeLabel = ({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) => (
  <span className={cn("font flex-1 truncate text-sm", className)} {...props} />
);
