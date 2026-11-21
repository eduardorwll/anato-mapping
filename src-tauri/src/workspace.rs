use crate::formats::{
    extension_of, is_supported_image, mime_type_for_path, sibling_json_path,
};
use serde::Serialize;
use std::cmp::Ordering;
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceImageEntry {
    pub path: String,
    pub file_name: String,
    pub extension: String,
    pub mime_type: String,
    pub json_path: String,
    pub has_json: bool,
    pub pin_count: usize,
}

fn natural_cmp(a: &str, b: &str) -> Ordering {
    let mut ia = a.chars().peekable();
    let mut ib = b.chars().peekable();

    while let (Some(&ca), Some(&cb)) = (ia.peek(), ib.peek()) {
        if ca.is_ascii_digit() && cb.is_ascii_digit() {
            let mut na = String::new();
            while let Some(&c) = ia.peek() {
                if c.is_ascii_digit() {
                    na.push(c);
                    ia.next();
                } else {
                    break;
                }
            }
            let mut nb = String::new();
            while let Some(&c) = ib.peek() {
                if c.is_ascii_digit() {
                    nb.push(c);
                    ib.next();
                } else {
                    break;
                }
            }
            let va = na.trim_start_matches('0');
            let vb = nb.trim_start_matches('0');
            let ord = va
                .len()
                .cmp(&vb.len())
                .then_with(|| va.cmp(vb))
                .then_with(|| na.len().cmp(&nb.len()));
            if ord != Ordering::Equal {
                return ord;
            }
        } else {
            let la = ca.to_lowercase().to_string();
            let lb = cb.to_lowercase().to_string();
            let ord = la.cmp(&lb);
            if ord != Ordering::Equal {
                return ord;
            }
            ia.next();
            ib.next();
        }
    }

    ia.count().cmp(&ib.count())
}

pub fn count_pins_in_json(json_path: &Path) -> Option<usize> {
    let raw = fs::read_to_string(json_path).ok()?;
    let val: serde_json::Value = serde_json::from_str(&raw).ok()?;
    if let Some(arr) = val.as_array() {
        return Some(arr.len());
    }
    for key in ["pins", "points", "estruturas"] {
        if let Some(arr) = val.get(key).and_then(|v| v.as_array()) {
            return Some(arr.len());
        }
    }
    Some(0)
}

pub fn inspect_image_path(path: &Path) -> Result<WorkspaceImageEntry, String> {
    if !path.is_file() {
        return Err(format!("Arquivo não encontrado: {}", path.display()));
    }
    if !is_supported_image(path) {
        return Err(format!(
            "Formato de imagem não suportado: {}",
            path.display()
        ));
    }

    let file_name = path
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| "Nome de arquivo inválido.".to_string())?
        .to_string();
    let extension = extension_of(path).unwrap_or_default();
    let mime_type = mime_type_for_path(path).to_string();
    let json_path_buf = sibling_json_path(path);
    let has_json = json_path_buf.is_file();
    let pin_count = if has_json {
        count_pins_in_json(&json_path_buf).unwrap_or(0)
    } else {
        0
    };

    Ok(WorkspaceImageEntry {
        path: path.to_string_lossy().to_string(),
        file_name,
        extension,
        mime_type,
        json_path: json_path_buf.to_string_lossy().to_string(),
        has_json,
        pin_count,
    })
}

pub fn scan_folder_dir(dir: &Path) -> Result<Vec<WorkspaceImageEntry>, String> {
    if !dir.is_dir() {
        return Err(format!("Pasta não encontrada: {}", dir.display()));
    }
    let read_dir = fs::read_dir(dir).map_err(|e| format!("Erro ao abrir pasta: {e}"))?;
    let mut entries = Vec::new();

    for entry_res in read_dir {
        let entry = match entry_res {
            Ok(e) => e,
            Err(_) => continue,
        };
        let path = entry.path();
        if path.is_file() && is_supported_image(&path) {
            if let Ok(item) = inspect_image_path(&path) {
                entries.push(item);
            }
        }
    }

    entries.sort_by(|a, b| natural_cmp(&a.file_name, &b.file_name));
    Ok(entries)
}

pub fn read_image_file_bytes(path: &Path) -> Result<Vec<u8>, String> {
    if !path.is_file() {
        return Err(format!("Imagem não encontrada: {}", path.display()));
    }
    if !is_supported_image(path) {
        return Err(format!(
            "Formato de imagem não suportado: {}",
            path.display()
        ));
    }
    fs::read(path).map_err(|e| format!("Erro ao ler imagem: {e}"))
}

pub fn read_json_text(path: &Path) -> Result<String, String> {
    if !path.is_file() {
        return Err(format!("JSON não encontrado: {}", path.display()));
    }
    fs::read_to_string(path).map_err(|e| format!("Erro ao ler JSON: {e}"))
}

pub fn write_json_atomic(path: &Path, content: &str) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Erro ao preparar diretório: {e}"))?;
        }
    }

    let normalized = content.replace("\r\n", "\n");
    let file_name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("anotacao.json");
    let tmp_path = path.with_file_name(format!(".{file_name}.tmp"));

    fs::write(&tmp_path, normalized.as_bytes())
        .map_err(|e| format!("Erro ao gravar arquivo temporário: {e}"))?;

    if let Err(rename_err) = fs::rename(&tmp_path, path) {
        // On Windows, fs::rename fails if the target exists.
        if path.exists() {
            fs::remove_file(path)
                .map_err(|e| format!("Erro ao substituir JSON existente: {e}"))?;
            fs::rename(&tmp_path, path)
                .map_err(|e| format!("Erro ao finalizar gravação JSON: {e}"))?;
        } else {
            let _ = fs::remove_file(&tmp_path);
            return Err(format!("Erro ao finalizar gravação JSON: {rename_err}"));
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn scans_multiformat_folder_with_natural_sort_and_sibling_json() {
        let dir = tempdir().expect("tempdir");
        fs::write(dir.path().join("umero_10.webp"), b"webp").unwrap();
        fs::write(dir.path().join("umero_2.PNG"), b"png").unwrap();
        fs::write(dir.path().join("Úmero_Anterior.jpg"), b"jpg").unwrap();
        fs::write(dir.path().join("diagrama.svg"), b"<svg/>").unwrap();
        fs::write(dir.path().join("notas.txt"), b"ignore").unwrap();
        fs::write(
            dir.path().join("umero_2.json"),
            r#"{"schemaVersion":"1.0.0","pins":[{"x":10,"y":20},{"x":30,"y":40}]}"#,
        )
        .unwrap();

        let entries = scan_folder_dir(dir.path()).expect("scan");
        let names: Vec<&str> = entries.iter().map(|e| e.file_name.as_str()).collect();
        assert_eq!(
            names,
            vec![
                "diagrama.svg",
                "umero_2.PNG",
                "umero_10.webp",
                "Úmero_Anterior.jpg"
            ]
        );

        let umero2 = entries.iter().find(|e| e.file_name == "umero_2.PNG").unwrap();
        assert!(umero2.has_json);
        assert_eq!(umero2.pin_count, 2);
        assert_eq!(umero2.mime_type, "image/png");

        let umero10 = entries.iter().find(|e| e.file_name == "umero_10.webp").unwrap();
        assert!(!umero10.has_json);
        assert_eq!(umero10.pin_count, 0);
        assert_eq!(umero10.mime_type, "image/webp");
    }

    #[test]
    fn writes_utf8_lf_atomically_and_overwrites_existing() {
        let dir = tempdir().expect("tempdir");
        let json_path = dir.path().join("Úmero_Anterior.json");

        write_json_atomic(&json_path, "{\r\n  \"pins\": []\r\n}\r\n").expect("write 1");
        let first = read_json_text(&json_path).expect("read 1");
        assert!(!first.contains('\r'));
        assert_eq!(first, "{\n  \"pins\": []\n}\n");

        write_json_atomic(&json_path, "{\n  \"pins\": [{\"x\": 1, \"y\": 2}]\n}\n")
            .expect("write 2");
        assert_eq!(count_pins_in_json(&json_path), Some(1));
    }

    #[test]
    fn rejects_unsupported_image_extensions() {
        let dir = tempdir().expect("tempdir");
        let txt = dir.path().join("relatorio.txt");
        fs::write(&txt, b"hello").unwrap();

        assert!(inspect_image_path(&txt).is_err());
        assert!(read_image_file_bytes(&txt).is_err());
    }
}
