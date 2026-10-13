import { serializeJsonLd } from "@/lib/jsonLd";

type JsonLdScriptsProps = {
  scripts: Record<string, unknown>[];
};

export default function JsonLdScripts({ scripts }: JsonLdScriptsProps) {
  return (
    <>
      {scripts.map((script, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(script) }}
        />
      ))}
    </>
  );
}
