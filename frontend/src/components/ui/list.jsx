import { DndContext, DragOverlay, rectIntersection, useDraggable, useDroppable } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import { cn } from "@/lib/utils"

export const ListItems = ({
  children,
  className
}) => (
  <div className={cn("flex flex-1 flex-col gap-2 p-3", className)}>{children}</div>
)

export const ListHeader = (props) =>
  "children" in props ? (
    props.children
  ) : (
    <div
      className={cn("flex shrink-0 items-center gap-2 bg-foreground/5 p-3", props.className)}>
      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: props.color }} />
      <p className="m-0 font-semibold text-sm">{props.name}</p>
    </div>
  )

export const ListGroup = ({
  id,
  children,
  className
}) => {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      className={cn("bg-secondary transition-colors", isOver && "bg-foreground/10", className)}
      ref={setNodeRef}>
      {children}
    </div>
  );
}

export const ListItem = ({
  id,
  name,
  index,
  parent,
  children,
  className
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data: { index, parent },
  })

  return (
    <div
      className={cn(
        "flex cursor-grab items-center gap-2 rounded-md border bg-background p-2 shadow-sm",
        isDragging && "opacity-50",
        className
      )}
      style={{
        transform: transform ? `translateX(${transform.x}px) translateY(${transform.y}px)` : "none",
      }}
      {...listeners}
      {...attributes}
      ref={setNodeRef}>
      {children ?? <p className="m-0 font-medium text-sm">{name}</p>}
    </div>
  );
}

export const ListProvider = ({
  children,
  onDragEnd,
  className
}) => (
  <DndContext
    collisionDetection={rectIntersection}
    modifiers={[restrictToVerticalAxis]}
    onDragEnd={onDragEnd}>
    <div className={cn("flex size-full flex-col", className)}>{children}</div>
  </DndContext>
)
