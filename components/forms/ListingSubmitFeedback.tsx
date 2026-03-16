import FormMessage from "./FormMessage";

type FailedUpload = {
  name: string;
  reason: string;
};

type ListingSubmitFeedbackProps = {
  message: string | null;
  tone?: "error" | "success" | "info";
  failedUploads?: FailedUpload[];
};

export default function ListingSubmitFeedback({
  message,
  tone = "error",
  failedUploads = [],
}: ListingSubmitFeedbackProps) {
  if (!message) return null;

  return (
    <FormMessage variant={tone} role="status" aria-live="polite">
      <div className="font-semibold">{message}</div>
      {failedUploads.length > 0 && (
        <ul className="mt-2 space-y-1">
          {failedUploads.map((file, index) => (
            <li key={`${file.name}-${index}`} className="flex items-start gap-2">
              <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-red-500" />
              <span>
                <span className="font-medium">{file.name}</span>
                {file.reason ? ` - ${file.reason === "file_too_large" ? "fisier prea mare" : file.reason}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </FormMessage>
  );
}
