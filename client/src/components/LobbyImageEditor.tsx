import { useState } from "react";
import { Camera, X } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { AvatarPicker } from "./AvatarPicker";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface LobbyImageEditorProps {
  lobbyId: number;
  currentUrl?: string | null;
  lobbyName: string;
}

function getInitials(text: string): string {
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function LobbyImageEditor({ lobbyId, currentUrl, lobbyName }: LobbyImageEditorProps) {
  const [showPicker, setShowPicker] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateImageMutation = useMutation({
    mutationFn: async (url: string) => {
      const res = await fetch(`/api/lobby/${lobbyId}/image`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update image");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      queryClient.invalidateQueries({ queryKey: [`/api/lobby/${lobbyId}`] });
      toast({ title: "League image updated", description: "Your league image has been changed." });
      setShowPicker(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Could not update league image.", variant: "destructive" });
    },
  });

  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch(`/api/lobby/${lobbyId}/image/upload`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to upload image");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      queryClient.invalidateQueries({ queryKey: [`/api/lobby/${lobbyId}`] });
      toast({ title: "League image updated", description: "Your league image has been uploaded." });
      setShowPicker(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Could not upload image.", variant: "destructive" });
    },
  });

  const initials = getInitials(lobbyName);
  const isLoading = updateImageMutation.isPending || uploadImageMutation.isPending;

  return (
    <>
      <button
        onClick={() => setShowPicker(true)}
        className="relative w-16 h-16 rounded-2xl border border-white/10 shadow-xl shrink-0 transition-all hover:border-white/30 group overflow-hidden"
      >
        {currentUrl ? (
          <>
            <img src={currentUrl} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="w-5 h-5 text-white" />
            </div>
          </>
        ) : (
          <>
            <div className="w-full h-full bg-white/5 flex items-center justify-center">
              <span className="text-sm font-black text-white/40">{initials}</span>
            </div>
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="w-5 h-5 text-white" />
            </div>
          </>
        )}
      </button>

      <AnimatePresence>
        {showPicker && (
          <AvatarPicker
            type="lobby"
            currentUrl={currentUrl}
            onSelectPreset={(url) => updateImageMutation.mutate(url)}
            onUploadFile={(file) => uploadImageMutation.mutate(file)}
            isLoading={isLoading}
            onClose={() => setShowPicker(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
