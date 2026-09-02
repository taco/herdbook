/** Build a multipart/form-data body for fastify.inject() (fields + files). */
export function buildMultipartPayload(
    fields: Record<string, string>,
    files: Record<string, { content: Buffer; filename: string; type: string }>
): { body: Buffer; boundary: string } {
    const boundary = '----TestBoundary' + Date.now();
    const parts: Buffer[] = [];

    for (const [name, value] of Object.entries(fields)) {
        parts.push(
            Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`
            )
        );
    }

    for (const [name, file] of Object.entries(files)) {
        parts.push(
            Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="${name}"; filename="${file.filename}"\r\nContent-Type: ${file.type}\r\n\r\n`
            )
        );
        parts.push(file.content);
        parts.push(Buffer.from('\r\n'));
    }

    parts.push(Buffer.from(`--${boundary}--\r\n`));

    return { body: Buffer.concat(parts), boundary };
}
