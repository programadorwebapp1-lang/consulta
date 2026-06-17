export type SwalOptions = {
  title?: string;
  text?: string;
  icon?: "success" | "error" | "warning" | "info" | "question";
  confirmButtonText?: string;
  cancelButtonText?: string;
  showCancelButton?: boolean;
  reverseButtons?: boolean;
  showDenyButton?: boolean;
  denyButtonText?: string;
  html?: string;
};

export async function fireSwal(options: SwalOptions) {
  const Swal = (await import("sweetalert2")).default;
  return Swal.fire({
    confirmButtonColor: "#0ea5e9",
    cancelButtonColor: "#e2e8f0",
    ...options,
  });
}
