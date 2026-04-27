import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, X, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FileUploadProps {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
  folder?: string;
  accept?: string;
}

export default function FileUpload({ label, value, onChange, folder = "general", accept = ".pdf,.doc,.docx,.jpg,.jpeg,.png" }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const upload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("attachments").upload(path, file);
    if (error) {
      toast({ title: "Erreur upload", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("attachments").getPublicUrl(path);
    onChange(publicUrl);
    setUploading(false);
  };

  const fileName = value ? decodeURIComponent(value.split("/").pop() ?? "") : null;

  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      {value ? (
        <div className="flex items-center gap-2 p-2 rounded-lg glass-subtle">
          <FileText className="w-4 h-4 text-info shrink-0" />
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-xs text-info truncate flex-1 hover:underline">{fileName}</a>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onChange(null)}><X className="w-3 h-3" /></Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}
          className="w-full rounded-xl border-dashed border-border/50 text-muted-foreground text-xs h-9">
          <Paperclip className="w-3 h-3 mr-1" />
          {uploading ? "Envoi..." : "Joindre un fichier"}
        </Button>
      )}
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={e => { if (e.target.files?.[0]) upload(e.target.files[0]); e.target.value = ""; }} />
    </div>
  );
}
