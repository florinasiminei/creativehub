"use client";

import Link from "next/link";
import { WhatsAppButtonProps } from "@/lib/types";

export default function WhatsAppButton({
  phone,
  message = "Bună! Sunt interesat de proprietate.",
}: WhatsAppButtonProps) {
  const href = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-[#25D366] text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition"
      aria-label="Contactează pe WhatsApp"
    >
      <svg width="22" height="22" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          fill="#fff"
          d="M19.11 17.51c-.26-.13-1.53-.76-1.77-.85-.24-.09-.42-.13-.6.13-.18.26-.69.85-.84 1.03-.15.18-.31.2-.57.07-.26-.13-1.08-.4-2.06-1.29-.76-.68-1.27-1.52-1.42-1.77-.15-.26-.02-.4.11-.52.12-.12.26-.31.39-.46.13-.15.17-.26.26-.44.09-.18.04-.33-.02-.46-.06-.13-.6-1.45-.82-1.99-.22-.53-.45-.46-.6-.46-.15 0-.33-.02-.51-.02-.18 0-.46.07-.7.33-.24.26-.92.9-.92 2.2 0 1.29.95 2.54 1.08 2.71.13.18 1.86 2.84 4.49 3.98.63.27 1.12.43 1.5.55.63.2 1.2.17 1.65.1.5-.07 1.53-.62 1.75-1.22.22-.6.22-1.11.15-1.22-.07-.11-.24-.18-.5-.31z"
        />
        <path
          fill="#fff"
          d="M26.6 5.42C24.2 3.02 21.2 1.73 18 1.73 10.83 1.73 5 7.56 5 14.73c0 2.3.61 4.53 1.77 6.49L5 30.27l9.25-1.74c1.88 1.03 4 1.57 6.15 1.57h.01c7.17 0 13-5.83 13-13 0-3.2-1.29-6.2-3.69-8.6zM20.41 27.1h-.01c-1.96 0-3.89-.53-5.57-1.54l-.4-.24-5.49 1.03 1.04-5.36-.26-.44C8.1 18.79 7.5 16.8 7.5 14.73c0-5.78 4.71-10.48 10.49-10.48 2.8 0 5.42 1.09 7.39 3.06 1.97 1.97 3.06 4.59 3.06 7.39 0 5.78-4.71 10.49-10.49 10.49z"
        />
      </svg>
      <span className="text-sm font-semibold">WhatsApp</span>
    </Link>
  );
}
