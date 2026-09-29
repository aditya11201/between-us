export async function fetchAudioBlobUrl(
  sourceUrl,
  { fetchImpl = fetch, urlApi = URL, signal, mimeType = "audio/mp4" } = {},
) {
  const response = await fetchImpl(sourceUrl, { signal });
  if (!response.ok) {
    throw new Error(`Audio request failed: ${response.status}`);
  }

  const responseBlob = await response.blob();
  const blob = responseBlob.type?.startsWith("audio/")
    ? responseBlob
    : new Blob([responseBlob], { type: mimeType });
  const url = urlApi.createObjectURL(blob);

  return {
    url,
    revoke: () => urlApi.revokeObjectURL(url),
  };
}
