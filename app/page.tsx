import App from "@/components/App";
import { loadNotes } from "@/lib/notes";

export default function Page() {
  return <App notes={loadNotes()} />;
}
