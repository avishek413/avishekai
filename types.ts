export interface EditedImageResult {
  imageUrl: string;
  text?: string;
  // Fix: Added optional prompt property to track the prompt used for each edit.
  prompt?: string;
}

export interface UploadedImage {
  dataUrl: string;
  mimeType: string;
}