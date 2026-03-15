import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useLocation } from "wouter";
import type { Contact } from "@/types/database";
import { useUpdateContact } from "@/hooks/useContacts";
import { useCompanies } from "@/hooks/useCompanies";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import ActivityTimeline from "@/components/ActivityTimeline";
import EmailHistory from "@/components/EmailHistory";
import { toast } from "sonner";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Mail, Phone, Building2, Briefcase, User,
  Pencil, X, Save, Loader2, Clock,
} from "lucide-react";

const STATUS_OPTIONS = ["lead", "prospect", "customer", "inactive"];

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="mt-0.5 text-muted-foreground shrink-0">{icon}</span>
      <div className="min-w-0">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="text-foreground break-words">{value}</div>
      </div>
    </div>
  );
}

function EditRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="mt-1.5 text-muted-foreground shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="mt-1">{children}</div>
      </div>
    </div>
  );
}

export default function ContactDetailSheet({
  contact,
  open,
  onOpenChange,
  onContactUpdated,
}: {
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContactUpdated?: () => void;
}) {
  const [, navigate] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Contact>>({});
  const updateContact = useUpdateContact();
  const { data: companiesData } = useCompanies({ limit: 200 });

  useEffect(() => {
    if (!open) setIsEditing(false);
  }, [open]);

  if (!contact) return null;

  const companyOptions = (companiesData?.data ?? []).map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const startEditing = () => {
    setEditData({ ...contact });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setEditData({});
    setIsEditing(false);
  };

  const set = (field: keyof Contact, value: string | null) =>
    setEditData((prev) => ({ ...prev, [field]: value }));

  const handleCompanyChange = (companyId: string) => {
    if (!companyId) {
      setEditData((prev) => ({ ...prev, company_id: null, company: null }));
      return;
    }
    const selected = companiesData?.data?.find((c) => c.id === companyId);
    setEditData((prev) => ({
      ...prev,
      company_id: companyId,
      company: selected?.name ?? prev.company,
    }));
  };

  const handleSave = async () => {
    try {
      await updateContact.mutateAsync({
        id: contact.id,
        first_name: editData.first_name ?? contact.first_name,
        last_name: editData.last_name ?? contact.last_name,
        email: editData.email,
        phone: editData.phone,
        company: editData.company,
        company_id: editData.company_id,
        job_title: editData.job_title,
        status: editData.status,
        notes: editData.notes,
      });
      toast.success("Contact updated successfully");
      setIsEditing(false);
      onContactUpdated?.();
    } catch {
      toast.error("Failed to update contact");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[440px] sm:max-w-[440px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between pr-8">
            {isEditing ? (
              <div className="flex gap-2 flex-1">
                <Input
                  value={editData.first_name ?? ""}
                  onChange={(e) => set("first_name", e.target.value)}
                  placeholder="First name"
                  className="font-semibold"
                />
                <Input
                  value={editData.last_name ?? ""}
                  onChange={(e) => set("last_name", e.target.value)}
                  placeholder="Last name"
                  className="font-semibold"
                />
              </div>
            ) : (
              <SheetTitle>{contact.first_name} {contact.last_name}</SheetTitle>
            )}
            {!isEditing ? (
              <Button variant="ghost" size="icon" onClick={startEditing}>
                <Pencil className="h-4 w-4" />
              </Button>
            ) : (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={cancelEditing} disabled={updateContact.isPending}>
                  <X className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleSave} disabled={updateContact.isPending}>
                  {updateContact.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Status */}
          {isEditing ? (
            <EditRow icon={<User className="h-4 w-4" />} label="Status">
              <Select value={editData.status ?? "lead"} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </EditRow>
          ) : (
            contact.status && <Badge variant="secondary">{contact.status}</Badge>
          )}

          <div className="space-y-3">
            {/* Email */}
            {isEditing ? (
              <EditRow icon={<Mail className="h-4 w-4" />} label="Email">
                <Input type="email" value={editData.email ?? ""} onChange={(e) => set("email", e.target.value)} placeholder="Email" />
              </EditRow>
            ) : (
              <InfoRow
                icon={<Mail className="h-4 w-4" />}
                label="Email"
                value={contact.email ? <a href={`mailto:${contact.email}`} className="text-primary hover:underline">{contact.email}</a> : null}
              />
            )}

            {/* Phone */}
            {isEditing ? (
              <EditRow icon={<Phone className="h-4 w-4" />} label="Phone">
                <Input value={editData.phone ?? ""} onChange={(e) => set("phone", e.target.value)} placeholder="Phone" />
              </EditRow>
            ) : (
              <InfoRow icon={<Phone className="h-4 w-4" />} label="Phone" value={contact.phone} />
            )}

            {/* Company */}
            {isEditing ? (
              <EditRow icon={<Building2 className="h-4 w-4" />} label="Company">
                <SearchableSelect
                  options={companyOptions}
                  value={editData.company_id ?? ""}
                  onValueChange={handleCompanyChange}
                  placeholder="Select company…"
                  searchPlaceholder="Search companies…"
                />
              </EditRow>
            ) : (
              <InfoRow
                icon={<Building2 className="h-4 w-4" />}
                label="Company"
                value={contact.company ? (
                  contact.company_id ? (
                    <button
                      onClick={() => { onOpenChange(false); navigate("/companies"); }}
                      className="text-primary hover:underline"
                    >
                      {contact.company}
                    </button>
                  ) : contact.company
                ) : null}
              />
            )}

            {/* Job Title */}
            {isEditing ? (
              <EditRow icon={<Briefcase className="h-4 w-4" />} label="Job Title">
                <Input value={editData.job_title ?? ""} onChange={(e) => set("job_title", e.target.value)} placeholder="Job title" />
              </EditRow>
            ) : (
              <InfoRow icon={<Briefcase className="h-4 w-4" />} label="Job Title" value={contact.job_title} />
            )}
          </div>

          {/* Notes */}
          {isEditing ? (
            <>
              <Separator />
              <Textarea
                value={editData.notes ?? ""}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Notes"
                rows={4}
              />
            </>
          ) : contact.notes ? (
            <>
              <Separator />
              <p className="text-sm text-muted-foreground bg-muted rounded-md p-3">{contact.notes}</p>
            </>
          ) : null}
        </div>

        <Separator className="my-6" />

        <Tabs defaultValue="activity">
          <TabsList className="w-full">
            <TabsTrigger value="activity" className="flex-1">Activity</TabsTrigger>
            <TabsTrigger value="emails" className="flex-1">Emails</TabsTrigger>
          </TabsList>
          <TabsContent value="activity">
            <ActivityTimeline entityType="contact" entityId={contact.id} />
          </TabsContent>
          <TabsContent value="emails">
            <EmailHistory contactId={contact.id} />
          </TabsContent>
        </Tabs>

        {contact.created_at && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-4">
            <Clock className="h-3 w-3" />
            Created {format(new Date(contact.created_at), "MMM d, yyyy 'at' h:mm a")}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
