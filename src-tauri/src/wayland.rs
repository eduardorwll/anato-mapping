/// Linux / Wayland compatibility guard for WebKitGTK 4.1.
///
/// Sets `WEBKIT_DISABLE_DMABUF_RENDERER=1` at process startup only when the
/// user has not explicitly defined the variable, preventing blank windows and
/// Wayland protocol Error 71 on strict Wayland compositors (Hyprland/Sway) and
/// NVIDIA setups while keeping native Wayland rendering crisp.
#[cfg(target_os = "linux")]
pub fn apply_linux_wayland_guard() {
    if std::env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none() {
        // Called single-threaded at the very beginning of main() before GTK/WebKit init.
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }
}

#[cfg(not(target_os = "linux"))]
pub fn apply_linux_wayland_guard() {}
