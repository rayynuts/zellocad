import { ExternalLink, FileText, Folder, Link2 } from "lucide-react";
import { addResourceDoc, deleteResourceDoc, saveApplicationLink } from "@/lib/actions/resources";
import { fieldClass, SubmitButton } from "./ui";

export function ZelloCad2({
  serverId,
  serverName,
  owner,
  applicationUrl,
  docs,
}: {
  serverId: string;
  serverName: string;
  owner: boolean;
  applicationUrl: string | null;
  docs: { id: string; title: string; url: string }[];
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-white">Resources</h1>
        <p className="mt-1 text-sm text-[#8d8d8d]">Documents and the application link for {serverName}.</p>
      </div>

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#141414]">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <Link2 size={16} className="text-[#e7a0a0]" />
          <h2 className="text-sm font-semibold text-white">Application</h2>
        </div>
        <div className="px-4 py-3">
          {applicationUrl ? (
            <a href={applicationUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-2 text-sm font-medium text-[#e7a0a0]">
              <ExternalLink size={15} /> Open application
            </a>
          ) : (
            <p className="text-sm text-[#8d8d8d]">No application link yet.</p>
          )}
          <p className="mt-2 text-xs text-[#8d8d8d]">This opens in a new tab. It does not file an application inside Zello.</p>
          {owner ? (
            <form action={saveApplicationLink} className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input type="hidden" name="serverId" value={serverId} />
              <input className={fieldClass} name="applicationUrl" placeholder="https://example.com/apply" defaultValue={applicationUrl ?? ""} />
              <SubmitButton className="bg-[#2a2a2a] text-white hover:bg-[#3a3a3a]">Save link</SubmitButton>
            </form>
          ) : null}
        </div>
      </section>

      <section className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-[#141414]">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <Folder size={16} className="text-[#e7a0a0]" />
          <h2 className="text-sm font-semibold text-white">Documents</h2>
        </div>
        <ul>
          {docs.length === 0 ? <li className="px-4 py-4 text-sm text-[#8d8d8d]">No documents yet.</li> : null}
          {docs.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between gap-3 border-t border-white/5 px-4 py-3 first:border-t-0">
              <a href={doc.url} target="_blank" rel="noreferrer noopener" className="flex min-w-0 items-center gap-2 text-sm font-medium text-[#d7d7d7] hover:text-white">
                <FileText size={15} className="shrink-0 text-[#e7a0a0]" />
                <span className="truncate">{doc.title}</span>
              </a>
              <div className="flex shrink-0 items-center gap-3">
                <a href={doc.url} target="_blank" rel="noreferrer noopener" className="text-sm font-medium text-[#6ea8ff]">Open</a>
                {owner ? (
                  <form action={deleteResourceDoc}>
                    <input type="hidden" name="serverId" value={serverId} />
                    <input type="hidden" name="docId" value={doc.id} />
                    <button type="submit" className="text-sm text-[#e7a0a0]">Remove</button>
                  </form>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
        {owner ? (
          <form action={addResourceDoc} className="grid gap-2 border-t border-white/10 px-4 py-4">
            <h3 className="text-sm font-medium text-white">Add a document</h3>
            <input type="hidden" name="serverId" value={serverId} />
            <input className={fieldClass} name="title" placeholder="Title" required minLength={2} maxLength={80} />
            <input className={fieldClass} name="url" placeholder="https://docs.example.com/handbook" />
            <label className="text-xs text-[#8d8d8d]">
              Or upload a PDF, TXT, DOC, or DOCX up to 5 MB
              <input className="mt-1 block w-full text-sm text-[#d7d7d7]" type="file" name="file" accept=".pdf,.txt,.doc,.docx,application/pdf,text/plain" />
            </label>
            <SubmitButton className="w-fit bg-[#2a2a2a] text-white hover:bg-[#3a3a3a]">Add document</SubmitButton>
          </form>
        ) : null}
      </section>
    </div>
  );
}
