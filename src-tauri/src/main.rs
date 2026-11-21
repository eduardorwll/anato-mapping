#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    anato_mapping_lib::wayland::apply_linux_wayland_guard();
    anato_mapping_lib::run();
}
