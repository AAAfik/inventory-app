// ═══════════════════════════════════════════════════════════════════
// imageUtils.js — فشرده‌سازی عکس + آپلود به Supabase Storage
// ═══════════════════════════════════════════════════════════════════
// هدف: عکس‌های موبایل (3-5MB) → فایل‌های ~70KB
//   - resize تا max 720px (هر بُعد)
//   - JPEG quality 0.65
//   - EXIF خودکار حذف می‌شه (drawImage در canvas)

import { supabase } from "../../supabase";

const BUCKET = "pool-evidence";

// ───────────────────────────────────────────────────────────────────
// فشرده‌سازی یه فایل عکس
// خروجی: Blob (image/jpeg)
// ───────────────────────────────────────────────────────────────────
export async function compressImage(file, maxDim = 720, quality = 0.65) {
  if (!file) throw new Error("No file provided");
  if (!file.type || !file.type.startsWith("image/")) {
    throw new Error("File is not an image");
  }

  const img = await loadImage(file);
  const { width, height } = scaleDown(img.width, img.height, maxDim);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  // پس‌زمینه‌ی سفید برای PNG‌های شفاف
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob returned null"));
      },
      "image/jpeg",
      quality
    );
  });
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { resolve(img); URL.revokeObjectURL(url); };
    img.onerror = () => { reject(new Error("Failed to load image")); URL.revokeObjectURL(url); };
    img.src = url;
  });
}

function scaleDown(w, h, maxDim) {
  if (w <= maxDim && h <= maxDim) return { width: w, height: h };
  if (w >= h) {
    return { width: maxDim, height: Math.round((h * maxDim) / w) };
  }
  return { width: Math.round((w * maxDim) / h), height: maxDim };
}

// ───────────────────────────────────────────────────────────────────
// آپلود عکس فشرده‌شده به Supabase Storage
// kind: "withdrawal" یا "consumption"
// خروجی: مسیر فایل (برای ذخیره در DB)
// ───────────────────────────────────────────────────────────────────
export async function uploadPoolPhoto(blob, { poolId, kind }) {
  if (!blob) throw new Error("No blob to upload");
  if (!poolId) throw new Error("poolId required");
  if (!["withdrawal", "consumption"].includes(kind)) {
    throw new Error("kind must be withdrawal or consumption");
  }

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  // اسم فایل با timestamp + random تا collision نشه
  const stamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 7);
  const filename = `${stamp}_${rand}_${kind}.jpg`;
  const path = `${yyyy}/${mm}/pool_${poolId}/${filename}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, {
      contentType: "image/jpeg",
      cacheControl: "3600",
      upsert: false,
    });

  if (error) throw error;
  return path;
}

// ───────────────────────────────────────────────────────────────────
// گرفتن URL امضاشده برای نمایش (private bucketه)
// ttlSec: مدت اعتبار لینک (پیش‌فرض ۱ ساعت)
// ───────────────────────────────────────────────────────────────────
export async function getPoolPhotoUrl(path, ttlSec = 3600) {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, ttlSec);
  if (error) {
    console.error("Failed to get signed URL:", error);
    return null;
  }
  return data?.signedUrl || null;
}

// ───────────────────────────────────────────────────────────────────
// حذف یه عکس (برای retention/cleanup — فقط ادمین)
// ───────────────────────────────────────────────────────────────────
export async function deletePoolPhoto(path) {
  if (!path) return;
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}
