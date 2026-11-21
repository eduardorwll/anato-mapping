use std::path::{Path, PathBuf};

pub const SUPPORTED_IMAGE_EXTENSIONS: &[&str] = &[
    "png", "jpg", "jpeg", "webp", "avif", "bmp", "gif", "svg",
];

pub fn extension_of(path: &Path) -> Option<String> {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_ascii_lowercase())
}

pub fn is_supported_image(path: &Path) -> bool {
    match extension_of(path) {
        Some(ext) => SUPPORTED_IMAGE_EXTENSIONS.contains(&ext.as_str()),
        None => false,
    }
}

pub fn mime_type_for_path(path: &Path) -> &'static str {
    match extension_of(path).as_deref() {
        Some("png") => "image/png",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("webp") => "image/webp",
        Some("avif") => "image/avif",
        Some("bmp") => "image/bmp",
        Some("gif") => "image/gif",
        Some("svg") => "image/svg+xml",
        _ => "application/octet-stream",
    }
}

pub fn sibling_json_path(image_path: &Path) -> PathBuf {
    image_path.with_extension("json")
}
