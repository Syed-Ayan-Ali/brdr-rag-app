import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export function buildDownloadLink(docId: string) {
  // example https://brdr.hkma.gov.hk/eng/doc-ldg/docId/getPdf/20250716-2-EN/20250716-2-EN.pdf
  return `https://brdr.hkma.gov.hk/eng/doc-ldg/docId/getPdf/${docId}/${docId}.pdf`;
}
