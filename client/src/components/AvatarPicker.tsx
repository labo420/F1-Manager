import { useState, useRef } from "react";
import { Camera, Check, Upload, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const USER_PRESET_SEEDS = [
  "Verstappen", "Norris", "Leclerc", "Hamilton", "Russell",
  "Alonso", "Sainz", "Piastri", "Stroll", "Albon",
  "Gasly", "Bearman", "Lawson", "Antonelli", "Hulkenberg",
  "Bottas", "Perez", "Ocon", "Colapinto", "Hadjar",
];

const LOBBY_PRESET_SEEDS = [
  "Ferrari", "Mercedes", "RedBull", "McLaren", "Alpine",
  "AstonMartin", "Williams", "Haas", "AlphaTauri", "Sauber",
  "Cadillac", "Paddock", "GrandPrix", "Championship", "Fantasy",
];

function getUserAvatarUrl(seed: string) {
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(seed)}&backgroundColor=1a1a2e,0d1117,161b22`;
}

function getLobbyAvatarUrl(seed: string) {
  return `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(seed)}&backgroundColor=1a1a2e,0d1117,161b22`;
}

async function compressImage(file: File, maxPx = 200, quality = 0.8): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(maxPx / img.width, maxPx / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(new File([blob], "avatar.jpg", { type: "image/jpeg" }));
          else resolve(file);
        },
        "image/jpeg",
        quality
      );
    };
    img.src = URL.createObjectURL(file);
  });
}

interface AvatarPickerProps {
  type: "user" | "lobby";
  currentUrl?: string | null;
  onSelectPreset: (url: string) => void;
  onUploadFile: (file: File) => void;
  isLoading?: boolean;
  onClose: () => void;
}

export function AvatarPicker({ type, currentUrl, onSelectPreset, onUploadFile, isLoading, onClose }: AvatarPickerProps) {
  const [tab, setTab] = useState<"preset" | "upload">("preset");
  const [selected, setSelected] = useState<string | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const seeds = type === "user" ? USER_PRESET_SEEDS : LOBBY_PRESET_SEEDS;
  const getUrl = type === "user" ? getUserAvatarUrl : getLobbyAvatarUrl;

  const handlePresetClick = (seed: string) => {
    const url = getUrl(seed);
    setSelected(url);
    onSelectPreset(url);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file);
    setUploadFile(compressed);
    const reader = new FileReader();
    reader.onload = () => setUploadPreview(reader.result as string);
    reader.readAsDataURL(compressed);
  };

  const handleUploadConfirm = () => {
    if (uploadFile) onUploadFile(uploadFile);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h3 className="font-display font-bold text-white uppercase tracking-wide text-sm">
            {type === "user" ? "Change Avatar" : "League Image"}
          </h3>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex border-b border-white/10">
          {(["preset", "upload"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all ${
                tab === t ? "text-white border-b-2 border-primary" : "text-white/40 hover:text-white"
              }`}
            >
              {t === "preset" ? "Avatar Presets" : "Upload Photo"}
            </button>
          ))}
        </div>

        <div className="p-4">
          {tab === "preset" && (
            <div>
              <p className="text-[10px] text-white/30 font-medium uppercase tracking-widest mb-3">Select an avatar</p>
              <div className="grid grid-cols-5 gap-2 max-h-64 overflow-y-auto pr-1">
                {seeds.map((seed) => {
                  const url = getUrl(seed);
                  const isActive = selected === url || (!selected && currentUrl === url);
                  return (
                    <button
                      key={seed}
                      onClick={() => handlePresetClick(seed)}
                      data-testid={`avatar-preset-${seed}`}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all hover:scale-105 ${
                        isActive ? "border-primary shadow-lg shadow-primary/30" : "border-white/10 hover:border-white/30"
                      }`}
                    >
                      <img
                        src={url}
                        alt={seed}
                        className="w-full h-full object-cover bg-zinc-800"
                        loading="lazy"
                      />
                      {isActive && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              {selected && (
                <p className="text-[10px] text-green-400 font-medium mt-3 text-center">Avatar updated!</p>
              )}
            </div>
          )}

          {tab === "upload" && (
            <div className="space-y-4">
              <p className="text-[10px] text-white/30 font-medium uppercase tracking-widest">Upload a custom image (max 2MB). It will be compressed automatically.</p>

              {uploadPreview ? (
                <div className="flex flex-col items-center gap-4">
                  <img
                    src={uploadPreview}
                    alt="Preview"
                    className="w-24 h-24 rounded-full object-cover border-2 border-white/20"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setUploadPreview(null); setUploadFile(null); }}
                      className="px-4 py-2 rounded-lg border border-white/10 text-white/50 text-xs font-medium hover:text-white transition-colors"
                    >
                      Change
                    </button>
                    <button
                      onClick={handleUploadConfirm}
                      disabled={isLoading}
                      data-testid="button-confirm-upload"
                      className="px-6 py-2 rounded-lg bg-primary text-white text-xs font-semibold uppercase tracking-wide hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {isLoading ? <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> : <Upload className="w-3 h-3" />}
                      Confirm
                    </button>
                  </div>
                </div>
              ) : (
                <label
                  data-testid="label-upload-file"
                  className="flex flex-col items-center justify-center gap-3 h-32 border-2 border-dashed border-white/15 rounded-xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
                >
                  <Camera className="w-8 h-8 text-white/20" />
                  <span className="text-xs text-white/40 font-medium">Click to select a photo</span>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                    data-testid="input-avatar-file"
                  />
                </label>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
