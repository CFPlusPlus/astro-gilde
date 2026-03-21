export function compactMinecraftUuid(input: string | null | undefined): string {
  return String(input || '')
    .toLowerCase()
    .replace(/[^0-9a-f]/g, '');
}

export function resolvePlayerTextureId(uuid?: string | null, name?: string | null): string {
  const compactUuid = compactMinecraftUuid(uuid);
  if (compactUuid) return compactUuid;
  return String(name || '').trim();
}

export function buildMinotarHelmUrl(uuid?: string | null, name?: string | null, size = 80): string {
  const textureId = resolvePlayerTextureId(uuid, name);
  return textureId ? `https://minotar.net/helm/${encodeURIComponent(textureId)}/${size}.png` : '';
}

export function buildMcHeadsAvatarUrl(
  uuid?: string | null,
  name?: string | null,
  size = 80,
): string {
  const textureId = resolvePlayerTextureId(uuid, name);
  return textureId ? `https://mc-heads.net/avatar/${encodeURIComponent(textureId)}/${size}` : '';
}

export function buildMinotarSkinUrl(uuid?: string | null, name?: string | null): string {
  const textureId = resolvePlayerTextureId(uuid, name);
  return textureId ? `https://minotar.net/skin/${encodeURIComponent(textureId)}.png` : '';
}

export function buildMcHeadsSkinUrl(uuid?: string | null, name?: string | null): string {
  const textureId = resolvePlayerTextureId(uuid, name);
  return textureId ? `https://mc-heads.net/skin/${encodeURIComponent(textureId)}` : '';
}
