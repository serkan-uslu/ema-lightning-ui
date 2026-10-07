import { ProjectEditorView } from "@/views/ProjectEditorView";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectEditorView projectId={id} />;
}
