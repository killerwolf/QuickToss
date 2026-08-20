// react-pdf v6 ships no type definitions and there is no @types package for it.
// Rather than `declare module "react-pdf"` (which would make the whole library
// `any`), this describes the surface we actually use, so our own usage stays
// type-checked.
declare module "react-pdf" {
  import type { ComponentType, ReactNode } from "react";

  export interface DocumentProps {
    file: ArrayBuffer | string | { data: ArrayBuffer };
    onLoadSuccess?: (pdf: { numPages: number }) => void;
    onLoadError?: (error: Error) => void;
    className?: string;
    children?: ReactNode;
  }

  export interface PageProps {
    pageNumber: number;
    width?: number;
    className?: string;
  }

  export const Document: ComponentType<DocumentProps>;
  export const Page: ComponentType<PageProps>;
  export const pdfjs: {
    version: string;
    GlobalWorkerOptions: { workerSrc: string };
  };
}
