import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCreateTask, useUpdateTask, useDeleteTask } from "@/hooks/useTasks";
import { logActivity } from "@/lib/logActivity";
import { format, isToday, isBefore, isAfter, startOfDay, differenceInDays, formatDistanceToNow } from "date-fns";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Task, Contact, Deal } from "@/types/database";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Search, Pencil, Trash2, CalendarIcon, Check, ChevronDown, ChevronRight, CheckSquare } from "lucide-react";

// ── Constants ──
const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  low: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
};

const STATUS_FILTERS = ["all", "pending", "in_progress", "completed"] as const;
const STATUS_LABELS: Record<string, string> = { all: "All", pending: "Pending", in_progress: "In Progress", completed: "Completed" };

// ── Lookups ──
function useAllContacts() {
  return useQuery({
    queryKey: ["contacts", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contacts").select("id, first_name, last_name").order("first_name");
      if (error) throw error;
      return data as Pick<Contact, "id" | "first_name" | "last_name">[];
    },
  });
}

function useAllDeals() {
  return useQuery({
    queryKey: ["deals", "all-titles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("deals").select("id, title").order("title");
      if (error) throw error;
      return data as Pick<Deal, "id" | "title">[];
    },
  });
}

function useAllTasks() {
  return useQuery({
    queryKey: ["tasks", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").order("due_date", { ascending: true });
      if (error) throw error;
      return data as Task[];
    },
  });
}

// ── Relative date ──
function relativeDue(dateStr: string): string {
  const due = startOfDay(new Date(dateStr));
  const today = startOfDay(new Date());
  const diff = differenceInDays(due, today);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "1 day overdue";
  if (diff < 0) return `${Math.abs(diff)} days overdue`;
  return `In ${diff} days`;
}



// ── Schema ──
const taskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Max 200 characters"),
  description: z.string().max(2000, "Max 2000 characters").optional().or(z.literal("")),
  due_date: z.date().optional().nullable(),
  priority: z.string().optional(),
  status: z.string().optional(),
  contact_id: z.string().optional().or(z.literal("")),
  deal_id: z.string().optional().or(z.literal("")),
});
type TaskFormValues = z.infer<typeof taskSchema>;

// ── Form Dialog ──
function TaskFormDialog({ open, onOpenChange, task }: { open: boolean; onOpenChange: (o: boolean) => void; task: Task | null }) {
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const { data: contacts } = useAllContacts();
  const { data: deals } = useAllDeals();
  const isEdit = !!task;

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title ?? "",
      description: task?.description ?? "",
      due_date: task?.due_date ? new Date(task.due_date) : null,
      priority: task?.priority ?? "medium",
      status: task?.status ?? "pending",
      contact_id: task?.contact_id ?? "",
      deal_id: task?.deal_id ?? "",
    },
  });

  const onSubmit = async (values: TaskFormValues) => {
    try {
      const payload = {
        title: values.title,
        description: (values.description as string) || null,
        due_date: values.due_date ? values.due_date.toISOString() : null,
        priority: values.priority || null,
        status: values.status || null,
        contact_id: (values.contact_id as string) || null,
        deal_id: (values.deal_id as string) || null,
      };
      if (isEdit) {
        await updateTask.mutateAsync({ id: task.id, ...payload });
        toast.success("Task updated");
      } else {
        await createTask.mutateAsync(payload);
        toast.success("Task created");
      }
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Something went wrong");
    }
  };

  const contactItems = (contacts ?? []).map((c) => ({ value: c.id, label: `${c.first_name} ${c.last_name}` }));
  const dealItems = (deals ?? []).map((d) => ({ value: d.id, label: d.title }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto w-full">
        <DialogHeader><DialogTitle>{isEdit ? "Edit Task" : "Add Task"}</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem><FormLabel>Title *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="due_date" render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>Due Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value ?? undefined} onSelect={field.onChange} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                <FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="priority" render={({ field }) => (
                <FormItem><FormLabel>Priority</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                <FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem><FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              <FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="contact_id" render={({ field }) => (
              <FormItem><FormLabel>Contact</FormLabel><FormControl>
                <SearchableSelect options={contactItems} value={field.value ?? ""} onValueChange={field.onChange} placeholder="Select contact" searchPlaceholder="Search contacts…" />
              </FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="deal_id" render={({ field }) => (
              <FormItem><FormLabel>Deal</FormLabel><FormControl>
                <SearchableSelect options={dealItems} value={field.value ?? ""} onValueChange={field.onChange} placeholder="Select deal" searchPlaceholder="Search deals…" />
              </FormControl><FormMessage /></FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={createTask.isPending || updateTask.isPending}>{isEdit ? "Save" : "Create"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Task Group Section ──
function TaskGroup({
  title, accent, tasks, contactMap, dealMap, defaultOpen, onToggle, onEdit, onDelete,
}: {
  title: string;
  accent: string;
  tasks: Task[];
  contactMap: Map<string, string>;
  dealMap: Map<string, string>;
  defaultOpen: boolean;
  onToggle: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (tasks.length === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button className={cn("w-full flex items-center gap-2 px-4 py-2.5 rounded-lg border-l-4 bg-muted/40 hover:bg-muted/60 transition-colors text-left", accent)}>
          {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
          <span className="font-semibold text-sm">{title}</span>
          <Badge variant="secondary" className="text-xs ml-auto">{tasks.length}</Badge>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-1 mt-1">
          {tasks.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-4 py-2.5 rounded-md hover:bg-muted/30 transition-colors group">
              <Checkbox
                checked={t.status === "completed"}
                onCheckedChange={() => onToggle(t)}
                className="shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium truncate", t.status === "completed" && "line-through text-muted-foreground")}>{t.title}</p>
                <div className="flex items-center gap-2 flex-wrap mt-0.5">
                  {t.due_date && (
                    <span className="text-xs text-muted-foreground">{relativeDue(t.due_date)}</span>
                  )}
                  {t.contact_id && contactMap.has(t.contact_id) && (
                    <span className="text-xs text-muted-foreground">• {contactMap.get(t.contact_id)}</span>
                  )}
                  {t.deal_id && dealMap.has(t.deal_id) && (
                    <span className="text-xs text-muted-foreground">• {dealMap.get(t.deal_id)}</span>
                  )}
                </div>
              </div>
              {t.priority && (
                <Badge className={cn("text-xs shrink-0", PRIORITY_COLORS[t.priority])} variant="outline">
                  {t.priority}
                </Badge>
              )}
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(t.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ── Main ──
export default function TasksPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: tasks, isLoading } = useAllTasks();
  const { data: contacts } = useAllContacts();
  const { data: deals } = useAllDeals();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const contactMap = useMemo(() => new Map((contacts ?? []).map((c) => [c.id, `${c.first_name} ${c.last_name}`])), [contacts]);
  const dealMap = useMemo(() => new Map((deals ?? []).map((d) => [d.id, d.title])), [deals]);

  const filtered = useMemo(() => {
    let list = tasks ?? [];
    if (statusFilter !== "all") list = list.filter((t) => t.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.title.toLowerCase().includes(q));
    }
    return list;
  }, [tasks, statusFilter, search]);

  const { overdue, dueToday, upcoming, completed } = useMemo(() => {
    const today = startOfDay(new Date());
    const overdue: Task[] = [];
    const dueToday: Task[] = [];
    const upcoming: Task[] = [];
    const completed: Task[] = [];

    filtered.forEach((t) => {
      if (t.status === "completed") {
        completed.push(t);
        return;
      }
      if (!t.due_date) {
        upcoming.push(t);
        return;
      }
      const due = startOfDay(new Date(t.due_date));
      if (isBefore(due, today)) overdue.push(t);
      else if (isToday(due)) dueToday.push(t);
      else upcoming.push(t);
    });

    return { overdue, dueToday, upcoming, completed };
  }, [filtered]);

  const handleToggle = async (task: Task) => {
    const newStatus = task.status === "completed" ? "pending" : "completed";
    try {
      await updateTask.mutateAsync({ id: task.id, status: newStatus });
      if (newStatus === "completed") {
        await logActivity("note", `Task completed: ${task.title}`, task.contact_id, task.deal_id);
      }
      toast.success(newStatus === "completed" ? "Task completed" : "Task reopened");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to update");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteTask.mutateAsync(deleteId);
      toast.success("Task deleted");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to delete");
    }
    setDeleteId(null);
  };

  const openEdit = (t: Task) => { setEditingTask(t); setDialogOpen(true); };
  const openAdd = () => { setEditingTask(null); setDialogOpen(true); };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search tasks…" className="pl-9 w-56" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button onClick={openAdd}><Plus className="h-4 w-4 mr-1" />Add Task</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <Button key={f} variant={statusFilter === f ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(f)}>
            {STATUS_LABELS[f]}
          </Button>
        ))}
      </div>

      {/* Groups */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
        </div>
      ) : (
        <div className="space-y-3">
          <TaskGroup title="Overdue" accent="border-l-red-500" tasks={overdue} contactMap={contactMap} dealMap={dealMap} defaultOpen onToggle={handleToggle} onEdit={openEdit} onDelete={(id) => setDeleteId(id)} />
          <TaskGroup title="Due Today" accent="border-l-yellow-500" tasks={dueToday} contactMap={contactMap} dealMap={dealMap} defaultOpen onToggle={handleToggle} onEdit={openEdit} onDelete={(id) => setDeleteId(id)} />
          <TaskGroup title="Upcoming" accent="border-l-blue-500" tasks={upcoming} contactMap={contactMap} dealMap={dealMap} defaultOpen onToggle={handleToggle} onEdit={openEdit} onDelete={(id) => setDeleteId(id)} />
          <TaskGroup title="Completed" accent="border-l-emerald-500" tasks={completed} contactMap={contactMap} dealMap={dealMap} defaultOpen={false} onToggle={handleToggle} onEdit={openEdit} onDelete={(id) => setDeleteId(id)} />
          {filtered.length === 0 && (
            <div className="text-center text-muted-foreground py-12">
              <CheckSquare className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="font-medium">No tasks yet</p>
              <p className="text-sm mt-1">Create your first task to stay organized!</p>
            </div>
          )}
        </div>
      )}

      {dialogOpen && <TaskFormDialog open={dialogOpen} onOpenChange={setDialogOpen} task={editingTask} />}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. Are you sure?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
