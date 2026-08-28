import AppError from '../errors/AppError.js';

export function uploadProductImages(req, res) {
  if (!req.files?.length) {
    throw new AppError(400, '업로드할 이미지가 필요합니다.', { code: 'IMAGE_REQUIRED' });
  }
  const urls = req.files.map((file) => `/uploads/${encodeURIComponent(file.filename)}`);
  res.status(201).json({
    urls,
    images: urls,
    // Compatibility for forms that upload one image at a time.
    url: urls[0],
  });
}
