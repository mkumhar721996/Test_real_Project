import { validateNewAttachments, type AttachmentFile } from '../../shared/attachmentValidation.ts';
import { createDefect } from '../storage/defectStore.ts';
import { authenticateRequest } from '../auth/authenticate.ts';

export async function handleCreateDefect(request: Request): Promise<Response> {
  const user = authenticateRequest(request);
  if (!user) {
    return Response.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const formData = await request.formData();
  const title = String(formData.get('title') ?? '');

  const uploadedFiles = formData.getAll('attachments').filter((entry): entry is File => entry instanceof File);
  const incoming: AttachmentFile[] = uploadedFiles.map((file) => ({
    name: file.name,
    sizeBytes: file.size,
    mimeType: file.type,
  }));

  const result = validateNewAttachments(0, incoming);

  if (result.rejected.length > 0) {
    return Response.json({ rejected: result.rejected }, { status: 400 });
  }

  const defect = createDefect(title, result.accepted);
  return Response.json(defect, { status: 201 });
}
