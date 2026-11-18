export function validPhotos(photos) {
  if (!Array.isArray(photos) || photos.length > 3) return false;
  return photos.every((photo) => {
    if (typeof photo !== "string" || photo.length > 400000) return false;
    const match = photo.match(
      /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/,
    );
    if (!match) return false;
    const bytes = Buffer.from(match[2], "base64");
    if (bytes.length < 12) return false;
    if (match[1] === "jpeg")
      return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    if (match[1] === "png")
      return bytes
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    return (
      bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP"
    );
  });
}
